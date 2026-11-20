# Energy-free rules and response chains — implementation record

Date: 2 October 2026. Playable repository: `C:/Code/codexlegend`.
Branch: `codex/energy-free-response-chains`. Baseline: `0047874b1a8de9e34a44b314a25805639314eac5`.

## Result

One integrated local release implements the combined specification. Energy is absent
from fresh game state and all 141 selectable cards' loaded rules. Only normal calls
and Actions consume plays. The allowance is the printed Persona level plus broken
Barriers, at least one; already spent plays are preserved when that allowance changes.
Skills, special calls, Force skills, Sentries and relocation consume no plays.

Costs, modes and pre-existing public targets are chosen before commitment. Cancelled
drafts spend nothing. Committed Offer, Vent, Essence, discard and play/use costs
remain paid even if a link is negated or a target leaves. Costs use card identities
and zone-entry snapshots; leaving and returning does not restore a stale target.
Private searches and choices produced by an earlier clause happen during resolution.

After commitment the opponent may add one legal response. Only a real response
passes the opportunity back. One decline locks the chain and resolves newest first.
No choice inserts an effect during resolution. Ordinary cost/resolution triggers
wait; their owner selects the next occurrence as a new first link, preserving
unchosen siblings. Required pending effects cannot be skipped. They do not prevent
a player from declining a response. The initial response permissions are Force
hand skills in their existing windows, plus Sentries against a Persona attack
before checks; this does not grant every blue or green skill an interrupt permission.

Costs appear on the board before the response choice. Each resolving card is
announced separately, and effect movement completes before the next source lift.
The chain viewer labels the newest link first, supports inspection, and minimizes
without blurring the board. An action coach is hidden while a choice panel is open
so it cannot cover the response controls. Check explanations remain available.

## Card migration and teaching

- Active registry: Set 1 plus the three retained Sentries; Omaka-an remains hidden.
- Offer-3 Personas and Last Oaths use the shared cost/chain/trigger engine.
- Stable per-copy and shared-name ledgers prevent leave-and-return refreshes.
  Negation still consumes an activation's use limit.
- Rinayung/Karim tutor follow-ups and Luning's token bonus have shared-name limits.
  Base Last Oath Power is separate from the capped optional follow-up.
- Bunog, Third Victory and Return Our Moon replace Energy rewards. Amuran pays
  Discard 1 for Sipol 3. Other actual card costs and subtype filters remain.
- Attack checks resolve their check bonus; a Force's hand skill is not also executed.
- Continuous/replacement Codex rules do not create artificial chain links. Ordinary
  triggers from replacements wait until the replacement finishes.
- Mandatory end-turn batches are processed again when their deferred triggers
  create a new same-turn expiry (including Crocodile-Form Apu).
- First/Next Battle use plays. The regional prepared boards use current cards.
  “Respond before resolution” is a new five-step prepared lesson; progress IDs
  for existing lessons are preserved. Archipelago Challenge remains in Tutorials.
- Patch 1.7 is in the in-game Dev Log.

Generated sources of truth:

- [Full selectable-card/effect manifest](generated/current-rules-manifest.json)
- [Luzon card guide](agta-set-1-card-guide.md)
- [Visayas card guide](babaylan-set-1-card-guide.md)
- [Mindanao card guide](maguindanao-set-1-card-guide.md)
- [Current game rules](game-rules.md)

Regenerate with `node_modules/.bin/vite-node.cmd tools/export-current-rules.ts`.
The exporter fails on an active card without a script or loaded text mentioning
Energy. The original card illustration files are preserved; text baked into those
images may describe older printings. The current inspect text, guide and manifest
are authoritative. This release does not claim every raster card was redrawn.
Retired scripts and optional legacy Energy fields remain only for explicit
historical fixtures/data compatibility, not the live catalogue or production AI.

## Multiplayer

Protocol: **2**. Content revision: **codex-energy-free-chains-2026-10-02**.
The client catalogue, game state, guest health endpoint and generated server manifest
share these values. Old clients are rejected instead of silently using different rules.

Private frames expose the public chain and the owning player's decision, not cost
receipts, private target declarations, pending opponent triggers or hidden hand IDs.
A suspended match reconnects to its owned decision; duplicate/stale/wrong-owner
answers are rejected. Resolver functions remain in the authoritative controller,
never in the network view. A server restart aborts an unfinished match under the
existing policy; it does not restore executable closures from a saved JSON file.

The generated Codex module is refreshed in the existing Chronicles checkout:
`C:/Code/tavern-lore-chronicles-html5/Tavern Chronicles v2/game-server/vendor/codex`.
Its separate Codex room tests use the exported version constants and explicitly
reject the old version. Existing unrelated Chronicles work is preserved.

## Verification

- Full game suite: **838 passed, 3 skipped**, 87 passing test files and two skipped
  files. The skipped cases are opt-in legacy/extended simulation checks, not failures.
  Run completed at 12:54 local time on 2 October 2026 (489 seconds).
- Production game build and TypeScript validation: passed. Vite retains its existing
  large-chunk advisory; there was no build failure.
- Standalone Codex server build: passed.
- Shared Chronicles server: **18 tests passed**, including real two-client Codex
  ownership/privacy/surrender, old-version rejection, distinct health endpoints,
  and Chronicles full-match/reconnection/restart regressions. Typecheck/build passed.
- Browser: completed all five response-chain lesson steps, verified latest-first
  order, +3000 applied to the selected Persona, zero plays consumed, paid cards
  absent from both hands before the response window, and minimize/restore.
- Responsive check: 1440 × 900, 1280 × 720, 1024 × 768, 390 × 844,
  844 × 390 landscape and 320 × 640 fallback viewports; response panel's
  scrollHeight equals clientHeight (386px), controls fit, board blur is absent,
  and the action coach does not overlap the picker. Browser console had no errors.
- Original First Battle browser smoke: opening five-card animation, current card
  inspection, normal call into the highlighted slot, and one play consumed verified. Full prepared match
  outcomes are covered by the automated First Battle regression; a fresh full
  manual browser playthrough is not claimed.
- [Desktop response screenshot](evidence/energy-free-chains/desktop-response.jpg)
- [Phone response screenshot](evidence/energy-free-chains/phone-response.jpg)
Focused results already include real Offer-3/Last Oath chains, three-link alternating
responses, declined self-chaining, negated-use consumption, stale target/cost identities,
full-batch payments, regional card suites, deferred end-turn expiry, and an actual
MatchSession with two seats and a pending response/resync.

The [paired comparison](generated/rules-balance-comparison.md) completed **900 games
per version, 1,800 total**, using the same 100 seeds for all nine ordered regional
matchups. Both versions finished every match, with zero errors, first-turn wins,
or unchanged consecutive action snapshots. Mean turns fell from 11.0 to 8.5;
mean decision count stayed similar (87.4 to 88.3). The longest observed new chain
had four links. These are exploratory bot results, not proof of competitive balance.

The starting player's win rate increased from **55.1% to 63.0%**. Excluding mirrors,
Luzon won 70.0%, Visayas 39.5%, and Mindanao 40.5% under the new rules. These larger
samples supersede the earlier 90-game balance sample. Keep the starting-player
advantage and Luzon/Visayas matchup visible in human playtests before public release.

Focused review after the shift checked the Visayas starter's Amara/Heart paths,
remaining Vent requirements, selected once-per-turn caps, and the normal bot's
board/state evaluation. The regional suite and complete games did not expose a
new eligibility failure. The comparison changes both rules and their legal AI
choices, so it cannot attribute the shift to a single card or Energy alone.
No speculative power adjustment was made to force equal bot win rates.

Measurement limits are explicit in the report: draws/restands are not consistently
emitted as events, so their raw counter zeroes are **not** total gameplay counts.
Complete draw/attack/restand instrumentation remains a follow-up. Heart and chain
peaks are sampled at decision/action boundaries. The finished-match and per-seed
winner results are complete; no missing measurement is disguised as a passed gate.

## Coordinated release / rollback

No production push, hosting deployment or shared-server restart was performed.

1. Keep a snapshot of both current deployed builds and the current generated server
   bundle. Let active shared-server matches finish before the restart window.
2. Run game tests and build, regenerate the Codex bundle, run the shared server's
   tests/typecheck/build. Commit only reviewed files in each checkout; the shared
   checkout also contains unrelated user changes.
3. Publish the matching shared-server build and client together. Until both are
   current, version mismatch must show a refresh/update message rather than start
   an incompatible match.
4. Confirm `/codex/health` reports protocol 2 and the exact revision above, while
   `/health` continues to identify Chronicles and its own independent protocol.
5. Verify a fresh two-player invite, one paid response chain, reconnect to a pending
   choice, and surrender/rematch. Also check Chronicles room creation.
6. Roll back both the game client and generated server bundle as a pair if needed.
   Do not downgrade one side while leaving the other accepting the new rules.

External checks still needed before calling the public release verified: a physical
phone on a separate network, deployed health/version checks, and human play balance.
There is no new public matchmaking, replay-saving restoration or content expansion.
