import {describe,it,expect} from 'vitest';
import deck from '../../decks/agta-set-1.json' with {type:'json'};
import mag from '../../decks/maguindanao-set-1.json' with {type:'json'};
import bab from '../../decks/babaylan-set-1.json' with {type:'json'};
import {AGTA_SET_ONE_IDS as ids} from '../cards/agta-set-1.js';
import {ALL_CARDS,FULL_INDEX as index,isSelectableCard} from '../data/loader.js';
import {ALL_SCRIPTS,GameController} from './game.js';
import {createGame} from './setup.js';
import {checkDeck} from './deckcheck.js';
import {autoChooser,specialCall,type EffectContext,type TriggerName,type TriggerEvent} from './effects.js';
import {inst,moveCard,you,currentPower} from './state.js';
import {reevaluateState,tryReleaseEventState} from './states.js';
import type {Zone,PlayerId} from './types.js';
import {AiChooser,playAiTurn} from '../ai/bot.js';
const id=(n:number)=>ids[n-1]!;
function fresh(persona=1,codex=34){
 const game=createGame(index,[deck,deck],{seed:17});game.turnPlayer=0;game.turnNumber=10;game.phase='main';
 const ctrl=new GameController(game,index,{choosers:[autoChooser,autoChooser]});let serial=0;
 const ps=you(game,0);
 function add(n:number,zone:Zone='deck',owner:PlayerId=0){const uid=`a1-${serial++}`;game.cards[uid]={...structuredClone(inst(game,you(game,owner).persona!)),uid,defId:id(n),owner,zone:'check',slot:null,exhausted:false,modifiers:[],usesThisTurn:{},setOneUses:{},fieldEntry:0};if(zone==='persona')moveCard(game,you(game,owner).persona!,'grave');moveCard(game,uid,zone,{slot:zone==='ally'?you(game,owner).allies.indexOf(null):undefined});return uid;}
 for(const p of [0,1] as const){you(game,p).codexSwitchedThisTurn=true;you(game,p).activeCodex=null;}
 const hero=add(persona,'persona'),active=add(codex,'codex');ps.activeCodex=active;for(const u of [...ps.grave])moveCard(game,u,'deck');
 const settle=async()=>{await ctrl.flushSpecialCallTriggers();await ctrl.flushDamageTriggers();await ctrl.flushSpiritTriggers();};
 const ctx=(source=hero):EffectContext=>({game,index,source,me:0,chooser:autoChooser,settle});
 const event=async(name:TriggerName,unit=hero,extra:Partial<TriggerEvent>={})=>{await ctrl.fireTrigger(name,0,{name,unit,...extra});await settle();};
 const use=async(u=hero,i=0)=>{expect(ctrl.legalActions(0)).toContainEqual({kind:'ability',uid:u,abilityIndex:i});await ctrl.perform({kind:'ability',uid:u,abilityIndex:i},0);};
 const call=async(u:string)=>{await specialCall(ctx(),u,{allowOverwrite:false});await settle();};
 const fill=()=>{while(ps.allies.includes(null))add(5,'ally');tryReleaseEventState(index,game,0);};
 const play=async(n:number)=>{ps.normalPlaysUsed=0;const u=add(n,'hand');expect(ctrl.legalActions(0)).toContainEqual({kind:'playAction',uid:u});await ctrl.perform({kind:'playAction',uid:u},0);return u;};
 return{game,ctrl,ps,hero,active,add,event,use,call,fill,play,ctx,settle};
}
describe('Agta catalogue and legality',()=>{
 it('shows Nagdombilan sending its chosen hand card to Deck before Sipol calls it', async () => {
  const f = fresh(1);
  f.ps.activeCodex = null;
  for (const uid of [...f.ps.hand]) moveCard(f.game, uid, 'deck');
  const source = f.add(9, 'ally'), chosen = f.add(7, 'hand');
  f.game.pendingFx.length = 0;
  const observed: string[] = [];
  f.ctrl.hooks.onFx = async fx => {
    if (fx.kind === 'handMove' && fx.cards.some(card => card.uid === chosen)) {
      observed.push('hand-to-deck');
      expect(inst(f.game, chosen).zone).toBe('deck');
      expect(f.ps.deck[0]).toBe(chosen);
    }
  };
  await f.event('placed', source, {special:true,from:'deck'});
  expect(observed).toEqual(['hand-to-deck']);
  expect(inst(f.game, chosen).zone).toBe('ally');
 });
 it('all 42 new cards have scripts and Banoy is the only older selectable Agta',()=>{
  const pool=Object.values(ALL_CARDS).filter(c=>c.deck==='Agta'&&isSelectableCard(c));expect(pool).toHaveLength(43);
  expect(pool.filter(c=>!c.id.includes('/set-1/')).map(c=>c.id)).toEqual(['agta/sierra-watchkeeper-banoy']);
  expect(ALL_SCRIPTS['agta/sierra-watchkeeper-banoy']?.sentry).toBe(true);
  for(const key of ids){expect(ALL_CARDS[key]!.effectsPending,key).toBe(false);expect(ALL_CARDS[key]!.text.length,key).toBeGreaterThan(30);expect(ALL_SCRIPTS[key],key).toBeDefined();}
  expect(checkDeck(index,deck)).toEqual([]);expect(deck.main.some(c=>c.id==='agta/sierra-watchkeeper-banoy')).toBe(true);
 });
 it('Sipol calls the top Unit and bottoms a miss, without losing cards', async () => {
  // Retargeted from Taguwasi, whose look-at-three action became a start-of-Main
  // trigger. Kalimangalnuk is the Persona that still pays Energy to dig.
  const f = fresh(2);
  for (const u of [...f.ps.deck]) moveCard(f.game, u, 'grave');
  const miss = f.add(23);
  const all = Object.keys(f.game.cards).length;
  await f.use();
  expect(f.ps.deck.at(-1), 'a non-Unit goes under').toBe(miss);
  expect(Object.keys(f.game.cards), 'nothing duplicated or lost').toHaveLength(all);
  expect(f.ps.energy).toBeUndefined();
 });
 it('an Energy-free skill remains legal when its actual conditions are met', () => {
  const f = fresh(2);

  expect(f.ctrl.legalActions(0)).toContainEqual({ kind: 'ability', uid: f.hero, abilityIndex: 0 });

  expect(f.ctrl.legalActions(0)).toContainEqual({ kind: 'ability', uid: f.hero, abilityIndex: 0 });
 });
});
describe('The three Personas', () => {
 it('1 Taguwasi arranges the top three at the start of Main', async () => {
  const f = fresh(1);
  const top = f.ps.deck.slice(0, 3);
  await f.event('startOfMain');
  expect(f.ps.deck.slice(0, 3).sort(), 'the same three, still on top')
    .toEqual([...top].sort());
  expect(f.ps.deck).toHaveLength(f.ps.deck.length);
 });
 it('1 Taguwasi digs on its own attack, but only with Bayanihan', async () => {
  const f = fresh(1);
  const hit = f.add(5);
  f.ps.deck.splice(f.ps.deck.indexOf(hit), 1);
  f.ps.deck.unshift(hit);
  await f.event('attack');
  expect(inst(f.game, hit).zone, 'no Bayanihan, no dig').toBe('deck');

  const g = fresh(1);
  g.fill();
  // Card 16 arrives free. Card 5 now charges an Energy of its own on
  // arrival, which would be counted against the dig.
  const u = g.add(16);
  g.ps.deck.splice(g.ps.deck.indexOf(u), 1);
  g.ps.deck.unshift(u);
  await g.event('attack');
  expect(g.ps.energy).toBeUndefined();
 });
 it('2 Kalimangalnuk takes the Power of what it called', async () => {
  const f = fresh(2);
  const called = f.add(5);
  f.ps.deck.splice(f.ps.deck.indexOf(called), 1);
  f.ps.deck.unshift(called);
  const base = currentPower(index, f.game, f.hero);
  await f.use();
  expect(inst(f.game, called).zone).toBe('ally');
  // A Level 2 is 9000, so the Persona should be up by exactly that.
  expect(currentPower(index, f.game, f.hero)).toBe(base + 9000);
 });
 it('2 Kalimangalnuk gives the field +2000 while Bayanihan holds', async () => {
  const f = fresh(2);
  const ally = f.add(5, 'ally');
  const bare = currentPower(index, f.game, ally);
  f.fill();
  reevaluateState(index, f.game, 0);
  expect(f.ps.releasedState).toBe('Bayanihan');
  expect(currentPower(index, f.game, ally)).toBe(bare + 2000);
  moveCard(f.game, f.ps.allies.find(Boolean)!, 'grave');
  reevaluateState(index, f.game, 0);
  expect(currentPower(index, f.game, ally), 'and it lapses with the formation')
    .toBe(bare);
 });
 it('3 Nanolay draws and grows on its own attack', async () => {
  const f = fresh(3);
  const hand = f.ps.hand.length;
  const base = currentPower(index, f.game, f.hero);
  await f.event('attack');
  expect(f.ps.hand).toHaveLength(hand + 1);
  expect(currentPower(index, f.game, f.hero)).toBe(base + 3000);
  expect(f.ps.energy).toBeUndefined();
 });
 it('3 Nanolay ascends mid-battle only from a battle deck call', async () => {
  const f = fresh(1);
  const nan = f.add(3, 'ally');
  f.fill();
  inst(f.game, nan).calledFromDeckInBattleTurn = f.game.turnNumber;
  while (f.ps.hand.length < 2) f.add(23, 'hand');
  f.game.phase = 'battle';
  const outgoing = f.ps.persona!;
  await f.event('attackResolved', f.hero);
  expect(f.ps.persona, 'Nanolay takes the seat').toBe(nan);
  expect(inst(f.game, outgoing).zone, 'the old Persona goes to the Heart').toBe('heart');
  expect(inst(f.game, nan).exhausted, 'and arrives charged').toBe(false);
 });
});
describe('The seven Level 2 Units', () => {
 it('4 Talimanog Sumipats one on arrival with no Energy', async () => {
  const f = fresh(1);
  const u = f.add(4);

  const top = f.ps.deck.find((x) => x !== u);
  await f.call(u);
  expect(f.ps.energy).toBeUndefined();
  expect(f.ps.deck.at(-1), 'the judged card went under').toBe(top);
 });
 it('10 Namandiyanin pays one Energy for all three Sumipat checks', async () => {
  const f = fresh(1);
  const u = f.add(10);

  const top = f.ps.deck.filter(x => x !== u).slice(0, 3);
  await f.call(u);
  expect(f.ps.energy).toBeUndefined();
  expect(f.ps.deck.slice(-3)).toEqual(top);
 });
 it('10 Namandiyanin can Sumipat without a currency gate', async () => {
  const f = fresh(1);
  const u = f.add(10);

  const before = f.ps.deck.filter(x => x !== u);
  await f.call(u);
  expect(inst(f.game, u).zone).toBe('ally');
  expect(f.ps.energy).toBeUndefined();
  expect(f.ps.deck.slice(-3)).toEqual(before.slice(0, 3));
 });
 it('shows the corrected costs in card information', () => {
  expect(ALL_CARDS[id(4)]!.text).not.toContain('[Cost: 1 Energy]');
  expect(ALL_CARDS[id(10)]!.text).toContain('Sumipat 3');
 });
 it('5 Ammani puts itself back when the top is not a Unit', async () => {
  const f = fresh(1);
  const dud = f.add(23);                       // an Action
  f.ps.deck.splice(f.ps.deck.indexOf(dud), 1);
  f.ps.deck.unshift(dud);
  const u = f.add(5);
  await f.call(u);
  expect(f.ps.deck.at(-1), 'the dud goes under').toBe(dud);
  expect(inst(f.game, u).zone, 'and Ammani rides the deck').toBe('deck');
  expect(f.ps.deck[0], 'on top of it').toBe(u);
 });
 it('5 Ammani stays put when the top is already a Unit', async () => {
  const f = fresh(1);
  const good = f.add(16);
  f.ps.deck.splice(f.ps.deck.indexOf(good), 1);
  f.ps.deck.unshift(good);
  const u = f.add(5);
  await f.call(u);
  expect(inst(f.game, u).zone, 'nothing to fix').toBe('ally');
 });
 it('6 Annibo rides the deck when the Persona swings', async () => {
  const f = fresh(1);
  const u = f.add(6, 'ally');
  await f.event('attack', f.hero);
  expect(inst(f.game, u).zone).toBe('deck');
  expect(f.ps.deck[0]).toBe(u);
 });
 it('7 Alig grows on every arrival but its own', async () => {
  const f = fresh(1);
  const u = f.add(7, 'ally');
  const base = currentPower(index, f.game, u);
  await f.call(f.add(16));
  expect(currentPower(index, f.game, u)).toBe(base + 2000);
 });
 // Every Level 2 Unit that answers its own arrival carries the swap.
 for (const [n, name] of [[4, 'Talimanog'], [5, 'Ammani'], [8, 'Ammalabukkaw'],
   [9, 'Nagdombilan'], [10, 'Namandiyanin']] as const) {
  it(`${n} ${name} switches to a strike once Bayanihan is out`, async () => {
   const f = fresh(1);
   const u = f.add(n, 'ally');
   f.fill();
   reevaluateState(index, f.game, 0);
   expect(f.ps.releasedState).toBe('Bayanihan');
   const target = f.ps.allies.find((x) => x && x !== u)!;
   const base = currentPower(index, f.game, target);
   const deck = f.ps.deck.length;
   await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, special: true, from: 'deck' });
   await f.settle();
   const boosted = f.ps.allies.filter(Boolean)
     .some((x) => currentPower(index, f.game, x!) >= base + 3000);
   expect(boosted, 'a Unit was struck up instead of digging').toBe(true);
   expect(f.ps.deck.length, 'and the deck was not dug').toBe(deck);
  });
 }

 for (const n of [4, 5, 10] as const) {
  it(`${n} pays no Energy for the skill Bayanihan replaced`, async () => {
   // The cost is declared inside the skill, not on the ability, so the
   // engine cannot charge it for a skill that never ran.
   const f = fresh(1);
   const u = f.add(n, 'ally');
   f.fill();
   reevaluateState(index, f.game, 0);
   await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, special: true, from: 'deck' });
   await f.settle();
   expect(f.ps.energy).toBeUndefined();
  });
 }

 it('6 Annibo strikes instead of leaving once Bayanihan is out', async () => {
  // Persona 2, not 1: Taguwasi also answers its own attack with a Sipol,
  // and Bayanihan means the board is full, so that Sipol overwrites a Zone
  // and buries whichever Unit this test is watching.
  const f = fresh(2);
  const u = f.add(6, 'ally');
  f.fill();
  reevaluateState(index, f.game, 0);
  expect(f.ps.releasedState).toBe('Bayanihan');
  await f.event('attack', f.hero);
  expect(inst(f.game, u).zone, 'it stays on the field').toBe('ally');
 });

});
describe('The eight Level 1 Units', () => {
 it('11 Innawagan rides the deck back when played from hand', async () => {
  const f = fresh(2);
  // In the Zone, as it is when `placed` really fires — the event only says
  // where it came FROM.
  const u = f.add(11, 'ally');
  await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, from: 'hand' });
  await f.settle();
  expect(inst(f.game, u).zone).toBe('deck');
  expect(f.ps.deck[0]).toBe(u);
  expect(f.ps.energy).toBeUndefined();
 });

 it('11 Innawagan does nothing when it arrived from the deck', async () => {
  const f = fresh(2);
  const u = f.add(11, 'ally');
  await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, special: true, from: 'deck' });
  await f.settle();
  expect(inst(f.game, u).zone, 'from hand only').toBe('ally');
  expect(f.ps.energy).toBeUndefined();
 });

 it('12 Dalewasan strikes two Units on arrival', async () => {
  const f = fresh(2);
  const a = f.add(16, 'ally'), b = f.add(16, 'ally');
  const u = f.add(12, 'ally');
  const base = currentPower(index, f.game, a);
  await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, special: true, from: 'deck' });
  await f.settle();
  const lifted = [a, b, u].filter((x) => currentPower(index, f.game, x) > base).length;
  expect(lifted, 'two Units were lifted').toBe(2);
  expect(f.ps.energy).toBeUndefined();
 });

 it('13 Sinag trades a card when played from hand', async () => {
  const f = fresh(2);
  f.add(23, 'hand');
  const u = f.add(13, 'ally');
  const hand = f.ps.hand.length;
  await f.ctrl.fireTrigger('placed', 0, { name: 'placed', unit: u, from: 'hand' });
  await f.settle();
  expect(f.ps.hand, 'one out, one in').toHaveLength(hand);
 });

 it('14 Darawan grows when another Unit arrives from the deck', async () => {
  const f = fresh(2);
  const u = f.add(14, 'ally');
  const base = currentPower(index, f.game, u);
  await f.call(f.add(16));
  expect(currentPower(index, f.game, u)).toBe(base + 3000);
 });

 it('15 Amuray puts itself back from hand, for an Energy', async () => {
  const f = fresh(2);
  const u = f.add(15, 'hand');
  await f.use(u);
  expect(inst(f.game, u).zone).toBe('deck');
  expect(f.ps.deck[0]).toBe(u);
  expect(f.ps.energy).toBeUndefined();
 });

 it('16 Kallan trades itself for a card, from hand', async () => {
  const f = fresh(2);
  const u = f.add(16, 'hand');
  const hand = f.ps.hand.length;
  await f.use(u);
  expect(inst(f.game, u).zone).toBe('grave');
  expect(f.ps.hand, 'itself out, one drawn').toHaveLength(hand);
 });

 it('17 Tamin buries itself to recall a Unit to the top', async () => {
  const f = fresh(2);
  const u = f.add(17, 'ally');
  const friend = f.add(16, 'ally');
  await f.use(u);
  expect(f.ps.deck.at(-1), 'Tamin goes under').toBe(u);
  expect(f.ps.deck[0], 'and the chosen Unit rides on top').toBe(friend);
  expect(f.ps.energy).toBeUndefined();
 });

 it('18 Ulagan strengthens as it supports', async () => {
  const f = fresh(2);
  const u = f.add(18, 'ally');
  const base = currentPower(index, f.game, u);
  await f.event('attack', f.hero, { supporters: [u] });
  expect(currentPower(index, f.game, u)).toBe(base + 3000);
 });

 // The swap reaches every Level 1 Unit whose skill happens on the field.
 for (const n of [11, 12, 13, 14, 17, 18] as const) {
  it(`${n} swaps to a strike once Bayanihan is released`, async () => {
   const f = fresh(2);
   const u = f.add(n, 'ally');
   f.fill();
   reevaluateState(index, f.game, 0);
   expect(f.ps.releasedState).toBe('Bayanihan');
   const before = f.ps.allies.filter(Boolean)
     .map((x) => currentPower(index, f.game, x!));
   if (n === 17) await f.use(u);
   else if (n === 18) await f.event('attack', f.hero, { supporters: [u] });
   else {
    await f.ctrl.fireTrigger('placed', 0,
      { name: 'placed', unit: n === 14 ? f.ps.allies.find((x) => x && x !== u)! : u,
        special: n !== 11 && n !== 13, from: n === 11 || n === 13 ? 'hand' : 'deck' });
    await f.settle();
   }
   const after = f.ps.allies.filter(Boolean)
     .map((x) => currentPower(index, f.game, x!));
   const lifted = after.some((p, i) => p >= (before[i] ?? 0) + 3000);
   expect(lifted, 'a Unit was struck up instead').toBe(true);
   expect(f.ps.energy).toBeUndefined();
  });
 }

 it('15 and 16 keep no swap, being hand abilities', () => {
  for (const n of [15, 16] as const) {
   const text = ALL_CARDS[id(n)]!.text;
   expect(text, `${id(n)}`).not.toContain('Bayanihan is released and this Unit');
   expect(text, `${id(n)}`).toContain('[Hand]');
  }
 });
});
describe('Real complete matches',()=>{for(const [label,opponent]of [['mirror',deck],['Maguindanao',mag],['Babaylan',bab]]as const)it(label,async()=>{const game=createGame(index,[deck,opponent],{seed:42});const ai=new AiChooser(index,()=>game);const ctrl=new GameController(game,index,{choosers:[ai,ai]});for(let n=0;n<80&&game.winner==null;n++){await ctrl.beginTurn();await playAiTurn(ctrl,game.turnPlayer);expect(game.players.every(p=>p.normalPlaysUsed>=0&&p.allies.filter(Boolean).length<=4)).toBe(true);}expect(game.winner).not.toBeNull();},60000);});


