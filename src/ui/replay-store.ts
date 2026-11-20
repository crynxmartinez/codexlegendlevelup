/** Local-only saved matches. Writes are acknowledged after IndexedDB commits. */
import type { Replay } from '../core/replay.js';
import type { GameState } from '../core/types.js';
const KEY = 'codex-legends.replays.v1';
const DB = 'codex-legends.saved-games';
export interface ReplaySummary {
  id: string;
  decks: [string, string];
  personas?: [string, string];
  winner: 0 | 1 | null;
  reason: 'barrier' | 'deckout' | 'surrender' | null;
  turns: number;
  recordedAt: string;
  seconds?: number;
  pinned?: boolean;
  name?: string;
  videoId?: string;
  videoBytes?: number;
  /** Immutable match-start facts. Absent on legacy records; never infer them from today's profile. */
  mode?: 'ai' | 'pvp';
  viewer?: 0 | 1;
  players?: [{ nickname?: string; fighter?: string; region?: string }, { nickname?: string; fighter?: string; region?: string }];
}
export interface RecordedExchange { group: number; start: number; end: number; eventIds: number[] }
export interface LocalReplayCapture {
  version: 1;
  /** Exact post-setup snapshot avoids resetting the global card-instance counter. Private, completed AI games only. */
  initialState: GameState;
  initialHash: string;
  exchanges: RecordedExchange[];
  terminal?: { winner: 0 | 1; reason: 'surrender' };
}
export interface StoredReplay { summary: ReplaySummary; replay: Replay; localCapture?: LocalReplayCapture }
let database: IDBDatabase | null = null;
let cached: StoredReplay[] = [];
let initialized: Promise<void> | null = null;
let storageError: string | null = null;
export function replayStorageError(): string | null { return storageError; }
function valid(r: unknown): r is StoredReplay {
  const x = r as StoredReplay | null;
  return !!x?.summary?.id && !!x.replay?.header
    && Array.isArray(x.replay.steps) && Array.isArray(x.replay.choices);
}
function legacy(): StoredReplay[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('The existing saved-game library could not be read.');
  return rows.filter(valid);
}
function transaction(action: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) return reject(new Error('Local saved-game storage is unavailable.'));
    const tx = database.transaction('games', 'readwrite');
    tx.oncomplete = () => { resolve(); if (typeof location !== 'undefined' && location.protocol === 'codex:') window.dispatchEvent(new Event('codex-save-committed')); };
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Could not save on this device.'));
    action(tx.objectStore('games'));
  });
}
export function initReplayStore(): Promise<void> {
  if (initialized) return initialized;
  initialized = (async () => {
    try {
      database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB, 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'summary.id' });
          if (!db.objectStoreNames.contains('videos')) db.createObjectStore('videos', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('videoChunks')) {
            db.createObjectStore('videoChunks', { keyPath: ['id', 'sequence'] }).createIndex('videoId', 'id');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Close other game tabs and retry.'));
      });
      database.onversionchange = () => database?.close();
      cached = await new Promise<StoredReplay[]>((resolve, reject) => {
        const req = database!.transaction('games').objectStore('games').getAll();
        req.onsuccess = () => resolve(req.result.filter(valid));
        req.onerror = () => reject(req.error);
      });
      // Preserve the old file until all imported rows have committed. Never overwrite a newer save.
      const old = legacy().filter(r => !cached.some(x => x.summary.id === r.summary.id));
      if (old.length) {
        await transaction(store => { for (const row of old) store.put(row); });
        cached.push(...old);
      }
      localStorage.removeItem(KEY);
      storageError = null;
    } catch (err) {
      storageError = err instanceof Error ? err.message : 'Local storage is unavailable.';
      // Keep legacy records visible even when migration cannot run.
      try { for (const row of legacy()) if (!cached.some(x => x.summary.id === row.summary.id)) cached.push(row); } catch { /* original storage remains untouched */ }
    }
  })();
  return initialized;
}
export function loadReplays(): StoredReplay[] {
  return [...cached].sort((a,b) => Date.parse(b.summary.recordedAt) - Date.parse(a.summary.recordedAt));
}
export function findReplay(id: string): StoredReplay | null {
  return cached.find(r => r.summary.id === id) ?? null;
}
export async function saveReplay(entry: StoredReplay): Promise<boolean> {
  await initReplayStore();
  try {
    await transaction(store => store.put(entry));
    cached = [entry, ...cached.filter(r => r.summary.id !== entry.summary.id)];
    storageError = null;
    return true;
  } catch (err) { storageError = String(err); return false; }
}
export async function deleteReplay(id: string): Promise<boolean> {
  try {
    const videoId = findReplay(id)?.summary.videoId;
    await videoTransaction(['games', 'videos', 'videoChunks'], tx => {
      tx.objectStore('games').delete(id);
      if (videoId) deleteVideoInTransaction(tx, videoId);
    });
    cached = cached.filter(r => r.summary.id !== id);
    return true;
  } catch (err) { storageError = String(err); return false; }
}
export async function setPinned(id: string, pinned: boolean): Promise<boolean> {
  const row = findReplay(id);
  return row ? saveReplay({ ...row, summary: { ...row.summary, pinned } }) : false;
}
export async function clearReplays(): Promise<void> {
  await initReplayStore();
  await videoTransaction(['games', 'videos', 'videoChunks'], tx => {
    tx.objectStore('games').clear(); tx.objectStore('videos').clear(); tx.objectStore('videoChunks').clear();
  });
  cached = [];
}

export interface SavedVideo {
  id: string;
  mime: string;
  bytes: number;
  chunks: number;
  state: 'recording' | 'ready' | 'failed';
  createdAt: string;
}
function videoTransaction(stores: string[], action: (tx: IDBTransaction) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) return reject(new Error('Local video storage is unavailable.'));
    const tx = database.transaction(stores, 'readwrite');
    tx.oncomplete = () => { resolve(); if (typeof location !== 'undefined' && location.protocol === 'codex:') window.dispatchEvent(new Event('codex-save-committed')); };
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('The device could not store the video.'));
    action(tx);
  });
}
export async function putVideo(video: SavedVideo): Promise<void> {
  await initReplayStore();
  await videoTransaction(['videos'], tx => tx.objectStore('videos').put(video));
}
export async function putVideoChunk(id: string, sequence: number, data: Blob): Promise<void> {
  await videoTransaction(['videoChunks'], tx => tx.objectStore('videoChunks').put({ id, sequence, data }));
}
export async function loadVideo(id: string): Promise<Blob> {
  await initReplayStore();
  return new Promise((resolve, reject) => {
    if (!database) return reject(new Error('Local video storage is unavailable.'));
    const tx = database.transaction(['videos', 'videoChunks']);
    let video: SavedVideo | undefined;
    const parts: Blob[] = [];
    const metadata = tx.objectStore('videos').get(id);
    metadata.onsuccess = () => { video = metadata.result; };
    const cursor = tx.objectStore('videoChunks').index('videoId').openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      if (!cursor.result) return;
      const row = cursor.result.value as { sequence: number; data: Blob };
      parts[row.sequence] = row.data;
      cursor.result.continue();
    };
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      if (!video || video.state !== 'ready' || !video.chunks || parts.length !== video.chunks
        || Array.from({ length: video.chunks }, (_, i) => parts[i]).some(part => !part)) {
        reject(new Error('This video was not saved completely. The replay data is still available.')); return;
      }
      const blob = new Blob(parts, { type: video.mime });
      if (blob.size !== video.bytes) reject(new Error('Some video data is missing from this device.'));
      else resolve(blob);
    };
  });
}
function deleteVideoInTransaction(tx: IDBTransaction, id: string): void {
  tx.objectStore('videos').delete(id);
  const cursor = tx.objectStore('videoChunks').index('videoId').openCursor(IDBKeyRange.only(id));
  cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
}
export async function discardVideo(id: string): Promise<void> {
  await videoTransaction(['videos', 'videoChunks'], tx => deleteVideoInTransaction(tx, id));
}
/**
 * A new id.
 *
 * The timestamp alone is not enough and neither is a short random tail: two
 * ids minted in the same millisecond fall back entirely on the random part,
 * and with 1,296 values that collides about fifteen times in two hundred. A
 * collision here is not cosmetic — `saveReplay` treats a matching id as the
 * same duel and replaces it, so one import would quietly eat another.
 *
 * Eight base-36 characters is 2.8e12 values, which makes it a non-event.
 */
export function newReplayId(): string {
  let tail = '';
  for (let i = 0; i < 8; i++) {
    tail += Math.floor(Math.random() * 36).toString(36);
  }
  return `r${Date.now().toString(36)}${tail}`;
}

/** "3 minutes", "1 hour ago" — the row says when, not a timestamp. */
export function describeWhen(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'Date not recorded';
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(then).toLocaleDateString();
}

/** "12 turns · you won on Barriers" — one line, in the player's terms. */
export function describeResult(s: ReplaySummary, human: 0 | 1 | undefined = s.viewer): string {
  const turns = Number.isFinite(s.turns) ? `${s.turns} turn${s.turns === 1 ? '' : 's'}` : 'Turn count not recorded';
  if (s.winner === null) return `${turns} · unfinished`;
  if (human === undefined) return `${turns} · result perspective not recorded`;
  const won = s.winner === human;
  const how = s.reason === 'deckout' ? 'on cards'
    : s.reason === 'surrender' ? 'by surrender'
    : s.reason === 'barrier' ? 'on Barriers' : '(end reason not recorded)';
  return `${turns} · ${won ? 'won' : 'lost'} ${how}`;
}
