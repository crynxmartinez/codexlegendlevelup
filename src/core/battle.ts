/**
 * Battle: attack, support, block, and the two check types.
 *
 * Rules (docs/game-rules.md §8):
 *  - Charged units may attack or support; declared one at a time.
 *  - Anything may attack anything - Persona or Ally, on either side - subject
 *    only to Screen.
 *  - Supporters add their Power to an ADJACENT unit. Slots 1 and 2 both
 *    neighbour the Persona, so two units can support it.
 *  - Blockers are played from hand to the Defense zone. Each adds its Defense
 *    to the POWER OF THE UNIT BEING ATTACKED, including the Persona. Any card
 *    may block; a blank Defense contributes 0. Blockers die after the attack.
 *  - An ATTACK CHECK fires only when the PERSONA attacks: the attacker reveals
 *    the top card of their OWN deck.
 *  - A BARRIER CHECK fires when a Persona takes damage: the defender reveals
 *    their left-most Barrier, which is then broken.
 */
import {
  currentPower,
  def,
  inst,
  log,
  moveCard,
  opponentOf,
  sendToGrave,
  supportTargets,
  you,
  type CardIndex,
} from './state.js';
import { BARRIER_COUNT, type GameState, type PlayerId } from './types.js';
import { rollAt } from './rng.js';
import { emit } from './events.js';

export interface AttackDeclaration {
  attacker: string;
  /** Identity of the field entries at declaration; a returning card is a new object. */
  attackerEntry?: number;
  targetUid?: string;
  targetEntry?: number;
  /** Supporting ally uids; each must be adjacent to the attacker and charged. */
  supporters?: string[];
  /** Defending unit uid, or null to attack the Persona. */
  target: string | null;
}

export function attackEntriesStillPresent(game: GameState, attack: AttackDeclaration): boolean {
  const attacker = game.cards[attack.attacker];
  if (!attacker || (attack.attackerEntry !== undefined && (attacker.zoneEntry ?? 0) !== attack.attackerEntry)) return false;
  if (attack.targetUid !== undefined) {
    const target = game.cards[attack.targetUid];
    if (!target || (target.zoneEntry ?? 0) !== attack.targetEntry || !['ally', 'persona'].includes(target.zone)) return false;
  }
  return true;
}

export interface BlockDeclaration {
  /** Card uids played from hand to Defense; each adds its Defense. */
  blockers: string[];
}

/** Why an already declared attack could no longer resolve; presentation metadata only. */
export type AttackCancellationReason =
  | 'attacker-missing'
  | 'attacker-ineligible'
  | 'field-entry-changed'
  | 'target-illegal';

export interface AttackResult {
  attackPower: number;
  defensePower: number;
  hit: boolean;
  /** True when the hit landed on the Persona rather than an Ally. */
  personaHit: boolean;
  barrierBroken: boolean;
  /** Card revealed by the attack check (Persona attacks only). */
  attackCheck: string | null;
  /** Card revealed by the barrier check (Persona damaged only). */
  barrierCheckCard: string | null;
  /** A Sentry nullified the damage — no Barrier was broken. */
  sentryUsed: boolean;
  /** Absent on resolved attacks and older PvP frames. Never infer this from Power totals. */
  cancelReason?: AttackCancellationReason;
}

// --- legality --------------------------------------------------------------

export function canAttack(game: GameState, uid: string): boolean {
  const c = inst(game, uid);
  if (c.owner !== game.turnPlayer) return false;
  if (game.phase !== 'battle') return false;
  if (c.zone !== 'ally' && c.zone !== 'persona') return false;
  return !c.exhausted;
}

/**
 * Only a charged ALLY adjacent to the attacker may support it.
 *
 * The Persona can be supported but can never itself support - it is not in an
 * Ally slot, so it has no adjacency of its own to lend.
 */
export function canSupport(game: GameState, supporter: string, attacker: string): boolean {
  const s = inst(game, supporter);
  const a = inst(game, attacker);
  if (s.uid === a.uid) return false;
  if (s.owner !== a.owner) return false;
  // The Persona never supports: zone must be 'ally'.
  if (s.zone !== 'ally' || s.slot == null) return false;
  if (s.exhausted) return false;
  const targets = supportTargets(s.slot);
  // `null` in the adjacency list means the Persona.
  if (a.zone === 'persona') return targets.includes(null);
  return a.slot != null && targets.includes(a.slot);
}

/**
 * Screen restricts targeting: if any of the defender's units has Screen, only
 * those may be chosen. Otherwise every Ally plus the Persona (null) is legal.
 */
export function legalTargets(game: GameState, defender: PlayerId): Array<string | null> {
  const ps = you(game, defender);
  const units = ps.allies.filter((x): x is string => !!x);
  // Screen: if any unit has Screen (either static or dynamic via charge),
  // the opponent must attack a Screen unit.
  const screened = units.filter((uid) => hasScreen(game, uid));
  if (screened.length > 0) return screened;
  return [...units, null];
}

/** Does this unit currently have Screen? */
export function hasScreen(game: GameState, uid: string): boolean {
  const c = inst(game, uid);
  // Static Screen flag (set by continuous effects like Pillar Wall).
  if (c.screen) return true;
  // Dynamic Screen: Ginarld and Lain have Screen while charged (not exhausted).
  // This is checked via the card's script — we use a flag on the instance.
  return c.screenWhileCharged === true && !c.exhausted;
}

/** Every charged Ally that could support this attacker right now. */
export function availableSupporters(game: GameState, attacker: string): string[] {
  const owner = inst(game, attacker).owner;
  return you(game, owner)
    .allies.filter((x): x is string => !!x)
    .filter((s) => canSupport(game, s, attacker));
}

/** Defense contributed by a blocking card; a blank Defense counts as 0. */
export function blockValue(index: CardIndex, game: GameState, uid: string): number {
  let val = def(index, game, uid).defense || 0;
  // Lake Buluan: the next blocker gets Defense +5000.
  const owner = game.cards[uid]?.owner;
  if (owner !== undefined && you(game, owner).lakeBuluanDefenseBonus) {
    val += 5000;
    you(game, owner).lakeBuluanDefenseBonus = false;
    log(game, `Lake Buluan: ${def(index, game, uid).name} gets Defense +5000!`, [uid]);
  }
  return val;
}

// --- resolution ------------------------------------------------------------

export function resolveAttack(
  index: CardIndex,
  game: GameState,
  attack: AttackDeclaration,
  block: BlockDeclaration = { blockers: [] },
  sentryUsed = false,
  attackCheckUid: string | null = null,
): AttackResult {
  const attackerCard = game.cards[attack.attacker];
  if (!attackerCard) {
    clearModifiers(game, Object.keys(game.cards), 'endOfAttack');
    // The attacker ceased to exist (e.g. a token destroyed by a trigger).
    return {
      hit: false, personaHit: false, barrierBroken: false,
      attackCheck: null, barrierCheckCard: null,
      attackPower: 0, defensePower: 0, sentryUsed,
      cancelReason: 'attacker-missing',
    };
  }
  const attacker = attackerCard;
  const attackerPlayer = attacker.owner;
  const defenderPlayer = opponentOf(attackerPlayer);

  // The attacker may have been exhausted by a trigger during the attack
  // (e.g. an opponent's Force mode). If so, the attack fizzles.
  const cancelReason: AttackCancellationReason | undefined = !canAttack(game, attack.attacker)
    ? 'attacker-ineligible'
    : !attackEntriesStillPresent(game, attack) ? 'field-entry-changed' : undefined;
  if (cancelReason) {
    clearModifiers(game, Object.keys(game.cards), 'endOfAttack');
    return {
      hit: false, personaHit: false, barrierBroken: false,
      attackCheck: null, barrierCheckCard: null,
      attackPower: 0, defensePower: 0, sentryUsed,
      cancelReason,
    };
  }

  const supporters = (attack.supporters ?? []).filter((s) =>
    !!game.cards[s] && canSupport(game, s, attack.attacker),
  );

  const legal = legalTargets(game, defenderPlayer);
  if (!legal.includes(attack.target)) {
    clearModifiers(game, Object.keys(game.cards), 'endOfAttack');
    // The target may have been removed by a trigger during the attack.
    return {
      hit: false, personaHit: false, barrierBroken: false,
      attackCheck: null, barrierCheckCard: null,
      attackPower: 0, defensePower: 0, sentryUsed,
      cancelReason: 'target-illegal',
    };
  }

  // Attacker and every supporter exhaust on declaration.
  attacker.exhausted = !game.activeBattle?.chargedParticipants?.includes(attack.attacker);
  let attackPower = currentPower(index, game, attack.attacker);
  for (const s of supporters) {
    const sc = game.cards[s];
    if (sc) {
      sc.exhausted = !game.activeBattle?.chargedParticipants?.includes(s);
      attackPower += currentPower(index, game, s);
    }
  }

  // Log the attack declaration.
  const attackerName = def(index, game, attack.attacker).name;
  const targetName = attack.target
    ? def(index, game, attack.target).name
    : 'Persona';
  log(game, `${attackerName} attacks ${targetName} (P${attackerPlayer} → P${defenderPlayer}).`, [attack.attacker, attack.target ?? you(game, defenderPlayer).persona!].filter(Boolean));
  if (supporters.length > 0) {
    log(game, `Supporters: ${supporters.map((s) => def(index, game, s).name).join(', ')} (+${supporters.reduce((sum, s) => sum + currentPower(index, game, s), 0)} power).`, supporters);
  }
  const blockerValues = new Map(block.blockers.map(uid => [uid, blockValue(index, game, uid)]));
  if (block.blockers.length > 0) {
    log(game, `Blockers: ${block.blockers.map((b) => def(index, game, b).name).join(', ')} (+${block.blockers.reduce((sum, b) => sum + (blockerValues.get(b) ?? 0), 0)} defense).`, block.blockers);
  }

  // The attack check was already performed by the caller (after blockers),
  // and any Force revealed has already resolved and buffed. We just carry
  // the uid forward for the result.
  const attackCheck = attackCheckUid;

  // Defense: the attacked unit's own Power, plus every blocker's Defense.
  const defendingUnit = attack.target ?? you(game, defenderPlayer).persona;
  let defensePower = defendingUnit ? currentPower(index, game, defendingUnit) : 0;
  for (const b of block.blockers) {
    if (!you(game, defenderPlayer).hand.includes(b)) {
      throw new Error(`blocker not in hand: ${b}`);
    }
    defensePower += blockerValues.get(b) ?? 0;
  }

  // A tie breaks the defence: the attack connects when powers are equal.
  const hit = attackPower >= defensePower;

  // Blockers are destroyed at the end of the attack, hit or not.
  for (const b of block.blockers) {
    game.pendingFx.push({ kind: 'destroy', uid: b, owner: inst(game, b).owner });
    // The combat presenter moves the visible defense card to Grave. Do not
    // also replay its logical hand departure after that flight has landed.
    moveCard(game, b, 'grave', { handMotion: false });
  }

  let barrierBroken = false;
  let barrierCheckCard: string | null = null;
  const targetIsPersona = attack.target === null;

  if (hit && !sentryUsed) {
    if (targetIsPersona) {
      const dmg = damagePersona(index, game, defenderPlayer);
      barrierBroken = dmg.broken;
      barrierCheckCard = dmg.revealed;
    } else if (attack.target) {
      game.pendingFx.push({
        kind: 'destroy',
        uid: attack.target,
        owner: inst(game, attack.target).owner,
      });
      sendToGrave(game, attack.target);
      log(game, `${def(index, game, attack.target).name} was destroyed by attack.`, [attack.target, attack.attacker]);
    }
  }

  // Battle-duration defense (Bekong) expires after this battle as well.
  clearModifiers(game, Object.keys(game.cards), 'endOfAttack');

  return {
    attackPower,
    defensePower,
    hit: hit && !sentryUsed,
    personaHit: hit && !sentryUsed && targetIsPersona,
    barrierBroken,
    attackCheck,
    barrierCheckCard,
    sentryUsed,
  };
}

/**
 * Attack check: the attacking player reveals the top card of their own deck
 * into the Check zone. If it is a Force, its owner plays it free with BOTH
 * modes — that resolution is driven by GameController.resolveCheck, which
 * also moves the card to hand after the player has seen it.
 */
export function doAttackCheck(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
): string | null {
  const ps = you(game, p);

  // Difficulty handicap. A Force revealed here plays free with both of its
  // modes, so a player set above zero is being handed cards, not outplaying
  // anyone — it is a bias rather than a guarantee so that a check is still
  // worth watching, and it is logged so a game can be read back honestly.
  const n = game.checkCount++;
  if (ps.forceCheckBias > 0 && ps.deck.length > 1) {
    if (rollAt(game.rngSeed, n) < ps.forceCheckBias) {
      const i = ps.deck.findIndex((u) => index[inst(game, u).defId]?.type === 'Force');
      if (i > 0) {
        const [forced] = ps.deck.splice(i, 1);
        ps.deck.unshift(forced!);
      }
    }
  }

  const uid = ps.deck.shift();
  if (!uid) {
    log(game, `Player ${p} cannot attack check - deck is empty.`);
    return null;
  }
  const d = index[inst(game, uid).defId];
  log(game, `Attack check: ${d?.name ?? uid}${d?.type === 'Force' ? ' (Force!)' : ''}`, [uid]);
  moveCard(game, uid, 'check');
  return uid;
}

/**
 * Damage to a Persona is dealt to a Barrier: reveal the left-most Barrier into
 * the Check zone (the barrier check), and the Barrier is gone — that is what
 * "breaking" means. GameController.resolveCheck moves the card to hand after
 * the player has seen it (and resolved it if it is a Force). A hit with no
 * Barriers left wins the game.
 */
export function damagePersona(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
): { broken: boolean; revealed: string | null } {
  const ps = you(game, p);
  const uid = ps.barriers[0];

  if (!uid) {
    game.winner = opponentOf(p);
    game.winReason = 'barrier';
    log(game, `Player ${p} has no Barriers left - player ${game.winner} wins.`);
    return { broken: false, revealed: null };
  }

  const d = def(index, game, uid);
  log(game, `Barrier check: ${d.name}${d.type === 'Force' ? ' (Force!)' : ''}`, [uid]);
  // Mark as breaking but keep in barriers array for the flip animation.
  // resolveCheck will moveCard(uid, 'check') after the animation completes.
  inst(game, uid).breaking = true;
  log(game, `Player ${p} has ${ps.barriers.filter((b) => !inst(game, b).breaking).length}/${BARRIER_COUNT} Barriers left.`, [uid]);
  {
    const left = ps.barriers.filter((b) => !inst(game, b).breaking).length;
    emit(game, {
      actor: p === 0 ? 1 : 0,
      type: 'barrierBroken',
      sourceUids: [],
      targetUids: [uid],
      changes: [{ what: 'barriers', owner: p, from: left + 1, to: left }],
      result: { outcome: 'broken', detail: `${left} of ${BARRIER_COUNT} Barriers left.` },
      visibility: 'public',
      message: `A Barrier broke. ${left} of ${BARRIER_COUNT} left.`,
    });
  }
  return { broken: true, revealed: uid };
}

function clearModifiers(
  game: GameState,
  uids: string[],
  duration: 'endOfAttack',
): void {
  for (const uid of uids) {
    const c = inst(game, uid);
    c.modifiers = c.modifiers.filter((m) => m.duration !== duration);
  }
}

/** Called when the Battle phase ends; clears Aria-style buffs. */
export function endBattlePhase(game: GameState): void {
  for (const uid of Object.keys(game.cards)) {
    const c = game.cards[uid]!;
    c.modifiers = c.modifiers.filter((m) => m.duration !== 'endOfBattlePhase');
  }
}
