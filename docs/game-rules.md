# Codex Legends — current Set 1 rules

Rules revision: `free-codex-switches-2026-10-04`.
This document describes the playable Luzon, Visayas and Mindanao card pool. Retired cards and future Extra-zone mechanics are not current deck options.

## Win the duel

Your Persona is you on the battlefield. Break all five opposing shields (Barriers), then land another hit on their Persona to win. A player also loses when required to draw or check from an empty deck, or when they surrender.

## Deck and zones

Build a 50-card main deck, with the deck builder enforcing the current copy, guild, Force and Sentry limits. Keep five distinct Codex outside the main deck for the live deck builder and private rooms. Choose a printed Level 3 Unit from your deck as Persona.

Each side has a Persona Zone, four Ally Zones, five Barriers, Deck, Grave, Heart, Exile, Codex and Extra. Defense holds cards committed for the current attack. Check temporarily displays a revealed card. The hand is separate from the mat.

Hidden cards stay private. Right-click a visible card, or long-press on touch, to read its current rules. The digital inspector takes precedence over older text embedded in card artwork.

## Opening and turns

1. Determine who starts, choose each Persona and starting Codex, and shuffle.
2. Set five face-down Barriers. Both players draw five opening cards visibly.
3. The first player skips only the first-turn draw and any replacement of that draw. The second player draws normally on their first turn.
4. At the start of a turn, charge units and reset that turn's plays and usage windows. Handle draw or its replacement, Personification and Main-phase triggers in their defined windows.
5. During Main, normal call, use Actions or available manual skills, and switch Codex when allowed.
6. During Battle, declare attacks and responses. End the turn when finished; resolve delayed returns, mandatory payments and expiring effects.

There is no Energy resource, starting balance, refresh, affordability check or Energy reward in current matches.

## Plays and card costs

Your play allowance is `max(1, printed Persona Level + broken Barriers)`. A printed Level 3 Persona starts with three plays; two broken shields make five. Changing Persona or breaking another shield changes the allowance immediately without resetting plays already spent.

| Move | Plays used |
|---|---:|
| Normal call from hand, including a Force used as an Ally | 1 |
| Play an Action card | 1 |
| Switch Codex manually or accept an automatic switch | 0 |
| Manual skill, Codex skill or triggered effect | 0 |
| Force hand skill or Sentry activation | 0 |
| Special call caused by an effect | 0 |
| Relocation or Personification | 0 |

Other printed costs remain: Offer, Vent, Essence, discard, moving a card to the deck, and so on. Select the complete payment and confirm it once. Cancelling before commitment moves no cards and spends no play or usage. Once committed, costs stay paid even if the effect is interrupted or its target is unavailable.

Codex switching has no separate per-turn limit. Manual switching happens in your Main Phase; automatic switching is an optional choice when the card's trigger and board conditions are met. Earlier switches this turn or during your previous turn do not block another switch. Every switch is free, including returning to a previously active Codex. Selecting the active Codex or declining a switch spends nothing. The starting Codex is setup and costs no play.

Automatic switching during the opponent's turn is also free. Having zero remaining Plays does not block a manual or automatic switch. The automatic trigger and its board conditions must still be met.

Switching does not activate every skill on the new Codex. Its printed trigger, costs and usage limit still apply. Each Codex's once-per-turn skill limit survives switching away and back. Negating a triggered Codex skill does not undo its completed switch; the switch itself is free.

A once-per-turn limit follows its physical card through zone changes. A shared-name limit applies across all copies owned by that player. A separately limited follow-up does not suppress an otherwise legal base effect.

## Responses and chains

1. Choose an eligible skill or card, choose its cost and declare existing public targets.
2. Commit the full activation. Offered Allies move to Grave now; Vented cards leave Heart now. Pay any play and record the usage now.
3. The opponent gets one response opportunity if they have a legal response.
4. If they activate a response, they pay its full cost and you receive the next opportunity. Only one card is added per opportunity.
5. If the responding player declines, or has no legal response, the entire chain locks immediately. The initiating player does not get an extra self-chain after a decline.
6. Resolve the newest link first, then work backward to Link 1. No new response is inserted while resolving.
7. After the whole chain, show the owner's waiting ordinary triggers. They choose the next one to activate as a new Link 1. Unused siblings stay available. Optional effects can be declined; required effects must be handled.

Force hand skills respond on either player's turn when their printed condition occurs. All twelve current Forces reveal and discard themselves as the cost. Their four response types are: Rally one of your Units and the opposing Ally that activated; negate the opposing activation; draw 2 in response to an effect that would Special Call; or give one of your Units +5000 until the end of an opposing attack and draw 1. The call response happens before the calling effect resolves, even if it is later negated. Rally sends each chosen Unit to the bottom of its owner's deck and does not itself negate that Unit's committed ability. A negate only affects the activation immediately responded to, never the entire chain. Paid costs remain spent. Sentries require an attack on their owner's Persona, before defense/check resolution. Ordinary triggered skills, including Last Oath and Vented-card skills, are not response cards. Paying their parent cost earns a later opportunity.

A chain is independent of its attack: a committed Sentry cancels the attack, but other committed links still finish. Uncommitted cards stay in hand. No late Sentry can undo damage or a completed check.

Existing public targets are declared before the response. A target that leaves and returns is a new zone entry, so the old declaration cannot follow it or select a replacement. Valid independent portions still resolve. Searches, revealed-top-card choices, and choices created by resolving an earlier clause happen at resolution. Continuous rules and true replacements apply atomically without creating a response link of their own; ordinary triggers they create wait until that operation finishes.

### Example: Offer three

Sulayman pays Offer 3. All three Allies go to Grave together. Their Last Oaths wait. The opponent can add a Force; the first player may respond to that Force. One decline starts last-in-first-out resolution. Only after that entire chain finishes does the owner choose which Last Oath to activate next. Negating the parent does not refund the offered cards or erase their earned Last Oaths.

## Battle

Choose a charged attacker, a target and eligible adjacent Ally supporters. A Persona cannot support. Supporters add Power and exhaust. Handle attack triggers and the attacker/defender Force or Sentry opportunities before ordinary defense.

If no Sentry stops the attack, the defender may use Unit or Force cards from hand as blockers. Actions and Sentries are excluded from this ordinary defense picker. Total defense is the defending unit's Power plus the blockers' Defense. Restrictions such as Bakunawa's Level limit apply to the current battle.

**Defense must exceed Attack Power. Equal Power hits.** Blockers go to Grave at the end of the attack.

When a Persona attacks, reveal the top card for an attack check after blockers are chosen. Ally attacks do not check. When a Persona is hit with shields remaining, reveal the broken Barrier for a Barrier check. Checked cards normally go to hand.

A Force revealed on a check activates its **check effect only**, giving one of its owner's Units +5000 until end of turn. Its separate hand skill does not activate from that check. From hand, activating the Force uses its hand skill, moves it to Grave on commitment and uses no play. A Force can alternatively be normal called as a Level 0 Ally for one play.

A Sentry revealed in its permitted window is exiled face down on commitment. Its effect nullifies the Persona attack and applies the card's individual bonus. Do not also spend ordinary blockers behind a Sentry. The card is consumed once.

An attacker or target leaving the field interrupts its declared attack. Returning the same physical card does not resume that old attack.

## Codex and States

One Codex is active at a time. A legal manual switch is available during Main, including turn one. Auto-switches use their printed event window and share the turn's switching restrictions. Switching away and back does not refresh a used skill.

- **Bayanihan:** all four Ally Zones contain Luzon Arch Units.
- **Andukha:** at least six cards in Heart. Individual 9/12 thresholds still need that many cards. Vent can reduce or remove access.
- **Garahana:** at least five qualifying Maguindanaon Units in Grave, applying printed double-counting rules. The Maguindanaon subtype is distinct from a Beast or Bird belonging to Mindanao.

State markers describe conditions, not a spendable resource. Re-evaluate them as cards move. Blue identifies manual skills, green triggered skills, yellow battle-usable hand skills, and red marks a State requirement. Read the timing and current usage limit alongside the color.

## Card guides and verification

The generated [Luzon](agta-set-1-card-guide.md), [Visayas](babaylan-set-1-card-guide.md) and [Mindanao](maguindanao-set-1-card-guide.md) guides contain the current loaded wording. The [rules manifest](generated/current-rules-manifest.json) lists every active card and effect identity. Implementation evidence and deployment compatibility are recorded in the release report.
