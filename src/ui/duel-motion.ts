import { waitFor, type DuelPace } from './pace.js';
import { readyFlightArt } from './card-art-cache.js';

/** Render-only ownership: the travelling copy is the card until it lands. */
export class CardTransit {
  private active = new Map<string, number>();
  has(uid: string): boolean { return this.active.has(uid); }
  visible(uids: readonly string[]): string[] { return uids.filter(uid => !this.has(uid)); }
  begin(uid: string): () => void {
    this.active.set(uid, (this.active.get(uid) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const remaining = (this.active.get(uid) ?? 1) - 1;
      if (remaining) this.active.set(uid, remaining); else this.active.delete(uid);
    };
  }
}

/** Visual timing only. Engine choices and card ownership never live here. */
export function motionReduced(): boolean {
  return document.documentElement.dataset.animationIntensity === 'minimal'
    || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function motionDuration(kind: 'cardMove' | 'routine' | 'sourceActivation' = 'cardMove'): number {
  const saved = document.documentElement.dataset.duelPace;
  const pace: DuelPace = saved === 'fast' || saved === 'learning' ? saved : 'standard';
  return waitFor(pace, kind, motionReduced())!;
}

const running = new Set<Animation>();
const holds = new Set<() => void>();
let epoch = 0;
export const motionEpoch = (): number => epoch;
/** Keep even a large batch within one short, readable travelling beat. */
export function batchDelay(index: number, count: number, duration = motionDuration()): number {
  return motionReduced() || count < 2 ? 0 : Math.min(duration * .45, index * Math.min(40, duration * .45 / (count - 1)));
}
/** Reading time can be shortened explicitly, never by clicking a game card. */
export function holdDuelMotion(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || document.hidden || signal?.aborted) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', done); holds.delete(done); resolve(); };
    const timer = setTimeout(done, ms);
    holds.add(done);
    signal?.addEventListener('abort', done, { once: true });
  });
}
/** Finishes visuals only; never clicks or dismisses a decision. */
export function finishDuelMotion(): void {
  epoch++;
  for (const done of holds) done();
  for (const animation of running) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
}

// A viewport change invalidates flight coordinates. Settle visuals instead of
// leaving cards in mid-air; decisions and the rules state remain untouched.
if (typeof window !== 'undefined') {
  window.addEventListener('resize', finishDuelMotion);
  window.addEventListener('pagehide', finishDuelMotion);
  window.addEventListener('orientationchange', finishDuelMotion);
  // Internal card rails may scroll without moving the board. Page scrolling
  // does move every flight endpoint, so settle only that coordinate change.
  document.addEventListener('scroll', event => {
    if (event.target === document) finishDuelMotion();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishDuelMotion();
  });
}

/** Cancellation, a removed node, or a suspended tab cannot strand the engine. */
export async function playMotion(node: HTMLElement, frames: Keyframe[], duration = motionDuration(), delay = 0, easing = 'cubic-bezier(.22,.7,.25,1)', signal?: AbortSignal): Promise<void> {
  if (signal?.aborted || !node.isConnected || typeof node.animate !== 'function' || document.hidden) return;
  let animation: Animation | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => animation?.cancel();
  try {
    animation = node.animate(frames, { duration, delay, easing, fill: 'both' });
    signal?.addEventListener('abort', cancel, { once: true });
    running.add(animation);
    document.documentElement.classList?.add('duel-animating');
    await Promise.race([
      animation.finished.catch(() => {}),
      new Promise<void>(resolve => { timer = setTimeout(resolve, duration + delay + 150); }),
    ]);
  } catch {
    // Motion is optional; a browser animation failure must not reject a rule hook.
  } finally {
    signal?.removeEventListener('abort', cancel);
    clearTimeout(timer);
    if (animation) { running.delete(animation); animation.cancel(); }
    if (!running.size) document.documentElement.classList?.remove('duel-animating');
  }
}

/** A visible approach before the defender chooses; no impact is implied yet. */
export async function attackWindup(node: HTMLElement, dx: number, dy: number): Promise<void> {
  const start = epoch;
  // Rendering starts the CSS posture transition. Finish that turn in place
  // before translating; both local hooks and online playback use this path.
  await waitForAttackRotation(node);
  if (epoch !== start || !node.isConnected || document.hidden) return;
  const length = Math.hypot(dx, dy) || 1;
  const reach = motionReduced() ? 0 : Math.min(32, length * .16);
  const forward = `${dx / length * reach}px ${dy / length * reach}px`;
  await playMotion(node, [
    { translate: '0 0', filter: 'brightness(1)' },
    { translate: forward, filter: 'brightness(1.45)', offset: .32 },
    { translate: forward, filter: 'brightness(1.3)', offset: .72 },
    { translate: '0 0', filter: 'brightness(1)' },
  ], motionDuration() * 1.8);
}

export async function waitForAttackRotation(node: HTMLElement): Promise<void> {
  const turns = node.getAnimations?.().filter(animation =>
    (animation as Animation & { transitionProperty?: string }).transitionProperty === 'transform') ?? [];
  if (!turns.length) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  turns.forEach(animation => running.add(animation));
  try {
    await Promise.race([
      Promise.all(turns.map(animation => animation.finished.catch(() => {}))),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 1200); }),
    ]);
  } finally {
    clearTimeout(timer);
    // A suspended transition must not overlap the next phase either.
    turns.forEach(animation => { running.delete(animation); try { animation.finish(); } catch { animation.cancel(); } });
  }
}

/** Contact is a real phase boundary: the hit happens before the return stroke. */
export async function attackMotion(node: HTMLElement, dx: number, dy: number, impact: () => void): Promise<void> {
  const start = epoch;
  const length = Math.hypot(dx, dy) || 1;
  const reach = motionReduced() ? 0 : Math.min(48, length * .22);
  const contact = `${dx / length * reach}px ${dy / length * reach}px`;
  const duration = motionDuration() * 1.8;
  const previous = node.style.translate;
  try {
    await playMotion(node, [
      { translate: '0 0' },
      { translate: `${-dx / length * reach * .15}px ${-dy / length * reach * .15}px`, offset: .2 },
      { translate: contact },
    ], duration * .6);
    // Keep the contact pose between animations rather than briefly snapping home.
    if (epoch === start) node.style.translate = contact;
    impact();
    if (epoch === start) await playMotion(node, [{ translate: contact }, { translate: '0 0' }], duration * .4);
  } finally { node.style.translate = previous; }
}

export interface Flight {
  from: DOMRect; to: DOMRect; image: string;
  duration?: number; delay?: number; landing?: number; target?: HTMLElement | null;
  signal?: AbortSignal;
}
/** Zone hit areas can be wide. Travelling artwork always keeps card proportions. */
export function cardFlightBounds(rect: DOMRect): DOMRect {
  const height = Math.min(rect.height, rect.width * 7 / 5);
  const width = height * 5 / 7;
  return new DOMRect(rect.left + (rect.width - width) / 2, rect.top + (rect.height - height) / 2, width, height);
}
/** A shallow arc with an exact landing, independent of field-card rotation. */
export function flightFrames(from: DOMRect, to: DOMRect): Keyframe[] {
  const dx = from.left - to.left, dy = from.top - to.top;
  const sx = from.width / to.width, sy = from.height / to.height;
  const lift = Math.min(24, Math.hypot(dx, dy) * .07);
  return [
    { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1 },
    { transform: `translate(${dx * .45}px,${dy * .45 - lift}px) scale(${1 + (sx - 1) * .45},${1 + (sy - 1) * .45})`, opacity: 1, offset: .55 },
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
  ];
}
/** A screen-space copy avoids changing field-card rotation or hit targets. */
export async function flyCard({ from, to, image, duration = motionDuration(), delay = 0, landing = 0, target, signal }: Flight): Promise<void> {
  if (!from.width || !from.height || !to.width || !to.height || signal?.aborted) return;
  from = cardFlightBounds(from); to = cardFlightBounds(to);
  const requestEpoch = epoch;
  await readyFlightArt(image);
  if (requestEpoch !== epoch || document.hidden || signal?.aborted) return;
  const ghost = document.createElement('div');
  ghost.className = 'duel-flight';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.cssText = `position:fixed;pointer-events:none;z-index:950;left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;background-size:100% 100%;border-radius:5px;transform-origin:0 0;`;
  ghost.style.backgroundImage = image;
  const visibility = target?.style.visibility ?? '';
  if (target) target.style.visibility = 'hidden';
  document.body.append(ghost);
  const cancel = () => { for (const animation of ghost.getAnimations()) animation.cancel(); ghost.remove(); };
  signal?.addEventListener('abort', cancel, { once: true });
  const start = epoch;
  try {
    await playMotion(ghost, motionReduced() ? [{ opacity: 0 }, { opacity: 1 }] : flightFrames(from, to), duration, delay);
    if (landing && start === epoch && !signal?.aborted) await playMotion(ghost, [{ opacity: .85 }, { opacity: 1 }], landing);
  } finally {
    signal?.removeEventListener('abort', cancel);
    ghost.remove();
    if (target) target.style.visibility = visibility;
  }
}

export function captureHand(): Map<string, number> {
  return new Map(Array.from(document.querySelectorAll<HTMLElement>('.hand-card[data-uid]'), node => [node.dataset.uid!, node.offsetLeft]));
}
export function settleHand(before: Map<string, number>, reservedSlot = false): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.hand-card[data-uid]'));
  // Hover, selection and ordinary renders do not restart a layout animation.
  if (!reservedSlot && before.size === cards.length && cards.every(n => before.has(n.dataset.uid!))) return;
  for (const node of cards) {
    const oldX = before.get(node.dataset.uid!);
    if (oldX === undefined || motionReduced() || Math.abs(oldX - node.offsetLeft) < 1) continue;
    void playMotion(node, [{ translate: `${oldX - node.offsetLeft}px 0` }, { translate: '0 0' }]);
  }
}

export function revealPanel(node: HTMLElement): void {
  if (motionReduced()) return;
  void playMotion(node, [
    { opacity: .6, translate: '0 8px' }, { opacity: 1, translate: '0 0' },
  ], Math.min(140, motionDuration('routine')));
}
