import { describe, expect, it } from 'vitest';
import { FrameJournal } from '../../tools/unity/frame-journal';

describe('native presentation journal', () => {
  it('retains intermediate frames in order and returns no duplicates after acknowledgement', () => {
    const j = new FrameJournal<{ revision: number }>();
    j.append({ revision: 1 });
    expect(j.read(0).entries.map(e => e.sequence)).toEqual([1]);
    j.append({ revision: 2 }); j.append({ revision: 3 });
    expect(j.read(1).entries.map(e => e.frame.revision)).toEqual([2, 3]);
    expect(j.read(3).entries).toEqual([]);
  });
  it('isolates stored snapshots and retry responses from mutations', () => {
    const j = new FrameJournal<{ hand: string[] }>();
    const frame = { hand: ['masked'] }; j.append(frame); frame.hand.push('later');
    const response = j.read(0); response.entries[0]!.frame.hand.push('mutated');
    expect(j.read(0).entries[0]!.frame.hand).toEqual(['masked']);
  });
  it('resynchronizes to the newest baseline when bounded history expires', () => {
    const j = new FrameJournal<number>(2);
    [1, 2, 3, 4].forEach(f => j.append(f));
    expect(j.read(1)).toEqual({ sequence: 4, resync: true, entries: [{ sequence: 4, frame: 4 }] });
    expect(j.read(2).entries.map(e => e.frame)).toEqual([3, 4]);
    expect(j.read(0).entries.map(e => e.frame)).toEqual([4]);
  });
  it('rejects invalid cursors', () => {
    const j = new FrameJournal<number>(); j.append(1);
    for (const n of [-1, 2, NaN, 0.5]) expect(() => j.read(n)).toThrow();
  });
});
