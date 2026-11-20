import { expect, it } from 'vitest';
import { skillStatus } from './skill-status.js';
import { recordSkillUse } from '../core/skill-usage.js';
import type { GameState } from '../core/types.js';
import type { AbilityScript } from '../cards/types.js';
import type { EffectContext } from '../core/effects.js';

const fresh = () => ({ turnNumber: 1, turnPlayer: 0, players: [{ releasedState: null }],
  cards: { a: { owner: 0, defId: 'card', zone: 'ally' }, b: { owner: 0, defId: 'card', zone: 'ally' } } }) as unknown as GameState;
const skill: AbilityScript = { scope: ['Ally'], text: 'Draw', perTurn: 1, run: async () => {} };
it('uses engine legality before informational restrictions', () => {
  expect(skillStatus(fresh(), 'a', { ...skill, requiresState: 'Garahana' }, 0, true)).toBe('Available now');
});
it('explains locked state and wrong zone without claiming a legal activation', () => {
  expect(skillStatus(fresh(), 'a', { ...skill, requiresState: 'Garahana' }, 0, false)).toContain('requires Garahana');
  expect(skillStatus(fresh(), 'a', { ...skill, scope: ['Heart'] }, 0, false)).toBe('Works from Heart');
});
it('reads persistent per-copy and per-name usage after movement', () => {
  const game = fresh(); recordSkillUse(game, 0, 'a', 'card:ability:0');
  game.cards.a!.zone = 'grave';
  expect(skillStatus(game, 'a', skill, 0, false)).toBe('Used this turn');
  expect(skillStatus(game, 'b', skill, 0, false)).not.toBe('Used this turn');
  recordSkillUse(game, 0, 'a', 'shared', 'name');
  expect(skillStatus(game, 'b', { ...skill, id: 'shared', useScope: 'name' }, 0, false)).toBe('Used this turn');
});
it('describes triggers as conditional rather than manual actions', () => {
  expect(skillStatus(fresh(), 'a', { ...skill, trigger: 'unitOffered' }, 0, false)).toContain('waits for its condition');
});
it('explains read-only conditions and does not tell passive skills to wait for Main', () => {
  const game = fresh(); game.phase = 'battle';
  const passive = { ...skill, passive: true };
  expect(skillStatus(game, 'a', passive, 0, false)).toContain('Continuous effect');
  expect(skillStatus(game, 'a', { ...passive, conditionReason: () => 'Need 3 more cards in Heart' }, 0, false, {} as EffectContext)).toBe('Need 3 more cards in Heart');
});
