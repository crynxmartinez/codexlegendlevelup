/**
 * Deck-out: the player who cannot draw loses.
 *
 * The rule itself has always been in `draw()`. What was missing is everything
 * around it — the turn carried on as though nothing had happened, so a player
 * who had already lost was still offered a Personify prompt and a full Main
 * phase, and the result screen then told them their last Barrier fell, which
 * was not what happened.
 *
 * These guard the shape of the ending, not the arithmetic.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser } from '../ai/bot.js';
import { you } from './state.js';

function freshGame() {
  const decks: [DeckList, DeckList] = [
    agtaDeck as unknown as DeckList,
    maguindanaoDeck as unknown as DeckList,
  ];
  const index = indexForDecks(['Agta', 'Maguindanao']);
  const game = createGame(index, decks, { seed: 5 });
  game.turnNumber = 3; // Test a required draw, not the skipped opening draw.
  const ai = new AiChooser(index, () => game);

  // Count the prompts, because "was this player given a turn?" is a question
  // about what they were asked, not about a phase label.
  const prompts = { personify: 0 };
  const chooser = Object.create(ai) as AiChooser;
  chooser.personifyPrompt = async (p, candidates) => {
    prompts.personify++;
    return ai.personifyPrompt(p, candidates);
  };

  const gc = new GameController(game, index, { choosers: [chooser, chooser] });
  return { game, gc, prompts };
}

it('a player who cannot draw loses, and their opponent wins', async () => {
  const { game, gc } = freshGame();
  const p = game.turnPlayer;
  you(game, p).deck.length = 0;

  await gc.beginTurn();

  expect(game.winner).toBe(p === 0 ? 1 : 0);
});

it('records deck-out as the reason, so the result screen can say so', async () => {
  const { game, gc } = freshGame();
  you(game, game.turnPlayer).deck.length = 0;

  await gc.beginTurn();

  expect(game.winReason).toBe('deckout');
});

it('does not hand a turn to a player who has already lost', async () => {
  const { game, gc, prompts } = freshGame();
  const p = game.turnPlayer;
  const ps = you(game, p);
  ps.deck.length = 0;
  const handBefore = ps.hand.length;

  await gc.beginTurn();

  // Reaching the Main phase, or being asked to Personify, means a whole turn
  // was handed to someone who had already lost the game.
  expect(game.phase).not.toBe('main');
  expect(prompts.personify).toBe(0);
  expect(ps.hand.length).toBe(handBefore);
});

it('a normal turn still reaches the Main phase', async () => {
  const { game, gc } = freshGame();

  await gc.beginTurn();

  expect(game.winner).toBeNull();
  expect(game.winReason).toBeNull();
  expect(game.phase).toBe('main');
});
