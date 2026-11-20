# Tutorial training profile

Date: 2026-11-15. Scope: tutorial matches only. No push or deployment.

## Goal and acceptance criteria

A player with no trading-card-game experience should be able to follow the first battle without already knowing what Persona, Ally, call, ATK, DEF, exhausted or Codex means. The implementation can establish that the instructions and actions work; novice comprehension still requires people testing them.

- Five chapters: First Battle, Simple Skills, Support and Defense, Persona and Codex, Practice Duel.
- Each directed step introduces one action or result. Reading steps wait for Continue. No automatic dismissal of instructions.
- Every directed action must be legal in its prepared state and lead to the stated outcome without requiring a removed State skill.
- Two training Codex per side, one active; normal deck validation still requires five.
- Training effects use cloned definitions and scripts. Original catalogue, saved decks, art and normal AI/PvP rules remain unchanged.
- L1/L2 have one automatic role each; +3k/+5k ends at the exact specified attack or turn boundary. Support contributes the bonus once; call and special-call entry trigger once.
- Barrier Codex begins at +0 in the five-Barrier demonstration, becomes +1k after an actual break, applies on either turn, and recalculates after switching or changing Persona.
- Attack Codex grants +5k only while its owner's Persona attacks. Reserve Codex grant nothing.
- Inspection, source feedback and Power details must agree with the active training rules. Printed DEF remains unchanged.
- Preserve earned chapter completion; old incompatible unfinished checkpoints restart safely.
- At 1440×900 and 844×390: readable instruction text, reachable Continue/Minimize and legal targets, no changed hand/Barrier arrangement. Minimized instructions must restore.
- Verification includes actual browser interactions and targeted rule/lesson regressions. Build success is not completion evidence.

## Confirmed dependencies found before editing

| Area | Existing behavior | Correction boundary |
|---|---|---|
| Tutorial definitions | Prepared battles used production abilities and registries. | Per-tutorial cloned index and script registry; explicit game profile. |
| Non-script behavior | Current Power and engine helpers also included card-specific and regional conditions. | Suppress only replaced/removed training behavior; preserve other card types. |
| Early Barriers | Two remaining Barriers count as three broken in the existing rules. | Use Attack Codex early; teach Barrier Codex with five initial Barriers. |
| First defense | New Attack Codex makes an 11k Persona attack at 16k; a 5k defender ties at 16k, which still hits. | Prepared 10k defender gives 21k defense and correctly stops that demonstration. |
| Regional objectives | Old encounters required State skills, Offer chains, Heart and Grave thresholds. | Replace required goals with support, defense, Personification and the two training Codex. |
| Chapter 2 | Free practice did not demonstrate skill expiration. | Short guided call → attack → expiry → next-turn sequence. |
| Chapter 5 | Described itself as a normal/real duel. | Label Practice Duel and use the same training profile on both sides. |
| Card inspection | Looked up production text even when a game could use a different index. | Merge effective training definitions with original artwork and display names. |
| Progress | Old unfinished checkpoints depend on obsolete combat outcomes. | Version unfinished checkpoints while keeping completed progress. |

## Lesson details and captured evidence

The [beginner journey lesson notes](../../tutorial-simple-v1/LESSONS.md) explain the prepared Support/Force/Sentry and Persona/Codex objectives, intentional exceptions, completion checks and saved-progress migration.

- [First Battle defense explanation](evidence/01-first-battle-defense.png).
- [Selecting a defense card](evidence/02-select-defense.png).
- [Recorded teaching sequence](evidence/03-first-battle-teaching-sequence.mp4).
- [Capture timing and limitations](evidence/capture-report.json).
- [Card-to-role mapping and retained Level 3 skills](CARD-MAPPING.md) / [machine-readable mapping](card-mapping.json).
- [Arrival bonus on desktop](evidence/04-simple-skills-arrival.png) / [mobile landscape](evidence/05-mobile-landscape-skills.png).
- [Support counted once](evidence/06-support-once.png) / [training inspection](evidence/07-training-inspection.png).
- [Barrier Codex at zero](evidence/10-barrier-codex-zero.png) / [after one actual break](evidence/11-barrier-codex-plus-one.png).
- [Practice Duel's two Codex](evidence/12-practice-two-codex.png) / [live practice](evidence/13-practice-live.png).
- [Completion survives reload](evidence/14-saved-progress.png) / [minimal-motion bonus expiry](evidence/15-minimal-motion-expiry.png).
- [Return to five regular Codex](evidence/16-regular-five-codex.png), [original effects](evidence/17-regular-effects-restored.png), and [ordinary AI combat](evidence/18-regular-ai-return.png).

The 1440×900 recording contains **235 real browser captures over 13.886 seconds**, averaging **16.85 captures per second**. The median capture interval is 59 ms, the 95th percentile is 73 ms and the largest gap is 345 ms. This is the capture cadence, not the game's frame rate. All 235 decoded output timestamps match the source to within 1 ms. The final frame is retained for 1 ms because there is no later capture timestamp. No audio, generated motion, interpolated frames or speed changes were added. The PNGs are conversions of the supplied JPEG captures; the originals remain available.

Regenerate the media with `node tools/encode-tutorial-training.mjs`. The encoder uses the saved frames/timestamps and local FFmpeg only; it never opens a browser. `FFMPEG_PATH` can identify an existing FFmpeg executable if the repository-local binary is elsewhere. These captures document the observed sequence, not a frame-rate benchmark or proof of novice comprehension.

## Verification status

### Implemented

- Isolated training definitions/scripts, exactly two active-only Codex choices, automatic L1/L2 roles, and whole State-skill removal from L3 Units. Other card types retain their actual effects.
- All five chapters, plain-language teaching, manual reading steps, bounded Force/Sentry examples, original card artwork and training-aware inspection.
- Saved completion migration, safe restart of incompatible unfinished checkpoints, and a regular-card exit route. Existing hand/Barrier arrangement is unchanged.
- The mapping distinguishes 72 current training variants (including 20 playable L3 Units), one hidden variant, and 83 historical definitions. These are training overrides of existing cards, not new production content.

### Automated checks

- `npm test`: passed the full existing suite during implementation: 20 Node checks and 1,386 Vitest tests; 3 Vitest tests skipped. This covered normal regional gameplay, AI/PvP regressions and tutorial isolation.
- Final focused run: `npx vitest run src/core/tutorial-rules.test.ts src/ui/first-battle.test.ts src/ui/first-battle-session.test.ts src/ui/next-battle.test.ts src/ui/journey-battle.test.ts src/ui/journey-progress.test.ts` — **90 passed across 6 files**. This includes the final prepared-choice wrapper fixes added after the full-suite run.
- The focused checks cover placement/re-entry, normal and special calls, both levels' bonuses, attack/turn cleanup, interrupted attacks, unchanged Force/Sentry responses, repeated Codex changes, Persona replacement, Barrier recalculation, printed DEF, all regional lesson controllers, saved progress, and completed training AI mirror matches.
- Production TypeScript/Vite build passed. Vite reports its large-chunk advisory (largest JavaScript chunk approximately 710 kB minified); this task did not undertake bundle optimization.

### Built-in browser tests

- Completed First Battle through victory, Simple Skills through both expirations, all three Support and Defense encounters, and all three Visayas Persona and Codex encounters.
- Visually observed the Barrier lesson at 11,000 with five Barriers, then 12,000 after one breaks; the Attack Codex preview showed 16,000 and its bonus ended after the attack.
- Entered Practice Duel, selected from exactly two Codex, and observed the AI call/attack/response sequence using training rules. A complete free-practice match was not manually finished; automated training mirrors did finish.
- Replayed Simple Skills with Minimal animation intensity. It completed without unrelated Persona/Codex prompts. The highlighted zone's computed animation was `none`, while reading steps still waited for input. Restored Standard afterward.
- Keyboard activation of a call zone, card inspection/return, coach minimize/restore, saved-completion reload, and normal-match return were exercised.
- After leaving training, normal AI setup again offered five Codex. Arawen inspection showed its original State/Sipol text; the regular battlefield displayed normal State counters and reached ordinary AI attack, Force/Sentry response and defense windows.
- Used only the built-in browser. No user PC browser was opened or controlled. No push or deployment.

### Visual verification and limits

- Reviewed 1440×900 desktop and 844×390 landscape captures. Lesson text uses 15 px / 13 px respectively. The tested mobile coach measured 300×189 px, stayed within the viewport and required no internal scrolling; Continue/Minimize remained 40 px high. Highlighted legal targets and the player's Barriers remained accessible.
- The redundant “Simple effects” portrait caption is hidden at compact sizes so “Tutorial version” fits. This does not alter the portrait, hand or Barrier layout.
- The capture timing limits above apply. No 60 fps smoothness claim is made.
- OS-level `prefers-reduced-motion` was source-checked; only the game's Minimal setting was exercised live. Mobile testing used a resized built-in browser, not a physical touch device.
- Luzon/Mindanao Chapter 4 paths were controller-tested but not each manually replayed in the browser. PvP regression checks passed; no new live two-person PvP session was performed.
- Retained non-State Level 3 abilities can still be complex in free practice. The mapping lists them. Prepared lessons decline unrelated optional skills rather than silently deleting those abilities.
- Independent novice testing has **not** been run. Functioning lessons, passing tests and screenshots do not establish that newcomers understand them.

## Independent novice test protocol (not yet run)

Recruit 5 people who have never played this game, including at least 3 with no TCG experience. Give no coaching beyond the game. Ask them to finish First Battle, Simple Skills and one support encounter.

Record assistance requests, wrong-target clicks, stalled steps, completion time and abandoned steps. After each chapter, ask them to explain in their own words: what Persona and Barriers do; the difference between hand DEF and field Power; when each bonus ends; why support exhausts a Unit; and what changes in a normal match.

Proposed acceptance: at least 4/5 finish the guided sequence unaided, correctly explain both bonus durations and identify the next legal action. Any repeated stall or misleading combat explanation blocks a claim of novice readiness. Report actual results separately from automated/browser checks.
