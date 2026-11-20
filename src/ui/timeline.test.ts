/**
 * The history view, checked as data.
 *
 * The one that matters is the leak: the timeline filters by viewer BEFORE it
 * groups, so an opponent's private draw cannot arrive as a child line under a
 * public action. Grouping first and filtering the display later is the obvious
 * implementation and it is the wrong one.
 *
 * The rest is shape — a turn and phase heading breaks where a player would
 * expect, one action reads as one entry, and Last Action opens on something.
 */
import { describe, it, expect } from 'vitest';
import { buildTimeline, cardsIn, changesIn, entryForGroup, linesFor } from './timeline.js';
import type { DuelEvent, DuelEventType, DuelVisibility } from '../core/events.js';
import type { Phase } from '../core/types.js';

let seq = 0;
function ev(
  type: DuelEventType,
  over: Partial<DuelEvent> = {},
): DuelEvent {
  return {
    id: ++seq, group: 1, turn: 1, phase: 'main' as Phase, actor: 0, type,
    sourceUids: [], targetUids: [], visibility: 'public' as DuelVisibility,
    message: `${type}`, ...over,
  };
}

describe('history never shows what it should not', () => {
  it('drops the opponent’s private events', () => {
    const events = [
      ev('cardCalled', { group: 1, actor: 1, sourceUids: ['x'] }),
      ev('cardDrawn', { group: 1, actor: 1, visibility: 'owner', sourceUids: ['secret'] }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    const all = t.blocks.flatMap((b) => b.entries)
      .flatMap((e) => [e.head, ...e.children]);
    expect(all.some((e) => e.sourceUids.includes('secret')),
      'a private draw reached the other player').toBe(false);
  });

  it('keeps your own private events', () => {
    const events = [ev('cardDrawn', { actor: 0, visibility: 'owner', sourceUids: ['mine'] })];
    const t = buildTimeline(events, { viewer: 0, verbose: true });
    const all = t.blocks.flatMap((b) => b.entries).flatMap((e) => [e.head, ...e.children]);
    expect(all.some((e) => e.sourceUids.includes('mine'))).toBe(true);
  });

  it('omits a hidden movement from the cards it offers to highlight', () => {
    const entry = {
      head: ev('cardCalled'),
      children: [ev('cardMoved', {
        movements: [{ uid: 'hidden-one', from: 'deck' as const, to: 'hand' as const, owner: 0, hidden: true }],
      })],
      group: 1,
    };
    expect(cardsIn(entry)).not.toContain('hidden-one');
  });

  it('does not drop a group entirely just because part of it is private', () => {
    const events = [
      ev('cardCalled', { group: 2, sourceUids: ['pub'] }),
      ev('cardDrawn', { group: 2, actor: 1, visibility: 'owner' }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    expect(t.blocks[0]!.entries[0]!.head.sourceUids).toEqual(['pub']);
  });
});

describe('one action reads as one entry', () => {
  it('nests the cascade under the thing that started it', () => {
    const events = [
      ev('cardCalled', { group: 5, sourceUids: ['salik'] }),
      ev('abilityActivated', { group: 5, sourceUids: ['salik'] }),
      ev('costPaid', { group: 5, sourceUids: ['rinayung'], message: 'Rinayung was Offered.' }),
      ev('abilityResolved', { group: 5, sourceUids: ['salik'] }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    const entries = t.blocks.flatMap((b) => b.entries);
    expect(entries.length, 'one click should be one entry').toBe(1);
    expect(entries[0]!.head.type).toBe('cardCalled');
    expect(entries[0]!.children.length).toBe(3);
  });

  it('labels the cost line as a cost', () => {
    const entry = {
      head: ev('abilityActivated', { message: 'Datu Salik activated Warcaller.' }),
      children: [ev('costPaid', { message: 'Rinayung was Offered.', sourceUids: ['r'] })],
      group: 1,
    };
    const lines = linesFor(entry);
    expect(lines[0]!.kind).toBe('action');
    expect(lines[1]!.kind).toBe('cost');
    expect(lines[1]!.text).toBe('Cost: Rinayung was Offered.');
  });

  it('prefers a result’s own wording over the raw message', () => {
    const entry = {
      head: ev('attackDeclared'),
      children: [ev('attackResolved', {
        message: 'raw', result: { outcome: 'stopped', detail: 'The attack was stopped.' },
      })],
      group: 1,
    };
    expect(linesFor(entry)[1]!.text).toBe('The attack was stopped.');
  });

  it('collects the numbers that moved', () => {
    const entry = {
      head: ev('abilityActivated'),
      children: [ev('powerChanged', {
        changes: [{ what: 'power', uid: 'sabir', from: 9000, to: 12000 }],
      })],
      group: 1,
    };
    expect(changesIn(entry)).toEqual([
      { what: 'power', uid: 'sabir', from: 9000, to: 12000 },
    ]);
  });
});

describe('blocks break where a player remembers them breaking', () => {
  it('starts a new block on a phase change', () => {
    const events = [
      ev('cardCalled', { group: 1, turn: 4, phase: 'main' }),
      ev('attackDeclared', { group: 2, turn: 4, phase: 'battle' }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    expect(t.blocks.map((b) => b.label))
      .toEqual(['Turn 4 · Main Phase', 'Turn 4 · Battle Phase']);
  });

  it('starts a new block on a new turn', () => {
    const events = [
      ev('cardCalled', { group: 1, turn: 4, phase: 'main' }),
      ev('cardCalled', { group: 2, turn: 5, phase: 'main' }),
    ];
    expect(buildTimeline(events, { viewer: 0 }).blocks.length).toBe(2);
  });

  it('keeps several actions from one phase together', () => {
    const events = [
      ev('cardCalled', { group: 1, turn: 4, phase: 'main' }),
      ev('cardPlayed', { group: 2, turn: 4, phase: 'main' }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    expect(t.blocks.length).toBe(1);
    expect(t.blocks[0]!.entries.length).toBe(2);
  });
});

describe('the reading order can be flipped', () => {
  it('puts the newest first when asked', () => {
    const events = [
      ev('cardCalled', { group: 1, turn: 1, phase: 'main' }),
      ev('attackDeclared', { group: 2, turn: 2, phase: 'battle' }),
    ];
    const latest = buildTimeline(events, { viewer: 0, order: 'latest' });
    expect(latest.blocks[0]!.turn).toBe(2);
    const chrono = buildTimeline(events, { viewer: 0, order: 'chronological' });
    expect(chrono.blocks[0]!.turn).toBe(1);
  });

  it('points Last Action at the newest group either way', () => {
    const events = [
      ev('cardCalled', { group: 1, turn: 1 }),
      ev('attackDeclared', { group: 7, turn: 2, phase: 'battle' }),
    ];
    for (const order of ['latest', 'chronological'] as const) {
      expect(buildTimeline(events, { viewer: 0, order }).latestGroup).toBe(7);
    }
  });
});

describe('Last Action opens on something, or is not offered', () => {
  it('returns the whole group', () => {
    const events = [
      ev('cardCalled', { group: 3, sourceUids: ['a'] }),
      ev('costPaid', { group: 3, sourceUids: ['b'] }),
    ];
    const entry = entryForGroup(events, 3, 0)!;
    expect(entry.head.type).toBe('cardCalled');
    expect(entry.children.length).toBe(1);
  });

  it('returns null when the viewer may see none of it', () => {
    const events = [ev('cardDrawn', { group: 3, actor: 1, visibility: 'owner' })];
    expect(entryForGroup(events, 3, 0), 'the button should be disabled, not empty')
      .toBeNull();
  });

  it('applies the same filter the summary does', () => {
    // Found in the browser: Last Action was printing "c81 moved from deck to
    // check" — a raw instance id, in a sentence written for the machine, in
    // the one place a confused player goes to find out what happened.
    // `entryForGroup` was not filtering what `buildTimeline` filters.
    const events = [
      ev('attackDeclared', { group: 4, sourceUids: ['pah'] }),
      ev('cardMoved', {
        group: 4, message: 'A card moved from deck to check.',
        movements: [{ uid: 'c81', from: 'deck', to: 'check', owner: 0 }],
      }),
      ev('barrierBroken', { group: 4, result: { outcome: 'broken', detail: '4 of 5 left.' } }),
    ];
    const entry = entryForGroup(events, 4, 0)!;
    const text = linesFor(entry).map((l) => l.text).join(' ');
    expect(text, 'a raw uid reached the player').not.toMatch(/c\d+/);
    expect(text, 'the result still has to be there').toContain('4 of 5 left.');
  });

  it('shows the movements when explicitly asked', () => {
    const events = [
      ev('attackDeclared', { group: 4 }),
      ev('cardMoved', { group: 4, movements: [{ uid: 'c81', from: 'deck', to: 'check', owner: 0 }] }),
    ];
    expect(entryForGroup(events, 4, 0, { verbose: true })!.children.length).toBe(1);
  });

  it('returns null for a group that does not exist', () => {
    expect(entryForGroup([], 99, 0)).toBeNull();
  });
});

describe('the noise stays out of the summary', () => {
  it('does not list every zone change as its own line', () => {
    const events = [
      ev('cardCalled', { group: 1, sourceUids: ['a'] }),
      ev('cardMoved', { group: 1, movements: [{ uid: 'a', from: 'hand', to: 'ally', owner: 0 }] }),
    ];
    const t = buildTimeline(events, { viewer: 0 });
    expect(t.blocks[0]!.entries[0]!.children.length,
      'the movement repeats what the call already said').toBe(0);
  });

  it('shows them when asked to', () => {
    const events = [
      ev('cardCalled', { group: 1 }),
      ev('cardMoved', { group: 1, movements: [{ uid: 'a', from: 'hand', to: 'ally', owner: 0 }] }),
    ];
    const t = buildTimeline(events, { viewer: 0, verbose: true });
    expect(t.blocks[0]!.entries[0]!.children.length).toBe(1);
  });

  it('does not draw an entry with nothing in it', () => {
    const events = [ev('phaseChanged', { group: 1 })];
    expect(buildTimeline(events, { viewer: 0 }).blocks.length).toBe(0);
  });
});
