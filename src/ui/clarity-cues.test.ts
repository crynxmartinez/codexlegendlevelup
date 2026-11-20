import { expect, it } from 'vitest';
import { ClarityTracker, destinationLabel } from './clarity-cues.js';
import type { GameState } from '../core/types.js';

function board() {
  return { cards: { a: { uid: 'a', zone: 'ally', exhausted: false }, hidden: { uid: 'hidden', zone: 'hand', exhausted: false } },
    players: [{ releasedState: 'Bayanihan' }, { releasedState: null }] } as unknown as GameState;
}
it('does not announce initial state, repeated renders, or hidden hand changes', () => {
  const tracker = new ClarityTracker(), g = board();
  expect(tracker.update(g)).toEqual([]);
  g.cards.hidden!.exhausted = true;
  expect(tracker.update(g)).toEqual([]);
  g.cards.a!.exhausted = true;
  expect(tracker.update(g)).toEqual([{ kind: 'exhaust', uid: 'a' }]);
  expect(tracker.update(g)).toEqual([]);
});
it('announces a State becoming inactive once, including Codex switching', () => {
  const tracker = new ClarityTracker(), g = board(); tracker.update(g);
  g.players[0].releasedState = null;
  expect(tracker.update(g)).toEqual([{ kind: 'stateLost', player: 0, state: 'Bayanihan' }]);
  expect(tracker.update(g)).toEqual([]);
});
it('does not mistake an exhausted arrival for an exhaustion action', () => {
  const tracker = new ClarityTracker(), g = board(); tracker.update(g);
  g.cards.a!.zone = 'grave'; tracker.update(g);
  g.cards.a!.zone = 'ally'; g.cards.a!.exhausted = true;
  expect(tracker.update(g)).toEqual([]);
});
it('keeps exile distinct from destruction and does not invent unknown outcomes', () => {
  expect(destinationLabel('exile')).toBe('Exiled');
  expect(destinationLabel('grave')).toBe('Sent to Grave');
  expect(destinationLabel('unknown')).toBe('');
});
