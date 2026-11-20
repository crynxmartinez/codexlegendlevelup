/**
 * Game-state accessors and low-level mutations.
 *
 * Everything here is deliberately dumb: it moves cards and reads stats.
 * Rules sequencing lives in turn.ts / battle.ts.
 */
import {
  ALLY_SLOTS,
  BARRIER_COUNT,
  type CardDef,
  type CardInstance,
  type GameState,
  type PlayerId,
  type PlayerState,
  type Zone,
} from './types.js';
import { emit } from './events.js';
import { queueHeartMove } from './heart-fx.js';

export type CardIndex = Record<string, CardDef>;

// --- lookups ---------------------------------------------------------------

export function inst(game: GameState, uid: string): CardInstance {
  const c = game.cards[uid];
  if (!c) throw new Error(`unknown card instance: ${uid}`);
  return c;
}

export function def(index: CardIndex, game: GameState, uid: string): CardDef {
  const d = index[inst(game, uid).defId];
  if (!d) throw new Error(`unknown card def for instance: ${uid}`);
  return d;
}

export function you(game: GameState, p: PlayerId): PlayerState {
  return game.players[p];
}

export function opponentOf(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0;
}

// --- derived stats ---------------------------------------------------------

/**
 * Current power of a unit on the field.
 * Token stacks multiply base power by the stack count (rulebook: Token Stack).
 * Babaylan Andukha: during the owner's turn, all their units get a Power
 * bonus based on Spirit Token count in the Heart (6→+1000, 9→+2000, 12→+3000).
 */
/**
 * A power bonus that comes from a continuous rule rather than a stored
 * modifier. These are invisible unless the client renders them, so they are
 * computed here once and used both for the real power and for the UI chips.
 */
export interface PassiveBonus {
  amount: number;
  /** Display name of the card responsible. */
  source: string;
  /** Def id of the card responsible, so the UI can show its art. */
  sourceId: string;
}

/** Continuous bonuses applying to `uid` right now. */
export function passiveBonuses(
  index: CardIndex,
  game: GameState,
  uid: string,
): PassiveBonus[] {
  const c = inst(game, uid);
  const d = def(index, game, uid);
  const out: PassiveBonus[] = [];
  const teaching = game.rulesProfile === 'tutorial-v1';
  const activeCodex = you(game, c.owner).activeCodex;
  const trainingCodex = activeCodex ? def(index, game, activeCodex) : undefined;
  if (teaching && c.zone === 'persona' && trainingCodex?.tutorial) {
    const role = trainingCodex.tutorial.role;
    const amount = role === 'codex-barrier' ? brokenBarriers(game, c.owner) * 1000
      : role === 'codex-attack' && game.activeBattle?.attacker === uid ? 5000 : 0;
    if (amount) out.push({ amount, source: trainingCodex.name, sourceId: trainingCodex.id });
  }

  // Agta - The Boar-Spear, Makisig: "[Persona]: Each of your other Luzon Arch
  // Ally Units gets Power +2000." Continuous, so it must apply on attack,
  // support and defence alike — hence here rather than on an attack trigger.
  const persona = you(game, c.owner).persona;
  if (
    c.zone === 'ally' &&
    d.subtypes?.includes('Luzon Arch') &&
    persona &&
    def(index, game, persona).id === 'agta/the-boar-spear-makisig'
  ) {
    out.push({
      amount: 2000,
      source: def(index, game, persona).name,
      sourceId: 'agta/the-boar-spear-makisig',
    });
  }

  // Babaylan Andukha: scales with the Heart, only during the owner's turn.
  // Baya in Heart counts as 2 cards.
  const setOneAndukha = !!you(game, c.owner).activeCodex &&
    def(index, game, you(game, c.owner).activeCodex!).id.startsWith('babaylan/set-1/');
  if (!teaching && (d.subtypes?.includes('Babaylan') || (setOneAndukha && ['ally', 'persona'].includes(c.zone))) && game.turnPlayer === c.owner) {
    let heartCount = 0;
    for (const h of you(game, c.owner).heart) {
      heartCount += def(index, game, h).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
    }
    const amount = heartCount >= 12 ? 3000 : heartCount >= 9 ? 2000 : heartCount >= 6 ? 1000 : 0;
    if (amount > 0) {
      out.push({ amount, source: `Andukha (${heartCount} in Heart)`, sourceId: '' });
    }
  }

  // Agta Fifth-Sky Tyrant, Kalimangalnuk: while Bayanihan holds and it is
  // your turn, every Unit you control is worth 2000 more. Continuous, so
  // it belongs here beside Makisig rather than on an attack trigger — it
  // has to count when supporting and defending too, and lapse the moment
  // a Zone empties.
  if (!teaching && ['ally', 'persona'].includes(c.zone)
    && game.turnPlayer === c.owner
    && you(game, c.owner).releasedState === 'Bayanihan'
    && persona
    && def(index, game, persona).id === 'agta/set-1/fifth-sky-tyrant-kalimangalnuk') {
    out.push({ amount: 2000, source: 'Fifth-Sky Tyrant, Kalimangalnuk',
      sourceId: 'agta/set-1/fifth-sky-tyrant-kalimangalnuk' });
  }

  // Agta Storm Court, Kaliman: a flat bonus that only exists while the
  // field is full. Continuous, so it has to be here rather than on a
  // trigger — it applies on attack, on support and on defence alike, and
  // it has to vanish the instant a Zone empties and Bayanihan lapses.
  if (!teaching && ['ally', 'persona'].includes(c.zone)
    && you(game, c.owner).releasedState === 'Bayanihan'
    && !!you(game, c.owner).activeCodex
    && def(index, game, you(game, c.owner).activeCodex!).id
      === 'agta/set-1/storm-court-kaliman') {
    out.push({ amount: 1000, source: 'Storm Court, Kaliman', sourceId: 'agta/set-1/storm-court-kaliman' });
  }

  const essences = game.babaylanEssences?.[c.owner];
  const count = essences?.turn === game.turnNumber ? essences.count : 0;
  if (!d.tutorial && d.id === 'babaylan/set-1/answering-voice-aday' && c.zone === 'ally' && count > 0) {
    out.push({ amount: count * 1000, source: 'Aday', sourceId: d.id });
  }
  if (!teaching && d.id === 'babaylan/set-1/harvest-warden-mangaw' && c.zone === 'persona' && game.turnPlayer === c.owner && count > 0 && you(game,c.owner).heart.length >= 9) {
    out.push({ amount: count * 1000, source: 'Mangaw', sourceId: d.id });
  }
  return out;
}

export function currentPower(index: CardIndex, game: GameState, uid: string): number {
  if (game.viewPowers?.[uid] !== undefined) return game.viewPowers[uid]!;
  const c = inst(game, uid);
  const d = def(index, game, uid);
  const base = d.power * Math.max(1, c.stack);
  const bonus = c.modifiers.reduce((sum, m) => sum + m.amount, 0);
  const passive = passiveBonuses(index, game, uid).reduce((sum, b) => sum + b.amount, 0);
  const wrath = game.rulesProfile !== 'tutorial-v1' && d.id === 'maguindanao/set-1/gurayen-wrath-mate-maka-ogis' && c.zone === 'persona' &&
    game.turnPlayer === c.owner && you(game, c.owner).releasedState === 'Garahana' &&
    you(game, c.owner).unitsOfferedThisTurn >= 2 ? 5000 : 0;
  return base + bonus + passive + wrath;
}

/**
 * Effective Persona level: printed level plus one per broken Barrier.
 * This gates what the turn player may normally call.
 */
export function personaLevel(index: CardIndex, game: GameState, p: PlayerId): number {
  const ps = you(game, p);
  if (!ps.persona) return 0;
  return def(index, game, ps.persona).level + brokenBarriers(game, p);
}

export function brokenBarriers(game: GameState, p: PlayerId): number {
  const ps = you(game, p);
  const active = ps.barriers.filter((uid) => !game.cards[uid]?.breaking);
  return BARRIER_COUNT - active.length;
}

/**
 * Energy gained at the start of the turn.
 *
 * Persona level is (printed level + broken Barriers), and both your energy and
 * your play allowance scale off it. A lvl 3 Persona therefore starts the game
 * at 2 energy and 3 plays, and each broken Barrier adds one of each.
 */
export function energyForTurn(index: CardIndex, game: GameState, p: PlayerId): number {
  return Math.max(1, personaLevel(index, game, p) - 1);
}

/** Normal calls/plays allowed this turn - also scales with Persona level. */
export function maxPlays(index: CardIndex, game: GameState, p: PlayerId): number {
  let plays = Math.max(1, personaLevel(index, game, p));
  return plays;
}

/**
 * Ally slots are laid out [0] [1] PERSONA [2] [3]; a unit may only support
 * whatever sits next to it. `null` in the returned pair means "the Persona".
 */
export function supportTargets(slot: number): Array<number | null> {
  switch (slot) {
    case 0: return [1];
    case 1: return [0, null];
    case 2: return [3, null];
    case 3: return [2];
    default: throw new Error(`bad ally slot: ${slot}`);
  }
}

// --- mutations -------------------------------------------------------------

export function moveCard(
  game: GameState,
  uid: string,
  to: Zone,
  opts: { slot?: number | null; faceDown?: boolean; heartReason?: 'essence' | 'vent'; handMotion?: boolean } = {},
): void {
  const c = inst(game, uid);
  // Read before the move, because the structured record needs to say where it
  // came from and `removeFromZone` is about to forget.
  const from = c.zone;
  const fromSlot = c.slot;
  const wasFaceDown = c.faceDown;
  const heartBefore = game.players[c.owner].heart.length;
  if (from === 'grave' && to !== 'grave') {
    c.wasOffered = undefined;
    c.wasOfferedDuringMain = undefined;
  }
  // A token that is destroyed ceases to exist rather than going to the Grave;
  // that is enforced in `destroyToken`, not here. Kaluluwa are tokens and do
  // legitimately sit in the Heart, so there is no blanket zone restriction.
  removeFromZone(game, uid);
  // A newly entered copy does not inherit a readying effect from its prior field entry.
  if (game.activeBattle?.chargedParticipants?.includes(uid)) {
    game.activeBattle.chargedParticipants = game.activeBattle.chargedParticipants.filter(u => u !== uid);
  }
  c.zoneEntry = (c.zoneEntry ?? 0) + 1;
  if (to === 'ally' || to === 'persona') c.fieldEntry = (c.fieldEntry ?? 0) + 1;
  c.grantedRepeat = undefined;
  c.sevenHeadsTurn = undefined;
  c.skipCheckTurn = undefined;
  c.firstAttackExtraCheckTurn = undefined;
  c.sulaymanHitDrawTurn = undefined;
  c.zone = to;
  c.slot = opts.slot ?? null;
  c.faceDown = opts.faceDown ?? false;

  const ps = you(game, c.owner);
  switch (to) {
    case 'deck': ps.deck.unshift(uid); break;
    case 'hand': ps.hand.push(uid); break;
    case 'barrier': ps.barriers.push(uid); break;
    case 'grave':
      ps.grave.push(uid);
      break;
    case 'exile': ps.exile.push(uid); break;
    case 'extra': ps.extra.push(uid); break;
    case 'heart': ps.heart.push(uid); break;
    case 'codex': ps.codex.push(uid); break;
    case 'persona': ps.persona = uid; break;
    case 'ally': {
      const slot = opts.slot;
      if (slot == null || slot < 0 || slot >= ALLY_SLOTS) {
        throw new Error(`ally move needs a slot 0..${ALLY_SLOTS - 1}`);
      }
      if (ps.allies[slot]) throw new Error(`ally slot ${slot} is occupied`);
      ps.allies[slot] = uid;
      break;
    }
    case 'check': break;
  }

  if (from !== to && (from === 'heart' || to === 'heart')) {
    queueHeartMove(game, c.owner, {
      uid, defId: c.defId, from, to, fromSlot, toSlot: c.slot,
      hidden: wasFaceDown || c.faceDown || from === 'deck' || from === 'hand' || to === 'hand' || to === 'deck',
    }, opts.heartReason ?? 'move', heartBefore, ps.heart.length);
  }

  // Heart and Personify have dedicated travel. Other effect/cost departures
  // use one shared snapshot, even when another move changes the card again.
  if (from === 'hand' && !['hand', 'heart', 'persona'].includes(to) && opts.handMotion !== false) {
    const card = { uid, defId: c.defId, to, toSlot: c.slot, hidden: c.faceDown || movementIsHidden(from, to) };
    const previous = game.pendingFx.at(-1);
    if (previous?.kind === 'handMove' && previous.owner === c.owner && !previous.cards.some(c => c.uid === uid)) previous.cards.push(card);
    else game.pendingFx.push({ kind: 'handMove', owner: c.owner, cards: [card] });
  }

  // A card entering any zone other than the field loses its field state.
  if (to !== 'ally' && to !== 'persona') {
    c.exhausted = false;
    c.modifiers = [];
    c.screen = false;
    c.stack = 1;
    c.usesThisTurn = {};
    c.relocatedThisTurn = false;
  }

  emit(game, {
    actor: c.owner,
    type: 'cardMoved',
    sourceUids: [uid],
    targetUids: [],
    movements: [{
      uid, from, to, owner: c.owner, ...(movementIsHidden(from, to) ? { hidden: true } : {}),
    }],
    visibility: movementIsHidden(from, to) ? 'owner' : 'public',
    // Written for a person, and without naming the card: a movement between
    // two concealed zones must not identify it, and the interface draws the
    // card from `movements` where it is entitled to.
    message: `A card moved from ${from} to ${to}.`,
  });
}

function removeFromZone(game: GameState, uid: string): void {
  const c = inst(game, uid);
  const ps = you(game, c.owner);
  const drop = (arr: string[]) => {
    const i = arr.indexOf(uid);
    if (i >= 0) arr.splice(i, 1);
  };
  switch (c.zone) {
    case 'deck': drop(ps.deck); break;
    case 'hand': drop(ps.hand); break;
    case 'barrier': drop(ps.barriers); break;
    case 'grave': drop(ps.grave); break;
    case 'exile': drop(ps.exile); break;
    case 'extra': drop(ps.extra); break;
    case 'heart': drop(ps.heart); break;
    case 'codex': drop(ps.codex); break;
    case 'persona': if (ps.persona === uid) ps.persona = null; break;
    case 'ally': {
      const i = ps.allies.indexOf(uid);
      if (i >= 0) ps.allies[i] = null;
      break;
    }
    case 'check': break;
  }
}

/** Draw from the top of the deck. Returns the uid, or null on an empty deck.
 *  Deck-out: if a player cannot draw when required, they lose the game. */
export function draw(game: GameState, p: PlayerId): string | null {
  const ps = you(game, p);
  const uid = ps.deck.shift();
  if (!uid) {
    // Deck-out rule: the player who cannot draw loses.
    if (game.winner === null) {
      game.winner = opponentOf(p);
      game.winReason = 'deckout';
      log(game, `Player ${p} cannot draw — deck empty. Player ${game.winner} wins!`);
    }
    return null;
  }
  const c = inst(game, uid);
  c.zone = 'hand';
  c.slot = null;
  c.faceDown = false;
  ps.hand.push(uid);
  return uid;
}

/**
 * Send a unit to the Grave. Ability triggers are examined by the caller
 * before this runs (rulebook: Send to Grave).
 */
export function sendToGrave(game: GameState, uid: string): void {
  moveCard(game, uid, 'grave');
}

export function log(game: GameState, message: string, cards?: string[]): void {
  game.log.push(message);
  game.logCards.push(cards ?? []);
}

/**
 * Zones a card can sit in without either player being entitled to name it.
 *
 * A movement between two of these is still recorded and still animated — both
 * players can see that *a* card moved — but it is marked hidden so no client
 * draws its face. See core/events.ts.
 */
const CONCEALED: ReadonlySet<Zone> = new Set<Zone>([
  'deck', 'hand', 'heart', 'barrier', 'extra',
]);

/** Whether a move between these two zones reveals the card to both players. */
export function movementIsHidden(from: Zone, to: Zone): boolean {
  return CONCEALED.has(from) && CONCEALED.has(to);
}
