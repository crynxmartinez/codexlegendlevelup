import type { PlayerAction } from '../core/game.js';
import type { Phase } from '../core/types.js';

export type TutorialEvent =
  | { kind: 'cue'; cue: string }
  | { kind: 'action'; action: PlayerAction }
  | { kind: 'phase'; phase: Phase; player: number }
  | { kind: 'attackDeclared'; defender: number }
  | { kind: 'attackResolved'; defender: number }
  | { kind: 'checkResolved'; owner: number; isForce: boolean; checkKind: 'attack' | 'barrier' };

type Expected =
  | { kind: 'cue'; cue: string }
  | { kind: 'manual' }
  | { kind: 'action'; action: PlayerAction['kind'] }
  | { kind: 'phase'; phase: Phase; player?: number }
  | { kind: 'attackDeclared'; defender?: number }
  | { kind: 'attackResolved'; defender?: number }
  | { kind: 'checkResolved'; owner?: number; isForce?: boolean; checkKind?: 'attack' | 'barrier' };

export interface TutorialStep {
  title: string;
  body: string;
  why?: string;
  anchor?: string;
  /** Permit an action while completion waits for a later engine event. */
  allowedAction?: PlayerAction['kind'];
  /** Keep an engine-wait step out of the way until its event occurs. */
  hidden?: boolean;
  /** Draw the tutorial target on the Continue button itself. */
  highlightContinue?: boolean;
  expected: Expected;
}

export interface TutorialLesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  focus: 'orientation' | 'main' | 'battle' | 'defense' | 'force';
  steps: TutorialStep[];
  minutes?: number;
}

const PROGRESS_KEY = 'codex-legends.tutorial-progress.v1';

export function completedLessons(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

/**
 * Forget every completed lesson.
 *
 * Guarded like the read beside it. Storage can throw outright in a private
 * window or with site data blocked, and `completedLessons` already survives
 * that — this did not, so the one place that clears progress was the one place
 * that could take the tutorial menu down with it.
 */
export function resetTutorialProgress(): void {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* nothing to forget */ }
}

export class TutorialSession {
  stepIndex = 0;
  completed = false;
  onChange?: () => void;

  constructor(readonly lesson: TutorialLesson, private readonly options: { persistProgress?: boolean } = {}) {}
  get step(): TutorialStep { return this.lesson.steps[this.stepIndex]!; }

  allows(action: PlayerAction): boolean {
    const step = this.step;
    if (!step) return false;
    if (step.allowedAction) return action.kind === step.allowedAction;
    return step.expected.kind === 'action' && action.kind === step.expected.action;
  }

  continue(): void {
    if (this.completed) return;
    if (this.step.expected.kind === 'manual') this.advance();
  }

  observe(event: TutorialEvent): void {
    if (this.completed) return;
    const expected = this.step?.expected;
    if (!expected || expected.kind === 'manual') return;
    let matches = false;
    if (expected.kind === 'cue' && event.kind === 'cue') matches = expected.cue === event.cue;
    if (expected.kind === 'action' && event.kind === 'action') matches = event.action.kind === expected.action;
    if (expected.kind === 'phase' && event.kind === 'phase') matches = event.phase === expected.phase && (expected.player == null || event.player === expected.player);
    if (expected.kind === 'attackDeclared' && event.kind === 'attackDeclared') matches = expected.defender == null || event.defender === expected.defender;
    if (expected.kind === 'attackResolved' && event.kind === 'attackResolved') matches = expected.defender == null || event.defender === expected.defender;
    if (expected.kind === 'checkResolved' && event.kind === 'checkResolved') {
      matches = (expected.owner == null || event.owner === expected.owner)
        && (expected.isForce == null || event.isForce === expected.isForce)
        && (expected.checkKind == null || event.checkKind === expected.checkKind);
    }
    if (matches) this.advance();
  }

  private advance(): void {
    if (this.stepIndex < this.lesson.steps.length - 1) this.stepIndex++;
    else {
      this.completed = true;
      if (this.options.persistProgress !== false) {
        const done = completedLessons();
        done.add(this.lesson.id);
        // Same guard: finishing a lesson must not throw just because progress
        // cannot be saved. The lesson still completes for this session.
        try {
          localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));
        } catch { /* not persisting is survivable */ }
      }
    }
    this.onChange?.();
  }
}
