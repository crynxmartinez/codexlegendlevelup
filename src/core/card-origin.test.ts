import { expect, it } from 'vitest';
import { createGame } from './setup.js';
import { FULL_INDEX as index } from '../data/loader.js';
import deck from '../../decks/maguindanao-set-1.json';
import { publicCardOrigin } from './card-origin.js';
import { moveCard } from './state.js';
it('records public positions without exposing hidden cards or following later movement', () => {
  const game = createGame(index, [deck, deck], { seed: 7 });
  const ps = game.players[0];
  expect(publicCardOrigin(index, game, ps.hand[0]!)).toBeUndefined();
  expect(publicCardOrigin(index, game, ps.deck[0]!)).toBeUndefined();
  const uid = ps.hand[0]!;
  moveCard(game, uid, 'ally', { slot: 1 });
  const origin = publicCardOrigin(index, game, uid)!;
  moveCard(game, uid, 'grave');
  expect(origin.zone).toBe('ally'); expect(origin.slot).toBe(1);
  game.cards[uid]!.faceDown = true;
  expect(publicCardOrigin(index, game, uid)).toBeUndefined();
});
