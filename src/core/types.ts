import type { DuelEventLog } from './events.js';

/**
 * Codex Legends — core domain types.
 *
 * Rules source: "Codex Legends version 6.7" rulebook.
 * This module is pure data + type definitions; it must never import UI code.
 */

// ---------------------------------------------------------------------------
// Card definitions (static — one per printed card)
// ---------------------------------------------------------------------------

export type Guild =
  | 'Ala Rasi'
  | 'Dam Thar'
  | 'Gubat Banwa'
  | 'Hub Nur'
  | 'Madfie'
  | 'Maltawi'
  | 'Visayas Arch'
  | 'Mindanao Arch';

export type CardType =
  | 'Unit'
  | 'Action'
  | 'Force'
  | 'Sentry'
  | 'Codex'
  | 'Token';

/** Ability categories, per "Main" page of the rulebook. */
export type AbilityType =
  | 'Activated'    // blue  — main phase only
  | 'Conditional'  // green — condition met, then pay cost
  | 'Continuous'   // pink  — active while requirements hold
  | 'Battle'       // yellow— during battle, before blocking, or opponent's turn
  | 'CodexPassive';// red   — conditional Codex ability, works face down

/**
 * Where a card must be for an ability to be usable.
 * Codex cards use their State name here instead (e.g. 'Ethereal', 'Demonic').
 */
export type AbilityScope = 'Ally' | 'Persona' | 'Hand' | 'Barrier' | 'Grave' | 'Field' | 'Heart' | 'Deck';

export interface AbilityDef {
  type: AbilityType;
  /** Zones/States this ability is legal from. */
  scope: AbilityScope[];
  /** Codex State this ability requires to be released, if any. */
  requiresState?: string;
  /** Max activations per turn. Undefined = unlimited. */
  perTurn?: number;
  /** Human-readable rules text, verbatim from the card. */
  text: string;
  /** Effect script id, resolved in src/cards. */
  effect: string;
  /** Energy component of the cost. Other costs live in the effect script. */
  energyCost?: number;
}

export interface CardDef {
  /** Isolated teaching definitions; never written back to the catalogue. */
  tutorial?: { version: 1; role: 'support' | 'arrival' | 'attack' | 'persona' | 'codex-attack' | 'codex-barrier' };
  /** Stable unique id, e.g. 'ala-rasi/fairy-caller-nikka'. */
  id: string;
  name: string;
  type: CardType;
  guild: Guild;
  /** 0 for Force cards; up to 3 for a starting Persona. Codex cards have none. */
  level: number;
  /** Bottom-right stat. Units only. */
  power: number;
  /**
   * Left-edge stat, added to the attacked unit's Power when this card blocks.
   * Lvl 3+ cards print no Defense; they may still block, contributing 0.
   */
  defense: number;
  /** Copies allowed in a deck. Defaults to 3; Engine Core prints 8. */
  maxCopies?: number;
  /** Archetype line, e.g. ['Fairy'] or ['Wardroids'] — drives "name/type matters" effects. */
  subtypes: string[];
  abilities: AbilityDef[];
  /** Codex cards only: the State this Codex can release. */
  state?: string;
  flavor?: string;
  /** Path under assets/cards. */
  art?: string;
}

// ---------------------------------------------------------------------------
// Runtime card instances
// ---------------------------------------------------------------------------

export type Zone =
  | 'deck'
  | 'hand'
  | 'barrier'
  | 'ally'
  | 'persona'
  | 'codex'
  | 'heart'
  | 'grave'
  | 'exile'
  | 'extra'
  | 'check';

export interface CardInstance {
  /** Incremented on every zone move; target identity survives neither leave/return nor a new entry. */
  zoneEntry?: number;
  /** Set 1 delayed effects are scoped to this field incarnation. */
  fieldEntry?: number;
  temporaryOffer?: { turn: number; entry: number };
  grantedRepeat?: { turn: number; entry: number };
  sevenHeadsTurn?: number;
  skipCheckTurn?: number;
  firstAttackExtraCheckTurn?: number;
  firstAttackTakenTurn?: number;
  sulaymanHitDrawTurn?: number;
  omakaOffered?: string;
  omakaTurn?: number;
  setOneUses?: Record<string, number>;
  /** Historical movement reason; does not change Offer or Grave value. */
  wasOffered?: boolean;
  wasOfferedDuringMain?: boolean;
  /** Unique per game, not per printing. */
  uid: string;
  defId: string;
  owner: PlayerId;
  zone: Zone;
  /** Ally slot index 0..3, or Codex slot index. Null elsewhere. */
  slot: number | null;
  /** Exhausted = turned sideways after attacking/supporting. */
  exhausted: boolean;
  faceDown: boolean;
  /** Temporary power buffs, cleared at the end of their duration. */
  modifiers: PowerModifier[];
  /** Token stack count; 1 for a normal unit. */
  stack: number;
  /** Screen forces the opponent to target this unit during battle. */
  screen: boolean;
  /** Ability uid -> uses so far this turn. */
  usesThisTurn: Record<string, number>;
  /** True if this unit has been relocated between ally slots this turn. */
  relocatedThisTurn: boolean;
  /** Knight: unit has Screen while charged (Ginarld, Lain). */
  screenWhileCharged: boolean;
  /** Barrier is being broken — still in the barriers array for animation,
   *  but not counted for game logic. Cleared when moved to check zone. */
  breaking?: boolean;
  /** Salik: unit was special called by Datu Salik and gains a Last Oath. */
  salikCalled?: boolean;
  /** Babaylan: Nalia supported a Babaylan unit this turn. */
  supportedBabaylan?: boolean;
  /** Set when this unit was special called from the deck (Berto). */
  calledFromDeck?: boolean;
  /**
   * The turn on which this unit was special called from the deck DURING
   * Battle, for cards whose printed trigger says so (Laya).
   *
   * `calledFromDeck` above records where a unit came from and never when, so
   * it cannot answer "during Battle" on its own -- and a phase check at the
   * point the ability fires cannot either, when the trigger only ever fires
   * in Battle anyway.
   */
  calledFromDeckInBattleTurn?: number;
}

export type ModifierDuration =
  | 'endOfTurn'
  /** One attack resolution. */
  | 'endOfAttack'
  /** The whole Battle phase - NOT the same as endOfAttack (Aria). */
  | 'endOfBattlePhase'
  /** Also the window a released Codex State occupies. */
  | 'endOfOpponentTurn'
  | 'permanent';

/**
 * A presentation-only event. The rules engine queues these while it works and
 * the client drains them; nothing in the engine ever reads them back.
 */
/**
 * Somewhere a card can leave from or land in.
 *
 * One list for both ends of a move, because the ceremony is symmetrical: the
 * Grave is a source when a card is recovered and a destination when one is
 * sent there, and it is the same box on the mat either way.
 */
export type FxZone =
  | 'deck'
  | 'grave'
  | 'heart'
  | 'extra'
  | 'exile'
  | 'codex'
  | 'check'
  | 'barrier'
  | 'hand'
  | 'field';

export interface HeartMoveCard {
  uid: string;
  defId: string;
  from: Zone | 'created';
  to: Zone | 'vanished';
  fromSlot: number | null;
  toSlot: number | null;
  hidden: boolean;
}

export interface HeartMoveFx {
  kind: 'heartMove';
  owner: PlayerId;
  reason: 'essence' | 'vent' | 'move' | 'create';
  cards: HeartMoveCard[];
  before: number;
  after: number;
}

export interface HandMoveFx {
  kind: 'handMove'; owner: PlayerId;
  cards: { uid: string; defId: string; to: Zone; toSlot: number | null; hidden: boolean }[];
}

export type FxEvent =
  /** Presentation only: actual Sipol result, after the destination is committed. */
  | { kind: 'sipolResult'; player: PlayerId; result: 'hand' | 'bottom' | 'empty' }
  | HandMoveFx
  | HeartMoveFx
  /** An effect pointed at something — draws an arc from source to target. */
  | { kind: 'target'; source: string; target: string }
  /** A unit's Power changed by `amount`. */
  | { kind: 'power'; target: string; amount: number }
  /** Buffs on a unit wore off, losing `amount` Power in total. */
  | { kind: 'powerExpire'; target: string; amount: number }
  /** A unit left the field for the Grave. */
  | { kind: 'destroy'; uid: string; owner: PlayerId }
  /** A Codex State was released. */
  | { kind: 'stateReleased'; state: string; player: PlayerId }
  /**
   * A hostile effect landing on a unit — destruction, an Offer, damage. Read
   * as a strike travelling from source to target rather than a neutral line,
   * so the player can tell "I am being hurt" from "I am being pointed at".
   */
  | { kind: 'strike'; source: string; target: string }
  /** A pile is being looked through. The pile lifts and fans. */
  | {
      kind: 'search';
      player: PlayerId;
      pile: 'deck' | 'grave' | 'heart' | 'extra' | 'exile' | 'codex';
    }
  /**
   * A card leaving one place for another, with the journey shown: the source
   * lights, the card rises out of it and travels.
   *
   * One event for every route on the board. A move from the Extra deck and a
   * move from the Grave differ only in which box lights up, so they should not
   * differ in code — the previous shape had a bespoke animation for a single
   * route and nothing at all for the rest.
   */
  | {
      kind: 'emit';
      uid: string;
      from: FxZone;
      to: FxZone;
      owner: PlayerId;
      /**
       * Whether the travelling card shows its face. False sends a card back
       * across the board instead — the ceremony must never leak a card the
       * viewer is not entitled to see.
       */
      faceUp: boolean;
    }
  /**
   * The Codex was switched.
   *
   * Not a movement: nothing leaves a pile and nothing travels. The card turns
   * over where it stands and the deck starts running on a different state, so
   * it gets a flip rather than a flight — a card flying out of the Codex slot
   * would describe something that did not happen.
   */
  | {
      kind: 'codexFlip'; uid: string; player: PlayerId;
      /** Definition snapshot of the previously active, face-up public Codex.
       * Never a reserve identity; omitted when no public predecessor is known. */
      readonly previousDefId?: string;
    }
  /**
   * A unit arrived on the field. `from` is where it came from, because the
   * route matters to the rules: a call from the deck is not the same event as
   * one from hand, and `replace` destroyed whatever was standing there.
   */
  | {
      kind: 'arrive';
      uid: string;
      from: 'hand' | 'deck' | 'grave' | 'heart' | 'replace';
      /** Printed Level, so the flourish can scale with the card's weight. */
      level: number;
    }
  /** A unit gained protection, or an effect was stopped short. */
  | { kind: 'ward'; target: string; mode: 'gain' | 'block' }
  /** Something was given back — Charge, or a unit returned to readiness. */
  | { kind: 'restore'; target: string };

export interface PowerModifier {
  origin?: import('./card-origin.js').CardOrigin;
  cause?: import('./card-origin.js').CardOrigin;
  amount: number;
  duration: ModifierDuration;
  /** Source card's display name. */
  source: string;
  /** Source card's def id, so the UI can render its art. */
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Player + game state
// ---------------------------------------------------------------------------

export type PlayerId = 0 | 1;

/** Four ally slots, laid out: [0] [1] PERSONA [2] [3]. */
export const ALLY_SLOTS = 4;
export const BARRIER_COUNT = 5;
export const STARTING_HAND = 5;
export const DECK_SIZE = 50;
export const MAX_CODEX = 5;
export const MIN_CODEX = 3;
export const MAX_NORMAL_PLAYS = 3;
export const MAX_COPIES = 3;
/** A starting Persona must be a Unit of exactly this level. */
export const STARTING_PERSONA_LEVEL = 3;
/** Persona level needed to Ascend Break into a lvl 4 from the Extra Zone. */
export const ASCEND_BREAK_LEVEL = 6;

export interface PlayerState {
  id: PlayerId;
  deck: string[];      // card uids, index 0 = top
  hand: string[];
  /** Index 0 is the left-most barrier — the one revealed by a check. */
  barriers: string[];
  allies: (string | null)[];  // length ALLY_SLOTS
  persona: string | null;
  /** Face-down Codex cards; one may be active. */
  codex: string[];
  activeCodex: string | null;
  /** Codex State currently released, if any. Only one at a time. */
  releasedState: string | null;
  heart: string[];
  grave: string[];
  exile: string[];
  extra: string[];
  /** Historical fixtures only. Fresh Energy-free matches omit this field. */
  energy?: number;
  /** Allowance spent on normal calls, Actions and manual Codex switches; resets on the owner's turn. */
  normalPlaysUsed: number;
  codexSwitchedThisTurn: boolean;
  /** Switch history for card conditions and presentation, never a switching cap. */
  autoSwitchedThisTurn: boolean;
  /** Trigger names that already caused an auto-switch this turn. */
  autoSwitchTriggersUsed: string[];
  /** Historical record; no longer blocks automatic switching. */
  switchedCodexLastTurn: boolean;
  /** Ravage counter: how many units damaged by ability this turn. */
  unitsDamagedByAbilityThisTurn: number;
  /** Ravage: was a barrier broken this turn (by opponent attack or own ability)? */
  barrierBrokenThisTurn: boolean;
  /** Presentation total. Per-Codex activation limits use the persistent skill ledger. */
  skillUsedThisTurn: number;
  /** Barbarian: Savage Forge Stronghold grants extra attack checks this turn. */
  extraAttackChecks: number;
  /** Barbarian: has Molten Spikes already fired this turn? */
  moltenSpikesUsed: boolean;
  /** Barbarian: tribute count for Molten Spikes (every 2 → damage). */
  moltenSpikesTributeCount: number;
  /** Maguindanao: tribute count for Lake Buluan (every 2 → damage). */
  lakeBuluanTributeCount: number;
  /** Maguindanao: Lake Buluan grants +5000 defense to the next blocker. */
  lakeBuluanDefenseBonus: boolean;
  /** Maguindanao: Lake Buluan — send the next check card to grave instead of hand. */
  lakeBuluanCheckSwap: boolean;
  /** Maguindanao: number of units Offered (sent to Grave as a cost) this turn. */
  unitsOfferedThisTurn: number;
  /** Records the actual first Offer, including costs paid as one batch. */
  firstOfferTurn?: number;
  /** Illana Bay's pre-payment chain was committed/resolved on this global turn. */
  illanaBayActivatedTurn?: number;
  illanaBayArmedTurn?: number;
  /** Maguindanao: Liguasan Marsh — offer replacement used this turn. */
  liguasanMarshUsedThisTurn: boolean;
  /**
   * Difficulty handicap: the chance an attack check finds a Force.
   *
   * 0 for a fair game, and 0 for the human always. A Force revealed on a
   * check plays free with both of its modes, so raising this is straight card
   * advantage rather than better play — it lives here, in the state, rather
   * than inside the bot, because a rule that changes what the deck does
   * should be visible to anything reading the game and not hidden in the
   * opponent's head.
   */
  /**
   * How many times Sipol has resolved for this player this turn, and how
   * many times it did last turn.
   *
   * Game state, deliberately, not a counter on the side: a replay rebuilds
   * the duel by re-running the actions, and anything a card reads that
   * lives outside the state is a number the rebuild does not have. Each
   * Sipol 1 counts once, so Sipol 3 counts three.
   */
  /**
   * Babaylan, Turning Pursuit: the next attack on this Persona is
   * answered. Set when a Barrier breaks, spent when the Persona is next
   * attacked — which may be a later turn, so it is state rather than a
   * per-turn flag.
   */
  pursuitArmed?: boolean;
  /**
   * Babaylan, Champion's Trial: the Kalas owed at the end of this turn for
   * the Power the Persona already swung with. Holds the turn number so a
   * debt cannot survive into a turn it was not incurred on.
   */
  trialDebtTurn?: number;
  sipolThisTurn?: number;
  sipolLastTurn?: number;
  forceCheckBias: number;
  /** Maguindanao: Pulangi River — first call this turn should be offered. */
  pulangiRiverFirstCallPending: boolean;
  /** Barbarian: has the Persona charged (attacked twice) this battle? */
  personaChargedThisBattle: boolean;
  /** Barbarian: MTB wants to charge the persona after resolveAttack. */
  pendingPersonaCharge: boolean;
  /** Angel: Sky Church — cards rallied to pay energy this turn. Drawn back at EOT. */
  skyChurchRalliedThisTurn: number;
  /** Agta: has the player personified this turn (normal or Laya's battle personify)? */
  personifiedThisTurn: boolean;
  /** Babaylan: Spirit Tokens in the Heart (count, not card uids). */
  spiritTokens: number;
  /** Babaylan: has the Andukha 12 permanent persona bonus been granted? */
  andukha12Granted: boolean;
  /** Babaylan: has Amaya's extra-spirit skill been used this turn? */
  amayaExtraSpiritUsed: boolean;
  /** Babaylan: has the player generated spirits this turn (for Amaya/Dayaw triggers)? */
  spiritsGeneratedThisTurn: boolean;
}

export type Phase = 'start' | 'personify' | 'main' | 'battle' | 'end';

/**
 * The attack currently being presented. Purely transient - it exists so the
 * client can show the attacker turned sideways, the blockers sitting in the
 * Defense zone, and the running power totals while the attack resolves.
 */
export interface ActiveBattle {
  attacker: string;
  supporters: string[];
  /** Participants readied by a skill during this attack must stay ready afterward. */
  chargedParticipants?: string[];
  /** Checks granted only to this declared attack, never the next battle. */
  extraChecks?: number;
  /** null = the Persona is being attacked. */
  target: string | null;
  defender: PlayerId;
  /** Cards played from hand into the Defense zone. */
  blockers: string[];
  attackPower: number;
  defensePower: number;
  stage: 'declared' | 'blocking' | 'checking' | 'resolved';
  hit?: boolean;
  /** A Sentry was revealed, nullifying Persona damage. */
  sentryUsed?: boolean;
  /** Minimum Defense a blocker must have to be legal (Aria evasion). 0 = no restriction. */
  minBlockDefense?: number;
  /** Maximum level a blocker can have (Aria: no lvl 2+ defense). undefined = no restriction. */
  maxBlockLevel?: number;
}

export interface GameState {
  /** Local teaching rules only. Normal matches and PvP never set this. */
  rulesProfile?: 'tutorial-v1';
  /** Present in every fresh match; omitted only by historical fixture snapshots. */
  rulesRevision?: string;
  /** Authoritative skill uses; zone changes never clear this ledger. */
  skillUses?: Record<string, { turn: number; count: number }>;
  responseChain?: import('./response-chain.js').ResponseChain | null;
  chainSerial?: number;
  pendingTriggerSerial?: number;
  pendingTriggers?: import('./response-chain.js').PendingTrigger[];
  /** Read-only power totals on a remote viewer; never set by the rules engine. */
  viewPowers?: Record<string, number>;
  cards: Record<string, CardInstance>;
  players: [PlayerState, PlayerState];
  turnPlayer: PlayerId;
  phase: Phase;
  turnNumber: number;
  /** Set once a player has broken all 5 barriers and connected on the Persona. */
  winner: PlayerId | null;
  /**
   * How the game ended. There are two ways to lose and they read completely
   * differently to a player, so the result screen has to be able to tell them
   * apart rather than assume a Barrier break.
   */
  winReason: 'barrier' | 'deckout' | 'surrender' | null;
  /** Deterministic RNG seed, so games are replayable. */
  rngSeed: number;
  /**
   * How many attack checks have happened. Feeds `rollAt` so the Force
   * handicap draws a fresh value each time without the state having to carry
   * a generator — which it cannot, because the AI clones it.
   */
  checkCount: number;
  log: string[];
  /** For each log entry, card uids referenced (for thumbnail display). */
  logCards: string[][];
  /**
   * The same duel as structured records (see core/events.ts).
   *
   * Optional because a GameState can be built by a test or cloned by the AI
   * without one, and because the text log above is still what several tests
   * read. New presentation reads this; the text log is on its way out.
   */
  duel?: DuelEventLog;
  /** Set while an attack is being presented; null the rest of the time. */
  activeBattle: ActiveBattle | null;
  /** Uids of tokens created since the last trigger sweep (for tokenCreated trigger). */
  pendingTokenCreated: string[];
  /** Damage events since the last trigger sweep (for unitDamagedByAbility trigger). */
  pendingDamageByAbility: Array<{ damager: PlayerId; damagedUid: string | null; damagedOwner: PlayerId; offered?: boolean; offeredFrom?: import('./card-origin.js').CardOrigin; firstOfferThisTurn?: boolean; fieldObservers?: string[]; graveObservers?: string[] }>;
  /**
   * Seats whose State has just released and not yet been announced.
   *
   * A State can release inside synchronous card code, which cannot fire an
   * async trigger. So the release is queued where it happens and drained
   * by the controller at the same points it drains calls and damage.
   */
  pendingStateReleases?: PlayerId[];
  pendingRefugeDamage?: Array<{ uid: string; source: string; damager: PlayerId; owner: PlayerId; codex: string }>;
  /** Babaylan: spirit generation events since the last trigger sweep (for spiritsGenerated trigger). */
  pendingSpiritGeneration: Array<{ owner: PlayerId }>;
  pendingBabaylan?: Array<{ owner: PlayerId; name: 'essenced' | 'vented' | 'effectExhausted' | 'kaluluwaCreated'; unit?: string; cards?: string[]; tokens?: number; fromDeck?: boolean; from?: Zone; firstEssenceThisTurn?: boolean; bonusCreation?: boolean }>;
  babaylanEssences?: Record<number, { turn: number; count: number }>;
  babaylanVents?: Record<number, { turn: number; count: number }>;
  babaylanReturns?: Array<{ owner: PlayerId; uid: string; entry: number; turn: number; when: 'battle' | 'turn'; optional?: boolean; energy?: number; restore?: string; companion?: boolean; source: string }>;
  babaylanBattleDraws?: Array<{ owner: PlayerId; turn: number; source: string }>;
  /** Dryad: special calls since the last trigger sweep (for The Last Tree). */
  pendingSpecialCalls: Array<{ uid: string; owner: PlayerId; from?: Zone }>;
  /** Maguindanao: units Liguasan Marsh will special call back after an Offer. */
  /** `codex` is the card that queued the recall, so it can announce itself
   *  later even if the active Codex has switched by the time it resolves. */
  pendingOfferRecall: Array<{ uid: string; owner: PlayerId; codex: string }>;
  /** Presentation events waiting to be drained by the client. */
  pendingFx: FxEvent[];
  /**
   * Active continuous rules from Codex cards. Each entry grants a persistent
   * effect until its expiry. e.g. Savage Forge Stronghold's Ravage effect:
   * "each time a unit is damaged by an ability, it gets +3000 until end of turn."
   */
  activeRules: Array<{
    label: string;
    owner: PlayerId;
    /** When to remove this rule. */
    expires: 'endOfTurn' | 'endOfOpponentTurn' | 'endOfBattlePhase';
    /** Which player's turns this counts as opponent for expiry. */
    ownerForExpiry: PlayerId;
    /** Optional cleanup function run when the rule expires. */
    customRun?: () => Promise<void>;
  }>;
}
