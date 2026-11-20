/**
 * Deckbuilding rules in the client.
 *
 * The three decks that ship are the reference: whatever the rules say, they
 * have to call those legal, or the builder will refuse to load the very decks
 * it offers as starting points.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import type { DeckList } from './setup.js';
import { checkDeck, isLegal, repairDeck, deckSize, DECK_SIZE } from './deckcheck.js';
import { personaChoices } from './setup.js';

const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);
const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
  Babaylan: babaylanDeck as unknown as DeckList,
};

for (const [name, deck] of Object.entries(DECKS)) {
  it(`${name} as shipped is legal`, () => {
    expect(checkDeck(index, deck)).toEqual([]);
    expect(deckSize(deck)).toBe(DECK_SIZE);
  });
}

it('counts a deck that is short, and says how short', () => {
  const deck = structuredClone(DECKS.Agta!);
  deck.main[0]!.copies -= 2;
  deck.main = deck.main.filter(e => e.copies > 0);
  const problems = checkDeck(index, deck);
  expect(problems).toHaveLength(1);
  expect(problems[0]!.where).toBe('size');
  expect(problems[0]!.message).toContain('2 more to go');
});

it('reports every problem at once, not just the first', () => {
  const deck = structuredClone(DECKS.Agta!);
  deck.main[0]!.copies = 9;
  deck.codex = [deck.codex[0]!];
  const wheres = checkDeck(index, deck).map((p) => p.where);
  expect(wheres).toContain('copies');
  expect(wheres).toContain('codex');
  expect(wheres).toContain('size');
});

it('wants exactly five Codex, not three', () => {
  const deck = structuredClone(DECKS.Agta!);
  deck.codex = deck.codex.slice(0, 3);
  const codexProblem = checkDeck(index, deck).find((p) => p.where === 'codex');
  expect(codexProblem?.message).toContain('exactly 5');
});

it('wants exactly twelve Force, and says which way it is off', () => {
  const short = structuredClone(DECKS.Agta!);
  const force = short.main.find((e) => index[e.id]!.type === 'Force')!;
  force.copies -= 1;
  expect(checkDeck(index, short).find((p) => p.where === 'force')?.message)
    .toContain('1 short');

  const over = structuredClone(DECKS.Agta!);
  over.main.push({ id: force.id, copies: 1 });
  expect(checkDeck(index, over).find((p) => p.where === 'force')?.message)
    .toContain('too many');
});

it('needs at least one Level 3 Unit to lead the deck', () => {
  const deck = structuredClone(DECKS.Agta!);
  deck.main = deck.main.filter((e) => {
    const c = index[e.id]!;
    return !(c.type === 'Unit' && c.level === 3);
  });
  const problems = checkDeck(index, deck);
  expect(problems.some((p) => p.message.includes('No Level 3 Unit'))).toBe(true);
});

it('refuses a deck that mixes guilds', () => {
  const deck = structuredClone(DECKS.Agta!);
  const foreign = maguindanaoDeck.main[0]!.id;
  deck.main.push({ id: foreign, copies: 1 });
  expect(checkDeck(index, deck).some((p) => p.where === 'guild')).toBe(true);
});

it('does not care which Persona a deck names', () => {
  // Which Level 3 Unit leads is chosen at the top of a duel, after the dice,
  // so the same deck can open with a different one every game. A stale or
  // absent name on the decklist is not a reason to call the deck illegal.
  const deck = structuredClone(DECKS.Agta!);
  deck.persona = '';
  expect(checkDeck(index, deck)).toEqual([]);
  expect(isLegal(index, deck)).toBe(true);
});

it('repairs a deck that names cards which no longer exist', () => {
  const deck = structuredClone(DECKS.Agta!);
  deck.main.push({ id: 'deleted/old-card', copies: 2 });
  deck.codex.push('deleted/old-codex');

  const { deck: fixed, dropped } = repairDeck(index, deck);

  expect(dropped).toEqual(['deleted/old-card', 'deleted/old-codex']);
  expect(fixed.main.some((e) => e.id === 'deleted/old-card')).toBe(false);
  expect(fixed.codex).not.toContain('deleted/old-codex');
  // What survived is still the original, legal deck.
  expect(checkDeck(index, fixed)).toEqual([]);
});

it('offers each Level 3 Unit once, however many copies the deck runs', () => {
  const deck = structuredClone(DECKS.Agta!);
  const lv3 = deck.main.filter((e) => {
    const c = index[e.id]!;
    return c.type === 'Unit' && c.level === 3;
  });

  // Three distinct leaders at two copies apiece.
  expect(lv3).toHaveLength(3);
  expect(lv3.reduce((n, e) => n + e.copies, 0)).toBe(6);
  expect(personaChoices(index, deck)).toHaveLength(3);

  // And once more even if the decklist names one of them twice, which an
  // older deck code or a hand-edited store can do.
  deck.main.push({ id: lv3[0]!.id, copies: 1 });
  const choices = personaChoices(index, deck);
  expect(choices).toHaveLength(3);
  expect(new Set(choices).size).toBe(3);
});
