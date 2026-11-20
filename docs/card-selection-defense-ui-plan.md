# Card Selection, Zone Search, and Defense UI Plan

Status: implemented in the game checkout. The implementation addendum below supersedes the original defense-mode proposal and timing descriptions.
Project: `C:\Code\codexlegend`
Prepared: 2026-09-14

## Implementation addendum — ordered battle responses (2026-09-14)

The latest user request replaces section 8's mutually exclusive defense modes with this sequence:

1. Declare each attack and settle its declaration triggers.
2. If the attacker has playable Forces, open **Before your attack: play Forces?**. Select multiple cards, edit their order with Earlier / Later, and confirm. **Continue attack** spends nothing and declines only this attack's window.
3. Resolve that ordered list, rechecking hand membership, Energy, and attack legality after effects settle. Cards that can no longer be played are not spent; the duel log explains the skipped card.
4. If the attack continues, open the defender's response window with playable Forces and legal Sentries. Only one Sentry may be selected. Existing Sentry targeting restrictions and card-specific costs remain in force.
5. Resolve the defender's chosen order. A successfully resolved Sentry nullifies immediately, before the attack check. Stop the queue; later cards remain in hand. This intentionally replaces the old deferred Sentry timing.
6. If the attack remains legal and no Sentry resolved, ask for blockers from the current hand. A Force used here contributes its Defense, without activating its skill. Already spent Forces cannot also block.
7. Continue with the Persona attack check and normal resolution. Equal attack Power still hits; Defense must be strictly greater. Defense previews explicitly warn that the check can change the outcome.

Selection and reordering are free. Confirmation commits the sequence, not a reservation of all its costs: actual effects can change resources or interrupt the attack. The dialog shows available Energy and total listed costs before skill gains, while the engine revalidates each payment. Choosing an unaffordable later Sentry does not suppress the blocker prompt.

### Implemented UI

- `src/ui/card-choice.ts`: shared UID-based choice dialog used by chooseCards, chooseTarget, battleCards, blockPrompt and Grave/zone browsing.
- Search only supplied candidates; type and level filters; original-order, name and Defense sorting. Sorting changes the display only. Grave browsing supplies newest-first candidates.
- Uniform tile dimensions, two-line name regions, centered cards with right-click / long-press inspection and hover hints. The side detail pane was removed at the user's request. Existing cardStrip tiles also have bounded name regions.
- Selected-card tray remains available when a filter hides the selected cards. Ordered responses expose Earlier / Later and Remove controls. Duplicate copies remain distinct by UID.
- Fixed action footer and separate scroll regions. Landscape phones use compact card rows and a Filters toggle. Portrait phones keep the card grid centered.
- **View board / Return to selection** preserves choices and leaves a blocking backdrop in place. It does not advance the engine or exit the match.
- Required choices cannot be dismissed accidentally with Escape. Escape shows the board; browse mode may close. Keyboard focus is contained and restored on completion; Inspection does not select; a touch scroll cancels long-press and a completed long-press suppresses the selection click.
- MatchSurface paints search values, selected filter values, and clipped text so saved video follows the new UI.
- Defense power refresh no longer consumes Lake Buluan's one-shot bonus. The final blocker calculation consumes it once and reuses that value for logging and resolution.

### Replay compatibility

Replay format is now 7 because immediate Sentry resolution changes the sequence of checks and choices. Existing format checks prevent older simulations from silently running under these different rules. No saved replay or video is deleted. Already captured videos retain their original sound and effects and remain independent of engine resimulation.

### Verification

Engine regressions cover attacker/defender windows, ordered multi-Force resolution, decline on repeated attacks, invalid IDs, interrupted attacks, Sentry position, remaining hand cards, and Energy revalidation. Existing full-match and replay tests exercise all three decks. Browser fixtures cover 1366×768, 1024×768, 844×390, 667×375 and 390×844 with actual card art, long names, filters, order changes, board viewing and reachable actions. Separate input checks cover weighted selections, selection caps, Details separation, required Escape behavior and keyboard trapping. MatchSurface rendering is inspected separately from native DOM screenshots.

The original sections below preserve the design rationale; where their description of current code or defense timing differs, this addendum is authoritative. No card skill balance changes, additional reaction loops, or networking protocol are introduced.

## 1. Objective

Make choosing a card easy to understand, safe to inspect before committing, and comfortable on desktop and landscape mobile. Deck search, Grave browsing, and defense should share one visual language. Long card names must never enlarge their tile or push other cards out of alignment.

Preserve existing card rules, costs, targeting restrictions, and the game's replay input format. This is a UI redesign, not a balance patch. If an apparent rule inconsistency is discovered, document and test it separately rather than changing it silently during styling work.

## 2. Findings from the current code

- `src/ui/main.ts: cardStrip()` builds generic `.pick` tiles with an image, full name in `.cap`, and a zone/role label. `.pick` has padding but no explicit width; only its image has a bounded width. Long captions can therefore determine the tile's intrinsic width.
- `HumanChooser.chooseTarget()` uses click-to-select followed by Confirm, with a generic Skip button.
- `HumanChooser.chooseCards()` supports exact counts, up-to counts, and weighted selections. These contracts must survive the redesign.
- `showZoneViewer()` renders Grave cards newest-first as a vertical list containing each card's complete rules. It does not share the selection layout and has no search/filter toolbar.
- `HumanChooser.defensePrompt()` stacks Sentry, blocker, and Force sections in one scrolling body.
- Sentry and blockers use a confirmation button. Clicking a Force in the skill section immediately returns `{ kind: 'force', uid }`; there is no equivalent selection review.
- The engine already permits a Force to be used for its skill during defense, then returns to the defense question with updated hand, Energy, and Power. A Force can also appear among blocker candidates. These are distinct actions, not interchangeable labels.
- `defenseMeter()` already calculates a live total. Preserve that logic and improve its presentation rather than implementing a second calculator.
- `src/ui/match-surface.ts` paints the visible/recorded match canvas. Native-browser appearance alone is insufficient: any new clipping, labels, selection states, and scrolling must also work on that surface.

The scope is the actual game checkout above, not the marketing-site checkout `C:\Code\codexlegendtcg`.

## 3. Non-negotiable interaction rules

1. Clicking a selectable card selects it. It does not spend Energy, reveal a Sentry, play a Force, or commit blockers.
2. Inspecting a card never changes the current selection.
3. All committed actions have a clear, action-specific confirmation button.
4. Cancel, Skip, Close, and Take the hit have different meanings. Never use them interchangeably.
5. Required choices cannot be escaped by closing the dialog. Looking at the board must not resolve or abandon a decision.
6. Only the engine supplies selectable instance IDs. UI filters can narrow that list, never widen it.
7. Defense must exceed Attack Power to stop the hit. Equality is still a hit.
8. A Force used as a blocker contributes its applicable Defense; that choice does not also activate its skill.
9. Activating a Force skill does not imply Sentry-like damage prevention. Describe the actual skill.
10. Full card names remain available. Do not rename catalogue entries, shorten rules text, or shrink fonts per card to disguise layout problems.

## 4. Shared dialog layout

Use a reusable card-choice shell with four regions:

```text
+-----------------------------------------------------------+
| Search your deck                         [View board]     |
| Choose 1 Level 2 or lower Unit to call.                    |
| [Find a card...] [Type] [Level] [Clear filters]             |
+----------------------------------+------------------------+
|                                  | Selected card          |
| Equal-size card grid             | Full name              |
| Scroll this region               | Card art and stats     |
|                                  | Complete skills        |
|                                  | Why it is eligible     |
+----------------------------------+------------------------+
| Selected: 1 / 1     [Selected card] [Cancel] [Call Unit]   |
+-----------------------------------------------------------+
```

### Layout behavior

- Desktop: bounded centered dialog, card grid plus approximately 280–320px details column.
- Initial sizing target: maximum width 1120px, width limited by viewport minus 24–32px, maximum height `calc(100dvh - 24px)`. Treat these as starting values to verify, not fixed dimensions for every screen.
- Use grid rows `auto minmax(0, 1fr) auto` for header, content, footer. Apply `min-height: 0` to nested grid/flex children.
- Keep the header and action footer outside the scrolling results region. Never let Confirm disappear below a long card list.
- Details may scroll independently on desktop. Avoid a third nested scrolling region inside rules text.
- On narrow screens, replace the permanent details column with an explicit Details view and a clear Back to cards control. Preserve grid scroll, filters, and selections when returning.
- At 844×390 and 667×375, use a near-fullscreen sheet with compact header and a persistent footer. Search/filter controls may expand on demand; selected count and action button must remain visible.
- Support portrait fallback with a single-column details view; do not force horizontal overflow simply because the game prefers landscape.
- View board temporarily collapses the decision into a small Return to selection control. Pause decision interaction with the board; do not allow an unrelated game action behind the pending chooser.
- Required decisions show View board, not a misleading Exit button. Zone browsers may show Close because they are informational.

## 5. Uniform card tiles and long-name policy

### Tile anatomy

Every tile uses the same reserved regions:

1. Artwork, preserving the asset's aspect ratio within a consistent frame.
2. Name: a reserved two-line area.
3. Compact stats appropriate to the task.
4. Optional role/status line: Deck, Grave, Selected, or defense contribution.

Selected checkmarks belong inside a reserved corner so they do not change layout. Hover should change color or emphasis without moving surrounding content.

### Sizing specification

Use a scoped grid and explicit column width. Example starting CSS:

```css
.card-choice-grid {
  --tile-width: 144px;
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--tile-width));
  justify-content: center;
  align-content: start;
  gap: 12px;
  min-width: 0;
}
.card-choice-tile {
  box-sizing: border-box;
  width: var(--tile-width);
  min-width: 0;
  display: grid;
  grid-template-rows: auto 2.8em auto auto;
}
.card-choice-art {
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: contain;
}
.card-choice-name {
  min-width: 0;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

Verify the frame ratio against existing art; `object-fit: contain` must preserve the complete image. The tile frame is not permission to stretch the card illustration.

- Start around 144px tile width on desktop and 108–120px on short mobile screens; validate readable text before finalizing.
- Every card in the same grid has the same bounding-box width and height, within a 1px rounding tolerance.
- Keep names left-aligned in selection grids for easier scanning. Use the same font size for short and long names.
- The details pane shows the full name without clamping. Its header may wrap; it must not change grid tile dimensions.
- A visible Details button or equivalent inspect affordance exposes the full name on touch. A browser title tooltip alone is insufficient.
- Preserve right-click/long-press inspection as shortcuts, not the only way to read a card.
- Grid containers and details columns use `min-width: 0`; grid tracks use `minmax(0, 1fr)` where flexible.
- Scope new styles to the reusable picker. Audit existing `.pick`, `.cap`, `.ability-opt .nm`, `.gallery-card-name`, and `.deck-card-name` before applying changes globally.
- Verify text clipping in `MatchSurface`; its text painter must not draw hidden third/fourth lines outside the reserved name region. Prefer explicit clip geometry if browser-only line clamp is not reproduced correctly.

## 6. Deck search and limited deck reveals

### Distinguish the operation

Do not treat these as one generic search:

- Search the deck for an eligible card.
- Look at the top N and choose from those cards.
- Reveal selected cards and choose an order.
- Choose a destination for a card already selected.

Examples of contextual copy:

- **Search your deck** — “Choose 1 Level 2 or lower Unit to call.”
- **Look at the top 5** — “Choose a Level 3 Unit to become your Persona.”
- **Choose the order** — “The first card in this list will be on top.”

### Search and filter behavior

- Case-insensitive name search; match both title and character-name fragments.
- Normalize diacritics for matching without changing displayed names.
- Provide type and level filters when relevant. Defense-value sorting is useful for defense, not a universal default.
- Show “Showing 6 of 14 eligible cards,” not a count suggesting access to the entire deck during a top-N reveal.
- Candidate eligibility stays visible as a short instruction. An empty filter result must offer Clear filters.
- No-result copy distinguishes “No matches for these filters” from “There are no eligible cards.”
- Sorting changes display order only. It must never mutate deck order, candidate order used by the engine, or replay answers.
- For top-N reveals, preserve revealed order by default. Disable sorting if order itself is the decision.
- Search only the permitted candidate set. Do not fetch/show other deck contents during a limited reveal.
- Empty candidate arrays must continue to resolve according to the existing engine contract without trapping the player in an empty required modal.

### Selected-card tray

- Keep selected cards visible in a compact footer tray even when filtered out of the grid.
- Show selected count and, for weighted costs, the contribution separately: “1 card selected · Offer value 2 / 2.”
- Exact N: enable confirm only when the required total is met.
- Up to N: permit the engine-supported zero-card result with an explicit label such as Continue without selecting.
- Prevent selections above the limit and explain why the next card cannot be added.
- Identify by instance UID, not card definition ID. Two copies of the same card remain separate selectable cards.
- If copy grouping is added later, it must expose individual copies and their state. Do not merge modified and unmodified instances.

## 7. Grave browsing and Grave selection

Use the same visual shell with separate modes.

### Browse mode

- Title: “Your Grave” or “Opponent’s Grave.”
- Default order: most recently added first, matching existing behavior.
- Search, type filter, and optional newest/name/level sorting.
- Click focuses the details pane; it never selects a card for an action.
- Footer: Close. No fake Confirm button.
- Full rules appear once in the focused details pane rather than expanding every grid tile.
- Show meaningful current-instance information if the engine tracks it, such as an applicable Offer condition; avoid unsupported labels inferred from flavour text.

### Selection mode

- Title names the operation: “Choose a Unit from your Grave.”
- Subtitle names destination and restrictions: “Choose 1 Unit to call to an open Ally Zone.”
- Default to legal candidates. If ineligible cards are displayed, they must come from a separately authorized visible-zone list and carry a clear reason; never infer hidden candidates.
- Confirm label: Call Unit, Return to hand, Exile selected, or another supplied action label.
- Show the next step: “After confirming, choose an Ally Zone.”
- Cancel must mean cancel this optional choice, not undo an already-paid cost. Display a short cost note where the engine has already committed payment.

## 8. Defense dialog: organize by action

Recommended modes:

**Block with cards | Reveal Sentry | Activate Force**

Use tabs or segmented buttons inside a single dialog. Each shows the current available count. An unavailable mode is disabled with an explanation. On very small screens use a compact action selector instead of squeezing unreadable tab text.

### Persistent combat summary

Always show:

- Attacking card and attacked card, with full names available through Details.
- Current Attack Power.
- Current base defense.
- Selected blocker contribution.
- Applicable first-blocker bonus or other engine-provided modifiers.
- Total preview defense and verdict.

Do not hardcode “your Persona” when defending an Ally. Persona and Ally defense currently use different controller paths; migrate both without granting Persona-only options to Ally attacks.

Example:

```text
Attack Power:             23,000
Your base defense:        11,000
Selected blockers:       +10,000
Total defense:            21,000

The hit would connect at these values.
Choose more defense, another action, or take the hit.
```

At equal values, show “Equal Power — the hit connects.” At higher defense, show “Defense holds at these values.” Until remaining checks/effects resolve, do not promise a guaranteed outcome. Mark this as a current-value preview and refresh it whenever the engine returns updated totals.

Reuse `defenseMeter()` or extract its pure calculation. Do not spend bonuses or invoke mutating combat functions to preview a selection.

### A. Block with cards

- Show engine-provided blocker candidates, including Force cards when eligible.
- On every tile, show the relevant defense contribution prominently: “Defense +5,000.” Do not present attacking Power as the blocker contribution.
- Multi-select; a second click removes that card.
- Selecting a Force here shows “Use as defense · skill will not activate.”
- Footer: “Block with 2 cards” plus the total preview, or a disabled Choose blockers button with no selections.
- Never hide a legal blocker because the UI assumed only Units can block. The present engine's candidate list is broader.
- Respect minimum Defense and maximum Unit level restrictions already supplied by the battle.

### B. Reveal Sentry

- Single-select Sentry candidates provided by the engine.
- Show actual cost, skill, and destination. Do not assume every future Sentry has identical rules or cost.
- Distinguish damage prevention from increasing the defense total. Replace the numerical blocker preview with a Sentry explanation while this mode is selected.
- Confirmation: “Reveal Sentry” with its known cost beside it.
- Selecting a Sentry clears staged blockers, with the change reflected visibly.
- A second click may deselect it; no action is committed until confirmation.

### C. Activate Force

- Single-select eligible Force skill candidates.
- The tile shows “Activate skill,” the applicable cost, and a short skill summary.
- Clicking only selects. This explicitly replaces today's immediate-commit behavior.
- Details show the full skill and any choices that occur next.
- Confirmation: “Activate Force · 2 Energy” under the current engine rules. Read cost from a shared engine constant or presentation descriptor; do not duplicate a literal in several UI files.
- Clarify: “Resolve this skill, then choose your defense again.”
- Once confirmed, close the defense chooser and allow the engine's Force-resolution prompts to run. Do not create a UI-side second copy of that resolution.
- The engine spends Energy, moves the Force, resolves effects, recalculates Power, and offers defense again. Render the new authoritative state when it returns.
- Clear old staged blockers and Sentry selection on reopening. Restore the previous display mode if still available, but never restore consumed card selections.
- Permit another legal Force activation if the engine offers one; do not artificially limit the defender to one.

### Force cards with two possible uses

A card instance may appear in both mode lists because the lists represent alternative actions. Make the mode label visible on every Force tile. A UID cannot simultaneously be queued as a blocker and a skill activation.

Switching modes clears the pending action selection. Search/filter preferences may survive mode changes, but no hidden commitment may survive them. Display “Selections cleared” briefly if the player had staged blockers before changing mode.

If a Force is legal as a blocker but cannot activate because Energy is insufficient, keep it available under Block with cards. If showing it under Activate Force for discoverability, use a separate read-only unavailable list with “Needs 2 Energy”; never append it to the engine's legal Force candidates.

### Take the hit

- A secondary action, visually separated from the primary confirmation.
- No generic Yes/No dialog for every attack.
- If cards are currently staged, the label should make their fate explicit: “Take hit · keep selected cards.” Those cards remain in hand because selection alone has no cost.
- Respect Sentry and Force outcomes already resolved. Taking the hit cannot undo a previously activated Force.
- Do not state that every hit breaks exactly one Barrier in every possible future mechanic. Show the consequence supplied by the current battle state.

## 9. State model and engine boundary

Suggested new modules:

- `src/ui/card-choice-dialog.ts`: bounded shell, focus management, footer, board peek.
- `src/ui/card-choice-grid.ts`: consistent tiles, inspect controls, UID selections.
- `src/ui/card-choice-model.ts`: pure filtering and exact/up-to/weighted selection rules.
- `src/ui/defense-dialog.ts`: defense action modes and confirmation state.
- `src/ui/defense-model.ts`: pure display calculations using engine-provided values.
- `src/ui/card-choice.css`, or clearly scoped sections in the existing stylesheet.

Suggested selection model:

```ts
type PendingDefense =
  | { mode: 'block'; selectedUids: string[] }
  | { mode: 'sentry'; selectedUid: string | null }
  | { mode: 'force'; selectedUid: string | null };
```

Use the existing `Chooser` result shapes unchanged:

```ts
{ kind: 'block', uids }
{ kind: 'sentry', uid }
{ kind: 'force', uid }
{ kind: 'take' }
```

Pass structured context from callers: operation, source zone, destination, optional/required, count, weights, target name, and available actions. Avoid parsing natural-language prompts to decide whether Skip is permitted or which rules apply.

A safe migration can introduce optional presentation metadata on chooser options while retaining compatible defaults for old callers, AI, and replay choosers. Never record filter text, focused tiles, or Details opens as game actions; only confirmed chooser answers belong in the gameplay recording.

Give every dialog a single guarded completion path. Disable confirm immediately when committing, dispose listeners, restore focus, and resolve its promise exactly once. Revalidate staged IDs against the current candidate set before returning an answer. The engine remains responsible for final legality.

## 10. Accessibility and input

- Real buttons or a well-defined selectable-grid pattern, not click-only divs.
- Keyboard navigation, visible focus, Space/Enter selection, and explicit confirmation.
- Selection state exposed with `aria-pressed` or the appropriate selected-grid semantics.
- A concise live announcement for selection count and changed defense verdict; do not read every grid item on every update.
- Full names in accessible labels even when visual captions are clamped.
- Focus stays within the current modal; closing Details returns to the inspected tile.
- Escape closes inspection first. It only cancels an optional game choice when that cancellation is legal.
- Right-click and long-press inspection suppress the selection click afterward.
- No automatic focus on the search input on mobile if it would immediately open the keyboard and obscure the cards.
- Use 44px minimum touch targets for controls, including filter reset, remove-selection buttons, and Details.
- Reduced motion keeps the same visible selection and verdict. Sound never carries the only indication of a choice.

## 11. Recording and performance

- Render real elements for selection badges, role labels, names, and defense totals. Do not rely solely on pseudo-elements or shadows that the shared painter cannot reproduce.
- Test scroll clipping, multiline names, and details-pane overflow on `MatchSurface`, not only the DOM.
- Grid images load at an appropriate thumbnail/board resolution; full artwork is reserved for inspection.
- Cache search-normalized text by definition; track selection by instance.
- Debounce search only if profiling demonstrates a need. A normal 50-card deck should respond directly.
- Start with a simple grid. Add virtualization only after measurement, and preserve keyboard focus and selected-card state if introduced.
- On the current 30fps recording path, target no sustained frame-budget overruns during scrolling or selection on the tested desktop. Record actual timings and hardware/browser context rather than claiming universal 60fps.
- No new screen-sharing permission or post-match rendering flow is introduced.

## 12. Implementation sequence

### Phase 1 — fixtures and baseline

Prepare deterministic fixtures for 0, 1, 5, 20, and 50 candidates; duplicates; long names; weighted Offer selection; exact/up-to selection; Persona and Ally defense; one Force legal in both modes; no playable Force due to Energy; Sentry plus blockers; and changed candidates after a Force resolves.

Capture current screenshots at 1366×768, 1024×768, 844×390, 667×375, and a portrait fallback. Establish the existing engine answers and card destinations.

### Phase 2 — stable tiles

Implement fixed tile geometry and full-name inspection. Migrate generic target/card selection and Grave browsing to those tiles without changing confirmation behavior yet. Validate equal dimensions and clipping before proceeding.

### Phase 3 — shared search shell

Add the bounded header/content/footer layout, candidate-only search, relevant filters, details pane, selected tray, optional/required copy, and board peek. Keep ordered deck decisions separate from sortable searches.

### Phase 4 — defense action modes

Build the single pending-action model. Add click-to-select/confirm for Force, preserve Sentry semantics, reuse the live defense calculation, and migrate both Persona and Ally defense paths. Verify reopening after Force resolution against fresh state.

### Phase 5 — input and rendering polish

Finish keyboard/touch inspection, focus restoration, selection announcements, portrait/short-height layouts, and shared-canvas compatibility. Add subtle existing SFX for select/confirm/cancel without overlapping the Force skill sound.

### Phase 6 — regression and handoff

Run targeted model/engine/replay tests, browser interaction tests, MP4 capture checks, and production build. Review a complete battle using each defense route. Supply screenshots, the test results, and any remaining limitations. Do not deploy or change game balance as part of this plan unless separately requested.

## 13. Required tests

### Model tests

- Exact, up-to, zero, maximum, and weighted selection counts.
- Two identical definitions with different UIDs can be selected separately.
- Filtering never loses a selected card or selects a hidden one.
- Sorting never mutates the input list or deck order.
- Switching defense modes clears incompatible staged selections.
- Force activation and blocking return different result variants for the same UID.
- Equal Attack/Defense predicts a hit; strictly greater defense predicts a hold.
- Defense bonuses are previewed without consuming them.
- Confirm is disabled while committing and cannot resolve twice.

### Engine integration tests

- Activate Force during defense, pay the existing cost, resolve its effect, then receive a fresh defense prompt.
- Activate two Forces when legal, then block with remaining cards.
- Use a Force as a blocker: its skill does not run and no activation cost is charged.
- Use Sentry: staged blockers are not consumed.
- Take the hit after staging blockers: staged cards stay in hand.
- Block restrictions and Persona/Ally differences remain intact.
- Cancelling a permitted target choice follows the existing paid-cost behavior.
- A recorded duel containing all defense result variants reproduces its final state.

### Browser and visual tests

- All tile dimensions remain equal with the longest actual catalogue names, at 100% and 125% zoom.
- No horizontal overflow; footer remains reachable on every target viewport.
- Full name and skills can be read with mouse, keyboard, and touch-style interaction.
- A first click on a Force does not change Energy, card zone, or game state.
- Scrolling and filtering preserve selections and focus sensibly.
- View board and Return to selection preserve the pending decision without enabling illegal background actions.
- An empty filtered list can be recovered with Clear filters.
- Selection markers, clipped names, and current totals appear correctly in the shared canvas and MP4.
- No uncaught browser errors, stuck chooser promises, duplicate dialogs, or input locks after closing inspection.

## 14. Completion checklist

- [ ] Long names never stretch card tiles.
- [ ] Full names remain accessible without hover-only interaction.
- [ ] Deck search, Grave browse, and Grave selection have clear distinct purposes.
- [ ] Search results contain only permitted cards.
- [ ] Selection and inspection never commit an action.
- [ ] Force skill activation and Force blocking are unmistakably different choices.
- [ ] Force activation returns to defense with refreshed values and candidates.
- [ ] Equal Power is consistently explained as a hit.
- [ ] Confirm, Take the hit, Close, and View board remain visible and correctly labeled.
- [ ] Desktop, short landscape mobile, portrait fallback, and 125% zoom are verified.
- [ ] Existing game rules and replay result shapes are preserved.
- [ ] Targeted tests, browser checks, recorded output, and production build pass.

## 15. Instruction to the implementing agent

Implement this in the actual game repository, beginning with the baseline fixtures and equal-sized tiles. Read the current code before editing because existing local changes include recent Codex and presentation work. Preserve those changes. Do not redesign card art, rename canonical cards, alter combat rules, or replace the replay/export system. Keep each phase reviewable and verify the reported viewport issues in the browser. Report what was implemented, what was tested, and any unfinished acceptance criteria honestly.
