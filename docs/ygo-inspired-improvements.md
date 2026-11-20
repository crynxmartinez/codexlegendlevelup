# YGO-Inspired Improvements — Angel, Barbarian, Dryad

Analysis of three Yu-Gi-Oh archetypes and how their mechanics can inspire
improvements to our Codex skills and deck cards. **Planning only — no
implementation yet.**

---

## Source Archetypes — Key Mechanics Extracted

### Spellbook / Prophecy (→ Angel)

**Core loop**: Cast Spellbooks → accumulate them in Grave → payoffs scale off
how many Spellbooks you've used. Hand stays full through searching + drawing.

| Mechanic | What it does | Why it's interesting |
|---|---|---|
| **Spellbook of Secrets** | Search any Spellbook from deck | Tutoring — every turn you find exactly what you need |
| **Spellbook of Judgment** | At End Phase: add Spellbooks from deck to hand = number of spells cast this turn, then Special Summon a Spellcaster whose level ≤ cards added | MASSIVE payoff for playing lots of spells — the more you do, the more you get |
| **Spellbook of Knowledge** | Send a Spellbook or Spellcaster to Grave → draw 2 | Resource conversion — trade used cards for fresh ones |
| **Spellbook of Power** | +1000 ATK, and if the monster destroys an opponent's monster in battle → search a Spellbook | Combat-rewarded searching — fighting grows your hand |
| **Spellbook of Wisdom** | Protect a Spellcaster from Spells or Traps for the turn | Protection — keep your engine safe |
| **High Priestess of Prophecy** | Banish a Spellbook from Grave → destroy any card | Grave as ammo — used Spellbooks become destruction |
| **Reaper of Prophecy** | When summoned: if 3+ Spellbooks in Grave → +600 ATK. 4+ → search. 5+ → Special Summon from deck | Scales off Grave count — hoarding used resources = escalating payoff |
| **Spellbook Magician of Prophecy** | When Normal Summoned → search a Spellbook | Monster that searches on summon — every body replaces itself |
| **Spellbook Tower** (Field Spell) | Instead of normal draw: reveal top 3, add 1, rest to bottom. If a Spellcaster is destroyed → Special Summon it by banishing a Spellbook from Grave | Draw replacement + Grave revival |

**Key philosophy**: The Grave is a SECOND HAND. Cards you've used aren't gone —
they're ammo for future effects. The more you play, the stronger you get.

---

### True King / True Draco (→ Barbarian)

**Core loop**: Destroy your own monsters → trigger floating effects → summon
bigger threats. Destruction IS the resource, not just the cost.

| Mechanic | What it does | Why it's interesting |
|---|---|---|
| **True King summon** | Destroy 2 monsters from hand/field (including one matching attribute) → Special Summon this card. If BOTH match attribute → bonus banish effect | Sacrifice = summon. The cost IS the play. Matching attributes = bonus |
| **Floating on destruction** | When destroyed by card effect → search or Special Summon a Wyrm of different attribute | Dying = advantage. You WANT your stuff destroyed |
| **Dragonic Diagram** (Field Spell) | +300 ATK. Protect from battle. Destroy ANY card you control → search a True Draco/True King | Destroy = search. Any card, any reason. Universal sacrifice → reward |
| **True Draco monsters** | Tribute Summon using Continuous Spells/Traps instead of monsters. When opponent activates effect → search | Reactive searching. Tribute Spells/Traps as fuel. Opponent's plays feed you |
| **Disciples of the True Dracophoenix** | Once per turn: shuffle 3 True Draco cards from Grave back to deck → draw 1 | Grave recycling. Used cards come back + you draw |
| **True King's Return** (Continuous Trap) | If you Tribute Summon a True Draco → Special Summon a monster from Grave | Tribute = revive. The summon itself brings back the dead |
| **True King of All Calamities** (boss) | Change all monsters to declared attribute. Suppress opponent monsters of that attribute from activating effects/attacking | Control — lock the opponent out |

**Key philosophy**: Destruction is not loss — it's TRIGGER. Every dead unit
feeds the next play. The Grave is a staging area for recursion, not a
graveyard.

---

### Sylvan (→ Dryad)

**Core loop**: Excavate (reveal top of deck) → send Plants to Grave → trigger
their effects → chain combos. The deck IS your hand.

| Mechanic | What it does | Why it's interesting |
|---|---|---|
| **Excavate** | Reveal top N cards of deck. Plants go to Grave (and trigger). Non-Plants go to bottom of deck | Deck manipulation = Grave triggers. You play cards FROM the deck |
| **When excavated & sent to Grave** | Each Sylvan has an effect that fires when it's excavated and sent to Grave | Chain combos from the deck. One excavate can trigger 3 effects |
| **Mount Sylvania** (Field Spell) | Send a Plant from hand/field to Grave → place any Sylvan card from deck on TOP of deck. At opponent's End Phase → excavate | Deck stacking + free excavate. You set up your own combos |
| **Sylvan Charity** | Draw 2, then place 1 card from hand on top or bottom of deck | Draw + filter. Hand manipulation that sets up excavate |
| **Sylvan Hermitree** | Excavate top. If Plant → send to Grave + draw 1. If not → bottom. When excavated & sent to Grave → look at top 3, reorder | Dig + reorder. Sets up future excavates |
| **Sylvan Sagequoia** | When a Sylvan is sent to Grave → Special Summon from hand. Excavate top. When excavated & sent to Grave → recover a Sylvan Spell/Trap from Grave | Revive + recover. Grave is a resource pool |
| **Sylvan Marshalleaf** | When Normal Summoned → excavate. When excavated & sent to Grave → destroy 1 opponent's face-up card | Excavate = removal. Summoning triggers deck destruction |
| **Sylvan Flowerknight** | When Normal Summoned → excavate. Can place any Sylvan card from deck on top of deck | Search to top. Sets up the next excavate |
| **Miracle Fertilizer** | Once per turn: banish 1 Plant from Grave → Special Summon 1 Plant from Grave | Grave as revival. Banish cost = revive payoff |

**Key philosophy**: The deck is an extension of your hand. Excavating creates
chain reactions. Every card in the deck is live — you just need to dig to it.
The Grave is a trigger zone, not a discard pile.

---

## Proposed Improvements

### Angel / Grace — Inspired by Spellbook/Prophecy

**Theme to steal**: "The Grave is a second hand. The more you play, the stronger you get."

#### Problem with current Angel

Angel's current identity is "hand size = power." But the rally mechanic (send
to bottom of deck) means cards are GONE — you don't get them back. There's no
Grave interaction at all. The deck is one-dimensional: draw, rally, buff.
Once you've rallied your bad cards, they're lost forever.

Spellbook's insight: **used resources should become ammo**. Angel should be
able to RECOVER rallied cards or use the bottom-of-deck as a resource.

#### Codex Skill Improvements

**Ezekia** (replacement: draw 1, rally 1, draw 1)
- *Current*: Simple filter. Net +1 hand.
- *Inspired change*: **Draw 1, then rally 1, then draw 1. If the rallied card
  was a unit, you may put it on top of your deck instead of the bottom.**
- *Why*: Inspired by Spellbook Tower (reveal top 3, add 1, rest to bottom).
  Angel should be able to RECYCLE rallied units, not just lose them. The
  decision: do you send the bad card to the bottom (gone) or put it on top
  (you'll draw it next turn but it clogs your next draw)?

**Ivory Wings** (auto: rally 1 + scry top on persona attack)
- *Current*: Rally a dead card, peek at top, decide top/bottom.
- *Inspired change*: **Rally 1, then look at the top 2 cards of your deck.
  Put one on top and one on bottom.** (Upgraded from 1 card to 2.)
- *Why*: Inspired by Spellbook Tower (reveal top 3, add 1, rest to bottom).
  Seeing 2 cards creates a real decision — which do you keep, which do you
  bury? More filtering power.

**Ministry Castle** (action: pay 1 energy, rally unit, special call top of deck)
- *Current*: Up to 3×/turn. Rally a unit, special call the top card.
- *Inspired change*: **Up to 2×/turn. Pay 1 energy — rally 1 unit from your
  hand or field, then look at the top 3 cards of your deck. Special call one
  of them (if it's a unit). Put the rest on top in any order.**
- *Why*: Inspired by Spellbook of Secrets (searching) + Spellbook Tower
  (reveal top 3). Instead of blind-flipping the top card, you get to CHOOSE
  from the top 3. This makes the rally cost feel worth it — you're not
  gambling, you're tutoring. Reduced from 3× to 2× because the effect is
  stronger.

**Sky Church** (auto: +2000 if Grace on)
- *Current*: Flat +2000 power. Simple but boring.
- *Inspired change*: **If Grace is active, your Persona gains +1000 power
  for each card in your hand above your opponent's hand count.**
- *Why*: Inspired by Reaper of Prophecy (scales off Grave count). Instead of
  a flat buff, Sky Church scales off the HAND DIFFERENCE. If you have 7 cards
  and opponent has 4, that's +3000. If you have 5 and opponent has 4, that's
  +1000. This makes Grace's condition MATTER — the bigger your lead, the
  bigger the buff. It also means Sky Church is weak when you're barely ahead
  and huge when you're dominating.

**Angelic Nexus Covenant** (auto: rally 1 + draw 1 on non-Force barrier break)
- *Current*: Consolation for bad barrier flips.
- *Inspired change*: **When your barrier breaks, if the barrier check is not
  a Force, draw 1. Then, if you have more cards in hand than your opponent,
  you may put the broken barrier's check card into your hand instead of
  sending it to the check zone.**
- *Why*: Inspired by Spellbook of Knowledge (trade resources for draw) +
  High Priestess (Grave as ammo). Instead of just rallying + drawing, you
  RECOVER the revealed card if Grace is active. The barrier check card
  normally goes to hand after resolving — but this lets you keep it as a
  bonus. The Grace condition makes it a real payoff for maintaining hand
  advantage.

#### Main Deck Card Improvements

**New mechanic: "Recover from bottom of deck"**
Inspired by Spellbook's Grave-as-resource. Angel rallies to bottom of deck —
what if some cards can pull from the bottom?

- **New ability on a unit**: "When this unit is placed, put the bottom card
  of your deck on top of your deck." — Simple deck manipulation that
  synergizes with rally. You rallied a bad card? Now it's on top, and you
  can choose to draw it or use it with Ivory Wings/Ministry Castle.

- **New ability on a unit**: "When this unit attacks, you may rally 1 card
  from your hand. If you do, draw 1 card." — Inspired by Spellbook of
  Knowledge (trade for draw). Rally + draw = filter while attacking.

**New mechanic: "Cards drawn this turn" counter**
Inspired by Spellbook of Judgment (count spells cast → payoff at End Phase).

- **New ability on a Persona**: "At the end of your turn, if you drew 3 or
  more cards this turn, special call a unit from your deck." — Rewards the
  draw-heavy playstyle. The more you draw, the more board presence you get.

**New mechanic: "Combat-rewarded search"**
Inspired by Spellbook of Power (destroy monster in battle → search).

- **Modify Geoffrey**: "When this unit's attack hits, search your deck for
  an Angel card and put it on top of your deck." — Instead of just drawing
  1, you SEARCH for what you need and put it on top. Sets up your next draw
  or Ivory Wings peek.

**New mechanic: "Protection through hand"**
Inspired by Spellbook of Wisdom (protect Spellcasters).

- **New ability on a Sentry**: "When your Persona would take damage, you may
  rally 2 cards from your hand instead of exiling this card. Prevent that
  damage." — Hand as shield. You keep the Sentry for next time, but pay with
  hand size — which might turn off Grace.

---

### Barbarian / Ravage — Inspired by True King/True Draco

**Theme to steal**: "Destruction is not loss — it's TRIGGER. Every dead unit
feeds the next play."

#### Problem with current Barbarian

Barbarian's current identity is "damage your own units as cost." But the
payoff is mostly just +power buffs and draw. The units that get damaged just
die and go to Grave — there's no recursion, no floating, no "dying = advantage"
beyond Audra's +3000. The Grave is a dead zone.

True King's insight: **destruction should TRIGGER effects, not just be a
cost.** Units should WANT to be damaged. And the Grave should be a staging
area for recursion.

#### Codex Skill Improvements

**Continental Heart** (replacement: damage 1 unit → special call lvl 1 from deck)
- *Current*: Skip draw, sacrifice a unit, get a lvl 1 from deck.
- *Inspired change*: **Replace your draw step — damage one of your units,
  then special call a unit from your Grave whose level is ≤ the damaged
  unit's level. If you damage your Persona, special call 2 units from your
  Grave instead.**
- *Why*: Inspired by True King's Return (tribute = revive) + Disciples
  (Grave recycling). Instead of pulling from the DECK, pull from the GRAVE.
  This turns Barbarian's self-damage into a RECURSION engine. You sacrifice
  a big unit, then bring back a smaller one from Grave. If you break your
  own barrier (damage Persona), you get 2 back. The Grave becomes your
  second hand — just like True Draco.

**Continental Barrier** (auto: on barrier break, damage unit OR exile 2 Grave → draw 1)
- *Current*: Choose: damage a unit or exile 2 from Grave, then draw 1.
- *Inspired change*: **When your barrier breaks and the barrier check is not
  a Force, choose one: damage one of your units, OR shuffle 3 cards from
  your Grave into your deck. Then draw 1. If Ravage is active, draw 2
  instead of 1.**
- *Why*: Inspired by Disciples of the True Dracophoenix (shuffle 3 from
  Grave → draw 1). Instead of EXILING cards (permanent loss), you RECYCLE
  them back into the deck. This is Grave-as-resource, not Grave-as-cost.
  Ravage bonus: draw 2 instead of 1 — the State makes the recovery stronger.

**Molten Spikes** (auto: first ally damaged by ability → damage opp ally)
- *Current*: First self-damage = free retaliation.
- *Inspired change*: **The first time you damage an ally during your turn,
  damage one of your opponent's ally units. If the damaged ally survives,
  it gains +2000 power until end of turn.**
- *Why*: Inspired by True King floating (destruction = advantage) + Audra
  (survive damage = buff). Now Molten Spikes has TWO outcomes: if the unit
  dies, you got retaliation. If it SURVIVES (like Rane with delay, or a
  high-power unit), it gets stronger. This creates a tension: do you damage
  a weak unit (dies, but guaranteed retaliation) or a strong unit (survives,
  gets buffed, AND you get retaliation)?

**Mountain Top Bridges** (continuous: 1 or less barrier → damage counts double for Ravage)
- *Current*: Conditional Ravage accelerator.
- *Inspired change*: **If you have 1 or less barrier, units you damage by
  your ability during your turn count as 2 for Ravage. When a unit you
  control is damaged by your ability and sent to the Grave, you may search
  your deck for a Barbarian card and put it on top of your deck.**
- *Why*: Inspired by Dragonic Diagram (destroy = search). Now Mountain Top
  Bridges doesn't just accelerate Ravage — it also REWARDS unit death with
  a search. When you're on your last barrier and sacrificing units, each
  death feeds you the next card. This is the "desperation = power" fantasy
  of True King Dinosaur decks.

**Savage Forge Stronghold** (auto: damage 2 units → extra attack check)
- *Current*: Damage 2 units, get an extra check.
- *Inspired change*: **When your Persona attacks, damage 2 of your units.
  Add 1 extra check during the attack check. If both damaged units are sent
  to the Grave, add 2 extra checks instead of 1.**
- *Why*: Inspired by True King (destroy 2 matching = bonus). If you
  sacrifice 2 units and they BOTH die (go to Grave), you get a DOUBLE
  bonus — 2 extra checks instead of 1. This rewards sacrificing real units
  (not Rane with delay). The gamble: do you sacrifice 2 weak units (both
  die, 2 extra checks) or 2 strong units (might survive, only 1 extra check
  but you keep your board)?

#### Main Deck Card Improvements

**New mechanic: "Floating on damage"**
Inspired by True King (when destroyed → search/summon).

- **Modify Audra**: "Each time a unit is damaged by an ability, this unit
  gets +3000 until end of turn. When this unit is damaged and sent to the
  Grave by your ability, special call 1 lvl 1 Barbarian unit from your
  deck." — Audra already buffs on damage. Now it also FLOATS when it dies
  — bringing back a lvl 1 from the deck. This is the True King philosophy:
  dying = advantage.

- **New ability on a unit**: "When this unit is damaged by your ability and
  sent to the Grave, search your deck for a Barbarian card and add it to
  your hand." — Pure floating. Every death = a search. This is Dragonic
  Diagram in unit form.

**New mechanic: "Grave recursion"**
Inspired by Disciples (shuffle 3 from Grave → draw 1) + True King's Return.

- **New ability on a unit**: "1/turn: shuffle 2 cards from your Grave into
  your deck, then draw 1." — Grave recycling + draw. This is Disciples of
  the True Dracophoenix. Used units come back, and you get a fresh card.

- **New ability on a Persona**: "When you damage a unit by your ability,
  you may special call a unit from your Grave with level ≤ the damaged
  unit's level." — Damage = revive. Every time you sacrifice a unit, you
  bring back a smaller one from the Grave. This is True King's Return.

**New mechanic: "Reactive damage"**
Inspired by True Draco (when opponent activates → search).

- **New ability on a unit**: "When your opponent calls a unit to the field,
  you may damage this unit. If you do, damage the called unit." — Reactive
  retaliation. The opponent's plays trigger your damage. This is True Draco's
  reactive searching, but as damage instead of search.

**New mechanic: "Match for bonus"**
Inspired by True King (destroy 2 matching attributes = bonus).

- **New ability on a unit**: "When you damage 2 units by your ability this
  turn, if both are the same level, this unit gains +5000 until end of
  turn." — Rewards damaging matching-level units. Creates a puzzle: which
  units do you damage to get the bonus?

---

### Dryad / Ethereal — Inspired by Sylvan

**Theme to steal**: "The deck is an extension of your hand. Excavating
creates chain reactions. Every card in the deck is live."

#### Problem with current Dryad

Dryad's current identity is "generate wisp tokens, stack them, sacrifice
them." But the token generation is mostly from card effects on the field —
there's no DECK INTERACTION. You don't dig through your deck, you don't
reveal cards, you don't chain from the deck. The deck is just a pile you
draw from.

Sylvan's insight: **the deck is a resource you DIG INTO.** Excavating
reveals cards, sends them to Grave, and triggers effects. Every card in the
deck is potentially live. This would give Dryad a much richer engine.

#### Codex Skill Improvements

**Hidden Door** (replacement: reveal top, generate wisp per level, card to Grave)
- *Current*: Reveal top, convert level to wisps, card to Grave.
- *Inspired change*: **Replace your draw step — excavate (reveal) the top
  card of your deck. If it's a Dryad unit, send it to the Grave and
  generate 2 wisps. If it's not a Dryad unit, generate 1 wisp and put the
  card on the bottom of your deck.**
- *Why*: Inspired by Sylvan excavate (reveal top, if Plant → Grave +
  trigger, if not → bottom). Now Hidden Door has a branching outcome: Dryad
  units go to Grave (and you get 2 wisps), non-Dryad cards go to bottom (and
  you get 1 wisp). This creates deckbuilding tension: more Dryad units =
  more wisps, but you lose those units. Non-Dryad cards are safer but give
  fewer wisps. This is EXACTLY the Sylvan excavate decision.

**Mirage Mushroom Tree** (auto: on barrier break, generate wisp per broken barrier)
- *Current*: Rubber-band mechanic — more broken barriers = more wisps.
- *Inspired change*: **When your barrier breaks, excavate (reveal) the top
  card of your deck. If it's a Plant or Dryad unit, send it to the Grave
  and generate a wisp for each of your broken barriers. If it's not, put it
  on the bottom of your deck and generate 1 wisp.**
- *Why*: Inspired by Sylvan Marshalleaf (excavate on summon → if Plant,
  destroy). Now barrier breaks EXCAVATE — creating chain potential. If the
  excavated card is a Dryad, it goes to Grave (where it could be revived
  later) and you get the full wisp flood. If not, you get a consolation wisp
  and the card goes to bottom. This ties the barrier-break recovery to the
  DECK, not just a flat token count.

**Nature's Dweller Forest** (auto: double supporting wisp power, destroy after attack)
- *Current*: Double wisp support power, sacrifice the stack after.
- *Inspired change*: **When a wisp is supporting your Persona in an attack,
  double that wisp's power. At the end of that attack, damage that wisp
  (or stack of wisps). If the destroyed wisp had 3 or more stacks, excavate
  the top card of your deck. If it's a Dryad unit, special call it.**
- *Why*: Inspired by Sylvan Sagequoia (when sent to Grave → recover) +
  Miracle Fertilizer (banish from Grave → revive). Now sacrificing a BIG
  wisp stack (3+) triggers an excavate — and if it's a Dryad, you special
  call it. This turns the sacrifice into a COMBO: big wisp dies → excavate
  → Dryad comes out. The wisp stack becomes a launchpad for units from the
  deck.

**The Last Tree** (continuous: call Dryad → 1 wisp, special call Dryad → 2 wisps)
- *Current*: Passive token generation on Dryad calls.
- *Inspired change*: **When you call a Dryad unit to the field, generate 1
  wisp. When you special call a Dryad unit to the field, generate 2 wisps.
  When a Dryad unit is sent from your deck to the Grave (by excavate or
  Hidden Door), generate 1 wisp.**
- *Why*: Inspired by Sylvan Charity + excavate triggers. Now The Last Tree
  also fires when Dryad units are EXCAVATED and sent to Grave — not just
  when called to the field. This creates a chain: Hidden Door excavates a
  Dryad → sends to Grave → The Last Tree generates a wisp. The deck
  manipulation feeds the token engine. This is the Sylvan chain combo
  philosophy.

**Underwood Tide** (continuous: pay energy with wisps, 2:1)
- *Current*: Energy substitution.
- *Inspired change*: **When paying energy as a cost, you may use wisps
  instead. 2 wisps = 1 energy. Once per turn, you may excavate the top card
  of your deck. If it's a Dryad unit, send it to the Grave and gain 1
  energy.**
- *Why*: Inspired by Mount Sylvania (free excavate once per turn) +
  Sylvan Hermitree (excavate → if Plant, draw). Now Underwood Tide isn't
  just energy substitution — it also gives you a free EXCAVATE once per
  turn. If the excavated card is a Dryad, it goes to Grave and you gain
  energy (like Hermitree's "if Plant, draw 1"). This adds deck manipulation
  to the energy codex, making it more active and interesting.

#### Main Deck Card Improvements

**New mechanic: "Excavate"**
Inspired by Sylvan's signature mechanic. This is the biggest addition.

- **New ability on a unit**: "When this unit is placed, excavate the top
  card of your deck. If it's a Dryad unit, send it to the Grave and this
  unit gains +2000 power until end of turn. If it's not, put it on the
  bottom of your deck." — Sylvan Flowerknight style. Every summon digs the
  deck.

- **New ability on a unit**: "When this unit is placed, excavate the top
  card of your deck. If it's a Dryad unit, send it to the Grave and destroy
  one of your opponent's ally units with level ≤ the excavated unit's
  level." — Sylvan Marshalleaf style. Excavate = removal. The bigger the
  excavated Dryad, the bigger the target you can destroy.

**New mechanic: "When sent from deck to Grave"**
Inspired by Sylvan (when excavated & sent to Grave → trigger).

- **New ability on a unit**: "When this unit is sent from your deck to the
  Grave by an excavate effect, generate 1 wisp token." — This triggers when
  the unit is excavated and sent to Grave. It chains with Hidden Door,
  Mirage Mushroom Tree, and Underwood Tide's excavate effects. One excavate
  can trigger multiple units.

- **New ability on a unit**: "When this unit is sent from your deck to the
  Grave by an excavate effect, special call this unit from the Grave."
  — Self-revival from excavate. The unit digs itself out of the Grave.
  This is Sagequoia's "when sent to Grave → Special Summon" in excavate
  form.

**New mechanic: "Deck stacking"**
Inspired by Mount Sylvania (send Plant to Grave → place Sylvan on top).

- **New ability on a unit**: "When this unit is placed, you may damage 1
  wisp token. If you do, look at the top 3 cards of your deck, put one on
  top and the rest on the bottom in any order." — Sylvan Hermitree style.
  Sacrifice a wisp to reorder your deck. Sets up the next excavate.

- **New ability on a unit**: "When this unit is placed, put the top card of
  your deck on the bottom, then put a Dryad card from your deck on top of
  your deck." — Mount Sylvania style. Search a Dryad and put it on top,
  setting up the next excavate or Hidden Door.

**New mechanic: "Draw + filter"**
Inspired by Sylvan Charity (draw 2, put 1 back).

- **New ability on an Action**: "Draw 2 cards, then place 1 card from your
  hand on the top or bottom of your deck." — Sylvan Charity. Pure filter
  that also sets up excavate. If you put a Dryad on top, your next excavate
  will hit it.

**New mechanic: "Grave revival"**
Inspired by Miracle Fertilizer (banish Plant from Grave → revive Plant).

- **New ability on an Action**: "Damage 2 wisp tokens you control. Special
  call a Dryad unit from your Grave." — Sacrifice wisps to revive Dryads.
  The wisps are the cost, the Grave is the resource. This is Miracle
  Fertilizer with wisp-sacrifice instead of banish.

---

## Summary: What Changes Per Deck

### Angel — 3 new mechanics
1. **Bottom-of-deck recovery**: Pull rallied cards back from the bottom of the deck
2. **Cards drawn this turn counter**: Payoff for drawing multiple cards per turn
3. **Combat-rewarded search**: Successful attacks search instead of just drawing

### Barbarian — 3 new mechanics
1. **Grave recursion**: Pull units from Grave instead of deck (damage = revive)
2. **Floating on damage**: Units trigger effects when damaged and sent to Grave
3. **Match for bonus**: Damaging 2 units of the same level/type = bonus

### Dryad — 3 new mechanics
1. **Excavate**: Reveal top of deck, Dryads go to Grave and trigger, non-Dryads go to bottom
2. **When sent from deck to Grave**: Units trigger when excavated and sent to Grave (chain combos)
3. **Deck stacking**: Reorder top cards to set up excavates

---

## Open Questions

1. **Excavate for Dryad**: Should excavate be a new keyword/mechanic, or should
   we just use "reveal the top card" language? A keyword would be cleaner but
   adds complexity.

2. **Bottom-of-deck for Angel**: Should we add a "bottom of deck" zone
   tracker, or just let players remember what's there? Currently rally just
   pushes to bottom — there's no way to look at or interact with the bottom.

3. **Grave recursion for Barbarian**: How powerful should Grave recursion be?
   True King can summon from Grave every turn. Should Barbarian be that
   recursive, or should it be more limited (e.g., only lvl 1 or 2 from Grave)?

4. **Power level**: These changes make all three decks significantly stronger.
   Should we compensate by making some existing cards weaker, or should we
   raise the power level across the board?

5. **Card count**: Adding new mechanics might require new cards. Should we
   replace existing cards or add to the pool? The deck is currently 50 cards
   from 17 uniques (3 copies each, one at 2 copies). Adding new uniques would
   require cutting others.
