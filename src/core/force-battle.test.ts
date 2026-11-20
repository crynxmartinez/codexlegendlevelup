/** Current rules: one committed response at a time, reverse resolution, no Energy. */
import { describe, expect, it } from 'vitest';
import deck from '../../decks/agta-set-1.json' with { type: 'json' };
import { AGTA_SET_ONE_IDS as ids } from '../cards/agta-set-1.js';
import { FULL_INDEX as index } from '../data/loader.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser, chargeUnit, type Chooser } from './effects.js';
import { currentPower, inst, moveCard, you } from './state.js';
import type { PlayerId, Zone } from './types.js';
const BUNOG = ids[20]!;
const BELET = ids[21]!;
const BANOY = 'agta/sierra-watchkeeper-banoy';
const choose = (fn: Chooser['chooseAbility']): Chooser => ({ ...autoChooser, chooseAbility: fn });
const decline = choose(async () => null);
const swing = (ctrl: GameController) => ctrl.perform({ kind: 'attack', attacker: you(ctrl.game, 0).persona!, target: null, supporters: [] }, 0);
function board() {
  const game = createGame(index, [deck as never, deck as never], { seed: 5, firstPlayer: 0 });
  game.turnPlayer = 0;
  game.turnNumber = 10;
  game.phase = 'main';
  let serial = 0;
  const put = (defId: string, owner: PlayerId, zone: Zone) => {
    const uid = `f-${serial++}`;
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
    ps.codexSwitchedThisTurn = true;
    ps.activeCodex = null;
    // The dealt hands are shuffled and hold Forces of their own, which would
    // decide for the chooser which card "the first Force" is. Empty them and
    // put back only what a test names.
    for (const uid of [...ps.hand]) moveCard(game, uid, 'deck');
  }
  return { game, put };
}


describe('Force hand timing and play accounting', () => {
  it.each(['main', 'battle'] as const)('does not spend its response card freely in %s', async phase => {
    const { game, put } = board(); game.phase = phase;
    const uid = put(BUNOG, 0, 'hand');
    const ctrl = new GameController(game, index, { choosers: [decline, decline] });
    const hero = you(game, 0).persona!;
    const before = currentPower(index, game, hero);
    you(game, 0).normalPlaysUsed = 99;
    expect(ctrl.legalActions(0)).not.toContainEqual({ kind: 'playForce', uid, mode: 1 });
    expect(ctrl.legalActions(0)).not.toContainEqual({ kind: 'playForce', uid, mode: 0 });
    await ctrl.perform({ kind: 'playForce', uid, mode: 1 }, 0);
    expect(currentPower(index, game, hero)).toBe(before);
    expect(you(game, 0).energy).toBeUndefined();
    expect(you(game, 0).normalPlaysUsed).toBe(99);
    expect(inst(game, uid).zone).toBe('hand');
  });
  it('offers no general hand action to the non-turn player', () => {
    const { game, put } = board(); put(BUNOG, 1, 'hand');
    const ctrl = new GameController(game, index);
    expect(ctrl.legalActions(1)).toEqual([]);
  });
});

describe('defending an attack', () => {
  it('offers Force/Sentry first, then only Units/Forces as blockers', async () => {
    const { game, put } = board(); game.phase = 'battle';
    const force = put(BELET, 1, 'hand'), unit = put(ids[10]!, 1, 'hand');
    const action = put(ids[22]!, 1, 'hand'), sentry = put(BANOY, 1, 'hand');
    const sequence: string[] = [];
    const defender: Chooser = { ...decline,
      chooseAbility: async (_p, _q, options, context) => {
        if (context?.kind === 'pending') return null;
        sequence.push('respond'); expect(options.map(o => o.uid)).toEqual([force, sentry]); return null;
      },
      blockPrompt: async (_p, _info, pool) => {
        sequence.push('block'); expect(pool).toEqual([force, unit]);
        return [action, sentry, force, unit, force];
      },
    };
    const ctrl = new GameController(game, index, { choosers: [decline, defender] });
    await swing(ctrl);
    expect(sequence).toEqual(['respond', 'block']);
    expect(inst(game, action).zone).toBe('hand'); expect(inst(game, sentry).zone).toBe('hand');
    expect(inst(game, force).zone).toBe('grave'); expect(inst(game, unit).zone).toBe('grave');
  });
  it('declining locks the chain; a second uncommitted Force remains in hand', async () => {
    const { game, put } = board(); game.phase = 'battle';
    const first = put(BELET, 1, 'hand'), later = put(BUNOG, 1, 'hand');
    const defender = choose(async (_p, _q, options, context) => context?.kind === 'battle' ? options.findIndex(o => o.uid === first) : null);
    const ctrl = new GameController(game, index, { choosers: [decline, defender] });
    await swing(ctrl);
    expect(inst(game, first).zone).toBe('grave'); expect(inst(game, later).zone).toBe('hand');
  });
  it('resolves committed links after a Sentry, without spending uncommitted cards', async () => {
    const { game, put } = board(); game.phase = 'battle';
    const root = you(game, 0).persona!, sentry = put(BANOY, 1, 'hand'), later = put(BELET, 1, 'hand');
    const order: string[] = []; let checks = 0, blocks = 0;
    const attacker = choose(async (_p, _q, options, context) => context?.kind === 'pending' ? options.findIndex(o => o.uid === root) : null);
    const defender: Chooser = { ...choose(async (_p, _q, options, context) => context?.kind === 'response' ? options.findIndex(o => o.uid === sentry) : null), blockPrompt: async () => { blocks++; return []; } };
    const scripts = { ...ALL_SCRIPTS, [inst(game, root).defId]: { id: inst(game, root).defId, abilities: [{ text: 'Attack effect', scope: ['Persona'] as const, trigger: 'attack' as const, run: async () => {} }] } };
    const ctrl = new GameController(game, index, { scripts: scripts as import('../cards/types.js').ScriptRegistry, choosers: [attacker, defender], hooks: {
      onAbilityActivated: async uid => { if ([root, sentry].includes(uid)) order.push(uid); },
      onBeforeAttackCheck: async () => { checks++; },
    } });
    const shields = you(game, 1).barriers.length;
    await swing(ctrl);
    expect(order).toEqual([sentry, root]); expect(inst(game, root).zone).toBe('persona');
    expect(inst(game, sentry).zone).toBe('exile'); expect(inst(game, sentry).faceDown).toBe(true);
    expect(inst(game, later).zone).toBe('hand'); expect(checks).toBe(0); expect(blocks).toBe(0);
    expect(you(game, 1).barriers).toHaveLength(shields);
  });
  it('does not offer a Sentry for an Ally attack', async () => {
    const { game, put } = board(); game.phase = 'battle';
    const sentry = put(BANOY, 1, 'hand'), target = put(ids[10]!, 1, 'hand');
    moveCard(game, target, 'ally', { slot: 0 });
    let offers = 0;
    const ctrl = new GameController(game, index, { choosers: [decline, choose(async (_p, _q, opts) => { expect(opts.some(o => o.uid === sentry)).toBe(false); offers++; return null; })] });
    await ctrl.perform({ kind: 'attack', attacker: you(game, 0).persona!, target, supporters: [] }, 0);
    expect(inst(game, sentry).zone).toBe('hand'); expect(offers).toBe(0);
  });
  it('declining one attack does not suppress the next attack prompt', async () => {
    const { game, put } = board(); game.phase = 'battle'; put(BELET, 1, 'hand');
    let asks = 0;
    const ctrl = new GameController(game, index, { choosers: [decline, choose(async (_p, _q, _o, c) => { if (c?.kind === 'battle') asks++; return null; })] });
    for (let i = 0; i < 2; i++) { inst(game, you(game, 0).persona!).exhausted = false; await swing(ctrl); }
    expect(asks).toBe(2);
  });
  it.each(['exhaust', 'leave-return'] as const)('stops an attack on %s without a check or damage', async interruption => {
    const { game, put } = board(); game.phase = 'battle';
    const stopper = put(BUNOG, 1, 'hand'), attacker = you(game, 0).persona!;
    let checks = 0;
    const scripts = { ...ALL_SCRIPTS, [BUNOG]: { ...ALL_SCRIPTS[BUNOG]!, forceModes: [ALL_SCRIPTS[BUNOG]!.forceModes![0]!, {
      label: 'Interrupt', run: async () => {
        if (interruption === 'exhaust') inst(game, attacker).exhausted = true;
        else { moveCard(game, attacker, 'heart'); moveCard(game, attacker, 'persona'); }
      },
    }] } };
    const ctrl = new GameController(game, index, { scripts, choosers: [decline, choose(async (_p, _q, o, c) => c?.kind === 'battle' ? o.findIndex(v => v.uid === stopper) : null)], hooks: { onBeforeAttackCheck: async () => { checks++; } } });
    const shields = you(game, 1).barriers.length; await swing(ctrl);
    expect(checks).toBe(0); expect(you(game, 1).barriers).toHaveLength(shields);
  });
});

describe('A committed readying effect during a Persona attack', () => {
 const mountain = 'maguindanao/set-1/warden-within-the-ridge-mountain-tunung';
 const salendagao = 'maguindanao/set-1/balete-laughing-spirit-ba-i-a-salendagao';
 it.each([false, true])('keeps the Ally ready afterward (supporting: %s)', async supporting => {
   const { game, put } = board();
   const ally = put(salendagao, 0, 'hand');
   moveCard(game, ally, 'ally', { slot:1 });
   inst(game, ally).exhausted = !supporting;
   const force = put(mountain, 0, 'hand');
   // Preserve the engine's readying regression using an explicit synthetic skill.
   const scripts = { ...ALL_SCRIPTS, [mountain]: { id: mountain, forceModes: [ALL_SCRIPTS[mountain]!.forceModes![0]!, { label: 'Ready an Ally', run: async (c: import('./effects.js').EffectContext) => { chargeUnit(c, ally); } }] } };
   const sequence: string[] = [];
   const ctrl = new GameController(game, index, { scripts,
     choosers: [({ ...decline,
       chooseAbility: async (_p, _q, opts, context) => context?.kind === 'battle' ? opts.findIndex(o => o.uid === force) : null,
       chooseTarget: async (_p, _prompt, candidates) => candidates.includes(ally) ? ally : candidates[0] ?? null,
     }), decline],
     hooks: {
       onAbilityActivated: async uid => {
         if (uid === force) { sequence.push('source'); expect(inst(game, force).zone).toBe('grave'); }
       },
       onFx: async fx => {
         if (fx.kind === 'restore' && fx.target === ally) {
           sequence.push('ready'); expect(inst(game, ally).exhausted).toBe(false);
         }
       },
       onBlockingStart: async () => { sequence.push('defense'); },
     },
   });
   game.phase = 'battle';
   await ctrl.perform({ kind:'attack', attacker:you(game, 0).persona!, target:null, supporters:supporting ? [ally] : [] }, 0);
   expect(inst(game, ally).exhausted).toBe(false);
   expect(ctrl.legalActions(0).some(a => a.kind === 'attack' && a.attacker === ally)).toBe(true);
   expect(sequence).toEqual(['source', 'ready', 'defense']);
   expect(inst(game, force).zone).toBe('grave');
 });
 it('still exhausts a supporter when no readying skill was used', async () => {
   const { game, put } = board();
   const ally = put(salendagao, 0, 'hand'); moveCard(game, ally, 'ally', { slot:1 });
   game.phase = 'battle';
   const ctrl = new GameController(game, index, { choosers:[decline,decline] });
   await ctrl.perform({ kind:'attack', attacker:you(game, 0).persona!, target:null, supporters:[ally] }, 0);
   expect(inst(game, ally).exhausted).toBe(true);
 });
});
