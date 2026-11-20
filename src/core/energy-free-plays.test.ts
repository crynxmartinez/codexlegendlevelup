import { describe, expect, it } from 'vitest';
import deck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser, type Chooser } from './effects.js';
import { def, inst, maxPlays, moveCard, you } from './state.js';

function setup() {
  const game = createGame(index, [deck as never, deck as never], { seed: 5, firstPlayer: 0 });
  game.phase = 'main';
  for (const p of [0, 1] as const) you(game, p).activeCodex = null;
  const ps = you(game, 0);
  const quiet: Chooser = { ...autoChooser, chooseAbility: async () => null };
  const ctrl = new GameController(game, index, { choosers: [quiet, quiet] });
  return { game, ps, ctrl, quiet };
}

describe('only normal calls and Actions spend plays', () => {
  it('using a Force hand skill does not use a play even at zero remaining plays', async () => {
    const { game, ps, ctrl, quiet } = setup();
    const uid = Object.values(game.cards).find(c => c.owner === 0 && ALL_SCRIPTS[c.defId]?.forceModes?.some(m => m.response === 'attack'))!.uid;
    moveCard(game, uid, 'hand');
    game.phase = 'battle'; game.turnPlayer = 1;
    ps.normalPlaysUsed = maxPlays(index, game, 0);
    const before = ps.normalPlaysUsed;
    quiet.chooseAbility = async (_p, _q, choices) => {
      const selected = choices.findIndex(c => c.uid === uid);
      return selected < 0 ? null : selected;
    };
    await ctrl.perform({ kind: 'attack', attacker: you(game, 1).persona!, target: null, supporters: [] }, 1);
    expect(ps.normalPlaysUsed).toBe(before);
    expect(inst(game, uid).zone).toBe('grave');
  });

  it('relocates at zero remaining plays without resetting charge or allowing a second move', async () => {
    const { game, ps, ctrl } = setup();
    const uid = Object.values(game.cards).find(c => c.owner === 0 && c.zone === 'deck' && def(index, game, c.uid).type === 'Unit')!.uid;
    moveCard(game, uid, 'ally', { slot: 0 });
    inst(game, uid).exhausted = true;
    ps.normalPlaysUsed = maxPlays(index, game, 0);
    const before = ps.normalPlaysUsed;
    const action = { kind: 'relocate' as const, uid, toSlot: 1 };
    expect(ctrl.legalActions(0)).toContainEqual(action);
    await ctrl.perform(action, 0);
    expect(ps.allies[1]).toBe(uid);
    expect(ps.normalPlaysUsed).toBe(before);
    expect(inst(game, uid).exhausted).toBe(true);
    expect(ctrl.legalActions(0).some(a => a.kind === 'relocate' && a.uid === uid)).toBe(false);
  });
});
