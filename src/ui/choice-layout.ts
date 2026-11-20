import { helpPlacement, type Box } from './overlay-placement.js';

/** Reserve entire legal targets, not just their centres. No least-bad overlap. */
export function boardChoicePlacement(view: Box, targets: Box[], incoming: boolean, contentHeight?: number): Box | undefined {
  if (!targets.length) return undefined;
  const inset = { left:view.left + 8, top:view.top + 8, width:view.width - 16, height:view.height - 16 };
  const protectedAreas = targets.map(b => ({ left:b.left - 6, top:b.top - 6, width:b.width + 12, height:b.height + 12 }));
  const wantedHeight = contentHeight === undefined ? (incoming ? 340 : 240) : Math.max(120, contentHeight);
  const fit = helpPlacement(inset, { width:Math.min(940, inset.width), height:wantedHeight }, protectedAreas,
    { left:view.left + view.width / 2, top:view.top, width:0, height:0 });
  return fit && fit.width >= 360 && fit.height >= 120
    && (contentHeight === undefined || fit.height >= contentHeight) ? fit : undefined;
}

/** Geometry only. Never owns selected IDs, resolves a choice, or focuses a card. */
export function mountBoardChoiceLayout(root: HTMLElement, dialog: HTMLElement, targets: HTMLElement[], incoming: boolean,
  useList: () => void): () => void {
  let frame = 0, disposed = false;
  const viewport = window.visualViewport;
  const layout = () => {
    frame = 0;
    if (disposed || !root.isConnected) return;
    if (root.classList.contains('board-list-open') || root.classList.contains('duel-minimized')) {
      root.classList.remove('cc-board-docked'); return;
    }
    const view = { left:viewport?.offsetLeft ?? 0, top:viewport?.offsetTop ?? 0,
      width:viewport?.width ?? innerWidth, height:viewport?.height ?? innerHeight };
    const combatSummary = root.classList.contains('cc-combat-summary');
    const protectedNodes = combatSummary
      ? [...targets, ...Array.from(document.querySelectorAll<HTMLElement>('.hand-bar,.mat:not(.foe) .z-barrier'))]
      : targets;
    const boxes = protectedNodes.filter(n => n.isConnected && n.getClientRects().length > 0).map(n => n.getBoundingClientRect());
    // Only the bounded attack/support summary opts in. Include the dialog's
    // border so a fitting two-line preview does not leave an 11px outer scroll.
    // If it cannot fit without covering the local hand, Barriers or selectable
    // supporters, the existing Card List supplies the readable choice surface.
    const contentHeight = combatSummary
      ? Math.ceil(dialog.scrollHeight + dialog.offsetHeight - dialog.clientHeight) : undefined;
    const fit = boardChoicePlacement(view, boxes, incoming, contentHeight);
    if (!fit) { root.classList.remove('cc-board-docked'); useList(); return; }
    root.classList.add('cc-board-docked');
    for (const [key, value] of Object.entries({ left:fit.left - view.left, top:fit.top - view.top, width:fit.width, height:fit.height }))
      root.style.setProperty(`--board-choice-${key}`, `${value}px`);
    root.classList.toggle('cc-board-narrow', fit.width < 650 || fit.height < 260);
  };
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(layout); };
  const observer = new ResizeObserver(schedule);
  observer.observe(dialog); targets.forEach(n => observer.observe(n));
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('duel-panel-layout', schedule);
  viewport?.addEventListener('resize', schedule); viewport?.addEventListener('scroll', schedule);
  schedule();
  return () => {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(frame); observer.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, true);
    window.removeEventListener('duel-panel-layout', schedule);
    viewport?.removeEventListener('resize', schedule); viewport?.removeEventListener('scroll', schedule);
    root.classList.remove('cc-board-docked', 'cc-board-narrow');
  };
}
