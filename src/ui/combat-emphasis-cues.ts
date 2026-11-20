import type { GameState, Phase, PlayerId, PowerModifier } from '../core/types.js';
import { currentPower, type CardIndex } from '../core/state.js';
import { cardDisplayName } from './card-name.js';
import { POWER_DURATION_LABELS } from './power-details.js';
import { motionReduced, playMotion } from './duel-motion.js';
import { waitFor, type DuelPace } from './pace.js';

interface PowerSnapshot { entry: number; power: number; modifiers: PowerModifier[] }
export interface PowerCue {
  uid: string; before: number; after: number; delta: number;
  source: string; detail: string; expired: boolean; target?: string;
}
const modifierKey = (m: PowerModifier) => JSON.stringify([m.sourceId ?? m.source, m.origin?.uid, m.amount, m.duration]);
function difference(a: readonly PowerModifier[], b: readonly PowerModifier[]): PowerModifier[] {
  const remaining = b.map(modifierKey);
  return a.filter(m => { const at = remaining.indexOf(modifierKey(m)); if (at < 0) return true; remaining.splice(at, 1); return false; });
}

/** Compare engine-calculated visible values, not nominal modifier amounts.
 * A resolved batch is one net change; another render of it is not another cue. */
export class PowerCueTracker {
  private previous = new Map<string, PowerSnapshot>();
  reset(): void { this.previous.clear(); }
  update(game: GameState, index: CardIndex): PowerCue[] {
    const next = new Map<string, PowerSnapshot>(), changes: PowerCue[] = [];
    for (const card of Object.values(game.cards)) {
      if (card.faceDown || !['ally', 'persona'].includes(card.zone)) continue;
      const definition = index[card.defId];
      if (!definition || !['Unit', 'Force'].includes(definition.type)) continue;
      const snapshot: PowerSnapshot = { entry: card.fieldEntry ?? 0, power: currentPower(index, game, card.uid), modifiers: card.modifiers.map(m => ({ ...m })) };
      next.set(card.uid, snapshot);
      const before = this.previous.get(card.uid);
      if (!before || before.entry !== snapshot.entry || before.power === snapshot.power) continue;
      const added = difference(snapshot.modifiers, before.modifiers), removed = difference(before.modifiers, snapshot.modifiers);
      const expired = removed.length > 0 && added.length === 0;
      const changed = expired ? removed : added;
      const sources = [...new Set(changed.map(m => m.source ? cardDisplayName(m.source) : 'Effect'))];
      const durations = [...new Set(changed.map(m => POWER_DURATION_LABELS[m.duration]))];
      changes.push({ uid: card.uid, before: before.power, after: snapshot.power, delta: snapshot.power - before.power,
        target: `${card.owner === 0 ? 'Your' : 'Opponent'} ${cardDisplayName(definition.name)}`,
        source: sources.length === 1 ? sources[0]! : sources.length > 1 ? `${sources.length} effects` : 'Current Power',
        detail: expired ? 'Effect ended' : durations.length === 1 ? durations[0]! : 'Effects updated', expired });
    }
    this.previous = next;
    return changes;
  }
}

export const phaseCueKey = (turn: number, phase: Phase, player: PlayerId): string => `${turn}:${player}:${phase}`;
export class PhaseCueTracker {
  private last = '';
  reset(key = ''): void { this.last = key; }
  take(key: string): boolean { if (key === this.last) return false; this.last = key; return true; }
}

export function cueTiming(pace: DuelPace) {
  const hold = waitFor(pace, 'resultHold')!;
  return { hold, enter: Math.min(200, waitFor(pace, 'routine')!), exit: Math.min(160, waitFor(pace, 'routine')!), pulse: Math.min(350, hold * .4) };
}

interface CueBox { left: number; top: number; width: number; height: number }
export function powerCueOverlap(at: { left: number; top: number }, cue: { width: number; height: number }, obstacles: readonly CueBox[]): number {
  return obstacles.reduce((area, box) => area
    + Math.max(0, Math.min(at.left + cue.width, box.left + box.width + 3) - Math.max(at.left, box.left - 3))
    * Math.max(0, Math.min(at.top + cue.height, box.top + box.height + 3) - Math.max(at.top, box.top - 3)), 0);
}

/** Prefer the card's immediate surroundings, then search free side rails and
 * obstacle edges. A crowded hand must never be the default fallback. */
export function powerCuePosition(card: CueBox, cue: { width: number; height: number }, view: { width: number; height: number }, obstacles: readonly CueBox[] = []) {
  const clamp = (left: number, top: number) => ({ left: Math.max(8, Math.min(view.width - cue.width - 8, left)), top: Math.max(8, Math.min(view.height - cue.height - 8, top)) });
  const candidates = [
    clamp(card.left + card.width + 10, card.top + card.height * .3),
    clamp(card.left - cue.width - 10, card.top + card.height * .3),
    clamp(card.left + (card.width - cue.width) / 2, card.top - cue.height - 10),
    clamp(card.left + (card.width - cue.width) / 2, card.top + card.height + 10),
  ];
  const boxes = [card, ...obstacles], overlap = (at: { left: number; top: number }) => powerCueOverlap(at, cue, boxes);
  const nearby = candidates.find(candidate => overlap(candidate) === 0);
  if (nearby) return nearby;
  const middle = (view.height - cue.height) / 2;
  const xs = new Set([view.width - cue.width - 8, 8, ...boxes.flatMap(box => [box.left + box.width + 10, box.left - cue.width - 10])]);
  const ys = new Set([middle, ...boxes.flatMap(box => [box.top + box.height + 10, box.top - cue.height - 10]), 8, view.height - cue.height - 8]);
  let best = candidates.reduce((result, candidate) => overlap(candidate) < overlap(result) ? candidate : result);
  for (const x of xs) for (const y of ys) {
    const candidate = clamp(x, y), area = overlap(candidate);
    if (area === 0) return candidate;
    if (area < overlap(best)) best = candidate;
  }
  return best;
}

const textNode = (tag: string, className: string, text: string) => {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
};

export async function presentPowerCue(card: HTMLElement, change: PowerCue, pace: DuelPace, signal?: AbortSignal): Promise<void> {
  if (!change.delta || signal?.aborted || !card.isConnected || document.hidden) return;
  const rect = card.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  const controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const cue = textNode('div', `combat-power-cue ${change.delta > 0 ? 'gain' : 'loss'}`, '');
  cue.dataset.uid = change.uid; cue.dataset.delta = String(change.delta);
  cue.setAttribute('aria-hidden', 'true');
  const face = textNode('div', 'combat-power-face', '');
  const sword = textNode('span', 'combat-power-sword', '');
  sword.innerHTML = '<svg viewBox="0 0 32 44" aria-hidden="true"><path d="M16 2 22 10 19 27 25 30 23 34 18 32 18 40 14 40 14 32 9 34 7 30 13 27 10 10Z"/><path class="sword-groove" d="M16 9V27"/></svg>';
  const words = textNode('div', 'combat-power-words', '');
  words.append(textNode('small', 'combat-power-target', change.target ?? 'Affected card'),
    textNode('strong', 'combat-power-delta', `${change.delta > 0 ? '↑ +' : '↓ −'}${Math.abs(change.delta).toLocaleString('en-US')}`),
    textNode('span', 'combat-power-values', `${change.before.toLocaleString('en-US')} → ${change.after.toLocaleString('en-US')}`),
    textNode('small', 'combat-power-source', `${change.source} · ${change.detail}`));
  face.append(sword, words); cue.append(face); document.body.append(cue);
  const obstacles = Array.from(document.querySelectorAll<HTMLElement>(
    '.card, .hand-bar, .foehand, .barrier-row, .identity-panel, .anime-zone-plays, .pilebox, .anime-phases, '
    + '.side .actions, .rail, .duel-access, .cc-dialog, .duel-dialog, .modal, .power-details, .combat-power-cue'))
    .filter(node => node !== cue && node !== card && !node.contains(card)).map(node => node.getBoundingClientRect()).filter(box => box.width && box.height);
  const view = { width: innerWidth, height: innerHeight };
  let size = cue.getBoundingClientRect(), position = powerCuePosition(rect, size, view, obstacles);
  if (powerCueOverlap(position, size, [rect, ...obstacles]) > 0 && innerWidth <= 1000) {
    // Same text sizes, with the value/source rows spanning below the sword.
    // This fits the genuine 120px side rail at 844×390 instead of covering hands.
    cue.classList.add('combat-power-rail');
    size = cue.getBoundingClientRect(); position = powerCuePosition(rect, size, view, obstacles);
  }
  const detached = position.left + size.width < rect.left - 20 || position.left > rect.left + rect.width + 20
    || position.top + size.height < rect.top - 20 || position.top > rect.top + rect.height + 20;
  if (detached) {
    cue.classList.add('combat-power-detached');
    size = cue.getBoundingClientRect(); position = powerCuePosition(rect, size, view, obstacles);
  }
  cue.style.left = `${position.left}px`; cue.style.top = `${position.top}px`;
  // A card can be moved/removed by a newer remote snapshot while this cue reads.
  const observer = new MutationObserver(() => { if (!card.isConnected) abort(); });
  observer.observe(document.body, { childList: true, subtree: true });
  const direction = change.delta > 0 ? -1 : 1;
  try {
    await playMotion(cue, motionReduced() ? [{ opacity: 1 }, { opacity: 1, offset: .85 }, { opacity: 0 }] : [
      { opacity: 0, translate: `0 ${-direction * 4}px` },
      { opacity: 1, translate: `0 ${direction * 8}px`, offset: .12 },
      { opacity: 1, translate: `0 ${direction * 8}px`, offset: .9 },
      { opacity: 0, translate: `0 ${direction * 10}px` },
    ], cueTiming(pace).hold, 0, 'ease-out', controller.signal);
  } finally { observer.disconnect(); signal?.removeEventListener('abort', abort); cue.remove(); }
}

/** One text-only pulse within the existing announcement beat; no screen flash. */
export async function presentPhaseCue(banner: HTMLElement, pace: DuelPace, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted || document.hidden) return;
  const timing = cueTiming(pace), total = timing.enter + timing.hold + timing.exit;
  const reduced = motionReduced(), words = banner.querySelector<HTMLElement>('.phase-text');
  banner.classList.add('combat-phase-cue'); document.body.append(banner);
  try {
    const movement: Keyframe[] = reduced ? [{ opacity: 1 }, { opacity: 1, offset: .95 }, { opacity: 0 }] : [
      { opacity: 0, translate: '-12px 0' }, { opacity: 1, translate: '0 0', offset: timing.enter / total },
      { opacity: 1, translate: '0 0', offset: (timing.enter + timing.hold) / total }, { opacity: 0, translate: '8px 0' },
    ];
    await Promise.all([
      playMotion(banner, movement, total, 0, 'ease-out', signal),
      ...(!reduced && words ? [playMotion(words, [
        { textShadow: '0 0 0 transparent' }, { textShadow: '0 0 9px #53e9ff, 0 0 18px #3cd5ff70', offset: .5 }, { textShadow: '0 0 0 transparent' },
      ], timing.pulse, timing.enter, 'ease-in-out', signal)] : []),
    ]);
  } finally { banner.remove(); }
}
