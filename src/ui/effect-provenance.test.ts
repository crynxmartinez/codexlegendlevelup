import { expect, it } from 'vitest';
import { groupModifiers, originLabel } from './effect-provenance.js';
import type { PowerModifier } from '../core/types.js';
it('separates physical sources and retains Offer causes in their original slots', () => {
  const origin = { uid: 'a', name: 'Spirit, Salendagao', owner: 0 as const, zone: 'ally' as const, slot: 1 };
  const modifier: PowerModifier = { amount: 5000, source: origin.name, duration: 'endOfTurn', origin };
  const groups = groupModifiers([modifier, modifier, { ...modifier, origin: { ...origin, uid: 'b', slot: 2 } }, { ...modifier, origin: { ...origin, uid: 'b', slot: 2 } }]);
  expect(groups.map(g => [g.origin?.uid, g.count, g.amount * g.count])).toEqual([['a', 2, 10000], ['b', 2, 10000]]);
  expect(originLabel(origin)).toBe('Salendagao · You · Left');
  expect(originLabel(origin, 1)).toBe('Salendagao · Foe · Right');
});
it('retains readable legacy modifiers without inventing source positions', () => {
  const groups = groupModifiers([{ amount: 3000, source: 'Old source', duration: 'endOfTurn' }]);
  expect(groups[0]?.origin).toBeUndefined(); expect(groups[0]?.count).toBe(1);
});
