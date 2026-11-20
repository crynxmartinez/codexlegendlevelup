import { motionDuration, motionReduced, playMotion, batchDelay } from './duel-motion.js';
/** Deal already-created opening hands without changing authoritative game state. */
export async function animateOpeningHands(onDraw: () => void): Promise<void> {
  const reduced = motionReduced();
  const duration = motionDuration();
  const flights: Promise<void>[] = [];
  const sides = [
    { deck: '.mat:not(.foe) .z-deck', cards: '.hand-bar .hand-card' },
    { deck: '.mat.foe .z-deck', cards: '.foehand .fb' },
  ];
  const ghosts: HTMLElement[] = [];
  const targets: HTMLElement[] = [];
  try {
    for (const side of sides) {
      const deck = document.querySelector<HTMLElement>(side.deck);
      if (!deck) continue;
      const from = deck.getBoundingClientRect();
      document.querySelectorAll<HTMLElement>(side.cards).forEach((card, i) => {
        targets.push(card);
        const to = card.getBoundingClientRect();
        const fly = document.createElement('div');
        fly.className = 'opening-deal-card';
        fly.style.cssText = `position:fixed;pointer-events:none;z-index:950;left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;background-size:100% 100%;border-radius:5px;`;
        // Opponent targets only contain the card back, never hidden card art.
        fly.style.backgroundImage = getComputedStyle(card).backgroundImage;
        document.body.append(fly); ghosts.push(fly);
        const frames: Keyframe[] = reduced ? [{ opacity: 0 }, { opacity: 1 }] : [
          { opacity: 0, transform: `translate(${from.left-to.left}px,${from.top-to.top}px) scale(.65)` },
          { opacity: 1, offset: .15 },
          { opacity: 1, transform: 'translate(0,0) scale(1)' },
        ];
        flights.push(playMotion(fly, frames, duration, batchDelay(i, document.querySelectorAll(side.cards).length)).then(() => {
          card.style.visibility = 'visible';
          fly.remove();
          if (side === sides[0]) onDraw();
        }));
      });
    }
    await Promise.all(flights);
  } finally {
    ghosts.forEach(n => n.remove());
    targets.forEach(n => n.style.removeProperty('visibility'));
  }
}
