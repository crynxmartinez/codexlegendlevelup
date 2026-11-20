import { describe, expect, it } from 'vitest';
import luzon from '../../decks/agta-set-1.json';
import visayas from '../../decks/babaylan-set-1.json';
import mindanao from '../../decks/maguindanao-set-1.json';
import { ALL_CARDS } from '../data/loader.js';
import { deckImageLayout, deckViewModel } from './deck-view-model.js';

describe('read-only deck projection', () => {
  it.each([
    [luzon, [13, 13, 7, 12, 3, 2]],
    [visayas, [14, 9, 8, 12, 5, 2]],
    [mindanao, [20, 6, 8, 12, 4, 0]],
  ] as const)('preserves normal starter main/Codex counts without adding the Persona', (deck, expected) => {
    const original = JSON.stringify(deck);
    const model = deckViewModel(deck, ALL_CARDS);
    expect(model.mainCount).toBe(50);
    expect(model.codexCount).toBe(5);
    expect(model.counts.map(count => count.value)).toEqual(expected);
    expect(model.main.filter(entry => entry.id === deck.persona)).toHaveLength(1);
    expect(JSON.stringify(deck)).toBe(original);
  });

  it('aggregates repeated records by stable ID while retaining real quantity', () => {
    const card = luzon.main[0]!;
    const model = deckViewModel({ ...luzon, main: [{ id: card.id, copies: 1 }, { id: card.id, copies: 2 }], codex: [] }, ALL_CARDS);
    expect(model.main).toHaveLength(1);
    expect(model.main[0]!.copies).toBe(3);
    expect(model.mainCount).toBe(3);
    expect(model.codexCount).toBe(0);
  });

  it('reports the actual incomplete draft instead of inventing a full deck', () => {
    const main = luzon.main.map(entry => ({ ...entry }));
    const levelOne = main.find(entry => ALL_CARDS[entry.id]!.type === 'Unit' && ALL_CARDS[entry.id]!.level === 1 && entry.copies >= 2)!;
    levelOne.copies -= 2;
    const model = deckViewModel({ ...luzon, main: main.filter(entry => entry.copies > 0) }, ALL_CARDS);
    expect(model.mainCount).toBe(48);
    expect(model.counts.find(count => count.label === 'Level 1')!.value).toBe(11);
  });

  it('never drops unknown card identities silently from an exported list', () => {
    expect(() => deckViewModel({ ...luzon, main: [{ id: 'unknown/card', copies: 1 }] }, ALL_CARDS)).toThrow('not available');
  });
});

describe('deck image bounds', () => {
  it('reserves sidebar space even for an empty or one-card draft', () => {
    expect(deckImageLayout(0, 0).height).toBeGreaterThanOrEqual(1120);
    expect(deckImageLayout(1, 0).height).toBeGreaterThanOrEqual(1120);
  });
  it('grows for long lists while keeping card size and separate Codex rows', () => {
    const normal = deckImageLayout(21, 5), crowded = deckImageLayout(50, 5);
    expect(crowded.cellWidth).toBe(normal.cellWidth);
    expect(crowded.height).toBeGreaterThan(normal.height);
    expect(crowded.codexTop).toBeGreaterThan(crowded.mainTop + 8 * crowded.cellHeight);
    expect(crowded.gridLeft + crowded.columns * crowded.cellWidth + (crowded.columns - 1) * crowded.gap).toBeLessThan(crowded.width);
    expect(crowded.codexTop + crowded.cellHeight).toBeLessThan(crowded.height - 52);
  });
});
