# Codex Legends: remove Energy, keep meaningful decisions

> Superseded for implementation by [the combined Energy-free and chain handoff](energy-free-chains-claude-implementation-plan.md), 2 October 2026. This earlier standalone plan is retained for history. Its nested-trigger timing and batch Force responses are not the target rules; use the combined document and its U01–U20 sequence.

Status: implementation plan, not implemented. Source audit: 1 October 2026, game commit `0047874b1a8de9e34a44b314a25805639314eac5`.

This plan follows the owner's decision: **normal calls and Action cards consume plays. Skills, automatic effects and special calls do not. Remove Energy from the game.** Recommendations for individual card changes below are proposed balance changes, not existing rules or proven balance results.

The companion [complete card audit](energy-free-card-audit.md) inventories all 259 loaded card definitions: all 141 selectable cards, the runtime Kaluluwa token, and all 117 other unavailable definitions. It records current text, migration instructions and card-specific verification. It is generated from the loaded catalogue and combined script registry, not just the older JSON exports.

Existing PvP and learning-path notes remain intact. This is a separate rules migration and must update the already implemented online game as well as solo play.

## 1. Recommendation and boundaries

Proceed with an Energy-free version. It removes one repeated calculation and makes the explanation of a turn easier. It does **not** make every effect free of conditions: Offer, Vent, discarding, returning a card to the deck, Essence, exhausting, State requirements, valid targets and once-per-turn limits remain meaningful.

Do not simply set Energy to a very large number or make `payEnergy()` always succeed. That leaves invisible rules, stale UI, broken rewards and an online client/server mismatch. Remove Energy from the active rules after every active card has a valid replacement.

Do not replace every former Energy payment with a new discard or play payment. That would recreate the same complexity and damage the agreed combo freedom. Most cards keep their effect and lose only the Energy component. Apply explicit limits to the few effects that can repeatedly generate cards, bodies or Power.

Keep the current play allowance for the first release: **printed Persona level + broken shields**, with the existing minimum of 1. A starting Level 3 Persona has 3 plays; with 1/2/3/4/5 broken shields it has 4/5/6/7/8. This remains a comeback mechanic. Do not simultaneously change hand size, deck size, copy limits, damage, Power, State thresholds or the first-turn attack rule.

Use the implemented deck constraints as the baseline: 50 main-deck cards including the starting Persona, at most 3 copies per card, exactly 12 Forces, at most 3 Sentries, and exactly 5 Codex. Some older prose says “up to 12” Forces and “3–5” Codex; reconcile that existing documentation drift without silently changing construction rules.

Do not add Level 4 cards or expand the Extra Zone during this migration. Preserve those interfaces, but evaluate their future play allowance and access conditions in a separate balance pass.

## 2. Exact rules contract

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

## 3. Audit findings and scope

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

Make **reveal → consume/exile exactly once → nullify → resolve bonus** a shared Sentry contract. Remove duplicate per-card exile calls or make the transition idempotent. Snapshot Bituon's Andukha threshold at activation, before its new tokens arrive. Ensure its bonus remains 1 token, or 2 at Andukha 9, rather than creating one and then using that token to qualify for two.

This is a code-inspection finding; no new live exploit or Energy-free balance test was performed for this plan.

## 4. Card conversion policy

### Ordinary skills

Remove only Energy from compound payments. `1 Energy + Offer 1` becomes `Offer 1`; `2 Energy + Vent 6` becomes `Vent 6`; Nanolay keeps `Discard 2`; Amara keeps `Vent this card`; Maria Cacao keeps Essencing the top 2; Iday keeps Essencing itself. Do not remove those restrictions or bypass their choice prompts.

Existing once-per-turn skills stay once per turn. A skill returning to hand, Grave, Heart or the deck does not reset its use in the same turn. Use a stable skill ID rather than rules-text strings as the long-term usage key. Track usage in authoritative game state by owner, physical card UID, skill ID and turn number; for explicitly named restrictions use card-definition ID instead of UID. Reserving the use before nested triggers prevents re-entrant activation; roll it back only if activation is cancelled before commitment.

Do not globally make every trigger once per turn. Only the listed proposals gain a new cap. Continuous effects stay continuous; token counts and first-event conditions retain their actual semantics.

### Actions

All 30 Actions cost exactly 1 play, including those that currently cost 0 Energy. Preserve Vent, Offer, Essence and other requirements. Do not add multiple-play prices to formerly expensive Actions in this first version. They already consume a card and compete with normal calls.

This also removes the old distinction between cheap and expensive Actions. Compare tutor/call-two Actions against calling one Unit directly, and compare mass Power/removal Actions against their smaller alternatives. If a card becomes an automatic choice, tune its own amount, condition or genuine card cost after matched tests. Do not assume that one play alone guarantees all 30 Actions are balanced.

Keep the Action confirmation screen: inspect safely, choose Cast or Cancel, see `Uses 1 play · 3 → 2 remaining` and any real additional cost. Before commitment, cancellation spends nothing. Once cast and its required cost is committed, it goes to Grave and uses the play even if a later effect is partially impossible. Never permit cancelling an unpaid mandatory cost after already receiving part of the benefit.

### Force cards

All 12 keep their check effect: choose a Unit for +5000 until end of turn. Hand activation uses their distinct skill and spends the card into Grave, with no Energy or play charge. Calling that same Force as an Ally still uses a play. Defending with it still spends it as a blocker without activating its hand skill. Keep these choices clearly separate.

Allow multiple Forces in one battle response as requested; selected cards resolve in the chosen order. Every physical card can only be committed once to that response. Newly drawn/recovered copies do not automatically append themselves to the same submitted response. Recheck zone, targets and continuing attack after each card and its nested effects. If a Sentry stops the attack, leave all later queued cards in hand.

Do not impose a blanket once-per-turn Force limit. Test Mountain Tunung's repeated restands and Tumatanan's extra calls using real available copies and recovery lines. If one is too strong, adjust that specific effect after evidence.

### Three Energy rewards that require new effects

| Card | Proposed replacement for Energy reward | What stays |
|---|---|---|
| Healer's Spirit-Friend, Bunog | Hand skill: choose one of your Units; it gets Power +3000 until end of turn | Normal Force check +5000 remains separate; spends itself into Grave |
| Return Our Moon | If the recovered Unit is Divine, you may Essence the top card of your deck | Recover one Unit from Heart to hand; Beast/Bird draw-then-discard branch; costs 1 play |
| The Price of the Third Victory | If Garahana is released after draw/discard, your Persona gets Power +3000 until end of turn | Offered 3+ requirement; draw 2 then discard 1; costs 1 play |

These are concrete starting proposals. They avoid another currency, preserve each region's identity, and do not automatically replace an Energy reward with unconditional card advantage.

## 5. Regional balance changes and required combo checks

### Luzon: keep deck shaping and special calls

Most Units already have once-per-turn tracking. Remove their Energy payments while retaining Bayanihan, placement conditions, discard costs and deck movement. In particular, preserve Talimanog's no-payment behavior and Namandiyanin's Sumipat 3 effect, now without Energy. Keep the distinction between a normal call and an effect calling a Unit from hand.

Taguwasi and Kalimangalnuk become easier engines; Nanolay still needs Discard 2 for its charged Personification. Ularan keeps its existing once-per-turn Codex gate. Nagdan keeps its fewer-Units requirement and once-per-turn gate.

**Recommended exception: Wedding-Clearing, Amuran.** Replace `3 Energy: Sipol 3` with `Discard 1: Sipol 3`, once per turn when it becomes active. Retain its switching condition. This is a proposed new card cost, not a general conversion rate: a free three-call engine is much larger than removing the fee from a single Sumipat. Confirm the discard before the first Sipol and resolve each call and its triggers in sequence. If no card can be discarded, the skill cannot activate.

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

## 6. Payment, triggers and loop safety

Removing Energy makes correct non-Energy payment more important:

1. Check timing, ownership, zone, remaining use, target requirements and all mandatory cost components.
2. Collect all cost choices. Multi-card Vent/Offer is one selection and one confirmation; show actual cards and required total.
3. Validate unique UIDs, current zones, subtype/level restrictions and weighted totals. Snapshot properties needed by the effect, such as offered Power or Kaluluwa count.
4. Commit the full cost and reserve the skill use together. A cost-triggered special call cannot pay the rest of that same cost.
5. Queue cost triggers, let the player order simultaneous effects, and resolve them with existing source highlights.
6. Resolve the original skill, then its resulting events and state checks. Retain the established engine's nested ordering unless a focused regression demonstrates a separate bug.

Do not reduce Vent or Offer counts accidentally while deleting Energy arguments from helpers. Replace ambiguous helpers such as `pay(c, energy, vent)` with clearly named Vent/choice operations. Do not alter `Essence 2` into Vent 2.

Use event IDs so each eligible trigger resolves at most once per source per event. Keep optional decisions skippable and mandatory end-turn returns unavoidable. Usage tracking must survive state clones and online reconnects and must not expose concealed card identity.

An engine watchdog is a last-resort diagnostic, not a hidden rule that silently drops legitimate effects. Detect repeated state/decision cycles, log the responsible skills, and fail regression scenarios. Never call an infinite loop fixed merely because the bot stopped after a fixed number of actions.

## 7. UI and onboarding

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

## 8. Implementation map

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
| AI | `src/ai/bot.ts`, `evaluate.ts`, related tests | Remove Energy valuation/reserves; evaluate actual card/Heart/field costs and ordered Force responses |
| PvP | `src/pvp/catalog.ts`, `view.ts`, `session.ts`, `client.ts`, `decisions.ts` | No Energy in snapshots; compatible version checks, caps and pending choices |
| Server deployment | `game-server/src/guests.ts`, `rooms/CodexMatch.ts`, `tools/sync-chronicles-server.mjs` | Shared version constants, regenerated Chronicles vendor bundle and manifest |
| Historical compatibility | `src/core/replay.ts`, replay UI/store types, legacy registry/tests | Reject incompatible old simulation records clearly; do not enable replay saving |
| Docs/content | `docs/game-rules.md`, current guides, dev log, marketing rule explanations | New authoritative rules, dated errata, no stale teaching |

The old spreadsheets are excluded from Git and are not the active rules source. Do not run old migrations or regenerate current cards from them. Printed art may contain baked-in outdated text: inspect the affected 81 card images before release and create an asset errata list if needed. Do not promise that changing JSON also changes card pixels. Re-render text-bearing art from editable sources if available; until then make the digital rules panel explicitly authoritative.

## 9. Hidden cards and historical records

Keep all unavailable cards unavailable, including Omaka-an. Kaluluwa is the exception: it is not deck-selectable but remains a live token used by effects.

Prefer an active Set 1 script registry plus the three retained Sentries. If retaining a legacy registry for developer fixtures, isolate it behind an explicit old-rules boundary rather than allowing old Energy fields to leak into new matches. Old tests that load `decks/agta.json`, `babaylan.json` or `maguindanao.json` must either migrate to the real Set 1 decks or be clearly designated historical compatibility tests. Do not delete coverage for hidden-zone privacy, determinism or event ordering just because it used an old deck.

Preserve custom deck IDs and data. New matches containing unavailable old IDs should explain which cards need replacing; do not silently substitute a different card. Preserve historical logs and local feedback. Any retained replay/import path must identify a rules revision and refuse to simulate Energy-era records with new rules; leave records stored and explain incompatibility. Do not delete replay code wholesale or turn replay saving back on as part of this work.

## 10. Online release and versioning

The Colyseus match server executes the rules. A frontend-only deployment is insufficient. `src/pvp/catalog.ts` currently identifies protocol 1 and content `codex-set1-2026-09-30`; `/codex/health` duplicates those values. Introduce a shared rules/content version, update protocol for the removed snapshot field/changed contract, and read the same constants in health responses.

Rebuild the Codex shared server module with `tools/sync-chronicles-server.mjs` into the existing Chronicles project. Review its generated manifest and bundle; retain the separate Chronicles rooms and APIs. Run that project's existing tests as well as Codex's.

Stage the complete version first. Existing matches must finish on their original rules or be explicitly ended during an announced update; do not mutate a running room into new rules. Gate new room creation during a coordinated shared-server/frontend release if necessary. Stale clients get a useful refresh message before joining or submitting actions. Do not reconnect an Energy-era room to the new schema and pretend it is compatible.

After deployment verify `/codex/health`, both-seat version agreement, an actual invitation/join, one full match for each regional pairing, reconnect during an ordered Vent/Force decision, results and rematch. Also smoke-test Chronicles because the server is shared. Roll back both Codex frontend and server bundle together if a blocking fault appears. No deployment is part of this planning request.

## 11. Ordered implementation checklist

Each slice needs focused tests and a build. Keep the public game on the existing rules until the complete migration passes; intermediate work belongs on one feature branch, not as partially migrated live releases.

1. **Freeze the rule contract and baseline.** Confirm this plan's proposed card exceptions; capture current seeded Set 1 match metrics and source inventory. Acceptance: 141 selectable IDs accounted for, token/legacy boundary documented, baseline reproducible. Files: audit fixtures, rule tests and this plan. No dependency.
2. **Centralize play accounting.** Normal calls and Actions use one play; Force skills and relocation use none. Acceptance: exact-limit rejection, free skills at zero plays, cancellation changes nothing. Files: controller, turn, availability and focused tests. Depends on 1.
3. **Add persistent skill-use tracking.** Stable per-copy/per-name scopes, reservation and cancellation semantics. Acceptance: no reuse after zone cycling, correct next-turn reset, independent skills on the same card stay independent. Files: types, controller, state and new usage tests. Depends on 1.
4. **Fix Sentries and Force commitment.** Shared Sentry consumption, no Energy in responses, all three Sentries tested. Acceptance: one physical card cannot nullify twice; ordered response stops after Sentry; Forces still work after all plays spent. Files: controller, legacy Sentry scripts, battle tests. Depends on 2–3.
5. **Convert Luzon Units and Forces.** Apply catalogue deltas and Bunog replacement. Acceptance: generated text matches execution; Bayanihan replacement paths and Nanolay discard still work. Files: Luzon scripts/data and tests. Depends on 3–4.
6. **Convert Luzon Actions and Codex.** Apply 1-play rule, remove Energy, add Amuran's proposed discard and explicit Codex caps. Acceptance: pay discard before Sipol, calls do not consume extra plays, replacement draw still skipped on opening turn. Depends on 5.
7. **Convert Visayas Unit payments.** Preserve numeric/identity Vent and Essence; add selected caps. Acceptance: full Vent cost commits together and six-token bonus reads actual payment. Files: Visayas scripts/content/effect helpers/tests. Depends on 3–4.
8. **Convert Visayas Actions and delayed effects.** Replace Return Our Moon's reward; keep end-turn obligations and existing Codex semantics. Acceptance: no duplicate optional prompts or skipped mandatory returns; token loops terminate. Depends on 7.
9. **Convert Mindanao Personas and Last Oaths.** Apply Energy removal and specifically scoped follow-up caps. Acceptance: correct subtype targets, Offer cost committed before refills, zone cycling cannot bypass new caps. Files: Mindanao scripts/content/tests. Depends on 3–4.
10. **Convert Mindanao Actions and Codex text.** Replace Third Victory reward; retain live State rechecks and timed Offers. Acceptance: ordered mill-before-draw, correct Grave counts, no infinite refill/restand line. Depends on 9.
11. **Remove the active Energy model.** Delete setup/refill/helpers/metadata and address every compiler-reported caller; isolate legacy fixtures. Acceptance: fresh live states and snapshots have no Energy, active effects contain no Energy arithmetic. Depends on 5–10.
12. **Update decision screens.** Plays remaining, safe Action cast confirmation, Force/Sentry choices and non-Energy cost dialogs. Acceptance: no Energy UI, no negative counts, board-visible horizontal choices on desktop and phone. Depends on 2, 11.
13. **Update guidance and learning.** Deck guide, glossary, all lessons, First/Next Battle and challenge advice. Acceptance: every required step is achievable through real rules and saved progress remains readable. Depends on 12.
14. **Update AI decisions.** Remove Energy weights and obsolete Force-saving assumptions; price card expenditure, targets, Heart, State and survival. Acceptance: bots use free useful effects, do not dump defensive cards without value, and complete seeded games without watchdog cutoffs. Depends on 5–11.
15. **Update PvP contract and generated server module.** Revision gating, privacy-safe usage tracking, stale decisions and reconnect. Acceptance: both-seat actions/counters agree and stale builds fail cleanly. Depends on 11–14.
16. **Full validation, errata and staged release.** Complete the matrix below, review assets/current docs, publish a clear rules update, then deploy both runtimes together. Acceptance: all release gates satisfied with evidence and rollback prepared. Depends on all previous slices.

At checkpoints after 4, 10 and 15, review unexpected rule changes. Do not expand into a visual overhaul, new card set or PvP redesign.

## 12. Verification matrix and release gates

### Rules and card tests

- Starting allowance, every broken-shield count 0–5, zero remaining, dynamic Persona changes, ordinary calls, overwritten slots, Action cast and special calls within Actions.
- Force: normal call versus hand skill versus block versus check; own Main/own Battle/opponent Battle; no play debit in skill paths; legal remaining costs such as Salumi's Vent 1.
- All three Sentries, no ordinary blocking with them, Bituon consumes itself with or without a bonus, and later queued cards stay unspent.
- Every removed Energy predicate, metadata property, direct subtraction, refund and optional payment helper has a migrated path. Text tests alone are insufficient: exercise the card's relevant branch.
- At least one behavioral scenario per changed skill branch and per replacement reward. Every unaffected selectable card retains its timing, valid zones and core result under the new model.
- Per-copy versus per-name use, multiple copies, independent skills, opponent's turn, field re-entry, Personification, Heart/Grave travel, clone and reconnect; declining before commitment never marks used.
- Weighted Offer and Grave counting remain distinct; subtype searches exclude unrelated regional Units; no cost is paid by effects created by that same cost.
- Multi-Vent 6 in one confirmation, custom simultaneous resolution order, actual token counts after discounts, state threshold lost while paying, mandatory delayed Essence/Offer.
- Bounded full games with real Set 1 decks. Failing to finish due to a repeated effect must fail the test rather than be scored as a draw.

Use the existing suites around `action-play-limit`, `force-battle`, `sentry-spend`, `opening-turn`, `availability`, all three `*-set-1` suites, `offer-value`, `offer-recall-fx`, `bottom-order`, `heart-fx`, `fx-order`, determinism and PvP decisions/session/view. Update obsolete assertions intentionally. Migrate legacy-deck simulations to selectable Set 1 for the balance run.

### Browser acceptance

Test 1440×900, 1024×768, 390×844 and phone landscape. Play a normal call, inspect/cancel/cast an Action, use a skill at 0 plays, submit several ordered Forces, use a Sentry, Vent several cards, minimize and restore a decision, and finish the tutorial. Verify no clipped buttons or new vertical card-list scrolling, no board blur when minimized, no double-visible moving cards, and no Energy labels. Check keyboard, right-click and touch long-press. Reduced-motion and hidden-tab behavior must still finish effects without leaving decisions stuck.

### Balance evidence

Run a proposed baseline of **100 seeds for each of the 9 ordered regional matchups**, covering both seating assignments for different decks and all three mirrors. Use identical seeds/decks for before/after comparisons and record starting player. These are exploratory bot results, not a proof of human balance.

Record first-player win rate, turns to finish, first-turn wins, cards drawn, special calls, attacks/restands, peak Heart, Offer count, max effect-chain length, number of decisions and any no-progress cycle. Any reproducible infinite/resource-positive loop blocks release. A sudden first-turn-kill line or a large win-rate shift triggers focused card review; do not conceal it by making the bot decline strong legal moves.

Then test with at least five new/non-TCG players and several experienced players. Ask each to explain what spends a play, distinguish Force skill from normal call, and complete a turn without Energy questions. Record where they hesitate and how long they wait through effects. A useful launch target is four of five newcomers explaining the play rule after the short lesson; treat it as a usability target, not an already achieved result.

### Release checklist

- [ ] All 141 selectable cards accounted for; Kaluluwa verified; hidden cards remain hidden.
- [ ] Three obsolete Energy rewards replaced and tested.
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

## 13. Player-facing explanation

“Each turn, you have a number of plays. Calling a card from your hand to an Ally Zone or casting an Action uses one play. Skills and special calls do not use plays. Read the skill for its timing and any cards you need to Offer, Vent, discard or move.”

The success condition is a simpler turn that still rewards decisions: spend plays to develop your field, use your deck's own resources to build combos, and keep useful cards for defense.
