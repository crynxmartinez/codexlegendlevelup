import { essenceCard, offerTotal, offerUnit, offerValue, illanaBayArmed, ventCost, ventSelectedCards, type EffectContext } from './effects.js';
import { currentPower, def, inst, moveCard, you } from './state.js';
import type { Zone } from './types.js';

export type CostKind = 'offer' | 'vent' | 'essence' | 'discard' | 'top' | 'bottom';
export interface CostCard { uid: string; from: Zone; entry?: number; kind: CostKind }
export interface CostPlan {
  cards: CostCard[];
  offerRequired?: number;
  data?: Record<string, string | number | boolean | string[]>;
}
export interface CostReceipt {
  source?: { zone: Zone; entry: number };
  cards: string[];
  offered: string[];
  vented: string[];
  tokens: number;
  powers: Record<string, number>;
  data: Record<string, string | number | boolean | string[]>;
}

export interface CostDescription { label: string; missing?: string; effect?: string }
export type CostPreparer = ((ctx: EffectContext) => Promise<CostPlan | null>) & {
  describe?: (ctx: EffectContext) => CostDescription;
};
/** The same declared quantity drives payment, availability and the visible cost. */
export function offerCost(count: number): CostPreparer {
  return Object.assign((ctx: EffectContext) => prepareOffer(ctx, count), {
    describe: (ctx: EffectContext): CostDescription => {
      const pool = you(ctx.game, ctx.me).allies.filter((u): u is string => !!u && u !== ctx.source)
        .sort((a, b) => offerValue(ctx.index, ctx.game, a, false) - offerValue(ctx.index, ctx.game, b, false));
      const available = offerTotal(ctx.index, ctx.game, pool, true);
      return { label: `Offer ${count}`, missing: available < count ? `Need ${count - available} more Offer value from your Allies` : undefined };
    },
  });
}
export function ventPayment(printed: number): CostPreparer {
  return Object.assign((ctx: EffectContext) => prepareVent(ctx, printed), {
    describe: (ctx: EffectContext): CostDescription => {
      const required = ventCost(ctx, printed), available = you(ctx.game, ctx.me).heart.length;
      return { label: `Kalas ${required}${required < printed ? ` (${printed} − ${printed - required})` : ''}`,
        missing: available < required ? `Need ${required - available} more card${required - available === 1 ? '' : 's'} in Heart` : undefined };
    },
  });
}
export function cardPayment(pool: (ctx: EffectContext) => string[], count: number, kind: CostKind, prompt: string): CostPreparer {
  return Object.assign((ctx: EffectContext) => prepareCards(ctx, pool(ctx), count, kind, prompt), {
    describe: (ctx: EffectContext): CostDescription => ({ label: prompt,
      missing: pool(ctx).length < count ? `Need ${count - pool(ctx).length} more eligible card${count - pool(ctx).length === 1 ? '' : 's'} · ${prompt}` : undefined }),
  });
}

export function planCards(ctx: EffectContext, cards: string[], kind: CostKind): CostPlan {
  return { cards: cards.map(uid => ({ uid, kind, from: inst(ctx.game, uid).zone, entry: inst(ctx.game, uid).zoneEntry ?? 0 })) };
}

export async function prepareOffer(ctx: EffectContext, count: number, pool?: string[]): Promise<CostPlan | null> {
  await ctx.beforeOfferCost?.(count);
  if (ctx.game.winner !== null) return null;
  const candidates = (pool ?? you(ctx.game, ctx.me).allies.filter((uid): uid is string => !!uid && uid !== ctx.source))
    .filter(uid => ctx.game.cards[uid]?.zone === 'ally' && ctx.game.cards[uid]?.owner === ctx.me)
    .sort((a, b) => offerValue(ctx.index, ctx.game, a, false) - offerValue(ctx.index, ctx.game, b, false));
  if (offerTotal(ctx.index, ctx.game, candidates) < count) return null;
  const weights = Object.fromEntries(candidates.map(uid => [uid, offerValue(ctx.index, ctx.game, uid, false)]));
  const firstSelectedMinimum = illanaBayArmed(ctx.game, ctx.me) ? 2 : undefined;
  const picked = await ctx.chooser.chooseCards(ctx.me, `Offer ${count}: choose your Allies`, candidates, count, {
    paymentKind: 'offer', weights, firstSelectedMinimum, atLeast: true, decline: 'Cancel', confirm: 'Pay Offer cost',
    detail: firstSelectedMinimum ? 'Illana Bay: your first selected Unit counts as 2 Offers. Later Units count normally.' : undefined,
  });
  if (new Set(picked).size !== picked.length || picked.some(uid => !candidates.includes(uid)) || offerTotal(ctx.index, ctx.game, picked) < count) return null;
  if (offerTotal(ctx.index, ctx.game, picked.slice(0, -1)) >= count) return null;
  return { ...planCards(ctx, picked, 'offer'), offerRequired: count };
}

export async function prepareVent(ctx: EffectContext, printed: number): Promise<CostPlan | null> {
  const count = ventCost(ctx, printed);
  const candidates = [...you(ctx.game, ctx.me).heart];
  if (candidates.length < count) return null;
  if (count === 0) return { cards: [] };
  const picked = await ctx.chooser.chooseCards(ctx.me, `Kalas ${count}: choose cards from your Heart`, candidates, count, { from: 'heart', decline: 'Cancel' });
  if (picked.length !== count || new Set(picked).size !== count || picked.some(uid => !candidates.includes(uid))) return null;
  return planCards(ctx, picked, 'vent');
}

export async function prepareCards(ctx: EffectContext, pool: string[], count: number, kind: CostKind, prompt: string): Promise<CostPlan | null> {
  if (pool.length < count) return null;
  const chosen = await ctx.chooser.chooseCards(ctx.me, prompt, pool, count, { decline: 'Cancel' });
  if (chosen.length !== count || new Set(chosen).size !== count || chosen.some(uid => !pool.includes(uid))) return null;
  return planCards(ctx, chosen, kind);
}

/** Validate every component before performing any movement or emitting cost events. */
export function commitCost(ctx: EffectContext, plan: CostPlan): CostReceipt | null {
  const seen = new Set<string>();
  for (const payment of plan.cards) {
    const card = ctx.game.cards[payment.uid];
    if (seen.has(payment.uid) || !card || card.owner !== ctx.me || card.zone !== payment.from || (card.zoneEntry ?? 0) !== (payment.entry ?? 0)) return null;
    if (payment.kind === 'offer' && card.zone !== 'ally') return null;
    if (payment.kind === 'vent' && card.zone !== 'heart') return null;
    seen.add(payment.uid);
  }
  const offered = plan.cards.filter(p => p.kind === 'offer').map(p => p.uid);
  if (offerTotal(ctx.index, ctx.game, offered) < (plan.offerRequired ?? 0)) return null;
  const vented = plan.cards.filter(p => p.kind === 'vent').map(p => p.uid);
  const receipt: CostReceipt = {
    source: { zone: inst(ctx.game, ctx.source).zone, entry: inst(ctx.game, ctx.source).zoneEntry ?? 0 },
    cards: [...seen], offered, vented,
    tokens: vented.filter(uid => def(ctx.index, ctx.game, uid).type === 'Token').length,
    powers: Object.fromEntries([...seen].map(uid => [uid, currentPower(ctx.index, ctx.game, uid)])),
    data: { ...plan.data },
  };
  // Kalas is one event, even when six cards were paid.
  if (vented.length) ventSelectedCards(ctx, vented);
  const player = you(ctx.game, ctx.me);
  const paymentContext = { ...ctx, paymentObservers: { field: [...player.allies.filter((u): u is string => !!u), ...(player.persona ? [player.persona] : [])], grave: [...player.grave] } };
  for (const payment of plan.cards) {
    const { uid, kind } = payment;
    if (kind === 'offer') offerUnit(paymentContext, uid);
    else if (kind === 'essence') essenceCard(ctx, uid);
    else if (kind === 'discard') moveCard(ctx.game, uid, 'grave');
    else if (kind === 'top' || kind === 'bottom') {
      moveCard(ctx.game, uid, 'deck');
      const deck = you(ctx.game, ctx.me).deck;
      deck.splice(deck.indexOf(uid), 1);
      if (kind === 'top') deck.unshift(uid); else deck.push(uid);
    }
  }
  Object.freeze(receipt.cards); Object.freeze(receipt.offered); Object.freeze(receipt.vented);
  Object.freeze(receipt.powers); Object.freeze(receipt.data);
  return Object.freeze(receipt);
}
