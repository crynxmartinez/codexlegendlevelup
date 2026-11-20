import type { Patch } from './patches.js';

export const MANUAL_CODEX_PLAY_PATCH: Patch = {
  id: '1.20', title: 'Manual Codex switches cost 1 Play', date: 'November 16, 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'Manually changing your active Codex now uses 1 Play. Automatic switches remain free.',
  nerfs: [], buffs: [], adjusted: [], newCards: [],
  systems: [
    { title: 'One Play per manual switch', note: 'During your Main Phase, each manual Codex switch shares the Play allowance used by normal calls and Actions. You need at least 1 Play left. Keeping the current Codex or canceling costs nothing; switching does not reset skill limits.' },
    { title: 'Free triggered switches and setup', note: 'Automatic switches still follow their printed triggers and conditions and use no Plays, even with none left. Choosing your starting Codex also remains free. The same rule applies in AI, private PvP and tutorial battles.' },
  ],
};
