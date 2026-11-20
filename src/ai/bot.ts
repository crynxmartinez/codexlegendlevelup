import { chooseOfferPayment, tacticalResponse } from './tactics.js';
import { weightedSelectionTotal } from '../core/selection-weight.js';
/**
 * The AI. It plays through exactly the same `legalActions()` / `perform()`
 * API the human uses, so anything it can do, a player can do.
 *
 * How it decides: for each legal action it clones the game, actually performs
 * the action on the clone, and scores the board that results. It picks the
 * action that improves its position most.
 *
 * That matters because the previous version scored actions by their *kind* —
 * every skill was worth 40, every Action card 50, and an ability was worth 70
 * if its text matched /draw/i. It could not tell a game-winning effect from a
 * blank one, which quietly punished every deck that wins by sequencing (play
 * A so that B pays off) and flattered every deck that wins on raw stats.
 *
 * Trial resolution is an approximation, not a proof: prompts inside an effect
 * are answered by a bot bound to the clone, and the clone consumes its own
 * copy of the RNG. When a trial throws, we fall back to the old shape-based
 * prior rather than crashing a turn.
 */
import { GameController, type PlayerAction } from '../core/game.js';
import { currentPower, def, inst, opponentOf, you } from '../core/state.js';
import { handCount } from '../core/handcount.js';
import type {
  AbilityOption, BattleWindowInfo, BlockWindowInfo, Chooser, ChooseCardsOptions,
} from '../core/effects.js';
import type { GameState, PlayerId } from '../core/types.js';
import type { CardIndex } from '../core/state.js';
import { AI_NORMAL, decideDefense, evaluateBoard, type AiProfile } from './evaluate.js';
import { offerOrder } from './lines.js';

export class AiChooser implements Chooser {
  constructor(
    private index: CardIndex,
    private gameRef: () => GameState,
    /** How hard this bot is trying; inherited by the bots inside a trial. */
    public readonly profile: AiProfile = AI_NORMAL,
  ) {}

  /**
   * Which Codex to switch into.
   *
   * The engine asks at each printed timing window with eligible Codex in one list.
   * This choice decides which Codex becomes active at that moment, and
   * taking the head of the list meant two of them were never chosen in 40
   * measured games, not because they were weak but because of list order.
   *
   * Rotating by turn number is deliberately not strategy, and is marked as
   * such: ranking Codex properly means valuing what each one does for this
   * hand and this board, which is real work not yet done. What it does
   * guarantee is that no Codex is structurally locked out by its position in
   * a list — which is what was happening, and which made every balance
   * measurement downstream a measurement of list order rather than of cards.
   *
   * Note for anyone tempted to filter this list by `skill.canRun` first: it
   * looks like free information and is a trap. An `auto` skill's guard is
   * written for the moment its trigger fires and opens with `if
   * (!ctx.event?.unit) return false` — there is no event at switch time, so
   * every `auto` Codex fails such a check unconditionally, while
   * `continuous` and `replacement` ones answer `() => true`. Filtering on it
   * does not measure usefulness, it just deletes a whole skill type. Tried
   * it; Shared Ember went from 9 games in 40 to none.
   */
  private pickCodex(_p: PlayerId, candidates: string[]): string | null {
    if (!candidates.length) return null;
    // Triggered automatic switches are free, even after the Play allowance is spent.
    // This remains a coverage heuristic, not a strategic Codex evaluator.
    return candidates[this.gameRef().turnNumber % candidates.length]!;
  }

  /** Prefer pitching the least useful cards: highest level, lowest power. */
  private worstFirst(candidates: string[]): string[] {
    const game = this.gameRef();
    return [...candidates].sort((a, b) => {
      const da = def(this.index, game, a);
      const db = def(this.index, game, b);
      if (da.level !== db.level) return db.level - da.level;
      return da.power - db.power;
    });
  }

  /** The AI takes every optional effect, resolving them in board order. */
  async chooseAbility(
    _p: PlayerId,
    _prompt: string,
    options: AbilityOption[],
    context?: Parameters<Chooser['chooseAbility']>[3],
  ): Promise<number | null> {
    const game = this.gameRef();
    const candidates = options.map((o, i) => ({ o, i })).filter(({ o }) =>
      !(game.cards[o.uid]?.defId.endsWith('/unseen-passage-argao-river') && you(game, _p).heart.length < 5)
      && !(/Rally them/.test(o.text) && !you(game, _p).allies.some(Boolean)));
    if (!candidates.length) return context?.allowDecline === false && options.length ? 0 : null;
    if (context?.kind === 'response' || context?.kind === 'battle') {
      if (this.profile.tactical) {
        const chosen = tacticalResponse(this.index, game, _p, candidates.map(c => c.o));
        return chosen === null ? null : candidates[chosen]!.i;
      }
      const battle = game.activeBattle;
      const sentry = candidates.find(({ o }) => def(this.index, game, o.uid).type === 'Sentry');
      if (sentry && battle?.defender === _p && battle.attackPower >= battle.defensePower && you(game, _p).barriers.length <= 2) return sentry.i;
      const force = candidates.find(({ o }) => def(this.index, game, o.uid).type === 'Force');
      return force?.i ?? null;
    }
    return candidates[0]!.i;
  }

  async chooseCards(
    _p: PlayerId,
    prompt: string,
    candidates: string[],
    count: number,
    opts: ChooseCardsOptions = {},
  ): Promise<string[]> {
    // Blocking is offered as an "up to" choice; handled by shouldBlock below.
    if (prompt.startsWith('Play cards to Defense')) return [];
    if (this.profile.tactical && /^Offer\b/i.test(prompt)) return chooseOfferPayment(this.index, this.gameRef(), candidates, count, opts);
    // Which unit to Offer is a decision, not a leftover. `worstFirst` treats
    // Offering as pure cost; a Last Oath makes it a trigger you were paying
    // for anyway. See offerOrder.
    const ordered = /Offer/i.test(prompt)
      ? offerOrder(this.index, this.gameRef(), _p, candidates)
      : null;
    // `count` may be a total rather than a number of cards — an Offer of 2
    // is paid by one Kamil. Take from the ordered list until the total is met
    // rather than counting heads, or the bot pays twice for the same cost.
    const takeToTotal = (list: string[], target: number): string[] => {
      const out: string[] = [];
      let sum = 0;
      for (const uid of list) {
        if (sum >= target) break;
        out.push(uid);
        sum = weightedSelectionTotal(out, opts.weights, opts.firstSelectedMinimum);
      }
      return out;
    };
    const list = ordered ?? this.worstFirst(candidates);
    if (opts.upTo) {
      if (opts.ventDrawPer) return list.slice(0, Math.floor(count / opts.ventDrawPer) * opts.ventDrawPer);
      // Rally/discard as little as allowed, but exhaust effects want maximum.
      if (prompt.startsWith('Exhaust')) return candidates.slice(0, count);
      // An Offer is a cost being paid in full; anything else "up to" is spent
      // as sparingly as the rules allow.
      if (opts.weights) return takeToTotal(list, count);
      return list.slice(0, Math.min(1, count));
    }
    return takeToTotal(list, count);
  }

  async chooseTarget(
    p: PlayerId,
    prompt: string,
    candidates: string[],
  ): Promise<string | null> {
    const ordered = /Offer/i.test(prompt)
      ? offerOrder(this.index, this.gameRef(), p, candidates)
      : null;
    if (ordered?.length) return ordered[0]!;
    if (!candidates.length) return null;
    // Sentry prompt: decide whether the Sentry is worth revealing based on
    // Barrier count and energy, not just card power.
    if (prompt.startsWith('Reveal a Sentry')) {
      // We need the controller for chooseSentry, but AiChooser doesn't have
      // a reference to it. Replicate the core logic here: only use a Sentry
      // when the Barrier count is low enough to justify it.
      const game = this.gameRef();
      const ps = you(game, p);
      const barriers = ps.barriers.length;
      if (barriers <= 1) return candidates[0]!;
      if (barriers <= 2) return candidates[0]!;
      return null;
    }
    const game = this.gameRef();
    if (prompt === 'Choose your Unit to Rally') {
      const allies = candidates.filter(u => inst(game, u).zone === 'ally');
      return allies.sort((a, b) => currentPower(this.index, game, a) - currentPower(this.index, game, b))[0] ?? null;
    }
    // Codex auto-switch. This branch used to test `startsWith('Switch Codex')`
    // against a prompt that always began with the trigger's own label —
    // "Start of your turn — switch Codex?" — so it never once ran, and the
    // choice fell through to the sort-by-Power fallback below. Codex have no
    // Power, so that amounted to taking whichever the engine listed first.
    if (/switch Codex/i.test(prompt)) return this.pickCodex(p, candidates);

    // A response chosen to change this battle must buff its actual participant.
    const battle = game.activeBattle;
    if (this.profile.tactical && battle && /Power\s*\+|\+5000 this attack/i.test(prompt)) {
      const participant = battle.defender === p ? battle.target ?? you(game, p).persona : battle.attacker;
      if (participant && candidates.includes(participant) && inst(game, participant).owner === p) return participant;
    }

    const byPower = [...candidates].sort(
      (a, b) => currentPower(this.index, game, b) - currentPower(this.index, game, a),
    );

    // Sorting by power and taking the top is right for a buff or for removal,
    // and exactly wrong for a cost: it made the bot Offer its own best unit.
    // Ownership decides which — a prompt whose candidates are all ours AND
    // reads destructive is asking what we are willing to lose.
    const allOurs = candidates.every((uid) => inst(game, uid).owner === p);
    const isCost =
      /offer|discard|sacrific|send|vent|essence|exile|to the grave|bottom of/i.test(prompt);
    if (allOurs && isCost) return byPower[byPower.length - 1]!;

    return byPower[0]!;
  }

  async chooseMode(_p: PlayerId, _prompt: string, _modes: string[]): Promise<number> {
    return 0;
  }

  /**
   * Which Ally Zone.
   *
   * Filling an empty zone is arbitrary, so take the first. Choosing which of
   * your own units to overwrite is not: give up the weakest thing on the
   * board rather than whatever happens to sit leftmost.
   */
  async chooseSlot(p: PlayerId, _prompt: string, candidates: number[]): Promise<number> {
    const game = this.gameRef();
    const ps = you(game, p);
    const occupied = candidates.filter((i) => ps.allies[i]);
    if (occupied.length === 0) return candidates[0] ?? 0;

    let worst = occupied[0]!;
    let worstPower = Infinity;
    for (const i of occupied) {
      const power = currentPower(this.index, game, ps.allies[i]!);
      if (power < worstPower) { worstPower = power; worst = i; }
    }
    return worst;
  }

  async confirm(_p: PlayerId, prompt: string): Promise<boolean> {
    // Scry: keep the card unless it is a spare Persona.
    if (prompt.startsWith('Top card is')) return false;
    return true;
  }

  async personifyPrompt(_p: PlayerId, candidates: string[]): Promise<string | null> {
    // AI: personify if the new persona is higher level than the current one.
    // For now, always personify into the first candidate (highest level hero).
    return candidates[0] ?? null;
  }

  /** What a Sentry costs this bot to reveal. */
  private sentryCost = (uid: string) => {
    const d = def(this.index, this.gameRef(), uid);
    return d.abilities.find((a) => a.scope?.includes('Hand'))?.energyCost ?? 1;
  };

  /**
   * The battle-card window.
   *
   * The bot spends no Forces here: their skills are setup, and the Energy is
   * better kept for the Sentry it might still need. What it does decide is
   * whether this attack is worth a Sentry — the same call it used to make
   * inside the old combined prompt, asked one step earlier.
   */
  async battleCards(
    p: PlayerId,
    info: BattleWindowInfo,
    _forceCandidates: string[],
    sentryCandidates: string[],
  ): Promise<string[]> {
    if (info.role !== 'defender' || !sentryCandidates.length) return [];
    const choice = decideDefense(
      this.index, this.gameRef(), p,
      info.attackPower, info.defensePower,
      sentryCandidates, [], this.sentryCost,
    );
    return choice.kind === 'sentry' ? [choice.uid] : [];
  }

  /**
   * Blockers, asked only when no Sentry was committed. `decideDefense` runs
   * again rather than being remembered from the window: the attacker may have
   * spent a Force in between, and the numbers it weighs have moved.
   */
  async blockPrompt(
    p: PlayerId,
    info: BlockWindowInfo,
    candidates: string[],
  ): Promise<string[]> {
    const choice = decideDefense(
      this.index, this.gameRef(), p,
      info.attackPower, info.defensePower,
      [], candidates, this.sentryCost,
    );
    return choice.kind === 'block' ? choice.uids : [];
  }

  async revealCards(): Promise<void> {
    // The bot does not need to look.
  }

  async revealConfirm(_p: PlayerId, uid: string, prompt: string): Promise<boolean> {
    // This one method answers two unrelated questions, and the prompt was
    // being ignored, so both got the same answer.
    //
    // Thousand Knots asks whether to send a whiffed Sipol to the bottom and
    // reveal one more. The card goes to the bottom either way — that is what
    // Sipol does with a non-Unit — so the reroll is free upside and declining
    // it is never right. Answering it with the top-or-bottom logic below said
    // no to every Force, which is most of what a whiff is, and the Codex
    // never fired once in a hundred games.
    if (/reveal one more/i.test(prompt)) return true;

    // The other question: keep this on top, or bury it? Units and Forces are
    // worth drawing into; Actions and Sentries are not worth a whole draw.
    const game = this.gameRef();
    const d = def(this.index, game, uid);
    if (d.type === 'Action' || d.type === 'Sentry') return true;
    return false;
  }
}

/**
 * Shape-based prior: what an action is worth before we know what it does.
 *
 * Used to break ties between actions the lookahead scores equally, and as the
 * fallback when a trial resolution throws. On its own this is a weak judge —
 * it is the same table that could not tell a game-winning skill from a blank
 * — so it is deliberately scaled down against the real evaluation.
 */
function shapePrior(
  ctrl: GameController,
  action: PlayerAction,
  p: PlayerId,
): number {
  const { game, index } = ctrl;
  const ps = you(game, p);
  const foe = opponentOf(p);

  switch (action.kind) {
    case 'call': {
      const d = def(index, game, action.uid);
      // Prefer bodies in the support slots (1 and 2) that feed the Persona.
      const slotBonus = action.slot === 1 || action.slot === 2 ? 15 : 0;
      // Penalize overwriting our own units — only do it if the new unit is
      // significantly stronger.
      const existing = ps.allies[action.slot];
      let overwritePenalty = 0;
      if (existing) {
        const existingDef = def(index, game, existing);
        const existingPower = existingDef.power;
        const newPower = d.power;
        // Only overwrite if new unit is at least 2000 power stronger.
        if (newPower < existingPower + 2000) {
          overwritePenalty = -50;
        }
      }
      return 40 + d.power / 1000 + slotBonus + overwritePenalty;
    }
    case 'ability': {
      const script = ctrl.scriptFor(action.uid);
      const text = script?.abilities?.[action.abilityIndex]?.text ?? '';
      // Draw effects grow the hand, which is how Grace turns on.
      if (/draw/i.test(text)) return 70;
      return 45;
    }
    case 'playAction':
      return 50;
    case 'playForce':
      // A Force uses no play, but spending it loses a future response or blocker.
      return 25;
    case 'switchCodex':
      return 30;
    case 'useSkill':
      return 40;
    case 'relocate':
      // Repositioning is occasionally useful but rarely the best action.
      return 5;
    case 'attack': {
      const attackPower =
        currentPower(index, game, action.attacker) +
        action.supporters.reduce((s, u) => s + currentPower(index, game, u), 0);
      const targetUid = action.target ?? you(game, foe).persona;
      const defPower = targetUid ? currentPower(index, game, targetUid) : 0;
      // A tie breaks the defence, so an equal swing connects. Reading this
      // as a miss made the bot decline attacks that would land, lethal ones
      // included.
      const connects = attackPower >= defPower;

      if (action.target === null) {
        // Hitting the Persona breaks a Barrier - the win condition.
        return connects ? 200 + action.supporters.length : 5;
      }
      // Trading into an Ally is worth it if we actually kill it.
      return connects ? 90 + defPower / 1000 : 5;
    }
    case 'endPhase':
      return ps.normalPlaysUsed >= 3 ? 60 : 1;
    case 'endTurn':
      return 0;
  }
}


/**
 * What the board is worth to `p` after actually performing `action`.
 *
 * The action is played out on a *clone*, so nothing here touches the real
 * game. Prompts raised during resolution are answered by a bot bound to the
 * clone, which is what makes this meaningfully better than guessing from the
 * card's text — a skill that Offers a unit to draw two really does show up as
 * one fewer body and two more cards.
 */
async function scoreByTrial(
  ctrl: GameController,
  action: PlayerAction,
  p: PlayerId,
  profile: AiProfile,
): Promise<number | null> {
  let clone: GameState;
  try {
    // The log is the single largest thing in a late-game state and no rule
    // ever reads it — only tests do. Cloning it for every speculative branch
    // was most of the cost of thinking.
    const { log: _log, logCards: _logCards, ...rest } = ctrl.game;
    clone = structuredClone(rest) as GameState;
    clone.log = [];
    clone.logCards = [];
  } catch {
    return null;
  }

  try {
    const trial = new GameController(clone, ctrl.index, {
      scripts: ctrl.scripts,
      choosers: [
        new AiChooser(ctrl.index, () => clone, profile),
        new AiChooser(ctrl.index, () => clone, profile),
      ],
    });
    await trial.perform(action, p);
    const mine = evaluateBoard(ctrl.index, clone, p, profile);
    if (profile.replyPly <= 0) return mine;

    // One ply is a bot that cannot see the answer to its own move: it will
    // attack into a board that kills the attacker, because the attack scored
    // well and what came next was never asked about. Only the opponent's most
    // plausible replies are played out — the shape prior is a weak judge, but
    // it is a fine filter, and the worst outcome among a few real replies is
    // a far better estimate than assuming they pass.
    const foe = opponentOf(p);
    const replies = ctrl.legalActions(foe);
    if (!replies.length) return mine;
    const shortlist = [...replies]
      .sort((a, b) => shapePrior(trial, b, foe) - shapePrior(trial, a, foe))
      .slice(0, profile.replyPly);

    let worst = mine;
    for (const reply of shortlist) {
      const after = await scoreReply(trial, reply, p, profile);
      if (after !== null && after < worst) worst = after;
    }
    return worst;
  } catch {
    // A trial that throws tells us nothing; fall back to the prior rather
    // than letting a speculative branch break the real turn.
    return null;
  }
}

/**
 * The board from `p`'s side after the opponent answers, or null if it throws.
 *
 * Deliberately not recursive: this is the second ply and the last. Going
 * deeper multiplies the clone count by the width again, and the evaluator is
 * a better place to spend that budget than the search is.
 */
async function scoreReply(
  from: GameController,
  reply: PlayerAction,
  p: PlayerId,
  profile: AiProfile,
): Promise<number | null> {
  let clone: GameState;
  try {
    const { log: _log, logCards: _logCards, ...rest } = from.game;
    clone = structuredClone(rest) as GameState;
    clone.log = [];
    clone.logCards = [];
  } catch {
    return null;
  }
  try {
    const trial = new GameController(clone, from.index, {
      scripts: from.scripts,
      choosers: [
        new AiChooser(from.index, () => clone, profile),
        new AiChooser(from.index, () => clone, profile),
      ],
    });
    await trial.perform(reply, opponentOf(p));
    return evaluateBoard(from.index, clone, p, profile);
  } catch {
    return null;
  }
}

/** Best action by what it actually achieves, with the prior as a tiebreak. */
async function chooseBestAction(
  ctrl: GameController,
  actions: PlayerAction[],
  p: PlayerId,
  profile: AiProfile = AI_NORMAL,
): Promise<PlayerAction> {
  const base = evaluateBoard(ctrl.index, ctrl.game, p, profile);

  // Trialling every legal action is too slow to be worth it — a wide board
  // offers dozens. Rank by the cheap prior and only play out the plausible
  // ones, always keeping the turn-enders so the bot can never be pruned into
  // having nothing legal left to pick.
  const prior = (action: PlayerAction) => shapePrior(ctrl, action, p)
    - (profile.tactical && action.kind === 'attack' ? action.supporters.length * 30 : 0);
  const ranked = [...actions].sort((a, b) => prior(b) - prior(a));
  const enders = actions.filter((a) => a.kind === 'endTurn' || a.kind === 'endPhase');
  const shortlist = [...new Set([...ranked.slice(0, profile.width), ...enders])];

  let best = shortlist[0]!;
  let bestScore = -Infinity;
  let trials = 0;
  for (const action of shortlist) {
    if (typeof window !== 'undefined' && ++trials % 3 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    const trial = await scoreByTrial(ctrl, action, p, profile);
    const score =
      trial === null
        ? prior(action)
        : trial - base + prior(action) * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}

/**
 * Should the AI reveal a Sentry to nullify Persona damage?
 *
 * The AI uses a Sentry when:
 *  - It has a Sentry in hand it can afford.
 *  - The attack would actually break a Barrier (or win the game).
 *  - It is "worth it": always save the last Barrier, usually save at low
 *    Barrier counts, and sometimes save at high counts if energy is plentiful.
 */
export function chooseSentry(
  ctrl: GameController,
  candidates: string[],
  defender: PlayerId,
): string | null {
  if (!candidates.length) return null;
  const { game } = ctrl;
  const ps = you(game, defender);

  // Pick the cheapest Sentry available.
  const sorted = [...candidates].sort((a, b) => {
    const sa = ctrl.scriptFor(a)?.abilities?.find((ab) => ab.scope.includes('Hand'));
    const sb = ctrl.scriptFor(b)?.abilities?.find((ab) => ab.scope.includes('Hand'));
    return (sa?.energyCost ?? 0) - (sb?.energyCost ?? 0);
  });
  const uid = sorted[0]!;

  // The fewer Barriers left, the more a Sentry is worth.
  // Save on 1 or 2 Barriers left. At 3+, preserve the Sentry for later.
  const barriers = ps.barriers.length;
  if (barriers <= 1) return uid;
  if (barriers <= 2) return uid;
  return null;
}

/** Would this blocker set actually stop the attack? */
export function chooseBlockers(
  ctrl: GameController,
  attacker: string,
  supporters: string[],
  target: string | null,
  defender: PlayerId,
): string[] {
  const { game, index } = ctrl;
  const ps = you(game, defender);
  const attackPower =
    currentPower(index, game, attacker) +
    supporters.reduce((s, u) => s + currentPower(index, game, u), 0);
  const defendingUnit = target ?? ps.persona;
  let defense = defendingUnit ? currentPower(index, game, defendingUnit) : 0;
  // A tie breaks the defence: we are only safe when defence is strictly
  // greater, so an equal board still needs blockers.
  if (attackPower < defense) return [];

  // Only defend the Persona; Allies are not worth pitching cards over.
  if (target !== null) return [];

  const byValue = [...ps.hand].sort(
    (a, b) => (def(index, game, b).defense || 0) - (def(index, game, a).defense || 0),
  );
  const picked: string[] = [];
  for (const uid of byValue) {
    if (defense > attackPower) break;
    const v = def(index, game, uid).defense || 0;
    if (v === 0) continue;
    picked.push(uid);
    defense += v;
  }
  // If we cannot stop it even by emptying the hand, do not waste the cards.
  return defense > attackPower ? picked : [];
}

/**
 * Play one full turn for the AI, one action at a time.
 *
 * After each action the `onAiAction` hook fires, which is how the client
 * redraws and paces itself - otherwise the whole turn would resolve in a single
 * frame and the player would only ever see the aftermath.
 */
export async function playAiTurn(
  ctrl: GameController,
  p: PlayerId,
  profile: AiProfile = AI_NORMAL,
): Promise<void> {
  const guard = 60;
  // Do not spend the bot's Plays cycling through the same Codex repeatedly.
  // This is a bot choice policy, not a restriction on legal player switches.
  const visitedCodex = new Set<string>();
  for (let i = 0; i < guard; i++) {
    if (ctrl.game.winner !== null) return;
    const active = you(ctrl.game, p).activeCodex;
    if (active) visitedCodex.add(active);
    const actions = ctrl.legalActions(p).filter(a => a.kind !== 'switchCodex' || !visitedCodex.has(a.uid));
    if (!actions.length) return;

    const best = await chooseBestAction(ctrl, actions, p, profile);

    await ctrl.perform(best, p);
    await ctrl.hooks.onAiAction?.(best);
    if (best.kind === 'endTurn') return;
  }
  // Safety valve: never loop forever.
  await ctrl.perform({ kind: 'endTurn' }, p);
  await ctrl.hooks.onAiAction?.({ kind: 'endTurn' });
}

export { handCount, inst };
