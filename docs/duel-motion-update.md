# Duel motion pass — 15 September 2026

## Player-visible changes

- Remaining hand cards slide into position when a card leaves or arrives. Ordinary renders and hover do not restart this movement.
- Draws land in the actual card slot in the centered hand. Check-to-hand movement reserves that slot before the engine commits the transfer.
- Card selection gives a small response inside the artwork. Picker arrows scroll smoothly sideways. Opening and restoring a decision panel uses a short entrance motion.
- An active attack keeps its source and target outlined during reactions, defense and checks. The strike happens when the battle resolves, after defense and checks.
- Defense cards travel from hand to the Defense Zone before the defense feedback cue.
- Both players' deck checks and Barrier cards travel face down to Check; the reveal follows. Opponent hand arrivals use card backs.
- Lake Buluan's check destination replacement travels to Grave and the non-Force reveal describes that destination.
- Skill activation marks the source, lifts its visual copy, shows its name/skill, then cleans up before the next effect. Reading holds follow the selected pace independently of reduced movement.
- Opening draws and shattering follow Learning, Standard and Fast speed settings. Reduced motion uses fades/static cracked art.

## Implementation boundaries

`src/ui/duel-motion.ts` provides browser-native animation, card flights and hand-layout movement. No additional animation library is installed. The existing presentation queue and rules hooks remain the owners of ordering; visual helpers never select, pay costs, move game-state cards or resolve decisions.

The animation helper cleans up after completion, cancellation, unsupported browser animation or a bounded timeout. Finish Animation can finish its active visuals without confirming a decision. Flight overlays cannot intercept pointer input.

This pass updates selection, hand movement and the main battle sequence. Older arrival, Sentry, Rally and other effect-specific animations still use their existing implementations; this is not a wholesale replacement of every animation in the game.

## Verification

- Production TypeScript/Vite build passed.
- 69 focused tests passed: motion lifecycle, pace, presentation queue, opening turns, Force battle flow, Action play limits and Heart-motion metadata.
- Card chooser fixture: 38 checks passed at each of 1280×720, 844×390 and 390×844.
- Movement fixture: 11 checks passed at each of those sizes, including cleanup, caller-controlled artwork, reduced motion, hand movement and confirmation isolation.
- Skill cost, attack check, Barrier check, defended and broken-defense panels fit at all three sizes, without body scrolling or cropped artwork. Shatter canvases rendered at all sizes.
- Real Lesson 3 battle: attacker selected, reaction declined, opponent defense committed, pre-check pause, deck-to-Check, check-to-hand, defended result; no leftover flight or battle markers.
- Real Lesson 4 battle: reaction window before normal defense, hit taken, shatter result, Barrier-to-Check, Force target selection, +5000 applied, checked card arrived in hand; no hidden hand cards or browser errors.

Browser checks used headless Edge, including responsive viewport sizes; this does not establish performance on physical phones. Full-suite/MVP certification is outside this focused pass.

## Follow-up: remove the stationary copy during travel

Normal Call, Personification and Sentry hooks run before the rules commit the move. They now register the UID as in transit before redrawing: the hand omits that card and closes the gap, while field renders suppress any duplicate of the travelling card. The registration is released in `finally`, so a failed action can render its real state again. This changes presentation only.

Rally keeps departed cards hidden through the entire batch. Committed blockers are omitted from both hands while they occupy Defense. Check-to-hand hides the revealed Check artwork at takeoff. Effect transfers hide the source card and redraw the committed destination when the flight finishes; destination geometry comes from the destination zone rather than the stale source card's DOM node. Heart movement already hides its source artwork during travel.

Frame-sampled real Lesson 2 calls: desktop captured 61 flight frames and phone landscape captured 65; both had zero frames with a simultaneous hand copy. Both finished with no hand copy, exactly one field card, no remaining flight overlay and no browser errors. Transit tests also cover unchanged engine hands, repeated renders and overlapping cleanup.

## Repeatable checks

```sh
npm run build
npx vitest run src/ui/duel-motion.test.ts src/ui/presentation.test.ts src/ui/pace.test.ts src/ui/heart-motion.test.ts src/core/force-battle.test.ts src/core/opening-turn.test.ts src/core/action-play-limit.test.ts
```

With the development server running, open `/tests/browser/duel-panels.html`, `/tests/browser/duel-motion.html`, and `/tests/browser/duel-feedback.html` for the browser fixtures. The game itself remains at `/`.
