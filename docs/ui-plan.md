# UI/UX Plan — the game board

Measured diagnosis and a prioritised plan for the board layout. Written so any
agent can pick up a single item without reading the rest.

> **Status: P0–P3 shipped.** Measured results in §7. P4 (polish) is outstanding.

**Measured at 1600×900** (`.mats` region = 1308×728, each mat = 1292×350).

---

## 1. The diagnosis

### Root cause: the mat stretches, the cards do not

Three independent problems compound:

| # | Problem | Evidence |
|---|---|---|
| **A** | Zones stretch to fill width | Barrier row is **1148px wide holding 199px of cards — 83% empty**. Unit row is 1148px holding 424px — 63% empty. |
| **B** | Cards are capped in pixels | `.slot { height: min(100%, 108px) }` — the unit row is **220px tall but cards render at 108px**, using half the height offered. Same for `.barrier` (50px cap in a 75px row) and `.pilebox` (80px cap). |
| **C** | The mat is stretched far past its designed shape | Each mat is **1292×350 = 3.7:1**. The original art was **16:9 = 1.78:1**. It is more than twice as wide as it was designed to be. |

Together: on a wide screen the container grows, the cards refuse to, and
everything ends up small and marooned in a letterbox.

### Why the barrier row looks worst

`grid-template-columns: auto 1fr auto` puts the barrier row in the `1fr` middle
column, so it absorbs **all** surplus width. Five 36px cards then sit in 1148px.
It reads as a bug because it is one.

### The space we actually have

If cards filled the row height instead of the 108px cap:

- Unit slots: **157×220** instead of 77×108 — **2× larger**
- Five slots + gaps ≈ 820px, still inside the 1148px available
- Barriers at full row height: ~54×75

So the fix is mostly *removing caps*, not finding more room.

---

## 2. The plan

Ordered by visual payoff per unit of effort. **P0 alone fixes most of the
screenshot.**

### P0 — Stop wasting space *(biggest win, lowest risk)*

**P0.1 — Cards scale from row height, not fixed pixels**
Replace every `min(100%, Npx)` cap with height-driven sizing plus a *generous*
ceiling so cards can't get silly on huge monitors.

```css
.slot        { height: 100%; max-height: 200px; aspect-ratio: 5/7; width: auto; }
.slot.persona{ max-height: 224px; }        /* Persona stays dominant */
.barrier     { height: 100%; max-height: 96px; aspect-ratio: 5/7; }
```

Expected: unit cards roughly **double** in size at 1600×900.

**P0.2 — Bound the mat's aspect ratio and centre it**
A mat should never stretch past about **2.6:1**. Beyond that, surplus width
becomes margin, not dead zone.

```css
.mat { width: min(100%, calc(var(--mat-h) * 2.6)); margin-inline: auto; }
```

This is the single change that makes the board read as a *table* rather than a
stretched banner.

**P0.3 — Centre the barrier row, size it to content**
The barrier zone should hug its five cards, not fill the column. Same for the
unit row. Both are already `justify-content: center`; the fix is to stop the
zone itself from spanning — give the middle grid column `justify-items: center`
and let the zone be `width: max-content`.

**P0.4 — Reclaim vertical space**
The hand bar is a fixed **172px = 19% of a 900px screen**. Make it scale:
`height: clamp(120px, 17vh, 190px)`. Roughly 30px back to the mats on a 900px
screen, more on shorter ones.

---

### P1 — Information hierarchy

Right now every zone has equal visual weight. It should not.

**P1.1 — Make the Persona unmistakably the centre**
It is the win condition and the main attacker. Give it a larger slot, a warmer
border, and a subtle inner glow. Currently only ~10% larger than an Ally.

**P1.2 — Demote the six piles to a rail**
Extra, Codex, Check, Deck, Exile, Grave are *reference* information, consulted
rarely. Today they occupy both flanks at card size. Group them into a compact
vertical rail on each side (or one rail per mat edge), ~60% of current size,
with the count as the primary element and the card back as texture.

Exception: **Codex stays interactive and readable** — it is clicked during Main.

**P1.3 — Make Barriers read as a life total**
They are the game's HP bar. Larger, evenly spaced, with broken slots clearly
*spent* rather than merely faded. Consider a "4 / 5" numeral beside the row at
larger type than the current 8px label.

---

### P2 — Readability

**P2.1 — Scale badges with card size** — the power badge is a fixed 9px; on a
157px-wide card it should be ~12px.

**P2.2 — Drop redundant zone labels.** "ALLY" repeated four times per mat is
noise once slots are obviously card-shaped. Keep labels on the piles, where they
disambiguate.

**P2.3 — Show the Persona's current Power prominently** during battle — it is
the number the player is doing arithmetic with.

---

### P3 — Responsive behaviour

Three regimes, since the current CSS assumes one:

| Width | Layout |
|---|---|
| **< 1100px** | Piles collapse to icon+count only; side panel narrows to 240px |
| **1100–1700px** | Current layout with P0 sizing |
| **> 1700px** | Mat hits its max aspect and centres; surplus becomes margin |

**P3.1** — Also handle short screens (`< 800px` tall), where two mats plus a hand
bar is the real squeeze. Consider collapsing the opponent's pile rail first.

---

### P4 — Polish *(only after P0–P2 land)*

- Animate cards moving between zones instead of snapping
- A brief flash on the Barrier that breaks
- Idle shimmer on the active player's mat border
- Sound hooks

---

## 3. Suggested target layout (wide screens)

```
┌──────────────────────────────────────────────────────────────────┐
│                          DEFENSE                                  │
│  ┌──┐                                                      ┌──┐   │
│  │pi│        ┌────┐┌────┐┏━━━━━━┓┌────┐┌────┐              │pi│   │
│  │le│        │Ally││Ally│┃PERSON┃│Ally││Ally│              │le│   │
│  │ra│        └────┘└────┘┗━━━━━━┛└────┘└────┘              │ra│   │
│  │il│                                                      │il│   │
│  └──┘         ▣ ▣ ▣ ▢ ▢   BARRIERS 3/5                    └──┘   │
└──────────────────────────────────────────────────────────────────┘
        ↑ surplus width is margin, not stretched zones ↑
```

- Cards ~2× current size
- Piles in compact rails at the flanks
- Barriers centred beneath the units, sized as a life bar
- The mat centred with real margins

---

## 4. Order of work

1. **P0.1 + P0.3** together — remove caps, stop zones stretching. *Most of the fix.*
2. **P0.2** — bound the aspect. *Makes it look designed.*
3. **P1.2** — pile rail. *Reclaims the flanks.*
4. **P1.1 + P1.3** — hierarchy.
5. **P2**, then **P3**.

---

## 5. How to verify

Do not trust a screenshot. Measure, as this document did:

```js
const R = n => { const b = n.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
const units = document.querySelector('.mat:not(.foe) .z-units');
const slots = [...document.querySelectorAll('.mat:not(.foe) .slot')];
const used = slots.at(-1).getBoundingClientRect().right - slots[0].getBoundingClientRect().left;
console.log('zone', R(units), 'used', Math.round(used), 'wasted', Math.round(R(units)[0] - used));
```

**Targets after P0:**

| Metric | Now | Target |
|---|---|---|
| Unit slot size | 77×108 | ≥ 140×196 |
| Unit row waste | 724px (63%) | < 25% |
| Barrier row waste | 949px (83%) | < 20% |
| Mat aspect | 3.7:1 | ≤ 2.6:1 |

Check at **1280×720**, **1600×900** and **1920×1080**, and confirm
`document.body.scrollWidth === innerWidth` at each (no horizontal overflow).

---

## 6. Constraints to respect

- The mat is **drawn in CSS**, not a background image — zones and cards line up
  by construction. Do not reintroduce a background image with absolutely
  positioned zones; that was the original bug.
- `.mat.foe` is `rotate(180deg)`; anything with text needs the `.flip` class to
  stay upright. Verify both mats after any layout change.
- Every card must remain **right-clickable** for the inspect panel.
- No rules logic in `src/ui/`.


---

## 7. Results — P0 to P3 as shipped

Measured on the running game, all four viewports, no horizontal or vertical
overflow anywhere.

| Metric | Before | Target | **Now** |
|---|---|---|---|
| Ally slot @1600×900 | 77×108 | ≥140×196 | **123×173** |
| Persona slot | 77×108 | dominant | **143×201** (16% larger than an Ally) |
| Unit row waste | 63% | <25% | **0%** |
| Barrier size | 36×50 | bigger | **49×68** |
| Barrier row waste | 83% | <20% | **6%** |
| Mat aspect | 3.69:1 | ≤2.6:1 | **2.58:1** |
| Hand bar | fixed 172px | scale | **`clamp(118px,17vh,186px)`** |

Across viewports:

| Viewport | Mat | Aspect | Ally | Persona | Overflow |
|---|---|---|---|---|---|
| 1280×720 | 751×292 | 2.57 | 95×133 | 111×155 | none |
| 1366×660 *(short)* | 684×266 | 2.57 | 85×119 | 99×138 | none |
| 1600×900 | 927×359 | 2.58 | 123×173 | 143×201 | none |
| 1920×1080 | 1121×432 | 2.59 | 160×223 | 186×260 | none |

Pile sizes scale with the board and stay uniform: 44×62 at 1280×720, 41×57 at
1366×660, 62×87 at 1600×900, 74×104 at 1920×1080. Verified at every viewport with
no collapse, no overlap, no clipping, and correct 5:7 proportions on all twelve
piles across both mats.

Regression checks: opponent mat still contains its own cards, its labels stay
upright through the 180° rotation, and right-click inspect still works.

### Pile sizing — three failure modes in a row

The reference piles (Extra, Codex, Check, Deck, Exile, Grave) went through three
broken states before landing. Worth reading before touching `.pilebox`:

1. **Stacked layout squashed the art.** The pile was a flex column of
   label + card-back + count. The card back got `flex: 1` with no aspect ratio,
   so it took leftover height (41px instead of 70px) and `background-size: cover`
   cropped it — cards looked *cut*. Fixed by making the pile a card-shaped frame
   with the back filling it and the label/count as overlays.
2. **Deriving height from width overflowed the row.** `width: X; aspect-ratio: 5/7`
   made the Codex 111px tall inside a 102px grid row, so it **overlapped Exile**.
3. **`height: min(100%, …)` collapsed the pile.** A percentage height inside an
   `auto` grid row is circular — the row sizes to the pile and the pile sizes to
   the row. Extra and Check collapsed to **2×3px**.

**The landing:** a definite `width: var(--pile-w)` with `height: calc(var(--pile-w) * 1.4)`,
where `--pile-w` is bounded by *viewport height* as well as width:

```css
--pile-w: clamp(34px, min(4.2vw, 7.2vh), 62px);
```

The `vh` term is what guarantees a pile can never outgrow its row, with no
percentage and therefore no circularity. The Codex is distinguished by border and
glow rather than by being larger, so it can never be the one that overflows.

### Four traps found while implementing

1. **`aspect-ratio` + `height:100%` inside a `width:max-content` parent is
   circular.** The browser resolves max-content width against an indefinite
   height and the element collapses — barriers went to 2×3px. Fix: give such
   elements an explicit height (`clamp()`), or drop `max-content` and use
   `justify-self: center`.
2. **A flex child needs its own height** before `height:100%` means anything.
   `.barrier-row` had to become `flex: 1; min-height: 0`.
3. **Zone classes sit *on* the pilebox** (`class="pilebox z-codex"`), so
   `.z-codex .pilebox` matches nothing. Use `.pilebox.z-codex`.
4. **Empty zones collapse.** A pile with no card back shrank to a sliver;
   `--pile-min` keeps it readable as a zone marker.

### Still open (P4)

Card movement animation, barrier-break flash, active-mat shimmer, sound hooks.
