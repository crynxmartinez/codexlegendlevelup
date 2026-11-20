import './movement-cue.css';

export type TrailPoint = { x: number; y: number; time: number };
/** Only a short recent wake, never a line joining the source and destination. */
export function recentTrail(points: readonly TrailPoint[], point: TrailPoint): TrailPoint[] {
  return [...points.filter(p => point.time - p.time <= 120), point].slice(-10);
}

export function showMovementKeyword(keyword: string, opponent: boolean, reduced: boolean): () => void {
  const banner = document.createElement('div');
  banner.className = `movement-keyword${opponent ? ' foe' : ''}${reduced ? ' reduced' : ''}`;
  banner.setAttribute('role', 'status');
  banner.textContent = keyword;
  document.body.append(banner);
  return () => banner.remove();
}

let trailId = 0;
let activeTrails = 0;
/** Follows the rendered copy so arcs, staggered starts and speed settings stay aligned. */
export function followCardWithLight(card: HTMLElement, opponent: boolean, reduced: boolean): () => void {
  if (reduced || document.hidden || activeTrails >= 3) return () => {};
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag: string) => document.createElementNS(ns, tag);
  const svg = make('svg'); svg.setAttribute('class', 'movement-trail'); svg.setAttribute('aria-hidden', 'true');
  const defs = make('defs'), gradient = make('linearGradient');
  const id = `movement-trail-${++trailId}`;
  gradient.setAttribute('id', id); gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  for (const [offset, color, opacity] of [['0%', opponent ? '#ff7296' : '#64ecff', '0'], ['65%', opponent ? '#ff9fbc' : '#90f4ff', '.8'], ['100%', '#ffffff', '1']]) {
    const stop = make('stop'); stop.setAttribute('offset', offset!); stop.setAttribute('stop-color', color!); stop.setAttribute('stop-opacity', opacity!); gradient.append(stop);
  }
  defs.append(gradient);
  const path = make('polyline'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', `url(#${id})`);
  path.setAttribute('stroke-width', '4'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  svg.append(defs, path); document.body.append(svg); activeTrails++;
  let points: TrailPoint[] = [], frame = 0, disposed = false;
  const stop = () => {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(frame); svg.remove(); activeTrails--;
  };
  const tick = (time: number) => {
    if (!card.isConnected || document.hidden) { stop(); return; }
    const rect = card.getBoundingClientRect();
    points = recentTrail(points, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, time });
    const first = points[0]!, last = points[points.length - 1]!;
    gradient.setAttribute('x1', String(first.x)); gradient.setAttribute('y1', String(first.y));
    gradient.setAttribute('x2', String(last.x)); gradient.setAttribute('y2', String(last.y));
    path.setAttribute('points', points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return stop;
}
