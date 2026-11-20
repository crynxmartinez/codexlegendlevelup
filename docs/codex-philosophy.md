# The Codex — is it a sideboard, and should it become reactive?

A design position paper. **Verdict first, reasoning after.**

---

## The verdict

**Stay proactive. Do not build reactive Codex switching.**

But the current Codex is **not a sideboard yet** either — it is a *loadout*. Three
specific changes turn it into one, and none of them involve reactive triggers.

The analysis you were given diagnosed the symptom correctly and prescribed the
wrong medicine.

---

## 1. Where that analysis is right

Three of its points are genuinely correct and worth acting on:

1. **The opponent has no reason to care about your Codex.** True. This is the real
   problem.
2. **Auto-switch is not a decision.** True — and worse than stated. See §4.
3. **All the Codex answer the same question.** True, and this is the root cause.

Its final instinct — *"instead of touching a phase, we touch possible scenario"* —
**is the correct insight**. That is the fix. Hold onto it.

---

## 2. Where it is wrong

### It conflates *interaction* with *adaptation*

These are different things.

- **Interaction** = I can affect your turn.
- **Adaptation** = I change my plan because of what you are doing.

A reactive trigger gives you interaction. It does **not** give you adaptation.
"Opponent does X → I interrupt X" is binary. You did not change your gameplan;
you pressed a button.

### The reactive model it proposes is Yu-Gi-Oh hand traps — and that is a warning, not a target

Hand traps (Ash Blossom, Nibiru, Effect Veiler) are exactly the design being
proposed: face-down answers that fire on the opponent's action.

They are widely described by the YGO community as ["a band-aid that is desperately attempting to hold a game pushed well past the bounds of reason by power creep together"](https://steamcommunity.com/app/1449850/discussions/0/598517164755926125/?ctp=4), and criticised as poor design *except* at very low power levels. They also
[widen the gap between meta and non-meta decks](https://steamcommunity.com/app/1449850/discussions/0/598517164755926125/?ctp=4), because strong decks simply build to play through them.

Hand traps were a **response to a broken game**. Codex Legends is not broken in
that way. Importing the patch without the disease is how you inherit the disease.

### You already have the reactive slot filled

**Sentry** is your interrupt: reveal from hand, nullify damage to the Persona.
That is your hand trap, and it is well-scoped. Making Codex reactive **duplicates
design space you already spent**, and puts two mechanics in competition for the
same moment.

### The engine cost is severe and was not mentioned

Reactive switching during the opponent's turn requires a **priority system** —
windows where the non-turn player may act, with a defined order. Codex Legends
has no such system today. Every attack, every call, every Action would need a
"do you respond?" window.

The analysis even concedes the outcome: *"if every opponent action causes a switch
prompt, gameplay will become slow and annoying."* That admission should have
killed the proposal.

### It ignores your own playtest data

You said: *"players change codex most of the time to suit their strategy or to
optimize their moves and playstyle."*

**That is the system working.** Players are engaging with it, making choices,
finding value. You do not tear that out. You redirect it.

---

## 3. What a sideboard actually is — and what makes it work

The MTG sideboard is the canonical in-game-adjacent adaptation mechanic. It
works because of four properties, and **only one of them is about timing**:

| Property | MTG sideboard | Codex today |
|---|---|---|
| **Information** — you saw what they are doing | ✅ you played game 1 | ⚠️ partial — board is visible, Codex options are not |
| **Real alternatives** — the options answer *different* questions | ✅ hate cards vs catch-alls | ❌ **all answer "improve my engine"** |
| **Opportunity cost** — bringing one in means cutting something | ✅ 15 cards, hard choices | ❌ **switching is free** |
| **Opponent awareness** — they know you have answers | ✅ everyone knows sideboards exist | ❌ **they cannot see your options** |

Sideboarding [enables you to adapt to your opponent's strategy and address inherent weaknesses within your deck](https://aetherhub.com/Article/MTG-Sideboarding-Guide-What-Is-Sideboarding-How-And-Why-To-Do-It-FAQs--More), and building one means choosing between [narrow high-impact "hate" cards and lower-impact catch-all improvements](https://www.thecardboardchronicles.com/post/mtg-design-philosophy-rosewaters-answers-hold-up-except-for-one-gap).

**Notice that reactivity is not on the list.** Sideboarding happens *between*
games — the least reactive moment possible — and it is still the most adaptive
mechanic in card games. Adaptation comes from **information and alternatives**,
not from interrupt timing.

### The closer analogue: Pokémon Stadium cards

Stadiums are [passive or activated effects that apply to both players, with only one in play at a time](https://bulbapedia.bulbagarden.net/wiki/Stadium_card_(TCG)), and either player can replace the active one. This creates
[a tug-of-war where both players can benefit from or be hindered by the active Stadium](https://drawaperfectcircletool.com/news/how-stadium-cards-will-change-pokemon-tcg-pocket-forever/), producing
[actual strategic tension rather than "play your best cards on curve and hope"](https://gametyrant.com/news/how-stadium-cards-will-change-pokmon-tcg-pocket-forever-1).

Stadiums are **entirely proactive** — played on your turn, no triggers, no
priority windows — and they create more opponent-awareness than any hand trap,
because **they are face up and both players plan around them**.

That is the model your Codex should follow.

---

## 4. The real sin of auto-switch

Auto-switch is bad — but not because it is non-interactive.

**It is bad because it deletes the choice.** If the game switches you for free
when a condition is met, you never had to decide. The entire value of a sideboard
is *choosing under uncertainty*, and auto-switch removes the uncertainty and the
choosing in one move.

Same for the free manual switch. If switching costs nothing, you always take the
locally optimal Codex — which is **optimisation, not adaptation**. Adaptation
requires that switching *hurts a little*.

---

## 5. The distinction the analysis missed

This is the crux, and it dissolves the whole dilemma:

> **"When do you switch Codex" and "when does a Codex act" are two different
> questions. Reactive switching conflates them.**

| Question | Answer |
|---|---|
| **When do you switch?** | Proactively. Your Main. Once per turn. With a cost. |
| **When can a Codex act?** | *Any time* — including during the opponent's turn. |

You can have full opponent-turn interaction **without any reactive switching**.
Just let the *already-active* Codex have effects that trigger on the opponent's
turn:

> **Kuta Wato** — *while active:* when your opponent's unit attacks, ...

No priority window for switching. No prompt on every action. The Codex you
committed to two turns ago is now doing work on their turn, which is exactly the
tension you want: **you had to guess right in advance.**

That is *stance*, not *gotcha* — and stance is clearly the fantasy you are after.

---

## 6. My recommendation

### Keep
- Proactive switching, your Main phase, once per turn
- Your existing playtested behaviour — players already use this

### Remove
- **Auto-switch entirely.** It deletes the decision. This is the one part of the
  other analysis I fully agree with.

### Add — three changes, in order of leverage

**1. Make all Codex visible to both players.** *(highest leverage, near-zero cost)*

This single change converts your Codex from a private buff into a **public
threat**. Your opponent must now play around what you *could* switch to. This is
the Stadium lesson and the sideboard lesson: adaptation comes from the opponent
knowing your options exist.

**2. Re-axis the Codex from phases to board states.** *(your own insight — correct)*

You currently differentiate along **your turn structure**: draw / personify /
main / attack / barrier. Every Codex therefore answers *"how do I run my engine
better?"* — which is why switching feels like optimisation.

Differentiate instead along **observable board states**:

| Scenario the board shows | The Codex that answers it |
|---|---|
| Opponent controls more units than you | rebuild |
| Opponent is destroying your units | protect |
| Opponent has one huge attacker | gang up |
| Opponent floods the board | punish width |
| Opponent is racing your Barriers | comeback |

Now the question changes from *"which is best?"* to *"which answers what they are
doing?"* — and that is the sideboard question.

**3. Give switching a real cost.**

Options, cheapest to harshest:
- The new Codex is **inert for the rest of this turn** (commit a turn early)
- Switching **costs 1 Energy** (competes with your plays)
- You **cannot switch back** for two turns (real commitment)

I would start with the first. It preserves the decision without taxing tempo.

---

## 7. On the two-effects idea

**Two effects is right — with one discipline.**

> **Both effects must answer the same scenario.**

Otherwise you get toolbox soup: every Codex does a bit of everything, and the
differentiation you just built collapses again.

The matched-pair shape:

| Effect | Job |
|---|---|
| **1 — the read** | Fires on the board state this Codex is *for*. |
| **2 — the identity** | Ties that scenario back to your deck's own mechanic (Grace, Ravage, Bayanihan…). |

So a "they are flooding the board" Codex should have a punish-width effect **and**
a way that punishing width feeds your State. Not a punish-width effect plus an
unrelated draw.

**Balance guardrail:** with 5 visible Codex offering many answers, no single
effect should be as strong as a whole card. The power comes from **having the
right pair active at the right time**, not from raw rate.

---

## 8. The risk in the scenario model — read this before committing

Scenario-based Codex has one serious failure mode: **rock-paper-scissors**.

If your scenarios map one-to-one onto *decks* ("this Codex beats Maguindanao"),
the game becomes a lookup table and the skill evaporates.

**The discipline that avoids it:** scenarios must be **board states any deck can
produce**, not deck names.

- ❌ *"While your opponent is Maguindanao…"*
- ✅ *"While your opponent controls more units than you…"*

Any deck can flood a board. Any deck can go tall. Any deck can race. So every
Codex stays live in every matchup — it just turns on at different *moments*.

**Second guardrail:** aim for each Codex's condition to be true in roughly
**30–60% of games**. Below 30% it is a dead slot; above 60% it is not a scenario,
it is a default.

---

## 9. Answering your question directly

> *"Is it doing its job as an in-game sideboard, or should I follow the reaction style?"*

**It is doing about half the job.** It has the structure of a sideboard —
options outside the deck, one active, restricted switching — but not the
*substance*, because all the options sit on one axis and the opponent cannot see
them.

**Do not follow the reaction style.** It would:
- import Yu-Gi-Oh's most criticised mechanic
- duplicate your Sentry design space
- require a priority system you do not have
- create prompt fatigue its own author predicted
- and still not produce adaptation — only interruption

**Follow your own instinct instead**: *scenarios, not phases.* Then add visibility
and a switching cost. That gets you a real in-game sideboard while keeping the
proactive stance fantasy — and it keeps the playtest behaviour you already like.

---

## 10. How to test whether it worked

The current metric would be "codex switches per game." That is the wrong measure —
it counts activity, not adaptation.

Measure these instead:

| Metric | What it tells you | Healthy |
|---|---|---|
| **Distinct Codex used per game** | Are players cycling stances, or settling? | 2–3 of 5 |
| **Same-Codex rate across matchups** | Do players open differently vs different decks? | **< 60%** — above that, the axis is still wrong |
| **Switch-then-immediately-win rate** | Is switching decisive or cosmetic? | some, not most |
| **Dead-Codex rate** | How often is a Codex never switched to across many games? | **< 15%** per Codex |

**The single question that decides it:** if you show a playtester the opponent's
board and ask *"which Codex would you switch to?"* — can they answer, and do two
different players give different answers for different boards?

If yes, you have a sideboard. If they say "whichever advances my engine," you
still have a loadout.

---

# Part II — The synthesis: scenario as condition, phase as payload

> **The idea:** stop organising Codex *by* phase. Instead, gate a phase-changing
> effect behind an opponent-facing scenario.
>
> `WHILE <opponent board state> → YOUR <phase> becomes <better version>`

**This is the right answer**, and it is better than either option we were
choosing between. It keeps the powerful part of the phase design (a Codex
rewrites how your turn works — that is a real stance) and fixes the broken part
(all five answered the same question).

It also costs almost nothing to build: the phase-modification vocabulary is
already designed. Only the *condition* changes.

Two traps, though. Both are fatal if missed.

---

## Trap 1 — the payload must **remedy** the condition, not merely occur during it

This is the discipline that makes or breaks the whole model.

Take the example as written:

> ❌ *"If your opponent's field has more units than yours — replace your draw."*

Ask: **what does the player actually need in that moment?** They are behind on
board. They need **units**. Handing them cards does not answer the scenario — it
is a generic buff wearing a scenario costume. The condition and the effect are
unrelated, and the Codex is back to being a loadout with extra words.

> ✅ *"While your opponent controls more units than you: your draw step becomes —
> reveal the top three cards, special call one lv 2 or lower unit among them, put
> the rest on the bottom."*

Same phase. Same trigger. But now the effect **fixes the thing the condition
describes**. That is what makes a player think *"I should switch to this"* rather
than *"this is worth more value."*

### The test

For every Codex, write the sentence:

> *"My opponent is ______, so I switch to this because it lets me ______."*

If the second blank does not directly undo the first blank, the pair is wrong.

| Scenario | Wrong payload | Right payload |
|---|---|---|
| They have more units | draw cards | **put units on board** |
| They are destroying your units | draw cards | **protect or return them** |
| They have one huge attacker | draw cards | **combine your units' power** |
| They are racing your Barriers | draw cards | **defend, or recover on break** |
| They flood the board | draw cards | **punish width** |

Notice how easy it is for every row to become "draw cards." That is the gravity
this design has to fight.

---

## Trap 2 — scenarios must spread across the whole curve, not just "when losing"

Every scenario in the examples so far is a **losing** condition: behind on board,
being removed, being raced. If all five Codex only switch on when you are behind,
you have built a **rubber band**: falling behind becomes *good*, and the early
game stops mattering.

Aim for a spread:

| Position | Scenario | Stance |
|---|---|---|
| **Behind** | opponent controls more units | rebuild |
| **Behind** | opponent is breaking your Barriers | recover |
| **Even** | opponent commits a big attacker | gang up |
| **Even** | opponent floods the board | punish width |
| **Ahead** | you control more units, or they are empty | **press the advantage** |

At least one Codex should reward being ahead. Without it, the deck plays better
losing than winning, which feels wrong and is very hard to unwind later.

**Comeback discipline:** a "behind" Codex should restore **parity**, not create
advantage. Rebuilding to an equal board is satisfying. Rebuilding to a *better*
board than the player who was winning is the mistake most comeback mechanics make.

---

## What you lose by dropping phases as the axis — and how to keep it

The phase axis was doing one useful job you should not throw away: it
**guaranteed variety in the payload**. Five Codex, five different parts of the
turn.

Under scenarios alone, nothing stops all five from replacing the draw step.

**Keep phase as a secondary constraint:**

> **Primary axis — scenario.** *What does this Codex answer?* Every Codex must
> answer a different board state.
>
> **Secondary constraint — phase.** *Where does it act?* No two Codex in the same
> deck may modify the same phase.

That gives you a 5x5 grid to fill, and a fast way to spot a duplicate design.

| | Draw | Personify | Main | Attack | Barrier break |
|---|---|---|---|---|---|
| Behind on board | X | | | | |
| Being removed | | | X | | |
| They went tall | | | | X | |
| They flooded | | X | | | |
| Being raced | | | | | X |

One mark per row **and** per column. If two marks share a column, one of them
needs redesigning.

---

## On keeping auto-switch

Your argument: *"you can't auto-switch this turn if you switched last turn — so
there is a turn commitment."*

**That is a cooldown, not a cost.** They are different things:

- A **cooldown** limits how *often* you may act.
- A **cost** forces you to give something up *to* act.

A cooldown says "not too often." It never makes you choose between two things you
want. So on its own it does not create the decision that makes a sideboard a
sideboard.

**But there is a version of auto-switch that does work**, and it fits your game
well:

> **Auto-switch is the cheap, restricted route. Manual switch is the flexible,
> expensive one.**
>
> - **Auto-switch** — checked **once, at the start of your turn**. You may switch
>   to any Codex *whose scenario is currently true*. Free. Uses your switch.
> - **Manual switch** — during your Main. Any Codex, scenario or not. **Costs
>   1 Energy.** Uses your switch.

That gives you a real tradeoff:

> *"Two of my scenarios are live right now. I can take one free at the start of
> the turn — or pay Energy at Main to take the one I actually want, once I have
> seen how the turn develops."*

Crucially, it also fixes the prompt problem: **one decision point per turn**, not
a stream of interrupts. All eligible Codex are offered together and you pick one.

### Why this is genuinely better than pure manual

Auto-switch stops being *"the game noticed a condition and offered to switch."*
It becomes *"the board state has opened certain doors this turn — which one do
you walk through?"* That is a read of the opponent, made once, with a cost
attached to going off-script.

---

## Worked example — Angel, rebuilt on this model

Scenario as condition, phase as payload, one per row and column.

| Codex | Scenario *(condition)* | Phase *(payload)* | Effect |
|---|---|---|---|
| **Angelic Nexus Covenant** | Opponent's hand is larger than yours *(Grace is off)* | **Draw** | Your draw step becomes: **Foresight 3, then draw two.** |
| **Ministry Castle Church** | Opponent controls more units than you | **Main** | You may make **one additional normal play**, and the first unit you call each turn is called from the **top of your deck**. |
| **Ivory Wings Fortress** | You control more units than your opponent *(you are ahead)* | **Attack** | Your Persona's attack check **reveals two cards**; choose one as the check, bottom the other. |
| **Seraphim Stronghold** | Opponent's Persona is level 5 or higher | **Personify** | You may Personify using a lv 3 Hero from the **top 3 cards of your deck** as well as from your hand. |
| **Castle Beyond Clouds, Ezek'ia** | You have **two or fewer** Barriers | **Barrier break** | When your Barrier breaks, **special call one lv 2 or lower unit from your hand free of cost.** |

Read the spread:

- **Nexus** answers *"I am losing the hand war"* → refill. Fixes the condition.
- **Ministry** answers *"I am behind on board"* → put bodies down. Fixes it.
- **Ivory Wings** is the **ahead** Codex — it only turns on when you are winning, and it presses. This is the one that stops the rubber band.
- **Seraphim** answers *"they are outscaling me"* → climb faster.
- **Ezek'ia** answers *"I am about to die"* → rebuild on every hit.

Every row is a different board state. Every column is a different phase. No two
Codex answer the same question, and none of them is "draw cards" wearing a
costume.

Note that **Angel's five scenarios are deck-agnostic** — hand size, board count,
Persona level, Barrier count. Any opponent deck can produce any of them, which is
what keeps this out of rock-paper-scissors.

---

## What I would still not do

**Reactive switching during the opponent's turn.** Everything in Part I stands.
The synthesis above gives you the adaptation you wanted *without* a priority
system, without prompt fatigue, and without duplicating Sentry.

If you want opponent-turn presence, put it in the **effect** of an
already-active Codex — never in the switching.

---

## Revised success test

Same as Part I, plus one:

> Show a playtester two different opponent boards and ask which Codex they would
> switch to. **If the answer changes between the two boards, the model works.**

And the failure signal to watch hardest:

> If a Codex's condition is true in **more than ~70%** of turns, it is not a
> scenario — it is a default, and players will simply park on it.
