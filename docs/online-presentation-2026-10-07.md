# Readable online battles — October 7, 2026

## What changed

Private matches now replay the same presentation hooks as local matches. The server publishes a separate, viewer-safe state snapshot for each hook. The client queues those snapshots and waits for the current animation before applying the next state or showing its decision. The old independent remote-cue renderer has been removed.

This covers calls, draws, defense, check travel, Offer payments, Essence/Vent, pile emissions, Codex switches, chain activation/negation and battle destruction. A resolving link gets its presentation first, then its actual card movements, before the next link appears. Standard pacing gives source activation, attack impact, defense and glass shatter more time. Both players use the same pacing; Fast and reduced motion remain available.

Offered cards highlight before travelling to Grave. Codex switches lift and light the new active card. Barrier glass finishes before the card travels to Check. Opponent response priority is presented from the currently displayed frame, preserving the red edge light throughout the window.

Response choices show the public source card, skill and targets. Waiting skills show their trigger reason. Target/slot/confirmation prompts during resolution identify the resolving source. Rules keywords support click, touch and keyboard hints. Legal skills and current response candidates highlight their own cards or zones; End Turn glows when no legal attacks or skills remain.

## Apu ruling

Each Crocodile-Form Apu that qualifies in Grave when the first Offer occurs keeps that State eligibility for its waiting trigger. One Apu leaving Grave cannot cancel another already-qualified copy by lowering the Garahana count. Source-zone validity, the first-Offer condition and per-copy usage limits are still checked. This exception is explicitly scoped to Apu.

## Privacy and compatibility

Protocol 3 and rules revision `online-presentation-2026-10-07` enable the full presentation stream. Private draws and returns use anonymous card backs. Public reveals expose only the card needed for presentation. Response details include public field targets, never private activation receipts or hidden choices. Reconnect restores the current table without replaying historical hooks; stale queued frames are discarded.

### Rolling-release recovery

The game was published while Colyseus still served protocol 2 / `submission-clarity-2026-10-04`, which caused room creation to fail its version check. The client now reads the uncached server health before matchmaking and accepts only the current pair or that exact supported previous pair. Each room remains locked to the version in its first frame. Unknown versions are still rejected; a failed health request reports temporary server unavailability instead of asking users to refresh endlessly.

The previous server uses an explicit cue-rendering adapter, with cues awaited before the next frame. The protocol-3 hook path is unchanged and is selected automatically when the server updates. The full movement stream and Apu engine fix still require the new server deployment; the adapter does not claim to add engine behavior to the older server.

A live two-seat check using the production server and the same version-negotiation function passed room creation, invitation join, ready/loading, initial decision, hidden-hand privacy and surrender after this repair.

## Verification

- Full suite completed: 939 passed, one old assertion failed because it disallowed newly exposed public targets. That assertion was updated to verify the allowlisted targets and absence of private receipts/prompts; its rerun passed.
- 166 focused tests passed afterward, covering client playback ordering, privacy, sessions, response chains, timing, highlights and all 92 Maguindanao tests. The exact two-Apu/five-Grave threshold case passes.
- Shared match-server build and both real two-seat room tests passed, including protocol-3 presentation packets, seat privacy and pending-decision protection.
- A local two-browser private match reached normal calling, with the departing card removed during travel and the opponent seeing the same call. Repeated browser-tab closures prevented a complete visual match playthrough.
- The actual response component was inspected at 1366×768, 844×390 and 568×320. Controls fit, the short source context needs no vertical scrollbar, and no page-width overflow was found. These are browser checks, not a physical-device or production-match certification.

## Choice-layout and attack follow-up

The added source explanation exposed a fixed-height layout bug: the header, context and minimum card row could exceed the panel, clipping its footer. Choices now use more viewport space, with a shrinking card area and a reserved, centered action row. Ordered choices omit filters. On short landscape screens, source rules are expandable.

Taguwasi and Arawen now use one complete, numbered top-deck order. Protocol-2 clients adapt the old sequential prompts into the same single choice, then submit only the exact remaining card identities. Changed candidates, a changed turn/chain or reconnect cancel that continuation. A real production two-seat check confirmed all three ordered answers were accepted with one visible choice.

Attack declaration now includes a 900 ms approach/hold/return at Standard pace, followed later by a slower strike. The old server's declared-battle snapshots also trigger this approach once per attack; reconnect does not replay an existing battle. Fast and reduced-motion preferences remain respected.

Browser verification: 1366x768, 1200x537, 1121x509, 844x390 and 568x320 ordering panels have centered, fully visible 44 px confirmation buttons; selecting all cards and pressing OK completed successfully. No page-width overflow. The source explanation can be expanded on short screens. This is browser viewport verification, not physical-device testing.

Validation: 96 focused tests passed; the game build, unused-code check, shared-server build and both shared-server room tests passed.

## Source motion and deck-search controls

Shared panels now use accessible 44 px Filter, Expand/Compact and Minimize icons. Deck searches reserve more height for art, remove redundant instructions/type labels, and offer expandable source rules on short landscape screens. Expanding no longer implicitly opens filters; the filter icon's state matches its toolbar.

All play modes use the same source and pile animations. A resolving chain clears before the actual field source or pile lights and its card lifts, with a short zone/name caption. Negated links skip source activation. Non-chain abilities use the same source animation. Card movements light their source, lift, then fly and settle; Standard Deck-to-Grave movement takes approximately 1.7 seconds. Mount Matutun flushes that movement before asking for its Power target.

Current protocol-2 matches recover public Deck-to-Grave events by event ID without guessing private identities or replaying history on reconnect. A two-seat production check using Mount Matutun passed for both players. Protocol-3 uses the shared hook normally. Public chain data now includes the source zone (without private receipts) so paid cards retain their activation origin when the updated server runs.

Browser checks used 1276x508, 844x390 and 568x320: larger artwork, icon labels, filter/search, minimize/restore, and confirmation passed. Observed sequence: chain removed at 1.75 s, source lift shown next for 0.90 s; Deck glow precedes lift and the complete journey finished at 1.76 s. Builds and focused rules/privacy/animation checks passed; full protocol-3 production rollout still requires Colyseus deployment.
