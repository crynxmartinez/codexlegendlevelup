import { flyCard, motionEpoch, motionReduced, playMotion } from './duel-motion.js';

/** Keep the newly drawn card hidden until the Deck cue and flight finish. */
export async function animateDeckDraw(deck: HTMLElement, target: HTMLElement, image: string, glowMs = 180): Promise<void> {
  const start = motionEpoch();
  const visibility = target.style.visibility;
  target.style.visibility = 'hidden';
  try {
    await playMotion(deck, motionReduced() ? [
      { outline: '2px solid #edcb76', outlineOffset: '3px' },
      { outline: '2px solid #edcb76', outlineOffset: '3px' },
    ] : [
      { filter: 'brightness(1)', boxShadow: '0 0 0 transparent' },
      { filter: 'brightness(1.45)', boxShadow: '0 0 18px #edcb76, 0 0 6px #fff1bf', offset: .55 },
      { filter: 'brightness(1.15)', boxShadow: '0 0 8px #edcb76' },
    ], motionReduced() ? Math.min(80, glowMs) : glowMs);
    if (start !== motionEpoch() || document.hidden || !deck.isConnected || !target.isConnected) return;
    await flyCard({ from: deck.getBoundingClientRect(), to: target.getBoundingClientRect(), target, image });
  } finally {
    target.style.visibility = visibility;
  }
}
