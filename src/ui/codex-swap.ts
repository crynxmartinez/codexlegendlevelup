import { holdDuelMotion, motionEpoch, motionReduced, playMotion } from './duel-motion.js';
import { readyFlightArt } from './card-art-cache.js';
import './codex-swap.css';

export interface CodexSwapOptions {
  zone: HTMLElement;
  newImage: string;
  previousImage?: string;
  backImage: string;
  name: string;
  signal?: AbortSignal;
  onReveal?: () => void;
}

type Bounds = { left: number; top: number; width: number; height: number };
const overlaps = (a: Bounds, b: Bounds) => a.left < b.left + b.width && a.left + a.width > b.left
  && a.top < b.top + b.height && a.top + a.height > b.top;
const active = new WeakMap<HTMLElement, { cancel: () => void; done: Promise<void> }>();

/** Prefer the owner's nearby gutter, then the closest clear space. Neither the
 * native hand nor either Barrier row is moved to make room for the reveal. */
function revealBounds(anchor: DOMRect, name: string): Bounds | undefined {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
  const vw = viewport?.width ?? innerWidth, vh = viewport?.height ?? innerHeight;
  const protectedAreas = Array.from(document.querySelectorAll<HTMLElement>('.hand-bar,.z-barrier,.foehand,.identity-panel,.anime-phases'))
    .filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden')
    .map(node => node.getBoundingClientRect());
  const preferred = vh <= 550 || vw <= 1000 ? 120 : 200;
  const centerX = anchor.left + anchor.width / 2, centerY = anchor.top + anchor.height / 2;
  for (const width of [preferred, preferred * .85, 90]) {
    // Use the actual full name at the final font/width. Long names must not
    // escape an assumed two-line caption into the protected hand/Barrier area.
    const measurement = document.createElement('div'); measurement.className = 'codex-swap-caption';
    measurement.setAttribute('aria-hidden', 'true');
    measurement.textContent = `Codex active · ${name}`;
    measurement.style.cssText = `position:fixed;left:-10000px;right:auto;bottom:auto;width:${width}px;visibility:hidden`;
    document.body.append(measurement);
    const captionHeight = Math.max(52, measurement.getBoundingClientRect().height);
    measurement.remove();
    const height = width * 1.4 + captionHeight + 4;
    if (height > vh - 24 || width > vw - 24) continue;
    const xs = [anchor.left - width - 12, anchor.right + 12, centerX - width / 2, left + 12, left + vw - width - 12];
    const ys = [centerY - height / 2, anchor.top - height - 12, anchor.bottom + 12, top + 12, top + vh - height - 12,
      ...protectedAreas.flatMap(area => [area.top - height - 12, area.bottom + 12])];
    const fits = xs.flatMap(x => ys.map(y => ({
      left: Math.max(left + 12, Math.min(left + vw - width - 12, x)),
      top: Math.max(top + 12, Math.min(top + vh - height - 12, y)), width, height,
    }))).filter(candidate => !protectedAreas.some(area => overlaps(candidate, area)));
    fits.sort((a, b) => Math.hypot(a.left + width / 2 - centerX, a.top + height / 2 - centerY)
      - Math.hypot(b.left + width / 2 - centerX, b.top + height / 2 - centerY));
    if (fits[0]) return fits[0];
  }
  return undefined;
}

function makeImage(url: string, back: string): HTMLImageElement {
  const image = document.createElement('img');
  image.alt = ''; image.draggable = false;
  let fallback = !url || url === back;
  image.onerror = () => {
    if (!fallback && back) { fallback = true; image.src = back; }
    else { image.hidden = true; image.parentElement?.classList.add('codex-swap-missing'); }
  };
  image.src = url || back;
  return image;
}

/** One public Codex exchange, two seconds at every pace. No state or rules are
 * changed here. The final board art is already owned by the calling renderer. */
export async function playCodexSwap(options: CodexSwapOptions): Promise<void> {
  const { zone, signal } = options;
  const previous = active.get(zone);
  if (previous) { previous.cancel(); await previous.done; }
  if (!zone.isConnected || signal?.aborted || document.hidden) return;
  const epoch = motionEpoch();
  // The existing art cache bounds this preparation to 80ms. It happens before
  // the visible two-second sequence, never shortens the reading hold.
  await Promise.all([options.newImage, options.previousImage, options.backImage]
    .filter((url): url is string => !!url).map(url => readyFlightArt(`url("${url}")`)));
  if (!zone.isConnected || signal?.aborted || document.hidden || motionEpoch() !== epoch) return;

  const mini = zone.querySelector<HTMLElement>(':scope > .mini');
  const anchor = (mini ?? zone).getBoundingClientRect();
  if (!anchor.width || !anchor.height) return;
  const bounds = revealBounds(anchor, options.name);
  // Extremely constrained viewports get the normal final state, never a
  // reveal laid across private hand cards or Barriers.
  if (!bounds) return;
  const reduced = motionReduced();
  const owner = new AbortController();
  const root = document.createElement('div'); root.className = 'codex-swap';
  root.dataset.stage = 'retire'; root.dataset.reduced = String(reduced);
  root.dataset.duration = '2000'; root.dataset.startedAt = String(performance.now());
  root.style.cssText = `left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px`;
  const retiring = document.createElement('div'); retiring.className = 'codex-swap-retiring';
  retiring.setAttribute('aria-hidden', 'true');
  const retiredFace = document.createElement('div'); retiredFace.className = 'codex-swap-old-face';
  const retiredBack = document.createElement('div'); retiredBack.className = 'codex-swap-old-back';
  retiredFace.append(makeImage(options.previousImage || options.backImage, options.backImage));
  retiredBack.append(makeImage(options.backImage, options.backImage));
  retiring.append(retiredFace, retiredBack);
  retiring.style.cssText = `left:${anchor.left - bounds.left}px;top:${anchor.top - bounds.top}px;width:${anchor.width}px;height:${anchor.height}px`;
  const card = document.createElement('div'); card.className = 'codex-swap-card';
  card.setAttribute('aria-hidden', 'true');
  card.style.height = `${bounds.width * 1.4}px`;
  card.append(makeImage(options.newImage, options.backImage));
  const sweep = document.createElement('div'); sweep.className = 'codex-swap-edge'; card.append(sweep);
  const caption = document.createElement('div'); caption.className = 'codex-swap-caption';
  caption.setAttribute('role', 'status'); caption.setAttribute('aria-live', 'polite'); caption.setAttribute('aria-atomic', 'true');
  root.append(retiring, card, caption);
  const visibility = mini?.style.getPropertyValue('visibility') ?? '';
  const priority = mini?.style.getPropertyPriority('visibility') ?? '';
  mini?.style.setProperty('visibility', 'hidden');
  document.body.append(root);
  let release!: () => void;
  const done = new Promise<void>(resolve => { release = resolve; });
  const cancel = () => owner.abort();
  active.set(zone, { cancel, done });
  signal?.addEventListener('abort', cancel, { once: true });
  const hidden = () => { if (document.hidden) cancel(); };
  const disconnected = () => { if (!zone.isConnected || !root.isConnected || (mini && !mini.isConnected)) cancel(); };
  const observer = new MutationObserver(disconnected);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', cancel); window.addEventListener('orientationchange', cancel); window.addEventListener('pagehide', cancel);
  document.addEventListener('visibilitychange', hidden);
  window.visualViewport?.addEventListener('resize', cancel);
  window.visualViewport?.addEventListener('scroll', cancel);
  const alive = () => !owner.signal.aborted && zone.isConnected && motionEpoch() === epoch && !document.hidden;
  // Keep the full visible duration even when Web Animations is unavailable.
  const beat = async (ms: number, work: Promise<void>[]) => {
    await Promise.all([holdDuelMotion(ms, owner.signal), ...work]);
    return alive();
  };
  const animate = (node: HTMLElement, frames: Keyframe[], duration: number, easing = 'ease-in-out') =>
    playMotion(node, frames, duration, 0, easing, owner.signal);
  try {
    if (!await beat(250, [animate(retiring, reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'perspective(500px) rotateY(0deg)', opacity: 1 },
        { transform: 'perspective(500px) rotateY(180deg) translateY(5px)', opacity: .25 }], 250)])) return;
    retiring.remove(); root.dataset.stage = 'reveal';
    options.onReveal?.();
    const dx = anchor.left - bounds.left, dy = anchor.top - bounds.top;
    const scale = Math.min(anchor.width / bounds.width, anchor.height / (bounds.width * 1.4));
    card.style.opacity = '1';
    if (!await beat(400, [animate(card, reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: `translate(${dx}px,${dy}px) scale(${scale}) rotateY(-75deg)`, opacity: .2 },
        { transform: 'translate(0,0) scale(1) rotateY(0deg)', opacity: 1 }], 400)])) return;
    root.dataset.stage = 'read'; caption.textContent = `Codex active · ${options.name}`; caption.style.opacity = '1';
    const reading = reduced ? [] : [
      animate(card, [{ translate: '0 0' }, { translate: '0 -5px', offset: .5 }, { translate: '0 0' }], 1000),
      animate(sweep, [{ opacity: 0, transform: 'translateY(-100%)' }, { opacity: .65, offset: .2 }, { opacity: 0, transform: 'translateY(100%)' }], 420, 'linear'),
    ];
    if (!await beat(1000, reading)) return;
    root.dataset.stage = 'settle'; caption.style.opacity = '0';
    await beat(350, [animate(card, reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: 0 }], 350)]);
  } finally {
    owner.abort(); observer.disconnect();
    signal?.removeEventListener('abort', cancel);
    window.removeEventListener('resize', cancel); window.removeEventListener('orientationchange', cancel); window.removeEventListener('pagehide', cancel);
    document.removeEventListener('visibilitychange', hidden);
    window.visualViewport?.removeEventListener('resize', cancel);
    window.visualViewport?.removeEventListener('scroll', cancel);
    root.remove();
    if (mini) {
      if (visibility) mini.style.setProperty('visibility', visibility, priority);
      else mini.style.removeProperty('visibility');
    }
    if (active.get(zone)?.done === done) active.delete(zone);
    release();
  }
}
