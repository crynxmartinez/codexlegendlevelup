# Set 1

142 cards have the Set 1 tag: Luzon / Agta (43, including Banoy), Visayas /
Babaylan (47, including Bituon), and Mindanao / Maguindanao (52, including Panglima Sabir). The Set 1 filter selects them;
library tiles, deck tiles and card details display the Set 1 tag.

`content/set-1.json` contains the names, types, levels, power, defense,
printed subtypes and image paths transcribed from the new card art. Run
`node tools/import-set-1.mjs` to rebuild `src/data/set-1.json` and the 512px board
and 256px thumbnail WebPs. The original full-resolution WebPs are preserved.
The loader combines this catalogue with the existing `cards.json`; do not run
the historical CSV generator to import this set, because that CSV predates
the current three-archetype catalogue.

IDs use `archetype/set-1/card-name` to avoid collisions with earlier cards.
The `set` field is `set-1`; `archipelago` records the region independently
of the deck archetype. Existing internal guild keys are retained for deck
validation. Region subtypes are retained for compatibility with existing effects,
and printed creature subtypes are added after them.

The 51 reviewed Maguindanao cards have implemented skills in
`src/cards/maguindanao-set-1.ts`. Their reviewed rules text is stored in
`content/maguindanao-set-1-skills.json` and applied by the loader, which clears
`effectsPending` and assigns Garahana to their Codex cards. The 46 new Babaylan
cards are implemented in `src/cards/babaylan-set-1.ts`, with rules in
`content/babaylan-set-1-skills.json` and functional coverage in
`src/core/babaylan-set-1.test.ts`. All 42 new Agta cards also have effects in
`src/cards/agta-set-1.ts`; rules and scripts share the same definitions. See
`docs/agta-gold-paladin-research.md` and `docs/agta-set-1-card-guide.md` for the
research, gameplay and individual rules. Agta Codex cards release Bayanihan.

Selection across all three archipelagos hides cards without the Set 1 tag.
Banoy, Panglima Sabir and Bituon retain their Sentry effects and have the Set 1 tag.
Kaluluwa tokens remain available to the engine but are not selectable deck cards.
All three built-in decks use their respective `decks/*-set-1.json` files.
Historical IDs remain resolvable for saved games. The built-in Mindanao deck
uses `decks/maguindanao-set-1.json`; the legacy deck remains a regression fixture.

Offer costs are paid before Last Oath rewards. Returning a card from the Grave
reevaluates Garahana. Per-turn limits survive leaving and re-entering the field;
temporary calls track each field entry so an earlier expiry cannot remove a
later incarnation. Seven Heads grants at most one post-battle removal per turn,
following the workbook's balance note. Functional coverage is in
`src/core/maguindanao-set-1.test.ts`.

Babaylan Vent payments remove the entire selected batch before Vent rewards
resolve. Tokens count as one payment each. Andukha bonuses apply to all new
Babaylan Unit subtypes and are recalculated after Heart changes. Per-turn limits
survive leaving and returning, and delayed returns track the specific field entry.
New Codex switches use the actual event window and retain the last-turn lockout.

Tata Cero gains defensive Power when attacked; Allies do not block from the field.
Maria Cacao's temporary return lasts through that Unit's next battle this turn.
Special calls require a free Ally Zone. Guidala requires a battle-phase Vent;
Ulango requires a battle-phase Heart call. Sinogo's exchange therefore triggers
when its Persona attacks, rather than as a main-phase ability, so it can activate
Ulango. Main-phase Actions do not satisfy battle-only conditions. The original
design workbook's combo suggestions should be read with these timing corrections.
