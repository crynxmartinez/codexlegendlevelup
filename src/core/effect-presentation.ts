import type { GameState } from './types.js';
import type { ChainLink } from './response-chain.js';
import type { TargetFailure } from './activation-targets.js';

/** Only current public field instances can be highlighted or included in a match cue. */
export function publicEffectTargets(game: GameState, link?: ChainLink): string[] {
  if (!link || link.status === 'negated') return [];
  return [...new Set((link.declared ?? []).flatMap(choice => choice.targets).filter(target => {
    const card = game.cards[target.uid];
    return card && !card.faceDown && ['ally', 'persona'].includes(card.zone) && card.zone === target.zone && (card.zoneEntry ?? 0) === target.entry;
  }).map(target => target.uid))];
}

export function effectOutcomeLabel(outcome: string, failures: Iterable<TargetFailure> = []): string | undefined {
  if (outcome === 'negated') return 'Activation negated';
  if (outcome === 'partial') {
    const reasons = new Set(failures);
    const reason = reasons.size > 1 ? 'Targets moved or no longer qualify'
      : reasons.has('left-field') ? 'Target left the field'
      : reasons.has('moved') ? 'Target changed zones'
      : reasons.has('no-longer-eligible') ? 'Target no longer qualifies' : 'Target unavailable';
    return `${reason} — affected part skipped`;
  }
  return outcome === 'unavailable' ? 'Effect unavailable' : undefined;
}
