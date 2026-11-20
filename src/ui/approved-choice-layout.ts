import { intersects, type Box } from './overlay-placement.js';

/** Values are supplied by the existing combat calculations, never recomputed here. */
export interface DefenseComparison {
  attack: number; defense: number | null;
  attackDetail?: string; defenseDetail?: string;
  outcome: string; note?: string; stage?: string;
}

export function renderDefenseComparison(node: HTMLElement, value: DefenseComparison): void {
  const make = (tag: string, cls: string, text: string) => {
    const n = document.createElement(tag); n.className = cls; n.textContent = text; return n;
  };
  const score = (kind: string, label: string, amount: number | null, detail?: string) => {
    const row = make('div', `cc-comparison-score ${kind}`, '');
    row.append(make('span', '', label), make('strong', '', amount === null ? '—' : amount.toLocaleString()));
    if (detail) row.append(make('small', '', detail));
    return row;
  };
  const outcome = make('div', 'cc-comparison-outcome', value.outcome);
  if (value.note) outcome.append(make('small', '', value.note));
  node.replaceChildren(make('div', 'cc-comparison-stage', value.stage ?? 'Before check'),
    score('attack', 'Incoming attack', value.attack, value.attackDetail),
    score('defense', 'Your defense', value.defense, value.defenseDetail), outcome);
}

const box = (node: Element): Box => node.getBoundingClientRect();
const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
/** A narrow unused edge is required. Never move the hand or cover a legal target to create it. */
export function approvedRailBox(view: Box, protectedAreas: Box[], headerBottom: number): Box | undefined {
  const short = view.height <= 600 || view.width <= 1000;
  const width = short ? 119 : Math.min(270, Math.max(200, view.width * .15));
  const top = Math.max(headerBottom + 8, view.top + (short ? 94 : view.height * .23));
  const result = { left:view.left + view.width - width - (short ? 5 : view.width * .012),
    top, width, height:view.top + view.height - 8 - top };
  if (view.height < 320 || protectedAreas.some(p => intersects(result, p))) return undefined;
  return result;
}

/** Position only: selection, confirmation, minimize and inspection stay in openCardChoice. */
export function mountApprovedChoiceLayout(root: HTMLElement, heading: HTMLElement, rail: HTMLElement,
  footer: HTMLElement, targets: HTMLElement[], useList: () => void): () => void {
  let frame = 0, stopped = false;
  const markers: HTMLElement[] = [];
  if (root.dataset.presentation === 'defense') {
    for (const [selector, label] of [['.combat-source', 'ATTACKER'], ['.combat-target', 'TARGET']]) {
      const slot = document.querySelector(selector!)?.closest('.slot');
      if (!slot) continue;
      const marker = document.createElement('span'); marker.className = 'approved-combat-marker';
      marker.dataset.combatRole = label; marker.textContent = label!;
      slot.append(marker); markers.push(marker);
    }
  }
  const viewport = window.visualViewport;
  const layout = () => {
    frame = 0;
    if (stopped || !root.isConnected) return;
    if (root.classList.contains('duel-minimized') || root.classList.contains('board-list-open')) {
      root.classList.remove('cc-approved-active'); return;
    }
    const view = {left:viewport?.offsetLeft ?? 0, top:viewport?.offsetTop ?? 0,
      width:viewport?.width ?? innerWidth, height:viewport?.height ?? innerHeight};
    // Protect native hand and both Barrier rows even when no card in them is selectable.
    // Offscreen hand cards extend beyond the clipped scrolling hand. Protect
    // the hand viewport itself, not those invisible overflowing rectangles.
    const protectedNodes = [...targets.filter(node => !node.closest('.hand-bar')), ...Array.from(document.querySelectorAll<HTMLElement>('.hand-bar, .z-barrier, .mat .pilebox, .mat .z-units'))];
    const protectedAreas = protectedNodes.filter(n => n.isConnected && visible(n)).map(box);
    const short = view.height <= 600 || view.width <= 1000;
    const headingHeight = short ? 72 : 110;
    const opponentBadge = document.querySelector('.side.foe > .anime-zone-plays');
    const headerBottom = Math.max(view.top + headingHeight,
      opponentBadge && visible(opponentBadge) ? opponentBadge.getBoundingClientRect().bottom : 0);
    const fit = approvedRailBox(view, protectedAreas, headerBottom);
    if (!fit) { root.classList.remove('cc-approved-active'); useList(); return; }
    root.classList.add('cc-approved-active');
    const localLeft = fit.left - view.left;
    const set = (key: string, value: number) => root.style.setProperty(`--approved-${key}`, `${Math.round(value)}px`);
    set('rail-left', localLeft); set('rail-width', fit.width); set('rail-top', fit.top - view.top);
    // Active decisions may cover the middle-right utility menu. They must not
    // narrow the confirmation controls or scroll their comparison to avoid it.
    const footerBottom = short ? 5 : 12;
    set('footer-width', fit.width);
    set('footer-bottom', footerBottom);
    const footerHeight = footer.getBoundingClientRect().height;
    const maxRailBottom = view.top + view.height - footerBottom - footerHeight - 8;
    set('rail-max-height', Math.max(44, maxRailBottom - fit.top));
    // Long instructions remain scrollable within their own small header.
    set('heading-max-height', Math.max(54, headingHeight));
    // Compact v3 keeps reading text at a usable size. If that content no
    // longer fits an unused edge, use the existing list rather than clipping
    // the comparison or covering Barriers with the instruction header.
    if (root.classList.contains('modal-v3')) {
      const header = box(heading);
      const headerObstructs = protectedAreas.some(area => intersects(header, area));
      const railClipped = rail.scrollHeight > rail.clientHeight + 2;
      if (headerObstructs || railClipped) {
        root.classList.remove('cc-approved-active'); useList();
      }
    }
  };
  const schedule = () => { if (!stopped && !frame) frame = requestAnimationFrame(layout); };
  const observer = new ResizeObserver(schedule);
  [heading, rail, footer, ...targets].forEach(n => observer.observe(n));
  window.addEventListener('resize', schedule); window.addEventListener('duel-panel-layout', schedule);
  viewport?.addEventListener('resize', schedule); viewport?.addEventListener('scroll', schedule);
  schedule();
  return () => {
    if (stopped) return; stopped = true;
    cancelAnimationFrame(frame); observer.disconnect();
    markers.forEach(marker => marker.remove());
    window.removeEventListener('resize', schedule); window.removeEventListener('duel-panel-layout', schedule);
    viewport?.removeEventListener('resize', schedule); viewport?.removeEventListener('scroll', schedule);
    root.classList.remove('cc-approved-active');
  };
}
