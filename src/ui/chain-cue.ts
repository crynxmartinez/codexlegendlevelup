import { cardDisplayName } from './card-name.js';
import { holdDuelMotion, motionReduced, playMotion, motionDuration, motionEpoch } from './duel-motion.js';
import { waitFor, type DuelPace } from './pace.js';
import { settings } from './settings.js';
import { animateEffectSource } from './source-motion.js';

const active = new Set<() => void>();
export function clearChainCues(): void { for (const cancel of [...active]) cancel(); }
export function activationGlowFrames(reduced: boolean): Keyframe[] {
  return [
    { opacity: 0, transform: reduced ? 'none' : 'scale(.9)', offset: 0 },
    { opacity: reduced ? .45 : 1, transform: reduced ? 'none' : 'scale(1.22)', offset: .45 },
    { opacity: 0, transform: reduced ? 'none' : 'scale(.9)', offset: 1 },
  ];
}

/** Reveal quickly, then reserve the longer beat for the effect actually resolving. */
export function chainCueTiming(pace: DuelPace, stage: 'activated' | 'resolving', negated: boolean, reduced: boolean) {
  const pulse = stage === 'resolving' && !negated ? waitFor(pace, 'chainActivation')! : 0;
  return {
    glow: reduced ? Math.min(100, pulse) : pulse,
    hold: waitFor(pace, negated ? 'chainNegation' : stage === 'activated' ? 'abilityIntro' : 'routine')!
      + (reduced ? Math.max(0, pulse - 100) : 0),
  };
}

export interface ChainCueCard {
  name: string; image: string; ordinal: number; opponent: boolean;
  inspect?: () => void;
}

/** Only committed, still-waiting links appear. Bound the artwork for long chains. */
export function visibleChainCards(current: ChainCueCard, links: readonly ChainCueCard[] = []): ChainCueCard[] {
  const byOrdinal = new Map(links.filter(link => link.ordinal < current.ordinal).map(link => [link.ordinal, link]));
  return [...byOrdinal.values()].sort((a, b) => a.ordinal - b.ordinal).slice(-2).concat(current);
}

/** Original vector chain links; no external artwork or per-frame geometry. */
function connection(from: [number, number], to: [number, number]): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('chain-cue-connection');
  svg.setAttribute('viewBox', '0 0 1000 625');
  svg.setAttribute('aria-hidden', 'true');
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const count = Math.ceil(Math.hypot(dx, dy) / 20);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  for (let i = 0; i <= count; i++) {
    const link = document.createElementNS(ns, 'ellipse');
    link.setAttribute('cx', '0'); link.setAttribute('cy', '0');
    link.setAttribute('rx', '16'); link.setAttribute('ry', i % 2 ? '4' : '9');
    link.setAttribute('transform', `translate(${from[0] + dx * i / count} ${from[1] + dy * i / count}) rotate(${angle})`);
    svg.append(link);
  }
  return svg;
}

/** A timed public-card presentation, never a decision or another card picker. */
export async function presentChainCue(options: ChainCueCard & {
  total?: number;
  stage: 'activated' | 'resolving'; negated?: boolean;
  links?: readonly ChainCueCard[];
  source?: HTMLElement | null; liftAnchor?: HTMLElement | null; sourceZone?: string; signal?: AbortSignal;
}): Promise<void> {
  if (document.hidden || options.signal?.aborted) return;
  const cue = document.createElement('aside');
  const cards = visibleChainCards(options, options.links);
  cue.className = `chain-cue ${options.stage}${options.opponent ? ' foe' : ''}${cards.length === 1 ? ' solo' : ''}`;
  cue.setAttribute('role', 'group');
  cue.setAttribute('aria-label', 'Chain');
  const stage = document.createElement('div'); stage.className = 'chain-cue-stage';
  const positions: [number, number][] = cards.length === 1 ? [[500, 280]]
    : cards.length === 2 ? [[260, 235], [700, 345]] : [[650, 125], [260, 235], [700, 345]];
  for (let i = 1; i < positions.length; i++) stage.append(connection(positions[i - 1]!, positions[i]!));
  const headline = document.createElement('div'); headline.className = 'chain-cue-headline';
  headline.textContent = options.negated ? 'NEGATED' : options.stage === 'activated' ? (options.ordinal > 1 ? 'RESPONSE' : 'ACTIVATED') : 'RESOLVE';
  stage.append(headline);
  let focus!: HTMLElement;
  cards.forEach((entry, i) => {
    const depth = cards.length - 1 - i;
    const card = document.createElement('button'); card.type = 'button';
    card.className = `chain-cue-card depth-${depth}${entry.opponent ? ' foe' : ''}`;
    card.setAttribute('aria-label', `Read ${cardDisplayName(entry.name)} · Chain ${entry.ordinal}`);
    card.title = 'Right-click or tap to read card';
    card.disabled = !entry.inspect;
    const inspect = (event: Event) => { event.preventDefault(); event.stopPropagation(); entry.inspect?.(); };
    card.addEventListener('contextmenu', inspect);
    card.addEventListener('click', inspect);
    card.addEventListener('keydown', event => {
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') inspect(event);
    });
    const image = document.createElement('img'); image.src = entry.image; image.alt = '';
    image.draggable = false;
    const number = document.createElement('b'); number.className = 'chain-cue-number';
    number.textContent = String(entry.ordinal);
    card.append(image, number); stage.append(card);
    if (!depth) focus = card;
  });
  const glow = document.createElement('div'); glow.className = 'chain-cue-glow'; focus.append(glow);
  const lightning = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lightning.setAttribute('viewBox', '0 0 100 140'); lightning.classList.add('chain-cue-lightning');
  for (const d of ['M-8 18 L32 38 18 54 69 75 48 90 109 121', 'M80 -5 L59 33 76 49 37 73 54 99 21 145', 'M-4 112 L24 92 39 105 60 61 96 46']) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); lightning.append(path);
  }
  const muted = document.createElement('img'); muted.className = 'chain-cue-muted'; muted.src = options.image; muted.alt = '';
  if (options.negated) focus.append(muted, lightning);
  const caption = document.createElement('div'); caption.className = 'chain-cue-caption';
  caption.setAttribute('role', 'status');
  const phase = document.createElement('span');
  phase.textContent = options.stage === 'activated'
    ? `${options.opponent ? 'Opponent' : 'You'} ${options.ordinal > 1 ? 'responded' : 'activated'} · Chain ${options.ordinal}`
    : `${options.negated ? 'Negated' : 'Resolving'} · Chain ${options.ordinal}${options.total ? ` of ${options.total}` : ''}`;
  const name = document.createElement('strong'); name.textContent = cardDisplayName(options.name);
  caption.append(phase, name);
  if (options.ordinal > cards.length) {
    const earlier = document.createElement('small');
    earlier.textContent = `+${options.ordinal - cards.length} earlier links`;
    caption.append(earlier);
  }
  cue.append(stage, caption); document.body.append(cue);
  let cancel!: () => void, stopped = false;
  const cancelled = new Promise<void>(resolve => { cancel = () => { stopped = true; resolve(); }; });
  active.add(cancel);
  const hidden = () => { if (document.hidden) cancel(); };
  options.signal?.addEventListener('abort', cancel, { once: true });
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('resize', cancel);
  window.addEventListener('orientationchange', cancel);
  window.addEventListener('pagehide', cancel);
  const beat = (work: Promise<void>) => Promise.race([work, cancelled]);
  const reduced = motionReduced();
  const start = motionEpoch();
  try {
    // The active card arrives; waiting cards and their numbers stay anchored.
    await beat(Promise.all([
      playMotion(cue, [{ opacity: 0 }, { opacity: 1 }], Math.min(160, motionDuration('routine'))),
      playMotion(focus, [
        { opacity: .2, translate: reduced ? '0 0' : '22px 14px', scale: reduced ? '1' : '.96' },
        { opacity: 1, translate: '0 0', scale: '1' },
      ], Math.min(240, motionDuration())),
    ]).then(() => {}));
    if (!stopped && !document.hidden && motionEpoch() === start) {
      const pace = settings().duelPace;
      const timing = chainCueTiming(pace, options.stage, !!options.negated, reduced);
      // Joining the chain is an unlit reveal. Only resolution pulses the light;
      // the regular card stays still throughout the outward-and-back pulse.
      if (options.stage === 'resolving' && !options.negated) {
        await beat(playMotion(glow, activationGlowFrames(reduced), timing.glow, 0, 'ease-in-out'));
      }
      if (stopped || motionEpoch() !== start) return;
      if (options.negated) {
        // One electrical discharge, then a monochrome card. No strobing loop.
        headline.textContent = 'NEGATED';
        cue.classList.add('is-negated');
        focus.classList.add('negation-struck');
        focus.style.translate = '0 0';
        muted.style.opacity = '1';
        await beat(Promise.all([
          playMotion(lightning as unknown as HTMLElement, [{ opacity: 0 }, { opacity: reduced ? 0 : 1, offset: .2 }, { opacity: 0 }], Math.min(300, motionDuration())),
          playMotion(muted, [{ opacity: 0 }, { opacity: 1 }], Math.min(300, motionDuration())),
          playMotion(focus, reduced ? [{ translate: '0 0' }, { translate: '0 0' }] : [
            { translate: '0 0' }, { translate: '-3% 0', offset: .25 }, { translate: '3% 0', offset: .5 }, { translate: '0 0' },
          ], Math.min(300, motionDuration())),
        ]).then(() => {}));
      }
      if (stopped || motionEpoch() !== start) return;
      await beat(holdDuelMotion(timing.hold));
      if (!stopped && motionEpoch() === start) await beat(playMotion(cue, [{ opacity: 1 }, { opacity: 0 }], Math.min(100, motionDuration('routine'))));
    }
  } finally {
    options.signal?.removeEventListener('abort', cancel);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('resize', cancel);
    window.removeEventListener('orientationchange', cancel);
    window.removeEventListener('pagehide', cancel);
    active.delete(cancel);
    options.source?.classList.remove('effect-source-active');
    cue.remove();
  }
  if (options.stage === 'resolving' && !options.negated && !stopped && motionEpoch() === start) {
    await animateEffectSource({ source: options.source, liftAnchor: options.liftAnchor, image: options.image, name: options.name, zone: options.sourceZone, signal: options.signal });
  }
}
