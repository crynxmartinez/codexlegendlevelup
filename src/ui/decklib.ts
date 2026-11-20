/**
 * The player's decks.
 *
 * There are no accounts, so a deck lives in this browser and nowhere else —
 * the same choice `settings.ts` and `tutorial.ts` already made, for the same
 * reason. Nothing is transmitted, so no other player can see a deck, and
 * equally nothing can be recovered once it is gone. Two ways it goes:
 * "clear browsing data", and Safari, which deletes script-writable storage
 * after seven days without a visit. That is why `toCode` exists — a deck code
 * is the backup, the second device, and the way to hand a deck to a friend,
 * and it is the only one of those a browser cannot take away.
 */
import type { CardIndex } from '../core/state.js';
import type { DeckList } from '../core/setup.js';
import { repairDeck } from '../core/deckcheck.js';

/** A deck as stored: a decklist, plus what the library needs to list it. */
export interface StoredDeck extends DeckList {
  id: string;
  /** Which archetype's card pool it draws from — 'Agta', 'Maguindanao', … */
  archetype: string;
  /** Millis since epoch, for ordering the shelf. */
  updated: number;
}

const KEY = 'codex-legends.decks';
const ACTIVE_KEY = 'codex-legends.activeDeck';

/** Deck names stay short enough to fit every title and builder control. */
export const MAX_DECK_NAME_LENGTH = 9;

export function normalizeDeckName(name: string): string {
  return name.trim().slice(0, MAX_DECK_NAME_LENGTH) || 'Deck';
}

export function newDeckId(): string {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export type StorageResult = { ok: true } | { ok: false; message: string; saved?: boolean };
export type DeckCollection = { ok: true; decks: StoredDeck[]; raw: string | null; recovered: boolean; warning?: string }
  | { ok: false; decks: StoredDeck[]; message: string };

function storedDeck(value: unknown): value is StoredDeck {
  if (!value || typeof value !== 'object') return false;
  const d = value as StoredDeck;
  return typeof d.id === 'string' && !!d.id && typeof d.name === 'string' && typeof d.archetype === 'string'
    && typeof d.persona === 'string' && Array.isArray(d.main)
    && d.main.every(e => e && typeof e.id === 'string' && Number.isSafeInteger(e.copies) && e.copies > 0)
    && (d.codex === undefined || Array.isArray(d.codex) && d.codex.every(id => typeof id === 'string'));
}

/** Reads are non-destructive. Damage in one record cannot hide the other decks. */
export function readDeckCollection(index: CardIndex): DeckCollection {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); }
  catch { return { ok: false, decks: [], message: 'Saved decks could not be read. Storage may be blocked. Nothing was overwritten.' }; }
  if (raw === null) return { ok: true, decks: [], raw, recovered: false };
  let entries: unknown;
  try { entries = JSON.parse(raw); }
  catch { return { ok: false, decks: [], message: 'Saved deck data is damaged. The original data has been left untouched; saving is paused.' }; }
  if (!Array.isArray(entries)) return { ok: false, decks: [], message: 'Saved deck data is not a collection. The original data has been left untouched; saving is paused.' };
  const decks: StoredDeck[] = [], ids = new Set<string>();
  let recovered = false;
  for (const value of entries) {
    if (!storedDeck(value) || ids.has(value.id)) { recovered = true; continue; }
    ids.add(value.id);
    const { deck, dropped } = repairDeck(index, value);
    const name = normalizeDeckName(value.name);
    if (dropped.length || name !== value.name) recovered = true;
    decks.push({ ...value, ...deck, name, updated: Number.isFinite(value.updated) ? value.updated : 0 });
  }
  decks.sort((a,b) => b.updated-a.updated);
  return { ok: true, decks, raw, recovered, ...(recovered ? { warning: 'Some saved entries need recovery. Readable decks are shown. Original data will be backed up before any changes.' } : {}) };
}

/** Candidate-only compatibility read. Mutations use the explicit result above. */
export function loadDecks(index: CardIndex): StoredDeck[] { return readDeckCollection(index).decks; }

function preserveRecovery(collection: Extract<DeckCollection,{ok:true}>): StorageResult {
  if (!collection.recovered || collection.raw === null) return { ok: true };
  try {
    const prefix = `${KEY}.recovery.${Date.now()}`;
    let key = prefix, suffix = 0;
    while (localStorage.getItem(key) !== null) key = `${prefix}.${++suffix}`;
    localStorage.setItem(key, collection.raw);
    if (localStorage.getItem(key) !== collection.raw) throw new Error('Backup did not persist');
    return { ok: true };
  } catch { return { ok: false, message: 'The damaged deck data could not be backed up. Nothing was overwritten. Free storage or allow it, then retry.' }; }
}

function writeDecks(decks: StoredDeck[]): StorageResult {
  try { localStorage.setItem(KEY, JSON.stringify(decks)); return { ok: true }; }
  catch { return { ok: false, message: 'Could not save your decks. Storage may be full or blocked. Your edits are still here; retry after freeing storage.' }; }
}

export function saveDeck(index: CardIndex, deck: StoredDeck): StorageResult {
  if (!storedDeck(deck)) return { ok: false, saved: false, message: 'This deck has damaged entries and could not be saved.' };
  const collection = readDeckCollection(index);
  if (!collection.ok) return { ok: false, saved: false, message: collection.message };
  const backup = preserveRecovery(collection);
  if (!backup.ok) return { ...backup, saved: false };
  const decks = collection.decks.filter(d => d.id !== deck.id);
  decks.unshift({ ...deck, name: normalizeDeckName(deck.name), updated: Date.now() });
  const write = writeDecks(decks);
  if (!write.ok) return { ...write, saved: false };
  const active = setActiveDeck(deck.id);
  if (!active.ok) return { ok: false, saved: true, message: 'Your deck was saved, but could not be selected as active. Your edits remain here. Retry Save to select it.' };
  return { ok: true };
}

export function deleteDeck(index: CardIndex, id: string): StorageResult {
  const collection = readDeckCollection(index);
  if (!collection.ok) return { ok: false, message: collection.message };
  const backup = preserveRecovery(collection);
  if (!backup.ok) return backup;
  let active: string | null;
  try { active = localStorage.getItem(ACTIVE_KEY); }
  catch { return { ok: false, message: 'Could not read the active deck. Nothing was deleted.' }; }
  // Clear first so deletion cannot leave a dangling active id. Restore on failed write.
  if (active === id) { const cleared = clearActiveDeck(); if (!cleared.ok) return cleared; }
  const write = writeDecks(collection.decks.filter(d => d.id !== id));
  if (!write.ok && active === id) {
    const restored = setActiveDeck(id);
    if (!restored.ok) return { ok: false, message: 'Nothing was deleted, but active selection could not be restored. Select your saved deck again when storage is available.' };
  }
  return write;
}

export function activeDeckId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}
export function setActiveDeck(id: string): StorageResult {
  try {
    if (!['builtin:Agta','builtin:Babaylan','builtin:Maguindanao'].includes(id)) {
      const entries: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(entries) || !entries.some(d => storedDeck(d) && d.id === id)) return { ok: false, message: 'Save this deck successfully before selecting it.' };
    }
    localStorage.setItem(ACTIVE_KEY, id); return { ok: true };
  } catch { return { ok: false, message: 'Could not save the active deck selection. Your previous selection is unchanged. Retry when storage is available.' }; }
}
export function clearActiveDeck(): StorageResult {
  try { localStorage.removeItem(ACTIVE_KEY); return { ok: true }; }
  catch { return { ok: false, message: 'Could not clear the active deck. Nothing was deleted. Retry when storage is available.' }; }
}

// ------------------------------------------------------------- deck codes

/** Bumped if the shape below ever changes, so an old code can be recognised. */
const CODE_VERSION = 1;
const CODE_PREFIX = 'CL1-';

interface CodePayload {
  n: string;
  a: string;
  p: string;
  m: Array<[string, number]>;
  c: string[];
}

/** URL-safe base64 that survives being pasted into a chat window. */
function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64decode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * A deck as a string someone can paste.
 *
 * Card ids rather than indices into the card list. Indices would make a much
 * shorter code, and would also silently decode to the wrong cards the moment
 * a card is added and the list re-sorts. A long code that is always right
 * beats a short one that is quietly wrong.
 */
export function toCode(deck: DeckList & { archetype?: string }): string {
  const payload: CodePayload = {
    n: deck.name,
    a: deck.archetype ?? '',
    p: deck.persona,
    m: deck.main.map((e) => [e.id, e.copies]),
    c: deck.codex ?? [],
  };
  return CODE_PREFIX + b64encode(JSON.stringify(payload));
}

export interface DecodedDeck {
  deck: StoredDeck;
  /** Cards in the code that this version of the game does not have. */
  dropped: string[];
}

/** Read a pasted code, or explain why it is not one. */
export function fromCode(index: CardIndex, code: string): DecodedDeck | string {
  const trimmed = code.trim();
  if (!trimmed) return 'Paste a deck code first.';
  if (!trimmed.startsWith(CODE_PREFIX)) {
    return `That does not look like a deck code — they begin with ${CODE_PREFIX}.`;
  }
  let payload: CodePayload;
  try {
    payload = JSON.parse(b64decode(trimmed.slice(CODE_PREFIX.length))) as CodePayload;
  } catch {
    return 'That code is damaged — it may have been cut short when copied.';
  }
  if (!payload || typeof payload.n !== 'string' || typeof payload.a !== 'string' || typeof payload.p !== 'string'
    || !Array.isArray(payload.m) || !payload.m.every(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isSafeInteger(e[1]) && e[1] > 0)
    || !Array.isArray(payload.c) || !payload.c.every(id => typeof id === 'string')) {
    return 'That code is damaged — it may have been cut short when copied.';
  }

  const raw: StoredDeck = {
    id: newDeckId(),
    archetype: payload.a ?? '',
    name: normalizeDeckName(payload.n || 'Imported'),
    persona: payload.p ?? '',
    main: payload.m.map(([id, copies]) => ({ id, copies })),
    codex: payload.c ?? [],
    updated: Date.now(),
  };
  const { deck, dropped } = repairDeck(index, raw);
  return { deck: { ...raw, ...deck }, dropped };
}

export { CODE_VERSION };
