import type { AbilityScript } from '../cards/types.js';
import type { EffectContext } from '../core/effects.js';
import type { GameState } from '../core/types.js';
import { usedSkill } from '../core/skill-usage.js';

/** Inspection describes availability. Only the engine can authorize activation. */
export function skillStatus(game: GameState, uid: string, ability: AbilityScript, abilityIndex: number, legal: boolean, ctx?: EffectContext): string {
  if (legal) return 'Available now';
  const card = game.cards[uid]!;
  const state = game.players[card.owner]!;
  if (ability.requiresState && state.releasedState !== ability.requiresState) return `Locked · requires ${ability.requiresState}`;
  const id = ability.id ?? `${card.defId}:ability:${abilityIndex}`;
  if (ability.perTurn !== undefined && usedSkill(game, card.owner, uid, id, ability.useScope) >= ability.perTurn) return 'Used this turn';
  const zone = card.zone[0]!.toUpperCase() + card.zone.slice(1);
  if (!ability.scope.some(scope => scope === zone || scope === 'Field' && ['ally', 'persona'].includes(card.zone))) return `Works from ${ability.scope.join(' / ')}`;
  if (ctx) {
    const condition = ability.conditionReason?.(ctx);
    if (condition) return condition;
    const missing = ability.prepare?.describe?.(ctx).missing;
    if (missing) return missing;
  }
  if (ability.passive) return 'Continuous effect · applies while its conditions hold';
  if (ability.trigger) {
    const timing: Record<string, string> = { attack: 'when this Unit attacks', attackResolved: 'after its attack',
      unitOffered: 'when a Unit is Offered', vented: 'when a card leaves Heart through Kalas', essenced: 'when a card enters Heart through Sanib',
      placed: 'when this Unit enters the field', startOfMain: 'at the start of Main', endOfTurn: 'at the end of the turn',
      barrierBroken: 'when a Barrier breaks', battleFinished: 'when the battle ends' };
    return `Triggered effect · waits for its condition${timing[ability.trigger] ? `: ${timing[ability.trigger]}` : ''}`;
  }
  if (game.responseChain) return 'Finish the current chain';
  if (game.turnPlayer !== card.owner) return 'Wait for your turn';
  if (game.phase !== 'main') return 'Use during your Main Phase';
  if (ctx && !Object.values(game.cards).some(c => c.defId === '__hidden__')) {
    const target = ability.targets?.find(t => !t.optional && (!t.when || t.when(ctx)) && t.pool(ctx).length === 0);
    if (target) return `No eligible target · ${target.prompt}`;
  }
  return 'Its card condition is not met · read the current skill below';
}
