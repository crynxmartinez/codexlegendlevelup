import type { Patch } from './patches.js';

export const WHOLE_GAME_POLISH_PATCH: Patch = {
  id: '1.8', title: 'Read the table. Make your move.', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Easier card access, clearer live information and more practice across desktop, tablet and landscape mobile.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'Zones and a larger hand reader', note: 'Open Zones or Hand to read cards in the shared horizontal viewer. Change the player and zone without losing an underlying decision. Opponent hands and hidden Deck cards remain private.' },
    { title: 'Current information when you inspect', note: 'Field cards show current and printed Power, charged state, bonus sources and expiry. Scripted skills explain state locks, used limits and zone requirements.' },
    { title: 'More room for the field', note: 'Landscape controls are easier to press. The small-screen log moves into History under More, and routine results continue automatically.' },
    { title: 'Practice a deck’s decisions', note: 'Each starter guide has three goals and short practice decisions with explanations and retries. Real battle lessons remain linked from the guide.' },
    { title: 'Review important exchanges', note: 'The normal result screen shows up to three recent, distinct meaningful exchanges. Open one to review its recorded events.' },
    { title: 'Lighter assets and quieter idle graphics', note: 'Existing backgrounds use smaller lossless files. Card viewers load images progressively. Particle graphics load when a board needs them and stop rendering when idle or hidden.' },
    { title: 'A local performance check', note: 'Start a ten-second check from Settings, keep playing, then return to see the result. The check sends no data.' },
  ],
};
