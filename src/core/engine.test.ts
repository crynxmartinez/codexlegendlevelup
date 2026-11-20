import { beforeEach, describe, expect, it } from 'vitest';
import {
  createGame,
  expandDeck,
  personaChoices,
  resetUids,
  rollForFirst,
  validateDeck,
  DeckValidationError,
  type DeckList,
} from './setup.js';
import { startTurn, normalCall, canSwitchCodex, switchCodex, toMainPhase } from './turn.js';
import { resolveAttack, canSupport, legalTargets, blockValue, doAttackCheck, type AttackDeclaration } from './battle.js';
import { personaLevel, you, type CardIndex } from './state.js';
import { makeRng } from './rng.js';
import type { CardDef } from './types.js';

// --- fixtures --------------------------------------------------------------

function unit(
  id: string,
  level: number,
  power: number,
  defense: number,
): CardDef {
  return {
    id, name: id, type: 'Unit', guild: 'Hub Nur',
    level, power, defense, subtypes: [], abilities: [],
  };
}

const index: CardIndex = {
  unit3a: unit('unit3a', 3, 11000, 0),
  unit3b: unit('unit3b', 3, 11000, 0),
  unit2: unit('unit2', 2, 9000, 5000),
  blocker: unit('blocker', 1, 7000, 10000),
  codexA: { id: 'codexA', name: 'codexA', type: 'Codex', guild: 'Hub Nur', level: 0,
            power: 0, defense: 0, subtypes: [], abilities: [], state: 'Grace' },
  codexB: { id: 'codexB', name: 'codexB', type: 'Codex', guild: 'Hub Nur', level: 0,
            power: 0, defense: 0, subtypes: [], abilities: [], state: 'Grace' },
  codexC: { id: 'codexC', name: 'codexC', type: 'Codex', guild: 'Hub Nur', level: 0,
            power: 0, defense: 0, subtypes: [], abilities: [], state: 'Grace' },
};

// 14 distinct fillers x3 = 42, + 3 unit3a + 3 unit3b + 2 blocker = 50
const FILLER: string[] = [];
for (let i = 0; i < 14; i++) {
  const id = `filler${i}`;
  index[id] = unit(id, 1, 7000, 10000);
  FILLER.push(id);
}

function deck(name: string): DeckList {
  return {
    name,
    main: [
      { id: 'unit3a', copies: 3 },
      { id: 'unit3b', copies: 3 },
      { id: 'blocker', copies: 2 },
      ...FILLER.map((id) => ({ id, copies: 3 })),
    ],
    codex: ['codexA', 'codexB', 'codexC'],
    persona: 'unit3a',
  };
}

beforeEach(() => resetUids());

// --- deck construction -----------------------------------------------------

describe('deck validation', () => {
  it('accepts a legal deck', () => {
    expect(expandDeck(deck('A'))).toHaveLength(50);
    expect(() => validateDeck(index, deck('A'))).not.toThrow();
  });

  it('rejects a deck that is not exactly 50', () => {
    const bad = deck('bad');
    bad.main = bad.main.slice(0, -1);
    expect(() => validateDeck(index, bad)).toThrow(DeckValidationError);
  });

  it('rejects more than 3 copies', () => {
    const bad = deck('bad');
    // 4 copies of unit3a, one filler trimmed to 2 -> still exactly 50 cards,
    // so the copy rule is what fails rather than the deck-size rule.
    bad.main = bad.main.map((e) =>
      e.id === 'unit3a' ? { ...e, copies: 4 }
      : e.id === FILLER[0] ? { ...e, copies: 2 }
      : e);
    expect(expandDeck(bad)).toHaveLength(50);
    expect(() => validateDeck(index, bad)).toThrow(/max 3/);
  });

  it('honours a per-card copy override', () => {
    const wide = { ...index, bulk: { ...unit('bulk', 1, 2000, 10000), maxCopies: 8 } };
    const d = deck('override');
    d.main = [
      { id: 'unit3a', copies: 3 }, { id: 'unit3b', copies: 3 },
      { id: 'bulk', copies: 8 },
      ...FILLER.slice(0, 12).map((id) => ({ id, copies: 3 })),
    ];
    expect(expandDeck(d)).toHaveLength(50);
    expect(() => validateDeck(wide, d)).not.toThrow();
  });

  it('rejects a mixed-guild deck', () => {
    const wide = {
      ...index,
      foreign: { ...unit('foreign', 1, 7000, 10000), guild: 'Madfie' as const },
      foreign2: { ...unit('foreign2', 1, 7000, 10000), guild: 'Dam Thar' as const },
    };
    const d = deck('mixed');
    d.main = [
      { id: 'foreign', copies: 3 },
      { id: 'foreign2', copies: 3 },
      ...d.main.slice(2),
    ];
    expect(() => validateDeck(wide, d)).toThrow(/mixes.*guilds/);
  });

  it('rejects a non-Unit persona', () => {
    const bad = deck('bad');
    bad.persona = 'codexA';
    expect(() => validateDeck(index, bad)).toThrow(/Unit/);
  });

  it('rejects a Unit persona of the wrong level', () => {
    const bad = deck('bad');
    // swap one filler for the lvl 2 unit, keeping the deck at 50
    bad.main = bad.main.map((e) => (e.id === FILLER[0] ? { id: 'unit2', copies: 3 } : e));
    bad.persona = 'unit2';
    expect(expandDeck(bad)).toHaveLength(50);
    expect(() => validateDeck(index, bad)).toThrow(/lvl 3/);
  });

  it('lists every legal starting persona', () => {
    expect(personaChoices(index, deck('A')).sort()).toEqual(['unit3a', 'unit3b']);
  });
});

// --- setup -----------------------------------------------------------------

describe('setup', () => {
  it('deals the opening board', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 42, firstPlayer: 0 });
    for (const p of [0, 1] as const) {
      const ps = you(game, p);
      expect(ps.barriers).toHaveLength(5);
      expect(ps.hand).toHaveLength(5);
      expect(ps.energy).toBeUndefined();
      expect(ps.persona).not.toBeNull();
      expect(ps.activeCodex).not.toBeNull();
      expect(ps.deck).toHaveLength(39); // 50 - 1 persona - 5 barriers - 5 hand
    }
  });

  it('rolls dice for first player and never ties', () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = rollForFirst(makeRng(seed));
      expect(r.rolls[0]).not.toBe(r.rolls[1]);
      expect(r.first).toBe(r.rolls[0] > r.rolls[1] ? 0 : 1);
    }
  });

  it('honours player persona and codex choices', () => {
    const game = createGame(index, [deck('A'), deck('B')], {
      seed: 5, firstPlayer: 0,
      choices: [{ persona: 'unit3b', codex: 'codexC' }, {}],
    });
    const ps = you(game, 0);
    expect(game.cards[ps.persona!]!.defId).toBe('unit3b');
    expect(game.cards[ps.activeCodex!]!.defId).toBe('codexC');
  });
});

// --- turn ------------------------------------------------------------------

describe('turn', () => {
  it('skips the opening draw without adding a currency field', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    expect(you(game, 0).hand).toHaveLength(5);
    // lvl 3 Persona, no Barriers broken -> level 3 -> 2 energy, 3 plays
    expect(you(game, 0).energy).toBeUndefined();
  });

  it('gains a level and a play for each broken Barrier', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    you(game, 0).barriers.splice(0, 2); // two Barriers broken
    startTurn(index, game);
    toMainPhase(game);
    expect(personaLevel(index, game, 0)).toBe(5);
    expect(you(game, 0).energy).toBeUndefined();

    const hand = [...you(game, 0).hand];
    for (let i = 0; i < 4; i++) {
      if (i < 4) normalCall(index, game, hand[i]!, { slot: i });
    }
    expect(you(game, 0).normalPlaysUsed).toBe(4);
  });

  it('starts the persona at level 3, so everything is callable', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    expect(personaLevel(index, game, 0)).toBe(3);
  });

  it('caps normal plays at 3 per turn', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    const hand = [...you(game, 0).hand];
    for (let i = 0; i < 3; i++) normalCall(index, game, hand[i]!, { slot: i });
    expect(() => normalCall(index, game, hand[3]!, { slot: 3 })).toThrow(/illegal call/);
  });

  it('allows manual codex switches for one play from the first Main Phase', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    const other = you(game, 0).codex.find((u) => u !== you(game, 0).activeCodex)!;
    expect(canSwitchCodex(index, game, other)).toBe(true);
    switchCodex(index, game, other);
    const third = you(game, 0).codex.find((u) => u !== you(game, 0).activeCodex)!;
    expect(canSwitchCodex(index, game, third)).toBe(true);
    expect(you(game, 0).normalPlaysUsed).toBe(1);
  });
});

// --- battle ----------------------------------------------------------------

function battleReady(seed = 7) {
  const game = createGame(index, [deck('A'), deck('B')], { seed, firstPlayer: 0 });
  startTurn(index, game);
  game.phase = 'battle';
  return game;
}

describe('battle', () => {
  it.each([
    ['missing attacker', 'attacker-missing'],
    ['exhausted attacker', 'attacker-ineligible'],
    ['new attacker entry', 'field-entry-changed'],
    ['new target entry', 'field-entry-changed'],
    ['removed target', 'field-entry-changed'],
    ['screened target', 'target-illegal'],
  ])('reports cancellation for %s without changing its existing cleanup or game outcome', (scenario, reason) => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    const target = you(game, 1).persona!;
    const blocker = you(game, 1).hand[0]!;
    const attack: AttackDeclaration = { attacker, target: null };
    game.cards[blocker]!.modifiers.push({ amount: 1000, duration: 'endOfAttack', source: 'expired' });
    game.cards[blocker]!.modifiers.push({ amount: 2000, duration: 'endOfTurn', source: 'retained' });
    if (scenario === 'missing attacker') delete game.cards[attacker];
    if (scenario === 'exhausted attacker') game.cards[attacker]!.exhausted = true;
    if (scenario === 'new attacker entry') attack.attackerEntry = (game.cards[attacker]!.zoneEntry ?? 0) + 1;
    if (scenario === 'new target entry' || scenario === 'removed target') {
      attack.targetUid = target;
      attack.targetEntry = game.cards[target]!.zoneEntry ?? 0;
      if (scenario === 'new target entry') game.cards[target]!.zoneEntry = attack.targetEntry + 1;
      else game.cards[target]!.zone = 'grave';
    }
    if (scenario === 'screened target') {
      const screen = you(game, 1).hand[1]!;
      game.cards[screen]!.zone = 'ally';
      game.cards[screen]!.slot = 1;
      game.cards[screen]!.screen = true;
      you(game, 1).allies[1] = screen;
      you(game, 1).hand = you(game, 1).hand.filter(uid => uid !== screen);
    }
    const expected = structuredClone(game);
    for (const card of Object.values(expected.cards)) {
      card.modifiers = card.modifiers.filter(modifier => modifier.duration !== 'endOfAttack');
    }
    const result = resolveAttack(index, game, attack, { blockers: [blocker] });
    expect(result).toEqual({
      hit: false, personaHit: false, barrierBroken: false,
      attackCheck: null, barrierCheckCard: null,
      attackPower: 0, defensePower: 0, sentryUsed: false,
      cancelReason: reason,
    });
    expect(game).toEqual(expected);
  });
  it('does not mark a legal zero-Power blocked attack as cancelled', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({ amount: -11000, duration: 'endOfAttack', source: 'test' });
    const result = resolveAttack(index, game, { attacker, target: null });
    expect(result.attackPower).toBe(0);
    expect(result.defensePower).toBe(11000);
    expect(result.hit).toBe(false);
    expect(result.cancelReason).toBeUndefined();
    expect(game.cards[attacker]!.exhausted).toBe(true);
  });
  it('does not mark Sentry prevention or a normal hit as cancelled', () => {
    for (const sentryUsed of [false, true]) {
      const game = battleReady();
      const result = resolveAttack(index, game, { attacker: you(game, 0).persona!, target: null }, { blockers: [] }, sentryUsed);
      expect(result.cancelReason).toBeUndefined();
      expect(result.sentryUsed).toBe(sentryUsed);
      expect(result.hit).toBe(!sentryUsed);
    }
  });
  it('settles defenders in Grave without replaying a second hand departure', () => {
    const game = battleReady();
    const blocker = you(game, 1).hand[0]!;
    game.pendingFx.length = 0;
    resolveAttack(index, game, { attacker: you(game, 0).persona!, target: null }, { blockers: [blocker] });
    expect(you(game, 1).grave).toContain(blocker);
    expect(you(game, 1).hand).not.toContain(blocker);
    expect(game.pendingFx.filter(fx => fx.kind === 'destroy' && fx.uid === blocker)).toHaveLength(1);
    expect(game.pendingFx.some(fx => fx.kind === 'handMove' && fx.cards.some(c => c.uid === blocker))).toBe(false);
  });
  it('attack check reveals the ATTACKER\'s own deck, not a barrier', () => {
    const game = battleReady();
    const deckBefore = you(game, 0).deck.length;
    const myBarriersBefore = you(game, 0).barriers.length;
    const topCard = you(game, 0).deck[0];

    // The attack check is now done by the caller (GameController.doAttack),
    // not by resolveAttack itself. We pass the revealed uid in.
    const checkUid = doAttackCheck(index, game, 0);
    const r = resolveAttack(
      index, game,
      { attacker: you(game, 0).persona!, target: null },
      { blockers: [] }, false, checkUid,
    );

    expect(r.attackCheck).toBe(topCard);
    expect(you(game, 0).deck).toHaveLength(deckBefore - 1);
    // The attacker's OWN barriers must be untouched.
    expect(you(game, 0).barriers).toHaveLength(myBarriersBefore);
  });

  it('gives no attack check when an Ally attacks', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    normalCall(index, game, you(game, 0).hand[0]!, { slot: 1 });
    game.phase = 'battle';

    const r = resolveAttack(index, game, { attacker: you(game, 0).allies[1]!, target: null });
    expect(r.attackCheck).toBeNull();
  });

  it('counts the defending Persona\'s own Power as defense', () => {
    const game = battleReady();
    // 11000 attacker vs 11000 defending persona. Equal power breaks the
    // defence, so an unaided Persona cannot hold a same-size attacker.
    const r = resolveAttack(index, game, { attacker: you(game, 0).persona!, target: null });
    expect(r.defensePower).toBe(11000);
    expect(r.hit).toBe(true);
    expect(r.barrierBroken).toBe(true);
  });

  it('breaks a barrier when the attack actually exceeds the persona', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });
    const r = resolveAttack(index, game, { attacker, target: null });

    expect(r.hit).toBe(true);
    expect(r.barrierBroken).toBe(true);
    // The broken barrier stays in the array with breaking=true until
    // resolveCheck moves it to the check zone.
    const nonBreaking = you(game, 1).barriers.filter((b) => !game.cards[b]?.breaking);
    expect(nonBreaking).toHaveLength(4);
    expect(r.barrierCheckCard).not.toBeNull();
  });

  it('adds blocker Defense to the defending Persona', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });
    const blockerUid = you(game, 1).hand.find(
      (u) => index[game.cards[u]!.defId]!.defense > 0,
    )!;

    const r = resolveAttack(index, game,
      { attacker, target: null }, { blockers: [blockerUid] });

    expect(r.defensePower).toBe(11000 + blockValue(index, game, blockerUid));
    expect(r.hit).toBe(false);
    expect(game.cards[blockerUid]!.zone).toBe('grave'); // blockers die regardless
  });

  it('lets a lvl 3 card block for 0', () => {
    expect(index['unit3a']!.defense).toBe(0);
    const game2 = battleReady(11);
    const lvl3InHand = you(game2, 1).hand.find(
      (u) => index[game2.cards[u]!.defId]!.level === 3,
    );
    if (lvl3InHand) expect(blockValue(index, game2, lvl3InHand)).toBe(0);
  });

  it('allows two units to support the Persona (slots 1 and 2)', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    const fillers = you(game, 0).hand.filter(
      (u) => index[game.cards[u]!.defId]!.power === 7000,
    );
    normalCall(index, game, fillers[0]!, { slot: 1 });
    normalCall(index, game, fillers[1]!, { slot: 2 });
    game.phase = 'battle';

    const persona = you(game, 0).persona!;
    expect(canSupport(game, you(game, 0).allies[1]!, persona)).toBe(true);
    expect(canSupport(game, you(game, 0).allies[2]!, persona)).toBe(true);

    const r = resolveAttack(index, game, {
      attacker: persona,
      supporters: [you(game, 0).allies[1]!, you(game, 0).allies[2]!],
      target: null,
    });
    expect(r.attackPower).toBe(11000 + 7000 + 7000);
  });

  it('rejects support from the outer wings (slots 0 and 3)', () => {
    const game = createGame(index, [deck('A'), deck('B')], { seed: 7, firstPlayer: 0 });
    startTurn(index, game);
    toMainPhase(game);
    normalCall(index, game, you(game, 0).hand[0]!, { slot: 0 });
    game.phase = 'battle';
    expect(canSupport(game, you(game, 0).allies[0]!, you(game, 0).persona!)).toBe(false);
  });

  it('restricts targets when a defender has Screen', () => {
    const game = battleReady();
    // give player 1 a screened ally
    const uid = you(game, 1).hand[0]!;
    game.cards[uid]!.zone = 'ally';
    game.cards[uid]!.slot = 1;
    you(game, 1).allies[1] = uid;
    you(game, 1).hand = you(game, 1).hand.filter((u) => u !== uid);
    game.cards[uid]!.screen = true;

    expect(legalTargets(game, 1)).toEqual([uid]);
    // With Screen active, null (Persona) is not a legal target — the attack fizzles.
    const result = resolveAttack(index, game, { attacker: you(game, 0).persona!, target: null });
    expect(result.hit).toBe(false);
  });

  it('wins once the persona is hit with no barriers left', () => {
    const game = battleReady();
    you(game, 1).barriers = [];
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });
    resolveAttack(index, game, { attacker, target: null });
    expect(game.winner).toBe(0);
  });

  it('destroys a hit Ally and sends it to the Grave (Persona only breaks a Barrier)', () => {
    const game = battleReady();
    // Place a defender ally for player 1 in slot 1.
    const defenderUid = you(game, 1).hand[0]!;
    game.cards[defenderUid]!.zone = 'ally';
    game.cards[defenderUid]!.slot = 1;
    you(game, 1).allies[1] = defenderUid;
    you(game, 1).hand = you(game, 1).hand.filter((u) => u !== defenderUid);

    const defenderPower = index[game.cards[defenderUid]!.defId]!.power;
    const attacker = you(game, 0).persona!;
    // Buff the attacker so the hit lands regardless of the defender's stats.
    game.cards[attacker]!.modifiers.push({
      amount: defenderPower + 5000, duration: 'endOfTurn', source: 'test',
    });

    const barriersBefore = you(game, 1).barriers.length;
    const r = resolveAttack(index, game, { attacker, target: defenderUid });

    expect(r.hit).toBe(true);
    expect(r.personaHit).toBe(false);
    // The ally is destroyed and in the Grave, not still on the field.
    expect(game.cards[defenderUid]!.zone).toBe('grave');
    expect(you(game, 1).allies[1]).toBeNull();
    expect(you(game, 1).grave).toContain(defenderUid);
    // A Persona hit would have broken a Barrier; an Ally hit must NOT.
    expect(you(game, 1).barriers).toHaveLength(barriersBefore);
    expect(r.barrierBroken).toBe(false);
  });

  it('destroys an Ally on a tie — equal power breaks the defence', () => {
    const game = battleReady();
    const defenderUid = you(game, 1).hand[0]!;
    game.cards[defenderUid]!.zone = 'ally';
    game.cards[defenderUid]!.slot = 1;
    you(game, 1).allies[1] = defenderUid;
    you(game, 1).hand = you(game, 1).hand.filter((u) => u !== defenderUid);

    const defenderPower = index[game.cards[defenderUid]!.defId]!.power;
    const attacker = you(game, 0).persona!;
    // Equal power -> attackPower >= defensePower is true, so a tie connects
    // and the Ally is destroyed. The modifier may be negative to bring the
    // Persona down to the defender's power.
    game.cards[attacker]!.modifiers.push({
      amount: defenderPower - 11000, duration: 'endOfTurn', source: 'test',
    });

    const r = resolveAttack(index, game, { attacker, target: defenderUid });
    expect(r.hit).toBe(true);
    expect(game.cards[defenderUid]!.zone).toBe('grave');
    expect(you(game, 1).allies[1]).toBeNull();
  });

  // --- Sentry nullification (§8) -------------------------------------------
  // A Sentry may be revealed from hand to nullify one instance of Persona
  // damage; it is then exiled face down. resolveAttack accepts a sentryUsed
  // flag that skips the damagePersona call while still exhausting the attacker,
  // firing the attack check, and destroying blockers.

  it('a Sentry nullifies Persona damage — no Barrier broken, attack check still fires', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    const deckBefore = you(game, 0).deck.length;
    const barriersBefore = you(game, 1).barriers.length;

    // Buff so the attack would normally break a Barrier.
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });

    // The attack check is done by the caller before resolveAttack.
    const checkUid = doAttackCheck(index, game, 0);
    const r = resolveAttack(
      index, game, { attacker, target: null },
      { blockers: [] }, true, checkUid,
    );

    expect(r.sentryUsed).toBe(true);
    expect(r.hit).toBe(false); // nullified — no damage dealt
    expect(r.personaHit).toBe(false);
    expect(r.barrierBroken).toBe(false);
    expect(r.barrierCheckCard).toBeNull();
    expect(you(game, 1).barriers).toHaveLength(barriersBefore); // Barrier intact
    // The attack check still fires — it is about the ATTACKER's deck, not damage.
    expect(r.attackCheck).not.toBeNull();
    expect(you(game, 0).deck).toHaveLength(deckBefore - 1);
  });

  it('a Sentry does not save blockers — they still die', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });
    const blockerUid = you(game, 1).hand.find(
      (u) => index[game.cards[u]!.defId]!.defense > 0,
    )!;

    const r = resolveAttack(
      index, game, { attacker, target: null }, { blockers: [blockerUid] }, true,
    );

    expect(r.sentryUsed).toBe(true);
    // Blockers die regardless of whether the attack hit or was nullified.
    expect(game.cards[blockerUid]!.zone).toBe('grave');
  });

  it('a Sentry only applies when the flag is set — a normal hit still breaks a Barrier', () => {
    const game = battleReady();
    const attacker = you(game, 0).persona!;
    game.cards[attacker]!.modifiers.push({
      amount: 5000, duration: 'endOfTurn', source: 'test',
    });

    const r = resolveAttack(index, game, { attacker, target: null }, { blockers: [] }, false);

    expect(r.sentryUsed).toBe(false);
    expect(r.hit).toBe(true);
    expect(r.barrierBroken).toBe(true);
    // The broken barrier stays in the array with breaking=true until
    // resolveCheck moves it to the check zone.
    const nonBreaking = you(game, 1).barriers.filter((b) => !game.cards[b]?.breaking);
    expect(nonBreaking).toHaveLength(4);
  });
});
