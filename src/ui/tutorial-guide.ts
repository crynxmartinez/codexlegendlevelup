import { helpPlacement, visibleBox, type Box } from './overlay-placement.js';

/** Tutorial-only placement. Never change board geometry to make room for a guide. */
export function tutorialGuidePlacement(view: Box, wanted: { width: number; height: number }, protectedAreas: Box[], anchor: Box): Box | undefined {
  const box = helpPlacement(view, wanted, protectedAreas, anchor);
  // A tiny scroll slit is not a readable instruction. Use the explicit restore control instead.
  return box && box.width >= Math.min(260, wanted.width) && box.height >= Math.min(136, wanted.height) ? box : undefined;
}

export function visibleTutorialAnchor(root: ParentNode, selector?: string): HTMLElement | null {
  if (!selector) return null;
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).find(node => visibleBox(node)) ?? null;
}

export function tutorialLocation(target: HTMLElement): string {
  if (target.closest('.turn-btn')) return 'LOWER RIGHT · PHASE ACTION';
  if (target.closest('.hand-bar')) return 'YOUR HAND · BOTTOM OF THE BOARD';
  if (target.closest('.defense-zone')) return 'CENTER · DEFENSE';
  const side = target.closest('.mat.foe') ? 'OPPONENT' : 'YOUR FIELD';
  if (target.closest('.z-barrier')) return `${side} · BARRIERS`;
  if (target.closest('.slot.persona')) return `${side} · PERSONA`;
  if (target.closest('.slot')) return `${side} · ALLY ZONE`;
  for (const zone of ['deck', 'grave', 'codex', 'heart', 'extra', 'exile', 'check']) {
    if (target.closest(`.z-${zone}, .${zone}-btn`)) return `${side} · ${zone.toUpperCase()}`;
  }
  return 'FOLLOW THE CYAN HIGHLIGHT';
}

export function placeTutorialGuide(coach: HTMLElement, target: HTMLElement): boolean {
  const vv = window.visualViewport;
  const view = { left: (vv?.offsetLeft ?? 0) + 8, top: (vv?.offsetTop ?? 0) + 8,
    width: (vv?.width ?? innerWidth) - 16, height: (vv?.height ?? innerHeight) - 16 };
  coach.hidden = false;
  coach.style.width = ''; coach.style.maxHeight = ''; coach.style.visibility = '';
  const location = coach.querySelector<HTMLElement>('.tutorial-location');
  if (location) location.textContent = tutorialLocation(target);
  const obstacles = [target, ...Array.from(document.querySelectorAll<HTMLElement>(
    '.hand-bar, .side header, .anime-phases, .anime-turn, .turn-btn, .duel-access, .defense-zone.scored, '
    + '.first-battle-controls, .journey-controls, .slot.drop, .card.targetable, '
    + '.cc-footer, .duel-dialog > .row, .duel-restore'))];
  const protectedAreas = obstacles.filter(node => !coach.contains(node) && visibleBox(node))
    .map(node => { const b = node.getBoundingClientRect(); return {left:b.left-8, top:b.top-8, width:b.width+16, height:b.height+16}; });
  const rect = coach.getBoundingClientRect();
  const box = tutorialGuidePlacement(view, rect, protectedAreas, target.getBoundingClientRect());
  if (!box) return false;
  Object.assign(coach.style, {left:`${box.left}px`, top:`${box.top}px`, width:`${box.width}px`, maxHeight:`${box.height}px`});
  coach.dataset.compact = String(box.height < rect.height);
  return true;
}
