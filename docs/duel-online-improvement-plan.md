# Codex Legends improvement plan

Updated: 30 September 2026. Implemented for private alpha. See
[release evidence and limits](private-pvp-release.md). The owner approved sharing
Chronicles' existing Cloud app; this supersedes the original separate-app proposal below.

## Priorities carried forward

1. Decision previews: improve the existing attack, defense and skill panels with
   current outcomes, remaining resources and uncertainty from checks/reactions.
   Do not add redundant floating panels or predict hidden cards.
2. Deck learning: short game plans, key cards, Level/Energy distributions,
   mechanic filters, sample opening hands and links to existing deck lessons.
3. Archipelago Challenge: three AI battles emphasizing field development,
   resource management and linked effects. Save progress and allow retries.
4. Results: explain how the match ended, link one important event to existing
   history, recommend relevant practice, and provide rematch/change-deck actions.
5. Presentation: retain source/target clarity and rules order while shortening
   repetitive decoration and recovering cleanly after tab suspension.
6. Private PvP: create a room and invite a friend using the reusable Colyseus
   approach in Tavern Chronicles II. This is the first multiplayer milestone.

First Battle, Your Next Battle, advanced lessons, pace settings and action history
already exist in this local checkout. Extend those systems rather than duplicate
them. Keep the 2D field and current artwork. Player-facing deck labels use Luzon,
Visayas and Mindanao.

## Private PvP: verified reference

Reference checkout:
`C:/Code/tavern-lore-chronicles-html5/Tavern Chronicles v2`.

| Reference file | Existing behavior | Codex adaptation |
|---|---|---|
| `src/ui/pvpLobby.ts` | Create `tavern_match`, join by room ID, copy `?room=` invitation, ready states, retry | Reuse the flow with deck/Persona/Codex preparation and Codex styling |
| `src/pvp/client.ts` | Short-lived ticket request, view messages, reconnect token, resync | Add a Codex transport adapter; preserve offline play |
| `game-server/src/rooms/TavernMatch.ts` | Two seats, private listing, server engine, ready/load gates, sequence checks, per-player views, reconnect | New `CodexMatch` room using Codex rules and decision ownership |
| `src/engine/pvpView.ts` | Explicit public view allowlist and opponent-hand redaction | New Codex view for every zone, prompt and event |
| `shared/matchTicket.ts` | Signed expiring identity/team tickets | Separate credentials and deck validation; do not reuse Tavern identities or secrets |
| `game-server/test/rooms.test.ts` | Two-client room, privacy, reconnect and complete-game tests | Reuse testing patterns with Codex fixtures and reactions |
| `docs/DEPLOY.md` | Documents Vercel client/API plus Singapore Colyseus Cloud server | Same deployment shape, separate Codex service/configuration |

Chronicles currently declares Colyseus 0.18 packages. Pin a tested compatible SDK
and server set during implementation; do not assume all newer versions match.
Its deployment documentation is reference evidence, not a fresh production check.

## Player flow

Keep the title screen simple. Add Play with a Friend without replacing the
existing offline Start flow. Inside it offer Create Room and Join Room.

1. Host selects a legal saved deck and creates an unranked private room.
2. Lobby shows the host, an empty second seat, connection status, invitation
   link, Copy Link, and Leave Room. Provide a selectable link if clipboard fails.
3. Friend opens the invitation, establishes their own session, chooses a legal
   deck, and joins. Preserve the invitation through any required sign-in.
4. Both can inspect their own deck and confirm starting Persona/Codex according
   to existing rules. Show opponents only information that the rules make public.
5. Both press Ready. Changing an allowed setup choice clears that player's ready
   status. Freeze setup when both ready states are accepted by the server.
6. Load both battle screens. Start once both acknowledge loading, with a bounded
   timeout and a clear cancellation if loading fails.
7. The server runs the normal opening draw, first-player rules and complete duel.
8. Results offer Rematch, Change Deck and Leave. A rematch requires both players'
   acceptance and fresh match state.

Join errors must distinguish invalid/expired invitation, full room, already
started room, duplicate session and incompatible client version. A third player
cannot occupy a seat. No spectator mode in this first slice.

## Technical boundaries

Retain TypeScript/Vite and the current DOM/CSS/effects client. Run a dedicated
Node/TypeScript Colyseus service with the existing Codex `GameController`, card
scripts, setup and legality rules. Do not port Tavern's battle engine or run an
authoritative second rules engine in the browser.

The initial identity proposal is a server-issued guest session for casual friend
matches, preserving the low-friction learning experience. Use existing verified
Codex account infrastructure if one is adopted before implementation. A display
name alone is never identity. Ranked accounts/database migration are not required
for this initial milestone. Tavern's account endpoints are not directly reusable.

Use the owner-approved shared Chronicles Cloud app with separate Codex room
names, origin policy and guest authentication. Both games share capacity and a
restart window. Codex derives a separate signing domain from the existing server
secret unless CODEX_GUEST_SECRET is configured. Keep a single process for alpha.
Vercel serves the Codex client; no additional paid app is provisioned.

### Authority and information privacy

- Validate deck lists and setup against server-owned card data and current rules.
- Server owns shuffle/seed, turn/phase, Energy, state release, costs and outcomes.
- Send explicit per-seat views, never raw `GameState`, deck order, RNG state or
  full event history. Event filtering alone is insufficient to protect state.
- Apply visibility to Hand, Deck, Barriers, Codex, Heart, Exile and transient
  choices according to actual rules; do not assume every pile is public.
- Send hidden movement counts/card backs without leaking faces through event
  payloads, candidate lists, error messages or reconnect snapshots.
- Remap board orientation through a seat/view adapter; never change server
  ownership merely to keep the local player's field at the bottom.

### Decisions during attacks and skills

Adapt `src/core/game.ts` and the `Chooser` contract in `src/core/effects.ts`.
Normal actions use `legalActions()` and `perform()`. Pending chooser responses
use a separate validated path and may belong to the non-active player.

Each request carries a unique decision ID, owner, match revision, decision kind,
legal opaque candidate IDs, cardinality/order constraints and optional expiry.
Reject wrong-seat responses, stale/replayed decisions, duplicate picks, illegal
targets, invalid counts and wrong ordering. Keep an action mutex while allowing
its owning pending decision to complete; otherwise an awaited choice deadlocks.

Required battle coverage: attacker Force choice and ordering; defender Force or
Sentry choice and ordering; then ordinary defense only if the attack remains;
attack/Barrier checks; simultaneous triggers; multi-card Vent; Offer payments;
deck searches and ordered returns. Clients display these choices through the
existing horizontal panels.

Keep animation acknowledgements separate from rules decisions. A Continue button
for presentation must not re-execute a move or indefinitely block the opponent.
The server sends ordered events; each client presents them at its chosen pace.
Any future decision clock is server-defined and cannot be extended indefinitely
by a browser claiming it is still animating.

### Room lifecycle and recovery

- Private means unlisted; it does not authenticate a friend. Use an expiring,
  unguessable invitation capability plus independent player authentication.
  Copying an invite never copies a session/reconnect credential.
- Proposed unstarted-lobby expiry: 10 minutes, with visible expiry and renewal.
  Do not copy Tavern's 90-second lobby lifetime without adapting it for deck choice.
- Proposed reconnect grace: 60 seconds. Show status/countdown and restore the
  same seat, own hand, revision and pending decision after a brief connection loss.
- Prevent a second tab from controlling the same seat concurrently.
- Casual matches initially have no normal decision clock. The bounded disconnect
  grace still applies; surrender and room cleanup remain available.
- After active-duel grace expiry, award the connected opponent a disconnect win.
  If neither player returns, abandon without a winner. Pre-start departure cancels
  the lobby without a win/loss. Server failure is interruption, not player defeat.
- Initial active rooms are in memory: server restart cancels them clearly.
  Durable restoration of an in-progress resolver is a separate future project.
- Validate protocol and card-content revision before readiness. Drain live rooms
  during deployment; do not silently change card behavior inside a match.

## Delivery sequence and exit evidence

1. Contract and server harness: explicit views/decisions and a headless Codex match.
   Prove both seats, ownership checks, hidden information and legal setup in tests.
2. Lobby slice: create, invite, join, ready, load and cancel with two browsers.
   Verify expired/full/duplicate rooms and setup edits clearing readiness.
3. Complete match slice: connect all actions and choosers to the existing UI.
   Finish a real two-player match with Force/Sentry, multi-select and ordered effects.
4. Recovery/results: test disconnect during a choice, reload/rejoin, stale actions,
   surrender, expiry, double submission, server interruption and rematch.
5. Private alpha: separate staging deployment; desktop/phone on different networks;
   verify all three regional decks, slow loading, mobile backgrounding and updated
   clients. Build/typecheck/tests pass before enabling the player-facing entry.

Required checks include adversarial payload tests and inspection of actual network
messages for card leaks. Reconnect restores current state without replaying old
effects. Both clients agree on the final winner and all public board state.

Defer ranked queues, Elo, global chat, spectating, tournaments, cross-game accounts,
and replay/video export. This update adds private PvP to the plan; it does not
reintroduce the replay-saving feature previously removed.

## Reference limitations found during inspection

On 30 September 2026, four focused Chronicles room tests passed in about 39
seconds: unsigned-user rejection; invite lobby/start, hand redaction and surrender;
rejoin with hand intact; and a complete two-client match with signed-result replay
verification. The test harness uses a local mock callback API. It emitted
non-fatal unregistered `lobby` message warnings. The full suite, production
deployment and Codex multiplayer were not tested by this run.

The Chronicle health test still expects an older content revision than
`shared/protocol.ts`; align version tests when reusing the pattern. Its lobby
broadcasts team composition, its readiness is one-way, and its timer policies are
Tavern-specific. These are reasons to adapt the flow, not copy its room wholesale.

Sources reviewed: local files listed above and the existing Codex PvP audit at
`docs/audits/2026-09-14/mvp-audit-and-pvp-plan.md`. This addendum prefers Chronicles'
Colyseus Cloud deployment shape over that older audit's initial Fly.io suggestion;
the older Supabase account recommendation remains an option, not a prerequisite.
