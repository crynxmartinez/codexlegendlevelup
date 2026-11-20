/**
 * Why a card cannot act.
 *
 * The board already glows the cards you can play. What it never said was why
 * the others do not, and "nothing happened when I clicked" is the single most
 * common way a card game loses a new player: they cannot tell a rule from a
 * bug.
 *
 * The hard requirement is that an explanation can never disagree with the
 * rules. So this does not re-derive legality — it asks `legalActions()` first,
 * and only when the answer is no does it walk the same predicates to find
 * which one said so. `enabled` is therefore true exactly when the engine has a
 * legal action for the card, by construction rather than by care, and the test
 * beside this file asserts that over whole games.
 *
 * The reasons are written to be read by someone who has played for ten
 * minutes. "You have used all three plays" rather than "normalPlaysUsed >=
 * maxPlays".
 */
import type { CardIndex } from './state.js';
import { def, inst, maxPlays, personaLevel, you } from './state.js';
import type { GameState, PlayerId } from './types.js';
import type { PlayerAction } from './game.js';

export interface ActionAvailability {
  /** The action that would be taken, when there is one. */
  action?: PlayerAction;
  enabled: boolean;
  /** Why not, in the player's words. Absent when enabled. */
  reason?: string;
  /** What would have to change. Absent when enabled. */
  requirement?: string;
}

/** Does this action concern this card? */
function actionTouches(a: PlayerAction, uid: string): boolean {
  switch (a.kind) {
    case 'call':
    case 'playAction':
    case 'playForce':
    case 'ability':
    case 'switchCodex':
    case 'relocate':
      return a.uid === uid;
    case 'attack':
      return a.attacker === uid || a.supporters.includes(uid);
    default:
      return false;
  }
}

/**
 * The first rule that stops `uid` from doing anything, as a sentence.
 *
 * Order matters: the reasons are checked coarse to fine, so a card in the wrong
 * phase is told about the phase rather than about its Energy cost. Returns null
 * when nothing here explains it, and the caller falls back to a generic line —
 * an honest "not right now" beats a confidently wrong reason.
 */
function firstBlocker(
  index: CardIndex,
  game: GameState,
  uid: string,
  p: PlayerId,
  purpose: 'card' | 'ability' = 'card',
): { reason: string; requirement?: string } | null {
  const ps = you(game, p);
  const c = inst(game, uid);
  const d = def(index, game, uid);

  if (game.winner !== null) {
    return { reason: 'The duel is over.' };
  }
  if (c.zone === 'hand' && d.type === 'Force') {
    return { reason: 'This Force needs its matching response window.', requirement: 'It can respond on either player’s turn when its printed condition occurs.' };
  }
  if (game.turnPlayer !== p) {
    return {
      reason: 'It is not your turn.',
      requirement: 'Wait for your turn to begin.',
    };
  }

  // --- cards on the field ------------------------------------------------
  if (c.zone === 'ally' || c.zone === 'persona') {
    if (c.exhausted) {
      return {
        reason: 'This Unit is exhausted.',
        requirement: 'It charges at the start of your next turn.',
      };
    }
    if (game.phase !== 'battle' && game.phase !== 'main') {
      return { reason: 'This can only act during your Main or Battle Phase.' };
    }
    return null;
  }

  // --- cards in hand -----------------------------------------------------
  if (c.zone === 'hand') {
    if (game.phase !== 'main') {
      return {
        reason: 'This can only be played during your Main Phase.',
        requirement: game.phase === 'battle'
          ? 'You are in the Battle Phase.'
          : undefined,
      };
    }
    const plays = maxPlays(index, game, p);
    if ((d.type === 'Unit' || d.type === 'Action') && ps.normalPlaysUsed >= plays) {
      return {
        reason: `You have used all ${plays} plays this turn.`,
        requirement: 'End your turn to get them back.',
      };
    }
    const level = personaLevel(index, game, p);
    if (d.level > level) {
      return {
        reason: `This is Level ${d.level}. Your Persona is Level ${level}.`,
        requirement: 'Personify into a higher Level Unit first.',
      };
    }
    if ((d.type === 'Unit' || d.type === 'Force') && !ps.allies.includes(null)) {
      // Overwriting is legal, so this is only reached when the engine has
      // already refused — most often a card that needs a genuinely open zone.
      return {
        reason: 'This needs an empty Ally Zone.',
        requirement: 'Every Ally Zone is full.',
      };
    }
    return null;
  }

  // --- the Codex ---------------------------------------------------------
  if (c.zone === 'codex' && purpose === 'card') {
    if (game.phase !== 'main') {
      return { reason: 'Codex switching happens during your Main Phase.' };
    }
    if (uid === ps.activeCodex) {
      return { reason: 'This Codex is already face up.' };
    }
    if (ps.normalPlaysUsed >= maxPlays(index, game, p)) {
      return {
        reason: 'No plays left. Manually switching Codex costs 1 play.',
        requirement: 'Wait for your next turn, or use a free switch when a Codex’s printed condition occurs.',
      };
    }
    return null;
  }

  return null;
}

/**
 * What this card can do right now, and why not if it cannot.
 *
 * `legal` is passed in rather than recomputed so a caller drawing a whole hand
 * pays for `legalActions()` once. It must be the list for the same player and
 * the same instant, which is what `explainAll` below guarantees.
 */
export function explainCard(
  index: CardIndex,
  game: GameState,
  uid: string,
  p: PlayerId,
  legal: PlayerAction[],
): ActionAvailability {
  const action = legal.find((a) => actionTouches(a, uid));
  if (action) return { action, enabled: true };

  const blocker = firstBlocker(index, game, uid, p);
  if (blocker) {
    return {
      enabled: false,
      reason: blocker.reason,
      ...(blocker.requirement ? { requirement: blocker.requirement } : {}),
    };
  }
  return {
    enabled: false,
    reason: 'This card cannot act right now.',
    requirement: 'Its conditions are not met.',
  };
}

/**
 * An explanation for a specific skill on a card.
 *
 * Separate from the card as a whole because a unit can be perfectly able to
 * attack while the skill you just clicked is spent — and being told "this Unit
 * is exhausted" when it plainly is not is worse than being told nothing.
 */
export function explainAbility(
  index: CardIndex,
  game: GameState,
  uid: string,
  abilityIndex: number,
  p: PlayerId,
  legal: PlayerAction[],
  /** Ability metadata the caller already has from the script registry. */
  meta?: { energyCost?: number; maxUses?: number; usedThisTurn?: number },
): ActionAvailability {
  const action = legal.find(
    (a) => a.kind === 'ability' && a.uid === uid && a.abilityIndex === abilityIndex,
  );
  if (action) return { action, enabled: true };

  if (meta?.maxUses != null && (meta.usedThisTurn ?? 0) >= meta.maxUses) {
    return {
      enabled: false,
      reason: 'This skill has already been used this turn.',
    };
  }
  const blocker = firstBlocker(index, game, uid, p, 'ability');
  if (blocker) {
    return {
      enabled: false,
      reason: blocker.reason,
      ...(blocker.requirement ? { requirement: blocker.requirement } : {}),
    };
  }
  return {
    enabled: false,
    reason: 'This skill is not available right now.',
    requirement: 'Its cost, timing or target is not available.',
  };
}

/**
 * Whether a card in hand may be added to the current defense.
 *
 * Defense has its own restrictions — a card can be a legal play and an illegal
 * blocker in the same instant — so the reason has to come from the defense
 * rules rather than from the Main Phase ones.
 */
export function explainDefender(
  index: CardIndex,
  game: GameState,
  uid: string,
  p: PlayerId,
  eligible: readonly string[],
): ActionAvailability {
  if (eligible.includes(uid)) return { enabled: true };
  const c = inst(game, uid);
  if (c.zone !== 'hand') {
    return { enabled: false, reason: 'Only cards in your hand can defend.' };
  }
  if (!game.activeBattle) {
    return { enabled: false, reason: 'There is no attack to defend.' };
  }
  void index;
  void p;
  return {
    enabled: false,
    reason: 'This Unit cannot defend this attack.',
    requirement: 'An effect is restricting which cards may block.',
  };
}
