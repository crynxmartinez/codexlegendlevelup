import { PRESENTATION_HOOKS, presentationForViewer, type MatchPresentation } from './presentation.js';
import { GameController, type PlayerAction } from '../core/game.js';
import { createGame, validateDeck, validatePlayableDeck, type DeckList, type PlayerChoices } from '../core/setup.js';
import { availableSupporters } from '../core/battle.js';
import { eventLogOf } from '../core/events.js';
import type { GameState, PlayerId, HandMoveFx } from '../core/types.js';
import { MATCH_INDEX, MATCH_PROTOCOL, CONTENT_REVISION } from './catalog.js';
import { DecisionGate, decisionForViewer, type PendingDecision } from './decisions.js';
import { playerView } from './view.js';
import { opaqueInitialCards } from './opaque-cards.js';
import { publicEffectTargets, effectOutcomeLabel } from '../core/effect-presentation.js';
export interface MatchSetup { deck: DeckList; choice: PlayerChoices }
export interface MatchCue { id:number; owner:PlayerId; private:boolean; title:string; cards:{uid:string;defId:string}[]; kind:'check'|'effect'|'result'|'reveal';
  handMove?: HandMoveFx['cards'];
  battleDestroyed?: { uid:string; fieldEntry:number };
  targets?: { uid:string; fieldEntry:number }[];
  /** Public committed links only; never activation receipts or unrevealed choices. */
  chain?: { stage:'activated'|'resolving'; ordinal:number; total:number; negated?:boolean; links:{ordinal:number;owner:PlayerId;defId:string}[] };
}
export interface MatchFrame { protocol:number; content:string; revision:number; state:GameState; legal:PlayerAction[]; decision:PendingDecision|null; busy:boolean; cues:MatchCue[]; presentation?:MatchPresentation }

export function parseSetup(raw: unknown): MatchSetup {
  if (!raw || typeof raw !== 'object') throw new Error('Choose a legal deck');
  const { deck, choice } = raw as MatchSetup;
  if (!deck || typeof deck.name !== 'string' || deck.name.length>80 || !Array.isArray(deck.main) || deck.main.length>50 || !Array.isArray(deck.codex) || deck.codex.length!==5 ||
      !deck.main.every(e=>e && typeof e.id==='string' && Number.isInteger(e.copies) && e.copies>0 && e.copies<=3) ||
      new Set(deck.main.map(e=>e.id)).size!==deck.main.length || !deck.codex.every(id=>typeof id==='string') || typeof deck.persona!=='string') throw new Error('Invalid deck');
  if (deck.main.some(e=>!MATCH_INDEX[e.id] || MATCH_INDEX[e.id]!.type==='Token')) throw new Error('Unavailable card');
  const clean: DeckList = {name:deck.name,main:deck.main.map(e=>({id:e.id,copies:e.copies})),codex:[...deck.codex],persona:deck.persona};
  validatePlayableDeck(MATCH_INDEX, clean);
  const selected = {persona:choice?.persona ?? clean.persona, codex:choice?.codex ?? clean.codex[0]!};
  validateDeck(MATCH_INDEX,{...clean,persona:selected.persona});
  if(!clean.codex.includes(selected.codex))throw new Error('Choose a Codex from your deck');
  return {deck:clean,choice:selected};
}
export class MatchSession {
  readonly game:GameState;
  readonly ctrl:GameController;
  readonly decisions:DecisionGate;
  revision=0; busy=false; closed=false;
  private cues:MatchCue[]=[];
  private cueId=0;
  private presentationSerial=0;
  private presentation?:MatchPresentation;
  private collectingPresentation=false;
  constructor(setups:[MatchSetup,MatchSetup], seed:number, private changed:()=>void, firstPlayer?:PlayerId) {
    this.game=opaqueInitialCards(createGame(MATCH_INDEX,setups.map(s=>s.deck) as [DeckList,DeckList],{seed,firstPlayer,choices:setups.map(s=>s.choice) as [PlayerChoices,PlayerChoices]}));
    this.decisions=new DecisionGate(()=>this.publish());
    this.ctrl=new GameController(this.game,MATCH_INDEX,{choosers:[this.decisions.chooser(0),this.decisions.chooser(1)],
      hooks:{onAbilityResolved:async(uid,owner,outcome,summary)=>{
        const title=summary??effectOutcomeLabel(outcome);if(title)this.cue('result',owner,title,[uid]);
      },onFx:async fx=>{
        if(fx.kind==='handMove') this.handCue(fx.owner,fx.cards);
        if(fx.kind==='heartMove') {
          const cards=fx.cards.filter(card=>card.from==='hand'&&card.to!=='vanished').map(card=>({uid:card.uid,defId:card.defId,to:card.to as HandMoveFx['cards'][number]['to'],toSlot:card.toSlot,hidden:card.hidden}));
          if(cards.length)this.handCue(fx.owner,cards);
        }
        if(fx.kind==='restore'||fx.kind==='power'){
          const uid=fx.target;this.cue('result',this.game.cards[uid]!.owner,
            fx.kind==='restore'?'Charged · ready':`${fx.amount>=0?'+':''}${fx.amount.toLocaleString()} Power`,[uid]);
        }
      },onPhaseChange:async()=>this.publish(),onChainUpdated:async()=>{
        const chain=this.game.responseChain,link=chain?.links.at(-1);
        if(chain?.phase==='building'&&link)this.cue('effect',link.owner,`Chain ${link.ordinal}`,[link.source],false,this.chainCue('activated',link.ordinal));
        else this.publish();
      },
        onCheckRevealed:async(uid,isForce,kind)=>this.cue('check',this.game.cards[uid]!.owner,`${kind==='attack'?'Attack':'Barrier'} check · ${isForce?'Force revealed':this.game.players[this.game.cards[uid]!.owner].lakeBuluanCheckSwap?'Goes to Grave':'Goes to hand'}`,[uid]),
        onBlockersDeclared:async()=>this.publish(),onAttackDeclared:async()=>this.publish(),
        onAttackResolved:async(b,r)=>this.cue('result',b.defender,`${r.hit?'Defense broken':'Defended'} · ${r.attackPower.toLocaleString()} vs ${r.defensePower.toLocaleString()}`,[b.target??this.game.players[b.defender].persona!],false,undefined,
          r.hit && !r.sentryUsed && b.target && this.game.cards[b.target]?.zone==='grave' ? {uid:b.target,fieldEntry:this.game.cards[b.target]!.fieldEntry??0}:undefined),
        onAbilityActivated:async(uid,label,owner,_kind,position)=>this.cue('effect',owner,`Effect ${position}: ${label}`,[uid],false,this.chainCue('resolving',position))}});
    // Preserve the existing public history cues, but publish exactly one snapshot per hook.
    // The browser replays the SAME hooks as local play against these immutable frames.
    for (const hook of PRESENTATION_HOOKS) {
      const prior = this.ctrl.hooks[hook] as ((...args: unknown[]) => Promise<void>) | undefined;
      (this.ctrl.hooks as Record<string, unknown>)[hook] = async (...args: unknown[]) => {
        this.collectingPresentation = true;
        try { await prior?.(...args); } finally { this.collectingPresentation = false; }
        this.presentation = { id: ++this.presentationSerial, hook, args: structuredClone(args) };
        try { this.publish(); } finally { this.presentation = undefined; }
      };
    }

  }
  private handCue(owner:PlayerId,cards:HandMoveFx['cards']):void {
    this.cues.push({id:++this.cueId,kind:'result',owner,title:'Card movement',private:false,cards:[],handMove:structuredClone(cards)});
    this.cues=this.cues.slice(-32);this.publish();
  }
  private chainCue(stage:'activated'|'resolving',ordinal:number):MatchCue['chain'] {
    const chain=this.game.responseChain;
    if(!chain || chain.phase==='complete')return undefined;
    return {stage,ordinal,total:chain.links.length,negated:chain.links.find(link=>link.ordinal===ordinal)?.status==='negated',
      links:chain.links.filter(link=>(link.status==='committed'||link.status==='negated')&&link.ordinal<=ordinal).slice(-3)
      .map(link=>({ordinal:link.ordinal,owner:link.owner,defId:this.game.cards[link.source]!.defId}))};
  }
  private cue(kind:MatchCue['kind'],owner:PlayerId,title:string,uids:string[],privateOnly=false,chain?:MatchCue['chain'],battleDestroyed?:MatchCue['battleDestroyed']):void {
    const targets=chain?.stage==='resolving'?publicEffectTargets(this.game,this.game.responseChain?.links.find(link=>link.ordinal===chain.ordinal)).map(uid=>({uid,fieldEntry:this.game.cards[uid]!.fieldEntry??0})):undefined;
    this.cues.push({id:++this.cueId,kind,owner,title,private:privateOnly,chain,targets,battleDestroyed,cards:uids.flatMap(uid=>this.game.cards[uid]?[{uid,defId:this.game.cards[uid]!.defId}]:[])});
    this.cues=this.cues.slice(-32);this.publish();
  }
  publish():void { if(!this.closed && !this.collectingPresentation){this.revision++;this.changed();} }
  frame(seat:PlayerId):MatchFrame {
    const d=this.decisions.pending;
    const state = playerView(this.game,seat,d,eventLogOf(this.game).events);
    const presentation = this.presentation ? presentationForViewer(this.presentation,this.game,state,seat) : undefined;
    return {protocol:MATCH_PROTOCOL,content:CONTENT_REVISION,revision:this.revision,presentation,
      cues:this.cues.filter(c=>!c.private||c.owner===seat).map(c=>({...structuredClone(c),owner:c.owner===seat?0:1,
        handMove:c.handMove?.map((card,i)=>c.owner!==seat&&card.hidden?{...card,uid:`concealed-${c.id}-${i}`,defId:''}:{...card}),
        chain:c.chain?{...structuredClone(c.chain),links:c.chain.links.map(link=>({...link,owner:link.owner===seat?0:1}))}:undefined})),
      state,
      legal:this.busy||d||this.closed?[]:this.ctrl.legalActions(seat),
      decision:d?.owner===seat?decisionForViewer(d,seat):null,busy:this.busy};
  }
  async start():Promise<void> {this.busy=true;try{await this.ctrl.beginTurn();}finally{this.busy=false;this.publish();}}
  async action(seat:PlayerId, revision:unknown, raw:unknown):Promise<void> {
    if(this.closed||this.busy||this.decisions.pending||revision!==this.revision||this.game.winner!==null)throw new Error('The table changed. Please choose again.');
    const legal=this.ctrl.legalActions(seat);
    if(!raw||typeof raw!=='object')throw new Error('Invalid action');
    const a=raw as PlayerAction;
    const keys=Object.keys(a).sort().join(',');
    const canonical=(x:PlayerAction)=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))));
    const match=legal.some(l=>{
      if(a.kind==='attack'&&l.kind==='attack')return keys==='attacker,kind,supporters,target'&&a.attacker===l.attacker&&a.target===l.target&&Array.isArray(a.supporters)&&new Set(a.supporters).size===a.supporters.length&&a.supporters.every(s=>typeof s==='string'&&availableSupporters(this.game,a.attacker).includes(s));
      return canonical(a)===canonical(l);
    });
    if(!match)throw new Error('That move is not available');
    this.busy=true;this.publish();
    try {await this.ctrl.perform(a,seat);if(a.kind==='endTurn'&&this.game.winner===null)await this.ctrl.beginTurn();}
    finally {this.busy=false;this.game.pendingFx.length=0;this.publish();}
  }
  close():void {
    if(this.closed)return;
    this.closed=true;this.decisions.cancel();
    // The room publishes after closing (surrender/disconnect). That terminal
    // snapshot must be newer than the last decision or clients discard it.
    this.revision++;
  }
}
