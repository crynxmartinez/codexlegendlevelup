import { afterEach, describe, it, expect, vi } from 'vitest';
import { FirstBattleSession, readFirstBattleProgress, resetFirstBattleProgress, type FirstBattleMode } from './first-battle-session.js';
import { createFirstBattle, firstBattleChooser, firstBattleMoves, prepareFirstBattle } from './first-battle.js';
import { FULL_INDEX } from '../data/loader.js';
import type { TutorialRegion } from '../core/tutorial-decks.js';
import { GameController, type PlayerAction } from '../core/game.js';

const regions: TutorialRegion[] = ['luzon', 'visayas', 'mindanao'];
const scenarios: { name: string; region: TutorialRegion; mode: FirstBattleMode }[] = [
  ...regions.map(region => ({ name: region, region, mode: 'tutorial' as const })),
  { name: 'Lvl Up 3.0', region: 'luzon', mode: 'lvl-up-3' },
];

describe('First Battle guidance', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(scenarios)('$name completes the teaching sequence from actual controller events', async ({ region, mode }) => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
    if (mode === 'lvl-up-3') vi.stubGlobal('localStorage', storage);
    const { game, cards, profile } = createFirstBattle(FULL_INDEX, region);
    const session = new FirstBattleSession(cards, 0, region, { mode });
    const human = firstBattleChooser(game, cards, 0);
    const ctrl = new GameController(game, profile.index, {
      scripts: profile.scripts,
      choosers: [{ ...human, blockPrompt: async (...args) => {
        const picked = await human.blockPrompt(...args);
        if (session.step.id === 'defend') {
          expect(picked).toEqual([cards.blocker]);
          session.observe({ kind: 'cue', cue: 'defended' });
        } else expect(session.step.id).toBe('taking-hit');
        return picked;
      } }, firstBattleChooser(game, cards, 1)],
      hooks: {
        onPhaseChange: async (phase, player) => { session.observe({ kind: 'phase', phase, player }); },
        onAttackDeclared: async battle => {
          session.observe({ kind: 'attackDeclared', defender: battle.defender });
          if (['attacked', 'take-hit'].includes(session.step.id)) session.continue();
        },
        onBlockersDeclared: async () => {
          if (session.step.id === 'attack') {
            session.observe({ kind: 'cue', cue: 'blockers' });
            expect(session.step.id).toBe('their-defense');
            session.continue();
          }
        },
        onBeforeAttackCheck: async () => { if (session.step.id === 'before-check') session.continue(); },
        onCheckResolved: async (_uid, isForce, checkKind, owner) => {
          session.observe({ kind: 'checkResolved', isForce, checkKind, owner });
          if (session.step.id === 'checked') session.continue();
        },
        onAttackResolved: async battle => { session.observe({ kind: 'attackResolved', defender: battle.defender }); },
      },
    });
    const perform = async (action: PlayerAction) => {
      expect(session.allows(action)).toBe(true);
      expect(ctrl.legalActions(0)).toContainEqual(action);
      await ctrl.perform(action, 0);
      session.observe({ kind: 'action', action });
    };
    const moves = firstBattleMoves(cards);
    session.continue();
    if (!session.isLvlUpDemo) { session.continue(); session.continue(); }
    expect(session.step.id).toBe('deal');
    session.observe({ kind: 'cue', cue: 'dealt' });
    if (session.step.id === 'inspect') session.observe({ kind: 'cue', cue: 'inspected' });
    await perform(moves.call);
    if (session.step.id === 'codex') session.continue();
    await perform({ kind: 'endPhase' });
    await perform(moves.persona);
    expect(session.step.id).toBe('ally-attack');
    await perform(moves.ally);
    await perform({ kind: 'endTurn' });
    session.continue();
    await ctrl.beginTurn();
    for (const action of [moves.foeCall, { kind: 'endPhase' }, moves.foePersona, moves.foeAlly] as PlayerAction[]) await ctrl.perform(action, 1);
    session.observe({ kind: 'cue', cue: 'opponent-finished' });
    expect(session.step.id).toBe('next-turn');
    await ctrl.perform({ kind: 'endTurn' }, 1);
    await ctrl.beginTurn();
    expect(session.step.id).toBe(session.isLvlUpDemo ? 'last-battle' : 'new-turn');
    if (session.step.id === 'new-turn') session.continue();
    await perform({ kind: 'endPhase' });
    await perform(moves.persona);
    await perform(moves.ally);
    expect(game.winner).toBe(0);
    expect(session.step.id).toBe('victory');
    expect(session.completed).toBe(false);
    session.continue();
    expect(session.completed).toBe(true);
    if (session.isLvlUpDemo) {
      // Every transition, including inherited lesson completion, is ephemeral.
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    }
  });

  it('shortens the visitor path without changing the retained legal actions or engine cues', () => {
    const { cards } = createFirstBattle(FULL_INDEX);
    const standard = new FirstBattleSession(cards);
    const demo = new FirstBattleSession(cards, 2, 'luzon', { mode: 'lvl-up-3' });
    expect(demo.mode).toBe('lvl-up-3');
    expect(demo.isLvlUpDemo).toBe(true);
    expect(demo.startChapter).toBe(0);
    expect(demo.step.id).toBe('welcome');
    const ids = (s: FirstBattleSession) => s.lesson.steps.map((_step, index) => { s.stepIndex = index; return s.step.id; });
    const removed = ['persona', 'goal', 'inspect', 'codex', 'before-check', 'checked', 'new-turn'];
    expect(ids(demo)).toEqual(ids(standard).filter(id => !removed.includes(id)));
    const text = demo.lesson.steps.map(step => `${step.body} ${step.why ?? ''}`).join(' ');
    expect(text).toContain('two Barriers');
    expect(text).toContain('normal match starts with five');
    expect(text).toContain('simplified effects');
    expect(text).toContain('1 Play');
    expect(text).toContain(cards.personaName);
    expect(text).toContain(cards.allyName);
    for (let index = 0; index < demo.lesson.steps.length; index++) {
      demo.stepIndex = index;
      standard.stepIndex = ids(standard).indexOf(demo.step.id);
      expect(demo.step.expected).toEqual(standard.step.expected);
      expect(demo.step.action).toEqual(standard.step.action);
      expect(demo.step.hidden).toBe(standard.step.hidden);
    }
  });

  it('leaves existing progress intact and rejects a mismatched visitor deck', async () => {
    const values = new Map([
      ['codex-legends.first-battle.v1', JSON.stringify({ version: 3, region: 'mindanao', chapter: 1, completed: true })],
      ['codex-legends.tutorial-progress.v1', JSON.stringify(['first-battle', 'defense'])],
      ['codex-legends.tutorial-journey.v1', 'existing journey'],
    ]);
    const before = [...values];
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    };
    vi.stubGlobal('localStorage', storage);
    const cards = createFirstBattle(FULL_INDEX).cards;
    const demo = new FirstBattleSession(cards, 1, 'luzon', { mode: 'lvl-up-3' });
    const dealt = demo.waitFor('deal');
    demo.continue();
    await dealt;
    expect(demo.step.id).toBe('deal');
    demo.stepIndex = demo.lesson.steps.length - 1;
    const finished = demo.waitFor('completed');
    demo.continue();
    await finished;
    expect(demo.completed).toBe(true);
    expect(new FirstBattleSession(cards, 2, 'luzon', { mode: 'lvl-up-3' }).step.id).toBe('welcome');
    expect([...values]).toEqual(before);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    for (const region of ['visayas', 'mindanao'] as const) {
      expect(() => new FirstBattleSession(createFirstBattle(FULL_INDEX, region).cards, 0, region, { mode: 'lvl-up-3' }))
        .toThrow('prepared Luzon deck');
    }
  });

  it('restricts the exact card, slot, attacker, target and supporters', () => {
    const { cards } = createFirstBattle(FULL_INDEX);
    const s = new FirstBattleSession(cards);
    const m = firstBattleMoves(cards);
    s.stepIndex = s.lesson.steps.findIndex(x => x.title === 'Call your Ally');
    expect(s.allows(m.call)).toBe(true);
    expect(s.allows({ ...m.call, slot: 1 })).toBe(false);
    expect(s.allows({ ...m.call, uid: cards.blocker })).toBe(false);
    s.observe({ kind: 'action', action: { ...m.call, uid: cards.blocker } });
    expect(s.step.title).toBe('Call your Ally');
    s.stepIndex = s.lesson.steps.findIndex(x => x.title === 'Choose your Persona');
    expect(s.allows(m.persona)).toBe(true);
    expect(s.allows({ ...m.persona, supporters: [cards.ally] })).toBe(false);
    expect(s.allows({ ...m.persona, target: cards.foeAlly })).toBe(false);
  });
  it('does not advance a choice from Continue or an unrelated cue', () => {
    const { cards } = createFirstBattle(FULL_INDEX);
    const s = new FirstBattleSession(cards);
    s.stepIndex = s.lesson.steps.findIndex(x => x.title === 'Read a card');
    const before = s.stepIndex;
    s.continue();
    s.observe({ kind: 'cue', cue: 'dealt' });
    expect(s.stepIndex).toBe(before);
    s.observe({ kind: 'cue', cue: 'inspected' });
    expect(s.step.title).toBe('Call your Ally');
  });
  it.each(regions)('%s rebuilds each resume point through the controller', async region => {
    const defense = await prepareFirstBattle(FULL_INDEX, 1, region);
    expect(defense.game.turnPlayer).toBe(1);
    expect(defense.game.players[1].barriers).toHaveLength(1);
    const finish = await prepareFirstBattle(FULL_INDEX, 2, region);
    expect(finish.game.turnPlayer).toBe(0);
    expect(finish.game.phase).toBe('main');
    expect(finish.game.players[0].barriers).toHaveLength(1);
    expect(finish.game.winner).toBeNull();
    expect(finish.game.activeBattle).toBeNull();
    expect(finish.cards.region).toBe(region);
    expect(finish.game.pendingFx).toHaveLength(0);
    expect(finish.game.duel?.events).toHaveLength(0);
  });
  it('survives blocked and invalid local storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{bad', setItem: () => { throw Error('blocked'); } });
    expect(readFirstBattleProgress()).toEqual({ chapter: 0, completed: false });
    const s = new FirstBattleSession(createFirstBattle(FULL_INDEX).cards);
    expect(() => s.continue()).not.toThrow();
    vi.unstubAllGlobals();
  });
  it('restarts obsolete checkpoints while preserving earned completion', () => {
    let value = JSON.stringify({ version: 1, chapter: 2, completed: false });
    vi.stubGlobal('localStorage', { getItem: () => value });
    try {
      expect(readFirstBattleProgress()).toEqual({ chapter: 0, completed: false });
      value = JSON.stringify({ version: 1, chapter: 2, completed: true });
      expect(readFirstBattleProgress()).toEqual({ chapter: 0, completed: true });
      value = JSON.stringify({ version: 2, chapter: 1, completed: false });
      expect(readFirstBattleProgress()).toEqual({ chapter: 0, completed: false });
      value = JSON.stringify({ version: 2, chapter: 1, completed: true });
      expect(readFirstBattleProgress('visayas')).toEqual({ chapter: 0, completed: true });
    } finally { vi.unstubAllGlobals(); }
  });
  it.each(regions)('%s stores its section and region, and cannot finish twice', region => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const s = new FirstBattleSession(createFirstBattle(FULL_INDEX, region).cards, 1);
    s.continue();
    expect(readFirstBattleProgress(region)).toEqual({ chapter: 1, completed: false });
    expect(JSON.parse([...values.values()][0]!)).toEqual({ version: 3, region, chapter: 1, completed: false });
    s.stepIndex = s.lesson.steps.length - 1;
    s.continue();
    expect(readFirstBattleProgress(region)).toEqual({ chapter: 2, completed: true });
    s.continue();
    expect(s.stepIndex).toBe(s.lesson.steps.length - 1);
    expect(s.allows({ kind: 'endTurn' })).toBe(false);
    vi.unstubAllGlobals();
  });
  it.each(regions)('%s keeps the same deck order and opening cards between starts', region => {
    const a = createFirstBattle(FULL_INDEX, region).game;
    const b = createFirstBattle(FULL_INDEX, region).game;
    for (const p of [0, 1] as const) {
      for (const zone of ['deck', 'hand', 'barriers'] as const) {
        expect(a.players[p][zone].map(uid => a.cards[uid]!.defId))
          .toEqual(b.players[p][zone].map(uid => b.cards[uid]!.defId));
      }
    }
  });

  it('restarts a different region without losing earned completion', () => {
    let value = JSON.stringify({ version: 3, region: 'visayas', chapter: 2, completed: false });
    vi.stubGlobal('localStorage', { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } });
    try {
      expect(readFirstBattleProgress('visayas')).toEqual({ chapter: 2, completed: false });
      expect(readFirstBattleProgress('mindanao')).toEqual({ chapter: 0, completed: false });
      value = JSON.stringify({ version: 3, region: 'visayas', chapter: 2, completed: true });
      const replay = new FirstBattleSession(createFirstBattle(FULL_INDEX, 'mindanao').cards);
      replay.continue();
      expect(JSON.parse(value)).toEqual({ version: 3, region: 'mindanao', chapter: 0, completed: true });
      expect(readFirstBattleProgress('luzon')).toEqual({ chapter: 0, completed: true });
    } finally { vi.unstubAllGlobals(); }
  });

  it.each(regions)('%s restart resets the prepared section without persisting a live board', region => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    try {
      const cards = createFirstBattle(FULL_INDEX, region).cards;
      const session = new FirstBattleSession(cards, 1);
      session.continue();
      expect(readFirstBattleProgress(region).chapter).toBe(1);
      const resumed = new FirstBattleSession(cards, readFirstBattleProgress(region).chapter);
      expect(resumed.step.id).toBe('opponent');
      expect(resumed.allows(firstBattleMoves(cards).call)).toBe(false);
      resetFirstBattleProgress();
      expect(readFirstBattleProgress(region)).toEqual({ chapter: 0, completed: false });
      expect(new FirstBattleSession(cards).step.id).toBe('welcome');
    } finally { vi.unstubAllGlobals(); }
  });

  it.each(regions)('%s guidance uses its real card names and contains no missing Action task', region => {
    const { cards } = createFirstBattle(FULL_INDEX, region);
    const names = { luzon: ['Nanolay', 'Kalimangalnuk'], visayas: ['Kaptan', 'Amara'], mindanao: ['Indarapatra', 'Pah'] };
    expect([cards.personaName, cards.allyName]).toEqual(names[region]);
    const session = new FirstBattleSession(cards);
    const text = session.lesson.steps.map(step => `${step.body} ${step.why ?? ''}`).join('\n');
    expect(text).toContain(cards.personaName);
    expect(text).toContain(cards.allyName);
    expect(text).not.toContain('Choose the glowing Action');
    expect(session.lesson.steps.some(step => step.expected.kind === 'action' && step.expected.action === 'playAction')).toBe(false);
  });
});
