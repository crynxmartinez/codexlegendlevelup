import sheetUrl from './assets/special-call-ring.png?url';
import { motionEpoch, motionReduced } from './duel-motion.js';

const sheet = new Image();
sheet.src = sheetUrl;

/** Original AutoSprite frames. Cosmetic only: never owns a rules decision. */
export async function playSpecialCallRing(target: HTMLElement, duration = 650): Promise<void> {
  if (motionReduced() || document.hidden || !target.isConnected) return;
  const epoch = motionEpoch();
  // Never stall a match on a missing image or a slow connection.
  const loaded = await Promise.race([sheet.decode().then(() => true, () => false),
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))]);
  if (!loaded || epoch !== motionEpoch() || !target.isConnected || document.hidden) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;pointer-events:none;z-index:110;';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.append(canvas);
  await new Promise<void>(resolve => {
    let request = 0;
    const done = () => { cancelAnimationFrame(request); clearTimeout(timeout); canvas.remove(); resolve(); };
    const timeout = setTimeout(done, duration + 150);
    const start = performance.now();
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      if (t >= 1 || epoch !== motionEpoch() || document.hidden || !target.isConnected) { done(); return; }
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) { done(); return; }
      const size = Math.min(320, Math.max(rect.width, rect.height) * 1.65);
      canvas.style.width = canvas.style.height = `${size}px`;
      canvas.style.left = `${rect.left + rect.width / 2 - size / 2}px`;
      canvas.style.top = `${rect.top + rect.height / 2 - size / 2}px`;
      // Last three exported cells are clipped/empty. Fade the intact growth
      // frames instead of displaying the broken outer-edge fragments.
      const frame = Math.min(12, Math.floor(t * 13));
      ctx.clearRect(0, 0, 256, 256);
      ctx.globalAlpha = Math.min(1, t / .08, (1 - t) / .24);
      ctx.drawImage(sheet, (frame % 4) * 256, Math.floor(frame / 4) * 256, 256, 256, 0, 0, 256, 256);
      request = requestAnimationFrame(draw);
    };
    request = requestAnimationFrame(draw);
  });
}

// Opt-in local preview on the actual board; never appears in production.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('ringPreview')) {
  const button = document.createElement('button');
  button.textContent = 'Preview Special Call';
  button.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px;border-radius:8px;background:#241e12;color:#ffe3a1;border:1px solid #bf9c49';
  button.onclick = async () => {
    const target = document.querySelector<HTMLElement>('.mat:not(.foe) .slot[data-slot="1"]');
    if (!target) { button.textContent = 'Start a match first'; return; }
    button.disabled = true;
    try { await playSpecialCallRing(target); } finally { button.disabled = false; button.textContent = 'Preview Special Call'; }
  };
  document.body.append(button);
}
