import { describe, it, expect } from 'vitest';
import { FULL_INDEX } from '../data/loader.js';
import { GameController } from '../core/game.js';
import { currentPower, you } from '../core/state.js';
import { createFirstBattle, firstBattleChooser, firstBattleMoves } from './first-battle.js';
import { TUTORIAL_DECKS, TUTORIAL_LESSON_CARDS, type TutorialRegion } from '../core/tutorial-decks.js';

const regions: TutorialRegion[] = ['luzon', 'visayas', 'mindanao'];

describe('First Battle uses the real rules', () => {
  it.each(regions)('%s plays a deterministic match from opening hand to a legal victory', async region => {
    const { game, cards, profile } = createFirstBattle(FULL_INDEX, region);
    const battles: Array<{ attack: number; defense: number; hit: boolean }> = [];
    const ctrl = new GameController(game, profile.index, {
      scripts: profile.scripts,
      choosers: [firstBattleChooser(game, cards, 0), firstBattleChooser(game, cards, 1)],
      hooks: { onAttackResolved: async battle => {
        battles.push({attack:battle.attackPower,defense:battle.defensePower,hit:!!battle.hit});
      } },
    });
    const moves = firstBattleMoves(cards);
    expect(game.rulesProfile).toBe('tutorial-v1');
    expect(you(game, 0).codex).toHaveLength(2);
    expect(profile.index[game.cards[you(game, 0).activeCodex!]!.defId]!.tutorial?.role).toBe('codex-attack');
    expect(you(game, 0).hand).toHaveLength(5);
    expect(you(game, 1).hand).toHaveLength(5);
    expect(you(game, 0).energy).toBe(you(game, 1).energy);
    for (const p of [0, 1] as const) {
      expect(game.cards[you(game, p).persona!]!.defId).toBe(TUTORIAL_LESSON_CARDS[region].persona);
      expect(you(game, p).codex.map(uid => game.cards[uid]!.defId)).toEqual(TUTORIAL_DECKS[region].codex);
      const actual = Object.values(game.cards).filter(card => card.owner === p && profile.index[card.defId]!.type !== 'Codex');
      expect(actual).toHaveLength(50);
      for (const entry of TUTORIAL_DECKS[region].main) expect(actual.filter(card => card.defId === entry.id)).toHaveLength(entry.copies);
    }
    const energy = you(game, 0).energy;
    await ctrl.perform(moves.call, 0);
    expect(you(game, 0).energy).toBe(energy);
    expect(you(game, 0).normalPlaysUsed).toBe(1);
    await ctrl.perform({ kind: 'endPhase' }, 0);
    await ctrl.perform(moves.persona, 0);
    expect(battles[0]).toEqual({attack:16000,defense:21000,hit:false});
    expect(currentPower(profile.index, game, cards.persona)).toBe(11000);
    expect(you(game, 1).barriers).toHaveLength(2);
    expect(you(game, 1).grave).toContain(cards.foeBlocker);
    expect(you(game, 0).hand).toContain(cards.firstCheck);
    await ctrl.perform(moves.ally, 0);
    expect(battles[1]).toEqual({attack:11000,defense:11000,hit:true});
    expect(you(game, 1).barriers).toHaveLength(1);
    await ctrl.perform({ kind: 'endTurn' }, 0);
    await ctrl.beginTurn();
    await ctrl.perform(moves.foeCall, 1);
    await ctrl.perform({ kind: 'endPhase' }, 1);
    await ctrl.perform(moves.foePersona, 1);
    expect(battles[2]).toEqual({attack:16000,defense:21000,hit:false});
    expect(you(game, 0).barriers).toHaveLength(2);
    expect(you(game, 0).grave).toContain(cards.blocker);
    await ctrl.perform(moves.foeAlly, 1);
    expect(you(game, 0).barriers).toHaveLength(1);
    await ctrl.perform({ kind: 'endTurn' }, 1);
    await ctrl.beginTurn();
    expect(game.phase).toBe('main');
    expect(game.cards[cards.ally]!.exhausted).toBe(false);
    expect(you(game, 0).normalPlaysUsed).toBe(0);
    expect(currentPower(profile.index, game, cards.persona)).toBe(11000);
    expect(currentPower(profile.index, game, cards.ally)).toBe(11000);
    await ctrl.perform({ kind: 'endPhase' }, 0);
    await ctrl.perform(moves.persona, 0);
    expect(you(game, 1).barriers).toHaveLength(0);
    expect(game.winner).toBeNull();
    await ctrl.perform(moves.ally, 0);
    expect(game.winner).toBe(0);
    expect(battles).toEqual([
      { attack: 16000, defense: 21000, hit: false },
      { attack: 11000, defense: 11000, hit: true },
      { attack: 16000, defense: 21000, hit: false },
      { attack: 11000, defense: 11000, hit: true },
      { attack: 16000, defense: 11000, hit: true },
      { attack: 11000, defense: 11000, hit: true },
    ]);
  });

  it('rejects an invalid region instead of silently supplying Luzon cards', () => {
    expect(() => createFirstBattle(FULL_INDEX, 'invalid' as TutorialRegion)).toThrow(/Unknown First Battle region/);
  });
});
