import { expect, it } from 'vitest';
import { cardHudPosture } from './card-hud.js';
import css from './card-hud.css?raw';

it.each([
  [0, 0], [90, 0], [180, 180], [270, 180],
])('keeps labels upright for card %i degrees on mat %i degrees', (card, mat) => {
  const hud = cardHudPosture(card);
  expect((card + mat + hud.rotation) % 360).toBe(0);
  expect(hud.sideways).toBe(card === 90 || card === 270);
});

it('overrides the generic 44px touch-button floor for compact card badges', () => {
  expect(css).toMatch(/\.card-hud \.mod-chip\s*\{[^}]*min-height:\s*18px/s);
  expect(css).toMatch(/\.card-hud \.mod-chip\s*\{[^}]*letter-spacing:\s*0/s);
});
