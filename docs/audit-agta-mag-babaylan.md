# Card audit — printed text vs code

All 76 cards of Agta (25), Maguindanao (25) and Babaylan (26), each card's
`text` in [`cards.json`](src/data/cards.json) compared against its script in
[`src/cards/`](src/cards/).

**Method.** A throwaway vitest dump printed every card's `text` beside its
`AbilityScript.text`, scope, trigger, `perTurn` and `energyCost`; every
divergence was then read against the actual `run` body. A second throwaway test
reproduced the auto-switch defect. Both probes have been deleted.

**Baseline when audited:** `tsc --noEmit` clean, `vitest run` **145 pass, 2 fail**.
**Result: 18 real defects**, one of them a live gameplay bug affecting five Codex
across all three decks.

> ## STATUS: all 18 fixed
> `tsc --noEmit` clean · `vitest run` **148 pass, 0 fail** (15 files).
> See **[§F — What was changed](#f--what-was-changed)** for the resolution of each
> item, the balance impact, and the **two design decisions this surfaced** that
> still need your call.

---

## Verdict by deck

| Deck | Cards | State of the code |
|---|---|---|
| **Babaylan** | 26 | **Cleanest.** Printed text and ability text match near-verbatim. 4 defects, all small. |
| **Maguindanao** | 25 | 6 defects. Two Personas are materially unimplemented or rewritten. |
| **Agta** | 25 | **Worst.** 8 defects. Both non-Laya Personas do something different from what they print. |

Agta also has the **lowest win rate in the game** at 26.7% over 420 simulated
games (`playtest.test.ts`) — and its two most-played Personas are among the
cards whose code does not match their text. Those are probably the same problem.

---

## A. Live gameplay bug

### A1 — Unit-count scenario gates are asymmetric (5 Codex, all 3 decks)

`myUnits()` counts **allies + your Persona**; `enemyAllies()` counts **allies
only** ([effects.ts](src/core/effects.ts)). Five Codex compare one against the
other, so both directions are wrong, in opposite ways:

```
BOTH BOARDS EMPTY (each side: 1 Persona, 0 allies)
  myUnits(me)   = 1     <- counts Persona
  enemyAllies() = 0     <- does NOT count Persona
  "You control more Units"  = true    <- fires at parity, from turn 1
  "Opponent controls more"  = false

OPPONENT HAS 1 ALLY, YOU HAVE 0  (they clearly lead the board)
  "Opponent controls more Units" fires? = false   <- should be TRUE
```

| Codex | Condition in code | Actual behaviour |
|---|---|---|
| Hidden Path *(Agta)* | `enemyAllies > myUnits` | needs a **2-ally** lead to fire — under-fires |
| Liguasan Marsh *(Mag)* | `enemyAllies > myUnits` | same |
| Healing Grove *(Bab)* | `enemyAllies > myUnits` | same |
| Thousand Knots *(Agta)* | `myUnits > enemyAllies` | **true on an empty board** — over-fires |
| Sacred Crown *(Bab)* | `myUnits > enemyAllies` | same |

This is exactly the ">70% of turns = a default, not a scenario" failure from
[`codex-philosophy.md`](codex-philosophy.md) Part II — except here it is a typo,
not a design choice. The "you are ahead" Codex is switched on from turn 1 and the
"you are behind" Codex barely ever opens.

**Fix:** compare like with like — either both including Personas or both
excluding them. One line each.

---

## B. Abilities that are printed but not implemented

### B1 — Blood Moon Bai-A-Labi *(Maguindanao, Lv 3 Persona)*: 3 printed, 1 implemented

| Printed | In code |
|---|---|
| `[Cost: Offer 1] Search deck for a Level 1 unit and special call it` | ✅ |
| `[Cost: Offer 1] Draw 1. This unit gets Power +5000` | ❌ **missing** |
| `[Eclipse] When this unit attacks, [Cost: 1 Energy] +1000 per Maguindanaon unit in Grave` | ❌ **missing** |

The Eclipse ability is the card's payoff — and its only link to the deck's State.

### B2 — Leaf Whistle Scout, Sari *(Agta, Lv 1)*: 2 printed, 1 implemented

The `+3000 to itself` ability is implemented. `Choose another Luzon Arch Unit; it
gets Power +1000 for each ally unit` is **absent from the script entirely**.

---

## C. Cards where the code implements a different ability

### C1 — Arrow of the Sierra, Amihan *(Agta, Lv 3 Persona)* — both abilities differ

| | Printed | Code |
|---|---|---|
| **1** | `Gather 1.` | Gather 1 **and the called unit gets +2000** |
| **2** | reveal 2 Luzon Arch **from your hand**, call up to 2, **this unit and all called get +5000**, no cost, no limit | reveal top 2 **of your deck**, call any Units, **2 Energy**, **1/turn**, buffs **only itself** by the **sum of the called units' Power** |

Different zone, different cost, different buff, different target. These are not
the same card.

### C2 — The Boar-Spear, Makisig *(Agta, Lv 3 Persona)* — the buff points the wrong way

> **Printed:** `[Persona]: Each of your other Luzon Arch Ally Units gets Power +2000.`
> **Code:** `this unit gets Power +2000 for each Luzon Arch ally on your field.`

The card buffs **the allies**; the code buffs **the Persona**. Printed is a
continuous passive; code fires on attack only. Ability 2 also differs — printed
buffs *the unit called by the effect* by +2000, code buffs *a chosen ally* by
+5000.

### C3 — Kuta Wato Warcaller, Datu Salik *(Maguindanao, Lv 3 Persona)*

> **Printed:** `Special call 1 unit from your hand. That unit enters charged.`
> **Code:** `Special call 1 unit from your hand. It gets Power +3000 and gains "[Last Oath]: ..."`

**Charged does not appear in the code at all** — and charged (attack again) is a
far bigger effect than +3000. The script also carries a third ability (a Last
Oath rider) that is not printed on the card.

### C4 — Ember-Pot Bearer, Berto *(Agta, Lv 1)*

> **Printed:** when special called **from your deck** *and* supporting a Luzon Arch
> attacker, choose one of your **other** Luzon Arch Allies; +1000 per ally,
> **until end of turn**.
> **Code:** no special-call requirement; buffs **the attacker it is supporting**;
> **until end of that battle**.

Three differences: the trigger condition, the target, and the duration.

### C5 — Shared Ember *(Agta Codex)* — reveals 1, card says 2

> **Printed:** `reveal the top two cards of your deck. If it is a Unit, special call it...`
> **Code:** reveals **one** card.

The printed text is also self-contradictory — "two cards… if **it** is a Unit" —
so this one needs a decision on the intended wording before it can be fixed.

### C6 — Pulangi River *(Maguindanao Codex)* — a different cost

> **Printed:** `Replace your draw — [Cost: Offer 1 of your units] Draw 2.`
> **Code:** `Replace your draw — Draw 2. The first time you call a unit this turn, it is Offered.`

Printed charges up front from your board. Code defers it to your next call —
**and if you never call a unit that turn, nothing is ever paid.** Draw 2 for free.

### C7 — The Healing Grove of Bandilaan *(Babaylan Codex)*

> **Printed:** `Each time you special call a unit from deck or Heart...`
> **Code:** `During your Main Phase, each time you special call a unit or token...`

The code adds a **Main-phase restriction that is not printed** (so it silently
does nothing during Battle) and swaps the "from deck or Heart" source
restriction for a "unit or token" one.

---

## D. Numeric and threshold mismatches

### D1 — Resonance releases at 5; every Babaylan Codex prints 6

[`states.ts`](src/core/states.ts) — `Resonance: count >= 5`.
All five Babaylan Codex print *"If you have **6+** cards in Heart, release this
State."* The State turns on one card early.

### D2 — Storm Altar creates 2 tokens; the card says 1

> **Printed:** `create 1 [Kaluluwa] token and [Essence] it.`
> **Code:** `create 2 Kaluluwa tokens and Essence them.`

### D3 — Thousand Knots' reroll ignores both of its printed restrictions

The reroll lives inside `gather()` ([effects.ts](src/core/effects.ts)), gated only
on "is Thousand Knots the active Codex." It therefore:

- has **no Energy cost** — the card prints `[Cost: ...and 1 Energy]`;
- has **no phase check** — the card prints *"When you Gather **during your
  Main**."* It currently also fires on Listening Canopy's battle Gather and on
  Sentry Banoy's Gather.

### D4 — Sentry Energy costs are undocumented and inconsistent

| Card | Printed | Code |
|---|---|---|
| Sierra Watchkeeper, Banoy *(Agta)* | no cost | **1 Energy** |
| Kuta Wato Oath-shield, Panglima Sabir *(Mag)* | no cost | **1 Energy** |
| Warden of the Twelfth Tide, Bituon *(Bab)* | `[Cost: 3 Energy]` | 3 Energy ✅ |

[`game-rules.md:256`](docs/game-rules.md:256) describes Sentry as *"revealed from
hand to nullify one instance of Persona damage; it is then exiled face down"* —
**no Energy cost at any point.** So either the rules doc and two cards are missing
a cost the engine charges, or the engine is charging one it should not.

### D5 — Eclipse's printed condition lost the word "Maguindanaon"

All five Maguindanao Codex print *"While there are 5 or more **unit cards** in your
Grave."* The engine counts **Maguindanaon units only**
(`maguindanaoGraveCountRaw`). As printed, an opponent's units in your Grave would
count.

### D6 — Unprinted "During your Main Phase" clauses

Present in the code's ability text but not on the card: **Keeper of the Spirit
Bowl, Ilaya**; **Amaya** (2nd ability); **Maraya** (1st ability). Harmless if
intended, but the player cannot see the restriction.

### D7 — Storm Bark Elder, Ulan *(Agta)* — limit and duration

Printed has no `1/turn` and lasts **until end of turn**. Code splits it into two
abilities, each `perTurn: 1`, each lasting **until end of that battle**.

### D8 — Returning River *(Agta Codex)* — code is `1/turn`, card is not

---

## E. Test and data issues

### E1 — Two failing tests (`docs.test.ts`)

```
expected [ 25 cards ] to have a length of 28
script maguindanao/bita-eclipse-wing-pah has no matching card
```

Three scripts exist with no card in `cards.json`:
`bita-eclipse-wing-pah`, `kuta-wato-abyssblade-panglima-zafir`,
`black-standard-oathkeeper-sitti-maira`.

**None of the three is referenced by [`decks/maguindanao.json`](decks/maguindanao.json)**, so
the deck is fully playable — this is dead code plus a stale assertion, not a
broken deck. Resolve by either restoring the three cards or deleting the scripts
and setting the count to 25.

### E2 — Balance is far outside a healthy band

From `playtest.test.ts`, 420 games:

| Deck | Win rate |
|---|---|
| Mecha | **80.8%** |
| **Babaylan** | **69.2%** |
| Knight | 53.3% |
| Elf | 48.3% |
| Oni | 39.2% |
| **Maguindanao** | **32.5%** |
| **Agta** | **26.7%** |

Babaylan beats Maguindanao **8–2** head to head. Of the three decks audited,
Babaylan is the strongest in the game after Mecha, and Agta is the weakest deck
overall — with the most broken card scripts. Worth re-measuring **after** the
C-section fixes rather than tuning numbers now.

---

## Checked and found correct

Recording these so they are not re-investigated:

- **Bai Samira / Kamil** "counts as 2" — `canRun: () => false`, documentation-only
  entries; the real logic is in `offerUnit` and `maguindanaoGraveCountRaw`. Correct.
- **Kidlat** (`from hand`) and **Kislap** (`another unit, special`) — correctly
  gated in `canRun`.
- **Bituon** — charges 3 Energy as printed.
- **Nalia** — split into mark + endOfTurn abilities; functionally matches the card.
- **All 12 Force cards** across the three decks — both modes match their printed
  bullets exactly.
- **All Last Oath units** (Mayla, Hakim, Nasser, Sitti Rahma) — match.
- The `•` and `—` glyphs in `cards.json` are correct UTF-8; the mojibake was a
  console artifact only.

---

## Suggested order of work

1. **A1** — one-line fix ×5, and it is affecting live games right now.
2. **C1–C3** — the three Personas whose code implements a different card. These
   are the cards Agta and Maguindanao build around.
3. **E1** — decide restore-or-delete, get the suite green.
4. **B1, B2** — implement the four missing abilities.
5. **D1–D8** — decide, per row, whether the card or the code is authoritative.
6. **E2** — re-run balance only after 1–5 land.

---

# F — What was changed

Every item above is resolved. `tsc --noEmit` clean; **148 tests pass, 0 fail**.

## The rule applied

**The printed card is authoritative; the code was changed to match it** — except
where the printed text was itself broken or contradicted the rest of the game.
Those exceptions are called out below.

## Engine

| File | Change |
|---|---|
| [`types.ts`](src/core/types.ts) | `pendingSpecialCalls` now carries the source zone; `CardInstance` gains `calledFromDeck` |
| [`effects.ts`](src/core/effects.ts) | `TriggerEvent.from`; `specialCall` records the origin zone; Thousand Knots' reroll now costs 1 Energy and is Main-phase only |
| [`game.ts`](src/core/game.ts) | the `placed` trigger forwards `from` |
| [`states.ts`](src/core/states.ts) | **Resonance releases at 6**, not 5 — matching all five Babaylan Codex |

`from` was needed because two printed abilities distinguish *where* a unit was
called from (Sari: "special called **from your deck**"; Healing Grove: "from
**deck or Heart**") and the engine had no way to tell.

## A1 — the scenario gates

All five now compare `myUnits(me)` against `myUnits(opponent)`. Verified by a new
regression test, [`codex-scenarios.test.ts`](src/core/codex-scenarios.test.ts):

```
PARITY (1 Persona each, 0 allies):   me=1 them=1
  "you control more"      = false   (was TRUE — fired from turn 1)
  "opponent controls more" = false
OPPONENT +1 ALLY:                     me=1 them=2
  "opponent controls more" = true    (was FALSE — needed a 2-ally lead)
YOU +2 ALLIES:                        me=3 them=2
  "you control more"       = true
```

**Confirmed live in simulation.** Over 30 games, auto-switch now fires for the
Codex that previously could not: `Hidden Path` 9 times and `Liguasan Marsh` 25
times — both are "opponent controls more Units", which before the fix required a
two-ally lead before it would ever open.

## Cards

| Item | Resolution |
|---|---|
| **B1** Bai-A-Labi | Both missing abilities implemented (Offer→Draw 1 & +5000; `[Eclipse]` attack pump, +1000 per Maguindanaon in Grave) |
| **B2** Sari | Missing "+1000 per ally to another Luzon Arch Unit" implemented; both abilities now correctly require a special call **from deck** |
| **C1** Amihan | Ability 1 is a plain Gather. **Ability 2 redesigned (see G1):** reveal the top 2 of your deck, special call them, this unit gains Power equal to the sum of their Power until end of turn; non-Units to the bottom. No Energy cost, no per-turn limit. |
| **C2** Makisig | Buff now points at **the allies**, as printed; ability 2 buffs the **called** unit by +2000 |
| **C3** Datu Salik | Called unit now **enters charged**; the unprinted third ability (Last Oath rider) removed |
| **C4** Berto | Now requires having been special called from deck, targets one of your **other** Luzon Arch allies, lasts until end of turn |
| **C5** Shared Ember | Now reveals **two** and calls one Unit among them. *The printed text was self-contradictory ("two cards… if **it** is a Unit") — I rewrote the card text too.* |
| **C6** Pulangi River | Cost is now paid **up front** (Offer 1, then Draw 2). Previously deferred to your next call, so **Draw 2 was free if you never called a unit**. |
| **C7** Healing Grove | Unprinted Main-phase restriction removed; now gated on "from deck or Heart" as printed |
| **D2** Storm Altar | 2 Kaluluwa → **1**, as printed |
| **D3** Thousand Knots | Reroll now only works during your Main. **The 1 Energy cost was dropped by design decision** — the reroll's only cost is sending the revealed card to the bottom. Card text updated to match. |
| **D6** Ilaya / Amaya / Maraya | Redundant "During your Main Phase" dropped from the ability text — activated abilities are already Main-only globally ([`game.ts` `legalActions`](src/core/game.ts)), so it was never a hidden restriction |
| **D7** Ulan | `1/turn` removed from both halves; text corrected to "until end of turn" (the code's actual duration) |
| **D8** Returning River | `[1/turn]` dropped from the text |

## Card text and rules

| Item | Resolution |
|---|---|
| **D4** Sentry | **The code was right, the cards were wrong.** All ten other decks print `[Cost: Reveal this card and 1 Energy]` and the engine charges it — so 1 Energy is the game-wide convention. Added the cost and the exile clause to Banoy and Panglima Sabir, and documented it in [`game-rules.md`](docs/game-rules.md). Bituon's 3 Energy stays as a deliberate exception. |
| **D5** Eclipse | Restored "**Maguindanaon** unit cards" on all five Codex — the engine only ever counted Maguindanaon units |
| **D1** Resonance | Fixed in the engine (5 → 6) rather than on five cards |

## E1 — the failing tests

Deleted the three scripts with no card (`bita-eclipse-wing-pah`,
`kuta-wato-abyssblade-panglima-zafir`, `black-standard-oathkeeper-sitti-maira`) —
none was referenced by `decks/maguindanao.json` — and corrected both stale
assertions from 28 to 25.

## E2 — balance impact

420 games, before → after:

| Deck | Before | After | |
|---|---|---|---|
| Mecha | 80.8% | **75.0%** | ↓ |
| Babaylan | 69.2% | **73.3%** | ↑ |
| Elf | 48.3% | 52.5% | |
| Knight | 53.3% | 52.5% | |
| **Maguindanao** | **32.5%** | **45.8%** | **↑ 13 points** |
| Oni | 39.2% | 33.3% | |
| **Agta** | **26.7%** | **17.5%** | **↓ 9 points** |

Maguindanao's jump is the two restored Bai-A-Labi abilities plus Salik's charged
call. It now sits in a normal band.

**Agta got worse, and that is the correct result.** The code had been giving it
power its cards do not print — a free +2000 on Amihan, a Persona-sized self-buff
on Makisig, a free Thousand Knots reroll. With the code honest, Agta's real
strength is 17.5%. **The deck was never as close to balanced as the old numbers
suggested.**

---

# G — Two design decisions this surfaced

Both are card-design calls, not bugs, so I have not changed them.

## G1 — Amihan's second ability: resolved

**Correction to my earlier claim.** I wrote that this ability was *"dead by
construction"* because Bayanihan fills all four Ally Zones. That was too strong.
**Bayanihan latches for the whole turn**: `reevaluateState` only re-checks
Overwhelm and Resonance, and `tryReleaseEventState` returns early once a State is
released, so it is never cleared mid-turn
([`states.ts`](src/core/states.ts)). Once released, a zone can open — an ally
dying in battle, a unit Offered — while Bayanihan is still on.

So the ability was never impossible, only **narrow**: it needs a zone to free up
after Bayanihan releases and before Amihan attacks. It fired **0 times in 100
simulated games**, which is why it read as dead.

**Ability 2 is now:**

> `[Bayanihan][Persona]: When this unit attacks, reveal the top 2 cards of your
> deck and special call them to Ally Zones. This unit gets Power equal to the sum
> of the Power of the units called this way, until end of turn. If you reveal a
> non-Unit, put it on the bottom of your deck.`

No Energy cost and no per-turn limit. The zone-pressure remains — it still wants
open Ally Zones under a State that fills them — but reading off the **deck**
rather than the **hand** means it no longer needs a specific card type held back,
and the payoff scales with whatever it hits.

## G2 — Agta is still the weakest deck

After the G1 redesign and dropping Thousand Knots' Energy cost, Agta sits at
**18.3%** — still the weakest deck by roughly 14 points. Remaining levers, from
the per-card fire counts in `agta-vs-mag.test.ts`:

| Card | Fire rate | Why |
|---|---|---|
| Ember-Pot Bearer, Berto | **10%** | the printed "special called **from your deck**" requirement is hard to line up with also supporting a Luzon Arch attacker |
| Firefly Pathkeeper, Aya | **2%** | same special-call-from-deck gate |
| Thousand Knots | **0%** | the reroll needs a non-Unit on top, an open zone, and Main phase, all at once |
| Returning River / Shared Ember | **0%** | the AI reaches their scenarios but the skills rarely find a legal target |

Agta's whole design routes through *special call from deck*, and four cards gate
their payoff on it a second time. That is the structural cause, not any single
card's numbers.
