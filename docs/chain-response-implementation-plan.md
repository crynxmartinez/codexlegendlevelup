# Codex Legends: alternating responses and locked LIFO chains

> Superseded for implementation by [the combined Energy-free and chain handoff](energy-free-chains-claude-implementation-plan.md), 2 October 2026. This earlier standalone plan is retained for history. Energy removal and chains now ship together; use the combined document and its U01–U20 sequence rather than this plan's Energy-era adapters and separate migration instructions.

Status: implementation plan only. No gameplay changes are made by this document.
Revision 2: the latest user clarification supersedes the earlier two-pass/self-chain design. One declined response closes the current chain; ordinary earned triggers wait until it finishes.
Prepared 2 October 2026 against game commit `0047874b1a8de9e34a44b314a25805639314eac5`.
Implementation repository: `C:/Code/codexlegend`, not the marketing repository.

## 1. Objective and priority

Implement this update before the broader gameplay-polish pass. Give players control over earned triggers, including all Last Oaths from one Offer payment, and allow the opposing player to respond before resolution. When the player offered the next response declines, lock and resolve the entire current chain in last-in, first-out order. Afterward, let owners choose their queued triggered effects to start subsequent chains individually.

This is the owner's custom timing system, inspired by Yu-Gi-Oh; do not replace it with Yu-Gi-Oh's simultaneous-trigger grouping, the previous two-consecutive-pass rule, or a stack that reopens priority after each resolved link. Activations alternate only when the responding player actually adds a response. A decline never returns a self-chain opportunity to the latest activator.

The [Energy-free rules plan](energy-free-rules-plan.md) remains a separate migration. This chain update must work with the rules actually implemented at the time of development. The audited checkout still uses Energy. Do not remove it, invent substitute costs, or quietly change play accounting as part of the chain refactor. Design the cost contract so the Energy component can subsequently be removed. After that migration, only normal calls and Action cards consume plays, as specified in that plan. This document takes precedence over older descriptions of immediate/nested trigger resolution, not over unrelated card rules.

Do not add music, cards, ranks, spectators, replay saving, a new renderer, or a UI framework. Preserve existing tutorial progress, card availability, private rooms and the 2D board.

## 2. Confirmed rules

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

## 3. Rules details to implement

The following defaults complete the agreed flow. They are design decisions for this update, not claims about existing behavior.

### 3.1 Response opportunities and pending-trigger selection

- A committed activation gives priority to the other player, including when its cost creates triggers owned by the activator.
- A response adds one link and transfers the response opportunity. A decline locks the chain, not a transfer. No consecutive-pass counter is needed.
- After the whole chain resolves, open a separate pending-trigger selector. This is not another response opportunity inside the finished chain.
- Proposed cross-player scheduling default: at each post-chain checkpoint, the turn player handles their pending occurrences first, then the opponent. Owners choose one at a time and may decline optional occurrences; after each chosen trigger's complete chain, recompute the same turn-player-first order. Do not interrupt a committed chain to enforce this ordering. Exercise both owners in tests and record long runs; never silently auto-resolve one owner's mandatory triggers. This cross-player default is a plan decision beyond the user's single-owner example.
- For an event without an activation (normal call, phase boundary, attack declaration), collect its ordinary triggers and use the pending-trigger selector. The event is not a fictitious link. Preserve separately defined non-chain battle/phase windows; a decline in an empty window closes only that defined opportunity, never creates a chain to resolve.
- An explicit battle response opportunity may start a new chain with a legal Force or Sentry. Once a card is committed, the normal single-decline rule applies. Finish the battle's required windows and triggered chains before proceeding to defense/checks.
- A responder with no legal response can be declined automatically by the controller, locking the current chain immediately. Queued Last Oaths must not keep that response window open. Do not claim publicly which hidden cards the responder lacks.
- Ordinary turn actions are unavailable while building/resolving a chain or settling the pending-trigger window. Existing surrender and inspection remain available.

### 3.2 Ready triggers, optionality and mandatory effects

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

### 3.3 Offer batches and event identity

Give each payment an event-batch ID. Validate every selected UID, ownership, zone and required Offer value before committing any movement. The payment, link registration and usage consumption become one atomic rules transaction, with no response callback between them.

Collect listeners from a pre-payment snapshot and evaluate the completed payment as a batch. Record before/after zones, physical UIDs, field-entry identities, counters and State transitions. Proposed simultaneous-departure policy: an Ally that leaves in the same payment can observe the other simultaneous departures if its skill watched them while it was on the field. Its own Last Oath uses its own departure record. Reevaluate State after the full payment; any State requirement for activation must still be satisfied when the skill is committed. Cover this explicitly rather than depending on selected-card order.

- One Last Oath occurrence per physical Offered card and matching skill.
- A surviving Salendagao can earn three separate occurrences from three other Offered Allies if Garahana and its requirements allow them. It does not earn an occurrence for itself.
- Preserve first-event-per-turn behavior: Crocodile-Form Apu gets one first-Offer opportunity from the first qualifying payment, not three because the batch has three cards.
- Snapshot the offered Ally's Power before it leaves when a cost refers to that Power, such as Maka-Ogis.
- Keep Offer value separate from physical card count. A card that pays two Offer value is still one card with one Last Oath occurrence. Preserve existing weighted counters deliberately; do not duplicate triggers from weights.
- Offer is not ordinary enemy damage. Prevent the current shared damage queue from issuing an unintended second Last Oath or inappropriate damage trigger.
- Last-known identity must survive token removal and source movement without accessing a deleted instance.
- Calls, Essence, Vent, draws and State changes need the same event identity/deduplication discipline. Reuse the existing multi-card Vent event where appropriate.

### 3.4 Activation, payment and cancellation

Use explicit stages: prepare inputs -> validate -> commit cost and link -> offer responses -> resolve -> clean up.

- Preparing or inspecting an activation does not spend anything, reveal deck contents, advance RNG, consume a play, reserve permanent usage, or produce triggers.
- Confirm all cost choices in one transaction. A cancelled draft leaves rules state unchanged and returns to the same priority opportunity without counting as a pass.
- If preparation needs the post-cost board (e.g. reviving the Ally being Offered), use a projected payment state for validation. Do not pay first and then offer a misleading Cancel button.
- Hidden top-deck payment is executed only after commitment; it must not become a free preview.
- After commitment, the cost remains paid if a response negates the effect or removes its target. No refunds or normal undo.
- Usage limits are consumed on commitment. Use stable skill IDs, card UIDs/definition IDs as required by the printed limit, owner and turn; never key new usage data by mutable rules prose.
- Existing resource replacements must go through the same validated payment pipeline.
- Effect-generated resource gains cannot fund the cost of a later response in the same chain: no effect has resolved yet. UI availability must reflect this.

### 3.5 Targets, source movement and multi-clause effects

Every migrated ability must declare which inputs are activation targets and which are choices during resolution.

- Choose explicit public field/Grave targets at activation, before the response opportunity. Store UID and relevant zone-entry identity so leave-and-return cannot silently become the same target.
- Deck searches, top-card inspections, random outcomes, cards drawn then discarded, and choices concerning newly created objects stay inside resolution. Do not reveal them in the activation preview.
- Source removal alone does not negate an activated effect. Use the stored effect identity, event and paid-cost data. If the effect specifically needs the source on the field, recheck that requirement for the applicable clause.
- If a target is invalid at resolution, do not auto-retarget. Apply the card's defined partial-resolution/dependency policy and record the outcome.
- Independent clauses may still resolve. Dependent clauses such as an effect requiring a successful call need explicit success checks. Define this per card, not one global 'missing target cancels everything' rule.
- Historical trigger facts remain historical. Current resource, target, State and zone requirements are validated at commitment; recheck only explicitly resolution-dependent requirements later.
- A ready Last Oath uses its earned event even though its source already left the Ally Zone. A Grave self-revival such as Apu still needs its source in Grave when activation/resolution requires moving it. Document source-zone policy per skill.
- For existing Last Oaths with a free +3000 and an optional Energy-paid follow-up, retain that optional internal payment during resolution in the Energy-based release. It is a clause of the same effect, not a second activation. No response opens between the bonus and follow-up. Do not silently move that payment upfront and change its interaction with resources/targets. If the Energy-free migration has already replaced this clause, follow that audited replacement instead.
- Payment events created inside resolution only generate deferred triggers. They cannot recursively resolve new skills.

### 3.6 Negation and attack cancellation

Keep outcomes distinct: effect negated, target unavailable, partially resolved, attack cancelled and source removed.

The engine should support negating a specific committed link only when an actual card permits it. Do not invent a negate effect for existing cards or make all responses counterspells. Responses can instead buff, call, remove, exhaust or alter a legal target.

A Sentry spends the physical card once at commitment, with the current required resource cost. Its attack-stopping effect and printed bonus resolve as its link. If that link is negated by a future legal effect, payment remains spent and it does not stop the attack. Preserve the three Sentries' individual bonuses. Fix Bituon's missing consumption through the shared contract, as already identified in the Energy plan; do not let old scripts consume it twice.

Cancelling an attack stops later defense/check/damage steps for that attack. It does not erase committed links. Independent clauses still resolve; battle-specific clauses whose battle no longer exists follow their explicit policy. Charge, attacker removal, target removal, support changes and Personification must each revalidate the stored battle context after chains finish.

### 3.7 Timing permissions and response candidates

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

Preserve normal-call and Action play rules from the active rules version. Do not charge an extra play merely for adding a link. Preserve the existing Force play-accounting behavior until the separate Energy/play migration replaces it.

### 3.8 Resolution and deferred chains

- Lock a snapshot of link order when the current responder declines (or has no legal response). Resolve from highest link number to lowest with no response callbacks.
- Still allow the resolver's required chooser calls, including opponent-owned choices; these cannot activate other skills.
- Append newly earned trigger occurrences to a deferred pool with causal chain/link IDs. Do not resolve them through existing nested flush helpers.
- Complete all links, then open the pending-trigger selector for still-valid queued occurrences from costs and resolutions. Existing unused sibling triggers survive chain lock and are shown alongside newly earned ordinary triggers. Choosing one creates a fresh chain ID, starting at Link 1.
- Reevaluate continuous rules and win conditions at the engine's legitimate rule boundaries. If a match ends, stop remaining play and label remaining links as not resolved because the match ended. This is not an invitation to respond mid-chain.
- A visual failure must not change effect outcome. A rules failure must not be swallowed as a successful resolution; surface a recoverable error/abort path without awarding an invented winner.

## 4. Architecture and migration

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

## 5. Card migration coverage

Create a machine-checkable manifest from the loaded catalogue and combined script registry, not just JSON art records. The Energy audit recorded 141 selectable cards at this source snapshot; recompute rather than hardcode that count. Track every ability, Action, Force mode, Sentry, Codex rule and granted skill, including passive entries that do not start chains.

Required manifest fields: card/skill IDs, displayed name, kind, timing, mandatory/optional, trigger batch semantics, payment, activation targets, resolution choices, source persistence, target failure, State/usage rules, generated triggers, source file, migration status and focused test. Missing active entries must fail a coverage check. Full card text and runtime behavior must agree.

### Mindanao priority cases

| Card/group | Migration requirement |
|---|---|
| Sulayman, Indarapatra, Pah, Gurayn Offer-3 skills | Main link committed before responses; cost triggers queued together; original effect resolves after its response links but BEFORE the cost-generated Last Oaths |
| Potri Rainalaut, Tomitay, Kurita, Tarabusaw | Other Offer costs and before/after-attack timing; no recursive `settle` resolution |
| Maka-Ogis | Record offered Ally's Power at payment; add that stored value for the proper battle |
| Pahira | Queued post-chain Last Oath; top-five inspection and selection only on resolution; bottom order once |
| Lanao Sprite | Keep optionality, current activation cost and opponent-turn expiry |
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

No claim is made that the new timing is already balanced. Recheck each region's ability to recover resources and use once-per-turn abilities after changing the resolution order, and repeat that balance review after Energy removal.

## 6. Battle and phase integration

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

## 7. Player interface

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

## 8. PvP, AI and tutorial requirements

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

## 9. Ordered implementation tasks

Each task is a focused slice. Keep older PvP validation notes intact. The active checklist is appended to `tasks/todo.md`. Proposed test/module paths below are new unless already present. If a slice grows past about five files, split it at its stated contract boundary rather than hiding broad changes in one patch.

### T01 — Rules fixtures and migration manifest (M)
Dependencies: none. Files: this plan, new manifest under `docs/`, `src/core/chain.test.ts`, a fixture helper.
Acceptance: encode the exact Offer-3 transcript; classify active card/skill coverage; explicitly list any card-specific timing changes before implementing them.
Verification: tests describing wrong passes/order/deferred triggers fail against a missing chain implementation for meaningful reasons; baseline suite results recorded without claiming older notes are current.

### T02 — Pure chain state machine (M)
Dependencies: T01. Files: `src/core/chain.ts`, its tests, `types.ts`.
Acceptance: activation transfers the response opportunity; one decline locks immediately; resolution cursor runs backward with no response transitions until complete. Separate pending-trigger selection starts a new chain and retains unused siblings. Mandatory queued triggers do not block a response decline, but prevent finishing their later selector while eligible.
Verification: deterministic transition tests and property-style invariants over scripted decisions; no DOM dependency.

### T03 — Activation and cost transaction (M)
Dependencies: T02. Files: `activation.ts`, tests, `cards/types.ts`, `core/effects.ts`, `core/game.ts`.
Acceptance: draft is mutation-free; atomic commit consumes resources/usage once; resolver receives stored targets and cost snapshots with no repayment.
Verification: cancellation, invalid weighted payment, last-moment stale inputs, source consumption, hidden-deck payment and no-refund tests; build.

### T04 — Offer batch collection (M)
Dependencies: T03. Files: `trigger-collection.ts`, tests, `effects.ts`, `game.ts`.
Acceptance: all three departures produce one queued occurrence set; no ordinary cost trigger appears in its parent chain's response candidates; correct observer multiplicity/first-Offer behavior; no duplicate damage/Offer events.
Verification: change selected-card order and prove the same occurrence set; test Salendagao, Apu, weighted Offer and a simultaneous departing observer.

### T05 — First complete Mindanao skill slice (M)
Dependencies: T04. Files: `maguindanao-set-1.ts`, its tests, activation/collection integration tests.
Acceptance: one actual Offer-3 Persona skill and three actual Last Oaths follow all three walkthrough branches. The parent resolves after its responses and before its Last Oaths; each chosen Last Oath starts a fresh chain, and unused siblings survive until selected, explicitly declined or validly invalidated.
Verification: semantic traces assert costs and game state before/after each link, not merely prompt counts or no crash.

Checkpoint A: the headless real-card flow works; no nested resolver calls or duplicate costs. Do not start visual flourishes before this passes.

### T06 — Priority decision transport (M)
Dependencies: T05. Files: `effects.ts` Chooser, `pvp/decisions.ts`, its tests, `ui/main.ts` chooser adapter, test chooser helper.
Acceptance: typed candidate IDs and owned decisions; draft cancellation retains priority; existing resolution choices remain distinct.
Verification: wrong-owner, duplicate, stale and wrong-decision-kind answers; mandatory pending-window completion rejection versus legal response decline; inspection-only behavior; typecheck.

### T07 — Response panel (M)
Dependencies: T06. Files: `ui/chain-panel.ts`, its CSS/test fixture, `duel-panel.ts`, `ui/main.ts` integration.
Acceptance: legal responses and separate post-chain trigger selector are clear; waiting triggers are noninteractive during a chain; single-decline consequence and resolution order are explicit; horizontal layout and no accidental activation from inspection.
Verification: desktop/phone fixtures, long names, multi-skill card, repeated occurrences, focus/minimize/restore and double-click tests.

### T08 — Link presentation and record (M)
Dependencies: T07. Files: `core/events.ts`, `ui/effect-sequence.ts`, `ui/timeline.ts`, presentation integration, focused tests.
Acceptance: costs precede responses; each link's source/target/outcome displayed in reverse order; Last record retains full chain causality.
Verification: scripted four-link chain containing explicitly legal responses at Learning/Standard/Fast and reduced motion reaches identical state; post-chain Last Oath selection follows; no duplicated announcements or stuck Continue.

### T09 — Remaining Mindanao Units (M per subgroup)
Dependencies: T05. Split into T09a Personas, T09b Last Oaths/observers/Grave skills. Files per subgroup: `maguindanao-set-1.ts`, matching tests, manifest, skill-text source if required.
Acceptance: every named case in section 5 covered; historical values and zone/usage limits correct; optional follow-up clauses preserved.
Verification: actual-card tests for source removal, target loss, Garahana transitions, repeated Offers and end-turn expiry.

### T10 — Mindanao Actions and Codex (M per subgroup)
Dependencies: T09. Split Actions/granted skills and Codex/replacements. Files per subgroup: same script, corresponding tests, manifest and text source.
Acceptance: no immediate hidden effects in preparation hooks; replacements remain atomic; all active entries classified.
Verification: Mantapuli payment/draw ordering, granted Last Oaths, multiple calls before placement triggers, once-per-turn Codex and State transitions.

### T11 — Force and Sentry adapters (M)
Dependencies: T06. Files: `game.ts`, card type contract, common adapter, Force/Sentry tests.
Acceptance: one activation per response; physical cards consumed once; Force timing preserved; Sentry cancels only on resolution and retains bonuses.
Verification: all 12 active Force hand skills/check modes and three Sentries; negated-link fixture, cost refund rejection and repeated use rejection. Split per-card fixes into follow-up sub-slices if needed.

### T12 — Battle and check integration (M)
Dependencies: T11, T10. Files: battle paths in `game.ts`, core battle tests, lesson integration tests.
Acceptance: shared windows replace ordered-batch execution; defense follows surviving attack; no extra broad response window during check/damage.
Verification: attacker/target removed, Sentry response, support removal, charge/re-attack, multiple checks, skipped check, ties, attack-hit/miss/resolved and barrier effects.

Checkpoint B: Mindanao real-game path and complete battle path work. Run cross-region games before claiming the feature is ready.

### T13 — Visayas and Luzon migration (M per subgroup)
Dependencies: T10–T12. Split by region and Units versus Actions/Codex. Files per slice: region script, focused tests, manifest, authoritative text source.
Acceptance: all reachable effects use the same collection/resolution contract; Vent/Essence/Sipol triggers defer correctly; continuous effects stay out of chains.
Verification: multiple Vented skills, Amara, token creation, multi-call placement triggers, on-check effects and complete card-coverage check.

### T14 — AI priority policy (M)
Dependencies: T13. Files: AI chooser/policy, AI chain tests, simulation helper.
Acceptance: legal responses and meaningful single-decline locks; ordinary triggers chosen only after the chain; no hidden information; no undefined chooser methods.
Verification: deterministic four-link and empty-window policies plus complete games for all region/mirror pairings; record chain/turn distributions and failures.

### T15 — PvP views and recovery (M)
Dependencies: T08, T13. Files: `pvp/session.ts`, `view.ts`, `client.ts`, matching session/view tests.
Acceptance: public chain/private candidates correctly projected to each seat; reconnect retains exact decision; normal actions rejected while a chain is active.
Verification: two actual clients, wrong-seat responses, repeated messages, reconnect during payment draft/building/resolution selection and between sibling Last Oath chains; hidden-information assertions and both players agreeing on final state.

### T16 — Online presentation parity (M)
Dependencies: T15. Files: `ui/remote-presentation.ts`, chain UI integration, pacing tests and browser fixtures.
Acceptance: server events drive display; no stale cue covers a newer decision; speed/hidden-tab changes never alter priority or submit answers.
Verification: different speeds on each client, tab hide/return, resize, minimized response panel and duplicate frames.

### T17 — Tutorials and rules documentation (M per lesson slice)
Dependencies: T14–T16. Files: lessons/session files, lesson tests, game rules and card-guide corrections.
Acceptance: advanced chain lessons use real rules; First Battle still completes; inaccurate immediate-resolution wording removed.
Verification: scripted route, alternative free-choice route, resume/restart, desktop/portrait/landscape and no progress reset.

### T18 — Release verification and deployment preparation (M)
Dependencies: all above. Files: `pvp/catalog.ts`, existing server sync tool outputs, release notes, task checklist.
Acceptance: matched protocol/content versions, full manifest coverage, production build and both game's server regression evidence. Record unresolved balance/device limits honestly.
Verification: full game suite, browser matrix, complete two-client matches, generated shared-server build/tests and version mismatch test. Prepare dev log and coordinated rollback instructions. Commit/push/deploy only when subsequently requested; this request is for a plan.

## 10. Required verification matrix

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

## 11. Risks and release gates

- Cost and effect are currently interleaved in many scripts. Shipping a UI-only chain would misrepresent what already happened; block release until activation is genuinely deferred.
- Existing nested `settle` calls must stop resolving triggers during a link. Failing to migrate one path can duplicate effects or break LIFO order.
- Reverse response order and post-chain trigger timing change strategic outcomes. The main skill may now call Allies before its cost-generated Last Oaths buff them; conversely, it cannot benefit from those Last Oaths before resolving. Explain and test these outcomes rather than secretly rearranging links.
- Negating the main effect does not undo its paid Offers or erase earned Last Oaths. They still enter the post-chain selector, subject to their actual source, State and activation requirements.
- Removing Energy afterward increases response availability and loop risk. Repeat balance and loop tests after that migration; do not claim this pass proves Energy-free balance.
- Some cards currently have no legal opponent-Main response. The UI should auto-pass correctly, not manufacture permissions for the sake of showing a response modal.
- Prompt preferences, animations and offline hooks must not own rules priority. One source of truth is required for local and online games.
- All clients and the shared match server need the same chain/content version. Existing live rooms must finish on their original version or be handled with the existing announced maintenance process; do not reinterpret in-progress games after deployment.
- This remains the existing private-PvP architecture: room state does not survive a server restart. Do not market reconnect as restart recovery.

Release is complete only when the owner's Offer-3 flow, all active card classifications, locked resolution, hidden-information rules and local/online/tutorial paths are verified. No new music or broad visual redesign is part of acceptance.

## 12. Implementation handoff

Read this plan, the Energy-free plan, existing release notes and current source before editing. Verify the active commit and whether Energy migration has happened since this audit. Implement in the listed slices, keeping the engine authoritative and the UI a representation of committed rules state. Preserve existing work and do not check off historical PvP tasks without their missing evidence. Do not stop after fixing only Offer ordering: the requested update includes the shared response flow, all affected cards, AI, tutorials and PvP. Do not claim completion from mock UI alone.
