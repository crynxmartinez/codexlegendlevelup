import type { AttackResult } from '../core/battle.js';
import { motionDuration, motionEpoch, motionReduced, playMotion } from './duel-motion.js';

type PersonaImpactResult = Pick<AttackResult, 'hit' | 'personaHit' | 'sentryUsed' | 'cancelReason'>;
interface PersonaImpactOptions {
  signal?: AbortSignal;
  /** Captured before approach/travel, so fast-forward cannot start a late recoil. */
  epoch: number;
  shake: 'off' | 'low' | 'full';
}

/** A landed attack moves only its Persona target; no new hit or gameplay state. */
export async function playPersonaImpact(
  node: HTMLElement | null, source: DOMRect | undefined, result: PersonaImpactResult,
  { signal, epoch, shake }: PersonaImpactOptions,
): Promise<void> {
  if (!result.hit || !result.personaHit || result.sentryUsed || result.cancelReason
    || !node?.isConnected || !source || signal?.aborted || epoch !== motionEpoch()
    || document.hidden || shake === 'off' || motionReduced()) return;
  const target = node.getBoundingClientRect();
  const dx = target.left + target.width / 2 - source.left - source.width / 2;
  const dy = target.top + target.height / 2 - source.top - source.height / 2;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 1 || target.width <= 0 || target.height <= 0) return;
  const amplitude = Math.min(8, Math.max(4, Math.min(target.width, target.height) * .07))
    * (shake === 'low' ? .55 : 1);
  const x = dx / length * amplitude, y = dy / length * amplitude;
  const pose = (amount: number, offset: number): Keyframe => ({
    translate: `${x * amount}px ${y * amount}px`, offset, composite: 'add',
  });
  node.classList.add('persona-impact');
  try {
    // Independent additive translation preserves exhausted-card rotation/scale.
    // This overlaps the contact frames instead of adding another reading pause.
    await playMotion(node, [pose(0, 0), pose(1, .15), pose(-.45, .38),
      pose(.22, .62), pose(-.1, .8), pose(0, 1)],
    Math.max(160, Math.min(300, motionDuration() * .56)), 0, 'ease-out', signal);
  } finally {
    node.classList.remove('persona-impact');
  }
}
