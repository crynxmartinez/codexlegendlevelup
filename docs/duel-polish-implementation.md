# Duel clarity and motion polish

Implemented 15 September 2026. This extends the earlier motion pass without adding Motion, React, or another animation dependency. The existing 2D mat and card artwork remain the presentation surface.

## Reliability

- Presentation reset invalidates the active step. It cannot resume an old source hold and create a new Continue prompt after teardown.
- Reset also releases a pending acknowledgement even if the presentation sink does not settle its promise.
- Shared animations settle on viewport resize and tab hiding, clean up on browser cancellation, and have bounded completion timers.
- Heart journeys now participate in the same cleanup and finish mechanism as other card journeys.
- Reading holds no longer disappear when a player clicks an unrelated card. The existing finish-animation action can shorten these visual holds without submitting decisions.
- Card choices retain idempotent confirmation and preserve their selection while minimized. Over-limit selection now explains how to proceed without replacing the selected count.

## Skill clarity

- Skill explanations appear beside the source card or its pile, constrained to the viewport. Removed the duplicate automatic description for this activation hook.
- Multi-effect activations use a readable `Resolving effect N` badge. The controller's existing trigger chooser and resolution order remain authoritative; no second queue replays abilities.
- Effect targets receive a cyan outline and a pace-controlled target hold.
- Power deltas stay readable for the selected result duration. Reduced motion keeps their text while removing arrow showers and travel.
- Energy changes show signed deltas at the Energy counter. Feedback on one resource no longer erases feedback at another anchor.

## Movement and battle

- Shared flights follow a shallow arc and land at exact destination bounds.
- Normal calls and Personification use the shared flight lifecycle instead of their old fixed-delay lift/slam sequence. Their hand card is hidden throughout transit without changing engine ownership.
- Sentry moves from Hand to Defense, is briefly revealed, then travels face-down to Exile.
- Ward, restoration, destruction, Power gains and Power expiry use shared animation timing and cleanup.
- Existing attack declaration, reaction selection, defense placement, check reveal, shatter and outcome ordering is retained. Action/Force/Sentry eligibility rules are unchanged.
- The unattended demo automatically advances result acknowledgements, including under saved Learning settings. Human decisions retain explicit confirmation.

## Panels and pacing

- Expanding a choice receives the same short entrance treatment as opening/restoring it.
- Minimize exposes its expanded state to assistive technology. Confirmation controls have visible keyboard focus and immediate pressed feedback.
- Existing horizontal browsing, ordered selection badges, inspection, compact check panels and no-blur minimization are retained.
- Learning, Standard, Fast and reduced-motion settings govern the changed effects. Heart movement no longer uses a separate fixed 650ms clock.

## Verification

- Production build passed. Existing large-bundle warning remains; no new dependency was added.
- 166 focused Vitest tests passed: presentation, motion lifecycle, Heart metadata, pace, Force battles, Codex integration and all Babaylan Set 1 tests (including AI matches).
- Browser fixtures at 1280x720, 844x390 and 390x844: 38 panel checks, 16 movement checks and 8 Continue checks per viewport.
- Action-cast browser fixture: 13 checks passed.
- Inspected a live seeded duel on desktop and mobile landscape, including source explanations, signed Energy feedback, attack checks and multiple successive turns. Corrected an old transform transition that briefly slid the source explanation over its card.
- A sampled mobile interval recorded 1,408 frames with no interval over 50ms and no out-of-viewport source callouts. This is a local browser sample, not a guarantee of performance on physical phones.

## Boundaries

These changes do not alter card rules, spend resources, reorder triggers or enable PvP/replay saving. No wholesale rewrite of the presentation queue or visual effects renderer was needed. Full-suite and physical-device certification are outside this verification; the focused checks above are the evidence for this update.
