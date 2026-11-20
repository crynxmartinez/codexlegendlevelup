import { describe, expect, it } from 'vitest';
import type { AbilityOption } from '../core/effects.js';
import { abilityChoices } from './ability-choices.js';

const option = (uid: string, id: string, text = 'Sanib this card: give a Unit +5000'): AbilityOption =>
  ({ uid, id, cardName: 'Spirit Mediator, Iday', text });

describe('waiting-effect card choices', () => {
  it('keeps different Offer causes independently selectable without changing decision indices', () => {
    const cause = { uid: 'offered-a', name: 'Rattan, Kuritan', owner: 0 as const, zone: 'ally' as const, slot: 0 };
    const options = [{ ...option('sal-a', 'one'), cause },
      { ...option('sal-a', 'two'), cause: { ...cause, uid: 'offered-b', slot: 1 } },
      { ...option('sal-b', 'three'), cause }];
    expect(abilityChoices(options, true).map(c => c.index)).toEqual([0, 1, 2]);
  });
  it('shows two physical Iday cards for four queued triggers and preserves original decision indices', () => {
    const options = [option('iday-a', 'trigger-1'), option('iday-a', 'trigger-2'),
      option('iday-b', 'trigger-3'), option('iday-b', 'trigger-4')];
    const choices = abilityChoices(options, true);
    expect(choices.map(c => [c.option.uid, c.index, c.occurrences])).toEqual([
      ['iday-a', 0, 2], ['iday-b', 2, 2],
    ]);
    expect(options).toHaveLength(4);
    expect(choices[1]!.option).toBe(options[2]);
  });

  it('does not merge different skills or response decisions', () => {
    const options = [option('iday-a', 'one'), option('iday-a', 'two', 'Another skill')];
    expect(abilityChoices(options, true)).toHaveLength(2);
    expect(abilityChoices([options[0]!, option('iday-a', 'three')], false)).toHaveLength(2);
    expect(abilityChoices([
      { ...options[0]!, skillId: 'skill-a' }, { ...options[0]!, skillId: 'skill-b' },
    ], true)).toHaveLength(2);
  });

  it('keeps one remaining occurrence selectable after an earlier occurrence is consumed', () => {
    const options = [option('iday-a', 'trigger-2'), option('iday-b', 'trigger-3')];
    expect(abilityChoices(options, true).map(c => c.option.id)).toEqual(['trigger-2', 'trigger-3']);
  });
});
