import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { REPLAY_FORMAT_VERSION, type Replay } from '../core/replay.js';
import type { StoredReplay } from './replay-store.js';
function fake(id: string, at: number, pinned = false): StoredReplay {
  const replay: Replay = {
    header: {
      formatVersion: REPLAY_FORMAT_VERSION,
      engineVersion: '1.3',
      seed: 1,
      decks: ['CODE-A', 'CODE-B'],
      deckNames: ['Agta', 'Babaylan'],
      setup: [{}, {}],
      firstPlayer: 0,
      visibility: 'private',
      recordedAt: new Date(at).toISOString(),
    },
    steps: [{ t: 'turn' }],
    choices: [],
    result: { winner: 0, reason: 'barrier', finalHash: 'h' },
  };
  return {
    summary: {
      id, decks: ['Agta', 'Babaylan'], winner: 0, reason: 'barrier',
      turns: 12, recordedAt: replay.header.recordedAt, pinned,
    },
    replay,
  };
}

let store: typeof import('./replay-store.js');
let values: Map<string, string>;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
  store = await import('./replay-store.js');
});
describe('local saved games', () => {
  it('keeps missing legacy dates, viewer seats and end reasons explicit', () => {
    const old = fake('legacy', 1).summary;
    expect(store.describeResult(old)).toContain('perspective not recorded');
    expect(store.describeWhen('not-a-date')).toBe('Date not recorded');
    old.viewer = 0; old.reason = null;
    expect(store.describeResult(old)).toContain('end reason not recorded');
    expect(store.describeResult(old)).not.toContain('Barriers');
  });
  it('acknowledges committed saves and preserves more than twenty games', async () => {
    for (let i = 0; i < 25; i++) expect(await store.saveReplay(fake(`r${i}`, i))).toBe(true);
    expect(store.loadReplays()).toHaveLength(25);
    expect(store.findReplay('r0')).not.toBeNull();
  });
  it('migrates legacy saves and keeps incompatible versions visible', async () => {
    const old = fake('old', 1000); old.replay.header.formatVersion--;
    values.set('codex-legends.replays.v1', JSON.stringify([old]));
    await store.initReplayStore();
    expect(store.findReplay('old')).toEqual(old);
    expect(values.has('codex-legends.replays.v1')).toBe(false);
    vi.resetModules();
    const reopened = await import('./replay-store.js');
    await reopened.initReplayStore();
    expect(reopened.findReplay('old')).toEqual(old);
  });
  it('does not duplicate repeated saves', async () => {
    await store.saveReplay(fake('same', 1));
    await store.saveReplay(fake('same', 2));
    expect(store.loadReplays()).toHaveLength(1);
    expect(store.findReplay('same')!.summary.recordedAt).toBe(new Date(2).toISOString());
  });
  it('keeps the original library if migration fails', async () => {
    values.set('codex-legends.replays.v1', JSON.stringify([fake('safe', 1)]));
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('Storage denied'); } });
    await store.initReplayStore();
    expect(store.findReplay('safe')).not.toBeNull();
    expect(values.has('codex-legends.replays.v1')).toBe(true);
    expect(await store.saveReplay(fake('new', 2))).toBe(false);
  });
  it('deletes only the selected game', async () => {
    await store.saveReplay(fake('keep', 1)); await store.saveReplay(fake('delete', 2));
    expect(await store.deleteReplay('delete')).toBe(true);
    expect(store.loadReplays().map(r => r.summary.id)).toEqual(['keep']);
  });
});


describe('prepared MP4 storage', () => {
  it('assembles committed chunks in order without encoding again', async () => {
    await store.putVideo({ id: 'video', mime: 'video/mp4', bytes: 6, chunks: 2, state: 'ready', createdAt: new Date().toISOString() });
    await store.putVideoChunk('video', 1, new Blob(['def']));
    await store.putVideoChunk('video', 0, new Blob(['abc']));
    const video = await store.loadVideo('video');
    expect(video.type).toBe('video/mp4'); expect(await video.text()).toBe('abcdef');
  });
  it('refuses a video with a missing segment', async () => {
    await store.putVideo({ id: 'broken', mime: 'video/mp4', bytes: 6, chunks: 2, state: 'ready', createdAt: new Date().toISOString() });
    await store.putVideoChunk('broken', 1, new Blob(['def']));
    await expect(store.loadVideo('broken')).rejects.toThrow('not saved completely');
  });
  it('deletes the video with its selected saved match, preserving others', async () => {
    for (const id of ['one', 'two']) {
      await store.putVideo({ id, mime: 'video/mp4', bytes: 3, chunks: 1, state: 'ready', createdAt: new Date().toISOString() });
      await store.putVideoChunk(id, 0, new Blob(['abc']));
      const match = fake(id, 1); match.summary.videoId = id; await store.saveReplay(match);
    }
    expect(await store.deleteReplay('one')).toBe(true);
    await expect(store.loadVideo('one')).rejects.toThrow();
    expect((await store.loadVideo('two')).size).toBe(3);
  });
});
