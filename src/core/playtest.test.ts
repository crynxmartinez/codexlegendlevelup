/**
 * Cross-deck playtest: runs all decks against each other (both directions)
 * and prints win rates, turn counts, and unfinished games.
 *
 * This asserts nothing — it is a balance *measurement*, not a correctness
 * test, and since the AI started playing out candidate actions it costs
 * minutes rather than seconds. It is therefore opt-in:
 *
 *     PLAYTEST=1 npx vitest run src/core/playtest.test.ts
 *
 * Games are seeded, so two runs of the same build give identical numbers.
 */
import { it } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
  Babaylan: babaylanDeck as unknown as DeckList,
};

const DECK_NAMES = Object.keys(DECKS);
// Full card index covering all decks.
const index = indexForDecks(DECK_NAMES);

// Declared locally rather than pulling in @types/node for two lookups.
declare const process: { env: Record<string, string | undefined> };

const ENABLED = process.env.PLAYTEST === '1';
const GAMES_PER_MATCHUP = Number(process.env.PLAYTEST_GAMES ?? 10);
const MAX_TURNS = 80;

interface MatchResult {
  p0Wins: number;
  p1Wins: number;
  unfinished: number;
  turns: number[];
}

it.skipIf(!ENABLED)('cross-deck playtest — all matchups', async () => {
  const results: Record<string, Record<string, MatchResult>> = {};
  for (const name of DECK_NAMES) results[name] = {};

  for (const deckA of DECK_NAMES) {
    for (const deckB of DECK_NAMES) {
      if (deckA === deckB) continue;
      const res: MatchResult = { p0Wins: 0, p1Wins: 0, unfinished: 0, turns: [] };
      for (let seed = 1; seed <= GAMES_PER_MATCHUP; seed++) {
        const game = createGame(index, [DECKS[deckA]!, DECKS[deckB]!], { seed });
        const chooser = new AiChooser(index, () => game);
        const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
        let turns = 0;
        while (game.winner === null && turns < MAX_TURNS) {
          await ctrl.beginTurn();
          await playAiTurn(ctrl, game.turnPlayer);
          turns++;
        }
        if (game.winner === null) res.unfinished++;
        else if (game.winner === 0) res.p0Wins++;
        else res.p1Wins++;
        res.turns.push(turns);
      }
      results[deckA]![deckB] = res;
    }
  }

  // Print summary table.
  console.log('\n=== CROSS-DECK PLAYTEST RESULTS ===\n');
  console.log('Deck A       vs Deck B        A wins  B wins  draw  avg turns');
  console.log('------------    ------------   ------  ------  ----  ---------');

  const allTurns: number[] = [];
  let totalUnfinished = 0;
  let totalGames = 0;

  for (const deckA of DECK_NAMES) {
    for (const deckB of DECK_NAMES) {
      if (deckA === deckB) continue;
      const r = results[deckA]![deckB]!;
      const avgTurns = (r.turns.reduce((a, b) => a + b, 0) / r.turns.length).toFixed(1);
      console.log(
        `${deckA.padEnd(12)} vs ${deckB.padEnd(12)}  ${String(r.p0Wins).padStart(6)}  ${String(r.p1Wins).padStart(6)}  ${String(r.unfinished).padStart(4)}  ${avgTurns.padStart(9)}`,
      );
      allTurns.push(...r.turns);
      totalUnfinished += r.unfinished;
      totalGames += GAMES_PER_MATCHUP;
    }
  }

  // Per-deck aggregate win rates.
  console.log('\n=== PER-DECK WIN RATES ===\n');
  const winCounts: Record<string, { wins: number; games: number }> = {};
  for (const name of DECK_NAMES) winCounts[name] = { wins: 0, games: 0 };

  for (const deckA of DECK_NAMES) {
    for (const deckB of DECK_NAMES) {
      if (deckA === deckB) continue;
      const r = results[deckA]![deckB]!;
      winCounts[deckA]!.wins += r.p0Wins;
      winCounts[deckA]!.games += GAMES_PER_MATCHUP;
      winCounts[deckB]!.wins += r.p1Wins;
      winCounts[deckB]!.games += GAMES_PER_MATCHUP;
    }
  }

  for (const name of DECK_NAMES) {
    const w = winCounts[name]!;
    const rate = ((w.wins / w.games) * 100).toFixed(1);
    console.log(`  ${name.padEnd(12)} ${String(w.wins).padStart(3)}/${w.games} wins (${rate}%)`);
  }

  console.log(`\nTotal games: ${totalGames}`);
  console.log(`Unfinished: ${totalUnfinished} (${((totalUnfinished / totalGames) * 100).toFixed(1)}%)`);
  console.log(`Average turns: ${(allTurns.reduce((a, b) => a + b, 0) / allTurns.length).toFixed(1)}`);

  // Sanity: no crashes, reasonable finish rate.
  const finishRate = ((totalGames - totalUnfinished) / totalGames) * 100;
  if (finishRate < 80) {
    throw new Error(`Too many unfinished games: ${totalUnfinished}/${totalGames} (${finishRate.toFixed(1)}% finish rate)`);
  }
}, 300000);
