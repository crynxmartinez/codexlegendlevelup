import { describe, expect, it } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { ALL_CARDS } from '../data/loader.js';
import { GameController, type BattleHooks } from '../core/game.js';
import { autoChooser, type Chooser } from '../core/effects.js';
import { createGame } from '../core/setup.js';
import { moveCard } from '../core/state.js';
import type { AttackResult } from '../core/battle.js';
import type { ActiveBattle, GameState } from '../core/types.js';
import { STARTERS } from '../pvp/catalog.js';
import { MatchSession, parseSetup, type MatchFrame } from '../pvp/session.js';
import { RemoteController } from '../pvp/client.js';
import { BOSS_ATTACK_PROFILES } from './boss-attack-profiles.js';

// Real catalogue, scripts and controller; presentation hooks alone vary between runs.
const quietChooser: Chooser = {
  ...autoChooser,
  chooseAbility: async () => null,
  confirm: async () => false,
  blockPrompt: async () => [],
};
function ready(id: string, role: 'persona' | 'ally') {
  const region = ALL_CARDS[id]!.archipelago!;
  const deck = STARTERS[region]!;
  const game = createGame(ALL_CARDS, [deck, STARTERS.Luzon!], { seed: 141126, firstPlayer: 0 });
  game.turnNumber = 4; game.phase = 'battle';
  // Keep setup deterministic and avoid optional Codex prompts obscuring the hook test.
  for (const player of game.players) {
    player.activeCodex = null;
    for (const uid of [...player.hand]) moveCard(game, uid, 'deck');
  }
  let attacker = game.players[0].persona!;
  if (role === 'ally') {
    attacker = game.players[0].deck[0]!;
    moveCard(game, attacker, 'ally', { slot: 1 });
  }
  game.cards[attacker]!.defId = id;
  game.cards[attacker]!.exhausted = false;
  return { game, attacker };
}
function controller(game: GameState, hooks: BattleHooks = {}) {
  return new GameController(game, ALL_CARDS, { choosers: [quietChooser, quietChooser], hooks });
}

describe('boss attack presentation contract', () => {
  it.each(Object.keys(BOSS_ATTACK_PROFILES))('keeps rules identical with awaited presentation for %s in both field roles', async id => {
    for (const role of ['persona', 'ally'] as const) {
      const { game, attacker } = ready(id, role);
      const presented = structuredClone(game);
      const seen: string[] = [];
      const outcomes: AttackResult[] = [];
      const hooks: BattleHooks = {
        onAttackDeclared: async () => { seen.push('declared'); await Promise.resolve(); },
        onBlockingStart: async () => { seen.push('blocking'); await Promise.resolve(); },
        onBlockersDeclared: async () => { seen.push('blockers'); await Promise.resolve(); },
        onBeforeAttackCheck: async () => { seen.push('check'); await Promise.resolve(); },
        onAttackResolved: async (_battle, result) => { seen.push('resolved'); outcomes.push(structuredClone(result)); await Promise.resolve(); },
      };
      const action = { kind: 'attack' as const, attacker, target: null, supporters: [] };
      await controller(game).perform(action, 0);
      await controller(presented, hooks).perform(action, 0);
      expect(presented, `${id} ${role}`).toEqual(game);
      expect(seen[0]).toBe('declared');
      expect(seen.at(-1)).toBe('resolved');
      expect(outcomes).toHaveLength(1);
      expect(seen.indexOf('blockers')).toBeLessThan(seen.indexOf('resolved'));
      if (seen.includes('check')) expect(seen.indexOf('check')).toBeLessThan(seen.indexOf('resolved'));
    }
  });

  it('awaits the one resolved presentation before clearing the battle and continuing cleanup', async () => {
    const { game, attacker } = ready('agta/set-1/wind-heart-rescuer-taguwasi', 'ally');
    let release!: () => void;
    let entered!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { entered = resolve; });
    let completed = false, resolved = 0;
    const ctrl = controller(game, { onAttackResolved: async (battle, result) => {
      resolved++;
      expect(battle.stage).toBe('resolved');
      expect(result.cancelReason).toBeUndefined();
      entered(); await held;
    } });
    const action = ctrl.perform({ kind: 'attack', attacker, target: null, supporters: [] }, 0)
      .then(() => { completed = true; });
    await started;
    expect(game.activeBattle?.stage).toBe('resolved');
    expect(completed).toBe(false);
    expect(resolved).toBe(1);
    release(); await action;
    expect(completed).toBe(true);
    expect(game.activeBattle).toBeNull();
    expect(resolved).toBe(1);
  });

  it.each(['persona', 'ally'] as const)('holds %s boss resolution behind the real defense decision and keeps support as one attack', async role => {
    const { game, attacker } = ready('agta/set-1/wind-heart-rescuer-taguwasi', role);
    const supporter = game.players[0].deck.find(uid => ALL_CARDS[game.cards[uid]!.defId]?.type === 'Unit')!;
    moveCard(game, supporter, 'ally', { slot: role === 'persona' ? 1 : 0 });
    const blockers = game.players[1].deck.filter(uid => {
      const card = ALL_CARDS[game.cards[uid]!.defId]!;
      return card.type === 'Unit' && (card.defense ?? 0) >= 10000;
    }).slice(0, 3);
    expect(blockers).toHaveLength(3);
    for (const uid of blockers) moveCard(game, uid, 'hand');
    const baseline = structuredClone(game);
    const answer: Chooser = { ...quietChooser, blockPrompt: async () => blockers };
    const action = { kind: 'attack' as const, attacker, target: null, supporters: [supporter] };
    await new GameController(baseline, ALL_CARDS, { choosers: [quietChooser, answer] }).perform(action, 0);

    let release!: () => void, entered!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const asked = new Promise<void>(resolve => { entered = resolve; });
    const seen: string[] = [];
    const results: AttackResult[] = [];
    const waitingAnswer: Chooser = { ...quietChooser, blockPrompt: async () => {
      seen.push('decision'); entered(); await held; return blockers;
    } };
    const ctrl = new GameController(game, ALL_CARDS, {
      choosers: [quietChooser, waitingAnswer],
      hooks: {
        onAttackDeclared: async battle => { seen.push('declared'); expect(battle.supporters).toEqual([supporter]); },
        onBlockingStart: async () => { seen.push('blocking'); },
        onBlockersDeclared: async battle => { seen.push('blockers'); expect(battle.blockers).toEqual(blockers); },
        onBeforeAttackCheck: async () => { seen.push('check'); },
        onAttackResolved: async (battle, result) => {
          seen.push('resolved'); results.push(structuredClone(result));
          expect(battle.stage).toBe('resolved');
          expect(battle.supporters).toEqual([supporter]);
          expect(result.hit).toBe(false);
          expect(result.cancelReason).toBeUndefined();
        },
      },
    });
    const pending = ctrl.perform(action, 0);
    await asked;
    try {
      expect(seen).toEqual(['declared', 'blocking', 'decision']);
      expect(results).toHaveLength(0);
      expect(game.activeBattle?.stage).toBe('blocking');
      expect(blockers.every(uid => game.cards[uid]!.zone === 'hand')).toBe(true);
    } finally { release(); }
    await pending;
    expect(seen).toEqual(['declared', 'blocking', 'decision', 'blockers', ...(role === 'persona' ? ['check'] : []), 'resolved']);
    expect(results).toHaveLength(1);
    expect(game.activeBattle).toBeNull();
    expect(game).toEqual(baseline);
  });

  it('transports explicit cancellation unchanged to both PvP viewers without replay on reconnect', async () => {
    const frames: [MatchFrame[], MatchFrame[]] = [[], []];
    const session = new MatchSession([
      parseSetup({ deck: STARTERS.Luzon }), parseSetup({ deck: STARTERS.Mindanao }),
    ], 141126, () => { frames[0].push(session.frame(0)); frames[1].push(session.frame(1)); });
    const battle: ActiveBattle = {
      attacker: session.game.players[0].persona!, target: null, defender: 1,
      supporters: [], blockers: [], attackPower: 0, defensePower: 0, stage: 'resolved',
    };
    const result: AttackResult = {
      attackPower: 0, defensePower: 0, hit: false, personaHit: false, barrierBroken: false,
      attackCheck: null, barrierCheckCard: null, sentryUsed: false, cancelReason: 'field-entry-changed',
    };
    await session.ctrl.hooks.onAttackResolved?.(battle, result);
    for (const viewer of [0, 1] as const) {
      const frame = frames[viewer].at(-1)!;
      expect(frame.presentation?.hook).toBe('onAttackResolved');
      expect(frame.presentation?.args[1]).toEqual(result);
      expect((frame.presentation?.args[0] as ActiveBattle).defender).toBe(viewer === 0 ? 1 : 0);
      expect(frame.cues.at(-1)?.battleDestroyed).toBeUndefined();
      expect(session.frame(viewer).presentation).toBeUndefined();
    }
    result.cancelReason = 'target-illegal';
    expect((frames[0].at(-1)!.presentation?.args[1] as AttackResult).cancelReason).toBe('field-entry-changed');
  });

  it.each([0, 1] as const)('does not replay a duplicate attack frame or reconnect snapshot for viewer %i', async viewer => {
    const session = new MatchSession([
      parseSetup({ deck: STARTERS.Luzon }), parseSetup({ deck: STARTERS.Mindanao }),
    ], 141126, () => {});
    let receive!: (frame: MatchFrame) => void, drop!: () => void;
    const room = {
      onMessage: (kind: string, fn: (frame: MatchFrame) => void) => { if (kind === 'view') receive = fn; },
      onDrop: (fn: () => void) => { drop = fn; }, onLeave: () => {}, send: () => {},
    } as unknown as Room;
    const first = session.frame(viewer), ctrl = new RemoteController(room, first);
    let presentations = 0;
    ctrl.onFrame = async () => { if (ctrl.frame.presentation?.hook === 'onAttackResolved') presentations++; };
    const battle: ActiveBattle = {
      attacker: first.state.players[0].persona!, target: null, defender: 1,
      supporters: [], blockers: [], attackPower: 11000, defensePower: 11000, stage: 'resolved',
    };
    const result: AttackResult = {
      attackPower: 11000, defensePower: 11000, hit: true, personaHit: true, barrierBroken: true,
      attackCheck: null, barrierCheckCard: null, sentryUsed: false,
    };
    const frame: MatchFrame = {
      ...structuredClone(first), revision: first.revision + 1,
      presentation: { id: 1, hook: 'onAttackResolved', args: [battle, result] },
    };
    receive(frame); receive(structuredClone(frame));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(presentations).toBe(1);
    drop();
    receive({ ...structuredClone(first), revision: frame.revision, presentation: undefined });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ctrl.connected).toBe(true);
    expect(presentations).toBe(1);
    receive(frame);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(presentations).toBe(1);
  });
});
