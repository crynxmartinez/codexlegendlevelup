# Five-chapter journey — local validation

Date: 2 October 2026. Repository: `C:\Code\codexlegend`.
Local implementation; no push or deployment is claimed.

## Delivered

- Exactly five chapter destinations; the old catalogue, individual regional lessons, deck quizzes and separate Archipelago Challenge runner are retired.
- Chapters 1 and 2 reuse the controlled First Battle and independent two-Barrier practice. Duplicate First Battle result acknowledgements were removed.
- Chapter 3 contains support, Force/check/Sentry and response-chain encounters. Chapter 4 has three encounters per region; completing one region is sufficient.
- Prepared encounters use actual physical cards, normal costs, controller actions and settled event/state predicates. Costs and outcomes are not fabricated during play. Retry restores the encounter start.
- Chapter 5 uses the selected regional starter, normal setup, five Barriers and ordinary AI without hard-mode check bias. Only a human victory records completion.
- Versioned local progress imports only proven old First/Next Battle wins. Legacy records survive, sequential encounter checkpoints cannot be skipped through replay, and blocked/full storage keeps progress for the current session.
- Old tutorial bookmarks route into the journey. Ordinary play and private PvP are not gated by tutorial completion.
- Dev log 1.9 describes the change. Rules are unchanged; the event recorder now preserves chain metadata already supplied by the engine.

## Automated evidence

Focused journey, First Battle, Next Battle and session suite: 6 files, 56 tests passed. Includes 19 real-engine encounter/setup tests covering every regional path, two/three-link chains and normal graduation decks. A final resume-order regression brought progress/migration coverage to 23 tests, all passing (57 focused tests total across the latest runs). The additional 11 event tests passed in the preceding 63-test run.

Earlier targeted activation/response/UI suite: 10 files, 66 tests passed. Chain integration, depth, event privacy/order/determinism and PvP chain session: 4 files, 19 tests passed. These checks validate the metadata fix without implying a deployed multiplayer test.

The deterministic First Battle test reaches a real victory. Real-engine regional checks cover actual Codex switching and Personification, state release, Sipol, batch Vent with two Silaks, Heart special call and end-turn return, Offer 3 and three Last Oaths, and pending-chain completion refusal. Continue clicks and unrelated inspections cannot complete the new encounters.

## Browser evidence

Tested through the running local browser at `http://127.0.0.1:5174/`:

- Five-node menu, chapter selection and safe resume; region chooser with existing map artwork.
- Chapter 3 support choice, real Barrier break and automatic encounter transition; subsequent Bunog skill and target choice.
- Chapter 4 Mindanao Persona inspection, direct Codex switch, full turn cycle and actual Personification. Confirming Sulayman automatically saved the checkpoint and opened encounter 2.
- Chapter 5 enters normal dice/Persona/Codex setup using the selected Mindanao starter, then the opening deal.
- Full First Battle from introduction to real victory: inspection, call, Persona check, Ally hit, defense choice, second hit, next-turn Action confirmation and winning attacks. Completion screen saved Chapter 1 and opened Chapter 2's independent practice introduction.
- Desktop 1280×720 / 1440×900, tablet 1024×768 and landscape 844×390 / 667×375 checks. The menu and regional cards fit the short landscape viewport; chapter navigation scrolls horizontally.
- Fixed coaching re-anchors after scrolling as well as resizing. Landscape encounter highlights now point to an individual card or the turn control, rather than raising the whole hand over the turn button. Verified Go to Battle and End Turn respond to clicks at 667×375. Card inspection hides both coaching and retry controls.
- Local screenshot evidence: `.tmp/journey-menu-desktop.png`, `.tmp/journey-menu-mobile.png`, `.tmp/journey-mobile-encounter.png`, `.tmp/journey-first-battle-complete.png`. No browser errors were recorded in the tested tab.

Production build and TypeScript checks passed. Main output is approximately 1.034 MB before gzip / 284 KB compressed, with the existing large-chunk warning. No remaining imports refer to the removed lesson/challenge/quiz modules.

## Limits and follow-up acceptance

- Browser coverage is representative, not an end-to-end manual victory on every regional path or a full Chapter 5 match. Every prepared path has engine coverage.
- No physical Android/iOS touch, browser safe-area or performance measurements were performed. Browser viewport emulation does not prove these.
- Beginner completion time and understanding have not been measured. Run the five-player observation checklist in the plan before claiming improved learning outcomes.
- Production build retains the existing large-main-chunk warning; this change does not claim to solve that bundle concern.
- No live two-device/two-network PvP reconnect check or production deployment was performed.
