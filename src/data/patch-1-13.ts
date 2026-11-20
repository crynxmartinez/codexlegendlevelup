import type { Patch } from './patches.js';

export const DUEL_CLARITY_PATCH: Patch = {
  id: '1.13', title: 'Clearer choices, fairer battles', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'More useful cost previews, steadier choices and a Hard opponent that plays with normal deck odds.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'Know why a skill is waiting', note: 'Card inspection explains timing, once-per-turn use, zones, missing payment cards, unavailable targets and Andukha thresholds. Continuous effects are identified separately.' },
    { title: 'See the payment before committing', note: 'Skill choices show current Offer, Kalas, discard or Sanib costs. Kalas discounts use the rules calculation; Offer selection accounts for Illana Bay. Selected skills show their effect beside the payment.' },
    { title: 'Results stay on the board', note: 'Charging, Power changes, negated effects and unavailable chain targets use short cues beside their cards, including private rooms.' },
    { title: 'Steadier choices on every screen', note: 'Choice buttons stay together, effect descriptions reserve space, and larger desktop cards adapt to landscape phone height. Resizing and minimizing preserve the current selection.' },
    { title: 'Load only what is needed', note: 'Credits, Dev Log and replay playback load when opened. Visible card art is prepared ahead of movement, with a short timeout. Slow effects frames reduce decorative particles without hiding game information.' },
    { title: 'Hard mode uses normal odds', note: 'New Hard games no longer bias Force checks. Hard weighs Offer payments, saves pure Power responses that cannot change the current battle, and considers remaining attackers. Older saved replays retain their original settings.' },
  ],
};
