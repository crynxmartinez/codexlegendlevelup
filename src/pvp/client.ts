import { FramePlayback } from './presentation.js';
import { LegacyDeckOrder } from './legacy-deck-order.js';
import type { Room } from '@colyseus/sdk';
import { GameController, type PlayerAction } from '../core/game.js';
import type { PlayerId } from '../core/types.js';
import type { MatchFrame, MatchSetup } from './session.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { readMatchVersion, supportedMatchVersion, type MatchVersion } from './compatibility.js';
import { personaChoices } from '../core/setup.js';
import { loadDecks } from '../ui/decklib.js';
import { cardDisplayName } from '../ui/card-name.js';
import { OpeningPanel, preloadOpening } from './opening-ui.js';
import { presentPrivateLobby } from '../ui/lobby-presentation.js';
import { menuProfile } from '../ui/menu-profile.js';
import { traceFrame, tracePresentation } from '../ui/presentation-diagnostics.js';

export const SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL || (import.meta.env.DEV ? 'http://127.0.0.1:2570' : '');
const storage={get:(k:string)=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k:string,v:string)=>{try{sessionStorage.setItem(k,v);}catch{/* tab-only recovery unavailable */}},remove:(k:string)=>{try{sessionStorage.removeItem(k);}catch{/* no storage */}}};

/** Reject an incomplete public battle before it can replace the last good table. */
export function assertPublicBattle(frame: MatchFrame): void {
  for (const uid of frame.state.activeBattle?.blockers ?? []) {
    const card = frame.state.cards[uid];
    if (!card || card.defId === '__hidden__' || !MATCH_INDEX[card.defId]) {
      throw new Error('Incomplete public defender snapshot');
    }
  }
}
export class RemoteController extends GameController {
  frame:MatchFrame;
  onFrame?:()=>void | Promise<void>;
  onFrameSettled?:()=>void;
  private preparation?: Promise<void>;
  /** Hold incoming playback behind asset preparation and the opening deal. */
  pausePresentation(): () => void {
    let resume!: () => void;
    this.preparation = new Promise<void>(resolve => { resume = resolve; });
    return () => { this.preparation = undefined; resume(); };
  }
  presenting=false;
  private receivedRevision: number;
  private playback: FramePlayback<MatchFrame>;
  private deckOrder = new LegacyDeckOrder();
  private get orderContext(): string { return `${this.game.turnNumber}:${this.game.chainSerial ?? 0}`; }
  get displayDecision() { return this.version.protocol === 2 ? this.deckOrder.display(this.frame.decision, this.orderContext) : this.frame.decision; }
  readonly version: MatchVersion;
  onNotice?:(message:string)=>void;
  connected=true;
  private closed=false;
  private connectionEpoch=0;
  private recoveryAttempts=0;
  private recoveryStopped=false;
  private lastGood:MatchFrame;
  /** A transport send is not an acknowledgement. Retain the wire answer until the server advances. */
  private submission?:{id:string;answer:unknown};
  private notice(message:string):void {
    // A failing UI must never prevent sync or escape the playback error handler.
    try { this.onNotice?.(message); } catch { /* last valid table remains authoritative */ }
  }
  private deferredAnswer?:{id:string;answer:unknown};
  private waiting?:{resolve:()=>void;reject:(e:Error)=>void};
  constructor(readonly room:Room, first:MatchFrame){
    super(first.state,MATCH_INDEX);this.frame=first;this.lastGood=structuredClone(first);
    const version=supportedMatchVersion(first);
    if(!version)throw new Error('The match server is updating. Please try again shortly.');
    this.version=version;
    assertPublicBattle(first);
    this.receivedRevision=first.revision;
    this.playback=new FramePlayback(async f=>{
      const epoch=this.connectionEpoch;
      if(this.preparation)await this.preparation;
      if(this.closed || epoch!==this.connectionEpoch)return;
      assertPublicBattle(f);
      traceFrame(f.revision,f.presentation?.id);tracePresentation('frame.apply');
      const legacyCue=f.protocol===2 && (f.cues.at(-1)?.id??0)>(this.frame.cues.at(-1)?.id??0);
      const recovering=!this.connected;
      if(this.submission && f.decision?.id!==this.submission.id)this.submission=undefined;
      this.connected=true;this.presenting=!!f.presentation||legacyCue;this.frame=f;Object.assign(this.game,f.state);
      const nextOrder = f.protocol === 2 ? this.deckOrder.next(f.decision, this.orderContext) : undefined;
      try { await this.onFrame?.(); } finally {
        if(epoch===this.connectionEpoch){this.presenting=false;this.onFrameSettled?.();}
      }
      if(this.closed || epoch!==this.connectionEpoch)return;
      this.lastGood=f;this.recoveryAttempts=0;
      // Only a fresh recovery snapshot can authorize retry. Ordinary pending frames and clicks cannot.
      if(recovering && this.submission && f.decision?.id===this.submission.id)this.room.send('answer',this.submission);
      if (nextOrder && f.decision && this.connected) this.answer(f.decision.id, nextOrder);
      const deferred=this.deferredAnswer;this.deferredAnswer=undefined;
      if(deferred&&f.decision?.id===deferred.id)this.answer(deferred.id,deferred.answer);
      if(!f.busy){this.waiting?.resolve();this.waiting=undefined;}
    }, ()=>{
      this.connectionEpoch++;this.deckOrder.clear();this.presenting=false;this.connected=false;
      this.frame=this.lastGood;Object.assign(this.game,this.lastGood.state);
      this.recoveryStopped=++this.recoveryAttempts>1;
      this.notice(this.recoveryStopped
        ? 'The table could not be restored. Play is paused here. Reload to reconnect.'
        : 'Presentation interrupted. Restoring the latest table…');
      if(!this.recoveryStopped){try{this.room.send('sync');}catch{this.recoveryStopped=true;this.notice('Connection unavailable. Reload to reconnect.');}}
      if(this.recoveryStopped){this.waiting?.reject(new Error('Presentation recovery failed.'));this.waiting=undefined;}
    },(kind,depth,f)=>tracePresentation(`queue.${kind}`,{depth,revision:f?.revision,presentation:f?.presentation?.id}));
    room.onMessage('view',(f:MatchFrame)=>{
      tracePresentation('frame.receipt',{revision:f.revision,presentation:f.presentation?.id});
      if(this.closed||this.recoveryStopped)return;
      if(f.protocol!==this.version.protocol||f.content!==this.version.content){this.notice('The match version changed. Return to the title screen and reconnect.');return;}
      if(f.revision<this.receivedRevision)return;
      if(f.revision===this.receivedRevision && this.connected)return;
      this.receivedRevision=f.revision;
      if(!this.connected || (typeof document!=='undefined' && document.hidden))this.playback.clear();
      this.playback.push(f);
    });
    room.onMessage('notice',(m:{message:string})=>{this.submission=undefined;this.notice(m.message);this.waiting?.reject(new Error(m.message));this.waiting=undefined;});
    room.onDrop(()=>{this.connectionEpoch++;this.deckOrder.clear();this.playback.clear();this.connected=false;this.notice('Reconnecting… Your last move will be checked when the table returns.');});
    room.onLeave(()=>{this.connectionEpoch++;this.closed=true;this.deckOrder.clear();this.playback.clear();this.connected=false;this.submission=undefined;this.deferredAnswer=undefined;this.notice('Room closed. Return to the title screen to create another.');this.waiting?.reject(new Error('Room closed.'));this.waiting=undefined;});
  }
  override legalActions(p:PlayerId):PlayerAction[]{return p===0&&this.connected&&!this.presenting?this.frame.legal:[];}
  override async perform(action:PlayerAction):Promise<void>{
    if(!this.connected)throw new Error('Reconnecting. Wait for the table to return.');
    if(this.waiting)throw new Error('Waiting for your move to finish');
    return new Promise((resolve,reject)=>{this.waiting={resolve,reject};this.room.send('action',{revision:this.frame.revision,action});});
  }
  async leaveToHome():Promise<void>{
    if(this.closed){storage.remove('codex-room');return;}
    if(!this.connected)throw new Error('Wait for reconnection before leaving.');
    if(this.game.winner===null)this.room.send('surrender');
    // Ordered WebSocket delivery sends surrender before consented leave.
    await this.room.leave(true);
    storage.remove('codex-room'); this.playback.clear(); this.deckOrder.clear();
    this.deferredAnswer=undefined;
  }
  override concede():boolean{this.room.send('surrender');return false;}
  answer(id:string,answer:unknown){
    if(this.closed||this.recoveryStopped||this.frame.decision?.id!==id||this.submission?.id===id)return;
    if(!this.connected){this.deferredAnswer={id,answer};return;}
    if (this.version.protocol === 2 && this.frame.decision?.id === id) answer = this.deckOrder.answer(this.frame.decision, answer, this.orderContext);
    this.submission={id,answer:answer===undefined?true:answer};
    try { this.room.send('answer',this.submission); } catch {
      this.connected=false;this.notice('Choice not delivered. Reconnect to check it before continuing.');
    }
  }
}
export interface LobbyDeps {
  root:HTMLElement;
  start:(ctrl:RemoteController,opening:boolean)=>void|Promise<void>;
  inspect:(id:string)=>void;
}
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''):HTMLElementTagNameMap[K]=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
export async function openPrivateRoom(deps:LobbyDeps):Promise<void>{
  let room:Room|undefined;
  const {root}=deps;root.replaceChildren();root.classList.add('pvp-screen');
  const panel=node('main','','pvp-lobby');root.append(panel);
  presentPrivateLobby(root,panel);
  panel.append(node('p','PRIVATE MATCH · UNRANKED','eyebrow'),node('h1','Play with a friend'),node('p','Choose your deck, invite a friend, and get ready together.'));
  const status=node('p','','pvp-status');status.setAttribute('role','status');panel.append(status);
  const leave=node('button','Back to title','pvp-back');leave.onclick=()=>{void room?.leave();storage.remove('codex-room');location.search='';};
  if(!SERVER_URL){status.textContent='Private matches are being connected. Offline battles are available from the title screen.';panel.append(leave);return;}
  const profile=menuProfile();
  const name=node('input');name.placeholder='Your name';name.maxLength=24;name.value=profile.nickname;name.setAttribute('aria-label','Your display name');
  const decks=[...Object.entries(STARTERS).map(([name,deck])=>({name,deck})),...loadDecks(MATCH_INDEX).map(deck=>({name:deck.name,deck}))];
  const deck=node('select');deck.setAttribute('aria-label','Your deck');decks.forEach((d,i)=>{const o=node('option',d.name);o.value=String(i);deck.append(o);});
  const persona=node('select');persona.setAttribute('aria-label','Starting Persona');const codex=node('select');codex.setAttribute('aria-label','Starting Codex');
  const cardOptions=()=>{const d=decks[Number(deck.value)]!.deck;persona.replaceChildren();codex.replaceChildren();
    for(const [select,ids] of [[persona,personaChoices(MATCH_INDEX,d)],[codex,d.codex]] as const)for(const id of ids){const o=node('option',cardDisplayName(MATCH_INDEX[id]!.name));o.value=id;o.title=MATCH_INDEX[id]!.name;select.append(o);}
  };cardOptions();deck.onchange=cardOptions;
  const setup=():MatchSetup=>({deck:decks[Number(deck.value)]!.deck,choice:{persona:persona.value,codex:codex.value}});
  const assets=node('p','','opening-assets');assets.setAttribute('role','status');
  let preloadSerial=0;
  const preload=()=>{const serial=++preloadSerial;preloadOpening(setup().deck,(text,state)=>{if(serial===preloadSerial){assets.textContent=text;assets.dataset.state=state;}});};
  preload();deck.onchange=()=>{cardOptions();preload();};
  const form=node('div','','pvp-setup');
  for(const [text,input] of [['Name',name],['Deck',deck]] as const){const label=node('label',text);label.append(input);form.append(label);}
  const legacy=node('div','','pvp-setup');legacy.hidden=true;
  for(const [text,input] of [['Persona',persona],['Codex',codex]] as const){const label=node('label',text);label.append(input);legacy.append(label);}
  const legacyNote=node('p','Compatibility mode: this server or opponent uses the earlier setup. Choose Persona and Codex here.');legacy.append(legacyNote);
  panel.append(form,legacy,assets);
  const seats=node('div','','pvp-seats'),actions=node('div','','pvp-actions');panel.append(seats,actions,leave);
  const joinInput=node('input');joinInput.placeholder='Paste invitation link';joinInput.setAttribute('aria-label','Invitation link');
  const create=node('button','Create room','primary'),join=node('button','Join room');actions.append(create,joinInput,join);
  const { Client } = await import('@colyseus/sdk');
  const client=new Client(SERVER_URL);let handedOff=false;let ready=false;
  const token=async()=>{let t=storage.get('codex-guest');if(t)return t;const url=new URL('/codex/guest',SERVER_URL.replace(/^ws/,'http'));
    const r=await fetch(url,{method:'POST'});const result=await r.json();if(!r.ok)throw new Error(result.error??'Could not start a guest session');t=result.token as string;storage.set('codex-guest',t);return t;};
  const connect=async(invitation?:URL,retry=true):Promise<void>=>{
    create.disabled=join.disabled=true;status.textContent='Connecting…';
    try{
      const version=await readMatchVersion(SERVER_URL);
      if(!version.openingVersion){legacy.hidden=false;create.disabled=join.disabled=false;if(legacy.dataset.acknowledged!=='true'){legacy.dataset.acknowledged='true';status.textContent='Choose your starting cards below, then connect again.';return;}}
      const opts={guest:await token(),name:name.value,fighter:profile.fighter,setup:setup(),...version,invite:invitation?.searchParams.get('invite')};
      room=invitation?await client.joinById(invitation.searchParams.get('room')??'',opts):await client.create('codex_match',opts);bind(room);
    }catch(e){status.textContent=e instanceof Error?e.message:'Could not connect';create.disabled=join.disabled=false;if(/guest session/i.test(status.textContent)){storage.remove('codex-guest');if(retry)return connect(invitation,false);}}
  };
  function bind(r:Room){
    const openingPanel=new OpeningPanel(message=>r.send('opening',message),deps.inspect);
    panel.insertBefore(openingPanel.element,assets);openingPanel.element.hidden=true;
    let restoredSetup=false,opening=false;
    storage.set('codex-room',JSON.stringify({url:SERVER_URL,id:r.roomId,token:r.reconnectionToken}));
    actions.replaceChildren();const invitation=node('input');invitation.readOnly=true;invitation.setAttribute('aria-label','Room invitation');
    const copy=node('button','Copy invite link'),readyButton=node('button','Ready','primary'),renew=node('button','Renew invitation');
    copy.disabled=renew.disabled=true;
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(invitation.value);status.textContent='Invitation copied. Send it to your friend.';}catch{invitation.focus();invitation.select();status.textContent='Copy the selected invitation and send it to your friend.';}};
    readyButton.onclick=()=>{ready=!ready;r.send('ready',ready);};renew.onclick=()=>r.send('renew');actions.append(invitation,copy,readyButton,renew);
    const changed=()=>{ready=false;r.send('setup',setup());};deck.onchange=()=>{cardOptions();preload();changed();};persona.onchange=codex.onchange=changed;
    r.onMessage('lobby',(m:any)=>{
      opening=!!m.loading;
      if(!restoredSetup&&m.setup){
        restoredSetup=true;const saved=m.setup as MatchSetup;
        let i=decks.findIndex(d=>JSON.stringify(d.deck.main)===JSON.stringify(saved.deck.main)&&JSON.stringify(d.deck.codex)===JSON.stringify(saved.deck.codex));
        if(i<0){i=decks.length;decks.push({name:saved.deck.name,deck:saved.deck});const option=node('option',saved.deck.name);option.value=String(i);deck.append(option);}
        deck.value=String(i);cardOptions();persona.value=saved.choice.persona??saved.deck.persona;codex.value=saved.choice.codex??saved.deck.codex[0]!;name.value=m.seats[m.seat]?.name??name.value;
        preload();
      }
      if(m.playing&&handedOff){
        const away=m.seats.find((s:any,i:number)=>i!==m.seat&&!s.connected);
        document.getElementById('pvp-opponent-away')?.remove();
        if(away){const notice=node('p','Your friend disconnected. Waiting for them to return (up to 60 seconds).','pvp-disconnected');notice.id='pvp-opponent-away';notice.setAttribute('role','status');root.append(notice);}
        return;
      }
      seats.replaceChildren(...m.seats.map((s:any,i:number)=>{
        const seat=node('div','','pvp-seat');seat.dataset.ready=String(!!s.ready);
        seat.append(node('strong',`${s.name}${i===m.seat?' (you)':''}`),node('span',s.connected?(s.ready?'Ready':'Choosing deck'):'Reconnecting…'));return seat;
      }));
      if(m.invite){const url=new URL(location.origin);url.searchParams.set('room',m.roomId);url.searchParams.set('invite',m.invite);invitation.value=url.toString();invitation.hidden=copy.hidden=renew.hidden=false;copy.disabled=renew.disabled=false;}
      else{invitation.hidden=copy.hidden=renew.hidden=true;}
      ready=!!m.seats[m.seat]?.ready;readyButton.textContent=ready?'Not ready':'Ready';
      status.textContent=m.loading?'Both ready. Loading the battle…':m.seats.length===2?(ready?'You are ready. Waiting for your friend.':'Choose your deck, then select Ready.'):`Share the invitation to fill the second seat. Expires ${new Date(m.expires).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.`;
      if(!m.playing&&handedOff){location.search='?roomLobby=1';return;}
      for(const control of [deck,persona,codex,readyButton])control.disabled=m.playing;
      legacy.hidden=m.openingVersion===1||!!m.opening;
      form.hidden=actions.hidden=seats.hidden=!!m.opening;
      openingPanel.element.hidden=!m.opening;
      if(m.opening){status.textContent='';openingPanel.setConnected(true);openingPanel.render(m.opening,m.seat,setup().deck,m.seats.map((s:any,i:number)=>({name:s.name,fighter:s.fighter??(i===m.seat?profile.fighter:undefined),connected:s.connected})));}
    });
    r.onMessage('view',(frame:MatchFrame)=>{
      if(handedOff)return;
      if(!supportedMatchVersion(frame)){status.textContent='The match server is updating. Please return to title and try again shortly.';return;}
      handedOff=true;openingPanel.dispose();root.classList.remove('pvp-screen','anime-lobby','menu-destination');
      root.querySelectorAll('.destination-header,.destination-crumb,.lobby-art').forEach(node=>node.remove());
      const ctrl=new RemoteController(r,frame);void Promise.resolve(deps.start(ctrl,opening)).then(()=>r.send('loaded')).catch(()=>{status.textContent='The battle could not load. Return to the title screen and try again.';});
    });
    r.onMessage('notice',(m:{message:string})=>{status.textContent=m.message;openingPanel.rejectSubmission();});
    r.onMessage('aborted',(m:{message:string})=>{openingPanel.setConnected(false);storage.remove('codex-room');status.textContent=m.message;if(handedOff){const box=node('div',m.message,'pvp-disconnected');box.append(leave);root.append(box);}});
    r.onDrop(()=>{openingPanel.setConnected(false);document.getElementById('pvp-connection')?.remove();const box=node('p','Connection lost. Reconnecting… Your seat is held for up to 60 seconds.','pvp-disconnected');box.id='pvp-connection';box.setAttribute('role','status');root.append(box);});
    r.onReconnect(()=>{storage.set('codex-room',JSON.stringify({url:SERVER_URL,id:r.roomId,token:r.reconnectionToken}));document.getElementById('pvp-connection')?.remove();r.send('sync');});
    r.onLeave(()=>{openingPanel.setConnected(false);storage.remove('codex-room');document.getElementById('pvp-connection')?.remove();document.getElementById('pvp-opponent-away')?.remove();if(handedOff){const box=node('div','Room closed. Return to the title screen to create another.','pvp-disconnected');box.setAttribute('role','alert');box.append(leave);root.append(box);}else{status.textContent='Room closed. Return to title to create another.';for(const control of [readyButton,renew,copy])control.disabled=true;}});
    r.onError((_code,message)=>{status.textContent=message??'Connection interrupted';if(handedOff){document.getElementById('pvp-connection')?.remove();const box=node('p',status.textContent,'pvp-disconnected');box.id='pvp-connection';box.setAttribute('role','status');root.append(box);}});r.send('sync');
  }
  create.onclick=()=>void connect();join.onclick=()=>{try{const u=new URL(joinInput.value);if(!u.searchParams.get('room')||!u.searchParams.get('invite'))throw new Error();void connect(u);}catch{status.textContent='Paste the complete invitation link.';}};
  const current=new URL(location.href);
  const resume=storage.get('codex-room');
  if(resume){try{const saved=JSON.parse(resume);if(saved.url===SERVER_URL&&(!current.searchParams.has('room')||!saved.id||saved.id===current.searchParams.get('room'))){room=await client.reconnect(saved.token);bind(room);return;}}catch{storage.remove('codex-room');status.textContent='The previous room is no longer available. Create a new room.';}}
  if(current.searchParams.has('room')){joinInput.value=current.toString();create.hidden=true;status.textContent='Invitation received. Choose your deck, then Join room.';}
}
