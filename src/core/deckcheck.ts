/**
 * Deckbuilding rules, in the client.
 *
 * These have existed as `tools/validate_deck.py` since the decks were written
 * by hand, which was the right place for them while a deck was a file someone
 * committed. A player building a deck in the browser cannot run a Python
 * script, and finding out a deck is illegal when the duel refuses to start is
 * the worst possible moment to be told.
 *
 * Same numbers, same failures, phrased for someone who is mid-build rather
 * than mid-commit: every problem says what is wrong and by how much, so the
 * builder can show it beside the thing that caused it.
 */
import type { CardIndex } from './state.js';
import type { DeckList } from './setup.js';

export const DECK_SIZE = 50;
export const MAX_COPIES = 3;
/** Exactly twelve, not up to twelve. */
export const FORCE_COUNT = 12;
export const MAX_SENTRY = 3;
/** Exactly five, not three to five. */
export const CODEX_COUNT = 5;
/** Cards whose own text overrides the copy limit. */
export const COPY_OVERRIDE: Record<string, number> = {};

/** The level a starting Persona must be. Mirrors setup.ts. */
export const PERSONA_LEVEL = 3;
/**
 * A deck needs someone who can lead it.
 *
 * The Persona is chosen at the start of a duel from the Level 3 Units in the
 * deck, so a deck with none of them has nobody to start as.
 */
export const MIN_LEVEL_3 = 1;

export interface DeckProblem {
  /** Which part of the builder should show this. */
  where: 'size' | 'copies' | 'force' | 'sentry' | 'codex' | 'guild' | 'persona' | 'card';
  message: string;
  /** The card this is about, when it is about one. */
  cardId?: string;
}

/** How many cards a deck holds, counting copies. */
export function deckSize(deck: DeckList): number {
  return deck.main.reduce((n, e) => n + e.copies, 0);
}

/** The copy limit for one card. */
export function copyLimit(cardId: string): number {
  return COPY_OVERRIDE[cardId] ?? MAX_COPIES;
}

/**
 * Everything wrong with a deck, in the order a builder should surface it.
 *
 * Returns an empty array for a legal deck. Deliberately reports *all* the
 * problems rather than the first: someone two cards over the limit and
 * missing a Codex wants to see both, not to fix one and be told about the
 * other afterwards.
 */
export function checkDeck(index: CardIndex, deck: DeckList): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const guilds = new Set<string>();
  const typeCounts: Record<string, number> = {};
  const seen = new Set<string>();

  for (const entry of deck.main) {
    if (!Number.isInteger(entry.copies) || entry.copies <= 0) {
      problems.push({ where: 'copies', cardId: entry.id, message: `${entry.id}: copies must be a positive integer.` });
    }
    if (seen.has(entry.id)) {
      problems.push({ where: 'copies', cardId: entry.id, message: `${entry.id}: duplicate deck entry; combine its copies.` });
    }
    seen.add(entry.id);
    const card = index[entry.id];
    if (!card) {
      problems.push({
        where: 'card', cardId: entry.id,
        message: `${entry.id} is not a card any more.`,
      });
      continue;
    }
    if (card.type === 'Codex' || card.type === 'Token') {
      problems.push({
        where: 'card', cardId: entry.id,
        message: `${card.name} is a ${card.type} — it cannot be in the main deck.`,
      });
      continue;
    }
    const cap = card.maxCopies ?? copyLimit(entry.id);
    if (entry.copies > cap) {
      problems.push({
        where: 'copies', cardId: entry.id,
        message: `${entry.copies} copies of ${card.name} — the limit is ${cap}.`,
      });
    }
    if (card.guild) guilds.add(card.guild);
    typeCounts[card.type] = (typeCounts[card.type] ?? 0) + entry.copies;
  }

  const total = deckSize(deck);
  if (total !== DECK_SIZE) {
    const off = total - DECK_SIZE;
    problems.push({
      where: 'size',
      message: off > 0
        ? `${total} cards — ${off} too many.`
        : `${total} cards — ${-off} more to go.`,
    });
  }

  const force = typeCounts['Force'] ?? 0;
  if (force !== FORCE_COUNT) {
    const off = force - FORCE_COUNT;
    problems.push({
      where: 'force',
      message: off > 0
        ? `${force} Force — ${off} too many, a deck runs exactly ${FORCE_COUNT}.`
        : `${force} Force — ${-off} short of the ${FORCE_COUNT} a deck runs.`,
    });
  }
  const sentry = typeCounts['Sentry'] ?? 0;
  if (sentry > MAX_SENTRY) {
    problems.push({
      where: 'sentry',
      message: `${sentry} Sentry cards — the limit is ${MAX_SENTRY}.`,
    });
  }

  if (guilds.size > 1) {
    problems.push({
      where: 'guild',
      message: `A deck is one guild: this mixes ${[...guilds].sort().join(' and ')}.`,
    });
  }

  // --- Codex -----------------------------------------------------------
  const codex = deck.codex ?? [];
  if (codex.length !== CODEX_COUNT) {
    problems.push({
      where: 'codex',
      message: `${codex.length} Codex — a deck carries exactly ${CODEX_COUNT}.`,
    });
  }
  if (new Set(codex).size !== codex.length) {
    problems.push({ where: 'codex', message: 'Codex cards must all be different.' });
  }
  for (const id of codex) {
    const card = index[id];
    if (!card) {
      problems.push({
        where: 'codex', cardId: id,
        message: `${id} is not a card any more.`,
      });
    } else if (card.type !== 'Codex') {
      problems.push({
        where: 'codex', cardId: id,
        message: `${card.name} is not a Codex card.`,
      });
    }
  }

  // --- Someone to lead it ----------------------------------------------
  // Which Level 3 Unit starts as the Persona is a decision made at the top of
  // a duel, after the dice, not while building — the same deck can open with
  // a different one every game. What a deck owes is that there is someone to
  // pick.
  const level3 = deck.main.filter((e) => {
    const c = index[e.id];
    return c?.type === 'Unit' && c.level === PERSONA_LEVEL;
  }).length;
  if (level3 < MIN_LEVEL_3) {
    problems.push({
      where: 'persona',
      message: `No Level ${PERSONA_LEVEL} Unit — a deck needs at least `
        + `${MIN_LEVEL_3} to have someone to start as Persona.`,
    });
  }

  return problems;
}

export function isLegal(index: CardIndex, deck: DeckList): boolean {
  return checkDeck(index, deck).length === 0;
}

/**
 * Drop anything the current card set no longer has.
 *
 * A saved deck stores card ids, and cards do get removed — 229 of them were
 * deleted from this game in one go. A deck saved before that would name cards
 * that do not exist, and every consumer downstream assumes `index[id]` is
 * there. Repairing on load, and saying what was lost, is the difference
 * between a deck that needs two cards replacing and a screen that throws.
 */
export function repairDeck(
  index: CardIndex,
  deck: DeckList,
): { deck: DeckList; dropped: string[] } {
  const dropped: string[] = [];
  const main = deck.main.filter((e) => {
    if (index[e.id]) return true;
    dropped.push(e.id);
    return false;
  });
  const codex = (deck.codex ?? []).filter((id) => {
    if (index[id]) return true;
    dropped.push(id);
    return false;
  });
  const persona = deck.persona && index[deck.persona] ? deck.persona : '';
  if (deck.persona && !persona) dropped.push(deck.persona);
  return { deck: { ...deck, main, codex, persona }, dropped };
}
