import { weightedSelectionTotal } from '../core/selection-weight.js';
import { CANCEL_DRAFT, type Chooser, type ChooseCardsOptions, type ChooseTargetOptions } from '../core/effects.js';
import type { PlayerId } from '../core/types.js';
export type DecisionKind = keyof Chooser;
export interface PendingDecision { id: string; owner: PlayerId; kind: DecisionKind; args: unknown[] }
export function decisionForViewer(d: PendingDecision, viewer: PlayerId): PendingDecision {
  const result = structuredClone(d); result.owner = 0; result.args[0] = 0;
  if (d.kind === 'chooseAbility') for (const option of result.args[2] as import('../core/effects.js').AbilityOption[]) {
    if (option.cause) option.cause.owner = option.cause.owner === viewer ? 0 : 1;
  }
  return result;
}
/** One engine continuation, owned by a seat, never by whichever client replies first. */
export class DecisionGate {
  pending: PendingDecision | null = null;
  private resolve?: (value: unknown) => void;
  private reject?: (error: Error) => void;
  private serial = 0;
  constructor(private changed: () => void) {}
  ask(owner: PlayerId, kind: DecisionKind, args: unknown[]): Promise<unknown> {
    if (this.pending) throw new Error('Another choice is pending');
    return new Promise((resolve, reject) => {
      this.resolve = resolve; this.reject = reject;
      this.pending = { id: `decision-${++this.serial}`, owner, kind, args };
      this.changed();
    });
  }
  answer(owner: PlayerId, id: unknown, answer: unknown): boolean {
    const d = this.pending;
    if (!d || d.owner !== owner || d.id !== id || !validAnswer(d, answer)) return false;
    const done = this.resolve; this.pending = null; this.resolve = undefined; this.reject = undefined;
    done?.(answer); return true;
  }
  cancel(): void {
    const reject = this.reject; this.pending = null; this.resolve = undefined; this.reject = undefined;
    reject?.(new Error('Match closed'));
  }
  chooser(owner: PlayerId): Chooser {
    const ask = (kind: DecisionKind, args: unknown[]) => this.ask(owner, kind, args);
    return {
      chooseAbility: (...a) => ask('chooseAbility', a) as Promise<number | null>,
      chooseCards: (...a) => ask('chooseCards', a) as Promise<string[]>,
      chooseTarget: (...a) => ask('chooseTarget', a) as Promise<string | null>,
      chooseMode: (...a) => ask('chooseMode', a) as Promise<number>,
      chooseSlot: (...a) => ask('chooseSlot', a) as Promise<number>,
      confirm: (...a) => ask('confirm', a) as Promise<boolean>,
      personifyPrompt: (...a) => ask('personifyPrompt', a) as Promise<string | null>,
      battleCards: (...a) => ask('battleCards', a) as Promise<string[]>,
      blockPrompt: (...a) => ask('blockPrompt', a) as Promise<string[]>,
      revealConfirm: (...a) => ask('revealConfirm', a) as Promise<boolean>,
      revealCards: async (...a) => { await ask('revealCards', a); },
    };
  }
}
export function decisionCards(d: PendingDecision | null): string[] {
  if (!d) return [];
  const a = d.args;
  switch (d.kind) {
    case 'chooseAbility': return (a[2] as { uid: string }[]).map(o => o.uid);
    case 'chooseCards': case 'chooseTarget': case 'blockPrompt': return a[2] as string[];
    case 'chooseMode': return (a[3] as string[] | undefined) ?? [];
    case 'personifyPrompt': return a[1] as string[];
    case 'battleCards': return [...a[2] as string[], ...a[3] as string[]];
    case 'revealConfirm': return [a[1] as string];
    case 'revealCards': return a[1] as string[];
    default: return [];
  }
}
function validAnswer(d: PendingDecision, value: unknown): boolean {
  const a = d.args;
  if (d.kind === 'revealCards') return value === true;
  if (d.kind === 'confirm' || d.kind === 'revealConfirm') return typeof value === 'boolean';
  if (d.kind === 'chooseMode' || d.kind === 'chooseAbility') {
    return (value === null && d.kind === 'chooseAbility' && (a[3] as { allowDecline?: boolean } | undefined)?.allowDecline !== false) ||
      (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < (a[2] as unknown[]).length);
  }
  if (d.kind === 'chooseSlot') return typeof value === 'number' && (a[2] as number[]).includes(value);
  const candidates = decisionCards(d);
  if (d.kind === 'chooseTarget' && (a[3] as ChooseTargetOptions | undefined)?.draft && value === CANCEL_DRAFT) return true;
  if (d.kind === 'chooseCards' && (a[4] as ChooseCardsOptions | undefined)?.draft && Array.isArray(value) && value.length === 1 && value[0] === CANCEL_DRAFT) return true;
  if (d.kind === 'chooseTarget' || d.kind === 'personifyPrompt') return value === null || typeof value === 'string' && candidates.includes(value);
  if (!Array.isArray(value) || value.length > candidates.length || new Set(value).size !== value.length || value.some(v => typeof v !== 'string' || !candidates.includes(v))) return false;
  if (d.kind !== 'chooseCards') return true;
  const opts = (a[4] ?? {}) as ChooseCardsOptions, required = a[3] as number;
  const weight = weightedSelectionTotal(value, opts.weights, opts.firstSelectedMinimum);
  if (!value.length && opts.decline) return true;
  return opts.atLeast ? weight >= required && weightedSelectionTotal(value.slice(0, -1), opts.weights, opts.firstSelectedMinimum) < required
    : opts.upTo ? weight <= required : weight === required;
}
