/**
 * The targeting arrow.
 *
 * Declaring an attack was two clicks and no line between them: you clicked a
 * unit, it grew a border, and the legal targets grew a different border. The
 * board told you a state had changed but never drew the relationship, so the
 * most-repeated action in the game looked like two unrelated selections.
 *
 * This is the arrow every other card game uses, and it is strictly additive —
 * click-then-click still works, which matters because a drag is awkward on a
 * touch screen and impossible from a keyboard. The arrow simply follows
 * whatever the pointer is doing while an attacker is chosen, so it draws the
 * click flow and the drag flow with one mechanism.
 *
 * Screen space, not board space. The mats are tilted on the X axis, and an
 * arrow that lived inside that transform would foreshorten along with them —
 * pointing somewhere other than where the cursor is. Every coordinate here
 * comes from getBoundingClientRect, which is already the projected position.
 */

const NS = 'http://www.w3.org/2000/svg';

let svg: SVGSVGElement | null = null;
let curve: SVGPathElement | null = null;
let head: SVGPolygonElement | null = null;
let source: HTMLElement | null = null;
let pointer: { x: number; y: number } | null = null;
let snapped = false;

function build(): void {
  if (svg) return;
  svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'target-arrow');
  svg.setAttribute('aria-hidden', 'true');

  curve = document.createElementNS(NS, 'path');
  curve.setAttribute('class', 'ta-curve');
  head = document.createElementNS(NS, 'polygon');
  head.setAttribute('class', 'ta-head');

  svg.appendChild(curve);
  svg.appendChild(head);
  document.body.appendChild(svg);
}

function centreOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * What the pointer is over, if it is a legal target.
 *
 * `elementFromPoint` rather than pointer events on the targets themselves:
 * the arrow has to know about a target the pointer is merely passing over,
 * and the cards already own their click handlers.
 */
function targetUnder(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  const hit = el instanceof Element ? el.closest('.targetable') : null;
  return hit as HTMLElement | null;
}

function draw(): void {
  if (!svg || !curve || !head || !source || !pointer) return;

  const from = centreOf(source);
  const over = targetUnder(pointer.x, pointer.y);
  // Snapping to the card's centre rather than trailing the cursor across it
  // is what makes a target feel picked up rather than hovered.
  const to = over ? centreOf(over) : pointer;
  snapped = over !== null;

  // Lift the control point perpendicular to the run, so the arc bows the same
  // way whichever direction the attack goes. A fixed upward bow looked wrong
  // for anything aimed sideways along the mat.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(90, len * 0.28);
  const cx = (from.x + to.x) / 2 + (dy / len) * bow;
  const cy = (from.y + to.y) / 2 - (dx / len) * bow;

  curve.setAttribute('d', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);

  // The head points along the tangent at the end of the curve, which for a
  // quadratic is the line from the control point to the endpoint.
  const tx = to.x - cx;
  const ty = to.y - cy;
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const size = snapped ? 17 : 13;
  const px = -uy;
  const py = ux;
  const baseX = to.x - ux * size;
  const baseY = to.y - uy * size;
  head.setAttribute('points', [
    `${to.x},${to.y}`,
    `${baseX + px * size * 0.62},${baseY + py * size * 0.62}`,
    `${baseX - px * size * 0.62},${baseY - py * size * 0.62}`,
  ].join(' '));

  svg.classList.toggle('locked', snapped);
}

function onMove(e: PointerEvent): void {
  if (!source) return;
  pointer = { x: e.clientX, y: e.clientY };
  draw();
}

/**
 * Start aiming from `node`, or stop if it is null.
 *
 * Called whenever the chosen attacker changes, so the arrow's lifetime is the
 * selection's lifetime and nothing has to remember to tear it down.
 */
export function aimFrom(node: HTMLElement | null): void {
  build();
  source = node;
  if (!svg) return;

  if (!node) {
    svg.classList.remove('on', 'locked');
    pointer = null;
    return;
  }

  // Begin at the attacker itself, so the arrow exists before the pointer has
  // moved — a click-then-look player would otherwise see nothing at all.
  if (!pointer) pointer = centreOf(node);
  svg.classList.add('on');
  draw();
}

/** Redraw against the current pointer — after a re-render moves the cards. */
export function refreshAim(): void {
  if (source && !document.body.contains(source)) {
    // The board re-rendered and replaced the node we were pointing from.
    const uid = source.dataset.uid;
    const fresh = uid
      ? document.querySelector<HTMLElement>(`.mat:not(.foe) .card[data-uid="${uid}"]`)
      : null;
    source = fresh;
    if (!fresh) { aimFrom(null); return; }
  }
  draw();
}

export function mountTargetArrow(): void {
  build();
  window.addEventListener('pointermove', onMove, { passive: true });
  // A dragged aim ends where the pointer is released. Clicking a target is
  // handled by the card's own onclick, so this only has to clean up the case
  // where the release happened over nothing.
  window.addEventListener('pointerup', (e) => {
    if (!source) return;
    if (!targetUnder(e.clientX, e.clientY)) draw();
  });
  window.addEventListener('scroll', () => { if (source) draw(); }, true);
  window.addEventListener('resize', () => { if (source) draw(); });
}
