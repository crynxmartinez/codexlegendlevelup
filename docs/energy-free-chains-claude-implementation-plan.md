# Codex Legends: Energy-free rules and response chains

## 1. Implementation brief

**Status: implemented locally, 2 October 2026. See [implementation and verification record](energy-free-chains-release.md) for exact evidence and release steps. This specification remains the design contract; it is not evidence of production deployment or proven balance.**

Prepared 2 October 2026. Source snapshot: game commit `0047874b1a8de9e34a44b314a25805639314eac5`. Reinspect the working tree before implementation; do not overwrite changes made since this snapshot.

**Implementation repository: `C:/Code/codexlegend`.** `C:/Code/codexlegendtcg` is the marketing website, not the playable game. Preserve the shared Chronicles server integration.

Implement ONE coordinated rules release with both changes:

1. Remove Energy completely from active gameplay. Only normal calls and Action cards spend plays.
2. Add alternating response opportunities before resolution. One declined response locks the chain; resolve last in, first out. Ordinary triggers from costs and resolution wait until the whole chain finishes, then the owner chooses each to start a new chain.

This file is the combined handoff. It includes the rules, implementation order, acceptance checks, detailed Energy migration, detailed chain design and every audited card's migration/verification entry. The implementer does not need the two earlier plans to understand the target. Existing source and referenced tests still need inspection.

### Reading order and authority

- Read sections 1–5 first: these integrate both features and resolve conflicts.
- Part E contains detailed Energy removal, regional changes, affected files and preservation requirements.
- Part C contains detailed response-chain mechanics, architecture, UX and multiplayer requirements.
- Part A contains all 141 audited selectable card entries, Kaluluwa and the disposition of 117 unavailable definitions. Recompute counts from the loader if the catalogue changed.
- This combined plan supersedes the standalone `energy-free-rules-plan.md` and `chain-response-implementation-plan.md` for this release. Their historical implementation sequences must not run independently.
- Confirmed owner rules are binding. The explicitly labeled balance defaults (replacement rewards, selected usage caps, Amuran's discard) are implementation starting recommendations, not user-authored card wording or proven balance. Implement and test the listed defaults rather than inventing a universal substitute currency. Document further evidence-driven changes individually.

### Boundaries

No music, new sets, Level 4 expansion, new renderer, broad visual redesign, public matchmaking or replay-saving restoration. Preserve the 2D board, existing assets, first-turn attack rule, deck construction, damage and defense rules, State thresholds, tutorials, private PvP, custom decks, settings, local feedback and saved learning progress unless this document explicitly changes them.

Player-facing regions are Luzon, Visayas and Mindanao. Preserve internal IDs and required mechanical subtypes such as Maguindanaon; do not rename IDs or broaden subtype searches to all regional Units.

Do all implementation and validation in small slices on one feature branch. Keep the public game on its existing version until the integrated release is ready. This handoff does not itself authorize a push, deployment or shared-server restart; prepare those steps and report readiness, then follow the user's deployment instruction.

## 2. Integrated rules contract

### 2.1 What spends a play

| Operation | Plays | Important distinction |
|---|---:|---|
| Normal call a Unit or Force from hand into an Ally Zone | 1 | Existing level, phase, slot and overwrite restrictions remain |
| Cast an Action from hand | 1 | Commit once with its remaining actual cost, even if the effect is later negated |
| Manual skill, auto/triggered skill, special call | 0 | Timing, remaining costs, State and use limits still apply |
| Force hand skill, Force check, Sentry, ordinary defense | 0 | These are separate modes, with their own legal windows and card consumption |
| Personify, Codex switching, relocation, attack/support and effect movements | 0 | Existing permissions remain; relocation does not ready a Unit or reset its movement limit |

Allowance = `max(1, printed Persona level + broken shields)`. Remaining = `max(0, allowance - plays used)`. Recompute allowance as the current Persona/shields change; never reset used plays mid-turn. Spending a play is not a chain link. A normal call is a game action and may generate triggered chains; an Action activation is a link. No blanket play cost is charged for adding links.

Both players visibly receive five opening cards. The first player skips only their first-turn draw and its replacement. There is no starting Energy, refresh, Energy affordability or hidden Energy balance.

### 2.2 What paying a cost means

Prepare selections without changing state. Validate timing, ownership, source, targets, remaining use, plays if applicable and the whole non-Energy cost. Commit payment, play debit where needed, usage and link together. Offer/Vent selection is one multi-card selection and one confirmation, not repeated single-card prompts.

Offer, Vent, Essence, discards, return-to-deck and other actual requirements remain. A cost-created trigger cannot supply another card needed to finish that same cost. Costs and spent plays are not refunded if a committed effect is negated or its target disappears.

Evaluate an activation's State gate using its declared pre-payment legality rule; paying its own cost must not accidentally invalidate that just-committed activation merely because Heart/Grave totals changed. Recompute continuous State effects after payment. A later queued trigger checks its own current activation requirements when selected; conditions explicitly read during resolution use the then-current state. Record these checkpoints per skill rather than using one accidental `canRun()` reevaluation everywhere.

### 2.3 One response, then the other player

1. A commits a legal activation and pays its cost. It is Link 1.
2. Queue ordinary triggers earned by that cost. They do not resolve or appear as responses to their parent skill.
3. B can activate one legal response or decline.
4. If B responds, commit its cost as Link 2 and offer A a response opportunity.
5. Continue alternating only when someone adds a response.
6. One decline by the current responder locks the entire nonempty chain immediately.
7. Resolve highest link number first. No new activation or response window may be inserted between resolving links.
8. Required searches, targets that the effect chooses at resolution, discards and slot choices still happen inside their link; these are not responses.
9. After the entire chain, open the pending-trigger selector. Choose one eligible occurrence, commit it as Link 1 of a NEW chain and offer its opponent a response opportunity.
10. Preserve unused sibling occurrences across these chains until selected, explicitly declined if optional, or invalidated by their actual rules. They cannot be saved for an unrelated later action/turn.

Do not implement two consecutive passes, self-chaining after the opponent declines, or Last Oaths resolving before their parent skill. A normal decline only closes the current chain; it does not decline the player's pending triggers. Mandatory ordinary triggers wait too and cannot block a response decline; they must be handled in the later trigger selector.

If no legal response exists, the controller may decline automatically without advertising private candidate details. A lack of responses is not permission to invent new timing for a Force. Main-only Actions and manual skills are not general responses. Existing Force permissions remain own Main/either Battle; Sentries require the defined Persona-attack window before ordinary defense/checks.

### 2.4 Exact Offer-3 cases

- **No opposing response:** pay Offer 3 → queue three Last Oaths → B declines → main skill resolves → A chooses a Last Oath → its separate response chain → choose another.
- **One opposing response:** pay Offer 3 → B adds Link 2 → A declines → resolve B's response, then main skill → A chooses a Last Oath afterward.
- **Response to response:** pay Offer 3 → B adds Link 2 → A adds legal Link 3 → B declines → resolve 3, 2, 1 → then choose Last Oaths.
- A skipped/negated main effect does not undo its paid Offers or erase the earned triggers. Recheck those triggers' actual activation legality afterward.
- The main skill may fill the field before Last Oaths choose their Ally buffs. Those buffs cannot help that already-resolved main skill retroactively.

### 2.5 Force, Sentry and compound-effect conflicts resolved

| Earlier instruction | Unified rule for this release |
|---|---|
| Select several Forces/Sentries and resolve a submitted batch | Select ONE activation per response opportunity. The opponent can answer each committed card. No concealed prepayment or auto-appended Force list. |
| Skip later cards after a Sentry stops the attack | Uncommitted cards stay in hand. Already committed links still resolve under their own validity rules; never refund their cards or erase them. |
| Pay Offer, immediately resolve Last Oaths, then do the main skill | Queue Last Oaths, resolve the entire main response chain, then select them individually for new chains. |
| Call a Unit and immediately run placement triggers between calls | Finish every clause/call of the current link first; ordinary placement triggers wait until the whole chain completes. |
| Keep Energy temporarily as a production behavior for chains | Intermediate adapters are development-only. The final shipped release has neither Energy nor old immediate-trigger execution. |
| Preserve Force/relocation play debits until another migration | Remove them in this combined release. Only normal calls and Actions debit plays. |
| Keep optional Energy payment within a Last Oath | Remove the payment, preserve the optional follow-up and its specifically scoped new use limit. It remains a clause of the same link, not another response opportunity. |

**Important Force limitation:** this alternating design does not guarantee that a player can stack several of their own Forces if the opponent keeps declining. After that decline, the chain resolves immediately. Do not silently restore self-chaining or repeatedly reopen the same battle window to mimic the old batch UI. A later genuinely legal battle event/window can allow another activation.

Each Force hand activation consumes its physical card into Grave at commitment. Each Sentry is revealed and exiled face down once at commitment; attack cancellation and its bonus occur on resolution. Cancelling the attack stops future ordinary defense/check/damage, but not independent effects on other committed links. No Actions or Sentries appear as ordinary blockers.

### 2.6 Optional follow-ups and use limits

Last Oaths that contain a base Ally +3000 and an optional follow-up remain one triggered skill/link. At resolution, apply a legal base clause, then ask about the newly free follow-up when eligible. No response opens between clauses. Reserve/consume that follow-up's separate per-copy/per-name use when the player commits to it; skipping it does not use it. Never reserve the follow-up merely because the base Last Oath activated. An unavailable base target must not automatically suppress an independently legal follow-up.

The use ledger must survive zone changes and reconnect. Independent abilities have independent IDs. Limits explicitly scoped per card name are shared only for the named skill and player, not every skill on that card. Continuous effects are not capped. First-event triggers use actual event history; do not recreate their first event when a card enters play late.

### 2.7 Remaining implementation defaults

- When both owners have ordinary pending triggers, use the proposed turn-player-first scheduler at each post-chain checkpoint. The owner chooses among their eligible occurrences. This is a design default beyond the owner's single-owner example; test and document it explicitly.
- Optional trigger decline is a separate selector action. Eligible mandatory triggers prevent completing that selector. Invalid mandatory occurrences retire with a reason, not a deadlock.
- Ordinary triggers raised during a sibling chain join the same pending window. Deduplicate by occurrence/event identity, not name or array position.
- Source removal does not automatically negate a committed effect. Track targets by UID and zone-entry identity; no automatic retarget if a declared target disappears.
- No response is inserted into replacements or continuous bookkeeping. Actual normal calls/attacks are not fictitious effect links.
- Battle order must be explicit: declare attack; settle on-attack triggers and existing legal attacker/defender response opportunities; revalidate; ordinary defense; checks and check-specific effects; hit/shield operations; result triggers. A consumed battle window is not restarted after each sibling chain. Finish the full chain and pending window before advancing the suspended battle stage.

## 3. One implementation sequence

Each M-sized slice is roughly 3–5 files. Split named sub-slices by region/component when larger; keep the same acceptance contract. Record meaningful test evidence after each slice. Do not turn an unchecked box into a claim that tests passed.

### U01 — Baseline and complete manifest (M)
Dependencies: none. Files: catalogue inspection fixture, rules fixtures, migration manifest and this document.
Acceptance: reproduce the active catalogue, skill registry and current test/build baseline; classify each active skill's timing, costs, targets, optionality, use scope and chain role. Capture seed/deck/version data for before/after simulations. No missing reachable token, Sentry, Codex or granted skill.
Verification: compare actual loader IDs against Part A; record actual baseline failures instead of suppressing them. Encode the three Offer-3 branches and play accounting as target tests.

### U02 — Play accounting contract (M)
Dependencies: U01. Files: `game.ts`, `turn.ts`, `availability.ts`, focused play tests.
Acceptance: calls/Actions alone spend one play; allowance is dynamic without mid-turn reset; no double debit for special calls created by an Action.
Verification: all shield counts, Persona change, last play, zero-play skills/Force/relocation, cancel before commit and invalid-action rejection.

### U03 — Stable skill-use ledger (M)
Dependencies: U01. Files: `cards/types.ts`, `core/types.ts`, `state.ts`, ledger helper/test.
Acceptance: stable skill IDs and per-copy/per-name scopes, separate optional follow-up uses, correct turn boundaries and serialization.
Verification: return/re-enter same UID, new copy, independent skills, opponent turn, skipped follow-up, stale duplicate commit and clone/restore.

### U04 — Pure chain and pending-window transitions (M)
Dependencies: U01. Files: `core/chain.ts`, types and focused tests.
Acceptance: activation alternates response ownership, one decline locks, entire LIFO resolution is noninterruptible, post-chain selection seeds new chains without losing siblings.
Verification: three walkthrough branches, no legal response, mandatory queued trigger plus response decline, both owners, invalid occurrence, wrong transition and no fabricated empty chain.

**Checkpoint A:** play accounting, use identity and chain transitions are reproducible headless contracts. No UI-only simulation of already-resolved effects.

### U05 — Atomic activation and remaining-cost transaction (M)
Dependencies: U02–U04. Files: `activation.ts`, `effects.ts`, `game.ts`, activation tests, card contract integration.
Acceptance: no Energy component in new-rules cost plans; prepare is mutation-free; commit cost/play/use/link once; freeze cost receipts and actual paid Power/token values.
Verification: cancel/stale inputs, all-or-nothing Offer/Vent, hidden-top payment, no RNG preview, State before/after payment, no refund after negation and no refill paying its parent cost.

### U06 — Trigger collection and exact Mindanao slice (M per sub-slice)
Dependencies: U05. U06a files: `trigger-collection.ts`, events integration and tests. U06b: `maguindanao-set-1.ts`, actual-card fixtures/tests and manifest.
Acceptance: Offer-3 batch produces correct occurrences; an actual Persona skill resolves before actual Last Oaths; newly free follow-up limits apply; no nested `settle` execution.
Verification: all three walkthrough branches, main call then Ally buff, negated main with valid Last Oaths, Salendagao multiplicity, Apu first event, weighted Offer and sibling persistence.

### U07 — Typed owned decision transport (M)
Dependencies: U06. Files: Chooser contract, `pvp/decisions.ts`, client/UI adapter, test helper and tests.
Acceptance: response, pending-trigger and resolution choices are distinct with candidate/occurrence IDs; invalid ownership/revision rejected without spending.
Verification: duplicate packets, wrong seat/kind, stale target/cost draft, mandatory-selector completion versus legal response decline and cancellation retaining the opportunity.

### U08 — Board-visible response and trigger panels (M per sub-slice)
Dependencies: U07. U08a: chain panel, shared panel integration, CSS, UI tests. U08b: confirmation/availability copy and mobile fixtures.
Acceptance: one legal response card at a time, visible numbered public chain, explicit decline consequence, separate post-chain picker, zero Energy/payment badges and safe inspection/Action cast confirmation.
Verification: horizontal cards, no vertical list takeover, readable long names, focus/keyboard/touch, minimized board without blur, no double activation and all controls reachable at target sizes.

**Checkpoint B:** a real Energy-free Offer-3 flow works from input through actual card outcomes, UI and typed decisions. Capture exact event/zone/use/play traces.

### U09 — Remaining Mindanao migration (M per sub-slice)
Dependencies: U06. U09a Personas; U09b Last Oaths/observers; U09c Actions/granted effects; U09d Codex/replacements. Each touches regional scripts, corresponding tests, text source and manifest.
Acceptance: apply every M entry and Part E limit/reward; preserve subtype targets, restands, delayed Offers and continuous Grave weighting; no Energy predicates or recursive resolutions in migrated paths.
Verification: Rinayung/Karim name-wide follow-ups, other per-copy caps, Salendagao charge/buffs, Gurayn copies, Mantapuli ordering, actual Codex gates, Garahana gain/loss and hidden Omaka-an.

### U10 — Force and Sentry activation adapters (M per sub-slice)
Dependencies: U07. U10a common adapter/controller; U10b three Sentry scripts; U10c Force modes with per-region tests/text. Keep each slice bounded.
Acceptance: no Energy/play for hand skills; physical source consumed once; one link per activation; Bituon threshold snapshot; Bunog reward converted; normal call/block/check remain distinct.
Verification: 12 Force hand/check modes, all 3 Sentries, repeated physical UID, no opponent-Main permission invented, actual residual Vent cost, negation, cancellation with already-committed links and uncommitted cards remaining in hand.

### U11 — Battle/check suspension and resumption (M)
Dependencies: U09–U10. Files: battle controller, chain context, focused battle tests, lesson integration fixtures.
Acceptance: response/pending windows settle before defense/checks; no duplicate battle window; checks use check-only response policy; attack cancellation does not erase unrelated paid links.
Verification: attacker/target/support removal, Force then response/Sentry, ordinary blocker eligibility, ties, extra/skipped checks, repeated attacks and hit/miss/shield triggers.

### U12 — Visayas migration (M per sub-slice)
Dependencies: U05, U10–U11. U12a Personas; U12b Allies/Heart triggers; U12c Actions/Codex/delayed returns. Files per slice: scripts, text overlay, tests and manifest.
Acceptance: all V entries; new caps/reward; no Energy; Vent triggers queue after parent; numeric discount never erases Vent-this-card; linked end-turn returns persist.
Verification: Bakunawa select-six → own full chain → chosen Vented skill chains, actual-six-token bonus, Amara/Maguayan, Luning recursion, first-event Nardo, Doro/Guidala/Lawira and State loss during payment.

### U13 — Luzon migration (M per sub-slice)
Dependencies: U05, U10–U11. U13a Units; U13b Actions; U13c Codex/replacements. Files per slice: script/generated text, tests and manifest.
Acceptance: all L entries; Energy removed; Amuran's Discard 1 retained; compound Sipol calls finish before ordinary placement triggers; replacement instructions remain atomic.
Verification: Nanolay Discard 2, Amuran/Ammalabukkaw/Nagdombilan combo (use exact catalogue IDs), Ularan/Nagdan caps, Bayanihan transitions, normal versus special calls and same-UID deck recycling.

**Checkpoint C:** all regions and the complete battle path run under one integrated rules mode. No selectable card may fall back to old immediate execution.

### U14 — Remove active Energy and isolate historical paths (M per sub-slice)
Dependencies: U09–U13. U14a model/setup/turn; U14b helpers/events/metadata and remaining callers; U14c loaded text/legacy fixtures. Split source groups and matching tests.
Acceptance: no live Energy fields, refresh, payment/reward, affordability checks or no-op stubs; active registry complete; unavailable cards remain unavailable; old records stay stored but cannot simulate silently under new rules.
Verification: serialized fresh states and views, opening draw, loader text scan, AST/type errors resolved by real migration, old replay version refusal and preserved deck/progress IDs. Classify historical references; do not delete history merely to make a grep empty.

### U15 — Effects pacing and duel record (M per sub-slice)
Dependencies: U08, U14. U15a event presentation/source-target/result; U15b remote presentation and timeline. Files: event contract, `effect-sequence.ts`, `timeline.ts`, `remote-presentation.ts`, focused tests per slice.
Acceptance: cost movement before response, numbered link highlight before effect, queued triggers visibly wait, clean hand/field movement, structured causal record without Energy.
Verification: identical outcomes at Learning/Standard/Fast/reduced motion, hide/return, resize, duplicated frame and Continue/minimize never advancing a rules choice.

### U16 — AI decisions and simulations (M per sub-slice)
Dependencies: U11–U14. U16a evaluation and response/pending chooser; U16b deterministic fixtures and complete-match harness.
Acceptance: AI values actual resources rather than Energy, handles 0-play skills, knows one decline locks and cannot use pending triggers as responses; no hidden-information access.
Verification: all ordered region/mirror matches, sensible Force/Sentry use, trigger order, costs/caps and no swallowed loop. Compare matched baseline seeds and flag balance changes honestly.

### U17 — Authoritative PvP state and privacy (M per sub-slice)
Dependencies: U07, U14, U16. U17a session/decision validation; U17b player views/client/reconnect with corresponding tests.
Acceptance: Energy-free state and stable use/chain/pending IDs on server; owned choices allowed while controller busy; normal actions blocked through pending-window settlement; private candidate lists stay private.
Verification: actual two clients, stale/duplicate/wrong-seat messages, reconnect during draft/building/resolution/post-chain selector, consistent final state, no leaked UIDs/counts/log details.

### U18 — Learning, wording and card information (M per sub-slice)
Dependencies: U08, U15–U17. U18a First/Next Battle; U18b advanced regional/chain lessons; U18c glossary/deck guides/rules/errata. Files per slice: relevant lesson/content module plus tests.
Acceptance: teach normal calls/Actions spending plays and skills at zero; advanced Offer-3 and response lessons match real engine; text agrees with exact caps/costs; challenge stays under Tutorials; progress preserved.
Verification: controlled/free-choice routes, restart/resume, desktop/mobile, all required moves legal, 81 previously Energy-bearing art entries reviewed and outdated pixels recorded separately from runtime text.

### U19 — Shared server version/build and release preparation (M per sub-slice)
Dependencies: U17–U18. U19a shared version constants/health and mismatch tests; U19b server sync output/Chronicles regression; U19c release notes/rollback checklist.
Acceptance: one matched protocol/content revision for both new systems; no old/new room mixing; both games' existing routes preserved; coordinated rollout/rollback documented without deploying from this planning request.
Verification: game build/test, generated server build/test, health/version agreement, stale-client rejection, shared Chronicles smoke, complete private invite/match/reconnect/rematch.

### U20 — Integrated release gate (M per test group)
Dependencies: U01–U19. Files: test fixtures only if gaps remain, manifest, result report, dev log and checklist.
Acceptance: every Part E/C/A obligation has implementation/test evidence or a plainly stated unresolved blocker. No silent card omission, no prototype-only chain UI and no claim that bot simulations prove human balance.
Verification: section 4 matrix, full suite/build, real-browser flows, privacy checks, selected device checks, reproducible balance suite and human playtest findings when available. Missing physical-device/human evidence is reported, not fabricated.

## 4. Combined acceptance matrix

| Area | Required result |
|---|---|
| Energy removal | No Energy in active model, controller, card execution, snapshots, AI, UI or learning; no stubbed always-successful payment |
| Plays | Only normal calls and Actions, once at commitment; zero-play skill/Force/special-call legal; allowance never resets mid-turn |
| Atomic cost | One multi-select Offer/Vent; complete actual payment before response; no hidden preview, partial benefit, refund or duplicate use |
| Response flow | Exactly one response activation per opportunity; one decline locks; no self-chain after decline; legal permissions enforced |
| LIFO | Entire chain resolves newest to oldest without insertion, even when a link is negated/partly invalid |
| Offer-3 | All three walkthrough branches; parent first relative to queued Last Oaths; unused siblings survive; later choices are genuinely owned |
| Vent-6 | Select actual six cards together; parent response chain resolves before Vented skill chains; actual token-count bonus respected |
| Compound calls | Finish all calls/clauses in link before ordinary placement triggers; no response between base buff and optional follow-up |
| Use limits | Per-copy/per-name and separate follow-ups survive zones/reconnect; skipping before commitment never marks a use |
| Forces/Sentries | Card consumed once, modes distinct, pending versus committed cards handled correctly after cancellation |
| Targets/State | Declared targets revalidate identity; pre-cost activation gates versus resolution conditions explicit; no free retarget or false self-invalidating payment |
| All cards | Every active skill branch has behavioral coverage; three Energy rewards converted; hidden definitions stay hidden; token stays functional |
| UI | Compact horizontal choices, full readable cards, clear single-decline consequence, separate pending selector, accessible controls, no minimized blur |
| Pacing | Source/target/result sequencing, stable Continue, no duplicate card during transfer, speed cannot change state/response rights |
| Online | Server-owned decisions, no hidden-information leaks, reconnect exact opportunity, duplicate/stale answers harmless, paired version gates |
| Preservation | First/Next Battle/challenges/private PvP intact; decks/settings/feedback/progress retained; incompatible old simulations clearly rejected |
| Balance | No reproducible unbounded/resource-positive loop; report real match metrics and first-player effects; do not weaken bot choices to hide a loop |

Run focused tests during each slice; `npm run build` at integration checkpoints; `npm test` and required shared-server checks before completion. Preserve existing determinism and privacy tests even when replacing old-deck fixtures. Do not edit assertions only to conceal a changed rule.

Browser matrix: 1440×900, 1280×720, 1024×768, 390×844, 844×390 and a 320px fallback. Verify keyboard, right-click, touch long-press, minimize/restore, hidden tabs and reduced motion. Distinguish viewport emulation from actual physical-device evidence.

Balance baseline: 100 seeds for each of nine ordered regional matchups with identical before/after seeds and decks. Record first-player wins, turns, first-turn wins, draws, special calls, restands, peak Heart, Offers, chain length, decisions and no-progress cycles. Bot results are exploratory. Test with new players and experienced players when available; missing human feedback remains an explicit release-evidence gap.

## 5. Implementation completion report

When implementation is requested, carry all U tasks through their acceptance checks. Report:

1. What changed in Energy/play rules and chain timing.
2. Every card-specific replacement/cap applied, plus any evidence-driven adjustment.
3. Tests/build/browser/two-client checks actually run and their results.
4. Remaining balance, physical-device, human-test or deployment gaps.
5. Files changed, version selected and coordinated frontend/shared-server release status.

Do not claim the game is published merely because a local build passed. Do not push or restart the shared server without the user's deployment instruction. Do not update old unrelated task checkboxes based on this work.

---

## Part E — Detailed Energy-free migration

These sections are integrated specifications, not a separate release. All references to Energy describe removal or historical behavior. The unified timing contract in section 2 replaces old nested execution and batch-response behavior.

## E1. Recommendation and boundaries

Proceed with an Energy-free version. It removes one repeated calculation and makes the explanation of a turn easier. It does **not** make every effect free of conditions: Offer, Vent, discarding, returning a card to the deck, Essence, exhausting, State requirements, valid targets and once-per-turn limits remain meaningful.

Do not simply set Energy to a very large number or make `payEnergy()` always succeed. That leaves invisible rules, stale UI, broken rewards and an online client/server mismatch. Remove Energy from the active rules after every active card has a valid replacement.

Do not replace every former Energy payment with a new discard or play payment. That would recreate the same complexity and damage the agreed combo freedom. Most cards keep their effect and lose only the Energy component. Apply explicit limits to the few effects that can repeatedly generate cards, bodies or Power.

Keep the current play allowance for the first release: **printed Persona level + broken shields**, with the existing minimum of 1. A starting Level 3 Persona has 3 plays; with 1/2/3/4/5 broken shields it has 4/5/6/7/8. This remains a comeback mechanic. Do not simultaneously change hand size, deck size, copy limits, damage, Power, State thresholds or the first-turn attack rule.

Use the implemented deck constraints as the baseline: 50 main-deck cards including the starting Persona, at most 3 copies per card, exactly 12 Forces, at most 3 Sentries, and exactly 5 Codex. Some older prose says “up to 12” Forces and “3–5” Codex; reconcile that existing documentation drift without silently changing construction rules.

Do not add Level 4 cards or expand the Extra Zone during this migration. Preserve those interfaces, but evaluate their future play allowance and access conditions in a separate balance pass.

## E2. Exact rules contract

| Player action | Plays consumed | Rules retained |
|---|---:|---|
| Normal call a Unit from hand | 1 | Main Phase, legal level, legal Ally Zone; overwrite rules unchanged |
| Normal call a Force into an Ally Zone | 1 | This is a normal call, not its hand skill |
| Cast an Action from hand | 1 | Main Phase; card-specific targets and non-Energy payments still apply |
| Activate a Unit skill from any allowed zone | 0 | Printed timing, scope, State, usage limit and remaining costs |
| Resolve an automatic/triggered skill | 0 | Correct event and printed requirements; optional effects remain optional |
| Special call from any zone | 0 | Only through an effect, with that effect's restrictions |
| Use a Force's hand skill | 0 | Your Main Phase or either player's Battle Phase; spend the physical Force into Grave |
| Reveal a Force on a check | 0 | Check effect only; no extra hand-skill effect |
| Reveal a Sentry | 0 | Answer an attack on your Persona; nullify it and exile that physical Sentry face down |
| Defend with Units or Forces from hand | 0 | Existing defense restrictions; no Actions or Sentries as ordinary blockers |
| Personify | 0 | Existing Personify window and effect-specific permissions |
| Switch Codex / use its skill | 0 | Existing switching window and per-turn restrictions |
| Relocate/swap Allies | 0 | Main Phase only; preserve once-per-turn movement tracking for both swapped cards |
| Attack, support, draw, check, Offer, Vent, Essence | 0 | Respective rules; no new action budget |

Relocation and Force skills need actual play-accounting changes. Current activated Unit skills already do not increment the play counter. Current Force hand skills increment it on the controller's turn, and relocation also increments it. Normal calls already have no Energy fee.

Use one shared rule for play-consuming actions, referenced by legality, execution, previews and tests. Keep the internal `normalPlaysUsed` name initially if a rename makes migration unnecessarily broad; show **Plays remaining** to players. Increment exactly once when a normal call or Action is committed, before its effects resolve. Calls created by that Action do not increment it again.

At 0 plays, normal calls and Actions are unavailable; skills, Force responses, relocation, attacking and special calls can still be legal. Ending Main remains the player's choice.

The allowance remains dynamically derived from the current Persona and broken shields, as in the current engine. Never reset plays mid-turn because a shield broke or the Persona changed. If the allowance increases, only the difference becomes available. If it decreases below the used amount, show 0 remaining; never undo prior plays.

Opening: both players visibly draw 5; first player skips only the first-turn draw and its replacement; second player draws normally. No starting Energy and no Energy refresh step. Preserve all other opening rules.

## E3. Audit findings and scope

| Region | Selectable cards | Cards whose current displayed text mentions Energy |
|---|---:|---:|
| Luzon | 43 | 27 |
| Visayas | 47 | 28 |
| Mindanao | 51 | 26 |
| Total | **141** | **81** |

The 141 comprise 66 Units, 30 Actions, 30 Codex, 12 Forces and 3 Sentries. The 81 count includes explicit `0 Energy` text; it is a text audit, not a claim that all 81 pay a positive cost. All 141 need regression coverage because free support effects change their combinations. Another 29 unavailable definitions mention Energy; their status is recorded separately rather than silently enabling them.

Authoritative sources are layered:

- `src/data/loader.ts` merges old cards and Set 1, overlays skill text, retains the three old-ID Sentries as Set 1, and hides Omaka-an.
- Luzon current skill text is generated by `src/cards/agta-set-1.ts`; editing `content/agta-set-1-skills.json` alone will not change the game.
- Visayas and Mindanao text comes from their `content/*-set-1-skills.json` overlays; behavior is in `src/cards/*-set-1.ts`.
- The selectable Sentries still use scripts in `src/cards/agta.ts`, `babaylan.ts`, and `maguindanao.ts`.
- Energy is paid through ability metadata, Action metadata, controller helpers, shared effect helpers, direct subtraction and local helper functions. Replacing only `energyCost` is insufficient.
- Current play accounting and some HUD explanations disagree: the tooltip describes normal calls, while Actions, Forces on your turn, and relocation also increment the counter.
- Some advanced lesson descriptions no longer match current skills even before Energy removal. Rebuild those examples against actual card scripts rather than only deleting the word Energy.

### Required Sentry correction

Source inspection found that Bituon checks and spends 3 Energy inside its own `run` function, but does not exile itself. The shared resolver checks only metadata Energy and does not enforce spending the Sentry. Banoy and Sabir exile themselves in their scripts. The existing Sentry-spend test covers Banoy, not all three.

Make **reveal → consume/exile exactly once → nullify → resolve bonus** a shared Sentry contract. Commit exile before the response opportunity; resolve nullification and bonus only when the Sentry link resolves. Remove duplicate per-card exile calls or make the transition idempotent. Snapshot Bituon's Andukha threshold at activation, before its new tokens arrive. Ensure its bonus remains 1 token, or 2 at Andukha 9, rather than creating one and then using that token to qualify for two.

This is a code-inspection finding; no new live exploit or Energy-free balance test was performed for this plan.

## E4. Card conversion policy

### Ordinary skills

Remove only Energy from compound payments. `1 Energy + Offer 1` becomes `Offer 1`; `2 Energy + Vent 6` becomes `Vent 6`; Nanolay keeps `Discard 2`; Amara keeps `Vent this card`; Maria Cacao keeps Essencing the top 2; Iday keeps Essencing itself. Do not remove those restrictions or bypass their choice prompts.

Existing once-per-turn skills stay once per turn. A skill returning to hand, Grave, Heart or the deck does not reset its use in the same turn. Use a stable skill ID rather than rules-text strings as the long-term usage key. Track usage in authoritative game state by owner, physical card UID, skill ID and turn number; for explicitly named restrictions use card-definition ID instead of UID. Consume activation use atomically before responses; pre-commit draft reservations, if any, must be released on cancellation. Never refund a committed use because its effect was negated. Optional follow-up clauses consume their separate use only when chosen during resolution.

Do not globally make every trigger once per turn. Only the listed proposals gain a new cap. Continuous effects stay continuous; token counts and first-event conditions retain their actual semantics.

### Actions

All 30 Actions cost exactly 1 play, including those that currently cost 0 Energy. Preserve Vent, Offer, Essence and other requirements. Do not add multiple-play prices to formerly expensive Actions in this first version. They already consume a card and compete with normal calls.

This also removes the old distinction between cheap and expensive Actions. Compare tutor/call-two Actions against calling one Unit directly, and compare mass Power/removal Actions against their smaller alternatives. If a card becomes an automatic choice, tune its own amount, condition or genuine card cost after matched tests. Do not assume that one play alone guarantees all 30 Actions are balanced.

Keep the Action confirmation screen: inspect safely, choose Cast or Cancel, see `Uses 1 play · 3 → 2 remaining` and any real additional cost. Before commitment, cancellation spends nothing. Once cast and its required cost is committed, it goes to Grave and uses the play even if a later effect is partially impossible. Never permit cancelling an unpaid mandatory cost after already receiving part of the benefit.

### Force cards

All 12 keep their check effect: choose a Unit for +5000 until end of turn. Hand activation uses their distinct skill and spends the card into Grave, with no Energy or play charge. Calling that same Force as an Ally still uses a play. Defending with it still spends it as a blocker without activating its hand skill. Keep these choices clearly separate.

Use the unified alternating response system: commit one Force or Sentry per response opportunity, then offer the opponent a response. One decline resolves the full chain LIFO. No preselected multi-card response batch remains. Recheck each committed link's own targets/requirements at resolution; defer ordinary generated triggers until the whole chain finishes. If a Sentry stops the attack, uncommitted cards remain in hand; already committed links still resolve under their own validity policies.

Do not impose a blanket once-per-turn Force limit. Test Mountain Tunung's repeated restands and Tumatanan's extra calls using real available copies and recovery lines. If one is too strong, adjust that specific effect after evidence.

### Three Energy rewards that require new effects

| Card | Proposed replacement for Energy reward | What stays |
|---|---|---|
| Healer's Spirit-Friend, Bunog | Hand skill: choose one of your Units; it gets Power +3000 until end of turn | Normal Force check +5000 remains separate; spends itself into Grave |
| Return Our Moon | If the recovered Unit is Divine, you may Essence the top card of your deck | Recover one Unit from Heart to hand; Beast/Bird draw-then-discard branch; costs 1 play |
| The Price of the Third Victory | If Garahana is released after draw/discard, your Persona gets Power +3000 until end of turn | Offered 3+ requirement; draw 2 then discard 1; costs 1 play |

These are concrete starting proposals. They avoid another currency, preserve each region's identity, and do not automatically replace an Energy reward with unconditional card advantage.

## E5. Regional balance changes and required combo checks

### Luzon: keep deck shaping and special calls

Most Units already have once-per-turn tracking. Remove their Energy payments while retaining Bayanihan, placement conditions, discard costs and deck movement. In particular, preserve Talimanog's no-payment behavior and Namandiyanin's Sumipat 3 effect, now without Energy. Keep the distinction between a normal call and an effect calling a Unit from hand.

Taguwasi and Kalimangalnuk become easier engines; Nanolay still needs Discard 2 for its charged Personification. Ularan keeps its existing once-per-turn Codex gate. Nagdan keeps its fewer-Units requirement and once-per-turn gate.

**Recommended exception: Wedding-Clearing, Amuran.** Replace `3 Energy: Sipol 3` with `Discard 1: Sipol 3`, once per turn when it becomes active. Retain its switching condition. This is a proposed new card cost, not a general conversion rate: a free three-call engine is much larger than removing the fee from a single Sumipat. Commit the discard before responses and before the first Sipol. Resolve all three Sipol instructions within the same link; ordinary placement triggers wait until that entire chain finishes. If no card can be discarded, the skill cannot activate.

Test Amuran plus Ammalabukkaw plus Nagdombilan, followed by Bayanihan release and replacement skills; Aligan and Dalunan changing Sipol; Nanolay Personification into another Nanolay; Amuray/Tamin returning the same physical card to the deck; multiple Tumatanan hand skills during battle. Ensure temporary Power expires and used skills do not reset on a zone trip.

### Visayas: Heart replaces Energy as the main resource

Keep Vent amounts, Andukha 6/9/12 thresholds and Sinogo's numeric Vent reduction. The reduction cannot reduce `Vent this card` into nothing. With a numeric reduction, count actual Kaluluwa Vented: paying 4 for a reduced Vent 6 does not earn Bakunawa's six-token draw.

Preserve Mangaw's optional two tokens once per Main Phase; Maria Cacao's once-per-turn token skill and mandatory end-turn Essence; Doro's end-turn self/companion Essence; Guidala's linked return obligation. An effect becoming Energy-free must not make its delayed cost optional.

Proposed new limits:

- **Luning:** extra-token skill once per turn across cards named Luning. Add one token per creation event, never per token; bonus creation cannot trigger Luning again. This prevents several free copies multiplying every token event.
- **Sali:** Power +5000 from Vent once per turn per physical copy; one multi-card Vent batch is one event, not six triggers on Sali.
- **Guidala:** its optional special-call follow-up once per turn per physical copy, including after leaving and returning. Its base placed Essence remains event-based. If playtesting demonstrates repeated base Essence cycling, cap that separate line explicitly rather than silently changing it.
- **Tata Cero:** attack Power scaling once per turn per physical copy; keep the bonus for that battle.
- **Iday:** self-Essence +5000 skill once per turn per physical copy; preserve Hand/Ally scope and a valid remaining target.

Preserve Nardo's first Essence event of the turn, including if it was absent at that time: placing it later does not manufacture a new first event. Keep vented Ulango, Sagwil, Wakira and Silak event-based initially; their card movement is real payment. Stress-test repeated Grave→Heart→Vent recycling before release.

Test Mangaw + Luning + Dingayop Cavern + Dalagan for token growth; Maria Cacao/Amara with Maguayan for call/draw loops; Bakunawa's six-card selection and ordered Vent triggers; Ulango/Silak recovery sequences; Sali and Aday scaling; Doro/Guidala/Lawira end-turn chains. Record Heart threshold transitions both upward and downward during a chain.

### Mindanao: keep Offer and Last Oath, control free refills

Keep the explicitly approved subtype rule: searches for a Maguindanaon Unit require that subtype; they do not mean every Unit from Mindanao. Preserve Offer amounts, weighted Offer values, charged arrivals, temporary Offers and Garahana's 5 qualifying Grave-card threshold.

Remove Energy from Potri, Tomitay, Indarapatra and the remaining paid skills; retain their individual once-per-turn clauses. Potri's draw and Power remain state-gated. Apo a Bekong still gains its permanent bonus automatically for each qualifying shield break. Maka-Ogis still adds the offered Ally's current Power for that battle.

Last Oath proposals:

- The +3000 Ally bonus remains event-based and requires a legal Ally for that portion. Lack of an Ally does not automatically skip an independently legal follow-up.
- **Rinayung and Datu Karim:** their free special-call follow-up once per turn per card name per player. The shared limit prevents a chain of fresh copies replacing each other repeatedly. Only that follow-up gets the shared restriction; say so in the text.
- **Rinamuntaw, the Old Woman, Maharaja Layla, Datu Kali Adam and Dayang Amina:** the newly free follow-up once per turn per physical copy, persistent across zone changes. Preserve the separate choice to decline it.
- **Lanao Sprite:** its newly free Persona +2000 once per turn per physical copy; duration remains through the end of its controller's opponent's turn.
- **Balbal:** its mill-three/Power placed skill once per turn per physical copy.

Initially preserve Salendagao's per-Offer +5000 and Pahira's offered trigger. These already have no Energy fee, but free recursion makes them high-priority combo tests. Also preserve the physical-card limits on Pah, Tarabuk, Tarabusaw and Gurayn; specifically test successive Gurayn copies gaining extra attacks. Do not silently turn all existing restand skills into once-per-name rules. If repeatable resource-positive loops survive the above limits, give the exact offending skill a documented name-wide cap before release.

Mount Kabalalan's implementation already has a once-per-turn gate through its factory, but its displayed skill omits that detail. Correct the text as part of this audit. The same explicit-text check applies to other once-limited Codex skills. Keep Omaka-an hidden.

## E6. Payment, triggers and loop safety

Removing Energy makes correct non-Energy payment more important:

1. Check timing, ownership, zone, remaining use, target requirements and all mandatory cost components.
2. Collect all cost choices. Multi-card Vent/Offer is one selection and one confirmation; show actual cards and required total.
3. Validate unique UIDs, current zones, subtype/level restrictions and weighted totals. Snapshot properties needed by the effect, such as offered Power or Kaluluwa count.
4. Commit the full cost and reserve the skill use together. A cost-triggered special call cannot pay the rest of that same cost.
5. Queue ordinary cost triggers without resolving them; offer the opponent a response to the committed main link.
6. Alternate actual responses until one decline locks the chain. Resolve the full chain LIFO; then let owners select queued triggers individually to start new chains with source highlights. Never run nested trigger resolution between links or clauses.

Do not reduce Vent or Offer counts accidentally while deleting Energy arguments from helpers. Replace ambiguous helpers such as `pay(c, energy, vent)` with clearly named Vent/choice operations. Do not alter `Essence 2` into Vent 2.

Use event IDs so each eligible trigger resolves at most once per source per event. Keep optional decisions skippable and mandatory end-turn returns unavoidable. Usage tracking must survive state clones and online reconnects and must not expose concealed card identity.

An engine watchdog is a last-resort diagnostic, not a hidden rule that silently drops legitimate effects. Detect repeated state/decision cycles, log the responsible skills, and fail regression scenarios. Never call an infinite loop fixed merely because the bot stopped after a fixed number of actions.

## E7. UI and onboarding

Remove Energy from both player panels, payment badges, affordability sorting, stat pulses, warnings, choice summaries, deck statistics, inspectors and tooltips. Remove unused layout gaps. Do not replace it with a new meter.

Use these concise labels:

- `3 plays remaining` — tooltip: `Normal calls and Action cards use 1 play. Skills and special calls do not.`
- Action: `Cast Action · 1 play` plus real remaining payment, if any.
- Force: `Use skill` / `Call as Ally · 1 play`; right-click/long-press still inspects.
- Optional triggered effect: `Use skill` / `Skip`, with source card and effect; never `Pay 0 Energy`.
- Exhausted allowance: `No plays remaining. You can still use available skills or enter Battle.`
- Used skill: `Already used this turn.` Name-wide limits: `This skill was already used by a card with this name this turn.`

The 0-play message must not mask a hand/Heart skill or Force skill that remains legal. Derive every highlighted action and disabled explanation from the engine's legal actions.

Keep horizontal card viewers, compact board-visible modals, hover/long-press inspection, Action misclick confirmation, multi-select Vent, ordered effects and clear source-card animation. Preserve green auto, yellow battle and red state indicators; removing Energy does not change a skill's category.

Rewrite First Battle to teach one normal call and one Action consuming plays, with no Energy lesson. Preserve its controlled legal sequence. Your Next Battle hints should help decide between field development and an Action, and show a free skill after spending all plays. Recheck every prepared lesson's actual moves, not just its copy. Advanced lessons teach remaining costs: Sipol/recycling, Essence/Vent, Offer/Last Oath. Keep Archipelago Challenge in its Tutorials section.

Preserve saved tutorial completion, custom decks, challenge progress, feedback and settings. If a lesson's objective changes materially, version that lesson's completion requirement and explain the new optional refresher rather than wiping everyone's progress.

## E8. Implementation map

| Area | Primary files | Required work |
|---|---|---|
| Core model/setup/turns | `src/core/types.ts`, `state.ts`, `setup.ts`, `turn.ts` | Remove active Energy state and refresh; preserve play allowance, draw and Personify |
| Controller | `src/core/game.ts` | Remove Energy legality/payment; stop Force/relocation play spending; enforce Sentry consumption; preserve battle windows |
| Effects | `src/core/effects.ts`, `events.ts` | Remove live Energy helpers/events; retain cost and movement events for real costs |
| Usage identity | `src/cards/types.ts`, `src/core/types.ts`, `game.ts`, `state.ts` | Stable usage IDs and explicitly scoped caps; retain usage across zones |
| Luzon | `src/cards/agta-set-1.ts`, `src/cards/agta.ts` | Generated text, payments, Bunog, Amuran and Banoy |
| Visayas | `src/cards/babaylan-set-1.ts`, `src/cards/babaylan.ts`, `content/babaylan-set-1-skills.json` | Direct arithmetic/helper changes, reward replacement, limited triggers and Bituon |
| Mindanao | `src/cards/maguindanao-set-1.ts`, `src/cards/maguindanao.ts`, `content/maguindanao-set-1-skills.json` | Energy helper removal, Last Oath follow-ups, reward replacement and Sabir |
| Loaded card data | `src/data/loader.ts`, `cards.json`, `set-1.json`, relevant `content` mirrors | Match current text and scripts; avoid reintroducing old export text |
| Decision UI | `src/ui/main.ts`, `action-cast.ts`, `skill-confirmation.ts`, `card-choice.ts`, `style.css` | Play previews, no Energy badges, real remaining-cost prompts |
| Explanations | `src/core/availability.ts`, `src/ui/glossary.ts`, `deck-learning.ts` | Rules-accurate blocked reasons and deck composition summaries |
| Learning | `src/ui/first-battle.ts`, `first-battle-session.ts`, `next-battle.ts`, `lessons.ts`, `tutorial-mode.ts`, `tutorial.ts` | Prepared positions, progress-safe copy, scripted steps, lesson tests |
| AI | `src/ai/bot.ts`, `evaluate.ts`, related tests | Remove Energy valuation/reserves; evaluate actual card/Heart/field costs and alternating Force responses |
| PvP | `src/pvp/catalog.ts`, `view.ts`, `session.ts`, `client.ts`, `decisions.ts` | No Energy in snapshots; compatible version checks, caps and pending choices |
| Server deployment | `game-server/src/guests.ts`, `rooms/CodexMatch.ts`, `tools/sync-chronicles-server.mjs` | Shared version constants, regenerated Chronicles vendor bundle and manifest |
| Historical compatibility | `src/core/replay.ts`, replay UI/store types, legacy registry/tests | Reject incompatible old simulation records clearly; do not enable replay saving |
| Docs/content | `docs/game-rules.md`, current guides, dev log, marketing rule explanations | New authoritative rules, dated errata, no stale teaching |

The old spreadsheets are excluded from Git and are not the active rules source. Do not run old migrations or regenerate current cards from them. Printed art may contain baked-in outdated text: inspect the affected 81 card images before release and create an asset errata list if needed. Do not promise that changing JSON also changes card pixels. Re-render text-bearing art from editable sources if available; until then make the digital rules panel explicitly authoritative.

## E9. Hidden cards and historical records

Keep all unavailable cards unavailable, including Omaka-an. Kaluluwa is the exception: it is not deck-selectable but remains a live token used by effects.

Prefer an active Set 1 script registry plus the three retained Sentries. If retaining a legacy registry for developer fixtures, isolate it behind an explicit old-rules boundary rather than allowing old Energy fields to leak into new matches. Old tests that load `decks/agta.json`, `babaylan.json` or `maguindanao.json` must either migrate to the real Set 1 decks or be clearly designated historical compatibility tests. Do not delete coverage for hidden-zone privacy, determinism or event ordering just because it used an old deck.

Preserve custom deck IDs and data. New matches containing unavailable old IDs should explain which cards need replacing; do not silently substitute a different card. Preserve historical logs and local feedback. Any retained replay/import path must identify a rules revision and refuse to simulate Energy-era records with new rules; leave records stored and explain incompatibility. Do not delete replay code wholesale or turn replay saving back on as part of this work.

## E10. Online release and versioning

The Colyseus match server executes the rules. A frontend-only deployment is insufficient. `src/pvp/catalog.ts` currently identifies protocol 1 and content `codex-set1-2026-09-30`; `/codex/health` duplicates those values. Introduce a shared rules/content version, update protocol for the removed snapshot field/changed contract, and read the same constants in health responses.

Rebuild the Codex shared server module with `tools/sync-chronicles-server.mjs` into the existing Chronicles project. Review its generated manifest and bundle; retain the separate Chronicles rooms and APIs. Run that project's existing tests as well as Codex's.

Stage the complete version first. Existing matches must finish on their original rules or be explicitly ended during an announced update; do not mutate a running room into new rules. Gate new room creation during a coordinated shared-server/frontend release if necessary. Stale clients get a useful refresh message before joining or submitting actions. Do not reconnect an Energy-era room to the new schema and pretend it is compatible.

After deployment verify `/codex/health`, both-seat version agreement, an actual invitation/join, one full match for each regional pairing, reconnect during an multi-select Vent or chain-response decision, results and rematch. Also smoke-test Chronicles because the server is shared. Roll back both Codex frontend and server bundle together if a blocking fault appears. Prepare this coordinated release; execute deployment only on the user's deployment instruction.

## E12. Verification matrix and release gates

### Rules and card tests

- Starting allowance, every broken-shield count 0–5, zero remaining, dynamic Persona changes, ordinary calls, overwritten slots, Action cast and special calls within Actions.
- Force: normal call versus hand skill versus block versus check; own Main/own Battle/opponent Battle; no play debit in skill paths; legal remaining costs such as Salumi's Vent 1.
- All three Sentries, no ordinary blocking with them, Bituon consumes itself with or without a bonus, and uncommitted cards stay unspent while already committed links retain their resolution.
- Every removed Energy predicate, metadata property, direct subtraction, refund and optional payment helper has a migrated path. Text tests alone are insufficient: exercise the card's relevant branch.
- At least one behavioral scenario per changed skill branch and per replacement reward. Every unaffected selectable card retains its timing, valid zones and core result under the new model.
- Per-copy versus per-name use, multiple copies, independent skills, opponent's turn, field re-entry, Personification, Heart/Grave travel, clone and reconnect; declining before commitment never marks used.
- Weighted Offer and Grave counting remain distinct; subtype searches exclude unrelated regional Units; no cost is paid by effects created by that same cost.
- Multi-Vent 6 in one confirmation, owner-selected post-chain triggered activations, actual token counts after discounts, state threshold lost while paying, mandatory delayed Essence/Offer.
- Bounded full games with real Set 1 decks. Failing to finish due to a repeated effect must fail the test rather than be scored as a draw.

Use the existing suites around `action-play-limit`, `force-battle`, `sentry-spend`, `opening-turn`, `availability`, all three `*-set-1` suites, `offer-value`, `offer-recall-fx`, `bottom-order`, `heart-fx`, `fx-order`, determinism and PvP decisions/session/view. Update obsolete assertions intentionally. Migrate legacy-deck simulations to selectable Set 1 for the balance run.

### Browser acceptance

Test 1440×900, 1024×768, 390×844 and phone landscape. Play a normal call, inspect/cancel/cast an Action, use a skill at 0 plays, exchange individual legal Force responses, use a Sentry, Vent several cards, minimize and restore a decision, and finish the tutorial. Verify no clipped buttons or new vertical card-list scrolling, no board blur when minimized, no double-visible moving cards, and no Energy labels. Check keyboard, right-click and touch long-press. Reduced-motion and hidden-tab behavior must still finish effects without leaving decisions stuck.

### Balance evidence

Run a proposed baseline of **100 seeds for each of the 9 ordered regional matchups**, covering both seating assignments for different decks and all three mirrors. Use identical seeds/decks for before/after comparisons and record starting player. These are exploratory bot results, not a proof of human balance.

Record first-player win rate, turns to finish, first-turn wins, cards drawn, special calls, attacks/restands, peak Heart, Offer count, max effect-chain length, number of decisions and any no-progress cycle. Any reproducible infinite/resource-positive loop blocks release. A sudden first-turn-kill line or a large win-rate shift triggers focused card review; do not conceal it by making the bot decline strong legal moves.

Then test with at least five new/non-TCG players and several experienced players. Ask each to explain what spends a play, distinguish Force skill from normal call, and complete a turn without Energy questions. Record where they hesitate and how long they wait through effects. A useful launch target is four of five newcomers explaining the play rule after the short lesson; treat it as a usability target, not an already achieved result.

### Release checklist

- [ ] All 141 selectable cards accounted for; Kaluluwa verified; hidden cards remain hidden.
- [ ] Three obsolete Energy rewards replaced and tested under the unified chain rules.
- [ ] Bituon and all Sentries have enforced one-card consumption.
- [ ] No live Energy state, cost, reward, legality check, AI preference or payment UI remains.
- [ ] Only normal calls and Actions spend plays, including on the authoritative server.
- [ ] All required non-Energy costs, State gates, targeting and once limits still work.
- [ ] No unintended same-turn reset, token loop, Last Oath loop or reusable Sentry.
- [ ] Current tutorials/card inspectors/deck guides/rules agree; baked-in art checked.
- [ ] Full tests/build, browser checks, balance simulations and human playtest findings recorded.
- [ ] Frontend/server version mismatch and reconnect paths tested; shared Chronicles smoke test passes.
- [ ] Progress/decks/settings/feedback preserved; old simulation records cannot run under new rules silently.
- [ ] Coordinated deployment and paired rollback prepared.

## E13. Player-facing explanation

“Each turn, you have a number of plays. Calling a card from your hand to an Ally Zone or casting an Action uses one play. Skills and special calls do not use plays. Read the skill for its timing and any cards you need to Offer, Vent, discard or move.”

The success condition is a simpler turn that still rewards decisions: spend plays to develop your field, use your deck's own resources to build combos, and keep useful cards for defense.


---

## Part C — Detailed chain specification

These sections apply to the final Energy-free rules, not an intermediate Energy-era release. Section 3 above is the single implementation sequence.

## C2. Confirmed rules

1. Activating a skill and resolving it are different operations.
2. The main skill is Link 1. Its complete activation cost is paid before the opponent's response window.
3. Offering three ordinary Allies moves all three to Grave before responses. Tokens follow their existing removal rules.
4. The eligible ordinary triggers earned by that payment are queued together for after the current chain, not resolved immediately or offered as responses to their parent skill.
5. The opponent of the latest activator gets the next response opportunity.
6. On their response opportunity, a player may activate one explicitly legal response, or decline. A queued ordinary Last Oath is not a response simply because its trigger occurred.
7. Every committed response adds one link and gives the other player a response opportunity.
8. One decline by the current responder locks the nonempty chain immediately. There is no second pass and no extra self-chain opportunity for the latest activator.
9. The newest link resolves first. The entire chain finishes before new activations are allowed.
10. Choices inside an effect, such as search results, discards and destination slots, are still made during resolution when the card requires them. These are not response windows.
11. Ordinary triggers earned by costs or during resolution wait until the entire current chain finishes. Then their owner selects one to activate as Link 1 of another chain, with the usual opponent response opportunity.
12. Choosing an activation order is not choosing an uncontestable resolution order. A later response resolves before earlier links.

### Exact acceptance walkthrough

- A activates an Offer-3 skill. Prepare the payment; commit all three Offers and Link 1 together. Do not resolve the main effect.
- Queue Last Oaths X, Y and Z. They are not selectable in this chain's response modal.
- Branch 1: B declines. Immediately lock and resolve the main skill alone. Do not ask A to self-chain a Last Oath first.
- Branch 2: B activates a legal response as Link 2. A declines. Lock and resolve B's response, then A's main skill. B does not get another activation opportunity after A's decline.
- Branch 3: B adds Link 2, A adds an eligible response as Link 3, B declines. Lock and resolve 3, 2, 1 with no response modal between links.
- Only after the complete chain finishes, A sees the queued Last Oaths and chooses X. Revalidate its activation, pay its actual activation cost and create a NEW chain with X as Link 1.
- B receives a response opportunity to X. On a decline, X resolves; on a response, alternate as above until someone declines, then resolve the complete chain backward.
- Y and Z remain queued while X's chain runs. A may choose their order afterward; they do not expire merely because the main or X chain locked.
- Merge newly earned ordinary triggers into the pending-trigger window, subject to their real validity and usage limits. Continue until owners activate or explicitly decline the available optional occurrences and required occurrences are handled.

Negative acceptance: B declines -> A adds another link is forbidden. A declines B's response -> B adds another link is forbidden. Cost-generated Last Oaths interrupting the main chain are forbidden. After resolution, A must be able to choose Y before X if both are still legal; payment selection order must not decide that order.

## C3. Rules details to implement

The following defaults complete the agreed flow. They are design decisions for this update, not claims about existing behavior.

### C3.1 Response opportunities and pending-trigger selection

- A committed activation gives priority to the other player, including when its cost creates triggers owned by the activator.
- A response adds one link and transfers the response opportunity. A decline locks the chain, not a transfer. No consecutive-pass counter is needed.
- After the whole chain resolves, open a separate pending-trigger selector. This is not another response opportunity inside the finished chain.
- Proposed cross-player scheduling default: at each post-chain checkpoint, the turn player handles their pending occurrences first, then the opponent. Owners choose one at a time and may decline optional occurrences; after each chosen trigger's complete chain, recompute the same turn-player-first order. Do not interrupt a committed chain to enforce this ordering. Exercise both owners in tests and record long runs; never silently auto-resolve one owner's mandatory triggers. This cross-player default is a plan decision beyond the user's single-owner example.
- For an event without an activation (normal call, phase boundary, attack declaration), collect its ordinary triggers and use the pending-trigger selector. The event is not a fictitious link. Preserve separately defined non-chain battle/phase windows; a decline in an empty window closes only that defined opportunity, never creates a chain to resolve.
- An explicit battle response opportunity may start a new chain with a legal Force or Sentry. Once a card is committed, the normal single-decline rule applies. Finish the battle's required windows and triggered chains before proceeding to defense/checks.
- A responder with no legal response can be declined automatically by the controller, locking the current chain immediately. Queued Last Oaths must not keep that response window open. Do not claim publicly which hidden cards the responder lacks.
- Ordinary turn actions are unavailable while building/resolving a chain or settling the pending-trigger window. Existing surrender and inspection remain available.

### C3.2 Ready triggers, optionality and mandatory effects

A queued ordinary trigger is an earned opportunity for the next pending-trigger selector, not a legal response or an already activated link. Store the triggering event and its owner. Do not infer it later from the current board or parse its rules text. Classify explicit response skills separately; do not guess response permission from the fact that a card has a trigger.

- Ordinary triggers earned during payment, response payment or resolution stay queued across the current chain and subsequent sibling-trigger chains. They become selectable only at post-chain checkpoints.
- Do not expire them at chain lock. Optional occurrences are consumed on activation, removed on explicit decline in the trigger selector, or retired for a defined invalidation condition. They must be handled before the pending-trigger window returns control to normal play; they cannot be banked for a later unrelated action or turn.
- A response decline never means 'decline my pending triggers'. Use different decision kinds and button labels.
- Mandatory ordinary triggers wait just like optional ones. They do not prevent a responder from declining and locking the CURRENT chain. Their owner cannot finish the later trigger-selection window while an eligible mandatory occurrence remains, and chooses the order among eligible occurrences rather than array order.
- If a mandatory trigger cannot legally activate, retire that occurrence with its actual reason; do not deadlock the window. Do not author a paid mandatory effect without an explicit impossible-payment policy.
- Continuous rules, replacements and mandatory triggered skills are distinct categories. Continuous rules and true replacements do not join the chain merely because they are automatic.
- Do not turn all green skills into mandatory effects. Preserve each current card's optionality unless a separately documented text correction changes it.
- One ready occurrence can be activated once. A once-per-turn skill may have multiple event occurrences recorded, but committing one consumes the shared limit and invalidates further activations as appropriate.
- Keep temporarily unavailable optional occurrences through the pending-trigger window where appropriate; a prior sibling chain can change their legality. Reevaluate at post-chain checkpoints. When the window ends, retire any remaining unavailable occurrences with a reason. A UI filter is not deletion of the occurrence.

### C3.3 Offer batches and event identity

Give each payment an event-batch ID. Validate every selected UID, ownership, zone and required Offer value before committing any movement. The payment, link registration and usage consumption become one atomic rules transaction, with no response callback between them.

Collect listeners from a pre-payment snapshot and evaluate the completed payment as a batch. Record before/after zones, physical UIDs, field-entry identities, counters and State transitions. Proposed simultaneous-departure policy: an Ally that leaves in the same payment can observe the other simultaneous departures if its skill watched them while it was on the field. Its own Last Oath uses its own departure record. Reevaluate State after the full payment; evaluate later queued triggers against their own current requirements. The paid parent activation follows section 2.2's pre-payment gate policy. Cover this explicitly rather than depending on selected-card order.

- One Last Oath occurrence per physical Offered card and matching skill.
- A surviving Salendagao can earn three separate occurrences from three other Offered Allies if Garahana and its requirements allow them. It does not earn an occurrence for itself.
- Preserve first-event-per-turn behavior: Crocodile-Form Apu gets one first-Offer opportunity from the first qualifying payment, not three because the batch has three cards.
- Snapshot the offered Ally's Power before it leaves when a cost refers to that Power, such as Maka-Ogis.
- Keep Offer value separate from physical card count. A card that pays two Offer value is still one card with one Last Oath occurrence. Preserve existing weighted counters deliberately; do not duplicate triggers from weights.
- Offer is not ordinary enemy damage. Prevent the current shared damage queue from issuing an unintended second Last Oath or inappropriate damage trigger.
- Last-known identity must survive token removal and source movement without accessing a deleted instance.
- Calls, Essence, Vent, draws and State changes need the same event identity/deduplication discipline. Reuse the existing multi-card Vent event where appropriate.

### C3.4 Activation, payment and cancellation

Use explicit stages: prepare inputs -> validate -> commit cost and link -> offer responses -> resolve -> clean up.

- Preparing or inspecting an activation does not spend anything, reveal deck contents, advance RNG, consume a play, reserve permanent usage, or produce triggers.
- Confirm all cost choices in one transaction. A cancelled draft leaves rules state unchanged and returns to the same priority opportunity without counting as a pass.
- If preparation needs the post-cost board (e.g. reviving the Ally being Offered), use a projected payment state for validation. Do not pay first and then offer a misleading Cancel button.
- Hidden top-deck payment is executed only after commitment; it must not become a free preview.
- After commitment, the cost remains paid if a response negates the effect or removes its target. No refunds or normal undo.
- Usage limits are consumed on commitment. Use stable skill IDs, card UIDs/definition IDs as required by the printed limit, owner and turn; never key new usage data by mutable rules prose.
- Existing resource replacements must go through the same validated payment pipeline.
- Effect-generated resource gains cannot fund the cost of a later response in the same chain: no effect has resolved yet. UI availability must reflect this.

### C3.5 Targets, source movement and multi-clause effects

Every migrated ability must declare which inputs are activation targets and which are choices during resolution.

- Choose explicit public field/Grave targets at activation, before the response opportunity. Store UID and relevant zone-entry identity so leave-and-return cannot silently become the same target.
- Deck searches, top-card inspections, random outcomes, cards drawn then discarded, and choices concerning newly created objects stay inside resolution. Do not reveal them in the activation preview.
- Source removal alone does not negate an activated effect. Use the stored effect identity, event and paid-cost data. If the effect specifically needs the source on the field, recheck that requirement for the applicable clause.
- If a target is invalid at resolution, do not auto-retarget. Apply the card's defined partial-resolution/dependency policy and record the outcome.
- Independent clauses may still resolve. Dependent clauses such as an effect requiring a successful call need explicit success checks. Define this per card, not one global 'missing target cancels everything' rule.
- Historical trigger facts remain historical. Current resource, target, State and zone requirements are validated at commitment; recheck only explicitly resolution-dependent requirements later.
- A queued Last Oath uses its earned event even though its source already left the Ally Zone. A Grave self-revival such as Apu still needs its source in Grave when activation/resolution requires moving it. Document source-zone policy per skill.
- For Last Oaths with a base +3000 and formerly Energy-paid follow-up, remove Energy and preserve the optional follow-up under Part E's specified limit. It remains a clause of the same effect, not a second activation. No response opens between bonus and follow-up. Consume its separate use only when that optional clause is committed during resolution, never when the base skill activates or the clause is skipped.
- Payment events created inside resolution only generate deferred triggers. They cannot recursively resolve new skills.

### C3.6 Negation and attack cancellation

Keep outcomes distinct: effect negated, target unavailable, partially resolved, attack cancelled and source removed.

The engine should support negating a specific committed link only when an actual card permits it. Do not invent a negate effect for existing cards or make all responses counterspells. Responses can instead buff, call, remove, exhaust or alter a legal target.

A Sentry spends the physical card once at commitment, with only its remaining non-Energy cost. Its attack-stopping effect and printed bonus resolve as its link. If that link is negated by a future legal effect, payment remains spent and it does not stop the attack. Preserve the three Sentries' individual bonuses. Fix Bituon's missing consumption through the shared contract, as identified in Part E; do not let old scripts consume it twice.

Cancelling an attack stops later defense/check/damage steps for that attack. It does not erase committed links. Independent clauses still resolve; battle-specific clauses whose battle no longer exists follow their explicit policy. Charge, attacker removal, target removal, support changes and Personification must each revalidate the stored battle context after chains finish.

### C3.7 Timing permissions and response candidates

Build a typed timing policy, separate from skill colors and printed labels.

| Operation | Default chain policy |
|---|---|
| Normal call / relocation / ordinary Personify | Open action window only; not a response |
| Action card | Starts a chain in its existing legal Main window; not a general response |
| Manual Main skill | Starts a chain in its existing legal Main window; not a response unless explicitly designated |
| Earned ordinary triggered skill | Queued until the current chain finishes; owner then chooses it as Link 1 of a new chain |
| Explicitly designated response skill | May join only its legal current response opportunity; never infer this designation for an ordinary Last Oath |
| Force hand skill | A response only in its explicitly allowed timing; preserve current phase permissions in this release |
| Sentry | Response only for its legal Persona attack window, before ordinary defense/check resolution |
| Force revealed by a check | Check effect, not the Force's hand skill; use the check-specific activation policy |
| Continuous effect / replacement | Applies through its rule evaluator; no independent chain link |

Consequently, an opponent may have no legal response to a Main Phase Offer even with Force cards in hand, because current Force permissions do not allow them to play in the opponent's Main Phase. Auto-decline correctly, resolve the whole main chain, and THEN show the owner their queued Last Oaths. The new framework must not secretly broaden every Force's timing. Record any desired general-response redesign as a named, separately reviewed card-text change; it is not required for the chain engine to work.

Apply the final Energy-free play contract now: normal calls and Action cards alone use one play. Force hand skills, Sentries, other skills, special calls and relocation use zero. Do not charge an extra play for adding a link.

### C3.8 Resolution and deferred chains

- Lock a snapshot of link order when the current responder declines (or has no legal response). Resolve from highest link number to lowest with no response callbacks.
- Still allow the resolver's required chooser calls, including opponent-owned choices; these cannot activate other skills.
- Append newly earned trigger occurrences to a deferred pool with causal chain/link IDs. Do not resolve them through existing nested flush helpers.
- Complete all links, then open the pending-trigger selector for still-valid queued occurrences from costs and resolutions. Existing unused sibling triggers survive chain lock and are shown alongside newly earned ordinary triggers. Choosing one creates a fresh chain ID, starting at Link 1.
- Reevaluate continuous rules and win conditions at the engine's legitimate rule boundaries. If a match ends, stop remaining play and label remaining links as not resolved because the match ended. This is not an invitation to respond mid-chain.
- A visual failure must not change effect outcome. A rules failure must not be swallowed as a successful resolution; surface a recoverable error/abort path without awarding an invented winner.

## C4. Architecture and migration

### Current findings

| Location | Current behavior | Required change |
|---|---|---|
| `src/core/game.ts`: `runAbility` | Pays metadata Energy, marks uses, runs effect immediately, recursively flushes triggers | Separate activation commitment from resolver execution |
| `fireTrigger` / `pickTriggerToResolve` | One event's candidates; mandatory entry wins array-order selection | Record occurrences; unified priority chooser; mandatory owner ordering |
| `flushDamageTriggers` | Iterates Offered units individually | Preserve a whole payment batch and collect all listeners before priority |
| `src/cards/maguindanao-set-1.ts`: `payOffer` | Pays all selected units, then awaits `settle` before main effect | Payment preparation/commit only; never resolve triggers there |
| `EffectContext.settle` and local `settle` helpers | Resolve nested events between clauses | Collect/defer while a link resolves; presentation flush remains separate |
| `playForceFromHand`, Action branch, `resolveSentry` | Spend and execute immediately | Committed source-card consumption and delayed resolver |
| `openBattleWindow` | One player's ordered batch executes before other responses | One activation per priority decision; interleaved responses |
| `src/pvp/decisions.ts` | Single owned chooser continuation | Add typed priority choice and strict identity/revision validation |
| `src/pvp/session.ts` | Controller action stays busy while chooser runs | Keep this pattern; publish chain state while busy, allow only owned decisions |
| `src/ui/remote-presentation.ts` | Fixed-time effect cues, no authoritative chain model | Render server chain state with pace-controlled cues, not client resolution |
| `src/ui/settings.ts` refusal memory | Can suppress declined effects for a duel | Never let old remembered declines silently pass new chain opportunities |

### Proposed modules (names may be adjusted, responsibilities may not)

- `src/core/chain.ts`: pure chain transitions and invariants.
- `src/core/activation.ts`: preparation, cost plans, validation and commitment.
- `src/core/trigger-collection.ts`: event batches, occurrences, visibility and deduplication.
- `src/core/response-availability.ts`: one authoritative source for priority choices and reasons.
- `src/ui/chain-panel.ts`: read-only chain display plus explicit owned decision input.

Reuse `src/core/types.ts`, `events.ts`, `effects.ts`, `src/cards/types.ts`, the existing chooser transport and shared panel. Do not put the whole feature into `src/ui/main.ts` or create a client-only stack.

### Data contract

Keep chain state serializable. Store function identifiers, not resolver closures in GameState.

- Chain: ID, version/revision, phase (`building`, `resolving`, `complete`), window context, response owner, links, parent pending-window ID, resolution cursor and suspended action/attack context. No consecutive-pass counter.
- Pending-trigger window: separate ID, causal event/batch IDs, queued occurrences across sibling chains, current selection owner and completion state. Finishing one chain must not destroy this window or its unused occurrences.
- Link: ID, activation ordinal, owner, source UID/definition/entry identity, stable skill ID, declared targets/mode, paid-cost receipt, event snapshot, visibility policy, resolution policy, status and outcome.
- Trigger occurrence: ID, skill/source/owner, causal event/batch/link IDs, source-zone snapshot, occurrence ordinal, optionality, validity policy, owning window and status.
- Response decision: decision ID, chain ID, revision, owner and legal response candidate IDs. Decline locks the nonempty chain immediately. Answers name candidate IDs, not user-supplied card rules or array indexes alone.
- Pending-trigger decision: decision ID, pending-window ID, revision, owner, eligible occurrence IDs and permitted optional-decline actions. Choosing one starts a new chain; eligible mandatory occurrences prevent finishing this selector, not declining an unrelated response decision.
- Resolver context: immutable activation data plus current authoritative game state and access to resolution choices. Cost values that were paid are not recomputed or repaid.

Resolvers can still execute sequential instructions with `await` for required choices; semantic chain state and published snapshots must not depend only on the JavaScript call stack. Reconnect must restore an existing live decision. Full server-crash persistence remains outside scope.

### Event record

Add structured lifecycle events for window opened, trigger queued/selected/declined/invalidated, activation committed, response declined, chain locked, link resolving, link outcome, chain completed and pending-window completed. Record the reason for retiring an unavailable occurrence at pending-window completion; chain lock never expires unused sibling triggers. Include chain/link/pending-window IDs in existing cost/movement/outcome records. Deduplicate presentation by IDs.

Public events show declared activations, public targets and revealed payment only. Never serialize the opponent's unplayed response candidates, hand/deck identities, search pool, hidden trigger details or uncommitted cost draft. An activated hand card becomes public as required by the rule; that does not authorize exposing other hand cards.

### Adapter and rollout constraints

Old `run` functions can temporarily serve as resolvers only after their cost and nested-trigger behavior has been audited. A generic wrapper around every `run` is not a completed migration.

Use an internal test/rollout rules version while migrating. Never mix immediate and chained execution for the same occurrence, and never let two clients choose different rule modes in one room. All selectable cards, reachable tokens and granted skills must be classified before enabling the release broadly. Unavailable legacy cards stay unavailable; either migrate a reachable legacy path explicitly or keep it isolated under the old rules version for historical fixtures.

## C5. Card migration coverage

Create a machine-checkable manifest from the loaded catalogue and combined script registry, not just JSON art records. The embedded card audit recorded 141 selectable cards at this source snapshot; recompute rather than hardcode that count. Track every ability, Action, Force mode, Sentry, Codex rule and granted skill, including passive entries that do not start chains.

Required manifest fields: card/skill IDs, displayed name, kind, timing, mandatory/optional, trigger batch semantics, payment, activation targets, resolution choices, source persistence, target failure, State/usage rules, generated triggers, source file, migration status and focused test. Missing active entries must fail a coverage check. Full card text and runtime behavior must agree.

### Mindanao priority cases

| Card/group | Migration requirement |
|---|---|
| Sulayman, Indarapatra, Pah, Gurayn Offer-3 skills | Main link committed before responses; cost triggers queued together; original effect resolves after its response links but BEFORE the cost-generated Last Oaths |
| Potri Rainalaut, Tomitay, Kurita, Tarabusaw | Other Offer costs and before/after-attack timing; no recursive `settle` resolution |
| Maka-Ogis | Record offered Ally's Power at payment; add that stored value for the proper battle |
| Pahira | Queued post-chain Last Oath; top-five inspection and selection only on resolution; bottom order once |
| Lanao Sprite | Keep optionality, remove Energy, apply the specified per-copy use cap and retain opponent-turn expiry |
| Layla, Rinayung, Rinamuntaw, Old Woman, Datu Kali Adam, Datu Karim, Dayang Amina | Free Ally buff plus optional paid follow-up policy; do not charge the free bonus or invent a response between clauses |
| Salendagao | Correct multiple Offer occurrences, Garahana requirement and self exclusion; owner decides activation order |
| Crocodile-Form Apu | One first-Offer occurrence; Grave/source legality, revival and delayed end-turn Offer tied to the right field entry |
| Apo a Bekong | Optional Offer trigger versus mandatory shield-break increment; persistent bonus and ordered mandatory activation |
| Alad | Grave count is continuous bookkeeping, not a chain link |
| Mantapuli | Draw replacement preserves payment-before-draw and Garahana evaluation; Offer triggers defer until the atomic replacement completes |
| Mount Kabalalan and Offer-related Codex/granted skills | Capture event/once-per-turn usage; stop direct pre-dispatch mutation that actually performs an effect |
| Illana Bay | Continuous Grave weighting/State evaluation stays continuous; no fake selectable empty effect |
| Lake Lanao, Cape Timbalangan and remaining Codex | State/codex event causality, draw-discard atomicity, switch/replacement boundaries |
| Four Force hand skills and their check modes | Separate timing contracts; committed hand-card use, no duplicated check effect |
| Panglima Sabir | Sentry card consumption, attack cancellation at resolution, printed bonus and no generic defense eligibility |
| Actions and temporary granted effects | Play commitment once, targets vs resolution choices, delayed triggers and correct expiration |
| Hidden Omaka-an | Keep hidden; do not re-enable during migration |

Apply the same contracts to Visayas Essence/Vent/token creation, Amara's zone transition, on-placement chains, and Luzon Sipol/call chains. Validate compound multi-call effects: a placement trigger from the first call cannot resolve between calls inside the same resolving link. This timing change is intentional and must be documented and tested.

No claim is made that the new timing is already balanced. Recheck each region's ability to recover resources and use once-per-turn abilities after changing the resolution order, with Energy removal and the proposed caps already applied; do not claim a legacy-Energy test proves integrated balance.

## C6. Battle and phase integration

Inventory all actual controller boundaries before migration. Initial explicit contract:

1. Declare an attack and record its participants/supporters.
2. Collect ordinary on-attack/under-attack triggers and select them individually to seed chains. Use the battle's explicit response opportunities for legal Forces and the defender's Sentry; an ordinary queued trigger does not become a response candidate. Each committed activation gives the opponent a response opportunity; one decline resolves its full chain. Finish the pending-trigger window and required battle windows before defense. Declare and test the order of these non-chain battle windows against the existing attack flow; do not fabricate an attack link.
3. Revalidate the battle. If it still exists, ask for ordinary defense using Units and Forces only, subject to card restrictions. Actions and Sentries stay excluded.
4. Commit defense. No new general response window is introduced solely by defense placement in this first release; only an explicitly earned card trigger may open one.
5. Perform each attack check as an atomic reveal step. A Force check effect becomes a check-context mandatory link, with its correct Power target; only effects explicitly allowed in a check window may respond. Ordinary Force hand skills and Sentry cannot reopen their earlier battle window here.
6. Finish resulting chains before determining final Power/hit. Preserve additional-check and skipped-check rules.
7. Resolve the hit/defended result and any shield/check operation at its defined rule boundary. Collect earned triggers for the corresponding window; damage already applied cannot be retroactively stopped by the earlier Sentry response.
8. Handle attack-hit/miss/resolved triggers through the shared system. Repeat attacks begin a new attack/window.

Draw/Personify replacements and Codex switches need explicit entry/exit boundaries, not a chain insertion inside the replaced operation. Ordinary State-release triggers join the pending-trigger pool. True continuous State effects update promptly without creating a selectable skill.

Attack declaration is not a cancellable generic link. Do not allow a response to erase an attack cost unless a card's actual effect does so. Once a Sentry cancels the battle, already paid links remain committed; unactivated battle-only candidates become illegal.

## C7. Player interface

### Building

Use the existing compact board-visible panel. Header: `Your response` or `Waiting for opponent`. Subheading: latest activated card and a short accurate effect summary. Display the public chain horizontally with link numbers and a clear `Will resolve first` marker on the newest unresolved link.

Show only legal response cards in this decision. Show actual cards, source zone and relevant skill; a card with multiple eligible response skills has separately labeled options. Ordinary pending triggers may appear in a separate, noninteractive `After this chain` strip, visible only to their entitled owner. They cannot be selected here.

- Selecting opens a draft with required cost and target choices. Right-click/long-press only inspects.
- Confirmation: `Activate — add Link 3`, with its actual cost preview.
- Decline: `No response — resolve chain`. One click locks the current nonempty chain; no further response prompt is offered to its latest activator.
- In a separately defined empty battle window, use `Continue`; there is no chain to resolve yet.
- Mandatory ordinary pending effects do not disable the response-decline button.
- Declining affects this chain only, never the owner's queued triggers. Remove duel-long remembered declines from chain decisions. Do not preselect `Pass all`.
- Cancelling a draft restores the same priority state and existing selections without spending or passing.
- Use horizontal card browsing; search/filter controls only where useful for the existing large pile viewers. No vertical card-list takeover for three ready effects.
- Minimize leaves the board clear with no blur and a `Return to response` control. Keep a persistent priority indicator, keyboard focus and inspection access.
- Fit long names without resizing tiles. Keep action buttons reachable at 1280x720, 844x390 and 390x844; verify 320px fallback as well.

### Choosing the next triggered effect

After the complete chain, show `Choose your next triggered effect` with a horizontal row of eligible occurrences. Selecting one opens its activation draft, then starts a NEW chain as Link 1 on commitment. Multiple occurrences of the same skill retain unique IDs; a visual count is allowed, but each activation consumes one occurrence only. Remaining siblings stay queued through that chain.

Use distinct `Decline this effect` and `Skip remaining optional effects` actions. Neither may discard mandatory occurrences. Explain unavailable occurrences briefly and reevaluate after each sibling chain. Do not show normal turn-action controls until the pending window is complete. A mandatory trigger cannot be skipped here, but does not force a response during another chain.

### Resolving

Change the heading to `Resolving chain`. Disable activation controls. Highlight the active link/source, then declared targets, then the actual result. Show `Resolving Link 4 of 4`, then 3, 2, 1; never relabel the original activation order.

During required resolution choices, say `Choose for [skill name]` and retain the chain strip. Do not display response cards. Minimize/inspect do not pass, acknowledge or advance the engine.

Show new triggers as `Waiting for next chain`, visible only to entitled players. Preserve readable effects at all pace settings. `Finish animation` can finish presentation, never a choice or a link's rules.

Use the existing Last/timeline view for costs, activations, response declines, trigger selections, resolution order and outcomes. Keep narration concise; detail expands on inspection. No audio work in this pass.

## C8. PvP, AI and tutorial requirements

### Server

The Colyseus-hosted controller owns chain construction, response ownership, costs, targets, single-decline locking, resolution and the separate persistent pending-trigger window. Client-supplied choices are proposals validated against the owned pending decision and latest authoritative state.

Extend `DecisionGate`, `decisionCards`, `playerView`, MatchFrame and the client chooser together. Keep `busy` true for the controller action while permitting its owned response, pending-trigger and resolution decisions. Reject wrong-seat, stale, duplicate, fabricated and out-of-order answers without double payment or double activation. Reconnect to the live room must recover response ownership, chain, pending-trigger selector, unused sibling occurrences and any in-progress resolution choice with correct visibility.

Do not publish all legal responses to both players. Keep source UID masking intact for concealed cards. Do not leak trigger lists through logs, error messages or candidate counts. Public activated sources can be inspected legitimately.

Bump protocol/content version with the final rules release and enforce mismatch rejection. Synchronize the generated Chronicles server bundle using the existing tool. Test that Chronicles' original rooms still work. No server-restart persistence or new timer is claimed; existing reconnect grace and room limitations remain. Presentation speed must not determine response rights.

### AI

Add separate response and pending-trigger policies using legal candidates and public information. During a chain, choose a legal response or decline to lock. Afterward, choose a pending occurrence to start its own chain or explicitly decline optional occurrences. It must understand reverse order, immutable costs, per-turn usage and the difference between a queued trigger and a committed link. Provide deterministic simple policies first; no need for a new search engine. Never reveal an opponent's hand to choose a response.

Update all chooser implementations and fixtures; do not silently default an unimplemented AI method to accepting everything. Run seeded complete games across all region pairings and mirror matches. Record unusually long chains/turns for balance review rather than truncating them as successful resolution.

### Learning

Preserve First Battle's simple route and its checkpoints. Its prepared opponent may decline according to the lesson, but it must use the real chain rules. Add an advanced `Chains and responses` lesson after basic attack/defense: start a skill, opponent responds, player responds, opponent declines, watch 3/2/1 resolution. Add an Offer-3 exercise: opponent declines, main skill resolves first, then the owner chooses each Last Oath in a fresh chain. Demonstrate that unused Last Oaths survive earlier chains. Include a free-choice follow-up, not just a scripted click sequence.

Revise existing Offer/Vent/Force lesson prose that says nested triggers resolve immediately. Do not reset unrelated tutorial progress. Version only the changed lesson checkpoint data if needed.

## C10. Required verification matrix

| Area | Must prove |
|---|---|
| Owner's transcript | All three section 2 branches: main cost first; responses resolve LIFO; main resolves before cost-generated Last Oaths; each Last Oath starts a fresh chain |
| Response decline | One decline immediately locks; no self-chain after decline; no second pass required; empty battle windows close without resolving a nonexistent chain |
| Locked resolution | No new activation callback between links; only required effect choices; every deferred trigger waits for the whole chain |
| Costs | All-or-nothing Offer/Vent; correct weighted payment; no early effect refund; no double payment, cancel leak, RNG preview or use reset |
| Pending effects | Unused siblings survive chain locks; explicit optional decline; mandatory ordering only after chain; both owners; same-name copies, observer multiplicity, once-per-turn reservation and defined invalidation |
| Targets | Target removed or leaves/returns; source removed; partial clauses; no automatic retarget; search results hidden until resolution |
| Battle | Force/Sentry sequence, ordinary defender eligibility, cancelled attack, attack/Barrier checks, ties and repeated attacks |
| State | Garahana release during payment, Andukha changes from Vent, State-dependent activation and continuous recalculation |
| UI | Horizontal compact panel, reachable controls, long names, inspection, clear single-decline label, separate trigger selector, minimize without blur, resolution-choice distinction |
| Online | Authority, private candidates, stale/duplicate/wrong-seat messages, reconnect, mismatched version, two-speed clients |
| Compatibility | First Battle, Next Battle, challenges, all playable regions, hidden legacy cards remain hidden, Chronicles server regression |
| Long sequences | No silent depth cap dropping skills; deterministic loop diagnostics; no stuck waiting owner or stack overflow |

Run focused tests at each slice and `npm run build` at integration checkpoints. Finish with `npm test`, required shared-server checks, real-browser flows and two-client matches. Assertions must verify exact paid cards, trigger IDs, link order, outcomes and final zones/Power/counters. A test whose only assertion is 'the game did not crash' does not establish ordering.

Use development-only fixtures for rare negation/replacement cases when the live card pool lacks them; do not add test cards to selectable decks. Record actual physical-device testing separately from browser viewport emulation.

## C11. Risks and release gates

- Cost and effect are currently interleaved in many scripts. Shipping a UI-only chain would misrepresent what already happened; block release until activation is genuinely deferred.
- Existing nested `settle` calls must stop resolving triggers during a link. Failing to migrate one path can duplicate effects or break LIFO order.
- Reverse response order and post-chain trigger timing change strategic outcomes. The main skill may now call Allies before its cost-generated Last Oaths buff them; conversely, it cannot benefit from those Last Oaths before resolving. Explain and test these outcomes rather than secretly rearranging links.
- Negating the main effect does not undo its paid Offers or erase earned Last Oaths. They still enter the post-chain selector, subject to their actual source, State and activation requirements.
- Removing Energy in this same release increases response availability and loop risk. All release balance and loop tests must use the final integrated rules, including the proposed caps and reward replacements.
- Some cards currently have no legal opponent-Main response. The UI should auto-pass correctly, not manufacture permissions for the sake of showing a response modal.
- Prompt preferences, animations and offline hooks must not own rules priority. One source of truth is required for local and online games.
- All clients and the shared match server need the same chain/content version. Existing live rooms must finish on their original version or be handled with the existing announced maintenance process; do not reinterpret in-progress games after deployment.
- This remains the existing private-PvP architecture: room state does not survive a server restart. Do not market reconnect as restart recovery.

Release is complete only when the owner's Offer-3 flow, all active card classifications, locked resolution, hidden-information rules and local/online/tutorial paths are verified. No new music or broad visual redesign is part of acceptance.


---

## Part A — Complete card migration and regression appendix

Every entry inherits sections 1–4 and Parts E/C. “No additional Energy conversion” means no further numerical/cost change, NOT exemption from chain migration, use-ledger review or regression testing. Every ordinary triggered skill uses the post-chain queue; only explicitly designated responses can join a building chain. Existing timing must be classified from source and recorded in the manifest.

Current Energy-era card quotations were intentionally omitted from this handoff; IDs, type/level, behavior source, migration and card-specific verification remain. This avoids presenting old text as new rules. Exact new card text must be authored from the final implementation and verified against the loader.

PROPOSE/PROPOSED entries are the balance defaults identified in section 1. They are not claims of measured balance. Mandatory final integrated tests apply even to unchanged continuous effects and combo partners.

## Coverage

The runtime loader resolves **259 definitions**: **141 selectable cards** (66 Units, 30 Actions, 30 Codex, 12 Forces, 3 Sentries), **1 live non-deckbuilt Kaluluwa token**, and **117 other unavailable definitions**. Of the 141, **81 mention Energy** in their current text. Of the unavailable definitions, **29 mention Energy**. Energy-free combo partners are included, not omitted.

The source audit used `ALL_CARDS` after loader overlays. Historical rules quotations are omitted here to avoid mistaking old Energy wording for the target rules. Existing rules text sometimes omits an implementation cap; each affected Codex must have its text reconciled with its intended behavior. Card art is a separate verification task. Runtime IDs preserve old internal deck names for compatibility; player-facing regions remain Luzon, Visayas and Mindanao.

All change instructions mean: keep all unmentioned portions of that card. All Actions use 1 play; all normal calls use 1 play; all skill/special-call/Force-skill/Sentry paths use 0 plays. No Energy remains in new active rules.

## Luzon: 43 selectable cards

### L01. Sierra Watchkeeper, Banoy

- **ID:** `agta/sierra-watchkeeper-banoy`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/agta.ts`

**Migration:** Remove 1 Energy. Reveal and exile this Sentry face down exactly once, nullify the Persona attack, then Sipol 1 through the shared Sentry path.

**Verify:** One reveal consumes the card; Sipol uses its normal replacement rules; a second attack cannot reuse this UID.

### L02. Wind-Heart Rescuer, Taguwasi

- **ID:** `agta/set-1/wind-heart-rescuer-taguwasi`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove the attack skill’s 2 Energy; retain Bayanihan, Persona attack timing and once per turn. Retain the start-of-Main top-three ordering.

**Verify:** The attack skill is absent while Bayanihan is locked; free Sipol does not consume a play; top-deck preparation does not trigger twice.

### L03. Fifth-Sky Tyrant, Kalimangalnuk

- **ID:** `agta/set-1/fifth-sky-tyrant-kalimangalnuk`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 2 Energy from the once-per-turn Sipol skill. Keep the power of the actually called Unit and the separate Bayanihan team bonus.

**Verify:** No called Unit means no borrowed Power; repeated clicking or returning the same copy does not repeat the manual skill.

### L04. Life-Breath Mother, Nanolay

- **ID:** `agta/set-1/life-breath-mother-nanolay`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove both 2 Energy payments. Keep once-per-turn attack draw/+3000, and keep Discard 2, Bayanihan and special-called-during-Battle requirements for charged Personification.

**Verify:** Cannot Personify without both discards; old Persona moves correctly; same-copy and successive-copy lines are tested; draws/checks remain correctly ordered.

### L05. Fallen Sky-Challenger, Talimanog

- **ID:** `agta/set-1/fallen-sky-challenger-talimanog`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No direct cost change; preserve its already free Sumipat/Bayanihan replacement skill and existing usage limit.

**Verify:** Normal call versus special call eligibility and State-release replacement are tested; do not reintroduce its obsolete paid/restand description from old lessons.

### L06. Months-Of-Battle Warrior, Ammani

- **ID:** `agta/set-1/months-of-battle-warrior-ammani`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove internal 1 Energy payment and only its affordability predicate. Retain special-call condition, reveal/non-Unit handling and Bayanihan substitution.

**Verify:** Unit and non-Unit top cards take different paths; the replaced Bayanihan skill does not also perform the base skill.

### L07. Relentless Third Brother, Annibo

- **ID:** `agta/set-1/relentless-third-brother-annibo`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion. Keep Persona-attack timing, own movement to deck top and Bayanihan replacement.

**Verify:** Returning and recalling the same UID does not refresh its once-per-turn skill; no normal-play charge for effect movement.

### L08. River-Calling Sister, Alig

- **ID:** `agta/set-1/river-calling-sister-alig`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion. Keep +2000 for the eligible placed event, once per turn.

**Verify:** A special call from hand counts as an effect call and still creates its placed event without spending a play.

### L09. Maiden-Taking Raptor, Ammalabukkaw

- **ID:** `agta/set-1/maiden-taking-raptor-ammalabukkaw`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; preserve special-call Sipol and Bayanihan replacement.

**Verify:** Stress-test chains with free Tumatanan/Amuran; cap persists when the same copy is recycled.

### L10. Golden-Threshold Warden, Nagdombilan

- **ID:** `agta/set-1/golden-threshold-warden-nagdombilan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion. Keep the hand-to-top movement before Sipol and the replacement skill.

**Verify:** No free Sipol by cancelling the required hand selection; test empty hand and full field.

### L11. Wedding-War Chief, Namandiyanin

- **ID:** `agta/set-1/wedding-war-chief-namandiyanin`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove its internal 1 Energy fee; retain special-call Sumipat 3, once per turn, and Bayanihan substitution.

**Verify:** Look at three successive eligible cards rather than repeating one kept card; inspect results under both State conditions.

### L12. Moon-Bright Captive, Innawagan

- **ID:** `agta/set-1/moon-bright-captive-innawagan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 1 Energy; keep placed-from-hand timing, top-deck movement and once-per-turn/Bayanihan behavior.

**Verify:** Calling from another zone does not satisfy the base hand condition; no new use when the same card returns.

### L13. Barbed-Sky Messenger, Dalewasan

- **ID:** `agta/set-1/barbed-sky-messenger-dalewasan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 1 Energy; retain the once-per-turn placed skill and two distinct +2000 targets, or its Bayanihan substitute.

**Verify:** Cannot select the same Unit twice to mimic two targets; define partial target resolution consistently with the existing effect.

### L14. Keeper At Sunrise, Sinag

- **ID:** `agta/set-1/keeper-at-sunrise-sinag`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain discard-before-draw and once-per-turn placed-from-hand condition.

**Verify:** Cannot gain the draw after declining a required discard; no Energy or play is charged for the triggered skill.

### L15. Returning Sky Captain, Darawan

- **ID:** `agta/set-1/returning-sky-captain-darawan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain once-per-turn response to another Unit entering from deck and Bayanihan replacement.

**Verify:** Multiple free calls do not repeat the same copy’s once-per-turn bonus.

### L16. Wedding-Pact Elder, Amuray

- **ID:** `agta/set-1/wedding-pact-elder-amuray`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 1 Energy. Hand skill still puts this physical card on top of the deck, once per turn.

**Verify:** Works at zero plays; the card cannot remain in hand and on the deck simultaneously; same-turn recycling preserves its use.

### L17. Nightfall Raider, Kallan

- **ID:** `agta/set-1/nightfall-raider-kallan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; hand skill still discards itself then draws one, once per turn.

**Verify:** Do not consume a play; receiving the same physical copy again does not reset its skill.

### L18. Night-Feast Defender, Tamin

- **ID:** `agta/set-1/night-feast-defender-tamin`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 1 Energy; retain self-to-bottom payment and another Unit to deck top, or the Bayanihan replacement.

**Verify:** The base skill cannot resolve its benefit without the real movement cost; no reset after recall.

### L19. Fifth-Sky Sentinel, Ulagan

- **ID:** `agta/set-1/fifth-sky-sentinel-ulagan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; keep support timing, +3000 and Bayanihan replacement.

**Verify:** Relocation being free does not charge the Unit or reset attack/support use.

### L20. Path-Turning Warden, Tumatanan

- **ID:** `agta/set-1/path-turning-warden-tumatanan`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Sipol calls its eligible Unit during its resolving link; queue placement triggers until the full chain ends. An interrupted attack stops later battle stages, not already committed independent links. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L21. Beast-Spirit Healer, Subkal

- **ID:** `agta/set-1/beast-spirit-healer-subkal`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Draw then discard; does not give the +5000 check effect when played from hand. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L22. Healer's Spirit-Friend, Bunog

- **ID:** `agta/set-1/healer-s-spirit-friend-bunog`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Replace the hand skill “Gain 1 Energy” with “Choose one of your Units; it gets Power +3000 until end of turn.” Remove hand Energy/play charges; keep the distinct +5000 check effect.

**Verify:** Hand skill grants +3000, check grants +5000, neither grants both. Hand activation spends the Force into Grave.

### L23. Restless Wandering Dead, Belet

- **ID:** `agta/set-1/restless-wandering-dead-belet`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Top-card keep/bottom choice remains optional; no accidental card draw. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L24. Innawagan's Abduction

- **ID:** `agta/set-1/innawagan-s-abduction`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Only revealed Units can be called, into an open slot; bottom all unused cards in chosen order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L25. The Three Brothers Ascend

- **ID:** `agta/set-1/the-three-brothers-ascend`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Call at most two revealed Level 2-or-lower Units into separate open slots; evaluate early two-body advantage. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L26. Dalewasan Crosses The Barbed Sky

- **ID:** `agta/set-1/dalewasan-crosses-the-barbed-sky`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** This former 0-Energy Action still uses a play; retain top-card decision, draw then discard. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L27. Sinag Reveals The Rescuer

- **ID:** `agta/set-1/sinag-reveals-the-rescuer`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Reveal only a Level 3 from the actual top five; unused cards go to bottom once. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L28. Taguwasi Answers The Plea

- **ID:** `agta/set-1/taguwasi-answers-the-plea`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Check Bayanihan after Sipol resolves for the +5000 bonus, including the new Unit filling the fourth slot. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L29. Talimanog Falls As The Gate Breaks

- **ID:** `agta/set-1/talimanog-falls-as-the-gate-breaks`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Must bottom an Ally before the removal/Sipol benefit; only eligible opposing Level 2-or-lower Allies are removed. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L30. Taguwasi Tears Open Heaven

- **ID:** `agta/set-1/taguwasi-tears-open-heaven`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Open-slot call, called Unit +5000 and conditional Persona bonus are separate; no double spending of plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L31. Kalimangalnuk's Final Defeat

- **ID:** `agta/set-1/kalimangalnuk-s-final-defeat`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Bayanihan gate still controls activation; retain target and Persona bonus; test three copies across three plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L32. Alig Restores Her Brothers

- **ID:** `agta/set-1/alig-restores-her-brothers`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Recovery is to hand only, Level 2 or lower; any later normal call uses a separate play. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L33. The Wedding Becomes A Battlefield

- **ID:** `agta/set-1/the-wedding-becomes-a-battlefield`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Apply +3000 or +5000 as appropriate, expire at end of turn; test multiple copies stacking and First Battle damage math. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L34. Dawnward Country, Arawen

- **ID:** `agta/set-1/dawnward-country-arawen`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain draw replacement, top-three arrangement then Sipol.

**Verify:** No replacement on the first player’s skipped opening draw. Free skills must not cause an extra draw after the replacement.

### L35. Barbed Sky Passage, Salikan

- **ID:** `agta/set-1/barbed-sky-passage-salikan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain Personify replacement and candidate level.

**Verify:** No play consumed; previous Persona correctly enters Heart; unused revealed cards go to deck bottom.

### L36. Fifth Heaven, Ularan

- **ID:** `agta/set-1/fifth-heaven-ularan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 2 Energy. Retain Persona attack timing, existing open-zone eligibility and once-per-turn Codex gate; explicitly print that gate.

**Verify:** A Persona restand does not activate this Codex again in the same turn; test switch-on-attack order.

### L37. Brothers' Refuge, Taliman

- **ID:** `agta/set-1/brothers-refuge-taliman`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain non-Force Barrier condition, discard before Sipol, and existing Codex limit.

**Verify:** Still requires a real discard; Barrier checks showing Forces do not take this path.

### L38. Healing House, Aligan

- **ID:** `agta/set-1/healing-house-aligan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; preserve Main Phase Sipol replacement and exiling the unchosen card.

**Verify:** Test free Sipol sources, full field, State gain/loss and opponent-Battle Sipol that must not get this Main-only replacement.

### L39. Wedding Clearing, Amuran

- **ID:** `agta/set-1/wedding-clearing-amuran`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** PROPOSED BALANCE COST: replace 3 Energy with Discard 1 for Sipol 3 when this Codex becomes active, once per turn. Preserve switching conditions.

**Verify:** A genuine hand card is discarded before any Sipol; no activation with an empty hand; all three Sipol instructions finish inside the link; ordinary placement triggers are selected only after the full chain.

### L40. Golden Threshold, Nagdan

- **ID:** `agta/set-1/golden-threshold-nagdan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** Remove 3 Energy. Retain fewer Units than the opponent, start-of-Main timing and existing once-per-turn gate; explicitly print that gate.

**Verify:** No free comeback calls while tied/ahead; both Sipol instructions execute inside their link; ordinary placement triggers wait for the whole chain.

### L41. Heaven's Rift, Siwangan

- **ID:** `agta/set-1/heaven-s-rift-siwangan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain last-turn Sipol count threshold and attack-defense bonus.

**Verify:** Free Sipols increment the same counter; current-turn Sipols do not stand in for last-turn ones.

### L42. Mystic Sky River, Dalunan

- **ID:** `agta/set-1/mystic-sky-river-dalunan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; keep Main Phase Sipol-to-hand replacement.

**Verify:** Replacing a special call with a hand gain neither consumes a play nor fires an Ally placed trigger.

### L43. Storm Court, Kaliman

- **ID:** `agta/set-1/storm-court-kaliman`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`

**Migration:** No additional Energy conversion; retain conditional continuous +1000.

**Verify:** Power recalculates immediately when free effects fill or empty the fourth qualifying Ally Zone.

## Visayas: 47 selectable cards

### V01. Warden of the Twelfth Tide, Bituon

- **ID:** `babaylan/warden-of-the-twelfth-tide-bituon`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/babaylan.ts`

**Migration:** Remove the internal 3 Energy check/payment. Enforce reveal and face-down exile in the shared Sentry path. Nullify the attack, then create 1 Kaluluwa, or 2 if Andukha 9 held at activation.

**Verify:** Test below and at Andukha 9; bonus tokens do not retroactively improve the bonus. The same card never remains in hand to stop another attack.

### V02. Mountain Sovereign, Maria Cacao

- **ID:** `babaylan/set-1/mountain-sovereign-maria-cacao`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 1 Energy. Keep Essence top 2, Level 2-or-lower Divine Heart call, +5000 and end-turn Essence. Keep Andukha 6 token trigger once per turn.

**Verify:** Full cost paid before call; token creation does not recursively count as a Unit; delayed return follows the summoned field entry.

### V03. Harvest Warden, Mangaw

- **ID:** `babaylan/set-1/harvest-warden-mangaw`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove optional 1 Energy payment; instead ask whether to create 2 Kaluluwa after the top-card Essence, once at start of Main. Keep its Andukha scaling.

**Verify:** Top card and optional tokens count correctly toward Essenced-this-turn; no duplicate prompt for the same choice; test fast threshold growth.

### V04. Thunder Sovereign, Kaptan

- **ID:** `babaylan/set-1/thunder-sovereign-kaptan`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove attack skill’s 1 Energy; keep hand Essence, draw, +3000 and once per turn. Main Phase Andukha 9 top-five skill stays separate and once per turn.

**Verify:** Empty hand cannot pay hand Essence; the two skills keep independent usage; no second attack trigger after charging.

### V05. Ocean Sovereign, Maguayan

- **ID:** `babaylan/set-1/ocean-sovereign-maguayan`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 2 Energy from the Andukha attack skill. Keep Essencing an Ally and adding its current Power for that battle; preserve once-per-turn Heart-call draw/Essence.

**Verify:** Snapshot offered Power before removal; no permanent Power gain; free Heart calls trigger only the allowed number of draw effects.

### V06. Abyssal Revolt, Sinogo

- **ID:** `babaylan/set-1/abyssal-revolt-sinogo`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No direct Energy change. Keep Vent 5, Beast/Bird search, end-turn Essence and Andukha 12 numeric discount.

**Verify:** Discount checks correctly, minimum zero remains, Vent-this-card identity costs are not waived, and used skill survives returning to Heart.

### V07. Last Moon Devourer, Bakunawa

- **ID:** `babaylan/set-1/last-moon-devourer-bakunawa`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 2 Energy, retain Vent 6, Persona target, once-per-turn attack skill, +10000 and Level 2+ Unit defense restriction. Keep six actual Kaluluwa draw and missed-attack Grave Essence.

**Verify:** Select all Vent cards once; resolve the parent response chain first, then choose each Vented trigger to start its own chain. Discounted payment of fewer than six tokens does not earn draw; Sentry response remains legal.

### V08. Unbroken Invocation, Amara

- **ID:** `babaylan/set-1/unbroken-invocation-amara`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 1 Energy from Heart activation; keep Andukha 9, Vent this card, subtype/level exclusions, special call and +5000. Keep its Persona-Essence trigger.

**Verify:** Same copy cannot return to Heart and reuse the skill that turn; cannot skip Vent-this-card under Sinogo; separate abilities retain separate use.

### V09. Heaven's Pursuit, Dalagan

- **ID:** `babaylan/set-1/heaven-s-pursuit-dalagan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep placed top-card Essence plus one Kaluluwa.

**Verify:** Test repeated placement through the newly free engine; every event has an actual placement and no duplicated token/Essence event.

### V10. Unyielding Pursuer, Guidala

- **ID:** `babaylan/set-1/unyielding-pursuer-guidala`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove optional 1 Energy. PROPOSE: optional hand special-call follow-up once per turn per physical copy; keep the base placed Essence event-based and preserve both end-turn returns.

**Verify:** Cannot repeat its free call by recycling the same copy; source/called Unit moving elsewhere invalidates only the matching old field-entry return.

### V11. Unseen Defender, Tata Cero

- **ID:** `babaylan/set-1/unseen-defender-tata-cero`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 2 Energy. PROPOSE: the Kaluluwa-scaled attack bonus once per turn per physical copy; bonus lasts for that battle.

**Verify:** Snapshot the current token count; a second attack or re-entry cannot stack another activation that turn.

### V12. Leafborne Champion, Kapitan Dyano

- **ID:** `babaylan/set-1/leafborne-champion-kapitan-dyano`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep placed +3000 until end of turn.

**Verify:** Placement is required; no stale Power carried through Heart re-entry; test interaction with newly free call effects.

### V13. Spring Sentinel, Ulango

- **ID:** `babaylan/set-1/spring-sentinel-ulango`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain draw 1 on actual Vent, initially without a new turn cap.

**Verify:** Moving Heart→Grave for a reason other than Vent does not trigger this; repeated legal recycling must not create an unbounded resource-positive loop.

### V14. Shadow Prowler, Sagwil

- **ID:** `babaylan/set-1/shadow-prowler-sagwil`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain opposing Ally damage when actually Vented.

**Verify:** Chosen resolution order matters; destroyed/removed targets are revalidated; repeated Heart refill is stress-tested.

### V15. Nightfall Hunter, Wakira

- **ID:** `babaylan/set-1/nightfall-hunter-wakira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain up to two distinct Units +3000 when actually Vented.

**Verify:** Two targets can be chosen in one selection; cannot double-select a UID; one Vent batch emits one event containing this card.

### V16. Reef Enchanter, Lawira

- **ID:** `babaylan/set-1/reef-enchanter-lawira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; end-of-your-turn Essence remains mandatory and Ally-only.

**Verify:** Must happen even if optional-skill prompts are declined; does not affect a different field entry or a card already removed.

### V17. Answering Voice, Aday

- **ID:** `babaylan/set-1/answering-voice-aday`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep Ally-only continuous Power per Essenced card this turn.

**Verify:** Recalculates for free token creation and multi-card Essence; resets at the right turn boundary; tokens versus Unit-only triggers stay distinct.

### V18. First Invocation, Luning

- **ID:** `babaylan/set-1/first-invocation-luning`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 1 Energy. PROPOSE: one additional Kaluluwa per qualifying creation event, once per turn across all cards with this name per player. Keep bonus-creation recursion suppression.

**Verify:** Creating 2 becomes 3, not 4; three copies do not add three extras; a bonus token never triggers this skill again.

### V19. Spirit Mediator, Iday

- **ID:** `babaylan/set-1/spirit-mediator-iday`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 1 Energy; keep Essence this card from Hand/Ally and +5000 to a valid Unit. PROPOSE once per turn per physical copy.

**Verify:** Cannot buff itself after it leaves the field; a recalled copy cannot loop the same skill; no normal-play charge.

### V20. Hidden Affliction, Doro

- **ID:** `babaylan/set-1/hidden-affliction-doro`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove 1 Energy. Keep once-per-turn +5000 and end-turn Essence of self plus another Ally/hand card.

**Verify:** The end-turn obligation is not optional; handle no remaining companion under documented existing partial-resolution rules; recalled Doro does not reset its use.

### V21. Floodwatch Runner, Sali

- **ID:** `babaylan/set-1/floodwatch-runner-sali`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove optional 1 Energy. PROPOSE: gain +5000 on Vent once per turn per physical copy, until end of turn.

**Verify:** One six-card Vent gives one activation, not six; another Vent or re-entry in the same turn cannot add another +5000.

### V22. Promise Bearer, Nardo

- **ID:** `babaylan/set-1/promise-bearer-nardo`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove optional 1 Energy; keep optional draw on the first Essence event of the turn, Ally-only.

**Verify:** Entering after the first Essence does not create a second first event; multi-card Essence does not draw once per card.

### V23. Small Deliverer, Silak

- **ID:** `babaylan/set-1/small-deliverer-silak`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep actual Vent-triggered draw then hand Essence.

**Verify:** Draw resolves before hand choice; the newly drawn card can be chosen; recycling/threshold changes do not duplicate the trigger.

### V24. Field Blessing, Banira

- **ID:** `babaylan/set-1/field-blessing-banira`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Top-card Essence updates Heart, threshold and eligible triggers once. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V25. Quiet Crossing, Salumi

- **ID:** `babaylan/set-1/quiet-crossing-salumi`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Still requires Vent 1 before drawing; selecting no cost card gives no draw; order its Vent triggers normally. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V26. Kindly Neighbor, Silaya

- **ID:** `babaylan/set-1/kindly-neighbor-silaya`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Draw first, then choose a card in the resulting hand to Essence. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V27. Hidden Passage, Kawili

- **ID:** `babaylan/set-1/hidden-passage-kawili`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Only Level 1 Heart Units; requires an open Ally Zone; enters exhausted, not charged. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V28. The Elders Answer

- **ID:** `babaylan/set-1/the-elders-answer`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Choose an eligible Unit among actual top three to Essence; bottom the others in order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V29. A Promise Broken

- **ID:** `babaylan/set-1/a-promise-broken`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain mandatory Vent 2; pay before drawing 2/discarding 1; only one play. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V30. The Mountain Withdraws

- **ID:** `babaylan/set-1/the-mountain-withdraws`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain Ally Essence; call a different equal-or-lower-Level Heart Unit and apply +5000; cannot call the sacrificed card as the different target. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V31. Flight of the Faithless

- **ID:** `babaylan/set-1/flight-of-the-faithless`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain Vent 1, open slot, Beast/Bird call, +5000 and end-turn Essence obligation. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V32. Thunder Beneath the Waves

- **ID:** `babaylan/set-1/thunder-beneath-the-waves`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain Vent 3; check Andukha 12 at resolution after payment/triggers; choose distinct opposing targets. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V33. When Lantoy Wept

- **ID:** `babaylan/set-1/when-lantoy-wept`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Essence up to two Grave Units, then Vent 1 with correct timing; do not mislabel the later Vent as an upfront requirement that blocks an empty-Heart setup. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V34. The River Rises

- **ID:** `babaylan/set-1/the-river-rises`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Essence top two first; then use the resulting Andukha state for team Power. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V35. Six Moons Lost

- **ID:** `babaylan/set-1/six-moons-lost`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Vent 6 paid in one selection; only exhausted opposing Allies returned; bonus uses actual Kaluluwa paid, not nominal printed cost. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V36. Return Our Moon

- **ID:** `babaylan/set-1/return-our-moon`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Remove obsolete Energy gain: after recovering a Divine Unit, you may Essence the top card of the deck. Keep Beast/Bird draw then discard. Costs 1 play.

**Verify:** Verify Divine, Beast/Bird and neither branches, empty deck handling, and a dual-subtype card if legal; only one play spent.

### V37. The Covenant Renewed

- **ID:** `babaylan/set-1/the-covenant-renewed`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Essence up to two Grave Units, then evaluate Andukha 12 for Persona +10000; test repeated copies under 3 starting plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V38. Sovereign Heights, Mount Lantoy

- **ID:** `babaylan/set-1/sovereign-heights-mount-lantoy`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain +1000 on State release and current Codex usage gate; make the printed limit explicit.

**Verify:** Dropping below and re-reaching Andukha through free Vent/Essence cannot evade its actual use cap.

### V39. Silent Threshold, Kabulaw

- **ID:** `babaylan/set-1/silent-threshold-kabulaw`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain Personify replacement.

**Verify:** No Energy/play cost; excluded low-level cards stay excluded; unused cards return to deck bottom correctly.

### V40. Unseen Passage, Argao River

- **ID:** `babaylan/set-1/unseen-passage-argao-river`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep any-number Heart selection with draw floor(actual Vented / 5).

**Verify:** One multi-select and confirmation; 0/4/5/9/10 cards give 0/0/1/1/2 draws; vented-card trigger ordering preserved.

### V41. Fields Under Watch, Tabayag

- **ID:** `babaylan/set-1/fields-under-watch-tabayag`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain start-of-Main Essence and token only when the card is a Unit.

**Verify:** Token/card gain and State changes settle once; no extra trigger from the created token itself.

### V42. Living Sanctuary, Dingayop Spring

- **ID:** `babaylan/set-1/living-sanctuary-dingayop-spring`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain non-Force Barrier trigger, two tokens and discard.

**Verify:** Required hand availability/discard remains; token creation is not a reason to skip the discard.

### V43. Hidden Court, Dingayop Cavern

- **ID:** `babaylan/set-1/hidden-court-dingayop-cavern`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No direct cost change; retain Main Phase Unit-from-field/deck Essence response.

**Verify:** Token Essence and hand/Grave Essence do not satisfy this Unit/source filter; test with free Luning and Dalagan without runaway recursion.

### V44. Champion's Trial, Danao Highlands

- **ID:** `babaylan/set-1/champion-s-trial-danao-highlands`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; preserve attack scaling and mandatory end-turn Vent 3 debt.

**Verify:** Charging the Persona and repeated attacks do not erase debt; changing Codex before end of turn cannot escape it.

### V45. Turning Pursuit, Bantayan Waters

- **ID:** `babaylan/set-1/turning-pursuit-bantayan-waters`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain its once-per-turn preparation for the next Persona attack.

**Verify:** The just-broken Barrier does not incorrectly guard the already resolved attack; queued defense survives only its intended duration.

### V46. Faithless Prison, Tañon Strait

- **ID:** `babaylan/set-1/faithless-prison-tanon-strait`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; retain Vent 2 followed by call/exile selection under current eligibility.

**Verify:** Selected Vented Units are real objects after their triggers; tokens cannot illegally become Units; no Energy/play charge.

### V47. Great Calling, Moonwake Shore

- **ID:** `babaylan/set-1/great-calling-moonwake-shore`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`

**Migration:** No additional Energy conversion; keep draw replacement and the post-token Andukha check for the conditional draw.

**Verify:** Skipped opening draw cannot trigger replacement; Luning does not recurse; released/lost Andukha conditions use current state.

## Mindanao: 51 selectable cards

### M01. Kuta Wato Oath-shield, Panglima Sabir

- **ID:** `maguindanao/kuta-wato-oath-shield-panglima-sabir`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/maguindanao.ts`

**Migration:** Remove 1 Energy. Reveal and exile this Sentry face down exactly once and nullify the Persona attack.

**Verify:** Works without an Energy field and on the opponent turn; cannot defend an Ally or be reused.

### M02. Nonok-Veiled Guardian, Apo a Bekong

- **ID:** `maguindanao/set-1/nonok-veiled-guardian-apo-a-bekong`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; preserve once-per-turn offered-Ally buff and automatic permanent +1000 per shield broken while Garahana applies.

**Verify:** Not an activation that multiplies all prior broken shields; faster Offer engines do not repeat the capped buff.

### M03. Beneath-Water Ancestress, Potri Rainalaut

- **ID:** `maguindanao/set-1/beneath-water-ancestress-potri-rainalaut`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove both 1 Energy fees. Keep Offer 1 for charged Level 1 subtype revival; keep separate once-per-turn Garahana draw/+2000-per-Offered-Unit skill.

**Verify:** May revive the qualifying just-Offered Unit under existing rules; each skill has its own use; counts actual offered Units as defined by the engine.

### M04. Boat-Watching Tonong, Tomitay

- **ID:** `maguindanao/set-1/boat-watching-tonong-tomitay`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove 1 Energy from attack ordering skill. Keep Offer 1, once-per-turn top-three ordering, and Garahana Force-check draw/charge.

**Verify:** Chosen top order determines check; Force skill from hand does not pretend to be an attack-check reveal.

### M05. Sun-Darkening Scourge, Pah

- **ID:** `maguindanao/set-1/sun-darkening-scourge-pah`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion. Keep Offer 2 buff, low-shield condition and Offer 3 restand once per turn.

**Verify:** Free refills cannot reset a physical copy’s restand; multiple same-name copies get only their explicitly allowed independent uses.

### M06. Rattan-Haunt Scourge, Kurita

- **ID:** `maguindanao/set-1/rattan-haunt-scourge-kurita`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion. Keep separate Offer 1 attack and after-attack skills with Garahana on the latter.

**Verify:** Pay separate Offers, validate enemy Allies and preserve Power duration; no trigger if the original attack was invalidated.

### M07. Matutun Branch-Devourer, Tarabusaw

- **ID:** `maguindanao/set-1/matutun-branch-devourer-tarabusaw`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion. Keep Offer 2 before first attack for extra check and Offer 2 after attack for charge/no-next-check.

**Verify:** No double extra check after a restand or a zone trip; the next attack really skips its check.

### M08. Land-Restoring Raja, Indarapatra

- **ID:** `maguindanao/set-1/land-restoring-raja-indarapatra`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove 1 Energy from initial search/call, once per turn. Keep Level 2-or-lower subtype filter and charged entry. Keep Offer 3 after-attack two calls/+5000.

**Verify:** Initial free tutor is not unlimited; full-field overwrite respects current rules; calls do not spend plays.

### M09. Gurayen Wrath-Mate, Maka-Ogis

- **ID:** `maguindanao/set-1/gurayen-wrath-mate-maka-ogis`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain Offer 1 and add the Ally’s current Power, plus its separate Garahana continuous bonus.

**Verify:** Capture Power before the cost clears modifiers; do not replace base Power or keep the battle-only gain permanently.

### M10. Three-Scourge Champion, Sulayman

- **ID:** `maguindanao/set-1/three-scourge-champion-sulayman`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain Offer 1 subtype call/shared +3000 and Offer 3 battle removal/+10000/on-hit draw.

**Verify:** Free Last Oath refills cannot pay the original Offer retroactively; draw occurs only when that attack hits; unrelated attacks do not inherit it.

### M11. House-Shell Shadow, Pahira

- **ID:** `maguindanao/set-1/house-shell-shadow-pahira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion initially: Offered top-five Beast/Bird search stays event-based.

**Verify:** Search only among revealed cards and bottom the rest once; stress-test repeated revival and Offer because other follow-ups are now free.

### M12. Rattan-Marsh Stalker, Kuritan

- **ID:** `maguindanao/set-1/rattan-marsh-stalker-kuritan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain offered-this-turn placed Power and mandatory end-turn Offer.

**Verify:** Costs and normal overwrite are not confused with Offer; mandatory Offer still triggers legal Last Oaths in sequence.

### M13. Matutun Branch Hurler, Tarabuk

- **ID:** `maguindanao/set-1/matutun-branch-hurler-tarabuk`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain once-per-turn after-attack Offer/restand/+3000.

**Verify:** Repeated free revival must not reset this physical copy’s usage; offered ally is genuinely another Ally.

### M14. Dread-Night Caller, Balbal

- **ID:** `maguindanao/set-1/dread-night-caller-balbal`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove 1 Energy. PROPOSE once per turn per physical copy for placed mill 3/+3000 per Unit milled.

**Verify:** Mills happen before Power calculation and Garahana checks; smaller remaining decks counted accurately; no repeat through same-turn revival.

### M15. Balete-Laughing Spirit, Ba-i a Salendagao

- **ID:** `maguindanao/set-1/balete-laughing-spirit-ba-i-a-salendagao`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion initially; preserve Garahana +5000 per another Ally Offered. High-risk indirect buff from free Last Oath engines.

**Verify:** Multiple Offers cause the correct number of distinct triggers; no trigger for itself; Mountain Tunung charge and persistent usage are tested; record peak Power.

### M16. Heaven-Sheltered Survivor, Lanao Sprite

- **ID:** `maguindanao/set-1/heaven-sheltered-survivor-lanao-sprite`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove 1 Energy. PROPOSE its offered Persona +2000 once per turn per physical copy; preserve end-of-opponent-turn expiry.

**Verify:** Same UID cannot be recycled for unlimited shields of Power; different copies work independently and expire on the correct turn.

### M17. Current-Borne Ancestor, Crocodile-Form Apu

- **ID:** `maguindanao/set-1/current-borne-ancestor-crocodile-form-apu`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion. Preserve first Offer event, Grave scope, Garahana, charged special call and end-of-your-turn Offer.

**Verify:** An Apu sent to Grave after the first Offer does not retroactively qualify; multiple copies and opponent-turn activation keep correct delayed expiry.

### M18. Smoke-Split Hunter, Salimbadut

- **ID:** `maguindanao/set-1/smoke-split-hunter-salimbadut`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain once-per-turn after-attack removal and mandatory end-turn Offer.

**Verify:** Opponent target must already be exhausted as required; no reset after revival; finish the mandatory Offer.

### M19. First Son of the Returned Land, Rinamuntaw

- **ID:** `maguindanao/set-1/first-son-of-the-returned-land-rinamuntaw`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy from draw 1 then discard 1. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verify:** Draw precedes discard; empty-deck behavior follows core rules. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M20. First Daughter of the Returned Land, Rinayung

- **ID:** `maguindanao/set-1/first-daughter-of-the-returned-land-rinayung`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy. PROPOSE: charged Level 1 Maguindanaon tutor follow-up once per turn across all cards named Rinayung per player. Keep base offered Ally +3000 event-based.

**Verify:** Fresh copies cannot chain their free tutors that turn; subtype and Level 1 restriction still apply; base bonus can resolve even after the follow-up was used.

### M21. Hollow-Tree Guide, the Old Woman

- **ID:** `maguindanao/set-1/hollow-tree-guide-the-old-woman`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy from top-five Maguindanaon Unit search. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verify:** Reject Beast/Bird-only Units without the required subtype; bottom remaining cards in one ordered confirmation. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M22. Last Witness of the Old Words, Alad

- **ID:** `maguindanao/set-1/last-witness-of-the-old-words-alad`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain double Grave count only in the intended counting rules.

**Verify:** Removing Energy does not make one physical card pay a two-card selection cost unless the separate Offer/selection rule explicitly assigns weight.

### M23. Elder of the Old Telling, Maharaja Layla

- **ID:** `maguindanao/set-1/elder-of-the-old-telling-maharaja-layla`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy from mill the top card. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verify:** Actual mill occurs before Garahana re-evaluation; no free repeated mill after a same-turn revival. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M24. Voice Beneath the Current, Water Tunung

- **ID:** `maguindanao/set-1/voice-beneath-the-current-water-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Recover only Level 1 Maguindanaon subtype Unit from Grave; re-evaluate Garahana after removal. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M25. Prayer Above the Storm, Sky Tunung

- **ID:** `maguindanao/set-1/prayer-above-the-storm-sky-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Draw then discard; preserve public/private reveal boundaries. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M26. Keeper of the Account, Datu Kali Adam

- **ID:** `maguindanao/set-1/keeper-of-the-account-datu-kali-adam`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy from give another Unit +3000. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verify:** Use correct target pool and expiry; distinguish base Ally +3000 from follow-up Unit +3000. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M27. Warden Within the Ridge, Mountain Tunung

- **ID:** `maguindanao/set-1/warden-within-the-ridge-mountain-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Charge an eligible Ally during a Persona attack and keep it charged after the attack ends; do not illegally charge the Persona. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M28. Listener Among the Roots, Tree Tunung

- **ID:** `maguindanao/set-1/listener-among-the-roots-tree-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verify:** Mill up to the available top two and update continuous Garahana during resolution; no response opens between links, and earned ordinary triggers wait until the whole chain finishes. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M29. The Four Scourges Came

- **ID:** `maguindanao/set-1/the-four-scourges-came`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Call at most one small Beast and one small Bird from Grave; no duplicate UID for both; preserve end-turn Offer for each. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M30. A Vow Carried by the Wind

- **ID:** `maguindanao/set-1/a-vow-carried-by-the-wind`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Tutor only a Level 1 Maguindanaon, charged; preserve end-turn Offer even after spending all plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M31. Kabalalan Shook From Below

- **ID:** `maguindanao/set-1/kabalalan-shook-from-below`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain Offer 1; conditional damage can target only one that was already exhausted before the Action’s effect. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M32. Until Tarabusaw Tired

- **ID:** `maguindanao/set-1/until-tarabusaw-tired`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Granted repeat attack still needs Offer 1 of another Ally; the grant is not an unlimited restand and does not stack into infinite uses. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M33. The Price of the Third Victory

- **ID:** `maguindanao/set-1/the-price-of-the-third-victory`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove 1 Energy cost. Replace Garahana Energy refund with Persona +3000 until end of turn. Keep Offered 3+ requirement and draw 2 then discard 1; costs 1 play.

**Verify:** Reward reads Garahana at its defined resolution point; no extra draw/refund; remaining plays decrease exactly once.

### M34. Day Became Night

- **ID:** `maguindanao/set-1/day-became-night`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Offered 3+ condition chooses the upgraded line; resolve exhaust-before-damage in chosen legal order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M35. When the Life-Sign Withered

- **ID:** `maguindanao/set-1/when-the-life-sign-withered`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain Offer 1; opponent chooses their casualty; draw instead only if no opposing Allies. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M36. The Brother Awakened

- **ID:** `maguindanao/set-1/the-brother-awakened`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Choose the intended brother and sister from deck/Grave without duplicate UIDs, charge them and attach end-turn Offer; test shared Last Oath follow-up limits. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M37. Seven Heads Before One King

- **ID:** `maguindanao/set-1/seven-heads-before-one-king`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Retain capped Grave-scaled attack bonus and seven-subtype-card removal threshold; extra attacks and repeated Actions do not bypass printed limits. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M38. The Lowlands Rose Again

- **ID:** `maguindanao/set-1/the-lowlands-rose-again`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verify:** Two distinct eligible Level 1 subtype Units; one to hand, other to bottom; choosing only one returns it to hand. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M39. Spring-Veiled Heiress, Dayang Amina

- **ID:** `maguindanao/set-1/spring-veiled-heiress-dayang-amina`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy from damage one opposing Ally Unit. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verify:** Follow-up requires a legal opposing Ally; cannot repeatedly clear a field by recycling one copy. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M40. Seven-Sight Final Scourge, Gurayn

- **ID:** `maguindanao/set-1/seven-sight-final-scourge-gurayn`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion initially; preserve Offer 2 top-seven Beast/Bird calls and Offer 3 charged same-name Personification with existing per-copy limits.

**Verify:** Test successive physical Gurayn copies plus free refills, actual remaining hand/deck resources and extra checks. A reproducible resource-positive repeat blocks release.

### M41. Keeper of the Last Refuge, Datu Karim

- **ID:** `maguindanao/set-1/keeper-of-the-last-refuge-datu-karim`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** Remove optional 1 Energy. PROPOSE: same-name charged tutor follow-up once per turn across all Datu Karim cards per player. Keep base offered Ally +3000 event-based.

**Verify:** Offer first copy→call second→Offer second cannot tutor a third using that same follow-up that turn; second copy can still give its base bonus.

### M42. City Beyond the Sunset, Mantapuli

- **ID:** `maguindanao/set-1/city-beyond-the-sunset-mantapuli`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain Offer-or-mill before checking Garahana for its replacement draw.

**Verify:** Opening skipped draw does not invoke this. If cost supplies the fifth qualifying Grave count, draw happens second and exactly once.

### M43. Forest of Broken Branches, Mount Matutun

- **ID:** `maguindanao/set-1/forest-of-broken-branches-mount-matutun`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain once-gated Main Phase mill and +5000 if Unit. Make actual usage gate explicit in displayed text.

**Verify:** Mill reveals a real Unit before Power is granted; no duplicate trigger at State release.

### M44. Throne of the Sun-Shadow, Mount Bita

- **ID:** `maguindanao/set-1/throne-of-the-sun-shadow-mount-bita`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; keep existing once-per-turn gate and +3000 per Offered card/Unit under current counting semantics. Print the actual gate.

**Verify:** Free Last Oath refills increase Offer opportunities but cannot refire a used Codex skill; compare displayed Offer count to actual engine value.

### M45. The Rattan Haunt, Mount Kabalalan

- **ID:** `maguindanao/set-1/the-rattan-haunt-mount-kabalalan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No direct cost change; retain its existing once-per-turn engine gate and print it explicitly. Do not interpret “whenever” as unlimited free replacement calls.

**Verify:** Multiple Offers yield one Codex tutor that turn; different cards with the same name still use correct target identity; switching away/back does not reset use.

### M46. Peak of Seven Sights, Mount Gurayn

- **ID:** `maguindanao/set-1/peak-of-seven-sights-mount-gurayn`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain Personify replacement and Level 3 candidate requirement.

**Verify:** No play consumed; valid current Persona level and all unused-card destinations maintained.

### M47. Mirror of the Giant War, Lake Lanao

- **ID:** `maguindanao/set-1/mirror-of-the-giant-war-lake-lanao`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain existing once-per-turn State-release team bonus and print its cap.

**Verify:** Repeated free Grave removal/refill cannot repeatedly gain the bonus in one turn.

### M48. Reach of the Ridge Giants, Illana Bay

- **ID:** `maguindanao/set-1/reach-of-the-ridge-giants-illana-bay`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain Main-Phase-Offered Grave counting while this Codex is active.

**Verify:** Leaving Grave or changing active Codex updates Garahana correctly; do not double the physical cards paid to a cost.

### M49. Cave Beneath the Earth, the Last Refuge

- **ID:** `maguindanao/set-1/cave-beneath-the-earth-the-last-refuge`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; keep existing gated Barrier-break Power scaling and expiry; make actual cap explicit.

**Verify:** Check two shield breaks in one turn and a different opponent turn; no accidental permanent bonus.

### M50. The Sea-Withdrawn Lowlands, Restored Magindanao

- **ID:** `maguindanao/set-1/the-sea-withdrawn-lowlands-restored-magindanao`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; retain existing non-Force Barrier condition, special call then discard and actual Codex cap.

**Verify:** Bonus call is not a normal play; discard still occurs and legal no-target/empty-hand behavior remains defined.

### M51. Shore of the Broken Hills, Cape Timbalangan

- **ID:** `maguindanao/set-1/shore-of-the-broken-hills-cape-timbalangan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`

**Migration:** No additional Energy conversion; keep active-entry draw 2/discard 1 and current once gate.

**Verify:** Cannot switch away/back to repeat; no Energy or normal-play fee for Codex activation.

## Live non-selectable token

### Kaluluwa

ID: `babaylan/kaluluwa`. Keep non-deckbuildable. Preserve creation into Heart, token disappearance rules on Vent, Andukha/Essence counting and the distinction between a Token and a Unit. No Energy replacement is needed. Verify Luning recursion suppression, Bakunawa actual-token payment count, and that destroyed/Vented tokens do not become reusable ordinary Grave Units.

## All other unavailable definitions

These 117 definitions remain unavailable. Do not spend this release redesigning or re-enabling them. For each ID, the disposition is: retain archival data; exclude from new live matches and deck selection; audit any remaining fixture/import path before removing shared Energy types. Do not turn old payments into free effects through a global helper stub. The three active Sentries are listed above, not here. Omaka-an remains intentionally hidden.

Energy flags refer to current loaded text, not exhaustive script arithmetic. Old scripts may differ from that text. Any legacy fixture deliberately retained must use an explicit historical rules boundary; migrate active regression coverage to Set 1.

| Card | Runtime ID | Type | Text mentions Energy | Disposition |
|---|---|---|---|---|
| Arrow of the Sierra, Amihan | `agta/arrow-of-the-sierra-amihan` | Unit | Yes | Keep unavailable; historical only |
| Deerstep Runner, Kidlat | `agta/deerstep-runner-kidlat` | Unit | No | Keep unavailable; historical only |
| Ember-Pot Bearer, Berto | `agta/ember-pot-bearer-berto` | Unit | No | Keep unavailable; historical only |
| Ember Resin Grandmonther, Sinta | `agta/ember-resin-grandmother-sinta` | Unit | Yes | Keep unavailable; historical only |
| Firefly Pathkeeper, Aya | `agta/firefly-pathkeeper-aya` | Unit | No | Keep unavailable; historical only |
| Golden HiveHeart, Pulot | `agta/golden-hiveheart-pulot` | Force | No | Keep unavailable; historical only |
| Hidden Path | `agta/hidden-path` | Codex | No | Keep unavailable; historical only |
| Honey Keep Cliffer, Kislap | `agta/honey-keep-cliffer-kislap` | Unit | No | Keep unavailable; historical only |
| Leaf Whistle Scout, Sari | `agta/leaf-whistle-scout-sari` | Unit | No | Keep unavailable; historical only |
| Listening Canopy | `agta/listening-canopy` | Codex | Yes | Keep unavailable; historical only |
| Mangrove Maw, Lunod | `agta/mangrove-maw-lunod` | Force | No | Keep unavailable; historical only |
| Moon-Net Fisher, Mayumi | `agta/moon-net-fisher-mayumi` | Unit | No | Keep unavailable; historical only |
| Mudcrab Catcher, Pilo | `agta/mudcrab-catcher-pilo` | Unit | No | Keep unavailable; historical only |
| Rattan Bridge Weaver, Nena | `agta/rattan-bridge-weaver-nena` | Unit | No | Keep unavailable; historical only |
| Rattan Snarefall | `agta/rattan-snarefall` | Action | Yes | Keep unavailable; historical only |
| Returning River | `agta/returning-river` | Codex | No | Keep unavailable; historical only |
| Root Tusk Boar, Dagsa | `agta/root-tusk-boar-dagsa` | Force | No | Keep unavailable; historical only |
| Shared Ember | `agta/shared-ember` | Codex | No | Keep unavailable; historical only |
| Sierra's Vanishing Trail | `agta/sierras-vanishing-trail` | Action | Yes | Keep unavailable; historical only |
| Storm Bark Elder, Ulan | `agta/storm-bark-elder-ulan` | Unit | No | Keep unavailable; historical only |
| Storm Talon Eagle, Salimbay | `agta/storm-talon-eagle-salimbay` | Force | No | Keep unavailable; historical only |
| The Boar Spear, Makisig | `agta/the-boar-spear-makisig` | Unit | Yes | Keep unavailable; historical only |
| Thousand Knots | `agta/thousand-knots` | Codex | No | Keep unavailable; historical only |
| Voice Beneath the Rain, Laya | `agta/voice-beneath-the-rain-laya` | Unit | No | Keep unavailable; historical only |
| Banner Bearer of Ancestral Path, Danira | `babaylan/banner-bearer-of-ancestral-path-danira` | Force | Yes | Keep unavailable; historical only |
| Bell Dancer of the Tides, Sidlak | `babaylan/bell-dancer-of-the-tides-sidlak` | Unit | Yes | Keep unavailable; historical only |
| Drummer of the First Calling, Baya | `babaylan/drummer-of-the-first-calling-baya` | Unit | No | Keep unavailable; historical only |
| Heart of the Twelve Spirit, Amaya | `babaylan/heart-of-the-twelve-spirits-amaya` | Unit | Yes | Keep unavailable; historical only |
| Heart Spring Beneath the Ancient Balete | `babaylan/heart-spring-beneath-the-ancient-balete` | Codex | No | Keep unavailable; historical only |
| Keeper of the Mangrove Remedies, Maliya | `babaylan/keeper-of-the-mangrove-remedies-maliya` | Unit | No | Keep unavailable; historical only |
| Keeper of the Spirit Bowl, Ilaya | `babaylan/keeper-of-the-spirit-bowl-ilaya` | Unit | Yes | Keep unavailable; historical only |
| Lantern of the Mangrove Gate, Salaya | `babaylan/lantern-of-the-mangrove-gate-salaya` | Unit | Yes | Keep unavailable; historical only |
| Morning Offering Bearer, Hilaya | `babaylan/morning-offering-bearer-hilaya` | Force | Yes | Keep unavailable; historical only |
| Pearl Diver of the Spirit Shoal, Sulaya | `babaylan/pearl-diver-of-the-spirit-shoal-sulaya` | Force | Yes | Keep unavailable; historical only |
| Reader of Moonlight Current, Dalina | `babaylan/reader-of-moonlit-currents-dalina` | Unit | Yes | Keep unavailable; historical only |
| Reader of Shallow Waters, Nalia | `babaylan/reader-of-shallow-waters-nalia` | Unit | No | Keep unavailable; historical only |
| Shell Bell Initiate, Yana | `babaylan/shell-bell-initiate-yana` | Unit | No | Keep unavailable; historical only |
| Smoke-Tender of the Mangrove Altar, Isara | `babaylan/smoke-tender-of-the-mangrove-altar-isara` | Force | Yes | Keep unavailable; historical only |
| Spear Between two Worlds, Kadasig | `babaylan/spear-between-two-worlds-kadasig` | Unit | Yes | Keep unavailable; historical only |
| Spear of the Emerald Tide, Maraya | `babaylan/spear-of-the-emerald-tide-maraya` | Unit | Yes | Keep unavailable; historical only |
| The Ancestors Open the Way | `babaylan/the-ancestors-open-the-way` | Action | Yes | Keep unavailable; historical only |
| The Ancestral Caverns of Samar | `babaylan/the-ancestral-caverns-of-samar` | Codex | No | Keep unavailable; historical only |
| The Healing Grove of Bandilaan | `babaylan/the-healing-grove-of-bandilaan` | Codex | No | Keep unavailable; historical only |
| The Sacred Crown of Kanlaon | `babaylan/the-sacred-crown-of-kanlaon` | Codex | No | Keep unavailable; historical only |
| The Storm Altar of Madja-as | `babaylan/the-storm-altar-of-madja-as` | Codex | No | Keep unavailable; historical only |
| Vessel Beneath the Moon, Lunay | `babaylan/vessel-beneath-the-moon-lunay` | Unit | Yes | Keep unavailable; historical only |
| Weaver of the Spirit Threads, Dayaw | `babaylan/weaver-of-the-spirit-threads-dayaw` | Unit | No | Keep unavailable; historical only |
| Whispers Gather in the Heart | `babaylan/whispers-gather-in-the-heart` | Action | Yes | Keep unavailable; historical only |
| Blood Moon Bai-A-Labi | `maguindanao/blood-moon-bai-a-labi` | Unit | Yes | Keep unavailable; historical only |
| Buluan Inaul Wardkeeper, Dayang Nuraya | `maguindanao/buluan-inaul-wardkeeper-dayang-nuraya` | Unit | No | Keep unavailable; historical only |
| Buluan Mirror-Seer, Dayang Amira | `maguindanao/buluan-mirror-seer-dayang-amira` | Force | No | Keep unavailable; historical only |
| Buluan Shell-Caller, Mayla | `maguindanao/buluan-shell-caller-mayla` | Unit | No | Keep unavailable; historical only |
| Crimson Agung Resonance | `maguindanao/crimson-agung-resonance` | Action | Yes | Keep unavailable; historical only |
| Illana Bay | `maguindanao/illana-bay` | Codex | No | Keep unavailable; historical only |
| Illana Lantaka Warder, Panglima Jamal | `maguindanao/illana-lantaka-warder-panglima-jamal` | Unit | Yes | Keep unavailable; historical only |
| Illana Stormwing, Ramitan | `maguindanao/illana-stormwing-ramitan` | Force | No | Keep unavailable; historical only |
| Illana Tide-Harpooner, Hakim | `maguindanao/illana-tide-harpooner-hakim` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato | `maguindanao/kuta-wato` | Codex | No | Keep unavailable; historical only |
| Kuta Wato Banner-Keeper, Sitti Rahma | `maguindanao/kuta-wato-banner-keeper-sitti-rahma` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato Gate-Bulwark, Bai Samira | `maguindanao/kuta-wato-gate-bulwark-bai-samira` | Unit | No | Keep unavailable; historical only |
| Kuta Wato Warcaller, Datu Salik | `maguindanao/kuta-wato-warcaller-datu-salik` | Unit | No | Keep unavailable; historical only |
| Lake Buluan | `maguindanao/lake-buluan` | Codex | No | Keep unavailable; historical only |
| Liguasan Marsh | `maguindanao/liguasan-marsh` | Codex | No | Keep unavailable; historical only |
| Liguasan Mire-Bender, Duma | `maguindanao/liguasan-mire-bender-duma` | Force | No | Keep unavailable; historical only |
| Liguasan Mudblade, Nasser | `maguindanao/liguasan-mudblade-nasser` | Unit | No | Keep unavailable; historical only |
| Liguasan Reed-Eye, Harun | `maguindanao/liguasan-reed-eye-harun` | Unit | No | Keep unavailable; historical only |
| Pulangi Bloodcurrent, Sangkad | `maguindanao/pulangi-bloodcurrent-sangkad` | Force | No | Keep unavailable; historical only |
| Pulangi Ember-Spear, Kamil | `maguindanao/pulangi-ember-spear-kamil` | Unit | No | Keep unavailable; historical only |
| Pulangi River | `maguindanao/pulangi-river` | Codex | No | Keep unavailable; historical only |
| Pulangi River Unbound | `maguindanao/pulangi-river-unbound` | Action | No | Keep unavailable; historical only |
| Pulangi Wake-Cleaver, Panglima Farid | `maguindanao/pulangi-wake-cleaver-panglima-farid` | Unit | No | Keep unavailable; historical only |
| Veiled Eclipse Maharaja | `maguindanao/veiled-eclipse-maharaja` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato Abyssblade, Panglima Zafir | `maguindanao/kuta-wato-abyssblade-panglima-zafir` | Unit | Yes | Keep unavailable; historical only |
| Black-Standard Oathkeeper, Sitti Maira | `maguindanao/black-standard-oathkeeper-sitti-maira` | Unit | Yes | Keep unavailable; historical only |
| Lowland-Born Heir, Rinamuntaw | `maguindanao/lowland-born-heir-rinamuntaw` | Unit | No | Keep unavailable; historical only |
| Receding-Sea Heiress, Rinayung | `maguindanao/receding-sea-heiress-rinayung` | Unit | No | Keep unavailable; historical only |
| Many-Limbed Tidal Horror, Kurita | `maguindanao/many-limbed-tidal-horror-kurita` | Unit | No | Keep unavailable; historical only |
| Mountain-Breaking Devourer, Tarabusaw | `maguindanao/mountain-breaking-devourer-tarabusaw` | Unit | No | Keep unavailable; historical only |
| Cave-Light Heiress, Bai Amina | `maguindanao/cave-light-heiress-bai-amina` | Unit | No | Keep unavailable; historical only |
| Last Refuge Chief, Datu Karim | `maguindanao/last-refuge-chief-datu-karim` | Unit | No | Keep unavailable; historical only |
| Hollow-Tree Emberkeeper, Harun | `maguindanao/hollow-tree-emberkeeper-harun` | Unit | No | Keep unavailable; historical only |
| Lost-Ring Bearer, Buganga | `maguindanao/lost-ring-bearer-buganga` | Unit | No | Keep unavailable; historical only |
| Legend-Script Guardian, Datu Kali Adam | `maguindanao/legend-script-guardian-datu-kali-adam` | Unit | No | Keep unavailable; historical only |
| Mantapuli Memory Keeper, Alad | `maguindanao/mantapuli-memory-keeper-alad` | Unit | No | Keep unavailable; historical only |
| Many-Bodied Hunter, Omaka-an Shard | `maguindanao/many-bodied-hunter-omaka-an-shard` | Unit | No | Keep unavailable; historical only |
| Bita Eclipse Hatchling, Pahira | `maguindanao/bita-eclipse-hatchling-pahira` | Unit | No | Keep unavailable; historical only |
| Dread-Night Caller, Balbal | `maguindanao/dread-night-caller-balbal` | Unit | No | Keep unavailable; historical only |
| Heaven-Sheltered Survivor, Lanao Sprite | `maguindanao/heaven-sheltered-survivor-lanao-sprite` | Unit | No | Keep unavailable; historical only |
| Three-Scourge Slayer, Sulayman | `maguindanao/three-scourge-slayer-sulayman` | Unit | No | Keep unavailable; historical only |
| Sun-Darkening Scourge, Pah | `maguindanao/sun-darkening-scourge-pah` | Unit | No | Keep unavailable; historical only |
| Land-Restoring Raja, Indarapatra | `maguindanao/land-restoring-raja-indarapatra` | Unit | No | Keep unavailable; historical only |
| Seven-Sight Final Scourge, Gurayan | `maguindanao/seven-sight-final-scourge-gurayan` | Unit | No | Keep unavailable; historical only |
| Gurayen Wrath-Mate, Maka-Ogis | `maguindanao/gurayen-wrath-mate-maka-ogis` | Unit | No | Keep unavailable; historical only |
| Ridge-Bed Devourer, Omaka-an | `maguindanao/ridge-bed-devourer-omaka-an` | Unit | No | Keep unavailable; historical only |
| Heaven-Rending Wind, Taguwasi | `agta/heaven-rending-wind-taguwasi` | Unit | No | Keep unavailable; historical only |
| Fifth-Sky Arrowlord, Kalimangalnuk | `agta/fifth-sky-arrowlord-kalimangalnuk` | Unit | No | Keep unavailable; historical only |
| Life-Restoring Mother, Ina Nanolay | `agta/life-restoring-mother-ina-nanolay` | Unit | No | Keep unavailable; historical only |
| Mystic River Caller, Alig | `agta/mystic-river-caller-alig` | Unit | No | Keep unavailable; historical only |
| Fallen Sky Warrior, Talimanog | `agta/fallen-sky-warrior-talimanog` | Unit | No | Keep unavailable; historical only |
| Defiant Sky Warrior, Ammani | `agta/defiant-sky-warrior-ammani` | Unit | No | Keep unavailable; historical only |
| Enduring Sky Warrior, Annibo | `agta/enduring-sky-warrior-annibo` | Unit | No | Keep unavailable; historical only |
| Golden Gate Warden, Nagdombilan | `agta/golden-gate-warden-nagdombilan` | Unit | No | Keep unavailable; historical only |
| Moon-Stealing Wing, Ammalabukkaw | `agta/moon-stealing-wing-ammalabukkaw` | Unit | No | Keep unavailable; historical only |
| Captive Moon, Innawagan | `agta/captive-moon-innawagan` | Unit | No | Keep unavailable; historical only |
| Sunrise-Seeking Wing, Dalewasan | `agta/sunrise-seeking-wing-dalewasan` | Unit | No | Keep unavailable; historical only |
| Shapeshifting Savior, Nagmalitong Yawa | `babaylan/shapeshifting-savior-nagmalitong-yawa` | Unit | No | Keep unavailable; historical only |
| Celestial Matriarch, Alunsina | `babaylan/celestial-matriarch-alunsina` | Unit | No | Keep unavailable; historical only |
| Lifespan Carver, Sidapa | `babaylan/lifespan-carver-sidapa` | Unit | No | Keep unavailable; historical only |
| Seven-Year Challenger, Labaw Donggon | `babaylan/seven-year-challenger-labaw-donggon` | Unit | No | Keep unavailable; historical only |
| Tarangban Voyager, Humadapnon | `babaylan/tarangban-voyager-humadapnon` | Unit | No | Keep unavailable; historical only |
| Ridge-Splitting Warrior, Dumalapdap | `babaylan/ridge-splitting-warrior-dumalapdap` | Unit | No | Keep unavailable; historical only |
| Heart-Veiled Lord, Saragnayon | `babaylan/heart-veiled-lord-saragnayon` | Unit | No | Keep unavailable; historical only |
| Ancestral Faithkeeper, Tamblot | `babaylan/ancestral-faithkeeper-tamblot` | Unit | No | Keep unavailable; historical only |
| Diwata Shrinekeeper, Pagali | `babaylan/diwata-shrinekeeper-pagali` | Unit | No | Keep unavailable; historical only |
| Final-Blow Heir, Asu Mangga | `babaylan/final-blow-heir-asu-mangga` | Unit | No | Keep unavailable; historical only |
| Heart-Beast Hunter, Buyung Baranungun | `babaylan/heart-beast-hunter-buyung-baranungun` | Unit | No | Keep unavailable; historical only |
| Ridge-Bed Multiplier, Omaka-an | `maguindanao/set-1/ridge-bed-multiplier-omaka-an` | Unit | Yes | Keep intentionally hidden |

## Coverage validation

- Selectable IDs in the exported loader: 141.
- Individual migration entries: 141.
- Live token entries: 1.
- Other unavailable entries: 117.
- No gameplay code or card definition was changed to produce this audit.
- This is a source-based migration design. New Energy-free skill outcomes and balance must be validated during implementation using the scenarios above and the release matrix in section 4 and Parts E/C.
