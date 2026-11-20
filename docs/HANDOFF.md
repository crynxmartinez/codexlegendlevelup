# Codex Legends — Engineering Handoff

> Historical handoff: this document includes retired decks, Energy rules and
> obsolete spreadsheet tooling. Start with [the current project guide](README.md)
> for active rules and commands. Archived generators must not be run.

**Read this first.** It explains what exists, why it is built this way, and how to
extend it without breaking the rules. Written for another engineer or AI agent
picking the project up cold.

Everything in `docs/` is the project's shared memory. Keep it current — a rule
that only lives in someone's head is a rule the next person will get wrong.

---

## 1. What this is

A browser implementation of **Codex Legends**, an original trading card game.
The designer supplied a rulebook PDF (v6.7) and 229 pieces of finished card art.

**Current scope (MVP):** the **Angel**, **Dryad**, **Barbarian**, **Mecha**, **Oni**, **Knight**, and **Elf** decks,
human vs AI, single player, local. All 23 Angel cards, all 23 non-token Dryad cards,
all 23 Barbarian cards, all 24 Mecha cards, all 23 Oni cards, all 23 Knight cards, and all 23 Elf cards are fully scripted and playable start to finish.

Three other decks exist as art and card data but have **no card scripts** yet.
They are the obvious next work — see §9.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 138 tests
npm run build    # tsc --noEmit && vite build
```

---

## 2. The one rule that matters most

> **The rules engine has no DOM dependency.** The AI, the tests and the UI all
> drive the same `legalActions()` / `perform()` API.

Consequences you must preserve:

- Anything the AI can do, a player can do, and vice versa.
- Every rule is unit-testable without a browser.
- A bug found by the AI simulation is a real bug, not a UI artefact.

If you find yourself putting rules logic in `src/ui/`, stop. It belongs in
`src/core/`. The UI decides how a choice is *presented*; the core decides what
choices are *legal*.

---

## 3. Where everything lives

```
src/
  core/            rules engine — pure TypeScript, no DOM
    types.ts       domain model: cards, zones, player state, ActiveBattle
    rng.ts         seeded RNG (mulberry32) — games are reproducible
    state.ts       zone moves, power maths, adjacency, energy/play limits
    setup.ts       deck validation, dice roll, Persona/Codex choice, opening board
    turn.ts        phases, energy, normal calls, Personify, Codex switching
    battle.ts      attack/support/block, attack check, barrier check
    states.ts      Codex State evaluation (Grace, Ethereal, Ravage, Overwhelm, Demonic, Glory, Stampede)
    handcount.ts   hand size as effects see it (Sabrina counts as 2)
    tokens.ts      Dryad token mechanics: create, stack, destroy, count wisps
    effects.ts     effect atoms + the async Chooser interface
    game.ts        GameController: trigger dispatch, turn loop, legalActions/perform
  cards/
    types.ts       CardScript / AbilityScript shapes
    angel.ts       all 23 Angel card scripts
    dryad.ts       all 23 non-token Dryad card scripts
    barbarian.ts   all 23 Barbarian card scripts
    mecha.ts       all 24 Mecha card scripts
    oni.ts         all 23 Oni card scripts
    knight.ts      all 23 Knight card scripts
    elf.ts         all 23 Elf card scripts
  ai/bot.ts        greedy bot + AiChooser
  ai/bot.ts        greedy bot + AiChooser
  ui/
    main.ts        setup screens, board, inspect panel, modals, HumanChooser
    style.css      the mat is drawn in CSS, not a background image
    assets.ts      asset URL helpers
  data/
    cards.json     generated — do not hand-edit
    loader.ts      typed access to card data

decks/angel.json   the Angel MVP decklist
decks/dryad.json   the Dryad MVP decklist
cards.csv          human-editable source of truth for card data
tools/*.py         the data pipeline (see §5)
docs/*.md          rules + this handoff
assets/            card art (WebP, two sizes) + board art
```

**~4,300 lines of TypeScript** (excluding tests), of which ~1,100 is UI.
Roughly 700 further lines are tests.

---

## 4. How a turn actually flows

Follow this once and the codebase will make sense.

```
BoardUI.run()                         src/ui/main.ts
  └─ ctrl.beginTurn()                 src/core/game.ts
       ├─ startTurn()                 src/core/turn.ts
       │    ├─ draw 1
       │    ├─ evaluateStates()       src/core/states.ts   ← Grace decided HERE
       │    ├─ energy = personaLevel - 1
       │    ├─ charge all units
       │    └─ phase = 'main'
       ├─ fireTrigger('startOfTurn')
       └─ fireTrigger('startOfMain')

  ── human: legalActions(HUMAN) → the UI renders affordances → perform(action)
  ── AI:    playAiTurn() scores every legal action, performs the best,
            then awaits hooks.onAiAction so the client can redraw and pace

  perform({kind:'endPhase'}) → enterBattle() → fireTrigger('startOfBattle')
  perform({kind:'attack'})   → doAttack()    → see §6
  perform({kind:'endTurn'})  → finishTurn()  → endOfTurn triggers,
                                                delayed effects (Rally),
                                                endBattlePhase(), endTurnState()
```

### `fireTrigger` is the heart of the engine

```
fireTrigger(name, player, event)
  1. triggerCandidates()  — collect every ability + the active Codex that wants
                            this trigger and is currently legal
  2. loop while candidates remain:
       pickTriggerToResolve()  → chooser.chooseAbility(...)   ← player picks, or declines
       re-check legality (an earlier effect may have changed the board)
       run it
  3. tryAutoSwitch()      — red Codex Passives may pull themselves in
```

Two rules are encoded here, both from the designer:

- **Green abilities are optional.** Nothing fires without asking.
- **Several at once → the player chooses the order**, one at a time.
  Nested triggers settle **first-in-last-out**, which falls out of the recursion.

---

## 5. The data pipeline

There was **no spreadsheet**. Every card's stats and rules text were read off the
art by eye. `cards.csv` is the human-editable source of truth.

```
card art (WebP)
      │  read by hand
      ▼
cards.jsonl  ──tools/build_spreadsheet.py──▶  cards.csv + cards.xlsx
                                                   │
                                   tools/build_carddata.py
                                                   ▼
                                        src/data/cards.json  ──▶ loader.ts
```

| Script | Does |
|---|---|
| `tools/build_carddata.py` | `cards.csv` → `src/data/cards.json` (typed records) |
| `tools/build_spreadsheet.py` | rebuild `cards.csv` / `cards.xlsx`, applies **errata** |
| `tools/validate_deck.py` | check a decklist against every deckbuilding rule |
| `tools/convert_cards.py` | card art → WebP at two sizes |
| `tools/convert_ui.py` | board art → WebP |

### The errata layer — important

The card art contains **known typos**. `build_spreadsheet.py` holds a table of
designer-confirmed corrections:

```python
ERRATA_DECK_GUILD = {
    "Angel": "Hub Nur",   # 11 cards misprint "Ala Rasi Guild"
}
```

`cards.csv` therefore carries **both** `guild` (corrected) and `guild_printed`
(what the art says). The inspect panel shows the corrected value **and calls out
the difference**. When you find a new typo, add it to the errata table — never
edit the art, and never silently overwrite what was printed.

**`src/data/cards.json` is generated. Do not hand-edit it.**

---

## 6. Battle, in detail

This is where most of the subtlety lives.

```
doAttack()
  ├─ activeBattle = {attacker, supporters, target, ...}   ← transient, for the UI
  ├─ hooks.onAttackDeclared()        UI: rotate attacker 90°, show the bar
  ├─ fireTrigger('attack')
  ├─ fireTrigger('personaAttack')    only if the Persona is swinging
  ├─ fireTrigger('supported')        only if supporters were declared
  ├─ fireTrigger('unitAttacked')     ← fired for the DEFENDER
  ├─ refreshBattlePower()            buffs may have landed
  ├─ askForBlockers()                defender plays cards to Defense
  ├─ hooks.onBlockersDeclared()      UI: blockers appear in the Defense zone
  ├─ ATTACK CHECK (Persona only)     reveal top of attacker's deck → modal
  │    └─ resolveCheck()             Force: both modes fire for free, buff applies NOW
  │    └─ refreshBattlePower()       recompute after Force buff
  ├─ askForSentry()                  last-chance nullification (Persona attacks only)
  ├─ resolveAttack()                 src/core/battle.ts — compares final powers
  ├─ hooks.onAttackResolved()        UI: "Defended" / "Defense broken"
  └─ resolve barrier check if a Barrier was broken
```

### Rules that are easy to get wrong

| Rule | Detail |
|---|---|
| **Attack check** | Fires **only when the Persona attacks**, and reveals the top of the **attacker's own deck**. Happens **after blockers are declared** but **before the hit comparison** — so a Force revealed on the check can buff the attack. Not a Barrier. |
| **Barrier check** | Fires when a Persona takes damage; the **defender** reveals their left-most Barrier, which is then broken. |
| **Force on a check** | Costs **0** and **both** modes fire. From hand it costs 2 Energy and you choose one. The buff from mode A applies to the current attack if revealed on an attack check. |
| **Blocking** | Blockers add their **Defense** to the **Power of the attacked unit**, Persona included. Any card may block; a blank Defense counts as 0. Blockers die after the attack. |
| **Support** | Only an **adjacent Ally**. The **Persona can never support**. Slots 1 and 2 both neighbour the Persona, so two units can support it. |
| **Hit** | `attackPower >= defensePower`. A tie **breaks** the defence. |

Board adjacency: `[0] [1] PERSONA [2] [3]` — slots 0 and 3 are outer wings and
are **not** adjacent to the Persona.

---

## 7. Adding a card script

Every card is hand-written in `src/cards/<deck>.ts`. There is no generic effect
parser and there should not be one — card text is too irregular.

```ts
const celestia: CardScript = {
  id: 'angel/noble-dawn-knigh-celestia',   // must match cards.csv `id`
  abilities: [
    {
      text: '[Ally]: When placed, [1 Energy] Draw one.',  // shown in prompts
      scope: ['Ally'],          // zone the card must be in
      trigger: 'placed',        // omit for a blue (Activated) ability
      energyCost: 1,            // checked before `run`
      perTurn: 1,               // optional cap
      requiresState: 'Grace',   // optional State gate
      canRun: (ctx) => graceOn(ctx),
      run: async (ctx) => { draw(ctx, 1); },
    },
  ],
};
```

Then register it in the deck's `ScriptRegistry` export.

- **No `trigger`** → blue, Activated: appears in `legalActions` during Main and
  the UI shows a badge on the card.
- **With a `trigger`** → green, Auto: offered via `chooseAbility` when it fires.

Effect atoms live in `src/core/effects.ts`: `draw`, `discard`, `rally`,
`buffPower`, `buffPerHandCards`, `buffAll`, `exhaust`, `damageUnit`,
`searchDeck`, `scryTop`, `specialCall`, `scheduleEndOfTurn`.

**Player decisions must go through `ctx.chooser`** — never `window.confirm`, never
a direct DOM call. That is what keeps the AI able to play the same card.

---

## 8. Adding a whole deck

The intended extension path. Nine decks are waiting.

1. **Read the card faces.** Stats and text are already in `cards.csv` for all
   229 cards — verify them against the art before trusting them.
2. **Write the deck doc** — copy `docs/angel-deck.md` as the template. Work out
   the archetype's State condition and keywords, and *ask the designer* about
   anything ambiguous rather than guessing. Record the answers.
3. **Implement the State** in `src/core/states.ts` (`STATE_CONDITIONS`).
4. **Implement new keywords.** Each deck introduces mechanics Angel does not have:

   | Deck | State | New mechanics needed |
   |---|---|---|
   | Barbarian | Ravage | self-damage as a cost |
   | Broken Bride | Mourn | **Essence**, **Vent**, Heart zone, **Ascend Break** |
   | Concert | Concert | Music tokens, "active Music buff", non-switchable Codex |
   | ~~Dryad~~ | ~~Ethereal~~ | ~~tokens, **Stack**~~ ✅ done |
   | Elf | Stampede | **Echo** |
   | Knight | Glory | **Screen** (partly in), type-changing effects |
   | Mecha | Overwhelm | Ascend Break, power transfer |
   | Oni | Demonic | Essence/Vent, power reduction |
   | Steam | Ignite | **Install** / Engine Core attachments, 8-copy rule |

5. **Write the card scripts** in `src/cards/<deck>.ts`.
6. **Build a decklist** in `decks/`, then `python tools/validate_deck.py decks/<deck>.json`.
7. **Add tests** mirroring `src/core/angel.test.ts`.
8. **Run the balance sim** — 60 AI-vs-AI games should finish with no unfinished
   games and a roughly even first/second split.

**Watch the deck size.** Angel's pool is 17 non-Codex uniques × 3 copies = 51
cards against a 50-card requirement, so the decklist is almost forced. Other
pools may be similarly tight, or short — check before promising a legal deck.

---

## 9. Current state

### Working
- Full game loop: setup → turns → battle → win, human vs AI
- All 23 Angel cards scripted
- All 23 non-token Dryad cards scripted (tokens + Stack + Ethereal)
- All 23 Barbarian cards scripted (Ravage + self-damage + damage-by-ability)
- All 24 Mecha cards scripted (Overwhelm + Persona power + Charge + special call)
- All 23 Oni cards scripted (Demonic + Heart zone + Essence + Vent + Heart-triggered abilities)
- All 23 Knight cards scripted (Glory + Screen + Hero type tracking + scry + power drain)
- All 23 Elf cards scripted (Stampede + Echo + unitEchoed trigger + call tracking + special call from hand)
- Grace, Rally, Ethereal, Ravage, Overwhelm, Demonic, Glory, Stampede, the Force cycle, Codex switching (manual + red auto-switch)
- Optional/ordered green abilities, blue abilities activated from the board
- Token mechanics: Wisp creation, stacking, destruction (cease to exist)
- Damage by ability: real units to Grave, tokens cease to exist, Ravage counter
- Persona power tracking: Overwhelm releases at 20,000+, energy-used-this-turn counter
- Heart zone: public zone for essenced cards, essence/vent/retrieve helpers, Demonic cross-turn tracking
- Screen keyword: forces opponent to attack Screen units (taunt/guard), dynamic via screenWhileCharged flag
- Hero type tracking: printed HeroUnit + temporary treatedAsHero flag (Patt, Mountain Castle), Glory event-driven State
- Scry top N: check top N cards, add 1 to hand, shuffle rest back (Jipa)
- Echo: return unit to owner's hand, fires unitEchoed trigger for both players, call tracking for Stampede
- Card relocation during Main phase (free, 1/unit/turn)
- Check reveal modals (attack check + barrier check)
- Token creation notification modals
- Sentry nullification (Angel's Marcella + Dryad's Fern + Barbarian's Ylva + Mecha's Haven + Oni's Sora + Knight's Nod + Elf's Amelia)
- Board drawn in CSS; right-click inspect; minimisable modals; paced AI
- 138 tests; 60-game Angel balance sim finishes 60/60, ~9.5 turn median, 30/30 split
- 20-game Barbarian sim: 0 unfinished, 8/12 split, ~8.2 turn median
- 20-game Mecha sim: 0 unfinished, 11/9 split, ~9.6 turn median
- 20-game Oni sim: 0 unfinished, 11/9 split, ~13.5 turn median
- 20-game Knight sim: 0 unfinished, 13/7 split, ~8.4 turn median
- 20-game Elf sim: 0 unfinished, 10/10 split, ~8.3 turn median

### Not built
- Multiplayer (the engine is ready for it; there is no server)
- Deckbuilder (decklists are JSON)
- The other eight decks
- Ascend Break / Extra Zone (modelled in types, no cards use it yet)
- Heart zone mechanics (Essence, Vent) — modelled, unused
- Mulligan, deck-out loss, hand-size limit

### Known open rules questions
Listed at the end of `docs/game-rules.md` (Q-B … Q-K). None block play; each has
a stated assumption in code. **Ask the designer rather than guessing**, and record
the answer in the docs when you do.

---

## 10. Conventions

- **TypeScript strict**, `noUncheckedIndexedAccess` on. `npm run build` must pass.
- **Comments explain *why*, not *what*.** Rules-derived constants cite the rule.
- **Match the surrounding style** — the codebase is consistent; keep it that way.
- **Tests are the specification.** When a rule changes, change the test first.
- Deterministic RNG: pass a seed, get the same game. Never use bare `Math.random()`
  in the engine.
- The UI reads `game.activeBattle` for presentation; it is transient and must be
  cleared in a `finally`.

---

## 11. Pitfalls that already bit us

Learn from these rather than rediscovering them.

1. **Attacking the Persona is `target: null`**, not the Persona's uid. Passing the
   uid makes every Persona attack fail as an illegal target.
2. **A rejected attack must clear `activeBattle`** or the battle banner sticks.
3. **Don't exhaust the attacker before `resolveAttack`** — it re-checks `canAttack`
   and will reject its own attack.
4. **`encodeURIComponent` breaks asset paths.** Card filenames contain commas;
   `%2C` is not decoded by the static server. Use `encodeURI`.
5. **Diacritics and curly apostrophes** in filenames (`Róisa`, `Ezek'ia`) need
   folding when matching card names to files.
6. **CSS `flex-direction` without `display: flex`** silently stacks children —
   this made the whole board overflow off-screen.
7. **`setInterval` is throttled hard** when the tab is hidden. Never gate a
   required UI control behind an animation timer.
8. **Spreading a class instance drops its prototype methods** — a wrapped
   `Chooser` built with `{...ai}` loses every method.
9. Balance-sim failures are usually **fixture bugs**, not engine bugs. Check the
   test deck is legal before suspecting the rules.

---

## 12. How to verify a change

```bash
npx tsc --noEmit          # must be clean
npm test                  # 51 tests
npx vitest run src/core/balance.test.ts   # 60-game sim, prints a report
npm run build
```

Then play it. The dev server is at `http://localhost:5173`. For UI changes,
drive the page and assert on the DOM rather than trusting a screenshot — that is
how every bug in §11 was caught.

A healthy balance report looks like:

```
games 60 · unfinished 0 · first/second wins ~30/30
turns min/med/max 6/8/11 · Grace uptime ~59%
```

Unfinished games mean the AI has stalled. A lopsided split means a real balance
problem — investigate before shipping.

---

## 13. Document index

| Doc | What it holds |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | This file — architecture and how to continue |
| [`game-rules.md`](game-rules.md) | **The authoritative rules.** Supersedes the v6.7 PDF |
| [`angel-deck.md`](angel-deck.md) | Angel archetype reference + the template for new decks |
| [`engine-corrections.md`](engine-corrections.md) | Bugs found by checking code against designer rulings |
| [`ui-plan.md`](ui-plan.md) | Measured diagnosis + prioritised plan for the board layout |
| [`deck-redesign.md`](deck-redesign.md) | Proposed Angel/Barbarian/Dryad redesign, old skill vs new |
| [`redesign-angel.md`](redesign-angel.md) | **Angel redesign in depth** — engine, maths, guardrails, card by card |
| [`README.md`](README.md) | Quick start for someone who just wants to run it |

`src/core/docs.test.ts` pins the factual claims made here — card counts, that every
Angel card has a script, that all ten decks have data. If you change those numbers,
that test will tell you.

**The PDF is out of date.** The card art is newer than the rulebook, and several
rulings have superseded it. When they disagree, `game-rules.md` wins.

---

## 14. Working with the designer

Most of the hard problems here were **rules ambiguities, not code**. The pattern
that worked:

1. Read the actual card art — do not trust filenames or the PDF.
2. When two readings are possible, **ask**, and offer the options with their
   consequences spelled out.
3. Record the answer in the docs, marked `[OK]` (confirmed) or `[ERRATA]`
   (supersedes the print).
4. Add a test that pins the ruling.

Rulings obtained this way so far: Grace timing, Sabrina's hand count, Force on a
check, blocking with any card, Persona level scaling energy *and* plays, one Codex
switch per turn, green abilities being optional and player-ordered, and the
Persona never supporting. Every one of them changed the code.

The designer is the source of truth. Ambiguity resolved by guessing is a bug with
a delay on it.
