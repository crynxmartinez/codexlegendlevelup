# Codex Legends — ECC 2.2.3 audit

Date: 9 October 2026. Scope: playable game at `C:/Code/codexlegend`, branch `codex/anime-card-overhaul`, HEAD `5ca72f5`, including current uncommitted artwork, caching and card HUD work. This is an audit, not a release or a set of implemented fixes.

**Readiness assessment: 65/100 — suitable for continued private testing; release checks need repair before wider submission.** This is an engineering judgment, not a measured security or gameplay score. The engine has substantial passing coverage, but the checked-in release workflow would reject the new assets and does not run gameplay tests.

Method: installed ECC 2.2.3 production-audit and security-review guidance; local source inspection, full automated suite, production build, server build/type check, asset inventory, a local cache-state probe, and read-only live health check. No repository upload, external scanner, production mutation, or deployment.

## Findings in priority order

### 1. High — the asset release gate rejects all 423 new card files

Evidence: `tools/audit-assets.mjs:17` reads the two original card catalogues but not `src/data/card-art-v2.json`. Lines 43–46 classify unrecognized files for review and return failure. `.github/workflows/quality.yml:18` runs this before the build.

Observed result: 1,251 files, 216.39 MiB, **zero missing files and 423 review files**. The review list consists of the new artwork exports. This is a checker/catalogue integration failure, not evidence that those images are unused.

Fix: derive required assets from the effective active catalogue and artwork overrides. Separate deliberately retained legacy assets from runtime assets. Do not delete the new art to make the checker pass.

Acceptance: asset audit passes with the new art, still fails for a genuinely missing active image, and flags a deliberately introduced orphan fixture.

### 2. High — CI can pass without testing gameplay or the match server

Evidence: `.github/workflows/quality.yml` runs dependency installation, asset audit and frontend build only. It does not run `npm test`, the server bundle, or the server type check.

Impact: broken targeting, hidden-information filtering, chain ordering or movement presentation can pass the current automated release gate.

Fix: add a required fast rules/PvP/cache/UI test job and server validation. Run long AI round robins separately on a scheduled or release job. Add a two-client local integration smoke test for create/join, ready/load, action/response and reconnect.

Acceptance: a deliberately failing rules or privacy test blocks the pull request; server validation also blocks it. Keep tests tied to the exact release revision.

### 3. Medium — four mobile tests assert the superseded layout

Evidence: `src/ui/mobile-layout.test.ts:25` imports only `style.css` as text. The failing flank tests assert the old barrier gutter and old selectors. Current layout lives in `src/ui/mobile-duel.css`, imported through `style.css:5`; the raw-text test does not follow that import. The new stylesheet restores zone labels at line 60 and provides explicit flank widths. Other board-layout tests do read the new stylesheet.

Observed: four failures for pile labels, barrier placement, mat gutter and flank width. **These failures do not establish that the current rendered layout is broken.** They establish that part of the regression suite no longer describes it.

Fix: replace the obsolete expectations with the accepted corner-HUD layout. Add rendered viewport tests for visible zone labels, reachable confirmation buttons, stable board position during selection, rotated card stacking and modifier badge orientation.

Acceptance: test landscape 700×400 and 844×390, portrait 390×844, and desktop. Check hand, field, deck-order, response and inspection overlays. Confirm on an actual touch device as well; CSS text checks cannot prove tap behavior or overlap.

### 4. Medium — download controls are shared across tabs without ownership

Evidence: `tools/asset-worker.js:8` has one global pause flag; lines 85–90 accept pause/start from any client, and line 15 broadcasts the result to all clients. `src/ui/asset-downloads.ts:13` sends commands based on that tab's home/visibility state.

Consequence: a hidden tab can pause a visible home tab's download; a home tab can resume downloads while another tab is playing. Also, a pause command changes an already complete pack from `ready` to `paused`, making the status misleading.

Verification: `output/ecc-cache-probe.mjs` uses the existing local worker harness. A complete 4/4-byte pack reports `ready`, then a pause command reports `paused` despite remaining 4/4 complete. Cross-tab interference follows from the shared flag and unrestricted client command handling; no real two-tab race test was completed.

Fix: distinguish pack completeness from activity. Track active clients and define an explicit policy for duel priority and user pause. Preserve `ready` for complete packs. Add multi-client worker tests, including hidden-tab and duel/home combinations.

### 5. Medium — server build succeeds while its strict type check fails

Evidence: `game-server/package.json` uses esbuild for build; it does not type-check. Running `npx tsc --noEmit` in that directory reports `src/rooms/CodexMatch.ts(40,10): TS6133`, unused variable `c`.

This particular error is low impact at runtime. The larger issue is that server compilation and strict validation disagree and CI checks neither.

Fix: remove the unused binding and add an explicit server type-check script to CI. Do not weaken the compiler setting to hide the failure.

### 6. Medium — the default test command mixes regressions with long analysis runs

Evidence: the complete Vitest run took **1,432.49 seconds (about 24 minutes)**. Two 100-game analyses each took about 402–404 seconds, and the three-deck round robin took 635 seconds. `src/core/tri-deck-test.test.ts:135` finishes with `expect(true).toBe(true)`; its useful outputs are simulation diagnostics and exception detection, not a balance acceptance threshold.

Impact: slow feedback discourages running tests before changes. A green simulation is not proof of balanced decks, readable animation pacing, or correct mobile interaction.

Fix: separate deterministic regression tests from long simulations. Keep seeded simulations with explicit board legality, termination and conservation invariants. Report balance statistics separately rather than treating one universal win-rate threshold as correctness.

Acceptance: fast required suite completes within an agreed budget; scheduled simulations retain their evidence and fail on concrete invariants.

## Performance and release follow-up

- Production main chunk is 863.66 kB minified / 230.93 kB gzip and triggers Vite's size warning. This is a measurement, not proof of a slow game. Profile first-load parse time and gameplay frame time on a lower-end phone before deciding module splits.
- Public assets total 216.39 MiB. The optional saved-assets pack is separately curated; deployment size is not the initial download size. Test cold-cache, interrupted download, storage denial and slow-network play. Do not preload-decode the entire card collection into RAM.
- The current artwork/cache/HUD changes are uncommitted. A release should include their code, mapping, generated runtime assets and verification together; HEAD alone does not describe the audited tree.
- Private-match restart loss and lack of a connected-player decision timer are documented product limitations. Treat them explicitly when expanding beyond private unranked matches; they are not newly discovered vulnerabilities.

## What is working

- Root type/unused check passes.
- Production frontend build passes; standalone match-server bundle passes.
- Vitest: **1,003 passed, 4 failed, 3 skipped**, across 121 files (118 passed, 1 failed, 2 skipped).
- Separate Node asset-cache suite: **10 passed**. It covers changed revisions, interruption/resume, cache eviction, invalid responses, storage failure, routing boundaries and media byte ranges.
- Rules, catalogue, animation/presentation and PvP tests passed in this run except the four mobile assertions above. Full AI games completed in the automated simulations.
- Server source validates deck setup, checks legal actions and revisions, gates choices by seat, and uses filtered per-player views. Guest tokens are signed and compared with timing-safe checks. These are useful protections; this review does not certify the absence of all exploits.
- Read-only live health request returned `ok: true`, protocol `3`, and content revision `ally-rally-2026-10-08`, matching this checkout. A health response is not a complete online match test or proof of the deployed frontend revision.

## Evidence and limits

Logs: `output/ecc-audit-tests.log`, `output/ecc-audit-assets.log`, `output/ecc-audit-types.log`, `output/ecc-audit-build.log`, `output/ecc-audit-server-types.log`. Cache probe: `output/ecc-cache-probe.mjs`.

Fresh production preview served at `http://127.0.0.1:5183/`. Browser observation reached the home screen and the completed saved-assets message at a landscape viewport. The browser session became unavailable during the attempted duel interaction, so this audit does **not** claim a complete rendered mobile duel, touch-device test, or two-client live PvP test. No dependency vulnerability scan, credential audit, load test, or production restart drill was performed.

## Recommended implementation order

1. Repair the asset catalogue gate, obsolete mobile assertions and server type check.
2. Add the fast required CI jobs and separate long simulation analysis.
3. Fix download ownership and completed-state reporting; test multiple tabs.
4. Complete rendered mobile and two-client PvP acceptance runs, including response indicators, chain pacing, card movement, disconnect/reconnect and cache interruption.
5. Profile a real phone and then address measured loading/rendering bottlenecks. Package and verify one exact release revision before deployment.

No game fixes or push were performed as part of this audit.
