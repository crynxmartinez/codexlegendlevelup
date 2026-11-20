# Regional tutorial implementation — verification

2026-11-16. Pre-publication verification snapshot. Testing used the built-in browser exclusively. The user's PC browser was not opened or controlled. Existing unrelated working files, including the initial `docs/README.md` change, were preserved. Publication is recorded in Git history; these checks do not establish live deployment.

## Delivered

- Three exact approved 50-card presets plus two external Codex, stored separately in `src/data/tutorial-decks/`. The three approved JSON lists in this design folder remain unchanged.
- Explicit card-ID roles, region-aware prepared lessons across the existing five chapters, regional checkpoints and unrestricted shuffled Practice Duel using tutorial profiles on both sides.
- Chapter 3 has four encounters; Chapter 4 has five. Regional Actions, Sentries and retained ordinary boss skills are explained before practice.
- Real reading/inspection goals, cancellation/decline handling, preserved completion and safe restart of incompatible old encounters.
- Existing controllers, production catalogue, saved decks, ordinary AI/PvP rules and battlefield/card artwork remain in place.

The discrepancy map, detailed behavior inventory, acceptance criteria and six-person novice-test protocol are in [IMPLEMENTATION.md](IMPLEMENTATION.md). The approved card-by-card lists are [Luzon](luzon.json), [Visayas](visayas.json) and [Mindanao](mindanao.json).

## Automated checks

| Check | Observed result |
|---|---|
| Full `npm test` | 20 Node tests passed; 1,497 Vitest tests passed, three existing opt-in tests skipped. 174 test files passed and two were skipped. |
| Final focused regional run | 198 tests passed across seven files, including the subsequently added/adjusted lesson regressions. |
| Dedicated preset tests | 58 passed: exact lists, quantities, role bindings, normal/special call, both seats, support counted once, expiration, Codex switch/replacement and all nine seeded regional practice pairings. |
| Tutorial rule profile | 25 passed, covering simplified definitions and isolation from production. |
| First Battle / Simple Skills | 38 passed across three files; real controller steps, regional inventory, victories and expiration. |
| Chapters 3–4 | 50 passed, including regional paths, retained skills, Pah at five/two Barriers, cost cancellation, optional decline and Sentry retry. |
| Progress | 27 passed: migration, regional encounter counts, safe resume and region selection. |
| TypeScript | `npx tsc --noEmit` passed. |
| Final production build | `npm run build` passed after the last routing corrections. Existing large-chunk warning remains. |
| Whitespace/diff check | `git diff --check` passed; Git reports existing Windows line-ending normalization notices. |
| Publication asset audit | Staged-source export: 1,816 assets, zero missing and zero unregistered. Ten unrelated untracked legacy attack files remain local. The Windows archive extractor misdecoded three Tañon filenames; export-only names were restored to the tracked Unicode spelling and their bytes checked against the originals before running the audit. |

The full suite ran before the final small lesson-text, completion-panel and URL-routing refinements. The focused run validates the final lesson/rule changes; the final build covers the latest UI routing edits. This is not a claim that the full suite was repeated after every text edit.

Local logs: `.tmp/tutorial-regional-full-test.log`, `.tmp/tutorial-regional-focused.log`, `.tmp/tutorial-regional-final-build.log`. The existing skipped long-running cases are in `src/ai/headtohead.test.ts`, `src/core/playtest.test.ts` and `src/core/showcase.test.ts`.

The nine pairing checks each complete a seeded controller-driven match with legal training state. They establish bounded reliability for those samples, not regional balance or human learnability.

## Built-in browser checks

| Path | Actual browser coverage |
|---|---|
| Region selection / progress | All three choices displayed. Mindanao selection followed into First Battle. Changing Mindanao to Visayas while Chapter 2 was selected kept Chapter 2 selected; replay opened Kaptan, Luning and Tata Cero, with `region=visayas` despite the older Mindanao URL. Existing earned 4/5 chapter completion remained after returning. |
| First Battle | Mindanao entry/orientation and correct regional cards. Full manual victory for all three regions was not repeated in this turn; controller tests cover them. |
| Simple Skills | Mindanao completed: Rinayung arrival 6k→9k, Tarabuk attack 9k→14k→9k, then Rinayung returned to 6k after End Turn. Reading steps waited for Continue/Finish. Visayas replay/entry also checked. |
| Support and Defense | Visayas completed all four encounters through UI: Aday support, Force check and response, Bituon Heart-token result, The Elders Answer Sanib and ordered return. Replayed the optional Skip branch and read the spent Action in Grave. |
| Persona and Codex | Luzon first two encounters: real Personify/Heart movement, then Salikan from five Barriers (+0) through an actual break to four (+1k), visible Persona 11k→12k. Remaining boss/Attack-Codex branches have controller evidence, not complete manual regional coverage. |
| Practice Duel | Mindanao setup offered Indarapatra/Pah and exactly Mantapuli/Matutun; chose Pah/Mantapuli. Shuffled match against Luzon showed five Barriers and two Codex on both sides. Real Nanolay/Alig response windows could be declined; a two-card defense showed 11k +30k =41k versus 28k and accepted keyboard confirmation. This was not a full manual match. |
| Return to ordinary AI | Used Play with regular cards. Regular Persona choices included Taguwasi again; Nanolay inspection showed its normal Bayanihan skill. Setup offered five Codex and the regular battlefield showed five per side and State progress instead of Tutorial version. |
| Keyboard / nested inspection | Enter selected/confirmed cards and advanced chapter actions. Closing inspection restored the prior control. Escape dismisses the topmost glossary before an underlying inspection when both are open; the explicit close button returns directly. |
| Mobile landscape | 844×390: Visayas Action guide, Sanib selection, ordered return and nested inspection/return were exercised. Desktop checks used 1280×720, 1440×900 and 1920×1080. No claim of exhaustive device coverage. |
| Minimal motion | Changed the existing in-game setting from Standard to Minimal during free practice. Response windows, source explanation and defense selection remained actionable; restored Standard afterward. The OS-level reduced-motion media preference was not toggled. |

Two concrete UI issues were found and repaired while clicking through: asset preparation could leave the transition cover up until its watchdog; a Heart/Grave browser could remain over a completed chapter's Next button. Prepared scenes now finish asset preparation before revealing; chapter completion clears the read-only pile panel and focuses the next action. Both paths were retested. Final screenshot review also caught the region introduction touching its breadcrumb; a scoped spacing correction leaves a measured 10.5 px gap at 1440×900.

## Screenshot and recording evidence

All files below are actual local runtime captures, not mockups. PNGs were converted from the original built-in browser JPEG captures; conversion does not restore lost JPEG detail.

- [Three regional choices, final spacing](evidence/19-final-three-training-decks.png)
- [Mindanao arrival bonus](evidence/10-mindanao-arrival-plus-three.png) and [expiration](evidence/11-mindanao-bonuses-ended.png)
- [Visayas Sentry / Heart](evidence/04-visayas-sentry-heart.png)
- [Mobile Action guide](evidence/05-mobile-visayas-action.png) and [Sanib selection](evidence/06-mobile-sanib-choice.png)
- [Luzon Barrier Codex +0](evidence/08-luzon-barrier-codex-zero.png) and [+1,000](evidence/09-luzon-barrier-codex-plus-one.png)
- [Practice two-Codex setup](evidence/12-mindanao-practice-two-codex.png) and [defense under Minimal motion](evidence/13-practice-defense-minimal-motion.png)
- [Regular State skill restored](evidence/15-regular-state-skill-restored.png) and [five Codex restored](evidence/16-normal-five-codex.png)
- [Visayas support teaching recording](evidence/visayas-support-teaching.mp4)

The recording contains 212 real screenshots over 11.681 seconds at 1280×720, approximately 18.06 captures/second (median interval 51 ms, p95 67 ms, maximum gap 359 ms). It covers a confirmed support attack through resolution, not a whole chapter. Original timestamp spacing was preserved; there are no generated/interpolated frames or audio. Capture cadence is not game frame rate and cannot prove fine animation smoothness. See [capture-report.json](evidence/capture-report.json).

The initial `01`–`03` captures are retained as intermediate evidence; `03` predates the final explicit inspection wording. Examples from `04` onward document the updated guidance. Region-menu capture `14` precedes the spacing correction; use `19` for the final menu.

## Intentional limitation and remaining evidence gaps

- **Amara:** the approved Visayas list cannot Sanib a Unit from the Persona Zone, which her retained skill requires. Her lesson explains why ordinary Personify does not trigger it. No extra ability, substitute card or false trigger was introduced. Making that skill usable in this preset needs a separately approved list change.
- Full manual five-chapter runs for every region, all nine pairings in the browser, blocked-storage behavior through browser controls and OS reduced-motion switching were not exhausted. Relevant engine/progress branches were automatically checked; they are not presented as visual proof.
- No new card assets are required. Existing selected artwork is reused.
- No independent newcomers participated. The beginner-test protocol is ready, but improved comprehension, equal regional difficulty and balance are unproven.
- Existing large production chunks and the development-only boss-manifest import warning were observed; this focused tutorial work does not change the asset/build system.
- No deployment was performed during this verification; the later Git publication does not itself prove the live site has updated.
