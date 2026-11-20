import type { Patch } from './patches.js';

export const ENERGY_FREE_CHAINS_PATCH: Patch = {
  id: '1.7', title: 'Your move. Their response.', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Energy is removed. Build your field with plays, pay card costs, and respond before effects resolve.',
  nerfs: [], buffs: [], newCards: [],
  adjusted: [
    { id: 'agta/set-1/healer-s-spirit-friend-bunog', delta: 'New reward', note: 'The hand skill gives one of your Units +3000 this turn instead of generating Energy.' },
    { id: 'agta/set-1/wedding-clearing-amuran', delta: 'Discard 1', note: 'Discard one card to perform Sipol 3. The cost is paid before responses.' },
    { id: 'maguindanao/set-1/the-price-of-the-third-victory', delta: 'New reward', note: 'After draw 2 and discard 1, released Garahana gives your Persona +3000 this turn.' },
    { id: 'babaylan/set-1/return-our-moon', delta: 'New reward', note: 'Returning a Divine Unit can Sanib your top card. The Beast follow-up remains draw 1, then discard 1.' },
    { id: 'maguindanao/set-1/first-daughter-of-the-returned-land-rinayung', delta: '1/name/turn', note: 'The free tutor follow-up can be used once per turn across all your copies. Each Last Oath can still give its base +3000.' },
    { id: 'maguindanao/set-1/keeper-of-the-last-refuge-datu-karim', delta: '1/name/turn', note: 'The same-name tutor follow-up can be used once per turn across all your copies. Offering another copy does not reset it.' },
    { id: 'babaylan/set-1/first-invocation-luning', delta: '1/name/turn', note: 'One extra Kaluluwa per creation event, once per turn across all copies; it does not trigger itself.' },
  ],
  systems: [
    { title: 'Spend plays on your field and Actions', note: 'Only normal calls and Action cards use one play. Skills, automatic effects, Forces, Sentries, special calls and relocation use no plays. Your allowance still grows with broken shields.' },
    { title: 'Pay, respond, resolve', note: 'Finish paying and declaring targets before the opponent responds. Each response passes the choice back. One decline resolves the whole chain, last in first out. Nothing is inserted during resolution.' },
    { title: 'Choose waiting effects', note: 'Offer and Kalas triggers wait until the current chain is finished. Choose which activates next; the others stay available. Required effects must be handled.' },
    { title: 'Costs still matter', note: 'Offer, Kalas, Sanib, discard and other card costs remain. Select a complete batch and confirm once. Cancelling an uncommitted choice spends nothing; committed costs are not refunded.' },
    { title: 'Readable responses', note: 'Responses and pending effects use the compact horizontal card viewer, with public chain order, right-click or long-press inspection, and explicit confirmation.' },
    { title: 'Usage limits survive movement', note: 'Moving the same card away and back no longer refreshes a once-per-turn skill. Selected free follow-ups have their own copy or shared-name limit.' },
    { title: 'Practice the new timing', note: 'A prepared response-chain lesson joins the learning path. Regional lessons use current card text and prepared positions.' },
    { title: 'Private matches use the same rules', note: 'Responses belong to the correct player, stale or repeated answers are rejected, and reconnecting restores the current choice. Both client and server require the matching rules revision.' },
  ],
};
