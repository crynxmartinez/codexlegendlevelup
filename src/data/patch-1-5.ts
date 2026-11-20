import type { Patch } from './patches.js';

export const DUEL_FLOW_PATCH: Patch = {
  id: '1.5',
  title: 'Clearer battles, smoother card movement',
  date: 'September 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Follow each card from where it leaves to where it lands. This update improves card movement, battle decisions and compact card choices, and updates how a duel begins.',
  nerfs: [],
  buffs: [],
  adjusted: [],
  newCards: [],
  systems: [
    {
      title: 'One moving card, no duplicate left behind',
      note: 'A card leaves your hand as soon as its travel animation starts.',
      notes: [
        'Calling an Ally, Personifying and revealing a Sentry no longer leave a stationary copy in hand while the card flies across the board. The remaining hand cards slide into place.',
        'Committed defense cards leave the hand when defense is declared. Check cards disappear from Check as they travel to their next zone.',
        'Draws land in the centered hand. Rally and effect transfers also hide departing cards during travel.',
      ],
    },
    {
      title: 'An attack is easier to follow',
      note: 'The attacker and target stay marked while reactions, defense and checks resolve.',
      notes: [
        'Defense cards travel into the Defense Zone before the defense cue. The strike plays when the battle resolves, after defense and checks.',
        'Deck and Barrier cards travel face down to Check before the reveal. Hidden opponent hand cards keep their card backs.',
        'Opening draws, check movement, skill introductions and shattering follow the selected duel speed. Reduced motion keeps movement short without taking away skill-reading time.',
      ],
    },
    {
      title: 'Sanib and Kalas have visible movement',
      note: 'Cards visibly enter and leave the Heart, with feedback for Sanib and Kalas.',
      notes: [
        'Movement shows the source and destination, including the hand, field, deck, Grave and Exile. Kalas tokens visibly leave play.',
        'The complete Sanib or Kalas cost is shown before its triggered skills ask for input.',
      ],
    },
    {
      title: 'Choose a whole Kalas payment at once',
      note: 'Select the Heart cards you want to Kalas, then confirm once.',
      notes: [
        'Fixed Kalas costs use one selection for the full payment instead of asking you to confirm each card separately.',
        'Unseen Passage shows your Heart cards directly. Choose any number and see how many cards you will draw before confirming.',
        'When Kalas cards trigger skills together, choose which skill resolves next.',
      ],
    },
    {
      title: 'Smaller choices, more visible board',
      note: 'Card choices use a compact horizontal row, with smaller cards and readable controls.',
      notes: [
        'Browse sideways with arrows, the mouse wheel or touch. A single-card choice does not show unnecessary carousel arrows.',
        'Minimize a decision to inspect the clear board, then restore it with your selections intact. Minimizing does not cancel or answer the choice.',
        'Long card names and instructions stay within their layout. Right-click or long-press a card to inspect it; the reminder appears over the card.',
        'Search and filters are reserved for Deck, Grave, Heart and Exile choices.',
      ],
    },
    {
      title: 'Checks and battle results fit the screen',
      note: 'Attack checks, Barrier checks and broken-defense art fit inside their panels without scrolling down to see the card.',
    },
    {
      title: 'Confirm before casting an Action',
      note: 'Clicking an Action opens its casting confirmation instead of immediately spending it.',
      notes: [
        'Review the skill and Energy cost before casting, or cancel without spending the card.',
        'Fixed Actions becoming unavailable after three plays even when your current Persona level allows more plays and you have enough Energy.',
      ],
    },
    {
      title: 'The right cards appear for defense',
      note: 'The Force/Sentry response comes before ordinary hand defense.',
      notes: [
        'Ordinary defense offers Units and Forces. Actions and Sentries no longer appear as normal blockers.',
        'A committed Sentry skips the ordinary defense selection for that attack.',
      ],
    },
    {
      title: 'A five-card opening for both players',
      note: 'Both players receive starting Energy immediately and visibly draw their five-card opening hands.',
      notes: [
        'The first player skips the normal draw on the first turn. The second player draws normally on their first turn.',
        'Later turns draw normally, and skills can still draw cards on the opening turn.',
      ],
    },
    {
      title: 'A new 2D game mat',
      note: 'The duel uses new mat artwork, flipped for the opponent while keeping the existing zone layout.',
    },
  ],
};
