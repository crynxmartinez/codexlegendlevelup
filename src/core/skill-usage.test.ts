import { describe, expect, it } from 'vitest';
import { recordSkillUse, usedSkill } from './skill-usage.js';
import type { GameState } from './types.js';

const fresh = () => ({ turnNumber: 4, cards: { a: { defId: 'same' }, b: { defId: 'same' } } }) as unknown as GameState;

describe('persistent skill usage', () => {
  it('separates copies, names, owners and independent abilities', () => {
    const game = fresh();
    recordSkillUse(game, 0, 'a', 'buff');
    recordSkillUse(game, 0, 'a', 'follow-up', 'name');
    expect(usedSkill(game, 0, 'b', 'buff')).toBe(0);
    expect(usedSkill(game, 0, 'b', 'follow-up', 'name')).toBe(1);
    expect(usedSkill(game, 1, 'b', 'follow-up', 'name')).toBe(0);
    expect(usedSkill(game, 0, 'a', 'other')).toBe(0);
  });
  it('survives serialization and zone changes but not the next turn', () => {
    const game = fresh();
    recordSkillUse(game, 0, 'a', 'skill');
    game.cards.a!.zone = 'grave';
    game.cards.a!.usesThisTurn = {};
    const restored = JSON.parse(JSON.stringify(game));
    expect(usedSkill(restored, 0, 'a', 'skill')).toBe(1);
    restored.turnNumber++;
    expect(usedSkill(restored, 0, 'a', 'skill')).toBe(0);
  });
});
