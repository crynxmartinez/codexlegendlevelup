import { describe, expect, it } from 'vitest';
import deck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser } from './effects.js';
import { inst, maxPlays, moveCard, you } from './state.js';

function scenario(broken: number) {
  const game = createGame(index, [deck as never, deck as never], { seed:5, firstPlayer:0 });
  game.phase = 'main'; game.turnPlayer = 0;
  const ps = you(game, 0);
  for (const p of [0, 1] as const) you(game, p).activeCodex = null;
  for (const uid of ps.barriers.slice(0, broken)) moveCard(game, uid, 'grave');
  const template = Object.values(game.cards).find(c => c.owner === 0 && c.defId === 'babaylan/set-1/the-elders-answer')!;
  let serial = 0;
  const addAction = () => {
    const uid = `play-limit-${serial++}`;
    game.cards[uid] = { ...structuredClone(template), uid, zone:'check', slot:null };
    moveCard(game, uid, 'hand'); return uid;
  };
  const ctrl = new GameController(game, index, { choosers:[autoChooser, autoChooser] });
  return { game, ps, ctrl, addAction };
}

describe('Action cards share the current normal-play allowance', () => {
  it('casts plays four through six without Energy and with three broken Barriers', async () => {
    const { game, ps, ctrl, addAction } = scenario(3);
    ps.normalPlaysUsed = 3;
    expect(maxPlays(index, game, 0)).toBe(6);
    for (let used = 3; used < 6; used++) {
      const uid = addAction();
      expect(ctrl.legalActions(0)).toContainEqual({ kind:'playAction', uid });
      await ctrl.perform({ kind:'playAction', uid }, 0);
      expect(ps.normalPlaysUsed).toBe(used + 1);
      expect(ps.energy).toBeUndefined();
      expect(inst(game, uid).zone).toBe('grave');
    }
    const seventh = addAction();
    expect(ps.energy).toBeUndefined();
    expect(ctrl.legalActions(0)).not.toContainEqual({ kind:'playAction', uid:seventh });
    expect(inst(game, seventh).zone).toBe('hand');
  });

  it.each([0, 1, 3, 5])('stops exactly at the displayed allowance with %i broken Barriers', broken => {
    const { game, ps, ctrl, addAction } = scenario(broken);
    const uid = addAction();
    const limit = maxPlays(index, game, 0);
    expect(limit).toBe(3 + broken);
    ps.normalPlaysUsed = limit - 1;
    expect(ctrl.legalActions(0)).toContainEqual({ kind:'playAction', uid });
    ps.normalPlaysUsed = limit;
    expect(ctrl.legalActions(0)).not.toContainEqual({ kind:'playAction', uid });
  });

  it('does not need a currency field when extra plays remain', () => {
    const { ps, ctrl, addAction } = scenario(3);
    const uid = addAction(); ps.normalPlaysUsed = 3;
    expect(ps.energy).toBeUndefined();
    expect(ctrl.legalActions(0)).toContainEqual({ kind:'playAction', uid });
  });
});
