# Codex review — Agta, Maguindanao, Babaylan

Applies the model from [`codex-philosophy.md`](codex-philosophy.md) Part II:
**scenario as condition, phase as payload.**

**Verdict first:** Maguindanao's set is the strongest of the three and needs
tuning, not rebuilding. Babaylan has one dead card and one card with no
counterplay. Agta has five Codex that are all the same card. And all fifteen
share the same structural miss.

---

## 0. The cross-cutting problem — read this first

### Not one of these fifteen Codex looks at the opponent

Every `Auto-Switch:` line here is a **timing**, not a **condition**:

> Start of Turn · Persona Attack · Persona Attacked · Personify · Start of Main

A timing is a phase. Under the model we just agreed, the auto-switch gate is
supposed to be a **scenario** — an opponent-facing board state — and the phase is
supposed to be where the *payload* lands.

Auto-switch is **optional** — the game offers, you may decline — so it does not
delete the decision outright. But an optional switch on a *timing* is just a free
manual switch that happens to be offered at a fixed moment. It has **no condition
and no cost**, so the Part I critique stands unchanged: when switching costs
nothing you simply take whichever Codex is locally best. That is optimisation,
not adaptation.

Optionality also makes the prompting *worse*, not better — see below.

Every condition on all fifteen cards is inward-facing: *my* Grave count, *my* ally
zones, *my* Heart. **Nothing in any of these decks asks what the opponent is
doing.** So the sideboard question — *"which Codex answers what they're doing?"* —
currently has no answer in any of the three decks.

This is the highest-leverage fix and it is nearly free: keep the effects, change
the gate.

### Optional + timing = a prompt every turn, forever

Because the switch is optional, the game must **ask**. Because the gate is a
timing, that moment arrives every turn regardless of the board.

Agta has two Codex on *Start of Turn*. Babaylan has **three**. So Babaylan opens
every single turn of every single game with a three-way question that the board
state gives you no help answering. That is the prompt fatigue Part I predicted,
and it is self-inflicted by the gate, not by the optionality.

Scenario gating fixes it without making the switch mandatory: you still get one
optional offer at start of turn, but it lists only the Codex **whose scenarios are
currently true**. Most turns that is zero or one card and the prompt is trivial or
absent. When it is two, the question is finally interesting — *both of these doors
are open, which one do I walk through?*

Keep it optional. Just stop asking when nothing has changed.

### Eleven of fifteen print a State they never use

| Deck | Codex printing the State | Codex with an actual State-tagged ability |
|---|---|---|
| Agta | 5 | 2 (Hidden Path, Listening Canopy) |
| Maguindanao | 5 | 1 (Kuta Wato) |
| Babaylan | 5 | **0** |

Babaylan is the worst case: `[red]State - Resonance[/red]` appears on all five and
**not one ability references it**. Right now that line is decoration. Either every
Codex earns its State or the line should not be on the card.

---

## 0.5 The scenarios — all three decks on one grid

Rows are **scenarios** (the gate). Columns are **phases** (where the payload
lands). Every deck fills five cells, one per column, and no two Codex in a deck
share a row. This is the answer to *"what replaces the phase trigger."*

| Scenario *(the gate)* | Agta | Maguindanao | Babaylan |
|---|---|---|---|
| Opponent controls **more Units** than you | **Hidden Path** *(Draw)* | **Liguasan Marsh** *(Main)* | **Healing Grove** *(Main)* |
| Opponent's **hand is larger** than yours | — | **Pulangi River** *(Draw)* | **Heart Spring** *(Draw)* |
| Opponent's **Persona Level is higher** than yours *(you lead the race, they lead on resources)* | **Shared Ember** *(Personify)* | **Kuta Wato** *(Personify)* | **Ancestral Caverns** *(Personify)* |
| Opponent's **Persona power ≥ yours** | **Listening Canopy** *(Attack)* | — | — |
| **You** have 2 or fewer Barriers | **Returning River** *(Break)* | **Lake Buluan** *(Break)* | **Storm Altar** *(Break)* |
| **You control more Units** *(you are ahead)* | **Thousand Knots** *(Main)* | — | **Sacred Crown** *(Attack)* |
| **Opponent** has 2 or fewer Barriers *(finish them)* | — | **Illana Bay** *(Attack)* | — |

Three properties to check on any deck built this way:

1. **Every scenario is deck-agnostic.** Unit count, hand size, Persona level,
   Barrier count. Any opponent deck can produce any of them, so no Codex is dead
   in any matchup — it just turns on at different moments. This is the
   rock-paper-scissors guardrail from Part I §8.
2. **Every deck has at least one "you are ahead" row.** Thousand Knots, Illana
   Bay, Sacred Crown — plus the Persona Level row, which every deck runs. Without
   these the deck plays better losing than winning, and Codex Legend already
   rubber-bands hard through the Energy-per-broken-Barrier rule, so a set of five
   comeback Codex would compound it badly. The spread is now **four behind, three
   ahead**.
3. **Each payload remedies its own condition.** Behind on board → put units down
   (Hidden Path, Liguasan Marsh, Healing Grove). Losing the hand war → refill
   (Pulangi River, Heart Spring). Outscaled on Persona → climb faster (Shared
   Ember, Kuta Wato, Ancestral Caverns). Nearly dead → rebuild on every hit
   (Returning River, Lake Buluan, Storm Altar).

### Why the Persona Level row changed

The first draft of this row read **"Opponent's Persona Level ≥ yours"** and I
labelled it *"they are outscaling me, so climb faster."* **That label was
backwards, and the comparison was broken.** Both problems come from what Persona
Level actually is:

```
personaLevel(p) = your Persona card's printed level + YOUR OWN broken Barriers
```
([state.ts:74](src/core/state.ts:74))

So a **high Persona Level means you have taken damage.** The opponent's Level
being higher does not mean they are outscaling you — it means **they have been hit
more than you have.** You are *winning* the race. I had the row filed under
"behind" and it belonged under "ahead."

Two consequences:

1. **`≥` made it a default, not a scenario.** Both players start with a Level 3
   Persona and zero broken Barriers, so the condition is **true on turn 1** and
   true again on every tie. Part II's own failure signal — *any condition true in
   more than ~70% of turns is a default* — catches it immediately. Strict `>` fixes
   this: 3 vs 3 is false, and the row only opens once the race actually diverges.

2. **It was a fourth Barrier-race row in disguise.** Level is `3 + barriers
   broken`, so it measures the same axis as *"you have 2 or fewer Barriers"* and
   *"opponent has 2 or fewer Barriers."* Three rows out of seven on one stat is
   too concentrated; the grid stops discriminating.

**What the row is worth keeping for.** Once you read it correctly, it describes
the single most interesting position this game can produce, and it exists because
of Codex Legend's most original rule:

> `energyForTurn = personaLevel − 1` and `maxPlays = personaLevel`
> ([state.ts:93](src/core/state.ts:93))

Their broken Barriers give them **more Energy, more plays, and access to
higher-Level Personify targets.** So *"their Persona Level is higher than mine"*
means:

> **You are ahead on the win condition and behind on resources.**

That is a real, uncomfortable, decision-shaped board state — you are winning, and
if you coast you will be out-developed. And the remedy is exactly what the
Personify column already does: all three payloads (Shared Ember's Gather, Kuta
Wato's +5000 and Grave recursion, Ancestral Caverns' search-and-Essence) make
climbing cheaper, which is how you keep pace on development without giving up your
lead. **Condition and payload are linked by the rules, not by theme.**

It also fixes the curve skew. The old grid ran five "behind" rows against two
"ahead"; correctly filed, this one is an ahead-row, making it **four and three**.

### Options considered and rejected

| Candidate row | Why not |
|---|---|
| *Opponent controls an Ally with Power > your Persona's* | Dead slot. Lv 1–2 Allies top out at 9000 and Lv 3 Personas sit at 11000 — it needs a pump to ever be true. |
| *Opponent's total field Power exceeds yours* | Correlates ~1:1 with "more Units than you," so the two rows would fire together. Also a per-turn addition tax. |
| *Opponent has more Barriers than you* | Good fit for Personify — being behind is what unlocks high-Level targets — but it makes **four of seven rows** Barrier-count rows. |
| *Your Grave holds more Units than theirs* | Elegant coupling with Kuta Wato's Eclipse, but Maguindanao self-mills and Offers its own Units, so it would be permanently true for that deck. |
| *Opponent controls 1 or fewer Units* | A clean ahead-row, but ~20–30% frequency risks a dead slot, and "go wide is punished" is already Thousand Knots' and Hidden Path's axis. |

Note what the rows do to the *reading* of the game. Under the phase trigger, the
question at start of turn is *"which of my engines do I want running?"* — you can
answer it without looking up. Under the scenario gate you have to look at their
board first, because their board is what opened the door.

---

## 1. Agta — five Codex, one card

### The core problem

Line up the payloads:

| Codex | Payload |
|---|---|
| Hidden Path | reveal 2 → special call a Unit |
| Listening Canopy | Gather 1 (reveal 1 → special call a Unit) |
| Returning River | reveal 2 → special call a Unit |
| Shared Ember | reveal 1 → special call a Unit |
| Thousand Knots | Gather 1 (reveal 1 → special call a Unit) |

**All five are "reveal off the top and call a unit."** The phase spread is good —
draw / attack / barrier / personify / main, one each, exactly the uniqueness rule —
but the *payload* spread is zero. Switching between them isn't changing stance,
it's choosing which clock your one effect runs on.

Agta's identity is filling the board, so calling units is correct. But five Codex
should be five *different routes* to a full board, not five *timers* on the same route.

### Bug: the Bayanihan reward is disabled by Bayanihan

`ALLY_SLOTS = 4` ([types.ts:158](src/core/types.ts:158)) and Bayanihan releases only when
**all four** ally zones hold Luzon Arch Units ([states.ts](src/core/states.ts)).

So while Bayanihan is released there are, by definition, **zero open Ally Zones.**

Now read Hidden Path's reward:

> *"If Bayanihan is released, reveal three instead"* — and each reveal wants to go
> *"to an open Ally Zone."*

You reveal three and can call none of them. **The card's payoff for achieving its
State is switched off by the State.** Returning River and Shared Ember have the
same shape (they mostly escape it because they fire when your board is already
thinned, but the interaction is still wrong).

Listening Canopy is the one that gets this right — its released mode is
*"all your Units get Power +2000,"* which needs no open zone. That is the model.

> **Design rule to adopt:** *a State-released mode must never require a resource
> that the State's own condition consumes.*

### Power ordering is inverted

- **Hidden Path** *spends your draw step* to look at 2 and take 1.
- **Thousand Knots** keeps your draw, gathers for free at Main, **and rerolls.**

Thousand Knots does strictly more for strictly less. The card that pays a cost
should be the stronger one.

### What's good

**Returning River calls the unit exhausted.** That is genuine restraint — you
rebuild without getting a free counterattack out of losing. Keep that discipline.

### Rewrite

| Codex | Scenario *(gate)* | Phase | Payload |
|---|---|---|---|
| **Hidden Path** | Opponent controls **more Units** than you | Draw | Reveal 2, special call one Unit among them (the other to hand). **[Bayanihan]:** instead, reveal 3, add one to hand, and your Persona gets +5000 this turn. |
| **Shared Ember** | Opponent's Persona **Level is higher** than yours | Personify | On Personify from hand, Gather 1. **[Bayanihan]:** the called Unit also gains Power equal to your Persona's Level × 1000. |
| **Thousand Knots** | **You** control more Units than your opponent *(the ahead-Codex)* | Main | `[Main][1/turn][Cost: 1 Energy]` Gather 1 with one reroll. **[Bayanihan]:** your Units cannot be removed by opponent abilities this turn. |
| **Listening Canopy** | Opponent's Persona power **≥ yours** | Persona attack | As printed — it is already correct. |
| **Returning River** | You have **2 or fewer Barriers** | Barrier break | As printed — call exhausted. **[Bayanihan]:** draw 1 instead of calling (no zone is open). |

Three things changed: every gate now looks across the table, every
Bayanihan mode works with a full board, and Thousand Knots costs Energy so it
stops outclassing the card that pays with its draw step.

---

## 2. Maguindanao — the best of the three

Five genuinely distinct effects on five distinct phases. This set understands the
assignment. Four problems.

### Liguasan Marsh is the park-here card

> `[Main][1/turn]: Search your deck for a Level 1 unit and special call it.`

Unconditional. No cost. No State interaction. Free tutor **plus** a free body,
every turn, forever. In Part II terms this is the >70% default — players will lock
onto it and stop switching, and your playtest data will show one Codex used in
most games.

Fixes, cheapest first:
1. Gate it on a scenario (opponent has more Units) — then it *remedies* something
   instead of just being good.
2. Add a cost: `[Cost: 1 Energy]`, or the called Unit enters **exhausted**.
3. Make the search feed Eclipse: *"...special call it. Send the top card of your
   deck to the Grave."*

I would do 1 + 3. It becomes the board-refill answer **and** it advances Eclipse.

### Lake Buluan is all cost and no stated payoff

> *"Discard 1 card from your hand. Send the check card to its owner's Grave."*

Read what you actually give up when a Barrier breaks: normally that check card
**goes to your hand** and a Force on it **fires for free**. Lake Buluan throws away
the Force trigger, throws away the card, *and* discards a second card.

The payoff is real — it's the fastest Eclipse engine in the deck — but the card
never says so, and it is not even `[Eclipse]`-tagged. Two fixes:

- Tag the discard so it's clearly fuel: *"discard 1 Maguindanaon Unit"* (a cost
  that builds toward the thing you want).
- Give it a visible reward: *"**[Eclipse]:** ...and your Persona gets Power +5000
  until end of turn."*

Also worth asking whether "send the opponent's check card to the Grave" is the
intent — as written it hits *your* check card on *your* broken Barrier, which
denies your own Force. If denying the **opponent's** Force check was the goal,
that is a much better card and a real interaction, and it should say so.

### Illana Bay's upgrade condition is too steep

`+10000 if you Offered 3 or more Units this turn` — offering three Units is your
entire board, for +5000 over the baseline. Meanwhile Pulangi River gets a full
draw-2 for offering **one**. Bring it to **2 or more**, or raise the reward.

### Only Kuta Wato uses Eclipse

Eclipse is the deck's identity and four of five Codex ignore it. Kuta Wato's
`[Eclipse]: Personify into a Level 3 Maguindanaon from your Grave` is excellent —
it is the payoff the whole archetype is building toward. Give the other four a
smaller Eclipse clause each so the State matters no matter which one is active.

Note also that Kuta Wato carries **three** abilities where the others carry one.
Either that is deliberate (it is the marquee Codex) or it needs trimming.

### Rewrite — gates only

| Codex | Scenario *(gate)* | Phase | Change |
|---|---|---|---|
| **Pulangi River** | Opponent's **hand is larger** than yours | Draw | none |
| **Kuta Wato** | Opponent's Persona **Level is higher** than yours | Personify | none |
| **Liguasan Marsh** | Opponent controls **more Units** than you | Main | add Grave-fuel clause (above) |
| **Lake Buluan** | You have **2 or fewer Barriers** | Barrier break | clarify whose check card; add `[Eclipse]` reward |
| **Illana Bay** | **Opponent** has 2 or fewer Barriers *(the finisher)* | Persona attack | threshold 3 → 2 |

Illana Bay as the ahead-Codex is a clean fit: it only turns on when they are nearly
dead, and its job is to close. That's the "press the advantage" slot Part II asks for,
and it stops the set from only rewarding you for losing.

---

## 3. Babaylan — one dead card, one card with no counterplay

### Heart Spring is strictly worse than two of its siblings

> *"At your Draw Step, instead of drawing, Essence 1 card from the top of your deck."*

You give up a card to put one card in Heart. Now compare, in the same deck:

| Codex | Heart gained | Card cost |
|---|---|---|
| **Heart Spring** | +1 per turn | **–1 card every turn** |
| **Healing Grove** | +1 per special call | free |
| **Storm Altar** | +2 per Barrier break | free |

Healing Grove and Storm Altar both build Heart **faster and for nothing.** Heart
Spring will never be switched to. This is a dead Codex — the metric in Part II
flags it immediately.

**Fix:** make it the *fast* Heart route rather than a worse one.

> **Heart Spring** — *Your draw becomes: Essence the top 2 cards of your deck, then
> draw 1.* **[Resonance]:** Essence 3 instead.

Same cards in hand, +2 Heart. Now it competes.

### Sacred Crown's top tier removes counterplay

> `20+ — Opponent cannot call Level 1 or higher to defense.`

That is *cannot block at all*. And the tier below it — `12+ — cannot call Level 2
or higher` — is already most of the way there. With Healing Grove or Storm Altar
running, Heart climbs fast, and Personify feeds Heart passively on top of that.

An unblockable Persona is a win condition with no answer, which is the one thing
that reliably makes a card feel bad to lose to. Keep the ceiling **decisive but
answerable**:

| Heart | Current | Suggested |
|---|---|---|
| 6+ | Power +5000 | Power +5000 |
| 12+ | no Lv 2+ defense | no Lv 2+ defense |
| 20+ | **no defense at all** | **if this attack hits, break 2 Barriers** |

They can still block. If they can't, they lose twice as fast. Same clock, real
decision on the other side of the table.

### Storm Altar stacks a fourth reward onto losing

A broken Barrier already gives you **+1 Energy, +1 play, and +1 Persona Level**
(the deliberate rubber-band in [`codex-design-vision.md`](codex-design-vision.md)).
Storm Altar adds **+2 Kaluluwa and eventually a draw** on top. That's four rewards
on one event, and it makes being hit actively desirable.

Per the comeback discipline in Part II: a behind-Codex should restore **parity**,
not create advantage. Either drop it to 1 Kaluluwa, or keep 2 and remove the draw.

### Two different counters on one resource

Sacred Crown counts **cards in Heart** (6/12/20). Storm Altar counts **Kaluluwa
tokens specifically** (10+) — a separate count, tracked separately in
[`effects.ts`](src/core/effects.ts) (`kaluluwaCount` vs `heart.length`). Players
have to hold two numbers for one zone.

Unify on **Heart count**, and let Kaluluwa be *how you cheaply grow Heart*. Storm
Altar's clause becomes *"if your Heart has 12 or more cards, draw 1."*

### Resonance is dead text on all five

Not one of the five has a `[Resonance]` ability. Give each Codex one released
clause — the suggestions above already add two (Heart Spring, and see below).

### Rewrite

| Codex | Scenario *(gate)* | Phase | Payload |
|---|---|---|---|
| **Heart Spring Beneath the Ancient Balete** | Opponent's **hand is larger** than yours | Draw | Essence 2, then draw 1. **[Resonance]:** Essence 3. |
| **The Ancestral Caverns of Samar** | Opponent's Persona **Level is higher** than yours | Personify | as printed. **[Resonance]:** you may Essence it from your Heart's top instead of searching. |
| **The Healing Grove of Bandilaan** | Opponent controls **more Units** than you | Main | as printed. **[Resonance]:** the first token you create each turn is called to an Ally Zone instead. |
| **The Sacred Crown of Kanlaon** | **You** control more Units than your opponent *(the ahead-Codex)* | Persona attack | retuned tiers above |
| **The Storm Altar of Madja-as** | You have **2 or fewer Barriers** | Barrier break | 1 Kaluluwa (down from 2); **[Resonance]:** 2 instead. |

Healing Grove's Resonance clause is the important one — it finally gives Babaylan
a reason to convert Heart back into board presence, which is the thing the deck
otherwise cannot do.

---

## 4. Summary of changes

| # | Deck | Change | Why |
|---|---|---|---|
| 1 | **all** | Replace timing gates with opponent-facing scenarios | Nothing currently looks across the table |
| 2 | **all** | One Codex per scenario **and** per phase | Two Agta and three Babaylan share "Start of Turn" |
| 3 | **all** | Every Codex gets a State-tagged clause, or drops the State line | 11 of 15 print an unused State |
| 4 | Agta | Differentiate the five payloads | All five are "reveal → call" |
| 5 | Agta | Bayanihan modes must not need an open zone | The State fills all four zones |
| 6 | Agta | Cost Thousand Knots 1 Energy | Currently beats Hidden Path for free |
| 7 | Mag. | Gate + cost Liguasan Marsh | Unconditional free tutor = the park-here card |
| 8 | Mag. | Clarify and reward Lake Buluan | All cost, no stated payoff, kills your own Force |
| 9 | Mag. | Illana Bay 3 Offers → 2 | Steeper than Pulangi River for less |
| 10 | Bab. | Rebuild Heart Spring | Strictly worse than two siblings — dead card |
| 11 | Bab. | Retune Sacred Crown's 20+ tier | Unblockable = no counterplay |
| 12 | Bab. | Storm Altar 2 Kaluluwa → 1 | Fourth reward stacked on one event |
| 13 | Bab. | Unify Heart count vs Kaluluwa count | Two counters on one zone |

Ordered by leverage: **1, 4, 10, 11, 7** first. Those five carry most of the value.

---

## Appendix — as-printed card text

The text this review was written against. Kept here so the doc is self-contained;
update it whenever the cards change.

### Agta

**Hidden Path** — *Auto-Switch: Start of Turn*
> `[red]`Bayanihan - When all of your Ally Zones are occupied by Luzon Arch Units, release Bayanihan until end of turn.`[/red]` `[blue]`At the start of your Draw Phase, instead of drawing, reveal the top two cards of your deck. Choose one — if it is a Unit, special call it to an open Ally Zone (otherwise add it to your hand). Place the other on the bottom. If Bayanihan is released, reveal three instead.`[/blue]`
>
> *Gather* — Reveal the top card of your deck. If it is a Unit, special call it to an Ally Zone. Otherwise, place it on the bottom.

**Listening Canopy** — *Auto-Switch: Persona Attack*
> `[red]`Bayanihan - When all of your Ally Zones are occupied by Luzon Arch Units, release Bayanihan until end of turn.`[/red]` `[green][1/turn]`: When your Persona attacks, `[Cost: 1 Energy]` Gather 1. A Unit called by this effect gets Power +2000 until end of turn. If Bayanihan is released, all your Units get Power +2000 until end of turn.`[/green]`

**Returning River** — *Auto-Switch: Persona Attacked*
> `[red]`Bayanihan - When all of your Ally Zones are occupied by Luzon Arch Units, release Bayanihan until end of turn.`[/red]` `[green][1/turn]`: When your Barrier is broken by a non-Force check card, reveal the top two cards of your deck. Choose up to one Unit and special call it to an open Ally Zone as exhausted. Place the rest on the bottom.`[/green]`

**Shared Ember** — *Auto-Switch: Personify*
> `[red]`Bayanihan - When all of your Ally Zones are occupied by Luzon Arch Units, release Bayanihan until end of turn.`[/red]` `[green]`When you Personify from your hand, reveal the top card of your deck. If it is a Unit, special call it to an open Ally Zone. Otherwise, place it on the bottom of your deck.`[/green]`

**Thousand Knots** — *Auto-Switch: Start of Main*
> `[red]`Bayanihan - When all of your Ally Zones are occupied by Luzon Arch Units, release Bayanihan until end of turn.`[/red]` `[blue][Main][1/turn]`: You may Gather 1. If the revealed card was not a Unit, you may reveal the next card of your deck instead (reroll once). Place the non-Unit card on the bottom of your deck.`[/blue]`
>
> *Gather* — Reveal the top card of your deck. If it is a Unit, special call it to an Ally Zone. Otherwise, place it on the bottom.

### Maguindanao

**Illana Bay** — *Auto-Switch: Persona Attack*
> `[red]`Eclipse - While there are 5 or more Maguindanaon unit cards in your Grave, Release this State.`[/red]` `[blue][1/turn]`: When your Persona attacks, it gets Power +5000 for that battle. If you Offered 3 or more units this turn, it gets Power +10000 instead.`[/blue]`

**Kuta Wato** — *Auto-Switch: Start of Turn*
> `[red]`Eclipse - While there are 5 or more Maguindanaon unit cards in your Grave, Release this State.`[/red]` `[green]`When you Personify from your hand, the new Persona gets Power +5000, until end of turn.`[/green]` `[red][Eclipse]`: You may Personify into a Level 3 Maguindanaon unit from your Grave.`[/red]`

**Lake Buluan** — *Auto-Switch: Persona Attacked*
> `[red]`Eclipse - While there are 5 or more Maguindanaon unit cards in your Grave, Release this State.`[/red]` `[green][1/turn]`: When one of your Barriers is broken, discard 1 card from your hand. Send the check card to its owner's Grave.`[/green]`

**Liguasan Marsh** — *Auto-Switch: Start of Main*
> `[red]`Eclipse - While there are 5 or more Maguindanaon unit cards in your Grave, Release this State.`[/red]` `[blue][Main][1/turn]`: Search your deck for a Level 1 unit and special call it.`[/blue]`

**Pulangi River** — *Auto-Switch: Start of Turn*
> `[red]`Eclipse - While there are 5 or more Maguindanaon unit cards in your Grave, Release this State.`[/red]` `[blue]`Replace your draw — `[Cost: Offer 1 of your units]` Draw 2.`[/blue]`

### Babaylan

**Heart Spring Beneath the Ancient Balete** — *Auto-Switch: Start of Turn*
> `[red]`State - Resonance`[/red]` `[green]`At your Draw Step, instead of drawing, `[Essence]` 1 card from the top of your deck.`[/green]`

**The Ancestral Caverns of Samar** — *Auto-Switch: Start of Turn*
> `[red]`State - Resonance`[/red]` `[green]`When you Personify to a Level 3 or higher unit, search your deck for a unit, reveal it, then `[Essence]` it.`[/green]`

**The Healing Grove of Bandilaan** — *Auto-Switch: Start of Turn*
> `[red]`State - Resonance`[/red]` `[green]`each time you special call a unit or token to the field, create a `[Kaluluwa]` token and `[Essence]` it.`[/green]`

**The Sacred Crown of Kanlaon** — *Auto-Switch: Persona Attack*
> `[red]`State - Resonance`[/red]` `[green]`When your Persona attacks, it gains bonuses per cards in Heart:`[/green]`
> - 6+ — Persona gets Power +5000.
> - 12+ — Opponent cannot call Level 2 or higher to defense.
> - 20+ — Opponent cannot call Level 1 or higher to defense.

**The Storm Altar of Madja-as** — *Auto-Switch: Persona Attacked*
> `[red]`State - Resonance`[/red]` `[green]`When your Barrier is broken and it is not a Force card, create 2 `[Kaluluwa]` tokens and `[Essence]` them. If you have 10 or more `[Kaluluwa]` tokens, draw 1 card.`[/green]`

### Quick index of the phases as printed

| | Draw | Personify | Main | Persona Attack | Persona Attacked |
|---|---|---|---|---|---|
| **Agta** | Hidden Path | Shared Ember | Thousand Knots | Listening Canopy | Returning River |
| **Maguindanao** | Pulangi River | Kuta Wato | Liguasan Marsh | Illana Bay | Lake Buluan |
| **Babaylan** | Heart Spring | Ancestral Caverns | Healing Grove | Sacred Crown | Storm Altar |

All three decks already fill the phase grid one-per-column. It is the **row** —
the scenario each one answers — that is missing.

Note the mismatch between this grid and the printed `Auto-Switch:` lines: Pulangi
River, Kuta Wato, Heart Spring, Ancestral Caverns and Healing Grove all say *Start
of Turn* even though their payloads land on Draw, Personify and Main. That is the
same conflation the review flags in §0 — the trigger line is naming a moment, not
the phase the card actually rewrites.
