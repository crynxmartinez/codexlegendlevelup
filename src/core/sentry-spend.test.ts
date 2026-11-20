/**
 * A Sentry is spent when it is used.
 *
 * Written after a report that the bot's Sentry "goes back to his hand" and
 * nullified every attack in a row. It does not: every reveal below is a
 * distinct physical card and every one of them ends face down in Exile. What
 * actually happens is the last test here — breaking a Barrier hands its owner
 * the card that was in it, and when that card is a Sentry the attacker has
 * just armed the player they are attacking.
 */
import { describe, expect, it } from 'vitest';
import deck from '../../decks/agta-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser } from './effects.js';
import { inst, moveCard, you } from './state.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import type { PlayerId, Zone } from './types.js';

const BANOY = 'agta/sierra-watchkeeper-banoy';
const FILLER = 'agta/set-1/path-turning-warden-tumatanan';

function board(seed = 5) {
  const game = createGame(index, [deck as never, deck as never], { seed, firstPlayer: 0 });
  game.turnPlayer = 0; game.turnNumber = 10; game.phase = 'battle';
  let n = 0;
  const put = (defId: string, owner: PlayerId, zone: Zone) => {
    const uid = `sp-${n++}`;
    game.cards[uid] = {
      ...structuredClone(inst(game, you(game, owner).persona!)),
      uid, defId, owner, zone: 'check', slot: null,
      exhausted: false, modifiers: [], usesThisTurn: {}, setOneUses: {}, fieldEntry: 0,
    };
    moveCard(game, uid, zone);
    return uid;
  };
  for (const p of [0, 1] as const) {
    const ps = you(game, p);
    ps.codexSwitchedThisTurn = true; ps.activeCodex = null;
    for (const uid of [...ps.hand]) moveCard(game, uid, 'deck');
  }
  return { game, put };
}

describe('a Sentry is spent when it is used', () => {
  it('goes to Exile, not back to hand', async () => {
    const { game, put } = board();
    const ai = new AiChooser(index, () => game);
    const ctrl = new GameController(game, index, { choosers: [ai, ai] });
    for (const uid of you(game, 1).barriers.slice(2)) moveCard(game, uid, 'grave');
    const banoy = put(BANOY, 1, 'hand');
    put(FILLER, 1, 'hand');

    const barriers = you(game, 1).barriers.length;
    await ctrl.perform(
      { kind: 'attack', attacker: you(game, 0).persona!, target: null, supporters: [] }, 0,
    );

    expect(inst(game, banoy).zone, 'exiled face down').toBe('exile');
    expect(you(game, 1).hand, 'and gone from the hand').not.toContain(banoy);
    expect(you(game, 1).barriers, 'the damage was nullified').toHaveLength(barriers);
  });

  it('cannot answer a second attack in the same turn', async () => {
    const { game, put } = board();
    const ai = new AiChooser(index, () => game);
    const reveals: string[] = [];
    const ctrl = new GameController(game, index, {
      choosers: [ai, ai],
      hooks: { onSentryRevealed: async (uid) => { reveals.push(uid); } },
    });
    for (const uid of you(game, 1).barriers.slice(2)) moveCard(game, uid, 'grave');
    put(BANOY, 1, 'hand');
    put(FILLER, 1, 'hand');
    const attacker = you(game, 0).persona!;

    for (let i = 0; i < 3; i++) {
      inst(game, attacker).exhausted = false;
      await ctrl.perform({ kind: 'attack', attacker, target: null, supporters: [] }, 0);
    }
    expect(reveals, 'one card, one reveal').toHaveLength(1);
  });

  it('is never revealed twice over a whole match, on any seed', async () => {
    for (const seed of [3, 5, 8, 11, 17, 23, 29, 31]) {
      const game = createGame(index, [deck as never, deck as never], { seed, firstPlayer: 0 });
      const ai = new AiChooser(index, () => game);
      const reveals: string[] = [];
      const ctrl = new GameController(game, index, {
        choosers: [ai, ai],
        hooks: { onSentryRevealed: async (uid) => { reveals.push(uid); } },
      });
      for (let t = 0; t < 40 && game.winner === null; t++) {
        await ctrl.beginTurn();
        if (game.winner !== null) break;
        await playAiTurn(ctrl, game.turnPlayer, undefined);
      }
      expect(new Set(reveals).size, `seed ${seed}: one reveal per card`).toBe(reveals.length);
      for (const uid of reveals) {
        expect(inst(game, uid).zone, `seed ${seed}: ${uid} ended in Exile`).toBe('exile');
      }
    }
  }, 60000);

  it('but a broken Barrier hands its owner the Sentry that was in it', async () => {
    // This is the loop that reads as reuse from the other side of the table:
    // the attack that breaks a Barrier is also the attack that arms the
    // defender with the next shield. Working as designed, and worth knowing.
    const { game, put } = board(9);
    // Isolate Barrier delivery from optional Codex switches and their skills.
    const quiet = { ...autoChooser, chooseTarget: async () => null, chooseAbility: async () => null };
    const ctrl = new GameController(game, index, { choosers: [quiet, quiet] });
    const defender = you(game, 1);

    // Barriers break from the front (`ps.barriers[0]` in battle.ts), so the
    // Sentry has to be the one at the front to be the one that breaks.
    const inBarrier = put(BANOY, 1, 'check');
    moveCard(game, defender.barriers[0]!, 'grave');
    moveCard(game, inBarrier, 'barrier');
    defender.barriers.splice(defender.barriers.indexOf(inBarrier), 1);
    defender.barriers.unshift(inBarrier);

    expect(defender.hand).not.toContain(inBarrier);
    await ctrl.perform(
      { kind: 'attack', attacker: you(game, 0).persona!, target: null, supporters: [] }, 0,
    );
    expect(defender.hand, 'the broken Barrier became a Sentry in hand').toContain(inBarrier);
  });
});
