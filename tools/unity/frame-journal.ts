/** Bounded, viewer-masked presentation history for the local Unity adapter.
 * Store snapshots, not live references; never pass the raw engine state here. */
export class FrameJournal<T> {
  private sequence = 0;
  private entries: Array<{ sequence: number; frame: T }> = [];
  constructor(private readonly capacity = 128) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error('Invalid journal capacity');
  }
  append(frame: T): void {
    this.entries.push({ sequence: ++this.sequence, frame: structuredClone(frame) });
    if (this.entries.length > this.capacity) this.entries.shift();
  }
  read(after: number) {
    if (!Number.isSafeInteger(after) || after < 0 || after > this.sequence) throw new Error('Invalid presentation cursor');
    const resync = after > 0 && after < (this.entries[0]?.sequence ?? 1) - 1;
    // A new client or an expired cursor gets a baseline, never a partial replay.
    const entries = after === 0 || resync ? this.entries.slice(-1) : this.entries.filter(e => e.sequence > after);
    return structuredClone({ sequence: this.sequence, resync, entries });
  }
}
