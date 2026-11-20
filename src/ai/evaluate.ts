/**
 * Board evaluation and the defence decision.
 *
 * Kept apart from `bot.ts` because both are pure functions of a `GameState`:
 * they never perform an action, which is what lets the bot run them against a
 * *cloned* state to see what an action would actually do.
 */
import { currentPower, def, inst, maxPlays, opponentOf, personaLevel, you } from '../core/state.js';
import { activeStateProgress } from '../core/states.js';
import { rawHandCount } from '../core/handcount.js';
import { canAttack, legalTargets } from '../core/battle.js';
import type { CardIndex } from '../core/state.js';
import type { GameState, PlayerId } from '../core/types.js';

/** A score that dominates every positional consideration. */
export const WIN_SCORE = 1e6;

/**
 * How hard the bot is trying.
 *
 * One set of dials on one bot rather than several bots: every field here
 * makes the same machinery look further ahead or judge more of the board, so
 * a weaker setting is a bot that has genuinely thought less, not a strong bot
 * throwing games on purpose.
 */
export interface AiProfile {
  /** Candidate actions actually played out before choosing. */
  width: number;
  /** Reserve useful responses and compare Offer combinations and remaining attacks. */
  tactical?: boolean;
  /**
   * What a released State is worth; progress toward it is scored at the same
   * weight, squared. Measured as a *loss* at every value tried — see AI_HARD.
   * 0 is the tested-best setting, not an oversight.
   */
  stateWeight: number;
  /**
   * Opponent replies searched after each candidate. Measured at exactly no
   * effect for triple the compute — see AI_HARD. 0 is the tested-best value.
   */
  replyPly: number;
}

/** What the bot has always been. Kept exactly so it can be measured against. */
export const AI_NORMAL: AiProfile = { width: 8, stateWeight: 0, replyPly: 0 };

/** Wider candidate search with resource-saving tactical decisions; ordinary deck odds. */
export const AI_HARD: AiProfile = { width: 16, stateWeight: 0, replyPly: 0, tactical: true };

/**
 * What a released State is worth, and what being close to one is worth.
 *
 * A State gates whole abilities and, for Andukha, buffs every unit on the
 * board — so it is worth more than any single body. The progress term is what
 * stops the bot reading Offer and Sanib as pure loss: those plays pay
 * nothing on the turn they happen and the evaluator could not see the debt
 * being repaid. Squared so that the last step toward a threshold is worth
 * more than the first, which is what makes the bot commit rather than drift
 * halfway there.
 */


/**
 * How much a player's Barriers are worth in total, indexed by how many are
 * left. Deliberately convex: going 5 → 4 costs 100, going 1 → 0 costs 420,
 * because the last Barrier is the one standing between you and the loss.
 *
 * Every "is this worth a card?" question in the AI is answered against the
 * *marginal* value here, so the same bot naturally chumps early and defends
 * desperately late without either being special-cased.
 */
const BARRIER_TOTAL = [0, 420, 700, 880, 1000, 1100];

export function barrierValue(n: number): number {
  return BARRIER_TOTAL[Math.max(0, Math.min(5, n))] ?? 0;
}

/** What losing the next Barrier costs, given `n` remaining. */
export function barrierMarginal(n: number): number {
  if (n <= 0) return WIN_SCORE; // there is no next Barrier — this is the game
  return barrierValue(n) - barrierValue(n - 1);
}

/**
 * Positional score of `game` from `p`'s point of view. Higher is better.
 *
 * This is the whole of the bot's judgement: everything else just searches for
 * the action that maximises it.
 */
export function evaluateBoard(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
  profile: AiProfile = AI_NORMAL,
): number {
  const foe = opponentOf(p);
  if (game.winner === p) return WIN_SCORE;
  if (game.winner === foe) return -WIN_SCORE;

  let score = 0;

  // --- the win condition ---------------------------------------------------
  const myB = you(game, p).barriers.length;
  const foeB = you(game, foe).barriers.length;
  score += barrierValue(myB) - barrierValue(foeB);

  // --- board presence ------------------------------------------------------
  for (const side of [p, foe] as PlayerId[]) {
    const sign = side === p ? 1 : -1;
    const ps = you(game, side);

    for (const uid of ps.allies) {
      if (!uid) continue;
      const c = inst(game, uid);
      // Power is the currency of combat; a body on the board is worth
      // something on its own, and an exhausted one is worth less right now.
      score += sign * (currentPower(index, game, uid) / 1000) * 8;
      score += sign * 14;
      if (c.exhausted) score -= sign * 6;
      if (c.screen) score += sign * 10;
    }

    if (ps.persona) {
      score += sign * (currentPower(index, game, ps.persona) / 1000) * 6;
    }

    // Cards in hand are options — for blocking as much as for playing.
    score += sign * rawHandCount(game, side) * 16;
  }

  // --- own tempo -----------------------------------------------------------
  const ps = you(game, p);
  score += personaLevel(index, game, p) * 10;
  // Unspent plays leave room for normal calls, Actions and manual Codex switches.
  score += Math.max(0, maxPlays(index, game, p) - ps.normalPlaysUsed) * 18;

  // --- the deck's own win condition ---------------------------------------
  // Without this the bot plays every archetype as a stats game: a body is
  // worth 14 plus its power and a card in hand is worth 16, so Offering reads
  // as a loss of both and Sanib as a loss of one, while the State they
  // buy is worth nothing at all. Measured consequence, before this existed:
  // six of ten Codex never became active in a hundred games, and the two
  // Codex whose effects key off Offering never fired once.
  if (profile.stateWeight > 0) {
    for (const side of [p, foe] as PlayerId[]) {
      const sign = side === p ? 1 : -1;
      if (you(game, side).releasedState) score += sign * profile.stateWeight;
      const t = Math.min(1, activeStateProgress(index, game, side));
      score += sign * t * t * profile.stateWeight;
    }
  }

  if (profile.tactical && game.turnPlayer === p && game.phase === 'battle') {
    const targets = legalTargets(game, foe).map(uid => uid ?? you(game, foe).persona).filter((uid): uid is string => !!uid);
    const threshold = Math.min(...targets.map(uid => currentPower(index, game, uid)));
    // Preserve independent attacks instead of spending every charged body as support.
    for (const uid of [...ps.allies, ps.persona]) {
      if (uid && canAttack(game, uid) && currentPower(index, game, uid) >= threshold) score += 18;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Defence
// ---------------------------------------------------------------------------

export type DefenseChoice =
  | { kind: 'sentry'; uid: string }
  | { kind: 'block'; uids: string[] }
  | { kind: 'take' };

/**
 * What a card costs to throw away as a blocker. Cards are options, and options
 * get more precious as the hand empties — pitching your last two cards to save
 * a Barrier you have four of is a bad trade even though the block "works".
 */
function cardCost(index: CardIndex, game: GameState, p: PlayerId, uid: string): number {
  const handSize = Math.max(1, rawHandCount(game, p));
  const scarcity = 1 + Math.max(0, 5 - handSize) * 0.22;
  const d = def(index, game, uid);
  // A card with no Defense value is useless as a blocker anyway; a big Unit is
  // worth more on the board than in the Defense strip.
  const body = d.type === 'Unit' ? 40 + d.level * 10 : 30;
  return body * scarcity;
}

/**
 * Block, Sentry, or take the hit.
 *
 * The question is always the same one: is what this costs me less than what
 * losing the Barrier costs me? Both sides are priced in the same units, so the
 * bot chumps freely at 5 Barriers and empties its hand at 0 without either
 * being written as a special case.
 */
export function decideDefense(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
  attackPower: number,
  defensePower: number,
  sentryCandidates: string[],
  blockCandidates: string[],
  _historicalCost: (uid: string) => number,
): DefenseChoice {
  const ps = you(game, p);

  // A tie breaks the defence, so the hit lands unless defence is strictly
  // greater. Getting this wrong in either direction is expensive: too eager
  // and you pitch cards for nothing, too shy and you eat avoidable damage.
  const hitLands = attackPower >= defensePower;
  if (!hitLands) return { kind: 'take' };

  const barriers = ps.barriers.length;
  const atStake = barrierMarginal(barriers);
  const lethal = barriers <= 0;

  // --- option A: Sentry ----------------------------------------------------
  let sentry: { uid: string; cost: number } | null = null;
  for (const uid of sentryCandidates) {
    // The card itself, plus the tempo of the Energy it eats.
    const cost = cardCost(index, game, p, uid);
    if (!sentry || cost < sentry.cost) sentry = { uid, cost };
  }

  // --- option B: block -----------------------------------------------------
  // Take the biggest Defense values first, so the block costs the fewest
  // cards; we need to get strictly above the attack.
  const usable = blockCandidates
    .filter((uid) => (def(index, game, uid).defense || 0) > 0)
    .sort((a, b) => (def(index, game, b).defense || 0) - (def(index, game, a).defense || 0));

  let defense = defensePower;
  const picked: string[] = [];
  for (const uid of usable) {
    if (defense > attackPower) break;
    picked.push(uid);
    defense += def(index, game, uid).defense || 0;
  }
  const blockWorks = defense > attackPower;
  const blockCost = blockWorks
    ? picked.reduce((sum, uid) => sum + cardCost(index, game, p, uid), 0)
    : Infinity;

  // --- decide --------------------------------------------------------------
  // Losing here loses the duel, so pay whatever is asked.
  if (lethal) {
    if (sentry && (!blockWorks || sentry.cost <= blockCost)) return { kind: 'sentry', uid: sentry.uid };
    if (blockWorks) return { kind: 'block', uids: picked };
    return { kind: 'take' };
  }

  const best = Math.min(sentry?.cost ?? Infinity, blockCost);
  if (best >= atStake) return { kind: 'take' };
  if (sentry && sentry.cost <= blockCost) return { kind: 'sentry', uid: sentry.uid };
  return { kind: 'block', uids: picked };
}
