/**
 * Turn structure, per "Start of Turn" and "Main".
 *
 * Start/Reset: refresh plays; draw unless opening first turn; all units charge;
 *              the player may Personify.
 * Main:        normal calls, Actions and manual Codex switches share the play
 *              allowance; automatic Codex switches are free.
 * Battle:      see battle.ts.
 */
import {
  brokenBarriers,
  currentPower,
  maxPlays,
  def,
  draw,
  inst,
  log,
  moveCard,
  personaLevel,
  you,
  type CardIndex,
} from './state.js';
import type { GameState, PlayerId } from './types.js';
import { evaluateStates } from './states.js';
import { isWispToken, destroyToken, stackWispToken } from './tokens.js';

export const hasTurnDraw = (game: GameState): boolean => game.turnNumber > 1;

export function startTurn(index: CardIndex, game: GameState, opts: { skipDraw?: boolean } = {}): void {
  const p = game.turnPlayer;
  const ps = you(game, p);
  game.phase = 'start';
  log(game, `── Turn ${game.turnNumber} · Player ${p} ──`);

  if (!opts.skipDraw && hasTurnDraw(game)) {
    const drawnUid = draw(game, p);
    if (drawnUid) log(game, `Player ${p} drew a card.`, [drawnUid]);
  }

  // Evaluate after the draw step, including the skipped opening draw.
  if (!opts.skipDraw) {
    evaluateStates(index, game, p);
  }


  ps.normalPlaysUsed = 0;
  ps.codexSwitchedThisTurn = false;
  ps.autoSwitchedThisTurn = false;
  ps.autoSwitchTriggersUsed = [];
  ps.unitsDamagedByAbilityThisTurn = 0;
  ps.barrierBrokenThisTurn = false;
  // Oni: essencedThisTurn was already copied to essencedLastTurn in endTurn.
  // Codex: reset skill usage flag.
  ps.skillUsedThisTurn = 0;
  ps.extraAttackChecks = 0;
  ps.moltenSpikesUsed = false;
  ps.moltenSpikesTributeCount = 0;
  ps.lakeBuluanTributeCount = 0;
  ps.lakeBuluanDefenseBonus = false;
  ps.lakeBuluanCheckSwap = false;
  ps.unitsOfferedThisTurn = 0;
  ps.liguasanMarshUsedThisTurn = false;
  ps.pulangiRiverFirstCallPending = false;
  ps.personaChargedThisBattle = false;
  ps.pendingPersonaCharge = false;
  ps.skyChurchRalliedThisTurn = 0;
  ps.personifiedThisTurn = false;
  ps.amayaExtraSpiritUsed = false;
  ps.spiritsGeneratedThisTurn = false;

  // Charge every unit the player controls.
  for (const uid of [...ps.allies.filter((x): x is string => !!x), ps.persona]) {
    if (uid) inst(game, uid).exhausted = false;
  }

  expireModifiers(game, p, 'endOfOpponentTurn');
  log(
    game,
    `Turn ${game.turnNumber}: player ${p} - Persona lv${personaLevel(index, game, p)}, ` +
    `${maxPlays(index, game, p)} plays ` +
    `(${brokenBarriers(game, p)} Barrier(s) broken).`,
  );
  // Move to personify phase — the player may personify before main phase.
  game.phase = 'personify';
}

/** Check if the player has any personification options in hand. */
export function canPersonifyAny(index: CardIndex, game: GameState): boolean {
  const p = game.turnPlayer;
  const ps = you(game, p);
  return ps.hand.some((uid) => canPersonify(index, game, uid));
}

/** Transition from personify phase to main phase. */
export function toMainPhase(game: GameState): void {
  game.phase = 'main';
}

export function endTurn(game: GameState): void {
  const p = game.turnPlayer;


  expireModifiers(game, p, 'endOfTurn');
  expireModifiers(game, p === 0 ? 1 : 0, 'endOfTurn');
  expireModifiers(game, p === 0 ? 1 : 0, 'endOfOpponentTurn');

  // Expire continuous rules: 'endOfTurn' for the current player's rules,
  // 'endOfOpponentTurn' for the opponent's rules.
  game.activeRules = game.activeRules.filter((r) => {
    if (r.expires === 'endOfTurn' && r.ownerForExpiry === p) return false;
    if (r.expires === 'endOfOpponentTurn' && r.ownerForExpiry !== p) return false;
    return true;
  });

  for (const uid of Object.keys(game.cards)) {
    inst(game, uid).usesThisTurn = {};
    inst(game, uid).relocatedThisTurn = false;
    inst(game, uid).supportedBabaylan = false;
  }

  game.turnPlayer = p === 0 ? 1 : 0;
  game.turnNumber++;
  game.phase = 'start';
}

function expireModifiers(
  game: GameState,
  p: PlayerId,
  duration: 'endOfTurn' | 'endOfOpponentTurn',
): void {
  const ps = you(game, p);
  for (const uid of [...ps.allies.filter((x): x is string => !!x), ps.persona]) {
    if (!uid) continue;
    const c = inst(game, uid);
    const expiring = c.modifiers.filter((m) => m.duration === duration);
    if (expiring.length === 0) continue;
    c.modifiers = c.modifiers.filter((m) => m.duration !== duration);
    // Tell the client how much Power just drained away, so it can show it.
    const lost = expiring.reduce((sum, m) => sum + m.amount, 0);
    if (lost !== 0) game.pendingFx.push({ kind: 'powerExpire', target: uid, amount: lost });
  }
}

// --- Personify -------------------------------------------------------------

/**
 * Swap the current Persona for a same-or-higher level Hero from hand.
 * The outgoing Persona goes to the Heart, keeping its stack under the new one.
 */
export function canPersonify(index: CardIndex, game: GameState, uid: string): boolean {
  const p = game.turnPlayer;
  const ps = you(game, p);
  if (game.phase !== 'personify') return false;
  if (!ps.hand.includes(uid)) return false;

  const incoming = def(index, game, uid);
  if (incoming.type !== 'Unit') return false;
  if (incoming.level < 3) return false;
  if (!ps.persona) return true;
  return incoming.level >= def(index, game, ps.persona).level;
}

export function personify(index: CardIndex, game: GameState, uid: string): void {
  if (!canPersonify(index, game, uid)) throw new Error('illegal personify');
  const ps = you(game, game.turnPlayer);
  const outgoing = ps.persona;
  if (outgoing) moveCard(game, outgoing, 'heart');
  moveCard(game, uid, 'persona');
  log(game, `Player ${game.turnPlayer} personified into ${def(index, game, uid).name}.`, [uid, outgoing].filter(Boolean) as string[]);
}

// --- Normal call / play ----------------------------------------------------

export interface CallOptions {
  /** Ally slot 0..3. Required for units. */
  slot?: number;
}

export function canNormalCall(
  index: CardIndex,
  game: GameState,
  uid: string,
  opts: CallOptions = {},
): boolean {
  const p = game.turnPlayer;
  const ps = you(game, p);
  if (game.phase !== 'main') return false;
  if (!ps.hand.includes(uid)) return false;
  if (ps.normalPlaysUsed >= maxPlays(index, game, p)) return false;

  const d = def(index, game, uid);
  if (d.level > personaLevel(index, game, p)) return false;

  if (d.type === 'Unit' || d.type === 'Force') {
    const slot = opts.slot;
    if (slot == null || slot < 0 || slot >= ps.allies.length) return false;
    // Slot may be occupied — overwriting is allowed (existing unit is damaged).
    return true;
  }
  // Actions and Sentries are played, not called; handled by playAction.
  return false;
}

export function normalCall(
  index: CardIndex,
  game: GameState,
  uid: string,
  opts: CallOptions = {},
): void {
  if (!canNormalCall(index, game, uid, opts)) throw new Error('illegal call');
  const ps = you(game, game.turnPlayer);
  const slot = opts.slot!;
  // Handle overwriting: if the slot is occupied, the existing unit is damaged.
  const existing = ps.allies[slot];
  if (existing) {
    const existingIsWisp = isWispToken(index, game, existing);
    const newIsWisp = isWispToken(index, game, uid);

    if (existingIsWisp && newIsWisp) {
      // Wisp on wisp → stack: add the new wisp's stack count to the existing one.
      const newStack = inst(game, uid).stack;
      stackWispToken(index, game, existing, newStack);
      // Remove the new wisp from hand (it was merged into the existing one).
      ps.hand = ps.hand.filter((h) => h !== uid);
      delete game.cards[uid];
      ps.normalPlaysUsed++;
      log(game, `Player ${game.turnPlayer} stacked a wisp token onto slot ${slot}.`, [existing]);
      return;
    }

    // Otherwise, the existing unit is damaged and removed.
    if (existingIsWisp) {
      destroyToken(index, game, existing);
      log(game, `A wisp token was overwritten and ceased to exist.`, [existing]);
    } else {
      moveCard(game, existing, 'grave');
      log(game, `${def(index, game, existing).name} was overwritten and sent to Grave.`, [existing, uid]);
    }
  }
  moveCard(game, uid, 'ally', { slot, handMotion: false });
  ps.normalPlaysUsed++;
  // The caller (GameController.perform) logs this with the friendly slot
  // name and card links — logging here too produced a duplicate line.
}

/** Special calls bypass the per-turn cap and the Persona level gate. */
export function specialCall(
  index: CardIndex,
  game: GameState,
  uid: string,
  p: PlayerId,
  slot: number,
): void {
  const ps = you(game, p);
  // Handle overwriting: if the slot is occupied, the existing unit is damaged.
  const existing = ps.allies[slot];
  if (existing) {
    const existingIsWisp = isWispToken(index, game, existing);
    const newIsWisp = isWispToken(index, game, uid);

    if (existingIsWisp && newIsWisp) {
      // Wisp on wisp → stack.
      const newStack = inst(game, uid).stack;
      stackWispToken(index, game, existing, newStack);
      // Remove the new wisp from its current zone (it's being merged).
      const c = inst(game, uid);
      if (c.zone === 'hand') ps.hand = ps.hand.filter((h) => h !== uid);
      delete game.cards[uid];
      log(game, `Player ${p} stacked a wisp token onto slot ${slot}.`);
      return;
    }

    if (existingIsWisp) {
      destroyToken(index, game, existing);
      log(game, `A wisp token was overwritten and ceased to exist.`);
    } else {
      moveCard(game, existing, 'grave');
      log(game, `${def(index, game, existing).name} was overwritten and sent to Grave.`);
    }
  }
  moveCard(game, uid, 'ally', { slot });
  log(game, `Player ${p} special-called ${def(index, game, uid).name} to slot ${slot}.`);
}

// --- Codex -----------------------------------------------------------------

export function canSwitchCodex(index: CardIndex, game: GameState, uid: string, options: { player?: PlayerId; automatic?: boolean } = {}): boolean {
  const p = options.player ?? game.turnPlayer;
  const ps = you(game, p);
  if (game.winner !== null) return false;
  if (!options.automatic && (game.phase !== 'main' || p !== game.turnPlayer
    || ps.normalPlaysUsed >= maxPlays(index, game, p))) return false;
  if (!ps.codex.includes(uid)) return false;
  return uid !== ps.activeCodex;
}

/**
 * Switch which Codex is face up. The previously released State persists until
 * the new Codex's State is released (rulebook: Main - Using Codex).
 */
export function switchCodex(index: CardIndex, game: GameState, uid: string, options: { player?: PlayerId; automatic?: boolean } = {}): void {
  if (!canSwitchCodex(index, game, uid, options)) throw new Error('illegal codex switch');
  const p = options.player ?? game.turnPlayer;
  const ps = you(game, p);
  // Capture only the public predecessor before it becomes a face-down reserve.
  // Presentation must not recover this identity later by revealing that reserve.
  const previous = ps.activeCodex ? game.cards[ps.activeCodex] : undefined;
  const previousDefId = previous && previous.faceDown === false && previous.owner === p
    && previous.zone === 'codex' && ps.codex.includes(previous.uid)
    && index[previous.defId]?.type === 'Codex' ? previous.defId : undefined;
  if (!options.automatic) ps.normalPlaysUsed++;
  if (ps.activeCodex) inst(game, ps.activeCodex).faceDown = true;
  ps.activeCodex = uid;
  inst(game, uid).faceDown = false;
  ps.codexSwitchedThisTurn = true;
  if (options.automatic) ps.autoSwitchedThisTurn = true;
  game.pendingFx.push({ kind: 'codexFlip', uid, player: p,
    ...(previousDefId ? { previousDefId } : {}) });
  log(game, `Player ${p} ${options.automatic ? 'auto-switched' : 'switched'} Codex to ${def(index, game, uid).name}.`);
}

/** Release the active Codex's State. Only one State may be active at a time. */
export function releaseState(index: CardIndex, game: GameState, p: PlayerId): void {
  const ps = you(game, p);
  if (!ps.activeCodex) throw new Error('no active codex');
  const state = def(index, game, ps.activeCodex).state;
  if (!state) throw new Error('active codex has no state');
  ps.releasedState = state;
  log(game, `Player ${p} released State: ${state}.`);
}

export { currentPower };
