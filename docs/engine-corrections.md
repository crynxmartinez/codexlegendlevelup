# Engine corrections

Bugs in the current engine, found by checking the implementation against designer
rulings rather than against the rulebook alone. Listed most-severe first.

---

## 1. The attack check reveals the wrong card — **wrong zone entirely**

**Where:** [`src/core/battle.ts`](../src/core/battle.ts) — `resolveAttack`, `barrierCheck`

**Current behaviour:**

```ts
// Barrier Check fires when the Persona attacks, after blockers are declared.
if (personaAttack) revealed = barrierCheck(index, game, attackerPlayer);
```

`barrierCheck` reveals the attacking player's **left-most Barrier**, moves it to
their hand, and refills the Barrier from their deck.

**Correct behaviour.** There are two distinct checks, and this is the first of them:

| Check | Trigger | Who reveals | From where |
|---|---|---|---|
| **Attack check** | your Persona attacks | the **attacker** | top card of the **attacker's own deck** |
| **Barrier check** | your Persona takes damage | the **defender** | the **broken Barrier** |

This is the Cardfight!! Vanguard Drive Check / Damage Check split. The attack check
must reveal the top of the attacker's **deck** — it must not touch Barriers at all.

**Why it matters:** as written, attacking with your Persona consumes and refills your
*own* Barriers every swing. That silently mills the attacker, hands them free cards,
and makes the Force-off-a-check payoff fire from the wrong zone. It is the single
biggest correctness problem in the engine.

**Fix sketch:**

```ts
/** Attack check: the attacker reveals the top card of their own deck. */
export function attackCheck(index: CardIndex, game: GameState, p: PlayerId): string | null {
  const ps = you(game, p);
  const uid = ps.deck.shift();
  if (!uid) return null;
  moveCard(game, uid, 'hand');
  // If it is a Force, its owner plays it free with BOTH modes.
  return uid;
}
```

`barrierCheck` stays, but only as the damage-side reveal — which `damagePersona`
already does correctly.

---

## 2. A Persona's own Power is ignored when it is attacked

**Where:** [`src/core/battle.ts`](../src/core/battle.ts) — `resolveAttack`

**Current behaviour:**

```ts
let defensePower = 0;
if (attack.target) defensePower += currentPower(index, game, attack.target);
```

When the Persona is attacked, `attack.target` is `null`, so `defensePower` starts at
0 and counts only the blockers.

**Correct behaviour.** Blockers add their Defense to the **Power of the unit being
attacked**, and that includes the Persona. An 11000-power Persona should be defending
at 11000 before any blockers are added.

**Why it matters:** right now an unguarded Persona is hit by literally any attack,
so Barriers evaporate and games end far too quickly. High-power Personas provide no
defensive value at all.

**Fix sketch:**

```ts
const defendingUnit = attack.target ?? you(game, defenderPlayer).persona;
let defensePower = defendingUnit ? currentPower(index, game, defendingUnit) : 0;
for (const b of block.blockers) defensePower += def(index, game, b).defense;
```

---

## 3. Blockers restricted to units with a printed Defense value

**Where:** [`src/core/battle.ts`](../src/core/battle.ts), [`src/core/types.ts`](../src/core/types.ts)

**Current behaviour:** `CardDef.defense` is a required `number`, and lvl 3 cards were
recorded with `defense: null` because their Defense slot is blank on the art.

**Correct behaviour:** **any card of any level may be played to defense.** Cards with
a blank Defense slot contribute **0**. Blocking is never illegal on the grounds of
level or missing stat — it is just a bad trade.

**Fix:** treat a null/absent `defense` as `0` at the point of use, and never gate the
legality of a block on it.

---

## 4. Deck validation rejects Engine Core

**Where:** [`src/core/setup.ts`](../src/core/setup.ts) — `validateDeck`

`Engine Core` (Steam deck) prints *"You may put 8 copies max of this card"*, which
overrides the global 3-copy rule. The validator currently caps every card at 3, so a
legal Steam deck fails to load.

**Fix:** read a per-card copy limit off the card definition, defaulting to 3.

---

## 5. Grace needs a State-evaluation hook

**Where:** [`src/core/turn.ts`](../src/core/turn.ts) — `startTurn`

Grace (as errata'd) is evaluated **at the start of your turn** and stays released
**until the end of your opponent's turn**. The engine has `releasedState` on
`PlayerState` but nothing evaluates State conditions automatically.

`startTurn` needs a step that tests the active Codex's State condition and sets or
clears `releasedState` accordingly, with expiry at end of opponent's turn.

Open: whether that check happens **before or after** the Start-phase draw
(Q20 in [`angel-deck.md`](angel-deck.md)) — it changes whether the player going
first has Grace on turn 1.

---

## Status — all five fixed

| # | Item | Status |
|---|---|---|
| 1 | Attack check read the wrong zone | **Fixed** — `doAttackCheck` reveals the attacker's own deck; fires only on Persona attacks |
| 2 | Persona Power ignored on defense | **Fixed** — defense starts from the attacked unit's Power, Persona included |
| 3 | Blockers gated on printed Defense | **Fixed** — `blockValue()` treats a blank Defense as 0; any card may block |
| 4 | Deck validation rejected Engine Core | **Fixed** — `maxCopies` per card, defaulting to 3 |
| 5 | No State-evaluation hook | **Fixed** — `evaluateStates()` runs in `startTurn` after the draw |

The old "breaks a barrier on a persona hit" test passed *because* of bug 1. It has
been replaced with tests that assert the corrected behaviour:

- the attack check consumes the attacker's **deck**, leaving their Barriers untouched
- an Ally attack produces **no** check
- an 11000 attacker into an 11000 Persona does **not** connect
- blocker Defense adds to the defending Persona's Power
- Screen restricts legal targets

35 tests green across `engine.test.ts` (rules) and `angel.test.ts` (real card data).
