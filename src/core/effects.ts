import { publicCardOrigin } from './card-origin.js';
import { queueHeartMove } from './heart-fx.js';
import { weightedSelectionTotal } from './selection-weight.js';
/**
 * Effect execution: the context, cost payment, and the effect atoms that card
 * scripts are written against.
 *
 * Player decisions go through `Chooser`, which is async so the UI can resolve a
 * choice on click while the AI resolves immediately.
 */
import {
  currentPower,
  def,
  draw as drawCard,
  inst,
  log,
  moveCard,
  opponentOf,
  you,
  type CardIndex,
} from './state.js';
import { isReleased } from './states.js';
import type {
  CardInstance,
  FxZone,
  GameState,
  ModifierDuration,
  PlayerId,
  Zone,
} from './types.js';
import type { BattleHooks } from './game.js';

// --- player decisions ------------------------------------------------------

/** Human-readable labels for the four ally slots [0] [1] PERSONA [2] [3]. */
export const SLOT_LABELS: Record<number, string> = {
  0: 'Leftmost',
  1: 'Left',
  2: 'Right',
  3: 'Rightmost',
};

/** Reserved wire value for cancelling a pre-commit draft, never a card UID. */
export const CANCEL_DRAFT = '__cancel_draft__';
export interface ChooseTargetOptions { draft?: boolean; optional?: boolean }
export interface ChooseCardsOptions {
  paymentKind?: 'offer';
  draft?: boolean;
  /** Preserve click order and let the player arrange all selected cards before confirming. */
  ordered?: boolean;
  confirm?: string;
  /** Optional cancellation button; returning no cards pays no cost. */
  decline?: string;
  /** Fewer than `count` may be chosen. */
  upTo?: boolean;
  /** Live draw preview for optional Kalas selections. */
  ventDrawPer?: number;
  /**
   * What each candidate counts for, when a cost is not measured in cards.
   * Missing entries count 1. `count` is then a total of these rather than a
   * number of cards — which is what lets one Kamil pay an Offer of 2.
   */
  weights?: Record<string, number>;
  /** Only the first selected card receives this minimum payment value. */
  firstSelectedMinimum?: number;
  /** Indivisible Offer values may exceed the cost (e.g. a value-2 Unit for Offer 1). */
  atLeast?: boolean;
  /** Where the candidates live, for UI labelling. */
  from?: string;
  /** Extra context shown under the prompt (e.g. the battle maths). */
  detail?: string;
  /**
   * Turn the prompt's detail line into a live battle readout.
   *
   * Blocking is the one choice in the game whose whole point is arithmetic:
   * the player is adding Defense until it beats a number. A static string
   * stating the number they started from makes them do that sum in their
   * head, once per card, and the answer changes with every click.
   *
   * Only the two ends are passed. What each candidate is worth, the client
   * reads off the card itself — deliberately, because `blockValue()` consumes
   * the Lake Buluan bonus and writes to the log, so it must never be called
   * to preview a choice that has not been made.
   */
  defenseMeter?: {
    /** The incoming attack, already including supporters. */
    attack: number;
    /** Defense before any blocker is added. */
    base: number;
    /** What is being defended, for the label. */
    targetName: string;
    /**
     * Extra Defense the FIRST blocker gets (Lake Buluan). Applied once, to
     * the selection as a whole, not to each card.
     */
    firstBonus?: number;
  };
}

/** One pending ability offered to the player, with the card it is printed on. */
export interface AbilityOption {
  trigger?: TriggerName;
  cause?: import('./card-origin.js').CardOrigin;
  /** Public payment information supplied by the authoritative rules. */
  costLabel?: string;
  effectSummary?: string;
  /** Stable skill identity for grouping repeated occurrences from one card. */
  skillId?: string;
  /** Stable occurrence/skill identifier; never a position in a hidden list. */
  id?: string;
  /** Card instance the ability belongs to, so the client can show its art. */
  uid: string;
  /** Card name, for a text-only fallback. */
  cardName: string;
  /** The ability's rules text. */
  text: string;
}

/** What the battle-card window is being opened against. */
export interface BattleWindowInfo {
  /** Whose side of the attack this window belongs to. */
  role: 'attacker' | 'defender';
  attackPower: number;
  defensePower: number;
  /** What is being attacked, for the prompt to name. */
  targetName: string;
}

/** What the block prompt is being asked against. */
export interface BlockWindowInfo {
  attackPower: number;
  defensePower: number;
  targetName: string;
  /** Lake Buluan's first-blocker bonus, read rather than spent. */
  firstBonus: number;
}

export interface Chooser {
  /**
   * Choose which pending ability resolves next. Returns the index, or null to
   * decline / stop. The client is expected to SHOW the cards - these prompts
   * are how Codex and unit effects are read mid-game.
   */
  chooseAbility(
    p: PlayerId,
    prompt: string,
    options: AbilityOption[],
    context?: { kind: 'response' | 'pending' | 'battle' | 'cost'; allowDecline: boolean; chainId?: string },
  ): Promise<number | null>;

  chooseCards(
    p: PlayerId,
    prompt: string,
    candidates: string[],
    count: number,
    opts?: ChooseCardsOptions,
  ): Promise<string[]>;

  chooseTarget(
    p: PlayerId,
    prompt: string,
    candidates: string[],
    opts?: ChooseTargetOptions,
  ): Promise<string | null>;

  /**
   * `cardUids` shows the cards the choice is about, so the player sees the
   * card and not just its name.
   */
  chooseMode(
    p: PlayerId,
    prompt: string,
    modes: string[],
    cardUids?: string[],
  ): Promise<number>;

  /**
   * Show one or more cards to the player with no decision attached — used
   * wherever an effect "reveals" or "checks" the top of a deck.
   */
  revealCards(
    p: PlayerId,
    uids: string[],
    title: string,
    subtitle?: string,
  ): Promise<void>;

  confirm(p: PlayerId, prompt: string): Promise<boolean>;

  /**
   * Choose an Ally Zone, by slot index.
   *
   * Separate from `chooseMode` because the question is about a place on the
   * board, and "Leftmost / Rightmost" in a list asks the player to hold the
   * board in their head and translate. The client is expected to show the
   * zones themselves — including what is standing in them, which is the whole
   * decision when the answer destroys one.
   */
  chooseSlot(p: PlayerId, prompt: string, candidates: number[], placement?: { incomingUid: string }): Promise<number>;

  /**
   * Personify phase prompt: choose a level 3+ Unit from hand to personify,
   * or null to skip. Called once at the start of each turn if personification
   * options exist.
   */
  personifyPrompt(p: PlayerId, candidates: string[]): Promise<string | null>;


  /**
   * The battle-card window.
   *
   * Every attack opens one for each player in turn: the attacker first, then
   * the defender. What can be spent here is what the yellow box marks — a
   * Force from either hand, and on a Persona attack the defender's Sentry.
   *
   * The answer is the chosen cards IN RESOLUTION ORDER, so the player decides
   * what happens first as well as what happens; an empty array declines. A
   * Sentry resolves at its ordered position and stops the attack immediately.
   * Later cards stay in hand when the attack stops.
   */
  battleCards(
    p: PlayerId,
    info: BattleWindowInfo,
    forceCandidates: string[],
    sentryCandidates: string[],
  ): Promise<string[]>;

  /**
   * The defender's blockers, asked only once the attack still stands — a
   * committed Sentry ends the defence before this. Returns the cards to put
   * to Defense; an empty array takes the hit.
   */
  blockPrompt(
    p: PlayerId,
    info: BlockWindowInfo,
    candidates: string[],
  ): Promise<string[]>;

  /**
   * Show a card to the player and ask a yes/no question about it.
   * The card art is displayed alongside the prompt.
   */
  revealConfirm(
    p: PlayerId,
    uid: string,
    prompt: string,
    labels?: { yes: string; no: string },
  ): Promise<boolean>;
}

/** Picks the first legal option every time - used for tests. */
export const autoChooser: Chooser = {
  async chooseAbility() {
    return 0;
  },
  async chooseCards(_p, _prompt, candidates, count, opts = {}) {
    const chosen: string[] = [];
    for (const uid of candidates) {
      if (weightedSelectionTotal(chosen, opts.weights, opts.firstSelectedMinimum) >= count) break;
      chosen.push(uid);
    }
    return chosen;
  },
  async chooseTarget(_p, _prompt, candidates) {
    return candidates[0] ?? null;
  },
  async chooseMode() {
    return 0;
  },
  async chooseSlot(_p, _prompt, candidates) {
    return candidates[0] ?? 0;
  },
  async confirm() {
    return true;
  },
  async personifyPrompt(_p, candidates) {
    return candidates[0] ?? null;
  },
  async battleCards(_p, _info, _forces, sentryCandidates) {
    // Headless: shield if there is a shield, spend nothing else.
    return sentryCandidates.slice(0, 1);
  },
  async blockPrompt() {
    return [];
  },
  async revealConfirm() {
    return true;
  },
  async revealCards() {
    // Headless: nothing to show.
  },
};

// --- context ---------------------------------------------------------------

export interface EffectContext {
  /** A separate chain before drafting an Offer payment; never inserted during resolution. */
  beforeOfferCost?: (count: number) => Promise<void>;
  /** Last-known observers for a simultaneous payment batch. */
  paymentObservers?: { field: string[]; grave: string[] };
  /** Immutable receipt for the activation's already committed cost. */
  activation?: import('./activation.js').CostReceipt;
  /** Finish queued visuals before an immediate animation such as drawing. */
  present?: () => Promise<void>;
  /** Settle Offer/Last Oath chains before continuing a compound skill. */
  settle?: () => Promise<void>;
  chooserFor?: (player: PlayerId) => Chooser;
  index: CardIndex;
  game: GameState;
  /** The player who controls the effect. */
  me: PlayerId;
  /** The card instance the ability is printed on. */
  source: string;
  chooser: Chooser;
  /** Extra data supplied by the trigger (e.g. the card revealed by a check). */
  event?: TriggerEvent;
  /** UI animation hooks (optional — absent in tests). */
  hooks?: BattleHooks;
}

export function opponent(ctx: EffectContext): PlayerId {
  return opponentOf(ctx.me);
}

// --- trigger events --------------------------------------------------------

export type TriggerName =
  | 'essenced'
  | 'vented'
  | 'effectExhausted'
  | 'battleFinished'
  | 'unitOffered'
  | 'offerResolved'
  | 'forceResolved'
  | 'codexChanged'
  | 'placed'
  | 'attack'
  | 'attackHit'
  | 'attackMiss'
  | 'attackResolved'
  | 'supported'
  | 'startOfTurn'
  | 'startOfMain'
  | 'startOfBattle'
  | 'endOfTurn'
  | 'barrierBroken'
  | 'codexPlayed'
  | 'personaAttack'
  | 'personaAttacked'
  | 'unitAttacked'
  | 'tokenCreated'
  | 'unitDamagedByAbility'
  | 'personify'
  | 'spiritsGenerated'
  /** A State released for its owner. Fired once, on the release itself. */
  | 'kaluluwaCreated'
  | 'stateReleased';

export interface TriggerEvent {
  qualifiedState?: { source: string; state: string };
  offeredFrom?: import('./card-origin.js').CardOrigin;
  fieldObservers?: string[];
  graveObservers?: string[];
  cards?: string[];
  tokens?: number;
  fromDeck?: boolean;
  firstEssenceFor?: string[];
  firstEssenceThisTurn?: boolean;
  bonusCreation?: boolean;
  hit?: boolean;
  target?: string | null;
  checkKind?: 'attack' | 'barrier';
  firstOfferCodex?: string;
  firstOfferThisTurn?: boolean;
  name: TriggerName;
  /** The unit that attacked / was placed, when relevant. */
  unit?: string;
  /** Card revealed by a check, when relevant. */
  revealed?: string;
  /** The player who caused the damage (for unitDamagedByAbility). */
  damager?: PlayerId;
  /** Uids of supporters (for supported). */
  supporters?: string[];
  /** Whether a placed event was a special call (vs normal call). */
  special?: boolean;
  /** Zone a special-called unit came from (deck / hand / heart / grave). */
  from?: Zone;
}

// --- costs -----------------------------------------------------------------

export function canPayEnergy(ctx: EffectContext, n: number): boolean {
  return (you(ctx.game, ctx.me).energy ?? 0) >= n;
}

export function payEnergy(ctx: EffectContext, n: number): boolean {
  const ps = you(ctx.game, ctx.me);
  if ((ps.energy ?? 0) < n) return false;
  if (ps.energy === undefined) throw new Error("Historical Energy payment is unavailable in these rules.");
  ps.energy -= n;
  return true;
}

/** Spend energy directly (for card scripts that already checked the cost). */
export function spendEnergy(ctx: EffectContext, n: number): void {
  const ps = you(ctx.game, ctx.me);
  if (ps.energy === undefined) throw new Error("Historical Energy payment is unavailable in these rules.");
  ps.energy -= n;
}

export async function discard(
  ctx: EffectContext,
  n: number | 'all',
): Promise<string[]> {
  const ps = you(ctx.game, ctx.me);
  const count = n === 'all' ? ps.hand.length : Math.min(n, ps.hand.length);
  if (count === 0) return [];
  const picked =
    n === 'all'
      ? [...ps.hand]
      : await ctx.chooser.chooseCards(ctx.me, `Discard ${count}`, [...ps.hand], count, {
          from: 'hand',
        });
  for (const uid of picked) moveCard(ctx.game, uid, 'grave');
  log(ctx.game, `Player ${ctx.me} discarded ${picked.length}.`, picked);
  return picked;
}

/**
 * Rally - send cards to the BOTTOM of the deck.
 * Mandatory, controller chooses, and pays as much as possible if short.
 */
export async function rally(
  ctx: EffectContext,
  n: number,
  from: 'hand' | 'field' = 'hand',
  opts: { upTo?: boolean } = {},
): Promise<number> {
  const ps = you(ctx.game, ctx.me);
  const pool =
    from === 'hand'
      ? [...ps.hand]
      : ps.allies.filter((x): x is string => !!x);
  const count = Math.min(n, pool.length);
  if (count === 0) {
    log(ctx.game, `Player ${ctx.me} could not Rally - nothing to send.`);
    return 0;
  }  const picked = await ctx.chooser.chooseCards(
    ctx.me,
    `Rally ${opts.upTo ? 'up to ' : ''}${count} to the bottom of your deck`,
    pool,
    count,
    { upTo: opts.upTo, from },
  );
  // Animate the rally before the cards actually move.
  if (picked.length > 0) await ctx.hooks?.onRally?.(picked, ctx.me);
  for (const uid of picked) {
    const c = inst(ctx.game, uid);
    // moveCard puts a card on TOP of the deck; Rally goes to the bottom.
    moveCard(ctx.game, uid, 'deck', { handMotion: !ctx.hooks?.onRally });
    ps.deck.shift();
    ps.deck.push(uid);
    c.zone = 'deck';
  }
  log(ctx.game, `Player ${ctx.me} rallied ${picked.length} to the bottom.`, picked);
  return picked.length;
}

// --- effect atoms ----------------------------------------------------------

/** Put known deck cards underneath in one confirmed order, first to last drawn. */
export async function orderDeckBottom(ctx: EffectContext, candidates: string[]): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  const cards = [...new Set(candidates)].filter(uid => ps.deck.includes(uid));
  if (!cards.length) return;
  const picked = cards.length === 1 ? cards : await ctx.chooser.chooseCards(
    ctx.me, 'Order the bottom of your deck', cards, cards.length,
    { ordered: true, confirm: 'OK', detail: 'Choose cards in order: 1, 2, 3… Last number goes deepest. Click again to reorder, then press OK.' },
  );
  // Keep every eligible card exactly once, even if a non-UI chooser returns an incomplete order.
  const selected = [...new Set(picked)].filter(uid => cards.includes(uid));
  const order = [...selected, ...cards.filter(uid => !selected.includes(uid))];
  for (const uid of order) {
    if (!ps.deck.includes(uid)) continue;
    moveCard(ctx.game, uid, 'deck');
    ps.deck.splice(ps.deck.indexOf(uid), 1);
    ps.deck.push(uid);
  }
}

/** Number every card in one choice; number 1 will be drawn first. */
export async function orderDeckTop(ctx: EffectContext, candidates: string[]): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  const cards = [...new Set(candidates)].filter(uid => ps.deck.includes(uid));
  if (cards.length < 2) return;
  const picked = await ctx.chooser.chooseCards(ctx.me, 'Order the top of your deck', cards, cards.length,
    { ordered: true, confirm: 'OK', detail: 'Choose cards in order: 1, 2, 3… Number 1 is drawn first. Click again to reorder, then press OK.' });
  const selected = [...new Set(picked)].filter(uid => cards.includes(uid));
  const order = [...selected, ...cards.filter(uid => !selected.includes(uid))].filter(uid => ps.deck.includes(uid));
  ps.deck.splice(0, ps.deck.length, ...order, ...ps.deck.filter(uid => !order.includes(uid)));
}

export async function draw(ctx: EffectContext, n: number): Promise<string[]> {
  await ctx.present?.();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const uid = drawCard(ctx.game, ctx.me);
    if (!uid) break;
    out.push(uid);
    // Animate each drawn card as it is drawn, so the fly animation
    // matches the deck shrinking one card at a time.
    await ctx.hooks?.onEffectDraw?.(uid, ctx.me);
  }
  if (out.length) {
    log(ctx.game, `Player ${ctx.me} drew ${out.length}.`, out);
    emit(ctx.game, { actor: ctx.me, type: 'cardDrawn', sourceUids: [], targetUids: [], visibility: 'owner',
      changes: [{ what: 'drawn', owner: ctx.me, from: 0, to: out.length }], message: `Player ${ctx.me} drew ${out.length}.` });
  }
  return out;
}

export function buffPower(
  ctx: EffectContext,
  target: string,
  amount: number,
  duration: ModifierDuration = 'endOfTurn',
): void {
  if (!sourceStillApplies(ctx, target)) return;
  const beforePower = currentPower(ctx.index, ctx.game, target);
  inst(ctx.game, target).modifiers.push({
    origin: publicCardOrigin(ctx.index, ctx.game, ctx.source),
    cause: ctx.event?.name === 'unitOffered' ? ctx.event.offeredFrom : undefined,
    amount,
    duration,
    source: def(ctx.index, ctx.game, ctx.source).name,
    sourceId: def(ctx.index, ctx.game, ctx.source).id,
  });
  const targetName = def(ctx.index, ctx.game, target).name;
  const sourceName = def(ctx.index, ctx.game, ctx.source).name;
  const targetCard = inst(ctx.game, target);
  if (!targetCard.faceDown && ['ally', 'persona'].includes(targetCard.zone)) emit(ctx.game, {
    actor: ctx.me, type: 'powerChanged', visibility: 'public', sourceUids: [], targetUids: [target],
    changes: [{ what: 'power', uid: target, from: beforePower, to: currentPower(ctx.index, ctx.game, target) }],
    message: `${targetName} gained ${amount >= 0 ? '+' : ''}${amount} Power.`,
  });
  if (ctx.source && ctx.source !== target) {
    ctx.game.pendingFx.push({ kind: 'target', source: ctx.source, target });
  }
  ctx.game.pendingFx.push({ kind: 'power', target, amount });
  log(
    ctx.game,
    `${targetName} gets ${amount >= 0 ? '+' : ''}${amount} (from ${sourceName}).`,
    [target, ctx.source],
  );
}

export function myUnits(ctx: EffectContext, p = ctx.me): string[] {
  const ps = you(ctx.game, p);
  return [...ps.allies.filter((x): x is string => !!x), ...(ps.persona ? [ps.persona] : [])];
}

/** Only ally units (not the Persona) — used for echo, ability damage, etc. */
export function myAllyUnits(ctx: EffectContext, p = ctx.me): string[] {
  const ps = you(ctx.game, p);
  return ps.allies.filter((x): x is string => !!x);
}

/** Is this uid the player's Persona? */
export function isPersona(ctx: EffectContext, uid: string): boolean {
  const ps = you(ctx.game, ctx.me);
  return ps.persona === uid;
}

export function buffAll(
  ctx: EffectContext,
  amount: number,
  duration: ModifierDuration = 'endOfTurn',
): void {
  for (const uid of myUnits(ctx)) buffPower(ctx, uid, amount, duration);
}

export function exhaust(ctx: EffectContext, targets: string[]): void {
  for (const uid of targets) {
    const card = inst(ctx.game, uid);
    if (!card.exhausted && card.owner !== ctx.me && card.zone === 'ally') {
      (ctx.game.pendingBabaylan ??= []).push({ owner: ctx.me, name: 'effectExhausted', unit: uid });
    }
    card.exhausted = true;
  }
  if (targets.length) log(ctx.game, `Exhausted ${targets.length} unit(s).`, targets);
}

/** Damage a unit - it is destroyed and sent to the Grave.
 * The Persona CANNOT be damaged by abilities unless the card explicitly says so. */
export function damageUnit(ctx: EffectContext, target: string): void {
  const ownerPs = you(ctx.game, inst(ctx.game, target).owner);
  if (ownerPs.persona === target) {
    log(ctx.game, `${def(ctx.index, ctx.game, target).name} is a Persona and cannot be damaged by abilities.`, [target]);
    return;
  }
  const sourceName = def(ctx.index, ctx.game, ctx.source).name;
  if (ctx.source && ctx.source !== target) {
    ctx.game.pendingFx.push({ kind: 'strike', source: ctx.source, target });
  }
  ctx.game.pendingFx.push({ kind: 'destroy', uid: target, owner: inst(ctx.game, target).owner });
  log(ctx.game, `${def(ctx.index, ctx.game, target).name} was damaged by ${sourceName} and destroyed.`, [target, ctx.source]);
  moveCard(ctx.game, target, 'grave');
}

export function searchDeck(
  ctx: EffectContext,
  filter: (id: string) => boolean,
): string[] {
  return you(ctx.game, ctx.me).deck.filter((uid) =>
    filter(def(ctx.index, ctx.game, uid).id),
  );
}

/** Reveal the top card, then send it to the top or bottom of the deck. */
export async function scryTop(ctx: EffectContext): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  const top = ps.deck[0];
  if (!top) return;
  fxSearch(ctx);
  const name = def(ctx.index, ctx.game, top).name;
  const toBottom = await ctx.chooser.revealConfirm(
    ctx.me,
    top,
    `Send ${name} to the bottom of your deck?`,
  );
  if (toBottom) {
    ps.deck.shift();
    ps.deck.push(top);
    log(ctx.game, `Sent ${name} to the bottom.`, [top]);
  }
}

/**
 * Look at the bottom N cards of the deck. Player chooses one to put on top,
 * the rest stay at the bottom in their original order.
 */
export async function lookAtBottom(
  ctx: EffectContext,
  n: number,
): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  if (ps.deck.length === 0) return;
  fxSearch(ctx);
  const count = Math.min(n, ps.deck.length);
  // Bottom N cards (last element is the very bottom).
  const bottomUids = ps.deck.slice(ps.deck.length - count);
  const names = bottomUids.map((uid) => def(ctx.index, ctx.game, uid).name);
  const pick = await ctx.chooser.chooseTarget(
    ctx.me,
    `Put which bottom card on top? (${names.join(', ')})`,
    bottomUids,
  );
  if (!pick) return;
  // Remove the picked card from the deck and put it on top.
  const idx = ps.deck.lastIndexOf(pick);
  if (idx >= 0) ps.deck.splice(idx, 1);
  ps.deck.unshift(pick);
  log(
    ctx.game,
    `Put ${def(ctx.index, ctx.game, pick).name} from the bottom to the top of the deck.`,
    [pick],
  );
}

/**
 * Look at the top N cards of the deck. For each card, the player chooses
 * whether to keep it on top or send it to the bottom. Cards kept on top
 * remain in their original order.
 */
export async function arrangeTopN(
  ctx: EffectContext,
  n: number,
): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  if (ps.deck.length === 0) return;
  fxSearch(ctx);
  const count = Math.min(n, ps.deck.length);
  // Take the top N cards off the deck.
  const topUids = ps.deck.splice(0, count);
  const keepOnTop: string[] = [];
  const sendToBottom: string[] = [];
  for (const uid of topUids) {
    const name = def(ctx.index, ctx.game, uid).name;
    const choice = await ctx.chooser.chooseMode(
      ctx.me,
      `${name}: keep on top or send to bottom?`,
      ['Top', 'Bottom'],
      [uid],
    );
    if (choice === 0) {
      keepOnTop.push(uid);
    } else {
      sendToBottom.push(uid);
    }
  }
  // Put kept cards back on top (in original order), then bottom cards at the bottom.
  ps.deck.unshift(...keepOnTop);
  ps.deck.push(...sendToBottom);
  const topNames = keepOnTop.map((uid) => def(ctx.index, ctx.game, uid).name);
  const bottomNames = sendToBottom.map((uid) => def(ctx.index, ctx.game,uid).name);
  log(
    ctx.game,
    `Arranged top ${count}: [${topNames.join(', ') || 'none'}] on top, [${bottomNames.join(', ') || 'none'}] to bottom.`,
    [...keepOnTop, ...sendToBottom],
  );
}

/** Special call ignores the 3-play cap and the Persona level gate. */
export interface SpecialCallOptions {
  /**
   * When every Ally Zone is occupied, replace one instead of failing — the
   * displaced unit is destroyed as if damaged by an ability, so its own
   * "when destroyed" triggers fire.
   *
   * Defaults to true: a special call is never blocked by a full board. Pass
   * false only for an effect that is meant to fizzle instead.
   */
  allowOverwrite?: boolean;
}

/** Announce that a pile is being looked through, so the UI can lift it. */
export function fxSearch(
  ctx: EffectContext,
  pile: 'deck' | 'grave' | 'heart' = 'deck',
): void {
  ctx.game.pendingFx.push({ kind: 'search', player: ctx.me, pile });
}

/**
 * Collapse the zone a unit came from into the routes the player cares about.
 * Anywhere unusual reads as a call from hand — the quietest of the flourishes.
 */
function arrivalRoute(zone: string): 'hand' | 'deck' | 'grave' | 'heart' {
  return zone === 'deck' || zone === 'grave' || zone === 'heart' ? zone : 'hand';
}

/**
 * Piles a card can be pulled out of, as opposed to places it already is.
 *
 * A card played from hand needs no journey shown — it is on screen, in front
 * of the player, and they just chose it. Flying a copy of it out of their own
 * hand would narrate back to them the thing they did. The piles below are the
 * ones a player cannot see into, where "where did that come from?" is a real
 * question.
 */
function pileOrigin(zone: Zone): FxZone | null {
  return zone === 'deck' || zone === 'grave' || zone === 'heart'
    || zone === 'exile' || zone === 'extra'
    ? zone
    : null;
}

/**
 * Show a card travelling out of a pile: the source lights, the card rises out
 * of it and moves to where it is going.
 *
 * `faceUp` is false wherever the viewer is not entitled to the card's face
 * yet — the ceremony must not pre-empt a reveal that has its own moment.
 */
export function fxEmit(
  ctx: EffectContext,
  uid: string,
  from: FxZone,
  to: FxZone,
  opts: { faceUp?: boolean; owner?: PlayerId } = {},
): void {
  ctx.game.pendingFx.push({
    kind: 'emit',
    uid,
    from,
    to,
    owner: opts.owner ?? ctx.me,
    faceUp: opts.faceUp !== false,
  });
}

export async function specialCall(
  ctx: EffectContext,
  uid: string,
  opts: SpecialCallOptions = {},
): Promise<boolean> {
  const ps = you(ctx.game, ctx.me);
  const allowOverwrite = opts.allowOverwrite !== false;
  const name = def(ctx.index, ctx.game, uid).name;
  let replaced = false;
  const free = ps.allies
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i >= 0);

  let slot: number;
  if (free.length > 0) {
    slot =
      free.length === 1
        ? free[0]!
        : await ctx.chooser.chooseSlot(ctx.me, `Where does ${name} go?`, free, { incomingUid: uid });
  } else if (allowOverwrite) {
    const occupied = ps.allies
      .map((v, i) => (v ? i : -1))
      .filter((i) => i >= 0);
    if (occupied.length === 0) return false;
    slot =
      occupied.length === 1
        ? occupied[0]!
        : await ctx.chooser.chooseSlot(
            ctx.me,
            `Ally Zones are full — which unit does ${name} replace?`,
            occupied,
            { incomingUid: uid },
          );
    const displaced = ps.allies[slot]!;
    log(
      ctx.game,
      `${name} replaces ${def(ctx.index, ctx.game, displaced).name}.`,
      [displaced, uid],
    );
    // Counts as damage, so triggers and the destruction animation both fire.
    damageUnitByAbility(ctx, displaced);
    replaced = true;
  } else {
    return false;
  }

  const from = inst(ctx.game, uid).zone;
  inst(ctx.game, uid).calledFromDeck = from === 'deck';
  // Where it came from, and for a Battle call also when. Assigned either way,
  // never only set: a unit called again from somewhere else, or in another
  // phase, must stop qualifying.
  inst(ctx.game, uid).calledFromDeckInBattleTurn =
    from === 'deck' && ctx.game.phase === 'battle' ? ctx.game.turnNumber : undefined;

  // The journey, then the landing. A card called out of the deck should be
  // seen leaving the deck; the arrival flourish alone only ever said that
  // something had appeared, never where it came from.
  const origin = pileOrigin(from);
  if (origin && origin !== 'heart') fxEmit(ctx, uid, origin, 'field');

  moveCard(ctx.game, uid, 'ally', { slot });
  // How a unit arrived is a rules difference, so it is also a visual one.
  ctx.game.pendingFx.push({
    kind: 'arrive',
    uid,
    from: replaced ? 'replace' : arrivalRoute(from),
    level: def(ctx.index, ctx.game, uid).level ?? 1,
  });
  // Queue for The Last Tree (Dryad) — special call generates 2 wisps.
  ctx.game.pendingSpecialCalls.push({ uid, owner: ctx.me, from });
  log(ctx.game, `Player ${ctx.me} special called ${def(ctx.index, ctx.game, uid).name}.`, [uid]);
  // Pulangi River: the first unit called this turn is Offered.
  if (ps.pulangiRiverFirstCallPending) {
    ps.pulangiRiverFirstCallPending = false;
    // Use offerUnit so Last Oath triggers fire.
    offerUnit(ctx, uid);
    log(ctx.game, `Pulangi River: ${def(ctx.index, ctx.game, uid).name} was Offered (first call this turn).`, [uid]);
  }
  return true;
}

// --- delayed effects -------------------------------------------------------

export interface DelayedEffect {
  owner: PlayerId;
  label: string;
  run: (chooser: Chooser) => Promise<void>;
}

const delayedQueue = new WeakMap<GameState, DelayedEffect[]>();

/** Queue something for the end of the current turn (e.g. Rally 2). */
/**
 * Send the card an ability is printed on to Exile, face down.
 *
 * Six cards across five decks did this identically. Exile is the one zone a
 * card never comes back from, which makes it the zone most worth showing a
 * card travelling to — otherwise a unit simply stops existing.
 */
export function exileSelf(ctx: EffectContext): void {
  if (inst(ctx.game, ctx.source).zone !== 'hand') fxEmit(ctx, ctx.source, 'field', 'exile');
  moveCard(ctx.game, ctx.source, 'exile', { faceDown: true });
}

export function scheduleEndOfTurn(ctx: EffectContext, effect: DelayedEffect): void {
  const q = delayedQueue.get(ctx.game) ?? [];
  q.push(effect);
  delayedQueue.set(ctx.game, q);
  log(ctx.game, `Queued for end of turn: ${effect.label}`);
}

export function pendingEndOfTurn(game: GameState): DelayedEffect[] {
  return delayedQueue.get(game) ?? [];
}

/** Run and clear this turn's delayed effects. They stack. */
export async function runEndOfTurn(
  game: GameState,
  p: PlayerId,
  chooser: Chooser,
): Promise<void> {
  const q = delayedQueue.get(game) ?? [];
  const mine = q.filter((e) => e.owner === p);
  delayedQueue.set(
    game,
    q.filter((e) => e.owner !== p),
  );
  for (const e of mine) await e.run(chooser);
}

// --- helpers used widely by card scripts ----------------------------------

export function enemyAllies(ctx: EffectContext): string[] {
  return you(ctx.game, opponent(ctx)).allies.filter((x): x is string => !!x);
}

/** All enemy units (allies + persona). */
export function enemyUnits(ctx: EffectContext): string[] {
  const ps = you(ctx.game, opponent(ctx));
  return [...ps.allies.filter((x): x is string => !!x), ...(ps.persona ? [ps.persona] : [])];
}

/** Only the opponent's ally units (not their Persona) — for ability damage. */
export function enemyAllyUnits(ctx: EffectContext): string[] {
  const ps = you(ctx.game, opponent(ctx));
  return ps.allies.filter((x): x is string => !!x);
}

export function exhaustedAlliesAnyPlayer(ctx: EffectContext): string[] {
  return [0, 1]
    .flatMap((p) => you(ctx.game, p as PlayerId).allies)
    .filter((x): x is string => !!x)
    .filter((uid) => inst(ctx.game, uid).exhausted);
}

// --- tokens, damage by ability ---------------------------------------------

import { destroyToken } from './tokens.js';

/**
 * Echo: return a unit from the field to its owner's hand.
 * The Persona CANNOT be echoed — it stays in the Persona zone.
 * Returns the echoed unit's level (for token creation), or 0 if rejected.
 */
export function echo(ctx: EffectContext, uid: string): number {
  // Persona cannot be echoed.
  const c = inst(ctx.game, uid);
  const ownerPs = you(ctx.game, c.owner);
  if (ownerPs.persona === uid) {
    log(ctx.game, `${def(ctx.index, ctx.game, uid).name} is a Persona and cannot be echoed.`, [uid]);
    return 0;
  }
  const d = def(ctx.index, ctx.game, uid);
  const level = d.level;
  const owner = c.owner;
  // Face down when it is not your card: an echoed unit is public on the board
  // but its return to a hand you cannot see should not linger face-up.
  fxEmit(ctx, uid, 'field', 'hand', { owner, faceUp: owner === ctx.me });
  moveCard(ctx.game, uid, 'hand');
  log(ctx.game, `Echoed ${d.name} (lvl ${level}) back to hand.`, [uid]);
  return level;
}

/**
 * Damage a unit via a card ability (NOT battle damage).
 * Real units go to Grave; tokens cease to exist.
 * Fires the `unitDamagedByAbility` trigger.
 *
 * Returns true if the unit was destroyed.
 */
export function damageUnitByAbility(ctx: EffectContext, uid: string, bypassRefuge = false): boolean {
  if (ctx.game.cards[uid]?.zone !== 'ally' && ctx.game.cards[uid]?.zone !== 'persona') return false;
  const d = def(ctx.index, ctx.game, uid);
  const owner = inst(ctx.game, uid).owner;
  const refuge = you(ctx.game, owner).activeCodex;
  if (!bypassRefuge && owner !== ctx.game.turnPlayer && refuge &&
      !def(ctx.index, ctx.game, refuge).tutorial &&
      def(ctx.index, ctx.game, refuge).id === 'maguindanao/set-1/cave-beneath-the-earth-the-last-refuge' &&
      !inst(ctx.game, refuge).usesThisTurn.refuge &&
      you(ctx.game, owner).allies.some(u => u && u !== uid)) {
    (ctx.game.pendingRefugeDamage ??= []).push({ uid, source: ctx.source, damager: ctx.me, owner, codex: refuge });
    return false;
  }

  // Persona cannot be damaged by abilities (unless explicitly allowed by the card).
  const ownerPs = you(ctx.game, owner);
  if (ownerPs.persona === uid) {
    log(ctx.game, `${d.name} is a Persona and cannot be damaged by abilities.`, [uid]);
    return false;
  }

  // A strike, not a neutral target line: this effect is about to kill the
  // thing it is pointing at, and that should look different from a buff.
  if (ctx.source && ctx.source !== uid) {
    ctx.game.pendingFx.push({ kind: 'strike', source: ctx.source, target: uid });
  }
  ctx.game.pendingFx.push({ kind: 'destroy', uid, owner });

  // Tokens cease to exist; real units go to Grave.
  if (d.type === 'Token') {
    destroyToken(ctx.index, ctx.game, uid);
  } else {
    // Name the culprit — "destroyed by ability" alone leaves the player
    // guessing which card did it, especially mid-chain.
    const by = ctx.source ? def(ctx.index, ctx.game, ctx.source).name : null;
    log(
      ctx.game,
      by && ctx.source !== uid
        ? `${d.name} was destroyed by ${by}'s ability.`
        : `${d.name} was destroyed by its own ability.`,
      by && ctx.source !== uid ? [uid, ctx.source] : [uid],
    );
    moveCard(ctx.game, uid, 'grave');
  }

  // Queue the damage event for trigger flushing.
  ctx.game.pendingDamageByAbility.push({
    damager: ctx.me,
    damagedUid: uid,
    damagedOwner: owner,
  });

  return true;
}

/** Illana Bay changes Offer payment value, never physical card or Grave counts. */
export const ILLANA_BAY_ID = 'maguindanao/set-1/reach-of-the-ridge-giants-illana-bay';

export function illanaBayArmed(game: GameState, owner: PlayerId): boolean {
  const ps = you(game, owner);
  return ps.firstOfferTurn !== game.turnNumber && ps.illanaBayArmedTurn === game.turnNumber;
}

export function canActivateIllanaBay(game: GameState, owner: PlayerId): boolean {
  const ps = you(game, owner);
  return game.winner === null && !game.responseChain && ps.firstOfferTurn !== game.turnNumber
    && ps.illanaBayActivatedTurn !== game.turnNumber && !illanaBayArmed(game, owner)
    && game.rulesProfile !== 'tutorial-v1' && !!ps.activeCodex && game.cards[ps.activeCodex]?.defId === ILLANA_BAY_ID;
}

export function offerValue(index: CardIndex, game: GameState, uid: string, includeBonus = true): number {
  const card = def(index, game, uid);
  const base = !card.tutorial && DOUBLE_OFFER_IDS.has(card.id) ? 2 : 1;
  return includeBonus && illanaBayArmed(game, inst(game, uid).owner) ? Math.max(2, base) : base;
}

/** Combined Offer value of a set of units. */
export function offerTotal(index: CardIndex, game: GameState, uids: string[], includePotential = false): number {
  const first = uids[0];
  if (!first) return 0;
  const owner = inst(game, first).owner;
  const bonus = illanaBayArmed(game, owner) || includePotential && canActivateIllanaBay(game, owner);
  return weightedSelectionTotal(uids, Object.fromEntries(uids.map(u => [u, offerValue(index, game, u, false)])), bonus ? 2 : 0);
}

/**
 * Kamil pays double when Offered. Bai Samira counts double in the Grave.
 *
 * These were one set doing both jobs, which is what made the two cards
 * identical — same text, same script, the only difference the body it was
 * printed on. Split, they are the two halves of the same idea rather than two
 * copies of it: one is the cost, the other is the State.
 */
export const DOUBLE_OFFER_IDS = new Set([
  'maguindanao/pulangi-ember-spear-kamil',
]);

export const DOUBLE_GRAVE_IDS = new Set([
  'maguindanao/set-1/last-witness-of-the-old-words-alad',
  'maguindanao/kuta-wato-gate-bulwark-bai-samira',
]);

/** Counts for rules, while the physical card remains one selectable instance. */
export function graveCardValue(index: CardIndex, game: GameState, uid: string): number {
  const card = def(index, game, uid);
  return !card.tutorial && inst(game, uid).zone === 'grave' && DOUBLE_GRAVE_IDS.has(card.id) ? 2 : 1;
}

/**
 * Offer a unit: send it from the field to the Grave as a skill cost.
 * This is the Maguindanao "Offer" mechanic. It wraps damageUnitByAbility
 * and increments the unitsOfferedThisTurn counter.
 * Kamil counts as 2 Offers. A resolved Illana Bay raises the first Unit to 2.
 * Returns true if the unit was successfully offered (destroyed).
 */
export function offerUnit(ctx: EffectContext, uid: string): boolean {
  if (ctx.game.cards[uid]?.zone !== 'ally' || inst(ctx.game, uid).owner !== ctx.me) return false;
  const offeredFrom = publicCardOrigin(ctx.index, ctx.game, uid);
  const player = you(ctx.game, ctx.me);
  const count = offerValue(ctx.index, ctx.game, uid);
  const observers = ctx.paymentObservers ?? { field: [...player.allies.filter((u): u is string => !!u), ...(player.persona ? [player.persona] : [])], grave: [...player.grave] };
  // Recorded before the unit moves, because an Offer is a cost: the timeline
  // has to show "this was paid" above "this is what it bought", and after
  // `damageUnitByAbility` the card is already in the Grave.
  // Preserve the movement reason for card history. Offer value is computed
  // before the first-Offer stamp is consumed; Grave value is independent.
  inst(ctx.game, uid).wasOffered = true;
  inst(ctx.game, uid).wasOfferedDuringMain = ctx.game.phase === 'main' && ctx.game.turnPlayer === ctx.me;
  emit(ctx.game, {
    actor: ctx.me,
    type: 'costPaid',
    sourceUids: [uid],
    targetUids: [],
    visibility: 'public',
    message: `${def(ctx.index, ctx.game, uid).name} was Offered.`,
    result: { outcome: 'offer', detail: 'An Ally was Offered as a cost.' },
  });
  const result = damageUnitByAbility(ctx, uid, true);
  if (result) {
    const event = ctx.game.pendingDamageByAbility.at(-1);
    if (event) { event.offered = true; event.offeredFrom = offeredFrom; }
    if (event) { event.fieldObservers = [...observers.field]; event.graveObservers = [...observers.grave]; }
    const ps = you(ctx.game, ctx.me);
    if (event) event.firstOfferThisTurn = ps.firstOfferTurn !== ctx.game.turnNumber;
    ps.firstOfferTurn = ctx.game.turnNumber;
    ps.unitsOfferedThisTurn += count;
    // Liguasan Marsh: "The first time you Offer a unit during your Main,
    // special call that unit back to the field."
    const activeCodexId = ps.activeCodex ? ctx.game.cards[ps.activeCodex]?.defId : null;
    if (
      activeCodexId === 'maguindanao/liguasan-marsh' &&
      !ps.liguasanMarshUsedThisTurn &&
      ctx.game.phase === 'main' &&
      ctx.game.turnPlayer === ctx.me
    ) {
      ps.liguasanMarshUsedThisTurn = true;
      ctx.game.pendingOfferRecall.push({ uid, owner: ctx.me, codex: ps.activeCodex! });
    }
  }
  return result;
}

/** Is Garahana released for the effect's controller? (Maguindanao's State) */
export function garahanaOn(ctx: EffectContext): boolean {
  return isReleased(ctx.game, ctx.me, 'Garahana');
}

/** Count Maguindanaon unit cards, including their own printed Grave bonuses. */
export function maguindanaoGraveCountRaw(index: CardIndex, game: GameState, p: PlayerId): number {
  const ps = you(game, p);
  return ps.grave.reduce((sum, uid) => {
    const d = def(index, game, uid);
    if (!isUnitCard(d)) return sum;
    if (!(d.subtypes?.includes('Maguindanao') || d.subtypes?.includes('Maguindanaon'))) return sum;
    return sum + (DOUBLE_GRAVE_IDS.has(d.id) ? 2 : 1);
  }, 0);
}

/**
 * Force cards are Units — they are called to an Ally Zone as a level 0 body
 * (game-rules.md §8, "Force cards - triple purpose"). Anything asking "is this
 * a unit?" must accept them.
 */
export function isUnitCard(d: { type: string }): boolean {
  return d.type === 'Unit' || d.type === 'Force';
}

/** Count unit cards in the controller's Grave. */
export function graveUnitCount(ctx: EffectContext, p: PlayerId = ctx.me): number {
  return you(ctx.game, p).grave.reduce((sum, uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return sum + (isUnitCard(d) ? graveCardValue(ctx.index, ctx.game, uid) : 0);
  }, 0);
}

/** Check if a unit has a "Last Oath" ability (Maguindanao). */
export function hasLastOath(ctx: EffectContext, uid: string): boolean {
  // Read the printed text, not `abilities`. Every record in cards.json ships
  // `abilities: []` — the rules live in `text` — so the original form of this
  // returned false for every card in the game, including the four that print
  // a Last Oath. Nothing called it, which is the only reason that never
  // surfaced as a bug in play.
  const d = def(ctx.index, ctx.game, uid) as unknown as { text?: string };
  return /\[Last Oath\]/i.test(d.text ?? '');
}

// --- Agta: Bayanihan, Sipol, Luzon Arch helpers --------------------------

/** Is Bayanihan released for the effect's controller? (Agta's State) */
export function bayanihanOn(ctx: EffectContext): boolean {
  return isReleased(ctx.game, ctx.me, 'Bayanihan');
}

/** Count Luzon Arch allies on the controller's field (including Persona). */
export function luzonArchAllyCount(ctx: EffectContext): number {
  const ps = you(ctx.game, ctx.me);
  let count = 0;
  for (const uid of ps.allies) {
    if (!uid) continue;
    const d = def(ctx.index, ctx.game, uid);
    if (isUnitCard(d) && d.subtypes?.includes('Luzon Arch')) count++;
  }
  if (ps.persona) {
    const d = def(ctx.index, ctx.game, ps.persona);
    if (d.subtypes?.includes('Luzon Arch')) count++;
  }
  return count;
}

/**
 * Deerstep Runner, Kidlat — is he standing in an Ally Zone right now?
 *
 * His whole ability is a modification to how Sipol resolves, so it lives
 * here rather than in his script, the same way Kamil and Bai Samira's "counts
 * as 2" is resolved by `offerUnit` and not by anything on the card. Allies
 * only, because the card is printed `[Ally]`.
 */
const KIDLAT_ID = 'agta/deerstep-runner-kidlat';

function kidlatOnField(ctx: EffectContext): boolean {
  return you(ctx.game, ctx.me).allies.some(
    (uid) => !!uid && !def(ctx.index, ctx.game, uid).tutorial && def(ctx.index, ctx.game, uid).id === KIDLAT_ID,
  );
}

/**
 * How an active Codex changes what Sipol does.
 *
 * Sipol is Agta's engine and several Codex bend it: one rerolls a whiff, one
 * looks at two and exiles the loser, one keeps the card instead of calling
 * it. Those used to be `defId === 'agta/thousand-knots'` comparisons written
 * straight into `sipol`, and every new Codex meant another one.
 *
 * Cards register instead, so the behaviour lives with the card that prints
 * it. Registration is static configuration read during a Sipol, not game
 * state, so it is identical in a replay.
 */
export interface SipolMode {
  /** Look at this many and choose one; the rest are disposed of below. */
  look?: number;
  /** What happens to the cards not chosen. */
  rest?: 'bottom' | 'exile';
  /** Put the chosen card in hand rather than calling it to a Zone. */
  toHand?: boolean;
  /** Only while this holds — most are Main-phase only. */
  when?: (ctx: EffectContext) => boolean;
}

const SIPOL_MODES = new Map<string, SipolMode>();

export function registerSipolMode(defId: string, mode: SipolMode): void {
  SIPOL_MODES.set(defId, mode);
}

/** The mode the active Codex imposes, if its condition holds. */
function sipolMode(ctx: EffectContext): SipolMode | null {
  const ps = you(ctx.game, ctx.me);
  const defId = ps.activeCodex ? ctx.game.cards[ps.activeCodex]?.defId : null;
  if (!defId) return null;
  if (ctx.index[defId]?.tutorial) return null;
  const mode = SIPOL_MODES.get(defId);
  if (!mode) return null;
  return !mode.when || mode.when(ctx) ? mode : null;
}
/**
 * Sipol: Reveal the top card of your deck. If it is a Unit, special call it
 * to an Ally Zone (replacing a unit if the zones are full). Otherwise, place
 * it on the bottom of your deck.
 * Returns true if a unit was special called.
 *
 * Thousand Knots: If the active Codex is Thousand Knots and the revealed card
 * is not a Unit, the player may reroll once (reveal the next card instead).
 * The non-Unit card is placed on the bottom of the deck.
 *
 * Kidlat: while he is in an Ally Zone, a whiffed Sipol goes to hand instead
 * of the bottom of the deck.
 */
export async function sipol(ctx: EffectContext): Promise<boolean> {
  const ps = you(ctx.game, ctx.me);
  if (ps.deck.length === 0) {
    ctx.game.pendingFx.push({ kind: 'sipolResult', player: ctx.me, result: 'empty' });
    return false;
  }
  // Counted whether or not it hits: Siwangan asks how hard you dug last
  // turn, and a Sipol that whiffed was still a Sipol.
  ps.sipolThisTurn = (ps.sipolThisTurn ?? 0) + 1;

  // Check if Thousand Knots is the active codex.
  const activeCodexId = ps.activeCodex ? ctx.game.cards[ps.activeCodex]?.defId : null;
  const hasThousandKnots = activeCodexId === 'agta/thousand-knots' && !ctx.index[activeCodexId]?.tutorial;

  // A Codex may widen the look, redirect the card, or both.
  const mode = sipolMode(ctx);
  let topUid = ps.deck[0]!;
  if (mode?.look && mode.look > 1 && ps.deck.length >= 2) {
    const seen = ps.deck.slice(0, Math.min(mode.look, ps.deck.length));
    fxSearch(ctx);
    await ctx.chooser.revealCards(ctx.me, seen, 'Sipol', `Top ${seen.length} of your deck`);
    const picked = await ctx.chooser.chooseTarget(ctx.me, 'Sipol: choose one', seen)
      ?? seen[0]!;
    // The chosen card becomes the top, so the rest of Sipol runs unchanged.
    for (const uid of seen) ps.deck.splice(ps.deck.indexOf(uid), 1);
    const rest = seen.filter((u) => u !== picked);
    ps.deck.unshift(picked);
    for (const uid of rest) {
      if (mode.rest === 'exile') {
        moveCard(ctx.game, uid, 'exile');
        log(ctx.game, `Sipol: ${def(ctx.index, ctx.game, uid).name} was exiled.`, [uid]);
      } else {
        ps.deck.push(uid);
      }
    }
    topUid = picked;
  }
  let d = def(ctx.index, ctx.game, topUid);
  // Sipol looks into the deck, so the deck should be seen being looked into.
  // Without this the reveal simply appeared, with nothing to say where it had
  // come from — and Sipol is the most frequently seen effect in the game.
  fxSearch(ctx);
  // Sipol "reveals" the top card — show it, don't just name it in the log.
  await ctx.chooser.revealCards(ctx.me, [topUid], 'Sipol', 'Top card of your deck');

  if (isUnitCard(d)) {
    if (mode?.toHand) {
      // Dalunan: the dig becomes a card rather than a body. Deliberately
      // at odds with Bayanihan, which wants the Zones filled — that is the
      // choice the Codex asks you to make.
      moveCard(ctx.game, topUid, 'hand');
      log(ctx.game, `Sipol: ${d.name} was added to your hand.`, [topUid]);
      ctx.game.pendingFx.push({ kind: 'sipolResult', player: ctx.me, result: 'hand' });
      return true;
    }
    ps.deck.shift();
    await specialCall(ctx, topUid);
    log(ctx.game, `Sipol: Special called ${d.name} from the top of the deck.`, [topUid]);
    return true;
  }

  // Past this point the revealed card is not a Unit.
  // Thousand Knots reroll: send it to the bottom and reveal one more.
  const knotsUsable =
    hasThousandKnots && ctx.game.phase === 'main' && ctx.game.turnPlayer === ctx.me;
  if (knotsUsable && ps.deck.length >= 2) {
    const reroll = await ctx.chooser.revealConfirm(
      ctx.me,
      topUid,
      `Thousand Knots: ${d.name} is not a Unit. Send it to the bottom and reveal one more?`,
      { yes: 'Bottom & reroll', no: 'Keep it' },
    );
    if (reroll) {
      // Put current top on bottom, reveal next.
      ps.deck.shift();
      ps.deck.push(topUid);
      log(ctx.game, `Thousand Knots: Sent ${d.name} to bottom (reroll).`, [topUid]);
      topUid = ps.deck[0]!;
      d = def(ctx.index, ctx.game, topUid);
      await ctx.chooser.revealCards(
        ctx.me, [topUid], 'Thousand Knots — reroll', 'Next card of your deck',
      );
      // Check the rerolled card.
      if (isUnitCard(d)) {
        ps.deck.shift();
        await specialCall(ctx, topUid);
        log(ctx.game, `Sipol: Special called ${d.name} from the top of the deck (reroll).`, [topUid]);
        return true;
      }
    }
  }

  // Not a Unit. With Kidlat out, the whiff becomes a card in hand instead of
  // nothing — deliberately not applied to the card Thousand Knots sends to the
  // bottom above, because that one is a printed cost and a cost that refunds
  // itself is not a cost.
  if (kidlatOnField(ctx)) {
    moveCard(ctx.game, topUid, 'hand'); // takes it out of the deck itself
    log(ctx.game, `Kidlat: Sipol revealed ${d.name} (${d.type}). Added to hand.`, [topUid]);
    ctx.game.pendingFx.push({ kind: 'sipolResult', player: ctx.me, result: 'hand' });
    return false;
  }

  // Not a Unit — put it on the bottom.
  ps.deck.shift();
  ps.deck.push(topUid);
  log(ctx.game, `Sipol: Top card was ${d.name} (${d.type}). Placed on bottom.`, [topUid]);
  ctx.game.pendingFx.push({ kind: 'sipolResult', player: ctx.me, result: 'bottom' });
  return false;
}

/**
 * Send the top `n` cards of your own deck to your Grave.
 *
 * The only effect in the set that fills a Grave without something dying, and
 * that is the point of it: Garahana counts Maguindanaon units in the Grave,
 * and until now the only road there was Offering your own board away. Stops
 * at an empty deck rather than throwing — decking out is a real board state,
 * not an error.
 */
export function millTop(ctx: EffectContext, n: number): string[] {
  const ps = you(ctx.game, ctx.me);
  const sent: string[] = [];
  for (let i = 0; i < n && ps.deck.length > 0; i++) {
    const uid = ps.deck[0]!;
    // One flight per card, deck to Grave, drained in order — the Grave count
    // jumping by three with nothing crossing the board said only that a
    // number had changed. Face up: these are public the moment they land, and
    // which units went in is the whole reason to care (Garahana counts them).
    fxEmit(ctx, uid, 'deck', 'grave');
    moveCard(ctx.game, uid, 'grave'); // removes it from the deck itself
    sent.push(uid);
  }
  return sent;
}

/** Check if a unit was special called from the deck (for Agta triggers). */
export function wasSpecialCalledFromDeck(ctx: EffectContext, uid: string): boolean {
  const event = ctx.event;
  if (!event || event.name !== 'placed' || event.unit !== uid) return false;
  const inst_ = ctx.game.cards[uid];
  return inst_?.zone === 'ally';
}

/** Total missing barriers from all players (for Sigrun). */
export function totalMissingBarriers(ctx: EffectContext): number {
  const BARRIERS = 5;
  let missing = 0;
  for (const pid of [0, 1] as PlayerId[]) {
    missing += BARRIERS - you(ctx.game, pid).barriers.length;
  }
  return missing;
}

/** Count open (empty) ally zones across all players (for Continental Heart). */
export function totalOpenAllyZones(ctx: EffectContext): number {
  let open = 0;
  for (const pid of [0, 1] as PlayerId[]) {
    open += you(ctx.game, pid).allies.filter((s) => s === null).length;
  }
  return open;
}

// --- Mecha: Overwhelm, Charge, special call, power transfer --------------

/** Is Overwhelm released for the effect's controller? */
export function overwhelmOn(ctx: EffectContext): boolean {
  return isReleased(ctx.game, ctx.me, 'Overwhelm');
}

/** Charge a unit: un-exhaust it so it can attack again this turn. */
export function chargeUnit(ctx: EffectContext, uid: string): void {
  if (!sourceStillApplies(ctx, uid)) return;
  inst(ctx.game, uid).exhausted = false;
  const battle = ctx.game.activeBattle;
  if (battle && battle.stage !== 'resolved' && (battle.attacker === uid || battle.supporters.includes(uid))) {
    const charged = battle.chargedParticipants ??= [];
    if (!charged.includes(uid)) charged.push(uid);
  }
  ctx.game.pendingFx.push({ kind: 'restore', target: uid });
  log(ctx.game, `${def(ctx.index, ctx.game, uid).name} charged (ready to attack again).`, [uid]);
}

/** Moving an activated source does not erase the effect, but it cannot buff or
 * ready a new field entry of itself. Independent draw/search clauses still run. */
function sourceStillApplies(ctx: EffectContext, target: string): boolean {
  const source = ctx.activation?.source;
  if (target !== ctx.source || !source || (source.zone !== 'ally' && source.zone !== 'persona')) return true;
  const card = ctx.game.cards[target];
  return !!card && card.zone === source.zone && (card.zoneEntry ?? 0) === source.entry;
}

/**
 * Check the top card of the deck. If it's a unit, special call it to an
 * empty ally slot. Otherwise, ask the player: top or bottom?
 * Returns true if a unit was special called.
 */
export async function specialCallFromDeck(ctx: EffectContext): Promise<boolean> {
  const ps = you(ctx.game, ctx.me);
  if (ps.deck.length === 0) return false;
  const topUid = ps.deck[0]!;
  const d = def(ctx.index, ctx.game, topUid);

  if (isUnitCard(d)) {
    ps.deck.shift();
    await specialCall(ctx, topUid);
    return true;
  }

  // Not a unit — ask player: top or bottom?
  const choice = await ctx.chooser.chooseMode(
    ctx.me,
    `Top card is ${d.name} (${d.type}). Put on top or bottom?`,
    ['Top', 'Bottom'],
  );
  ps.deck.shift();
  if (choice === 1) {
    ps.deck.push(topUid);
    log(ctx.game, `Moved ${d.name} to bottom of deck.`, [topUid]);
  } else {
    ps.deck.unshift(topUid);
    log(ctx.game, `Kept ${d.name} on top of deck.`, [topUid]);
  }
  return false;
}

/**
 * Transfer all ally power to the Persona (Skyline Scrapper Tech).
 * Each ally's power becomes 0; the Persona gains the sum.
 */
export function transferPowerToPersona(ctx: EffectContext): void {
  const ps = you(ctx.game, ctx.me);
  if (!ps.persona) return;

  let total = 0;
  for (const uid of ps.allies.filter((x): x is string => !!x)) {
    const power = currentPower(ctx.index, ctx.game, uid);
    total += power;
    if (power > 0) {
      // Set ally power to 0 by adding a negative modifier.
      inst(ctx.game, uid).modifiers.push({
        amount: -power,
        duration: 'endOfTurn',
        source: 'Skyline Scrapper Tech',
      });
    }
  }

  if (total > 0) {
    buffPower(ctx, ps.persona, total);
    log(ctx.game, `Transferred ${total} power from allies to Persona.`, [ps.persona]);
  }
}

/** Count "InterGalactic Robo" units on the field (for Frontier). */
export function countRoboUnits(ctx: EffectContext): number {
  const ps = you(ctx.game, ctx.me);
  return ps.allies.filter((uid): uid is string => {
    if (!uid) return false;
    const d = def(ctx.index, ctx.game, uid);
    return d.subtypes?.includes('Wardroids') === true;
  }).length;
}

// --- Oni: Sanib, Kalas, Heart, Demonic -----------------------------------

/** Is Demonic released for the effect's controller? */
export function demonicOn(ctx: EffectContext): boolean {
  return isReleased(ctx.game, ctx.me, 'Demonic');
}

/** Count cards in the controller's Heart. */
export function heartCount(ctx: EffectContext): number {
  return you(ctx.game, ctx.me).heart.length;
}

/**
 * Sanib the top card of the deck to Heart.
 * Increments the essence counter (feeds Demonic State).
 * Returns the uid of the essenced card, or null if deck is empty.
 */
/** Count every actual entry, including generated Kaluluwa, before reactions resolve. */
function recordEssence(ctx: EffectContext, cards: string[], tokens = 0, from?: Zone) {
  const counts = ctx.game.babaylanEssences ??= {};
  const previous = counts[ctx.me];
  const count = cards.length + tokens;
  if (!count) return;
  const first = previous?.turn !== ctx.game.turnNumber || previous.count === 0;
  counts[ctx.me] = { turn: ctx.game.turnNumber, count: (first ? 0 : previous.count) + count };
  (ctx.game.pendingBabaylan ??= []).push({ owner: ctx.me, name: 'essenced', cards, tokens, from, fromDeck: from === 'deck', firstEssenceThisTurn: first });
}

/** Sinogo reduces numeric Kalas costs for its owner's Beast/Bird Units. */
export function ventCost(ctx: EffectContext, amount: number): number {
  const ps = you(ctx.game, ctx.me);
  const source = ctx.game.cards[ctx.source];
  const sovereign = ps.persona ? ctx.game.cards[ps.persona] : undefined;
  const d = source && def(ctx.index, ctx.game, source.uid);
  const reduce = sovereign?.defId === 'babaylan/set-1/abyssal-revolt-sinogo'
    && !def(ctx.index, ctx.game, sovereign.uid).tutorial && hasAndukha(ctx, 12)
    && d?.type === 'Unit' && (d.subtypes.includes('Beast') || d.subtypes.includes('Bird'));
  return Math.max(0, amount - (reduce ? 2 : 0));
}

export function essenceTopCard(ctx: EffectContext): string | null {
  const ps = you(ctx.game, ctx.me);
  if (ps.deck.length === 0) return null;
  const uid = ps.deck.shift()!;
  const wasUnit = isUnitCard(def(ctx.index, ctx.game, uid));
  moveCard(ctx.game, uid, 'heart', { heartReason: 'essence' });
  recordEssence(ctx, [uid], 0, 'deck');
  log(ctx.game, `Sanib ${def(ctx.index, ctx.game, uid).name} to Heart.`, [uid]);
  hiddenCourt(ctx, wasUnit, 'deck');
  return uid;
}

/**
 * Sanib a specific card (from hand or field) to Heart.
 * Increments the essence counter.
 */
export function essenceCard(ctx: EffectContext, uid: string): void {
  if (!ctx.game.cards[uid] || !['hand', 'deck', 'ally', 'persona', 'grave'].includes(inst(ctx.game, uid).zone)) return;
  const from = inst(ctx.game, uid).zone;
  const wasUnit = isUnitCard(def(ctx.index, ctx.game, uid));
  moveCard(ctx.game, uid, 'heart', { heartReason: 'essence' });
  recordEssence(ctx, [uid], 0, from);
  log(ctx.game, `Sanib ${def(ctx.index, ctx.game, uid).name} to Heart.`, [uid]);
  hiddenCourt(ctx, wasUnit, from);
}

/**
 * Hidden Court, Dingayop Cavern: a Unit essenced off your field or out of
 * your deck during your Main brings a spirit with it.
 *
 * Checked here rather than on a trigger because essencing happens in half a
 * dozen places and a trigger would have to be fired from all of them. The
 * active Codex is read the same way Thousand Knots and Kidlat are read
 * inside Sipol.
 */
function hiddenCourt(ctx: EffectContext, wasUnit: boolean, from: string): void {
  if (!wasUnit) return;
  if (from !== 'ally' && from !== 'deck') return;
  if (ctx.game.turnPlayer !== ctx.me || ctx.game.phase !== 'main') return;
  const ps = you(ctx.game, ctx.me);
  const activeId = ps.activeCodex ? ctx.game.cards[ps.activeCodex]?.defId : null;
  if (activeId !== 'babaylan/set-1/hidden-court-dingayop-cavern') return;
  createKaluluwaTokens(ctx, 1);
}

/**
 * Sanib N cards from the top of the deck to Heart.
 * Returns the uids of the essenced cards.
 */
export function essenceN(ctx: EffectContext, n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const uid = essenceTopCard(ctx);
    if (uid) result.push(uid);
  }
  return result;
}

/** Kalas a card from Heart to Grave. */
export function vent(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  if (!ps.heart.includes(uid)) return;
  moveCard(ctx.game, uid, 'grave', { heartReason: 'vent' });
  log(ctx.game, `Kalas ${def(ctx.index, ctx.game, uid).name} from Heart to Grave.`, [uid]);
}

/** Retrieve a card from Heart to hand. */
export function retrieveFromHeart(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  if (!ps.heart.includes(uid)) return;
  moveCard(ctx.game, uid, 'hand');
  log(ctx.game, `Retrieved ${def(ctx.index, ctx.game, uid).name} from Heart to hand.`, [uid]);
}

/** Let the player choose a card from Heart (returns uid or null). */
export async function chooseFromHeart(
  ctx: EffectContext,
  prompt: string,
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  if (ps.heart.length === 0) return null;
  return ctx.chooser.chooseTarget(ctx.me, prompt, [...ps.heart]);
}

/** Let the player choose a card from hand (returns uid or null). */
export async function chooseFromHand(
  ctx: EffectContext,
  prompt: string,
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  if (ps.hand.length === 0) return null;
  return ctx.chooser.chooseTarget(ctx.me, prompt, [...ps.hand]);
}

/** Special call a card from Heart to an empty ally slot. */
export function specialCallFromHeart(ctx: EffectContext, uid: string): boolean {
  const ps = you(ctx.game, ctx.me);
  if (!ps.heart.includes(uid)) return false;
  const slot = ps.allies.findIndex((s) => s === null);
  if (slot < 0) return false;
  moveCard(ctx.game, uid, 'ally', { slot });
  // Queue for placed trigger (special call).
  ctx.game.pendingSpecialCalls.push({ uid, owner: ctx.me });
  log(ctx.game, `Player ${ctx.me} special called ${def(ctx.index, ctx.game, uid).name} from Heart.`, [uid]);
  return true;
}

export { currentPower };

// --- Knight: Screen, scry -------------------------------------------------

/** Set a unit's screenWhileCharged flag (Ginarld, Lain). */
export function setScreenWhileCharged(ctx: EffectContext, uid: string, value: boolean): void {
  inst(ctx.game, uid).screenWhileCharged = value;
}

/** Grant Screen to a unit (continuous, from Pillar Wall). */
export function grantScreen(ctx: EffectContext, uid: string): void {
  inst(ctx.game, uid).screen = true;
  ctx.game.pendingFx.push({ kind: 'ward', target: uid, mode: 'gain' });
  log(ctx.game, `${def(ctx.index, ctx.game, uid).name} gained Screen.`, [uid]);
}

/** Remove Screen from a unit. */
export function removeScreen(ctx: EffectContext, uid: string): void {
  inst(ctx.game, uid).screen = false;
}

/**
 * Scry the top N cards of the deck. Player chooses one to add to hand,
 * the rest are shuffled back into the deck.
 */
export async function scryTopN(ctx: EffectContext, n: number): Promise<void> {
  const ps = you(ctx.game, ctx.me);
  const top = ps.deck.splice(0, Math.min(n, ps.deck.length));
  if (top.length === 0) return;
  fxSearch(ctx);

  // Let the player choose one to add to hand.
  const pick = await ctx.chooser.chooseTarget(
    ctx.me, `Choose one card to add to hand (top ${top.length})`, top,
  );
  if (pick) {
    ps.hand.push(pick);
    inst(ctx.game, pick).zone = 'hand';
    const rest = top.filter((uid) => uid !== pick);
    // Shuffle the rest back into the deck.
    shuffleIntoDeck(ctx.game, ctx.me, rest);
  } else {
    // No pick — shuffle all back.
    shuffleIntoDeck(ctx.game, ctx.me, top);
  }
}

// --- Babaylan: Sanib, Kaluluwa Tokens & Andukha ------------------------

/**
 * Next free Kaluluwa token id, derived from the state rather than a module
 * counter. A module counter is shared by every game in the process — including
 * the speculative clones the AI plays out — so token ids drifted between runs
 * of the same seed. Reading the state back keeps a game self-contained.
 */
function nextKaluluwaUid(game: GameState): string {
  let max = 0;
  for (const uid of Object.keys(game.cards)) {
    const m = /^k(\d+)$/.exec(uid);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `k${max + 1}`;
}

/**
 * Sanib: put a card into the Heart zone.
 * `essenceFromDeck` mills `amount` cards from the top of the deck into Heart.
 */
export function essenceFromDeck(ctx: EffectContext, amount: number): void {
  if (amount <= 0) return;
  const ps = you(ctx.game, ctx.me);
  const essenced: string[] = [];
  for (let i = 0; i < amount; i++) {
    if (ps.deck.length === 0) break;
    const uid = ps.deck.shift()!;
    essenced.push(uid);
    moveCard(ctx.game, uid, 'heart', { heartReason: 'essence' });
  }
  ps.spiritsGeneratedThisTurn = true;
  log(ctx.game, `Player ${ctx.me} essenced ${amount} card${amount > 1 ? 's' : ''} from deck (Heart: ${ps.heart.length}).`);
  ctx.game.pendingSpiritGeneration.push({ owner: ctx.me });
  recordEssence(ctx, essenced, 0, 'deck');
}

/**
 * Create `amount` Kaluluwa token cards and place them directly into the Heart.
 * Kaluluwa tokens are Token-type cards with the Spirit/Babaylan subtypes.
 */
export function createKaluluwaTokens(ctx: EffectContext, amount: number, bonusCreation = false): void {
  if (amount <= 0) return;
  const ps = you(ctx.game, ctx.me);
  for (let i = 0; i < amount; i++) {
    const uid = nextKaluluwaUid(ctx.game);
    const card: CardInstance = {
      uid,
      defId: 'babaylan/kaluluwa',
      owner: ctx.me,
      zone: 'heart',
      slot: -1,
      exhausted: false,
      faceDown: false,
      modifiers: [],
      stack: 1,
      screen: false,
      usesThisTurn: {},
      relocatedThisTurn: false,
      screenWhileCharged: false,
    };
    ctx.game.cards[uid] = card;
    const before = ps.heart.length;
    ps.heart.push(uid);
    queueHeartMove(ctx.game, ctx.me, { uid, defId: card.defId, from: 'created', to: 'heart', fromSlot: null, toSlot: null, hidden: false }, 'create', before, ps.heart.length);
  }
  ps.spiritsGeneratedThisTurn = true;
  log(ctx.game, `Player ${ctx.me} created ${amount} Kaluluwa token${amount > 1 ? 's' : ''} (Heart: ${ps.heart.length}).`);
  ctx.game.pendingSpiritGeneration.push({ owner: ctx.me });
  recordEssence(ctx, [], amount);
  (ctx.game.pendingBabaylan ??= []).push({ owner: ctx.me, name: 'kaluluwaCreated', tokens: amount, bonusCreation });
}

/** Count Kaluluwa tokens specifically in the Heart (for Storm Altar's 10+ check). */
export function kaluluwaCount(ctx: EffectContext, p: PlayerId = ctx.me): number {
  const ps = you(ctx.game, p);
  return ps.heart.filter((uid) => {
    const c = ctx.game.cards[uid];
    return c && def(ctx.index, ctx.game, uid).id === 'babaylan/kaluluwa';
  }).length;
}

/**
 * Kalas: Remove `amount` cards from the Heart. The player chooses which cards.
 * Kaluluwa tokens cease to exist; other cards go to the Grave.
 * Returns true if the cost was paid, false if not enough cards in Heart.
 */
export async function releaseSpirits(ctx: EffectContext, amount: number): Promise<boolean> {
  amount = ventCost(ctx, amount);
  if (amount === 0) return true;
  const ps = you(ctx.game, ctx.me);
  if (ps.heart.length < amount) return false;
  const candidates = [...ps.heart];
  const vented = await ctx.chooser.chooseCards(
    ctx.me, `Kalas ${amount}: choose ${amount} card${amount === 1 ? '' : 's'} from your Heart`,
    candidates, amount, {
      from: 'heart', confirm: 'Kalas selected cards', decline: 'Cancel Kalas',
      detail: `Select exactly ${amount}, then confirm once. Click a selected card again to remove it. After Kalas, choose which eligible skill resolves next.`,
    },
  );
  // Validate the entire payment before moving anything, including stale or
  // malformed choices from non-human choosers. One event groups all reactions.
  if (vented.length !== amount || new Set(vented).size !== amount
    || vented.some(uid => !candidates.includes(uid) || !ps.heart.includes(uid))) return false;
  return ventSelectedCards(ctx, vented);
}

/** Commit a chosen Kalas batch once, then queue its reactions as one event. */
export function ventSelectedCards(ctx: EffectContext, vented: string[]): boolean {
  const ps = you(ctx.game, ctx.me);
  const amount = vented.length;
  if (!amount || new Set(vented).size !== amount || vented.some(uid => !ps.heart.includes(uid))) return false;
  const tokenCount = vented.filter(uid => def(ctx.index, ctx.game, uid).type === 'Token').length;
  for (const uid of vented) removeVentedCard(ctx, uid);
  log(ctx.game, `Player ${ctx.me} vented ${amount} card${amount > 1 ? 's' : ''} from Heart (Heart: ${ps.heart.length}).`);
  recordVent(ctx, vented, tokenCount);
  return true;
}

function recordVent(ctx: EffectContext, cards: string[], tokens: number) {
  const counts = ctx.game.babaylanVents ??= {};
  const prev = counts[ctx.me];
  counts[ctx.me] = { turn: ctx.game.turnNumber, count: (prev?.turn === ctx.game.turnNumber ? prev.count : 0) + cards.length };
  (ctx.game.pendingBabaylan ??= []).push({ owner: ctx.me, name: 'vented', cards, tokens });
}

/** Current card count in the player's Heart (Baya counts as 2). */
export function spiritCount(ctx: EffectContext, p: PlayerId = ctx.me): number {
  const ps = you(ctx.game, p);
  let count = 0;
  for (const uid of ps.heart) {
    const d = def(ctx.index, ctx.game, uid);
    count += !d.tutorial && d.id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
  }
  return count;
}

/** Check if Andukha threshold is met (Heart contains at least `threshold` cards, Baya counts as 2). */
export function hasAndukha(ctx: EffectContext, threshold: number, p: PlayerId = ctx.me): boolean {
  return spiritCount(ctx, p) >= threshold;
}

/** Get the current Andukha power bonus for the player's units. */
export function andukhaPowerBonus(ctx: EffectContext, p: PlayerId = ctx.me): number {
  const count = spiritCount(ctx, p);
  if (count >= 12) return 3000;
  if (count >= 9) return 2000;
  if (count >= 6) return 1000;
  return 0;
}

/** Search deck for a Babaylan unit with level <= maxLevel, special call it. */
export async function searchAndCallBabaylan(
  ctx: EffectContext,
  maxLevel: number,
  opts: { exhausted?: boolean; charged?: boolean } = {},
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  const candidates = ps.deck.filter((uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return d.type === 'Unit' && d.level <= maxLevel && d.subtypes?.includes('Babaylan');
  });
  if (candidates.length === 0) return null;
  fxSearch(ctx);
  const pick = await ctx.chooser.chooseTarget(
    ctx.me, `Search: Special call which Babaylan Unit (L${maxLevel} or lower)?`, candidates,
  );
  if (!pick) return null;
  ps.deck.splice(ps.deck.indexOf(pick), 1);
  await specialCall(ctx, pick);
  if (opts.exhausted) inst(ctx.game, pick).exhausted = true;
  if (opts.charged) inst(ctx.game, pick).exhausted = false;
  // Shuffle the deck after searching.
  shuffleDeck(ctx.game, ctx.me);
  log(ctx.game, `Searched and special called ${def(ctx.index, ctx.game, pick).name}.`, [pick]);
  return pick;
}

/** Search deck for any unit with level <= maxLevel, special call it. */
export async function searchAndCallUnit(
  ctx: EffectContext,
  maxLevel: number,
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  const candidates = ps.deck.filter((uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return d.type === 'Unit' && d.level <= maxLevel;
  });
  if (candidates.length === 0) return null;
  fxSearch(ctx);
  const pick = await ctx.chooser.chooseTarget(
    ctx.me, `Search: Special call which Unit (L${maxLevel} or lower)?`, candidates,
  );
  if (!pick) return null;
  ps.deck.splice(ps.deck.indexOf(pick), 1);
  await specialCall(ctx, pick);
  shuffleDeck(ctx.game, ctx.me);
  log(ctx.game, `Searched and special called ${def(ctx.index, ctx.game, pick).name}.`, [pick]);
  return pick;
}

/** Sanib a unit from the field (Ally zone) into the Heart. */
export function essenceUnitFromField(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  const c = inst(ctx.game, uid);
  const from = c.zone;
  if (!['ally', 'persona'].includes(from)) return;
  // Remove from ally zone if applicable.
  if (c.zone === 'ally') {
    const slot = ps.allies.indexOf(uid);
    if (slot >= 0) ps.allies[slot] = null;
  }
  moveCard(ctx.game, uid, 'heart', { heartReason: 'essence' });
  ps.spiritsGeneratedThisTurn = true;
  log(ctx.game, `Sanib ${def(ctx.index, ctx.game, uid).name} from field to Heart.`, [uid]);
  ctx.game.pendingSpiritGeneration.push({ owner: ctx.me });
  recordEssence(ctx, [uid], 0, from);
}

/** Tokens leave no Grave card, but their departure still has a visible snapshot. */
function removeVentedCard(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  const c = inst(ctx.game, uid);
  if (def(ctx.index, ctx.game, uid).type !== 'Token') {
    moveCard(ctx.game, uid, 'grave', { heartReason: 'vent' });
    return;
  }
  const before = ps.heart.length;
  ps.heart.splice(ps.heart.indexOf(uid), 1);
  queueHeartMove(ctx.game, ctx.me, {
    uid, defId: c.defId, from: 'heart', to: 'vanished',
    fromSlot: null, toSlot: null, hidden: false,
  }, 'vent', before, ps.heart.length);
  delete ctx.game.cards[uid];
}

/** Kalas a specific card from Heart (used by Maliya). */
export function ventCard(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  if (!ps.heart.includes(uid)) return;
  const d = def(ctx.index, ctx.game, uid);
  removeVentedCard(ctx, uid);
  log(ctx.game, `Kalas ${d.name} from Heart.`, [uid]);
  recordVent(ctx, [uid], d.type === 'Token' ? 1 : 0);
}

/**
 * Shuffle the player's deck.
 *
 * Uses the game's own seeded RNG, not Math.random: `rngSeed` exists so that a
 * game is reproducible from its seed, and every deck search calls this.
 */
export function shuffleDeck(game: GameState, p: PlayerId): void {
  const ps = you(game, p);
  for (let i = ps.deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng(game) * (i + 1));
    [ps.deck[i], ps.deck[j]] = [ps.deck[j]!, ps.deck[i]!];
  }
}

/** Shuffle an array of card uids back into the player's deck. */
function shuffleIntoDeck(game: GameState, p: PlayerId, uids: string[]): void {
  const ps = you(game, p);
  // Simple shuffle: insert at random positions.
  for (const uid of uids) {
    const pos = Math.floor(rng(game) * (ps.deck.length + 1));
    ps.deck.splice(pos, 0, uid);
    inst(game, uid).zone = 'deck';
  }
  log(game, `Shuffled ${uids.length} card(s) back into the deck.`);
}

/** Simple RNG from the game seed. */
function rng(game: GameState): number {
  game.rngSeed = (game.rngSeed * 1103515245 + 12345) & 0x7fffffff;
  return game.rngSeed / 0x7fffffff;
}

/**
 * Search the deck for a card matching a predicate. Player chooses one.
 * The chosen card is removed from the deck and added to hand. Returns uid or null.
 */
export async function searchDeckToHand(
  ctx: EffectContext,
  predicate: (uid: string) => boolean,
  prompt: string,
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  const matches = ps.deck.filter(predicate);
  if (matches.length === 0) return null;
  fxSearch(ctx);
  const pick = await ctx.chooser.chooseTarget(ctx.me, prompt, matches);
  if (pick) {
    ps.deck.splice(ps.deck.indexOf(pick), 1);
    ps.hand.push(pick);
    inst(ctx.game, pick).zone = 'hand';
  }
  return pick;
}

/** Drain a unit's power to 0 and return the amount drained. */
export function drainPower(ctx: EffectContext, uid: string): number {
  const power = currentPower(ctx.index, ctx.game, uid);
  if (power > 0) {
    inst(ctx.game, uid).modifiers.push({
      amount: -power,
      duration: 'endOfTurn',
      source: 'Power drain',
    });
    log(ctx.game, `${def(ctx.index, ctx.game, uid).name} power drained to 0 (-${power}).`, [uid]);
  }
  return power;
}

// --- Elf: Echo, Stampede ---------------------------------------------------

import { isReleased as _isReleasedElf } from './states.js';
import { emit } from './events.js';

/** Is Stampede released for the effect's controller? */
export function stampedeOn(ctx: EffectContext): boolean {
  return _isReleasedElf(ctx.game, ctx.me, 'Stampede');
}

/** Let the player choose one of their allies to echo. Returns uid or null. */
export async function chooseAllyToEcho(
  ctx: EffectContext,
  prompt: string,
  filter?: (uid: string) => boolean,
): Promise<string | null> {
  const ps = you(ctx.game, ctx.me);
  let allies = ps.allies.filter((x): x is string => !!x);
  if (filter) allies = allies.filter(filter);
  if (!allies.length) return null;
  return ctx.chooser.chooseTarget(ctx.me, prompt, allies);
}

/** Special call a unit from hand to an empty ally slot. */
export async function specialCallFromHand(
  ctx: EffectContext,
  uid: string,
): Promise<boolean> {
  const ps = you(ctx.game, ctx.me);
  if (!ps.hand.includes(uid)) return false;
  const d = def(ctx.index, ctx.game, uid);
  if (d.type !== 'Unit') return false;
  const slot = ps.allies.findIndex((s) => s === null);
  if (slot < 0) return false;
  moveCard(ctx.game, uid, 'ally', { slot });
  log(ctx.game, `Special called ${d.name} to ${SLOT_LABELS[slot] ?? `slot ${slot}`}.`);
  return true;
}

