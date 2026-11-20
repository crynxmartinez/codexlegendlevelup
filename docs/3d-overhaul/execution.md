# Overhaul execution checklist and resume record

Status: SUPERSEDED. The user stopped the 3D overhaul and chose a 2D title and duel. Do not execute the historical checklist below. See [current UI work](../ui-cleanup-review.md).

Read [the master plan](README.md) before implementing. Target `C:/Code/codexlegend`, not the marketing repository. Existing working-tree changes are substantial; preserve them.

## Resume protocol

At the beginning of each implementation session:

1. Read README.md decision table and the latest session entry at the bottom of this file.
2. Check repository identity, AGENTS.md instructions, git status, current dependencies and current code at the phase's integration points. Line numbers in earlier notes can drift.
3. Locate the last verified milestone, not merely the latest modified file.
4. State the current phase and bounded work being performed.
5. Complete its implementation and tests before moving to the next phase.
6. Record evidence and outstanding defects below. Never discard unrelated uncommitted changes to make a checkpoint clean.

Maintain a changed-file manifest per phase. Commit only if separately requested; no automatic deployment. Code creation begins only after the user authorizes implementation of this plan.

## Phase 0 — isolate scope and disable replay features

Dependencies: none. Risk: current recording startup also creates a live rendering surface.

Tasks:

- [ ] Inventory current replay startup, result actions, navigation and store initialization.
- [ ] Disable automatic DuelRecorder and MatchCapture construction through one explicit feature configuration.
- [ ] Remove Saved Games / Save game / Export UI routes from the active player flow.
- [ ] Remove result-screen waits for recording completion.
- [ ] Ensure current live scene/effects do not disappear when MatchSurface is no longer created by capture.
- [ ] Retain old stored replays/videos without reading/writing/deleting them during ordinary matches.
- [ ] Retain local deck saving, settings and tutorial progress.
- [ ] Establish legacy/arena3d presentation boundary and keep legacy default.
- [ ] Save baseline screenshots and timing for title, prepared duel, Force queue, defense, search and tutorial.

Files: main.ts, match-capture.ts, replay-record.ts, replay-store.ts, match-surface.ts, settings/config boundary; touch only necessary call sites.

Exit evidence: a full legacy match starts/finishes with no MediaRecorder invocation, no capture audio stream, no replay writes and no dead buttons. Seeded old local save remains present. Deck save and tutorial progress still work. Build and focused persistence/capture tests pass.

Rollback: restore active feature wiring if it breaks live presentation; do not clear data to repair the UI.

## Phase 1 — renderer shell and greybox arena

Dependencies: Phase 0.

- [ ] Select and pin a compatible Three.js version; keep TypeScript/Vite and current fonts/mixer.
- [ ] Implement SceneHost with one animation loop and clean mount/dispose.
- [ ] Implement SceneLayout and a greybox arena using the existing logical zones.
- [ ] Implement fixed duel camera and viewport-safe framing.
- [ ] Implement one CardView using actual card face/back art.
- [ ] Implement TextureCache with shared textures and disposal accounting.
- [ ] Implement asset failure placeholder and renderer failure fallback.
- [ ] Gate new presentation behind the development mode switch.

Exit evidence: correct zone layout at all target viewports; face/back orientation correct; cards legible; repeated mount/unmount does not leave canvases/listeners. No rule changes. Greybox is allowed; input must already be geometrically accurate.

## Phase 2 — live state adapter and interaction

Dependencies: Phase 1.

- [ ] Build seat-filtered SceneSnapshot with card UID, visible definition, zone, state and displayed stats.
- [ ] Implement reconcile without rebuilding the whole scene after each action.
- [ ] Connect anchors to the same projection used for input and tutorials.
- [ ] Implement InputRouter priority: modal, inspector, tutorial, target, select, hover.
- [ ] Support click, keyboard and touch inspection/selection; suppress long-press click.
- [ ] Keep centered card choices and concise padded footers; no side detail pane.
- [ ] Block gameplay input during mandatory decisions and View board mode.
- [ ] Route all commands through existing controller legality checks.

Exit evidence: selection and legal targets match legacy; same-name copies remain distinct; enemy hands stay concealed; touch scrolling never selects accidentally; modal/board actions cannot double-submit.

## Phase 3 — complete Agta combat vertical slice

Dependencies: Phase 2. This is the first product review milestone.

- [ ] Map all hooks/events needed for draw, call, attack, defense, check, resource change and destruction.
- [ ] Implement attacker Force window on every eligible attack.
- [ ] Implement defender ordered Force/Sentry sequence with visible selected order.
- [ ] Stop later presentation/spending when the engine interrupts the attack.
- [ ] Implement blockers after responses; clearly distinguish Force skill and Force blocking.
- [ ] Show deck → Check → effect → destination as separate readable steps.
- [ ] Implement shield break with persistent broken state in any result view.
- [ ] Add Sentry ward and stopped-attack outcome.
- [ ] Port pace/acknowledgement/finish-animation behavior.
- [ ] Integrate audio once per event; no duplicate legacy cues.
- [ ] Reconcile immediately after animation failure or skipped presentation.

Exit evidence: real prepared scenarios for ordinary hit, equal-power hit, successful block, multiple Forces, Sentry first/middle, insufficient later cost, interrupted attack, attack check Force/non-Force and final victory. Full match completes. Rule-state parity with legacy confirmed.

Do not proceed to elaborate hub scenery if this phase is incomplete.

## Phase 4 — Agta art pass and bounded effects

Dependencies: Phase 3.

- [ ] Apply shared palette, lighting, material and typography tokens.
- [ ] Add procedural platform, peripheral forest silhouettes and lightweight foliage.
- [ ] Tune card thickness, contact shadows and readable face lighting.
- [ ] Add analytic fragments and restrained ambient movement.
- [ ] Evaluate whether cosmetic Rapier bodies add enough value to justify implementation.
- [ ] If added, enforce fixed-step cap, pooling, disposal and complete rules isolation.
- [ ] Establish quality tiers and measure representative stress scenarios.

Exit evidence: screenshot/video observations of ordinary play and effects at desktop/mobile sizes; no unreadable zones; frame-time report with device/browser; fallback remains operational. Metrics are measured with replay capture disabled.

## Phase 5 — all decks and all zones

Dependencies: Phase 4.

- [ ] Add Babaylan and Maguindanao arena manifests sharing the same board layout.
- [ ] Map Heart/spirit, Essence, Offer, Vent, state release and Codex changes to the existing event vocabulary.
- [ ] Audit all current battle hooks and FxEvent types; record renderer mapping coverage.
- [ ] Preserve card searches, reveals, replacement slots, personification and optional triggers.
- [ ] Verify reused visuals do not imply a wrong cost or effect for another deck.
- [ ] Run full mirror and cross-deck matches.

Exit evidence: all current event types mapped or explicitly documented as no-op; no missing chooseCards/chooseTarget/chooseSlot/chooseMode routes; all three deck suites and complete matches pass.

## Phase 6 — archipelago hub and deck builder

Dependencies: first complete arena and shared design tokens. Keep this after functional duel validation.

- [ ] Build three island destinations with explicit deck mapping.
- [ ] Add brief transitions and readable direct navigation.
- [ ] Preserve existing active deck and title button order/height.
- [ ] Provide first-load poster/static menu and failure fallback.
- [ ] Apply shared card tiles and inspection to deck-building screens.
- [ ] Preserve copy limits, legality checks, nine-character deck names and local persistence.
- [ ] Keep replay features absent.

Exit evidence: title → deck edit/save → start game → result → title works repeatedly on keyboard and touch, without loading loops or wrong active deck. No mandatory intro delays returning players.

## Phase 7 — learning path and usability

Dependencies: Phases 3 and 5.

- [ ] Port lesson anchors to live projected positions.
- [ ] Preserve existing prepared situations, step gates and completion progress.
- [ ] Verify Persona explanation, Ally skills wording, Codex opportunity timing and shield damage explanation.
- [ ] Verify tutorial menu size and Back to title/Reset progress visibility.
- [ ] Verify defense and attack-check pauses with actual cards and targeted highlights.
- [ ] Ensure Minimize resumes the lesson instead of leaving the match.
- [ ] Verify advanced deck-game-plan lessons retain their intended state and skills.
- [ ] Complete viewport, zoom, keyboard, reduced-motion and mute checks.

Exit evidence: every existing lesson can be completed with visible target and reachable action; no overlay obscures its own required button. No gameplay instruction depends only on an animation.

## Phase 8 — hardening and default switch

Dependencies: all prior phases.

- [ ] Run build and focused engine/UI/adapter regression suites.
- [ ] Measure a long match, large hand, full board and chained-effect stress fixture.
- [ ] Simulate missing images, GPU context loss, tab hiding/resuming, resize and navigation cancellation.
- [ ] Verify no replay saving, recording, export controls or debug banners return.
- [ ] Verify old local replay/video data and unrelated local settings survive.
- [ ] Confirm legacy fallback preserves a live match and current mandatory decision.
- [ ] Document known limitations and real device results.
- [ ] Enable arena3d default only after acceptance matrix passes.
- [ ] Retain rollback for one validation cycle; deployment is a separate explicit action.

Exit evidence: functioning, readable, tested full game. No unresolved blocker in card selection, turn flow, mandatory decisions, mobile controls or state correctness.

## Required scenario matrix

| Scenario | Engine assertion | Visual/input assertion |
| --- | --- | --- |
| Decline Force twice on separate attacks | Both eligible attacks offer the window | Clear current attacker persists |
| Force → Sentry → Force | Last card stays in hand | Sentry cancels impact; no later flourish |
| Force exhausts/removes attacker | Attack stops | No blocker prompt or check animation |
| Force removes target | No damage to stale target | Clear source/target state and recover |
| Unaffordable later card | No negative Energy or unpaid skill | Card stays in hand; recoverable explanation |
| Equal attack/defense | Hit | No misleading held state |
| Force used as blocker | No Force skill activation | Defense contribution and discard visible |
| Duplicate card definitions | Independent UIDs | Correct instance highlights/selection |
| Limited top-N search | No extra candidates disclosed | Filter never widens reveal |
| Long name | Rules identity unchanged | Constant tile size and usable inspection |
| Mobile long-press + release | No selection/commit | Inspector opens and dismisses cleanly |
| Scroll gesture | No accidental action | Smooth hand/grid scrolling |
| Skip animation | Same final game state | No unresolved fragments/overlays |
| Graphics failure | Match still active | Legacy view resumes same decision |
| No MediaRecorder/storage access | Gameplay unaffected | No replay UI or recording delay |
| Restart after result | Fresh game created intentionally | Previous scene fully disposed |

## Implementation session entry template

Copy this block after each meaningful work session:

- Date / phase / feature flag:
- Starting revision and existing dirty-work notes:
- Changed files and purpose:
- Decisions changed (link Dxx, or none):
- Scenarios exercised:
- Commands/check results:
- Browser/device/viewport and performance measurements:
- Evidence paths (screenshots/logs):
- Implemented but not yet verified:
- Known defects and reproduction:
- Next exact task:
- Rollback/fallback state:

## Planning session — 2026-09-14

Completed: source research, current-game renderer/asset audit, master design, migration boundaries and phased verification plan. User removed replay saving from current scope; D09 and Phase 0 reflect that correction. No game source, dependencies or stored data changed during this planning task. First implementation task is Phase 0; no phase is marked implemented or verified yet.
