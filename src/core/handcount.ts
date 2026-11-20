/**
 * Hand size, as every "cards in hand" effect sees it.
 *
 * Most cards count as one. Some cards may count as more than one while held.
 */
import { def, you, type CardIndex } from './state.js';
import type { GameState, PlayerId } from './types.js';

/** Cards that count as more than one while held. Keyed by card id. */
export const HAND_COUNT_VALUE: Record<string, number> = {};

export function handCount(index: CardIndex, game: GameState, p: PlayerId): number {
  return you(game, p).hand.reduce((total, uid) => {
    const id = def(index, game, uid).id;
    return total + (HAND_COUNT_VALUE[id] ?? 1);
  }, 0);
}

/** Literal card count, for rules that care about physical cards. */
export function rawHandCount(game: GameState, p: PlayerId): number {
  return you(game, p).hand.length;
}
