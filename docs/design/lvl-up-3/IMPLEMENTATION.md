# Lvl Up 3.0 visitor demo

Implemented and locally verified on 2026-11-16. This report records local verification; hosted release status is tracked by the commit's deployment checks.

## Entry and scope

Tutorial now includes **Lvl Up 3.0**, opening `?tutorial=lvl-up-3` through the existing diagonal transition. It runs a fresh, shortened Luzon First Battle with Nanolay, Kalimangalnuk and Sinag, simplified tutorial effects, two Codex and two starting Barriers per side. The opening and result explain the difference from normal matches.

The existing controller, prepared cards, guided opponent, legal-action restrictions and battle presentation are reused. No new card rules, artwork, AI strategy or PvP dependency were introduced. The five regular chapters remain available.

## Shared changes

- `src/ui/journey-menu.ts` and scoped `menu-destination.css`: independent entry, description and responsive spacing.
- `src/ui/first-battle-session.ts`: explicit visitor mode with 23 steps instead of 30. Seven separate reading steps are merged into relevant guidance; attack checks and defense decisions remain real controller events.
- `src/ui/tutorial-mode.ts`: optional progress persistence, enabled by default for existing tutorials and disabled for this demo.
- `src/ui/main.ts`: route, fixed fresh Luzon setup, visitor labels, Restart demo, recovery copy, completion recap, Next visitor and Explore Tutorial.

The demo bypasses chapter/checkpoint persistence and normal match recording. Next visitor reloads a fresh battle; it does not clear saved decks, settings, profile or tutorial progress.

## Verified

- Automated: 20 Node tests passed; 1,523 Vitest tests passed with 3 existing skips (177 suites passed, 2 skipped). This includes actual-controller runs of the visitor sequence and all three standard First Battle regions, no-persistence checks and menu navigation tests.
- Production build and TypeScript passed. Existing large-chunk advisory remains.
- Pre-push asset audit passed against the tracked release files: 1,816 assets, none missing or awaiting review. The full workspace audit additionally flags ten unrelated, untracked legacy boss sprites; those files are preserved and excluded from this release.
- Built-in browser, desktop 1280×720: launched from Tutorial and played the entire demo to victory. Called the Ally, attacked, observed 16,000 versus 21,000 defense, completed the check, broke a Barrier with the Ally, defended with Sinag, took the next hit, broke the final Barrier and made the separate winning attack.
- Confirmed Finish Demo produces the recap, and Next visitor starts again at turn 1 with two Barriers each and the original prepared hand.
- Confirmed Tutorial stays at the existing 4/5 completion state. Selected Visayas in Tutorial, launched the fixed Luzon demo, and returned with Visayas still selected. Restored the original Luzon test preference afterward.
- Keyboard: Tab reaches Lvl Up 3.0; Enter launches it. Enter activates Next visitor from the completion screen.
- Mobile landscape 844×390: menu, welcome, initial hand, optional card inspection and return to unchanged call guidance checked. Menu at 568×320 reviewed with scrollable chapters/details and reachable demo entry/footer.
- Fixed the initial breadcrumb overlap found in browser verification. Retained the existing anime theme and restored the browser viewport after testing.

## Evidence

- `evidence/01-tutorial-entry.jpg`: desktop entry and five chapters.
- `evidence/02-defense.jpg`: selected defender and real totals.
- `evidence/03-complete.jpg`: winning recap and visitor reset.
- `evidence/04-menu-844x390.jpg`: landscape menu.
- `evidence/05-demo-844x390.jpg`: landscape demo welcome.
- `evidence/06-menu-568x320.jpg`: compact landscape menu.

## Remaining validation

No independent newcomer test has been run. The proposed 4–6-minute visitor duration and improved comprehension remain hypotheses. Full mobile battle completion, touch long-press, offline cold loading, recovery-error injection and reduced-motion replay were not separately exercised in this pass. No judge-walkthrough screen was added.

Before an event, ask several first-time card-game players to launch without coaching, explain their defense total and the final-hit win condition, then record completion time, interventions and missed instructions. Do not treat the successful guided run as proof of unaided understanding.
