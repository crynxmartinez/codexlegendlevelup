import { holdDuelMotion, motionEpoch, motionReduced, playMotion } from './duel-motion.js';
import { waitFor } from './pace.js';
import { settings } from './settings.js';
import { glBarrierBreak } from './fx-gl.js';

/** A fixed fractured pane: shared edges stay aligned before the pieces separate. */
export const GLASS_EDGE = [[0,0],[38,0],[73,0],[100,0],[100,38],[100,72],[100,100],[64,100],[27,100],[0,100],[0,62],[0,27]] as const;

export interface UnitGlass { rect: DOMRect; background: string; rotation: number }
/** Capture the visible copy before the board removes it, including exhausted/foe orientation. */
export function captureUnitGlass(node: HTMLElement): UnitGlass {
  const style = getComputedStyle(node);
  const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
  return { rect: node.getBoundingClientRect(), background: style.backgroundImage,
    rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + (node.closest('.mat.foe') ? 180 : 0) };
}

export function shatterUnit(card: UnitGlass, signal?: AbortSignal): Promise<void> {
  return shatterGlass(card.rect, signal, card);
}

/** Break the shield's glass shell, not the card revealed by its Barrier check. */
export function shatterBarrier(rect: DOMRect, signal?: AbortSignal, host?: HTMLElement): Promise<void> {
  return shatterGlass(rect, signal, undefined, host);
}

async function shatterGlass(rect: DOMRect, signal?: AbortSignal, card?: UnitGlass, host?: HTMLElement): Promise<void> {
  if (!rect.width || !rect.height || document.hidden || signal?.aborted) return;
  const reduced = motionReduced(), start = motionEpoch();
  const duration = waitFor(settings().duelPace, 'barrierShatter')!;
  const sideways = card && Math.abs(Math.sin(card.rotation * Math.PI / 180)) > .7;
  const width = card ? (sideways ? rect.height : rect.width) : Math.min(innerHeight <= 500 ? 76 : 100, Math.max(rect.width * 1.35, 58));
  const height = card ? (sideways ? rect.width : rect.height) : width * 1.4;
  const root = document.createElement('div'); root.className = `barrier-shatter${card ? ' unit-shatter' : ''}`; root.setAttribute('aria-hidden', 'true');
  // Hands live inside the isolated anime app. A body-level effect cannot be
  // placed behind them just by lowering its z-index; share their board layer.
  const boardLayer = host ?? (!card ? document.querySelector<HTMLElement>('body.anime-battlefield #app:has(.board-wrap)') : null);
  if (boardLayer) root.classList.add('barrier-shatter-behind-hand');
  const left = rect.x + rect.width / 2 - width / 2, top = rect.y + rect.height / 2 - height / 2;
  root.style.cssText = `left:${card ? left : Math.max(4, Math.min(innerWidth-width-4,left))}px;top:${card ? top : Math.max(4,Math.min(innerHeight-height-4,top))}px;width:${width}px;height:${height}px`;
  if (card) root.style.transform = `rotate(${card.rotation}deg)`;
  const light = document.createElement('div'); light.className = 'barrier-glass-light'; root.append(light);
  const shards = GLASS_EDGE.map((point, i) => {
    const next = GLASS_EDGE[(i + 1) % GLASS_EDGE.length]!;
    const shard = document.createElement('div'); shard.className = 'barrier-glass-shard';
    if (card) { shard.style.backgroundImage = card.background; shard.style.backgroundSize = '100% 100%'; }
    shard.style.clipPath = `polygon(47% 46%,${point[0]}% ${point[1]}%,${next[0]}% ${next[1]}%)`;
    root.append(shard);
    return { shard, x:(point[0]+next[0])/2-47, y:(point[1]+next[1])/2-46 };
  });
  const cracks = document.createElementNS('http://www.w3.org/2000/svg','svg');
  cracks.classList.add('barrier-glass-cracks'); cracks.setAttribute('viewBox','0 0 100 100'); cracks.setAttribute('preserveAspectRatio','none');
  const lines = document.createElementNS('http://www.w3.org/2000/svg','path');
  lines.setAttribute('d',GLASS_EDGE.map(p=>`M47 46 L${p[0]} ${p[1]}`).join(' ')); cracks.append(lines); root.append(cracks);
  (boardLayer ?? document.body).append(root);
  let stopped = false, cancel!:()=>void;
  const aborted = new Promise<void>(resolve=>{cancel=()=>{stopped=true;for(const animation of root.getAnimations?.({subtree:true})??[])animation.cancel();root.remove();resolve();};});
  signal?.addEventListener('abort',cancel,{once:true});
  const hidden = () => { if (document.hidden) cancel(); };
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('resize', cancel);
  window.addEventListener('orientationchange', cancel);
  window.addEventListener('pagehide', cancel);
  const beat = (work:Promise<void>)=>Promise.race([work,aborted]);
  try {
    await beat(playMotion(root,[{opacity:0},{opacity:1}],Math.min(160,duration*.25),0,undefined,signal));
    if(stopped || motionEpoch()!==start || document.hidden)return;
    if(reduced) {
      await beat(card ? playMotion(root,[{opacity:1},{opacity:0}],Math.min(250,duration),0,undefined,signal) : holdDuelMotion(Math.min(300,duration),signal));
      return;
    }
    // The local shards and light already provide this burst. The duplicate
    // global particle canvas would escape the board layer and cover the hand.
    if (!boardLayer) glBarrierBreak(rect.x+rect.width/2,rect.y+rect.height/2);
    cracks.remove();
    await beat(Promise.all([
      playMotion(light,[{opacity:.8,transform:'scale(.95)'},{opacity:0,transform:'scale(1.6)'}],duration,0,undefined,signal),
      ...shards.map(({shard,x,y},i)=>playMotion(shard,[
        {transform:'translate(0,0) rotate(0deg)',opacity:.95},
        {transform:`translate(${x*1.1}px,${y*1.2-15}px) rotate(${(i%2?1:-1)*22}deg)`,opacity:.85,offset:.55},
        {transform:`translate(${x*1.8}px,${y*1.6+30}px) rotate(${(i%2?1:-1)*65}deg)`,opacity:0},
      ],duration,0,'linear',signal)),
    ]).then(()=>{}));
  } finally {
    signal?.removeEventListener('abort',cancel);
    document.removeEventListener('visibilitychange',hidden);
    window.removeEventListener('resize',cancel);
    window.removeEventListener('orientationchange',cancel);
    window.removeEventListener('pagehide',cancel);
    root.remove();
  }
}
