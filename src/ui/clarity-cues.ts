import type { GameState, PlayerId } from '../core/types.js';

export function destinationLabel(to: string): string {
  return ({ grave: 'Sent to Grave', exile: 'Exiled', hand: 'Added to hand', deck: 'Returned to Deck', heart: 'Moved to Heart', field: 'Entered the field' } as Record<string, string>)[to] ?? '';
}

export type ClarityChange = { kind: 'exhaust'; uid: string } | { kind: 'stateLost'; player: PlayerId; state: string };
/** Observe public board transitions only. Initial render and newly arriving cards are silent. */
export class ClarityTracker {
  private exhausted = new Map<string, boolean>();
  private states: (string | null | undefined)[] | null = null;
  update(game: GameState): ClarityChange[] {
    const changes: ClarityChange[] = [];
    const next = new Map<string, boolean>();
    for (const c of Object.values(game.cards)) {
      if (c.zone !== 'ally' && c.zone !== 'persona') continue;
      next.set(c.uid, c.exhausted);
      if (this.exhausted.get(c.uid) === false && c.exhausted) changes.push({ kind: 'exhaust', uid: c.uid });
    }
    const states = game.players.map(p => p.releasedState);
    if (this.states) states.forEach((state, p) => {
      const before = this.states![p];
      if (before && before !== state) changes.push({ kind: 'stateLost', player: p as PlayerId, state: before });
    });
    this.states = states;
    this.exhausted = next;
    return changes;
  }
}
