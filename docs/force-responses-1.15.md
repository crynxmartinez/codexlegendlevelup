# Patch 1.15 — Force responses

Implemented locally on 2026-10-03. This note does not confirm a production deployment.

## Card assignments

| Hand response | Luzon | Visayas | Mindanao |
| --- | --- | --- | --- |
| Opposing field Ally activates: Rally one of your Units and that Ally | Tumatanan | Banira | Water Tunung |
| Opponent activates an ability: negate that activation | Subkal | Salumi | Sky Tunung |
| Opponent activates a Special Call effect: draw 2 | Bunog | Silaya | Mountain Tunung |
| Opposing Unit attacks: one of your Units gets +5000 for that attack; draw 1 | Belet | Kawili | Tree Tunung |

All twelve hand skills cost **reveal and discard this card**, work on either player's turn in their matching response window, and consume no plays. They are not freely usable Main-phase skills. No additional once-per-turn limit was added.

The existing +5000-until-end-of-turn attack/Barrier check bonus remains separate. Normal calling a Force still uses a play. Current inspector text is authoritative; existing artwork can contain older printed text.

## Timing and targeting

- Payment and declared targets are committed before the opponent responds. Declining resolves the chain newest first. No effect can be inserted while it resolves.
- Negate answers the immediately preceding opposing activation, not any earlier link. A counter-negate allows the original activation to resolve. Discarded cards and other paid costs stay spent.
- Draw 2 answers the activation of a declared Special Call effect, including Sipol. It resolves before that effect, even if the call is later prevented or its optional follow-up is declined. Multiple Units in one calling activation still produce one response opportunity, not one per Unit.
- Rally targets the actual opposing Ally that activated, plus a chosen friendly field Unit (including Persona). Cards go to the bottom of their respective owners' decks. Moving a source does not itself negate its committed ability.
- Targets are fixed by card and zone entry. If a target leaves and returns, it is not retargeted. Other independent clauses still resolve where possible.
- The attack response is offered before defense/check resolution. Its bonus expires when that attack finishes or is interrupted; drawing 1 is independent of the target remaining available.
- Passive rules and automatic check bonuses are not separate activations in the existing chain system.

## Related updates

- All twelve current card rules and the in-game Dev Log are updated.
- Solo AI recognizes the new responses and avoids Rallying its own Persona.
- Journey lessons use attack responses, counter-negates, and current Persona/Codex Sipol skills instead of the retired freely activated Force effects.
- Local and private-match presentations explicitly label negated links. Private-match frames expose public chain cards without activation receipts or the opponent's remaining hand.
- Shared rules revision is `force-responses-2026-10-03`; deploy matching client and match-server builds together. Previous recordings/clients require their matching rules version.

## Verification

- Full suite: 98 files passed, 2 skipped; 886 tests passed, 3 skipped.
- Two additional regression cases passed afterward: a real Special Call Action opens the response before calling, and Rally cannot follow a target that leaves/re-enters. Focused final run: 26 passed.
- Client TypeScript/Vite build and match-server build passed. Vite reports the existing large-chunk advisory.
- Isolated browser checks passed at 1366×768, 844×390 and 568×320: selected rules readable, confirmation visible with a 44px touch target, successful selection, no page errors. These are layout/interaction checks, not physical-device performance measurements.
