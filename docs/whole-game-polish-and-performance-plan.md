# Codex Legends: whole-game polish and performance

Date: 2026-10-02

Scope: desktop, laptop, tablet and landscape mobile. Mobile is a required part of every applicable phase, not the entire project. Preserve the existing 2D identity, artwork, Energy-free rules, play allowance and response-chain contract.

## 1. Evidence and recommendation boundaries

This is a research-informed plan, not a claim that every proposal is used by a competitor. Labels throughout this document distinguish:

- **Reference evidence:** official documentation, public pages and screenshots inspected during this review.
- **Local finding:** current source inspection or browser measurements in this checkout.
- **Recommendation:** a proposed adaptation that still needs implementation and testing.
- **Target:** an acceptance goal, not an achieved performance result.

Master Duel and Dear Days were not played in installed clients during this review. Duel Online's public interface and release notes were inspected; its signed-in matches were not tested. Release notes describe the developer's claims. Browser viewport tests do not prove physical touch, Safari keyboard behavior, battery life or low-end phone performance.

The playable checkout is `C:\Code\codexlegend`. The similarly named `codexlegendtcg` directory is the marketing website.

## 2. What to learn from the reference games

| Reference | Evidence reviewed | Useful adaptation for Codex Legends |
| --- | --- | --- |
| [Yu-Gi-Oh! Master Duel](https://www.konami.com/yugioh/masterduel/us/en/) | Official product material and numbered-chain screenshot; [beginner guidance](https://us-support.konami.com/hc/en-us/articles/4812893829399-I-m-new-to-Yu-Gi-Oh-MASTER-DUEL-How-should-we-start-the-game) moves from tutorial to Duel Strategy. | Keep response decisions simple; communicate committed links separately through the board. Extend guided play into deck-specific understanding. These are adaptations, not a claim of identical timing or rules. |
| [Duel Online](https://duelonline.online/) | Public App dialog and dated release notes: phone layout, inspection, story progression, reconnect and deck-draft improvements. No authenticated match test. | Make controls reachable, preserve inspection, offer clear learning progression, and treat reconnect and unfinished deck edits as part of the player experience. |
| [Cardfight!! Vanguard Dear Days](https://vgdd-en.cf-vanguard.com/) | Official tutorial, story and deck-recipe features; official battle screenshot shows phase and Power hierarchy. | Clearly expose current phase, current Power and selected card. Explain a deck's plan with usable examples. Avoid importing the density of a console screen. |
| [Cardfight!! Vanguard Dear Days 2](https://vgdd2.cf-vanguard.com/en/) | Official battle screenshot and Story/Vintage Fight descriptions. | Use curated practice scenarios and clear board targets. This console/PC game is not evidence for phone usability. |
| [MTG Arena mobile design FAQ](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-mobile-faqs-2021-01-28) | Historical official documentation explains touch-specific selection, targeting and full-control interactions. | Adapt interactions to input type rather than shrinking desktop controls. Always provide a discoverable way to inspect and choose. This is design history, not verification of today's client. |

Official Dear Days screenshot sources: [DD1 battle](https://vgdd-en.cf-vanguard.com/wordpress/wp-content/themes/vgdd_en_v1.2/assets/images/common/index/img_system_01.jpg), [DD2 battle](https://vgdd2.cf-vanguard.com/wordpress/wp-content/themes/vgdd2_v0/assets/images/common/index/img_system-01.jpg). Master Duel [official chain screenshot article](https://www.konami.com/games/us/en/topics/1711/).

The recommendation is to improve decision clarity, consequence visibility and continuity. Larger cinematics, more currencies and more panels are not required to obtain those benefits. No reference artwork or game rules should be copied.

## 3. Current strengths and verified gaps

Already present: First Battle, Next Battle, regional/chain lessons, deck learning, Archipelago Challenge under Tutorials, private PvP, shared horizontal card choices, batch costs, short modal names, safe Action confirmation, LIFO cues, pace/graphics settings and automatic ordinary battle results. Improve these systems rather than adding parallel versions.

Local findings:

- The two main duel-background PNGs total 4,369,414 bytes. A lossless conversion now totals 3,179,654 bytes: 1,189,760 bytes (27.23%) saved with identical decoded pixels.
- At 667 × 375, the main End Turn button was about 31px tall. It is now 44px. Small pile/Heart controls remain a gap: some were only 14–34px tall. Enlarging one button does not complete touch optimization.
- Some core layout heights relied on `100vh`; dynamic browser height support is now added. Real browser-bar and keyboard behavior remains to be checked on devices.
- The production main JavaScript chunk is approximately 1.17MB before transfer compression, about 326KB gzip. This is one chunk, not the total application download. Optional modules and graphics loading deserve profiling before splitting.
- Large card galleries previously requested all tile images eagerly. The shared chooser now eagerly loads the first eight and marks the rest lazy, with asynchronous decoding. Browsers decide how far ahead to load.
- Large UI files and overlapping responsive rules make regressions easier. Consolidate only around verified behavior; avoid a broad renderer rewrite during gameplay polish.

## 4. Priority and delivery order

| Phase | Outcome | Status |
| --- | --- | --- |
| P0 | Smaller existing assets and basic viewport/input safeguards | Implemented locally; validation below |
| P1 | Reliable board, hand and zone access across screen sizes | Local implementation and browser sampling complete; physical touch checks pending |
| P2 | Clear choices and consistent live card information | Implemented; current values and skill reasons verified locally |
| P3 | Readable effects and uninterrupted pacing | Local pacing and lifecycle changes implemented and regression-tested |
| P4 | Learning that prepares people for a real match | Deck goals, nine practice decisions and event-based recap implemented; beginner study pending |
| P5 | Measured performance and resilient PvP | Lazy graphics, idle cleanup and local frame check implemented; device profiling and deployed PvP checks pending |

Measure performance throughout. Do not defer a discovered freeze, hidden-information leak or incorrect outcome to a later phase.

## 5. P1: one game, appropriate controls for each screen

### Shared layout contract

Keep the board stable during ordinary selection. Reserve predictable regions for opponent state, play area, current decision and the player's hand. Modal titles, card rows and footer buttons must fit as a unit; no independent title scrollbar. Keep choices in one horizontal row. Allow vertical scrolling only for genuinely long information such as full rules text.

Minimizing a decision must reveal an unblurred board and preserve selections and priority ownership. Browsing the board must never submit a response or advance a waiting decision. Returning restores exactly the same selected cards and order.

Desktop: preserve hover inspection hints, right-click information, visible keyboard focus and generous card sizes. Avoid wasting a large monitor by capping every chooser to phone dimensions. Do not relocate action buttons when text wraps.

Tablet: use available width for more cards, with touch-sized controls and consistent inspection. Do not treat every tablet as either a tiny desktop or a wide phone.

Landscape phone: group primary actions near reachable edges, reserve safe space for browser bars and cutouts, and move secondary utilities into a clearly labeled More menu. Do not hide essential phase, plays, ownership or selection count. Use compact information, not unreadable miniature text.

### Accessible zone and hand access

Add a clearly labeled, at least 44 × 44px Zones entry where small pile controls cannot meet target size. Reuse the existing shared viewer for Heart, Deck, Grave, Exile, Codex and Extra, with explicit owner and zone labels. Direct pile clicks remain shortcuts. Deck and opponent private information retain existing visibility rules; a browser view must not bypass a search skill.

Provide an expanded hand reader for crowded hands. Tapping selects, inspecting reads, and the explicit play action commits. Closing inspection never casts. Swipe and long-press must be distinguished so browsing does not activate a card accidentally. If different response skills share a physical card, show that card once and make its eligible skills explicit.

Acceptance:

- Critical touch controls are at least 44 × 44px, including an accessible route to every zone.
- Desktop mouse and keyboard remain fully usable.
- No page overflow, clipped confirmation button or accidental action on inspection.
- Swiping a gallery, minimizing, resizing and returning preserve selection and order.
- Search works with the virtual keyboard; finishing search restores the gallery without lost choices.
- Pinch zoom remains available. Touch behavior follows [MDN touch-action semantics](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).

## 6. P2: every decision explains itself

Use one concise question per decision: choose a target, select a cost, add a response, or resolve. Use contextual verbs such as Vent 6, Offer 3, Activate, Keep Codex and Resolve chain. Avoid generic Yes where it hides what will be paid. Do not add another confirmation after an already explicit atomic commit.

Every selectable card needs its short name, selection state and relevant value. Full titles remain available in the inspector. Long names must not change card dimensions. Disabled effects need a plain reason: wrong zone, state locked, already used, insufficient eligible cards or wrong timing. Do not rely on color alone.

Unify the information in card inspection, choices and the board:

- Current Power versus printed Power.
- Temporary bonuses, source and expiration.
- Charged/exhausted state and meaningful restrictions.
- Current skill text, actual cost and once-per-turn availability.
- State requirements and their status.

Use game data and computed rules as the source of current information. Where printed card art is outdated, label the rules text as current rather than silently showing conflicting descriptions. Do not automatically rewrite folklore or rules based on a model's guess.

Response and trigger behavior remains the approved contract: pay/commit, opponent gets a response opportunity, a decline locks and resolves the chain in reverse order, and remaining waiting effects are considered afterward. Do not introduce mid-resolution responses. Duplicate waiting events must not look like extra physical copies in hand; preserve underlying event choices while grouping the display.

Acceptance: representative Force, Action, Last Oath, Heart/Vent, continuous bonus and state-gated cards show consistent facts in every view. Cancel before commitment changes no cost, play count or use limit. Each confirmed action commits once.

## 7. P3: show cause, target and result

Audit the existing presentation queue rather than introduce another animation library immediately. Each meaningful effect should make its source identifiable, highlight affected cards, then show the outcome. Preserve one moving card representation: hide the source during travel, and reveal the destination at the correct beat.

For chain resolution, display the active link number and short name briefly on the board, resolve its visual result, then advance. Keep response choices in the single card row. Do not restore the confusing second card strip beside it.

For checks, reveal at a readable size and place the card in its destination. Ordinary hits, defense and broken Barriers use board feedback and existing particles without a blocking result modal. Genuine choices pause; ordinary result announcements do not. Tutorial instructional pauses remain specific to tutorials.

Extend existing Last/History tools where needed so the player can reread a public reveal or recent effect. Preserve privacy and do not reintroduce replay recording. Reduced motion and faster pace must retain source/target/result meaning without delaying or changing rules.

Acceptance: source-to-destination movement, multi-effect chains, Offer/Vent batches and missed attacks remain comprehensible at every pace. Hidden-tab return and interrupted motion clean up visual objects and release input locks. Normal matches never require Continue for a routine result.

## 8. P4: learning beyond following instructions

Preserve the successful controlled First Battle. Extend the route to Next Battle, a chosen deck's plan, relevant short lessons, then Archipelago Challenge. Avoid requiring the user to repeat introductory lessons to reach advanced practice.

Recommended additions:

1. Three concrete goals for each starter deck, using its actual cards.
2. Short practice puzzles for inspecting, defending, saving plays, choosing a response and ordering waiting effects.
3. Optional hints in increasing detail: goal, useful cards, then an exact move.
4. A quick retry of the same scenario and a clear exit back to Tutorials.
5. A small post-match explanation of up to three important turning points, based on actual public events, rather than a large statistics dashboard.

Test with people who do not play TCGs. Measure whether they can complete an unguided turn, inspect a card without casting it, explain a failed action and identify what changed after a chain. Completion of a scripted lesson alone is not proof that the game is understood.

## 9. P5: performance and reliability

Before deeper optimization, record production-build cold/warm loading, requests and transfer sizes; frame times during a quiet board, crowded board and multi-effect chain; and input response during large card browsing. Record device, browser, quality and pace for every measurement.

Investigate optional module boundaries, image decoding and graphics initialization using profiles. Loading fewer initial images follows [browser lazy-loading guidance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading), but it does not by itself establish faster frame rates. Avoid a framework/renderer replacement without evidence.

Use existing graphics settings. Lower quality can reduce particles and costly effects while preserving card movement, result readability and selection. Pause decorative work in hidden tabs, clean up resources on match exit, and verify repeated matches do not continually grow memory.

Private PvP already exists. Validate reconnect during a response, pending-cost choice and chain resolution; server-owned decisions; stale/double input rejection; compatible client/server versions; and restoration of only the correct player's information. Any bug-report export should be explicit and omit hidden opponent state and credentials.

Future installability must explain that installation does not imply offline PvP. Do not add a service worker without version/update handling for rules and assets.

## 10. Validation matrix and release targets

| Area | Required coverage |
| --- | --- |
| Desktop/laptop | 1280 × 720, 1920 × 1080; mouse, keyboard, browser zoom |
| Tablet | 1024 × 768 and 1180 × 820; touch and resize |
| Landscape phone | 667 × 375, 844 × 390, 915 × 412; reduced visible height with browser UI |
| Physical devices | Android Chrome and iOS Safari, including a modest phone; actual models still unknown |
| Lifecycles | Rotation, keyboard, minimize/restore, hidden tab, match exit/restart, reconnect |
| Card scenarios | Large hand/Heart, top-deck ordering, exact-count Vent, Offer 3/Last Oaths, multiple copies and repeated triggers |
| Multiplayer | Two clients, then separate devices/networks; mismatched version and reconnect |

Performance targets, not measured achievements: aim for 60fps on a representative desktop and stable 30fps on the agreed low-end phone at lower quality. Aim for visible ordinary input feedback within 100ms at the 95th percentile. Investigate unexplained main-thread freezes above 200ms. Do not count intentional animation duration as input processing latency.

Release gates: appropriate rule/UI tests and production build pass; no privacy or action-duplication regression; all critical controls reachable; no routine result acknowledgement; physical-device and deployed PvP checks recorded separately. A viewport screenshot cannot close these external gates.

## 11. P0 implementation and evidence

Implemented locally:

- Lossless WebP backgrounds, retaining original PNG artwork. `tools/optimize-duel-backgrounds.mjs` checks decoded pixel equality.
- Dynamic viewport-height support for core screens and board sizing.
- Main-action minimum height on short landscape displays.
- Fine-pointer-only hover lift/hints, preserving keyboard focus cues.
- Coarse-pointer form text at 16px, less intrusive search input attributes, and pinch-zoom-compatible horizontal cards.
- First eight chooser images eager, remaining images lazy, asynchronous decoding.

Validation on 2026-10-02: 67 focused tests passed across seven files; production build passed. The build still reports its large main JavaScript chunk. Browser inspection confirmed the new background URLs and a 44px End Turn button at 667 × 375. A 42-card deck viewer contained eight eager and 34 lazy images, remained face down, and supported horizontal browsing. The viewer fit at 1280 × 720 and 1024 × 768; the board filled 1920 × 1080 without document-width overflow. No browser errors were captured in the final local test tab.

Local screenshot evidence: `.tmp/whole-game-desktop-1920.png` and `.tmp/whole-game-landscape-667.png`. These are local test artifacts, not shipped game assets. The landscape capture also makes the remaining small zone controls and intrusive log placement apparent; P1 is still required. These were sampled board/viewer states, not a completed cross-device test of every screen.

These changes reduce asset bytes and improve basic input/layout handling. They do not complete P1–P5 or prove improved FPS, physical-device behavior, live PvP readiness or balance.

## 12. P1–P5 local implementation

The October 2 follow-up adds persistent Zones and Hand access, owner/zone navigation, privacy-preserving hand inspection, current Power and modifier information, plain skill availability reasons, three goals and three practice decisions for each starter deck, and a small public-event match recap. Existing tutorial lessons remain the interactive board exercises; the new questions complement them rather than pretending to be a new puzzle engine.

The optional particle renderer now loads only for a board, retains tree shaking, stops while idle, and clears transient work when hidden or resized. Motion settles on page exit. Settings includes an opt-in ten-second local frame check; it sends no telemetry. Detailed device profiles, input-latency measurements and repeated-match memory measurements remain validation work, not measured improvements claimed by this release.

The final build passed. The main chunk is 1,058.84 kB / 290.27 kB gzip, plus a lazy effects entry of 126.80 kB / 39.87 kB gzip and renderer dependencies. These are build artifact sizes, not total transfer or a cold-load benchmark. The large-main-chunk warning remains.

Regression run: 92 files passed, two skipped; 860 tests passed, three skipped. The balance benchmark was excluded. The separately added graphics-loading tests passed, and the final focused rerun passed all 12 tests. See [validation record](whole-game-polish-validation.md) for browser evidence and remaining release gates. The earlier P0 evidence above is historical; the accessible controls and compact log changes now address its noted follow-ups.

## 13. Explicit deferrals

Keep sound/music for the later pass requested by the user. Also defer replay video, 3D environments, cosmetic economies, ranked progression and a larger card pool until the basic match remains understandable and reliable. Use current art and card systems throughout this polish work.
