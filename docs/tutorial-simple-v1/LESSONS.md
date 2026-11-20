# Beginner journey lesson notes

Implemented teaching flow for the existing five-chapter journey. No new menu, battlefield layout or game mechanic is introduced.

## Learning sequence

| Chapter | One skill at a time | Evidence of learning in the game |
|---|---|---|
| 1 — First Battle | Find the field; call (play a Unit); attack; defend | Existing guided First Battle controller and actual match outcome. |
| 2 — Simple Skills | Play an arrival Unit; use an attacking Unit; see bonuses expire | Its own guided controller checks the real call and attack effects. |
| 3 — Support and Defense | Three separate prepared examples: support, Force, Sentry | Real resolved attacks, spent cards, exhaustion and post-action inspection. |
| 4 — Persona and Codex | Three examples available with each region's cards: Personify, Barrier Codex, attack Codex | Real replacement into Persona/Heart, actual Codex activation, a real Barrier break, attack and expiration. |
| 5 — Practice Duel | Make the choices with the same simplified cards | A normal five-Barrier practice match under tutorial rules; it is not labeled a regular duel. |

## Chapter 3 prepared examples

1. **Support:** the starter's Level 1 support-role Unit sits next to the Persona. The learner must choose it as support. Its printed Power plus exactly 3,000 contributes to this attack. The lesson waits for the attack to resolve and the supporter to exhaust, then asks for a fresh inspection showing its printed Power again.
2. **Force:** the first attack reveals Bunog from the prepared top of the deck, using the unchanged Force check. On the next opposing attack the learner uses Belet from hand, pays its real cost, gives the existing Power bonus, and draws a card. The lesson requires the actual Force resolution and its spent card in Grave.
3. **Sentry:** a separate attack offers Banoy from hand. Banoy's unchanged Sipol 1 also calls a Unit from the deck: the learner chooses a highlighted empty Ally Zone for that incoming card. This placement is explained in the visible instruction before the response, not discovered through an unexplained prompt. The lesson requires Banoy in Exile and a real stopped attack. It does not count clicking a button as success.

The prepared opponent attacks once or passes and declines optional abilities. Unit-only surrounding checks and Barriers avoid introducing unrelated Force effects during the targeted examples. The named Force check is deliberately placed on top of the deck. All resolutions use the existing controller.

## Chapter 4 prepared examples

Every regional path teaches the same concepts with its real starter cards, artwork and names. All start with five Barriers and exactly the two tutorial Codex for both players.

1. **Persona:** inspect the current lead Unit; go to Battle and end the turn; at the next turn choose the prepared different Level 3 card to Personify. The original card must actually enter Heart. Inspect the new lead Unit afterward.
2. **Barrier Codex:** switch from the attack Codex to the Barrier Codex. All five Barriers remain, so the initial bonus is zero. Let the opponent's next attack hit without blocking. The first real Barrier break produces exactly +1,000 Power, followed by inspection of the changed Persona.
3. **Attack Codex:** start with the Barrier Codex and all Barriers intact. Switch to the attack Codex, go to Battle and attack. The Persona gains exactly +5,000 during the attack, then returns to its usual Power. Inspect it after the result.

Manual Codex switching currently updates `activeCodex` and `codexSwitchedThisTurn` without emitting the structured `codexSwitched` event; automatic switching does emit that event. Lesson completion therefore checks the actual activation state rather than requiring a missing event.

## Intentional boundaries

- Both players use copied tutorial definitions and scripts. The exported production starter deck objects remain unchanged and still have five Codex.
- Simple Skills and the prepared Chapter 3/4 scenes share the same human-choice wrapper. It declines unrelated optional Level 3 skills, unsolicited Personification and automatic Codex switches so they cannot interrupt the arrival-bonus, expiration or Barrier-result explanation. Only the dedicated Personification encounter supplies its intended replacement card; the player still chooses or declines it. Definitions and inspection text remain intact, and the free Practice Duel keeps the normal choices. This is lesson scripting, not deletion of those abilities.
- Force and Sentry prompts remain interactive and use their existing scripts. They are not replaced with simplified substitutes.
- The normal Codex auto-switch condition still exists. Prepared examples decline unsolicited automatic switches so the selected teaching bonus remains active.
- Continue clicks, unrelated events and early card inspection cannot complete an objective. A post-action reading goal requires a fresh inspection after that action. A live response chain or attack holds progression until it settles.
- Essential instructions remain in the visible lesson body. In the prepared regional encounters, the full action and explanation are shown together; optional hints add detail rather than hiding the required next step behind “Why?” or “Need a hint?”.

## Saved progress

The existing journey storage key is retained. `lessonVersion: 2` distinguishes the revised encounter sequence. Completed chapters and completed three-encounter regional paths remain earned. A partial checkpoint from the old State/chain lessons restarts at a safe first encounter; it is not translated into completion of a different lesson. Proven completion from First Battle checkpoint versions 1 and 2 is imported when no journey record exists.

## Verification in this change

- `src/ui/journey-battle.test.ts`: all three Chapter 3 examples and all three Chapter 4 examples in Luzon, Visayas and Mindanao, using real legal controller actions, tutorial scripts and actual results.
- Power captured at the controller's blocker-declared hook proves the support contribution and attack Codex bonus; current Power afterward proves expiration.
- Prepared-choice regressions prove that unrelated Personification/Codex prompts are declined, the intended Persona is the only offered replacement, and Force/Sentry windows plus skill-choice indices are preserved. Simple Skills' actual controller sequence uses that same human-choice wrapper.
- Both players' tutorial setup and the production five-Codex setup are checked separately.
- `src/ui/journey-progress.test.ts`: earned completion, sequential checkpoints, revised-lesson migration, version 2 First Battle import and storage failure recovery.
- Built-in browser screenshots/playthroughs, keyboard, touch and reduced-motion verification are tracked by the main task report. These source/controller checks alone do not prove novice comprehension.
