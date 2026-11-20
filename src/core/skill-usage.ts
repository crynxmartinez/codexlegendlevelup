import type { GameState, PlayerId } from './types.js';

export type UseScope = 'copy' | 'name';

export function usageKey(game: GameState, owner: PlayerId, source: string, skill: string, scope: UseScope = 'copy'): string {
  const identity = scope === 'name' ? game.cards[source]!.defId : source;
  return `${owner}:${identity}:${skill}`;
}

export function usedSkill(game: GameState, owner: PlayerId, source: string, skill: string, scope: UseScope = 'copy'): number {
  const use = game.skillUses?.[usageKey(game, owner, source, skill, scope)];
  return use?.turn === game.turnNumber ? use.count : 0;
}

export function recordSkillUse(game: GameState, owner: PlayerId, source: string, skill: string, scope: UseScope = 'copy'): void {
  const key = usageKey(game, owner, source, skill, scope);
  const count = usedSkill(game, owner, source, skill, scope) + 1;
  (game.skillUses ??= {})[key] = { turn: game.turnNumber, count };
}
