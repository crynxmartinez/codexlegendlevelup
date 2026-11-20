import { eventLogOf } from '../core/events.js';
import type { FxEvent, GameState } from '../core/types.js';

/** Recover explicit public pile journeys from older server events, never infer hidden cards. */
export class LegacyPileMoves {
  private seen: number;
  constructor(game: GameState) { this.seen = eventLogOf(game).events.at(-1)?.id ?? 0; }
  take(game: GameState): Extract<FxEvent, { kind: 'emit' }>[] {
    const events = eventLogOf(game).events;
    const fresh = events.filter(event => event.id > this.seen);
    this.seen = Math.max(this.seen, events.at(-1)?.id ?? 0);
    return fresh.flatMap(event => event.type === 'cardCalled' && event.visibility === 'public'
      ? event.sourceUids.filter(uid => game.cards[uid]?.zone === 'ally' && game.cards[uid]?.defId !== '__hidden__')
        .map(uid => ({kind:'emit' as const,uid,owner:game.cards[uid]!.owner,from:'hand' as const,to:'field' as const,faceUp:true}))
      : (event.visibility === 'public' ? event.movements ?? [] : [])
      .filter(move => !move.hidden && !!game.cards[move.uid] && game.cards[move.uid]!.defId !== '__hidden__'
        && game.cards[move.uid]!.zone === move.to
        && ((move.from === 'deck' && move.to === 'grave')
          || (['deck', 'grave', 'heart', 'exile', 'extra'].includes(move.from) && move.to === 'ally')))
      .map(move => ({ kind: 'emit' as const, uid: move.uid, owner: move.owner,
        from: move.from as import('../core/types.js').FxZone, to: move.to === 'ally' ? 'field' as const : 'grave' as const, faceUp: true })));
  }
}
