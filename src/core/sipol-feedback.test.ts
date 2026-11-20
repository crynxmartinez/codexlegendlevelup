import { expect, it } from 'vitest';
import deck from '../../decks/babaylan-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { autoChooser, sipol, type EffectContext } from './effects.js';

it('reports bottom only after the revealed non-Unit reaches the bottom', async () => {
  const game = createGame(index, [deck, deck], { seed: 18 });
  const player = game.players[0]; player.activeCodex = null;
  const uid = player.deck.find(u => index[game.cards[u]!.defId]!.type === 'Action')!;
  expect(uid).toBeTruthy();
  player.deck.splice(player.deck.indexOf(uid), 1); player.deck.unshift(uid);
  const ctx: EffectContext = { game, index, me: 0, source: player.persona!, chooser: autoChooser };
  expect(await sipol(ctx)).toBe(false);
  expect(player.deck.at(-1)).toBe(uid);
  expect(game.pendingFx.at(-1)).toEqual({ kind: 'sipolResult', player: 0, result: 'bottom' });
});
it('reports an empty Deck without consuming a Sipol or claiming a reveal', async () => {
  const game = createGame(index, [deck, deck], { seed: 18 });
  const player = game.players[0]; player.deck.length = 0;
  const before = player.sipolThisTurn;
  expect(await sipol({ game, index, me: 0, source: player.persona!, chooser: autoChooser })).toBe(false);
  expect(player.sipolThisTurn).toBe(before);
  expect(game.pendingFx.at(-1)).toEqual({ kind: 'sipolResult', player: 0, result: 'empty' });
});
