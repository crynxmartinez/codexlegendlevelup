/** Bound decorative work; card travel and decisions are never omitted. */
export function motionBudget(width: number, height: number, dpr: number, intensity: string | undefined) {
  const compact = Math.min(width, height) <= 600;
  const minimal = intensity === 'minimal';
  return {
    particles: minimal ? 0 : compact ? 320 : 800,
    density: minimal ? 0 : (intensity === 'full' ? 1 : .55) * (compact ? .65 : 1),
    resolution: Math.min(Math.max(1, dpr || 1), compact ? 1.25 : 1.75),
    waves: minimal ? 0 : compact ? 3 : 6,
  };
}
/** Sustained slow active frames reduce decoration, never card travel or input. */
export class DecorationGovernor {
  scale = 1;
  private frames = 0;
  private slow = 0;
  sample(ms: number): void {
    if (ms <= 0 || ms > 250) return; // Ignore idle/resume gaps.
    this.frames++; if (ms > 34) this.slow++;
    if (this.frames >= 30) {
      if (this.slow >= 10) this.scale = Math.max(.25, this.scale * .5);
      this.frames = this.slow = 0;
    }
  }
  reset(): void { this.scale = 1; this.frames = this.slow = 0; }
}
