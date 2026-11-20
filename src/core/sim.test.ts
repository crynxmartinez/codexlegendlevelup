/** Full-game simulation: AI vs AI, driving the real action API. */
import { describe, expect, it } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import { indexForDeck } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { you } from './state.js';

const index = indexForDeck('Agta');
const deck = agtaDeck as unknown as DeckList;

async function playGame(seed: number, maxTurns = 100) {
  const game = createGame(index, [deck, deck], { seed });
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });

  let turns = 0;
  while (game.winner === null && turns < maxTurns) {
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer);
    turns++;
  }
  return { game, turns };
}

describe('AI vs AI simulation', () => {
  it('plays a full game to a winner', async () => {
    const { game, turns } = await playGame(1);
    expect(game.winner).not.toBeNull();
    expect(turns).toBeGreaterThan(1);
  }, 30000);

  it('produces a winner across many seeds without crashing', async () => {
    const results: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const { game, turns } = await playGame(seed);
      expect(game.winner).not.toBeNull();
      results.push(turns);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    // Sanity: games should not be instant, nor drag to the cap.
    expect(avg).toBeGreaterThan(2);
    expect(avg).toBeLessThan(100);
  }, 60000);

  it('never leaves a player with an Energy field or an over-full board', async () => {
    const { game } = await playGame(5);
    for (const p of [0, 1] as const) {
      const ps = you(game, p);
      expect(ps.energy).toBeUndefined();
      expect(ps.allies.filter(Boolean).length).toBeLessThanOrEqual(4);
      expect(ps.barriers.length).toBeLessThanOrEqual(5);
    }
  }, 30000);
});
