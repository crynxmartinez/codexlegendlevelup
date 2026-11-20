import { feedbackAt, highlightEffectTarget } from './battle-feedback.js';
import type {MatchCue} from '../pvp/session.js';
import {DISPLAY_CARDS as ALL_CARDS} from '../localization/display.js';
import {artUrl,boardUrl} from './assets.js';
import {playCue} from './sfx.js';
import {presentChainCue} from './chain-cue.js';
import {shatterBarrier,shatterUnit,captureUnitGlass,type UnitGlass} from './barrier-shatter.js';
import {animateHandMove,handMoveDestination} from './hand-motion.js';
import {CARD_BACK} from './assets.js';
import { holdDuelMotion } from './duel-motion.js';
import { waitFor } from './pace.js';
import { settings } from './settings.js';
/** Adapter for the known protocol-2 server during the coordinated rollout.
 * A frame waits for its public cues; protocol 3 uses the full local hooks. */
export class LegacyRemotePresentation {
  private seen=0;
  private queue:(MatchCue & {unitGlass?:UnitGlass;handOrigins?:Map<string,DOMRect>;foeHandOrigin?:DOMRect})[]=[];
  private handOrigins = new Map<string,DOMRect>();
  private foeHandOrigin?:DOMRect;
  private field = new Map<string, {entry:number;glass:UnitGlass}>();
  captureField():void {
    // A state frame may remove the hand card before its visual cue arrives.
    document.querySelectorAll<HTMLElement>('.hand-card[data-uid]').forEach(node=>this.handOrigins.set(node.dataset.uid!,node.getBoundingClientRect()));
    this.foeHandOrigin = document.querySelector<HTMLElement>('.foehand .fb')?.getBoundingClientRect() ?? this.foeHandOrigin;
    this.field.clear();
    document.querySelectorAll<HTMLElement>('.mat .card[data-zone="ally"][data-uid]').forEach(node=>{
      this.field.set(node.dataset.uid!,{entry:Number(node.dataset.fieldEntry??0),glass:captureUnitGlass(node)});
    });
  }
  private running=false;
  private disposed=false;
  private panel?:HTMLElement;
  private motion = new AbortController();
  constructor(initial:MatchCue[],private inspect:(id:string)=>void,
    private sourceFor?:(uid:string,owner:0|1)=>{source:HTMLElement|null;liftAnchor?:HTMLElement|null;sourceZone:string}){this.seen=initial.at(-1)?.id??0;}
  dispose(){this.disposed=true;this.queue=[];this.field.clear();this.handOrigins.clear();this.motion.abort();this.panel?.remove();}
  async enqueue(cues:MatchCue[]){
    const fresh=cues.filter(c=>c.id>this.seen);this.seen=cues.at(-1)?.id??this.seen;
    if(document.hidden||this.disposed)return;
    this.queue.push(...fresh.map(c=>{
      const previous=c.battleDestroyed?this.field.get(c.battleDestroyed.uid):undefined;
      return {...c,unitGlass:previous?.entry===c.battleDestroyed?.fieldEntry?previous?.glass:undefined,
        handOrigins:c.handMove?new Map(this.handOrigins):undefined,foeHandOrigin:this.foeHandOrigin};
    }));await this.run();
  }
  private async run(){
    if(this.running)return;this.running=true;
    try{while(this.queue.length && !this.disposed){
      if(document.hidden){this.queue=[];break;}
      const cue=this.queue.shift()!;
      if(cue.handMove){
        await animateHandMove({kind:'handMove',owner:cue.owner,cards:cue.handMove},{
          source:()=>null,
          origin:uid=>(cue.owner===0?cue.handOrigins?.get(uid):cue.foeHandOrigin)??new DOMRect(innerWidth/2-35,cue.owner===0?innerHeight-98:0,70,98),
          destination:handMoveDestination,art:id=>ALL_CARDS[id]?artUrl(ALL_CARDS[id]!.thumb):CARD_BACK,back:CARD_BACK,viewer:0,signal:this.motion.signal,
        });continue;
      }
      if(cue.battleDestroyed && cue.unitGlass){
        playCue('destroy');await shatterUnit(cue.unitGlass,this.motion.signal);
        continue;
      }
      if(cue.kind==='check' && /^Barrier check/.test(cue.title)) {
        const mat=cue.owner===0?'.mat:not(.foe)':'.mat.foe';
        const shield=document.querySelector<HTMLElement>(`${mat} .barrier.broken`)??document.querySelector<HTMLElement>(`${mat} .z-barrier`);
        if(shield) { playCue('barrierBreak'); await shatterBarrier(shield.getBoundingClientRect(),this.motion.signal); }
        if(this.disposed || document.hidden)break;
      }
      if(cue.kind==='result' && /^(Resolved|Drew \d+|Charged|[+-]?[\d,]+ Power|Targets? |Some targets unavailable|Effect negated|Activation negated|Effect unavailable)/.test(cue.title)){
        const anchor=document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(cue.cards[0]?.uid??'')}"]`);
        feedbackAt(anchor,cue.title);continue;
      }
      if(cue.kind==='effect' && cue.cards.length===1){
        const card=cue.cards[0]!,record=ALL_CARDS[card.defId];
        if(record) await presentChainCue({name:record.name,image:boardUrl(record.art),
          inspect:()=>this.inspect(card.defId),
          ordinal:cue.chain?.ordinal??Number(/^Effect (\d+):/.exec(cue.title)?.[1]??1),stage:cue.chain?.stage??'resolving',opponent:cue.owner!==0,
          total:cue.chain?.total,negated:cue.chain?.negated,links:cue.chain?.links.flatMap(link=>{
            const rec=ALL_CARDS[link.defId];return rec?[{name:rec.name,image:boardUrl(rec.art),ordinal:link.ordinal,opponent:link.owner!==0,inspect:()=>this.inspect(link.defId)}]:[];
          }),
          ...(this.sourceFor?.(card.uid,cue.owner) ?? {source:document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(card.uid)}"]`)}),signal:this.motion.signal});
        if (!this.disposed) for (const target of cue.targets ?? []) {
          const node=document.querySelector<HTMLElement>(`.card[data-uid="${CSS.escape(target.uid)}"]`);
          if(node && ['ally','persona'].includes(node.dataset.zone??'') && node.dataset.fieldEntry===String(target.fieldEntry)) highlightEffectTarget(node);
        }
        continue;
      }
      const panel=document.createElement('aside');this.panel=panel;panel.className='remote-cue';panel.setAttribute('aria-live','polite');
      const title=document.createElement('strong');title.textContent=cue.title;panel.append(title);
      const cards=document.createElement('div');cards.className='remote-cue-cards';panel.append(cards);
      const sources:Element[]=[];
      for(const card of cue.cards){const record=ALL_CARDS[card.defId];if(!record)continue;
        const button=document.createElement('button'),image=document.createElement('img');image.src=artUrl(record.thumb);image.alt=record.name;button.append(image);button.title='Read card';button.onclick=()=>this.inspect(card.defId);button.oncontextmenu=e=>{e.preventDefault();this.inspect(card.defId);};cards.append(button);
        const source=document.querySelector(`[data-uid="${CSS.escape(card.uid)}"]`);if(source){source.classList.add('effect-source-active');sources.push(source);}
      }
      document.body.append(panel);playCue(cue.kind==='check'?'cardDraw':'confirm');
      try{await holdDuelMotion(waitFor(settings().duelPace,'resultHold')!);}finally{panel.remove();sources.forEach(s=>s.classList.remove('effect-source-active'));}
    }}finally{this.running=false;}
  }
}
