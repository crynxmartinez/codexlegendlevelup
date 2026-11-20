/**
 * One place that decides what the board is showing, and for how long.
 *
 * Before this, presentation was a scatter of `await sleep(n)` calls inside the
 * board code. That has three failure modes and the game had all of them: two
 * animations could overlap so neither read; a pace change meant hunting every
 * literal; and a thrown error inside an animation left the board frozen
 * halfway with the rules engine waiting on a promise that never settled.
 *
 * So events queue here and are presented strictly in order. The shape of a
 * presentation is always the same — announce, show the source, show the
 * target, move the cards, show the result, hold — because a player learning
 * the game needs the same grammar every time, not a different one per card.
 *
 * THREE RULES THIS FILE EXISTS TO KEEP:
 *
 *  1. Presentation never blocks the rules. Every step is guarded; if an
 *     animation throws or its element has gone, the final state is committed
 *     and the queue moves on. A frozen board is worse than a missing flourish.
 *  2. Skipping is not skipping state. "Finish animation" fast-forwards the
 *     current step to its end and drops the remaining holds — it never
 *     dismisses a decision, and never drops a result the pace marked
 *     important.
 *  3. Timing comes from the pace table, never from a literal here.
 */
import {
  PACE_PROFILES, waitFor,
  type DuelPace, type PaceProfile,
} from './pace.js';
import type { DuelEvent } from '../core/events.js';
import { tracePresentation, traceContext } from './presentation-diagnostics.js';

/** What the interface does at each beat. Injected so this file has no DOM. */
export interface PresentationSink {
  /** Put the banner up. Called once at the start of a step. */
  announce(step: PresentedStep): void;
  /** Ring the source card. */
  highlightSource(uids: string[]): void;
  /** Ring the target, differently from the source. */
  highlightTarget(uids: string[]): void;
  /** Pulse a destination zone and run any card movement. */
  move(step: PresentedStep): Promise<void>;
  /** Show cost and result lines. */
  showResult(step: PresentedStep): void;
  /** Take every temporary class off. Always called, even after a failure. */
  clear(): void;

}

/** One event, plus what the queue decided about how to show it. */
export interface PresentedStep {
  event: DuelEvent;
  /** Important events get a longer timed hold. */
  important: boolean;
}

/** Which event types are never allowed to slip past a new player. */
const IMPORTANT: ReadonlySet<DuelEvent['type']> = new Set([
  'barrierBroken', 'forceResolved', 'sentryRevealed', 'personaChanged',
  'codexSwitched', 'stateReleased', 'matchEnded',
]);

export function isImportant(e: DuelEvent): boolean {
  return IMPORTANT.has(e.type);
}

/** Native hooks already show these at the moment they happen. Keep the event
 * in history, but do not replay it after the rest of the action has finished.
 * Protocol 3 PvP uses these same hooks; only hookless clients need a replay. */
export function needsResultPresentation(e: DuelEvent, nativeHooks: boolean): boolean {
  if (e.type === 'powerChanged') return false; // Board badges and the recap already show this; history retains the event.
  return !nativeHooks || !new Set<DuelEvent['type']>([
    'barrierBroken', 'sentryRevealed', 'personaChanged', 'codexSwitched', 'stateReleased',
  ]).has(e.type);
}

/** Keep the existing public live-region announcement when native PvP hooks
 * replace a result animation. This sink call has no visual work for these types. */
export function announceNativeResults(events: readonly DuelEvent[], announce: (step: PresentedStep) => void): void {
  for (const event of events) {
    if (event.visibility === 'public' && isImportant(event) && !needsResultPresentation(event, true)) {
      announce({ event, important: true });
    }
  }
}

/** What the Now / Next / Waiting-for line is currently saying. */
export interface DuelStatus {
  now: string;
  next?: string;
  /** 'you' | 'opponent' | 'game' — who the game is waiting on. */
  waitingFor: 'you' | 'opponent' | 'game';
}

export interface PresentationOptions {
  pace: () => DuelPace;
  reducedMotion: () => boolean;
  /** Called whenever the status line should change. */
  onStatus?: (s: DuelStatus) => void;
  /** Swappable for tests. Resolves after `ms`, or immediately when skipped. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export class PresentationQueue {
  private queue: PresentedStep[] = [];
  private traceContexts = new WeakMap<PresentedStep, ReturnType<typeof traceContext>>();
  private running = false;
  private generation = 0;
  private cancelStep: (() => void) | null = null;
  /** Set while a step is on screen; resolved by `finishCurrent`. */
  private skipCurrent: (() => void) | null = null;
  private status: DuelStatus = { now: 'Waiting', waitingFor: 'game' };

  constructor(
    private readonly sink: PresentationSink,
    private readonly opts: PresentationOptions,
  ) {}

  /** Everything still to be shown. Tests and the status line read this. */
  get pending(): number { return this.queue.length; }
  get isRunning(): boolean { return this.running; }
  get currentStatus(): DuelStatus { return this.status; }

  /**
   * Add events to the end of the queue.
   *
   * Nothing is presented synchronously: the rules engine hands over what
   * happened and carries on, and the queue drains at the player's pace behind
   * it. That is what stops presentation from ever holding the engine up.
   */
  enqueue(events: readonly DuelEvent[]): void {
    for (const event of events) {
      // Routine events are recorded, never performed.
      //
      // Measured over six turns: 283 events, 111 of them `cardMoved` — every
      // zone change the engine makes. At Standard pace each costs about 1.3
      // seconds to present, so movements alone generated roughly 24 seconds of
      // presentation per turn against a turn the engine finishes in under one.
      // The queue fell behind by half a minute a turn, compounding, and ended
      // up narrating the Main Phase while the player was in Battle.
      //
      // The timeline already filtered these out as noise, on the grounds that
      // a call has already said a card was called. The queue did not, which
      // made one view of the record show the machine's bookkeeping and the
      // other hide it. This is that same judgement, applied in both places:
      // the record keeps everything, the presentation performs what matters.
      if (!isImportant(event)) continue;
      const step:PresentedStep={event,important:true};
      this.traceContexts.set(step,traceContext());this.queue.push(step);
      tracePresentation(`result.${event.type}.entry`,{depth:this.queue.length});
    }
  }

  /**
   * Drain the queue.
   *
   * Re-entrant by design: calling it while it is already running is a no-op,
   * so the engine can call it after every action without coordinating.
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const step = this.queue.shift()!;
        await this.present(step);
      }
    } finally {
      this.running = false;
      this.setStatus({ now: 'Your move', waitingFor: 'you' });
    }
  }

  /**
   * Finish what is on screen and drop its remaining holds.
   *
   * Deliberately narrow. It ends the CURRENT step early; it does not empty the
   * queue and never answers a decision modal. Only the current presentation
   * hold is shortened; the remaining events still play in order.
   */
  finishCurrent(): void {
    this.skipCurrent?.();
  }

  /** Drop everything still waiting. Only for tearing a duel down. */
  reset(): void {
    tracePresentation('result.reset',{depth:this.queue.length});
    this.generation++;
    this.queue.length = 0;
    this.cancelStep?.();
    this.skipCurrent?.();
    this.sink.clear();
  }

  private setStatus(s: DuelStatus): void {
    this.status = s;
    this.opts.onStatus?.(s);
  }

  /**
   * Wait, unless the player has asked to move on.
   *
   * Races the timer against the skip signal, so "Finish animation" is felt
   * immediately rather than at the end of the current hold.
   */
  private async hold(moment: keyof PaceProfile): Promise<void> {
    const ms = waitFor(this.opts.pace(), moment, this.opts.reducedMotion());
    if (ms === null || ms <= 0) return;
    const sleep = this.opts.sleep ?? realSleep;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => { if (!done) { done = true; resolve(); } };
      this.skipCurrent = finish;
      void sleep(ms).then(finish);
    });
    this.skipCurrent = null;
  }

  /**
   * Show one event, in the order a player can follow.
   *
   * Every stage is inside the try: the `finally` is what guarantees rule 1,
   * that a failed animation leaves a clean board and a moving queue rather
   * than a frozen one.
   */
  private async present(step: PresentedStep): Promise<void> {
    const e = step.event;
    const captured=this.traceContexts.get(step)??traceContext();
    let failed=false;
    const generation = this.generation;
    const cancelled = new Promise<void>(resolve => { this.cancelStep = resolve; });
    const stale = () => generation !== this.generation;
    try {
      tracePresentation(`result.${e.type}.start`,{...captured,depth:this.queue.length});
      this.setStatus(statusFor(e));
      this.sink.announce(step);

      if (e.sourceUids.length) {
        this.sink.highlightSource(e.sourceUids);
        await this.hold('abilityIntro');
        if (stale()) return;
      }
      if (e.targetUids.length) {
        this.sink.highlightTarget(e.targetUids);
        await this.hold('targetHold');
        if (stale()) return;
      }
      if (e.movements?.length) {
        await Promise.race([this.sink.move(step), cancelled]);
        if (stale()) return;
        await this.hold('cardMove');
        if (stale()) return;
      }

      this.sink.showResult(step);

      await this.hold(step.important ? 'importantResult' : 'resultHold');
    } catch {
      failed=true;
      // Rule 1. The event already happened in the rules; failing to draw it
      // is a cosmetic loss, and stopping here would strand the engine.
    } finally {
      tracePresentation(`result.${e.type}.${stale()?'cancelled':failed?'failed':'finish'}`,{...captured,depth:this.queue.length});
      this.skipCurrent = null;
      this.cancelStep = null;
      this.sink.clear();
    }
  }
}

/**
 * What the status line says while an event is being shown.
 *
 * Derived from the event, never from the DOM: reading the board back to find
 * out what the board is doing is how a status line ends up lying.
 */
export function statusFor(e: DuelEvent): DuelStatus {
  const theirs = e.actor === 1;
  const who = theirs ? 'Opponent' : 'You';
  switch (e.type) {
    case 'defenseStarted':
      return {
        now: `${who} ${theirs ? 'is' : 'are'} choosing defenders.`,
        next: 'The attack resolves.',
        waitingFor: theirs ? 'opponent' : 'you',
      };
    case 'attackDeclared':
      return {
        now: `${who} declared an attack.`,
        next: 'Defenders are chosen.',
        waitingFor: theirs ? 'you' : 'opponent',
      };
    case 'attackCheckStarted':
      return {
        now: 'Attack check.',
        next: 'The revealed card is read.',
        waitingFor: 'game',
      };
    case 'abilityActivated':
      return { now: 'A skill is resolving.', next: 'Its effect applies.', waitingFor: 'game' };
    case 'barrierBroken':
      return { now: 'A Barrier broke.', next: 'The Barrier card is checked.', waitingFor: 'game' };
    case 'matchEnded':
      return { now: 'The duel is over.', waitingFor: 'game' };
    case 'turnStarted':
      return {
        now: `${who} ${theirs ? 'starts' : 'start'} the turn.`,
        waitingFor: theirs ? 'opponent' : 'you',
      };
    default:
      return { now: e.message, waitingFor: theirs ? 'opponent' : 'you' };
  }
}

/**
 * The least an AI turn should appear to take.
 *
 * A bot that answers instantly reads as a bug rather than as an opponent, and
 * at Learning pace the player has no time to see what happened. Exposed here
 * rather than inside the AI loop so the number lives with every other one.
 */
export function aiThinkTime(pace: DuelPace): number {
  return PACE_PROFILES[pace].aiThinkMinimum;
}
