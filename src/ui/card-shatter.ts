import { motionDuration, motionReduced } from './duel-motion.js';
/** Draw the actual card as separated shards. */
export function shatterCard(stage: HTMLElement, card: HTMLElement, url: string): () => void {
  const canvas = document.createElement('canvas');
  canvas.width = 420; canvas.height = 588;
  canvas.className = 'card-shards';
  canvas.setAttribute('aria-hidden', 'true');
  const image = new Image();
  let frame = 0, stopped = false;
  const c = canvas.getContext('2d')!;
  const points = [[0, 0], [210, 0], [420, 0], [420, 294], [420, 588], [210, 588], [0, 588], [0, 294]];
  const center = [192, 270];
  const draw = (progress: number) => {
    c.clearRect(0, 0, 420, 588);
    // Inset the art to leave room for the fragments inside the modal.
    c.save(); c.translate(32, 44); c.scale(.84, .84);
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      const cx = (a[0]! + b[0]! + center[0]!) / 3, cy = (a[1]! + b[1]! + center[1]!) / 3;
      c.save();
      c.translate((cx - 210) * .14 * progress, (cy - 294) * .12 * progress);
      c.translate(cx, cy); c.rotate((i % 2 ? 1 : -1) * .035 * progress); c.translate(-cx, -cy);
      c.beginPath(); c.moveTo(center[0]!, center[1]!); c.lineTo(a[0]!, a[1]!); c.lineTo(b[0]!, b[1]!); c.closePath();
      c.save(); c.clip(); c.drawImage(image, 0, 0, 420, 588); c.restore();
      c.strokeStyle = `rgba(255,210,190,${progress * .95})`; c.lineWidth = 2; c.stroke();
      c.restore();
    }
    c.restore();
  };
  image.onload = () => {
    if (stopped || !stage.isConnected) return;
    stage.appendChild(canvas);
    card.style.backgroundImage = 'none';
    stage.dataset.shattering = 'true';
    const start = performance.now();
    const reduced = motionReduced();
    const duration = motionDuration() * 2;
    const tick = (now: number) => {
      if (stopped || !stage.isConnected) { delete stage.dataset.shattering; return; }
      const t = reduced ? 1 : Math.min(1, (now - start) / duration);
      draw(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
      else delete stage.dataset.shattering;
    };
    tick(start);
  };
  image.src = url;
  return () => { stopped = true; cancelAnimationFrame(frame); delete stage.dataset.shattering; canvas.remove(); };
}
