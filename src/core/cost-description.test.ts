import { expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { autoChooser, ILLANA_BAY_ID } from './effects.js';
import { offerCost, ventPayment } from './activation.js';
import { inst, moveCard } from './state.js';

it('describes the real available Offer value before and after Illana Bay is used', () => {
  const game = createGame(index, [deck, deck], { seed: 1 }), ps = game.players[0];
  game.turnNumber = 4; const codex = ps.codex[0]!;
  inst(game, codex).defId = ILLANA_BAY_ID; ps.activeCodex = codex;
  const ctx = { game, index, me: 0 as const, source: ps.persona!, chooser: autoChooser };
  const unit = ps.deck[0]!; moveCard(game, unit, 'ally', { slot: 0 });
  expect(offerCost(2).describe!(ctx).missing).toBeUndefined();
  ps.firstOfferTurn = 4;
  expect(offerCost(2).describe!(ctx).missing).toContain('1 more Offer');
});
it('shows a Heart shortage without spending or moving anything', () => {
  const game = createGame(index, [deck, deck], { seed: 1 }), ps = game.players[0];
  const ctx = { game, index, me: 0 as const, source: ps.persona!, chooser: autoChooser };
  const before = structuredClone(game);
  expect(ventPayment(6).describe!(ctx)).toEqual({ label: 'Kalas 6', missing: 'Need 6 more cards in Heart' });
  expect(game).toEqual(before);
});
it('previews Sinogo discounts from the real Heart threshold and source subtype', () => {
  const game = createGame(index, [deck, deck], { seed: 1 }), ps = game.players[0];
  inst(game, ps.persona!).defId = 'babaylan/set-1/abyssal-revolt-sinogo';
  const source = ps.deck[0]!;
  inst(game, source).defId = Object.values(index).find(d => d.type === 'Unit' && d.subtypes.includes('Bird'))!.id;
  ps.deck.slice(1, 13).forEach(u => moveCard(game, u, 'heart'));
  const ctx = { game, index, me: 0 as const, source, chooser: autoChooser };
  expect(ventPayment(5).describe!(ctx).label).toBe('Kalas 3 (5 − 2)');
  moveCard(game, ps.heart[0]!, 'grave');
  expect(ventPayment(5).describe!(ctx).label).toBe('Kalas 5');
});
