import type { Patch } from './patches.js';

export const CONTEST_POLISH_PATCH: Patch = {
  id: '1.11', title: 'Music for the journey', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Original songs, clearer progress and a more comfortable match setup on desktop and landscape mobile.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'An original soundtrack', note: 'Journey of Hearts accompanies the title and learning journey. Break Those Limits celebrates victory. Music & credits lets you listen to all three supplied songs, including Break the Chains. Battles retain a quiet instrumental background.' },
    { title: 'Smaller music downloads', note: 'Audio-only M4A files remove the videos without another lossy encode. Songs stream as needed, share the music volume control and fade between scenes. Hidden tabs pause playback.' },
    { title: 'Costs at the decision', note: 'Selected skills name short printed costs on Activate. Longer costs stay in the effect text. Offer and Kalas payment selections use a clear Pay cost button.' },
    { title: 'Your journey, at a glance', note: 'The learning menu shows completed chapters and regional encounters. Practice matches clearly say when continuing starts a fresh match.' },
    { title: 'Friend matches with clearer feedback', note: 'Room seats distinguish choosing a deck, ready and reconnecting. Persona and Codex names are shorter, with a Read button for each. Rematches explain that both players return to deck selection.' },
    { title: 'Comfort across screens', note: 'Room setup, results and music controls adapt to short landscape screens with reachable buttons and safe-area spacing. The existing horizontal card viewers and board remain available.' },
  ],
};
