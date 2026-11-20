/**
 * Conceding.
 *
 * A player who has clearly lost had no way out of a duel but closing the tab,
 * which is a worse experience than losing and costs us whatever they would
 * have told us afterwards.
 *
 * The interesting case is the second test: a concede arriving after the game
 * is already decided must not rewrite the ending. A click landing during the
 * winning animation should not turn a victory into a surrender.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser } from '../ai/bot.js';

function freshGame() {
  const decks: [DeckList, DeckList] = [
    agtaDeck as unknown as DeckList,
    maguindanaoDeck as unknown as DeckList,
  ];
  const index = indexForDecks(['Agta', 'Maguindanao']);
  const game = createGame(index, decks, { seed: 11 });
  const ai = new AiChooser(index, () => game);
  const gc = new GameController(game, index, { choosers: [ai, ai] });
  return { game, gc };
}

it('conceding hands the duel to the opponent, and says why', () => {
  const { game, gc } = freshGame();

  expect(gc.concede(0)).toBe(true);

  expect(game.winner).toBe(1);
  expect(game.winReason).toBe('surrender');
});

it('conceding cannot rewrite an ending that already happened', () => {
  const { game, gc } = freshGame();

  // Player 0 has already won on Barriers.
  game.winner = 0;
  game.winReason = 'barrier';

  expect(gc.concede(0)).toBe(false);

  expect(game.winner).toBe(0);
  expect(game.winReason).toBe('barrier');
});

it('either player can concede', () => {
  const { game, gc } = freshGame();

  expect(gc.concede(1)).toBe(true);
  expect(game.winner).toBe(0);
});
