# Browser and PvP release — 13 November 2026

Publishes the approved anime menu, battlefield, decision UI, portraits and
runtime assets together with their existing shared engine integration. The
latest PvP repair retains public defenders through check snapshots, prevents
duplicate result presentations, discards stale callbacks after reconnect, and
publishes a new revision when surrender ends a match. Animation durations were
not globally shortened or lengthened.

The UI asset registry is explicit. Previously published anime-v2 card exports
remain available for old clients; the asset-cache test now checks the exact
current catalogue URLs rather than assuming that all frames use anime-v2.

## Release checks

- Browser TypeScript/Vite production build passed (existing large-chunk warning).
- Asset inventory: no missing or unregistered assets.
- Targeted PvP/presentation/combat-clarity tests: 122 passed.
- Asset cache tests: 10 passed.
- Standalone match server and shared Colyseus server builds passed.
- Shared-server socket/API suite: 21 passed, including Codex and the co-hosted game.

The full long-running simulation suite was not rerun for this push. Earlier
broad UI testing found four stale source-shape expectations in
`battlefield-presentation.test.ts` and `mobile-layout.test.ts`; those are not
represented as passing here. Local paired-browser repair evidence is in the
ignored `art-source/ui/pvp-presentation-repair-v1` directory. Recordings under
network stress, mixed real-device pacing, and independent readability testing
remain outstanding. Passing automated checks does not prove comprehension.

## Deployment dependency

The website deploys from this repository. Online matches run the generated
`game-server/vendor/codex` module in `crynxmartinez/tavern-chronicles`.
Both sources must be published; verify the Colyseus deployment separately.
Only the generated Codex module and manifest are changed in that shared
repository. Its other game code and local Unity work are outside this release.

Private diagnostics remain off by default and are development-only. Local
credentials, submission forms, source art, recordings and Unity files are not
part of this commit.
