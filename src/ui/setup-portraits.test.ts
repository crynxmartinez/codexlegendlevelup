import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { setupPortrait } from './setup-portraits.js';
import portraits from './setup-portraits.json';

describe('setup character artwork coverage', () => {
  const active = Object.values(ALL_CARDS).filter(c => isSelectableCard(c) && c.type === 'Unit' && c.level === 3);
  it('covers the entire playable Persona roster, not only a starter deck', async () => {
    expect(Object.keys(portraits).sort()).toEqual(active.map(c => c.id).sort());
    expect(new Set(active.map(c => c.archipelago))).toEqual(new Set(['Luzon','Visayas','Mindanao']));
    for (const card of active) {
      const url = setupPortrait(card.id, card.art);
      expect(url, card.id).not.toBe(card.art);
      // Metadata decoding also fails if the referenced file is missing or invalid.
      expect((await sharp('assets' + url).metadata()).hasAlpha, card.id).toBe(true);
    }
  });
  it('keeps Codex and unknown card previews on their own artwork', () => {
    for (const card of Object.values(ALL_CARDS).filter(c => c.type === 'Codex')) {
      expect(setupPortrait(card.id, card.art)).toBe(card.art);
    }
    expect(setupPortrait('future-card', '/cards/future.webp')).toBe('/cards/future.webp');
  });
});
