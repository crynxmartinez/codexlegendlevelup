import { expect, it } from 'vitest';
import { previewDefense } from './defense-comparison.js';

const incoming = { attack: 22000, base: 11000, targetName: 'Taguwasi' };
it('keeps an exact tie provisional and requires strictly higher defense', () => {
  expect(previewDefense(incoming, [10000]).defense).toBe(21000);
  expect(previewDefense(incoming, [11000]).outcome).toBe('Attack would hit');
  expect(previewDefense(incoming, [15000]).outcome).toBe('Defense would hold');
  expect(previewDefense(incoming, [15000]).note).toContain('Checks can change');
});
it('previews the first-blocker bonus once without spending it on selection/deselection', () => {
  const info = Object.freeze({ ...incoming, firstBonus: 5000 });
  expect(previewDefense(info, []).defense).toBe(11000);
  expect(previewDefense(info, [10000, 5000]).defense).toBe(31000);
  expect(previewDefense(info, [10000]).defense).toBe(26000);
  expect(previewDefense(info, []).defense).toBe(11000);
  expect(info.firstBonus).toBe(5000);
});
it('distinguishes a real zero contribution from unavailable card data', () => {
  expect(previewDefense(incoming, [0]).defense).toBe(11000);
  expect(previewDefense(incoming, [undefined]).defense).toBeNull();
  expect(previewDefense(incoming, [NaN]).outcome).not.toContain('hold');
});
