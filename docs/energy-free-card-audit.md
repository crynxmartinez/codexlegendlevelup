# Energy removal: complete card audit

> Historical source audit. The [combined handoff](energy-free-chains-claude-implementation-plan.md) embeds every card's migration and verification entry with the latest chain timing. Use its Part A for implementation; quotations here describe the old Energy-era rules, and older nested/batch timing checks are superseded.

Planning audit only. Read with [the implementation plan](energy-free-rules-plan.md). Snapshot: game commit `0047874`, 1 October 2026. Every selectable card below has an individual migration disposition and a behavior to verify. Proposed new caps/costs are labeled; they are not claims of tested balance.

## Coverage

The runtime loader resolves **259 definitions**: **141 selectable cards** (66 Units, 30 Actions, 30 Codex, 12 Forces, 3 Sentries), **1 live non-deckbuilt Kaluluwa token**, and **117 other unavailable definitions**. Of the 141, **81 mention Energy** in their current text. Of the unavailable definitions, **29 mention Energy**. Energy-free combo partners are included, not omitted.

Current text is captured from `ALL_CARDS` after loader overlays. Existing rules text sometimes omits an implementation cap; each affected Codex must have its text reconciled with its intended behavior. Card art is a separate verification task. Runtime IDs preserve old internal deck names for compatibility; player-facing regions remain Luzon, Visayas and Mindanao.

All change instructions mean: keep all unmentioned portions of that card. All Actions use 1 play; all normal calls use 1 play; all skill/special-call/Force-skill/Sentry paths use 0 plays. No Energy remains in new active rules.

## Luzon: 43 selectable cards

### L01. Sierra Watchkeeper, Banoy

- **ID:** `agta/sierra-watchkeeper-banoy`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/agta.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [Sentry]: When your Persona is taking damage, [Cost: Reveal this card and 1 Energy] nullify that damage. Then Sipol 1, then exile this card face down.
> Sipol - Reveal the top card of your deck. If it is a Unit, special call it to an Ally Zone. Otherwise, place it on the bottom.

**Proposed migration:** Remove 1 Energy. Reveal and exile this Sentry face down exactly once, nullify the Persona attack, then Sipol 1 through the shared Sentry path.

**Verification:** One reveal consumes the card; Sipol uses its normal replacement rules; a second attack cannot reuse this UID.

### L02. Wind-Heart Rescuer, Taguwasi

- **ID:** `agta/set-1/wind-heart-rescuer-taguwasi`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] At the start of your Main Phase, look at the top 3 cards of your deck and put them back on top in any order.[/green]
> [green][Bayanihan][Persona] 1/Turn: When this Unit attacks, [Cost: 2 Energy] Sipol 1.[/green]

**Proposed migration:** Remove the attack skill’s 2 Energy; retain Bayanihan, Persona attack timing and once per turn. Retain the start-of-Main top-three ordering.

**Verification:** The attack skill is absent while Bayanihan is locked; free Sipol does not consume a play; top-deck preparation does not trigger twice.

### L03. Fifth-Sky Tyrant, Kalimangalnuk

- **ID:** `agta/set-1/fifth-sky-tyrant-kalimangalnuk`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Persona] 1/Turn: [Cost: 2 Energy] Sipol 1, then this Unit gets Power equal to the Power of the Unit called, until end of turn.[/blue]
> [green][Bayanihan][Persona] During your turn, all of your Units get Power +2000.[/green]

**Proposed migration:** Remove 2 Energy from the once-per-turn Sipol skill. Keep the power of the actually called Unit and the separate Bayanihan team bonus.

**Verification:** No called Unit means no borrowed Power; repeated clicking or returning the same copy does not repeat the manual skill.

### L04. Life-Breath Mother, Nanolay

- **ID:** `agta/set-1/life-breath-mother-nanolay`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/Turn: When this Unit attacks, [Cost: 2 Energy] draw 1, then this Unit gets Power +3000 until end of turn.[/green]
> [green][Bayanihan][Ally] 1/Turn: If this Unit was specially called during a Battle Phase, after your Persona attacks, [Cost: Discard 2 cards and 2 Energy] Personify into this Unit, charged.[/green]

**Proposed migration:** Remove both 2 Energy payments. Keep once-per-turn attack draw/+3000, and keep Discard 2, Bayanihan and special-called-during-Battle requirements for charged Personification.

**Verification:** Cannot Personify without both discards; old Persona moves correctly; same-copy and successive-copy lines are tested; draws/checks remain correctly ordered.

### L05. Fallen Sky-Challenger, Talimanog

- **ID:** `agta/set-1/fallen-sky-challenger-talimanog`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When specially called, Sumipat 1. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct cost change; preserve its already free Sumipat/Bayanihan replacement skill and existing usage limit.

**Verification:** Normal call versus special call eligibility and State-release replacement are tested; do not reintroduce its obsolete paid/restand description from old lessons.

### L06. Months-Of-Battle Warrior, Ammani

- **ID:** `agta/set-1/months-of-battle-warrior-ammani`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally] 1/Turn: When specially called, [Cost: 1 Energy] reveal the top card of your deck. If it is not a Unit, put it on the bottom and put this Unit on top of your deck. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** Remove internal 1 Energy payment and only its affordability predicate. Retain special-call condition, reveal/non-Unit handling and Bayanihan substitution.

**Verification:** Unit and non-Unit top cards take different paths; the replaced Bayanihan skill does not also perform the base skill.

### L07. Relentless Third Brother, Annibo

- **ID:** `agta/set-1/relentless-third-brother-annibo`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When your Persona attacks, put this Unit on top of your deck. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change. Keep Persona-attack timing, own movement to deck top and Bayanihan replacement.

**Verification:** Returning and recalling the same UID does not refresh its once-per-turn skill; no normal-play charge for effect movement.

### L08. River-Calling Sister, Alig

- **ID:** `agta/set-1/river-calling-sister-alig`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When a card is placed into an Ally Zone from your deck or your hand, this Unit gets Power +2000 until end of turn.[/green]

**Proposed migration:** No direct change. Keep +2000 for the eligible placed event, once per turn.

**Verification:** A special call from hand counts as an effect call and still creates its placed event without spending a play.

### L09. Maiden-Taking Raptor, Ammalabukkaw

- **ID:** `agta/set-1/maiden-taking-raptor-ammalabukkaw`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When specially called, Sipol 1. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change; preserve special-call Sipol and Bayanihan replacement.

**Verification:** Stress-test chains with free Tumatanan/Amuran; cap persists when the same copy is recycled.

### L10. Golden-Threshold Warden, Nagdombilan

- **ID:** `agta/set-1/golden-threshold-warden-nagdombilan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When specially called, put 1 card from your hand on top of your deck, then Sipol 1. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change. Keep the hand-to-top movement before Sipol and the replacement skill.

**Verification:** No free Sipol by cancelling the required hand selection; test empty hand and full field.

### L11. Wedding-War Chief, Namandiyanin

- **ID:** `agta/set-1/wedding-war-chief-namandiyanin`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally] 1/Turn: When specially called, [Cost: 1 Energy] Sumipat 3. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** Remove its internal 1 Energy fee; retain special-call Sumipat 3, once per turn, and Bayanihan substitution.

**Verification:** Look at three successive eligible cards rather than repeating one kept card; inspect results under both State conditions.

### L12. Moon-Bright Captive, Innawagan

- **ID:** `agta/set-1/moon-bright-captive-innawagan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally] 1/Turn: When placed from your hand, [Cost: 1 Energy] put this Unit on top of your deck. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** Remove 1 Energy; keep placed-from-hand timing, top-deck movement and once-per-turn/Bayanihan behavior.

**Verification:** Calling from another zone does not satisfy the base hand condition; no new use when the same card returns.

### L13. Barbed-Sky Messenger, Dalewasan

- **ID:** `agta/set-1/barbed-sky-messenger-dalewasan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally] 1/Turn: When placed, [Cost: 1 Energy] choose two of your Units; they each get Power +2000 until end of turn. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** Remove 1 Energy; retain the once-per-turn placed skill and two distinct +2000 targets, or its Bayanihan substitute.

**Verification:** Cannot select the same Unit twice to mimic two targets; define partial target resolution consistently with the existing effect.

### L14. Keeper At Sunrise, Sinag

- **ID:** `agta/set-1/keeper-at-sunrise-sinag`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When placed from your hand, discard 1 card, then draw 1 card. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change; retain discard-before-draw and once-per-turn placed-from-hand condition.

**Verification:** Cannot gain the draw after declining a required discard; no Energy or play is charged for the triggered skill.

### L15. Returning Sky Captain, Darawan

- **ID:** `agta/set-1/returning-sky-captain-darawan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When a Unit is placed from your deck, this Unit gets Power +3000 until end of turn. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change; retain once-per-turn response to another Unit entering from deck and Bayanihan replacement.

**Verification:** Multiple free calls do not repeat the same copy’s once-per-turn bonus.

### L16. Wedding-Pact Elder, Amuray

- **ID:** `agta/set-1/wedding-pact-elder-amuray`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Hand] 1/Turn: [Cost: 1 Energy] Put this card on top of your deck.[/blue]

**Proposed migration:** Remove 1 Energy. Hand skill still puts this physical card on top of the deck, once per turn.

**Verification:** Works at zero plays; the card cannot remain in hand and on the deck simultaneously; same-turn recycling preserves its use.

### L17. Nightfall Raider, Kallan

- **ID:** `agta/set-1/nightfall-raider-kallan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [blue][Hand] 1/Turn: Discard this card, then draw 1 card.[/blue]

**Proposed migration:** No direct change; hand skill still discards itself then draws one, once per turn.

**Verification:** Do not consume a play; receiving the same physical copy again does not reset its skill.

### L18. Night-Feast Defender, Tamin

- **ID:** `agta/set-1/night-feast-defender-tamin`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Ally] 1/Turn: [Cost: 1 Energy, and put this Unit on the bottom of your deck] Choose one of your Units and put it on top of your deck. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/blue]

**Proposed migration:** Remove 1 Energy; retain self-to-bottom payment and another Unit to deck top, or the Bayanihan replacement.

**Verification:** The base skill cannot resolve its benefit without the real movement cost; no reset after recall.

### L19. Fifth-Sky Sentinel, Ulagan

- **ID:** `agta/set-1/fifth-sky-sentinel-ulagan`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/Turn: When this Unit supports an attack, it gets Power +3000 until end of turn. When Bayanihan is released and this Unit is on the field or when placed, its skill becomes: choose one of your Units; it gets Power +3000 until end of turn.[/green]

**Proposed migration:** No direct change; keep support timing, +3000 and Bayanihan replacement.

**Verification:** Relocation being free does not charge the Unit or reset attack/support use.

### L20. Path-Turning Warden, Tumatanan

- **ID:** `agta/set-1/path-turning-warden-tumatanan`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Sipol 1.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Sipol can call a Unit and its placement skill during either battle window; stop remaining responses if the attack is interrupted. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L21. Beast-Spirit Healer, Subkal

- **ID:** `agta/set-1/beast-spirit-healer-subkal`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Draw 1, then discard 1.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Draw then discard; does not give the +5000 check effect when played from hand. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L22. Healer's Spirit-Friend, Bunog

- **ID:** `agta/set-1/healer-s-spirit-friend-bunog`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Gain 1 Energy.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Replace the hand skill “Gain 1 Energy” with “Choose one of your Units; it gets Power +3000 until end of turn.” Remove hand Energy/play charges; keep the distinct +5000 check effect.

**Verification:** Hand skill grants +3000, check grants +5000, neither grants both. Hand activation spends the Force into Grave.

### L23. Restless Wandering Dead, Belet

- **ID:** `agta/set-1/restless-wandering-dead-belet`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Look at the top card; you may put it on the bottom.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Top-card keep/bottom choice remains optional; no accidental card draw. Hand use moves this physical card to Grave; blocking does not activate the skill.

### L24. Innawagan's Abduction

- **ID:** `agta/set-1/innawagan-s-abduction`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 1 Energy] Look at the top 3; call up to 1 Unit to an open Ally Zone. Bottom the rest in any order.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Only revealed Units can be called, into an open slot; bottom all unused cards in chosen order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L25. The Three Brothers Ascend

- **ID:** `agta/set-1/the-three-brothers-ascend`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 2 Energy] Look at the top 5; call up to 2 Level 2 or lower Units to open Ally Zones. Bottom the rest in any order.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Call at most two revealed Level 2-or-lower Units into separate open slots; evaluate early two-body advantage. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L26. Dalewasan Crosses The Barbed Sky

- **ID:** `agta/set-1/dalewasan-crosses-the-barbed-sky`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 0 Energy] Look at the top card; you may bottom it. Then draw 1 and discard 1.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** This former 0-Energy Action still uses a play; retain top-card decision, draw then discard. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L27. Sinag Reveals The Rescuer

- **ID:** `agta/set-1/sinag-reveals-the-rescuer`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 1 Energy] Look at the top 5; reveal a Level 3 Unit among them and add it to hand. Bottom the rest in any order.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Reveal only a Level 3 from the actual top five; unused cards go to bottom once. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L28. Taguwasi Answers The Plea

- **ID:** `agta/set-1/taguwasi-answers-the-plea`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 1 Energy] Sipol 1. Then, if Bayanihan is released, one of your Units gets Power +5000 this turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Check Bayanihan after Sipol resolves for the +5000 bonus, including the new Unit filling the fourth slot. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L29. Talimanog Falls As The Gate Breaks

- **ID:** `agta/set-1/talimanog-falls-as-the-gate-breaks`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 2 Energy] Bottom one of your Allies. If you do, destroy an opposing Level 2 or lower Ally, then Sipol 1.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Must bottom an Ally before the removal/Sipol benefit; only eligible opposing Level 2-or-lower Allies are removed. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L30. Taguwasi Tears Open Heaven

- **ID:** `agta/set-1/taguwasi-tears-open-heaven`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 2 Energy] Look at the top 5; call up to 1 Unit to an open Ally Zone with Power +5000 this turn. Bottom the rest. If Bayanihan is released, your Persona gets Power +5000 this turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Open-slot call, called Unit +5000 and conditional Persona bonus are separate; no double spending of plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L31. Kalimangalnuk's Final Defeat

- **ID:** `agta/set-1/kalimangalnuk-s-final-defeat`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 2 Energy] With Bayanihan: destroy an opposing Ally. Your Persona gets Power +5000 this turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Bayanihan gate still controls activation; retain target and Persona bonus; test three copies across three plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L32. Alig Restores Her Brothers

- **ID:** `agta/set-1/alig-restores-her-brothers`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 1 Energy] Return a Level 2 or lower Unit from your Grave to your hand.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Recovery is to hand only, Level 2 or lower; any later normal call uses a separate play. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L33. The Wedding Becomes A Battlefield

- **ID:** `agta/set-1/the-wedding-becomes-a-battlefield`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Action] [Cost: 2 Energy] Your Units get Power +3000 this turn, or +5000 if Bayanihan is released.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Apply +3000 or +5000 as appropriate, expire at end of turn; test multiple copies stacking and First Battle damage math. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### L34. Dawnward Country, Arawen

- **ID:** `agta/set-1/dawnward-country-arawen`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch before you draw, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]Instead of drawing, look at the top 3 cards of your deck and put them back on top in any order. Then Sipol 1.[/green]

**Proposed migration:** No direct change; retain draw replacement, top-three arrangement then Sipol.

**Verification:** No replacement on the first player’s skipped opening draw. Free skills must not cause an extra draw after the replacement.

### L35. Barbed Sky Passage, Salikan

- **ID:** `agta/set-1/barbed-sky-passage-salikan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch before you Personify, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]Instead of Personifying from your hand, look at the top 5 cards of your deck and Personify one Level 3 Unit among them. Put the rest on the bottom in any order.[/green]

**Proposed migration:** No direct change; retain Personify replacement and candidate level.

**Verification:** No play consumed; previous Persona correctly enters Heart; unused revealed cards go to deck bottom.

### L36. Fifth Heaven, Ularan

- **ID:** `agta/set-1/fifth-heaven-ularan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [Codex] Auto-switch when your Persona attacks, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]When your Persona attacks, [Cost: 2 Energy] Sipol 1.[/green]

**Proposed migration:** Remove 2 Energy. Retain Persona attack timing, existing open-zone eligibility and once-per-turn Codex gate; explicitly print that gate.

**Verification:** A Persona restand does not activate this Codex again in the same turn; test switch-on-attack order.

### L37. Brothers' Refuge, Taliman

- **ID:** `agta/set-1/brothers-refuge-taliman`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch when your Barrier breaks during your opponent's turn, and the check is not a Force, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]When you check a Barrier and it is not a Force, discard 1 card, then Sipol 1.[/green]

**Proposed migration:** No direct change; retain non-Force Barrier condition, discard before Sipol, and existing Codex limit.

**Verification:** Still requires a real discard; Barrier checks showing Forces do not take this path.

### L38. Healing House, Aligan

- **ID:** `agta/set-1/healing-house-aligan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch before you draw, if you have 2 or fewer Barriers, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]While this is active, if you would Sipol during your Main Phase, look at the top 2 instead and choose one for the Sipol. Exile the other.[/green]

**Proposed migration:** No direct change; preserve Main Phase Sipol replacement and exiling the unchosen card.

**Verification:** Test free Sipol sources, full field, State gain/loss and opponent-Battle Sipol that must not get this Main-only replacement.

### L39. Wedding Clearing, Amuran

- **ID:** `agta/set-1/wedding-clearing-amuran`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [Codex] Auto-switch before you draw, if your opponent has more Units than you, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]When this Codex becomes active, [Cost: 3 Energy] Sipol 3.[/green]

**Proposed migration:** PROPOSED BALANCE COST: replace 3 Energy with Discard 1 for Sipol 3 when this Codex becomes active, once per turn. Preserve switching conditions.

**Verification:** A genuine hand card is discarded before any Sipol; no activation with an empty hand; all three calls and their triggers complete in order.

### L40. Golden Threshold, Nagdan

- **ID:** `agta/set-1/golden-threshold-nagdan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [Codex] Auto-switch at the start of your Main Phase, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]At the start of your Main Phase, if you have fewer Units than your opponent, [Cost: 3 Energy] Sipol 2.[/green]

**Proposed migration:** Remove 3 Energy. Retain fewer Units than the opponent, start-of-Main timing and existing once-per-turn gate; explicitly print that gate.

**Verification:** No free comeback calls while tied/ahead; two Sipol events still resolve separately with triggers.

### L41. Heaven's Rift, Siwangan

- **ID:** `agta/set-1/heaven-s-rift-siwangan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch when your Persona is under attack, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]When your Persona is under attack, if you Sipol’d 3 or more times during your last turn, your Persona gets Power +5000 until end of turn.[/green]

**Proposed migration:** No direct change; retain last-turn Sipol count threshold and attack-defense bonus.

**Verification:** Free Sipols increment the same counter; current-turn Sipols do not stand in for last-turn ones.

### L42. Mystic Sky River, Dalunan

- **ID:** `agta/set-1/mystic-sky-river-dalunan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch before you draw, if your opponent has more cards in hand than you, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]While this is active, if you would Sipol during your Main Phase, put the card into your hand instead of calling it.[/green]

**Proposed migration:** No direct change; keep Main Phase Sipol-to-hand replacement.

**Verification:** Replacing a special call with a hand gain neither consumes a play nor fires an Ally placed trigger.

### L43. Storm Court, Kaliman

- **ID:** `agta/set-1/storm-court-kaliman`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/agta-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [Codex] Auto-switch before you draw, if your opponent has more Barriers than you, if you did not switch Codex during your previous turn and have not switched this turn.
> [Bayanihan] Released while all four Ally Zones contain Luzon Arch Units.
> [green]While Bayanihan is released, your Units get Power +1000.[/green]

**Proposed migration:** No direct change; retain conditional continuous +1000.

**Verification:** Power recalculates immediately when free effects fill or empty the fourth qualifying Ally Zone.

## Visayas: 47 selectable cards

### V01. Warden of the Twelfth Tide, Bituon

- **ID:** `babaylan/warden-of-the-twelfth-tide-bituon`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/babaylan.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green]When an attack is declared against your Persona, [Cost: 3 Energy] nullify that attack. Then create 1 [Kaluluwa] token. If Andukha 9+, create 2 instead.[/green]

**Proposed migration:** Remove the internal 3 Energy check/payment. Enforce reveal and face-down exile in the shared Sentry path. Nullify the attack, then create 1 Kaluluwa, or 2 if Andukha 9 held at activation.

**Verification:** Test below and at Andukha 9; bonus tokens do not retroactively improve the bonus. The same card never remains in hand to stop another attack.

### V02. Mountain Sovereign, Maria Cacao

- **ID:** `babaylan/set-1/mountain-sovereign-maria-cacao`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Persona] 1/Turn: [Cost: 1 Energy & Essence the top 2 cards of your deck] special call a Level 2 or lower Divine Unit from your Heart. It gets Power +5000 until end of turn. Essence it at the end of the turn.
> [green][Andukha 6][Persona] 1/Turn: When a Unit is Essenced during your turn, create 1 Kaluluwa in your Heart.

**Proposed migration:** Remove 1 Energy. Keep Essence top 2, Level 2-or-lower Divine Heart call, +5000 and end-turn Essence. Keep Andukha 6 token trigger once per turn.

**Verification:** Full cost paid before call; token creation does not recursively count as a Unit; delayed return follows the summoned field entry.

### V03. Harvest Warden, Mangaw

- **ID:** `babaylan/set-1/harvest-warden-mangaw`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona]: At the start of your Main Phase, Essence the top card of your deck. Then you may pay 1 Energy to create 2 Kaluluwa in your Heart.
> [green][Andukha 9][Persona]: During your turn, this Unit gets Power +1000 for each card you Essenced this turn.

**Proposed migration:** Remove optional 1 Energy payment; instead ask whether to create 2 Kaluluwa after the top-card Essence, once at start of Main. Keep its Andukha scaling.

**Verification:** Top card and optional tokens count correctly toward Essenced-this-turn; no duplicate prompt for the same choice; test fast threshold growth.

### V04. Thunder Sovereign, Kaptan

- **ID:** `babaylan/set-1/thunder-sovereign-kaptan`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/Turn: When this Unit attacks, [Cost: 1 Energy] Essence one card from your hand, then draw 1 card. This Unit gets Power +3000 until end of turn.
> [blue][Andukha 9][Persona] 1/Turn: Look at the top 5 cards of your deck. Essence up to one Divine Unit from among them and put the rest on the bottom in any order. This Unit gets Power +5000 until end of turn.

**Proposed migration:** Remove attack skill’s 1 Energy; keep hand Essence, draw, +3000 and once per turn. Main Phase Andukha 9 top-five skill stays separate and once per turn.

**Verification:** Empty hand cannot pay hand Essence; the two skills keep independent usage; no second attack trigger after charging.

### V05. Ocean Sovereign, Maguayan

- **ID:** `babaylan/set-1/ocean-sovereign-maguayan`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/Turn: When a Unit is special called from your Heart, draw 1 card, then Essence 1 card from your hand.
> [green][Andukha 9][Persona] 1/Turn: When this Unit attacks, [Cost: 2 Energy & Essence 1 of your Allies] add that Ally's current Power to this Unit's Power for that battle.

**Proposed migration:** Remove 2 Energy from the Andukha attack skill. Keep Essencing an Ally and adding its current Power for that battle; preserve once-per-turn Heart-call draw/Essence.

**Verification:** Snapshot offered Power before removal; no permanent Power gain; free Heart calls trigger only the allowed number of draw effects.

### V06. Abyssal Revolt, Sinogo

- **ID:** `babaylan/set-1/abyssal-revolt-sinogo`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Persona] 1/Turn: When this Unit attacks, [Cost: Vent 5] special call a Beast or Bird Unit from your deck. Essence that Unit at the end of your turn.
> [green][Andukha 12][Persona]: Your Beast and Bird Units' numeric Vent costs are reduced by 2, to a minimum of 0.

**Proposed migration:** No direct Energy change. Keep Vent 5, Beast/Bird search, end-turn Essence and Andukha 12 numeric discount.

**Verification:** Discount checks correctly, minimum zero remains, Vent-this-card identity costs are not waived, and used skill survives returning to Heart.

### V07. Last Moon Devourer, Bakunawa

- **ID:** `babaylan/set-1/last-moon-devourer-bakunawa`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/Turn: When this Unit attacks your opponent's Persona, [Cost: 2 Energy & Vent 6] this Unit gets Power +10000 for that battle. Your opponent cannot use Level 2 or higher cards to defend this battle. If six or more Kaluluwa tokens were Vented for this cost, draw 1 card.
> [green][Andukha 9][Persona]: At the end of a battle in which this Unit attacked, if its attack did not hit, Essence up to three cards from your Grave.

**Proposed migration:** Remove 2 Energy, retain Vent 6, Persona target, once-per-turn attack skill, +10000 and Level 2+ Unit defense restriction. Keep six actual Kaluluwa draw and missed-attack Grave Essence.

**Verification:** Select all Vent cards once; resolve their triggers in chosen order. Discounted payment of fewer than six tokens does not earn draw; Sentry response remains legal.

### V08. Unbroken Invocation, Amara

- **ID:** `babaylan/set-1/unbroken-invocation-amara`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/Turn: When this Unit is Essenced from the Persona Zone, special call one Unit from your Heart.
> [blue][Andukha 9][Heart] 1/Turn: [Cost: 1 Energy & Vent this card] search your deck for a Level 2 or lower Babaylan Unit other than Unbroken Invocation, Amara. Essence it, then special call a Babaylan Unit from your Heart. Shuffle your deck. The called Unit gets Power +5000 until end of turn.

**Proposed migration:** Remove 1 Energy from Heart activation; keep Andukha 9, Vent this card, subtype/level exclusions, special call and +5000. Keep its Persona-Essence trigger.

**Verification:** Same copy cannot return to Heart and reuse the skill that turn; cannot skip Vent-this-card under Sinogo; separate abilities retain separate use.

### V09. Heaven's Pursuit, Dalagan

- **ID:** `babaylan/set-1/heaven-s-pursuit-dalagan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally]: When this Unit is placed, Essence the top card of your deck, then create 1 Kaluluwa in your Heart.

**Proposed migration:** No direct change; keep placed top-card Essence plus one Kaluluwa.

**Verification:** Test repeated placement through the newly free engine; every event has an actual placement and no duplicated token/Essence event.

### V10. Unyielding Pursuer, Guidala

- **ID:** `babaylan/set-1/unyielding-pursuer-guidala`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: When this Unit is placed, Essence the top card of your deck. Then you may pay 1 Energy to special call a Unit from your hand. If you do, Essence this Unit and the called Unit at the end of your turn.

**Proposed migration:** Remove optional 1 Energy. PROPOSE: optional hand special-call follow-up once per turn per physical copy; keep the base placed Essence event-based and preserve both end-turn returns.

**Verification:** Cannot repeat its free call by recycling the same copy; source/called Unit moving elsewhere invalidates only the matching old field-entry return.

### V11. Unseen Defender, Tata Cero

- **ID:** `babaylan/set-1/unseen-defender-tata-cero`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: When this Unit attacks, [Cost: 2 Energy] it gets Power +1000 for each Kaluluwa in your Heart for that battle.

**Proposed migration:** Remove 2 Energy. PROPOSE: the Kaluluwa-scaled attack bonus once per turn per physical copy; bonus lasts for that battle.

**Verification:** Snapshot the current token count; a second attack or re-entry cannot stack another activation that turn.

### V12. Leafborne Champion, Kapitan Dyano

- **ID:** `babaylan/set-1/leafborne-champion-kapitan-dyano`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally]: When this Unit is placed, it gets Power +3000 until end of turn.

**Proposed migration:** No direct change; keep placed +3000 until end of turn.

**Verification:** Placement is required; no stale Power carried through Heart re-entry; test interaction with newly free call effects.

### V13. Spring Sentinel, Ulango

- **ID:** `babaylan/set-1/spring-sentinel-ulango`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Heart]: When this Unit is Vented, draw 1 card.

**Proposed migration:** No direct change; retain draw 1 on actual Vent, initially without a new turn cap.

**Verification:** Moving Heart→Grave for a reason other than Vent does not trigger this; repeated legal recycling must not create an unbounded resource-positive loop.

### V14. Shadow Prowler, Sagwil

- **ID:** `babaylan/set-1/shadow-prowler-sagwil`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Heart]: When this Unit is Vented, choose one opposing Ally Unit and damage it.

**Proposed migration:** No direct change; retain opposing Ally damage when actually Vented.

**Verification:** Chosen resolution order matters; destroyed/removed targets are revalidated; repeated Heart refill is stress-tested.

### V15. Nightfall Hunter, Wakira

- **ID:** `babaylan/set-1/nightfall-hunter-wakira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Heart]: When this Unit is Vented, choose up to two of your Units. Each gets Power +3000 until end of turn.

**Proposed migration:** No direct change; retain up to two distinct Units +3000 when actually Vented.

**Verification:** Two targets can be chosen in one selection; cannot double-select a UID; one Vent batch emits one event containing this card.

### V16. Reef Enchanter, Lawira

- **ID:** `babaylan/set-1/reef-enchanter-lawira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally]: At the end of your turn, Essence this Unit.

**Proposed migration:** No direct change; end-of-your-turn Essence remains mandatory and Ally-only.

**Verification:** Must happen even if optional-skill prompts are declined; does not affect a different field entry or a card already removed.

### V17. Answering Voice, Aday

- **ID:** `babaylan/set-1/answering-voice-aday`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally]: This Unit gets Power +1000 for each card you Essenced this turn.

**Proposed migration:** No direct change; keep Ally-only continuous Power per Essenced card this turn.

**Verification:** Recalculates for free token creation and multi-card Essence; resets at the right turn boundary; tokens versus Unit-only triggers stay distinct.

### V18. First Invocation, Luning

- **ID:** `babaylan/set-1/first-invocation-luning`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: When Kaluluwa are created, you may pay 1 Energy to create 1 additional Kaluluwa in your Heart. The additional token does not trigger this skill again.

**Proposed migration:** Remove 1 Energy. PROPOSE: one additional Kaluluwa per qualifying creation event, once per turn across all cards with this name per player. Keep bonus-creation recursion suppression.

**Verification:** Creating 2 becomes 3, not 4; three copies do not add three extras; a bonus token never triggers this skill again.

### V19. Spirit Mediator, Iday

- **ID:** `babaylan/set-1/spirit-mediator-iday`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Hand/Ally]: When you Essence a card, [Cost: 1 Energy & Essence this card] choose one of your Units. It gets Power +5000 until end of turn.

**Proposed migration:** Remove 1 Energy; keep Essence this card from Hand/Ally and +5000 to a valid Unit. PROPOSE once per turn per physical copy.

**Verification:** Cannot buff itself after it leaves the field; a recalled copy cannot loop the same skill; no normal-play charge.

### V20. Hidden Affliction, Doro

- **ID:** `babaylan/set-1/hidden-affliction-doro`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Ally] 1/Turn: [Cost: 1 Energy] this Unit gets Power +5000 until end of turn. At the end of your turn, choose one of your other Allies or one card from your hand. Essence this Unit and the chosen card.

**Proposed migration:** Remove 1 Energy. Keep once-per-turn +5000 and end-turn Essence of self plus another Ally/hand card.

**Verification:** The end-turn obligation is not optional; handle no remaining companion under documented existing partial-resolution rules; recalled Doro does not reset its use.

### V21. Floodwatch Runner, Sali

- **ID:** `babaylan/set-1/floodwatch-runner-sali`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: When you Vent, you may pay 1 Energy to give this Unit Power +5000 until end of turn.

**Proposed migration:** Remove optional 1 Energy. PROPOSE: gain +5000 on Vent once per turn per physical copy, until end of turn.

**Verification:** One six-card Vent gives one activation, not six; another Vent or re-entry in the same turn cannot add another +5000.

### V22. Promise Bearer, Nardo

- **ID:** `babaylan/set-1/promise-bearer-nardo`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: The first time you Essence a card each turn, you may pay 1 Energy to draw 1 card.

**Proposed migration:** Remove optional 1 Energy; keep optional draw on the first Essence event of the turn, Ally-only.

**Verification:** Entering after the first Essence does not create a second first event; multi-card Essence does not draw once per card.

### V23. Small Deliverer, Silak

- **ID:** `babaylan/set-1/small-deliverer-silak`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Heart]: When this Unit is Vented, draw 1 card, then Essence 1 card from your hand.

**Proposed migration:** No direct change; keep actual Vent-triggered draw then hand Essence.

**Verification:** Draw resolves before hand choice; the newly drawn card can be chosen; recycling/threshold changes do not duplicate the trigger.

### V24. Field Blessing, Banira

- **ID:** `babaylan/set-1/field-blessing-banira`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Essence the top card of your deck.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Top-card Essence updates Heart, threshold and eligible triggers once. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V25. Quiet Crossing, Salumi

- **ID:** `babaylan/set-1/quiet-crossing-salumi`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Vent 1. If you do, draw 1 card.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Still requires Vent 1 before drawing; selecting no cost card gives no draw; order its Vent triggers normally. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V26. Kindly Neighbor, Silaya

- **ID:** `babaylan/set-1/kindly-neighbor-silaya`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Draw 1 card, then Essence 1 card from your hand.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Draw first, then choose a card in the resulting hand to Essence. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V27. Hidden Passage, Kawili

- **ID:** `babaylan/set-1/hidden-passage-kawili`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Special call a Level 1 Unit from your Heart to an open Ally Zone, exhausted.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Only Level 1 Heart Units; requires an open Ally Zone; enters exhausted, not charged. Hand use moves this physical card to Grave; blocking does not activate the skill.

### V28. The Elders Answer

- **ID:** `babaylan/set-1/the-elders-answer`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 1 Energy] Look at the top 3 cards of your deck. Essence one Unit from among them and place the rest on the bottom in any order.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Choose an eligible Unit among actual top three to Essence; bottom the others in order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V29. A Promise Broken

- **ID:** `babaylan/set-1/a-promise-broken`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 1 Energy & Vent 2] Draw 2 cards, then discard 1 card.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain mandatory Vent 2; pay before drawing 2/discarding 1; only one play. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V30. The Mountain Withdraws

- **ID:** `babaylan/set-1/the-mountain-withdraws`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 2 Energy & Essence one of your Allies] special call a different Unit of equal or lower Level from your Heart. It gets Power +5000 until end of turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain Ally Essence; call a different equal-or-lower-Level Heart Unit and apply +5000; cannot call the sacrificed card as the different target. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V31. Flight of the Faithless

- **ID:** `babaylan/set-1/flight-of-the-faithless`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 1 Energy & Vent 1] special call a Beast or Bird Unit from your Heart. It gets Power +5000 until end of turn. At the end of turn, Essence it.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain Vent 1, open slot, Beast/Bird call, +5000 and end-turn Essence obligation. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V32. Thunder Beneath the Waves

- **ID:** `babaylan/set-1/thunder-beneath-the-waves`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 2 Energy & Vent 3] Exhaust up to two opposing Allies. If you have Andukha 12, one of them gets Power -5000 until end of turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain Vent 3; check Andukha 12 at resolution after payment/triggers; choose distinct opposing targets. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V33. When Lantoy Wept

- **ID:** `babaylan/set-1/when-lantoy-wept`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 1 Energy] Choose up to two Unit cards in your Grave and Essence them, then Vent 1.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Essence up to two Grave Units, then Vent 1 with correct timing; do not mislabel the later Vent as an upfront requirement that blocks an empty-Heart setup. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V34. The River Rises

- **ID:** `babaylan/set-1/the-river-rises`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 2 Energy] Essence the top 2 cards of your deck. If you have Andukha 9, all your Units get Power +3000 until end of turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Essence top two first; then use the resulting Andukha state for team Power. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V35. Six Moons Lost

- **ID:** `babaylan/set-1/six-moons-lost`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 3 Energy & Vent 6] Return up to two exhausted opposing Allies to their owner's hand. If six or more Kaluluwa tokens were Vented, draw 1 card.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Vent 6 paid in one selection; only exhausted opposing Allies returned; bonus uses actual Kaluluwa paid, not nominal printed cost. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V36. Return Our Moon

- **ID:** `babaylan/set-1/return-our-moon`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - Return one Unit from your Heart to your hand. If it is Divine, gain 1 Energy. If it is a Beast or Bird, draw 1 card, then discard 1 card.[/blue]

**Proposed migration:** Remove obsolete Energy gain: after recovering a Divine Unit, you may Essence the top card of the deck. Keep Beast/Bird draw then discard. Costs 1 play.

**Verification:** Verify Divine, Beast/Bird and neither branches, empty deck handling, and a dual-subtype card if legal; only one play spent.

### V37. The Covenant Renewed

- **ID:** `babaylan/set-1/the-covenant-renewed`
- **Type / printed level:** Action / 3
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue]Play with - [Cost: 2 Energy] Essence up to two Unit cards from your Grave. If you have Andukha 12 after this effect, your Persona gets Power +10000 until end of turn.[/blue]

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Essence up to two Grave Units, then evaluate Andukha 12 for Persona +10000; test repeated copies under 3 starting plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### V38. Sovereign Heights, Mount Lantoy

- **ID:** `babaylan/set-1/sovereign-heights-mount-lantoy`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more Barriers than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — When your State is released, all of your Units get Power +1000 until end of turn.

**Proposed migration:** No direct change; retain +1000 on State release and current Codex usage gate; make the printed limit explicit.

**Verification:** Dropping below and re-reaching Andukha through free Vent/Essence cannot evade its actual use cap.

### V39. Silent Threshold, Kabulaw

- **ID:** `babaylan/set-1/silent-threshold-kabulaw`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you Personify, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — Instead of Personifying from your hand, look at the top 5 cards of your deck and Personify one Level 3 Unit among them. Put the rest on the bottom of your deck.

**Proposed migration:** No direct change; retain Personify replacement.

**Verification:** No Energy/play cost; excluded low-level cards stay excluded; unused cards return to deck bottom correctly.

### V40. Unseen Passage, Argao River

- **ID:** `babaylan/set-1/unseen-passage-argao-river`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more cards in hand than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — When this Codex becomes active, Vent any number of cards. Draw 1 card for every 5 cards vented this way.

**Proposed migration:** No direct change; keep any-number Heart selection with draw floor(actual Vented / 5).

**Verification:** One multi-select and confirmation; 0/4/5/9/10 cards give 0/0/1/1/2 draws; vented-card trigger ordering preserved.

### V41. Fields Under Watch, Tabayag

- **ID:** `babaylan/set-1/fields-under-watch-tabayag`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — at the start of your Main Phase, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — At the start of your Main Phase, Essence the top card of your deck. If it was a Unit, create a Kaluluwa token in your Heart.

**Proposed migration:** No direct change; retain start-of-Main Essence and token only when the card is a Unit.

**Verification:** Token/card gain and State changes settle once; no extra trigger from the created token itself.

### V42. Living Sanctuary, Dingayop Spring

- **ID:** `babaylan/set-1/living-sanctuary-dingayop-spring`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Persona is under attack, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — When you check a Barrier and it is not a Force, create 2 Kaluluwa tokens in your Heart, then discard 1 card.

**Proposed migration:** No direct change; retain non-Force Barrier trigger, two tokens and discard.

**Verification:** Required hand availability/discard remains; token creation is not a reason to skip the discard.

### V43. Hidden Court, Dingayop Cavern

- **ID:** `babaylan/set-1/hidden-court-dingayop-cavern`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more Units than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — While this is active, whenever you Essence a Unit from your field or your deck during your Main Phase, create a Kaluluwa token in your Heart as well.

**Proposed migration:** No direct cost change; retain Main Phase Unit-from-field/deck Essence response.

**Verification:** Token Essence and hand/Grave Essence do not satisfy this Unit/source filter; test with free Luning and Dalagan without runaway recursion.

### V44. Champion's Trial, Danao Highlands

- **ID:** `babaylan/set-1/champion-s-trial-danao-highlands`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Persona attacks, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — When your Persona attacks, it gets Power +1000 for each Kaluluwa token in your Heart. At the end of your turn, Vent 3.

**Proposed migration:** No direct change; preserve attack scaling and mandatory end-turn Vent 3 debt.

**Verification:** Charging the Persona and repeated attacks do not erase debt; changing Codex before end of turn cannot escape it.

### V45. Turning Pursuit, Bantayan Waters

- **ID:** `babaylan/set-1/turning-pursuit-bantayan-waters`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Barrier breaks during your opponent's turn, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — 1/Turn: The next time your Persona is attacked, it gets Power +1000 for each Kaluluwa token in your Heart until end of battle.

**Proposed migration:** No direct change; retain its once-per-turn preparation for the next Persona attack.

**Verification:** The just-broken Barrier does not incorrectly guard the already resolved attack; queued defense survives only its intended duration.

### V46. Faithless Prison, Tañon Strait

- **ID:** `babaylan/set-1/faithless-prison-tanon-strait`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if you have 2 or fewer Barriers, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — When this Codex becomes active, Vent 2. Choose one of the cards vented this way and special call it to an open Ally Zone; exile the other.

**Proposed migration:** No direct change; retain Vent 2 followed by call/exile selection under current eligibility.

**Verification:** Selected Vented Units are real objects after their triggers; tokens cannot illegally become Units; no Energy/play charge.

### V47. Great Calling, Moonwake Shore

- **ID:** `babaylan/set-1/great-calling-moonwake-shore`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/babaylan-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Andukha: released while your Heart holds 6 or more cards.
> Codex skill — Instead of drawing, create 2 Kaluluwa tokens in your Heart. If Andukha is released, draw 1 card.

**Proposed migration:** No direct change; keep draw replacement and the post-token Andukha check for the conditional draw.

**Verification:** Skipped opening draw cannot trigger replacement; Luning does not recurse; released/lost Andukha conditions use current state.

## Mindanao: 51 selectable cards

### M01. Kuta Wato Oath-shield, Panglima Sabir

- **ID:** `maguindanao/kuta-wato-oath-shield-panglima-sabir`
- **Type / printed level:** Sentry / 1
- **Behavior source:** `src/cards/maguindanao.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [Sentry]: When your Persona is taking damage, [Cost: Reveal this card and 1 Energy] nullify that damage, then exile this card face down.

**Proposed migration:** Remove 1 Energy. Reveal and exile this Sentry face down exactly once and nullify the Persona attack.

**Verification:** Works without an Energy field and on the opponent turn; cannot defend an Ally or be reused.

### M02. Nonok-Veiled Guardian, Apo a Bekong

- **ID:** `maguindanao/set-1/nonok-veiled-guardian-apo-a-bekong`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Persona] 1/turn: Whenever another of your Allies is Offered, choose one of your units. It gets Power +3000 until end of turn.
> [green][Garahana][Persona] Whenever one of your shields breaks, this unit permanently gets Power +1000.

**Proposed migration:** No direct change; preserve once-per-turn offered-Ally buff and automatic permanent +1000 per shield broken while Garahana applies.

**Verification:** Not an activation that multiplies all prior broken shields; faster Offer engines do not repeat the capped buff.

### M03. Beneath-Water Ancestress, Potri Rainalaut

- **ID:** `maguindanao/set-1/beneath-water-ancestress-potri-rainalaut`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Persona] 1/turn: [Cost: 1 Energy & Offer 1 of your Allies] special call a Level 1 Maguindanaon unit from your Grave. It enters charged.
> [blue][Garahana][Persona] 1/turn: [Cost: 1 Energy] draw 1 card. This unit gets Power +2000 for each unit Offered this turn until end of turn.

**Proposed migration:** Remove both 1 Energy fees. Keep Offer 1 for charged Level 1 subtype revival; keep separate once-per-turn Garahana draw/+2000-per-Offered-Unit skill.

**Verification:** May revive the qualifying just-Offered Unit under existing rules; each skill has its own use; counts actual offered Units as defined by the engine.

### M04. Boat-Watching Tonong, Tomitay

- **ID:** `maguindanao/set-1/boat-watching-tonong-tomitay`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Persona] 1/turn: When this unit attacks, [Cost: 1 Energy & Offer 1 of your Allies] look at the top 3 cards of your deck and arrange them on top in any order.
> [green][Garahana][Persona] 1/turn: When your attack check reveals a Force, draw 1 card and charge one of your Allies.

**Proposed migration:** Remove 1 Energy from attack ordering skill. Keep Offer 1, once-per-turn top-three ordering, and Garahana Force-check draw/charge.

**Verification:** Chosen top order determines check; Force skill from hand does not pretend to be an attack-check reveal.

### M05. Sun-Darkening Scourge, Pah

- **ID:** `maguindanao/set-1/sun-darkening-scourge-pah`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [blue][Persona] 1/turn: [Cost: Offer 2 of your Allies] this unit gets Power +5000 until end of turn. If you have 2 or fewer Barriers, it gets +10000 instead.
> [green][Garahana][Persona] 1/turn: After this unit attacks, [Cost: Offer 3] charge this unit and it gets Power +5000 until end of turn.

**Proposed migration:** No direct change. Keep Offer 2 buff, low-shield condition and Offer 3 restand once per turn.

**Verification:** Free refills cannot reset a physical copy’s restand; multiple same-name copies get only their explicitly allowed independent uses.

### M06. Rattan-Haunt Scourge, Kurita

- **ID:** `maguindanao/set-1/rattan-haunt-scourge-kurita`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Persona] 1/turn: When this unit attacks, [Cost: Offer 1 of your Allies] damage one of your opponent's Allies, and this unit gets Power +5000 for that battle.
> [green][Garahana][Persona] 1/turn: After this unit attacks, [Cost: Offer 1 of your other Allies] damage one of your opponent's Allies.

**Proposed migration:** No direct change. Keep separate Offer 1 attack and after-attack skills with Garahana on the latter.

**Verification:** Pay separate Offers, validate enemy Allies and preserve Power duration; no trigger if the original attack was invalidated.

### M07. Matutun Branch-Devourer, Tarabusaw

- **ID:** `maguindanao/set-1/matutun-branch-devourer-tarabusaw`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [blue][Persona] 1/turn: Before this unit's first attack this turn, [Cost: Offer 2 of your other Allies] its first attack this turn gets one extra attack check.
> [green][Garahana][Persona] 1/turn: After this unit attacks, [Cost: Offer 2] charge this unit. Do not perform an attack check for its next attack this turn.

**Proposed migration:** No direct change. Keep Offer 2 before first attack for extra check and Offer 2 after attack for charge/no-next-check.

**Verification:** No double extra check after a restand or a zone trip; the next attack really skips its check.

### M08. Land-Restoring Raja, Indarapatra

- **ID:** `maguindanao/set-1/land-restoring-raja-indarapatra`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [blue][Persona] 1/turn: [Cost: 1 Energy] search your deck for a Level 2 or lower Maguindanaon unit and special call it. It enters charged.
> [green][Garahana][Persona] 1/turn: After this unit attacks, [Cost: Offer 3] search your deck for two Level 2 or lower Maguindanaon units and special call them. Each gets Power +5000 until end of turn.

**Proposed migration:** Remove 1 Energy from initial search/call, once per turn. Keep Level 2-or-lower subtype filter and charged entry. Keep Offer 3 after-attack two calls/+5000.

**Verification:** Initial free tutor is not unlimited; full-field overwrite respects current rules; calls do not spend plays.

### M09. Gurayen Wrath-Mate, Maka-Ogis

- **ID:** `maguindanao/set-1/gurayen-wrath-mate-maka-ogis`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Persona] 1/turn: When this unit attacks, [Cost: Offer 1 of your other Allies] add that Ally's current Power to this unit's Power for that battle.
> [green][Garahana][Persona] During your turn, if you Offered 2 or more this turn, this unit gets Power +5000.

**Proposed migration:** No direct change; retain Offer 1 and add the Ally’s current Power, plus its separate Garahana continuous bonus.

**Verification:** Capture Power before the cost clears modifiers; do not replace base Power or keep the battle-only gain permanently.

### M10. Three-Scourge Champion, Sulayman

- **ID:** `maguindanao/set-1/three-scourge-champion-sulayman`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [blue][Persona] 1/turn: [Cost: Offer 1 of your Allies] search your deck for a Maguindanaon unit and special call it. It enters charged. This unit and the called unit each get Power +3000 until end of turn.
> [green][Garahana][Persona] 1/turn: When this unit attacks, [Cost: Offer 3] damage up to two of your opponent's Allies. This unit gets Power +10000 for that battle and gains "When this attack hits, draw 1 card."

**Proposed migration:** No direct change; retain Offer 1 subtype call/shared +3000 and Offer 3 battle removal/+10000/on-hit draw.

**Verification:** Free Last Oath refills cannot pay the original Offer retroactively; draw occurs only when that attack hits; unrelated attacks do not inherit it.

### M11. House-Shell Shadow, Pahira

- **ID:** `maguindanao/set-1/house-shell-shadow-pahira`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, look at the top 5 cards of your deck. You may reveal one Beast or Bird card from among them and put it into your hand. Put the rest on the bottom in any order.

**Proposed migration:** No direct change initially: Offered top-five Beast/Bird search stays event-based.

**Verification:** Search only among revealed cards and bottom the rest once; stress-test repeated revival and Offer because other follow-ups are now free.

### M12. Rattan-Marsh Stalker, Kuritan

- **ID:** `maguindanao/set-1/rattan-marsh-stalker-kuritan`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally]: When this unit is placed, if you Offered an Ally this turn, this unit gets Power +5000 until end of turn.
> [green][Ally]: At the end of your turn, Offer this unit.

**Proposed migration:** No direct change; retain offered-this-turn placed Power and mandatory end-turn Offer.

**Verification:** Costs and normal overwrite are not confused with Offer; mandatory Offer still triggers legal Last Oaths in sequence.

### M13. Matutun Branch Hurler, Tarabuk

- **ID:** `maguindanao/set-1/matutun-branch-hurler-tarabuk`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/turn: After this unit attacks, [Cost: Offer 1 of your other Allies] charge this unit. It gets Power +3000 until end of turn.

**Proposed migration:** No direct change; retain once-per-turn after-attack Offer/restand/+3000.

**Verification:** Repeated free revival must not reset this physical copy’s usage; offered ally is genuinely another Ally.

### M14. Dread-Night Caller, Balbal

- **ID:** `maguindanao/set-1/dread-night-caller-balbal`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Ally]: When this unit is placed, [Cost: 1 Energy] send the top 3 cards of your deck to your Grave. This unit gets Power +3000 until end of turn for each unit card sent this way.

**Proposed migration:** Remove 1 Energy. PROPOSE once per turn per physical copy for placed mill 3/+3000 per Unit milled.

**Verification:** Mills happen before Power calculation and Garahana checks; smaller remaining decks counted accurately; no repeat through same-turn revival.

### M15. Balete-Laughing Spirit, Ba-i a Salendagao

- **ID:** `maguindanao/set-1/balete-laughing-spirit-ba-i-a-salendagao`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Garahana][Ally]: Whenever another of your Allies is Offered, choose one of your units. It gets Power +5000 until end of turn.

**Proposed migration:** No direct change initially; preserve Garahana +5000 per another Ally Offered. High-risk indirect buff from free Last Oath engines.

**Verification:** Multiple Offers cause the correct number of distinct triggers; no trigger for itself; Mountain Tunung charge and persistent usage are tested; record peak Power.

### M16. Heaven-Sheltered Survivor, Lanao Sprite

- **ID:** `maguindanao/set-1/heaven-sheltered-survivor-lanao-sprite`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, [Cost: 1 Energy] your Persona gets Power +2000 until the end of your opponent's turn.

**Proposed migration:** Remove 1 Energy. PROPOSE its offered Persona +2000 once per turn per physical copy; preserve end-of-opponent-turn expiry.

**Verification:** Same UID cannot be recycled for unlimited shields of Power; different copies work independently and expire on the correct turn.

### M17. Current-Borne Ancestor, Crocodile-Form Apu

- **ID:** `maguindanao/set-1/current-borne-ancestor-crocodile-form-apu`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Garahana][Grave]: The first time one of your Allies is Offered each turn, special call this unit. At the end of your turn, if this unit was called by this effect, Offer it.

**Proposed migration:** No direct change. Preserve first Offer event, Grave scope, Garahana, charged special call and end-of-your-turn Offer.

**Verification:** An Apu sent to Grave after the first Offer does not retroactively qualify; multiple copies and opponent-turn activation keep correct delayed expiry.

### M18. Smoke-Split Hunter, Salimbadut

- **ID:** `maguindanao/set-1/smoke-split-hunter-salimbadut`
- **Type / printed level:** Unit / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Ally] 1/turn: After this unit attacks, if you Offered an Ally this turn, damage one of your opponent's exhausted Allies.
> [green][Ally]: At the end of your turn, Offer this unit.

**Proposed migration:** No direct change; retain once-per-turn after-attack removal and mandatory end-turn Offer.

**Verification:** Opponent target must already be exhausted as required; no reset after revival; finish the mandatory Offer.

### M19. First Son of the Returned Land, Rinamuntaw

- **ID:** `maguindanao/set-1/first-son-of-the-returned-land-rinamuntaw`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to draw 1 card, then discard 1 card.

**Proposed migration:** Remove optional 1 Energy from draw 1 then discard 1. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verification:** Draw precedes discard; empty-deck behavior follows core rules. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M20. First Daughter of the Returned Land, Rinayung

- **ID:** `maguindanao/set-1/first-daughter-of-the-returned-land-rinayung`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to search your deck for a Level 1 Maguindanaon unit and special call it, charged.

**Proposed migration:** Remove optional 1 Energy. PROPOSE: charged Level 1 Maguindanaon tutor follow-up once per turn across all cards named Rinayung per player. Keep base offered Ally +3000 event-based.

**Verification:** Fresh copies cannot chain their free tutors that turn; subtype and Level 1 restriction still apply; base bonus can resolve even after the follow-up was used.

### M21. Hollow-Tree Guide, the Old Woman

- **ID:** `maguindanao/set-1/hollow-tree-guide-the-old-woman`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to look at the top 5 cards of your deck. You may reveal one Maguindanaon unit from among them and put it into your hand. Put the rest on the bottom in any order.

**Proposed migration:** Remove optional 1 Energy from top-five Maguindanaon Unit search. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verification:** Reject Beast/Bird-only Units without the required subtype; bottom remaining cards in one ordered confirmation. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M22. Last Witness of the Old Words, Alad

- **ID:** `maguindanao/set-1/last-witness-of-the-old-words-alad`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Grave]: This card is treated as 2 cards in your Grave.

**Proposed migration:** No direct change; retain double Grave count only in the intended counting rules.

**Verification:** Removing Energy does not make one physical card pay a two-card selection cost unless the separate Offer/selection rule explicitly assigns weight.

### M23. Elder of the Old Telling, Maharaja Layla

- **ID:** `maguindanao/set-1/elder-of-the-old-telling-maharaja-layla`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to send the top card of your deck to the Grave.

**Proposed migration:** Remove optional 1 Energy from mill the top card. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verification:** Actual mill occurs before Garahana re-evaluation; no free repeated mill after a same-turn revival. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M24. Voice Beneath the Current, Water Tunung

- **ID:** `maguindanao/set-1/voice-beneath-the-current-water-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Return one Level 1 Maguindanaon Unit from your Grave to your hand.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Recover only Level 1 Maguindanaon subtype Unit from Grave; re-evaluate Garahana after removal. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M25. Prayer Above the Storm, Sky Tunung

- **ID:** `maguindanao/set-1/prayer-above-the-storm-sky-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Draw 1 card, then discard 1 card.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Draw then discard; preserve public/private reveal boundaries. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M26. Keeper of the Account, Datu Kali Adam

- **ID:** `maguindanao/set-1/keeper-of-the-account-datu-kali-adam`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to choose one of your other units. It gets Power +3000 until end of turn.

**Proposed migration:** Remove optional 1 Energy from give another Unit +3000. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verification:** Use correct target pool and expiry; distinguish base Ally +3000 from follow-up Unit +3000. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M27. Warden Within the Ridge, Mountain Tunung

- **ID:** `maguindanao/set-1/warden-within-the-ridge-mountain-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Charge one of your Ally Units.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Charge an eligible Ally during a Persona attack and keep it charged after the attack ends; do not illegally charge the Persona. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M28. Listener Among the Roots, Tree Tunung

- **ID:** `maguindanao/set-1/listener-among-the-roots-tree-tunung`
- **Type / printed level:** Force / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [yellow][Force] [Cost: 2 Energy] From your hand, during your Main Phase or either player's Battle Phase: Send the top 2 cards of your deck to your Grave.
> On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn, free.[/yellow]

**Proposed migration:** Remove hand skill’s 2 Energy and own-turn play debit. Preserve the printed hand effect and separate +5000 check. Normal calling this Force still uses 1 play.

**Verification:** Mill up to the available top two and settle Garahana before the next response. Hand use moves this physical card to Grave; blocking does not activate the skill.

### M29. The Four Scourges Came

- **ID:** `maguindanao/set-1/the-four-scourges-came`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy] special call up to one Level 2 or lower Beast and up to one Level 2 or lower Bird from your Grave. They enter charged. At the end of your turn, Offer the units called by this effect that remain in an Ally Zone.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Call at most one small Beast and one small Bird from Grave; no duplicate UID for both; preserve end-turn Offer for each. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M30. A Vow Carried by the Wind

- **ID:** `maguindanao/set-1/a-vow-carried-by-the-wind`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 1 Energy] search your deck for a Level 1 Maguindanaon unit and special call it. It enters charged. At the end of your turn, Offer that unit if it remains in an Ally Zone.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Tutor only a Level 1 Maguindanaon, charged; preserve end-turn Offer even after spending all plays. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M31. Kabalalan Shook From Below

- **ID:** `maguindanao/set-1/kabalalan-shook-from-below`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy & Offer 1 of your Allies] exhaust up to two of your opponent's Allies. If Garahana is released, you may damage one of those Allies that was already exhausted before this Action resolved.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain Offer 1; conditional damage can target only one that was already exhausted before the Action’s effect. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M32. Until Tarabusaw Tired

- **ID:** `maguindanao/set-1/until-tarabusaw-tired`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy] choose one Beast Ally. The first time it finishes an attack this turn, you may Offer one of your other Allies. If you do, charge the chosen Beast and it gets Power +3000 until end of turn.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Granted repeat attack still needs Offer 1 of another Ally; the grant is not an unlimited restand and does not stack into infinite uses. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M33. The Price of the Third Victory

- **ID:** `maguindanao/set-1/the-price-of-the-third-victory`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 1 Energy] play only if you Offered 3 or more this turn. Draw 2 cards, then discard 1 card. If Garahana is released, gain 1 Energy.

**Proposed migration:** Remove 1 Energy cost. Replace Garahana Energy refund with Persona +3000 until end of turn. Keep Offered 3+ requirement and draw 2 then discard 1; costs 1 play.

**Verification:** Reward reads Garahana at its defined resolution point; no extra draw/refund; remaining plays decrease exactly once.

### M34. Day Became Night

- **ID:** `maguindanao/set-1/day-became-night`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy] exhaust up to two of your opponent's Allies. If you Offered 3 or more this turn, damage one exhausted opponent Ally instead of exhausting the second unit.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Offered 3+ condition chooses the upgraded line; resolve exhaust-before-damage in chosen legal order. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M35. When the Life-Sign Withered

- **ID:** `maguindanao/set-1/when-the-life-sign-withered`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Action — [Cost: Offer 1 of your Allies] your opponent chooses one of their Allies and damages it. If your opponent has no Allies, draw 1 card instead.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain Offer 1; opponent chooses their casualty; draw instead only if no opposing Allies. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M36. The Brother Awakened

- **ID:** `maguindanao/set-1/the-brother-awakened`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy] search your deck and Grave for up to one Rinamuntaw and up to one Rinayung, then special call them to separate Ally Zones. They enter charged. At the end of your turn, Offer each one that remains in an Ally Zone.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Choose the intended brother and sister from deck/Grave without duplicate UIDs, charge them and attach end-turn Offer; test shared Last Oath follow-up limits. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M37. Seven Heads Before One King

- **ID:** `maguindanao/set-1/seven-heads-before-one-king`
- **Type / printed level:** Action / 2
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 2 Energy] choose your Persona. Until end of turn, when it attacks, it gets Power +1000 for each unit card in your Grave, up to +10000. If seven or more of those cards are Maguindanaon units, damage one exhausted opponent Ally after that attack.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Retain capped Grave-scaled attack bonus and seven-subtype-card removal threshold; extra attacks and repeated Actions do not bypass printed limits. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M38. The Lowlands Rose Again

- **ID:** `maguindanao/set-1/the-lowlands-rose-again`
- **Type / printed level:** Action / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> Action — [Cost: 1 Energy] choose up to two Level 1 Maguindanaon units in your Grave. Put one into your hand and put the other on the bottom of your deck. If you chose only one, put it into your hand.

**Proposed migration:** Costs exactly 1 play. Remove any Energy payment, including obsolete “0 Energy” text. Preserve all other printed requirements, timing, targets and destinations.

**Verification:** Two distinct eligible Level 1 subtype Units; one to hand, other to bottom; choosing only one returns it to hand. Cancelling before commitment costs no play; effect-created calls cost no additional plays.

### M39. Spring-Veiled Heiress, Dayang Amina

- **ID:** `maguindanao/set-1/spring-veiled-heiress-dayang-amina`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to choose one of your opponent's Ally units and damage it.

**Proposed migration:** Remove optional 1 Energy from damage one opposing Ally Unit. PROPOSE: that follow-up once per turn per physical copy. Keep base Last Oath Ally +3000 event-based and preserve the option to skip the follow-up.

**Verification:** Follow-up requires a legal opposing Ally; cannot repeatedly clear a field by recycling one copy. No eligible base Ally must not automatically suppress a separately legal follow-up. Usage survives zone changes.

### M40. Seven-Sight Final Scourge, Gurayn

- **ID:** `maguindanao/set-1/seven-sight-final-scourge-gurayn`
- **Type / printed level:** Unit / 3
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> [green][Persona] 1/turn: When this unit attacks, [Cost: Offer 2 of your other Allies] look at the top 7 cards of your deck. Special call up to two Beasts or Birds from among them. Put the remaining cards on the bottom in any order.
> [green][Garahana][Persona] 1/turn: After this unit attacks, [Cost: Offer 3] choose a Seven-Sight Final Scourge, Gurayn from your hand and Personify into it, charged.

**Proposed migration:** No direct change initially; preserve Offer 2 top-seven Beast/Bird calls and Offer 3 charged same-name Personification with existing per-copy limits.

**Verification:** Test successive physical Gurayn copies plus free refills, actual remaining hand/deck resources and extra checks. A reproducible resource-positive repeat blocks release.

### M41. Keeper of the Last Refuge, Datu Karim

- **ID:** `maguindanao/set-1/keeper-of-the-last-refuge-datu-karim`
- **Type / printed level:** Unit / 1
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** Yes

**Current displayed rules**

> [green][Last Oath]: When this unit is Offered, choose one of your Allies. It gets Power +3000 until end of turn. Then you may pay 1 Energy to search your deck for another Keeper of the Last Refuge, Datu Karim and special call it, charged.

**Proposed migration:** Remove optional 1 Energy. PROPOSE: same-name charged tutor follow-up once per turn across all Datu Karim cards per player. Keep base offered Ally +3000 event-based.

**Verification:** Offer first copy→call second→Offer second cannot tutor a third using that same follow-up that turn; second copy can still give its base bonus.

### M42. City Beyond the Sunset, Mantapuli

- **ID:** `maguindanao/set-1/city-beyond-the-sunset-mantapuli`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — Instead of drawing, Offer 1 Ally or send the top card of your deck to your Grave. Then, if Garahana is released, draw 1 card.

**Proposed migration:** No direct change; retain Offer-or-mill before checking Garahana for its replacement draw.

**Verification:** Opening skipped draw does not invoke this. If cost supplies the fifth qualifying Grave count, draw happens second and exactly once.

### M43. Forest of Broken Branches, Mount Matutun

- **ID:** `maguindanao/set-1/forest-of-broken-branches-mount-matutun`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — at the start of your Main Phase, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — At the start of your Main Phase, send the top card of your deck to your Grave. If it was a Unit, one of your Units gets Power +5000 until end of turn.

**Proposed migration:** No direct change; retain once-gated Main Phase mill and +5000 if Unit. Make actual usage gate explicit in displayed text.

**Verification:** Mill reveals a real Unit before Power is granted; no duplicate trigger at State release.

### M44. Throne of the Sun-Shadow, Mount Bita

- **ID:** `maguindanao/set-1/throne-of-the-sun-shadow-mount-bita`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Persona attacks, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When your Persona attacks, it gets Power +3000 for each card Offered this turn, until end of turn.

**Proposed migration:** No direct change; keep existing once-per-turn gate and +3000 per Offered card/Unit under current counting semantics. Print the actual gate.

**Verification:** Free Last Oath refills increase Offer opportunities but cannot refire a used Codex skill; compare displayed Offer count to actual engine value.

### M45. The Rattan Haunt, Mount Kabalalan

- **ID:** `maguindanao/set-1/the-rattan-haunt-mount-kabalalan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if you have 2 or fewer Barriers, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When you Offer a Unit during your turn, search your deck for a Unit other than the one you Offered and special call it.

**Proposed migration:** No direct cost change; retain its existing once-per-turn engine gate and print it explicitly. Do not interpret “whenever” as unlimited free replacement calls.

**Verification:** Multiple Offers yield one Codex tutor that turn; different cards with the same name still use correct target identity; switching away/back does not reset use.

### M46. Peak of Seven Sights, Mount Gurayn

- **ID:** `maguindanao/set-1/peak-of-seven-sights-mount-gurayn`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you Personify, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — Instead of Personifying from your hand, look at the top 5 cards of your deck and Personify one Level 3 Unit among them. Put the rest on the bottom of your deck.

**Proposed migration:** No direct change; retain Personify replacement and Level 3 candidate requirement.

**Verification:** No play consumed; valid current Persona level and all unused-card destinations maintained.

### M47. Mirror of the Giant War, Lake Lanao

- **ID:** `maguindanao/set-1/mirror-of-the-giant-war-lake-lanao`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more Barriers than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When your State is released, all of your Units get Power +1000 until end of turn.

**Proposed migration:** No direct change; retain existing once-per-turn State-release team bonus and print its cap.

**Verification:** Repeated free Grave removal/refill cannot repeatedly gain the bonus in one turn.

### M48. Reach of the Ridge Giants, Illana Bay

- **ID:** `maguindanao/set-1/reach-of-the-ridge-giants-illana-bay`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more Units than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — While this is active, a Unit you Offer during your Main Phase counts as 2 Maguindanaon Unit cards in your Grave for Garahana.

**Proposed migration:** No direct change; retain Main-Phase-Offered Grave counting while this Codex is active.

**Verification:** Leaving Grave or changing active Codex updates Garahana correctly; do not double the physical cards paid to a cost.

### M49. Cave Beneath the Earth, the Last Refuge

- **ID:** `maguindanao/set-1/cave-beneath-the-earth-the-last-refuge`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Barrier breaks during your opponent's turn, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When your Barrier breaks, your Persona gets Power +1000 for each of your broken Barriers, until end of turn.

**Proposed migration:** No direct change; keep existing gated Barrier-break Power scaling and expiry; make actual cap explicit.

**Verification:** Check two shield breaks in one turn and a different opponent turn; no accidental permanent bonus.

### M50. The Sea-Withdrawn Lowlands, Restored Magindanao

- **ID:** `maguindanao/set-1/the-sea-withdrawn-lowlands-restored-magindanao`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — when your Persona is under attack, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When you check a Barrier and it is not a Force, special call 1 Unit from your deck, then discard 1 card.

**Proposed migration:** No direct change; retain existing non-Force Barrier condition, special call then discard and actual Codex cap.

**Verification:** Bonus call is not a normal play; discard still occurs and legal no-target/empty-hand behavior remains defined.

### M51. Shore of the Broken Hills, Cape Timbalangan

- **ID:** `maguindanao/set-1/shore-of-the-broken-hills-cape-timbalangan`
- **Type / printed level:** Codex / 0
- **Behavior source:** `src/cards/maguindanao-set-1.ts`
- **Energy mentioned:** No; indirect gameplay regression still required

**Current displayed rules**

> Auto-switch — before you draw, if your opponent has more cards in hand than you, if you did not switch Codex during your previous turn and have not switched this turn.
> State — Garahana: released while your Grave contains 5 or more Maguindanaon unit cards.
> Codex skill — When this Codex becomes active, draw 2 cards, then discard 1 card.

**Proposed migration:** No direct change; keep active-entry draw 2/discard 1 and current once gate.

**Verification:** Cannot switch away/back to repeat; no Energy or normal-play fee for Codex activation.

## Live non-selectable token

### Kaluluwa

ID: `babaylan/kaluluwa`. Keep non-deckbuildable. Preserve creation into Heart, token disappearance rules on Vent, Andukha/Essence counting and the distinction between a Token and a Unit. No Energy replacement is needed. Verify Luning recursion suppression, Bakunawa actual-token payment count, and that destroyed/Vented tokens do not become reusable ordinary Grave Units.

## All other unavailable definitions

These 117 definitions remain unavailable. Do not spend this release redesigning or re-enabling them. For each ID, the disposition is: retain archival data; exclude from new live matches and deck selection; audit any remaining fixture/import path before removing shared Energy types. Do not turn old payments into free effects through a global helper stub. The three active Sentries are listed above, not here. Omaka-an remains intentionally hidden.

Energy flags refer to current loaded text, not exhaustive script arithmetic. Old scripts may differ from that text. Any legacy fixture deliberately retained must use an explicit historical rules boundary; migrate active regression coverage to Set 1.

| Card | Runtime ID | Type | Text mentions Energy | Disposition |
|---|---|---|---|---|
| Arrow of the Sierra, Amihan | `agta/arrow-of-the-sierra-amihan` | Unit | Yes | Keep unavailable; historical only |
| Deerstep Runner, Kidlat | `agta/deerstep-runner-kidlat` | Unit | No | Keep unavailable; historical only |
| Ember-Pot Bearer, Berto | `agta/ember-pot-bearer-berto` | Unit | No | Keep unavailable; historical only |
| Ember Resin Grandmonther, Sinta | `agta/ember-resin-grandmother-sinta` | Unit | Yes | Keep unavailable; historical only |
| Firefly Pathkeeper, Aya | `agta/firefly-pathkeeper-aya` | Unit | No | Keep unavailable; historical only |
| Golden HiveHeart, Pulot | `agta/golden-hiveheart-pulot` | Force | No | Keep unavailable; historical only |
| Hidden Path | `agta/hidden-path` | Codex | No | Keep unavailable; historical only |
| Honey Keep Cliffer, Kislap | `agta/honey-keep-cliffer-kislap` | Unit | No | Keep unavailable; historical only |
| Leaf Whistle Scout, Sari | `agta/leaf-whistle-scout-sari` | Unit | No | Keep unavailable; historical only |
| Listening Canopy | `agta/listening-canopy` | Codex | Yes | Keep unavailable; historical only |
| Mangrove Maw, Lunod | `agta/mangrove-maw-lunod` | Force | No | Keep unavailable; historical only |
| Moon-Net Fisher, Mayumi | `agta/moon-net-fisher-mayumi` | Unit | No | Keep unavailable; historical only |
| Mudcrab Catcher, Pilo | `agta/mudcrab-catcher-pilo` | Unit | No | Keep unavailable; historical only |
| Rattan Bridge Weaver, Nena | `agta/rattan-bridge-weaver-nena` | Unit | No | Keep unavailable; historical only |
| Rattan Snarefall | `agta/rattan-snarefall` | Action | Yes | Keep unavailable; historical only |
| Returning River | `agta/returning-river` | Codex | No | Keep unavailable; historical only |
| Root Tusk Boar, Dagsa | `agta/root-tusk-boar-dagsa` | Force | No | Keep unavailable; historical only |
| Shared Ember | `agta/shared-ember` | Codex | No | Keep unavailable; historical only |
| Sierra's Vanishing Trail | `agta/sierras-vanishing-trail` | Action | Yes | Keep unavailable; historical only |
| Storm Bark Elder, Ulan | `agta/storm-bark-elder-ulan` | Unit | No | Keep unavailable; historical only |
| Storm Talon Eagle, Salimbay | `agta/storm-talon-eagle-salimbay` | Force | No | Keep unavailable; historical only |
| The Boar Spear, Makisig | `agta/the-boar-spear-makisig` | Unit | Yes | Keep unavailable; historical only |
| Thousand Knots | `agta/thousand-knots` | Codex | No | Keep unavailable; historical only |
| Voice Beneath the Rain, Laya | `agta/voice-beneath-the-rain-laya` | Unit | No | Keep unavailable; historical only |
| Banner Bearer of Ancestral Path, Danira | `babaylan/banner-bearer-of-ancestral-path-danira` | Force | Yes | Keep unavailable; historical only |
| Bell Dancer of the Tides, Sidlak | `babaylan/bell-dancer-of-the-tides-sidlak` | Unit | Yes | Keep unavailable; historical only |
| Drummer of the First Calling, Baya | `babaylan/drummer-of-the-first-calling-baya` | Unit | No | Keep unavailable; historical only |
| Heart of the Twelve Spirit, Amaya | `babaylan/heart-of-the-twelve-spirits-amaya` | Unit | Yes | Keep unavailable; historical only |
| Heart Spring Beneath the Ancient Balete | `babaylan/heart-spring-beneath-the-ancient-balete` | Codex | No | Keep unavailable; historical only |
| Keeper of the Mangrove Remedies, Maliya | `babaylan/keeper-of-the-mangrove-remedies-maliya` | Unit | No | Keep unavailable; historical only |
| Keeper of the Spirit Bowl, Ilaya | `babaylan/keeper-of-the-spirit-bowl-ilaya` | Unit | Yes | Keep unavailable; historical only |
| Lantern of the Mangrove Gate, Salaya | `babaylan/lantern-of-the-mangrove-gate-salaya` | Unit | Yes | Keep unavailable; historical only |
| Morning Offering Bearer, Hilaya | `babaylan/morning-offering-bearer-hilaya` | Force | Yes | Keep unavailable; historical only |
| Pearl Diver of the Spirit Shoal, Sulaya | `babaylan/pearl-diver-of-the-spirit-shoal-sulaya` | Force | Yes | Keep unavailable; historical only |
| Reader of Moonlight Current, Dalina | `babaylan/reader-of-moonlit-currents-dalina` | Unit | Yes | Keep unavailable; historical only |
| Reader of Shallow Waters, Nalia | `babaylan/reader-of-shallow-waters-nalia` | Unit | No | Keep unavailable; historical only |
| Shell Bell Initiate, Yana | `babaylan/shell-bell-initiate-yana` | Unit | No | Keep unavailable; historical only |
| Smoke-Tender of the Mangrove Altar, Isara | `babaylan/smoke-tender-of-the-mangrove-altar-isara` | Force | Yes | Keep unavailable; historical only |
| Spear Between two Worlds, Kadasig | `babaylan/spear-between-two-worlds-kadasig` | Unit | Yes | Keep unavailable; historical only |
| Spear of the Emerald Tide, Maraya | `babaylan/spear-of-the-emerald-tide-maraya` | Unit | Yes | Keep unavailable; historical only |
| The Ancestors Open the Way | `babaylan/the-ancestors-open-the-way` | Action | Yes | Keep unavailable; historical only |
| The Ancestral Caverns of Samar | `babaylan/the-ancestral-caverns-of-samar` | Codex | No | Keep unavailable; historical only |
| The Healing Grove of Bandilaan | `babaylan/the-healing-grove-of-bandilaan` | Codex | No | Keep unavailable; historical only |
| The Sacred Crown of Kanlaon | `babaylan/the-sacred-crown-of-kanlaon` | Codex | No | Keep unavailable; historical only |
| The Storm Altar of Madja-as | `babaylan/the-storm-altar-of-madja-as` | Codex | No | Keep unavailable; historical only |
| Vessel Beneath the Moon, Lunay | `babaylan/vessel-beneath-the-moon-lunay` | Unit | Yes | Keep unavailable; historical only |
| Weaver of the Spirit Threads, Dayaw | `babaylan/weaver-of-the-spirit-threads-dayaw` | Unit | No | Keep unavailable; historical only |
| Whispers Gather in the Heart | `babaylan/whispers-gather-in-the-heart` | Action | Yes | Keep unavailable; historical only |
| Blood Moon Bai-A-Labi | `maguindanao/blood-moon-bai-a-labi` | Unit | Yes | Keep unavailable; historical only |
| Buluan Inaul Wardkeeper, Dayang Nuraya | `maguindanao/buluan-inaul-wardkeeper-dayang-nuraya` | Unit | No | Keep unavailable; historical only |
| Buluan Mirror-Seer, Dayang Amira | `maguindanao/buluan-mirror-seer-dayang-amira` | Force | No | Keep unavailable; historical only |
| Buluan Shell-Caller, Mayla | `maguindanao/buluan-shell-caller-mayla` | Unit | No | Keep unavailable; historical only |
| Crimson Agung Resonance | `maguindanao/crimson-agung-resonance` | Action | Yes | Keep unavailable; historical only |
| Illana Bay | `maguindanao/illana-bay` | Codex | No | Keep unavailable; historical only |
| Illana Lantaka Warder, Panglima Jamal | `maguindanao/illana-lantaka-warder-panglima-jamal` | Unit | Yes | Keep unavailable; historical only |
| Illana Stormwing, Ramitan | `maguindanao/illana-stormwing-ramitan` | Force | No | Keep unavailable; historical only |
| Illana Tide-Harpooner, Hakim | `maguindanao/illana-tide-harpooner-hakim` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato | `maguindanao/kuta-wato` | Codex | No | Keep unavailable; historical only |
| Kuta Wato Banner-Keeper, Sitti Rahma | `maguindanao/kuta-wato-banner-keeper-sitti-rahma` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato Gate-Bulwark, Bai Samira | `maguindanao/kuta-wato-gate-bulwark-bai-samira` | Unit | No | Keep unavailable; historical only |
| Kuta Wato Warcaller, Datu Salik | `maguindanao/kuta-wato-warcaller-datu-salik` | Unit | No | Keep unavailable; historical only |
| Lake Buluan | `maguindanao/lake-buluan` | Codex | No | Keep unavailable; historical only |
| Liguasan Marsh | `maguindanao/liguasan-marsh` | Codex | No | Keep unavailable; historical only |
| Liguasan Mire-Bender, Duma | `maguindanao/liguasan-mire-bender-duma` | Force | No | Keep unavailable; historical only |
| Liguasan Mudblade, Nasser | `maguindanao/liguasan-mudblade-nasser` | Unit | No | Keep unavailable; historical only |
| Liguasan Reed-Eye, Harun | `maguindanao/liguasan-reed-eye-harun` | Unit | No | Keep unavailable; historical only |
| Pulangi Bloodcurrent, Sangkad | `maguindanao/pulangi-bloodcurrent-sangkad` | Force | No | Keep unavailable; historical only |
| Pulangi Ember-Spear, Kamil | `maguindanao/pulangi-ember-spear-kamil` | Unit | No | Keep unavailable; historical only |
| Pulangi River | `maguindanao/pulangi-river` | Codex | No | Keep unavailable; historical only |
| Pulangi River Unbound | `maguindanao/pulangi-river-unbound` | Action | No | Keep unavailable; historical only |
| Pulangi Wake-Cleaver, Panglima Farid | `maguindanao/pulangi-wake-cleaver-panglima-farid` | Unit | No | Keep unavailable; historical only |
| Veiled Eclipse Maharaja | `maguindanao/veiled-eclipse-maharaja` | Unit | Yes | Keep unavailable; historical only |
| Kuta Wato Abyssblade, Panglima Zafir | `maguindanao/kuta-wato-abyssblade-panglima-zafir` | Unit | Yes | Keep unavailable; historical only |
| Black-Standard Oathkeeper, Sitti Maira | `maguindanao/black-standard-oathkeeper-sitti-maira` | Unit | Yes | Keep unavailable; historical only |
| Lowland-Born Heir, Rinamuntaw | `maguindanao/lowland-born-heir-rinamuntaw` | Unit | No | Keep unavailable; historical only |
| Receding-Sea Heiress, Rinayung | `maguindanao/receding-sea-heiress-rinayung` | Unit | No | Keep unavailable; historical only |
| Many-Limbed Tidal Horror, Kurita | `maguindanao/many-limbed-tidal-horror-kurita` | Unit | No | Keep unavailable; historical only |
| Mountain-Breaking Devourer, Tarabusaw | `maguindanao/mountain-breaking-devourer-tarabusaw` | Unit | No | Keep unavailable; historical only |
| Cave-Light Heiress, Bai Amina | `maguindanao/cave-light-heiress-bai-amina` | Unit | No | Keep unavailable; historical only |
| Last Refuge Chief, Datu Karim | `maguindanao/last-refuge-chief-datu-karim` | Unit | No | Keep unavailable; historical only |
| Hollow-Tree Emberkeeper, Harun | `maguindanao/hollow-tree-emberkeeper-harun` | Unit | No | Keep unavailable; historical only |
| Lost-Ring Bearer, Buganga | `maguindanao/lost-ring-bearer-buganga` | Unit | No | Keep unavailable; historical only |
| Legend-Script Guardian, Datu Kali Adam | `maguindanao/legend-script-guardian-datu-kali-adam` | Unit | No | Keep unavailable; historical only |
| Mantapuli Memory Keeper, Alad | `maguindanao/mantapuli-memory-keeper-alad` | Unit | No | Keep unavailable; historical only |
| Many-Bodied Hunter, Omaka-an Shard | `maguindanao/many-bodied-hunter-omaka-an-shard` | Unit | No | Keep unavailable; historical only |
| Bita Eclipse Hatchling, Pahira | `maguindanao/bita-eclipse-hatchling-pahira` | Unit | No | Keep unavailable; historical only |
| Dread-Night Caller, Balbal | `maguindanao/dread-night-caller-balbal` | Unit | No | Keep unavailable; historical only |
| Heaven-Sheltered Survivor, Lanao Sprite | `maguindanao/heaven-sheltered-survivor-lanao-sprite` | Unit | No | Keep unavailable; historical only |
| Three-Scourge Slayer, Sulayman | `maguindanao/three-scourge-slayer-sulayman` | Unit | No | Keep unavailable; historical only |
| Sun-Darkening Scourge, Pah | `maguindanao/sun-darkening-scourge-pah` | Unit | No | Keep unavailable; historical only |
| Land-Restoring Raja, Indarapatra | `maguindanao/land-restoring-raja-indarapatra` | Unit | No | Keep unavailable; historical only |
| Seven-Sight Final Scourge, Gurayan | `maguindanao/seven-sight-final-scourge-gurayan` | Unit | No | Keep unavailable; historical only |
| Gurayen Wrath-Mate, Maka-Ogis | `maguindanao/gurayen-wrath-mate-maka-ogis` | Unit | No | Keep unavailable; historical only |
| Ridge-Bed Devourer, Omaka-an | `maguindanao/ridge-bed-devourer-omaka-an` | Unit | No | Keep unavailable; historical only |
| Heaven-Rending Wind, Taguwasi | `agta/heaven-rending-wind-taguwasi` | Unit | No | Keep unavailable; historical only |
| Fifth-Sky Arrowlord, Kalimangalnuk | `agta/fifth-sky-arrowlord-kalimangalnuk` | Unit | No | Keep unavailable; historical only |
| Life-Restoring Mother, Ina Nanolay | `agta/life-restoring-mother-ina-nanolay` | Unit | No | Keep unavailable; historical only |
| Mystic River Caller, Alig | `agta/mystic-river-caller-alig` | Unit | No | Keep unavailable; historical only |
| Fallen Sky Warrior, Talimanog | `agta/fallen-sky-warrior-talimanog` | Unit | No | Keep unavailable; historical only |
| Defiant Sky Warrior, Ammani | `agta/defiant-sky-warrior-ammani` | Unit | No | Keep unavailable; historical only |
| Enduring Sky Warrior, Annibo | `agta/enduring-sky-warrior-annibo` | Unit | No | Keep unavailable; historical only |
| Golden Gate Warden, Nagdombilan | `agta/golden-gate-warden-nagdombilan` | Unit | No | Keep unavailable; historical only |
| Moon-Stealing Wing, Ammalabukkaw | `agta/moon-stealing-wing-ammalabukkaw` | Unit | No | Keep unavailable; historical only |
| Captive Moon, Innawagan | `agta/captive-moon-innawagan` | Unit | No | Keep unavailable; historical only |
| Sunrise-Seeking Wing, Dalewasan | `agta/sunrise-seeking-wing-dalewasan` | Unit | No | Keep unavailable; historical only |
| Shapeshifting Savior, Nagmalitong Yawa | `babaylan/shapeshifting-savior-nagmalitong-yawa` | Unit | No | Keep unavailable; historical only |
| Celestial Matriarch, Alunsina | `babaylan/celestial-matriarch-alunsina` | Unit | No | Keep unavailable; historical only |
| Lifespan Carver, Sidapa | `babaylan/lifespan-carver-sidapa` | Unit | No | Keep unavailable; historical only |
| Seven-Year Challenger, Labaw Donggon | `babaylan/seven-year-challenger-labaw-donggon` | Unit | No | Keep unavailable; historical only |
| Tarangban Voyager, Humadapnon | `babaylan/tarangban-voyager-humadapnon` | Unit | No | Keep unavailable; historical only |
| Ridge-Splitting Warrior, Dumalapdap | `babaylan/ridge-splitting-warrior-dumalapdap` | Unit | No | Keep unavailable; historical only |
| Heart-Veiled Lord, Saragnayon | `babaylan/heart-veiled-lord-saragnayon` | Unit | No | Keep unavailable; historical only |
| Ancestral Faithkeeper, Tamblot | `babaylan/ancestral-faithkeeper-tamblot` | Unit | No | Keep unavailable; historical only |
| Diwata Shrinekeeper, Pagali | `babaylan/diwata-shrinekeeper-pagali` | Unit | No | Keep unavailable; historical only |
| Final-Blow Heir, Asu Mangga | `babaylan/final-blow-heir-asu-mangga` | Unit | No | Keep unavailable; historical only |
| Heart-Beast Hunter, Buyung Baranungun | `babaylan/heart-beast-hunter-buyung-baranungun` | Unit | No | Keep unavailable; historical only |
| Ridge-Bed Multiplier, Omaka-an | `maguindanao/set-1/ridge-bed-multiplier-omaka-an` | Unit | Yes | Keep intentionally hidden |

## Coverage validation

- Selectable IDs in the exported loader: 141.
- Individual migration entries: 141.
- Live token entries: 1.
- Other unavailable entries: 117.
- No gameplay code or card definition was changed to produce this audit.
- This is a source-based migration design. New Energy-free skill outcomes and balance must be validated during implementation using the scenarios above and the release matrix in the master plan.
