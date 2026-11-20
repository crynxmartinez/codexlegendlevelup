import type { OpeningView } from './opening.js';

/** Only local feedback/duplicate protection; all outcomes still come from the server. */
export class OpeningFeedback {
  connected = true;
  pending: 'roll' | 'confirm' | undefined;
  private previous?: OpeningView;
  private submitted?: { stage: string; round: number; roll: number | null; confirmed: boolean };
  private fresh = true;
  receive(view: OpeningView, seat: 0 | 1): boolean[] {
    const before = this.previous;
    const animate = view.rolls.map((roll, i) => !this.fresh && !!before && view.stage === 'dice'
      && roll !== null && (before.round !== view.round || before.rolls[i] !== roll));
    const s = this.submitted;
    if (s && (s.stage !== view.stage || s.round !== view.round || s.roll !== view.rolls[seat]
      || s.confirmed !== view.confirmed[seat])) this.release();
    this.previous = { ...view, rolls: [...view.rolls], confirmed: [...view.confirmed] };
    this.fresh = false;
    return animate;
  }
  submit(kind: 'roll' | 'confirm', view: OpeningView, seat: 0 | 1): boolean {
    if (!this.connected || this.pending || view.confirmed[seat]) return false;
    if (kind === 'roll' && (view.stage !== 'dice' || view.first !== null
      || (view.rolls[seat] !== null && view.rolls[0] !== view.rolls[1]))) return false;
    if (kind === 'confirm' && view.stage === 'dice' && view.first === null) return false;
    this.pending = kind;
    this.submitted = { stage: view.stage, round: view.round, roll: view.rolls[seat], confirmed: view.confirmed[seat] };
    return true;
  }
  connection(connected: boolean): void {
    if (connected !== this.connected) { this.fresh = true; this.release(); }
    this.connected = connected;
  }
  release(): void { this.pending = undefined; this.submitted = undefined; }
}
