# First Battle

First Battle is a controlled match for people who have never played a TCG. Open
Tutorial → Start Here → First Battle, or `?tutorial=first-battle`.

## What the player does

1. Meet their Persona and learn the win condition.
2. Watch both five-card opening hands arrive, inspect a card, and call the designated Ally.
3. Enter battle, attack with their Persona, watch the opponent defend, and make an ordinary attack check.
4. See the first attack stopped, then use their Ally to break a shield.
5. End their turn, defend one attack with the designated card, and deliberately take the next hit.
6. Watch their next turn begin, confirm a 2-Energy Action, and see both Units gain 3,000 Power.
7. Break the remaining shield and land a real winning attack.

The estimated seven-minute duration needs validation with actual beginners.

## Prepared cards and rules

- Uses existing, unmodified Set 1 definitions and `GameController.perform`.
- Both Personas: Fifth-Sky Tyrant, Kalimangalnuk (11,000 Power).
- Both called Allies: Life-Breath Mother, Nanolay (11,000 Power); outer slot 0 avoids introducing support.
- Player defender: Keeper At Sunrise, Sinag (10,000 defense).
- Opponent defender: Fallen Sky-Challenger, Talimanog (5,000 defense).
- Action: The Wedding Becomes A Battlefield; 2 Energy, +3,000 Power to each friendly Unit until end of turn.
- Healing House, Aligan is initially active; no Sipol occurs in the scripted route.
- Optional Codex switches, Personification, and advanced triggered effects are declined by the lesson chooser.
- Fixed shuffle seed, explicit opening hands, and ordinary Unit checks. The remainder of each valid 50-card deck is retained.
- Two shields per side is explained as a shortened practice position. Existing broken-shield rules still apply: Persona level starts at 6 and Energy at 5. Neither is secretly overridden.
- Calling a Unit spends a play, not Energy. The Action teaches Energy payment separately.
- The player starts in their first Main Phase, with no extra first-turn draw. Their next turn runs the real draw/reset sequence.
- The first attack is stopped (11,000 versus 16,000), deliberately teaching defense before the Ally's equal-Power hit breaks a shield.

## Implementation boundaries

- `src/ui/first-battle.ts`: prepared position, exact moves, deterministic chooser, checkpoint reconstruction through legal moves.
- `src/ui/first-battle-session.ts`: step script, exact action gate, event waits, versioned local progress.
- `src/ui/tutorial-mode.ts`: adds a named cue event and guards against advancing an already-completed lesson.
- `src/ui/main.ts`: existing tutorial menu, board, card inspection, chooser, and engine presentation hooks host the lesson.
- `src/ui/style.css`: scoped invitation tile, compact coaching, and lesson controls.

Browser testing also exposed an existing compact-board sizing error: cards were
height-constrained only, pushing outer Ally Zones off portrait screens. The compact
slot rule now respects both the available width and height. This correction applies
to ordinary games as well as the lesson.

No normal-match rules or card definitions are changed. First Battle is independent
of the older lesson numbering and saved completion IDs.

## Progress and recovery

Local key: `codex-legends.first-battle.v1`.

Save only a version, chapter (0, 1, 2), and completion flag. No arbitrary GameState
snapshot is loaded from storage. Resume rebuilds the appropriate position using the
same legal moves with headless choosers, then clears reconstruction presentation events.

- Part 1: opening guidance and player turn.
- Part 2: opponent turn, before any opponent moves.
- Part 3: second player Main Phase.

Restart Section returns to the beginning of the current part; Leave Lesson returns
to Tutorials. The menu offers Continue First Battle and Start Again when applicable.
Reset Progress clears both old lesson progress and First Battle progress.
Blocked or corrupt storage falls back safely to a fresh lesson.

Steps advance on completed actions or specific engine events. Continue cannot
complete an action step. Exact card UID, slot, attacker, target, and support choices
are gated. Card inspection remains available. Simple confirmations preserve the
normal explicit Action-cast confirmation.

Minimize keeps the current step active and exposes the board without blur. Paused
engine hooks resume only through the matching instruction's Continue button.
Unexpected failures offer Restart Section instead of silently skipping the step.

## After completion

Play Your Next Battle opens `?practice=next-battle`: the same opening position with
unrestricted player choices, a predictable practice opponent and requested hints.
The older `?practice=first-battle` URL is retained as an alias. See `next-battle.md`.

## Verification

Focused tests:

```sh
npm test -- src/ui/first-battle.test.ts src/ui/first-battle-session.test.ts src/ui/tutorial-mode.test.ts src/ui/tutorial-nav.test.ts
npm run build
```

Browser regression (requires a Playwright installation and running Vite):

```sh
node tests/browser/first-battle.mjs http://127.0.0.1:5173
```

`PLAYWRIGHT_RUNTIME` optionally points to a package.json whose installation contains
Playwright. `BROWSER_EXECUTABLE` optionally selects a local Chromium/Edge executable.
Each viewport uses an isolated browser context. The test completes the real lesson,
checks clickable target visibility, wrong-card handling, inspection, minimization,
Action cancellation, both resume checkpoints, victory, and practice navigation.

Verified the complete route at 1280 × 720, 390 × 844, and 844 × 390 (the last
with reduced motion), with no browser page errors. Also checked the menu entry,
Restart Section, Leave Lesson, and touch long-press inspection. All 27 focused
tests pass, and the production build passes. A bundle-size advisory remains.

Full-suite baseline on September 21: 773 passed, 3 skipped, one failure in the
unchanged `src/core/chain-depth.test.ts` (chain depth 5, expected at most 3).
Do not describe the full suite as clean until that separate issue is resolved.

## Next validation with beginners

Observe people unfamiliar with TCGs without coaching them aloud. After the lesson,
ask them to call an Ally, attack, explain ties in defense, and explain the win condition
in free practice. Finishing the script alone does not establish that they learned it.
