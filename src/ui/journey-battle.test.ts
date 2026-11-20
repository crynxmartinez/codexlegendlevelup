import { describe, it, expect, vi } from 'vitest';
import { FULL_INDEX as index } from '../data/loader.js';
import { GameController, type PlayerAction } from '../core/game.js';
import { autoChooser, type Chooser, type AbilityOption } from '../core/effects.js';
import { currentPower, def, inst, moveCard, you } from '../core/state.js';
import { createGame } from '../core/setup.js';
import { TUTORIAL_LESSON_CARDS } from '../core/tutorial-decks.js';
import luzon from '../../decks/agta-set-1.json' with { type: 'json' };
import visayas from '../../decks/babaylan-set-1.json' with { type: 'json' };
import mindanao from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { createJourneyFixture, JourneySession, journeyOpponent, journeyHuman, playJourneyOpponent, JOURNEY_DECKS } from './journey-battle.js';
import type { JourneyRegion } from './journey-progress.js';

function setup(chapter: 3 | 4, encounter: number, region: JourneyRegion = 'luzon', overrides: Partial<Chooser> = {}) {
  const fixture = createJourneyFixture(index, chapter, encounter, region), { game, refs, profile } = fixture;
  const session = new JourneySession(fixture);
  const battlePowers: number[] = [];
  const attackTotals: number[] = [];
  const chooser: Chooser = { ...autoChooser,
    chooseAbility: async (_p, _prompt, opts) => {
      const wanted = new Set([refs.force, refs.sentry, ...fixture.allowedAbilities]);
      const pick = opts.findIndex(o => wanted.has(o.uid));
      return pick < 0 ? null : pick;
    },
    personifyPrompt: async (_p, pool) => pool.find(u => u === refs.nextPersona) ?? null,
    chooseTarget: async (_p, _prompt, pool) => pool.find(u => u === you(game, 0).persona) ?? pool[0] ?? null,
    confirm: async () => false,
    blockPrompt: async () => [],
    ...overrides,
  };
  const ctrl = new GameController(game, profile.index, {
    scripts: profile.scripts,
    choosers: [journeyHuman(chooser, game, profile.index, refs.nextPersona, fixture.allowedAbilities), journeyOpponent(fixture)],
    hooks: { onBlockersDeclared: async battle => { battlePowers.push(currentPower(profile.index, game, you(game, 0).persona!)); attackTotals.push(battle.attackPower); } },
  });
  const act = async (a: PlayerAction) => {
    expect(session.allows(a), `${session.goal.title}: ${a.kind}`).toBe(true);
    expect(ctrl.legalActions(0), `Engine legality: ${session.goal.title}`).toContainEqual(a);
    await ctrl.perform(a, 0); session.settle();
  };
  const cycle = async () => { await ctrl.beginTurn(); await playJourneyOpponent(ctrl, fixture); session.settle(); if (!session.completed) { await ctrl.beginTurn(); session.settle(); } };
  const finished = () => expect(session.completed, `${session.goal.title}\n${game.log.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join('\n')}`).toBe(true);
  const inspect = (uid: string) => session.inspect(inst(game, uid).defId);
  return { fixture, game, refs, session, ctrl, act, cycle, finished, inspect, battlePowers, attackTotals };
}

describe('simplified journey encounters use actual outcomes', () => {
  it('does not finish from Continue, unrelated observations or a different inspection', () => {
    const { session } = setup(4, 0);
    for (let i = 0; i < 30; i++) session.continue();
    session.observe({ kind: 'action', action: { kind: 'endTurn' } });
    session.inspect('unrelated'); expect(session.stepIndex).toBe(0); expect(session.completed).toBe(false);
  });
  it.each(['luzon','visayas','mindanao'] as const)('requires %s support, then teaches exhaustion and actual bonus expiration', async region => {
    const f = setup(3, 0, region), i = f.fixture.profile.index;
    expect(inst(f.game,f.refs.supporter!).defId).toBe(TUTORIAL_LESSON_CARDS[region].l1Support);
    f.inspect(f.refs.supporter!);
    expect(f.session.allows({ kind:'attack', attacker:f.refs.persona!, target:null, supporters:[] })).toBe(false);
    await f.act({ kind:'attack', attacker:f.refs.persona!, target:null, supporters:[f.refs.supporter!] });
    expect(inst(f.game, f.refs.supporter!).exhausted).toBe(true);
    expect(f.session.stepIndex).toBe(1);
    const attackerPower = def(i, f.game, f.refs.persona!).power + 5000;
    const supporterPower = def(i, f.game, f.refs.supporter!).power + 3000;
    expect(f.attackTotals).toEqual([attackerPower + supporterPower]);
    expect(currentPower(i, f.game, f.refs.supporter!)).toBe(def(i, f.game, f.refs.supporter!).power);
    f.inspect(f.refs.supporter!); f.finished();
  });
  it.each(['luzon','visayas','mindanao'] as const)('teaches the unchanged %s Force check and hand effect in separate turns', async region => {
    const f = setup(3, 1, region);
    await f.act({ kind:'attack', attacker:f.refs.persona!, target:null, supporters:[] });
    expect(f.session.stepIndex, JSON.stringify(f.session.events)).toBe(1);
    expect(f.session.events.some(e => e.type === 'forceResolved' && e.sourceUids.includes(f.refs.check!))).toBe(true);
    await f.act({ kind:'endTurn' }); await f.cycle();
    expect(inst(f.game, f.refs.force!).zone).toBe('grave'); f.finished();
  });
  it.each(['luzon','visayas','mindanao'] as const)('teaches the unchanged %s Sentry and its real regional result', async region => {
    const f = setup(3, 2, region), barriers = you(f.game, 0).barriers.length;
    f.inspect(f.refs.sentry!);
    await f.act({ kind:'endTurn' }); await f.cycle();
    expect(inst(f.game, f.refs.sentry!).zone).toBe('exile');
    expect(you(f.game, 0).barriers).toHaveLength(barriers);
    if(region==='luzon') expect(you(f.game,0).allies).toContain(f.refs.incoming);
    if(region==='visayas') expect(you(f.game,0).heart).toHaveLength(1);
    if(region==='mindanao') { expect(you(f.game,0).heart).toHaveLength(0); expect(you(f.game,0).allies.every(uid=>uid===null)).toBe(true); }
    expect(f.session.stepIndex).toBe(2);
    f.inspect(region==='luzon'?f.refs.incoming!:f.refs.persona!); f.finished();
  });
  it.each(['luzon','visayas','mindanao'] as const)('keeps production %s decks unchanged with five Codex', region => {
    const deck = {luzon,visayas,mindanao}[region];
    const game = createGame(index, [deck, luzon], { seed:42, firstPlayer:0 });
    expect(deck.codex).toHaveLength(5);
    for (const p of game.players) { expect(p.barriers).toHaveLength(5); expect(p.hand).toHaveLength(5); expect(p.forceCheckBias).toBe(0); }
    expect(game.rulesProfile).toBeUndefined();
  });
  it.each(['luzon','visayas','mindanao'] as const)('uses two tutorial Codex for both players in %s lessons', region => {
    for (const chapter of [3,4] as const) for (let encounter=0;encounter<(chapter===3?4:5);encounter++) {
      const { game, profile } = createJourneyFixture(index, chapter, encounter, region);
      expect(game.rulesProfile).toBe('tutorial-v1');
      for (const p of game.players) {
        expect(p.codex).toHaveLength(2); expect(p.barriers).toHaveLength(5);
        expect(p.codex.map(u => def(profile.index, game, u).tutorial?.role)).toEqual(['codex-attack', 'codex-barrier']);
      }
      const counts = new Map<string,number>();
      for(const card of Object.values(game.cards).filter(c=>c.owner===0&&c.zone!=='codex')) counts.set(card.defId,(counts.get(card.defId)??0)+1);
      expect(Object.fromEntries(counts)).toEqual(Object.fromEntries(JOURNEY_DECKS[region].main.map(c=>[c.id,c.copies])));
    }
  });
  it.each(['luzon','visayas','mindanao'] as const)('teaches real Personification in %s without State objectives', async region => {
    const f = setup(4, 0, region);
    f.inspect(f.refs.original!); expect(f.session.stepIndex).toBe(1);
    await f.act({ kind:'endPhase' }); await f.act({ kind:'endTurn' }); await f.cycle();
    expect(f.session.stepIndex).toBe(2);
    expect(you(f.game, 0).persona).toBe(f.refs.nextPersona);
    expect(inst(f.game, f.refs.original!).zone).toBe('heart');
    f.inspect(f.refs.nextPersona!); f.finished();
  });
  it.each(['luzon','visayas','mindanao'] as const)('demonstrates +0 then a real break giving +1,000 in %s', async region => {
    const f = setup(4, 1, region), i = f.fixture.profile.index;
    const base = def(i, f.game, f.refs.persona!).power;
    await f.act({ kind:'switchCodex', uid:f.refs.codex! });
    expect(f.session.stepIndex).toBe(1);
    expect(currentPower(i, f.game, f.refs.persona!)).toBe(base);
    await f.act({ kind:'endPhase' }); await f.act({ kind:'endTurn' }); await f.cycle();
    expect(f.session.stepIndex).toBe(2);
    expect(you(f.game, 0).barriers).toHaveLength(4);
    expect(currentPower(i, f.game, f.refs.persona!)).toBe(base + 1000);
    f.inspect(f.refs.persona!); f.finished();
  });
  it.each(['luzon','visayas','mindanao'] as const)('demonstrates the attack-only +5,000 and its expiration in %s', async region => {
    const f = setup(4, 2, region), i = f.fixture.profile.index;
    const base = def(i, f.game, f.refs.persona!).power;
    await f.act({ kind:'switchCodex', uid:f.refs.codex! }); expect(f.session.stepIndex).toBe(1);
    expect(currentPower(i, f.game, f.refs.persona!)).toBe(base);
    await f.act({ kind:'endPhase' }); await f.act({ kind:'attack', attacker:f.refs.persona!, target:null, supporters:[] });
    expect(f.battlePowers).toEqual([base + 5000]);
    expect(currentPower(i, f.game, f.refs.persona!)).toBe(base);
    expect(f.session.stepIndex).toBe(2);
    f.inspect(f.refs.persona!); f.finished();
  });
  it('keeps the lesson paused while a response chain is unfinished', () => {
    const f = setup(4, 0);
    f.game.responseChain = { id:'pending', revision:1, phase:'building', responseOwner:1, links:[], cursor:-1 };
    f.inspect(f.refs.original!); expect(f.session.stepIndex).toBe(0);
    f.game.responseChain = null; f.session.settle(); expect(f.session.stepIndex).toBe(1);
  });
  it.each(['luzon','visayas','mindanao'] as const)('teaches %s Action destinations using the unchanged card controller', async region => {
    const f=setup(3,3,region), me=you(f.game,0);
    const top=me.deck.slice(0,3);
    await f.act({kind:'playAction',uid:f.refs.action!});
    expect(f.session.stepIndex).toBe(1);
    expect(inst(f.game,f.refs.action!).zone).toBe('grave');
    if(region==='visayas') {
      expect(me.heart).toHaveLength(1);
      expect(top).toContain(me.heart[0]);
      expect(me.deck.slice(-2)).toEqual(top.filter(u=>u!==me.heart[0]));
      f.inspect(me.heart[0]!);
    } else {
      const recovered=[f.refs.recover,f.refs.bottom].find(u=>u&&inst(f.game,u).zone==='hand')!;
      if(region==='mindanao') expect(me.deck.at(-1)).toBe([f.refs.recover,f.refs.bottom].find(u=>u!==recovered));
      f.inspect(recovered);
    }
    f.finished();
  });
  it.each(['visayas','mindanao'] as const)('does not strand a learner who declines the %s Action optional selection',async region=>{
    const f=setup(3,3,region,{chooseCards:async()=>[],chooseTarget:async()=>null});
    await f.act({kind:'playAction',uid:f.refs.action!});
    if(inst(f.game,f.refs.action!).zone==='hand') {
      // A cancelled pre-commit draft remains playable and the objective stays open.
      expect(f.session.stepIndex).toBe(0);
      expect(f.ctrl.legalActions(0)).toContainEqual({kind:'playAction',uid:f.refs.action});
    } else {
      expect(f.session.stepIndex).toBe(1); f.inspect(f.refs.action!); f.finished();
    }
  });
  it.each(['luzon','visayas','mindanao'] as const)('can retry the %s Sentry lesson after declining the first response',async region=>{
    let use=false;
    const f=setup(3,2,region,{chooseAbility:async(_p,_prompt,options)=>use?options.findIndex(o=>o.uid===f.refs.sentry):null});
    f.inspect(f.refs.sentry!);await f.act({kind:'endTurn'});await f.cycle();
    expect(f.session.stepIndex).toBe(1);expect(you(f.game,0).barriers).toHaveLength(4);
    use=true;
    await f.act({kind:'endPhase'});await f.act({kind:'endTurn'});await f.cycle();
    expect(you(f.game,0).barriers).toHaveLength(4);expect(f.session.stepIndex).toBe(2);
    f.inspect(region==='luzon'?you(f.game,0).allies.find((uid):uid is string=>!!uid)??f.refs.persona!:f.refs.persona!);f.finished();
  });
  it.each(['luzon','visayas'] as const)('teaches the retained %s attack skill, cost and end-turn expiry', async region => {
    const f=setup(4,3,region), me=you(f.game,0), i=f.fixture.profile.index;
    f.inspect(f.refs.persona!);
    await f.act({kind:'endPhase'});
    await f.act({kind:'attack',attacker:f.refs.persona!,target:null,supporters:[]});
    expect(f.session.stepIndex).toBe(2);
    expect(currentPower(i,f.game,f.refs.persona!)).toBe(14000);
    if(region==='visayas') expect(me.heart).toContain(f.refs.sanib);
    f.inspect(f.refs.persona!);
    await f.act({kind:'endTurn'});await f.cycle();
    expect(currentPower(i,f.game,f.refs.persona!)).toBe(11000);f.finished();
  });
  it.each(['luzon','visayas'] as const)('accepts declining the %s ordinary attack skill without a lesson dead end', async region => {
    const f=setup(4,3,region,{chooseAbility:async()=>null});
    f.inspect(f.refs.persona!);await f.act({kind:'endPhase'});
    await f.act({kind:'attack',attacker:f.refs.persona!,target:null,supporters:[]});
    expect(currentPower(f.fixture.profile.index,f.game,f.refs.persona!)).toBe(11000);
    f.inspect(f.refs.persona!);await f.act({kind:'endTurn'});await f.cycle();f.finished();
    if(region==='visayas') expect(inst(f.game,f.refs.sanib!).zone).toBe('hand');
  });
  it('teaches Indarapatra search and charged placement without an Offer cost', async()=>{
    const f=setup(4,3,'mindanao'), me=you(f.game,0);
    f.inspect(f.refs.persona!);
    await f.act({kind:'ability',uid:f.refs.persona!,abilityIndex:0});
    expect(f.session.stepIndex).toBe(2);
    const called=me.allies.find(Boolean)!;
    expect(def(f.fixture.profile.index,f.game,called).level).toBeLessThanOrEqual(2);
    expect(inst(f.game,called).exhausted).toBe(false);
    expect(me.grave).toHaveLength(0);expect(me.normalPlaysUsed).toBe(0);
    f.inspect(f.refs.persona!);f.finished();
  });
  it('teaches Kalimangalnuk Sipol placement and actual copied Power', async()=>{
    const f=setup(4,4,'luzon'), i=f.fixture.profile.index;
    f.inspect(f.refs.persona!);await f.act({kind:'ability',uid:f.refs.persona!,abilityIndex:0});
    expect(you(f.game,0).allies).toContain(f.refs.incoming);
    expect(currentPower(i,f.game,f.refs.persona!)).toBe(11000+currentPower(i,f.game,f.refs.incoming!));
    f.inspect(f.refs.persona!);f.finished();
  });
  it('teaches Amara condition honestly: ordinary Personify is not Sanib and does not call an Ally', async()=>{
    const f=setup(4,4,'visayas');
    f.inspect(f.refs.original!);await f.act({kind:'endPhase'});await f.act({kind:'endTurn'});await f.cycle();
    expect(f.session.stepIndex).toBe(2);expect(inst(f.game,f.refs.original!).zone).toBe('heart');
    expect(you(f.game,0).allies.every(u=>u===null)).toBe(true);
    expect(f.session.events.some(e=>e.type==='abilityResolved'&&e.sourceUids.includes(f.refs.original!))).toBe(false);
    f.inspect(f.refs.original!);f.finished();
  });
  it.each([5,2])('teaches Pah Offer 2 with %i Barriers using the real conditional bonus', async barriers=>{
    const f=setup(4,4,'mindanao'), me=you(f.game,0), i=f.fixture.profile.index;
    // Exercise the same skill's low-Barrier branch; the live prepared lesson starts at five.
    while(me.barriers.length>barriers)moveCard(f.game,me.barriers[0]!,'hand');
    f.inspect(f.refs.persona!);await f.act({kind:'ability',uid:f.refs.persona!,abilityIndex:0});
    expect(inst(f.game,f.refs.offer1!).zone).toBe('grave');expect(inst(f.game,f.refs.offer2!).zone).toBe('grave');
    expect(currentPower(i,f.game,f.refs.persona!)).toBe(11000+(barriers<=2?10000:5000));
    f.inspect(f.refs.persona!);f.finished();
    await f.ctrl.perform({kind:'endPhase'},0);await f.ctrl.perform({kind:'endTurn'},0);
    expect(currentPower(i,f.game,f.refs.persona!)).toBe(11000);
  });
  it.each([[3,'mindanao'],[4,'luzon'],[4,'mindanao']] as const)('lets a learner skip encounter %i %s optional activated skills without paying',async(encounter,region)=>{
    const f=setup(4,encounter,region);
    f.inspect(f.refs.persona!);await f.act({kind:'endPhase'});f.inspect(f.refs.persona!);f.finished();
    expect(f.session.events.some(e=>e.type==='abilityActivated'&&e.sourceUids.includes(f.refs.persona!))).toBe(false);
    if(region==='mindanao'&&encounter===4) {
      expect(inst(f.game,f.refs.offer1!).zone).toBe('ally');expect(inst(f.game,f.refs.offer2!).zone).toBe('ally');
    }
  });
  it('cancels Pah Offer cost without moving Allies, spending the skill or blocking the skip path',async()=>{
    const f=setup(4,4,'mindanao',{chooseCards:async()=>[]});
    f.inspect(f.refs.persona!);await f.act({kind:'ability',uid:f.refs.persona!,abilityIndex:0});
    expect(f.session.stepIndex).toBe(1);
    expect(inst(f.game,f.refs.offer1!).zone).toBe('ally');expect(inst(f.game,f.refs.offer2!).zone).toBe('ally');
    expect(f.session.events.some(e=>e.type==='abilityActivated'&&e.sourceUids.includes(f.refs.persona!))).toBe(false);
    await f.act({kind:'endPhase'});f.inspect(f.refs.persona!);f.finished();
  });
});

describe('prepared-lesson human choices', () => {
  it('declines unsolicited Personification and Codex switches without opening player prompts', async () => {
    const {game,profile,refs} = createJourneyFixture(index, 4, 1, 'luzon');
    const personifyPrompt = vi.fn<Chooser['personifyPrompt']>(async (_p, pool) => pool[0] ?? null);
    const chooseTarget = vi.fn<Chooser['chooseTarget']>(async (_p, _label, pool) => pool[0] ?? null);
    const human = journeyHuman({...autoChooser,personifyPrompt,chooseTarget},game,profile.index);
    const level3 = Object.values(game.cards).find(card => card.owner === 0 && def(profile.index,game,card.uid).level === 3 && card.uid !== refs.persona)!.uid;
    expect(await human.personifyPrompt(0,[level3])).toBeNull();
    expect(personifyPrompt).not.toHaveBeenCalled();
    const before = you(game,0).activeCodex;
    expect(await human.chooseTarget(0,'Switch Codex?',you(game,0).codex)).toBeNull();
    expect(chooseTarget).not.toHaveBeenCalled();
    expect(you(game,0).activeCodex).toBe(before);
    // A real effect choosing a Unit must still reach the player's chooser.
    expect(await human.chooseTarget(0,'Choose the Unit to gain Power',[refs.persona!])).toBe(refs.persona);
    expect(chooseTarget).toHaveBeenCalledWith(0,'Choose the Unit to gain Power',[refs.persona!]);
  });

  it('offers only the intended Persona in its dedicated lesson and keeps decline available', async () => {
    const {game,profile,refs} = createJourneyFixture(index,4,0,'visayas');
    const personifyPrompt = vi.fn<Chooser['personifyPrompt']>(async (_p,pool) => pool[0] ?? null);
    const human = journeyHuman({...autoChooser,personifyPrompt},game,profile.index,refs.nextPersona);
    const other = Object.values(game.cards).find(card => card.owner === 0 && def(profile.index,game,card.uid).level === 3 && card.uid !== refs.nextPersona)!.uid;
    expect(await human.personifyPrompt(0,[other])).toBeNull();
    expect(personifyPrompt).not.toHaveBeenCalled();
    expect(await human.personifyPrompt(0,[other,refs.nextPersona!])).toBe(refs.nextPersona);
    expect(personifyPrompt).toHaveBeenLastCalledWith(0,[refs.nextPersona]);
    personifyPrompt.mockResolvedValueOnce(null);
    expect(await human.personifyPrompt(0,[refs.nextPersona!])).toBeNull();
  });

  it('preserves Force and Sentry windows and maps filtered skill choices back to the engine', async () => {
    const {game,profile,refs} = createJourneyFixture(index,3,1,'luzon');
    const sentry = Object.values(game.cards).find(card => card.owner === 0 && def(profile.index,game,card.uid).type === 'Sentry')!.uid;
    const options: AbilityOption[] = [refs.persona!,refs.force!,sentry].map(uid => ({uid,cardName:def(profile.index,game,uid).name,text:'Existing card skill'}));
    const context = {kind:'response',allowDecline:true,chainId:'lesson-chain'} as const;
    const chooseAbility = vi.fn<Chooser['chooseAbility']>(async () => 1);
    const battleCards = vi.fn<Chooser['battleCards']>(async () => [refs.force!,sentry]);
    const human = journeyHuman({...autoChooser,chooseAbility,battleCards},game,profile.index);
    expect(await human.chooseAbility(0,'Choose a response',options,context)).toBe(2);
    expect(chooseAbility).toHaveBeenLastCalledWith(0,'Choose a response',[options[1],options[2]],context);
    chooseAbility.mockResolvedValueOnce(0);
    expect(await human.chooseAbility(0,'Choose a response',options,context)).toBe(1);
    chooseAbility.mockClear();
    expect(await human.chooseAbility(0,'Unrelated Persona skill',[options[0]!],context)).toBeNull();
    expect(chooseAbility).not.toHaveBeenCalled();
    const info = {role:'defender',attackPower:16000,defensePower:11000,targetName:'Your Persona'} as const;
    expect(await human.battleCards(0,info,[refs.force!],[sentry])).toEqual([refs.force,sentry]);
    expect(battleCards).toHaveBeenCalledWith(0,info,[refs.force!],[sentry]);
  });
});
