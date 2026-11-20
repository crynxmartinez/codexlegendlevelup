import { expect, it } from 'vitest';
import { heritageAt, LOADING_HERITAGE } from './loading-heritage.js';

it('rotates through every sourced note and wraps as the catalogue grows', () => {
  expect(new Set(LOADING_HERITAGE.map(entry => entry.id)).size).toBe(LOADING_HERITAGE.length);
  LOADING_HERITAGE.forEach((entry, i) => {
    expect(heritageAt(i)).toBe(entry);
    expect(heritageAt(i + LOADING_HERITAGE.length)).toBe(entry);
    expect(new URL(entry.url).protocol).toBe('https:');
    expect(entry.source).toBeTruthy();
  });
  expect(heritageAt(NaN)).toBe(LOADING_HERITAGE[0]);
  expect(heritageAt(-1)).toBe(LOADING_HERITAGE[0]);
});
