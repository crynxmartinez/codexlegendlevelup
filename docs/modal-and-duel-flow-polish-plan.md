# Modal and normal-duel flow polish

Status: implemented locally, with browser and automated verification recorded below. 2 October 2026.
This extends the response UI and presentation work (U08/U15/U18); it does not change the Energy-free rules or response-chain timing.

## Findings from the screenshots and current source

1. `card-choice.ts` sets a 500px minimum width based on option count. `duel-panel.css` limits ordinary panels to 340px high, uses 88px cards and 10px names. Small choices therefore stay tiny on large displays. A footer, long heading and chain strip can further squeeze the flexing card artwork.
2. `HumanChooser.chooseAbility` replaces meaningful card types with `Effect 1`, `Effect 2`, etc. The chain is a line of text, and the rules summary shares the footer. This obscures the difference between a committed effect and a card available to respond.
3. The attack result hook explicitly calls `showAttackOutcome` for the human defender. That opens `modalOutcome` despite the existing hit/ward/particle feedback on the board. This duplicates the result and can misleadingly depict a shattered Persona when only a Barrier breaks.
4. There are two independent acknowledgement paths: modal helpers (`modalOutcome`, `showCheckCard`, `showTokenCreated`, `acknowledge`) and `PresentationQueue`/`DuelHud.acknowledge`. Normal human-controlled modals do not use the demo/replay auto-advance path. Learning pace also requires manual acknowledgements and is the fresh-install default. Fixing only one path will leave repeated Continue stops.

## Product contract

- In a normal duel, a required stop means there is an actual player decision. Informational results show briefly, then continue automatically.
- Tutorials retain their explicit instructional pauses. Their controller owns those pauses; an old result modal must not add a second acknowledgement.
- Real decisions never time out or auto-select: response/decline, targets, costs, defense, optional skill use, ordering, casting, surrender and end-turn confirmation.
- Preserve the agreed chain: committed costs first, alternating legal responses, one decline resolves newest first, pending triggers afterward.
- Card galleries scroll horizontally. Long read-only text may scroll inside its own inspect/history area; card art, headings and primary buttons must not require vertical scrolling.
- No background blur. Minimize preserves the pending choice and selected cards; the exposed board permits inspection without unrelated game actions.

## M1 — Remove normal-game acknowledgement stops

Files: `pace.ts`, `settings.ts`, `presentation.ts`, `duel-hud.ts`, relevant hooks/helpers in `main.ts`, `remote-presentation.ts`.

Introduce one explicit presentation policy distinguishing normal duel, guided tutorial, and read-only playback if an existing route still uses it. Do not infer tutorial status from the saved speed setting. Normal play always uses finite result holds, including users with an existing `learning` setting. Keep their slower reading speed; migrate its wording to a relaxed automatic pace. New normal games default to Standard. Tutorial pauses remain session-controlled.

Replace the top Continue pill with a short, non-interactive result near the relevant zone/HUD. Keep Last Action and History as the way to review missed information. Retain current Standard/Fast timing as the starting point; approximate holds are 0.9 seconds for important Standard results, 0.32 seconds Fast, and 1.4–1.8 seconds for relaxed reading. Tune against actual chained sequences; do not stack multiple holds for one result.

Acceptance:
- An ordinary match proceeds through hits, checks, token creation and State/Persona updates without an informational Continue click under every pace setting.
- A genuine choice remains pending until the owning player submits it. Old settings do not restore manual result pauses.
- Resolve/cancel presentation promises exactly once, release them on teardown, and prevent hidden-tab or reduced-motion settings from leaving a match stuck. Changing speed cannot change game outcomes.

Verification: pace/settings migration tests; queue cancellation and duplicate-completion tests; normal-game browser trace with both old Learning settings and fresh storage; tutorial pause regression; local and remote decision lifecycle checks.

## M2 — Replace redundant result modals with board feedback

Files: battle/check/token presentation hooks and helpers in `main.ts`, `duel-hud.ts`, existing effect animation modules.

Remove automatic Defense Broken/Defended result modals. Reuse the battle comparison strip, hit/ward particles, affected-card highlight and Barrier movement. Show one brief result: `Hit — 1 Barrier broken`, `Defended`, or `Sentry — attack stopped`, matching the actual outcome. Shatter the actual broken Barrier or removed Ally where appropriate; never imply the Persona itself was destroyed by ordinary damage.

Attack and Barrier checks use a readable temporary reveal near the Check Zone: art, card name, Force/not-Force result, and destination. Hold, move the card, then continue. If a Force requires a target or another choice, that real picker still waits. Tokens appear through their existing movement/creation effect and a brief count update. Avoid reintroducing a general token-created acknowledgement.

Acceptance:
- No Defense Broken/Defended popup or duplicate shatter presentation in normal matches.
- No blanket Continue modal for checks or tokens; actual Force decisions remain interactive.
- One outcome remains readable and recorded in History; tutorial teaching still pauses at the intended event only.

Verification: attack hit/miss/Sentry, last Barrier, winning hit, Ally removal, Force/non-Force checks, multi-checks, multiple tokens; check physical movement and logical state order.

## M3 — Enlarge shared decision panels by about 30%

Files: `card-choice.ts`, `duel-panel.ts`, `duel-panel.css`.

Use shared sizing tokens rather than a visual scale transform. Desktop starting targets:

| Element | Current | Proposed |
|---|---:|---:|
| Small choice panel | 500px | 650px |
| Large choice panel cap | 820px | about 1060px |
| Default height allowance | 340px | up to 440px, content-driven |
| Card tile width | 88px | 114–120px |
| Card name | 10px | 13px |
| Supporting text | 12px | 14px |
| Controls | 36px desktop minimum | 44px minimum |

Do not force single-card or confirmation panels to fill the maximum height. Reserve header/footer space first and give the gallery an explicit artwork floor; do not let flex shrink turn artwork into an icon. Keep a fixed card aspect ratio, equal tile sizes, bounded two-line names and full names in inspection. Center a short card row; scroll longer rows sideways with arrows and swipe. Use shorter headings such as `Switch Codex?`, followed by `Keep current` and `Switch Codex` actions.

Mobile uses available width minus safe margins, not desktop dimensions multiplied by 1.3. Target approximately 96–112px cards on narrow portrait screens and 88–104px in short landscape. Keep controls 44px. Clamp the panel to available height; reduce unused spacing before reducing card art. Expanded view is a deliberate user action. Keep Minimize available and preserve the board behind it. Exact height proportions are validated per viewport rather than imposed universally.

Acceptance:
- Small desktop choices visibly gain about 30% size; card art and text grow with the container.
- Buttons and full card artwork fit without vertical gallery/header/footer scroll at all tested sizes. Long names do not stretch tiles.
- Minimize/restore, keyboard focus, inspection and selection survive resizing and expanding.

Verification: Codex with one card; 3 response options; 6-card Vent; 20–40-card piles; long names; exact multi-select; ordered selection. Viewports: 1920×1080, 1440×900, 1280×720, 1024×768, 390×844, 360×800, 320×640 and 844×390. Distinguish viewport testing from physical touch-device testing.

## M4 — Redesign responses and pending effects

Files: `HumanChooser.chooseAbility`, `card-choice.ts`, a dedicated response presentation helper if needed, shared styles. Extend public chain display metadata only if necessary; never expose private targets or pending opponent options.

Layout (revised after the owner's Master Duel review):
1. The heading identifies the immediate decision: `Respond to Water Tunung?`.
2. One centered horizontal row contains only cards eligible to activate. No
   separate chain-card rail, thumbnail strip or second set of choices.
3. Tiles show short card names, without title prefixes. Full names remain in
   search and inspection. The selected effect appears directly below the row.
4. Actions are `No response` and `Activate`. Pending triggers retain their own
   explicit activation/optional-skip labels. A missing response resolves the
   chain only when the player actually presses No response.
5. Chain information is presented as brief numbered card animations over the
   board at commitment and resolution. The latest committed effect is named in
   the response heading. Existing history retains the full record.
6. Landscape uses the same single-row composition; no side-by-side information
   blocks. Tutorial minimized pills cannot cover the decision's controls.

Acceptance: only one selectable card row; no chain scrollbar; public source
identity, correct original link number, newest-first resolution; no Continue
buttons on these presentations. Real choices remain manual.

## M5 — Apply the audit to related panels

| Panel family | Treatment |
|---|---|
| Deck, Heart, Grave, Exile, Codex, Extra | Shared larger horizontal viewer; read-only browsing stays read-only. Filters only where the existing pile policy allows. |
| Offer, Vent, discard, return-to-deck | Batch selection, visible selected count/order, one confirmation; no repeated one-card dialog. |
| Force/Sentry and hand defense | Shared readable cards; retain the legal response-before-defense sequence and legal card filtering. |
| Skill and Action casting | Source, effect, real cost, explicit activation/cancel. Retain protection against misclick casting. |
| Codex switching | Short heading, clear keep/switch wording, larger art even when only one card is available. |
| Modes, personification, placement/stacking | Use the same spacing/control rules; identify actual choices clearly. |
| Optional reveals/confirmations | Keep meaningful yes/no decisions; convert pure read-only reveal acknowledgements to timed presentation. |
| Surrender, restart, end turn | Keep consequential confirmations; use descriptive buttons and compact content-driven sizing. |
| Inspect, History, Settings, errors | Keep usable reading surfaces. Long text may scroll; preserve visible Close/recovery controls. Do not turn actual errors into disappearing notices. |

Audit direct `modal()`/`acknowledge()` callers as well as `openCardChoice()`; checking only shared CSS would miss the second and fourth screenshots.

## Required mobile optimization and responsive acceptance

Applies to every modal family, not only the response picker. Mobile readiness is a delivery requirement.

Owner clarification: mobile gameplay is **landscape first**. Prioritize 844×390,
915×412 and 667×375, with readable cards and board space above a shallow tray.
Portrait remains a safe fallback for rotation rather than the primary game layout.

- Use available viewport space and safe-area insets for notches/home indicators. Handle changing browser bars with dynamic viewport sizing; never enlarge the desktop interface with a scale transform.
- Test 320px, 360px, 390px and 430px portrait widths, phone landscape, tablet and desktop. No page-level horizontal overflow. Only card galleries scroll horizontally.
- Keep primary actions and minimize/restore controls reachable with at least 44×44px touch targets and separation that prevents adjacent-button mis-taps. Critical controls must not require hover.
- Support swipe browsing, tap selection and long-press inspection. Cancel long-press when swiping; releasing an inspected card must not select or cast it. Show the mobile long-press hint instead of right-click wording.
- Preserve selected cards, ordering and the pending decision across rotation, resizing, keyboard appearance and minimize/restore. Search inputs must remain visible above the software keyboard without trapping the confirmation controls.
- Reserve space for card art and controls before allocating text. Do not shrink artwork to tiny icons or truncate the decision's essential instruction to fit. Full inspection must remain readable with enlarged text.
- Keep the board clear when minimized and allow inspection; do not enable unrelated game actions while an unanswered choice is pending.
- Use appropriately sized existing thumbnails in galleries, reuse decoded images and avoid rebuilding the full list/board for each swipe or selection. Open repeated large-pile viewers without accumulating listeners, timers or detached panels. Load full art for inspection when needed.
- Respect reduced motion and pause/cancel obsolete presentation work on backgrounding or teardown without losing an actual decision. Returning to the game must not leave invisible blockers or stuck animations.
- Verify on a physical touch device when available. Record tested devices, browser, viewport, console errors and observed responsiveness; viewport emulation alone must not be reported as physical-device or low-end-phone performance validation.

## M6 — Release verification

Dependencies: M1 → M2; M3 → M4; M5 after both paths; M6 last. Each slice gets focused checks before the final suite/build.

- Record a normal attack from declaration through response, defense, check and Barrier result. Only genuine choices should stop play.
- Test every modal family above with few/many cards and long labels; ensure no accidental cast, lost selection, hidden footer, blur, stale dimming or trapped focus.
- Complete the mobile acceptance checklist above, including real touch gestures where available, software-keyboard behavior and preserved choices after rotation. Save portrait and landscape evidence for both a small choice and a large pile.
- Test First Battle and the chain lesson: explicit teaching pauses still work and cannot stack with duplicate presentation pauses.
- Test standard/relaxed/fast, saved settings migration, reduced motion, hidden tabs, resize/orientation and immediate exit/restart.
- Verify equivalent game outcomes at all presentation speeds and owned PvP decisions after reconnect. No client auto-answer may substitute for an authoritative player choice.
- Run affected UI/queue/tutorial tests, full regression suite and production build. Save desktop, portrait and landscape screenshots plus a short normal-game interaction trace.
- Report actual physical-device/deployed checks separately if not available. No new game balance changes or remote deployment are included in this UI plan.

Success: normal gameplay flows automatically between real decisions; cards are readable without immediately needing Expand; every decision uses a consistent responsive layout; tutorials remain deliberately guided.


## Owner revision — Master Duel reference, October 2

This revision supersedes the earlier two-column chain tray. The owner rejected
its separate chain-card rail: it looked like another selectable hand and added
an unnecessary horizontal scrollbar. Do not restore that rail.

Reference evidence inspected: the owner's Master Duel selection screenshot
(compact card row, board visible), and Konami's numbered chain presentation:
https://www.konami.com/games/us/en/topics/1711/
https://www.konami.com/kde_cms/na_publish/uploads/master-duel-screen-shot-2-1024x551.jpg
These are visual references, not measured timings or a claim to have played the
current client. Our timings come from the game's existing pace/motion settings.

1. Choice: one heading identifying the triggering card, one horizontal row of eligible
   cards, selected effect beneath it, then No response / Activate. No second card list,
   chain thumbnails, chain scrollbar, or empty explanation placeholder. Keep
   short display names; full names and rules remain in inspection/search.
2. Activation: after cost payment and commitment, briefly lift the source card
   with its chain number and short name, then remove the presentation before
   opening the opponent's decision. Highlight the actual source/zone.
3. Resolution: dismiss the decision tray, then show each source and its original
   chain number as the engine resolves newest first. This is a timed visual,
   never a selectable card or a confirmation prompt. Existing effect movement
   follows that beat. Do not add a second concurrent narration/animation queue.
4. Landscape: a single-column shallow tray at 667x375, 844x390 and 915x412;
   the single card gallery may scroll sideways; the context must not. Footer
   controls stay at least 44px. Board remains visible, minimizing removes blur,
   resizing preserves selection. Portrait remains a fallback.
5. Motion: reuse playMotion/holdDuelMotion, finite pace-based holds, transform/
   opacity only, reduced-motion fallback, source cleanup on teardown/hidden tab.
   Retain only public card information. PvP decisions remain authoritative and
   always take visual priority; existing public effect cues reuse the visual.
6. Validate: zero chain-card rails, one candidate row, names without titles,
   original link numbers on reverse-order resolution, no accidental selection
   during inspection, automatic results and tutorial-only teaching pauses.

Rules remain the owner's rules: a declined response starts resolution; pending
Last Oaths wait for their next activation; no response insertion during resolution.
Do not import Yu-Gi-Oh spell-speed rules or assets.

## Local verification record — October 2, 2026

Implemented in the playable `codexlegend` checkout. No game-engine or match-server
rules were changed by this UI follow-up. These changes have not been deployed.

- Production build passed (TypeScript and Vite); the existing large-bundle warning
  remains. Final TypeScript check and `git diff --check` passed.
- Full regression run before the final visual revision: 87 files / 840 tests
  passed, 2 files / 3 tests skipped. Evidence: `.tmp/modal-full-suite.log`.
- After the final visual and motion changes: 9 focused files / 93 tests passed,
  covering presentation, pacing, timed notices, chain-cue cleanup, choices,
  tutorial sessions, core chain order and PvP chain behavior. Evidence:
  `.tmp/modal-final-verification.log`. The full suite was not rerun afterward.
- Browser-tested the response lesson: Bunog commits as Chain 1, Water Tunung
  resolves as Chain 2 of 2, and the chain completes automatically after declining.
  Tutorial instruction pauses remain explicit. No extra result confirmation.
- Inspected the final single-row response at 667x375, 844x390, 915x412,
  390x844 and 1280x720. Panel and footer remained inside the viewport and the
  card gallery had no vertical overflow. At 667x375 the panel is 651x310.
  Selection survived resizing and minimize/restore; the minimized board had
  no blur. Keyboard inspection opened the full canonical card information.
- Final landscape screenshot: `.tmp/modal-response-final-667.png`.
- Real normal-match trace: selected opening Persona/Codex, declined optional
  skills/Forces, attacked Maria Cacao with Taguwasi, declined responses to Banira
  and Iday, observed numbered resolution and an attack check, then returned to
  the Battle Phase with no modal or Continue gate. This trace was a defended
  attack, not an end-to-end winning attack or Barrier-break acceptance run.
- A 38-card Deck viewer used one horizontal gallery (4712px content in a 928px
  viewport, equal 224px client/scroll heights). Deck cards stayed face down.
  Both tested game tabs reported no browser console errors.
- Source audit also migrated the remaining Persona choice to the shared card
  picker and preserved genuine target/cost/defense decisions. Normal checks and
  informational notices now advance automatically; broken/defended outcome
  modals and the normal-game acknowledgement pill were removed.

Release follow-ups: physical landscape-phone gestures, actual software keyboard
and safe-area behavior, complete Barrier-break/winning-attack trace, every modal
family on a physical device, and paired deployed PvP/reconnect checks. Browser
viewport tests are not a substitute for those checks. Existing public PvP
resolution cues reuse the new animation; server-side commit broadcasts were
not added by this visual change.

### Waiting-effect duplicate-card correction

Dalagan creates two Essence events. With two Iday cards in Hand, the engine
correctly queues four trigger occurrences, but the modal previously showed them
as four separate cards. Pending choices now group repeated occurrences by physical
card UID and skill identity, keeping different copies and different skills
separate. Choosing a tile submits the original authoritative occurrence index.
The selected effect explains when multiple triggers are waiting. The queue is
unchanged; legality is checked again after each chain, so an Iday already paid
into Heart cannot pay itself from Hand again.

Validation: reproduced the four-occurrence/two-card case with actual Dalagan and
Iday scripts, selected the second Iday first, and verified both physical cards
resolved exactly once. 111 tests across six affected UI, card-effect, chain and
PvP files passed; production build passed with the existing bundle-size warning.

### Top-deck reveal readability

Increased single-card decision art from a 160px cap to 280px, bounded by the
available viewport height. Timed single-card checks use larger art beside the
explanation, retaining automatic progression. Horizontal multi-card reveals
also use larger art. At 667x375, browser component verification measured 155px
decision art and 172.5px timed-check art (previously 90px for the timed check),
with the complete card and decision buttons visible and no vertical overflow.
At 1280x720, decision art measures 280px. Right-click/long-press inspection and
the existing timing/decision handlers are unchanged.
