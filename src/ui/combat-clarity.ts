import type { AttackResult } from '../core/battle.js';
import { motionEpoch, motionReduced, playMotion } from './duel-motion.js';

export function combatResultLabel(result: AttackResult, winningHit = false, destroyed = false): string {
  if (result.cancelReason) return 'Attack cancelled';
  if (result.sentryUsed) return 'Sentry · damage prevented';
  if (!result.hit) return 'Blocked';
  if (winningHit) return 'Final hit';
  if (result.barrierBroken) return 'Barrier broken';
  if (destroyed) return 'Ally destroyed';
  return 'Hit';
}

/** Stop the arrow at card edges, leaving both artworks visible. */
export function combatLine(a: DOMRect, b: DOMRect): [number, number, number, number] {
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2, by = b.y + b.height / 2;
  const dx = bx - ax, dy = by - ay;
  const edge = (r: DOMRect) => Math.min(Math.abs(dx) ? r.width / 2 / Math.abs(dx) : Infinity, Math.abs(dy) ? r.height / 2 / Math.abs(dy) : Infinity, .45);
  const start = edge(a), end = edge(b);
  return [ax + dx * start, ay + dy * start, bx - dx * end, by - dy * end];
}

let anchors: [HTMLElement, HTMLElement] | null = null;
export function clearCombatGuide(): void {
  anchors?.forEach(n => n.classList.remove('combat-source', 'combat-target')); anchors = null;
}
export function updateCombatGuide(source: HTMLElement | null, target: HTMLElement | null): void {
  if (anchors?.[0] === source && anchors?.[1] === target && source?.isConnected && target?.isConnected) return;
  clearCombatGuide();
  if (!source?.isConnected || !target?.isConnected || document.hidden) return;
  anchors = [source,target]; source.classList.add('combat-source'); target.classList.add('combat-target');
  void playMotion(target, [{boxShadow:'0 0 0 10px #ff9d8700'},{boxShadow:'0 0 0 2px #ff9d8780'},{boxShadow:'0 0 0 0 #ff9d8700'}], motionReduced()?80:240);
}
export async function animateSupportLink(source: HTMLElement, target: HTMLElement): Promise<void> {
  if (!source.isConnected || !target.isConnected || document.hidden) return;
  const epoch = motionEpoch();
  await playMotion(source, [{filter:'brightness(1)'},{filter:'brightness(1.5)'},{filter:'brightness(1)'}], motionReduced()?80:140);
  if (epoch !== motionEpoch() || !source.isConnected || !target.isConnected || document.hidden) return;
  const a=source.getBoundingClientRect(), b=target.getBoundingClientRect();
  const spark=document.createElement('div');
  spark.style.cssText='position:fixed;width:7px;height:7px;border-radius:50%;background:#ffe5a1;box-shadow:0 0 10px 3px #edcb76;pointer-events:none;z-index:90';
  spark.style.left=(a.x+a.width/2-3.5)+'px'; spark.style.top=(a.y+a.height/2-3.5)+'px';
  document.body.append(spark);
  try {
    if (!motionReduced()) await playMotion(spark,[{transform:'translate(0,0)',opacity:1},{transform:'translate('+(b.x+b.width/2-a.x-a.width/2)+'px,'+(b.y+b.height/2-a.y-a.height/2)+'px)',opacity:0.3}],220);
    if (epoch === motionEpoch()) await playMotion(target,[{filter:'brightness(1.35)'},{filter:'brightness(1)'}],80);
  } finally { spark.remove(); }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearCombatGuide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearCombatGuide(); });
}
