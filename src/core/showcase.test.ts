/**
 * Find a seed worth recording.
 *
 * Games are deterministic from their seed, so a good match can be found once
 * and replayed identically forever — for an attract loop on the site, or as
 * the take you screen-record.
 *
 * Opt-in, like the playtest:  SHOWCASE=1 npx vitest run src/core/showcase.test.ts
 */
import { it } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { you } from './state.js';

declare const process: { env: Record<string, string | undefined> };
const ENABLED = process.env.SHOWCASE === '1';

const index = indexForDecks(['Agta', 'Babaylan', 'Maguindanao']);
const DECKS: Record<string, DeckList> = {
  Luzon: agtaDeck as unknown as DeckList,
  Visayas: babaylanDeck as unknown as DeckList,
  Mindanao: magDeck as unknown as DeckList,
};

interface Scored {
  a: string;
  b: string;
  seed: number;
  turns: number;
  score: number;
  why: string[];
  finalBarriers: [number, number];
}

/**
 * What makes a match worth watching, rather than merely valid.
 *
 * A blowout teaches a viewer nothing and a 40-turn grind loses them. What
 * shows the game off is a contested board where both Codex States come online
 * and the last Barrier actually matters.
 */
function scoreMatch(log: string[], turns: number, b0: number, b1: number): { score: number; why: string[] } {
  const text = log.join('\n');
  const why: string[] = [];
  let score = 0;

  const states = (text.match(/released/gi) ?? []).length;
  if (states >= 2) { score += 30; why.push(`${states} State releases`); }
  else if (states === 1) { score += 12; why.push('1 State release'); }

  // A close finish: the loser still had Barriers standing.
  const loserLeft = Math.max(b0, b1);
  if (loserLeft >= 2) { score += 25; why.push(`close finish (${loserLeft} Barriers left)`); }
  else if (loserLeft === 1) { score += 15; why.push('narrow finish'); }

  // Length: long enough to develop, short enough to hold attention.
  if (turns >= 11 && turns <= 18) { score += 25; why.push(`${turns} turns`); }
  else if (turns >= 9 && turns <= 22) { score += 10; why.push(`${turns} turns`); }

  // Signature mechanics actually appearing.
  for (const [re, pts, label] of [
    [/personified/i, 12, 'a Personify'],
    [/special called/i, 8, 'special calls'],
    [/Offered/i, 8, 'Offers'],
    [/Sentry/i, 10, 'a Sentry save'],
    [/Sipol/i, 8, 'Sipol'],
  ] as [RegExp, number, string][]) {
    if (re.test(text)) { score += pts; why.push(label); }
  }

  return { score, why };
}

it.skipIf(!ENABLED)('find a showcase seed', async () => {
  const names = Object.keys(DECKS);
  const results: Scored[] = [];

  for (const a of names) {
    for (const b of names) {
      if (a === b) continue;
      for (let seed = 1; seed <= 60; seed++) {
        const game = createGame(index, [DECKS[a]!, DECKS[b]!], { seed });
        const chooser = new AiChooser(index, () => game);
        const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
        let turns = 0;
        while (game.winner === null && turns < 40) {
          await ctrl.beginTurn();
          await playAiTurn(ctrl, game.turnPlayer);
          turns++;
        }
        if (game.winner === null) continue;
        const b0 = you(game, 0).barriers.length;
        const b1 = you(game, 1).barriers.length;
        const { score, why } = scoreMatch(game.log, turns, b0, b1);
        results.push({ a, b, seed, turns, score, why, finalBarriers: [b0, b1] });
      }
    }
  }

  results.sort((x, y) => y.score - x.score);
  console.log(`\n=== best matches to record (${results.length} scored) ===\n`);
  for (const r of results.slice(0, 8)) {
    console.log(
      `  ${r.a} vs ${r.b}  seed ${String(r.seed).padStart(2)}  ` +
      `score ${String(r.score).padStart(3)}  ${r.turns} turns  ` +
      `barriers ${r.finalBarriers[0]}-${r.finalBarriers[1]}`,
    );
    console.log(`      ${r.why.join(', ')}`);
  }
});
