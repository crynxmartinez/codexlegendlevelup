import type { Patch } from './patches.js';

export const TUTORIAL_JOURNEY_PATCH: Patch = {
  id: '1.9', title: 'Five chapters. Your first real duel.', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'One connected learning journey replaces the old tutorial catalogue and separate Archipelago Challenge.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'One journey, five chapters', note: 'First Battle, Your Next Battle, Turn the Battle, Choose Your Archipelago, and Your First Real Duel. Every chapter is available; normal play and private rooms stay accessible.' },
    { title: 'Learn through real outcomes', note: 'Prepared encounters teach support, Force checks, Sentries and response chains using the actual game rules. Chapters advance after the required actions resolve, not after clicking through explanations.' },
    { title: 'Choose one regional path', note: 'Practice Luzon field-building and Sipol, Visayas Heart and batch Kalas, or Mindanao Offer and waiting Last Oaths. One regional path completes Chapter 4; the others remain available.' },
    { title: 'Finish with a normal duel', note: 'Chapter 5 uses your selected regional starter, normal five-Barrier setup and an ordinary opponent without boosted checks. Hints are optional. A real victory completes the chapter.' },
    { title: 'Progress without another lesson list', note: 'Completed encounters are local checkpoints. Proven First Battle and Your Next Battle wins carry over. Old bookmarks lead to the journey, and the old catalogue and deck quizzes are retired.' },
    { title: 'Desktop and landscape mobile', note: 'The chapter path scrolls sideways on narrow screens. Compact coaching, card inspection, retry controls and regional choices adapt to landscape layouts.' },
  ],
};
