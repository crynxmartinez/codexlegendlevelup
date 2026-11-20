# What Master Duel Does, and What We Should Take

A study of Yu-Gi-Oh! Master Duel's presentation and interaction layer, mapped
against what Codex Legends already has. Sources at the bottom.

The headline: **our animation inventory is already competitive. Our interaction
design is not.** Master Duel's real advantage is not that it has more effects —
it is that its effects *mean* something, and that the player is never unsure
whose decision it is.

---

## 1. Animation vocabulary

### 1.1 Effects depict what they do

The single biggest gap. In Master Duel an effect animation is thematic to the
card's actual function and its art. Harpie's Feather Duster destroys the
opponent's Spell/Trap zone, and its animation shows a feather literally dusting
those cards away. Imperial Order negates Spells, and its animation has the
emperor appear and fire beams into both Spell/Trap zones.

We have exactly one activation animation — `abilityPulse`, a glow-and-float —
and it plays identically whether a card is destroying a unit, searching the
deck, or granting +1000 Power. The player learns nothing from watching it.

**What to take:** a small vocabulary of effect *shapes*, chosen by what the
effect does rather than by which card did it. We already emit typed fx events
(`target`, `power`, `powerExpire`, `destroy`, `stateReleased`), so the routing
exists. The missing kinds are roughly:

| Effect shape | Suggested read |
|---|---|
| Destroy / offer | Strike from source to target, target cracks |
| Power up / down | Already built (arrows rise and sink) |
| Search / reveal | Deck lifts, card slides out face-up |
| Call from deck or grave | Card rises out of the pile it came from |
| Negate / block | Target dims, a barred ring closes over it |
| Heal / restore | Pull *toward* the owner — the inverse of a strike |

Six reads, not seventy-six. The shape is keyed to the verb, so a player who has
seen it once anywhere recognises it everywhere.

### 1.2 Spectacle is tiered on purpose

Only "powerful cards or cards with high user recognition" get bespoke 2D summon
animations; ace monsters get more still. A production-budget decision that
doubles as teaching — the game tells you which cards matter by how loudly they
announce themselves.

**What to take:** scale the treatment by Level. A Level 1 call should be quick
and quiet. A Level 3 or a Force deserves a longer beat, a bigger flare, maybe a
brief hold. Right now every call is paced identically, which flattens the deck's
own hierarchy.

### 1.3 Animation distinguishes mechanically-similar actions

Master Duel added a distinct brief glow to Special Summons specifically so they
read differently from Normal Summons — same card, same field, different
animation, because the *rules* difference matters.

**What to take:** we have at least four ways a unit reaches the field and they
all look the same:

- played from hand (costs a play)
- `specialCall` from deck
- `specialCall` from grave
- Gather replacing an occupied slot (which destroys the occupant)

The fourth is a real consequence the player can currently miss entirely.

### 1.4 Animations cover consequences, not just causes

Cards have distinct **victory effects** — a separate animation when *that card*
is the one that ends the duel. It is a category you can filter your collection
by.

**What to take:** the killing blow should not look like every other attack. The
attack that breaks the last Barrier deserves its own sequence before the end
screen.

### 1.5 The animation belongs to the card, not the code path

Version 2.7.0 made summon animations play on Flip Summon too, and let you replay
them from the Collector's File. Once a card has a presentation, it is the
card's, and it appears wherever that card does.

---

## 2. Interaction design

Where Master Duel is furthest ahead of us — and none of it is about graphics.

### 2.1 Activation Confirmation is a player-tunable dial

Master Duel does not decide how often to interrupt you. You do. Under
Settings → Duel → Activation Confirmation there are five modes:

- **Auto** — prompts only for quick effects in response to summons, attack
  declarations, card activations, and the opponent's end of turn
- **On** — all of the above, plus phase changes, post-resolution moments, and
  minor actions like setting a card
- **Off** — only mandatory and certain trigger effects
- **Hold 1/2/3** — hold left mouse for ON, right mouse for OFF, release for the
  default; overrides a single decision without opening a menu
- **Switch** — a bottom-right button cycles Auto → Off → On

The insight worth stealing is not the five modes. It is the recognition that
**prompt frequency is a preference, not a constant.** A new player wants to be
asked. An experienced one wants to be left alone except when it matters. We
hardcode this per effect — and our optional Codex auto-switch prompt is exactly
the kind of thing that feels helpful for ten games and naggy for a hundred.

### 2.2 A permanent "whose decision is this" indicator

A light sits red at the top of the screen (opponent has priority) and switches
to blue on your side when the game is waiting on you, with a countdown timer.

We have a phase pill, but nothing that persistently answers *is the game waiting
on me right now?* During the AI's turn, at our animation pacing, the player
genuinely cannot always tell whether to click.

### 2.3 You choose the order your own effects resolve

**Activation Order** lets you set the sequence when several of your effects
trigger at once — used to protect the important one from disruption. The April
2026 update extended this to start-of-Battle-Phase effects specifically.

We fire triggers in field order, automatically. Given how many of our Codex and
`[Ally]` triggers can fire together, this is a genuine depth win, not just UI.

### 2.4 Manual placement when position matters

**Card Placement: Auto → Manual** exists because Link arrows make the slot
meaningful. We already did this for Gather, which was right. Worth making it the
default anywhere a slot has consequences.

### 2.5 Read the board without hovering

Two settings, both shipped off and universally turned on:

- **Automatic Card Description Display** — the opponent's card text appears
  automatically during play instead of requiring a hover
- **Transparent Display of Set Cards** — your own face-down cards render
  semi-transparent so you can read your board at a glance

Ours require right-click, so during the AI's turn things happen and vanish
before the player can inspect them. The cheapest high-value fix on this list.

### 2.6 Even the selection dialog is tunable

**Card Selection Dialog: horizontal → vertical scroll.** Trivial-sounding, and
it exists because that dialog is used constantly. So is our chooser.

---

## 3. Information design

- Font sizes run 28–42px on a hierarchy where **body text is the largest**
  (40–42px) — the opposite of most UIs, and correct for a game where the card
  text *is* the rules.
- Deck building renders card *frames* first and illustrations second, so layout
  appears instantly and fills in. We load art directly.
- Palette is deep navy through deep purple with unconventional accents, chosen
  to read as deliberately digital rather than imitating cardboard.
- The victory screen uses glowing white text with rainbow gemstone-like
  refraction. Ours is a flat banner.

---

## 4. Where we actually stand

**We already have** roughly thirty keyframe animations: target lines, power
arrows rising and sinking, destroy, sentry exile, barrier flip and crack, board
shake scaled to overkill, ability pulse and float, codex flip, stat pulses,
defense entry, pile landing, slam and shockwave, hold shine, inspect.

The inventory was not the problem. All ten items below are now implemented.

**Tier 1 — legibility and control**
1. ✅ Effect-shape animation vocabulary (§1.1) — five new `FxEvent` kinds
   (`strike`, `search`, `arrive`, `ward`, `restore`) joining `power` /
   `powerExpire`, emitted by the engine and rendered by `playFx`
2. ✅ Automatic card-text display (§2.5) — `.auto-desc` panel, fed by ability
   activation, opponent calls, and Sentry reveals
3. ✅ Persistent "waiting on you" indicator (§2.2) — `.priority-light`, which
   reads live state rather than being pushed to, so it cannot desync
4. ✅ Prompt-frequency setting (§2.1) — `PromptPolicy` on the controller plus
   per-duel refusal memory in `HumanChooser`

**Tier 2 — depth and clarity**
5. ✅ Trigger ordering (§2.3) — *already existed*; `fireTrigger` resolves one
   at a time and the player picks the order
6. ✅ Arrival differentiation (§1.3) — `hand` / `deck` / `grave` / `heart` /
   `replace`, each with its own read; `replace` is the loudest because it
   destroyed the unit that was standing there
7. ✅ Ghosted reserve Codex (§2.5) — scoped to cards the player already knows.
   Deliberately NOT applied to Barriers: those are face-down to their owner
   too, so revealing them would be an information leak, not a convenience
8. ✅ Finishing-blow sequence (§1.4) — fires when the last Barrier falls, and
   the end screen names the card that did it

**Tier 3 — polish**
9. ✅ Spectacle scaled by Level (§1.2) — `--arrive-scale`, defeatable via the
   *Scale flourishes with Level* setting
10. ✅ Victory screen refraction (§3) — a sheen swept across the result word
    with `background-clip: text`

### What shipped differently from the proposal

**Prompt frequency** does not gate *which* effects are offered — the UI layer
cannot tell whether an effect "can change the board", and guessing would make
effects silently vanish. It governs what is **re-offered after a refusal**,
which is the actual complaint:

- `all` — nothing remembered
- `auto` (default) — a declined Codex switch is not re-offered this duel
- `minimal` — no declined effect is re-offered this duel

Nothing ever becomes illegal; you are only not asked twice. The Codex
auto-switch was the case worth fixing: it is offered at four separate moments
every turn.

---

## Sources

- [Praising the UI of "Yu-Gi-Oh! Master Duel" (TOGE, note.com)](https://note.com/togetogedesign/n/nd49bef3af6da?hl=en)
- [Activation Confirmation & Toggle Function (Out of Games)](https://outof.games/realms/yugioh/guides/225-activation-confirmation-toggle-function-how-to-make-the-most-of-master-duels-prompts/)
- [Essential and Recommended Settings for Master Duel (note.com)](https://note.com/mamotin/n/n46fc0810fcb8?hl=en)
- [Master Duel Version 2.7.0 Update (YGOrganization)](https://ygorganization.com/master-duel-version-2-7-0-update/)
- [April 2026 App Update (Master Duel Meta)](https://www.masterduelmeta.com/articles/news/april-30-2026/master-duel-update)
- [More Summon and Ace Monster Animations (YGOrganization)](https://ygorganization.com/master-duel-more-summon-and-ace-monster-animations/)
- [Update adds animations for spells and traps (Upcomer)](https://upcomer.com/yu-gi-oh-master-duel-update-adds-animations-for-spells-and-traps/)
- [Yu-Gi-Oh! Master Duel (TV Tropes)](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/YuGiOhMasterDuel)
