import { syncChildren } from './stable-dom.js';

/** Opponent cards already cancel their mat's half-turn; undo only the posture. */
export function cardHudPosture(cardRotation: number) {
  const sideways = ((cardRotation % 180) + 180) % 180 === 90;
  return { sideways, rotation: sideways ? -90 : 0 };
}

/** Keep status text independent of the artwork's rotation, but moving with it. */
export function syncCardHud(card: HTMLElement, children: HTMLElement[], rotation: number): void {
  const hud = card.querySelector<HTMLElement>(':scope > .card-hud') ?? document.createElement('div');
  hud.className = 'card-hud';
  // Reading an effect must not start the card's drag-to-attack interaction.
  hud.onpointerdown = event => {
    if ((event.target as Element).closest('button')) event.stopPropagation();
  };
  const posture = cardHudPosture(rotation);
  hud.classList.toggle('sideways', posture.sideways);
  hud.style.setProperty('--hud-turn', `${posture.rotation}deg`);
  syncChildren(hud, children);
  syncChildren(card, [hud]);
}
