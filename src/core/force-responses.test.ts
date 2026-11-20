import { expect, it } from 'vitest';
import deck from '../../decks/agta-set-1.json';
import { FULL_INDEX as index, ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { ALL_SCRIPTS, GameController } from './game.js';
import { createGame } from './setup.js';
import { autoChooser, type Chooser } from './effects.js';
import { currentPower, inst, moveCard, you } from './state.js';
import type { AbilityScript } from '../cards/types.js';
import type { PlayerId, Zone } from './types.js';

const forces = Object.values(ALL_CARDS).filter(c => isSelectableCard(c) && c.type === 'Force');
function fixture(archipelago = 'Luzon') {
  const game = createGame(index, [deck, deck], { seed: 4 });
  game.phase = 'main'; game.turnNumber = 10; game.turnPlayer = 0;
  for (const ps of game.players) { ps.activeCodex = null; for (const u of [...ps.hand]) moveCard(game, u, 'deck'); }
  let serial = 0;
  const put = (defId: string, owner: PlayerId, zone: Zone, slot = 0) => {
    const uid = `response-${serial++}`;
    game.cards[uid] = { ...structuredClone(inst(game, you(game, owner).persona!)), uid, defId, owner, zone: 'check', slot: null, zoneEntry: 0, modifiers: [], usesThisTurn: {} };
    moveCard(game, uid, zone, { slot }); return uid;
  };
  const force = (kind: string, owner: PlayerId) => put(forces.find(c => c.archipelago === archipelago && ALL_SCRIPTS[c.id]!.forceModes![1]!.response === kind)!.id, owner, 'hand');
  const source = put('agta/set-1/moon-bright-captive-innawagan', 0, 'ally');
  const skill: AbilityScript = { id: 'test-root', text: 'Test activation', scope: ['Ally'], run: async () => { resolved++; } };
  let resolved = 0;
  const scripts = { ...ALL_SCRIPTS, [inst(game, source).defId]: { id: inst(game, source).defId, abilities: [skill] } };
  const decline: Chooser = { ...autoChooser, chooseAbility: async () => null };
  const make = (choosers: [Chooser, Chooser] = [decline, decline]) => new GameController(game, index, { scripts, choosers });
  const activate = (ctrl: GameController) => ctrl.perform({ kind: 'ability', uid: source, abilityIndex: 0 }, 0);
  return { game, source, skill, force, make, activate, put, decline, resolved: () => resolved };
}

it.each(['Luzon', 'Visayas', 'Mindanao'])('%s negate responds in the opposing Main Phase and pays before resolving', async archipelago => {
  const f = fixture(archipelago), negate = f.force('negate', 1);
  const ctrl = f.make([f.decline, { ...f.decline, chooseAbility: async (_p, _q, choices) => choices.findIndex(c => c.uid === negate) }]);
  await f.activate(ctrl);
  expect(f.resolved()).toBe(0); expect(inst(f.game, negate).zone).toBe('grave');
  expect(f.game.players.map(p => p.normalPlaysUsed)).toEqual([0, 0]);
});

it('negating a negate restores the original activation without refunding either discard', async () => {
  const f = fixture(), theirs = f.force('negate', 1), ours = f.force('negate', 0);
  const choose: Chooser = { ...f.decline, chooseAbility: async (_p, _q, choices) => {
    if (choices.some(c => c.uid === ours)) expect(inst(f.game, theirs).zone).toBe('grave');
    return 0;
  } };
  await f.activate(f.make([choose, choose]));
  expect(f.resolved()).toBe(1);
  expect([ours, theirs].map(u => inst(f.game, u).zone)).toEqual(['grave', 'grave']);
});

it.each(['Luzon', 'Visayas', 'Mindanao'])('%s Rallies both Units without negating the source ability', async archipelago => {
  const f = fixture(archipelago), rally = f.force('rally', 1), ours = f.put('agta/set-1/moon-bright-captive-innawagan', 1, 'ally');
  await f.activate(f.make([f.decline, { ...f.decline, chooseAbility: async () => 0 }]));
  expect(f.resolved()).toBe(1);
  expect(you(f.game, 0).deck.at(-1)).toBe(f.source);
  expect(you(f.game, 1).deck.at(-1)).toBe(ours);
  expect(inst(f.game, rally).zone).toBe('grave');
});

it.each(['Luzon', 'Visayas', 'Mindanao'])('%s draw 2 requires a declared Special Call effect', async archipelago => {
  const f = fixture(archipelago), response = f.force('special-call', 1);
  let asks = 0;
  const ctrl = f.make([f.decline, { ...f.decline, chooseAbility: async () => { asks++; return 0; } }]);
  await f.activate(ctrl); expect(asks).toBe(0);
  f.skill.specialCalls = true;
  await f.activate(ctrl);
  expect(asks).toBe(1); expect(inst(f.game, response).zone).toBe('grave');
  expect(you(f.game, 1).hand).toHaveLength(2);
});

it.each(['Luzon', 'Visayas', 'Mindanao'])('%s attack response adds 5000 for one attack and draws before defense', async archipelago => {
  const f = fixture(archipelago), response = f.force('attack', 1), hero = you(f.game, 1).persona!;
  const base = currentPower(index, f.game, hero);
  const ctrl = f.make([f.decline, { ...f.decline,
    chooseAbility: async (_p, _q, choices, context) => context?.kind === 'battle' ? choices.findIndex(c => c.uid === response) : null,
    blockPrompt: async () => { expect(currentPower(index, f.game, hero)).toBe(base + 5000); expect(you(f.game, 1).hand).toHaveLength(1); return []; },
  }]);
  f.game.phase = 'battle';
  await ctrl.perform({ kind: 'attack', attacker: you(f.game, 0).persona!, target: null, supporters: [] }, 0);
  expect(inst(f.game, response).zone).toBe('grave');
  expect(inst(f.game, hero).modifiers.filter(m => m.duration === 'endOfAttack')).toEqual([]);
});

it('response Forces cannot be cast freely without a matching event', () => {
  const f = fixture();
  for (const kind of ['rally', 'negate', 'special-call', 'attack']) f.force(kind, 0);
  expect(f.make().legalActions(0).filter(a => a.kind === 'playForce')).toEqual([]);
  expect(forces).toHaveLength(12);
  for (const card of forces) {
    expect(card.text).toContain('Reveal and discard this card');
    expect(card.text).toContain("either player's turn");
  }
});

it('a real Special Call Action opens draw-2 responses before any Unit enters', async () => {
  const f = fixture(), response = f.force('special-call', 1);
  const action = f.put('agta/set-1/the-three-brothers-ascend', 0, 'hand');
  const ctrl = f.make([f.decline, { ...f.decline, chooseAbility: async (_p, _q, choices) => {
    expect(you(f.game, 0).allies.filter(Boolean)).toEqual([f.source]);
    return choices.findIndex(c => c.uid === response);
  } }]);
  await ctrl.perform({ kind: 'playAction', uid: action }, 0);
  expect(inst(f.game, response).zone).toBe('grave');
  expect(you(f.game, 1).hand).toHaveLength(2);
});

it('Rally does not follow a targeted Ally that leaves and re-enters the field', async () => {
  const f = fixture(), response = f.force('rally', 1), own = f.put('agta/set-1/moon-bright-captive-innawagan', 1, 'ally');
  const ctrl = f.make([f.decline, { ...f.decline, chooseAbility: async () => 0 }]);
  ctrl.hooks.onChainUpdated = async () => {
    if (f.game.responseChain?.links.length === 2) {
      moveCard(f.game, f.source, 'grave');
      moveCard(f.game, f.source, 'ally', { slot: 0 });
    }
  };
  await f.activate(ctrl);
  expect(inst(f.game, response).zone).toBe('grave');
  expect(inst(f.game, f.source).zone).toBe('ally');
  expect(you(f.game, 1).deck.at(-1)).toBe(own);
  expect(f.resolved()).toBe(1);
});

it('lets the responding player choose each Ally, including a different opposing Ally', async () => {
  const f = fixture(), response = f.force('rally', 1);
  const ours = f.put('agta/set-1/moon-bright-captive-innawagan', 1, 'ally');
  const otherEnemy = f.put('agta/set-1/moon-bright-captive-innawagan', 0, 'ally', 1);
  const prompts: string[] = [];
  await f.activate(f.make([f.decline, { ...f.decline, chooseAbility: async () => 0,
    chooseTarget: async (owner, prompt, pool) => {
      expect(owner).toBe(1); prompts.push(prompt);
      for (const player of f.game.players) expect(pool).not.toContain(player.persona);
      return pool.includes(otherEnemy) ? otherEnemy : ours;
    },
  }]));
  expect(prompts).toEqual(['Choose your Ally to Rally', "Choose your opponent's Ally to Rally"]);
  expect(you(f.game, 0).deck.at(-1)).toBe(otherEnemy);
  expect(inst(f.game, f.source).zone).toBe('ally');
  expect(you(f.game, 1).deck.at(-1)).toBe(ours);
  expect(inst(f.game, response).zone).toBe('grave');
  expect(f.resolved()).toBe(1);
});

it('cannot pay Rally with a Persona when there is no friendly Ally', async () => {
  const f = fixture(); f.force('rally', 1);
  let responses = 0;
  await f.activate(f.make([f.decline, {...f.decline,chooseAbility:async()=>{responses++;return 0;}}]));
  expect(responses).toBe(0);
  expect(you(f.game, 1).persona).not.toBeNull();
});
