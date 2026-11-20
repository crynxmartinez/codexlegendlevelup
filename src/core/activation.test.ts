import { describe, expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { autoChooser, type EffectContext } from './effects.js';
import { inst, moveCard, you } from './state.js';
import { commitCost, prepareOffer } from './activation.js';

function setup() {
  const game = createGame(index, [deck as never, deck as never], { seed: 25 });
  const ps = you(game, 0);
  const cards = Object.values(game.cards).filter(c => c.owner === 0 && c.zone === 'deck').slice(0, 3).map(c => c.uid);
  cards.forEach((uid, slot) => moveCard(game, uid, 'ally', { slot }));
  const ctx: EffectContext = { index, game, me: 0, source: ps.persona!, chooser: autoChooser };
  return { game, cards, ctx };
}

describe('activation costs precede effects atomically', () => {
  it('prepares all Offer choices without moving anything, then pays the entire batch', async () => {
    const { game, cards, ctx } = setup();
    const plan = await prepareOffer(ctx, 3, cards);
    expect(cards.map(uid => inst(game, uid).zone)).toEqual(['ally', 'ally', 'ally']);
    const receipt = commitCost(ctx, plan!);
    expect(receipt?.offered).toEqual(cards);
    expect(cards.map(uid => inst(game, uid).zone)).toEqual(['grave', 'grave', 'grave']);
    expect(game.pendingDamageByAbility.filter(e => e.offered)).toHaveLength(3);
  });
  it('rejects stale payment without taking the other cards', async () => {
    const { game, cards, ctx } = setup();
    const plan = await prepareOffer(ctx, 3, cards);
    moveCard(game, cards[2]!, 'hand');
    expect(commitCost(ctx, plan!)).toBeNull();
    expect(cards.slice(0, 2).every(uid => inst(game, uid).zone === 'ally')).toBe(true);
    expect(game.pendingDamageByAbility).toHaveLength(0);
  });
  it('cancellation or duplicate UID cannot pay Offer 3', async () => {
    const { ctx, cards } = setup();
    ctx.chooser = { ...autoChooser, chooseCards: async () => [] };
    expect(await prepareOffer(ctx, 3, cards)).toBeNull();
    ctx.chooser = { ...autoChooser, chooseCards: async () => [cards[0]!, cards[0]!, cards[0]!] };
    expect(await prepareOffer(ctx, 3, cards)).toBeNull();
  });
});
