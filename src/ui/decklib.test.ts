/**
 * Deck codes.
 *
 * A code is the only copy of a deck a browser cannot take away, so it has to
 * survive the journey: pasted into a chat window, wrapped by an email client,
 * decoded by a build of the game that has different cards from the one that
 * wrote it. The round trip and the damaged-input cases are both worth pinning.
 *
 * `loadDecks`/`saveDeck` are not tested here — they are thin wrappers over
 * localStorage, which does not exist in this environment, and the interesting
 * logic they call (`repairDeck`) has its own tests in deckcheck.test.ts.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import type { DeckList } from '../core/setup.js';
import {
  MAX_DECK_NAME_LENGTH, fromCode, normalizeDeckName, toCode,
} from './decklib.js';
import { checkDeck } from '../core/deckcheck.js';

const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);
const AGTA = agtaDeck as unknown as DeckList;

it('a deck survives the round trip with a menu-safe name', () => {
  const code = toCode({ ...AGTA, archetype: 'Agta' });
  const result = fromCode(index, code);

  expect(typeof result).not.toBe('string');
  if (typeof result === 'string') throw new Error(result);

  expect(result.dropped).toEqual([]);
  expect(result.deck.name).toBe(normalizeDeckName(AGTA.name));
  expect(result.deck.name.length).toBeLessThanOrEqual(MAX_DECK_NAME_LENGTH);
  expect(result.deck.archetype).toBe('Agta');
  expect(result.deck.persona).toBe(AGTA.persona);
  expect(result.deck.main).toEqual(AGTA.main);
  expect(result.deck.codex).toEqual(AGTA.codex);
  // And it is still a legal deck at the other end.
  expect(checkDeck(index, result.deck)).toEqual([]);
});

it('limits custom names to nine characters and gives blank names a fallback', () => {
  expect(normalizeDeckName('  River Guard Company  ')).toBe('River Gua');
  expect(normalizeDeckName('     ')).toBe('Deck');
});

it('gives an imported deck its own id, so it cannot overwrite one', () => {
  const code = toCode({ ...AGTA, archetype: 'Agta' });
  const a = fromCode(index, code);
  const b = fromCode(index, code);
  if (typeof a === 'string' || typeof b === 'string') throw new Error('decode failed');
  expect(a.deck.id).not.toBe(b.deck.id);
});

it('survives surrounding whitespace from a copy-paste', () => {
  const code = `\n  ${toCode({ ...AGTA, archetype: 'Agta' })}  \n`;
  expect(typeof fromCode(index, code)).not.toBe('string');
});

it('produces a code with no characters that need escaping', () => {
  const code = toCode({ ...AGTA, archetype: 'Agta' });
  // URL-safe base64 plus the prefix: nothing here will be mangled by a chat
  // client, a query string, or a line-wrapping email.
  expect(code).toMatch(/^CL1-[A-Za-z0-9_-]+$/);
});

it('explains an empty, foreign, or truncated code rather than throwing', () => {
  expect(fromCode(index, '')).toContain('Paste a deck code');
  expect(fromCode(index, 'hello there')).toContain('begin with CL1-');
  expect(fromCode(index, 'CL1-not!valid!base64')).toContain('damaged');
  // Valid base64, but not a deck.
  expect(fromCode(index, 'CL1-eyJ4IjoxfQ')).toContain('damaged');
});

it('drops cards the current game no longer has, and names them', () => {
  const stale: DeckList & { archetype: string } = {
    ...AGTA,
    archetype: 'Agta',
    main: [...AGTA.main, { id: 'removed/ghost-card', copies: 3 }],
  };
  const result = fromCode(index, toCode(stale));
  if (typeof result === 'string') throw new Error(result);

  expect(result.dropped).toEqual(['removed/ghost-card']);
  expect(result.deck.main.some((e) => e.id === 'removed/ghost-card')).toBe(false);
});
