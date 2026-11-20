import { afterEach, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ init: vi.fn(async () => {}), enabled: vi.fn(), strike: vi.fn() }));
vi.mock('./fx-gl-layer.js', () => ({ initGlFx: calls.init, setGlFxEnabled: calls.enabled, glStrike: calls.strike,
  glFxAvailable: () => true, glFxAnimating: () => false }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); vi.resetModules(); });
it('does not initialize optional graphics off the board', async () => {
  vi.stubGlobal('document', { querySelector: () => null });
  const fx = await import('./fx-gl.js'); await fx.initGlFx();
  expect(calls.init).not.toHaveBeenCalled(); expect(fx.glFxAvailable()).toBe(false);
});
it('deduplicates initial loading and forwards effects after loading', async () => {
  vi.stubGlobal('document', { querySelector: () => ({}) });
  const fx = await import('./fx-gl.js'); await Promise.all([fx.initGlFx(), fx.initGlFx()]);
  expect(calls.init).toHaveBeenCalledTimes(1);
  fx.glStrike(1, 2, 3, 4); expect(calls.strike).toHaveBeenCalledWith(1, 2, 3, 4);
});
it('respects disabled graphics without starting a load', async () => {
  vi.stubGlobal('document', { querySelector: () => ({}) });
  const fx = await import('./fx-gl.js'); fx.setGlFxEnabled(false); await fx.initGlFx();
  expect(calls.init).not.toHaveBeenCalled();
});
