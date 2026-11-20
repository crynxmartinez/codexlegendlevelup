import { cardFlightBounds, flyCard, holdDuelMotion, motionDuration, motionEpoch, motionReduced, playMotion } from './duel-motion.js';
import { cardDisplayName } from './card-name.js';
import { readyFlightArt } from './card-art-cache.js';

/** Upright art emerges at the actual source, including an opponent's rotated mat. */
export function sourceCardBounds(rect: DOMRect, viewport: { width: number; height: number }): DOMRect {
  const height = Math.min(180, Math.max(100, rect.height), viewport.height * .48), width = height * 5 / 7;
  return new DOMRect(Math.max(8, Math.min(viewport.width - width - 8, rect.x + rect.width / 2 - width / 2)),
    Math.max(28, Math.min(viewport.height - height - 32, rect.y + rect.height / 2 - height / 2)), width, height);
}

/** Runs after the chain presentation and before the effect moves any cards. */
export async function animateEffectSource(options: { source?: HTMLElement | null; liftAnchor?: HTMLElement | null; image: string; name: string; zone?: string; signal?: AbortSignal }): Promise<void> {
  const start = motionEpoch();
  await readyFlightArt(`url("${options.image}")`);
  if (start !== motionEpoch()) return;
  const source = options.source, rect = (options.liftAnchor ?? source)?.getBoundingClientRect();
  if (!source || !rect?.width || document.hidden || options.signal?.aborted) return;
  const bounds = sourceCardBounds(rect, { width: innerWidth, height: innerHeight });
  const ghost = document.createElement('div'); ghost.className = 'effect-source-lift';
  ghost.style.cssText = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
  const art = document.createElement('img'); art.src = options.image; art.alt = '';
  const caption = document.createElement('span'); caption.textContent = `${options.zone ? options.zone + ' · ' : ''}${cardDisplayName(options.name)}`;
  ghost.append(art, caption); document.body.append(ghost);
  const alreadyLit = source.classList.contains('effect-source-active'); source.classList.add('effect-source-active');
  const cancel = () => { ghost.getAnimations().forEach(animation => animation.cancel()); ghost.remove(); };
  options.signal?.addEventListener('abort', cancel, { once: true });
  try {
    const lift = motionReduced() ? '0 0' : '0 -18px';
    await playMotion(ghost, [
      { opacity: 0, translate: '0 0', filter: 'brightness(1)' },
      { opacity: 1, translate: lift, filter: 'brightness(1)', offset: .18 },
      { opacity: 1, translate: lift, filter: motionReduced() ? 'brightness(1.08)' : 'brightness(1.35)', offset: .48 },
      { opacity: 1, translate: lift, filter: 'brightness(1)', offset: .82 },
      { opacity: 0, translate: '0 0', filter: 'brightness(1)' },
    ], motionDuration('sourceActivation'), 0, 'ease-in-out');
  } finally {
    options.signal?.removeEventListener('abort', cancel); ghost.remove();
    if (!alreadyLit) source.classList.remove('effect-source-active');
  }
}

/** Light the pile, lift the travelling card, then carry it to its destination. */
export async function animatePileJourney(options: { source?: HTMLElement | null; from: DOMRect; to: DOMRect; image: string; signal?: AbortSignal }): Promise<void> {
  if (document.hidden || options.signal?.aborted || !options.from.width || !options.to.width) return;
  const start = motionEpoch(), source = options.source, alreadyLit = source?.classList.contains('effect-source-active');
  const alive = () => motionEpoch() === start && !document.hidden && !options.signal?.aborted;
  source?.classList.add('effect-source-active');
  const card = document.createElement('div'); card.className = 'pile-card-lift';
  const from = cardFlightBounds(options.from);
  card.style.cssText = `left:${from.x}px;top:${from.y}px;width:${from.width}px;height:${from.height}px;background-image:${options.image}`;
  const cancel = () => { card.getAnimations().forEach(animation => animation.cancel()); card.remove(); };
  options.signal?.addEventListener('abort', cancel, { once: true });
  try {
    await holdDuelMotion(motionDuration() * .6);
    if (!alive()) return;
    document.body.append(card);
    const rise = motionReduced() ? 0 : Math.min(22, Math.max(0, from.y - 8));
    await playMotion(card, [{ translate: '0 0', opacity: .6 }, { translate: `0 -${rise}px`, opacity: 1 }], motionDuration() * .6);
    card.remove();
    if (!alive()) return;
    await flyCard({ from: new DOMRect(from.x, from.y - rise, from.width, from.height), to: options.to,
      image: options.image, duration: motionDuration() * 1.8, landing: motionDuration('routine'), signal: options.signal });
  } finally {
    options.signal?.removeEventListener('abort', cancel); card.remove();
    if (!alreadyLit) source?.classList.remove('effect-source-active');
  }
}
