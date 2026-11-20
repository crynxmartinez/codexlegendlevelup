import type { Patch } from './patches.js';

export const MOTION_POLISH_PATCH: Patch = {
  id: '1.10', title: 'A smoother, clearer duel', date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Stable cards, connected movement and better timing across desktop, tablet and landscape mobile.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'A steadier board', note: 'Field cards, Ally Zones, Barriers and your hand stay in place during routine updates. Selecting another card no longer rebuilds the whole board. Power changes keep one counter instead of overlapping.' },
    { title: 'Less waiting between actions', note: 'Barrier breaks, Sentries, Personification, Codex switches and State releases no longer repeat their result presentation after their local animation. Battle entry and defender pauses are shorter. Tutorial teaching choices remain deliberate.' },
    { title: 'Impact at contact', note: 'An attacker pulls back slightly, lunges, registers its hit or block, then returns. Particles and impact sound happen at contact. Charged and exhausted cards turn smoothly in place.' },
    { title: 'Follow each chain link', note: 'Each resolving link keeps its original number and short card name. Its source stays highlighted through the effect, then clears when the chain ends. Tutorial coaching makes room for the chain cue.' },
    { title: 'Linked-card chain presentation', note: 'Activated cards join a numbered chain over the board. The newest card comes forward, then links resolve from newest to oldest. Long chains show the latest three relevant cards and an earlier-link count. Landscape sizing, reduced motion and automatic cleanup keep the presentation brief.' },
    { title: 'Connected card travel', note: 'Cards leave the visible hand as they travel. A called card stays visible through its landing. Rally payments move as one staggered batch; opening hands, defenders and Heart movement use a bounded stagger even with many cards.' },
    { title: 'Lighter effects and reliable cleanup', note: 'Landscape phones use smaller particle and display-resolution budgets. The particle renderer stops when idle. Resize, orientation changes and hidden tabs settle temporary visuals; reduced motion keeps decisions and results readable.' },
  ],
};
