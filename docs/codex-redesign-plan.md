# Codex Redesign Plan — Angel, Barbarian, Dryad

Each of the 5 Codex cards per deck is a **different playstyle** with its **own unique skill** (the passive). No separate triggered effect — the skill *is* the card. 15 skills total across 3 decks.

---

## Design Philosophy

Each skill **alters a core game mechanic** — not just "+1 draw" or "+1000 power". The skills touch different parts of the game and focus on what the deck's State wants to do:

- **Grace** wants more cards in hand than opponent
- **Ravage** wants 2+ units damaged by ability this turn
- **Ethereal** wants 3+ wisp tokens on the field

**No two skills in the same deck alter the same mechanic.**

---

## 1. Angel / Grace — 5 Hand-Advantage Playstyles

**State (Grace)**: Released when you have more cards in hand than opponent.

**Design**: Grace is about hand quality and timing. Each skill controls *when* and *what* you draw, peek, rally, or buff — keeping your hand bigger than the opponent's.

### Switching System

There are two ways to switch your active Codex:

- **Manual switch**: During your Main phase, you may switch to any Codex (one per turn).
- **Auto-switch**: When a Codex's trigger fires, if you did not switch last turn (auto or manual), you may switch to that Codex. If auto-switch happens, it counts as your 1 switch for this turn — you cannot manually switch afterward.

**State requirement**: Auto-switch does NOT require the Codex's State to be released. The skill fires regardless of State.

**The core decision**: Switch now (commit to a plan, lose auto-switch next turn) or hold (stay on current Codex, but unlock auto-switch opportunities next turn at critical moments — including during the opponent's turn for defensive skills).

---

---

### 1a. Ezekia

**Skill**: Replace your draw step — draw 1, then rally 1, then draw 1.

**Auto-switch trigger**: At the start of your turn, if you did not switch last turn, you may switch to this Codex.

**How it plays**: If you held last turn, you can jump to Ezekia right before the draw step and get draw 1, rally 1, draw 1 immediately. Net +1 hand size with a filtering decision in the middle — you see the first draw before deciding what to rally. The "stabilize your hand" Codex — pick it when your hand is bad and you need to refill.

---

### 1b. Ivory Wings

**Skill**: When your Persona attacks, before the attack check — rally 1, then look at the top card of your deck and put it on top or bottom, then the check happens.

**Auto-switch trigger**: When your Persona attacks, if you did not switch last turn, you may switch to this Codex.

**How it plays**: If you held last turn, you can jump to Ivory Wings right before the attack check. Rally a dead card, peek at the top, decide top or bottom, then the check reveals whatever is on top. Force on top? Free spell. Bad card? Bury it. Two decisions in one trigger. The "attack control" Codex — pick it when you have a good attack opportunity and a Force to flip.

---

### 1c. Ministry Castle

**Skill**: Up to three times during your turn, pay 1 energy — rally 1 unit from your hand or field, then special call the top card of your deck. If that card is not a unit, send it to the Grave.

**Auto-switch trigger**: At the start of your Main phase, if you did not switch last turn, you may switch to this Codex.

**How it plays**: If you held last turn, you jump to Ministry Castle right when Main starts — perfect timing for energy spending. Each swap costs 1 energy: rally a unit (hand or field), reveal the top card — unit = special call, non-unit = Grave. Up to 3 swaps per turn. The "field cycling" Codex — pick it when you have spare energy and weak field units to swap.

---

### 1d. Sky Church

**Skill**: If Grace is active, your Persona gains +2000 power.

**Auto-switch trigger**: When your Persona attacks or is attacked, if you did not switch last turn, you may switch to this Codex.

**How it plays**: The only Codex that can auto-switch on BOTH your attack and the opponent's attack. If you held, you can jump to Sky Church for offense (your attack) or defense (their attack). +2000 while Grace is on — big enough to win most battles. The "power buff" Codex — pick it when your hand is big and you want raw power. The defensive auto-switch is the only way to get a Codex effect during the opponent's attack (alongside Angelic Nexus).

---

### 1e. Angelic Nexus Covenant

**Skill**: When your barrier breaks, if the barrier check is not a Force, rally 1, then draw 1.

**Auto-switch trigger**: When your Persona is attacked, if you did not switch last turn, you may switch to this Codex.

**How it plays**: If you held last turn, you can jump to Angelic Nexus when the opponent attacks you. Your barrier breaks, the flip wasn't a Force (you got nothing from the break), so you rally a dead card and draw a fresh one. Consolation for bad flips. The "recovery" Codex — competes with Sky Church on defense: do you want to try to STOP the break (Sky Church, +2000) or ACCEPT it and get cards (Angelic Nexus)? That's the best decision in the deck.

---

## 2. Barbarian / Ravage — 5 Tribute Playstyles

**State (Ravage)**: Released when any of these are true:
- You have no barriers (automatically released)
- You tributed 2 or more units this turn
- Your barrier was broken this turn (by opponent's attack OR by your own ability)

Released until end of turn.

**Design**: Ravage is about tribute as fuel. Each skill changes a different part of the game — the draw step, the barrier break, cumulative tribute count, conditional draw, and the attack check.

**Terminology**: "Tribute" = damage your own unit (sends it to Grave). "Damage" = damage an opponent's unit. Damaging a Persona breaks a barrier. Power buffs/debuffs are separate from tribute/damage.

---

### 2a. Continental Heart

**Skill**: Replace your draw step — [Cost: Tribute one of your units] Special call one of your units from your Grave. If you tribute your Persona (break a barrier), special call 2 units from your Grave instead.

**Auto-switch trigger**: At the start of your turn (before draw), if you did not switch last turn, you may switch to this Codex.

**How it plays**: You skip your draw to cycle your Grave — tribute a unit, bring back a different one. Break your own barrier for a 2-for-1. The Grave is your second deck. Decision: which unit to tribute (goes to Grave) vs which to bring back (comes from Grave)? Tributing your own unit counts toward Ravage.

---

### 2b. Continental Barrier

**Skill**: When your barrier breaks and the barrier check is not a Force, [Cost: Tribute one of your units] Draw 1.

**Auto-switch trigger**: When your Persona is attacked, if you did not switch last turn, you may switch to this Codex.

**How it plays**: Every bad barrier flip lets you tribute a unit to draw a card. No choice between modes — just pure sacrifice for card advantage. Fuels Ravage from the tribute. If you have no units to tribute, this skill won't fire. Decision: which unit to tribute for the draw?

---

### 2c. Molten Spikes

**Skill**: Every time you tribute 3 of your units, damage one of your opponent's units.

**Auto-switch trigger**: At the start of your Main phase, if you did not switch last turn, you may switch to this Codex.

**How it plays**: Cumulative tribute counter — every 3 units you tribute triggers a free damage on an opponent's unit. The counter carries across turns. This rewards decks that tribute constantly — Freyja, Sigrun, and Continental Heart all fuel it. Decision: do you space out your tributes (slow, steady) or burst 3 in one turn for immediate removal?

---

### 2d. Mountain Top Bridges

**Skill**: If you have no barriers — every time you tribute a unit, draw 1. If you tribute a lvl 3 unit, it counts as 2 (for Ravage).

**Auto-switch trigger**: At the start of your turn (before draw), if you did not switch last turn, you may switch to this Codex.

**How it plays**: The desperation draw engine. When you have no barriers, every tribute draws a card — pure card advantage when you're naked. Lvl 3 tributes count double for Ravage, so sacrificing a Persona (breaking your own barrier) can instantly release Ravage. Decision: do you keep your barriers (no draw, but defense) or let them break for the draw engine? The "desperation" codex — strong when losing, useless when ahead.

---

### 2e. Savage Forge Stronghold

**Skill**: 1/turn: When your Persona attacks, [Cost: Tribute 2 of your units] This unit gets Power +5000, until end of turn. Then, add 1 extra attack check during the attack check.

**Auto-switch trigger**: When your Persona attacks, if you did not switch last turn, you may switch to this Codex.

**How it plays**: The all-in codex. You tribute 2 units for +5000 power and an extra attack check. After the first check resolves, flip a second card from the top of your deck. If both checks are Forces, you fire 4 modes for free. If both whiff, you lost 2 units for nothing. Requires 2 units on your field to use. Ravage synergy: tributing 2 units = 2 counts = Ravage activated in one attack. The gamble: is +5000 and an extra check worth your entire board?

---

## 6. Dryad / Ethereal — 5 Token Playstyles

**State (Ethereal)**: Released when you have 3+ wisp tokens.

**Design**: Ethereal is about flooding the field with wisps and stacking them. Each skill changes *how wisps are generated and what they do* — level conversion, barrier breaks, support power, call bonuses, and energy substitution.

**Terminology**: We use "generate" for creating wisp tokens (not "special call"). A generated wisp is placed on the field as a token.

---

### 6a. Hidden Door

**Skill**: Replace your draw step — reveal the top card of your deck. Generate a wisp for each level of that card. Send that card to the Grave.

**Auto-switch trigger**: At the start of your turn (before draw), if you did not switch last turn, you may switch to this Codex.

**How it plays**: You flip the top card and convert it into wisps based on its level. A lvl 1 card = 1 wisp. A lvl 3 card = 3 wisps. A lvl 5 card = 5 wisps. The card goes to the Grave — you don't get it in hand. You're trading card draw for token flood, and the bigger the card, the bigger the flood. The decision is in deckbuilding and timing: build with high-level cards for bigger floods, and switch to Hidden Door when you know a high-level card is on top (from scrying effects).

---

### 6b. Mirage Mushroom Tree

**Skill**: When your barrier breaks, generate a wisp for each of your broken barriers.

**Auto-switch trigger**: When your Persona is attacked, if you did not switch last turn, you may switch to this Codex.

**How it plays**: Every barrier break generates wisps — 1 wisp per broken barrier you have AFTER the break. 2 broken barriers = 2 wisps. 3 broken = 3 wisps. The more they break through, the bigger your token army. Rubber-band mechanic — losing barriers floods you with tokens. The longer the game goes, the more devastating each break becomes.

---

### 6c. Nature's Dweller Forest

**Skill**: When a wisp is supporting your Persona (in an attack), double that wisp's power. At the end of that attack, damage that wisp (or stack of wisps).

**Auto-switch trigger**: When your Persona attacks, if you did not switch last turn, you may switch to this Codex.

**How it plays**: Wisps that support your Persona hit twice as hard — a 1000-power wisp becomes 2000 for the attack. But after the attack, the entire supporting stack is damaged (sent to Grave). The decision: do you support with a big stack (huge power boost, but you lose the whole stack) or a single wisp (small boost, minimal loss)? Do you commit your tokens to the attack for double power, or save them for Ethereal? Every support is a sacrifice — doubled power for one attack, then the entire stack is gone.

---

### 6d. The Last Tree

**Skill**: When you call a Dryad unit to the field, generate 1 wisp. When you special call a Dryad unit to the field, generate 2 wisps.

**Auto-switch trigger**: At the start of your Main phase, if you did not switch last turn, you may switch to this Codex.

**How it plays**: Every Dryad you play generates wisps. Normal call = 1 wisp. Special call = 2 wisps. You're flooding the field by just playing your deck — every unit comes with tokens attached. The decision: do you call units normally (1 wisp each, costs energy) or find ways to special call them (2 wisps each, free)? This rewards special call effects and makes every Dryad a token generator. The more units you play, the faster Ethereal activates.

---

### 6e. Underwood Tide

**Skill**: When paying energy as a cost, you may use wisps instead. 2 wisps = 1 energy.

**Auto-switch trigger**: At the start of your turn (before draw), if you did not switch last turn, you may switch to this Codex.

**How it plays**: Your wisp tokens are currency. Instead of paying energy, you can sacrifice 2 wisps per 1 energy needed. Play a 3-energy card for 6 wisps and 0 energy. Play a 5-energy card for 10 wisps. The decision: do you spend energy (keep your wisps for Ethereal and power) or spend wisps (keep energy for other plays, but lose tokens and risk Ethereal turning off)? Every card you play is a choice — pay with energy or pay with your army. Late game when you have excess wisps, you can play expensive cards for free by flooding the field first.

---

## Summary: 15 Skills at a Glance

| Deck | Codex | Skill | Mechanic altered | Auto-switch trigger |
|---|---|---|---|---|
| Angel | Ezekia | Replace draw step: draw 1, rally 1, draw 1 | Draw step (filter + growth) | Start of your turn |
| Angel | Ivory Wings | Persona attacks: rally 1, peek top → top/bottom, then check | Attack check | On persona attack |
| Angel | Ministry Castle | Up to 3×/turn, pay 1 energy: rally unit (hand/field), special call top of deck (non-unit → Grave) | Field cycling (energy) | Start of Main phase |
| Angel | Sky Church | Grace active → Persona +2000 | Persona power (flat) | On persona attack or being attacked |
| Angel | Angelic Nexus Covenant | Barrier breaks (barrier check not Force): rally 1, draw 1 | Barrier break (cycle) | On persona being attacked |
| Barbarian | Continental Heart | Replace draw step: [Cost: Tribute 1 unit] special call 1 from Grave (tribute Persona → 2 from Grave) | Draw step (Grave recursion) | Start of turn (before draw) |
| Barbarian | Continental Barrier | Barrier breaks (not Force): [Cost: Tribute 1 unit] draw 1 | Barrier break (tribute for draw) | On persona being attacked |
| Barbarian | Molten Spikes | Every 3 units tributed → damage 1 opponent unit | Cumulative tribute count | Start of Main phase |
| Barbarian | Mountain Top Bridges | No barriers: every tribute → draw 1. Lvl 3 tribute counts as 2 for Ravage | Conditional draw (no barriers) | Start of turn (before draw) |
| Barbarian | Savage Forge Stronghold | 1/turn: Persona attacks, [Cost: Tribute 2 units] +5000 + extra attack check | Attack check (extra check) | On persona attack |
| Dryad | Hidden Door | Replace draw step: reveal top card, generate wisp per level, card to Grave | Draw step (level-to-token) | Start of turn (before draw) |
| Dryad | Mirage Mushroom Tree | Barrier breaks: generate wisp per broken barrier (after break) | Barrier break (token flood) | On persona being attacked |
| Dryad | Nature's Dweller Forest | Wisp supporting Persona: double power, then entire stack destroyed after attack | Support (doubled power, then sacrifice) | On persona attack |
| Dryad | The Last Tree | Call Dryad → generate 1 wisp. Special call Dryad → generate 2 wisps | Call (token per unit) | Start of Main phase |
| Dryad | Underwood Tide | Pay energy cost with wisps: 2 wisps = 1 energy | Energy substitution | Start of turn (before draw) |

### Mechanics coverage (no two skills in the same deck alter the same mechanic)

**Angel**: draw step (filter + growth), attack check, field cycling (energy), Persona power (flat), barrier break (cycle)
**Barbarian**: draw step (Grave recursion), barrier break (tribute for draw), cumulative tribute count, conditional draw (no barriers), attack check (extra check)
**Dryad**: draw step (level-to-token), barrier break (token flood), support (doubled power + sacrifice), call (token per unit), energy substitution

---

## Updated Ravage State

Ravage is released when ANY of these are true:
- You have no barriers (automatically released)
- You tributed 2 or more units this turn
- Your barrier was broken this turn

Released until end of turn.

**Terminology**: "Tribute" = damage your own unit (sends it to Grave). "Damage" = damage an opponent's unit. Damaging a Persona breaks a barrier.

---

## Implementation Plan

### Phase 1: Skill infrastructure (done)
1. `skill` field on `CardScript.codex` with types: `action`, `continuous`, `auto`, `replacement`.
2. `skillUsedThisTurn` on `PlayerState`, reset each turn.
3. `useSkill` action in `PlayerAction`.
4. Draw-step replacement hook in `beginTurn()`.
5. Auto-skill trigger collection in `collectTriggers()`.

### Phase 2: Implement Angel skills
6. Ezekia — replacement: draw 1, rally 1, draw 1 (replaces draw step). Auto-switch: start of turn.
7. Ivory Wings — auto: on personaAttack, rally 1 + scry top → top/bottom, then check. Auto-switch: on persona attack.
8. Ministry Castle — action: up to 3×/turn, pay 1 energy, rally unit (hand/field) + special call top of deck (non-unit → Grave). Auto-switch: start of Main.
9. Sky Church — continuous: Grace on → Persona +2000. Auto-switch: on persona attack or being attacked.
10. Angelic Nexus Covenant — auto: on barrierBroken (barrier check not Force), rally 1 + draw 1. Auto-switch: on persona being attacked.
11. Update auto-switch logic: check "did not switch last turn" for all auto-switches.

### Phase 3: Implement Barbarian skills
12. Update Ravage state: no barriers → auto-release; 2+ units damaged OR barrier broken (any break) → release until end of turn.
13. Continental Heart — replacement: damage 1 unit → special call lvl 1 from deck (damage persona → 2 lvl 1). Can't use if no lvl 1 in deck.
14. Continental Barrier — auto: on barrierBroken (not Force), damage 1 unit OR exile 2 from Grave → draw 1. Can't use if no units and <2 Grave cards.
15. Molten Spikes — auto: first ally damaged by your ability → damage opp ally.
16. Mountain Top Bridges — continuous: if 1 or less barrier, damaged units count as 2 for Ravage.
17. Savage Forge Stronghold — auto: on personaAttack, damage 2 units → add 1 extra attack check (second card from top, after first check). Requires 2 units.

### Phase 4: Implement Dryad skills
18. Hidden Door — replacement: reveal top card, generate wisp per level, card to Grave (replaces draw step).
19. Mirage Mushroom Tree — auto: on barrierBroken, generate wisp per broken barrier (after break).
20. Nature's Dweller Forest — auto: on personaAttack with wisp support, double wisp power, then destroy entire stack after attack.
21. The Last Tree — auto: on call Dryad → generate 1 wisp, on special call Dryad → generate 2 wisps.
22. Underwood Tide — continuous: may pay energy costs with wisps (2 wisps = 1 energy).

### Phase 5: UI updates
23. Show active skill text on the Codex pile.
24. Show "Use Skill" button for action-type skills.
25. Show auto-switch prompt at trigger moments.

### Phase 6: Testing & balancing
26. Update existing tests for new skill behavior.
27. Add tests for each new skill.
28. Run balance simulations.
29. Adjust skill strength based on results.
