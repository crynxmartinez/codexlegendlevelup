import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { skillConfirmation } from './skill-confirmation.js';

beforeEach(() => {
  class Node { className = ''; innerHTML = ''; children: Node[] = []; append(child: Node) { this.children.push(child); } }
  vi.stubGlobal('document', { createElement: () => new Node() });
});
afterEach(() => vi.unstubAllGlobals());

it('names the manual switch cost before confirmation and offers a safe Keep current action', () => {
  expect(skillConfirmation('Switch to Arawen? Manual switching costs 1 Play.')).toMatchObject({
    title: 'Switch Codex?', accept: 'Switch · 1 Play', decline: 'Keep current', unavailable: false,
  });
});

it('does not assign a Play cost to an explicitly free switch', () => {
  expect(skillConfirmation('Switch to Arawen? Switching is free.')).toMatchObject({
    title: 'Switch Codex?', accept: 'Switch', decline: 'Keep current',
  });
});

it('keeps ordinary effect choices distinct from manual Codex switching', () => {
  expect(skillConfirmation('Use the follow-up to look at the top 5 cards?')).toMatchObject({
    title: 'Use this effect?', accept: 'Use effect', decline: 'Skip',
  });
});
