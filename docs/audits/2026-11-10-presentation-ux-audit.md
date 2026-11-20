# Codex Legends: animation, UI and HUD investigation

Date: 10 November 2026. Investigation and prototype plan only.

Publication note: a remote refresh before publishing found `main` at `108aebe`, ahead of the inspected local build and including later mobile/PvP and card-presentation changes. This report is evidence for the local `2541a53` snapshot, not a verification of current production. Reproduce the listed defects on the latest build before implementing its recommendations. Supporting recordings and screenshots remain local; the repository links to ignored evidence will not resolve in GitHub.

## Conclusion

The strongest next improvement is consistent decision ownership and decision context. In a real local PvP match, the defender's response picker and underlying activity status disagree about who is choosing. On short landscape screens, the support picker hides the sentence explaining that supporters exhaust. These are more concrete problems than a general claim that all animations are too fast.

Current presentation already contains substantial movement and readable holds. A synthetic single-link resolution took 4.60 seconds to identify its source before applying any effect: a central chain cue followed by a separate source lift. Whether this repetition helps comprehension or merely adds waiting needs a controlled human comparison. Do not globally slow everything down.

No gameplay, card data, production presentation files, or deployment were changed. The older how-to-play feedback was not used as a current defect.

## Build, methods and evidence boundaries

- Inspected playable repository `C:/Code/codexlegend`, HEAD `2541a533cd62a603bdc16e83dbb190d6d3b1159b`, branch `codex/anime-card-overhaul`, with existing working-tree documents preserved. The sibling `codexlegendtcg` directory is not the playable source.
- Used current executable presentation code, current practice mode, and two browser clients connected to a locally running PvP server. No production service was tested.
- Tested 667×375 and 700×400 first, then 844×390 and 1440×900 for ordered choices, inspection and presentation fixtures. Browser emulation is not a physical phone test.
- Recorded WebM video, browser traces, presentation-hook start/end times, Web Animations calls, activity text, element bounds, hit tests, frame intervals and long tasks. Isolated browser instrumentation exposed read-only UI/game accessors and wrapped presentation hooks; it did not modify repository gameplay or legal actions.
- The PvP coverage driver submitted legal actions through the current UI controller. It is a sequence-coverage tool, not a skilled player or evidence of human decision quality.
- Ran 132 focused tests across 11 presentation, movement, card-choice and PvP playback suites: passed. Browser fixtures also exposed two stale assertions described below; this is not an all-browser-tests-pass claim.
- Human testers, physical touch, screen-reader use, production-network faults and audio comprehension were unavailable. No human comprehension improvement is claimed.

All local evidence and reproduction scripts are in [the evidence directory](../../output/ux-audit-2026-11-10). It is ignored by Git and will not accompany this document in a push unless separately packaged. Video recording filenames are mapped below because some earlier interrupted attempts left stale `*-video.txt` metadata.

## Information contract

Each interaction should communicate the following using public information available to that viewer. Inspection can expose more detail, but cannot be the only way to identify the current decision.

| Interaction | Cause and source | Current event and resulting change | Next actor and controls |
|---|---|---|---|
| Normal / special call | Calling card or effect; hand, Deck, Grave or Heart origin | One card travels to its actual destination; arrival and relevant public state become clear | Identify whether placement is still being selected; commit/cancel only where rules allow |
| Attack / support | Attacker, target, selected supporters | Exhaustion, support contribution, current attack total; declaration distinct from impact | Attacker confirms or cancels the draft, then defender owns the response window |
| Response / defense | Incoming attack or effect, source, target and public totals | Distinguish responding, choosing defenders, paying, and resolving | Clear “your response” versus “opponent responding”; passing a response must not imply canceling or confirming the opponent's attack |
| Barrier check | Which hit caused which Barrier to break | Break, move to Check, reveal, effect, destination; reflect changed public level/Plays coherently | Show any resulting choice and its owner; do not invite actions while presentation is still blocking |
| Chain / Grave / Heart activation | Specific link, card and originating zone | Current link, paid cost, affected target and public result; preserve order | Only the current legal decision is actionable; resolving is not another response window |
| Codex change | Old and new Codex; manual or automatic cause when relevant | Replacement in the same zone, with no invented payment | Show who acts next under current rules; free switching stays free |
| Card inspection / keywords | Inspected card and keyword | Separate printed information, effective modifiers and ability status | Close/back returns to the same selection, focus and board position |
| Ordered selection | Effect asking for order and destination | Numbers explain first/top versus last/bottom; selected count stays visible | Reorder/deselect before confirmation; clear confirm and supported cancel/skip |

## Coverage ledger

“Component” means an isolated call to current presentation functions; it does not prove the full engine-to-client sequence.

| Sequence | Fresh evidence | Limit |
|---|---|---|
| Normal calls | Actual practice and both local PvP views; movement hooks and video | No physical-device timing claim |
| Special call from Deck | Current pile-emission implementation and isolated Deck-to-field component capture | Full special-call engine integration was not driven in this run |
| Attack / support | Actual practice selection, declaration, attack check, impact and Barrier check; PvP declaration from both seats | Practice-specific controls remain visible in these captures |
| Defense | Actual PvP response picker from defender; blockers implementation inspected; isolated hand-to-defense flight | PvP capture stopped at response choice; no completed real blocker/discard sequence captured |
| Barrier check | Actual practice trace and video, including break and transfer | Not completed in this PvP run |
| Chained responses | Actual PvP attack response entry; current synthetic 3→2→1 fixture; isolated resolving-link cue | No complete multi-link human PvP chain recording |
| Grave / Heart activation | Source-anchored component clips and actual source-resolution code | Synthetic card identity used to test geometry; not evidence of a legal activation in that state |
| Heart movement | Actual PvP Personification/Fx trace | Movement is distinct from a Heart skill activating |
| Codex | Current selection fixture and isolated Codex lift component | Component lift does not prove all automatic/manual change paths |
| Inspection / keywords | Real board-card inspection and keyword click at all four sizes | Mouse/automated touch-context input; physical long-press and screen-reader flow unverified |
| Ordered choices | Current picker, three numbered selections and confirmed IDs at all four sizes | Synthetic request using real current cards; not every effect/card-count combination |

### Main evidence files

- [Defender's PvP response picker](../../output/ux-audit-2026-11-10/pvp-live-a-667-match.png), [its activity/hook trace](../../output/ux-audit-2026-11-10/pvp-live-a-667-match.json).
- [Attacker's corresponding PvP view](../../output/ux-audit-2026-11-10/pvp-live-b-700-match.png), [trace](../../output/ux-audit-2026-11-10/pvp-live-b-700-match.json).
- [Support selection](../../output/ux-audit-2026-11-10/ai-live-667-support.png), [practice trace](../../output/ux-audit-2026-11-10/ai-live-667-final.json).
- [Attack/check video contact sheet](../../output/ux-audit-2026-11-10/attack-contact-sheet.png), [source/chain contact sheet](../../output/ux-audit-2026-11-10/source-contact-sheet.png). These are selected video frames, not a claim that every recorded frame was manually reviewed.
- [Attack segment stepped at 40ms intervals](../../output/ux-audit-2026-11-10/attack-frame-step-contact-sheet.png). Video frame sampling complements the animation/hook timestamps; it is not a high-speed camera measurement.
- Isolated components: [Codex lift](../../output/ux-audit-2026-11-10/components-synthetic-codex.png), [Deck lift before special-call travel](../../output/ux-audit-2026-11-10/components-synthetic-special-call.png), [hand-to-defense flight](../../output/ux-audit-2026-11-10/components-synthetic-defense-flight.png), [component video](../../output/ux-audit-2026-11-10/video/page@41fa6b589aa24569e3875ba511e099fc.webm). Defense uses the current flight function with illustrative geometry; it is not the full blocker hook.
- [Ordered-selection and inspection measurements](../../output/ux-audit-2026-11-10/scenario-results.json), [667 ordered picker](../../output/ux-audit-2026-11-10/scenarios-ordered-667.png), [667 inspection](../../output/ux-audit-2026-11-10/scenarios-inspection-667.png).
- [Isolated performance measurements](../../output/ux-audit-2026-11-10/isolated-performance.json).
- Videos: [practice attack](../../output/ux-audit-2026-11-10/video/page@e25adb63a9c059f41b375bb4844b9982.webm), [PvP defender](../../output/ux-audit-2026-11-10/video/page@f17e98c3dd4b03460a6a29104bf2c1b6.webm), [PvP attacker](../../output/ux-audit-2026-11-10/video/page@54107292cb1076024ad270c274c9b2ef.webm), [isolated source/choice scenarios](../../output/ux-audit-2026-11-10/video/page@3f62667961093e25a7bf65da66965ca9.webm).

## Prioritized diagnosis

### 1. Confirmed: defender decision ownership conflicts with the HUD

At 667×375, the defender receives “Respond to the attack — Force or Sentry?” while the underlying activity element says “Opponent choosing a move…”. The modal obscures much of the underlying board/status, so this is a reproduced state inconsistency, not a claim that both strings are equally visible at once.

`src/ui/duel-clarity.ts:7–17` explicitly handles blocking when the defender is the opponent, but the local defender falls through to the busy/opponent-turn message. Turn owner and decision owner are not interchangeable.

The attacker at 700×400 correctly sees the red opponent-field/edge indicator and “Opponent choosing a response or defense…”. The historical assertion that there is never a red response light is not true of this captured build.

The battle response picker also lacks the attack-specific context supplied to chain responses. `src/ui/main.ts:849–860` supplies `responseContext` only for `kind === 'response'`, and labels the battle decline action “Continue attack” even on the defender's screen. The generic waiting-effects instruction is reused for this battle context. The visual picker covers the board precisely when the player needs attacker, target and totals.

**Impact:** wrong actor/status and ambiguous pass action are direct comprehension risks. Human misplays have not been measured.

### 2. Confirmed: support's exhaustion cost is hidden at short heights

`src/ui/main.ts:5282` puts “Supporters exhaust.” in the instruction. The short-height rules in `src/ui/duel-panel.css` hide generic `.cc-instruction` at heights up to 500px. The actual support picker shows the numerical benefit and confirmation buttons but omits that cost.

This is a narrow finding: ordered selection has a later CSS override and keeps its instructions visible at both 375px and 400px. Do not change every picker based on this one failure.

**Impact:** an existing choice is harder to evaluate; no rule change is needed. Preserve the cost in the compact decision summary instead of enlarging the whole modal.

### 3. Confirmed timing pattern; comprehension consequence remains a hypothesis

The current standard source activation is 2,800ms. `src/ui/chain-cue.ts` first presents the central resolving cue, then awaits `animateEffectSource`. A single synthetic resolving link measured **4,596ms** before any actual effect consequence. The source contact sheet shows attention moving from center-stage card to the field source.

This may be useful for first encounters but repetitive on familiar links. Test a single continuous identification sequence before reducing any hold. Keep source, zone and result legible. A speed multiplier alone will not fix duplicated information.

Actual normal-call hooks took approximately 1.39s in practice and 1.36–1.71s in local PvP. These observations do not support calling all arrivals instantaneous.

Fresh-profile local PvP phase hooks took about 10.8s on the acting seat versus 1.75s on the other seat. Source explains the difference: phase banner plus an awaited phase tip with a 9,000ms auto-advance (`src/ui/tutorial.ts:41`, `phaseTip`). This is deliberate explanatory waiting, not evidence of a frame stall. It does not reopen the old how-to-play complaint; the relevant audit point is to classify waits correctly.

### 4. Confirmed test gaps; suspected HUD readability risk

Two browser fixtures stop on outdated assumptions:

- The panel fixture requires controls beneath the instruction even when the current compact header fits them in one row. The fresh Codex screenshot fits; the assertion is not proof of overlap.
- The motion fixture checks destination hiding immediately, before the current asynchronous artwork-ready boundary. Its failure is not proof that a destination visibly duplicates during flight.

Refresh these assertions before using them as release gates. Later assertions in those stopped fixtures were not exercised.

Source shows mobile state labels around 7–8px and modifier chips 18px high. These warrant recognition/hit-target testing, especially on rotated cards, but do not establish a measured human failure by themselves. Avoid replacing all text with unexplained icons.

## What already held up

- Ordered selection confirmed the expected three IDs in order at all four sizes. Active confirmation controls were reachable. Hidden carousel arrows where all cards fit are not failed controls.
- Board rectangle stayed identical before/while opening the ordered picker: 607×231 at (8,61) for 667×375; 640×256 at (8,61) for 700×400. Larger cases were stable too. The historical board-lifting symptom was not reproduced in these cases.
- Inspected keywords opened near the information panel and remained in the viewport; the historical upper-left tooltip issue was not reproduced.
- Source movement uses the recorded zone; Heart anchors to the Persona, Grave to its pile. Synthetic lifts were visible and captioned at their sources.
- Attack movement waits for the transform rotation before windup (`duel-motion.ts:115`). Impact is an explicit motion boundary. Barrier presentation awaits shatter before the check flight (`main.ts:3789` vicinity). Actual practice hooks preserved attack-check → attack-result → Barrier-check order.
- PvP frame playback awaits presentation; legal actions are withheld while queued frames are presenting. This is source/test evidence, not proof against every reconnect or packet-burst condition.
- Successful local practice and PvP captures recorded no page errors or failed HTTP resources. An earlier localhost origin refusal was a test-server CORS configuration issue, corrected by using its allowed port; it is not a production room-creation diagnosis.

## Performance: waiting is not the same as stuttering

Concurrent video/trace recording produced variable durations and long tasks, so those runs were not used as device-performance proof. A separate warm 667×375 run with no video/trace measured:

| Workload | Frames | Median interval | 95th percentile | Intervals >50ms | Long tasks |
|---|---:|---:|---:|---:|---:|
| Idle, 10 seconds | 599 | 16.7ms | 16.9ms | 0 | 0 |
| Three source activations, 8.55 seconds | 511 | 16.7ms | 16.8ms | 0 | 0 |

This establishes smooth scheduling for these two warm workloads on this desktop/headless Edge run only. It does not establish mobile GPU performance, cold asset behavior, network resilience or whole-match frame pacing.

## Compact visual-language specification

| Meaning | Proposed consistent treatment | Constraint |
|---|---|---|
| Persistent state | Quiet fixed-position values: effective level, Plays, Barriers, phase, current power | No continuous glow; show a change at its existing location |
| Available action | Thin stable outline plus inspectable action text | Distinguish from selection; never expose hidden opponent options |
| Selected / targeted | Solid outline, check/number and short role label | Attacker, target, supporter and ordered position must not depend on color alone |
| Active event | One primary source emphasis, readable card/zone caption, directional movement if movement occurs | Avoid two competing enlarged source cards; keep unrelated elements quiet |
| Result | Brief anchored delta, then stable updated value | Show cost and benefit separately; do not replay the whole activation |
| Decision ownership | One persistent status source: your response, opponent response, resolving, reconnecting | Derive from current decision, not merely whose turn it is |
| Interruption / reduced motion | Stable source, destination and result labels; fade or instant spatial transition | Preserve reading opportunity and input ordering without mandatory travel |

Motion phases: acknowledge input → identify cause/source → show action/path → show consequence → settle → unlock the correct decision. Durations are tunable per phase and information load; they are not a universal slowdown. Multiple independent movements can overlap only when their destinations and causal relation remain understandable. Sequential chain links retain explicit boundaries.

Cancel must mean cancel where the rules permit it. Minimize must only hide presentation. Inspection must return to the same draft. Irreversible payments must not acquire a misleading cancel button.

## Three coordinated improvement packages

### Package 1 — One truthful decision status and response context (first)

**Before:** opponent declares attack → defender gets generic Force/Sentry picker → activity still describes opponent choosing → decline says “Continue attack”.

**After:** declaration settles → defender sees “Your response” with attacker → target and current public attack/defense values → select effect or “Continue to defense” when that is the actual next step → both seats show resolving or the next decision owner. No additional popup.

- **Benefit:** makes actor, threat and pass consequence agree across board, HUD and chooser.
- **Smallest prototype:** only battle-response activity derivation, existing picker context and role-aware pass label. Preserve sizes, animations, legal actions, timeouts and effect choices.
- **Risks:** exposing hidden response availability; announcing changing values too often; dense context on 375px height. Use public battle state, one concise summary, inspectable details, text plus color.
- **Independent acceptance:** recorded status equals engine decision owner in both seats; incoming source/target are correct; pass label matches the next rules step; no hidden-card-dependent indicator. With independent participants, at least 7/8 correctly identify actor and threat in two matched tasks, and fewer ownership/pass errors than baseline. A tie or ceiling result is inconclusive, not proof of benefit.
- **Rollback:** any wrong actor, hidden-information leak, altered action/outcome, or unavailable confirmation control. Roll back optional context layout if comprehension or recognition time worsens consistently.

### Package 2 — One continuous source-to-result sequence

**Before:** central resolving-card ceremony → separate full source-lift ceremony → effect movement → result.

**After:** link number and source caption identify the card once → emphasis remains connected to its actual zone → consequence movement → anchored result → next link. Retain a longer reading opportunity for unfamiliar/complex events, without replaying identification.

- **Benefit hypothesis:** less gaze switching and less idle time while retaining cause and effect. Not yet demonstrated by players.
- **Smallest prototype:** one existing single-link field activation and its Grave variant. Reuse existing art and movement functions; change only overlap/transition between chain cue and source identification. No global timing multiplier or new graphics.
- **Risks:** shortening a useful reading pause, GPU cost from overlapping layers, early input unlock, motion sensitivity, out-of-order PvP playback. Preserve awaited event boundaries; use a captioned reduced-motion version and cap simultaneous emphasis.
- **Independent acceptance:** event IDs/order and final states match baseline in deterministic playback; no duplicate source/destination after settle; interrupted and backgrounded sequences clean up; no increased warm p95 frame interval beyond a predeclared 10% noise budget over three same-device runs. Participants must identify source zone and changed target at least as accurately as baseline while waiting time falls.
- **Rollback:** any lost attribution, ordering/input error, worse comprehension, persistent ghost card, or repeatable performance regression. Faster completion alone is not success.

### Package 3 — Preserve decision-critical information within the current footprint

**Before:** support picker exposes +Power but hides exhaustion at short height; modifier/state details rely on very small labels.

**After:** compact summary reads, for example, “+9,000 support · 1 supporter exhausts”; selected supporters stay labeled on the stable board. Existing inspector explains modifier source and duration without forcing a new modal for routine confirmation.

- **Benefit:** players see the payment and benefit together; information survives compact layout.
- **Smallest prototype:** support summary only at the two short landscape sizes. Audit modifier recognition separately before changing chip design. Keep existing ordered selection and tooltip placement.
- **Risks:** text wrapping may displace controls; icons may hide meaning; touch targets may overlap adjacent cards; broad focus trapping could break direct board selection. Preserve reachable actions and explicit return focus.
- **Independent acceptance:** cost, benefit and confirm remain visible at all four sizes with long card names; board bounds unchanged; keyboard inspection returns focus and selection; no accidental commit on long-press/drag. Independent players predict exhaustion correctly before committing, with fewer corrective clicks than baseline.
- **Rollback:** any clipped primary control, board displacement, lost draft, changed payment/target, or no comprehension gain paired with increased selection time.

## One bounded comparison experiment

Run Package 1 only. Hold Package 2/3, card art, rules, cards, sound, animation pace, viewport, network setup and seeded outcomes constant.

1. Save four legal current-game positions with action traces: attacker declaration, defender response with two public response options, pass into defense, and a single-link response resolution. Keep a private fixture separately from the viewer's public state; never score a player using hidden opponent cards or future draws.
2. Baseline and prototype replay the same inputs to the same outcomes. Compare snapshots, public event order, payments, choices and next actor. Test both seats at 667×375 and 700×400; smoke-test the other two sizes.
3. Recruit eight participants, four new and four familiar with card games. Counterbalance version order and use equivalent paired states so repeated exposure does not simply teach the answer. This is formative evidence, not a population-level statistical claim.
4. Ask, without coaching: “Who must act now?”, “Which card is threatening what?”, “What happens if you use this pass button?”, and “Select a response, inspect it, then return without committing.” Record answer accuracy, first-action errors, accidental commits, recovery steps and time to identify the decision.
5. Use silent timed tasks first. Afterwards replay the participant's recording for explanation; separate think-aloud sessions from timing measurements. A second reviewer scores predefined answers against public state without seeing version labels where practical.
6. Repeat an equivalent response task later to measure retention. Accept only if ownership/pass errors fall, at least 7/8 meet the specified comprehension criterion, and technical/layout/privacy gates pass. If baseline already has no errors, retain the smaller change justified by correctness and report usability benefit as unproven.

### Reproducible tasks prepared while people/devices are unavailable

- Defender at the response prompt: identify actor, incoming attacker/target, and consequence of declining. Evidence pair: the two `pvp-live-*-match` captures.
- Support at 667×375: predict both power gain and exhaustion before confirming. Evidence: `ai-live-667-support` and `support-picked`.
- Source identification: distinguish Field, Grave and Heart in the `scenarios-synthetic-*` clips; state what changed versus what merely highlighted. These are explicitly synthetic presentation tasks.
- Order three cards, inspect one keyword, return, and confirm the expected order. `scenarios.cjs` records IDs, positions and hit tests.
- Replay attack/check trace: separate declaration, response, attack check, impact and Barrier check. Correct answers come from public events, not visual guesses.

## Remaining verification and handoff

Before implementation acceptance, capture full real special-call, blocker-to-Grave, automatic/manual Codex, legal Grave/Heart activation and multi-link PvP chains. The current component evidence is sufficient to scope prototypes, not to certify those end-to-end paths. Add network delay/burst, disconnect/reconnect, background-tab interruption and repeated input cases to the playback checks.

Run on at least one real short landscape phone with touch, browser chrome/safe areas, cold and warm assets, and reduced motion. Check keyboard focus transitions and a screen reader independently. Do not infer physical readability, accessibility conformance or human understanding from the 132 passing unit tests.

Local scripts: `harness.cjs`, `run-audit.cjs`, `scenarios.cjs`, `extra-captures.cjs`, `review-video.cjs`, `performance.cjs` in the evidence directory. They require the local dev client/server and the installed Playwright runtime. They are audit helpers, not shipped game code. Earlier failed attempts remain in `run.log`; use the explicitly mapped successful artifacts above.

Recommendation: implement and compare Package 1 first after this investigation is reviewed. Keep the other two as bounded prototypes, not an authorization for a broad redesign.
