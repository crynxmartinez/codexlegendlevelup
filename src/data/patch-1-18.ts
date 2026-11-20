import type { Patch } from './patches.js';

export const QUALITY_AUDIT_PATCH: Patch = {
  id: '1.18',
  title: 'Quality audit & next steps',
  date: 'October 2026',
  regions: ['luzon', 'visayas', 'mindanao'],
  summary: 'We reviewed the current development build before the next release. This entry records the results and remaining work; it does not change card rules or announce the pending fixes as complete.',
  nerfs: [],
  buffs: [],
  adjusted: [],
  newCards: [],
  systems: [
    {
      title: 'Gameplay checks completed',
      note: 'The October 9 audit recorded 1,003 passing tests, four failures in older mobile-layout checks, and three skipped tests. All 10 separate saved-asset tests passed.',
    },
    {
      title: 'Release checks need updating',
      note: 'Pending: recognize the new card artwork in the asset checker, update the outdated mobile checks, and make gameplay and match-server checks required before release.',
    },
    {
      title: 'Saved downloads across tabs',
      note: 'Pending: prevent separate game tabs from overriding each other’s download pause state and keep completed downloads labelled correctly.',
    },
    {
      title: 'Mobile and online play verification',
      note: 'The online server health check responded with the expected rules version. Full touch-device and two-player checks are still needed for responses, animation pacing, card movement and reconnecting.',
    },
  ],
};
