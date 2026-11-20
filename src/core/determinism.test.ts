import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';

const index = indexForDecks(['Agta', 'Babaylan']);

async function runOne(seed: number) {
  const game = createGame(
    index,
    [agtaDeck as unknown as DeckList, babaylanDeck as unknown as DeckList],
    { seed },
  );
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  let turns = 0;
  while (game.winner === null && turns < 80) {
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer);
    turns++;
  }
  return { winner: game.winner, turns, logLen: game.log.length };
}

describe('determinism', () => {
  it('the same seed produces the same game twice', async () => {
    for (const seed of [1, 2, 3]) {
      const a = await runOne(seed);
      const b = await runOne(seed);
      expect(b, `seed ${seed}`).toEqual(a);
    }
  });
});
