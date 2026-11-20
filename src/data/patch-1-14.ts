import type { Patch } from './patches.js';
export const CODEX_PLAY_PATCH: Patch = {
  id: '1.14', title: 'Codex switches use plays', date: 'October 2026', regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Every manual or automatic Codex switch costs 1 play, with no separate switch cap.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'Switch while you have plays', note: 'Manual switches during Main and optional automatic switches each spend 1 play. Switching earlier this turn or last turn no longer locks switching. Starting Codex selection is free.' },
    { title: 'Reserve plays for a response', note: 'An automatic switch during the opponent’s turn spends your own remaining plays. Your allowance refreshes at the start of your next turn. With no plays available, you cannot switch.' },
    { title: 'Confirm the payment', note: 'Switch choices show the play cost. Selecting a Codex from its viewer asks for confirmation before spending. Card text, tutorial help and availability explanations use the new rule.' },
    { title: 'Skills keep their own limits', note: 'A Codex skill still follows its printed trigger and once-per-turn limit. Switching away and back does not reset it. Negating its effect does not refund a completed switch.' },
  ],
};
