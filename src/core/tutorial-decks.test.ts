import { describe, expect, it } from 'vitest';
import approvedLuzon from '../../docs/design/tutorial-decks-plan-v1/luzon.json' with { type: 'json' };
import approvedVisayas from '../../docs/design/tutorial-decks-plan-v1/visayas.json' with { type: 'json' };
import approvedMindanao from '../../docs/design/tutorial-decks-plan-v1/mindanao.json' with { type: 'json' };
import previousMapping from '../../docs/design/tutorial-training-v1/card-mapping.json' with { type: 'json' };
import normalLuzon from '../../decks/agta-set-1.json' with { type: 'json' };
import normalVisayas from '../../decks/babaylan-set-1.json' with { type: 'json' };
import normalMindanao from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import unitRoles from '../data/tutorial-decks/unit-roles.json' with { type: 'json' };
import { ALL_CARDS, FULL_INDEX, isSelectableCard } from '../data/loader.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { checkDeck } from './deckcheck.js';
import { ACTIVE_SCRIPTS, GameController } from './game.js';
import { createGame, validateDeck, validatePlayableDeck } from './setup.js';
import { TUTORIAL_DECKS, TUTORIAL_LESSON_CARDS, type TutorialRegion } from './tutorial-decks.js';
import { createTutorialProfile } from './tutorial-rules.js';
import { currentPower, def, inst, moveCard, you } from './state.js';
import { autoChooser, specialCall, type Chooser, type EffectContext } from './effects.js';
import { endTurn, switchCodex } from './turn.js';
import type { PlayerId } from './types.js';

const regions: TutorialRegion[] = ['luzon', 'visayas', 'mindanao'];
const approved = { luzon: approvedLuzon, visayas: approvedVisayas, mindanao: approvedMindanao };
const production = { luzon: normalLuzon, visayas: normalVisayas, mindanao: normalMindanao };
const profile = createTutorialProfile(FULL_INDEX);

describe('dedicated regional tutorial decks', () => {
  it.each(regions)('%s uses every approved identity and quantity, with only tutorial Codex validation', region => {
    const deck = TUTORIAL_DECKS[region];
    expect(deck.main).toEqual(approved[region].deck.main);
    expect(deck.persona).toBe(approved[region].deck.persona);
    expect(deck.codex).toEqual(approved[region].deck.codex);
    expect(deck.main.reduce((sum, entry) => sum + entry.copies, 0)).toBe(50);
    expect(deck.main.find(entry => entry.id === deck.persona)?.copies).toBe(3);
    expect(new Set(deck.main.map(entry => entry.id)).size).toBe(deck.main.length);
    expect(new Set(deck.codex).size).toBe(2);

    const counts: Record<string, number> = {};
    const roles: Record<string, number> = {};
    for (const entry of deck.main) {
      const card = profile.index[entry.id]!;
      expect(card, entry.id).toBeDefined();
      expect(isSelectableCard(ALL_CARDS[entry.id]!), entry.id).toBe(true);
      expect(entry.copies).toBe(card.type === 'Sentry' ? 2 : 3);
      const group = card.type === 'Unit' ? `L${card.level}` : card.type;
      counts[group] = (counts[group] ?? 0) + entry.copies;
      if (card.type === 'Unit' && card.level < 3) {
        expect(card.tutorial, entry.id).toBeDefined();
        const key = `L${card.level} ${card.tutorial!.role}`;
        roles[key] = (roles[key] ?? 0) + entry.copies;
      }
    }
    expect(counts).toEqual({ L1: 15, L2: 12, L3: 6, Force: 12, Action: 3, Sentry: 2 });
    expect(roles).toEqual({ 'L1 support': 6, 'L1 arrival': 6, 'L1 attack': 3,
      'L2 support': 6, 'L2 arrival': 3, 'L2 attack': 3 });
    expect(deck.codex.map(id => profile.index[id]?.tutorial?.role)).toEqual(['codex-attack', 'codex-barrier']);
    expect(() => validateDeck(profile.index, deck, 'tutorial-v1')).not.toThrow();
    expect(checkDeck(profile.index, deck).map(problem => problem.where)).toEqual(['codex']);
    expect(() => validatePlayableDeck(FULL_INDEX, deck)).toThrow();
    expect(() => validatePlayableDeck(FULL_INDEX, production[region])).not.toThrow();
    expect(production[region].codex).toHaveLength(5);
  });

  it.each(regions)('%s lesson references exist in that deck with the expected roles and types', region => {
    const lesson = TUTORIAL_LESSON_CARDS[region];
    const ids = new Set(TUTORIAL_DECKS[region].main.map(entry => entry.id));
    for (const id of Object.values(lesson)) expect(ids.has(id), id).toBe(true);
    expect(lesson.persona).toBe(TUTORIAL_DECKS[region].persona);
    expect(lesson.alternatePersona).not.toBe(lesson.persona);
    for (const key of ['persona', 'alternatePersona'] as const) {
      expect(profile.index[lesson[key]]?.level).toBe(3);
      expect(profile.index[lesson[key]]?.tutorial?.role).toBe('persona');
    }
    for (const [key, level, role] of [
      ['l1Support', 1, 'support'], ['l1Arrival', 1, 'arrival'], ['l1Attack', 1, 'attack'],
      ['l2Support', 2, 'support'], ['l2Arrival', 2, 'arrival'], ['l2Attack', 2, 'attack'],
    ] as const) {
      expect(profile.index[lesson[key]]?.level).toBe(level);
      expect(profile.index[lesson[key]]?.tutorial?.role).toBe(role);
    }
    expect(profile.index[lesson.action]?.type).toBe('Action');
    expect(profile.index[lesson.sentry]?.type).toBe('Sentry');
    for (const key of ['forceResponse', 'forceCheck'] as const) {
      expect(profile.index[lesson[key]]?.type).toBe('Force');
      expect(profile.scripts[lesson[key]]).toBe(ACTIVE_SCRIPTS[lesson[key]]);
    }
    expect(profile.scripts[lesson.forceResponse]?.forceModes?.some(mode => mode.response === 'attack')).toBe(true);
    expect(profile.scripts[lesson.forceCheck]?.forceModes?.[0]?.run).toBeDefined();
  });

  it('preserves all previous teaching roles and makes all profile definitions independent of catalogue order', () => {
    const reversed = createTutorialProfile(Object.fromEntries(Object.entries(FULL_INDEX).reverse()));
    expect(reversed.index).toEqual(profile.index);
    expect(reversed.codexByGuild).toEqual(profile.codexByGuild);
    const roles = Object.fromEntries(profile.mapping.map(card => [card.id, card.role]));
    expect(roles).toEqual(Object.fromEntries(previousMapping.cards.map(card => [card.id, card.role])));
    for (const [id, role] of Object.entries(unitRoles)) {
      expect(['support', 'arrival', 'attack']).toContain(role);
      expect(FULL_INDEX[id]?.type, id).toBe('Unit');
      expect([1, 2]).toContain(FULL_INDEX[id]?.level);
      expect(profile.index[id]?.tutorial?.role, id).toBe(role);
    }
    for (const card of Object.values(FULL_INDEX).filter(card => card.type === 'Unit' && [1, 2].includes(card.level)))
      expect(profile.index[card.id]?.tutorial, card.id).toBeDefined();
  });
});

describe('regional Practice Duel pairings', () => {
  const pairings = regions.flatMap(local => regions.map(opponent => ({ local, opponent })));
  it.each(pairings)('finishes $local versus $opponent with legal training state on both sides', async ({ local, opponent }) => {
    const before = JSON.stringify({ catalogue: FULL_INDEX, production, presets: TUTORIAL_DECKS });
    const decks = [TUTORIAL_DECKS[local], TUTORIAL_DECKS[opponent]] as const;
    const game = createGame(profile.index, [...decks], { seed: 42, rulesProfile: 'tutorial-v1' });
    expect(Object.keys(game.cards)).toHaveLength(104); // Persona is part of the 50, plus two Codex per side.
    const ai = new AiChooser(profile.index, () => game);
    const ctrl = new GameController(game, profile.index, { scripts: profile.scripts, choosers: [ai, ai] });
    for (let turn = 0; turn < 100 && game.winner === null; turn++) {
      await ctrl.beginTurn();
      await playAiTurn(ctrl, game.turnPlayer);
      for (const side of game.players) {
        expect(side.codex).toHaveLength(2);
        expect(side.releasedState).toBeNull();
        expect(side.allies.filter(Boolean).length).toBeLessThanOrEqual(4);
        expect(side.activeCodex && def(profile.index, game, side.activeCodex).tutorial?.role)
          .toMatch(/^codex-(attack|barrier)$/);
      }
    }
    expect(game.winner).not.toBeNull();
    expect(game.responseChain).toBeFalsy();
    expect(game.activeBattle).toBeNull();
    expect(JSON.stringify({ catalogue: FULL_INDEX, production, presets: TUTORIAL_DECKS })).toBe(before);
  }, 60000);
});

/** Exact modifiers must be correct for either seat, not merely allow AI games to finish. */
function regionalRoleFixture(region: TutorialRegion, owner: PlayerId) {
  const deck = TUTORIAL_DECKS[region];
  const game = createGame(profile.index, [deck, deck], { seed: 42, firstPlayer: owner, rulesProfile: 'tutorial-v1' });
  game.turnNumber = 4; game.turnPlayer = owner; game.phase = 'main';
  const chooser: Chooser = { ...autoChooser, chooseAbility: async () => null, chooseTarget: async () => null,
    confirm: async () => false, personifyPrompt: async () => null, blockPrompt: async () => [], battleCards: async () => [] };
  const ctrl = new GameController(game, profile.index, { scripts: profile.scripts, choosers: [chooser, chooser] });
  for (const side of game.players) {
    side.activeCodex = side.codex.find(uid => def(profile.index, game, uid).tutorial?.role === 'codex-attack')!;
    for (const uid of [...side.hand]) moveCard(game, uid, 'deck');
  }
  const ps = you(game, owner);
  const take = (id: string, zone: 'hand' | 'ally' = 'hand', slot?: number) => {
    const uid = ps.deck.find(uid => inst(game, uid).defId === id);
    if (!uid) throw new Error(`Prepared role test needs ${id}.`);
    moveCard(game, uid, zone, { slot });
    return uid;
  };
  const context = (): EffectContext => ({ game, index: profile.index, source: ps.persona!, me: owner, chooser,
    settle: async () => { await ctrl.flushSpecialCallTriggers(); } });
  return { game, ctrl, ps, take, context };
}

describe('exact regional role bonuses on either player seat', () => {
  const seats = regions.flatMap(region => ([0, 1] as const).map(owner => ({ region, owner })));
  const roles = [
    { key: 'l1Support', kind: 'support', bonus: 3000 }, { key: 'l1Arrival', kind: 'arrival', bonus: 3000 }, { key: 'l1Attack', kind: 'attack', bonus: 3000 },
    { key: 'l2Support', kind: 'support', bonus: 5000 }, { key: 'l2Arrival', kind: 'arrival', bonus: 5000 }, { key: 'l2Attack', kind: 'attack', bonus: 5000 },
  ] as const;
  it.each(seats.flatMap(seat => roles.map(role => ({ ...seat, ...role }))))(
    '$region seat $owner $key contributes exactly $bonus once and expires correctly', async ({ region, owner, key, kind, bonus }) => {
      const f = regionalRoleFixture(region, owner);
      const id = TUTORIAL_LESSON_CARDS[region][key], base = profile.index[id]!.power;
      if (kind === 'arrival') {
        const normal = f.take(id);
        await f.ctrl.perform({ kind: 'call', uid: normal, slot: 0 }, owner);
        expect(currentPower(profile.index, f.game, normal)).toBe(base + bonus);
        expect(inst(f.game, normal).modifiers).toHaveLength(1);
        const special = f.take(id);
        await specialCall(f.context(), special); await f.ctrl.flushSpecialCallTriggers();
        expect(currentPower(profile.index, f.game, special)).toBe(base + bonus);
        await f.ctrl.flushSpecialCallTriggers();
        expect(inst(f.game, special).modifiers).toHaveLength(1);
        endTurn(f.game);
        expect(currentPower(profile.index, f.game, normal)).toBe(base);
        expect(currentPower(profile.index, f.game, special)).toBe(base);
        expect(inst(f.game, normal).modifiers).toEqual([]);
        expect(inst(f.game, special).modifiers).toEqual([]);
        return;
      }
      f.game.phase = 'battle';
      const subject = f.take(id, 'ally', kind === 'support' ? 1 : 0);
      const attacker = kind === 'support' ? f.take(TUTORIAL_LESSON_CARDS[region].l1Arrival, 'ally', 0) : subject;
      const attackerBase = currentPower(profile.index, f.game, attacker);
      const presented: number[] = [];
      f.ctrl.hooks.onBlockingStart = async battle => {
        expect(currentPower(profile.index, f.game, subject)).toBe(base + bonus);
        expect(inst(f.game, subject).modifiers).toHaveLength(1);
        presented.push(battle.attackPower);
      };
      await f.ctrl.perform({ kind: 'attack', attacker, supporters: kind === 'support' ? [subject] : [], target: null }, owner);
      expect(presented).toEqual([kind === 'support' ? attackerBase + base + bonus : base + bonus]);
      expect(currentPower(profile.index, f.game, subject)).toBe(base);
      expect(inst(f.game, subject).modifiers).toEqual([]);
      expect(inst(f.game, subject).exhausted).toBe(true);
      expect(f.game.activeBattle).toBeNull();
    });

  it.each(seats)('$region seat $owner Attack Codex follows the active Persona and ends with its attack', async ({ region, owner }) => {
    const f = regionalRoleFixture(region, owner);
    const attack = f.ps.codex.find(uid => def(profile.index, f.game, uid).tutorial?.role === 'codex-attack')!;
    const barrier = f.ps.codex.find(uid => def(profile.index, f.game, uid).tutorial?.role === 'codex-barrier')!;
    const original = f.ps.persona!;
    const attackWith = async (uid: string) => {
      const base = def(profile.index, f.game, uid).power;
      f.game.phase = 'battle';
      expect(currentPower(profile.index, f.game, uid)).toBe(base);
      const during: number[] = [];
      f.ctrl.hooks.onBlockingStart = async () => { during.push(currentPower(profile.index, f.game, uid)); };
      await f.ctrl.perform({ kind: 'attack', attacker: uid, supporters: [], target: null }, owner);
      expect(during).toEqual([base + 5000]);
      expect(currentPower(profile.index, f.game, uid)).toBe(base);
      expect(f.game.activeBattle).toBeNull();
    };
    await attackWith(original);
    f.game.phase = 'main';
    switchCodex(profile.index, f.game, barrier);
    expect(currentPower(profile.index, f.game, original)).toBe(def(profile.index, f.game, original).power);
    switchCodex(profile.index, f.game, attack);
    const replacement = f.take(TUTORIAL_LESSON_CARDS[region].alternatePersona);
    moveCard(f.game, original, 'heart'); moveCard(f.game, replacement, 'persona');
    await attackWith(replacement);
    expect(inst(f.game, original).modifiers).toEqual([]);
  });
});
