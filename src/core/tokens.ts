/**
 * Token mechanics.
 *
 * Built for the Dryad wisps, which are gone; what survives is the part
 * Babaylan's Kaluluwa still needs — a token, when destroyed, ceases to exist
 * entirely rather than going to the Grave.
 */
import {
  def,
  inst,
  log,
  moveCard,
  you,
  type CardIndex,
} from './state.js';
import { tryReleaseEventState } from './states.js';
import {
  ALLY_SLOTS,
  type CardInstance,
  type GameState,
  type PlayerId,
} from './types.js';

// --- token uid generation --------------------------------------------------

let tokenCounter = 0;

// --- queries ----------------------------------------------------------------

/** Is this card instance a wisp token? */
export function isWispToken(index: CardIndex, game: GameState, uid: string): boolean {
  const d = def(index, game, uid);
  return d.type === 'Token' && d.subtypes.includes('Spirit');
}

// --- creation ---------------------------------------------------------------

/** Wisp token def ids (two faces in the card data). */
const WISP_DEFS = ['dryad/wisp', 'dryad/wisp-2'];

/**
 * Create a wisp token in an empty ally slot for player `p`.
 * If no slot is specified, picks the first empty one.
 * Returns the uid of the created token, or null if no slot was available.
 */
export function createWispToken(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
  opts: { slot?: number; defId?: string } = {},
): string | null {
  const ps = you(game, p);
  const slot = opts.slot ?? ps.allies.findIndex((s) => s === null);
  if (slot < 0 || slot >= ALLY_SLOTS) {
    log(game, `Player ${p} cannot create a wisp — no empty ally slot.`);
    return null;
  }
  if (ps.allies[slot]) return null;

  const defId = opts.defId ?? WISP_DEFS[tokenCounter % WISP_DEFS.length]!;
  const uid = `t${++tokenCounter}`;
  const card: CardInstance = {
    uid,
    defId,
    owner: p,
    zone: 'ally',
    slot,
    exhausted: false,
    faceDown: false,
    modifiers: [],
    stack: 1,
    screen: false,
    usesThisTurn: {},
    relocatedThisTurn: false,
    screenWhileCharged: false,
  };
  game.cards[uid] = card;
  ps.allies[slot] = uid;
  log(game, `Player ${p} created a Wisp token in slot ${slot}.`);

  // Track for the tokenCreated trigger (swept by GameController).
  game.pendingTokenCreated.push(uid);

  // Ethereal may release now that a wisp was created.
  tryReleaseEventState(index, game, p);

  return uid;
}

// --- stacking ---------------------------------------------------------------

/**
 * Stack `amount` onto an existing wisp token.
 * The token stays in its slot; its stack count increases.
 */
export function stackWispToken(
  index: CardIndex,
  game: GameState,
  uid: string,
  amount: number,
): void {
  const c = inst(game, uid);
  c.stack += amount;
  log(
    game,
    `Wisp token in slot ${c.slot} now has stack ${c.stack} ` +
    `(power ${def(index, game, uid).power * c.stack}).`,
  );

  // Stacking can push the wisp count to 3+, releasing Ethereal.
  tryReleaseEventState(index, game, c.owner);
}

// --- destruction ------------------------------------------------------------

/**
 * Destroy a token — it ceases to exist entirely.
 * Not Grave, not Exile: just removed from the game.
 */
export function destroyToken(
  _index: CardIndex,
  game: GameState,
  uid: string,
): void {
  const c = inst(game, uid);
  const ps = you(game, c.owner);
  // Remove from ally slot.
  const slotIdx = ps.allies.indexOf(uid);
  if (slotIdx >= 0) ps.allies[slotIdx] = null;
  // Remove from the cards registry entirely — tokens cease to exist.
  delete game.cards[uid];
  log(game, `A Wisp token was damaged and ceased to exist.`);
}

/**
 * Damage a unit: if it's a token, it ceases to exist; if it's a real unit,
 * it goes to the Grave. Returns true if the unit was destroyed.
 */
export function damageUnitOrToken(
  index: CardIndex,
  game: GameState,
  uid: string,
): boolean {
  const d = def(index, game, uid);
  // Persona cannot be damaged by abilities/costs.
  const ownerPs = you(game, inst(game, uid).owner);
  if (ownerPs.persona === uid) {
    log(game, `${d.name} is a Persona and cannot be damaged.`);
    return false;
  }
  if (d.type === 'Token') {
    destroyToken(index, game, uid);
    return true;
  }
  // Real unit → Grave (same as effects.damageUnit).
  log(game, `${d.name} was damaged and destroyed.`);
  moveCard(game, uid, 'grave');
  return true;
}
