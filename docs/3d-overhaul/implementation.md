# Implementation and verification — 14 September 2026

The game now has a playable **hybrid 3D presentation**. Three.js draws original procedural scenery, public field cards, and face-down Barriers. HTML retains the hand, pile controls, card text, decision dialogs, inspection, HUD and tutorials. Replay recording, saving and export have no active entry point.

This is an implementation change to the original scene-first architecture: the existing DOM geometry is the shared source for input, highlights and physical card placement. A second raycast input router and a second copy of game state would duplicate working legality and privacy logic. They have not been added. The game controller and card scripts remain authoritative. No gameplay decision waits for the scene module to load.

## Delivered

| Area | Implementation |
| --- | --- |
| Replay removal | No DuelRecorder or MatchCapture construction, replay-store initialization, Saved Games navigation, result save/export button, or wait for a recording. Existing storage is retained. Settings no longer mention MP4 recording. Dormant replay source modules remain available for a future redesign. |
| Renderer lifecycle | Lazy-loaded Three.js, one animation loop/canvas for world and card layers, image cache, material/geometry disposal, hidden-tab suspension, automatic fallback after context loss or rendering failure. |
| Three arenas | Agta forest, Babaylan crystals, Maguindanao stone terraces; shared platform and water base, region-specific colors and original procedural geometry. Static meshes are batched by material. |
| Cards and shields | Existing illustrations on physical card meshes; existing rotations, selection and movement drive the mesh. Barriers always use the card back. Opponent hands and reserve Codex are not submitted to the scene. |
| Effects | Existing SFX mixer, particle effects, card movement, actual-art shattering, checks and result modals retained. Decorative spring impulses accompany attacks and FX. |
| Physics | Analytic, damped, bounded ornament springs. Independent cosmetic RNG; no physics library or gameplay-body simulation. Standard caps active decorative bodies at 12, High at 24; Low/narrow screens do not simulate them. Reduced motion/Minimal stop decorative motion. |
| Graphics controls | Auto, Low, Standard, High, Simple board. Pixel ratio capped at 1 / 1.5 / 2. Auto drops to 1 after a sustained slow sample. Simple board can be chosen during a match. Loading cancellation cannot undo a later Simple board choice. |
| Hub | Three explicit starter-deck destinations, actual Persona illustrations, direct Start/Deck/Tutorial navigation, selected-deck state and responsive layout. Existing custom deck selection is preserved until the player chooses another deck. |
| Deck builder | Existing legality, copy limits, filtering, nine-character names and persistence retained; shared arena palette added. |
| Accessibility | Existing long-press/right-click inspection retained. Inspectable cards now have accessible names, keyboard focus, Enter/Space activation and Shift+F10 inspection. Native card buttons retain native keyboard activation. |
| Tutorials | Existing prepared lessons and progress retained. Resize and expanded Why sections now re-anchor the coach without rebuilding the board or dropping a decision. |
| Result cleanup | No recording waits. Surrender clears the learning acknowledgement and auto-description; new descriptions cannot appear after the winner is set. Result text describes the final hit rather than saying the last Barrier itself wins. |

## Event coverage

Every existing `FxEvent` continues through `BoardUI.playFx`: target, power, powerExpire, destroy, stateReleased, strike, search, emit, codexFlip, arrive, ward, restore. Their existing branch-specific movement, audio, color and outcome handling remains in place. The scene adds only a cosmetic ornament impulse. It does not infer additional damage, spending or successful skill resolution.

`emit.faceUp` remains the visibility boundary for traveling cards. Deck/Heart/Grave/Extra/Exile/Check and resource controls remain HTML. Barrier and field meshes have no event handlers; all accepted input goes through the existing controller. Attacker Forces, ordered defender Force/Sentry, blockers, exact/up-to card choices, mode and slot decisions use their existing UI and engine paths.

## Verification performed

- Full `npm test`: **61 suites passed, 615 tests passed; 2 suites / 3 tests skipped**. Includes full mirror/cross-deck matches, 90-game three-deck round robin, determinism, skills, ordered Force/Sentry, privacy, persistence and tutorial suites. These are engine/regression results, not a claim that every simulated match was visually watched.
- New scene tests: **6 passed** for independent cosmetic randomness, quality caps, bounded/recovering springs, finite batched geometry and per-island draw budgets.
- Focused UI rerun after integration: a duplicated device-gesture string was caught by the mobile suite; changed to the existing `readVerb()` helper and all 26 mobile tests passed. The other 88 focused tests passed.
- Browser: actual title and prepared field inspected; mobile attack selection, Force refusal, defense pause and pre-check deck explanation exercised.
- Browser: Persona coach buttons fit after resize at **1366×768, 1920×1080, 1024×768, 844×390, 667×375, 390×844**. This caught and fixed stale positioning at the two narrowest sizes. Keyboard Shift+F10 opened the correct inspector and Escape restored focus.
- Prepared entry checks: Main, Defense, Force, Personification, Codex/States, Skills, Zones, three guided Agta lessons, three guided Babaylan lessons and three guided Maguindanao lessons opened with one scene canvas and reachable coach controls. Each deck used the expected theme. These checks cover entry/geometry, not manual completion of every step.
- `tools/scene-smoke.html`: instrumented normal match startup and surrender with MediaRecorder blocked and replay-database access blocked. Both attempt counters stayed **zero**; the pre-existing legacy replay value was unchanged.
- The same harness deliberately lost the GPU context during a prepared tutorial. Fallback removed the scene canvas; restart created exactly one canvas, preserving the visible card UID and the ongoing lesson. No browser errors.
- A prepared two-unit scene measured **16.7 ms/frame, 16 draw calls, 3 textures, pixel ratio 1.5** in the Codex in-app browser at 1366×768 before the Barrier-mesh addition. This is a baseline measurement, not a worst-case guarantee.
- Production build passed. Three.js is a separate lazy chunk (~137 KB gzip); the game entry remains ~224 KB gzip. Existing Vite large-chunk warnings remain visible rather than being suppressed.

## Limits and remaining validation

This is a hybrid renderer, not a replacement of every DOM visual with a mesh. The existing Pixi particle layer is retained alongside Three.js; it has not been rewritten. No external character models, explorable vehicle/world, Rapier simulation, cinematic camera travel or scene raycast controls were added.

The original blueprint's exhaustive release matrix is **not fully completed**: every tutorial step has not been manually completed in the new presentation, physical iOS/Android touch and GPU testing remains outstanding, and worst-case full-match browser profiling / 125% browser zoom have not been signed off. Keep this distinction when reporting completion. The complete original redesign must not be described as fully finished based solely on the passing unit tests.

Nothing has been committed or deployed. Run `npm run dev -- --host 127.0.0.1` in `C:/Code/codexlegend`; the development harness is served at `/tools/scene-smoke.html`. It is not an input to the production build.
