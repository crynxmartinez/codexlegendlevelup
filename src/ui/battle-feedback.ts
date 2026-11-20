import { settings } from './settings.js';
import { waitFor } from './pace.js';

export type DeckTheme = 'agta' | 'babaylan' | 'maguindanao' | 'neutral';
const feedback = new WeakMap<Element, HTMLElement>();
const activeFeedback = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
const targetPulses = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
function removeFeedback(node: HTMLElement): void {
  clearTimeout(activeFeedback.get(node)); activeFeedback.delete(node); node.remove();
}
function clearFeedback(): void {
  for (const node of activeFeedback.keys()) removeFeedback(node);
  for (const [node, timer] of targetPulses) { clearTimeout(timer); node.classList.remove('effect-recipient'); }
  targetPulses.clear();
}
/** A bounded outline rather than an extra animation wait or a blocking result dialog. */
export function highlightEffectTarget(node: HTMLElement | null): void {
  if (!node?.isConnected || document.hidden) return;
  clearTimeout(targetPulses.get(node)); node.classList.add('effect-recipient');
  targetPulses.set(node, setTimeout(() => { node.classList.remove('effect-recipient'); targetPulses.delete(node); }, 1000));
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', clearFeedback);
  window.addEventListener('scroll', clearFeedback, { passive:true, capture:true });
  window.addEventListener('pagehide', clearFeedback);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearFeedback(); });
}
export function deckTheme(id: string): DeckTheme {
  const prefix = id.split('/')[0];
  return prefix === 'agta' || prefix === 'babaylan' || prefix === 'maguindanao' ? prefix : 'neutral';
}

/** A compact caption at the actual card/zone, never a second permanent HUD. */
export function feedbackAt(anchor: Element | null, text: string, theme: DeckTheme = 'neutral'): void {
  if (!anchor || !anchor.isConnected) return;
  const r = anchor.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const previous = feedback.get(anchor); if (previous) removeFeedback(previous);
  const n = document.createElement('div');
  n.className = `battle-feedback theme-${theme}`; n.textContent = text;
  n.setAttribute('role', 'status');
  document.body.append(n);
  feedback.set(anchor, n);
  const { width, height } = n.getBoundingClientRect();
  n.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, r.x + r.width / 2 - width / 2))}px`;
  n.style.top = `${Math.max(8, Math.min(innerHeight - height - 8, r.top - height - 8))}px`;
  const duration = waitFor(settings().duelPace, 'resultHold') ?? 1100;
  // Longer explanations remain readable without delaying the game or requiring Continue.
  const readingTime = text.length > 40 ? 2800 : 600;
  activeFeedback.set(n, setTimeout(() => removeFeedback(n), Math.max(readingTime, duration)));
}

export function selectionLabel(node: HTMLElement, text: string): HTMLElement {
  const tag = document.createElement('span');
  tag.className = 'combat-label'; tag.textContent = text; tag.setAttribute('aria-hidden', 'true');
  node.append(tag);
  return tag;
}

/** Presentation duration only: never changes engine actions or decisions. */
export function spectacleDuration(ms: number, pace: 'learning' | 'standard' | 'fast', minimal: boolean): number {
  return Math.max(40, Math.round(ms * (pace === 'fast' ? .4 : pace === 'learning' ? 1.25 : 1) * (minimal ? .35 : 1)));
}
