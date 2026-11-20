import { describe, it, expect } from 'vitest';
import deck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import magDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { ALL_CARDS, FULL_INDEX as index, isSelectableCard } from '../data/loader.js';
import { BABAYLAN_SET_ONE_IDS as ids, finishBabaylanReturns } from '../cards/babaylan-set-1.js';
import { createGame, validateDeck } from './setup.js';
import { checkDeck } from './deckcheck.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { autoChooser, createKaluluwaTokens, essenceCard, kaluluwaCount, releaseSpirits, specialCall, type Chooser, type EffectContext, type TriggerEvent, type TriggerName } from './effects.js';
import { currentPower, inst, moveCard, you } from './state.js';
import { reevaluateState } from './states.js';
import type { PlayerId, Zone } from './types.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { abilityChoices } from '../ui/ability-choices.js';
const id = (n: number) => ids[n - 1]!;
/**
 * The default Codex is a deliberately inert one.
 *
 * Kabulaw only does anything during the Personify step, so it cannot colour a
 * test about something else. The default used to be Mount Lantoy, which now
 * gives every Unit +1000 when a State releases — a real effect that quietly
 * added itself to three tests that were measuring Persona and Action Power.
 */
function fresh(persona = 7, codex = 38, overrides: Partial<Chooser> = {}) {
  const game = createGame(index, [deck, deck], { seed: 25 });
  game.turnPlayer = 0; game.turnNumber = 10; game.phase = 'main';
  const chooser: Chooser = { ...autoChooser, chooseTarget: async (_p, prompt, pool) => /switch Codex/i.test(prompt) ? null : pool[0] ?? null, chooseAbility: async (_p, _prompt, options, context) => context?.kind === 'response' || context?.kind === 'battle' ? null : options.length ? 0 : null, confirm: async (_p, prompt) => !prompt.startsWith("Use the follow-up to "), ...overrides };
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  let serial = 0;
  function add(n: number, zone: Zone = 'heart', owner: PlayerId = 0, slot?: number) {
    const uid = `b1-${owner}-${serial++}`;
    const base = structuredClone(inst(game, you(game, owner).persona!));
    game.cards[uid] = { ...base, uid, defId: id(n), owner, zone: 'check', slot: null, exhausted: false, modifiers: [], usesThisTurn: {}, setOneUses: {}, fieldEntry: 0 };
    if (zone === 'persona' && you(game, owner).persona) moveCard(game, you(game, owner).persona!, 'grave');
    moveCard(game, uid, zone, { slot: zone === 'ally' ? (slot ?? you(game, owner).allies.indexOf(null)) : undefined });
    return uid;
  }
  for (const p of [0, 1] as const) { for (const u of [...you(game, p).hand]) moveCard(game, u, 'deck');  you(game, p).codexSwitchedThisTurn = true; }
  const hero = add(persona, 'persona');
  const active = add(codex, 'codex'); you(game, 0).activeCodex = active; you(game, 1).activeCodex = null;
  for (const u of [...you(game, 0).grave]) moveCard(game, u, 'deck');
  const settle = async () => { await ctrl.flushSpiritTriggers(); await ctrl.flushSpecialCallTriggers(); await ctrl.flushDamageTriggers(); };
  const ctx = (source = hero, me: PlayerId = 0): EffectContext => ({ game, index, source, me, chooser, settle });
  const tokens = async (n: number) => { createKaluluwaTokens(ctx(), n); await settle(); };
  const event = async (name: TriggerName, source = hero, extra: Partial<TriggerEvent> = {}) => { await ctrl.fireTrigger(name, 0, { name, unit: source, ...extra }); await settle(); };
  const use = async (source = hero, abilityIndex = 0) => { expect(ctrl.canUseAbility(source, ALL_SCRIPTS[inst(game, source).defId]!.abilities![abilityIndex]!, 0)).toBe(true); await ctrl.perform({ kind: 'ability', uid: source, abilityIndex }, 0); };
  const play = async (n: number) => { const u = add(n, 'hand'); you(game, 0).normalPlaysUsed = 0; expect(ctrl.legalActions(0)).toContainEqual({kind:'playAction',uid:u}); await ctrl.perform({kind:'playAction',uid:u},0); return u; };
  const call = async (u: string) => { await specialCall(ctx(), u, { allowOverwrite: false }); await settle(); };
  const vent = async (n: number) => { expect(await releaseSpirits(ctx(), n)).toBe(true); await settle(); };
  const endBattle = async (u: string, target: string | null = null, supporters: string[] = []) => { const e: TriggerEvent = { name: 'battleFinished', unit: u, target, supporters }; await event('battleFinished', u, e); await finishBabaylanReturns(ctx(), 'battle', e); };
  return {game,ctrl,add,hero,active,ctx,settle,tokens,event,use,play,call,vent,endBattle,ps:you(game,0)};
}

describe('Set 1 selection and catalogue', () => {
  it('exposes only tagged cards and keeps every built-in deck legal', () => {
    const visible = Object.values(ALL_CARDS).filter(isSelectableCard);
    expect(visible).toHaveLength(141);
    expect(visible.every(c => c.set === 'set-1')).toBe(true);
    for (const d of [deck,agtaDeck,magDeck]) {
      validateDeck(index,d); expect(checkDeck(index,d)).toEqual([]);
      for (const key of [d.persona,...d.main.map(c=>c.id),...d.codex]) expect(visible.some(c=>c.id===key),key).toBe(true);
    }
    expect(visible.filter(c=>c.deck==='Babaylan')).toHaveLength(47);
    expect(visible.find(c=>c.id==='babaylan/warden-of-the-twelfth-tide-bituon')?.effectsPending).toBe(false);
    expect(ALL_CARDS['babaylan/kaluluwa']).toBeDefined();
    expect(isSelectableCard(ALL_CARDS['babaylan/kaluluwa']!)).toBe(false);
  });
  it('registers all 46 effects and all ten Andukha Codex', () => {
    expect(ids).toHaveLength(46);
    for (const key of ids) {
      const card = ALL_CARDS[key]!; const script=ALL_SCRIPTS[key]!;
      expect(card.effectsPending,key).toBe(false); expect(card.text.length).toBeGreaterThan(30);
      if(card.type==='Unit') expect(script.abilities?.length).toBeGreaterThan(0);
      if(card.type==='Action') expect(script.action).toBeDefined();
      if(card.type==='Force') expect(script.forceModes).toHaveLength(2);
      if(card.type==='Codex'){expect(script.codex?.skill).toBeDefined();expect(card.state).toBe('Andukha');}
    }
  });
});
describe('Heart payments and events', () => {
  it('selects the entire Kalas cost once and leaves Heart untouched until confirmation', async () => {
    let confirm!: (cards: string[]) => void;
    let prompts = 0;
    const f = fresh(6, 38, { chooseCards: async (_p, prompt, pool, count, opts) => {
      prompts++;
      expect(prompt).toContain('Kalas 6'); expect(pool).toHaveLength(8); expect(count).toBe(6);
      expect(opts).toMatchObject({ from: 'heart', confirm: 'Kalas selected cards', decline: 'Cancel Kalas' });
      expect(opts?.upTo).not.toBe(true);
      return new Promise<string[]>(resolve => { confirm = resolve; });
    } });
    await f.tokens(8);
    const before = [...f.ps.heart];
    const payment = releaseSpirits(f.ctx(), 6);
    expect(prompts).toBe(1); expect(f.ps.heart).toEqual(before);
    expect(f.game.pendingBabaylan).toEqual([]);
    const chosen = before.slice(1, 7);
    confirm(chosen); expect(await payment).toBe(true);
    expect(f.ps.heart).toEqual([before[0], before[7]]);
    expect(f.game.pendingBabaylan).toEqual([{ owner: 0, name: 'vented', cards: chosen, tokens: 6 }]);
  });
  it.each(['cancel', 'partial', 'duplicate', 'outside', 'too many'])('rejects a %s Kalas selection without spending cards', async kind => {
    const f = fresh(6, 38, { chooseCards: async (_p, _prompt, pool) => {
      if (kind === 'cancel') return [];
      if (kind === 'partial') return pool.slice(0, 5);
      if (kind === 'duplicate') return Array(6).fill(pool[0]!);
      if (kind === 'outside') return [...pool.slice(0, 5), 'not-in-heart'];
      return pool.slice(0, 7);
    } });
    await f.tokens(7); const before = [...f.ps.heart];
    f.game.pendingFx.length = 0;
    expect(await releaseSpirits(f.ctx(), 6)).toBe(false);
    expect(f.ps.heart).toEqual(before); expect(f.game.pendingBabaylan).toEqual([]);
    expect(f.game.pendingFx).toEqual([]);
  });
  it('lets the player resolve mixed Bakunawa Kalas skills in a different order from card selection', async () => {
    let ventPrompts = 0;
    const resolved: string[] = [], remaining: number[] = [];
    const f = fresh(6, 38, {
      chooseCards: async (_p, prompt, pool, count) => {
        if (prompt.startsWith('Kalas')) { ventPrompts++; expect(count).toBe(6); }
        return pool.slice(0, count);
      },
      chooseAbility: async (_p, prompt, options) => {
        if (!options.some(o => [ulango, sagwil, wakira].includes(o.uid))) return prompt.startsWith('Your response') || prompt.startsWith('Before') ? null : 0;
        expect(f.ps.heart).toHaveLength(0);
        expect(f.ps.energy).toBeUndefined();
        expect(prompt).toContain('triggered effect');
        remaining.push(options.length);
        const next = options.length - 1;
        resolved.push(options[next]!.uid);
        return next;
      },
    });
    const ulango = f.add(12), sagwil = f.add(13), wakira = f.add(14);
    const foe = f.add(11, 'ally', 1, 0);
    await f.tokens(3); f.add(16, 'deck'); f.game.phase = 'battle';
    const activations: string[] = [];
    f.ctrl.hooks.onAbilityActivated = async uid => { if ([ulango, sagwil, wakira].includes(uid)) activations.push(uid); };
    let attackPower = 0;
    f.ctrl.hooks.onAttackResolved = async (_battle, result) => { attackPower = result.attackPower; };
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: null, supporters: [] }, 0);
    expect(ventPrompts).toBe(1); expect(remaining).toEqual([3, 2, 1]);
    expect(resolved).toEqual([wakira, sagwil, ulango]); expect(activations).toEqual(resolved);
    expect(f.ps.grave).toEqual(expect.arrayContaining([ulango, sagwil, wakira]));
    expect(inst(f.game, foe).zone).toBe('grave');
    expect(f.ps.hand).toHaveLength(2); // Ulango draw plus the normal attack check, no six-token bonus.
    expect(attackPower).toBe(24000); // Bakunawa +10000, then Wakira +3000.
  });
  it('Kalas is atomic when cancelled and never counts tokens as double payment', async () => {
    const f=fresh(2,37,{chooseCards:async (_p,_q,pool)=>pool.slice(0,1)});
    await f.tokens(3); const before=[...f.ps.heart];
    expect(await releaseSpirits(f.ctx(),2)).toBe(false); expect(f.ps.heart).toEqual(before); expect(f.game.pendingBabaylan).toEqual([]);
  });
 });


describe('Revised Persona skills', () => {
  it('Sinogo pays Kalas 5, calls only a deck Beast/Bird, and returns it at end of turn', async () => {
    const f=fresh(5);await f.tokens(5);const bird=f.add(14,'deck');
    await f.event('attack');expect(inst(f.game,bird).zone).toBe('ally');expect(f.ps.heart).toHaveLength(0);expect(f.ps.energy).toBeUndefined();
    await f.endBattle(bird);expect(inst(f.game,bird).zone).toBe('ally');await finishBabaylanReturns(f.ctx(),'turn');expect(inst(f.game,bird).zone).toBe('heart');
  });
  it('Sinogo discounts Beast/Bird Kalas costs at 12, but not Action costs or costs below 12', async () => {
    const f=fresh(5);await f.tokens(12);f.add(14,'deck');await f.event('attack');expect(f.game.babaylanVents?.[0]?.count).toBe(3);
    expect(await releaseSpirits(f.ctx(),5)).toBe(true);expect(f.ps.heart).toHaveLength(4);
    const g=fresh(5);await g.tokens(12);const action=g.add(28,'hand');expect(await releaseSpirits(g.ctx(action),2)).toBe(true);expect(g.ps.heart).toHaveLength(10);
  });
  it('Mangaw loads the top card for free, then optionally pays for exactly two tokens', async () => {
    const f=fresh(2,38,{confirm:async()=>true});const top=f.add(23,'deck');await f.event('startOfMain');expect(inst(f.game,top).zone).toBe('heart');expect(kaluluwaCount(f.ctx())).toBe(2);expect(f.ps.energy).toBeUndefined();expect(f.game.babaylanEssences?.[0]?.count).toBe(3);
    const g=fresh(2);const before=g.ps.deck.length;await g.event('startOfMain');expect(g.ps.deck).toHaveLength(before-1);expect(g.ps.heart).toHaveLength(1);
  });
  it('Mangaw counts all Sanib cards only during its turn and only at Andukha 9', async () => {
    const f=fresh(2);await f.tokens(9);expect(currentPower(index,f.game,f.hero)).toBe(22000);f.game.turnPlayer=1;expect(currentPower(index,f.game,f.hero)).toBe(11000);f.game.turnPlayer=0;await f.vent(1);expect(currentPower(index,f.game,f.hero)).toBe(12000);
  });
  it('Maria calls a small Divine with +5000 and waits until end of turn to Sanib it', async () => {
    const f=fresh(1);const target=f.add(8);f.add(23,'deck');f.add(23,'deck');await f.use();expect(inst(f.game,target).zone).toBe('ally');expect(inst(f.game,target).modifiers.some(m=>m.amount===5000)).toBe(true);expect(f.ps.energy).toBeUndefined();await f.endBattle(target);expect(inst(f.game,target).zone).toBe('ally');await finishBabaylanReturns(f.ctx(),'turn');expect(inst(f.game,target).zone).toBe('heart');
  });
  it('Maria makes one token per turn at Andukha 6 without recursively firing', async () => {
    const f=fresh(1);await f.tokens(6);expect(f.ps.heart).toHaveLength(6);const a=f.add(11,'hand');essenceCard(f.ctx(),a);await f.settle();expect(f.ps.heart).toHaveLength(8);const b=f.add(11,'hand');essenceCard(f.ctx(),b);await f.settle();expect(f.ps.heart).toHaveLength(9);
  });
  it('Kaptan Essences a hand card before drawing and gains +3000', async () => {
    const f=fresh(3);const h=f.add(23,'hand'),top=f.add(24,'deck');await f.event('attack');expect(inst(f.game,h).zone).toBe('heart');expect(inst(f.game,top).zone).toBe('hand');expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,f.hero)).toBe(14000);
    await f.event('attack');expect(f.ps.energy).toBeUndefined();
  });
  it('Kaptan unlocks a Main Phase top-five choice at Andukha 9 with one ordered bottom choice', async () => {
    let orders=0;const f=fresh(3,38,{chooseCards:async(_p,_prompt,pool,n,opts)=>{if(opts?.ordered)orders++;return pool.slice(0,n).reverse();}});await f.tokens(9);const top=f.add(8,'deck');expect(f.ctrl.legalActions(0)).toContainEqual({kind:'ability',uid:f.hero,abilityIndex:1});await f.use(f.hero,1);expect(inst(f.game,top).zone).toBe('heart');expect(orders).toBe(1);expect(inst(f.game,f.hero).modifiers.some(m=>m.amount===5000)).toBe(true);expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'ability',uid:f.hero,abilityIndex:1});
  });
  it('Maguayan filters a Heart call and adds an Sanib Ally current Power for one battle', async () => {
    const f=fresh(4);await f.tokens(9);const ally=f.add(11);await f.call(ally);expect(f.ps.hand).toHaveLength(0);const power=currentPower(index,f.game,ally);await f.event('attack');expect(inst(f.game,ally).zone).toBe('heart');expect(f.ps.energy).toBeUndefined();expect(inst(f.game,f.hero).modifiers).toContainEqual(expect.objectContaining({amount:power,duration:'endOfAttack'}));
  });
  it('Bakunawa restricts a real Persona battle and draws immediately for six tokens', async () => {
    const f=fresh(6);await f.tokens(6);f.game.phase='battle';f.add(16,'deck');let limit:number|undefined,power=0;
    f.ctrl.hooks.onAttackResolved=async(b,r)=>{limit=b.maxBlockLevel;power=r.attackPower;};await f.ctrl.perform({kind:'attack',attacker:f.hero,target:null,supporters:[]},0);
    expect(limit).toBe(1);expect(power).toBe(21000);expect(f.ps.hand).toHaveLength(2);expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,f.hero)).toBe(11000);
  });
  it('Bakunawa only recovers after a miss and may Sanib non-Unit cards', async () => {
    const f=fresh(6);await f.tokens(9);const a=f.add(23,'grave'),b=f.add(27,'grave'),c=f.add(11,'grave');await f.event('battleFinished',f.hero,{hit:true});expect(f.ps.grave).toContain(a);await f.event('battleFinished',f.hero,{hit:false});for(const u of [a,b,c])expect(inst(f.game,u).zone).toBe('heart');
  });
  it('Amara reacts to leaving Persona by Sanib and calls another Heart Unit', async () => {
    const f=fresh(7);const unit=f.add(11);essenceCard(f.ctx(),f.hero);await f.settle();expect(inst(f.game,unit).zone).toBe('ally');
  });
  it('Amara can activate in Heart, vents itself, and calls a searched Babaylan with +5000', async () => {
    const f=fresh();await f.tokens(8);const amara=f.add(7),target=f.add(16,'deck');expect(f.ctrl.legalActions(0)).toContainEqual({kind:'ability',uid:amara,abilityIndex:1});await f.use(amara,1);expect(inst(f.game,amara).zone).toBe('grave');expect(inst(f.game,target).zone).toBe('ally');expect(f.ps.energy).toBeUndefined();expect(inst(f.game,target).modifiers.some(m=>m.amount===5000)).toBe(true);
  });
});
describe('Revised Ally and Heart skills', () => {
  it('Dalagan queues four Iday triggers but presents two physical cards and pays each only once', async () => {
    const seen: number[] = [], resolved: string[] = [];
    let idayCards: string[] = [];
    const f = fresh(7, 38, { chooseAbility: async (_p, _prompt, options, context) => {
      if (context?.kind === 'response') return null;
      const choices = abilityChoices(options, context?.kind === 'pending');
      if (options.some(o => idayCards.includes(o.uid))) {
        seen.push(choices.length);
        if (seen.length === 1) {
          expect(options).toHaveLength(4);
          expect(choices.map(c => c.occurrences)).toEqual([2, 2]);
          expect(new Set(choices.map(c => c.option.uid))).toEqual(new Set(idayCards));
        }
        // Pick the second physical card first; the return value must still be
        // its original engine index, not its new display position.
        return choices.at(-1)!.index;
      }
      return options.length ? 0 : null;
    } });
    idayCards = [f.add(18, 'hand'), f.add(18, 'hand')];
    const dalagan = f.add(8, 'ally');
    f.add(23, 'deck');
    f.ctrl.hooks.onAbilityActivated = async uid => { if (idayCards.includes(uid)) resolved.push(uid); };
    await f.event('placed', dalagan);
    expect(seen[0]).toBe(2);
    expect(resolved).toEqual([...idayCards].reverse());
    expect(idayCards.every(uid => inst(f.game, uid).zone === 'heart')).toBe(true);
    expect(f.game.pendingTriggers).toEqual([]);
    expect([f.hero, dalagan].flatMap(uid => inst(f.game, uid).modifiers).filter(m => m.amount === 5000)).toHaveLength(2);
  });
  it('Ulango and Silak react after the whole Kalas payment and can react again', async () => {
    const f=fresh();const u=f.add(12),s=f.add(22);await f.vent(2);expect(inst(f.game,u).zone).toBe('grave');expect(inst(f.game,s).zone).toBe('grave');expect(f.ps.hand).toHaveLength(1);expect(f.ps.heart).toHaveLength(1);essenceCard(f.ctx(),u);await f.settle();moveCard(f.game,f.ps.heart[0]!,'grave');await f.vent(1);expect(f.ps.hand).toHaveLength(2);
  });
  it('Sagwil damages an enemy and Wakira buffs up to two own Units when Kalas', async () => {
    const f=fresh();f.add(13);f.add(14);const ally=f.add(11,'ally'),enemy=f.add(11,'ally',1);await f.vent(2);expect(inst(f.game,enemy).zone).toBe('grave');for(const u of [ally,f.hero])expect(inst(f.game,u).modifiers.some(m=>m.amount===3000)).toBe(true);
  });
  it('Dalagan Essences top one and one token, while Dyano only gains +3000', async () => {
    const f=fresh();const d=f.add(8,'ally'),top=f.add(23,'deck');await f.event('placed',d);expect(inst(f.game,top).zone).toBe('heart');expect(kaluluwaCount(f.ctx())).toBe(1);const dy=f.add(11,'ally'),before=f.ps.heart.length;await f.event('placed',dy);expect(f.ps.heart).toHaveLength(before);expect(currentPower(index,f.game,dy)).toBe(12000);
  });
  it('Guidala free Sanib stays free when declined; paid call returns both Units at end of turn', async () => {
    const f=fresh(7,38,{confirm:async()=>true});const g=f.add(9,'ally'),h=f.add(11,'hand');await f.event('placed',g);expect(f.ps.energy).toBeUndefined();expect(inst(f.game,h).zone).toBe('ally');await finishBabaylanReturns(f.ctx(),'turn');expect(inst(f.game,g).zone).toBe('heart');expect(inst(f.game,h).zone).toBe('heart');
    const d=fresh();const dg=d.add(9,'ally');d.add(11,'hand');await d.event('placed',dg);expect(d.ps.energy).toBeUndefined();await finishBabaylanReturns(d.ctx(),'turn');expect(inst(d.game,dg).zone).toBe('ally');
  });
  it('Tata Cero pays two Energy on attack for +1000 per Kaluluwa', async () => {
    const f=fresh();await f.tokens(3);const t=f.add(10,'ally');await f.event('attack',t);expect(f.ps.energy).toBeUndefined();expect(inst(f.game,t).modifiers).toContainEqual(expect.objectContaining({amount:3000,duration:'endOfAttack'}));
  });
  it('Lawira automatically Essences itself only from Ally at its owner end of turn', async () => {
    const f=fresh();const lawira=f.add(15,'ally'),hand=f.add(15,'hand');f.game.turnPlayer=1;await f.ctrl.fireTrigger('endOfTurn',0);await f.settle();expect(inst(f.game,lawira).zone).toBe('ally');f.game.turnPlayer=0;await f.ctrl.fireTrigger('endOfTurn',0);await f.settle();expect(inst(f.game,lawira).zone).toBe('heart');expect(inst(f.game,hand).zone).toBe('hand');
  });
  it('Aday grows per actual Sanib and resets next turn', async () => {
    const f=fresh();const a=f.add(16,'ally');await f.tokens(3);expect(currentPower(index,f.game,a)).toBe(9000);f.game.turnNumber++;expect(currentPower(index,f.game,a)).toBe(6000);
  });
  it('Luning adds one token once per turn, with no recursion, and only in Ally', async () => {
    const f=fresh(7,38,{confirm:async()=>true});f.add(17,'ally');f.add(17,'hand');await f.tokens(2);expect(kaluluwaCount(f.ctx())).toBe(3);expect(f.ps.energy).toBeUndefined();await f.tokens(2);expect(kaluluwaCount(f.ctx())).toBe(5);expect(f.ps.energy).toBeUndefined();await f.tokens(2);expect(kaluluwaCount(f.ctx())).toBe(7);
  });
  it('Sali buffs once per turn; Nardo only gets the actual first Sanib window', async () => {
    const f=fresh(7,38,{confirm:async()=>true});const s=f.add(20,'ally');await f.tokens(3);await f.vent(1);await f.vent(1);expect(f.ps.energy).toBeUndefined();expect(inst(f.game,s).modifiers.filter(m=>m.amount===5000)).toHaveLength(1);
    const g=fresh(7,38,{confirm:async()=>true});g.add(21,'ally');await g.tokens(1);expect(g.ps.hand).toHaveLength(1);await g.tokens(1);expect(g.ps.hand).toHaveLength(1);expect(g.ps.energy).toBeUndefined();
    const h=fresh(7,38,{confirm:async()=>true});await h.tokens(1);h.add(21,'ally');await h.tokens(1);expect(h.ps.hand).toHaveLength(0);
  });
  it('Doro costs one once per turn and Essences itself plus a hand card at end of turn', async () => {
    const f=fresh();const d=f.add(19,'ally'),h=f.add(23,'hand');await f.use(d);expect(f.ps.energy).toBeUndefined();expect(inst(f.game,d).modifiers.some(m=>m.amount===5000)).toBe(true);expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'ability',uid:d,abilityIndex:0});await finishBabaylanReturns(f.ctx(),'turn');expect(inst(f.game,d).zone).toBe('heart');expect(inst(f.game,h).zone).toBe('heart');
  });
  for(const zone of ['hand','ally'] as const)it(`Iday reacts from ${zone}, pays itself and one Energy, and buffs a surviving Unit`, async () => {
    const f=fresh();const i=f.add(18,zone);await f.tokens(1);expect(inst(f.game,i).zone).toBe('heart');expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,f.hero)).toBe(16000);expect(f.ps.heart).toHaveLength(2);
  });
});


describe('Revised skill edge cases',()=>{
  it('cancelled Kaptan hand payment gives no draw, buff, or Energy charge',async()=>{
    let attempts=0;const f=fresh(3,38,{chooseCards:async()=>[],chooseAbility:async()=>attempts++===0?0:null});const hand=f.add(23,'hand');await f.event('attack');expect(inst(f.game,hand).zone).toBe('hand');expect(f.ps.hand).toHaveLength(1);expect(f.ps.energy).toBeUndefined();expect(inst(f.game,f.hero).modifiers).toEqual([]);
  });
  it('Bakunawa misses a real battle, recovers at most three, and mixed Kalas does not draw',async()=>{
    const f=fresh(6,38,{blockPrompt:async(_p,_info,pool)=>pool});const payment=f.add(11);await f.tokens(14);for(let n=0;n<4;n++)f.add(16,'hand',1);const grave=[f.add(23,'grave'),f.add(27,'grave'),f.add(11,'grave'),f.add(24,'grave')];f.add(11,'deck');f.game.phase='battle';let hit=true;f.ctrl.hooks.onAttackResolved=async(_b,r)=>{hit=r.hit;};await f.ctrl.perform({kind:'attack',attacker:f.hero,target:null,supporters:[]},0);expect(hit).toBe(false);expect(f.ps.hand).toHaveLength(1);expect(f.ps.heart).toHaveLength(12);expect(grave.filter(u=>inst(f.game,u).zone==='heart')).toHaveLength(3);expect(inst(f.game,payment).zone).toBe('grave');
  });
  it('Maria and Luning do not turn a paid bonus into a recursive token loop',async()=>{
    const f=fresh(1,38,{confirm:async()=>true});await f.tokens(6);f.add(17,'ally');const u=f.add(11,'hand');essenceCard(f.ctx(),u);await f.settle();expect(f.ps.heart).toHaveLength(9);expect(f.ps.energy).toBeUndefined();
  });
  it('Ally-only skills never activate from hand or Heart',async()=>{
    const f=fresh(7,38,{confirm:async()=>true});for(const n of [15,16,17,19,20,21]){const h=f.add(n,'hand'),heart=f.add(n);expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'ability',uid:h,abilityIndex:0});expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'ability',uid:heart,abilityIndex:0});}await f.tokens(2);await f.vent(1);expect(f.ps.energy).toBeUndefined();
  });
  it('a delayed Sanib never follows a Unit into a new field entry',async()=>{
    const f=fresh();const d=f.add(19,'ally');await f.use(d);moveCard(f.game,d,'grave');await f.call(d);await finishBabaylanReturns(f.ctx(),'turn');expect(inst(f.game,d).zone).toBe('ally');
  });
  it('Iday pays its own card without an Energy requirement',async()=>{
    const f=fresh();const i=f.add(18,'hand');await f.tokens(1);expect(inst(f.game,i).zone).toBe('heart');expect(inst(f.game,f.hero).modifiers.some(m=>m.amount===5000)).toBe(true);
  });
});

describe('All four Forces and ten Actions', () => {
  for (const n of [23,24,25,26]) it(`Force ${n} needs a response window and keeps its check effect`, async () => {
    const f=fresh(7), paid=f.add(n,'hand');
    expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'playForce',uid:paid,mode:1});
    await f.ctrl.perform({kind:'playForce',uid:paid,mode:1},0);
    expect(inst(f.game,paid).zone).toBe('hand');
    const before=currentPower(index,f.game,f.hero), heart=f.ps.heart.length;
    const checked=f.add(n,'deck'); f.game.phase='battle';
    await f.ctrl.perform({kind:'attack',attacker:f.hero,target:null,supporters:[]},0);
    expect(f.ps.hand).toContain(checked);
    expect(currentPower(index,f.game,f.hero)).toBe(before+5000);
    expect(f.ps.heart).toHaveLength(heart);
  });
  it('The Elders Answer selects one Unit from three; A Promise Broken vents and filters', async () => {
    const f=fresh();const chosen=f.add(9,'deck');await f.play(27);expect(inst(f.game,chosen).zone).toBe('heart');await f.tokens(3);const h=f.ps.hand.length;await f.play(28);expect(f.ps.hand.length).toBe(h+1);expect(f.game.babaylanVents?.[0]?.count).toBe(2);
  });
  it('The Mountain Withdraws swaps different equal/lower Units; Flight returns its borrowed Beast', async () => {
    const f=fresh();const a=f.add(12,'ally'),b=f.add(14);await f.play(29);expect(inst(f.game,a).zone).toBe('heart');expect(inst(f.game,b).zone).toBe('ally');await f.tokens(2);f.add(14);await f.play(30);expect(f.ps.allies.filter(Boolean).length).toBe(2);await finishBabaylanReturns(f.ctx(),'turn');expect(f.ps.allies.filter(Boolean).length).toBe(1);
  });
  it('Thunder exhausts two and debuffs one at post-cost Andukha 12; Lantoy rebuilds then vents', async () => {
    const f=fresh();await f.tokens(15);const a=f.add(11,'ally',1),b=f.add(11,'ally',1);await f.play(31);expect(inst(f.game,a).exhausted).toBe(true);expect(inst(f.game,b).exhausted).toBe(true);expect(currentPower(index,f.game,a)).toBe(4000);
    const before=f.ps.heart.length;f.add(16,'grave');f.add(17,'grave');await f.play(32);expect(f.ps.heart.length).toBe(before+1);
  });
  it('River Rises grows Heart and buffs the field; Covenant restores known Units', async () => {
    const f=fresh();await f.tokens(10);const ally=f.add(16,'ally');await f.play(33);expect(f.ps.heart).toHaveLength(12);expect(currentPower(index,f.game,ally)).toBe(24000);const before=currentPower(index,f.game,f.hero);f.add(16,'grave');f.add(17,'grave');await f.play(36);expect(currentPower(index,f.game,f.hero)).toBe(before+10000);
  });
  it('Six Moons Lost pays six tokens, returns two exhausted enemies and draws one', async () => {
    const f=fresh();await f.tokens(12);const a=f.add(11,'ally',1),b=f.add(11,'ally',1);inst(f.game,a).exhausted=true;inst(f.game,b).exhausted=true;await f.play(34);expect(inst(f.game,a).zone).toBe('hand');expect(inst(f.game,b).zone).toBe('hand');expect(f.ps.heart).toHaveLength(6);expect(f.ps.hand).toHaveLength(1);expect(f.ps.energy).toBeUndefined();
  });
  it('Return Our Moon retrieves a Divine and Essences one; a Beast filters the hand', async () => {
    const f=fresh();const divine=f.add(8);await f.play(35);expect(inst(f.game,divine).zone).toBe('hand');expect(f.ps.energy).toBeUndefined();f.add(12);await f.play(35);expect(f.ps.hand).toHaveLength(2);expect(f.ps.heart).toHaveLength(1);
  });
});
describe('All ten Codex skills', () => {
  /**
   * One test per Codex, against what it is FOR.
   *
   * Babaylan banks into the Heart — Kaluluwa tokens and essenced cards — and
   * Andukha pays out at six. So each test asserts that the Codex moves the
   * Heart, or turns the Heart into something, and that its condition gates it.
   */
  const skill = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.skill!;
  const gate = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.autoSwitchWhen;
  const window = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.autoSwitchOn;

  it('46 Moonwake Shore trades the draw for two spirits', async () => {
    const f = fresh(2, 46);
    const heart = f.ps.heart.length;
    const hand = f.ps.hand.length;
    await skill(46).run(f.ctx(f.active));
    expect(kaluluwaCount(f.ctx()), 'two spirits answered').toBeGreaterThanOrEqual(2);
    expect(f.ps.heart.length).toBe(heart + 2);
    expect(f.ps.hand.length, 'no card without Andukha').toBe(hand);
    expect(skill(46).replaces).toBe('draw');
  });

  it('46 Moonwake Shore also draws once the Heart is deep enough', async () => {
    const f = fresh(2, 46);
    while (f.ps.heart.length < 6) f.add(1, 'heart');
    reevaluateState(index, f.game, 0);
    expect(f.ps.releasedState).toBe('Andukha');
    const hand = f.ps.hand.length;
    await skill(46).run(f.ctx(f.active));
    expect(f.ps.hand.length, 'Andukha pays the card as well').toBe(hand + 1);
  });

  it('38 Kabulaw Personifies out of the deck', async () => {
    const f = fresh(2, 38);
    const before = f.ps.persona!;
    const lvl3 = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit'
      && ALL_CARDS[k]!.level === 3) + 1;
    const u = f.add(lvl3, 'deck');
    f.ps.deck.splice(f.ps.deck.indexOf(u), 1);
    f.ps.deck.unshift(u);
    await skill(38).run(f.ctx(f.active));
    expect(f.ps.persona).toBe(u);
    expect(inst(f.game, before).zone).toBe('heart');
    expect(skill(38).replaces).toBe('personify');
  });

  it('40 Tabayag banks a card a turn, and a spirit when it was a Unit', async () => {
    const f = fresh(2, 40);
    const unitIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const u = f.add(unitIndex, 'deck');
    f.ps.deck.splice(f.ps.deck.indexOf(u), 1);
    f.ps.deck.unshift(u);
    const tokens = kaluluwaCount(f.ctx());
    await f.event('startOfMain');
    expect(inst(f.game, u).zone, 'the card went into the Heart').toBe('heart');
    expect(kaluluwaCount(f.ctx()), 'and a spirit with it').toBe(tokens + 1);
  });

  it('43 Danao swings with the whole Heart, then pays three at end of turn', async () => {
    const f = fresh(2, 43);
    for (let i = 0; i < 4; i++) createKaluluwaTokens(f.ctx(), 1);
    const base = currentPower(index, f.game, f.hero);
    const spirits = kaluluwaCount(f.ctx());
    await f.event('personaAttack');
    expect(currentPower(index, f.game, f.hero),
      '1000 for each spirit').toBe(base + 1000 * spirits);
    const heart = f.ps.heart.length;
    await f.ctrl.fireTrigger('endOfTurn',0);await f.settle();
    expect(f.ps.heart.length, 'and the bill comes due').toBe(heart - 3);
  });

  it('41 Dingayop Spring answers a check that found nothing', async () => {
    const f = fresh(2, 41);
    const plain = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Action') + 1;
    const revealed = f.add(plain, 'check');
    // The fixture opens with an empty hand, and the Codex cannot run without
    // a card to pay the discard with.
    f.add(plain, 'hand');
    const tokens = kaluluwaCount(f.ctx());
    const hand = f.ps.hand.length;
    await f.ctrl.fireTrigger('barrierBroken', 0, { name: 'barrierBroken', revealed });
    expect(kaluluwaCount(f.ctx()), 'two spirits').toBe(tokens + 2);
    expect(f.ps.hand.length, 'one card paid for them').toBe(hand - 1);
  });

  it('41 Dingayop Spring stays out of the way of a Force', async () => {
    const f = fresh(2, 41);
    const forceIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Force') + 1;
    const revealed = f.add(forceIndex, 'check');
    const tokens = kaluluwaCount(f.ctx());
    await f.ctrl.fireTrigger('barrierBroken', 0, { name: 'barrierBroken', revealed });
    expect(kaluluwaCount(f.ctx())).toBe(tokens);
  });

  it('44 Bantayan arms on one attack and answers the next', async () => {
    const f = fresh(2, 44);
    f.game.turnPlayer = 1;
    for (let i = 0; i < 3; i++) createKaluluwaTokens(f.ctx(), 1);
    const base = currentPower(index, f.game, f.hero);

    // Being attacked with nothing armed does nothing.
    await f.event('personaAttacked');
    expect(currentPower(index, f.game, f.hero), 'nothing armed yet').toBe(base);

    // A broken Barrier arms it; the next attack collects.
    await f.event('barrierBroken');
    expect(f.ps.pursuitArmed).toBe(true);
    await f.event('personaAttacked');
    expect(currentPower(index, f.game, f.hero))
      .toBe(base + 1000 * kaluluwaCount(f.ctx()));
    expect(f.ps.pursuitArmed, 'and it is spent').toBe(false);
  });

  it('45 Tañon Strait calls one vented card back and exiles the other', async () => {
    const f = fresh(2, 45);
    // Two real cards in the Heart, so both survive the Kalas.
    const unitIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const a = f.add(unitIndex, 'heart');
    const b = f.add(unitIndex, 'heart');
    await f.event('codexPlayed');
    const zones = [inst(f.game, a).zone, inst(f.game, b).zone];
    expect(zones.filter((z) => z === 'ally').length, 'one comes back').toBe(1);
    expect(zones.filter((z) => z === 'exile').length, 'the other is kept').toBe(1);
  });

  it('45 Tañon Strait has nobody to hold when only tokens were vented', async () => {
    // Kalas destroys Kaluluwa tokens outright, so there is nothing to call.
    const f = fresh(2, 45);
    f.ps.heart = [];
    createKaluluwaTokens(f.ctx(), 2);
    const allies = f.ps.allies.filter(Boolean).length;
    await f.event('codexPlayed');
    expect(f.ps.allies.filter(Boolean).length, 'no body returns').toBe(allies);
    expect(f.ps.heart.length, 'but the Kalas still happened').toBe(0);
  });

  it('42 Dingayop Cavern doubles a Unit essenced from the field', async () => {
    const f = fresh(2, 42);
    const unitIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const u = f.add(unitIndex, 'ally');
    const tokens = kaluluwaCount(f.ctx());
    essenceCard(f.ctx(), u);
    expect(kaluluwaCount(f.ctx()), 'a spirit came with it').toBe(tokens + 1);
  });

  it('42 Dingayop Cavern does nothing for a card off the hand', async () => {
    const f = fresh(2, 42);
    const unitIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const u = f.add(unitIndex, 'hand');
    const tokens = kaluluwaCount(f.ctx());
    essenceCard(f.ctx(), u);
    expect(kaluluwaCount(f.ctx()), 'field or deck only').toBe(tokens);
  });

  it('39 Argao turns five out of the Heart into one in hand', async () => {
    const f = fresh(2, 39, { chooseMode: async () => { throw new Error('Kalas must use cards, not numbers'); } });
    f.ps.heart = [];
    createKaluluwaTokens(f.ctx(), 5);
    const hand = f.ps.hand.length;
    await f.event('codexPlayed');
    expect(f.ps.heart.length, 'five left the Heart').toBe(0);
    expect(f.ps.hand.length, 'and one arrived').toBe(hand + 1);
  });


  it.each([0, 4, 5, 7, 10])('Argao selects %i Heart cards in one batch and draws for complete groups', async amount => {
    let prompts = 0; let picked: string[] = []; let attempts = 0;
    const f = fresh(7, 39, {
      chooseAbility: async () => attempts++ === 0 ? 0 : null,
      chooseMode: async () => { throw new Error('Unexpected number picker'); },
      chooseCards: async (_p, prompt, candidates, count, opts) => {
        prompts++;
        expect(prompt).toBe('Unseen Passage: choose cards to Kalas');
        expect(candidates).toHaveLength(12); expect(count).toBe(12);
        expect(opts).toMatchObject({ from: 'heart', upTo: true, ventDrawPer: 5 });
        picked = candidates.slice().reverse().slice(0, amount);
        return picked;
      },
    });
    createKaluluwaTokens(f.ctx(), 11);
    const unit = f.add(11);
    const original = [...f.ps.heart], hand = f.ps.hand.length;
    await f.event('codexPlayed');
    expect(prompts).toBe(1);
    expect(f.ps.heart).toEqual(original.filter(u => !picked.includes(u)));
    expect(f.ps.hand).toHaveLength(hand + Math.floor(amount / 5));
    expect(f.ps.grave.includes(unit)).toBe(amount > 0);
    expect(f.game.babaylanVents?.[0]?.count ?? 0).toBe(amount);
  });

  it.each(['duplicate', 'foreign'])('Argao rejects a %s selection without partial Kalas or draw', async kind => {
    let attempts = 0;
    const f = fresh(7, 39, {
      chooseAbility: async () => attempts++ === 0 ? 0 : null,
      chooseCards: async (_p, _prompt, candidates) => kind === 'duplicate' ? [candidates[0]!, candidates[0]!] : [candidates[0]!, 'not-in-heart'],
    });
    createKaluluwaTokens(f.ctx(), 6);
    const original = [...f.ps.heart], hand = f.ps.hand.length;
    await f.event('codexPlayed');
    expect(f.ps.heart).toEqual(original); expect(f.ps.hand).toHaveLength(hand);
    expect(f.game.babaylanVents?.[0]?.count ?? 0).toBe(0);
  });
  it('37 Mount Lantoy answers your State releasing', async () => {
    const f = fresh(2, 37);
    const unitIndex = ids.findIndex((k: string) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const ally = f.add(unitIndex, 'ally');
    const base = currentPower(index, f.game, ally);
    await f.event('stateReleased');
    expect(currentPower(index, f.game, ally)).toBe(base + 1000);
  });

  it('the comeback four wait until you are behind', () => {
    const f = fresh(2, 42);
    expect(gate(42)!(f.ctx()), 'Units').toBe(false);
    expect(gate(39)!(f.ctx()), 'hand').toBe(false);
    expect(gate(37)!(f.ctx()), 'Barriers').toBe(false);
    expect(gate(45)!(f.ctx()), 'low Barriers').toBe(false);
    f.ps.barriers = f.ps.barriers.slice(0, 2);
    expect(gate(45)!(f.ctx()), 'eligible at 2 Barriers').toBe(true);
  });

  it('all ten declare a window, and enough different ones to choose between', () => {
    const moments = new Set<string>();
    let conditioned = 0;
    for (let n = 37; n <= 46; n++) {
      expect(window(n), `${id(n)} has no auto-switch window`).toBeTruthy();
      moments.add(String(window(n)));
      if (gate(n)) conditioned++;
    }
    expect(moments.size, 'several genuinely different moments')
      .toBeGreaterThanOrEqual(5);
    expect(conditioned, 'and the rest separated by a board condition')
      .toBeGreaterThanOrEqual(4);
  });

  it('every Codex prints its window, its State and its skill', () => {
    for (let n = 37; n <= 46; n++) {
      const lines = ALL_CARDS[id(n)]!.text.split('\n');
      expect(lines.length, `${id(n)}`).toBeGreaterThanOrEqual(3);
      expect(lines[0], id(n)).toContain('Auto-switch');
      expect(lines[1], id(n)).toContain('Andukha');
      expect(lines[2]!.length, id(n)).toBeGreaterThan(20);
    }
  });
});
describe('Full Set 1 games', () => {
  for (const [name,other] of [['mirror',deck],['Maguindanao',magDeck],['Agta',agtaDeck]] as const) it(`completes a legal match against ${name}`, async () => {
    const game=createGame(index,[deck,other],{seed:42});const chooser=new AiChooser(index,()=>game);const ctrl=new GameController(game,index,{choosers:[chooser,chooser]});
    for(let turn=0;turn<100&&game.winner===null;turn++) {await ctrl.beginTurn();await playAiTurn(ctrl,game.turnPlayer);for(const p of game.players){expect(p.energy).toBeUndefined();expect(p.allies.filter(Boolean).length).toBeLessThanOrEqual(4);expect(new Set(p.heart).size).toBe(p.heart.length);}}
    expect(game.winner).not.toBeNull();
  },60000);
});
