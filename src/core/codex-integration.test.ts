import { it, expect, vi } from 'vitest';
import agta from '../../decks/agta-set-1.json';
import bab from '../../decks/babaylan-set-1.json';
import mag from '../../decks/maguindanao-set-1.json';
import { AGTA_SET_ONE_IDS as a } from '../cards/agta-set-1.js';
import { BABAYLAN_SET_ONE_IDS as b } from '../cards/babaylan-set-1.js';
import proposals from '../../content/maguindanao-set-1-skills.json';
const m=Object.keys(proposals);
import { FULL_INDEX as index, ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { createGame } from './setup.js';
import { GameController, ALL_SCRIPTS } from './game.js';
import { autoChooser, type Chooser } from './effects.js';
import { you, inst, moveCard } from './state.js';

it('all current becoming-active Codex effects have a finite usage limit', () => {
  const codices = Object.values(ALL_CARDS).filter(c => c.type === 'Codex' && isSelectableCard(c));
  expect(codices).toHaveLength(30);
  const onSwitch = codices.flatMap(c => {
    const skill = ALL_SCRIPTS[c.id]?.codex?.skill;
    const triggers = Array.isArray(skill?.trigger) ? skill.trigger : [skill?.trigger];
    return skill && triggers.some(t => t === 'codexPlayed' || t === 'codexChanged') ? [{ card: c, skill }] : [];
  });
  expect(onSwitch).toHaveLength(4);
  for (const { card, skill } of onSwitch) expect(skill.maxUses, card.name).toBe(1);
});

it.each([[agta,a[37]!,0],[bab,b[44]!,2],[bab,b[38]!,5],[mag,m[50]!,0]] as const)('manual switching away and back cannot repeat a becoming-active skill: %#', async (deck, id, hearts) => {
  const f = fixture(deck, id); f.game.phase = 'main';
  for (const uid of f.ps.deck.slice(0, hearts)) moveCard(f.game, uid, 'heart');
  const reserve = 'reserve-codex';
  const reserveId = deck.codex.find(card => card !== id)!;
  f.game.cards[reserve] = { ...structuredClone(f.game.cards[f.uid]!), uid: reserve, defId: reserveId };
  f.ps.codex.push(reserve);
  const skill = f.ctrl.scriptFor(f.uid)!.codex!.skill!;
  expect(skill.maxUses).toBe(1);
  const resolved = vi.spyOn(skill, 'run');
  try {
    await f.ctrl.perform({ kind: 'switchCodex', uid: f.uid }, 0);
    await f.ctrl.perform({ kind: 'switchCodex', uid: reserve }, 0);
    await f.ctrl.perform({ kind: 'switchCodex', uid: f.uid }, 0);
    expect(resolved).toHaveBeenCalledTimes(1);
    expect(f.ps.normalPlaysUsed).toBe(3);
  } finally { resolved.mockRestore(); }
});

function fixture(deck: typeof agta, id: string) {
 const game=createGame(index,[deck,deck],{seed:17});
 game.turnPlayer=0; game.turnNumber=10;
 const ps=you(game,0); ps.activeCodex=null;
 const uid='test-codex';
 game.cards[uid]={...structuredClone(inst(game,ps.persona!)),uid,defId:id,zone:'check',slot:null};
 moveCard(game,uid,'codex'); ps.codex=[uid];
 const personify=vi.fn();
 const chooser:Chooser={...autoChooser,personifyPrompt:async()=>null,chooseAbility:async(_p,_q,opts)=>{const i=opts.findIndex(o=>o.uid===uid);return i<0?null:i;}};
 const ctrl=new GameController(game,index,{choosers:[chooser,chooser],hooks:{onPersonify:personify}});
 return {game,ps,uid,ctrl,personify};
}

it.each([[agta,a[33]!],[bab,b[37]!],[mag,m[45]!]] as const)('deck Personify switches before the step and emits its hook: %#',async(deck,id)=>{
 const f=fixture(deck,id);
 const candidate=f.ps.deck.find(u=>index[inst(f.game,u).defId]?.level===3 && index[inst(f.game,u).defId]?.type==='Unit')!;
 expect(candidate).toBeTruthy();
 f.ps.deck.splice(f.ps.deck.indexOf(candidate),1); f.ps.deck.splice(1,0,candidate);
 await f.ctrl.beginTurn();
 expect(f.ps.activeCodex).toBe(f.uid);
 expect(f.ps.persona).toBe(candidate);
 expect(f.ps.personifiedThisTurn).toBe(true);
 expect(f.personify).toHaveBeenCalledWith(candidate,0);
});
it('Arawen switches before the draw, not after it',async()=>{
 const f=fixture(agta,a[32]!); const before=f.ps.hand.length;
 await f.ctrl.beginTurn();
 expect(f.ps.activeCodex).toBe(f.uid); expect(f.ps.hand.length).toBe(before);
 expect(f.ps.sipolThisTurn).toBe(1);
});
it('Moonwake switches before drawing and generates two spirits instead',async()=>{
 const f=fixture(bab,b[45]!); const before=f.ps.hand.length,heart=f.ps.heart.length;
 await f.ctrl.beginTurn();
 expect(f.ps.hand.length).toBe(before); expect(f.ps.heart.length).toBe(heart+2);
});
it('Mantapuli pays before drawing on its activation turn',async()=>{
 const f=fixture(mag,m[41]!); const top=f.ps.deck[0]!;
 await f.ctrl.beginTurn(); expect(inst(f.game,top).zone).toBe('grave');
});
it('Amuran becoming active fires its three Sipol through the controller',async()=>{
 const f=fixture(agta,a[37]!); f.game.phase='main';
 await f.ctrl.perform({kind:'switchCodex',uid:f.uid},0);
 expect(f.ps.sipolThisTurn).toBe(3);expect(f.ps.energy).toBeUndefined();
});
it('Faithless Prison becoming active vents through the controller',async()=>{
 const f=fixture(bab,b[44]!);f.game.phase='main';
 for(const u of f.ps.deck.slice(0,2))moveCard(f.game,u,'heart');
 await f.ctrl.perform({kind:'switchCodex',uid:f.uid},0);
 expect(f.ps.heart).toHaveLength(0);
});


it('declining a draw-window switch is not asked again after the draw',async()=>{
 const f=fixture(agta,a[32]!);let offers=0;
 const chooser:Chooser={...autoChooser,personifyPrompt:async()=>null,chooseAbility:async()=>null,
 chooseTarget:async(_p,prompt,candidates)=>{if(/switch Codex/i.test(prompt)){offers++;return null;}return candidates[0]??null;}};
 const ctrl=new GameController(f.game,index,{choosers:[chooser,chooser]});
 await ctrl.beginTurn();expect(offers).toBe(1);expect(f.ps.activeCodex).toBeNull();
});
it.each([[bab,b[36]!, 'heart',6],[mag,m[46]!,'grave',5]] as const)('State release dispatches without manually firing a State event: %#',async(deck,id,zone,count)=>{
 const f=fixture(deck,id);f.ps.activeCodex=f.uid;f.ps.codexSwitchedThisTurn=true;f.game.phase='main';
 const {currentPower}=await import('./state.js');
 const hero=f.ps.persona!,before=currentPower(index,f.game,hero);
 for(const u of f.ps.deck.filter(u=>index[inst(f.game,u).defId]?.type==='Unit' && (zone!=='grave' || index[inst(f.game,u).defId]?.subtypes?.includes('Maguindanaon'))).slice(0,count))moveCard(f.game,u,zone);
 await f.ctrl.fireTrigger('startOfMain',0);
 expect(currentPower(index,f.game,hero)).toBeGreaterThanOrEqual(before+1000);
});
it('Illana Bay never inflates Maguindanaon Grave counts',async()=>{
 const f=fixture(mag,m[47]!);f.ps.activeCodex=f.uid;f.game.phase='battle';
 const {offerUnit,maguindanaoGraveCountRaw}=await import('./effects.js');
 const u=f.ps.deck.find(u=>index[inst(f.game,u).defId]?.type==='Unit' && index[inst(f.game,u).defId]?.subtypes?.includes('Maguindanaon'))!;
 moveCard(f.game,u,'ally',{slot:0});
 const ctx={game:f.game,index,me:0 as const,source:f.ps.persona!,chooser:autoChooser};
 const base=maguindanaoGraveCountRaw(index,f.game,0);
 offerUnit(ctx,u);expect(maguindanaoGraveCountRaw(index,f.game,0)).toBe(base+1);
 moveCard(f.game,u,'ally',{slot:0});f.game.phase='main';offerUnit(ctx,u);
 expect(maguindanaoGraveCountRaw(index,f.game,0)).toBe(base+1);
 moveCard(f.game,u,'ally',{slot:0});moveCard(f.game,u,'grave');
 expect(maguindanaoGraveCountRaw(index,f.game,0)).toBe(base+1);
});


it('Danao delayed Kalas cannot be waived by declining the end-turn prompt',async()=>{
 const f=fixture(bab,b[42]!);f.ps.activeCodex=f.uid;f.ps.codexSwitchedThisTurn=true;
 const {createKaluluwaTokens}=await import('./effects.js');
 createKaluluwaTokens({game:f.game,index,me:0,source:f.uid,chooser:autoChooser},4);
 await f.ctrl.fireTrigger('personaAttack',0,{name:'personaAttack',unit:f.ps.persona!});
 expect(f.ps.trialDebtTurn).toBe(f.game.turnNumber);
 const decline:Chooser={...autoChooser,chooseAbility:async()=>null,chooseTarget:async()=>null,chooseCards:async()=>[]};
 const ctrl=new GameController(f.game,index,{choosers:[decline,decline]});
 await ctrl.finishTurn();expect(f.ps.heart).toHaveLength(1);expect(f.ps.trialDebtTurn).toBeUndefined();
});
it('Illana Bay does not turn an Offered Unit from another deck into Maguindanaon Grave cards',async()=>{
 const f=fixture(mag,m[47]!);f.ps.activeCodex=f.uid;f.game.phase='main';
 const {offerUnit,maguindanaoGraveCountRaw}=await import('./effects.js');
 const u=f.ps.deck.find(u=>index[inst(f.game,u).defId]?.type==='Unit')!;
 inst(f.game,u).defId=Object.values(index).find(d=>d.type==='Unit' && d.id.startsWith('agta/set-1/'))!.id;
 expect(u).toBeTruthy();moveCard(f.game,u,'ally',{slot:0});
 offerUnit({game:f.game,index,me:0,source:f.ps.persona!,chooser:autoChooser},u);
 expect(maguindanaoGraveCountRaw(index,f.game,0)).toBe(0);
});
it('Taliman cannot Sipol for free when its discard selection is cancelled',async()=>{
 const f=fixture(agta,a[35]!);f.ps.activeCodex=f.uid;f.ps.codexSwitchedThisTurn=true;
 const revealed=f.ps.deck.find(u=>index[inst(f.game,u).defId]?.type==='Action')!;
 const chooser:Chooser={...autoChooser,chooseTarget:async()=>null};
 const ctrl=new GameController(f.game,index,{choosers:[chooser,chooser]});
 const hand=f.ps.hand.length;
 await ctrl.fireTrigger('barrierBroken',0,{name:'barrierBroken',revealed});
 expect(f.ps.sipolThisTurn??0).toBe(0);expect(f.ps.hand).toHaveLength(hand);
});


it.each([0, 4, 5])('Mantapuli with %i Units in Grave presents payment before its conditional draw', async count => {
 const f=fixture(mag,m[41]!);
 for(const u of [...f.ps.grave]) moveCard(f.game,u,'deck');
 const units=f.ps.deck.filter(u=>index[inst(f.game,u).defId]?.type==='Unit' && index[inst(f.game,u).defId]?.subtypes?.some(s=>s==='Maguindanaon'||s==='Maguindanao'));
 expect(units.length).toBeGreaterThan(count+1);
 for(const u of units.slice(0,count))moveCard(f.game,u,'grave');
 const top=units[count]!;f.ps.deck.splice(f.ps.deck.indexOf(top),1);f.ps.deck.unshift(top);
 const next=f.ps.deck[1]!, hand=f.ps.hand.length;
 const sequence:string[]=[];
 let releases=0;
 f.ctrl.hooks.onAbilityActivated=async uid=>{if(uid===f.uid)sequence.push('source');};
 f.ctrl.hooks.onFx=async fx=>{if(fx.kind==='stateReleased'&&fx.player===0)releases++;if(fx.kind==='emit'&&fx.uid===top){sequence.push('payment');expect(inst(f.game,next).zone).toBe('deck');}};
 f.ctrl.hooks.onEffectDraw=async uid=>{sequence.push('draw');expect(uid).toBe(next);expect(inst(f.game,top).zone).toBe('grave');};
 await f.ctrl.beginTurn();
 expect(inst(f.game,top).zone).toBe('grave');
 expect(f.ps.hand.length).toBe(hand+(count>=4?1:0));
 expect(sequence).toEqual(count>=4?['source','payment','draw']:['source','payment']);
 expect(releases).toBe(count>=4?1:0);
});
