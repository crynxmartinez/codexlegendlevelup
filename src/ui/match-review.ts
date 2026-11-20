import { canSee, type DuelEvent } from '../core/events.js';
import type { PlayerId } from '../core/types.js';
import type { GameState } from '../core/types.js';
import type { CardIndex } from '../core/state.js';
import { cardDisplayName } from './card-name.js';

export function finalExchange(game: GameState, index: CardIndex): string | undefined {
  if (game.winReason === 'surrender' || game.winReason === 'deckout') return;
  const attack = [...(game.duel?.events ?? [])].reverse().find(e => e.type === 'attackResolved' && canSee(e, 0));
  if (!attack) return;
  const name = index[game.cards[attack.sourceUids[0] ?? '']?.defId ?? '']?.name;
  if (!name) return;
  return `${attack.actor === 0 ? 'Your' : 'Opponent’s'} ${cardDisplayName(name)} · ${attack.result?.outcome === 'stopped' ? 'attack stopped' : 'attack connected'}`;
}

/** A small factual recap, never a guessed coaching verdict or hidden-card reveal. */
export function matchHighlights(events: readonly DuelEvent[], viewer: PlayerId): DuelEvent[] {
  const meaningful = new Set(['barrierBroken', 'stateReleased', 'attackResolved', 'abilityResolved']);
  const seen = new Set<number>();
  const chosen: DuelEvent[] = [];
  for (const event of [...events].reverse()) {
    if (!canSee(event, viewer) || !meaningful.has(event.type) || seen.has(event.group)) continue;
    chosen.push(event); seen.add(event.group);
    if (chosen.length === 3) break;
  }
  return chosen.reverse();
}
