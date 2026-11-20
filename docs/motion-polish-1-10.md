# Duel motion polish — patch 1.10

## Delivered

1. **Stable board updates.** Retain the board, mats, unit rows, slots, field cards, Barrier sockets, Heart badges and human hand cards. Reconcile child order instead of clearing the application. Preserve animation-owned classes and keyboard focus. Power badges keep one cancellable counting animation.
2. **Pacing.** Shorten attack-declaration and defender gaps. Do not replay local Barrier, Sentry, Persona, Codex or State presentations after hooks already showed them. Preserve the full event history and the remote presentation path. Tutorial decisions still pause deliberately.
3. **Attacks.** Use a short anticipation, contact and return. The impact callback runs at contact, including hit/block feedback, sound and particles. Fast-forward still delivers the result exactly once and skips the return movement. Exhaust/charge posture changes turn in place.
4. **Chains.** Keep original link numbers and short names. A source stays highlighted through that link's targets and result, then clears when the chain completes. Coaching yields to the cue. Cancel, resize, hidden-page and remote-disposal paths remove temporary cues. Engine LIFO and response rules are unchanged.
5. **Connected movement.** Keep a travelling card out of the hand, retain its copy through landing, and update the source after committed Heart movement. Rally is a bounded staggered batch. Opening draws, blockers and Heart batches share the stagger policy. Twenty cards do not add twenty full waits.
6. **Device cost.** Cap decorative particles at 320 on short screens and 800 on larger screens, with smaller density and resolution on landscape phones. Cap simultaneous shockwaves. Stop the renderer when idle; track and cancel delayed strikes. Minimal and reduced-motion settings retain readable outcomes without travel or particles.

No new animation dependency was added. No card costs, legal actions, response priority, privacy rules or deck rules were changed by this pass.

## Verification

- Full Vitest run: **845 passed, 3 intentionally skipped** across 95 files (93 passed, 2 skipped). Includes complete-match simulations, all three decks, chain/PvP rules and journey tests.
- After final cleanup and dev-log changes: **94 focused tests passed** covering motion lifecycle, presentation policy, layout, Heart travel, chain cues, quality budgets and patch data.
- Production TypeScript/Vite build passed. Existing large-main-chunk warning remains (~1.04 MB minified / 286 KB gzip); this pass does not claim to solve initial-download size.
- Real browser fixture: **22 checks passed** at desktop and 844×390. Covers retained focus/no detach, source/destination visibility, exact landing, cancel/resize/fast-forward, contact timing, bounded batches, chain cleanup, Heart cleanup, hand reflow, reduced motion, and ensuring motion completion never submits a choice.
- Live First Battle smoke: opening five-card deal; inspection; hand-to-field call observed with source absent and one flight; correct visible landing; Persona attack and check; Ally attack and Barrier break; opponent call/attack; hand defense.
- Live Chapter 3: Force target/confirmation, attack Force check, Sentry travel and special call, three-link response chain, then a repeated two-link chain after cleanup fixes. Final board contained no chain cues or source/target highlights.
- Actual browser viewports: 1280×720, 1440×900, 844×390, 667×375 and 1024×768. No horizontal document overflow in checked board states; resize left no stranded travel elements. These are browser viewport checks, not physical-device tests.
- An unattended normal-rules demo progressed through turn 5 with no Continue controls, decision dialog or browser error. Desktop evidence: `.tmp/motion-desktop.png`.

## Evidence and limits

- Follow-up draw-phase fix: normal and unavailable-replacement draws now commit before their presentation hook, matching effect draws. This gives the animation its new hand slot to hide during flight. Previously the human target did not exist yet, so the animation silently returned. Both seats, opening draw skips, fallback draws and deck-out are covered by 40 passing focused tests; production build passed. A live normal duel confirmed a travelling card with its hand destination hidden, then no leftover flight or hidden card after arrival.

- `tests/browser/duel-motion.html` is the repeatable local browser fixture.
- `.tmp/motion-chain-mobile.png` captures “Resolving · Chain 2 of 2” at 844×390 with the board still visible.
- No measured FPS uplift is claimed. Decorative work is explicitly bounded, but sustained profiling on a real lower-end phone remains useful before a public performance claim.
- This update is local. Pushing/deployment is a separate action.
