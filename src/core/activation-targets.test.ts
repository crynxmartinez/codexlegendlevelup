import { describe, expect, it, vi } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { CANCEL_DRAFT, autoChooser, type EffectContext } from './effects.js';
import { inst, moveCard, you } from './state.js';
import { commitCost, planCards } from './activation.js';
import { prepareTargets, withDeclaredTargets } from './activation-targets.js';

function setup() {
  const game = createGame(index, [deck, deck], { seed: 25 });
  const ps = you(game, 0);
  const target = ps.hand[0]!;
  moveCard(game, target, 'ally', { slot: 0 });
  const ctx: EffectContext = { game, index, me: 0, source: ps.persona!, chooser: autoChooser };
  return { ctx, game, target };
}

describe('declared targets and atomic payment', () => {
  it.each([true, false])('cancels optional draft targets without paying (multiple=%s)', async many => {
    const {ctx,game,target} = setup();
    ctx.chooser = { ...autoChooser, chooseTarget: async () => CANCEL_DRAFT, chooseCards: async () => [CANCEL_DRAFT] };
    const choices = await prepareTargets(ctx, planCards(ctx,[target],'offer'), [{prompt:'Optional revive',pool:c=>you(c.game,0).grave,optional:true,...(many?{count:1}:{})}]);
    expect(choices).toBeNull(); expect(inst(game,target).zone).toBe('ally'); expect(game.pendingDamageByAbility).toHaveLength(0);
  });
  it('still allows choosing none for optional targets without cancelling the draft', async () => {
    const {ctx,target} = setup();
    ctx.chooser = { ...autoChooser, chooseTarget: async () => null };
    expect(await prepareTargets(ctx,{cards:[]},[{prompt:'Optional buff',pool:()=>[target],optional:true}])).toEqual([{prompt:'Optional buff',many:false,targets:[]}]);
  });
  it('projects an Offered target privately, then resolves that same Grave entry', async () => {
    const { ctx, game, target } = setup();
    const payment = planCards(ctx, [target], 'offer');
    const choices = await prepareTargets(ctx, payment, [{ prompt: 'Revive', pool: c => [...you(c.game, 0).grave] }]);
    expect(inst(game, target).zone).toBe('ally');
    expect(game.pendingDamageByAbility).toHaveLength(0);
    commitCost(ctx, payment);
    const invalid = vi.fn();
    expect(await withDeclaredTargets(ctx, choices!, invalid).chooser.chooseTarget(0, 'Revive', [target])).toBe(target);
    expect(invalid).not.toHaveBeenCalled();
  });

  it('does not retarget a card that leaves and returns to the same zone', async () => {
    const { ctx, game, target } = setup();
    const choices = await prepareTargets(ctx, { cards: [] }, [{ prompt: 'Buff', pool: () => [target] }]);
    moveCard(game, target, 'grave');
    moveCard(game, target, 'ally', { slot: 0 });
    const picker = vi.fn();
    ctx.chooser = { ...autoChooser, chooseTarget: picker };
    const invalid = vi.fn();
    expect(await withDeclaredTargets(ctx, choices!, invalid).chooser.chooseTarget(0, 'Buff', [target])).toBeNull();
    expect(invalid).toHaveBeenCalledOnce();
    expect(invalid).toHaveBeenCalledWith('left-field');
    expect(picker).not.toHaveBeenCalled();
  });

  it('reports changed eligibility while preserving other selected targets', async () => {
    const { ctx, target } = setup();
    const other = ctx.game.players[0].persona!;
    const choices = await prepareTargets(ctx, { cards: [] }, [{ prompt: 'Buff two', pool: () => [target, other], count: 2 }]);
    const invalid = vi.fn();
    expect(await withDeclaredTargets(ctx, choices!, invalid).chooser.chooseCards(0, 'Buff two', [other], 2)).toEqual([other]);
    expect(invalid).toHaveBeenCalledWith('no-longer-eligible');
  });

  it('cancelling targets leaves every payment unspent', async () => {
    const { ctx, game, target } = setup();
    ctx.chooser = { ...autoChooser, chooseTarget: async () => null };
    const choices = await prepareTargets(ctx, planCards(ctx, [target], 'offer'), [{ prompt: 'Revive', pool: c => [...you(c.game, 0).grave] }]);
    expect(choices).toBeNull();
    expect(inst(game, target).zone).toBe('ally');
    expect(game.pendingDamageByAbility).toHaveLength(0);
  });

  it('rejects a stale cost even after its card returns to hand', () => {
    const { ctx, game, target } = setup();
    moveCard(game, target, 'hand');
    const payment = planCards(ctx, [target], 'discard');
    moveCard(game, target, 'grave');
    moveCard(game, target, 'hand');
    expect(commitCost(ctx, payment)).toBeNull();
    expect(inst(game, target).zone).toBe('hand');
  });
});
