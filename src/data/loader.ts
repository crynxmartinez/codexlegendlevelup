/**
 * Load the retained card catalogue plus Set 1. cards.json is maintained directly;
 * tools/import-set-1.mjs generates set-1.json from reviewed content/set-1.json.
 * Historical spreadsheet generators are archived and must not overwrite either.
 */
import raw from './cards.json' with { type: 'json' };
import setOne from './set-1.json' with { type: 'json' };
import animeArt from './card-art-v2.json' with { type: 'json' };
import skills from '../../content/maguindanao-set-1-skills.json' with { type: 'json' };
import babaylanSkills from '../../content/babaylan-set-1-skills.json' with { type: 'json' };
import { AGTA_SET_ONE_RULES } from '../cards/agta-set-1.js';
import type { CardDef, CardType, Guild } from '../core/types.js';
import type { CardIndex } from '../core/state.js';

/** A card record as it appears in cards.json. */
export interface CardRecord extends CardDef {
  set?: 'set-1';
  archipelago?: 'Luzon' | 'Visayas' | 'Mindanao';
  effectsPending?: boolean;
  hidden?: boolean;
  deck: string;
  text: string;
  flavor: string;
  artist: string | null;
  art: string;
  thumb: string;
  /** Guild as literally printed on the art. */
  guildPrinted: string;
}

const records = [...raw, ...setOne].map(c => {
  // Creature kind and deck identity coexist: Birds, Beasts and Divines from
  // Maguindanao still qualify for its Grave count and tribal card effects.
  if (c.deck === 'Maguindanao' && !c.subtypes.some(s => s === 'Maguindanaon' || s === 'Maguindanao')) {
    c = { ...c, subtypes: [...c.subtypes, 'Maguindanaon'] };
  }
  if (c.id === 'agta/sierra-watchkeeper-banoy') {
    return { ...c, text: '[yellow][Sentry] When your Persona is attacked, reveal this card and exile it face down to nullify that attack. Then Sipol 1.[/yellow]', set: 'set-1', archipelago: 'Luzon', effectsPending: false,
      subtypes: [...new Set([...c.subtypes, 'Luzon Arch'])] };
  }
  if (c.id === 'maguindanao/kuta-wato-oath-shield-panglima-sabir') {
    return { ...c, text: c.text.replace(/ and 1 Energy/gi, '').replace(/1 Energy and /gi, ''), set: 'set-1', archipelago: 'Mindanao', effectsPending: false,
      subtypes: [...new Set([...c.subtypes, 'Mindanao Arch'])] };
  }
  if (c.id === 'babaylan/warden-of-the-twelfth-tide-bituon') {
    return { ...c, text: '[yellow][Sentry] When your Persona is attacked, reveal this card and exile it face down to nullify that attack. Create 1 Kaluluwa in your Heart, or 2 if Andukha 9 is active when you activate this card.[/yellow]', set: 'set-1', archipelago: 'Visayas', effectsPending: false,
      subtypes: [...new Set([...c.subtypes, 'Visayas Arch'])] };
  }
  const proposal = ({ ...skills, ...babaylanSkills, ...AGTA_SET_ONE_RULES } as Record<string, { skill: string }>)[c.id];
  return proposal ? { ...c, text: proposal.skill, effectsPending: false,
    ...(c.id === 'maguindanao/set-1/ridge-bed-multiplier-omaka-an' ? { hidden: true } : {}),
    ...(c.type === 'Codex' ? { state: c.deck === 'Agta' ? 'Bayanihan' : c.deck === 'Babaylan' ? 'Andukha' : 'Garahana' } : {}) } : c;
}) as unknown as CardRecord[];

// Artwork replacements never promote hidden or retired cards into the roster.
for (const card of records) {
  if (!isSelectableCard(card) || !['Agta', 'Babaylan', 'Maguindanao'].includes(card.deck)) continue;
  const replacement = (animeArt as Record<string, { art: string; thumb: string }>)[card.id];
  if (replacement) Object.assign(card, replacement);
}

/** Keep retired printings resolvable for saved games, but hide them in selection. */
export function isSelectableCard(c: Pick<CardRecord, 'deck' | 'archipelago' | 'set' | 'hidden'>): boolean {
  return c.set === 'set-1' && !c.hidden;
}

/** Every card, keyed by id. */
export const ALL_CARDS: Record<string, CardRecord> = Object.fromEntries(
  records.map((c) => [c.id, c]),
);

/** Cards belonging to one archetype deck, e.g. 'Angel'. */
export function cardsForDeck(deck: string): CardRecord[] {
  return records.filter((c) => c.deck === deck);
}

/** A CardIndex restricted to one deck - what the MVP loads. */
export function indexForDeck(deck: string): CardIndex {
  return Object.fromEntries(cardsForDeck(deck).map((c) => [c.id, c as CardDef]));
}

/** A CardIndex covering multiple decks (for cross-deck games). */
export function indexForDecks(decks: string[]): CardIndex {
  return Object.fromEntries(
    decks.flatMap((d) => cardsForDeck(d)).map((c) => [c.id, c as CardDef]),
  );
}

export const FULL_INDEX: CardIndex = ALL_CARDS as unknown as CardIndex;

export function cardById(id: string): CardRecord {
  const c = ALL_CARDS[id];
  if (!c) throw new Error(`unknown card id: ${id}`);
  return c;
}

export type { CardType, Guild };
