import { RULES_REVISION } from './rules-version.js';
import { checkDeck } from './deckcheck.js';
/**
 * Game setup, per docs/game-rules.md §6.
 *
 * 1. Both players roll a die; higher goes first.
 * 2. Each player picks their Persona from any lvl 3 Unit in their deck.
 * 3. Each player picks which Codex starts face up.
 * 4. Shuffle the rest into the deck.
 * 5. Top five cards become Barriers, face down.
 * 6. Both draw five.
 * 7. The first player begins without a turn-one draw.
 */
import { newEventLog } from './events.js';
import { makeRng, shuffle } from './rng.js';
import { draw, moveCard, type CardIndex } from './state.js';
import {
  ALLY_SLOTS,
  BARRIER_COUNT,
  DECK_SIZE,
  MAX_CODEX,
  MAX_COPIES,
  MIN_CODEX,
  STARTING_HAND,
  STARTING_PERSONA_LEVEL,
  type CardInstance,
  type GameState,
  type PlayerId,
  type PlayerState,
} from './types.js';

export interface DeckEntry {
  id: string;
  copies: number;
}

export interface DeckList {
  name: string;
  /** Main deck entries summing to exactly DECK_SIZE.  */
  main: DeckEntry[];
  /** 3-5 distinct Codex def ids, held outside the deck. */
  codex: string[];
  /** Default Persona; the player may pick any lvl 3 Unit in the deck instead. */
  persona: string;
}

export class DeckValidationError extends Error {}

/** Expand a decklist's entries into a flat list of def ids. */
export function expandDeck(deck: DeckList): string[] {
  const out: string[] = [];
  for (const e of deck.main) {
    for (let i = 0; i < e.copies; i++) out.push(e.id);
  }
  return out;
}

/** Current browser-match legality; structural fixtures use validateDeck. */
export function validatePlayableDeck(index: CardIndex, deck: DeckList): void {
  const problems = checkDeck(index, deck);
  if (problems.length) throw new DeckValidationError(`${deck.name}: ${problems.map(p => p.message).join('; ')}`);
  validateDeck(index, deck);
}

/** Structural validation also supports historical and isolated engine fixtures. */
export function validateDeck(index: CardIndex, deck: DeckList, rulesProfile?: 'tutorial-v1'): void {
  const fail = (msg: string): never => {
    throw new DeckValidationError(`${deck.name}: ${msg}`);
  };

  const cards = expandDeck(deck);
  if (cards.length !== DECK_SIZE) {
    fail(`deck must be exactly ${DECK_SIZE} cards, got ${cards.length}`);
  }
  if (rulesProfile === 'tutorial-v1') {
    if (deck.codex.length !== 2 || !deck.codex.every(id => index[id]?.tutorial?.role.startsWith('codex-'))
      || new Set(deck.codex.map(id => index[id]?.tutorial?.role)).size !== 2) {
      fail('tutorial needs one attack Codex and one Barrier Codex');
    }
  } else if (deck.codex.length < MIN_CODEX || deck.codex.length > MAX_CODEX) {
    fail(`codex must hold ${MIN_CODEX}-${MAX_CODEX} cards, got ${deck.codex.length}`);
  }
  if (new Set(deck.codex).size !== deck.codex.length) fail('codex cards must be distinct');

  let force = 0;
  let sentry = 0;
  const guilds = new Set<string>();

  for (const e of deck.main) {
    const d = index[e.id];
    if (!d) fail(`unknown card: ${e.id}`);
    if (d!.type === 'Codex') fail(`Codex card in main deck: ${e.id}`);
    if (d!.type === 'Token') fail(`Token card in main deck: ${e.id}`);
    const cap = d!.maxCopies ?? MAX_COPIES;
    if (e.copies > cap) fail(`${e.copies} copies of ${e.id} (max ${cap})`);
    if (d!.type === 'Force') force += e.copies;
    if (d!.type === 'Sentry') sentry += e.copies;
    guilds.add(d!.guild);
  }

  if (force > 12) fail(`max 12 Force cards, got ${force}`);
  if (sentry > 3) fail(`max 3 Sentry cards, got ${sentry}`);
  if (guilds.size > 2) fail(`deck mixes too many guilds: ${[...guilds].sort().join(', ')}`);

  for (const id of deck.codex) {
    const d = index[id];
    if (!d) fail(`unknown codex card: ${id}`);
    else if (d.type !== 'Codex') fail(`${id} is not a Codex card`);
  }

  validatePersona(index, deck, deck.persona);
}

/** A starting Persona must be a lvl 3 Unit present in the main deck. */
export function validatePersona(index: CardIndex, deck: DeckList, id: string): void {
  const fail = (msg: string): never => {
    throw new DeckValidationError(`${deck.name}: ${msg}`);
  };
  const p = index[id];
  if (!p) fail(`unknown persona: ${id}`);
  if (p!.type !== 'Unit') fail('persona must be a Unit');
  if (p!.level !== STARTING_PERSONA_LEVEL) {
    fail(`starting persona must be lvl ${STARTING_PERSONA_LEVEL}, got lvl ${p!.level}`);
  }
  if (!deck.main.some((e) => e.id === id)) fail('persona must be part of the main deck');
}

/**
 * Every legal starting Persona in a decklist - what the player chooses from.
 *
 * One entry per distinct card, however many copies of it the deck runs. A
 * decklist normally holds one entry per card and would give that anyway, but
 * nothing enforces it: a deck code written by an older build, or a store
 * edited by hand, can carry the same id twice, and the picker would then offer
 * the same Persona two or three times over. Deduplicated here so the guarantee
 * belongs to the function rather than to the shape of the data reaching it.
 */
export function personaChoices(index: CardIndex, deck: DeckList): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of deck.main) {
    if (seen.has(entry.id)) continue;
    const d = index[entry.id];
    if (d?.type !== 'Unit' || d.level !== STARTING_PERSONA_LEVEL) continue;
    seen.add(entry.id);
    out.push(entry.id);
  }
  return out;
}

export interface PlayerChoices {
  /** Chosen starting Persona; defaults to the decklist's. */
  persona?: string;
  /** Chosen starting face-up Codex; defaults to the first listed. */
  codex?: string;
}

export interface DiceRoll {
  rolls: [number, number];
  first: PlayerId;
}

/** Both players roll a d6; ties are re-rolled. Higher goes first. */
export function rollForFirst(rng: () => number): DiceRoll {
  let a = 0;
  let b = 0;
  do {
    a = Math.floor(rng() * 6) + 1;
    b = Math.floor(rng() * 6) + 1;
  } while (a === b);
  return { rolls: [a, b], first: a > b ? 0 : 1 };
}

let uidCounter = 0;

/** Reset instance ids - test helper, keeps uids stable across runs. */
export function resetUids(): void {
  uidCounter = 0;
}

function makeInstance(defId: string, owner: PlayerId): CardInstance {
  return {
    uid: `c${++uidCounter}`,
    defId,
    owner,
    zone: 'deck',
    slot: null,
    exhausted: false,
    faceDown: false,
    modifiers: [],
    stack: 1,
    screen: false,
    usesThisTurn: {},
    relocatedThisTurn: false,
    screenWhileCharged: false,
  };
}

function emptyPlayer(id: PlayerId): PlayerState {
  return {
    id,
    deck: [],
    hand: [],
    barriers: [],
    allies: new Array(ALLY_SLOTS).fill(null),
    persona: null,
    codex: [],
    activeCodex: null,
    releasedState: null,
    heart: [],
    grave: [],
    exile: [],
    extra: [],
    normalPlaysUsed: 0,
    codexSwitchedThisTurn: false,
    autoSwitchedThisTurn: false,
    autoSwitchTriggersUsed: [],
    switchedCodexLastTurn: false,
    unitsDamagedByAbilityThisTurn: 0,
    barrierBrokenThisTurn: false,
    skillUsedThisTurn: 0,
    extraAttackChecks: 0,
    moltenSpikesUsed: false,
    moltenSpikesTributeCount: 0,
    lakeBuluanTributeCount: 0,
    lakeBuluanDefenseBonus: false,
    lakeBuluanCheckSwap: false,
    unitsOfferedThisTurn: 0,
    liguasanMarshUsedThisTurn: false,
    forceCheckBias: 0,
    sipolThisTurn: 0,
    sipolLastTurn: 0,
    pulangiRiverFirstCallPending: false,
    personaChargedThisBattle: false,
    pendingPersonaCharge: false,
    skyChurchRalliedThisTurn: 0,
    personifiedThisTurn: false,
    spiritTokens: 0,
    andukha12Granted: false,
    amayaExtraSpiritUsed: false,
    spiritsGeneratedThisTurn: false,
  };
}

export interface CreateGameOptions {
  /** Scoped two-Codex training setup; ordinary deck validation is unchanged. */
  rulesProfile?: 'tutorial-v1';
  seed?: number;
  /** Skip the dice roll and force a starting player. */
  firstPlayer?: PlayerId;
  /** Per-player Persona/Codex selections. */
  choices?: [PlayerChoices, PlayerChoices];
}

export function createGame(
  index: CardIndex,
  decks: [DeckList, DeckList],
  opts: CreateGameOptions = {},
): GameState & { diceRoll: DiceRoll | null } {
  validateDeck(index, decks[0], opts.rulesProfile);
  validateDeck(index, decks[1], opts.rulesProfile);

  const seed = opts.seed ?? 1;
  const rng = makeRng(seed);

  let diceRoll: DiceRoll | null = null;
  let first: PlayerId;
  if (opts.firstPlayer !== undefined) {
    first = opts.firstPlayer;
  } else {
    diceRoll = rollForFirst(rng);
    first = diceRoll.first;
  }

  const game: GameState & { diceRoll: DiceRoll | null } = {
    ...(opts.rulesProfile ? { rulesProfile: opts.rulesProfile } : {}),
    rulesRevision: RULES_REVISION,
    cards: {},
    players: [emptyPlayer(0), emptyPlayer(1)],
    turnPlayer: first,
    phase: 'start',
    turnNumber: 1,
    winner: null,
    winReason: null,
    rngSeed: seed,
    checkCount: 0,
    log: [],
    logCards: [],
    duel: newEventLog(),
    activeBattle: null,
    pendingTokenCreated: [],
    pendingDamageByAbility: [],
    pendingSpiritGeneration: [],
    pendingSpecialCalls: [],
    pendingOfferRecall: [],
    pendingFx: [],
    activeRules: [],
    diceRoll,
  };

  for (const pid of [0, 1] as PlayerId[]) {
    const deck = decks[pid];
    const ps = game.players[pid];
    const choice = opts.choices?.[pid] ?? {};

    const personaId = choice.persona ?? deck.persona;
    validatePersona(index, deck, personaId);

    // Materialise the main deck, pulling one copy aside as the Persona.
    let personaTaken = false;
    const mainUids: string[] = [];
    for (const defId of expandDeck(deck)) {
      const card = makeInstance(defId, pid);
      game.cards[card.uid] = card;
      if (!personaTaken && defId === personaId) {
        personaTaken = true;
        card.zone = 'persona';
        card.faceDown = true;
        ps.persona = card.uid;
      } else {
        mainUids.push(card.uid);
      }
    }

    for (const defId of deck.codex) {
      const card = makeInstance(defId, pid);
      card.zone = 'codex';
      card.faceDown = true;
      game.cards[card.uid] = card;
      ps.codex.push(card.uid);
    }

    ps.deck = shuffle(mainUids, rng);

    for (let i = 0; i < BARRIER_COUNT; i++) {
      const uid = ps.deck.shift();
      if (!uid) break;
      moveCard(game, uid, 'barrier', { faceDown: true });
    }

    for (let i = 0; i < STARTING_HAND; i++) draw(game, pid);
  }

  // Personas are revealed; first player reveals Codex first.
  for (const pid of [0, 1] as PlayerId[]) {
    const ps = game.players[pid];
    if (ps.persona) game.cards[ps.persona]!.faceDown = false;
  }

  const order: PlayerId[] = [first, first === 0 ? 1 : 0];
  for (const pid of order) {
    const ps = game.players[pid];
    const wanted = opts.choices?.[pid]?.codex;
    // Falling back to `codex[0]` made the first card in the decklist the only
    // Codex a game ever opened on. With auto-switch narrowing things further,
    // six of the ten Codex in the two shipped decks were never active once
    // across a hundred games — not because the bot judged them weak, but
    // because it was never offered them. Drawn from the seeded RNG instead,
    // so a seed still reproduces exactly while the pool actually gets used.
    const pick =
      (wanted && ps.codex.find((uid) => game.cards[uid]!.defId === wanted))
      ?? ps.codex[Math.floor(rng() * ps.codex.length)]
      ?? ps.codex[0];
    if (pick) {
      ps.activeCodex = pick;
      game.cards[pick]!.faceDown = false;
    }
  }

  if (diceRoll) {
    game.log.push(
      `Dice: P0 rolled ${diceRoll.rolls[0]}, P1 rolled ${diceRoll.rolls[1]}.`,
    );
    game.logCards.push([]);
  }
  game.log.push(`Player ${first} goes first.`);
  game.logCards.push([]);
  return game;
}
