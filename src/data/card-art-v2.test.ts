import { describe, expect, it } from 'vitest';
import { ALL_CARDS, isSelectableCard } from './loader.js';
import artwork from './card-art-v2.json';

describe('anime artwork integration', () => {
  it('covers every active card in the three decks, with no extra entries', () => {
    const active = Object.values(ALL_CARDS).filter(c => isSelectableCard(c) && ['Agta', 'Babaylan', 'Maguindanao'].includes(c.deck));
    expect(active).toHaveLength(141);
    expect(Object.keys(artwork).sort()).toEqual(active.map(c => c.id).sort());
    for (const card of active) {
      expect(card.art).toContain('/web/rounded-v3/');
      expect(card.thumb).toContain('/thumb/rounded-v3/');
    }
  });
  it('uses the new art at every resolution for the completed Taguwasi card', () => {
    const card = ALL_CARDS['agta/set-1/wind-heart-rescuer-taguwasi'];
    if (!card) throw new Error('Active Taguwasi card is missing');
    expect(card.art).toContain('/web/rounded-v3/');
    expect(card.thumb).toContain('/thumb/rounded-v3/');
    expect(card.power).toBe(11000);
    expect(card.level).toBe(3);
  });
  it('never applies the overhaul to hidden or retired cards', () => {
    const excluded = Object.values(ALL_CARDS).filter(c => !isSelectableCard(c));
    expect(excluded.length).toBeGreaterThan(0);
    expect(excluded.filter(c => c.art.includes('/rounded-v3/'))).toEqual([]);
  });
  it('limits new artwork to the three requested active decks', () => {
    for (const card of Object.values(ALL_CARDS).filter(c => c.art.includes('/rounded-v3/'))) {
      expect(isSelectableCard(card)).toBe(true);
      expect(['Agta', 'Babaylan', 'Maguindanao']).toContain(card.deck);
    }
  });
});
