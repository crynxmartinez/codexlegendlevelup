import { expect, it } from 'vitest';
import { STARTERS } from '../pvp/catalog.js';
import { ALL_CARDS } from '../data/loader.js';
import { deckAdvice } from './deck-advice.js';

it('counts copies, preserves the deck and covers each regional mechanic', () => {
  for (const deck of Object.values(STARTERS)) {
    const before = structuredClone(deck);
    const archetype = ALL_CARDS[deck.persona]!.deck;
    const tips = deckAdvice(deck, archetype);
    expect(tips).toHaveLength(4);
    expect(tips[2]!.count).toBe('12 / 12 Forces');
    const actions = deck.main.filter(e => ALL_CARDS[e.id]!.type === 'Action').reduce((n, e) => n + e.copies, 0);
    expect(tips[1]!.count).toBe(`${actions} Actions`);
    expect(tips[3]!.title).toBe(archetype === 'Babaylan' ? 'Build before you Kalas' : archetype === 'Maguindanao' ? 'Support your Offers' : 'Keep Allies available');
    expect(deck).toEqual(before);
  }
});

it('gives useful advice for an empty unfinished deck without inventing cards', () => {
  const tips = deckAdvice({ name: 'Draft', main: [], codex: [], persona: '' }, 'Maguindanao');
  expect(tips[0]!.count).toBe('0 Level 1–2 Units · 0 Units total');
  expect(tips[1]!.text).toContain('no Actions');
  expect(tips[2]!.text).toContain('exactly 12');
  expect(tips[3]!.count).toBe('0 with Offer text · 0 with Last Oath text');
});
