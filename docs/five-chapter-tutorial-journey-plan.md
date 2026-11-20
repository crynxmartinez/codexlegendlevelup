# Codex Legends: a five-chapter learning journey

Date: 2 October 2026
Status: implemented locally after approval. Validation scope and remaining external checks are recorded in [journey validation](five-chapter-tutorial-journey-validation.md).

## 1. Decision and boundaries

Replace the current tutorial catalogue with exactly five top-level chapters. First Battle and Your Next Battle become Chapters 1 and 2, not additional menu entries. The old regional lessons and Archipelago Challenge stop appearing as separate tutorial destinations. Reuse their useful mechanics and prepared boards inside the journey.

This replaces the earlier proposal to reduce the catalogue to fifteen entries. It refines the learning portion of the whole-game polish plan, without discarding other implementation or release work.

Preserve the normal rules, current 2D art, card inspection, Energy-free play allowance, batch costs and approved chain timing. Normal calls and Actions consume plays; skills and special calls do not. Every other actual card cost remains. Do not introduce tutorial-only outcomes that contradict normal play.

The journey is five chapters, not twenty-seven lessons hidden behind five headings. Chapters 3 and 4 have at most three short encounters each, with automatic transitions and safe checkpoints, not another lesson-selection grid. Chapter 4 requires one regional path, not all three.

Narrative direction: a player learns to command a Persona, survives an exchange, learns to respond, chooses an archipelago and completes a real duel. Use a light original framing and existing art. Do not invent folklore, historical claims, named mentors, currencies, rewards or new cards to justify the teaching. Navigation labels use Luzon, Visayas and Mindanao.

## 2. The five chapters

| Chapter | Player-facing name | Structure | Guidance | Planning estimate |
| --- | --- | --- | --- | --- |
| 1 | First Battle | Existing prepared short battle, edited for concise prompts | Follow exact actions | 5–7 minutes |
| 2 | Your Next Battle | Existing two-Barrier practice match | Choose freely; request hints | 5–8 minutes |
| 3 | Turn the Battle | Three short prepared exchanges | Demonstration, choice, feedback | 6–9 minutes |
| 4 | Choose Your Archipelago | Choose one region; three connected encounters | Explain new mechanics only | 8–12 minutes |
| 5 | Your First Real Duel | One normal five-Barrier AI match with the chosen deck | Optional hints; no mandatory coaching | Match-dependent, initially budget 8–15 minutes |

These are authoring budgets, not measured completion times. The first two chapters form the short introduction for an expo; players may enter normal play afterward. Completing every chapter is not a condition for playing the game or private PvP.

### Chapter 1 — First Battle

**Purpose:** learn the basic turn by doing it once.

Retain the working First Battle sequence: identify Persona and Allies; inspect a card; call an Ally; attack; watch defense and the Persona check; attack with an Ally; break a Barrier; end turn; defend once and take a hit once; use an Action; win.

Keep the prepared two-Barrier setup, explicitly described as a shorter practice battle. Show that a normal game starts with five. Teach the first-player draw exception at the next-turn moment. Teach that only normal calls and Actions consume plays when those actions actually happen.

Remove duplicate explanatory stops. Put short results on the board: “Defense held”, “Barrier broken”, “+3,000 Power”. A result is not another Continue task. Keep manual acknowledgements only when introducing an essential rule before the player acts. Do not teach advanced state conditions, chain management, Sentries or every zone here.

**Completion evidence:** the correct inspected card has been opened and closed; the intended calls, defense choices and Action committed; real battle events occurred; the player won. Advancing text alone cannot complete the chapter.

**Exit:** one compact success message and “Your Next Battle”, plus Return to journey and Replay. Preserve existing First Battle checkpoint functionality through an adapter rather than rewrite the working battle script unnecessarily.

### Chapter 2 — Your Next Battle

**Purpose:** prove the player can make the basic decisions without glowing every answer.

Retain the short practice deck, two Barriers and restrained legal opponent. Let the player choose Units, slots, whether to spend an Action, attack order and defense. Do not force a specific sequence that was already taught in Chapter 1.

Show one current goal such as “Break their next Barrier”. Need a Hint reveals three levels: a general idea, relevant cards, then a concrete legal option. Advice reads visible information and is recomputed when the position changes. Taking a hit or keeping a card is not automatically a mistake.

Keep the opponent's simplified policy transparent: limited development, no support and no optional combo chains. This chapter therefore does not certify advanced mechanics.

**Completion evidence:** win the actual practice match. Track relevant actions locally for useful feedback, but do not demand arbitrary quotas that encourage bad play. On a loss, identify one factual exchange and offer an immediate retry. Hints do not invalidate completion.

**Exit:** “You can play a match now.” Offer Continue journey and Play normally. The next chapter explains abilities the practice opponent deliberately avoided.

### Chapter 3 — Turn the Battle

**Purpose:** understand support, battle cards and responses before encountering a long combo.

Three encounters, all inside this chapter:

1. **Support or attack separately.** Present a legal position where an Ally can support the Persona or remain available for its own attack. Show contribution and the exhaustion consequence. Ask the player to achieve a concrete board goal; accept every legal solution meeting it. Demonstrate the alternative through a brief comparison or replay, not a second mandatory lecture.
2. **Force or Sentry.** Let the player actually cast a Force from hand, select its target and watch its effect. Separately present a Persona attack where a legal Sentry can stop the damage. Require real selection and payment of its current non-Energy cost, then show its destination. Distinguish a Force played from hand from a Force revealed during a check. Use a predetermined legal Force check if the distinction has not been demonstrated, with one sentence at the reveal.
3. **Respond, then resolve.** Prepare a two-link chain with an optional third response. The player commits a card and pays its cost; the opponent responds; the player can respond or decline. One decline locks the chain; resolve last in, first out. Highlight the resolving source and its target. No responses may be inserted during resolution. Introduce waiting triggers in one sentence; regional encounters demonstrate them fully later.

The first example in each encounter may restrict actions to teach the mechanism. Its final decision must accept alternatives where the engine allows them and the objective is satisfied. Restore the encounter's safe start if the objective becomes impossible; never refund committed costs inside the current match.

**Completion evidence:** valid support consequence, an actual Force activation, an actual Sentry prevention and a real response chain with the expected resolution order. Use specific event/card identities, not “any attack” or “any skill” counters.

### Chapter 4 — Choose Your Archipelago

**Purpose:** teach one starter deck's plan, including Codex, States and Personification in context.

Show three existing regional images, each with one short play-style sentence. Remember the selected starter for Chapter 5. Other paths remain replay options inside Chapter 4, not extra required chapters. Completing any one path completes the chapter; retain separate optional path progress.

Each path has the same three encounter shapes:

**A. Choose how you fight.** Inspect the Persona; switch to a particular useful Codex; Personify from hand in a prepared legal position; observe where the old Persona goes. Teach printed versus current Power and manual/triggered/state-gated skills through the actual selected cards. Establish that state markers do not replace timing labels. Do not list every keyword before the player uses one.

**B. Build the regional resource or condition.**

- **Luzon:** develop the fourth eligible Ally and release Bayanihan. Show that losing the condition can lock the dependent skills again. Perform a real Sipol check and special call.
- **Visayas:** Essence from a visible source, follow the card into Heart, create Kaluluwa through a real effect and observe the actual Andukha meter. Inspect a threshold-gated skill. Derive thresholds from current rules; the old files contain inconsistent explanatory comments, so do not copy a remembered number.
- **Mindanao:** Offer an Ally with Last Oath, resolve the main chain, then choose the waiting effect. Arrange the Grave so this also demonstrates Garahana becoming available. Explain weighted Grave contributions using a current qualifying card, without claiming all Grave cards count equally.

**C. Choose a small combo.**

- **Luzon:** use a real battle-time call effect, then choose a useful attack order. Preserve supporters when needed.
- **Visayas:** select the actual Heart cards for one batch Vent payment, confirm once, then choose waiting effects after the chain. Special call from Heart and show the applicable end-of-turn return. Preserve token-specific movement rules rather than implying every Heart exit is Vent.
- **Mindanao:** pay Offer 3 together; show that costs precede responses; finish the main chain; choose the waiting Last Oaths in a useful order; rebuild through special calls. The player chooses which eligible effect goes next.

**Completion evidence:** the selected path's concrete events and resulting board condition. Mere successful skill activation is insufficient when its target or follow-up could fail. Finish only after required effects and presentation settle.

**Scope control:** small prepared boards, at most a few relevant choices at each step, short encounters rather than three full games. No lesson on every card. Rules and full names remain available through inspection.

### Chapter 5 — Your First Real Duel

**Purpose:** transfer learning to normal play.

Use the chosen region's real starter and the normal game setup: five Barriers, normal draw rules, play allowance, legal costs, States and chains. Show ordinary Persona/Codex setup. Use the standard fair AI; do not use the boosted-check Hard mode or secretly change outcomes.

This replaces the separate tutorial Archipelago Challenge entry with one graduation match, not three mandatory full matches. The former three-opponent challenge logic can supply opponents or later rematch options, but it must not expand the required journey beyond five chapters. Playing another opponent is optional replay, not a sixth chapter.

No compulsory lesson pauses or forced moves. Offer hints and ordinary inspection. When a player struggles, suggest a relevant completed encounter without forcing a restart of the whole journey. A loss retains chapter progress and offers retry or chapter-specific practice.

**Completion evidence:** a legitimate player victory, with no unresolved match state. A concession by the player does not count as victory. Merely seeing a result screen does not count. A player can leave and play normally regardless of completion.

**Exit:** Journey complete, a short factual recap and Play normally / Play with a friend / Try another region. No unsupported coaching judgement about why the player won.

## 3. Journey interface and coaching

Use the existing 2D Philippine visual identity as a background accent and five numbered nodes connected as a clear path. Regional geography is secondary to readable chapter order. No 3D islands, trees, imported reference assets or large new cinematics.

At entry show Continue journey, current chapter, five compact nodes and one selected chapter detail. Each node has a short title and Not started / In progress / Complete. Completed nodes can replay. Later chapters remain accessible through a quiet choose-chapter control; recommended order is guidance, not a lock on the game.

On desktop use a horizontal path where space permits. On landscape phones show the current node and nearby nodes in a horizontal strip; the full chapter description is not repeated on every node. Keep the primary action visible without vertical scrolling. Portrait may show a rotate recommendation with reachable navigation, not an inaccessible screen.

During play use a small coach with one objective and at most two short sentences. Highlight one actionable target at a time. Prefer a 20–30-word copy budget for immediate instructions. Rules reference and Need a Hint hold optional detail. Use short card names in prompts, full names in inspection.

Hide/minimize the coach during selection panels and check presentations. Do not layer it over cards, turn indicators or confirmation controls. View board reveals a sharp, unblurred field. Current choices survive minimize, resize and inspection. Right-click, long-press and keyboard inspection never commit an action; horizontal swiping must not activate a card. Action casting retains confirmation. Codex click-switch retains its explicit current behavior.

Test at 1280×720, 1920×1080, 1024×768, 667×375, 844×390 and 915×412. Critical controls are at least 44×44 CSS pixels. Use dynamic viewport height and safe areas. Real Android/iOS touch, browser bars and keyboards require physical-device validation; resized desktop windows do not prove those work.

## 4. Completion, persistence and retries

Create a versioned journey record containing stable chapter IDs, status, selected region, per-region Chapter 4 progress and safe encounter checkpoints. Track assistance separately if useful; never mark a hinted completion as inferior. Store locally, handle malformed/blocked storage, and never require an account.

Save only after a completed action and all associated chains/mandatory waiting effects have settled. Never serialize an unresolved promise, chooser callback or half-paid cost. Chapters 1, 3 and 4 can reconstruct a safe encounter through seeded setup and the real controller. Chapters 2 and 5 resume from their match start unless an existing validated complete-state restore supports more; disclose that before leaving. Do not claim mid-match resume unless tested.

Retry the current encounter, replay chapter and reset journey are distinct actions. Reset requires an explicit confirmation because it removes earned progress; a normal retry does not clear unrelated chapters. Replaying cannot remove completion.

Step completion must be typed and executed, not prose metadata. Required conditions include inspection completed, committed action by the right player/source, exact batch cost, state change, chain resolution, target outcome and winner. Ignore duplicate event delivery, animation-only callbacks, invalid actions, cancellation and stale step events.

Current risk found in source: `tutorial-mode.ts` adapts only action completions; other catalogue completion types become manual steps, and challenge objective arrays are not carried into that adapter. Replace that limitation before using new chapter completion claims. Keep manual progression only for introductions and optional explanation.

## 5. Existing-content migration and removal

| Current content | Replacement |
| --- | --- |
| First Battle | Chapter 1, preserving successful battle fixtures |
| Your Next Battle | Chapter 2, preserving free-choice practice and hints |
| Field/Main/Battle/Defense lessons; old guided/practice lessons | Retired menu entries; useful content already covered by Chapters 1–2 |
| Force/Sentry, response chains, support explanations | Chapter 3 |
| Personification, Codex/States, skill labels, regional mechanics | Chapter 4 in context |
| Zone explanations | Just-in-time movement demonstrations and optional rule reference |
| Three regional challenge tiles | No separate tiles; useful objectives inform Chapter 4 validation |
| Archipelago Challenge | Chapter 5 graduation destination, with optional opponent replay |
| Deck-guide quizzes and practice links | No parallel onboarding course; retain useful reference information and point practice into Chapter 4 |

Legacy First Battle completion maps to Chapter 1 complete. Legacy Next Battle victory maps to Chapter 2 complete. Old lesson flags may inform suggestions, but cannot prove completion of redesigned Chapters 3–5. Preserve old challenge achievements as legacy records without falsely awarding the new graduation outcome.

Redirect old tutorial URLs to the appropriate new chapter. Update defeat-screen practice links, deck guides, challenge help links, prerequisite hints and end-of-chapter Next buttons. Never overwrite unrelated progress. After all references and tests migrate, remove obsolete lesson definitions and dead UI; retain compact route/progress compatibility code. Do not delete the existing battle machinery before replacement chapters pass.

## 6. Implementation sequence and acceptance

Implementation was approved by the subsequent request to proceed. The sequence below remains the acceptance contract; the validation record distinguishes engine coverage, browser checks and external playtests.

| Task | Depends on | Concrete acceptance and verification | Likely files / scope |
| --- | --- | --- | --- |
| J01: teaching and fixture manifest | None | Every required concept assigned once; each scripted move/source/target proven legal using current cards; legacy route map complete | New journey definition/fixture modules, existing lesson fixtures; M |
| J02: completion contract | J01 | Event/objective completion works; wrong source, cancel and duplicate events do not advance; engine regression tests unchanged | Journey session, tutorial adapter, event tests; M |
| J03: persistence and migration | J02 | Corrupt storage tolerated; old completion retained accurately; safe checkpoints and retry semantics tested | Journey progress module and focused tests; S–M |
| J04: five-node menu + Chapter 1 | J03 | Exactly five top-level nodes; existing controlled battle completes through real events; navigation and checkpoint verified in browser | `main.ts`, journey screen/styles, First Battle adapter; M |
| J05: Chapter 2 | J04 | Multiple legal choices work; hints never play automatically; win/loss/retry preserve correct progress | `next-battle.ts`, UI/session adapters, tests; M |
| J06: Chapter 3 support/defense | J05 | Support exhaustion, Force payment and Sentry prevention verified with actual cards and mobile choices | Chapter 3 fixtures and runner; M |
| J07: Chapter 3 response encounter | J06 | Two/three-link resolution order correct; decline and pending triggers match normal rules | Chain fixtures, session conditions, tests; M |
| J08: Chapter 4 shared setup + Luzon | J07 | Codex and Personification actually occur; state, Sipol and battle call objectives verified | Regional fixture module, chapter selector, tests; M |
| J09: Chapter 4 Visayas | J08 | Essence/Heart, tokens, thresholds, batch Vent and selected waiting effects work without invented costs | Visayas journey fixtures/tests; M |
| J10: Chapter 4 Mindanao | J08 | Offer 1/3, Garahana, separate Last Oath chains and rebuild outcomes verified | Mindanao journey fixtures/tests; M |
| J11: Chapter 5 | J09, J10 | Full rules and selected starter; only real win completes; fair opponent; retry/navigation checked | Challenge/practice integration, journey completion, tests; M |
| J12: retire legacy menu/routes | J11 | No duplicate destinations or broken links; old saves survive; dead references removed after replacement coverage | Old catalogue, deck guide, menu/end screens, navigation tests; M |
| J13: presentation and responsive pass | J12 | Short prompts, one overlay priority, usable inspection, no clipped controls at matrix sizes; reduced-motion and hidden-tab checks | Shared coach/panel styles and interaction code; M |
| J14: release evidence | J13 | Focused and relevant full regressions plus build pass; all paths browser-played; external checks explicitly recorded | Validation doc, dev log, checklist; S |

Checkpoints after J05, J07, J10 and J14: build, appropriate tests and an end-to-end playthrough of the delivered slice. Do not postpone a deadlock or incorrect outcome to the polish phase. Browser evidence should include the journey menu, short coach, regional branch and completed chapter. A production push/deployment is a separate release action, not implied by this plan.

## 7. Playtest and release gates

Use a small formative group of roughly five people who do not usually play TCGs. This is qualitative usability work, not a statistically proven result. Observe without explaining the answer first.

- After Chapter 1: can they inspect without playing and describe the win condition?
- After Chapter 2: can they take a turn and choose defense without exact-move hints?
- After Chapter 3: can they explain which chain link resolves first and why a supporter cannot attack afterward?
- After their Chapter 4 path: can they build the regional condition, pay its cost and identify a waiting effect?
- In Chapter 5: where do they hesitate, ask for help, misclick or abandon the match?

Record completion time, repeated hints and the specific confusing choice. Do not upload player data automatically. Rewrite or split an overloaded encounter if multiple people get stuck at the same place; do not solve confusion by adding paragraphs.

Release gates: no rule/privacy regressions, no unrecoverable tutorial state, honest completion, all five chapters reachable, all three regional paths tested, older progress preserved, landscape controls usable and ordinary play/PvP unaffected. Real-phone and deployed PvP regression checks remain separately recorded. No performance improvement, learning success or release readiness is assumed from writing this plan.

## 8. Evidence basis

The original plan was grounded in the old tutorial catalogue, First Battle, Next Battle and Archipelago Challenge. Its replacement lives in `journey-progress.ts`, `journey-menu.ts`, `journey-battle.ts` and their `main.ts` integration. Old catalogue and challenge modules are retired. Time budgets remain estimates; learning effectiveness still requires beginner playtests.
