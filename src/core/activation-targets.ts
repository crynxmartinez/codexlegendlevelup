import { commitCost, type CostPlan } from './activation.js';
import { CANCEL_DRAFT, type Chooser, type EffectContext } from './effects.js';
import { inst } from './state.js';
import type { Zone } from './types.js';

export interface TargetSpec {
  /** The triggering card is fixed, so do not ask the player to choose it again. */
  automatic?: boolean;
  prompt: string;
  when?: (ctx: EffectContext) => boolean;
  pool: (ctx: EffectContext) => string[];
  count?: number;
  optional?: boolean;
}
export interface DeclaredChoice {
  prompt: string;
  many: boolean;
  targets: Array<{ uid: string; zone: Zone; entry: number }>;
}

export type TargetFailure = 'left-field' | 'moved' | 'no-longer-eligible';

/** Report identity loss without revealing a hidden destination or replacement card. */
export function targetFailure(game: EffectContext['game'], target: DeclaredChoice['targets'][number], candidates?: string[]): TargetFailure | undefined {
  const card = game.cards[target.uid];
  if (!card || card.zone !== target.zone || (card.zoneEntry ?? 0) !== target.entry) {
    const wasOnField = target.zone === 'ally' || target.zone === 'persona';
    const changedFieldZone = card && card.zone !== target.zone && (card.zone === 'ally' || card.zone === 'persona');
    return wasOnField && !changedFieldZone ? 'left-field' : 'moved';
  }
  return candidates && !candidates.includes(target.uid) ? 'no-longer-eligible' : undefined;
}

/** Costs are projected privately so an Offered Ally may be the revival target. */
export async function prepareTargets(ctx: EffectContext, payment: CostPlan, specs: TargetSpec[]): Promise<DeclaredChoice[] | null> {
  const projected = { ...ctx, game: structuredClone(ctx.game), hooks: undefined, present: undefined, settle: undefined };
  const receipt = commitCost(projected, payment);
  if (!receipt) return null;
  projected.activation = receipt;
  const choices: DeclaredChoice[] = [];
  for (const spec of specs) {
    if (spec.when && !spec.when(projected)) continue;
    const pool = spec.pool(projected);
    // No target can be chosen; independent clauses may still resolve.
    if (!pool.length) { choices.push({ prompt: spec.prompt, many: spec.count !== undefined, targets: [] }); continue; }
    const picked = spec.automatic ? pool.slice(0, spec.count ?? 1) : spec.count !== undefined
      ? await ctx.chooser.chooseCards(ctx.me, spec.prompt, pool, Math.min(spec.count, pool.length), { upTo: spec.optional, draft: true, decline: spec.optional ? 'Choose none' : undefined })
      : [await ctx.chooser.chooseTarget(ctx.me, spec.prompt, pool, { draft: true, optional: spec.optional })].filter((uid): uid is string => !!uid);
    if (picked.includes(CANCEL_DRAFT)) return null;
    if (new Set(picked).size !== picked.length || picked.some(uid => !pool.includes(uid))) return null;
    if (!spec.optional && picked.length !== Math.min(spec.count ?? 1, pool.length)) return null;
    choices.push({ prompt: spec.prompt, many: spec.count !== undefined, targets: picked.map(uid => {
      const card = inst(projected.game, uid);
      return { uid, zone: card.zone, entry: card.zoneEntry ?? 0 };
    }) });
  }
  return choices;
}

/** Resolve declared targets by identity. An unavailable target never opens a replacement picker. */
export function withDeclaredTargets(ctx: EffectContext, choices: DeclaredChoice[], invalid: (reason: TargetFailure) => void): EffectContext {
  const remaining = structuredClone(choices);
  const wrap = (base: Chooser): Chooser => new Proxy(base, { get(target, property) {
    if (property !== 'chooseTarget' && property !== 'chooseCards') {
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    }
    return async (...args: unknown[]) => {
      const at = remaining.findIndex(c => c.prompt === args[1] && c.many === (property === 'chooseCards'));
      if (at < 0) return (Reflect.get(target, property) as (...a: unknown[]) => unknown).apply(target, args);
      const choice = remaining.splice(at, 1)[0]!;
      const candidates = args[2] as string[];
      const valid = choice.targets.filter(t => {
        const reason = targetFailure(ctx.game, t, candidates);
        if (reason) invalid(reason);
        return !reason;
      });
      return property === 'chooseCards' ? valid.map(t => t.uid) : valid[0]?.uid ?? null;
    };
  } });
  return { ...ctx, chooser: wrap(ctx.chooser), chooserFor: p => wrap(ctx.chooserFor?.(p) ?? ctx.chooser) };
}
