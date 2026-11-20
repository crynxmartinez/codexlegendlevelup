/**
 * The duel as a list of things that happened.
 *
 * The game already keeps a text log, and that log is written for a human to
 * read. It cannot be read back: "Player 0 special called Kidlat." tells the
 * interface nothing it can highlight, animate, count or replay. Parsing it
 * would make English the wire format, and the first translated string would
 * break every feature built on top.
 *
 * So the rules layer emits a record as well as a sentence. The record is the
 * authoritative one for anything new — the action banner, the timeline, the
 * combat calculator, replays — and the sentence stays for now because the
 * existing log UI and a number of tests still read it.
 *
 * Three things this file is careful about:
 *
 * VISIBILITY. Every event declares who may see it. A public event must never
 * carry the identity of a card its owner alone can see, because the same
 * records are what a future PvP server would send to the other client. The
 * enforcement is `assertPublicSafe` below and a test that walks a whole game.
 *
 * GROUPING. One player action can cascade — a call fires a trigger, which
 * pays a cost, which fires a Last Oath, which resolves the original skill.
 * Every event from that cascade shares a `group`, so the interface can show
 * "here is what that one click did" rather than eleven unrelated lines.
 *
 * ORDER. Ids are sequential and never reused, so "the last action" and "step
 * forward" are both just an index.
 */
import type { Phase, PlayerId, Zone } from './types.js';
import type { GameState } from './types.js';

export type DuelEventType =
  | 'turnStarted'
  | 'phaseChanged'
  | 'cardDrawn'
  | 'cardCalled'
  | 'cardPlayed'
  | 'abilityActivated'
  | 'abilityResolved'
  | 'costPaid'
  | 'cardMoved'
  | 'unitCharged'
  | 'unitExhausted'
  | 'powerChanged'
  | 'energyChanged'
  | 'codexSwitched'
  | 'stateReleased'
  | 'attackDeclared'
  | 'defenseStarted'
  | 'defenseCommitted'
  | 'attackCheckStarted'
  | 'checkRevealed'
  | 'forceResolved'
  | 'attackResolved'
  | 'barrierBroken'
  | 'sentryRevealed'
  | 'personaChanged'
  | 'matchEnded';

/**
 * Who is allowed to see an event.
 *
 * `public`   — both players. Must carry no card identity either player is not
 *              entitled to; see `assertPublicSafe`.
 * `owner`    — only `actor`. Drawing a card, looking at the top of the deck.
 * `internal` — neither. Bookkeeping the interface may use locally but a
 *              server would never transmit.
 */
export type DuelVisibility = 'public' | 'owner' | 'internal';

export interface CardMovement {
  uid: string;
  from: Zone;
  to: Zone;
  owner: PlayerId;
  /**
   * The card moved but its face did not turn up.
   *
   * The uid still travels, because the interface has to animate *something*
   * and both players can see that a card moved. What must not travel is the
   * identity, and that is the client's job: a movement marked hidden is drawn
   * as a card back.
   */
  hidden?: boolean;
}

export interface DuelValueChange {
  /** What moved: 'power', 'energy', 'hand', 'barriers', 'heart', 'grave', 'state'. */
  what: string;
  /** The unit or player the number belongs to. */
  uid?: string;
  owner?: PlayerId;
  from: number;
  to: number;
}

export interface DuelEventResult {
  /** One of a small set the interface can branch on. */
  outcome: string;
  /** The same thing in the player's words. */
  detail?: string;
}

export interface DuelEvent {
  id: number;
  /** Every event produced by one player action shares this. */
  group: number;
  turn: number;
  phase: Phase;
  /** Who caused it. Null for events the game itself causes. */
  actor: PlayerId | null;
  type: DuelEventType;
  /** Public chain identity; never includes payment receipts or private choices. */
  chain?: { id: string; linkId: string; ordinal: number; stage: 'committed' | 'resolved' };
  sourceUids: string[];
  targetUids: string[];
  movements?: CardMovement[];
  changes?: DuelValueChange[];
  result?: DuelEventResult;
  visibility: DuelVisibility;
  /**
   * The same event as a sentence.
   *
   * Kept on the record rather than built in the interface because the rules
   * layer is the only place that knows, for instance, which of two identically
   * named units was Offered. The interface is free to ignore it and draw the
   * structured fields instead, and mostly does.
   */
  message: string;
}

/** Everything an emitter has to supply; the rest is filled in from the game. */
export type EmitInput =
  Omit<DuelEvent, 'id' | 'group' | 'turn' | 'phase'>
  & Partial<Pick<DuelEvent, 'turn' | 'phase' | 'group'>>;

/**
 * The mutable bits of the event stream.
 *
 * Kept beside the events rather than inside `GameState`'s other counters
 * because the AI deep-clones the state to look ahead, and a lookahead must not
 * append to the real duel's record. `cloneEventState` is what the clone gets.
 */
export interface DuelEventLog {
  events: DuelEvent[];
  nextId: number;
  nextGroup: number;
  /** The group events are currently being filed under. */
  group: number;
  /**
   * Set while the AI is exploring. Emission is skipped entirely rather than
   * emitted-and-discarded, because a lookahead runs thousands of actions and
   * the garbage is not free.
   */
  muted: boolean;
}

export function newEventLog(): DuelEventLog {
  return { events: [], nextId: 1, nextGroup: 1, group: 0, muted: false };
}

/** A game that carries an event log. Kept structural so tests can pass stubs. */
interface HasEvents {
  duel?: DuelEventLog;
  turnNumber: number;
  phase: Phase;
}

/**
 * Start a new action group and return its id.
 *
 * Called by `perform` and by the few places the game acts on its own — the
 * start of a turn, the end of a match.
 */
export function beginGroup(game: HasEvents): number {
  const d = game.duel;
  if (!d) return 0;
  d.group = d.nextGroup++;
  return d.group;
}

/**
 * Record something that happened.
 *
 * Returns the event so a caller can hold onto its id — the timeline links a
 * Last Oath back to the Offer that paid for it that way.
 */
export function emit(game: HasEvents, input: EmitInput): DuelEvent | null {
  const d = game.duel;
  if (!d || d.muted) return null;
  const ev: DuelEvent = {
    id: d.nextId++,
    group: input.group ?? d.group,
    turn: input.turn ?? game.turnNumber,
    phase: input.phase ?? game.phase,
    actor: input.actor,
    type: input.type,
    sourceUids: input.sourceUids,
    targetUids: input.targetUids,
    visibility: input.visibility,
    message: input.message,
  };
  if (input.movements) ev.movements = input.movements;
  if (input.changes) ev.changes = input.changes;
  if (input.result) ev.result = input.result;
  if (input.chain) ev.chain = { ...input.chain };
  d.events.push(ev);
  return ev;
}

/** Run `fn` with emission off — for AI lookahead over a cloned state. */
export function muted<T>(game: HasEvents, fn: () => T): T {
  const d = game.duel;
  if (!d) return fn();
  const before = d.muted;
  d.muted = true;
  try { return fn(); } finally { d.muted = before; }
}

/** Every event in a group, in the order they happened. */
export function groupOf(log: DuelEventLog, group: number): DuelEvent[] {
  return log.events.filter((e) => e.group === group);
}

/**
 * The most recent group that a player is allowed to be shown.
 *
 * "Most recent" means the highest group number with at least one event that
 * player may see — not simply the last group, which may have been entirely
 * private to the opponent and would leave Last Action showing nothing.
 */
export function lastVisibleGroup(log: DuelEventLog, viewer: PlayerId): number | null {
  for (let i = log.events.length - 1; i >= 0; i--) {
    const e = log.events[i]!;
    if (canSee(e, viewer)) return e.group;
  }
  return null;
}

/** Whether `viewer` is entitled to this event. */
export function canSee(e: DuelEvent, viewer: PlayerId): boolean {
  if (e.visibility === 'public') return true;
  if (e.visibility === 'owner') return e.actor === viewer;
  return false;
}

/**
 * What a client for `viewer` would be sent.
 *
 * Not used by the local game, which is allowed to see everything — it exists
 * so the rule can be tested now rather than discovered to be wrong when there
 * is a second player on the other end of a socket.
 */
export function viewFor(log: DuelEventLog, viewer: PlayerId): DuelEvent[] {
  return log.events.filter((e) => canSee(e, viewer));
}

/**
 * The check a public event has to pass.
 *
 * A public event may name a card only if that card is somewhere both players
 * can see it, or the event is the thing that reveals it. `revealing` is the
 * short list of types whose whole purpose is to turn a card face up.
 */
const REVEALING = new Set<DuelEventType>([
  'checkRevealed', 'forceResolved', 'sentryRevealed', 'cardCalled',
  'cardPlayed', 'codexSwitched', 'personaChanged', 'abilityActivated',
  'abilityResolved', 'costPaid', 'barrierBroken', 'attackDeclared',
  'defenseCommitted', 'attackResolved', 'cardMoved', 'unitCharged',
  'unitExhausted', 'powerChanged', 'stateReleased', 'matchEnded',
]);

/**
 * Zones whose contents either player may read.
 *
 * Deliberately short. `exile` is not here because a card can be exiled face
 * down, and `codex` is not because only the active one is turned up — a public
 * event naming a reserve Codex would be telling the opponent what you can
 * switch to.
 */
const OPEN_ZONES: ReadonlySet<Zone> = new Set<Zone>([
  'ally', 'persona', 'grave', 'check',
]);

/**
 * Throw if a public event names a card neither player should be able to name.
 *
 * Called from a test that walks entire games rather than from the hot path.
 */
export function assertPublicSafe(
  e: DuelEvent,
  zoneOf: (uid: string) => Zone | null,
): void {
  if (e.visibility !== 'public') return;
  if (REVEALING.has(e.type)) return;
  for (const uid of [...e.sourceUids, ...e.targetUids]) {
    const z = zoneOf(uid);
    if (z && !OPEN_ZONES.has(z)) {
      throw new Error(
        `public ${e.type} event #${e.id} names ${uid}, which is in ${z}`,
      );
    }
  }
  for (const m of e.movements ?? []) {
    const closed = !OPEN_ZONES.has(m.from) && !OPEN_ZONES.has(m.to);
    if (closed && !m.hidden) {
      throw new Error(
        `public ${e.type} event #${e.id} moves ${m.uid} from ${m.from} to `
        + `${m.to} without marking it hidden`,
      );
    }
  }
}

/** Narrow helper so call sites read as prose. */
export function you(p: PlayerId | null, viewer: PlayerId): string {
  if (p === null) return 'The game';
  return p === viewer ? 'You' : 'Opponent';
}

/** The event log on a state, created on demand for states built before this. */
export function eventLogOf(game: GameState): DuelEventLog {
  const g = game as GameState & { duel?: DuelEventLog };
  if (!g.duel) g.duel = newEventLog();
  return g.duel;
}
