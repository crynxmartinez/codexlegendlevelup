import { expect, it } from 'vitest';
import { effectOutcomeLabel } from './effect-presentation.js';

it('distinguishes missing targets from negation without claiming the whole effect failed', () => {
  expect(effectOutcomeLabel('partial', ['left-field'])).toBe('Target left the field — affected part skipped');
  expect(effectOutcomeLabel('partial', ['moved'])).toBe('Target changed zones — affected part skipped');
  expect(effectOutcomeLabel('partial', ['no-longer-eligible'])).toBe('Target no longer qualifies — affected part skipped');
  expect(effectOutcomeLabel('negated', ['left-field'])).toBe('Activation negated');
});
