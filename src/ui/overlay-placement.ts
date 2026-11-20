export interface Box { left: number; top: number; width: number; height: number }
const right = (b: Box) => b.left + b.width;
const bottom = (b: Box) => b.top + b.height;
export function intersects(a: Box, b: Box): boolean {
  return a.left < right(b) && right(a) > b.left && a.top < bottom(b) && bottom(a) > b.top;
}
/** Subtract protected actions from the viewport; never accept a least-bad overlap. */
export function helpPlacement(view: Box, wanted: { width: number; height: number }, protectedAreas: Box[], anchor?: Box): Box | undefined {
  let spaces: Box[] = [view];
  for (const block of protectedAreas) {
    spaces = spaces.flatMap(s => {
      if (!intersects(s, block)) return [s];
      return [
        { ...s, width: Math.max(0, block.left - s.left) },
        { ...s, left: Math.max(s.left, right(block)), width: Math.max(0, right(s) - Math.max(s.left, right(block))) },
        { ...s, height: Math.max(0, block.top - s.top) },
        { ...s, top: Math.max(s.top, bottom(block)), height: Math.max(0, bottom(s) - Math.max(s.top, bottom(block))) },
      ].filter(b => b.width >= 180 && b.height >= 44);
    }).sort((a,b) => b.width*b.height-a.width*a.height).slice(0,64);
  }
  const candidates = spaces.map(space => {
    const width = Math.min(space.width, wanted.width), height = Math.min(space.height, wanted.height);
    return { left: anchor ? Math.max(space.left, Math.min(right(space)-width, anchor.left+anchor.width/2-width/2)) : space.left,
      top: anchor ? Math.max(space.top, Math.min(bottom(space)-height, anchor.top+anchor.height/2-height/2)) : space.top,
      width, height };
  });
  const fit = candidates.sort((a,b) => {
    const score = (s: Box) => Math.min(s.width,wanted.width)*Math.min(s.height,wanted.height);
    const distance = (s: Box) => anchor ? (s.left+s.width/2-anchor.left-anchor.width/2)**2
      + (s.top+s.height/2-anchor.top-anchor.height/2)**2 : 0;
    // Preserve readable size first, then stay beside the word rather than at
    // the origin of whichever empty rectangle happened to be found first.
    return score(b)-score(a) || distance(a)-distance(b);
  })[0];
  return fit;
}
export function visibleBox(node: Element): boolean {
  return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
}
export function placeHelp(node: HTMLElement, target: HTMLElement, nearTarget = false): boolean {
  const vv = window.visualViewport;
  const view = { left: (vv?.offsetLeft ?? 0)+8, top: (vv?.offsetTop ?? 0)+8,
    width: (vv?.width ?? innerWidth)-16, height: (vv?.height ?? innerHeight)-16 };
  node.style.maxHeight = ''; node.style.width = ''; node.style.visibility = '';
  // State help sits beside the whole identity panel, keeping the face and
  // progress visible together rather than covering the portrait above it.
  const anchor = target.matches('.state-progress') ? target.closest('.identity-panel') ?? target : target;
  const targetBox = anchor.getBoundingClientRect();
  const actions = Array.from(document.querySelectorAll('.cc-footer, .duel-dialog > .row, .turn-btn, .duel-restore, .journey-controls, .first-battle-controls, .tutorial-target, .practice-target, .tutorial-coach-actions'))
    .filter(n => !node.contains(n) && !n.contains(node) && visibleBox(n)).map(n => n.getBoundingClientRect());
  const protectedAreas = [targetBox,...actions].map(b => ({ left:b.left-6,top:b.top-6,width:b.width+12,height:b.height+12 }));
  const rect = node.getBoundingClientRect();
  const box = helpPlacement(view, {width:rect.width,height:rect.height}, protectedAreas, nearTarget ? targetBox : undefined);
  if (!box) { node.style.visibility = 'hidden'; return false; }
  node.style.left = `${box.left}px`; node.style.top = `${box.top}px`;
  node.style.width = `${box.width}px`; node.style.maxHeight = `${box.height}px`;
  node.dataset.compact = String(box.height < rect.height);
  return true;
}
