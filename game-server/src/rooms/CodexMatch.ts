import { Room, type Client } from 'colyseus';
import { randomBytes, randomInt } from 'node:crypto';
import { guest, occupied } from '../guests.js';
import { MatchSession, parseSetup, type MatchSetup } from '../../../src/pvp/session.js';
import { MATCH_PROTOCOL, CONTENT_REVISION } from '../../../src/pvp/catalog.js';
import type { PlayerId } from '../../../src/core/types.js';
import { MatchOpening } from '../../../src/pvp/opening.js';
import { nativeFrame } from '../../../src/pvp/native-readout.js';
import { profileFighter, type ProfileFighter } from '../../../src/pvp/profile.js';
interface Seat { id:string; name:string; fighter?:ProfileFighter; setup:MatchSetup; ready:boolean; loaded:boolean; connected:boolean; until:number; openingVersion:number }
export class CodexMatch extends Room {
  maxClients=2; maxMessagesPerSecond=25;
  private seats:Seat[]=[];
  private invite=randomBytes(24).toString('base64url');
  private expires=Date.now()+600000;
  private session?:MatchSession;
  private loading=false;
  private opening?:MatchOpening;
  private rematch=new Set<string>();
  private closing=false;
  private finishedAt=0;
  static async onAuth(_token:string,opts:Record<string,unknown>){
    if(opts.protocol!==MATCH_PROTOCOL||opts.content!==CONTENT_REVISION)throw new Error('The game changed. Refresh before joining.');
    return guest(opts.guest);
  }
  onCreate(){
    this.setPrivate(true);
    this.onMessage('sync',c=>this.sync(c));
    this.onMessage('setup',(c,m)=>{if(this.session||this.opening)return;try{const s=this.seats[this.side(c)]!;s.setup=parseSetup(m);s.ready=false;this.lobby();}catch(e){this.notice(c,e);}});
    this.onMessage('ready',(c,m)=>{if(this.session||this.opening)return;this.seats[this.side(c)]!.ready=m===true;this.lobby();if(this.seats.length===2&&this.seats.every(s=>s.ready&&s.connected)){
      if(this.seats.every(s=>s.openingVersion===1)){this.opening=new MatchOpening(this.seats.map(s=>s.setup) as [MatchSetup,MatchSetup],()=>randomInt(1,7));this.lobby();}
      else this.begin();
    }});
    this.onMessage('opening',(c,m)=>{
      if(!this.opening||this.session)return;
      try{
        if(m?.kind==='roll')this.opening.roll(this.side(c),m.round);
        else if(m?.kind==='confirm')this.opening.confirm(this.side(c),m.stage,m.value);
        this.lobby();
        if(this.opening.complete&&this.seats.every(s=>s.connected))this.begin();
      }catch(e){this.notice(c,e);}
    });
    this.onMessage('renew',c=>{if(!this.session&&this.side(c)===0){this.expires=Date.now()+600000;this.lobby();}});
    this.onMessage('loaded',c=>{if(!this.loading||!this.session)return;this.seats[this.side(c)]!.loaded=true;this.startWhenReady();});
    this.onMessage('action',(c,m)=>{if(this.loading||!this.session)return;void this.session.action(this.side(c),m?.revision,m?.action).catch(e=>{this.notice(c,e);this.sync(c);});});
    this.onMessage('answer',(c,m)=>{if(!this.session||this.loading)return;if(!this.session.decisions.answer(this.side(c),m?.id,m?.answer)){this.notice(c,new Error('That choice expired or is invalid'));this.sync(c);}});
    this.onMessage('surrender',c=>this.finish(this.side(c),'surrender'));
    this.onMessage('rematch',(c)=>{if(!this.session||this.session.game.winner===null)return;this.rematch.add(c.auth.id);this.lobby();if(this.seats.length===2&&this.seats.every(s=>s.connected&&this.rematch.has(s.id))){this.session.close();this.session=undefined;this.opening=undefined;this.rematch.clear();this.expires=Date.now()+600000;for(const s of this.seats){s.ready=false;s.loaded=false;}this.lobby();}});
    this.clock.setInterval(()=>{
      if(this.session?.game.winner!==null&&this.session){if(!this.finishedAt)this.finishedAt=Date.now();if(Date.now()-this.finishedAt>600000)void this.abort('Rematch window expired. Create a new room.');}else this.finishedAt=0;
      if(!this.session&&Date.now()>this.expires)void this.abort('Invitation expired. Create a new room.');
      const away=this.seats.filter(s=>!s.connected&&s.until<Date.now());
      if(away.length&&this.session?.game.winner===null){if(!this.seats.some(s=>s.connected))void this.abort('Both players disconnected. Match abandoned.');else this.finish(this.seats.indexOf(away[0]!) as PlayerId,'disconnect');}
    },1000);
  }
  onJoin(_c:Client,opts:any,auth:{id:string}){
    if(this.session||this.seats.length>=2||Date.now()>this.expires)throw new Error('This room is full, expired, or already started');
    if(this.seats.length&&opts.invite!==this.invite)throw new Error('Invalid invitation');
    if(occupied.has(auth.id))throw new Error('You already have an open room. Return to that tab.');
    const setup=parseSetup(opts.setup);const name=typeof opts.name==='string'?Array.from(opts.name.trim()).slice(0,24).join(''):'';
    // A newly joined peer can change negotiated setup capabilities.
    for(const seat of this.seats)seat.ready=false;
    this.seats.push({id:auth.id,name:name||`Player ${this.seats.length+1}`,fighter:profileFighter(opts.fighter),setup,ready:false,loaded:false,connected:true,until:0,openingVersion:opts.openingVersion===1?1:0});occupied.set(auth.id,this.roomId);this.lobby();
  }
  private side(c:Client):PlayerId {const n=this.seats.findIndex(s=>s.id===c.auth.id);if(n<0)throw new Error('Not seated');return n as PlayerId;}
  private lobby(){for(const c of this.clients)c.send('lobby',{roomId:this.roomId,invite:this.side(c)===0?this.invite:undefined,expires:this.expires,serverNow:Date.now(),
    seat:this.side(c),setup:this.seats[this.side(c)]!.setup,openingVersion:this.seats.every(s=>s.openingVersion===1)?1:0,opening:this.seats[this.side(c)]!.openingVersion===1?this.opening?.view():undefined,playing:!!this.session,loading:this.loading,seats:this.seats.map(s=>({name:s.name,...(s.fighter?{fighter:s.fighter}:{}),ready:s.ready,connected:s.connected,reconnectUntil:s.until,rematch:this.rematch.has(s.id)}))});}
  private frame(c:Client){const frame=nativeFrame(this.session!,this.side(c));return this.loading?{...frame,busy:true,legal:[],supporters:{}}:frame;}
  private sync(c:Client){this.lobby();if(this.session)c.send('view',this.frame(c));}
  private publish(){if(this.closing)return;for(const c of this.clients)if(this.seats.some(s=>s.id===c.auth.id)&&this.session)c.send('view',this.frame(c));}
  private begin(){
    if(this.session)return;this.loading=true;this.session=new MatchSession(this.opening?.selected()??this.seats.map(s=>s.setup) as [MatchSetup,MatchSetup],randomInt(1,2147483647),()=>this.publish(),this.opening?.first??undefined);this.lobby();this.publish();
    const session=this.session;
    this.clock.setTimeout(()=>{if(this.loading&&this.session===session)void this.abort('Battle loading timed out. Please try again.');},60000);
  }
  private startWhenReady():void {
    if(this.closing||!this.loading||!this.session||this.seats.length!==2||!this.seats.every(s=>s.loaded&&s.connected))return;
    // Claim the start before any asynchronous work: duplicate loaded/sync/reconnect cannot deal twice.
    this.loading=false;const session=this.session;this.lobby();
    void session.start().catch(e=>{if(!session.closed)void this.abort(String(e));});
  }
  private finish(loser:PlayerId,reason:string){if(!this.session||this.session.game.winner!==null)return;this.session.ctrl.concede(loser);this.session.close();this.broadcast('notice',{message:reason==='disconnect'?'The disconnected player did not return.':'The match was surrendered.'});this.publish();this.lobby();}
  private notice(c:Client,e:unknown){c.send('notice',{message:e instanceof Error?e.message:'Could not complete that action'});}
  private async abort(message:string){if(this.closing)return;this.closing=true;this.session?.close();this.broadcast('aborted',{message});await this.disconnect();}
  async onDrop(c:Client){if(!this.seats.some(s=>s.id===c.auth?.id))return;const s=this.seats[this.side(c)]!;s.connected=false;s.until=Date.now()+60000;this.lobby();try{await this.allowReconnection(c,60);}catch{/* onLeave cleans up */}}
  onReconnect(c:Client){const s=this.seats[this.side(c)]!;s.connected=true;s.until=0;this.sync(c);if(this.opening?.complete&&!this.session&&this.seats.every(s=>s.connected))this.begin();this.startWhenReady();}
  onLeave(c:Client){if(this.closing||!this.seats.some(s=>s.id===c.auth?.id))return;const p=this.side(c);this.seats[p]!.connected=false;if(this.session&&!this.loading){if(this.seats.some(s=>s.connected))this.finish(p,'disconnect');else void this.abort('Match ended.');}else void this.abort('A player left before the match began.');}
  async onBeforeShutdown(){await this.abort('The server restarted. This match was interrupted without a result.');}
  onDispose(){this.session?.close();for(const s of this.seats)if(occupied.get(s.id)===this.roomId)occupied.delete(s.id);}
}
