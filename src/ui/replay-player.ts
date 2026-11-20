/**
 * The transport: play, pause, step, and seek through a recorded duel.
 *
 * WHY SEEKING REBUILDS FROM THE START. There is no snapshot cache here and
 * there should not be one. Re-simulating a whole eleven-turn duel was measured
 * at 9.5ms, because a replay never asks the bot to think — every answer comes
 * off the recorded list. Snapshots would buy nothing a player could perceive
 * and would cost the one thing that matters: a cached state can be subtly
 * wrong, and a replay that is subtly wrong is worse than no replay, since
 * someone will use it to argue about a rule.
 *
 * So `seek` always means: build a fresh game, apply steps 0..n. Stepping
 * backwards is a seek. Scrubbing is a seek. There is exactly one code path
 * that produces a position, so there is exactly one thing to get right.
 *
 * This file has no DOM in it. It knows how to sequence a replay; the board
 * knows how to draw one. That split is what makes it testable without a
 * browser, and it is the same split the presentation queue uses.
 */
import type { ReplayStep } from '../core/replay.js';

/** What the transport needs from whatever is drawing the duel. */
export interface ReplayHost {
  /**
   * Discard any game in progress and build a fresh one at step 0.
   *
   * Called at the start of every seek, so it must be safe to call repeatedly
   * and must leave nothing of the previous run behind.
   */
  reset(): Promise<void>;
  /** Apply one recorded step to the game. */
  apply(step: ReplayStep): Promise<void>;
  /** Draw the current position. Called once per settled position, not per step. */
  render(): void;
  /** Something went wrong mid-seek — a divergence, usually. */
  onError?(error: unknown, at: number): void;
  /** The position changed. */
  onChange?(state: ReplayPosition): void;
}

export interface ReplayPosition {
  /** How many steps have been applied. 0 is the opening position. */
  index: number;
  length: number;
  turn: number;
  turns: number;
  playing: boolean;
  /** Set once a seek has failed; the transport stops rather than guessing. */
  broken: boolean;
}

export interface ReplayPlayerOptions {
  /** Milliseconds between steps while playing. Read fresh each step. */
  interval: () => number;
  /** Swappable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export class ReplayPlayer {
  private i = 0;
  private playing = false;
  private broken = false;
  /** Bumped on every seek, so an older seek that is still running gives up. */
  private generation = 0;
  private running: Promise<void> | null = null;
  private playbackTask: Promise<void> | null = null;
  private playGeneration = 0;

  constructor(
    private readonly steps: readonly ReplayStep[],
    private readonly host: ReplayHost,
    private readonly opts: ReplayPlayerOptions,
  ) {}

  get position(): ReplayPosition {
    return {
      index: this.i,
      length: this.steps.length,
      turn: this.turnAt(this.i),
      turns: this.turnCount,
      playing: this.playing,
      broken: this.broken,
    };
  }

  /** How many turns the duel ran. */
  get turnCount(): number {
    return this.steps.filter((s) => s.t === 'turn').length;
  }

  /** Step index where each turn begins, so a scrubber can snap to turns. */
  turnStarts(): number[] {
    const out: number[] = [];
    this.steps.forEach((s, n) => { if (s.t === 'turn') out.push(n); });
    return out;
  }

  /** Which turn a position falls in. 1-based; 0 before the first turn starts. */
  private turnAt(index: number): number {
    let t = 0;
    for (let n = 0; n < index && n < this.steps.length; n++) {
      if (this.steps[n]!.t === 'turn') t++;
    }
    return t;
  }

  /**
   * Move to a position, rebuilding from the start.
   *
   * Concurrent seeks are the interesting case: a player dragging a scrubber
   * fires many, and the slowest must not be the one that wins. Each seek takes
   * a generation number and abandons itself the moment a newer one starts, so
   * the last seek requested is always the one that lands.
   */
  async seek(to: number): Promise<void> {
    this.pause();
    const target = Math.max(0, Math.min(this.steps.length, Math.floor(to)));
    const mine = ++this.generation;
    // Serialise against whatever is already running: two seeks building games
    // at once would interleave their engine calls.
    const previous = Promise.all([this.running, this.playbackTask]);
    const run = (async () => {
      if (previous) await previous.catch(() => {});
      if (mine !== this.generation) return;
      try {
        await this.host.reset();
        for (let n = 0; n < target; n++) {
          if (mine !== this.generation) return;
          await this.host.apply(this.steps[n]!);
        }
        this.i = target;
        this.broken = false;
      } catch (err) {
        // A divergence is final. Stop where it happened and say so, rather
        // than continuing into a duel that did not take place.
        this.playing = false;
        this.broken = true;
        this.host.onError?.(err, this.i);
      }
      if (mine !== this.generation) return;
      this.host.render();
      this.host.onChange?.(this.position);
    })();
    this.running = run;
    await run;
  }

  async stepForward(): Promise<void> {
    if (this.i >= this.steps.length) return;
    await this.seek(this.i + 1);
  }

  async stepBack(): Promise<void> {
    if (this.i <= 0) return;
    await this.seek(this.i - 1);
  }

  /** To the start of the turn you are in, or the previous one if already there. */
  async previousTurn(): Promise<void> {
    const starts = this.turnStarts();
    const before = starts.filter((n) => n < this.i);
    if (!before.length) return this.seek(0);
    const current = before[before.length - 1]!;
    await this.seek(this.i === current && before.length > 1
      ? before[before.length - 2]! : current);
  }

  async nextTurn(): Promise<void> {
    const next = this.turnStarts().find((n) => n > this.i);
    await this.seek(next ?? this.steps.length);
  }

  play(): void {
    if (this.playing || this.broken || this.i >= this.steps.length) return;
    this.playing = true;
    this.host.onChange?.(this.position);
    const mine = ++this.playGeneration;
    const previous = Promise.all([this.running, this.playbackTask]);
    this.playbackTask = previous.then(async () => {
      if (this.playing && mine === this.playGeneration) await this.loop(mine);
    });
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.playGeneration++;
    this.host.onChange?.(this.position);
  }

  toggle(): void {
    if (this.playing) this.pause(); else this.play();
  }

  /**
   * Advance while playing.
   *
   * This applies steps directly rather than seeking, because going forward is
   * the one direction that does not need a rebuild — the game is already in
   * the position the next step expects. Seeking forward instead would rebuild
   * the whole duel on every step and re-run each animation from the opening
   * position, which is both wasteful and visibly wrong.
   *
   * The pause check happens on both sides of the wait: a player who pauses
   * during the gap between steps means it.
   */
  private async loop(mine: number): Promise<void> {
    const sleep = this.opts.sleep ?? realSleep;
    while (this.playing && mine === this.playGeneration && !this.broken && this.i < this.steps.length) {
      await this.host.apply(this.steps[this.i]!).then(
        () => { this.i++; },
        (err) => {
          this.playing = false;
          this.broken = true;
          this.host.onError?.(err, this.i);
        },
      );
      if (!this.playing || mine !== this.playGeneration) break;
      this.host.render();
      this.host.onChange?.(this.position);
      if (this.i >= this.steps.length) break;
      await sleep(this.opts.interval());
    }
    if (this.playing && mine === this.playGeneration) {
      this.playing = false;
      this.host.onChange?.(this.position);
    }
  }

  /** Tear down. Any seek still in flight abandons itself. */
  destroy(): void {
    this.playing = false;
    this.generation++;
    this.playGeneration++;
  }
}
