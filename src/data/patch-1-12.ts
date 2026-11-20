import type { Patch } from './patches.js';

export const ILLANA_OFFER_PATCH: Patch = {
  id: '1.12', title: 'Illana Bay: one Unit, two Offers', date: 'October 2026', regions: ['mindanao'],
  summary: 'Illana Bay can activate in a separate chain before you pay an Offer cost.',
  nerfs: [], buffs: [], newCards: [],
  adjusted: [{
    id: 'maguindanao/set-1/reach-of-the-ridge-giants-illana-bay', delta: 'Skill',
    note: 'After its pre-payment chain resolves, your first offered Unit that turn counts as 2 Offers, regardless of subtype.',
    notes: [
      'Before paying an Offer cost, you may activate Illana Bay if you have not Offered a Unit this turn. Legal responses resolve before payment continues.',
      'Your first Unit then counts as 2 Offers: one Unit pays Offer 2, or two ordinary Units pay Offer 3. Later Units count normally.',
      'Cancelling payment keeps the resolved bonus available until your first Offer that turn. Switching Codex does not reset its once-per-turn activation.',
      'Replaces the former Grave-count bonus. One physical card moves to the Grave and produces its usual single Offer event.',
    ],
  }],
  systems: [{ title: 'Clear Offer payment', note: 'The chooser shows both Units selected and total Offers. Local play, AI and private-room decisions use the same first-Unit bonus.' }],
};
