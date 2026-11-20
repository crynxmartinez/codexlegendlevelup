import agta from '../../decks/agta-set-1.json';
import babaylan from '../../decks/babaylan-set-1.json';
import maguindanao from '../../decks/maguindanao-set-1.json';
import { indexForDecks, isSelectableCard } from '../data/loader.js';
import { DISPLAY_CARDS } from '../localization/display.js';
import { characterName } from '../localization/title-state.js';
import { isLegal } from '../core/deckcheck.js';
import type { CardIndex } from '../core/state.js';
import type { DeckList } from '../core/setup.js';
import { activeDeckId, loadDecks, readDeckCollection } from './decklib.js';
import { artUrl } from './assets.js';
import type { ActiveDeckContext } from './title-screen.js';

export const TITLE_BUILTIN_DECKS: Record<string,DeckList> = {Agta:agta as DeckList,Babaylan:babaylan as DeckList,Maguindanao:maguindanao as DeckList};
const titleIndex: CardIndex = Object.fromEntries(Object.entries(indexForDecks(Object.keys(TITLE_BUILTIN_DECKS)))
  .filter(([id])=>isSelectableCard(DISPLAY_CARDS[id]!)||DISPLAY_CARDS[id]!.type==='Token'));
export interface ActiveSelection { name: string; deck: DeckList }

/** Shared with the game: display never promotes an illegal saved deck to active. */
export function resolveActiveSelection(index: CardIndex = titleIndex, builtins: Record<string,DeckList> = TITLE_BUILTIN_DECKS): ActiveSelection | null {
  const id=activeDeckId();
  if(id?.startsWith('builtin:')){const name=id.slice(8),deck=builtins[name];return deck?{name,deck}:null;}
  if(id){const saved=loadDecks(index).find(deck=>deck.id===id);if(saved&&isLegal(index,saved))return {name:saved.name,deck:saved};}
  return null;
}

/** Derive facts from the chosen deck/card, never from a user's custom deck name. */
export function activeDeckContext(selection: ActiveSelection | null): ActiveDeckContext | null {
  if(!selection)return null;
  const card=DISPLAY_CARDS[selection.deck.persona];
  const region=card?.archipelago||({Agta:'Luzon',Babaylan:'Visayas',Maguindanao:'Mindanao'} as Record<string,string>)[card?.deck??'']||'Region not recorded';
  return {name:selection.deck.name,region,persona:card?{id:card.id,name:characterName(card.name),art:card.art?artUrl(card.art):null}:null};
}

/** Invoked lazily by boot after the title is visible; does not import main.ts. */
export function resolveTitleActiveDeck(): ActiveDeckContext | null {
  // Unlike activeDeckId's safe default, the title must distinguish denied storage.
  const id=localStorage.getItem('codex-legends.activeDeck');
  if(id&&!id.startsWith('builtin:')){const collection=readDeckCollection(titleIndex);if(!collection.ok)throw new Error(collection.message);}
  return activeDeckContext(resolveActiveSelection());
}
