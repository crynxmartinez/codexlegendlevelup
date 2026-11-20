import { expect, it, vi } from 'vitest';
import deck from '../../decks/agta-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { autoChooser, specialCall } from './effects.js';
import { RecordingChooser } from './replay.js';

it('passes the incoming card separately from its effect source through recording', async () => {
  const game = createGame(index, [deck, deck], { seed: 12 });
  const unit = game.players[0].deck.find(u => index[game.cards[u]!.defId]!.type === 'Unit')!;
  const source = game.players[0].activeCodex!;
  const chooseSlot = vi.fn(async () => 0);
  const chooser = new RecordingChooser({ ...autoChooser, chooseSlot });
  await specialCall({ game, index, me: 0, source, chooser }, unit);
  expect(chooseSlot).toHaveBeenCalledWith(0, expect.any(String), [0, 1, 2, 3], { incomingUid: unit });
  expect(source).not.toBe(unit);
  expect(game.players[0].allies[0]).toBe(unit);
});
