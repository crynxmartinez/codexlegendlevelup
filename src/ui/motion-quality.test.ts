import { DecorationGovernor } from './motion-quality.js';
import { expect, it } from 'vitest';
import { motionBudget } from './motion-quality.js';

it('caps decorative work on landscape phones and high density displays', () => {
  const phone = motionBudget(844, 390, 3, 'full');
  const desktop = motionBudget(1920, 1080, 2, 'full');
  expect(phone.particles).toBeLessThan(desktop.particles);
  expect(phone.density).toBeLessThan(desktop.density);
  expect(phone.resolution).toBe(1.25);
  expect(phone.waves).toBe(3);
  expect(desktop.resolution).toBe(1.75);
});
it('removes particles and shockwaves on minimal while keeping a valid canvas scale', () => {
  const low = motionBudget(844, 390, 0, 'minimal');
  expect(low).toMatchObject({ particles: 0, density: 0, waves: 0, resolution: 1 });
});

it('reduces only decorative budgets after sustained slow frames and resets', () => {
  const governor = new DecorationGovernor();
  for (let i = 0; i < 30; i++) governor.sample(16);
  expect(governor.scale).toBe(1);
  for (let i = 0; i < 30; i++) governor.sample(45);
  expect(governor.scale).toBe(.5);
  governor.sample(1000); expect(governor.scale).toBe(.5);
  governor.reset(); expect(governor.scale).toBe(1);
});
