# Codex Legends — complete 3D presentation overhaul plan

Status: SUPERSEDED by the user’s 2D direction. Keep the title as one centered Philippines map without labels; keep the duel free of 3D scenery. Do not resume this overhaul. Replay remains deferred. The material below is historical.

Date: 2026-09-14. Target repository: `C:/Code/codexlegend`.

Read this file first, then [reference research](research.md), then [implementation checklist](execution.md). This document is the design authority for the overhaul. The latest explicit user correction overrides any older proposal.

## 1. The experience we are building

A dimensional card-battle world set in the fractured Philippines. The player sees physical cards on a carefully lit arena surrounded by a restrained living landscape. Every selection, cost, summon, check, attack and shield break has a readable visual cause and result. The existing card illustrations remain the stars.

The main hub presents Luzon, Visayas and Mindanao as three destinations. Players can explore them through short camera transitions, but can also start a game immediately through clear buttons. The first playable milestone is one Agta arena with real cards and working gameplay. The final planned release includes all three deck themes, the complete duel flow, deck building, tutorials, settings and result screens.

The reference is Bruno Simon's current 3D portfolio. We adopt its coherent environment, controlled framing, material consistency, responsive interaction and selective physics. Our product remains a card game with direct controls. A driving game, open-world movement and fully animated 3D versions of every card character are outside this release.

## 2. Decisions that must survive every implementation session

| ID | Decision |
| --- | --- |
| D01 | Preserve the existing rules engine, card IDs, deck legality and existing Set 1 skills. |
| D02 | Persona means **you in this fractured Philippines**, not your leader or a separate commander. |
| D03 | Luzon = Agta; Visayas = Babaylan; Mindanao = Maguindanao. Preserve Set 1 filtering and tagged Sentries. |
| D04 | Retain ordered attacker Force → defender Force/Sentry → blockers flow. Sentry stops the attack when it resolves; later queued cards remain in hand. |
| D05 | Physics never determines damage, targeting, shuffle order, card costs or the winner. |
| D06 | Card pickers stay centered with no permanent info sidebar. Right-click inspects; mobile long-press inspects without selecting. Show contextual inspection hints. |
| D07 | Do not restore the removed verbose defense-footer sentence. Buttons need visible inset spacing. Full rules remain accessible through inspection/tutorials. |
| D08 | No player-facing MP4/renderer/storage debug banners. Developer diagnostics belong behind an explicit development flag. |
| D09 | Replay saving, automatic recording, saved-game playback and video export are deferred. Remove their current player-facing entry points and automatic start during implementation. Preserve existing local saves. |
| D10 | Keep local deck saving, tutorial progress and settings. “Remove replay saving” does not mean remove all persistence. |
| D11 | Keep Start — Deck name, Deck, Tutorial ordering; Tutorial retains its distinct accent. Retain the nine-character deck-name limit. |
| D12 | Learning, Standard and Fast remain player choices. Skip animation cannot skip a decision or modify the final game state. |
| D13 | No forced camera orbit, shaking or blur while the player is reading/choosing. Provide reduced motion and lower graphics quality. |
| D14 | Keep the current presentation as a fallback until the new renderer passes complete match and input tests. |
| D15 | No automatic deployment or broad unrelated refactor. Make narrow, reviewable migration steps. |

## 3. Scope and deliverables

### Included

- New visual system: palette, typography, spacing, card materials, scene lighting and interaction states.
- 3D battlefield, card movement, readable hand, barrier objects and resource feedback.
- Agta, Babaylan and Maguindanao scenery variations sharing one board geometry/layout.
- Dimensional archipelago title hub and polished deck-building interface.
- Integration of every existing duel event and decision surface.
- Tutorial anchors that follow projected 3D positions, plus learning-path navigation.
- Existing audio integrated with the new scene and pacing controls.
- Mobile/keyboard access, performance instrumentation and robust fallback.
- Replay feature deactivation without deleting stored data.

### Deferred

Replay redesign, recording/export, PvP transport/server, avatars walking between islands, terrain traversal, public chat, cosmetic shops, seasons/day-night simulation, achievements unrelated to learning, individual animated creature models, VR and gamepad support. Do not implement these opportunistically during the arena work.

### First vertical slice

Agta arena → existing prepared match → select attacker → choose target/support → optionally order Forces → defender responds → blockers → Persona check → result → barrier break → continue. Include at least one stopped attack, one Force-as-blocker, one Sentry, one card search and one tutorial highlight. Use actual engine actions, not a video or scripted imitation of a match.

## 4. Art direction and visual grammar

### Shared style

Stylized fantasy diorama with matte dark stone, restrained warm metal edges, soft colored environmental light and saturated card illustrations. Avoid a screen filled with neon borders. One strong visual focus at a time: the active card or the current decision.

Proposed palette tokens, to be validated in the prototype:

- Base background `#090D16`; panels `#121B29`; borders `#34495A`.
- Main text `#EDF2F5`; secondary text `#B6C2CF`.
- Gold action accent `#D9B56C`; selected/available accent `#74DCF3`.
- Damage `#F07B74`; successful defense `#83D6B0`.
- Never rely on color alone: selected cards have an outline/badge; legal targets have a marker; exhausted cards have orientation plus a visible state cue.

Use the existing local fonts. Desktop body text starts at 14–16px; secondary labels remain readable at 12px minimum where practical. Avoid shrinking long card names independently. Tile names occupy two fixed lines; full names remain available in inspection and accessible labels. Ordinary actions have at least 44px touch targets; primary buttons should be about 48px tall.

### Arena themes

| Theme | Environment proposal | Signature motion | Guardrail |
| --- | --- | --- | --- |
| Agta / Luzon | Forest-edge stone platform, distant mountain silhouettes, warm canopy light | Leaves drift outside the board; wind ribbons follow deck-call events | No foliage crosses card names or target rings |
| Babaylan / Visayas | Coastal platform, distant water, soft spirit-colored light | Gentle water shimmer; restrained spirit motes around relevant resource events | Spiritual motifs are game art proposals, not asserted cultural history |
| Maguindanao / Mindanao | Layered stone terraces, warm dusk, ember accents | Short ember trails and weightier impact fragments | Avoid invented sacred scripts or architecture presented as authentic |

Only decorative scenery changes between arenas. Zone positions, hand interaction and readability stay consistent. Initial geometry can be procedural. Later regional props require art review and provenance.

### Lighting and materials

One main directional light and soft ambient fill. Cards retain readable original colors through a near-unlit face material or tightly controlled lighting contribution; borders and thickness may receive stronger lighting. Card faces must not become black when turned or washed out by bloom. Use light contact shadows beneath raised cards. Enable one small shadow map on Standard, a better map on High, and contact-shadow approximations on Low. No depth-of-field blur over game content; any hub blur must disappear before interaction.

## 5. Screen-by-screen redesign

### Title / archipelago hub

Full scene with three island destinations and a lightweight HTML menu in a reserved region. Initial state selects the currently active deck and frames its island. Hover/focus produces a small highlight; clicking another destination performs a 350–600ms camera transition. A second clear action starts the match; hovering never changes the saved deck.

Keep direct Start — [deck], Deck, Tutorial actions. Settings and About may remain secondary. Remove Saved Games, Save Replay and Export Video entry points. Show a static scene poster immediately while 3D assets load. If 3D cannot initialize, the menu still works. Returning from a duel restores the selected deck without forcing an intro sequence.

### Deck builder / collection

Use a mostly flat interface with a subdued arena background. The builder is a reading and editing task: no moving camera while filtering or scrolling. Keep collection and deck contents distinct; show deck count/legality and card copy limits. Use the same centered tile and inspection behavior as in-game choices. Preserve existing save/edit/delete behavior and deck-name constraint. No card is added by right-click/long-press. A large optional card inspection can use a gently rotating card while all rules text stays flat and readable.

### Battlefield layout

Build a stable, symmetric arena. Reuse existing slot adjacency and logical zone meaning. Each side has its Persona and four Ally slots in the established left-to-right order. Keep deck, Grave, Exile, Codex/Extra, Check and defensive-card presentation identifiable. Heart/resources must remain visible when relevant to the deck. Do not create new gameplay slots because the art looks empty.

Proposed scene coordinates: Y is up, X left-to-right, Z toward/away from the player. Use one shared card width/height constant derived from actual image aspect ratio. Zone positions are data, not magic numbers repeated in animation functions. Player orientation is transformed by the view adapter so the local player always occupies the near side. Screen labels and hit regions are projected from the same anchors as the meshes.

Reserve a lower safe band for the hand and a top safe band for opponent status/phase. Keep the center corridor free for attacks and check reveals. On compact screens collapse secondary resources into an accessible tray; never conceal the active decision or End Phase action behind a status panel.

### Hand

Cards sit in a shallow fan or straight shelf according to available space. Hover lifts one card without moving every neighbor; keyboard focus produces the same state. Pointer down does not commit a play. Tap selects; subsequent target/confirmation completes the engine action. Long-press opens inspection and suppresses the following click. Horizontal hand scrolling must remain distinct from pressing a card. Hand overflow uses controlled scrolling, not infinitely shrinking cards.

### Search, Grave and response dialogs

Reuse `card-choice.ts` behavior. Center card tiles and keep filters contextual. Footer shows chosen cards/order and concise actions with at least 8–12px internal padding. Preserve search limits: a skill that sees the top N cannot browse the rest of the deck. Sorting must only affect the display. Details are available on right-click/long-press; do not rebuild the rejected side panel. View board minimizes the decision and returns to it without allowing another action.

During battle, show compact attack/defense values close to the relevant cards or a small combat header. Keep the verbose footer sentence removed. An optional help icon can explain that ties hit; tutorials teach it explicitly. No false promise that a pre-check defense preview is the final result.

### Results

Short winning impact, then a readable Victory/Defeat panel. Actions: Play again, Change deck, Back to title. No recording wait, Save game, Export or storage status. Result dismissal does not delete prior local data. Loss feedback should come from actual game results rather than invented strategic advice.

### Settings

Separate gameplay pace from graphics quality and sound. Retain sound/music/ambience controls, reduced motion, shake and effect intensity. Add Graphics: Auto / Low / Standard / High and Restore camera. Show quality controls in plain language. Technical frame/GPU counters remain developer-only. Settings changes apply without resetting the match.

## 6. Cards and interaction contract

Use a thin card mesh: front artwork, back artwork and a simple edge. Share geometry, cache textures by definition ID and track views by instance UID. Duplicate copies can share the image while retaining separate selection/zone state. Keep source art unchanged. Card backs represent concealed cards; the renderer must not expose an opponent's hidden face through an inspection route or accessible label.

State priority, highest first: mandatory modal → inspector → tutorial action gate → target selection → ordinary card selection → ambient hover. One InputRouter owns this precedence. Raycasts only consider eligible visible meshes; decorations never intercept a card action. DOM controls and mesh clicks dispatch the same command and must not double-submit.

| Input | Behavior |
| --- | --- |
| Hover or keyboard focus | Highlight/lift and show inspection hint |
| Left click/tap | Select or follow the current allowed action |
| Right click / Shift+F10 | Inspect without selecting/spending |
| Touch hold around 500ms | Inspect; cancel hold after movement threshold around 10px |
| Escape in required choice | View board/return; do not decline or spend |
| Confirm | Commit once, disable until controller accepts/rejects |
| Invalid/stale target | Keep decision recoverable and refresh legal targets |

Use semantic HTML buttons for all required actions and keyboard access to card choices. Do not make a canvas-only interface that a keyboard user cannot operate. Maintain full card names for screen readers even when visible tile names are clipped.

## 7. Motion and physics specification

### Three kinds of motion

1. **Authoritative card motion:** transforms interpolate between named zones after an engine event. The destination is predetermined. Use GSAP or existing pace-aware animation helpers.
2. **Responsive UI motion:** damped lift/tilt and short highlights. Cancel or reverse cleanly when input changes.
3. **Cosmetic simulation:** shield/card fragments and peripheral props. Bounded lifetime and no gameplay influence.

A card may look like it lands on a surface, but a physics collision must never decide whether it was summoned, paid as a cost or destroyed. A shield shatters only after the engine says a Barrier broke. No thrown dice physics determines game setup randomness.

### Cosmetic simulation plan

Start with analytic fragments: initial position/velocity, gravity, rotation and lifetime, evaluated from presentation time and a cosmetic seed. They are cheap, stable and easy to skip to completion. Add a small isolated Rapier world only if a later visual review needs fragments bouncing off arena geometry. This prevents a physics dependency from blocking the first playable arena.

If Rapier is adopted: fixed 1/60s cosmetic step, accumulator with a maximum of three catch-up steps per frame, interpolation for rendering, drop excess elapsed cosmetic time after tab resume. This is our proposed design, not a claim about Bruno's implementation. Static arena collision plane; simplified fragment colliders; group masks exclude cards and input targets. Pool at most 24 active physical fragments on High, 12 on Standard and zero on Low. Remove/sleep fragments by two seconds. Pausing/finishing an effect cancels its bodies and settles the intended final visual state.

### Initial timing ranges (tuning targets)

| Event | Standard presentation | Learning / reduced motion behavior |
| --- | --- | --- |
| Select | 100–160ms lift and solid outline | Immediate outline if motion reduced |
| Draw/call | 250–450ms travel, small landing response | Explain source/destination; never cover the hand |
| Skill activation | 250ms source emphasis then cost/target | Wait for required choices; manual important result |
| Attack | 200–300ms anticipation, 200–350ms travel/impact | Keep source/target distinct; use existing pace multipliers |
| Defense | Cards enter a visible defensive line before result | Pause to teach comparison in lesson fixtures |
| Force check | Deck highlight → card to Check → reveal → effect → hand | Preserve separate tutorial pauses at each required point |
| Barrier break | 350–650ms crack and fragments | Static cracked state plus result text when motion reduced |
| Sentry | 250–450ms ward, attack dissipates | Clear stopped state; no later attack check or blockers |
| Victory | At most ~1.2s flourish before controls | Skip flourish without skipping final result |

The named pace table remains the timing authority. Avoid duplicating arbitrary delays across new modules. Camera shake is optional and brief; do not combine shake, zoom and large flashes for routine actions. Only one major spectacle plays at a time.

## 8. Exact combat presentation sequence

1. Player selects a legal charged attacker. Show a persistent selected outline and valid targets.
2. Select legal supporters/target using current rules. Show where each support contribution comes from.
3. Submit the attack once. Declaration triggers resolve according to the engine.
4. Attacker Force window offers playable hand cards for this attack. Multiple selection and explicit order remain available. Decline continues this attack only.
5. Show each Force leaving the hand, its cost, source/target and effect. Refresh remaining legal state. If the attack stops, end the remaining response animation queue without spending later cards.
6. Defender Force/Sentry window follows only while the attack is active. Render chosen order. A resolved Sentry visibly cancels the attack and stops the rest of that queue.
7. If still active, choose blockers from the remaining hand. Force-as-defense is visually labelled as blocking, not a skill activation. No used card appears in both stages.
8. Defender cards appear in their defense position. For Persona attacks, highlight the deck before the check. Move the revealed card to Check, reveal it, resolve any check effect, then move it to the proper destination.
9. Use final engine values to show hit/held/stopped. Equal attack/defense hits. Ordinary damage to the Persona breaks one Barrier while available; retain the engine's actual win condition after all Barriers are gone.
10. Show the actual targeted card/shield breaking in the relevant result surface. If a modal repeats the result, it must display the same broken state; no intact card under “Defense broken.”
11. Settle zones, discard blockers correctly, apply after-battle triggers, clear transient selection and return control.

No animation may synthesize a new damage event, spend a card or reorder an engine effect. If rendering fails mid-sequence, reconcile all meshes to the latest allowed state and release the presentation wait safely.

## 9. Technical architecture and migration boundaries

Recommended first renderer: plain Three.js with TypeScript and the current Vite setup. No React migration is needed. Begin with the stable WebGL rendering path for the prototype; evaluate WebGPU only after the complete arena is reliable. Pin a verified version at implementation time. Avoid copying the reference's whole dependency list or Three.js overrides.

Keep GSAP where useful and keep the existing Web Audio mixer. Existing Pixi effects remain on the legacy renderer; port their event vocabulary to 3D particles gradually. Do not run legacy Pixi effects, a Three scene and a full DOM repaint canvas as three permanent rendering layers.

Proposed module boundaries (new paths are specifications, not existing code):

| Path | Responsibility |
| --- | --- |
| `src/ui/scene/SceneHost.ts` | Own one renderer, canvas, lifecycle and frame scheduler |
| `src/ui/scene/DuelScene.ts` | Arena assembly and current board views |
| `src/ui/scene/HubScene.ts` | Archipelago scene and navigation transitions |
| `src/ui/scene/SceneLayout.ts` | Logical anchors, camera framing and screen projection |
| `src/ui/scene/CardView.ts` | One UID's physical card view and state styling |
| `src/ui/scene/TextureCache.ts` | Load/cache/dispose card and environment textures |
| `src/ui/scene/InputRouter.ts` | Raycast, keyboard/touch arbitration and modal lock |
| `src/ui/scene/PresentationBridge.ts` | Existing events/hooks to queued scene commands |
| `src/ui/scene/SceneSnapshot.ts` | Seat-filtered immutable display data; no raw hidden hand access |
| `src/ui/scene/effects/` | Attack, Force, barrier, Sentry and resource visuals |
| `src/ui/scene/arenas/` | Common arena plus deck-specific scenery manifests |
| `src/ui/scene/QualityController.ts` | Measured quality tiers and settings integration |
| `src/ui/scene/CosmeticPhysics.ts` | Optional decorative simulation, never rules state |
| `src/ui/scene/SceneAnchors.ts` | Projected anchors for tutorial/help/DOM hit regions |
| `src/ui/scene/SceneHost.test.ts` | Disposal, lifecycle and failure behavior |

Existing integration points:

- `core/game.ts`, `core/state.ts`, `core/battle.ts`, card scripts and AI remain authoritative.
- `ui/main.ts` delegates rendering through a presentation adapter; extract one concern at a time.
- `ui/presentation.ts` and `ui/pace.ts` retain order, acknowledgement and cancellation semantics.
- `ui/card-choice.ts` retains current choices while receiving themed styling and correct anchors.
- `ui/tutorial-mode.ts` and lesson definitions use projected anchors rather than hardcoded screen coordinates.
- `ui/sfx.ts` retains mixing and player settings; sound emits once per presentation event.
- `ui/match-surface.ts` stays legacy-only during transition; it must not repaint the new scene for recording.

Suggested adapter surface: mount(container), reconcile(snapshot), present(event, abortSignal), anchor(uidOrZone), setQuality(tier), resize(viewport), dispose(). All async presentation methods settle on success, cancellation or recoverable graphics failure. Fallback can rebuild from the current snapshot without reconstructing the duel.

Use feature flag `presentationMode: legacy | arena3d`, defaulting to legacy until release gates pass. It is a development migration switch, not a permanent confusing extra player setting. Avoid editing legalActions to accommodate visual convenience. Never read future state into an earlier animation: retain before/after event snapshots for cards in transit.

## 10. Replay deactivation — required early task

Latest user instruction: remove replay saving for now and redesign it later. This is an implementation task for Phase 0, not a request to delete local storage during planning.

- Gate/remove automatic `DuelRecorder` creation and `MatchCapture.start()` at match startup.
- Remove startup replay-store initialization if nothing else needs it; avoid video writes and MediaRecorder/audio capture streams entirely.
- Remove Saved Games navigation, post-match Save game/Export controls and recording progress/error banners.
- Simplify result flow so it never awaits MP4 completion or storage writes.
- Preserve deck library/settings/tutorial persistence. Do not clear IndexedDB or localStorage broadly.
- Preserve old replay modules/data on disk during transition; delete dead imports or lazy-load dormant code so it is not in the active path.
- Inspect live rendering dependencies: MatchCapture currently constructs MatchSurface. Confirm the legacy board and current effects remain visible after recording is disabled. Keep any independently required live renderer lifecycle explicitly owned by the UI.
- Test a full game with MediaRecorder unavailable, storage blocked, and old saves present. Gameplay/results must still work and old data must remain unchanged.

Future replay planning may reuse game events but must be a separate specification. Do not add speculative video composition or replay compatibility requirements to the new renderer's first release.

## 11. Asset plan

| Existing asset | Initial use | Additional work |
| --- | --- | --- |
| Card WebP art and thumbnails | Card faces; thumbnail grids | Audit dimensions, crop policy, decoding and texture quality |
| Card back | Concealed cards and deck stacks | Verify UV orientation and double-sided privacy |
| Game mat | Reference for zone arrangement, optional early surface | Replace flat baked decoration only after geometry is readable |
| Three Philippines region images | Hub labels/poster/fallback | Build simple island silhouettes/meshes; flat images are not ready-made 3D islands |
| Character cutouts | Portraits or layered hero elements | Review transparency/edges; do not promise rigged animation |
| Existing WAV cues/mixer | UI, card movements and battle outcomes | Tune levels and synchronize contact points |
| Existing cutscene WebM | Optional already-supported spectacle | Keep out of required loading and respect reduced motion |
| Local fonts | HTML controls and text | Verify font loading before layout measurements |

Create an asset manifest with file path, role, dimensions, source/license and quality tier. Keep originals and derivatives separate. Load a small arena/hand working set rather than all 795 WebP files. Start with WebP textures; introduce KTX2/GLB tooling when measurements justify it. Any decoder files are self-hosted. Deduplicate GPU textures by card definition ID and reference-count their lifetime.

New required content can initially be procedural: platform, card edges, zone rings, shield geometry, simple rocks, distant silhouettes and pooled particles. New bespoke character models are optional future work. Do not imply current art assets alone provide the same authored landscape richness as Bruno's world.

## 12. Performance and resilience targets

These are acceptance targets, not measured current results or promises for every phone.

| Metric | Desktop Standard target | Mobile Low target |
| --- | --- | --- |
| Active duel | 60 FPS target; p95 frame time <=20ms on named test machine | 30 FPS target; p95 <=36ms on named test phone |
| Interaction feedback | Selection visible within 100ms under normal load | Same target; do not wait for animation completion |
| Pixel ratio | Cap around 1.5 initially; High at most 2 | Cap around 1 |
| Initial scene budget | Aim <=8MB compressed beyond common UI; measure actual transfer | Aim <=4MB lightweight scene |
| Draw calls | Starting budget <=150 | Starting budget <=80 |
| Texture working set | Starting estimated GPU budget <=128MB | Starting estimated GPU budget <=64MB |
| Decorative bodies | <=12 Standard; <=24 High | None |

Validate budgets against actual asset quality, not arbitrary downscaling. Record browser/device/GPU, viewport, warm/cold cache, capture disabled, and the exact scenario. Test worst-case full field, long hand, repeated Forces, mass destruction and long play sessions. Collect frame-time distributions and long tasks; an average alone can hide stutter.

Auto quality samples moving scenes, uses a sustained low-performance window before stepping down, and waits longer before stepping up. It must not oscillate every second or alter game pace. Stop ambient work when hidden. On resume reset cosmetic delta and reconcile; do not fast-forward game decisions. Handle context loss, missing texture, loader failure and scene disposal. A plain board fallback must retain the current match and decision.

## 13. Tutorials and accessibility

Port the existing learning path, not a second competing tutorial system. A lesson starts with the same prepared deck/state. Anchors resolve by UID/zone each frame while the scene/camera moves, then stabilize before instruction. Highlight the exact Persona, Ally zone, deck, defense card or Continue button referenced. Place the message in free screen space near the target with a connector when needed.

Preserve the detailed attack-check and defense lesson pauses. “Your Persona” explains that the card represents you. Explain a Force check before revealing the top card, show its placement in Check, then explain its destination. Defense instruction teaches that equal or higher attack Power hits. A minimized lesson resumes instead of exiting to title.

Required viewport matrix: 1366×768, 1920×1080, 1024×768, 844×390, 667×375, 390×844, and 125% browser zoom. Also test keyboard-only, touch scroll/hold, reduced motion, muted sound and GPU failure. No essential information is conveyed only by sound, color, hover or physics.

## 14. Verification and release gates

Preserve the existing focused test suites, then add meaningful tests at the adapter boundary. Do not replace engine tests with screenshot tests.

- Same initial state/seed and accepted actions produce the same rule state in legacy and 3D modes. Cosmetic seed changes must have no effect on game hashes.
- Every existing battle hook/event has a mapping, an explicit no-op or a documented legacy fallback.
- Attacker/target highlights remain through all prompts; cancellation clears them correctly.
- Every chooser resolves once. Reordering is free; used Forces cannot block; Sentry stops the remaining queue.
- Long names and duplicated cards do not change tile sizes or confuse UID selection.
- Hidden enemy cards stay hidden in geometry, DOM labels, inspectors and snapshots.
- A full match for each deck, including cross-deck matches, completes without renderer errors.
- All tutorials work through the same renderer, with reachable buttons and stable projected highlights.
- Leaving/re-entering a match repeatedly does not grow listeners, canvases, active bodies or decoded textures without bound.
- Replay-disabled mode performs no automatic video capture or replay writes; existing saved data is preserved.
- Legacy fallback, missing assets, context loss and interrupted animation all preserve playable state.

Only enable arena3d by default when the complete duel, mobile input, tutorials and performance gates pass. Keep rollback available for one validation cycle. A beautiful title screen is not completion of this overhaul.

## 15. Delivery order and handoff rules

Follow [execution.md](execution.md). Finish the vertical slice before building all scenery. Each phase records the exact files changed, checks run, screenshots/measurements, unresolved issues and next step. Distinguish planned from implemented from verified. Never check a task complete solely because TypeScript builds.

The plan is intentionally detailed enough for a later session to resume without reinterpreting the product. If implementation reveals a conflict, update the decision table and affected acceptance tests first. Do not silently reintroduce removed panels, verbose footer copy or replay controls.
