# Codex Legends — Design Vision & Comparison

Reference document for the Codex system and overall game design direction.
Created 2026-08-27. Revisit when ready to develop the Codex passive layer.

---

## 1. Comparison to Five Major TCGs

### Lineage

Core mechanics come from **Cardfight!! Vanguard** and **Duel Masters**.
When a rule is ambiguous, the Vanguard reading is usually intended.
MTG and Yu-Gi-Oh influence the deck/extra-deck structure and graveyard interactions.

### Win Condition

| Game | Life | How you lose |
|---|---|---|
| Yu-Gi-Oh | 8000 LP | LP → 0, or deck-out |
| MTG | 20 life | Life → 0, or deck-out, or alt-win |
| Pokémon | 6 Prize cards | Opponent takes all 6 prizes |
| Duel Masters | 5 shields | No shields + one direct hit |
| Vanguard | 6 damage | 6th damage ends the game |
| **Codex Legend** | 5 Barriers | 0 Barriers + one more hit |

Closest to **Duel Masters** — 5 shields/barriers, then one finishing blow.
Duel Masters shields go to hand when broken and can trigger shield triggers;
our Barriers go to hand after a barrier check, and Force cards trigger free on check.

### Resource System

| Game | Resource | Resets? | Comeback? |
|---|---|---|---|
| Yu-Gi-Oh | None (free play) | N/A | No |
| MTG | Lands (permanent) | No, accumulates | No |
| Pokémon | 1 energy/turn attached | No, stays on Pokémon | No |
| Duel Masters | Tap any card as 1 mana | Yes (untap each turn) | No |
| Vanguard | None (call freely) | N/A | No |
| **Codex Legend** | Energy = broken Barriers + 1 | Yes, resets each turn | **Yes — losing gives you more** |

**Most original mechanic.** No other TCG ties resource generation to *losing*.
Every broken Barrier gives +1 energy and +1 play per turn — a built-in rubber-band.

### Leader / Vanguard Concept

| Game | Leader | Swap mechanic |
|---|---|---|
| Yu-Gi-Oh | None | N/A |
| MTG | None (Commander format has one) | Commander stays fixed |
| Pokémon | Active Pokémon | Retreat (pay cost, swap from bench) |
| Duel Masters | None | N/A |
| Vanguard | Vanguard | Ride/Stride (stack on top) |
| **Codex Legend** | Persona | Personify (swap, old → Heart) |

Closest to **Vanguard**, but:
- Old Persona goes to the **Heart** (a separate pile), not buried under the new one.
- Persona level scales with broken Barriers — so you can Personify into higher-level Heroes as you lose.
- **Ascend Break** (level 6+ → level 4 from Extra Zone) = Vanguard's Stride.
- The **Heart** as a mechanic other cards interact with is more like MTG's graveyard-as-resource.

### Attack / Battle System

| Game | Who attacks | What can be attacked | Blocking |
|---|---|---|---|
| Yu-Gi-Oh | Monsters | Monsters or direct | No blocking (only battle) |
| MTG | Creatures | Player or Planeswalker | Defender chooses blocks |
| Pokémon | Active Pokémon | Active Pokémon only | No blocking |
| Duel Masters | Creatures | Shields or tapped creatures | Blockers intercept |
| Vanguard | All units | Vanguard or rear-guards | Guard step (hand cards) |
| **Codex Legend** | Persona + Allies | Persona or any Ally | Guard step (hand cards) |

Directly in **Vanguard's lineage** on blocking — play cards from hand into Defense zone,
they add their Defense value, then they're discarded.

Attack targeting is **more open than Vanguard**: anything can attack anything (no taunt except Screen),
and only the **Persona's attack triggers a check** — same as Vanguard's drive check being vanguard-only.

The **support** mechanic (adjacent allies add Power) is unique — none of the five have
positional adjacency mattering for attack power.

### Check System

| Game | Card reveal on attack? | Trigger? |
|---|---|---|
| Yu-Gi-Oh | No | N/A |
| MTG | No | N/A |
| Pokémon | No | N/A |
| Duel Masters | Shield trigger on shield break | Yes — shield triggers fire |
| Vanguard | Drive check (attack) / Damage check (hit) | Yes — triggers fire |
| **Codex Legend** | Attack check (Persona attacks) / Barrier check (hit) | Yes — Force cards fire free |

**Vanguard drive/damage check, combined with Duel Masters shield trigger.**
- Offensive checks = Vanguard drive check (Persona attacks → reveal top card → Force fires free with both modes).
- Defensive checks = Duel Masters shield trigger (Barrier breaks → reveal → goes to hand → Force fires free).

### Deck Construction

| Game | Deck size | Copy limit | Extra deck? | Sideboard? |
|---|---|---|---|---|
| Yu-Gi-Oh | 40–60 | 3 | Yes (Extra Deck 15) | Yes (15) |
| MTG | 60+ | 4 | No (Commander: 1 copy) | Yes (15) |
| Pokémon | 60 | 4 | No | No |
| Duel Masters | 40 | 4 | Yes (Hyperspatial Zone) | No |
| Vanguard | 50 | 4 (starter: 1) | Yes (G Zone / Stride) | No |
| **Codex Legend** | 50 | 3 | Yes (Extra Zone + Codex) | No |

- 50 cards, 3 copies — tighter than most. Reduces consistency, increases variance.
- **Extra Zone** (level 4 Personas) = Yu-Gi-Oh Extra Deck / Vanguard G Zone / Duel Masters Hyperspatial Zone.
- **Codex** (3–5 cards, one active, switchable) — **entirely unique**, no analog in any of the five.
- **One guild per deck** = MTG color identity / Duel Masters civilization restriction.

### Card Types

| Game | Unit types | Spell types | Special |
|---|---|---|---|
| Yu-Gi-Oh | Normal/Effect/Fusion/Synchro/Xyz/Link | Spells, Traps | Field Spells, Equip |
| MTG | Creatures | Instants, Sorceries, Enchantments, Artifacts | Planeswalkers, Lands |
| Pokémon | Pokémon (Basic/Stage 1/2) | Trainers, Energy | GX/V/EX variants |
| Duel Masters | Creatures | Spells | Cross Gear, Fortresses |
| Vanguard | Normal Units, G Units | Triggers (Stand/Draw/Crit/Heal) | Sentinels (perfect guards) |
| **Codex Legend** | Normal Unit, Hero Unit, Force, Sentry | Action | Codex, Token |

- **Force** (triple-purpose: unit / action / check trigger) — **unique**. No other game has a card
  that's a body, a spell, and a trigger all in one.
- **Sentry** = Vanguard's Sentinel / Perfect Guard. Max 3 per deck mirrors Vanguard's restriction.
- **Codex** = no analog. Unique.

### Turn Structure

| Game | Phases | Draw on turn 1? |
|---|---|---|
| Yu-Gi-Oh | Draw → Main 1 → Battle → Main 2 → End | Yes |
| MTG | Untap → Upkeep → Draw → Main 1 → Combat → Main 2 → End | No (first player skips draw) |
| Pokémon | Draw → (free play) → Attack → End | Yes |
| Duel Masters | Untap → Draw → Charge → Main → Battle → End | Yes (no attack turn 1) |
| Vanguard | Stand → Draw → Ride → Main → Battle → End | Yes |
| **Codex Legend** | Draw → States → Energy → Charge → Personify → Main → Battle → End | **Yes (first player draws)** |

Structure is **Vanguard's** with additions: State evaluation and Energy reset are new.
**Plays-per-turn cap** (Persona level cards per turn) is unusual — most TCGs gate by resources, not count.
**Dual gate** (Energy + play count) is unique.

### Positional / Board Mechanics

| Game | Board positions matter? |
|---|---|
| Yu-Gi-Oh | No (5 zones, position irrelevant except Extra Monster Zone) |
| MTG | No |
| Pokémon | Bench vs. Active only |
| Duel Masters | No |
| Vanguard | Front/rear rows matter for boosting |
| **Codex Legend** | **Yes — adjacency drives support** (0↔1↔Persona↔2↔3) |

Adjacency-based support is more granular than Vanguard's row system.
Slots 1 and 2 can both support the Persona; slot 0 can only support slot 1.
Creates a real positioning puzzle for both offense and defense.

---

## 2. What Makes Codex Legend Unique

1. **Losing = getting stronger** — Persona level, Energy, and plays/turn all scale with broken Barriers.
   No other TCG here does this. Signature mechanic.

2. **Codex / State system** — 3–5 switchable "commanders" outside the deck, each gating a State
   that unlocks abilities. Entirely original. Closest analog is MTG Commander, but that's one fixed card,
   not a switchable roster with state-gated abilities.

3. **Force cards** — triple-purpose (body / spell / check trigger). No other game has a card that
   serves all three roles.

4. **Dual resource gate** — both Energy *and* plays-per-turn are capped. Most TCGs gate on one or the other.

5. **Adjacency-based support** — more granular than Vanguard's row system, creates a board puzzle.

6. **Heart as a resource pile** — Personified Personas go to the Heart; multiple mechanics interact with it
   (Mourn, Essence, Vent). More like MTG's graveyard-as-resource than Vanguard's soul.

### What it borrows directly

- **From Vanguard**: check system, guard step, Persona = Vanguard, Sentry = Sentinel, ride/stride → Personify/Ascend Break
- **From Duel Masters**: shields → Barriers, shield trigger → barrier check, tap-for-mana → Energy reset, Extra Zone
- **From MTG**: graveyard interactions, one-guild restriction, Heart ≈ graveyard-as-resource
- **From Yu-Gi-Oh**: Extra Zone for boss monsters, max-3 copies, "anything attacks anything"

### What it deliberately avoids

- No lands (unlike MTG) — Energy is automatic and resets
- No mana screw/flood (unlike MTG/Duel Masters)
- No 8000 LP grind (unlike Yu-Gi-Oh) — 5 Barriers is tight
- No Prize card RNG (unlike Pokémon) — damage is deterministic
- No 4-copy consistency (unlike most) — 3 copies increases variance

---

## 3. The Codex as In-Game Sideboard — Design Vision

### The Core Idea

In Yu-Gi-Oh and MTG, sideboarding happens **between games** in a match. You see your opponent's deck,
then swap cards to adapt. It's a **meta-game** mechanic — it lives outside the actual play.

The Codex system moves adaptation **inside the game**. You don't swap cards — you swap **gameplay modes**.
This is fundamentally different and more interesting because:

1. **It's reactive in real-time**, not between matches.
2. **Both players can do it simultaneously** — opponent switches to aggression, you switch to defense, mid-game.
3. **It's not about countering the opponent's deck** — it's about countering their *current posture*.

### What Each Codex Already Does

| Codex | State | Playstyle it enables |
|---|---|---|
| Angel / Grace | Grace (hand advantage) | **Control** — more cards = more options, reactive |
| Barbarian / Ravage | Ravage (ability damage) | **Aggro-combo** — burn units, push damage |
| Knight / Glory | Glory (3+ Heroes on field) | **Midrange board** — flood with Heroes, go wide |
| Mecha / Overwhelm | Overwhelm (Persona ≥ 20k) | **Voltron** — buff one big attacker |
| Elf / Stampede | Stampede (3+ calls/turn) | **Swarm aggro** — flood the board fast |
| Dryad / Ethereal | Ethereal (3+ wisps) | **Token control** — incremental board building |
| Oni / Demonic | Demonic (essence 2+ last turn) | **Graveyard value** — Heart as fuel |
| Concert / Concert | Concert (3+ music buffs in Heart) | **Combo engine** — stack buffs, build up |
| Broken Bride / Mourn | Mourn (13+ in Heart) | **Late-game control** — snowball Heart size |
| Steam / Ignite | Ignite (per-unit Engine Core) | **Equipment / ramp** — install upgrades |

Full spread of archetypes: aggro (Barbarian, Elf), control (Angel, Broken Bride), midrange (Knight),
voltron (Mecha), combo (Concert), ramp/equipment (Steam). The key is **a single deck can switch between them**.

### Today: Codex changes *which abilities fire*

Switching to Grace doesn't change your *cards* — it changes which of your *existing cards' abilities*
are active. A card with `[Grace][Ally]` is dormant under a different Codex and wakes up under Grace.
The same 50 cards play differently depending on which Codex is face-up.

---

## 4. Plan — Codex Passive Layer (Next Step)

### Goal

Make each Codex *feel* different immediately, not just "now different abilities light up."
Give each Codex a **one-sentence passive board rule** that's always active while face-up.

### Why

- Makes switching Codex feel impactful even if you don't have State-gated cards in hand.
- Gives players a reason to switch for tempo/board state, not just for ability gating.
- Creates the "I'm playing defense now / I'm playing aggro now" feeling.
- Keeps complexity manageable — one sentence per Codex.

The State-gated abilities (current system) become the **second layer**: the Codex's passive sets the mode,
and the State-gated cards are the payoff for committing to that mode.

### Three Options for Codex Passives

#### Option A — Codex as continuous board modifier

The 🔴 red Codex Passive already works face-down and auto-switches. Extend so that *while a Codex is active*,
it projects a board-wide rule. Examples:

- Under **Overwhelm**: the Persona gains +2000 power each turn it stays active.
- Under **Grace**: once per turn, you may discard 1 to draw 1.
- Under **Stampede**: your first call each turn costs 0 Energy.

Makes the Codex itself a *continuous effect*, not just a gate for card abilities.
MTG enchantments and Yu-Gi-Oh Field Spells do this, but here it's **switchable** — the twist.

#### Option B — Codex changes adjacency rules

Since the board has positional adjacency, the Codex could reshape *how adjacency works*:

- Under **Glory** (Knight): all Heroes count as adjacent to each other (go-wide support).
- Under **Overwhelm** (Mecha): only the Persona's adjacency matters, but it gets double support.
- Under **Stampede** (Elf): supporters don't exhaust (enables swarm attacks).

Makes the Codex a **tactical overlay** — same board, different geometry.

#### Option C — Codex changes check behavior

The Codex could modify what happens on check:

- Under **Ravage**: attack checks also deal 1 damage to a random enemy unit.
- Under **Grace**: attack checks let you put the card on bottom of deck instead of hand.
- Under **Mourn**: barrier checks add the card to Heart instead of hand.

Makes the Codex change the **core loop** itself.

### Recommendation

**Option A** is the strongest starting point — give each Codex a one-sentence passive board rule.
It's the lowest-complexity, highest-impact change. Options B and C can be layered in later for
specific Codex that need more identity.

### Design Tension to Watch

Current state variables a player tracks:

1. Persona level (changes as Barriers break)
2. Energy (resets each turn, scales with level)
3. Plays remaining (scales with level)
4. Active Codex + State (switchable once/turn)
5. Heart contents (grows via Personify/Essence)
6. Adjacency (fixed but matters for support)
7. Hand size (Grace condition)

That's seven. MTG tracks 3–4, Vanguard 4–5, Yu-Gi-Oh 3–4.

Adding a Codex passive adds an 8th variable but makes the Codex *feel* like something.
Worth it **if** the passive is simple enough to internalize in one sentence.

### Implementation Plan (When We Return)

1. **Draft one-sentence passives for all 10 Codex** — review for clarity, balance, and distinctness.
2. **Add passive field to Codex card type** in `src/cards/types.ts`.
3. **Implement passive evaluation** in the engine — apply while Codex is face-up, remove on switch.
4. **Update AI** to factor Codex passive into switching decisions.
5. **Update UI** to show the active passive on the Codex pile.
6. **Playtest** — verify each passive creates a distinct playstyle feel.
7. **Balance** — adjust passives that are always-on vs. situational.

### Draft Passives (Starting Point — To Refine)

| Codex | Draft Passive | Playstyle |
|---|---|---|
| Angel / Grace | Once per turn, you may discard 1 card to draw 1 card. | Control / card selection |
| Barbarian / Ravage | Your abilities deal +1000 damage. | Aggro-burn |
| Knight / Glory | Your Hero units gain +1000 power. | Midrange board |
| Mecha / Overwhelm | Your Persona gains +2000 power. | Voltron |
| Elf / Stampede | Your first call each turn costs 0 Energy. | Swarm aggro |
| Dryad / Ethereal | Once per turn, you may create 1 wisp token. | Token control |
| Oni / Demonic | Once per turn, you may Essence 1 card from hand to Heart. | Graveyard value |
| Concert / Concert | Once per turn, you may play a Music buff from Heart. | Combo engine |
| Broken Bride / Mourn | At end of turn, if you have 10+ cards in Heart, draw 1. | Late-game control |
| Steam / Ignite | Once per turn, you may Install an Engine Core from hand for free. | Equipment / ramp |

These are **starting drafts** — each needs playtesting and tuning. The goal is that switching
Codex *immediately* changes how the turn plays, before any State-gated abilities even factor in.

---

## 5. Summary

Codex Legend is a Vanguard/Duel Masters hybrid with two genuinely original ideas
(losing-scales-your-power and the Codex/State system) and one clever fusion
(Force as triple-purpose card). The adjacency board and dual resource gate add tactical depth
that none of the five reference games have.

The Codex system is the thing that makes this game *not just a Vanguard clone*.
The next evolution is making each Codex project a passive board rule so switching
Codex feels like switching playstyles, not just switching which abilities are active.

**Status: Planning. Return to this when ready to implement the Codex passive layer.**
