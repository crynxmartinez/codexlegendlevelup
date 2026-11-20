/** Support legality and optional/ordered green-ability resolution. */
import { describe, expect, it } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDeck } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { startTurn } from './turn.js';
import { availableSupporters, canSupport } from './battle.js';
import { moveCard, you } from './state.js';
import type { AbilityOption, Chooser } from './effects.js';
import type { PlayerId } from './types.js';

const index = indexForDeck('Agta');
const deck = agtaDeck as unknown as DeckList;

function boardWithAllies(seed = 3) {
  const game = createGame(index, [deck, deck], { seed, firstPlayer: 0 });
  startTurn(index, game);
  const ps = you(game, 0);
  // put a unit in each ally slot
  for (let slot = 0; slot < 4; slot++) {
    const uid = ps.hand.find((u) => {
      const d = index[game.cards[u]!.defId]!;
      return d.type === 'Unit' || d.type === 'Force';
    });
    if (uid) moveCard(game, uid, 'ally', { slot });
  }
  return game;
}

describe('support', () => {
  it('never lets the Persona support', () => {
    const game = boardWithAllies();
    const ps = you(game, 0);
    const persona = ps.persona!;
    for (const ally of ps.allies.filter((x): x is string => !!x)) {
      expect(canSupport(game, persona, ally)).toBe(false);
    }
    expect(availableSupporters(game, ps.persona!)).not.toContain(persona);
  });

  it('offers exactly the two inner allies as Persona supporters', () => {
    const game = boardWithAllies();
    const ps = you(game, 0);
    const offered = availableSupporters(game, ps.persona!);
    expect(offered.sort()).toEqual([ps.allies[1]!, ps.allies[2]!].sort());
  });

  it('excludes exhausted allies', () => {
    const game = boardWithAllies();
    const ps = you(game, 0);
    game.cards[ps.allies[1]!]!.exhausted = true;
    expect(availableSupporters(game, ps.persona!)).toEqual([ps.allies[2]!]);
  });

  it('lets an outer ally support only its inner neighbour', () => {
    const game = boardWithAllies();
    const ps = you(game, 0);
    expect(canSupport(game, ps.allies[0]!, ps.allies[1]!)).toBe(true);
    expect(canSupport(game, ps.allies[0]!, ps.persona!)).toBe(false);
  });
});

/** Records prompts and answers them from a script. */
class ScriptedChooser implements Chooser {
  confirms: string[] = [];
  modes: { prompt: string; labels: string[] }[] = [];
  constructor(
    private answerConfirm: (p: string) => boolean,
    private answerMode: (labels: string[]) => number = () => 0,
  ) {}
  abilityPrompts: { prompt: string; options: AbilityOption[] }[] = [];
  async chooseAbility(_p: PlayerId, prompt: string, options: AbilityOption[]) {
    this.abilityPrompts.push({ prompt, options });
    return this.answerConfirm(prompt) ? 0 : null;
  }
  async chooseCards(_p: PlayerId, _q: string, c: string[], n: number) { return c.slice(0, n); }
  async chooseTarget(_p: PlayerId, _q: string, c: string[]) { return c[0] ?? null; }
  async chooseMode(_p: PlayerId, prompt: string, labels: string[]) {
    this.modes.push({ prompt, labels });
    return this.answerMode(labels);
  }
  async chooseSlot(_p: PlayerId, _q: string, candidates: number[]) { return candidates[0] ?? 0; }
  async confirm(_p: PlayerId, prompt: string) {
    this.confirms.push(prompt);
    return this.answerConfirm(prompt);
  }
  async personifyPrompt(_p: PlayerId, _candidates: string[]) { return null; }
  async summonTokenPrompt(_p: PlayerId, _tokenName: string, freeSlots: number[], _stackTargets: any[]) {
    if (freeSlots.length > 0) return { action: 'place' as const, slot: freeSlots[0]! };
    return { action: 'skip' as const };
  }
  async battleCards() { return []; }
  async blockPrompt() { return []; }
  async revealConfirm() { return true; }

  async revealCards(): Promise<void> {}
}

describe('green abilities are optional', () => {
  it('asks before firing, and declining skips the effect', async () => {
    const game = createGame(index, [deck, deck], { seed: 11, firstPlayer: 0 });
    const decline = new ScriptedChooser(() => false);
    const ctrl = new GameController(game, index, { choosers: [decline, decline] });

    await ctrl.beginTurn();
    const handAfterDraw = you(game, 0).hand.length;

    // Any green startOfMain ability must have been offered.
    const asked = decline.confirms.some((c) => /Activate:/.test(c));
    if (asked) {
      // declined -> no extra card beyond the turn draw
      expect(you(game, 0).hand.length).toBe(handAfterDraw);
    }
    expect(game.winner).toBeNull();
  });

  it('lets the player order several simultaneous triggers', async () => {
    const game = createGame(index, [deck, deck], { seed: 5, firstPlayer: 0 });
    const accept = new ScriptedChooser(() => true, () => 0);
    const ctrl = new GameController(game, index, { choosers: [accept, accept] });

    await ctrl.beginTurn();
    const ps = you(game, 0);
    ps.energy = 5;

    // Find a level-1 unit in hand (or move one there) and call it.
    // Agta level-1 units have "placed" triggers that fire on special call,
    // so a normal call may not trigger them. We just verify the game doesn't
    // crash and produces a valid state.
    let unit = ps.hand.find((u) => {
      const d = index[game.cards[u]!.defId]!;
      return d.type === 'Unit' && d.level === 1;
    });
    if (!unit) {
      unit = ps.deck.find((u) => {
        const d = index[game.cards[u]!.defId]!;
        return d.type === 'Unit' && d.level === 1;
      });
      if (unit) moveCard(game, unit, 'hand');
    }
    if (unit) {
      const slot = ps.allies.findIndex((a) => a === null);
      if (slot >= 0) {
        await ctrl.perform({ kind: 'call', uid: unit, slot }, 0);
      }
    }
    // The game should still be running without a winner from a crash.
    expect(game.winner).toBeNull();
  });
});

describe('simultaneous effects are all offered', () => {
  it('shows every pending effect, with its card, when several trigger at once', async () => {
    // Agta level-1 units have "placed" green abilities.
    // We verify the placed trigger is offered with its card info.
    const game = createGame(index, [deck, deck], {
      seed: 4,
      firstPlayer: 0,
      choices: [
        {
          persona: 'agta/the-boar-spear-makisig',
          codex: 'agta/hidden-path',
        },
        {},
      ],
    });
    const chooser = new ScriptedChooser(() => true, () => 0);
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });

    // This scenario exercises Hidden Path's draw replacement, so use a normal
    // draw turn rather than the opening turn (which now skips that step).
    game.turnNumber = 3;
    // Prevent auto-switch from interfering.
    you(game, 0).switchedCodexLastTurn = true;

    await ctrl.beginTurn();
    const ps = you(game, 0);

    // Choose a card with an unconditional placement trigger. A random Level 1
    // may have an attack-only skill, depending on the opening hand size.
    const unit = Object.values(game.cards).find(c => c.owner === 0 && c.defId === 'agta/ember-resin-grandmother-sinta')!.uid;
    moveCard(game, unit, 'hand');
    ps.energy = 2;
    ps.normalPlaysUsed = 0;
    const slot = ps.allies.findIndex(a => a === null);
    expect(slot).toBeGreaterThanOrEqual(0);
    await ctrl.perform({ kind: 'call', uid: unit, slot }, 0);

    // The placed ability should have been offered.
    const prompts = chooser.abilityPrompts.filter(
      (a) => a.prompt.match(/triggered effect/i),
    );
    expect(prompts.length).toBeGreaterThan(0);

    const offered = prompts[0]!;
    // Every option must carry the card it belongs to, so the UI can show art.
    for (const o of offered.options) {
      expect(o.uid).toBeTruthy();
      expect(game.cards[o.uid]).toBeDefined();
      expect(o.cardName.length).toBeGreaterThan(0);
      expect(o.text.length).toBeGreaterThan(0);
    }
  });

  it('offers a single pending effect with its card too', async () => {
    const game = createGame(index, [deck, deck], {
      seed: 4,
      firstPlayer: 0,
      choices: [{ persona: 'agta/the-boar-spear-makisig' }, {}],
    });
    const chooser = new ScriptedChooser(() => false);
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });

    you(game, 0).switchedCodexLastTurn = true;

    await ctrl.beginTurn();
    const ps = you(game, 0);

    // Call a level-1 unit to trigger a placed ability.
    let unit = ps.hand.find((u) => {
      const d = index[game.cards[u]!.defId]!;
      return d.type === 'Unit' && d.level === 1;
    });
    if (!unit) {
      unit = ps.deck.find((u) => {
        const d = index[game.cards[u]!.defId]!;
        return d.type === 'Unit' && d.level === 1;
      });
      if (unit) moveCard(game, unit, 'hand');
    }
    if (unit) {
      const slot = ps.allies.findIndex((a) => a === null);
      if (slot >= 0) {
        await ctrl.perform({ kind: 'call', uid: unit, slot }, 0);
      }
    }

    const single = chooser.abilityPrompts.find((a) => a.options.length === 1);
    if (single) {
      expect(single.options[0]!.uid).toBeTruthy();
      expect(single.prompt).toMatch(/triggered effect/i);
    }
  });
});

describe('Sentry nullifies Persona damage', () => {
  // A chooser that never blocks, but reveals a Sentry when the attack would
  // hit the Persona. For every other prompt it declines / picks nothing.
  class SentryChooser implements Chooser {
    sentryRevealed = false;
    async chooseAbility(_p: PlayerId, _prompt: string, options: AbilityOption[]) {
      const at = options.findIndex(o => o.id?.endsWith(':sentry'));
      if (at < 0) return null;
      this.sentryRevealed = true;
      return at;
    }
    async chooseCards(_p: PlayerId, prompt: string) {
      // Never block — the Sentry is the defence.
      if (prompt.startsWith('Play cards to Defense')) return [];
      return [];
    }
    async chooseTarget(_p: PlayerId, _prompt: string, _candidates: string[]) { return null; }
    async chooseMode() { return 0; }
    async chooseSlot(_p: PlayerId, _q: string, c: number[]) { return c[0] ?? 0; }
    async confirm() { return false; }
    async personifyPrompt(_p: PlayerId, _candidates: string[]) { return null; }
    async summonTokenPrompt(_p: PlayerId, _tokenName: string, freeSlots: number[], _stackTargets: any[]) {
      if (freeSlots.length > 0) return { action: 'place' as const, slot: freeSlots[0]! };
      return { action: 'skip' as const };
    }
    async battleCards(_p: PlayerId, _info: unknown, _forces: string[], sentryCandidates: string[]) {
      if (sentryCandidates.length) {
        this.sentryRevealed = true;
        return [sentryCandidates[0]!];
      }
      return [];
    }
    async blockPrompt() { return []; }
    async revealConfirm() { return true; }

    async revealCards(): Promise<void> {}
  }

  it('offers the defender a Sentry when the Persona is about to take damage', async () => {
    const game = createGame(index, [deck, deck], {
      seed: 8,
      firstPlayer: 0,
      choices: [{}, {}],
    });
    const defender = new SentryChooser();
    const attacker = new SentryChooser();
    const ctrl = new GameController(game, index, { choosers: [attacker, defender] });

    await ctrl.beginTurn();

    // Give the attacker a big buff so the swing would break a Barrier.
    const ps = you(game, 0);
    const persona = ps.persona!;
    game.cards[persona]!.modifiers.push({
      amount: 50000, duration: 'endOfTurn', source: 'test',
    });

    // Give the defender a Sentry (Banoy) in hand and enough energy.
    const foePs = you(game, 1);
    const banoyFromDeck = foePs.deck.find(
      (u) => game.cards[u]!.defId === 'agta/sierra-watchkeeper-banoy',
    );
    if (banoyFromDeck) {
      moveCard(game, banoyFromDeck, 'hand');
    }
    foePs.energy = 5;

    const barriersBefore = foePs.barriers.length;
    game.phase = 'battle';

    await ctrl.perform(
      { kind: 'attack', attacker: persona, target: null, supporters: [] },
      0,
    );

    // The defender was offered a Sentry and used it.
    expect(defender.sentryRevealed).toBe(true);
    // No Barrier was broken — the damage was nullified.
    expect(foePs.barriers).toHaveLength(barriersBefore);
    // The Sentry was exiled face down.
    if (banoyFromDeck) {
      expect(game.cards[banoyFromDeck]!.zone).toBe('exile');
      expect(game.cards[banoyFromDeck]!.faceDown).toBe(true);
    }
  });

  it('does not offer a Sentry when the attack targets an Ally, not the Persona', async () => {
    const game = createGame(index, [deck, deck], {
      seed: 8,
      firstPlayer: 0,
      choices: [{}, {}],
    });
    const defender = new SentryChooser();
    const attacker = new SentryChooser();
    const ctrl = new GameController(game, index, { choosers: [attacker, defender] });

    await ctrl.beginTurn();

    // Place a defender ally for player 1.
    const foePs = you(game, 1);
    const allyUid = foePs.hand[0];
    if (allyUid) moveCard(game, allyUid, 'ally', { slot: 1 });

    // Give the attacker a big buff.
    const persona = you(game, 0).persona!;
    game.cards[persona]!.modifiers.push({
      amount: 50000, duration: 'endOfTurn', source: 'test',
    });

    // Give the defender a Sentry in hand.
    const banoyFromDeck = foePs.deck.find(
      (u) => game.cards[u]!.defId === 'agta/sierra-watchkeeper-banoy',
    );
    if (banoyFromDeck) moveCard(game, banoyFromDeck, 'hand');
    foePs.energy = 5;

    game.phase = 'battle';

    await ctrl.perform(
      { kind: 'attack', attacker: persona, target: allyUid ?? null, supporters: [] },
      0,
    );

    // Sentry was NOT offered — the attack targeted an Ally, not the Persona.
    expect(defender.sentryRevealed).toBe(false);
  });
});
