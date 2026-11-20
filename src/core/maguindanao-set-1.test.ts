import { describe, expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import proposals from '../../content/maguindanao-set-1-skills.json' with { type: 'json' };
import { ALL_CARDS, FULL_INDEX as index, isSelectableCard } from '../data/loader.js';
import { createGame, validateDeck } from './setup.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { autoChooser, damageUnitByAbility, offerUnit, offerValue, graveUnitCount, maguindanaoGraveCountRaw, type Chooser, type EffectContext } from './effects.js';
import { currentPower, def, inst, moveCard, you } from './state.js';
import { reevaluateState } from './states.js';
import type { PlayerId, Zone } from './types.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';

const ids = Object.keys(proposals);
const id = (n: number) => ids[n - 1]!;
function fresh(persona = 8, codex = 49, override: Partial<Chooser> = {}) {
  const game = createGame(index, [deck, deck], { seed: 25 });
  game.turnPlayer = 0; game.turnNumber = 10; game.phase = 'main';
  const chooser: Chooser = { ...autoChooser, chooseAbility: async (_p, _prompt, options, context) => context?.kind === 'response' || context?.kind === 'battle' ? null : options.length ? 0 : null, confirm: async (_p, prompt) => !prompt.startsWith('Use the follow-up to '), ...override };
  const ctrl = new GameController(game, index, { scripts: ALL_SCRIPTS, choosers: [chooser, chooser] });
  let serial = 0;
  function add(n: number, zone: Zone = 'grave', owner: PlayerId = 0, slot?: number) {
    const uid = `s1-${owner}-${serial++}`;
    const base = structuredClone(inst(game, you(game, owner).persona!));
    game.cards[uid] = { ...base, uid, defId: id(n), owner, zone: 'check', slot: null, exhausted: false, modifiers: [], usesThisTurn: {}, setOneUses: {} };
    if (zone === 'persona' && you(game, owner).persona) moveCard(game, you(game, owner).persona!, 'grave');
    moveCard(game, uid, zone, { slot: zone === 'ally' ? (slot ?? you(game, owner).allies.indexOf(null)) : undefined });
    return uid;
  }
  // No incidental abilities or check triggers in ordinary tests.
  for (const p of [0, 1] as const) {
    for (const u of [...you(game, p).hand]) moveCard(game, u, 'deck');

  }
  const hero = add(persona, 'persona');
  const active = add(codex, 'codex');
  you(game, 0).activeCodex = active;
  you(game, 1).activeCodex = null;
  for (const u of [...you(game, 0).grave]) moveCard(game, u, 'deck');
  const ctx = (source = hero, me: PlayerId = 0): EffectContext => ({ game, index, source, me, chooser,
    settle: async () => { await ctrl.flushDamageTriggers(); await ctrl.flushSpecialCallTriggers(); } });
  const garahana = () => { for (let i = 0; i < 5; i++) add(26); reevaluateState(index, game, 0); };
  const use = async (uid: string, abilityIndex = 0) => {
    expect(ctrl.canUseAbility(uid, ALL_SCRIPTS[inst(game, uid).defId]!.abilities![abilityIndex]!, 0)).toBe(true);
    await ctrl.perform({ kind: 'ability', uid, abilityIndex }, 0);
  };
  const event = async (name: Parameters<typeof ctrl.fireTrigger>[0], uid = hero) => ctrl.fireTrigger(name, 0, { name, unit: uid });
  const offered = async (uid: string) => { expect(offerUnit(ctx(), uid)).toBe(true); await ctrl.flushDamageTriggers(); };
  const play = async (n: number) => { const uid = add(n, 'hand'); expect(ctrl.legalActions(0)).toContainEqual({ kind: 'playAction', uid }); await ctrl.perform({ kind: 'playAction', uid }, 0); return uid; };
  return { game, ctrl, add, hero, active, ctx, garahana, use, event, offered, play, ps: you(game, 0) };
}

describe('Maguindanao Set 1 catalogue and selection', () => {
  it('completes Set 1 mirror matches through the real AI action loop', async () => {
    for (const seed of [7, 25, 42]) {
      const game = createGame(index, [deck, deck], { seed });
      const chooser = new AiChooser(index, () => game);
      const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
      for (let turn = 0; turn < 100 && game.winner === null; turn++) {
        await ctrl.beginTurn(); await playAiTurn(ctrl, game.turnPlayer);
        for (const p of game.players) {
          expect(p.energy).toBeUndefined();
          expect(p.allies.filter(Boolean).length).toBeLessThanOrEqual(4);
        }
      }
      expect(game.winner).not.toBeNull();
    }
  }, 60000);
  it('has skills for all 51 reviewed cards, with active Codex States and working Force modes', () => {
    expect(ids).toHaveLength(51);
    for (const key of ids) {
      const card = ALL_CARDS[key]!;
      expect(card.effectsPending, key).toBe(false);
      expect(card.text, key).toBe(proposals[key as keyof typeof proposals].skill);
      const script = ALL_SCRIPTS[key]!;
      expect(script, key).toBeDefined();
      if (card.type === 'Codex') { expect(card.state).toBe('Garahana'); expect(script.codex?.skill).toBeDefined(); }
      if (card.type === 'Force') expect(script.forceModes).toHaveLength(2);
      if (card.type === 'Action') expect(script.action).toBeDefined();
      if (card.type === 'Unit') expect(script.abilities?.length).toBeGreaterThan(0);
    }
  });
  it('hides old Mindanao printings and ships a legal entirely Set 1 starter deck', () => {
    const visible = Object.values(ALL_CARDS).filter(c => c.deck === 'Maguindanao' && isSelectableCard(c));
    expect(visible).toHaveLength(51);
    expect(isSelectableCard(ALL_CARDS[id(4)]!)).toBe(false);
    expect(ALL_CARDS[id(4)]).toBeDefined();
    expect(visible.find(c => c.type === 'Sentry')?.id).toBe('maguindanao/kuta-wato-oath-shield-panglima-sabir');
    expect(isSelectableCard(ALL_CARDS['maguindanao/blood-moon-bai-a-labi']!)).toBe(false);
    expect(isSelectableCard(ALL_CARDS['agta/the-boar-spear-makisig']!)).toBe(false);
    validateDeck(index, deck);
    for (const key of [...deck.main.map(e => e.id), ...deck.codex, deck.persona]) expect(visible.some(c => c.id === key)).toBe(true);
  });
});

describe('Offer and Last Oath rules', () => {
  it('counts the reported Bird, Divine and Alad Grave as six and releases Garahana', async () => {
    const f = fresh();
    const names = ['house-shell-shadow-pahira', 'sun-darkening-scourge-pah',
      'current-borne-ancestor-crocodile-form-apu', 'last-witness-of-the-old-words-alad', 'sun-darkening-scourge-pah'];
    for (const name of names) f.add(ids.indexOf(`maguindanao/set-1/${name}`) + 1);
    expect(maguindanaoGraveCountRaw(index, f.game, 0)).toBe(6);
    await f.ctrl.fireTrigger('startOfMain', 0);
    expect(f.ps.releasedState).toBe('Garahana');
  });
  it('keeps creature kinds while giving every Maguindanao card its deck identity', () => {
    for (const card of Object.values(ALL_CARDS).filter(c => c.deck === 'Maguindanao')) {
      expect(card.subtypes.some(s => s === 'Maguindanaon' || s === 'Maguindanao'), card.id).toBe(true);
    }
    expect(index['maguindanao/set-1/sun-darkening-scourge-pah']!.subtypes).toContain('Bird');
    expect(index['maguindanao/set-1/matutun-branch-devourer-tarabusaw']!.subtypes).toContain('Beast');
    expect(index['maguindanao/set-1/current-borne-ancestor-crocodile-form-apu']!.subtypes).toContain('Divine');
  });
  it('Kali Adam pays one Offer, while Alad counts twice only in the Grave', async () => {
    const f = fresh(5); const kali = f.add(26, 'ally'); const alad = f.add(22, 'ally');
    expect(offerValue(index, f.game, kali)).toBe(1); expect(offerValue(index, f.game, alad)).toBe(1);
    await f.use(f.hero);
    expect(f.ps.unitsOfferedThisTurn).toBe(2);
    expect(currentPower(index, f.game, f.hero)).toBe(16000);
    expect(maguindanaoGraveCountRaw(index, f.game, 0)).toBe(3);
    expect(graveUnitCount(f.ctx())).toBe(3);
    expect(f.ps.grave).toHaveLength(2);
  });
  it('Garahana releases at five and fades when recovery reduces the Grave below five', async () => {
    const f = fresh(); f.add(22); f.add(26); f.add(26); const rin = f.add(19);
    reevaluateState(index, f.game, 0); expect(f.ps.releasedState).toBe('Garahana');
    moveCard(f.game, rin, 'hand'); reevaluateState(index, f.game, 0); expect(f.ps.releasedState).toBeNull();
    f.add(28); reevaluateState(index, f.game, 0); expect(f.ps.releasedState).toBe('Garahana');
  });
  it('enemy damage never masquerades as an Offer or triggers Last Oath', async () => {
    const f = fresh(); const amina = f.add(39, 'ally'); const ally = f.add(22, 'ally');
    damageUnitByAbility(f.ctx(f.hero, 1), amina); await f.ctrl.flushDamageTriggers();
    expect(f.ps.energy).toBeUndefined(); expect(f.ps.unitsOfferedThisTurn).toBe(0);
    expect(currentPower(index, f.game, ally)).toBe(6000);
  });
  for (const n of [19,20,21,23,26,39,41]) {
    it(`${n}: the Ally bonus is free at zero Energy and never buffs the Persona`, async () => {
      const f = fresh(); const ally = f.add(22, 'ally'); const source = f.add(n, 'ally');
      await f.offered(source);
      expect(currentPower(index, f.game, ally)).toBe(9000);
      expect(currentPower(index, f.game, f.hero)).toBe(11000);
      expect(f.ps.energy).toBeUndefined();
    });
    it(`${n}: declining the paid follow-up retains the free bonus`, async () => {
      let prompted = false;
      const f = fresh(8,49,{confirm:async()=>{prompted=true;return false;}});
      const ally = f.add(22,'ally'); const source=f.add(n,'ally');
      f.add(41,'deck'); f.add(26,'deck'); f.add(13,'ally',1);
      const deck = [...f.ps.deck]; const hand = [...f.ps.hand];
      await f.offered(source);
      expect(prompted).toBe(true); expect(f.ps.energy).toBeUndefined();
      expect(currentPower(index,f.game,ally)).toBe(9000);
      expect(f.ps.deck).toEqual(deck); expect(f.ps.hand).toEqual(hand);
    });
  }
  it('Rinamuntaw buffs an Ally before paying one Energy to draw then discard', async()=>{
    const f=fresh(8,49,{confirm:async()=>true}); const ally=f.add(22,'ally'); const source=f.add(19,'ally');
    const top=f.add(26,'deck'); const before=f.ps.hand.length;
    await f.offered(source);
    expect(currentPower(index,f.game,ally)).toBe(9000); expect(f.ps.energy).toBeUndefined();
    expect(f.ps.hand).toHaveLength(before); expect(inst(f.game,top).zone).toBe('grave');
  });
  it('Rinayung searches the deck for the subtype, enters charged, and never uses the old hand call',async()=>{
    const f=fresh(8,49,{confirm:async()=>true}); const ally=f.add(22,'ally'); const source=f.add(20,'ally');
    const wanted=f.add(23,'deck'); const wrongLevel=f.add(8,'deck'); const wrongSubtype=f.add(11,'deck'); const hand=f.add(26,'hand');
    await f.offered(source);
    expect(inst(f.game,wanted).zone).toBe('ally');expect(inst(f.game,wanted).exhausted).toBe(false);
    for(const u of [wrongLevel,wrongSubtype]) expect(inst(f.game,u).zone).toBe('deck');
    expect(inst(f.game,hand).zone).toBe('hand');expect(currentPower(index,f.game,ally)).toBe(9000);expect(f.ps.energy).toBeUndefined();
  });
  it('Layla mills exactly one after the free Ally buff and the payment',async()=>{
    const order:string[]=[];
    const f=fresh(8,49,{confirm:async()=>{order.push('pay');return true;}});const ally=f.add(22,'ally');const source=f.add(23,'ally');const top=f.add(26,'deck');
    await f.offered(source);
    expect(order).toEqual(['pay']);expect(currentPower(index,f.game,ally)).toBe(9000);
    expect(inst(f.game,top).zone).toBe('grave');expect(f.ps.energy).toBeUndefined();
    expect(f.ps.deck.includes(top)).toBe(false);
  });
  it('Kali Adam may add the paid +3000 to the Persona after the free Ally +3000',async()=>{
    const f=fresh(8,49,{confirm:async()=>true,chooseTarget:async(_p,prompt,pool)=>prompt.includes('Power')&&pool.includes(f.hero)?f.hero:pool[0]??null});
    const ally=f.add(22,'ally');const source=f.add(26,'ally');await f.offered(source);
    expect(currentPower(index,f.game,ally)).toBe(9000);expect(currentPower(index,f.game,f.hero)).toBe(14000);expect(f.ps.energy).toBeUndefined();
  });
  it('Karim calls only a copy of itself from the deck, charged',async()=>{
    const f=fresh(8,49,{confirm:async()=>true});const ally=f.add(22,'ally');const source=f.add(41,'ally');const wanted=f.add(41,'deck');
    const grave=f.add(41);await f.offered(source);
    expect(inst(f.game,wanted).zone).toBe('ally');expect(inst(f.game,wanted).exhausted).toBe(false);
    expect(inst(f.game,grave).zone).toBe('grave');expect(inst(f.game,source).zone).toBe('grave');expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,ally)).toBe(9000);
  });
  it('Amina pays one Energy to damage an enemy Ally after buffing yours',async()=>{
    const f=fresh(8,49,{confirm:async()=>true});const ally=f.add(22,'ally');const source=f.add(39,'ally');const enemy=f.add(13,'ally',1);
    await f.offered(source);expect(inst(f.game,enemy).zone).toBe('grave');expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,ally)).toBe(9000);
  });
  for (const n of [11,21]) it(`${n}: looks at five, reveals only a qualifying card and orders the rest once`,async()=>{
    const shown:Array<{p:number,cards:string[]}>=[];let orders=0;
    const f=fresh(8,49,{confirm:async()=>true,revealCards:async(p,cards)=>{shown.push({p,cards:[...cards]});},
      chooseCards:async(p,prompt,cards,count,opts)=>{if(opts?.ordered){orders++;return [...cards].reverse();}return autoChooser.chooseCards(p,prompt,cards,count,opts);}});
    const ally=f.add(22,'ally');const source=f.add(n,'ally');
    const wanted=f.add(n===11?13:23,'deck');const wrong=f.add(24,'deck');
    if(n===21) inst(f.game,wrong).defId=Object.values(index).find(d=>d.type==='Unit' && d.id.startsWith('agta/set-1/'))!.id;
    const top=f.ps.deck.slice(0,5);
    await f.offered(source);
    expect(inst(f.game,wanted).zone).toBe('hand');expect(inst(f.game,wrong).zone).toBe('deck');
    expect(shown[0]).toEqual({p:0,cards:top});expect(shown[1]).toEqual({p:1,cards:[wanted]});
    expect(orders).toBe(1);expect(f.ps.deck.slice(-4)).toEqual(top.filter(u=>u!==wanted).reverse());
    expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,ally)).toBe(n===11?6000:9000);
  });
  it('Pahira may decline the hand card and bottom all five in one ordered choice',async()=>{
    const f=fresh(8,49,{chooseTarget:async()=>null});const source=f.add(11,'ally');f.add(13,'deck');const top=f.ps.deck.slice(0,5);
    await f.offered(source);expect(f.ps.hand).toHaveLength(0);expect(f.ps.deck.slice(-5)).toEqual(top);
  });
  it('Old Woman does not search on placement anymore',async()=>{
    const f=fresh();const source=f.add(21,'ally');const top=f.add(26,'deck');await f.event('placed',source);
    expect(inst(f.game,top).zone).toBe('deck');expect(f.ps.energy).toBeUndefined();
  });
  it('Apu called by the first Offer during end-turn cleanup is still Offered that turn',async()=>{
    const f=fresh();f.garahana();const apu=f.add(17);f.add(12,'ally');
    await f.ctrl.finishTurn();expect(inst(f.game,apu).zone).toBe('grave');expect(inst(f.game,apu).wasOffered).toBe(true);
  });
  it('Salendagao requires Garahana and can trigger for multiple Offers in one turn',async()=>{
    const f=fresh();const sal=f.add(15,'ally');await f.offered(f.add(22,'ally'));
    expect(currentPower(index,f.game,sal)).toBe(9000);
    f.garahana();await f.offered(f.add(22,'ally'));await f.offered(f.add(22,'ally'));
    expect(currentPower(index,f.game,sal)).toBe(19000);
  });
  it('two Salendagao copies each trigger twice when Tarabusaw offers two other Allies', async () => {
    const f = fresh(7, 49, {
      chooseTarget: async (_p, _prompt, pool) => pool.includes(f.hero) ? f.hero : pool[0] ?? null,
    });
    f.garahana();
    const offered = [f.add(22, 'ally'), f.add(22, 'ally')];
    const sources = [f.add(15, 'ally'), f.add(15, 'ally')];
    const before = currentPower(index, f.game, f.hero);
    await f.use(f.hero);
    for (const uid of offered) expect(inst(f.game, uid).zone).toBe('grave');
    for (const uid of sources) expect(inst(f.game, uid).zone).toBe('ally');
    const boosts = inst(f.game, f.hero).modifiers.filter(m => m.sourceId === id(15));
    expect(boosts).toHaveLength(4);
    for (const uid of sources) expect(boosts.filter(m => m.origin?.uid === uid)).toHaveLength(2);
    for (const uid of offered) expect(boosts.filter(m => m.cause?.uid === uid)).toHaveLength(2);
    expect(boosts.map(m => m.cause?.slot).sort()).toEqual([0, 0, 1, 1]);
    expect(boosts.every(m => m.amount === 5000 && m.duration === 'endOfTurn')).toBe(true);
    expect(currentPower(index, f.game, f.hero)).toBe(before + 20000);
    // Draining the pending queue again must not repeat those four triggers.
    await f.ctrl.flushDamageTriggers();
    expect(inst(f.game, f.hero).modifiers.filter(m => m.sourceId === id(15))).toHaveLength(4);
  });
  it('Lanao Sprite pays one Energy and its Persona buff lasts until the opponent turn ends',async()=>{
    const f=fresh();const sprite=f.add(16,'ally');await f.offered(sprite);
    expect(f.ps.energy).toBeUndefined();expect(currentPower(index,f.game,f.hero)).toBe(13000);
    await f.ctrl.finishTurn();expect(currentPower(index,f.game,f.hero)).toBe(13000);
    await f.ctrl.finishTurn();expect(currentPower(index,f.game,f.hero)).toBe(11000);
    const zero=fresh();await zero.offered(zero.add(16,'ally'));expect(currentPower(index,zero.game,zero.hero)).toBe(13000);
  });
  it('Apu answers the actual first Offer from the Grave and is Offered at the end of its owner turn',async()=>{
    const f=fresh();f.garahana();const apu=f.add(17);const first=f.add(22,'ally');const second=f.add(22,'ally');
    // Both are paid before triggers drain: only the first event has the first-Offer marker.
    offerUnit(f.ctx(),first);offerUnit(f.ctx(),second);await f.ctrl.flushDamageTriggers();
    expect(inst(f.game,apu).zone).toBe('ally');expect(inst(f.game,apu).exhausted).toBe(false);
    await f.ctrl.finishTurn();expect(inst(f.game,apu).zone).toBe('grave');expect(inst(f.game,apu).wasOffered).toBe(true);
  });
  it('Apu misses the window if Garahana releases only after a later Offer',async()=>{
    const f=fresh();const apu=f.add(17);await f.offered(f.add(22,'ally'));
    f.garahana();await f.offered(f.add(22,'ally'));expect(inst(f.game,apu).zone).toBe('grave');
  });
  it('Apu summoned on the opponent turn stays until the end of its owner next turn',async()=>{
    const f=fresh();f.garahana();f.game.turnPlayer=1;const apu=f.add(17);await f.offered(f.add(22,'ally'));
    expect(inst(f.game,apu).zone).toBe('ally');await f.ctrl.finishTurn();expect(inst(f.game,apu).zone).toBe('ally');
    await f.ctrl.finishTurn();expect(inst(f.game,apu).zone).toBe('grave');
  });
  it('normal calls and leaving/reentering do not inherit Apu expiry',async()=>{
    const f=fresh();f.garahana();const normal=f.add(17,'ally');const apu=f.add(17);
    await f.offered(f.add(22,'ally'));moveCard(f.game,apu,'grave');moveCard(f.game,apu,'ally',{slot:2});
    await f.ctrl.finishTurn();expect(inst(f.game,apu).zone).toBe('ally');expect(inst(f.game,normal).zone).toBe('ally');
  });
});

describe('Set 1 Personas and attackers', () => {
  it('Bekong grants +3000 once on Offer and automatically keeps every Garahana shield bonus', async () => {
    const f = fresh(1); f.garahana(); await f.offered(f.add(22, 'ally'));
    expect(currentPower(index, f.game, f.hero)).toBe(14000);
    await f.offered(f.add(22, 'ally'));
    expect(currentPower(index, f.game, f.hero)).toBe(14000);
    await f.event('barrierBroken'); await f.event('barrierBroken');
    expect(currentPower(index, f.game, f.hero)).toBe(16000);
    for (const u of [...f.ps.grave]) moveCard(f.game, u, 'deck');
    reevaluateState(index, f.game, 0);
    await f.ctrl.finishTurn();
    expect(currentPower(index, f.game, f.hero)).toBe(13000);
    await f.event('barrierBroken');
    expect(currentPower(index, f.game, f.hero)).toBe(13000);
    const automatic = fresh(1, 49, { chooseAbility: async () => null }); automatic.garahana();
    await automatic.event('barrierBroken');
    expect(currentPower(index, automatic.game, automatic.hero)).toBe(12000);
  });
  it('Potri revives a Level 1 charged, then pays separately to draw and gain Offer Power', async () => {
    const f = fresh(2); f.garahana(); f.add(26); f.add(28, 'ally');
    const h = f.ps.hand.length;
    await f.use(f.hero);
    expect(f.ps.allies.filter(Boolean)).toHaveLength(1); expect(f.ps.energy).toBeUndefined();
    expect(f.ps.hand.length).toBe(h);
    expect(inst(f.game, f.ps.allies.find(Boolean)!).exhausted).toBe(false);
    const offered = f.ps.unitsOfferedThisTurn;
    await f.use(f.hero, 1);
    expect(f.ps.energy).toBeUndefined(); expect(f.ps.hand).toHaveLength(h + 1);
    expect(currentPower(index, f.game, f.hero)).toBe(11000 + 2000 * offered);
    expect(f.ctrl.canUseAbility(f.hero, ALL_SCRIPTS[id(2)]!.abilities![1]!, 0)).toBe(false);
  });
  it('Tomitay keeps all three on top in the chosen order and charges only on attack Force checks', async () => {
    let orderPrompts = 0;
    const f = fresh(3, 49, { chooseCards: async (p, prompt, cards, n, options) => {
      if (options?.ordered) { orderPrompts++; expect(n).toBe(3); return [...cards].reverse(); }
      return autoChooser.chooseCards(p, prompt, cards, n, options);
    } });
    f.garahana(); f.add(22, 'ally');
    const a = f.add(24, 'deck'); const b = f.add(25, 'deck'); const c = f.add(27, 'deck');
    const rest = f.ps.deck.slice(3); const h = f.ps.hand.length;
    await f.event('attack');
    expect(orderPrompts).toBe(1); expect(f.ps.energy).toBeUndefined();
    expect(f.ps.deck).toEqual([a, b, c, ...rest]);
    const ally = f.add(13, 'ally'); inst(f.game, ally).exhausted = true;
    await f.ctrl.fireTrigger('forceResolved', 0, { name: 'forceResolved', checkKind: 'barrier', revealed: a });
    expect(f.ps.hand).toHaveLength(h); expect(inst(f.game, ally).exhausted).toBe(true);
    await f.ctrl.fireTrigger('forceResolved', 0, { name: 'forceResolved', checkKind: 'attack', revealed: a });
    expect(f.ps.hand).toHaveLength(h + 1); expect(inst(f.game, ally).exhausted).toBe(false);
    await f.ctrl.fireTrigger('forceResolved', 0, { name: 'forceResolved', checkKind: 'attack', revealed: b });
    expect(f.ps.hand).toHaveLength(h + 1);
  });
  for (const shields of [1, 2, 3]) it(`Pah uses the correct bonus with ${shields} shields`, async () => {
    const f = fresh(5); f.add(22, 'ally'); f.add(22, 'ally');
    while (f.ps.barriers.length > shields) moveCard(f.game, f.ps.barriers[0]!, 'hand');
    await f.use(f.hero);
    expect(currentPower(index, f.game, f.hero)).toBe(11000 + (shields <= 2 ? 10000 : 5000));
  });
  it('Energy is absent while Offer and State gates still prevent illegal activations', async () => {
    for (const n of [2, 3, 8]) {
      const f = fresh(n); f.garahana(); f.add(22, 'ally');
      const ability = ALL_SCRIPTS[id(n)]!.abilities![0]!;
      expect(f.ctrl.canUseAbility(f.hero, ability, 0, { name: 'attack', unit: f.hero })).toBe(true);
      expect(f.ps.allies.filter(Boolean)).toHaveLength(1);
    }
    for (const n of [5, 6, 7, 9, 10, 40]) {
      const f = fresh(n); f.garahana();
      const ability = ALL_SCRIPTS[id(n)]!.abilities![0]!;
      expect(f.ctrl.canUseAbility(f.hero, ability, 0, { name: 'attack', unit: f.hero })).toBe(false);
    }
    for (const n of [1, 2, 3, 5, 6, 7, 8, 9, 10, 40]) {
      const f = fresh(n);
      expect(f.ctrl.canUseAbility(f.hero, ALL_SCRIPTS[id(n)]!.abilities![1]!, 0)).toBe(false);
    }
  });
  it('Tarabusaw cannot buy its first-attack check after already attacking', async () => {
    const f = fresh(7); f.game.phase = 'battle'; const target = f.add(13, 'ally', 1); f.add(26, 'deck');
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target, supporters: [] }, 0);
    f.add(22, 'ally'); f.game.phase = 'main';
    expect(f.ctrl.canUseAbility(f.hero, ALL_SCRIPTS[id(7)]!.abilities![0]!, 0)).toBe(false);
  });
  it('Sulayman does not carry a missed attack draw into a later hit', async () => {
    const f = fresh(10); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally'); f.add(22, 'ally');
    const foe = you(f.game, 1).persona!;
    inst(f.game, foe).modifiers.push({ amount: 100000, duration: 'permanent', source: 'test' });
    f.add(26, 'deck'); f.game.phase = 'battle';
    const before = f.ps.hand.length;
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: null, supporters: [] }, 0);
    expect(f.ps.hand).toHaveLength(before + 1); // ordinary check, no hit draw
    expect(inst(f.game, f.hero).sulaymanHitDrawTurn).toBeUndefined();
    await f.event('attackHit'); expect(f.ps.hand).toHaveLength(before + 1);
  });
  it('Tomitay arranges the actual Persona check and receives its Force payoff', async () => {
    const f = fresh(3); f.garahana(); f.add(22, 'ally'); const ally = f.add(13, 'ally'); inst(f.game, ally).exhausted = true;
    const top = f.add(25, 'deck'); f.game.phase = 'battle';
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: null, supporters: [] }, 0);
    expect(inst(f.game, top).zone).toBe('hand'); expect(inst(f.game, ally).exhausted).toBe(false);
    expect(f.game.log.some(s => s.includes('Force!'))).toBe(true);
  });
  it('Omaka-an inherits current Power and returns the exact offered Beast after battle', async () => {
    const f = fresh(4); f.garahana(); const beast = f.add(13, 'ally');
    inst(f.game, beast).modifiers.push({ amount: 3000, duration: 'endOfTurn', source: f.hero });
    await f.event('attack'); expect(currentPower(index, f.game, f.hero)).toBe(23000); expect(inst(f.game, beast).zone).toBe('grave');
    await f.event('attackResolved'); expect(inst(f.game, beast).zone).toBe('ally'); expect(inst(f.game, beast).exhausted).toBe(false);
  });
  it('Pah can restand once; leaving and returning cannot reset its turn limit', async () => {
    const f = fresh(5); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally'); f.add(22, 'ally'); inst(f.game, f.hero).exhausted = true;
    await f.event('attackResolved'); expect(inst(f.game, f.hero).exhausted).toBe(false);
    expect(currentPower(index, f.game, f.hero)).toBe(16000);
    f.add(22, 'ally'); f.add(22, 'ally'); f.add(22, 'ally'); inst(f.game, f.hero).exhausted = true;
    moveCard(f.game, f.hero, 'grave'); moveCard(f.game, f.hero, 'persona'); inst(f.game, f.hero).exhausted = true;
    await f.event('attackResolved'); expect(inst(f.game, f.hero).exhausted).toBe(true);
  });
  it('Kurita damages ready Allies both before and after an attack, with no hit requirement', async () => {
    const f = fresh(6); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally');
    const a = f.add(13, 'ally', 1); const b = f.add(13, 'ally', 1);
    await f.event('attack'); expect(inst(f.game, a).zone).toBe('grave');
    expect(currentPower(index, f.game, f.hero)).toBe(16000);
    await f.event('attackResolved'); expect(inst(f.game, b).zone).toBe('grave');
    const third = f.add(13, 'ally', 1); f.add(22, 'ally');
    await f.event('attackResolved'); expect(inst(f.game, third).zone).toBe('ally');
  });
  it('Tarabusaw checks twice on its first attack and skips only the next attack check', async () => {
    const f = fresh(7); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally');
    await f.use(f.hero);
    f.add(22, 'ally'); f.add(22, 'ally'); f.game.phase = 'battle';
    // Attack Allies so Barrier checks cannot inflate the attack-check count.
    const a = f.add(13, 'ally', 1); const b = f.add(13, 'ally', 1);
    f.add(26, 'deck'); f.add(26, 'deck');
    const before = f.game.checkCount;
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: a, supporters: [] }, 0);
    expect(f.game.checkCount - before).toBe(2);
    expect(inst(f.game, f.hero).exhausted).toBe(false);
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: b, supporters: [] }, 0);
    expect(f.game.checkCount - before).toBe(2);
    expect(inst(f.game, f.hero).skipCheckTurn).toBeUndefined();
    expect(inst(f.game, f.hero).exhausted).toBe(true);
  });
  it('Indarapatra can call Maguindanaon Beasts and Divines, then Offer 3 calls two boosted Units', async () => {
    let first = '', divine = '', beast = '', choseFirst = false;
    const f = fresh(8, 49, { chooseTarget: async (p, prompt, pool) => {
      if (!choseFirst && pool.includes(first)) {
        expect(pool).toContain(divine); expect(pool).toContain(beast);
        choseFirst = true; return first;
      }
      return autoChooser.chooseTarget(p, prompt, pool);
    } }); f.garahana();
    first = f.add(23, 'deck');
    divine = f.add(15, 'deck'); beast = f.add(13, 'deck');
    await f.use(f.hero);
    expect(inst(f.game, first).zone).toBe('ally'); expect(f.ps.energy).toBeUndefined();
    expect(f.ps.unitsOfferedThisTurn).toBe(0); expect(inst(f.game, first).exhausted).toBe(false);
    expect(inst(f.game, divine).zone).toBe('deck'); expect(inst(f.game, beast).zone).toBe('deck');
    // Use plain bodies to isolate the second skill.
    moveCard(f.game, first, 'hand'); f.add(22, 'ally'); f.add(22, 'ally'); f.add(22, 'ally');
    const a = f.add(23, 'deck'); const b = f.add(22, 'deck');
    await f.event('attackResolved');
    for (const u of [a, b]) {
      expect(inst(f.game, u).zone).toBe('ally'); expect(inst(f.game, u).exhausted).toBe(false);
      expect(currentPower(index, f.game, u)).toBe(def(index, f.game, u).power + 5000);
    }
    expect(f.ps.energy).toBeUndefined();
  });
  it('Maka-Ogis adds current Ally Power with no old subtype rewards; Garahana adds 5000 on its turn', async () => {
    for (const n of [13, 11, 26]) {
      const f = fresh(9); f.garahana(); const ally = f.add(n, 'ally');
      inst(f.game, ally).modifiers.push({ amount: 2000, duration: 'endOfTurn', source: 'test' });
      const power = currentPower(index, f.game, ally);
      const enemy = f.add(13, 'ally', 1); const h = f.ps.hand.length;
      await f.event('attack');
      const passive = f.ps.unitsOfferedThisTurn >= 2 ? 5000 : 0;
      expect(currentPower(index, f.game, f.hero)).toBe(11000 + power + passive);
      // Pahira's own Last Oath may add a card; Maka-Ogis itself no longer does.
      if (n !== 11) expect(f.ps.hand).toHaveLength(h);
      expect(inst(f.game, enemy).exhausted).toBe(false);
      f.game.turnPlayer = 1;
      expect(currentPower(index, f.game, f.hero)).toBe(11000 + power);
    }
  });
  it('Sulayman calls any Maguindanaon level and gives both Units +3000', async () => {
    const f = fresh(10); f.add(22, 'ally'); const target = f.add(8, 'deck');
    await f.use(f.hero);
    expect(inst(f.game, target).zone).toBe('ally'); expect(inst(f.game, target).exhausted).toBe(false);
    expect(currentPower(index, f.game, target)).toBe(14000);
    expect(currentPower(index, f.game, f.hero)).toBe(14000);
  });
  it('Sulayman damages two distinct Allies and earns one draw only when the paid attack hits', async () => {
    const f = fresh(10); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally'); f.add(22, 'ally');
    const a = f.add(13, 'ally', 1); const b = f.add(13, 'ally', 1); const h = f.ps.hand.length;
    await f.event('attack');
    expect(inst(f.game, a).zone).toBe('grave'); expect(inst(f.game, b).zone).toBe('grave');
    expect(currentPower(index, f.game, f.hero)).toBe(21000);
    await f.event('attackHit'); expect(f.ps.hand).toHaveLength(h + 1);
    await f.event('attackHit'); expect(f.ps.hand).toHaveLength(h + 1);
  });
  it('Gurayn calls two top-seven Beasts/Birds, bottoms leftovers once, and Personifies a charged copy from hand', async () => {
    const f = fresh(40); f.garahana(); f.add(22, 'ally'); f.add(22, 'ally');
    const b = f.add(13, 'deck'); const a = f.add(12, 'deck'); const rest = f.ps.deck.slice(2, 7);
    await f.event('attack');
    for (const u of [a, b]) { expect(inst(f.game, u).zone).toBe('ally'); expect(inst(f.game, u).exhausted).toBe(false); }
    expect(f.ps.deck.slice(-rest.length)).toEqual(rest);
    const replacement = f.add(40, 'hand'); f.add(22, 'ally'); f.add(22, 'ally');
    await f.event('attackResolved');
    expect(f.ps.persona).toBe(replacement); expect(inst(f.game, replacement).exhausted).toBe(false);
    expect(inst(f.game, f.hero).zone).toBe('heart');
  });
  it('Kuritan, Tarabuk, Balbal, Salendagao and Salimbadut each deliver their planned field effect', async () => {
    const f = fresh(); f.ps.unitsOfferedThisTurn = 1;
    const kuritan = f.add(12, 'ally'); await f.event('placed', kuritan); expect(currentPower(index, f.game, kuritan)).toBe(14000);
    const tarabuk = f.add(13, 'ally'); inst(f.game, tarabuk).exhausted = true; await f.event('attackResolved', tarabuk);
    expect(inst(f.game, tarabuk).exhausted).toBe(false); expect(currentPower(index, f.game, tarabuk)).toBe(12000);
    const balbal = f.add(14, 'ally'); for (let i = 0; i < 3; i++) f.add(26, 'deck'); await f.event('placed', balbal); expect(currentPower(index, f.game, balbal)).toBe(18000);
    f.garahana(); const salendagao = f.add(15, 'ally'); await f.offered(tarabuk); expect(currentPower(index, f.game, balbal)).toBe(23000);
    const hunter = f.add(18, 'ally'); const enemy = f.add(13, 'ally', 1); inst(f.game, enemy).exhausted = true; await f.event('attackResolved', hunter); expect(inst(f.game, enemy).zone).toBe('grave');
    expect(inst(f.game, salendagao).zone).toBe('ally');
  });
  it('Layla no longer triggers on a Codex switch', async () => {
    const f = fresh(); const layla = f.add(23, 'ally'); f.add(26, 'hand'); const next = f.add(44, 'codex');
    await f.ctrl.perform({ kind: 'switchCodex', uid: next }, 0); expect(currentPower(index, f.game, layla)).toBe(6000);
  });
});

describe('Set 1 Force cards', () => {
  for (const n of [24,25,27,28]) it(`Force ${n} needs a response window and keeps its check effect`, async () => {
    const f=fresh(), ally=f.add(26,'ally'), uid=f.add(n,'hand');
    expect(f.ctrl.legalActions(0)).not.toContainEqual({kind:'playForce',uid,mode:1});
    await f.ctrl.perform({kind:'playForce',uid,mode:1},0);
    expect(inst(f.game,uid).zone).toBe('hand');
    const power=currentPower(index,f.game,ally);
    await ALL_SCRIPTS[id(n)]!.forceModes![0]!.run(f.ctx(uid));
    expect(currentPower(index,f.game,ally)).toBe(power+5000);
  });
});

describe('All ten Set 1 Actions', () => {
  it('Four Scourges and Vow make charged temporary bodies that are Offered even when optional triggers are declined', async () => {
    const f = fresh(8, 49, { chooseAbility: async () => null }); const beast = f.add(13); const bird = f.add(11);
    await f.play(29); expect(inst(f.game, beast).zone).toBe('ally'); expect(inst(f.game, bird).zone).toBe('ally');
    await f.play(30); expect(f.ps.allies.filter(Boolean)).toHaveLength(3);
    await f.ctrl.finishTurn(); expect(inst(f.game, beast).zone).toBe('grave'); expect(inst(f.game, bird).zone).toBe('grave'); expect(f.ps.allies.filter(Boolean)).toHaveLength(0);
  });
  it('Kabalalan only damages a chosen target that was exhausted before the effect', async () => {
    const f = fresh(); f.garahana(); f.add(26, 'ally'); const a = f.add(13, 'ally', 1); const b = f.add(13, 'ally', 1); inst(f.game, b).exhausted = true;
    await f.play(31); expect(inst(f.game, a).zone).toBe('ally'); expect(inst(f.game, a).exhausted).toBe(true); expect(inst(f.game, b).zone).toBe('grave');
  });
  it('Until Tarabusaw Tired grants exactly one Beast restand, and the third-victory Action refunds Energy under Garahana', async () => {
    const f = fresh(); f.garahana(); const beast = f.add(4, 'ally'); f.add(22, 'ally'); await f.play(32); f.game.phase = 'battle';
    await f.ctrl.perform({ kind: 'attack', attacker: beast, target: null, supporters: [] }, 0); expect(inst(f.game, beast).exhausted).toBe(false); expect(currentPower(index, f.game, beast)).toBe(14000);
    expect(inst(f.game, beast).grantedRepeat).toBeUndefined();
    f.game.phase = 'main'; f.ps.unitsOfferedThisTurn = 3;  const h = f.ps.hand.length;
    await f.play(33); expect(f.ps.energy).toBeUndefined(); expect(f.ps.hand.length).toBe(h + 1);
  });
  it('Day Became Night upgrades one exhaust to damage after Offer 3', async () => {
    const f = fresh(); f.ps.unitsOfferedThisTurn = 3; const enemy = f.add(13, 'ally', 1); await f.play(34); expect(inst(f.game, enemy).zone).toBe('grave');
  });
  it('Life-Sign lets the opponent choose their loss, or draws if no enemies remain', async () => {
    let decidingPlayer: PlayerId | undefined;
    const f = fresh(8, 49, { chooseTarget: async (p, _q, choices) => { decidingPlayer = p; return choices[0] ?? null; } });
    f.add(26, 'ally'); const enemy = f.add(13, 'ally', 1); await f.play(35); expect(inst(f.game, enemy).zone).toBe('grave'); expect(decidingPlayer).toBe(1);
    f.add(26, 'ally'); const h = f.ps.hand.length; await f.play(35); expect(f.ps.hand.length).toBe(h + 1);
  });
  it('Brother Awakened calls one of each sibling from deck or Grave', async () => {
    const f = fresh(); f.add(19, 'deck'); f.add(20); await f.play(36);
    expect(f.ps.allies.filter(Boolean).map(u => def(index, f.game, u!).id).sort()).toEqual([id(19), id(20)].sort()); expect(f.ps.allies.some(u => u && inst(f.game, u).defId === id(20))).toBe(true);
  });
  it('Seven Heads caps Power at 10000 and grants one removal; Lowlands returns one and recycles another', async () => {
    const f = fresh(1); for (let i = 0; i < 12; i++) f.add(26); const enemy = f.add(13, 'ally', 1); inst(f.game, enemy).exhausted = true;
    let attackPower = 0;
    f.ctrl.hooks.onAttackResolved = async (_battle, result) => { attackPower = result.attackPower; };
    await f.play(37); f.game.phase = 'battle'; f.add(26, 'deck');
    await f.ctrl.perform({ kind: 'attack', attacker: f.hero, target: null, supporters: [] }, 0);
    expect(attackPower).toBe(21000); expect(inst(f.game, enemy).zone).toBe('grave');
    f.game.phase = 'main'; const before = f.ps.grave.length; const h = f.ps.hand.length;
    await f.play(38); expect(f.ps.hand.length).toBe(h + 1); expect(f.ps.grave.length).toBe(before - 1); expect(def(index, f.game, f.ps.deck.at(-1)!).level).toBe(1);
  });
});

describe('All ten Set 1 Codex skills', () => {
  /**
   * One test per Codex, against what it is FOR.
   *
   * Maguindanao pays with its own board — Offer a Unit, fill the Grave, release
   * Garahana — so each test asserts that the Codex feeds that loop, and that
   * the condition it arrives on actually gates it. The comeback four are
   * checked both ways: eligible while behind, refused while level.
   */
  const skill = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.skill!;
  const gate = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.autoSwitchWhen;
  const window = (n: number) => ALL_SCRIPTS[id(n)]!.codex!.autoSwitchOn;

  it('42 Mantapuli pays first and draws only with Garahana released', async () => {
    // Declining the Offer prompt still pays, with the top of the deck.
    const f = fresh(8, 42, { confirm: async () => false });
    f.garahana();
    const hand = f.ps.hand.length;
    const grave = f.ps.grave.length;
    await skill(42).run(f.ctx(f.active));
    expect(f.ps.hand, 'the draw still happens').toHaveLength(hand + 1);
    expect(f.ps.grave.length, 'and something paid for it').toBe(grave + 1);
    expect(skill(42).type).toBe('replacement');
    expect(skill(42).replaces).toBe('draw');
  });

  it('46 Mount Gurayn Personifies out of the deck', async () => {
    const f = fresh(8, 46);
    const before = f.ps.persona!;
    // A Level 3 in the top five.
    const lvl3 = ids.findIndex((k) => ALL_CARDS[k]!.type === 'Unit'
      && ALL_CARDS[k]!.level === 3) + 1;
    const u = f.add(lvl3, 'deck');
    f.ps.deck.splice(f.ps.deck.indexOf(u), 1);
    f.ps.deck.unshift(u);
    await skill(46).run(f.ctx(f.active));
    expect(f.ps.persona, 'a Level 3 from the deck').toBe(u);
    expect(inst(f.game, before).zone, 'the old Persona goes to the Heart').toBe('heart');
    expect(skill(46).replaces).toBe('personify');
  });

  it('46 Mount Gurayn bottoms all five when it takes none', async () => {
    const f = fresh(8, 46);
    // Strip Level 3 Units off the top so there is nothing to take.
    f.ps.deck = f.ps.deck.filter((u) => def(index, f.game, u).level !== 3);
    const top5 = f.ps.deck.slice(0, 5);
    const persona = f.ps.persona;
    await skill(46).run(f.ctx(f.active));
    expect(f.ps.persona, 'the Persona is unchanged').toBe(persona);
    for (const u of top5) {
      expect(f.ps.deck.indexOf(u), 'went to the bottom')
        .toBeGreaterThan(f.ps.deck.length - 6);
    }
  });

  it('43 Mount Matutun mills, and pays when the branch was a Unit', async () => {
    const f = fresh(8, 43);
    const unitIndex = ids.findIndex((k) => ALL_CARDS[k]!.type === 'Unit') + 1;
    const u = f.add(unitIndex, 'deck');
    f.ps.deck.splice(f.ps.deck.indexOf(u), 1);
    f.ps.deck.unshift(u);
    const grave = f.ps.grave.length;
    const before = currentPower(index, f.game, f.hero);
    await f.event('startOfMain');
    expect(f.ps.grave.length, 'a branch came down').toBe(grave + 1);
    expect(currentPower(index, f.game, f.hero), 'and it was worth Power')
      .toBe(before + 5000);
  });

  it('shows the Matutun mill before asking which Unit gets the Power', async () => {
    const order: string[] = [];
    const f = fresh(8, 43, { chooseTarget: async (_p, _prompt, cards) => { order.push('target'); return cards[0] ?? null; } });
    const u = f.add(8, 'deck'); f.ps.deck.splice(f.ps.deck.indexOf(u), 1); f.ps.deck.unshift(u);
    const context = f.ctx(f.active);
    context.present = async () => {
      expect(f.ps.grave).toContain(u);
      expect(f.game.pendingFx).toContainEqual({kind:'emit',uid:u,from:'deck',to:'grave',owner:0,faceUp:true});
      order.push('movement');
    };
    await skill(43).run(context);
    expect(order).toEqual(['movement', 'target']);
  });

  it('44 Mount Bita scales with what you Offered this turn', async () => {
    const f = fresh(8, 44);
    const base = currentPower(index, f.game, f.hero);
    f.ps.unitsOfferedThisTurn = 3;
    await f.event('personaAttack');
    expect(currentPower(index, f.game, f.hero)).toBe(base + 9000);

    const g = fresh(8, 44);
    const flat = currentPower(index, g.game, g.hero);
    g.ps.unitsOfferedThisTurn = 0;
    await g.event('personaAttack');
    expect(currentPower(index, g.game, g.hero), 'nothing Offered, nothing owed')
      .toBe(flat);
  });

  it('50 Restored Magindanao answers a check that found nothing', async () => {
    const f = fresh(8, 50);
    const plain = ids.findIndex((k) => ALL_CARDS[k]!.type === 'Action') + 1;
    const revealed = f.add(plain, 'check');
    const before = f.ps.allies.filter(Boolean).length;
    await f.ctrl.fireTrigger('barrierBroken', 0, { name: 'barrierBroken', revealed });
    expect(f.ps.allies.filter(Boolean).length, 'a body from the deck')
      .toBe(before + 1);
    expect(window(50), 'it arrives when the Persona is attacked')
      .toBe('personaAttacked');
  });

  it('50 Restored Magindanao stays out of the way of a Force', async () => {
    const f = fresh(8, 50);
    const forceIndex = ids.findIndex((k) => ALL_CARDS[k]!.type === 'Force') + 1;
    const revealed = f.add(forceIndex, 'check');
    const before = f.ps.allies.filter(Boolean).length;
    await f.ctrl.fireTrigger('barrierBroken', 0, { name: 'barrierBroken', revealed });
    expect(f.ps.allies.filter(Boolean).length, 'a Force already did the work')
      .toBe(before);
  });

  it('49 the Last Refuge grows with every Barrier already gone', async () => {
    const f = fresh(8, 49);
    const base = currentPower(index, f.game, f.hero);
    f.ps.barriers = f.ps.barriers.slice(0, 2);   // three gone
    await f.event('barrierBroken');
    expect(currentPower(index, f.game, f.hero)).toBe(base + 3000);
  });

  it('49 the Last Refuge only arrives on their turn', () => {
    const f = fresh(8, 49);
    f.game.turnPlayer = 0;
    expect(gate(49)!(f.ctx()), 'not on your own turn').toBe(false);
    f.game.turnPlayer = 1;
    expect(gate(49)!(f.ctx()), 'on theirs').toBe(true);
  });

  it('45 Mount Kabalalan turns one Offer into a second body', async () => {
    const f = fresh(8, 45);
    const before = f.ps.allies.filter(Boolean).length;
    const victim = f.add(26, 'ally');
    await f.ctrl.fireTrigger('unitOffered', 0, { name: 'unitOffered', unit: victim });
    expect(f.ps.allies.filter(Boolean).length, 'the marsh gives one back')
      .toBeGreaterThanOrEqual(before);
  });

  it('45 Mount Kabalalan is Revolution: 2 Barriers or fewer', () => {
    const f = fresh(8, 45);
    expect(gate(45)!(f.ctx()), 'not while healthy').toBe(false);
    f.ps.barriers = f.ps.barriers.slice(0, 2);
    expect(gate(45)!(f.ctx()), 'eligible at 2').toBe(true);
  });

  it('48 Illana Bay preserves the ordinary Garahana Grave threshold', async () => {
    const f = fresh(8, 48);
    // Four Maguindanaon Units in the Grave: one short of Garahana.
    for (let i = 0; i < 4; i++) f.add(26, 'grave');
    reevaluateState(index, f.game, 0);
    expect(f.ps.releasedState, 'four is not five').not.toBe('Garahana');
    // The fifth physical Maguindanaon card releases Garahana.
    const victim = f.add(26, 'ally');
    await f.offered(victim);
    reevaluateState(index, f.game, 0);
    expect(maguindanaoGraveCountRaw(index, f.game, 0),
      'Offer bonuses do not change Grave value').toBe(5);
    expect(f.ps.releasedState).toBe('Garahana');
  });

  it('48 Illana Bay weighs nothing when it is not the active Codex', async () => {
    const f = fresh(8, 49);                       // a different Codex
    const victim = f.add(26, 'ally');
    await f.offered(victim);
    expect(maguindanaoGraveCountRaw(index, f.game, 0),
      'one Offered Unit is worth one').toBe(1);
  });

  it('51 Cape Timbalangan draws two and gives one back', async () => {
    const f = fresh(8, 51);
    const hand = f.ps.hand.length;
    await f.event('codexPlayed');
    expect(f.ps.hand, 'two in, one out').toHaveLength(hand + 1);
  });

  it('47 Lake Lanao answers your own State releasing', async () => {
    const f = fresh(8, 47);
    const ally = f.add(26, 'ally');
    const base = currentPower(index, f.game, ally);
    await f.event('stateReleased');
    expect(currentPower(index, f.game, ally)).toBe(base + 1000);
  });

  it('47 Lake Lanao is announced when Garahana actually releases', async () => {
    const f = fresh(8, 47);
    f.garahana();
    await f.ctrl.flushStateReleases();
    expect(f.ps.releasedState).toBe('Garahana');
  });

  it('the comeback four wait until you are behind', () => {
    const f = fresh(8, 48);
    // Both seats open level: one Persona each, no Allies.
    expect(gate(48)!(f.ctx()), 'Units').toBe(false);
    expect(gate(51)!(f.ctx()), 'hand').toBe(false);
    expect(gate(47)!(f.ctx()), 'Barriers').toBe(false);
    expect(gate(45)!(f.ctx()), 'low Barriers').toBe(false);
  });

  it('all ten declare a window, and enough different ones to choose between', () => {
    const moments = new Set<string>();
    let conditioned = 0;
    for (let n = 42; n <= 51; n++) {
      const on = window(n);
      expect(on, `${id(n)} has no auto-switch window`).toBeTruthy();
      moments.add(String(on));
      if (gate(n)) conditioned++;
    }
    expect(moments.size, 'several genuinely different moments')
      .toBeGreaterThanOrEqual(5);
    expect(conditioned, 'and the rest separated by a board condition')
      .toBeGreaterThanOrEqual(4);
  });

  it('every Codex prints its window, its State and its skill', () => {
    for (let n = 42; n <= 51; n++) {
      const lines = ALL_CARDS[id(n)]!.text.split('\n');
      expect(lines.length, `${id(n)} should print three lines`).toBeGreaterThanOrEqual(3);
      expect(lines[0], id(n)).toContain('Auto-switch');
      expect(lines[1], id(n)).toContain('Garahana');
      expect(lines[2]!.length, id(n)).toBeGreaterThan(20);
    }
  });
});


it('all Apu copies waiting on the first Offer remain eligible when the first recall lowers Garahana', async () => {
  const f = fresh();
  const apu1 = f.add(17), apu2 = f.add(17);
  for (let i = 0; i < 2; i++) f.add(26);
  const victim = f.add(18, 'ally');
  await f.offered(victim); // Five in Grave, then four after the first recall.
  expect(f.game.cards[apu1]!.zone).toBe('ally');
  expect(f.game.cards[apu2]!.zone).toBe('ally');
});
