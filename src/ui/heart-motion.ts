import type { HeartMoveCard, HeartMoveFx, PlayerId, Zone } from '../core/types.js';
import { playCue } from './sfx.js';
import { feedbackAt } from './battle-feedback.js';
import { playMotion, motionDuration, batchDelay, motionEpoch } from './duel-motion.js';
import { readyFlightArt } from './card-art-cache.js';
import { followCardWithLight, showMovementKeyword } from './movement-cue.js';

export interface HeartMotionHost {
  card(uid: string): HTMLElement | null;
  zone(zone: Zone | 'created' | 'vanished', owner: PlayerId, slot: number | null): HTMLElement | null;
  art(defId: string): string;
  back: string;
  viewer: PlayerId;
  duration(ms: number): number;
  reduced: boolean;
  anime?: boolean;
}

export function heartMoveLabel(fx: HeartMoveFx): string {
  const n = fx.cards.length;
  if (fx.reason === 'vent') return `Kalas ${n} · Heart ${fx.before} → ${fx.after}`;
  if (fx.reason === 'essence') return `Sanib ${n} · Heart ${fx.before} → ${fx.after}`;
  if (fx.reason === 'create') return `Create ${n} Kaluluwa · Heart ${fx.before} → ${fx.after}`;
  const to = fx.cards[0]?.to;
  const action = to === 'hand' ? 'Return to hand' : to === 'ally' ? 'Special call'
    : to === 'persona' ? 'Personify' : to === 'grave' ? 'Send to Grave'
    : to === 'exile' ? 'Move to Exile' : to === 'deck' ? 'Return to deck' : 'Move to Heart';
  return `${action} · Heart ${fx.before} → ${fx.after}`;
}

export function heartCardFaceUp(card: HeartMoveCard, owner: PlayerId, viewer: PlayerId): boolean {
  return !card.hidden || owner === viewer;
}

/** Snapshots survive token deletion and several moves before the board redraws. */
export async function animateHeartMove(fx: HeartMoveFx, host: HeartMotionHost): Promise<void> {
  const epoch = motionEpoch();
  const sanib = fx.reason === 'essence';
  if (document.hidden) return;
  const heart = host.zone('heart', fx.owner, null);
  const count = heart?.querySelector('.spirit-count');
  if (count) count.textContent = `${fx.before} in Heart`;
  const marked = new Set<HTMLElement>();
  const hidden = new Map<HTMLElement, string>();
  const flying: HTMLElement[] = [];
  const sourceCues = new Map<HTMLElement, Promise<void>>();
  const trails: (() => void)[] = [];
  const tint = host.anime ? (fx.owner === host.viewer ? '#72efff' : '#ff87ae') : '#b18aff';
  const keyword = sanib ? 'SANIB' : fx.reason === 'vent' ? 'KALAS' : fx.reason === 'create' ? 'KALULUWA' : undefined;
  const clearKeyword = host.anime && keyword ? showMovementKeyword(keyword, fx.owner !== host.viewer, host.reduced) : () => {};
  const pulse = (node: HTMLElement | null) => {
    if (node) { node.classList.add('heart-motion-pulse'); marked.add(node); }
  };
  const bounds = (node: HTMLElement | null): DOMRect => {
    const r = node?.getBoundingClientRect();
    if (r?.width && r.height) return r;
    return heart?.getBoundingClientRect() ?? new DOMRect(innerWidth / 2, innerHeight / 2, 64, 90);
  };
  const label = heartMoveLabel(fx);
  try {
    if (!sanib) pulse(heart);
    if (!host.anime) feedbackAt(heart, label, 'babaylan');
    playCue(fx.reason === 'vent' ? 'vent' : fx.reason === 'essence' || fx.reason === 'create' ? 'essence' : 'cardPlay');
    const flights = fx.cards.map(async (card, i) => {
      const visibleCard = ['ally', 'persona', 'hand'].includes(card.from) ? host.card(card.uid) : null;
      const source = visibleCard ?? host.zone(card.from, fx.owner, card.fromSlot);
      const destination = host.zone(card.to, fx.owner, card.toSlot);
      const image = `url("${heartCardFaceUp(card, fx.owner, host.viewer) ? host.art(card.defId) : host.back}")`;
      await readyFlightArt(image);
      if (epoch !== motionEpoch() || document.hidden) return;
      if ((sanib || fx.reason === 'vent') && source && !host.reduced) {
        // Illuminate the actual pile before the travelling copy appears.
        if (!sourceCues.has(source)) sourceCues.set(source, playMotion(source, [
          { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' },
          { filter: 'brightness(1.35)', boxShadow: `0 0 20px ${tint}, 0 0 7px ${tint}`, offset: .65 },
          { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' },
        ], host.duration(120)));
        await sourceCues.get(source);
        if (epoch !== motionEpoch() || document.hidden) return;
      } else pulse(source);
      const src = bounds(source), dst = bounds(destination);
      const w = Math.min(76, Math.max(40, src.width)), h = w * 1.4;
      const fan = Math.max(-30, Math.min(30, (i - (fx.cards.length - 1) / 2) * 20));
      const x = Math.max(4, Math.min(innerWidth - w - 4, src.x + src.width / 2 - w / 2 + fan));
      const y = Math.max(4, Math.min(innerHeight - h - 4, src.y + src.height / 2 - h / 2));
      const fly = document.createElement('div');
      fly.className = `heart-travel heart-travel-${fx.reason}`;
      fly.dataset.uid = card.uid;
      fly.dataset.from = card.from;
      fly.dataset.to = card.to;
      fly.setAttribute('aria-hidden', 'true');
      fly.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      fly.style.backgroundImage = image;
      document.body.append(fly); flying.push(fly);
      if (visibleCard) { hidden.set(visibleCard, visibleCard.style.visibility); visibleCard.style.visibility = 'hidden'; }
      const dx = dst.x + dst.width / 2 - (x + w / 2);
      const dy = dst.y + dst.height / 2 - (y + h / 2);
      const vanished = card.to === 'vanished';
      const frames: Keyframe[] = host.reduced
        ? [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }]
        : sanib ? [
          { transform: 'translate(0, 0) scale(.92)', opacity: 0 },
          { transform: 'translate(0, -16px) scale(1.05)', opacity: 1, offset: .2 },
          { transform: `translate(${dx * .45}px, ${dy * .45 - 38}px) scale(.88)`, opacity: 1, offset: .52 },
          { transform: `translate(${dx}px, ${dy}px) scale(.28)`, opacity: .8, offset: .88 },
          { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0 },
        ] : [
          { transform: 'translate(0, 0) scale(1)', opacity: card.from === 'created' ? 0 : 1 },
          { transform: 'translate(0, -18px) scale(1.12)', opacity: 1, offset: .24 },
          { transform: `translate(${vanished ? 0 : dx}px, ${vanished ? -65 : dy}px) scale(${vanished ? .15 : .65})`, opacity: vanished ? 0 : .9, offset: .85 },
          { transform: `translate(${vanished ? 0 : dx}px, ${vanished ? -85 : dy}px) scale(.3)`, opacity: 0 },
        ];
      const stopTrail = host.anime ? followCardWithLight(fly, fx.owner !== host.viewer, host.reduced) : () => {};
      trails.push(stopTrail);
      try {
        await playMotion(fly, frames, host.reduced ? Math.min(80, motionDuration()) : sanib ? host.duration(460) : motionDuration(), host.reduced ? 0 : batchDelay(i, fx.cards.length, host.duration(180)));
      } finally { stopTrail(); }
      fly.remove();
      if (!sanib) {
        pulse(destination);
        if (fx.reason === 'vent' && card.to === 'grave') feedbackAt(destination, 'Kalas → Grave');
      }
    });
    await Promise.all(flights);
    if (count) count.textContent = `${fx.after} in Heart`;
    if (host.anime && epoch === motionEpoch() && !document.hidden) feedbackAt(heart, label, 'babaylan');
    if (heart && epoch === motionEpoch()) await playMotion(heart, sanib && !host.reduced ? [
      { transform: 'scale(1)', boxShadow: '0 0 0 transparent' },
      { transform: 'scale(1.12)', boxShadow: `0 0 20px ${tint}, 0 0 7px ${tint}`, offset: .4 },
      { transform: 'scale(1)', boxShadow: '0 0 0 transparent' },
    ] : [{ opacity: .7 }, { opacity: 1 }], sanib ? host.duration(120) : motionDuration('routine'));
  } finally {
    clearKeyword(); trails.forEach(stop => stop());
    for (const node of flying) node.remove();
    for (const node of marked) node.classList.remove('heart-motion-pulse');
    for (const [node, visibility] of hidden) node.style.visibility = visibility;
  }
}
