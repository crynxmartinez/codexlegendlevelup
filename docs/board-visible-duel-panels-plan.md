# Board-visible duel panels

Status: implemented locally; validation recorded below.
Date: 2026-09-15
Reference: the compact card-selection panel in the user's supplied Master Duel screenshot. This plan uses its visible layout as inspiration; it does not assume anything about that game's internal implementation.

## Latest user clarification — floating overlay

The panel floats above the game, including above the hand cards, just as in the supplied reference. Do not reserve space, shrink the battlefield, or move the hand/HUD when it opens. Minimize reveals everything below. Keep the compact panel centered toward the bottom on desktop and landscape phones.

## Outcome

Players should be able to choose cards while reading the battlefield. Normal duel decisions use a compact panel, small recognizable card art, and one clear confirmation. The battlefield stays sharp. Inspecting a card remains available through right-click, long-press, or keyboard.

Keep the game's existing 2D board and assets. This changes the decision interface, not the title screen, game rules, card balance, or theme.

## Problems found before implementation

- `src/ui/style.css`: `.modal-bg` applies an 86%-opaque dark background and `backdrop-filter: blur(3px)`.
- `.cc-peeking` clears the background but does not clear that inherited backdrop filter. This explains the blurred View Board screen.
- The older `.modal-bg.minimised` explicitly removes its backdrop filter. The two minimization paths behave differently.
- `.cc-dialog` requests up to 1120px width and 820px height, bounded only by a 24px viewport margin. A small choice therefore occupies almost the entire screen.
- The picker retains a full-screen interaction surface while peeking. Simply removing the visible panel does not make board inspection work consistently.
- Normal prompts and card choices use separate implementations: `modal()` in `main.ts` and `openCardChoice()` in `card-choice.ts`.
- There are accumulated and overridden picker CSS rules. New layout rules should replace the affected rules in one maintained section rather than adding another override layer.
- Existing selection features are valuable: exact-count Vent, click-to-deselect, independent card identities, ordered choices, fixed action buttons, and pile-only filters. Preserve them.

## 1. Clear board and consistent minimize behavior

For duel decision panels, use no full-screen blur in any state: compact, expanded, inspecting, or minimized. Keep the panel itself opaque enough to read, with a restrained border and shadow.

In compact mode, use no global dark veil. Distinguish the active panel through its border, header, and source/target highlights. Background gameplay actions are locked through explicit input handling, not visual blur.

Rename **View board** to **Minimize**. Its action is literal: collapse the panel to a small tab such as **Vent 6 · 4/6 selected · Return to selection**.

- Preserve selected UIDs, ordering, filters, scroll position, and pending decision.
- Show no remaining dark or blurred backdrop.
- Keep the tab away from the hand and turn controls.
- Restoring returns to the same selection, not a new prompt.
- Escape minimizes; a second Escape restores. It never silently skips a required choice.
- Use the same behavior for both existing prompt families.
- Distinguish **Cancel Vent**, **Skip effect**, **Continue attack**, **Close**, and **Minimize**. They have different consequences and must not share an ambiguous Exit button.

## 2. Compact panel layout

Use three persistent rows:

1. Header: short action title, selected/required count, Expand, and Minimize.
2. Content: one horizontal row of small card tiles; scroll or swipe when necessary.
3. Footer: the legal decline action, if any, and one prominent confirmation button.

Example:

```text
Vent 6                         4 / 6 selected    Expand    Minimize

   [card]  [card]  [card]  [card]  [card]  [card]   →

Cancel Vent                                  Vent selected cards
```

Default desktop target: approximately 640–860px wide and 240–300px tall. These are starting dimensions, not hard constraints. Use content size and available board space. One or two cards should not leave a giant empty gallery.

- Desktop card art: roughly 84–104px wide, retaining its original aspect ratio.
- Bound names to two lines with consistent tile heights. Full names and text are available in inspection.
- Keep only information needed for the decision: Defense when blocking, a sequence number when ordering, and selection state when paying a cost.
- Use a short action sentence instead of repeated instructional paragraphs. Inspection hints appear on the hovered/focused card.
- Selection has a clear outline and check mark. Ordered choices use numbered badges.
- Keep Confirm visible even while the cards scroll; disabled until the exact requirement is satisfied.
- Use a visible partial next card and scroll affordance so the row does not look complete when more cards exist. Provide keyboard scrolling and touch swipe.

## 3. Floating placement above the battlefield

The compact panel floats at the lower center above all game elements, including the hand. The board, hand, and HUD retain their normal size and position. A panel can cover cards underneath; Minimize reveals them immediately without blur.

- Keep one stable position while selecting cards.
- The panel and its confirmation buttons must stay above the HUD and hand.
- Keep the surrounding board sharp and inspectable. Minimize before inspecting covered cards.
- Constrain the panel to the viewport; scroll its content rather than the page.
- Use the same lower-center overlay on landscape phones; do not introduce a side dock.
- Preserve responsive board structure when the viewport changes, without reserving panel space.

An expanded pile browser necessarily covers more space. On a small phone, the whole board and a useful card gallery cannot both remain readable at once. Preserve access through Minimize instead of shrinking everything beyond recognition.

## 4. Expanded mode for large piles

Compact is the default for small choices. Deck, Grave, Heart, and Exile can offer **Expand** for a larger grid with search and filters.

- Expand keeps the same pending choice and selections.
- Show filters only when candidates come from Deck, Grave, Heart, or Exile, matching the existing rule.
- Keep filters behind a Filters control in compact mode. Large browsers may show them directly.
- Search and sorting affect presentation only; they never change selection or resolution order.
- Keep the selected count visible when selected cards are filtered out; offer a Selected filter rather than a redundant Remove list.
- Required choices never gain a Close action that bypasses payment.
- A read-only pile browser may close normally.

## 5. Apply the layout according to the decision

| Decision | Presentation | Preserve |
| --- | --- | --- |
| Vent / Offer / discard | Compact multi-select | Exact costs, weighted Offer, one confirmation, atomic cancellation |
| Choose a board target | Small instruction panel and highlighted legal field targets | Selection preview and explicit confirmation; clear attacker/source context |
| Search Deck / Grave / Heart / Exile | Compact row with expanded grid available | Legal candidate filtering and hidden-information rules |
| Attack Force window | Compact ordered card selection | Multiple Forces, click order, numbered badges, one confirmation |
| Defender Force / Sentry window | Same ordered selection | Existing Sentry limit and attack interruption rules |
| Ordinary defense | Compact card row plus concise Power/Defense readout | Force-as-blocker does not activate its skill; ties hit; check may change result |
| Simultaneous triggered skills | Small source cards with short effect summaries | Player chooses which skill resolves next; remaining skills are revalidated |
| Bottom/top deck order | Numbered multi-selection | Arrange the entire requested group, then confirm once |
| Codex choice | Small row | No pile search/filter toolbar |
| Check / battle result | Brief result panel with relevant card and effect animation | The established tutorial pauses and Continue controls |

Do not replace ability descriptions with art alone. A card can have more than one skill; its current skill and cost must remain identifiable. Retain the existing skill-type and state markers.

Do not precommit all triggered skills into a fixed sequence: an earlier skill can change later eligibility or targets. Continue asking which eligible skill resolves next, inside the same panel shell.

## 6. Board inspection without accidental actions

While a choice is pending, permit inspection of public field cards, the player's own hand, and legally inspectable piles. Right-click, long-press, and keyboard inspection should work with both compact and minimized panels.

- Do not expose opponent hand, deck identities, or face-down information.
- Do not permit unrelated attacks, card plays, phase changes, or shortcuts to mutate the game.
- Allow field selection only when the active decision explicitly expects that target.
- Returning from card inspection restores the pending panel state and keyboard focus.
- Opening a read-only pile view suspends the current panel presentation; it does not open a second unresolved game decision.
- Gate game commands centrally as well as at visible controls. Existing `busy` handling must be checked at every action entry point; CSS pointer events alone are not sufficient.

Use a modeless accessible dialog for the compact inspectable-board layout, with sensible keyboard access to inspection and the restore tab. Use modal semantics only for genuinely blocking expanded views. Closing an inspection returns focus to its source. Touch scrolling must not select cards or trigger long-press accidentally.

## 7. Motion and effect readability

- Use roughly 160–220ms slide/fade transitions when opening, expanding, or minimizing.
- Keep the shell stable as a sequence of related choices advances. Update the action title and cards without a full-screen flash.
- Avoid repeated entrance sounds on every selection toggle.
- Show the effect source with a border glow or lift; highlight its legal targets and destination zone.
- After confirmation, leave the field unobstructed enough to see movement. Finish the relevant animation before showing the next decision.
- For Vent 6: select six → confirm once → show the full Vent payment → show eligible triggered skills → resolve the selected skill visibly → offer the remaining skills.
- Reuse existing animation speed and reduced-motion preferences.
- Avoid stacked dark overlays when a skill, inspection, tutorial, and card picker interact.

## 8. Implementation sequence

### Step A: minimize defect

Explicitly clear both standard and WebKit backdrop filtering for a minimized chooser. Verify there are no additional active overlay layers causing blur. Unify minimize/restore semantics while preserving pending promises and selections.

### Step B: shared presentation shell

Create a shared duel decision panel module with compact, expanded, and minimized states. Keep selection rules and engine callbacks separate from layout. Migrate `openCardChoice()` first; do not rewrite card scripts to change the visual layout.

Suggested files:

- `src/ui/duel-panel.ts`: panel lifecycle, placement, expand/minimize, focus restoration.
- `src/ui/card-choice.ts`: existing UID selection, filters, counts, and ordering rendered into that shell.
- `src/ui/main.ts`: migrate duel `modal()` call sites; inspection access and command gating.
- `src/ui/duel-panel.css`: maintain panel styles and responsive geometry, imported by `style.css`.

### Step C: board-aware placement

Place the panel above the unchanged board and hand. Check that opening a panel does not change the board rectangle. Validate Minimize and inspection, and keep actions within the viewport. Test compact selection before migrating every prompt family.

### Step D: battle and trigger windows

Migrate attack Forces, defense responses, blockers, trigger order, and Codex choice. Preserve the current flow and revalidation rules. Then adapt checks and result presentations where the smaller layout remains clear.

### Step E: tutorials and accessibility

Update tutorial highlight targets and callout placement for the new panel geometry. Verify minimize does not exit a lesson or mark a step complete. Check keyboard inspection, focus restoration, touch scroll, and reduced motion.

## 9. Acceptance checks

Use the actual rendered game, not only isolated HTML, for final sign-off. Isolated picker fixtures can establish selection behavior first.

Viewports: 1920×1080, 1366×768, 1024×768, 844×390, 667×375, and 390×844.

1. Expanded, compact, and minimized decision panels never blur the board.
2. Minimize leaves only the restore tab, with no invisible inspection-blocking backdrop.
3. Required controls remain visible; the entire page never needs scrolling to confirm.
4. Opening a panel leaves the board geometry unchanged. Minimize exposes all covered cards and the active battle context.
5. Long names and many identical copies do not change tile size or confuse UID selection.
6. Vent 6 can select six once, cancel without spending, and resolve Vented skills in a player-chosen order.
7. Weighted Offer, ordered bottoming, multi-Force responses, and Sentry interruption retain their tested behavior.
8. Filtering, resizing, inspection, expansion, and minimization never reset a selection or its order.
9. Blocker preview remains accurate and does not consume game resources; equal attack Power still hits.
10. While inspecting the board, unrelated clicks and keyboard shortcuts cannot advance or mutate the match.
11. Essence/Vent flights, attack highlights, and tutorial arrows use the new visible zone positions.
12. No duplicate decisions, unresolved promises, orphan restore tabs, stale highlights, or focus traps remain after completion.
13. Engine regressions, production build, and browser checks pass. Report any existing unrelated failures separately.

## Scope guard

This document is the plan for a duel-interface change. Do not redesign the dashboard, introduce 3D scenery, alter skills, restore replay saving, or discard the existing uncommitted Essence/Vent work as part of this implementation.

## Implementation and validation — 2026-09-15

- Shared floating shell now serves card choices and in-duel prompts. Title/setup dialogs keep their existing presentation.
- Compact horizontal card rows, expanded pile browsing, UID-based selection, ordered badges, and fixed confirmation controls are implemented.
- Minimize/restore preserves the decision and selected cards. Nested pile browsing suspends the parent and restores it afterward.
- The board stays transparent behind the panel with no backdrop blur. Unrelated gameplay commands are blocked while inspection and explicitly permitted pile browsing remain available.
- Field-target choices highlight legal cards and permit selection on the board. Existing right-click, keyboard inspection, and long-press handlers remain in place.
- Opening a panel at 1366×768 left the board rectangle exactly unchanged: 1366×660.484375 at (0,0). The panel floated over the normal lower board and hand.
- Real Lesson 4 verification: Force response → blocker selection → minimize and inspect Persona → restore selection → confirm blocker → attack check → Defended result → Continue. The chosen block produced 16,000 Defense against 11,000 Attack Power.
- The final six-card defense row fit without horizontal or vertical overflow at 1366×768. Landscape game layout was also checked at 844×390.
- `tests/browser/duel-panels.html`: all 23 interaction checks passed at each of 1920×1080, 1366×768, 1024×768, 844×390, 667×375, and 390×844. These cover exact Vent payment, cancellation, weights, ordering, Sentry selection, filters, nested browsing, minimize/restore, command gating, field selection, and cleanup.
- 144 focused tests passed: `card-choice.test.ts` (14), `babaylan-set-1.test.ts` (75), `heart-fx.test.ts` (19), `codex-integration.test.ts` (18), `heart-motion.test.ts` (2), and `force-battle.test.ts` (16).
- `npm run build` passed. Vite still reports the existing large-bundle warning. `git diff --check` passed.

Responsive browser tests are not a physical-touch-device test. This change has been validated locally and has not been pushed or deployed. Existing unrelated uncommitted Essence/Vent work remains preserved.

## Follow-up fixes — payment, checks, defense, and casting

The user's five follow-up screenshots exposed inherited modal spacing and oversized single-card artwork. The older generic modal body selector also overrode the new presentation styles.

- Energy confirmation now presents the effect, a cost badge, the current balance and balance after payment, plus **Pay N Energy** and **Skip**. A short confirmation has no Expand button. The card script still owns payment and resolution.
- Attack checks, Barrier checks, Defended, and Defense broken use artwork that fits the viewport. Outcome text sits beside the card, with the complete shatter canvas visible. Short phones allow enough panel height for the Continue button. Compact and expanded layouts both retain inspection and Minimize.
- Normal blockers are restricted in `GameController.askForBlockers()` to Units and Forces. Sentries and Actions cannot enter that list, including through a forged chooser result. The existing Force/Sentry response window still runs first, followed by normal blocking only if the attack remains active. Force/Sentry eligibility continues to respect Energy, card skills, and legal targets.
- Clicking a playable Action in hand opens a preview containing its art, rules, cost, and explicit **Cast** / **Cancel** buttons. An unplayable Action opens inspection. Cast is revalidated against current legal actions. Repeated clicks cannot pay twice, and a double-click cannot click through the hand into Cast. Closing or minimizing the reading interface spends nothing.

Validation:

- 107 focused tests passed: 18 Force/battle tests, 14 card-choice tests, and 75 Babaylan tests. New battle regressions cover response-before-block order, Unit/Force eligibility, forged invalid blockers, and skipping an empty legal blocker list.
- Real Lesson 4 attack-check and Defended screens verified at 1125×540, without scrolling to see the full card.
- `tests/browser/duel-feedback.html`: 63 checks across seven viewports, covering five presentations in compact mode and four in expanded mode. Whole-art bounds and confirmation-button bounds passed. The actual shatter canvas was visually inspected.
- Existing 23 selection checks passed at six desktop/phone sizes, including 1125×540 and 360×640.
- `tests/browser/action-cast.html` uses the real Action preview and game controller. Ten checks passed at six sizes: first-click preview, readable rules, inspection, minimize, double-click protection, cancel, explicit cast, exactly-once Energy/play payment, movement to Grave, and cleanup. Preview artwork and Cast controls fit all six sizes.
- Final production build and whitespace checks passed. Existing bundle-size warning remains; no push or deployment was performed.

### Action allowance correction

The follow-up screenshot showed 4 Energy and 3/6 plays used. `legalActions()` still capped Actions at three plays even though the HUD and normal calls used the effective Persona level. Actions now use `maxPlays()` too. The cast confirmation remains required.

- Six new engine regressions cover successful fourth, fifth, and sixth Action plays, the exact boundary at 3/4/6/8 total plays, and insufficient Energy.
- 92 focused tests passed (Action play allowance, availability, and Babaylan).
- The browser Action fixture now checks legal actions before opening and again before casting, matching the production hand flow. All 13 checks passed, including the reported 3/6 plays with 4 Energy state and refusal once all six plays are spent.
- Production build passed; fix remains local.
