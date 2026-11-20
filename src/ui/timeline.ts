/**
 * The duel record, arranged the way someone would ask about it.
 *
 * Nobody wants a flat list of forty lines. They want "what did that do?" —
 * which is a turn, a phase, the action that started it, and everything that
 * cascaded out of it, nested underneath. The structured events already carry
 * the grouping; this turns them into that shape.
 *
 * Built as pure data so it can be tested without a board. The DOM layer takes
 * a `Timeline` and draws it; it makes no decisions about what belongs where.
 *
 * Two rules it inherits from the event model and must not weaken:
 *
 *  - It only ever shows a viewer what they may see. `forViewer` filters before
 *    grouping, so a hidden draw cannot leak in through a summary line.
 *  - It never mutates. Reviewing history is reading, and a history view that
 *    can change the duel is a duplicate source of truth waiting to disagree.
 */
import { canSee, type DuelEvent, type DuelEventType } from '../core/events.js';
import type { Phase, PlayerId } from '../core/types.js';

/** One thing that happened, with whatever it caused nested underneath. */
export interface TimelineEntry {
  /** The event that started this group. */
  head: DuelEvent;
  /** Everything else in the group, in order. */
  children: DuelEvent[];
  group: number;
}

/** A run of entries that share a turn and a phase. */
export interface TimelineBlock {
  turn: number;
  phase: Phase;
  /** "TURN 4 · MAIN PHASE" */
  label: string;
  entries: TimelineEntry[];
}

export interface Timeline {
  blocks: TimelineBlock[];
  /** Newest group first, for the Last Action button. */
  latestGroup: number | null;
}

const PHASE_LABEL: Record<Phase, string> = {
  start: 'Draw Phase',
  personify: 'Personify Phase',
  main: 'Main Phase',
  battle: 'Battle Phase',
  end: 'End Phase',
};

/**
 * Events that are noise in a summary.
 *
 * `cardMoved` is emitted for every single zone change, which is right for
 * animation and wrong for reading — a call already says a card was called, and
 * repeating "it moved from hand to ally" underneath it is the machine talking
 * to itself. The movements are still on the event for the detail panel.
 */
const QUIET: ReadonlySet<DuelEventType> = new Set(['cardMoved', 'phaseChanged']);

/**
 * Which event should head a group.
 *
 * The first non-quiet one, because that is the thing the player did. Falling
 * back to the first of any kind means a group made entirely of movements still
 * appears rather than vanishing.
 */
function headOf(group: DuelEvent[]): DuelEvent {
  return group.find((e) => !QUIET.has(e.type)) ?? group[0]!;
}

export interface TimelineOptions {
  /** Only events this player may see are included. */
  viewer: PlayerId;
  /** Newest first, or in the order they happened. */
  order?: 'latest' | 'chronological';
  /** Include the per-movement events. Off by default; see QUIET. */
  verbose?: boolean;
}

/**
 * Group a duel's events into turns, phases and actions.
 *
 * Blocks break on a change of turn or phase, so a turn that goes Main then
 * Battle produces two headings — which is how a player remembers it.
 */
export function buildTimeline(
  events: readonly DuelEvent[],
  opts: TimelineOptions,
): Timeline {
  const visible = events.filter((e) => canSee(e, opts.viewer));

  // Group, preserving order. Groups are contiguous in a real duel, but this
  // does not rely on that: a Map keyed by group survives interleaving.
  const groups = new Map<number, DuelEvent[]>();
  for (const e of visible) {
    const g = groups.get(e.group);
    if (g) g.push(e);
    else groups.set(e.group, [e]);
  }

  const blocks: TimelineBlock[] = [];
  for (const [group, all] of groups) {
    const head = headOf(all);
    const body = all.filter((e) => e !== head && (opts.verbose || !QUIET.has(e.type)));
    // A group with nothing worth showing is dropped rather than drawn empty.
    if (QUIET.has(head.type) && body.length === 0 && !opts.verbose) continue;

    const entry: TimelineEntry = { head, children: body, group };
    const last = blocks[blocks.length - 1];
    if (last && last.turn === head.turn && last.phase === head.phase) {
      last.entries.push(entry);
    } else {
      blocks.push({
        turn: head.turn,
        phase: head.phase,
        label: `Turn ${head.turn} · ${PHASE_LABEL[head.phase]}`,
        entries: [entry],
      });
    }
  }

  const latestGroup = blocks.length
    ? blocks[blocks.length - 1]!.entries[blocks[blocks.length - 1]!.entries.length - 1]!.group
    : null;

  if (opts.order === 'latest') {
    blocks.reverse();
    for (const b of blocks) b.entries.reverse();
  }

  return { blocks, latestGroup };
}

/**
 * Everything one action did, for the Last Action panel.
 *
 * Returns null rather than an empty entry when the group has nothing this
 * viewer may see — the button should be disabled, not open on nothing.
 */
export function entryForGroup(
  events: readonly DuelEvent[],
  group: number,
  viewer: PlayerId,
  opts: { verbose?: boolean } = {},
): TimelineEntry | null {
  const all = events.filter((e) => e.group === group && canSee(e, viewer));
  if (!all.length) return null;
  const head = headOf(all);
  // The same filter `buildTimeline` applies, and for the same reason. Leaving
  // it out here put lines like "c81 moved from deck to check" into the Last
  // Action panel: a raw instance id, in a sentence written for the machine,
  // in the one place a confused player goes to find out what happened.
  const children = all.filter(
    (e) => e !== head && (opts.verbose || !QUIET.has(e.type)),
  );
  return { head, children, group };
}

/**
 * The lines one entry should read as.
 *
 * Cost, target and result are pulled out and labelled rather than left in the
 * prose, because "Cost: Rinayung was Offered" scans and a paragraph does not.
 */
export interface EntryLine {
  kind: 'action' | 'cost' | 'target' | 'result' | 'detail';
  text: string;
  uids: string[];
}

export function linesFor(entry: TimelineEntry): EntryLine[] {
  const out: EntryLine[] = [];
  out.push({
    kind: 'action',
    text: entry.head.message,
    uids: [...entry.head.sourceUids, ...entry.head.targetUids],
  });
  for (const e of entry.children) {
    if (e.type === 'costPaid') {
      out.push({ kind: 'cost', text: `Cost: ${e.message}`, uids: e.sourceUids });
    } else if (e.result) {
      out.push({
        kind: 'result',
        text: e.result.detail ?? e.message,
        uids: [...e.sourceUids, ...e.targetUids],
      });
    } else {
      out.push({
        kind: 'detail',
        text: e.message,
        uids: [...e.sourceUids, ...e.targetUids],
      });
    }
  }
  return out;
}

/**
 * Every card an entry touched, for highlighting what is still on the field.
 *
 * Deduplicated and in first-seen order, so the detail panel shows the source
 * before the things it affected.
 */
export function cardsIn(entry: TimelineEntry): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [entry.head, ...entry.children]) {
    for (const uid of [...e.sourceUids, ...e.targetUids]) {
      if (!seen.has(uid)) { seen.add(uid); out.push(uid); }
    }
    for (const m of e.movements ?? []) {
      if (!m.hidden && !seen.has(m.uid)) { seen.add(m.uid); out.push(m.uid); }
    }
  }
  return out;
}

/** Every value that changed in this entry, for the detail panel. */
export function changesIn(entry: TimelineEntry): Array<{ what: string; from: number; to: number; uid?: string }> {
  const out: Array<{ what: string; from: number; to: number; uid?: string }> = [];
  for (const e of [entry.head, ...entry.children]) {
    for (const c of e.changes ?? []) {
      out.push({ what: c.what, from: c.from, to: c.to, ...(c.uid ? { uid: c.uid } : {}) });
    }
  }
  return out;
}
