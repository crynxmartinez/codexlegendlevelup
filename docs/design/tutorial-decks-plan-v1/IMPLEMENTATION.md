# Three regional tutorial decks — local implementation

2026-11-16. Implementation and pre-publication review. The approved JSON lists in this folder remain unchanged. This record distinguishes controller-level evidence from browser and beginner-comprehension evidence. Publication is recorded in Git history; deployment status is separate.

## Confirmed discrepancies and corrections

| Previous dependency or gap | Implemented correction |
|---|---|
| Tutorial encounters reused production starters; Chapter 3 always selected Luzon. | Dedicated runtime copies of the three approved 50-card lists in `src/data/tutorial-decks/`; one selected region now follows the five-chapter path. |
| Prepared scenes depended on specific Luzon cards, amounts and outcomes. | Explicit region-specific identities in `TUTORIAL_LESSON_CARDS`; early scenes and guides use those identities and their actual statistics. |
| Tutorial Unit roles depended on catalogue order. | Explicit card-ID role data preserves assignments when the catalogue changes. |
| Regional Action/Sentry effects and ordinary boss skills could appear before being explained. | Bounded regional instruction in Chapters 3–4 before free practice. Existing scripts and the normal controller resolve the effects. |
| Existing chapter checkpoints represented fewer encounters and shared Chapter 3 progress. | Versioned regional checkpoints, four Chapter 3 encounters and five Chapter 4 encounters. Earned chapter completion is preserved; incompatible partial encounters restart safely. |
| A spent Sentry is face down in Exile and cannot be inspected there. | Read it in hand before use; read the visible resulting Ally or Persona afterward. No hidden-card inspection exception. |
| Declining an optional Action selection can spend the Action without moving a Unit. | The result step explicitly explains the empty outcome and requires reading the spent Action in visible Grave. Cancelled drafts remain available to try again. |
| An early declined Sentry response changes the later Barrier count and may change the next Sipol card. | Retry goals recognize the actual later stopped hit and actual called Unit, without assuming five Barriers remain or replacing the deck outcome. |

Primary boundaries: `src/core/tutorial-decks.ts`, `src/core/tutorial-rules.ts`, `src/ui/first-battle.ts`, `src/ui/next-battle.ts`, `src/ui/journey-battle.ts`, `src/ui/journey-progress.ts` and their existing menu/launch integration.

## Exact limits and preserved behavior

Each tutorial list is exactly **50 main cards**: 15 Level 1 Units, 12 Level 2 Units, 6 Level 3 Units, 12 Forces, 3 Actions and 2 Sentries. Each identity has three copies except the Sentry, which has two. The starting Persona comes from those 50; it is not an extra card. Two distinct Codex remain outside the main deck, ordered Attack then Barrier.

The only tutorial construction exception remains the two-Codex profile. Normal starter decks still have five Codex. Tutorial presets do not become saved decks or legal normal-play/PvP lists. Normal catalogue definitions, scripts, artwork, printed base statistics and the approved battlefield layout are preserved.

The existing simplified effects remain:

- Level 1 support/arrival/attack bonuses are +3,000; Level 2 bonuses are +5,000.
- Support changes the supporting Unit once for that attack. Attack bonuses also end with that attack. Arrival bonuses end with the turn.
- Only State-gated Level 3 skills are removed. Ordinary Level 3 skills remain.
- Forces, Actions and Sentries retain their normal effects and costs.
- Attack Codex gives the Persona +5,000 only while attacking. Barrier Codex gives +1,000 per own broken Barrier on either turn. Existing switching rules remain.

Prepared scenes arrange actual cards and draws. They do not invent cards, automatically pay human costs or force combat results. Early chapters use the intended two-Barrier teaching position with Attack Codex. The Barrier Codex lesson begins at five Barriers, demonstrates +0, then a real break to four and +1,000. Free practice retains normal shuffle, five Barriers, legal choices and optional skill prompts.

## Five-chapter regional path

| Chapter | Shared learning task | Regional content |
|---|---|---|
| 1 — First Battle | Call, attack, defend and recognize the result. | The selected preset's Persona and alternate boss; a real 10,000-Defense blocker stops the prepared 16,000 attack against an 11,000 Persona. |
| 2 — Simple Skills | See arrival +3,000 and attack +5,000 begin and expire. | Explicit arrival/attacker identities from the chosen preset; guide numbers follow their real statistics. |
| 3 — Support and Defense, **4 encounters** | Support and exhaustion; Force check/hand response; Sentry; Action. | Luzon: Banoy Sipol placement and recovery. Visayas: Bituon creates one Heart token; Action Sanibs a Unit from the top three. Mindanao: Sabir stops damage; Action recovers one of up to two Level 1 Units and bottoms the other. |
| 4 — Persona and Codex, **5 encounters** | Personify; Barrier Codex; Attack Codex; default boss skill; alternate boss skill. | The six retained ordinary skills are explained below. |
| 5 — Practice Duel | Make independent choices in a complete match. | Both sides use dedicated tutorial presets. Optional boss skills are available, never a required victory condition. |

## Retained boss skills and the Amara limitation

| Region | First boss lesson | Alternate boss lesson |
|---|---|---|
| Luzon | Nanolay's optional attack trigger: draw one, +3,000 until End Turn; decline remains valid. | Kalimangalnuk's optional Sipol: place the actual incoming Unit, then copy its current Power until End Turn. Skipping remains valid. |
| Visayas | Kaptan's optional attack trigger: Sanib a hand card as cost, draw one, +3,000 until End Turn; declining pays nothing. | Amara specifically requires **Sanib from the Persona Zone**. Ordinary Personify moves the previous Persona to Heart but is not Sanib. |
| Mindanao | Indarapatra searches for a Level 2 or lower Unit and special calls it charged; no Offer cost. | Pah optionally Offers two Allies for +5,000, or +10,000 at two or fewer Barriers, until End Turn. Cost cancellation and skipping preserve both Allies. |

**Amara is an intentional disclosed limitation, not a silently changed card.** None of the approved Visayas preset cards Sanibs a Persona. Her lesson demonstrates the actual Personify-to-Heart move and explains why it does not trigger her retained skill. No substitute card, fake trigger or additional mechanic was added. A more directly usable alternate Persona would require a separately approved list change.

Prepared lessons suppress unrelated optional boss/Codex interruptions and allow only the skill being taught. Free practice does not use that prepared-scene restriction. Reading objectives require a fresh inspection after the demonstrated result; they do not complete from repeated Continue clicks.

## Acceptance criteria

| Area | Pass condition |
|---|---|
| Deck identity | All three runtime lists match every approved identity, quantity, Persona and Codex; 50+2 and all stated type/role totals hold. |
| Isolation | Production lists remain legal and unchanged; no tutorial effects or presets leak into normal AI, saved decks or PvP. |
| Regional continuity | Start, next encounter, replay, resume and return retain the selected region through all five chapters. |
| Real outcomes | Support/exhaustion, modifiers/expiration, Force checks/responses, Sentry outcomes, Action destinations and permitted boss skills resolve through existing controllers. |
| Declines and cancellation | Optional choices can be declined or cancelled without paying unconfirmed costs or stranding a lesson. Inspection return preserves the current goal. |
| Hidden information | Opponent hands/decks/Barriers and face-down Exile remain concealed. Teaching never requires reading a concealed card. |
| Reading and controls | At 1920×1080 and 844×390 landscape, the current objective and necessary action are reachable; the guide does not cover the required target or hand/Barrier area. Long source text remains readable using existing inspection controls. |
| Input and motion | Keyboard and pointer/touch can reach the named action and dismiss inspection; reduced motion does not skip essential reading or remove decisions. |
| Persistence | Earned completion survives migration; incomplete incompatible scenes restart safely; reload never invents mid-battle completion. |
| Practice | All nine region-versus-region pairings start legally and finish in the bounded automated sample; no softlock, invalid action or leftover tutorial goal blocks play. This is not a balance claim. |

## Verification status

See [VERIFICATION.md](VERIFICATION.md) for the detailed integration record and captured browser evidence. The results below are from the completed local workstreams; they do not imply every acceptance criterion was manually checked.

- **Implemented:** local presets, explicit roles, regional prepared lessons, regional progression and practice integration.
- **Full automated suite:** **1,497 Vitest tests and 20 Node tests passed**, with three existing opt-in tests skipped. The final focused tutorial run passed **198 tests**. The final build and `tsc --noEmit` also passed.
- **Journey coverage:** all regional Chapter 3/4 paths, retained skills, optional skips, Action declines, Sentry retry, Pah's 5/2-Barrier branches, cancellation and unchanged production starter setup were checked with real controllers. Preset/profile, Chapters 1/2, progression and nine practice-pairing checks are included in the automated coverage.
- **Built-in-browser checks:** all four Visayas Chapter 3 encounters, including skipping the Action selection and returning through its result; the first two Luzon Chapter 4 encounters; complete Mindanao Chapter 2; Mindanao-versus-Luzon Practice Duel entry, response decline and defense under the Minimal animation setting; and the Action flow at **844×390** mobile landscape.
- **Remaining manual coverage:** an end-to-end playthrough of every chapter in every region has not been completed. The operating-system reduced-motion toggle was not tested; checking the game's Minimal animation setting does not prove that OS preference path. Controller tests and sampled browser checks do not establish all remaining viewport/input behavior.
- **Intentional card limitation:** Amara's Persona-Sanib trigger remains unchanged and cannot be produced by the approved Visayas preset. The lesson explains why ordinary Personify does not trigger it; no substitute card or fake trigger was introduced.
- **Independent beginner evidence:** not collected. No claim of equal regional difficulty or improved comprehension.
- **Deployment:** not established by these local checks; consult the commit's hosting status.

## Short novice-test protocol

Recruit six people with no trading-card-game experience, two per region. Use a clean tutorial progress record and counterbalance desktop versus mobile-landscape starts. Give only the tutorial's own instructions; record facilitator help separately.

Ask each learner to complete the five-chapter path and explain, in their own words: where a called Unit goes; how support differs from another attack; how to stop one hit; why a bonus disappeared; where their regional Action moved cards; and what an optional boss skill costs. Include one opportunity to decline an effect and one inspection-and-return task.

Record chapter/encounter completion time, incorrect target clicks, backtracking, help requests, missed prompts, abandoned decisions, unexplained costs and any unrecoverable state. After the Practice Duel, ask which regional terms remained unclear. Specifically probe Visayas Heart/Sanib versus Personify and Mindanao Offer versus discard.

Provisional review thresholds: zero unrecoverable states or hidden-information leaks; at least five of six learners explain at least four of the six concepts correctly; every participant can decline an optional skill without assistance. Treat times and regional differences as descriptive with this small sample. Revise wording or encounter sequencing only from observed errors; do not alter card rules to make test outcomes look better.
