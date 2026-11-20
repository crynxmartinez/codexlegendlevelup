import type { GameState, HeartMoveCard, HeartMoveFx, PlayerId } from './types.js';

/** Capture identities before tokens disappear, and combine adjacent parts of one cost. */
export function queueHeartMove(
  game: GameState, owner: PlayerId, card: HeartMoveCard,
  reason: HeartMoveFx['reason'], before: number, after: number,
): void {
  const previous = game.pendingFx.at(-1);
  if (previous?.kind === 'heartMove' && previous.owner === owner
      && previous.reason === reason && previous.after === before
      && (reason === 'vent' || previous.cards[0]?.to === card.to)
      && !previous.cards.some(c => c.uid === card.uid)) {
    previous.cards.push(card);
    previous.after = after;
  } else {
    game.pendingFx.push({ kind: 'heartMove', owner, reason, cards: [card], before, after });
  }
}
