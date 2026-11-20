import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import agta from '../../decks/agta-set-1.json' with { type: 'json' };
import visayas from '../../decks/babaylan-set-1.json' with { type: 'json' };
import mindanao from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import type { DeckList } from '../core/setup.js';
export const MATCH_PROTOCOL = 3;
export { RULES_REVISION as CONTENT_REVISION } from '../core/rules-version.js';
export const MATCH_INDEX = Object.fromEntries(Object.entries(ALL_CARDS).filter(([, c]) => isSelectableCard(c) || c.type === 'Token'));
export const STARTERS: Record<string, DeckList> = { Luzon: agta, Visayas: visayas, Mindanao: mindanao };
