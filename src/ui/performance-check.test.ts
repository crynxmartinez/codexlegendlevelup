import { afterEach, expect, it, vi } from 'vitest';
import { measureGameplay, performanceReport, summarizeFrames } from './performance-check.js';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('calculates frame time percentiles without altering the samples', () => {
  const samples = [...Array(95).fill(10), ...Array(5).fill(50)]; const before = [...samples];
  expect(summarizeFrames(samples)).toEqual({ frames: 100, averageFps: 1000 / 12, p95FrameMs: 10, slowFrames: 5 });
  expect(samples).toEqual(before);
});
it('handles empty and invalid samples without infinite results', () => {
  expect(summarizeFrames([0, NaN, -1, Infinity]).averageFps).toBe(0);
});
it('ends resized checks, cancels pending work and permits another check', () => {
  vi.useFakeTimers();
  const page = new EventTarget(), screen = new EventTarget(), cancel = vi.fn();
  vi.stubGlobal('document', page); vi.stubGlobal('window', screen);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42)); vi.stubGlobal('cancelAnimationFrame', cancel);
  measureGameplay('low');
  expect(performanceReport()).toContain('Checking while you play');
  screen.dispatchEvent(new Event('resize'));
  expect(performanceReport()).toContain('Check interrupted');
  expect(cancel).toHaveBeenCalledWith(42); expect(vi.getTimerCount()).toBe(0);
  measureGameplay('low'); expect(performanceReport()).toContain('Checking while you play');
  page.dispatchEvent(new Event('visibilitychange'));
  expect(vi.getTimerCount()).toBe(0);
});
