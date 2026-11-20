import { describe, expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser, draw, CANCEL_DRAFT } from './effects.js';
import { prepareOffer } from './activation.js';
import { def, inst, moveCard, you } from './state.js';
import type { ScriptRegistry } from '../cards/types.js';
import { reevaluateState } from './states.js';

describe('cost, response chain and deferred Last Oaths', () => {
  it.each(['left', 'returned', 'ineligible', 'negated'] as const)('explains target failure and keeps independent clauses (%s)', async mode => {
    const game = createGame(index, [deck, deck], { seed: 25, firstPlayer: 0 });
    game.phase = 'main';
    for (const ps of game.players) { ps.activeCodex = null; for (const uid of [...ps.hand]) moveCard(game, uid, 'deck'); }
    const source = game.players[0].persona!;
    const target = game.players[0].deck.find(u => def(index, game, u).type === 'Unit')!;
    moveCard(game, target, 'ally', { slot: 0 });
    let eligible = true, applied = false;
    const id = inst(game, source).defId;
    const scripts: ScriptRegistry = { [id]: { id, abilities: [{ scope: ['Persona'], text: 'Buff then draw',
      targets: [{ prompt: 'Buff', pool: () => [target] }],
      run: async ctx => {
        const picked = await ctx.chooser.chooseTarget(0, 'Buff', eligible ? [target] : []);
        applied = !!picked;
        await draw(ctx, 1);
      },
    }] } };
    const ctrl = new GameController(game, index, { scripts, choosers: [autoChooser, autoChooser], hooks: {
      onAbilityActivated: async () => {
        if (mode === 'negated') game.responseChain!.links[0]!.status = 'negated';
        else if (mode === 'ineligible') eligible = false;
        else { moveCard(game, target, 'grave'); if (mode === 'returned') moveCard(game, target, 'ally', { slot: 0 }); }
      },
    } });
    await ctrl.perform({ kind: 'ability', uid: source, abilityIndex: 0 }, 0);
    const result = game.duel!.events.find(e => e.type === 'abilityResolved')!.result!;
    expect(applied).toBe(false);
    expect(game.players[0].hand).toHaveLength(mode === 'negated' ? 0 : 1);
    expect(result.outcome).toBe(mode === 'negated' ? 'negated' : 'partial');
    expect(result.detail).toBe(mode === 'negated' ? 'Activation negated' : `${mode === 'ineligible' ? 'Target no longer qualifies' : 'Target left the field'} — affected part skipped · Drew 1`);
  });
  it('cancels an Action draft without spending a Play, Offering its cost, or opening a chain', async () => {
    const game = createGame(index, [deck, deck], { seed: 25, firstPlayer: 0 });
    game.phase = 'main';
    const ps = game.players[0];
    for (const player of game.players) player.activeCodex = null;
    const action = ps.deck.find(uid => def(index, game, uid).type === 'Action')!;
    const ally = ps.deck.find(uid => def(index, game, uid).type === 'Unit')!;
    moveCard(game, action, 'hand'); moveCard(game, ally, 'ally', { slot: 0 });
    let resolved = false;
    const id = inst(game, action).defId;
    const scripts: ScriptRegistry = { [id]: { id, action: {
      prepare: c => prepareOffer(c, 1, [ally]),
      targets: [{ prompt: 'Optional target', pool: () => [ps.persona!], optional: true }],
      run: async () => { resolved = true; },
    } } };
    const chooser = { ...autoChooser, chooseTarget: async () => CANCEL_DRAFT };
    const ctrl = new GameController(game, index, { scripts, choosers: [chooser, autoChooser] });
    await ctrl.perform({ kind: 'playAction', uid: action }, 0);
    expect(inst(game, action).zone).toBe('hand');
    expect(inst(game, ally).zone).toBe('ally');
    expect(ps.normalPlaysUsed).toBe(0); expect(resolved).toBe(false);
    expect(game.responseChain).toBeFalsy();
    expect(game.duel!.events.some(e => e.type === 'costPaid' || e.type === 'abilityActivated')).toBe(false);
  });
  it('reports actual effect draws without exposing their card identities in the result', async () => {
    const game=createGame(index,[deck,deck],{seed:25}); game.phase='main'; game.turnPlayer=0;
    for(const ps of game.players)ps.activeCodex=null;
    const uid=game.players[0].persona!, id=inst(game,uid).defId, summaries:string[]=[];
    const scripts:ScriptRegistry = { [id]:{id,abilities:[{scope:['Persona'],text:'Draw two, discard one',run:async c=>{
      const drawn=await draw(c,2);moveCard(game,drawn[0]!,'grave');
    }}]} };
    const ctrl=new GameController(game,index,{scripts,choosers:[autoChooser,autoChooser],hooks:{onAbilityResolved:async(_u,_p,_o,summary)=>{summaries.push(summary!);}}});
    await ctrl.perform({kind:'ability',uid,abilityIndex:0},0);
    expect(summaries).toEqual(['Drew 2']);
    const result=game.duel!.events.find(e=>e.type==='abilityResolved')!;
    expect(result.result?.detail).toBe('Drew 2');expect(result.sourceUids).toEqual([uid]);expect(result.targetUids).toEqual([]);
  });
  it.each([false, true])('real Sulayman Offer 3 keeps all sibling Last Oaths after a three-link chain (negated=%s)', async negate => {
    const game = createGame(index, [deck, deck], { seed: 25, firstPlayer: 0 });
    game.phase = 'battle';
    for (const p of game.players) {
      p.switchedCodexLastTurn = true;
      p.activeCodex = p.codex.find(u => inst(game, u).defId.endsWith('/city-beyond-the-sunset-mantapuli'))!;
      for (const uid of [...p.hand]) moveCard(game, uid, 'deck');
    }
    const take = (ending: string, owner = 0) => Object.values(game.cards).find(c => c.owner === owner && c.defId.endsWith('/' + ending))!.uid;
    const source = take('three-scourge-champion-sulayman');
    moveCard(game, you(game, 0).persona!, 'deck'); moveCard(game, source, 'persona');
    const allies = ['first-son-of-the-returned-land-rinamuntaw', 'first-daughter-of-the-returned-land-rinayung', 'hollow-tree-guide-the-old-woman'].map(name => take(name));
    allies.forEach((uid, slot) => moveCard(game, uid, 'ally', { slot }));
    const fuel = you(game, 0).deck.filter(u => def(index, game, u).type === 'Unit' && def(index, game, u).subtypes.includes('Maguindanaon')).slice(0, 5);
    fuel.forEach(u => moveCard(game, u, 'grave'));
    reevaluateState(index, game, 0);
    expect(you(game, 0).releasedState).toBe('Garahana');
    const forces = [take('prayer-above-the-storm-sky-tunung'), take('prayer-above-the-storm-sky-tunung', 1)];
    forces.forEach(u => moveCard(game, u, 'hand'));
    const order: string[] = [], responseOwners: number[] = [];
    const chooser = { ...autoChooser,
      confirm: async () => false,
      chooseAbility: async (p: number, _prompt: string, options: {uid: string}[], context?: {kind: string}) => {
        if (context?.kind === 'response') {
          expect(allies.every(u => inst(game, u).zone === 'grave')).toBe(true);
          expect(order).toEqual([]);
          responseOwners.push(p); return 0;
        }
        return options.length - 1;
      },
    };
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser], hooks: {
      onAbilityActivated: async uid => {
        order.push(uid);
        if (negate && uid === source) game.responseChain!.links[0]!.status = 'negated';
      },
    } });
    await ctrl.fireTrigger('attack', 0, { name: 'attack', unit: source });
    expect(responseOwners).toEqual([1, 0]);
    expect(order).toEqual([forces[0], forces[1], source, ...[...allies].reverse()]);
    expect(game.pendingTriggers).toEqual([]);
    expect(you(game, 0).unitsOfferedThisTurn).toBe(3);
    expect(you(game, 0).normalPlaysUsed).toBe(0);
  });
  it('alternates three committed links and resolves them backward after one decline', async () => {
    const game = createGame(index, [deck as never, deck as never], { seed: 25 });
    game.phase = 'battle'; game.turnPlayer = 0;
    for (const ps of game.players) { ps.activeCodex = null; for (const uid of [...ps.hand]) moveCard(game, uid, 'deck'); }
    const source = you(game, 0).persona!;
    const forces = [0, 1].map(p => Object.values(game.cards).find(c => c.owner === p && c.defId.endsWith('/prayer-above-the-storm-sky-tunung'))!.uid);
    for (const uid of forces) moveCard(game, uid, 'hand');
    const resolved: string[] = [], responders: number[] = [];
    const scripts: ScriptRegistry = {
      [inst(game, source).defId]: { id: inst(game, source).defId, abilities: [{
        text: 'Root', scope: ['Persona'], run: async () => { resolved.push('root'); },
      }] },
    };
    for (const uid of forces) scripts[inst(game, uid).defId] = { id: inst(game, uid).defId,
      forceModes: [{ label: 'check', run: async () => {} }, { label: 'response', run: async c => { resolved.push(c.source); } }] };
    const chooser = { ...autoChooser, chooseAbility: async (p: number) => {
      responders.push(p); expect(resolved).toEqual([]); return 0;
    } };
    const controller = new GameController(game, index, { scripts, choosers: [chooser, chooser] });
    await controller.perform({ kind: 'ability', uid: source, abilityIndex: 0 }, 0);
    expect(responders).toEqual([1, 0]);
    expect(resolved).toEqual([forces[0], forces[1], 'root']);
    expect(game.players.map(p => p.normalPlaysUsed)).toEqual([0, 0]);
    expect(game.responseChain).toBeNull();
  });

  it('does not give the initiator a self-chain after the opponent declines', async () => {
    const game = createGame(index, [deck as never, deck as never], { seed: 25 });
    game.phase = 'battle'; game.turnPlayer = 0;
    for (const ps of game.players) ps.activeCodex = null;
    const source = you(game, 0).persona!;
    for (const p of [0, 1] as const) {
      const force = Object.values(game.cards).find(c => c.owner === p && def(index, game, c.uid).type === 'Force')!.uid;
      moveCard(game, force, 'hand');
    }
    const asks: number[] = [];
    const chooser = { ...autoChooser, chooseAbility: async (p: number) => { asks.push(p); return null; } };
    // This root is independent of any particular printed skill's costs.
    const scripts = { ...ALL_SCRIPTS, [inst(game, source).defId]: { id: inst(game, source).defId,
      abilities: [{ text: 'Root', scope: ['Persona'], run: async () => {} }] } };
    const controller = new GameController(game, index, { scripts: scripts as ScriptRegistry, choosers: [chooser, chooser] });
    await controller.perform({ kind: 'ability', uid: source, abilityIndex: 0 }, 0);
    expect(asks).toEqual([1]);
  });

  it('pays Offer 3, resolves the main skill, then lets the owner choose every Last Oath', async () => {
    const game = createGame(index, [deck as never, deck as never], { seed: 25 });
    game.phase = 'main'; game.turnPlayer = 0;
    const ps = you(game, 0);
    const source = ps.persona!;
    for (const player of game.players) player.activeCodex = null;
    const allies = ps.deck.filter(uid => def(index, game, uid).type === 'Unit' && inst(game, uid).defId !== inst(game, source).defId).slice(0, 3);
    allies.forEach((uid, slot) => moveCard(game, uid, 'ally', { slot }));
    const order: string[] = [];
    const scripts: ScriptRegistry = {};
    for (const uid of allies) scripts[inst(game, uid).defId] = {
      id: inst(game, uid).defId,
      abilities: [{ text: 'Last Oath', scope: ['Ally'], trigger: 'unitOffered',
        canRun: c => c.event?.unit === c.source,
        run: async c => { order.push(c.source); } }],
    };
    scripts[inst(game, source).defId] = { id: inst(game, source).defId, abilities: [{
      text: 'Offer three, then resolve main', scope: ['Persona'],
      prepare: c => prepareOffer(c, 3, allies),
      run: async c => {
        expect(allies.every(uid => inst(game, uid).zone === 'grave')).toBe(true);
        await c.settle?.();
        expect(order).toEqual([]);
        order.push('main');
      },
    }] };
    const chooser = { ...autoChooser, chooseAbility: async (_p: unknown, _prompt: string, options: { uid: string }[]) => {
      expect(order[0]).toBe('main');
      // Deliberately select the last offered card first, not payment order.
      return options.length - 1;
    } };
    const controller = new GameController(game, index, { scripts, choosers: [chooser, chooser] });
    await controller.perform({ kind: 'ability', uid: source, abilityIndex: 0 }, 0);
    expect(order).toEqual(['main', ...[...allies].reverse()]);
    expect(game.responseChain).toBeNull();
  });
});


it('a negated Codex activation still consumes its once-per-turn use', async () => {
  const game = createGame(index, [deck, deck], { seed: 25 });
  game.phase = 'main'; game.turnNumber = 4;
  for (const ps of game.players) { ps.activeCodex = null; ps.switchedCodexLastTurn = true; }
  const ps = you(game, 0), uid = ps.codex[0]!;
  ps.activeCodex = uid;
  let resolved = 0, announced = 0;
  const scripts: ScriptRegistry = { [inst(game, uid).defId]: { id: inst(game, uid).defId, codex: { skill: {
    type: 'auto', trigger: 'startOfMain', text: '1/Turn: Test', maxUses: 1, run: async () => { resolved++; },
  } } } };
  const controller = new GameController(game, index, { scripts, choosers: [autoChooser, autoChooser], hooks: {
    onAbilityActivated: async () => { announced++; game.responseChain!.links[0]!.status = 'negated'; },
  } });
  await controller.fireTrigger('startOfMain', 0);
  await controller.fireTrigger('startOfMain', 0);
  expect(announced).toBe(1); expect(resolved).toBe(0);
});
