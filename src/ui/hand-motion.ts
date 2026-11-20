import type { HandMoveFx, PlayerId, Zone } from '../core/types.js';
import { flyCard, batchDelay, motionDuration } from './duel-motion.js';
import { playCue } from './sfx.js';
import { feedbackAt } from './battle-feedback.js';

export interface HandMotionHost {
  source(uid: string, owner: PlayerId, position: number): HTMLElement | null;
  origin(uid: string, owner: PlayerId): DOMRect;
  destination(zone: Zone, owner: PlayerId, slot: number | null): HTMLElement | null;
  art(id: string): string;
  back: string;
  viewer: PlayerId;
  signal?: AbortSignal;
}

export function handMoveDestination(zone: Zone, owner: PlayerId, slot: number | null): HTMLElement | null {
  const mat = document.querySelector(owner === 0 ? '.mat:not(.foe)' : '.mat.foe');
  if (zone === 'ally' && slot != null) return mat?.querySelectorAll<HTMLElement>('.z-units .slot')[slot < 2 ? slot : slot + 1] ?? null;
  if (zone === 'heart' || zone === 'persona') return mat?.querySelector('.slot.persona') ?? null;
  return mat?.querySelector(`.z-${zone}`) ?? null;
}

/** All sources disappear together; small staggering never serializes a whole discard. */
export async function animateHandMove(fx: HandMoveFx, host: HandMotionHost): Promise<void> {
  if (document.hidden || host.signal?.aborted) return;
  const hidden = new Map<HTMLElement, string>();
  const destinations = new Set<HTMLElement>();
  const flights = fx.cards.map((card, i) => {
    const source = host.source(card.uid, fx.owner, i);
    const measured = source?.getBoundingClientRect();
    const from = measured?.width && measured.height ? measured : host.origin(card.uid, fx.owner);
    if (source) { hidden.set(source, source.style.visibility); source.style.visibility = 'hidden'; }
    const destination = host.destination(card.to, fx.owner, card.toSlot);
    if (card.to === 'ally' || card.to === 'persona') {
      const settled = destination?.querySelector<HTMLElement>(`[data-uid="${CSS.escape(card.uid)}"]`);
      if (settled && !hidden.has(settled)) { hidden.set(settled, settled.style.visibility); settled.style.visibility = 'hidden'; }
    }
    if (destination) destinations.add(destination);
    const bounds = destination?.getBoundingClientRect();
    const width = Math.min(bounds?.width || 70, 110), height = Math.min(bounds?.height || 98, width * 1.4);
    const to = bounds?.width ? new DOMRect(bounds.x + (bounds.width-width)/2, bounds.y + (bounds.height-height)/2, width, height) : from;
    return { from, to, card };
  });
  playCue('cardPlay');
  try {
    await Promise.all(flights.map(({ from, to, card }, i) => flyCard({ from, to,
      image: `url("${fx.owner === host.viewer || !card.hidden ? host.art(card.defId) : host.back}")`,
      duration: motionDuration() * 2, delay: batchDelay(i, flights.length), landing: motionDuration('routine'), signal: host.signal })));
    if (document.hidden || host.signal?.aborted) return;
    for (const destination of destinations) {
      const zone = fx.cards.find(c => host.destination(c.to, fx.owner, c.toSlot) === destination)?.to;
      feedbackAt(destination, zone === 'grave' ? 'Sent to Grave' : zone === 'deck' ? 'Returned to Deck' : zone === 'ally' ? 'Special called' : `Moved to ${zone ?? 'destination'}`);
    }
  } finally {
    for (const [node, visibility] of hidden) node.style.visibility = visibility;
  }
}
