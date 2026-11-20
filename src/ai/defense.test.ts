/**
 * The block / take / Sentry decision.
 *
 * These pin the boundaries rather than the exact numbers: the point is that
 * the bot chumps freely while Barriers are cheap and spends everything when
 * the next hit ends the duel, without either being special-cased.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from '../core/setup.js';
import { def, you } from '../core/state.js';
import { decideDefense } from './evaluate.js';
import type { GameState } from '../core/types.js';

const index = indexForDecks(['Agta', 'Babaylan']);

function freshGame(): GameState {
  return createGame(
    index,
    [agtaDeck as unknown as DeckList, babaylanDeck as unknown as DeckList],
    { seed: 11 },
  );
}

/** Every cost is 1 Energy, so the tests are about the decision, not pricing. */
const oneEnergy = () => 1;

function decide(
  game: GameState,
  atk: number,
  defence: number,
  opts: { barriers?: number; sentries?: string[]; blockers?: string[] } = {},
) {
  const ps = you(game, 0);
  if (opts.barriers !== undefined) ps.barriers = ps.barriers.slice(0, opts.barriers);
  return decideDefense(
    index,
    game,
    0,
    atk,
    defence,
    opts.sentries ?? [],
    opts.blockers ?? [],
    oneEnergy,
  );
}

describe('defence decision', () => {
  it('takes nothing when the attack cannot get through', () => {
    const game = freshGame();
    // Defence strictly greater than the attack — no hit, so no cost is worth paying.
    expect(decide(game, 9000, 11000, { blockers: you(game, 0).hand }).kind).toBe('take');
  });

  it('treats an exact tie as a hit, not a miss', () => {
    const game = freshGame();
    const ps = you(game, 0);
    // Down to the last Barrier so the bot is certain to defend if it believes
    // the hit lands. A tie breaks the defence, so it must act.
    const choice = decide(game, 9000, 9000, { barriers: 1, blockers: ps.hand });
    expect(choice.kind).not.toBe('take');
  });

  it('spends the whole hand rather than lose the duel', () => {
    const game = freshGame();
    const ps = you(game, 0);
    ps.energy = 0; // no Sentry affordable — blocking is the only way out
    const choice = decide(game, 12000, 1000, { barriers: 0, blockers: ps.hand });
    // At zero Barriers the next hit ends it, so any block that works is correct.
    if (choice.kind === 'block') {
      expect(choice.uids.length).toBeGreaterThan(0);
    } else {
      // Only acceptable if no combination of the hand could ever stop it.
      const best = ps.hand.reduce(
        (sum, uid) => sum + (def(index, game, uid).defense ?? 0),
        1000,
      );
      expect(best).toBeLessThanOrEqual(12000);
    }
  });

  it('does not pitch cards to save a Barrier it has plenty of', () => {
    const game = freshGame();
    const ps = you(game, 0);
    // Five Barriers: the marginal one is the cheapest it will ever be, so a
    // multi-card block is a bad trade even though it would work.
    const choice = decide(game, 30000, 1000, { barriers: 5, blockers: ps.hand });
    expect(choice.kind).toBe('take');
  });

  it('defends more readily at one Barrier than at five', () => {
    const gameHigh = freshGame();
    const atFive = decide(gameHigh, 9000, 8000, {
      barriers: 5,
      blockers: you(gameHigh, 0).hand,
    });
    const gameLow = freshGame();
    const atOne = decide(gameLow, 9000, 8000, { barriers: 1, blockers: you(gameLow, 0).hand });
    // The same attack against the same hand: scarcity alone should change the
    // answer, or at worst leave the low-Barrier case no less willing.
    const willing = (c: { kind: string }) => (c.kind === 'take' ? 0 : 1);
    expect(willing(atOne)).toBeGreaterThanOrEqual(willing(atFive));
  });
});
