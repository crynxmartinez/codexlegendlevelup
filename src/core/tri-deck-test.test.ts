/**
 * 3-deck round-robin playtest: Babaylan vs Agta vs Maguindanao.
 * Reports win rates and how each deck wins.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { you } from './state.js';

const DECKS: Record<string, DeckList> = {
  Babaylan: babaylanDeck as unknown as DeckList,
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
};

const DECK_NAMES = Object.keys(DECKS);
const index = indexForDecks(DECK_NAMES);
const GAMES_PER_MATCHUP = 30;
const MAX_TURNS = 80;

interface WinBreakdown {
  barrierBreak: number;   // Won after breaking all barriers
  deckOut: number;        // Opponent decked out
  other: number;          // Other (timeout, etc)
}

it('3-deck round robin — Babaylan vs Agta vs Maguindanao', async () => {
  const stats: Record<string, { wins: number; losses: number; games: number; breakdown: WinBreakdown; turns: number[] }> = {};
  for (const d of DECK_NAMES) {
    stats[d] = { wins: 0, losses: 0, games: 0, breakdown: { barrierBreak: 0, deckOut: 0, other: 0 }, turns: [] };
  }

  // Track head-to-head
  const h2h: Record<string, Record<string, { aWins: number; bWins: number; aBreak: number; aDeck: number; bBreak: number; bDeck: number }> > = {};
  for (const d of DECK_NAMES) h2h[d] = {};

  for (const deckA of DECK_NAMES) {
    for (const deckB of DECK_NAMES) {
      if (deckA >= deckB) continue; // each pair once
      h2h[deckA]![deckB] = { aWins: 0, bWins: 0, aBreak: 0, aDeck: 0, bBreak: 0, bDeck: 0 };

      for (let seed = 1; seed <= GAMES_PER_MATCHUP; seed++) {
        // Alternate who is player 0.
        let game;
        if (seed % 2 === 1) {
          game = createGame(index, [DECKS[deckA]!, DECKS[deckB]!], { seed });
        } else {
          game = createGame(index, [DECKS[deckB]!, DECKS[deckA]!], { seed });
        }
        const chooser = new AiChooser(index, () => game);
        const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });

        let turns = 0;
        while (game.winner === null && turns < MAX_TURNS) {
          await ctrl.beginTurn();
          await playAiTurn(ctrl, game.turnPlayer);
          turns++;
        }

        // Determine winner and loser deck names.
        const winnerIsA = (seed % 2 === 1 && game.winner === 0) || (seed % 2 === 0 && game.winner === 1);
        const winnerDeck = winnerIsA ? deckA : (game.winner === null ? '' : deckB);
        const loserPlayer = game.winner === 0 ? 1 : 0;
        const loser = game.winner !== null ? you(game, loserPlayer) : null;

        if (game.winner !== null) {
          stats[winnerDeck]!.wins++;
          stats[winnerDeck]!.games++;
          stats[winnerDeck]!.turns.push(turns);

          const otherDeck = winnerDeck === deckA ? deckB : deckA;
          stats[otherDeck]!.losses++;
          stats[otherDeck]!.games++;
          stats[otherDeck]!.turns.push(turns);

          // Classify the win.
          let winType = 'other';
          if (loser && loser.deck.length === 0) {
            stats[winnerDeck]!.breakdown.deckOut++;
            winType = 'deckOut';
          } else if (loser && loser.barriers.every(b => b === null)) {
            stats[winnerDeck]!.breakdown.barrierBreak++;
            winType = 'barrierBreak';
          } else {
            stats[winnerDeck]!.breakdown.other++;
          }

          // Head-to-head tracking.
          const h = h2h[deckA]![deckB]!;
          if (winnerIsA) {
            h.aWins++;
            if (winType === 'barrierBreak') h.aBreak++;
            if (winType === 'deckOut') h.aDeck++;
          } else {
            h.bWins++;
            if (winType === 'barrierBreak') h.bBreak++;
            if (winType === 'deckOut') h.bDeck++;
          }
        }
      }
    }
  }

  // Print results.
  console.log('\n=== 3-DECK ROUND ROBIN ===\n');
  console.log(`Games per matchup: ${GAMES_PER_MATCHUP} (each side)\n`);

  for (const d of DECK_NAMES) {
    const s = stats[d]!;
    const wr = ((s.wins / s.games) * 100).toFixed(1);
    const avgTurns = (s.turns.reduce((a, b) => a + b, 0) / s.turns.length).toFixed(1);
    console.log(`${d.padEnd(15)} ${s.wins}/${s.games} wins (${wr}%)  avg ${avgTurns} turns`);
    console.log(`  Wins by — Barrier break: ${s.breakdown.barrierBreak}, Deck-out: ${s.breakdown.deckOut}, Other: ${s.breakdown.other}`);
  }

  // Head-to-head
  console.log('\n--- Head to Head ---');
  for (const deckA of DECK_NAMES) {
    for (const deckB of DECK_NAMES) {
      if (deckA >= deckB) continue;
      const h = h2h[deckA]![deckB]!;
      const pctA = ((h.aWins / GAMES_PER_MATCHUP) * 100).toFixed(0);
      const pctB = ((h.bWins / GAMES_PER_MATCHUP) * 100).toFixed(0);
      console.log(`  ${deckA.padEnd(12)} vs ${deckB.padEnd(14)}  ${h.aWins}-${h.bWins}  (${pctA}%-${pctB}%)`);
      console.log(`    ${deckA} wins: ${h.aBreak} barrier break, ${h.aDeck} deck-out`);
      console.log(`    ${deckB} wins: ${h.bBreak} barrier break, ${h.bDeck} deck-out`);
    }
  }

  expect(true).toBe(true);
});
