# Codex Legends: deep MVP audit and PvP implementation plan

Audit date: 14 September 2026. Game checkout: `C:\Code\codexlegend`.
Audited commit: `546f3ae85fd4e4850a89863807aaf92d4845ccd4`.

## 1. Release decision

**Ready for an invited, supervised desktop playtest against AI. Not ready to call a dependable public MVP yet. Not ready for PvP.**

There is a real game here: three playable Set 1 decks, implemented resource engines, battle response windows, card inspection, deckbuilding, an event log, prepared lessons, and presentation settings. The core runs without a browser, which is valuable. Keep the existing 2D direction and assets.

The next milestone should be reliability and comprehension, not another visual overhaul. A first-time player can currently reach an instruction they cannot complete, or read a rule explanation that contradicts the implementation. Persistence and validation also need correction. These are specific repairable gaps; they do not justify rebuilding the whole game.

This verdict distinguishes an AI playtest from a competitive product. A trusted local controller is acceptable for the former; it is not an authority boundary for the latter.

## 2. What was actually checked

| Check | Result | Practical meaning |
|---|---|---|
| TypeScript and production build | Passed | Code compiles and bundles |
| Full test suite | 701 tests: 697 passed, 1 failed, 3 skipped | Release suite is not green |
| Additional current Set 1 matches | 30/30 finished; 7–16 turns, average 10.9 | No exception, negative Energy, wrong Ally array length, or duplicate Heart entry in these runs |
| Current Set 1 effect sequence depth | 11/30 matches reached chain index 4 or 5 | Longer effect sequences are relevant to current decks |
| Production dependency audit | 0 reported vulnerabilities | No known production dependency issue reported by this audit |
| Full dependency audit | 1 critical, 1 high, 3 moderate | Development/test tooling needs patching |
| Browser: local game | 1280×720 title, tutorial menu, Lesson 8, part of Lesson 3, Bayanihan challenge | Reproduced blocked progress, premature teaching, and unearned completion |
| Browser: deployed game | Title, deck library, deck details, visible Patch 1.4 | Deployment is reachable; sampled screens emitted no captured errors/warnings |
| Mobile verification | Not completed | Requested 390×844 override remained 1280×720; no mobile pass claimed |

The live bundle was `main-BZGfJ50u.js`; the local build generated `main-BepTvfYl.js`. Both displayed Patch 1.4. This does not identify the live commit, and the mismatch alone does not prove a bad deployment. Add a build SHA so release correspondence can be verified.

The 30 matches use the current three `*-set-1.json` decks, five seeds per pairing, both seat assignments, and the normal AI. Wins were Luzon 12/20, Visayas 10/20, Mindanao 8/20. This is a smoke sample, **not a balance verdict**: one AI policy, three preset decks, and five seeds cannot establish human matchup balance. Older broad balance tests use legacy decks and should not be cited as evidence for current Set 1 balance.

Evidence: [machine-readable results](./evidence.json). Reproduction probe: [probes.mjs](./probes.mjs). From the game root run `node docs/audits/2026-09-14/probes.mjs`; it writes `.tmp/mvp-audit-probes.json`. Full suite command: `npm test -- --reporter=json --outputFile=.tmp/mvp-audit-tests.json`.

Not certified by this audit: every possible card interaction, all 23 lessons completed end to end, real Android/iOS behavior, audio output, sustained device frame rate, accessibility conformance, multiplayer security, hosted load capacity, or art/music licensing. No production fixes or deployments were performed.

## 3. Findings, ordered by release importance

P1 = address before a dependable public AI MVP. P2 = polish/engineering follow-up. PvP blocker = must be resolved before accepting adversarial multiplayer clients.

### A01 — P1: Tutorial progress can block or falsely report success

**Observed:** Tutorial → Skills, costs and triggers → Continue. Step 2 says to choose a glowing Unit and activate its skill. The prepared board contains Wind-Heart Rescuer, Taguwasi and Barbed-Sky Messenger, Dalewasan. Clicking either produces no activation control; the instruction remains. No console exception accompanies the failure.

The fixture chooses a generic Unit rather than a card with an affordable Main Phase activation. The Persona currently has triggered skills. The step permits only an `ability` action, so ordinary development cannot repair the situation for the learner.

Evidence: [lessons.ts:217](../../../src/ui/lessons.ts), [main.ts:7885](../../../src/ui/main.ts), [agta-set-1.ts:83](../../../src/cards/agta-set-1.ts).

**Fix:** Give every action lesson an explicit card, zone, Energy, targets, State, phase, and legal-action precondition. For this lesson, use an actual affordable blue skill. Highlight that card and its skill control, not the entire Unit row. Fail the lesson fixture test if its required action is absent. Add a browser journey that completes the lesson without developer intervention.

A second browser reproduction found the opposite failure: opening Bayanihan challenge and immediately clicking **Finish lesson** awarded **Lesson 15 complete**, with zero plays, Bayanihan still locked, and no attacks. Its objective list exists only in catalogue data. The adapter in `src/ui/tutorial-mode.ts:224` does not carry success objectives into the runtime; a single manual briefing step completes the lesson. Add real objective tracking and require all challenge conditions before awarding completion. Test both failure to meet an objective and successful completion.

### A02 — P1: Battle teaching advances before the event it describes

**Observed:** Lesson 3 → select your Persona → select opponent Persona. The instruction changes to “Your opponent defends” while the “Before your attack: play Forces?” window is still open. No defender has been placed yet. The teaching panel overlaps the Force card. Minimizing it and declining Force allows the actual defender to appear later.

Evidence: [tutorial-mode.ts:86–88](../../../src/ui/tutorial-mode.ts), [main.ts:2672](../../../src/ui/main.ts). The next step is entered on attack declaration, although its copy describes blockers already declared.

**Fix:** Use separate completion events for attack selected, attacker response finished, defender response finished, blockers committed, before check, check revealed, check finished, and battle resolved. Show the defense explanation only after the defender card is on screen. One decision panel should own focus at a time. Add a Lesson 3 regression with a Force in hand and both use/decline branches.

### A03 — P1: Teaching and glossary contradict current skills

Lesson 8 says red means “always on.” The agreed red marker now identifies State-linked skills, alongside the timing marker. It also says green effects cannot be held back, while optional triggered choices exist. The glossary describes State release at the start of a turn and names retired cards in its Grave explanation. A deck description says Andukha starts at five cards; the implemented base threshold is six. Advanced copy describing nine/twelve as only Power thresholds is stale after the latest gated skill updates.

Evidence: [lessons.ts:204](../../../src/ui/lessons.ts), [glossary.ts:88](../../../src/ui/glossary.ts), [main.ts:1415](../../../src/ui/main.ts), [states.ts:19](../../../src/core/states.ts). README and `docs/game-rules.md` also retain older rules/terminology.

**Fix:** Create one reviewed rules glossary and one marker definition source. Explain timing, optionality, State requirement, cost, and target separately. Red is a State requirement; green covers automatic/continuous timing as intended; yellow indicates battle usability. Render required thresholds explicitly. Rewrite lessons against current Set 1 fixtures and manually verify their claims.

### A04 — P1 / PvP blocker: Duplicate entries bypass the copy limit

**Reproduced:** A 50-card deck with five copies of the same Unit split across separate entries passed both `checkDeck()` and `validateDeck()`. Each row was below the three-copy limit; the combined count was not checked.

The validators also disagree: the builder requires exactly twelve Forces, five Codex, and one guild; setup permits up to twelve Forces, three to five Codex, and two guilds. Two validation implementations are already drifting.

Evidence: [deckcheck.ts:63](../../../src/core/deckcheck.ts), [setup.ts:66](../../../src/core/setup.ts), `duplicateCopies` in the evidence file. Deck-code decoding also needs complete runtime schema checks; merely checking that `m` is an array does not validate each entry.

**Fix:** One canonical format validator for builder, imports, setup, and server. Aggregate counts by card ID before applying limits. Reject non-integer/non-positive/excessive counts, invalid types, Tokens, unknown and format-ineligible cards, invalid Persona/Codex, and oversized payloads. Distinguish retained legacy definitions from cards legal in current Set 1. Freeze a validated deck snapshot when a match starts.

### A05 — P1: Deck storage failure is silent

**Reproduced:** With `localStorage.setItem` throwing, `saveDeck()` returned normally and reloading yielded no deck. A list containing one valid stored deck plus a malformed sibling also loaded as an empty library.

Evidence: [decklib.ts:44–87](../../../src/ui/decklib.ts), callers in [main.ts:1668](../../../src/ui/main.ts), `failedStorage` and `corruptSibling` probes.

**Fix:** Return a result that distinguishes saved, session-only, and failed. Do not imply success after a failed write. Keep the draft visible and offer Copy deck code. Parse individual records defensively so one invalid record does not hide every healthy deck. Test blocked storage, quota, malformed imports, legacy records, and reload after save.

### A06 — P1: The release gate currently fails, and longer chains need a UI decision

`src/core/chain-depth.test.ts:82` fails because chain index reached five against a maximum of three. This is a deliberate comprehension tripwire, not evidence of an engine crash. Its old comment claiming sequences stay shallow is no longer reliable. The extra Set 1 sample reached four/five in eleven matches.

**Fix:** Review actual longer sequences with a compact effect queue: source card, effect summary, paid cost, current target, and which item is resolving. Keep costs and consequences sequential. Allow “Why?”/log inspection without losing the current choice. Change the test only after the presentation decision is made; do not just raise the threshold to silence it. Maintain a fast PR suite and a separate longer simulation job using current decks.

### A07 — PvP blocker: `perform()` trusts its caller

**Reproduced locally:** With zero Energy, `legalActions()` excluded The Elders Answer, a one-Energy Action. Calling `perform({kind:'playAction', uid}, 0)` directly still moved it to Grave and incremented plays. The payment result is ignored. The ability branch similarly invokes execution without first calling the complete availability predicate.

Evidence: [game.ts:1590–1650](../../../src/core/game.ts), `unaffordableAction` probe. This is not a claim that a network exploit exists today; there is no PvP server here. It proves that forwarding socket messages directly to the current controller would be unsafe.

**Fix:** Introduce runtime-validated commands, authenticated actor identity, phase/priority/ownership checks, legal targets, costs, limits, and atomic rejection before mutations. Validate every answer to a chooser as carefully as a top-level action. A rejected action must not consume Energy, cards, once-per-turn uses, or RNG. Audit exceptions after partial resolution and define recovery; catching an exception alone cannot undo a paid cost.

### A08 — PvP blocker: Hidden-state projection and recovery are unfinished

The client owns the full `GameState`. `events.viewFor()` filters events, not the full state, and is documented as unused by local play. Sending the existing state would expose private information. Existing promises awaiting `Chooser` decisions and `customRun` callbacks cannot be restored merely by JSON-saving the board.

Evidence: [events.ts:241](../../../src/core/events.ts), [types.ts:517](../../../src/core/types.ts), [effects.ts:113](../../../src/core/effects.ts).

**Fix:** Build explicit per-player state views, owner-only pending decisions, a server decision journal, room ownership, and reconnect recovery. Use the architecture below. Keep seeds, unrevealed card identities, deck order, and server continuation state off the wire.

### A09 — P1 release process: dependency patching and automated gates

`npm audit` reports five development dependency vulnerabilities, including a critical Vitest UI-server advisory. `npm audit --omit=dev` reports zero. The critical issue concerns exposed development tooling; this audit did not establish exploitation of the deployed game. [Official advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp).

Only a social-post workflow was found under `.github/workflows`; no game build/test PR gate is configured there.

**Fix:** Upgrade to compatible patched test/tooling versions, then rerun tests/build. Add CI for install, typecheck/build, rule/catalogue regressions, tutorial fixtures, import validation, and browser smoke tests. Require these checks before release. Add a build identifier and error reporting with actionable context, avoiding hidden cards or personal information in routine telemetry.

### A10 — P2: Naming and accessibility drift

The deployed library still presents Agta, Babaylan, and Maguindanao as primary deck labels, and lessons use those track headings. That conflicts with the requested archipelago-first presentation. Keep exact card subtypes where mechanically necessary, but use Luzon, Visayas, and Mindanao for navigation and deck families.

The closed feedback panel remains in the accessibility tree. CSS translates it off screen, while its close control remains exposed; this should be hidden/inert when closed, with sensible focus restoration. Do not treat “visually off screen” as inaccessible to keyboard or screen-reader navigation.

Evidence: deployed browser screens, [main.ts:1645](../../../src/ui/main.ts), [feedback.ts:86](../../../src/ui/feedback.ts), [style.css:4617](../../../src/ui/style.css).

### A11 — P2 / launch measurement gap: payload and maintainability

The main production JavaScript chunk is 895.51 KB raw / 232.25 KB gzip; main CSS is 136.96 KB raw / 29.83 KB gzip. Vite reports a chunk warning. `main.ts` is over 8,200 lines. Dormant replay/3D files and dependencies remain, but their presence alone does not prove they all load or cause runtime lag.

**Fix:** Measure startup and interactions on a real midrange phone, then split menu, tutorial, deckbuilder, match presentation, and transport boundaries where it improves loading and testability. Load optional effects only when needed. Retain readable minimal-effects mode. Measure long tasks, frame pacing, asset decode, and memory after repeated matches. Do not claim smoothness from bundle size or desktop screenshots alone.

## 4. AI MVP stabilization backlog and acceptance gates

Implement in this order, preserving the latest approved card skills:

1. **Rules contract and inputs:** unify deck validation, fix import shape handling, define marker/State semantics, add the reproduced regression cases.
2. **Onboarding:** fix Lessons 8 and 3; audit every lesson against explicit current-card fixtures. Every required step must have a reachable legal action and a verified completion event; challenges must not award completion until their objectives are actually met. Complete all offered lessons without reload or console intervention.
3. **Resolution clarity:** exercise four/five-effect sequences, cancellation, exhausted-to-charged transitions, simultaneous choices, order-to-bottom, Force/Sentry interruption, and end-turn delayed effects. Show the source/target and actual ordering.
4. **Persistence and recovery:** save confirmation must survive reload; blocked storage must preserve a usable draft; one corrupt record must not hide other decks. Give runtime failures a readable recovery path.
5. **Release tooling:** patch dev dependencies, make all required tests green, add CI and build SHA, verify deployed assets and the target commit.
6. **External playtest:** invite 8–12 new players. Record where they stop, what they misunderstand, tutorial completion, first-match completion, and whether they can explain attack/defense ties and each resource. These are proposed gates, not measurements already collected.

Suggested public MVP acceptance: no known P1 issues; all offered tutorials completed in browser; all three decks finish repeated matches; no blocked critical controls at 1280×720 and 1366×768 plus actual Android portrait/landscape and iOS Safari; card inspection works with touch and keyboard; audio/mute and reduced motion verified; a clean deployed smoke run; reproducible bug reports with build ID.

Before calling balance ready, run hundreds of paired-seed matches using multiple Persona/deck variants and obtain human matchup data. Keep casual balancing flexible; no ranked ladder yet.

## 5. Recommended PvP stack

| Layer | Recommendation | Why it fits this code |
|---|---|---|
| Browser client | Existing TypeScript + Vite, DOM/CSS, GSAP and PixiJS effects | Preserve working 2D assets and controls |
| Shared rules | Extract current core/cards into a browser-independent TypeScript package | Same rules for AI, tests, and authoritative server |
| Match server | Node.js active LTS + TypeScript + Colyseus | Dedicated rooms, client messaging, lifecycle and reconnect support |
| Runtime validation | Zod schemas plus domain legality checks | Network input must be checked at runtime |
| Accounts and durable data | Supabase Auth + PostgreSQL; SQL migrations and a thin server repository layer | Identity, saved decks, match metadata and durable decision journal |
| Hosting | Vercel for static client; persistent Fly.io service initially in Singapore for match rooms | Keep match ownership alive across many decisions |
| Tests and operations | Patched Vitest, browser journeys, structured logs, metrics and alerting | Prove rules, recovery and user flows separately |
| Later scaling | Redis-backed room discovery/presence when multiple server processes are needed | Not needed for the first single-process private alpha |

Colyseus provides room and reconnection primitives; the application still has to enforce card rules and secrecy. For this turn-based game, begin with private messages carrying explicit PlayerView snapshots and ordered events rather than synchronizing raw `GameState`. If adopting Schema/StateView later, privacy tests must cover all joins, patches and reconnects. [Rooms](https://docs.colyseus.io/room), [reconnection](https://docs.colyseus.io/room/reconnection), [State View](https://docs.colyseus.io/state/view).

Vercel now offers WebSockets in beta. However, connections close at Function maximum duration and reconnects may reach a different instance. A persistent room server is my recommendation for this engine's long-lived decisions, rather than an assertion that Vercel cannot use sockets. [Vercel WebSocket lifecycle](https://vercel.com/docs/functions/websockets).

Fly lists Singapore (`sin`). It is a sensible first region to benchmark for Philippine players; actual network measurements and available capacity must decide the final placement. Put the database nearby. [Fly regions](https://fly.io/docs/reference/regions/).

Validate Supabase-issued tokens on the server with the supported verification API or a maintained JWT library, including issuer/audience/expiry. Never accept a browser-declared player ID as authentication or expose privileged database credentials. [Supabase JWT guidance](https://supabase.com/docs/guides/auth/jwts).

No React, Unity, Unreal, or 3D migration is needed for this PvP milestone. Do not use database row changes as the combat engine, or make either player's browser the host authority.

## 6. Architecture and command contract

Proposed repository boundaries:

```text
apps/web/             title, deckbuilder, tutorial, duel renderer, input
apps/match-server/    auth, rooms, RemoteChooser, timers, persistence
packages/rules/      core, cards, catalogue, canonical deck validation
packages/protocol/   schemas, command/decision IDs, PlayerView DTOs
packages/testkit/    deterministic fixtures, invariant and client harnesses
```

Extract incrementally. First prove the core starts and completes matches under Node with no DOM imports. Do not reorganize everything and change card behavior in the same change.

A normal action request should carry `protocolVersion`, `matchId`, `actionId`, `expectedRevision`, and a discriminated command payload. A choice response also carries `decisionId`. Actor identity and seat come from the authenticated connection. The server checks membership, active decision owner, turn/phase, zone, targets, costs, usage limits and format before accepting anything.

One serialized execution lane owns each match. New commands cannot interleave while an action is resolving. A pending choice is a correlated response to that action, not another action queued behind it: route it through a separately validated decision mailbox, or the lane can deadlock waiting for a response it refuses to process.

Every accepted operation gets a monotonically increasing revision/sequence. Duplicate action IDs return the stored acknowledgement without applying costs twice. Reject stale revisions with a current authorized view. Bound payload sizes, card counts, target lists, message rates, and pending request lifetimes.

A server update contains the recipient's permitted state, ordered effect events, decision prompt if owned by that recipient, and authoritative deadlines. The client displays progress; it cannot submit final Power, damage, shuffled order, drawn cards, or winner.

## 7. Hidden information and random outcomes

Define a visibility matrix before coding the wire protocol. Public field/Grave/revealed cards follow current rules. Opponent hand and unrevealed cards remain anonymous; deck order and RNG state remain secret even from their owner. Search effects reveal exactly the permitted subset to the permitted recipient. Resolve Heart, reserve Codex, facedown Exile and Barriers according to the game's explicit visibility rules, not convenience.

Audit event text as well as fields. A harmless-looking log sentence, card ID, stable hidden UID or count delta can disclose what a private payload hides. Re-randomize opaque references when rules cause hidden cards to become indistinguishable; do not let clients track a specific shuffled card through identifiers.

The server generates the initial random seed, keeps it private, and runs the existing deterministic RNG after proving reproducibility. Make instance IDs match-local; the current module-global UID counter is inconvenient for independent replay/recovery. Pin rules version, catalogue hash, deck snapshots and starting choices for the entire match. Never load a new skill revision midway through a duel.

Test privacy by capturing everything player A receives while player B draws, searches, shuffles, hides and reveals cards. Repeat on initial join and reconnect. Test that rejected requests do not alter RNG or leak private candidate lists in errors.

## 8. Decisions, speed and smooth presentation

Keep local AI play through `LocalMatchSession`; PvP uses `RemoteMatchSession`. Both provide the renderer with the same view/event contract. The PvP renderer must not depend on reading the opponent's full state.

Use the existing asynchronous Chooser boundary for `RemoteChooser`: publish the decision, await the owning player's validated answer, resume resolution. Presentation hooks become ordered server events, not animation sleeps. A client can animate at its chosen speed without changing combat outcomes.

For each decision, show whose choice it is, the exact prompt, selected cards/order, cost, and remaining time. During resolution show the active source and a compact list of queued effects. Preserve the current choice while opening card info or viewing the board. Do not layer two interactive decision dialogs over one another.

Buffer events in sequence. Enter an actionable prompt after the relevant visual context is displayed, with a “Catch up” path if behind. Server deadlines remain authoritative and cannot wait forever for a client's animation acknowledgement. Slow mode, muted audio, background tabs and reduced motion must not desynchronize gameplay.

## 9. Reconnect, clocks and durable recovery

Start private alpha with reconnect to the same live room: authenticate the returning account, reclaim its seat, invalidate stale socket/decision responses, send current private view and the exact pending decision. A room code is discovery, not authority to take another player's seat.

Suggested initial policy to playtest: 60 seconds reconnect grace; a visible decision clock and a bounded per-player time bank. Optional effects time out to decline. Mandatory decisions require a documented server fallback from legal candidates or a timeout loss; never invent a paid optional choice on the player's behalf. Avoid pausing the opponent indefinitely through disconnects. Keep timer numbers configurable and tune using observed match lengths.

A process crash is different from a socket disconnect. JSON snapshots cannot restore the current promise stack. For private alpha, explicitly mark an unrecoverable server failure as a void match, not a fabricated player loss. Before public PvP, implement and test recovery using pinned rules plus the journal of initial choices, accepted commands, choice answers and timeout outcomes. Replay silently to the exact pending decision and compare state hashes. Alternatively, evolve the engine into serializable decision/continuation steps; that is a larger project.

Persist accepted inputs before acknowledging them, and commit result records idempotently. Unexpected failures must stop the room cleanly. Recovery needs all nondeterministic inputs, not just the visible duel log. Do not claim the old replay format is sufficient without proving this.

This internal recovery journal is server infrastructure. It does not restore the replay-saving/export feature the user removed.

## 10. Data and operations

Minimum durable tables: player profile; owned deck with schema/format version; match with rules hash, status and region; participant with frozen deck snapshot and seat; append-only match decision journal with unique sequence/action ID; idempotent match result. Store private payloads server-side and give players access only to their permitted records. Apply row-level policies for client-accessible profile/deck tables; clients cannot write outcomes.

Add searchable error IDs and build/rules IDs, match completion rate, decision timeout rate, reconnect success, invalid input counts, server event-loop delay, memory and p95 command latency. Routine logs must not dump private hands, tokens or credentials. Keep recovery data access restricted and define retention.

First capacity target: 50 simultaneous matches / 100 connected players on a measured staging configuration. This is an acceptance target, not current capacity. Exercise long effect chains, slow clients, bursts of reconnects and a two-hour soak. Measure cost per concurrent match before adding instances. With multiple processes, assign each room one owner and fencing/lease protection; shared presence alone does not serialize game state.

Deployments stop assigning new matches to an old process, allow existing rooms to drain, and retain the matching rules build for recovery. Rollback must preserve active match versions. Keep a server health check and an explicit maintenance state.

## 11. Delivery phases with exit criteria

| Phase | Deliverable | Exit criterion |
|---|---|---|
| 0 — AI MVP repair | Findings A01–A06/A09, naming and critical access fixes | Required tests green, all offered lessons completable, saved decks survive reload, deployed build verified |
| 1 — Trusted rules boundary | Shared rules package, canonical validators, accepted-command/decision contract | Forged/repeated/stale/out-of-turn/unaffordable input rejected with no mutation; deterministic headless matches pass |
| 2 — Private two-player duel | Node/Colyseus room, auth, private PlayerViews, RemoteChooser, invite/join/ready | Two separate browser sessions complete matches with all three decks; neither receives hidden opponent data |
| 3 — Reliability | Reconnect, clocks, idempotency, result persistence, fault handling and journal recovery | Disconnect during every prompt type; duplicate delivery; refresh; tab sleep; restart; deploy-drain tests pass |
| 4 — Casual PvP beta | Small queue, rematch, clear opponent/disconnect UI, monitoring and load verification | Staging load/soak meets budget, real players finish matches, no unresolved high-severity privacy/desync issues |
| 5 — Competitive additions | Ranking, seasons, matchmaking expansion, spectator/privacy rules | Stable casual data and balance review justify them |

Test combinations must include attacker Force ordering, defender Force plus Sentry, interrupted attacks, defense ties, multiple attack checks, Offer/Last Oath chains, Vent/Essence triggers, State release/loss, temporary and permanent modifiers, extra attacks, bottom-deck ordering, simultaneous pending triggers, and end-turn delayed actions. Reconnect in the middle of each, not only between turns.

Planning allowance for one experienced engineer with available review/QA: roughly 1–2 weeks for AI MVP stabilization, another 2–3 weeks for a controlled two-player vertical slice, and another 2–4 weeks for recovery, privacy hardening, browser/network testing and beta operations. This is a scope estimate, not a delivery promise. Serializable crash recovery, an extensive mobile fix pass, or continued rules changes can extend it. Use phase exit evidence rather than the calendar to decide launch.

Keep the first release to friend invites and casual duels. Defer ranking, chat, spectators, tournaments, payments, trading, cross-region matchmaking and replay export. Reliable completion of one real two-player duel is the next product milestone.


## 12. Follow-up audit: Essence, Vent and Heart movement

Source inspection after the main audit confirmed incomplete animation wiring. This finding is based on execution paths in code, not a fresh browser animation capture.

- `main.ts:3903` defines `animateEssence`, but there are no callers. It also targets `.persona-slot`, while the current Heart anchor is `.slot.persona`.
- `essenceTopCard`, `essenceCard`, `essenceFromDeck` and `essenceUnitFromField` move cards and record rules triggers without queuing a dedicated Essence presentation event.
- `releaseSpirits` and `ventCard` pay the Vent cost without queuing a dedicated Vent animation. Kaluluwa tokens are deleted, so animation payloads must capture their appearance before deletion.
- The HUD contains Essence/Vent sound and destination feedback, but ordinary `cardMoved` events are excluded by `PresentationQueue.enqueue`. Those movements therefore do not reliably reach that code.
- Heart-to-field through the shared `specialCall` helper has generic source travel and arrival effects. Heart-to-hand through `retrieveFromHeart` has generic travel; direct `moveCard` callers bypass it. Heart-to-Exile has no dedicated route ceremony in the inspected Set 1 path.
- `essenceCard` currently rejects cards in Exile. Supporting that source is a rules decision, not merely an animation fix; only enable it when an approved skill permits it.

Proposed repair: dedicated Essence and Vent events containing a pre-move card snapshot, owner, source zone/slot, destination, visibility, batch ID and semantic reason. Animate the actual source card/pile, travel, destination pulse and counter update in order. Use the existing sequential FX path, avoiding duplicate generic movement banners. For multi-card Vent, show all paid cards leaving before any resulting triggers; Kaluluwa dissolve instead of appearing in Grave. Other Heart exits use their actual action label (return, special call, exile), not Vent. Verify both players, all legal source/destination routes, hidden card faces, source nodes removed before rendering, and normal/fast/reduced-motion modes.

### Implementation status — 14 September 2026

Connected Heart movement snapshots to the sequential FX queue. Essence helpers now label their movements; Vent costs include ordinary-card travel and deleted-token snapshots. Direct Heart exits are covered centrally, and shared special-call/retrieval paths no longer produce duplicate journeys. Essence from Exile remains disallowed by the existing skill helper; the renderer can show that route when a rule explicitly permits it. Heart counters remain anchored under each Persona even at zero.

Validation: 21 focused movement/presentation tests passed. A broader run before the final batching regression test reported 717 passed, 1 failed, 3 skipped; the sole failure is the previously documented chain-depth test (five links versus a limit of three). Production build passed. Browser fixture checks completed all 13 movement routes in normal mode and again for the opponent in reduced-motion mode, without leftover flying cards or captured console warnings/errors. An opponent hand-to-Heart movement used the card back. An actual Visayas duel exercised Maria Cacao's deck-to-Heart skill and reached the correct two-card Heart state. Audio cues are connected; audible output was not independently listened to during these checks.
