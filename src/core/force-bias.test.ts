/**
 * The difficulty handicap on attack checks.
 *
 * A Force revealed on a check plays free with both of its modes, so this is
 * card advantage handed to a player rather than better play by one — which is
 * exactly why it is written down in the game state and logged, instead of
 * living inside the bot where nothing reading the game could see it.
 *
 * Two things need holding: that zero really is zero, because every fair game
 * and every human depends on it, and that the stream is deterministic, since
 * the AI clones the state to try actions and a clone that rolled differently
 * would make the bot's own lookahead lie to it.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { doAttackCheck } from './battle.js';
import { def, inst, you } from './state.js';
import { rollAt } from './rng.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const ME: PlayerId = 0;

function fresh(bias: number): GameState {
  const g = createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 7 },
  );
  you(g, ME).forceCheckBias = bias;
  return g;
}

/** How many of `n` attack checks turned up a Force. */
function forcesIn(g: GameState, n: number): number {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const uid = doAttackCheck(index, g, ME);
    if (!uid) break;
    if (def(index, g, uid).type === 'Force') hits++;
    // The check zone holds nothing; clear it so the next one can run.
    inst(g, uid).zone = 'grave';
    you(g, ME).grave.push(uid);
  }
  return hits;
}

describe('force check bias', () => {
  it('is off by default', () => {
    const g = createGame(
      index,
      [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
      { seed: 7 },
    );
    expect(you(g, 0).forceCheckBias).toBe(0);
    expect(you(g, 1).forceCheckBias).toBe(0);
  });

  it('at 0 the deck order is untouched', () => {
    // The guarantee the fair game rests on: the top card is the top card.
    const g = fresh(0);
    const expected = you(g, ME).deck.slice(0, 6);
    const drawn: string[] = [];
    for (let i = 0; i < 6; i++) {
      const uid = doAttackCheck(index, g, ME)!;
      drawn.push(uid);
      inst(g, uid).zone = 'grave';
      you(g, ME).grave.push(uid);
    }
    expect(drawn).toEqual(expected);
  });

  it('at 1 every check finds a Force while any remain', () => {
    const g = fresh(1);
    expect(forcesIn(g, 10)).toBe(10);
  });

  it('at 0.5 it lands between the two, and above the natural rate', () => {
    // 12 Force in 50 cards is about 24% unaided. Asserted as a range, not a
    // number: the point is that the dial moves the rate, not that it hits a
    // particular value on one seed.
    const g = fresh(0.5);
    const hits = forcesIn(g, 20);
    expect(hits).toBeGreaterThan(6);
    expect(hits).toBeLessThan(20);
  });

  it('the roll is reproducible, so a cloned state agrees with the real one', () => {
    // The AI clones the game to try an action. If the clone rolled its own
    // values, the lookahead would be scoring a different game from the one it
    // is about to play.
    const a = fresh(0.5);
    const b = fresh(0.5);
    expect(forcesIn(a, 12)).toBe(forcesIn(b, 12));
    expect(rollAt(7, 3)).toBe(rollAt(7, 3));
    expect(rollAt(7, 3)).not.toBe(rollAt(7, 4));
  });

  it('leaves the opponent alone', () => {
    const g = fresh(1);
    expect(you(g, 1).forceCheckBias).toBe(0);
    const before = you(g, 1).deck.slice(0, 3);
    const uid = doAttackCheck(index, g, 1)!;
    expect(uid).toBe(before[0]);
  });
});
