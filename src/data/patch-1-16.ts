import type { Patch } from './patches.js';
export const SUBMISSION_READABILITY_PATCH: Patch = {
  id: '1.16', title: 'A quicker start, a clearer duel', date: 'October 4, 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'The menu opens with less code, response windows explain the incoming effect, and card inspection adds optional story notes.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'Open the menu first', note: 'Duel code loads when you enter the game. Private-room networking loads when you open PvP. AI battles prepare the chosen decks’ artwork with a progress indicator and a Continue now option.' },
    { title: 'Understand the response', note: 'The incoming effect appears above your response cards. Expand it for the full effect and declared public targets. Targeted field cards are highlighted. Large stacks of Power modifiers use a combined badge; inspect it for every source and duration.' },
    { title: 'Connected pacing', note: 'New chain links reveal quickly; resolving links keep the outward-and-back glow. Negation stays electrical and grayscale. Reduced motion keeps reading time. State-release and finishing cues follow the selected pace.' },
    { title: 'Landscape choices', note: 'Response selections survive resizing. Swiping a card rail cancels long presses and cannot select a card through a scroll. Effect popovers stay inside the viewport, and card inspection has a visible Close button and keyboard navigation.' },
    { title: 'Behind this card', note: 'Bakunawa, Tarabusaw, Indarapatra and Sulayman have optional story notes in card inspection, with source links and clear separation between the recorded story and the game’s fictional abilities.' },
    { title: 'A lighter project', note: 'Unused UI code and obsolete published assets were removed. Original artwork and historical tools are archived. The title screen keeps Play first and the existing Tutorial entry.' },
  ],
};
