import type { Patch } from './patches.js';

export const ANIME_ART_PATCH: Patch = {
  id: '1.19', title: 'New card art & readable effects', date: 'October 9, 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'New framed anime artwork for all 141 active Agta, Babaylan and Maguindanao cards, saved artwork for faster return visits, and clearer card status labels.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: '141 refreshed cards', note: 'Active cards use the new framed artwork in your collection, hand, battlefield and card inspection. Hidden and retired cards are excluded. Card rules and stats are unchanged.' },
    { title: 'Save cards and effects', note: 'Active Agta, Babaylan and Maguindanao card artwork and game effects load quietly in the background. Old and hidden cards are excluded from background downloads. Ordinary online loading remains available when storage cannot be used. This does not make online battles playable offline.' },
    { title: 'Readable Power and skill labels', note: 'Power boosts, reductions and added-skill labels stay upright when cards turn sideways. Compact labels leave more artwork visible; select a label to read its effect details.' },
    { title: 'Updated artwork checks', note: 'The asset checker now recognizes the new card artwork and checks that the required files are present.' },
    { title: 'Landscape selection controls', note: 'Mobile field and hand selection panels now have room for their effect details and confirmation row. Confirm and Skip stay visible on short landscape screens without moving the board.' },
  ],
};
