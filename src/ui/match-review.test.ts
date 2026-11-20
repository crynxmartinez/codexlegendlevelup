import { expect, it } from 'vitest';
import { matchHighlights } from './match-review.js';
import type { DuelEvent } from '../core/events.js';
const event = (id: number, group: number, visibility: DuelEvent['visibility'] = 'public') =>
  ({ id, group, actor: 1, type: 'abilityResolved', visibility, message: String(id) }) as DuelEvent;
it('returns up to three recent distinct moments in chronological order', () => {
  expect(matchHighlights([event(1, 1), event(2, 2), event(3, 2), event(4, 3), event(5, 4)], 0).map(e => e.id)).toEqual([3, 4, 5]);
});
it('does not mutate the log or expose the other players private events', () => {
  const events = [event(1, 1), event(2, 2, 'owner'), event(3, 3, 'internal')];
  const before = JSON.stringify(events);
  expect(matchHighlights(events, 0).map(e => e.id)).toEqual([1]);
  expect(JSON.stringify(events)).toBe(before);
});
