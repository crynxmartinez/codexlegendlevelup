/** Load optional particle graphics only when a duel board needs them. */
type Layer = typeof import('./fx-gl-layer.js');
let layer: Layer | null = null;
let pending: Promise<void> | null = null;
let enabled = true;
export async function initGlFx(): Promise<void> {
  if (!enabled || !document.querySelector('.board-wrap')) return;
  if (pending) return pending;
  if (layer) return layer.initGlFx();
  pending = import('./fx-gl-layer.js').then(async loaded => {
    layer = loaded; loaded.setGlFxEnabled(enabled); await loaded.initGlFx();
  }).catch(error => { console.warn('[fx-gl] optional graphics unavailable', error); }).finally(() => { pending = null; });
  return pending;
}
export function setGlFxEnabled(on: boolean): void {
  enabled = on; layer?.setGlFxEnabled(on);
  if (on && typeof document !== 'undefined' && document.querySelector('.board-wrap')) void initGlFx();
}
export const glFxAvailable = () => layer?.glFxAvailable() ?? false;
export const glFxAnimating = () => layer?.glFxAnimating() ?? false;
export const glStrike = (...args: Parameters<Layer['glStrike']>): void => { layer?.glStrike(...args); };
export const glDestroy = (...args: Parameters<Layer['glDestroy']>): void => { layer?.glDestroy(...args); };
export const glPower = (...args: Parameters<Layer['glPower']>): void => { layer?.glPower(...args); };
export const glArrive = (...args: Parameters<Layer['glArrive']>): void => { layer?.glArrive(...args); };
export const glWard = (...args: Parameters<Layer['glWard']>): void => { layer?.glWard(...args); };
export const glRestore = (...args: Parameters<Layer['glRestore']>): void => { layer?.glRestore(...args); };
export const glResource = (...args: Parameters<Layer['glResource']>): void => { layer?.glResource(...args); };
export const glImpact = (...args: Parameters<Layer['glImpact']>): void => { layer?.glImpact(...args); };
export const glBarrierBreak = (...args: Parameters<Layer['glBarrierBreak']>): void => { layer?.glBarrierBreak(...args); };
export const glStateRelease = (...args: Parameters<Layer['glStateRelease']>): void => { layer?.glStateRelease(...args); };
export const renderGlFrame = (...args: Parameters<Layer['renderGlFrame']>): void => { layer?.renderGlFrame(...args); };
