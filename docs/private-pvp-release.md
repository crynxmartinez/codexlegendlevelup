# Friends and learning release — 30 September 2026

## Delivered

- Decision previews in the support selector, with checks/reactions identified as
  uncertainty. Existing defense and cost previews retained.
- Luzon, Visayas and Mindanao guides: game plan, key cards, Level/type and Energy
  distribution, sample opening hands and links to advanced lessons.
- Mechanic filters in the deck builder.
- Three-battle Archipelago Challenge with completed-stage progress and retries.
- Results linking to the last action, practice, deck changes and PvP rematch.
- Effect sequence source summaries, tab-resume cleanup and compact queued online
  check/effect/result cues. Decisions and private reveals remain explicit choices.
- Private rooms: legal decks, starting Persona/Codex choices, readiness/load gates,
  invitations, reconnect and bilateral rematches.
- Earlier local work included: First Battle, Your Next Battle, horizontal zone
  viewers, local five-question feedback and CSV export.

## Architecture and deployment

Codex runs its existing rules engine on the server. A validated decision gate
waits for the correct seat. Per-seat snapshots hide deck order, Barriers, opponent
hand and RNG seed. Public cards and allowed choices remain visible. Each player
sees their field at the bottom. Power is computed by the authoritative server.

Owner-approved shared app: `1971-tavern-chronicles` at
`https://sg-sgp-94d2af44.colyseus.cloud`. Codex uses `codex_match` and `/codex/*`;
Chronicles keeps its existing rooms and account/result APIs. Vercel serves
`https://game.codexlegendtcg.site`. `.env.production` contains only the public URL.

Rebuild the generated shared server module and source hash manifest:

```powershell
node tools/sync-chronicles-server.mjs 'C:/Code/tavern-lore-chronicles-html5/Tavern Chronicles v2'
```

Commit the bundle with Chronicles server glue, then use that project's existing
Cloud configuration. Verify both health endpoints and a two-client Codex match.
Keep one process; authentication locks are in memory. No paid app is provisioned.

## Verification evidence

- Broad Codex run: 791 passing, three skipped; one outdated effect-depth assertion
  failed. The UI was improved for longer sequences and the same simulation test
  then passed. No gameplay simulation was shortened.
- Follow-up: 36 tests passed for remote choices, privacy, setup/action validation,
  private reveal acknowledgement, challenge progress, sample hands, presentation
  and effect sequences.
- Shared server: all 18 tests passed, including full Chronicles gameplay/result
  replay, reconnect, expiry and restart; new Codex load/choice ownership/privacy,
  invalid guest/origin and surrender tests passed.
- Actual socket games completed all three regional pairings: 95/117/79 moves,
  83/51/34 choices. Each checked hidden zones, invalid invitations, restored hands,
  winner agreement and bilateral rematch.
- Browser: two invitation tabs with different decks, opening draw, owned choice,
  invitation-URL refresh, surrender during a choice and rematch.
- Production dependency audit: zero advisories. Existing development-only
  Vitest/Vite advisories remain; keep development/test servers private.
- Builds/typechecks pass. Vite still reports its large main-bundle warning.

## Alpha limits and rollback

Private and unranked: no accounts, public matchmaking, spectators, ranking,
online match-history storage or replay saving. Invitations last ten minutes
(renewable); dropped seats have 60 seconds to return. Finished rooms allow ten
minutes for a rematch. Connected friends have no decision timer.

Rooms and pending choices do not survive server restart. Both games share
capacity and restart time. Load testing and a real phone plus a second player
on another network remain necessary before a wider multiplayer launch.
Online effects use compact cues and history, not frame-for-frame streaming of
the offline cinematic pauses.

To disable the entry, deploy with an empty production match-server URL; roll
back frontend and shared server together if needed. Preserve Chronicles result
records; never delete its data as part of a rollback.

## Published verification

- Game source pushed: `9acc98e`; Vercel production deployment
  `dpl_5tWL288nDRQjkUWSSo9wuYhAncd9` reported Ready and owns the game domain.
- Shared-server source pushed: `4c471a6`, based on the latest Chronicles changes.
  Both `/health` and `/codex/health` returned 200 after deployment.
- Three complete live Cloud matches passed: Luzon/Visayas 78 moves and 77
  decisions; Visayas/Mindanao 87/41; Mindanao/Luzon 98/26. Each checked hidden
  zones, invalid invitations, reconnect, winner agreement and rematch.
- Production browser verified invitation creation/join with different decks,
  both-ready opening, correct Energy/State panels, surrender during a decision,
  results and last-action history above the result screen. Challenge entry and
  Patch 1.6 are visible. No browser errors were captured during these checks.
- Online instance IDs are randomized before play; concealed opponent movement
  identifiers are redacted. Eleven focused PvP tests passed after this hardening.
- Final shared-server suite on current Chronicles rules: 18 passed. Production
  server dependencies have no high/critical audit findings; 12 low and three
  moderate transitive findings remain.

The original Chronicles working directory was left with its existing local
changes. Release integration used `.tmp/chronicles-release` to preserve newer
remote work. Pull/integrate the latest main before its next deployment.
