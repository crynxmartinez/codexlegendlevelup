/**
 * Recording a duel so it can be played back exactly.
 *
 * The obvious approach — record every `PlayerAction` and re-run them — does
 * not work here, and it is worth being clear about why before reading the
 * code. An action like "activate this ability" is a single click that then
 * asks the player four more questions: which cards, which mode, which slot,
 * confirm or decline. Those answers are not in the action. Replaying only the
 * actions replays a different game the moment any of them differ.
 *
 * So a replay is two interleaved streams:
 *
 *   ACTIONS  — what the player did.
 *   CHOICES  — every answer given to the Chooser while those actions resolved.
 *
 * `RecordingChooser` wraps a real chooser and writes down what it returned.
 * `ReplayChooser` reads the same list back in order. Because the engine asks
 * its questions in a deterministic order for a given state, feeding the
 * answers back in that order reproduces the state exactly.
 *
 * The seed is recorded too, so shuffles, checks and the Force handicap all
 * land the same way.
 *
 * PRIVACY. A replay contains both players' decks and every hidden choice, so
 * it is by definition full information. That is fine for the owner reviewing
 * their own match and is not fine to hand to anyone during a live one. The
 * format carries a `visibility` field so a public replay can be filtered
 * later, and `assertNotLive` refuses to export from an unfinished game — the
 * cheapest possible guard against the worst possible leak.
 */
import { resetUids } from './setup.js';
import type { PlayerAction, PromptPolicy } from './game.js';
import type { Chooser } from './effects.js';
import type { GameState, PlayerId } from './types.js';

/**
 * Bumped when the shape below changes incompatibly.
 *
 * An old replay is refused rather than half-read: a replay that loads and
 * then diverges silently is worse than one that will not load at all.
 */
/**
 * 2: decks are carried as deck CODES rather than names, and the Force
 *    handicap is in the header.
 * 3: the prompt policy is in the header.
 * 4: the Sipol counters joined the state fingerprint. Replays recorded
 *    before this computed a different final hash from the same duel, so
 *    they are refused rather than being reported as diverged.
 *
 * Every one of those was a correctness fix, not a feature: each is an
 * input the engine consults that is set OUTSIDE `createGame`, so a replay
 * without it reproduces a different duel. See `ReplayHeader`.
 */
// Version 8 removes Energy and resolves alternating responses in LIFO order. Older simulations
// must not silently play with different rules; their saved videos remain usable.
// Version 9 fingerprints all serializable rules state, not just card locations.
export const REPLAY_FORMAT_VERSION = 9;

/** One answer the Chooser gave, in the order it was asked. */
export interface RecordedChoice {
  /** Which Chooser method. */
  q: string;
  /** Who was asked. */
  p: PlayerId;
  /** What they answered. Shapes vary by method; opaque to the recorder. */
  a: unknown;
}

export interface ReplayHeader {
  formatVersion: number;
  /** Which build produced it, so a reader can warn about rules drift. */
  engineVersion: string;
  presentation?: { version: 1; duelPace: 'learning' | 'standard' | 'fast'; glFx: boolean; cutscenes: boolean; scaleSpectacle: boolean };
  seed: number;
  /**
   * Both decks as deck codes, never as names.
   *
   * A name is a reference to something the player owns and can change. A
   * replay of a custom deck stored by name stops loading the moment that deck
   * is edited or deleted — and worse, an edited deck of the same name loads
   * and produces a different duel under the original's title. The code is the
   * fifty cards themselves, so a replay stays true to what was played.
   */
  decks: [string, string];
  /** The deck names at the time, for the list. Display only; never played. */
  deckNames?: [string, string];
  /** Persona and starting Codex, per player, as chosen during setup. */
  setup: Array<{ persona?: string; codex?: string }>;
  firstPlayer: PlayerId;
  /**
   * The Force handicap per seat, as it was set for this duel.
   *
   * Not a setting, a rules input. Hard difficulty writes 0.5 into the AI's
   * `forceCheckBias` AFTER `createGame`, and battle.ts feeds it to the seeded
   * RNG on every attack check — so a replay that restores the seed but not
   * this one number reproduces a different duel, and does it several checks
   * in, where it reads like a rules bug. Recorded per seat rather than as a
   * difficulty name because the engine takes a number and the mapping from
   * difficulty to number is free to change.
   */
  forceCheckBias?: [number, number];
  /**
   * How often the engine stopped to ask about optional effects.
   *
   * This decides which QUESTIONS get asked, not merely how they look: a
   * quieter policy skips re-offering a Codex switch that was already
   * declined this turn. Replay under a different policy and the engine
   * asks for a target where the recording has a Personify answer, and the
   * two streams part company two questions in.
   *
   * The client freezes this for the length of a duel so one recording
   * corresponds to one policy. See the note where it is frozen.
   */
  promptPolicy?: PromptPolicy;
  /** Full information, or filtered for sharing. */
  visibility: 'private' | 'public';
  recordedAt: string;
}

export interface ReplayResult {
  winner: PlayerId | null;
  reason: 'barrier' | 'deckout' | 'surrender' | null;
  /** Final state hash, so a replay can prove it reproduced the same duel. */
  finalHash: string;
}

/**
 * One step of a recorded duel.
 *
 * Turn starts are recorded, not inferred. An earlier version stored only the
 * actions and rebuilt the turn boundaries by watching whose turn it was — and
 * it drifted, because `beginTurn` itself asks the Chooser questions
 * (Personify, an auto-switch offer) and getting the boundary wrong puts every
 * later answer against the wrong question. The marker costs a byte and removes
 * the whole class of failure.
 */
export type ReplayStep =
  | { t: 'turn'; waitMs?: number }
  | { t: 'act'; action: PlayerAction; p: PlayerId; waitMs?: number };

export interface Replay {
  header: ReplayHeader;
  steps: ReplayStep[];
  choices: RecordedChoice[];
  /** Optional hashes taken after each action, to find where a replay diverged. */
  hashes?: string[];
  result?: ReplayResult;
}

/**
 * A fingerprint of the parts of a state a replay must reproduce.
 *
 * Deliberately not a hash of the whole object: `GameState` carries presentation
 * queues, pending trigger scratch space and an event log, none of which are
 * rules state, and including them would make the check fail on changes that do
 * not matter. What is here is what a player would notice: where every card is,
 * in what order, and every resource.
 */
export function stateHash(game: GameState): string {
  // Presentation drains differ between headless and visible play. All other
  // serializable state (including pending rules triggers) affects replay.
  const { log: _log, logCards: _logCards, duel: _duel, pendingFx: _fx, ...rules } = game;
  return fnv1a(stableRulesJson(rules));
}

function stableRulesJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(v => stableRulesJson(v) || 'null').join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined && typeof v !== 'function')
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${JSON.stringify(k)}:${stableRulesJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? '';
}

/** Historical fingerprint retained only for comparison in audit tooling. */
export function legacyStateHash(game: GameState): string {
  const parts: string[] = [];
  parts.push(`t${game.turnNumber}:${game.turnPlayer}:${game.phase}`);
  parts.push(`w${game.winner ?? '-'}:${game.winReason ?? '-'}`);
  parts.push(`c${game.checkCount}`);
  for (const pid of [0, 1] as PlayerId[]) {
    const ps = game.players[pid];
    parts.push([
      `p${pid}`,
      `d${ps.deck.join(',')}`,
      `h${ps.hand.join(',')}`,
      `a${ps.allies.map((x) => x ?? '-').join(',')}`,
      `b${ps.barriers.join(',')}`,
      `g${ps.grave.join(',')}`,
      `x${ps.exile.join(',')}`,
      `r${ps.heart.join(',')}`,
      `k${ps.codex.join(',')}`,
      `P${ps.persona ?? '-'}`,
      `C${ps.activeCodex ?? '-'}`,
      // Read by a card (Siwangan asks how many times you Sipol'd last
      // turn), so a replay that reproduced every card position but not
      // this would play a different duel and the hash would not say so.
      `S${ps.sipolThisTurn ?? 0}.${ps.sipolLastTurn ?? 0}`,
    ].join('|'));
  }
  // Exhausted/charged is rules state a player can see, so it belongs here.
  const ex = Object.keys(game.cards).sort()
    .filter((u) => game.cards[u]!.exhausted).join(',');
  parts.push(`X${ex}`);
  return fnv1a(parts.join('#'));
}

/** A short, stable hash. Not cryptographic — this detects drift, not tampering. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Wraps a chooser and writes down every answer it gives.
 *
 * Every method delegates and records. The recording is of the RESULT, not the
 * question: replaying re-asks the same questions in the same order, so only
 * the answers need storing, and storing the questions would double the size of
 * a replay for no gain.
 */
export class RecordingChooser implements Chooser {
  readonly choices: RecordedChoice[] = [];

  constructor(private readonly inner: Chooser) {}

  private async rec<T>(q: string, p: PlayerId, run: () => Promise<T>): Promise<T> {
    const a = await run();
    this.choices.push({ q, p, a });
    return a;
  }

  chooseAbility(p: PlayerId, prompt: string, options: Parameters<Chooser['chooseAbility']>[2], context?: Parameters<Chooser['chooseAbility']>[3]) {
    return this.rec('chooseAbility', p, () => this.inner.chooseAbility(p, prompt, options, context));
  }
  chooseCards(
    p: PlayerId, prompt: string, candidates: string[], count: number,
    opts?: Parameters<Chooser['chooseCards']>[4],
  ) {
    return this.rec('chooseCards', p, () => this.inner.chooseCards(p, prompt, candidates, count, opts));
  }
  chooseTarget(...args: Parameters<Chooser['chooseTarget']>) {
    return this.rec('chooseTarget', args[0], () => this.inner.chooseTarget(...args));
  }
  chooseMode(p: PlayerId, prompt: string, modes: string[], cardUids?: string[]) {
    return this.rec('chooseMode', p, () => this.inner.chooseMode(p, prompt, modes, cardUids));
  }
  revealCards(p: PlayerId, uids: string[], title: string, subtitle?: string) {
    // No answer, but it still consumes a slot so the streams stay aligned.
    return this.rec('revealCards', p, () => this.inner.revealCards(p, uids, title, subtitle));
  }
  confirm(p: PlayerId, prompt: string) {
    return this.rec('confirm', p, () => this.inner.confirm(p, prompt));
  }
  chooseSlot(...args: Parameters<Chooser['chooseSlot']>) {
    return this.rec('chooseSlot', args[0], () => this.inner.chooseSlot(...args));
  }
  personifyPrompt(p: PlayerId, candidates: string[]) {
    return this.rec('personifyPrompt', p, () => this.inner.personifyPrompt(p, candidates));
  }
  battleCards(...a: Parameters<Chooser['battleCards']>) {
    return this.rec('battleCards', a[0], () => this.inner.battleCards(...a));
  }
  blockPrompt(...a: Parameters<Chooser['blockPrompt']>) {
    return this.rec('blockPrompt', a[0], () => this.inner.blockPrompt(...a));
  }
  revealConfirm(p: PlayerId, uid: string, prompt: string, labels?: { yes: string; no: string }) {
    return this.rec('revealConfirm', p, () => this.inner.revealConfirm(p, uid, prompt, labels));
  }
}

/** Raised when a replay asks a question the recording does not answer. */
export class ReplayDivergence extends Error {
  constructor(
    readonly expected: string | null,
    readonly got: string,
    readonly at: number,
  ) {
    super(
      expected === null
        ? `Replay ran out of choices at #${at}; the engine asked "${got}".`
        : `Replay diverged at #${at}: recorded "${expected}", engine asked "${got}".`,
    );
    this.name = 'ReplayDivergence';
  }
}

/**
 * Answers from a recording, in order.
 *
 * Throws the moment the engine asks a different question than the one that was
 * recorded. That is a hard failure on purpose: a replay that silently guesses
 * produces a plausible duel that never happened, which is worse than an error,
 * because someone will use it to argue about a rule.
 */
export class ReplayChooser implements Chooser {
  private at = 0;

  constructor(private readonly choices: readonly RecordedChoice[]) {}

  /** How many answers are left. Zero means the recording is spent. */
  get remaining(): number { return this.choices.length - this.at; }

  private next<T>(q: string): T {
    const c = this.choices[this.at];
    if (!c) throw new ReplayDivergence(null, q, this.at);
    if (c.q !== q) throw new ReplayDivergence(c.q, q, this.at);
    this.at++;
    return c.a as T;
  }

  // Every argument is ignored on purpose: the answer is already known. They
  // are still declared so this satisfies `Chooser` and so a future divergence
  // check can compare the question it was asked against the one recorded.
  async chooseAbility(..._a: Parameters<Chooser['chooseAbility']>) {
    return this.next<number | null>('chooseAbility');
  }
  async chooseCards(..._a: Parameters<Chooser['chooseCards']>) {
    return this.next<string[]>('chooseCards');
  }
  async chooseTarget(..._a: Parameters<Chooser['chooseTarget']>) {
    return this.next<string | null>('chooseTarget');
  }
  async chooseMode(..._a: Parameters<Chooser['chooseMode']>) {
    return this.next<number>('chooseMode');
  }
  async revealCards(..._a: Parameters<Chooser['revealCards']>) {
    this.next<void>('revealCards');
  }
  async confirm(..._a: Parameters<Chooser['confirm']>) {
    return this.next<boolean>('confirm');
  }
  async chooseSlot(..._a: Parameters<Chooser['chooseSlot']>) {
    return this.next<number>('chooseSlot');
  }
  async personifyPrompt(..._a: Parameters<Chooser['personifyPrompt']>) {
    return this.next<string | null>('personifyPrompt');
  }
  async battleCards(..._a: Parameters<Chooser['battleCards']>) {
    return this.next<Awaited<ReturnType<Chooser['battleCards']>>>('battleCards');
  }
  async blockPrompt(..._a: Parameters<Chooser['blockPrompt']>) {
    return this.next<Awaited<ReturnType<Chooser['blockPrompt']>>>('blockPrompt');
  }
  async revealConfirm(..._a: Parameters<Chooser['revealConfirm']>) {
    return this.next<boolean>('revealConfirm');
  }
}

/**
 * Put the card-instance counter back to zero before rebuilding a duel.
 *
 * This is a precondition of replay, not a nicety. Card uids come from a
 * module-level counter in setup.ts that `createGame` does not reset, so the
 * second game created in a process starts numbering where the first left off —
 * and a recording's actions name `c52`, which then does not exist. The symptom
 * is "unknown card instance", several actions in, which reads like a rules bug
 * and is not one.
 *
 * It is exported separately rather than folded into the replay loader because
 * it reaches across the whole module: anything still holding the live game's
 * cards must be finished with them first. Replay runs after a duel ends, which
 * is where that is true.
 */
export function prepareForReplay(): void {
  resetUids();
}

/**
 * Refuse to export a replay of a duel that is still being played.
 *
 * The one guard that matters for the future: handing someone a replay of a
 * live match hands them their opponent's hand.
 */
export function assertNotLive(game: GameState): void {
  if (game.winner === null) {
    throw new Error('A replay cannot be exported while the duel is still running.');
  }
}

/** Pack a replay into a URL-safe string. */
export function encodeReplay(r: Replay): string {
  const json = JSON.stringify(r);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Read a replay code back.
 *
 * Every failure mode returns null rather than throwing a decoding error at the
 * caller: a pasted code is user input, and "that code did not work" is the
 * only message that helps. The version check is here rather than at use so an
 * incompatible replay is refused before anything tries to run it.
 */
export function decodeReplay(code: string): Replay | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Replay;
    if (!parsed?.header) return null;
    if (parsed.header.formatVersion !== REPLAY_FORMAT_VERSION) return null;
    if (!Array.isArray(parsed.steps) || !Array.isArray(parsed.choices)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Check completed boundaries before presenting a changed match as the saved one. */
export function assertReplayCheckpoint(replay: Replay, completed: number, game: GameState): void {
  const expected = replay.hashes?.[completed - 1]
    ?? (completed === replay.steps.length && replay.result?.reason !== 'surrender' ? replay.result?.finalHash : undefined);
  if (expected && stateHash(game) !== expected) throw new Error(`This game differs from its recording at action ${completed}. Recorded on patch ${replay.header.engineVersion}.`);
}
