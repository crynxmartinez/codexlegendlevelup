# Deck Redesign — Angel, Barbarian, Dryad

A design proposal, not yet implemented. Every card below shows its **current
skill** and the **proposed replacement**, so nothing is changed silently.

> **Angel has a deeper, standalone plan: [`redesign-angel.md`](redesign-angel.md).**
> It supersedes §5 below. This document remains the umbrella and holds the
> Barbarian and Dryad drafts, which have not had the same depth of pass yet.

**Scope**

- Three decks: **Angel**, **Barbarian**, **Dryad**.
- **Force and Sentry cards are untouched** — they are a shared 5-card template
  across all ten decks, and changing them would change every deck at once.
- That leaves **12 Angel**, **12 Barbarian**, **14 Dryad** cards, plus **6 Codex each**.

**Inspiration** — each deck is anchored to a *Cardfight!! Vanguard* clan, then
adapted to Codex Legends' own zones (Barriers, Codex, Energy, Persona level).

| Deck | Anchor | Borrowed idea |
|---|---|---|
| Angel | Oracle Think Tank + Keter Sanctuary | hand size, deck manipulation, extra drive checks, superior call |
| Barbarian | Tachikaze | retire your own units as a cost, "when retired" payoffs, equip gauge |
| Dryad | Neo Nectar | token swarm, **Bloom** (same-name units), tokens as cost fodder |

---

## 1. Research summary

### Oracle Think Tank → Angel
OTT's strategy is **hand size and drawing**: amass a large hand, keep guarding
until the opponent runs out of resources. They **manipulate the deck** — many
units look at the top card so you know what you will draw and what you will
Drive Check. Their keyword **Oracle** turns on at **5 or more cards in hand**.

### Keter Sanctuary → Angel (second layer)
Keter ride lines focus on **manipulating hand, deck and the drive check**, with
**superior calling from hand, deck or drop zone**, and abilities granting
**additional drive checks** or **Stand** effects during the battle phase.

> **Why both:** OTT alone is purely defensive. Keter supplies the offence —
> extra checks and superior calls — which is what turns a big hand into a win.

### Tachikaze → Barbarian
Tachikaze **retires its own rear-guards as a cost to gain Power**, and runs units
whose abilities **trigger when they are retired**, some of which **revive
themselves**. Their **Equip Gauge** stacks beneath units and is spent for power,
resources, or to unlock stronger abilities at a certain gauge count.

### Neo Nectar → Dryad
Neo Nectar's playstyle is **growth**: calling units that **share a name** with
units already on the field, and boosting units by shared name. **Plant tokens**
are low-power but nearly free, so they preserve hand advantage and act as **cost
fodder**. The **Bloom** keyword grants power and extra effects to same-name units.

---

## 2. What each deck becomes

### Angel — "the hand is the weapon"
Grace stays. What changes is that a big hand should **do** something beyond
adding power. Three new levers:

- **Foresight N** *(new keyword)* — look at the top N cards of your deck, put
  them back in any order. OTT's signature, and it makes the attack check
  predictable, which is the point.
- **Extra attack check** — the Keter/twin-drive idea. Angel's Persona can check
  twice, which doubles the chance of flipping a Force. This is Angel's win
  condition, not raw power.
- **Superior call** — special call from the **deck**, not just hand. Turns a
  Foresight into board presence.

### Barbarian — "eat your own"
Ravage stays, but the deck currently damages its own units without much payoff.
Two new levers:

- **Devour** *(new keyword)* — damaging your own unit as a cost. Renamed so the
  cost reads clearly and can be counted ("each time you Devour this turn").
- **Ember** *(new keyword)* — your **Grave** is the equip gauge. Many effects
  scale off *"the number of Barbarian units in your Grave"*, and several units
  **return from the Grave**, which is the Tachikaze revive pattern.

### Dryad — "many hands"
Ethereal and Stack stay. One new lever:

- **Bloom** *(new keyword)* — *"if you control another unit with the same name."*
  This is Neo Nectar's core, and it gives Dryad a reason to run 3 copies of a
  card and to special call **from the deck by name**.

Tokens remain the fodder: cheap bodies that pay costs without costing hand.

---

## 3. Codex assignments

Requirement: **each Codex must interact with a distinct part of the game.**
Six Codex, five pillars — the sixth is the archetype's engine Codex.

| # | Pillar | Angel | Barbarian | Dryad |
|---|---|---|---|---|
| 1 | **Draw** | Angelic Nexus Covenant | Savage Forge Stronghold | The Last Tree in Vereen |
| 2 | **Personify** | Seraphim Stronghold | Continental Heart | Hidden Door, Sylvora's Fall |
| 3 | **Main** | Ministry Castle Church | Molten Spikes | Hidden Mushroom Forest |
| 4 | **Attack** | Ivory Wings Fortress | Continental Pillars | Nature's Dweller Forest |
| 5 | **Broken Barrier** | Castle Beyond Clouds, Ezek'ia | Continental Barrier | Underwood Tide |
| 6 | **Engine** | Sky Church, Emerald | Mountain Top Bridges | Mirage Mushroom Tree |

**Personify is currently untouched by any Codex in any deck** — that is the
biggest gap this redesign closes. Persona level rises with broken Barriers, so
Personify is the natural comeback lever and nothing supports it today.

---

## 4. New keywords

| Keyword | Meaning | Deck |
|---|---|---|
| **Foresight N** | Look at the top N cards of your deck, put them back in any order. | Angel |
| **Extra check** | This attack performs one additional attack check. | Angel |
| **Devour** | Damage one of your own units as a cost. | Barbarian |
| **Ember N** | *Condition:* you have N or more Barbarian units in your Grave. | Barbarian |
| **Bloom** | *Condition:* you control another unit with the same name. | Dryad |

Existing keywords kept: Grace, Rally, Ravage, Ethereal, Stack, Echo, Screen.

---

## 5. Angel — moved

The Angel plan lives in its own document and has moved well beyond this draft:
**[`redesign-angel.md`](redesign-angel.md)**.

It now covers continuous Grace, passive phase-changing Codex, the 1-skill /
2-skill rule, Rally's removal, and the full card-by-card old-vs-new list.
Nothing about Angel in this file is current — go there instead.

---

## 6. Barbarian — card by card

### Codex

**Savage Forge Stronghold** — *Draw*
- **OLD:** When your unit is damaged by your ability, [1 Energy] draw one. If Ravage, Persona gains a power-on-damage aura.
- **NEW:** When you **Devour**, draw one *(once per turn)*. If Ravage is released, [1 Energy] **return one Barbarian unit from your Grave to your hand**.
- *Why:* makes the Grave a resource rather than a bin — the Tachikaze pattern.

**Continental Heart** — *Personify*
- **OLD:** When played or at start of Battle, [1 Energy] damage one from any player. If Ravage, Persona +2000 per open Ally zone.
- **NEW:** When played or **when you Personify**, [Devour] Your new Persona gets Power +3000 for each Barbarian in your Grave, until end of turn.
- *Why:* Personify becomes a burst turn, scaling off everything you have already eaten.

**Molten Spikes** — *Main*
- **OLD:** When played or at start of Main, [1 Energy] damage up to two of your allies. If Ravage and you damaged two, draw two.
- **NEW:** When played or at the start of your Main, [1 Energy] **Devour up to two**. Draw one for each unit devoured this way. If **Ember 4**, also special call one of them back from your Grave.
- *Why:* the self-cannibalising engine, with a payoff that grows as the Grave fills.

**Continental Pillars** — *Attack*
- **OLD:** When played or at start of Battle, [1 Energy] damage one of your allies. If Ravage, another unit gets +5000.
- **NEW:** When played or **when your unit attacks**, [Devour] That unit gets Power **+3000, and +2000 more if Ravage is released**. If it was a lvl 1 unit you devoured, draw one.
- *Why:* a real attack-step Codex — pay a body, swing bigger.

**Continental Barrier** — *Broken Barrier*
- **OLD:** When your Barrier breaks and the revealed card is not a Force, draw one. Then [Discard 1] draw one.
- **NEW:** When your Barrier is broken, **special call one Barbarian unit from your Grave** free of cost. If **Ember 6**, it gets Power +5000 until end of turn.
- *Why:* losing Barriers should make a Barbarian *angrier*, not poorer.

**Mountain Top Bridges** — *Engine*
- **OLD:** When played, [1 Energy] damage one unit from all players.
- **NEW:** **[pink] Continuous:** each time one of your units is sent to the Grave, your Persona gets Power +1000 until end of turn. When played, [1 Energy] damage one unit from all players.
- *Why:* the standing "eat = grow" aura that makes every other card in the deck read as a cost you *want* to pay.

### Units

| Card | OLD | NEW |
|---|---|---|
| **Savage Chieftain, Freyja** *(lv3)* | Blue: [Devour] damage an enemy ally, +5000. Ravage, on attack: draw one. | Blue 1/turn: [Devour] Damage one opponent Ally, and this unit gets +2000 for each Barbarian in your Grave. Ravage, on attack: draw one. |
| **Savage Earth, Ragnhildr** *(lv3)* | Blue: [Discard 1 + Devour] draw two. Ravage, on attack: +10000. | Blue 1/turn: [Devour] Draw two, then discard one. Ravage, on attack: this unit gets **+3000 for each Barbarian in your Grave**, until end of turn. |
| **Savage Reaver, Sigrun** *(lv3)* | Ravage, on attack: [Devour] +2000 per missing Barrier. Blue: [Devour] damage an ally, +5000. | Ravage, on attack: [Devour] +2000 per missing Barrier **on all players**. Blue 1/turn: **special call one Barbarian from your Grave**, then Devour it to give this unit +6000. |
| **Savage Kyrie, Bryska** *(lv1)* | When damaged by your ability: [1 Energy] draw a card. | **When this unit is sent to the Grave from the field, draw one.** *(no energy cost — this is the Tachikaze "eaten" payoff)* |
| **Savage Kyrie, Gisla** *(lv1)* | When damaged by your ability: [1 Energy] damage an enemy ally. | **When this unit is sent to the Grave from the field, damage one opponent Ally unit.** |
| **Savage Kyrie, Rane** *(lv1, 2000)* | First damage each turn is delayed to end of turn. | **When this unit is sent to the Grave from the field, you may special call it back at the end of your turn.** *(the self-reviving unit — the deck's engine)* |
| **Savage Warrior, Runa** *(lv2)* | Ravage: this unit gets +5000. | Ravage: this unit gets +5000. **When it is sent to the Grave, your Persona gets +3000 until end of turn.** |
| **Savage Barbarian, Edda** *(lv2)* | Ravage, on attack hit: draw one. | On attack hit: draw one. If **Ember 4**, [Devour] this unit stays **charged**. |
| **Savage Warrior, Audra** *(lv2)* | Each time a unit is damaged, +3000. | Each time a unit is sent to the Grave from the field, this unit gets **+2000** until end of turn. *(now counts all deaths, not only ability damage)* |
| **Savage Warrior, Siv** *(lv2)* | Ravage, on attack: +5000; damage this unit at end of turn. | On attack: this unit gets **+6000**. At the end of your turn, **Devour this unit**. |
| **Barbaric Tactic** *(Action lv1)* | [1 Energy] Damage one ally unit from all players. | [1 Energy] **Devour one**, then damage one opponent Ally unit. If Ravage is released, draw one. |
| **Flaming Soul** *(Action lv1)* | [1 Energy + Devour] Draw two. | [Devour] Draw two. If **Ember 4**, also return one Barbarian from your Grave to hand. |

---

## 7. Dryad — card by card

### Codex

**The Last Tree in Vereen** — *Draw*
- **OLD:** When you create a token, create that much plus one.
- **NEW:** When you create a token, create one more. **1/turn: when a token is sent to the Grave, draw one.**
- *Why:* keeps the signature doubler but adds the missing draw pillar, paid for with tokens.

**Hidden Door, Sylvora's Fall** — *Personify*
- **OLD:** When played and behind on Barriers, [1 Energy] create a wisp. If Ethereal, stack +1 to all tokens.
- **NEW:** When played or **when you Personify**, create two wisp tokens. If Ethereal is released, **Stack +1 to every token you control**.
- *Why:* Personify becomes the swarm turn.

**Hidden Mushroom Forest** — *Main*
- **OLD:** When played or at start of Main, [damage one token] stack one to another; three if Ethereal.
- **NEW:** When played or at the start of your Main, [1 Energy] **special call one unit from your deck that shares a name with a unit you control** *(Bloom)*. If Ethereal is released, create a wisp token as well.
- *Why:* the Neo Nectar superior-call-by-name engine, which is what Bloom exists to enable.

**Nature's Dweller Forest** — *Attack*
- **OLD:** When played or when Persona attacks, [1 Energy] Persona +1000; +1000 per wisp if Ethereal.
- **NEW:** When played or **when your Persona attacks**, [Stack 1 from one of your tokens] Your Persona gets Power +1000 **for each token you control**. If Ethereal is released, it gets +2000 each instead.
- *Why:* same fantasy, but now the swarm is *spent* to power the swing rather than being free.

**Underwood Tide** — *Broken Barrier*
- **OLD:** When Barrier breaks and revealed card is not a Force, create a token. Then [Discard 1] draw one.
- **NEW:** When your Barrier is broken, create **two** wisp tokens. If Ethereal is released, **special call one lvl 2 or lower Dryad from your Grave**.
- *Why:* the comeback pillar — rebuild the board the moment you take a hit.

**Mirage Mushroom Tree** — *Engine*
- **OLD:** When played or at start of Main, [1 Energy] mark a unit; when it dies create a wisp (stacked by level if Ethereal).
- **NEW:** **[pink] Continuous:** whenever one of your units is sent to the Grave from the field, create a wisp token. If Ethereal is released, **Stack +1 to it**.
- *Why:* a standing engine so the board rebuilds itself, which is what makes tokens-as-fodder safe to spend.

### Units

| Card | OLD | NEW |
|---|---|---|
| **Deadwood Reckoning, Myrtle** *(lv3)* | Blue: [damage a 3+ stack wisp] damage a lvl 2 or lower ally. Ethereal: +2000 per damaged wisp. | Blue 1/turn: [Stack 2 from your tokens] Damage one opponent Ally of lvl 2 or lower. Ethereal: this unit gets +2000 for each token sent to the Grave this turn. |
| **Verdant Seraph, Sylphrena** *(lv3)* | Ethereal blue: +1000 per token. Pink: when a Dryad leaves the field, stack 2 / create a wisp. | Pink: when one of your Dryad units leaves the field, create a wisp token. Ethereal blue 1/turn: [1 Energy] this unit gets +1000 per token, and **+2000 more for each Bloom pair you control**. |
| **Verdant Watcher, Briar** *(lv3)* | Ethereal: on attack/defend, [damage a wisp] +5000. Blue: [2 Energy] create a wisp per broken Barrier. | Blue 1/turn: [2 Energy] Create one wisp token for each broken Barrier. Ethereal, on attack: [Stack 1] this unit gets +5000 until end of turn. |
| **Verdant Green, Feylin** *(lv1)* | Blue: [damage this unit] create a wisp; draw if Ethereal. | When placed, create a wisp token. **Bloom:** create two instead. |
| **Verdant Green, Lirien** *(lv1)* | When a wisp is created, stack one to it. | When a wisp token is created, **Stack +1 to it**. **Bloom:** also draw one, once per turn. |
| **Verdant Glade, Yara** *(lv1)* | This unit counts as a 2-stack wisp. | This unit counts as a 2-stack wisp. **Bloom:** it counts as 4 instead. |
| **Verdant Seeress, Nymue** *(lv2)* | Ethereal, on attack hit: draw one. | On attack hit: draw one. **Bloom:** [Stack 1] search your deck for a card with the same name as this unit and add it to hand. |
| **Verdant Watcher, Yavanna** *(lv2)* | Ethereal blue: [1 Energy] +1000 per wisp. | Blue 1/turn: [1 Energy] this unit gets +1000 for each token you control. **Bloom:** +2000 each instead. |
| **Verdant Berde, Vesta** *(lv2)* | Blue: [damage a wisp] draw one, +2000. | Blue 1/turn: [Stack 1 from a token] Draw one, then this unit gets +3000 until end of turn. |
| **Verdant Grove, Misphelia** *(lv2)* | Ethereal: when a wisp is damaged, +1000 per stack. | When a token you control is sent to the Grave, this unit gets +2000 until end of turn. **Bloom:** +3000 instead. |
| **Spirit Aid** *(Action lv1)* | [1 Energy] All wisps get +1 stack. | [1 Energy] **Stack +1 to every token you control.** If Ethereal is released, create a wisp token as well. |
| **Nature's Trap** *(Action lv2)* | [1 Energy] Echo a unit, create wisps equal to its level. | [1 Energy] Echo one of your units, then create wisp tokens equal to its level. **If it was a Bloom pair, special call it back from your hand free of cost.** |
| **Wisp** ×2 *(Token lv0 2000)* | *(no text)* | *(unchanged — tokens stay blank; they are fodder, and text on them would slow every turn)* |

---

## 8. Balance notes and risks

**Angel — extra checks are the strongest new thing in the game.**
Each extra check is a free card *and* a Force chance. Currently 12 of 50 cards are
Force, so an extra check is roughly a **24% chance of a free double-mode Force**.
Recommend hard-capping this: **one extra check per turn**, regardless of how many
sources are online. Sky Church, Sabrina and Ivory Wings must not stack.

**Barbarian — Ember counts must exclude tokens.** Otherwise a token deck splashed
into Barbarian would inflate the Grave. Define Ember as *"Barbarian units in your
Grave"*, not "cards".

**Barbarian — Rane's self-revive can loop.** Devour Rane → return at end of turn →
Devour again next turn. That is intended and is Tachikaze's engine, but it must be
**once per turn** or it becomes infinite with any "when sent to Grave" payoff.

**Dryad — Bloom plus token doubling is the fastest board in the game.** Feylin with
Bloom creates 2, doubled by The Last Tree = 4 tokens from one card. Suggest The
Last Tree's doubler be **once per turn**.

**All three — the Personify Codex is untested design space.** Nothing in the game
currently rewards Personify, so these three cards have no precedent to balance
against. Build them last and simulate before trusting the numbers.

---

## 9. Open questions for the designer

1. **Extra check** — should the extra card also be added to hand, or only checked
   for a Force and then placed on the bottom? Adding it to hand is much stronger.
2. **Devour** — may you Devour the *Persona*, or only Allies? Persona-Devour would
   be a huge cost with a huge payoff.
3. **Ember** — count Barbarian units only, or every card in the Grave?
4. **Bloom** — does it need another unit **on the field**, or does a copy in hand
   or Grave also count? Field-only is cleaner and matches Neo Nectar.
5. **Foresight** — after looking, may you also send a card to the bottom, or only
   reorder the top? Reorder-only is closer to OTT.
6. Should the **Personify Codex** trigger on *any* Personify, or only on an
   **Ascend Break** into a lvl 4?

---

## 10. Implementation order

Nothing here is implemented yet. Suggested sequence:

1. **Confirm the six open questions above** — several change the card text.
2. Add the new keywords to `src/core/effects.ts`: `foresight()`, `extraCheck()`,
   `devour()`, and the conditions `ember(n)` and `bloom()`.
3. Extra check needs a hook in `battle.ts` — `doAttackCheck` currently reveals
   exactly one card.
4. Update `cards.csv` rules text, then regenerate: `python tools/build_carddata.py`.
5. Rewrite the three script files, one deck at a time, keeping tests green.
6. Re-run the balance sim per deck and compare against Angel's current baseline
   (60 games, 0 unfinished, ~8 turn median, near-even first/second split).

**Do not change Force or Sentry cards** — they are shared across all ten decks.
