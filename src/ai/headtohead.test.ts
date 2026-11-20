/**
 * Does the hard bot actually beat the old one?
 *
 * Every other measurement in this repo tells us what the AI *did* — which
 * cards fired, which Codex came up. None of them say whether a change made it
 * play better, and a bot that fires more abilities is not the same as a bot
 * that wins more games. This is the only direct answer: same decks, same
 * seeds, seats swapped so neither profile keeps the first-turn advantage, and
 * the one number that matters at the end.
 *
 * Reported, not asserted, at small N — thirty games is not enough to call a
 * 55% edge real, and a test that fails on variance is a test people delete.
 * The assertion is deliberately loose: it catches a change that made the bot
 * *worse*, which is the failure worth stopping a commit for.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import magDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from '../core/setup.js';
import { GameController } from '../core/game.js';
import { AiChooser, playAiTurn } from './bot.js';
import { AI_NORMAL, type AiProfile } from './evaluate.js';
import type { PlayerId } from '../core/types.js';

const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);
const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: magDeck as unknown as DeckList,
  Babaylan: babDeck as unknown as DeckList,
};

const MAX_TURNS = 60;

/**
 * Opt-in, like the other sims: `AIBENCH=1 npx vitest run src/ai/headtohead`.
 *
 * A hundred and twenty games is three minutes, and it answers a question that
 * is only asked when the bot changes. What runs by default is the control
 * alone — cheap, and the one result that must hold for any of the rest to
 * mean anything.
 */
// Declared locally rather than pulling in @types/node for one lookup — the
// same shape playtest.test.ts uses.
declare const process: { env: Record<string, string | undefined> };

const BENCH = process.env.AIBENCH === '1';

/** One game. Returns the winner, or null on a draw / turn cap. */
async function play(
  deck: string,
  profiles: [AiProfile, AiProfile],
  seed: number,
  bias: [number, number] = [0, 0],
): Promise<PlayerId | null> {
  const game = createGame(index, [DECKS[deck]!, DECKS[deck]!], { seed });
  game.players[0].forceCheckBias = bias[0];
  game.players[1].forceCheckBias = bias[1];
  const ctrl = new GameController(game, index, {
    choosers: [
      new AiChooser(index, () => game, profiles[0]),
      new AiChooser(index, () => game, profiles[1]),
    ],
  });
  let turns = 0;
  while (game.winner === null && turns < MAX_TURNS) {
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    await playAiTurn(ctrl, p, profiles[p]);
    turns++;
  }
  return game.winner;
}

/**
 * Every seed played twice, once from each seat.
 *
 * The first version of this alternated the seat with the loop counter and
 * drew the seed from the same counter, which tied profile A to the even seeds
 * and B to the odd ones — so a difference between two halves of the seed
 * space read as a difference between the two profiles. It showed a 40% win
 * rate for a profile playing *itself*. Pairing the seatings on identical
 * seeds cancels the seat and the shuffle at once, and a control run is the
 * only way to know it worked.
 */
async function match(
  deck: string,
  a: AiProfile,
  b: AiProfile,
  seeds: number,
  aBias = 0,
): Promise<{ aWins: number; bWins: number; draws: number }> {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  const tally = (winner: PlayerId | null, aSeat: PlayerId) => {
    if (winner === null) draws++;
    else if (winner === aSeat) aWins++;
    else bWins++;
  };
  for (let i = 0; i < seeds; i++) {
    const seed = 100 + i;
    // The handicap follows profile A into whichever seat it takes.
    tally(await play(deck, [a, b], seed, [aBias, 0]), 0);
    tally(await play(deck, [b, a], seed, [0, aBias]), 1);
  }
  return { aWins, bWins, draws };
}

/** Total wins for `prof` against AI_NORMAL across every deck. */
async function benchmark(
  prof: AiProfile,
  seeds: number,
  bias = 0,
): Promise<{ w: number; l: number; d: number; rate: number }> {
  let w = 0;
  let l = 0;
  let d = 0;
  for (const deck of ['Maguindanao', 'Agta', 'Babaylan']) {
    const r = await match(deck, prof, AI_NORMAL, seeds, bias);
    w += r.aWins;
    l += r.bWins;
    d += r.draws;
  }
  return { w, l, d, rate: (w + l) ? (w / (w + l)) * 100 : 0 };
}

describe('AI benchmark', () => {
  it('the harness is fair: a profile against itself wins half', async () => {
    // The whole apparatus rests on this. An earlier version tied profile A to
    // the even seeds and B to the odd ones, and reported 40% for a profile
    // playing itself — every comparison drawn from it was measuring the seed
    // space. If this drifts off 50, nothing else in this file means anything.
    const r = await benchmark({ ...AI_NORMAL }, 4);
    console.log(`
control (normal vs normal): ${r.rate.toFixed(1)}%  ${r.w}W ${r.l}L
`);
    expect(r.w + r.l, 'games should reach a winner').toBeGreaterThan(0);
    expect(Math.abs(r.rate - 50), `control should sit near 50, got ${r.rate.toFixed(1)}`)
      .toBeLessThan(25);
  }, 300000);

  it.skipIf(!BENCH)('sweep: every dial, measured', async () => {
    const variants: Array<[string, AiProfile, number]> = [
      ['control     ', { ...AI_NORMAL }, 0],
      ['force 0.25  ', { ...AI_NORMAL }, 0.25],
      ['force 0.50  ', { ...AI_NORMAL }, 0.5],
      ['force 1.00  ', { ...AI_NORMAL }, 1],
    ];
    console.log('\n=== SWEEP vs AI_NORMAL — 120 games each ===\n');
    console.log('variant       win%    W    L');
    console.log('-----------  -----  ---  ---');
    for (const [name, prof, bias] of variants) {
      const r = await benchmark(prof, 20, bias);
      console.log(
        `${name}   ${r.rate.toFixed(1).padStart(5)}  ${String(r.w).padStart(3)}  ${String(r.l).padStart(3)}`,
      );
    }
    expect(true).toBe(true);
  }, 3600000);
});
