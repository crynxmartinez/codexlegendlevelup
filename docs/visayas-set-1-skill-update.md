# Visayas Set 1 skill update — 14 September 2026

Implemented the 22 requested Unit revisions in `src/cards/babaylan-set-1.ts`, with matching rules text in `content/babaylan-set-1-skills.json`.

## Confirmed rules

- Kaptan’s Andukha 9 effect is a once-per-turn Main Phase activation.
- Luning adds one Kaluluwa per creation event for 1 Energy: creating two becomes three. Bonus creation cannot recursively create another bonus.
- Lawira, Aday, Luning, Sali, Doro, and Nardo work only in Ally Zones.
- Iday works from Hand or Ally and pays both itself and 1 Energy.
- Mangaw and Aday count actual Essence entries this turn, including Kaluluwa. Kaluluwa are Token cards, so token creation alone does not count as a Unit being Essenced for Maria.
- Maguayan adds the Essenced Ally’s current Power for the battle. Tata Cero’s attack bonus also lasts for the battle.
- Vent payments complete before the Vented cards react. Sinogo discounts numeric Beast/Bird Vent costs at Andukha 12, not named-card payments or Action/Force costs.
- Delayed returns remember the specific field entry; leaving and re-entering cannot carry an old return obligation onto a new entry.
- Optional paid follow-ups preserve the free first portion when declined.

## Display rules

- Green: automatic, triggered, or continuous effects.
- Blue: Main Phase activations.
- Yellow: manually usable battle effects.
- Red: State-linked effects, displayed alongside the timing marker. The shared renderer recognizes Andukha, Garahana, and Bayanihan, including conditions inside the skill text, and avoids duplicate red markers.

## Validation

- 68 Visayas skill/catalogue/match tests pass, covering all 22 revised Units.
- 262 focused regression tests passed across the three decks, battle Force windows, trigger dispatch, bottom ordering, and card selection.
- After the badge corrections, all 169 selected skill and formatter checks passed.
- Browser verification: live Iday rules text; Luning paid creation produces Heart 3 / Energy 19; Kaptan selects a Divine, accepts four remaining cards in one ordered confirmation, and gains +5000. Green + red markers verified visually on Mangaw and Sinogo; Aday remains green without a red marker.
- Production build passes.

## Remaining separate UI guard

The full suite run returned 689 passing tests, three skipped tests, and one failure in `src/core/chain-depth.test.ts`: its design guard allows at most three links, while simulated chains reach five. The skill tests pass. This guard has not been weakened or removed; longer-chain presentation still needs a dedicated review. The full suite ran before the final six edge-case tests and badge formatting tests were added; the focused checks above cover those additions.
