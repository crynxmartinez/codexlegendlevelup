export interface FrameSummary { frames: number; averageFps: number; p95FrameMs: number; slowFrames: number }
export function summarizeFrames(samples: readonly number[]): FrameSummary {
  const values = samples.filter(value => Number.isFinite(value) && value > 0);
  if (!values.length) return { frames: 0, averageFps: 0, p95FrameMs: 0, slowFrames: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return { frames: values.length, averageFps: 1000 * values.length / values.reduce((sum, value) => sum + value, 0),
    p95FrameMs: sorted[Math.ceil(values.length * .95) - 1]!, slowFrames: values.filter(value => value > 33.4).length };
}
let latest = 'No check yet. This local check sends no data.';
let running = false;
export const performanceReport = () => running ? 'Checking while you play. Return here in 10 seconds.' : latest;
export function measureGameplay(quality = 'current'): void {
  if (running) return;
  running = true;
  const samples: number[] = [];
  let previous = 0, frame = 0, ended = false;
  const finish = (interrupted = false) => {
    if (ended) return; ended = true; running = false;
    cancelAnimationFrame(frame); clearTimeout(timer);
    document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', hidden); window.removeEventListener('resize', hidden);
    const report = summarizeFrames(samples);
    latest = interrupted ? 'Check interrupted by a hidden page or changed screen size. Run it again while playing.'
      : `${Math.round(report.averageFps)} FPS average · 95% of frames within ${report.p95FrameMs.toFixed(1)} ms · ${report.slowFrames}/${report.frames} frames over 33 ms. ${innerWidth} × ${innerHeight}; ${quality === 'legacy' ? 'custom' : quality} graphics. A quiet board is not a battle stress test.`;
  };
  const hidden = () => { finish(true); };
  const tick = (now: number) => { if (previous) samples.push(now - previous); previous = now; frame = requestAnimationFrame(tick); };
  const timer = setTimeout(() => finish(), 10_000);
  document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', hidden); window.addEventListener('resize', hidden);
  frame = requestAnimationFrame(tick);
}
