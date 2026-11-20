# UI cleanup and battle feedback review

Updated 2026-09-14. This follows the user's 2D direction; the 3D overhaul is superseded.

## Implemented

- Bottom-deck ordering uses one numbered multi-selection and one OK confirmation across all three Set 1 decks. No separate prompt per card.
- Inspection hints overlay the card artwork on hover/focus; touch devices show the long-press hint there. No reserved hint row below the card.

- One centered Philippines map using the existing map assets, with no map labels. Deck selection stays under Deck. Built-in deck names on Start use their archipelago names.
- Removed the title character lineup and the duel scenery runtime. The board stays 2D.
- Search, type, level, sort and Clear appear only when the picker candidates come from Deck, Grave, Heart or Exile. Codex, hand and field choices stay simple.
- Removed the repeated selected-card footer list and Remove buttons. Click a selected card again to deselect it.
- For ordered responses, the sequence number stays on the card. Earlier/Later controls appear on selected cards only when at least two are selected.
- Mountain Tunung's readying now survives the end of a supported attack. The Ally stands upright when its readying animation plays.
- Forces from hand, Actions and replacement Codex skills now announce their source before resolving. Earlier queued visuals finish before the next source appears. Draw animations wait for earlier movements.
- Mantapuli pays into the Grave first, then draws only if Garahana is released after payment. That payment may release Garahana.
- Removed duplicate unchanged Set 1 State release notifications/triggers during turn setup.
- Corrected the Barrier tooltip: losing the fifth Barrier does not itself end the duel; a further hit on the Persona wins.

## Other redundancy to review — not removed automatically

| Where to look | Repeated information | Suggested change |
| --- | --- | --- |
| During a duel | The corner phase badge and the active player's panel both show the current phase. | Keep one phase display near the turn action. Retain access to phase explanations. |
| When a skill activates, with automatic descriptions enabled | The floating source banner and the automatic description panel repeat the card name and skill. | Keep the card lift plus one readable caption. Reserve the larger panel for requested inspection. |
| During the opponent's turn | The priority indicator says whose turn it is; the side panel names the active player; the turn button also says Waiting. | Keep the disabled action button and one status indicator. Keep Your decision for response windows, which is different from whose turn it is. |
| Starting screen | The version/patch badge and Dev Log button both open the same development log. | Keep a single entry; leave version text as plain information if useful. |

Do not remove confirmation for spending cards, inspection, or View board: those serve different actions. Selecting a card is reversible; resolving it can spend resources. View board lets a player examine the field without abandoning a pending decision.

## Verification

- 267 automated checks passed across the three Set 1 decks, Force battle windows, Codex integration/switching, event ordering, picker filtering, tutorial navigation and responsive board layout.
- Browser checked at 1280×720, 390×844 and 844×390: map layout, hidden Codex filters, pile search, deselection, card-based ordering, source-card lift and immediate upright posture after Charge.
- Prepared controller/BoardUI scenario confirmed Mantapuli's Grave movement precedes its draw animation. Regression cases cover no release, payment causing release, and Garahana already released.
