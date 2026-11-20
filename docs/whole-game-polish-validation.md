# Whole-game polish: local validation

Date: 2026-10-02. Playable checkout: `C:\Code\codexlegend`.
Scope: desktop, tablet and landscape phone UI; local changes only, not deployed.

## Delivered

- Persistent Zones and Hand shortcuts, a shared owner/zone reader, horizontal cards and preserved private information. All six public zone categories and the player's own hand are reachable. Opponent hand is not an option; Deck cards remain hidden.
- Larger touch controls and phone-safe viewer sizing. Compact screens use History through More rather than an overlapping log. Desktop Settings is positioned below the new shortcuts.
- Live field Power versus printed Power, modifier source/expiry, charged status and explicit skill state/usage/zone reasons. Inspecting never commits a play.
- Existing chain and ordinary-result pacing retained, with page-exit motion settling and idle/hidden particle cleanup.
- Three goals and three practice decisions for each starter deck. Feedback and retry complement the existing interactive lessons. Normal match results show up to three recent meaningful event groups, with links into existing history.
- Smaller lossless background files, progressive chooser artwork, lazy optional particle renderer and a ten-second local frame checker. The checker stops if visibility or viewport size changes; it is disabled outside a match.
- Patch 1.8 dev log and updated implementation checklist.

## Automated checks

- `npx vitest run --exclude src/core/balance.test.ts --reporter verbose`: 92 test files passed, two skipped; 860 tests passed, three skipped; 587.59 seconds. Includes card sets, rules, presentation, lessons and PvP. The long balance report was excluded; no new balance claim follows from this UI release. Output: `.tmp/polish-tests.log`.
- Additional graphics/skill/recap/performance and PvP/dev-log run: 34 tests passed across nine files. This overlaps the broad run and is not added to its total.
- Final focused graphics/skill/recap/performance rerun: 12 tests passed across four files, including interrupted frame-check cleanup and restart.
- Production TypeScript/Vite build passed. The large main-chunk warning remains. Artifact sizes are recorded in the implementation plan; these do not measure real network loading.
- `git diff --check`: no whitespace errors; repository CRLF warnings only.

## Browser checks

Local Codex Chromium browser, Vite development build; these are viewport tests, not physical-device tests.

- 1280 × 720: shared hand reader, two physical copies shown, inspection did not cast.
- 667 × 375: hand viewer at x=8, y=8, 651 × 359; full card tiles and Close visible, no document-width overflow. New shortcuts no longer overlap the viewer header.
- 1024 × 768: 42-card Deck viewer at x=8, y=320, 1008 × 440; no document-width overflow; cards remained face down.
- 1920 × 1080: board and normal-match setup; corrected overlap between Settings and the Hand shortcut.
- 844 × 390: normal board, More/Settings/Hand/Zones, readable current state and opening a recap entry after a test surrender.
- Owner switching removed the Hand choice for the opponent and selected Heart instead. Current Persona inspection showed Charged, current/printed 11,000 Power and a locked Bayanihan requirement.
- Mindanao deck-guide practice: wrong-answer explanation, correct-answer feedback and enabled Next decision verified. Existing lesson links remain available.
- Normal match: completed a real Taguwasi top-deck effect, then a disposable test surrender. Key moments appeared and opened the recorded exchange. No extra Continue was required after ordinary effect resolution.
- Settings frame check produced a local report; because the viewport changed during the initial sample, its number is not retained as a benchmark. The checker now rejects resized samples rather than mixing dimensions.
- Final normal-match browser error log was empty.

Screenshots (local artifacts): `.tmp/polish-final-landscape-667.png`, `.tmp/polish-final-tablet-1024.png`, `.tmp/polish-final-desktop-1920.png`, `.tmp/polish-final-board-844.png`.

## Open release gates

- Physical Android Chrome and iOS Safari: touch swipe versus long press, software keyboard, safe areas/browser bars, rotation and pinch zoom.
- New-player testing of independent turns; question/lesson completion is not evidence of actual understanding.
- Production cold/warm loads, crowded-chain frame profiles, input-latency percentiles and repeated-match memory checks on agreed hardware. No broad FPS or battery improvement claim yet.
- Deployed private PvP with two devices/networks, reconnect during costs and chains, and client/server version compatibility. Local tests passed; this turn did not deploy either service.
- Historical balance report and real-player balance feedback remain separate from this UI release.

The local implementation is ready for review. These external validation gates remain visible and are not marked complete by viewport screenshots or unit tests.

## Screenshot follow-up: support, check labels and Codex cards

- Replaced the support paragraph with short attacker name, per-card Power contribution and one live Attack / Exhaust total. Retained explicit attack confirmation and supporter rules.
- Turn and phase edge labels hide while an informational check notice exists and return after it closes. Verified the real notice component with the actual styles in an isolated browser fixture at 667 × 375 and 1280 × 720.
- Removed per-card Switch Codex buttons. Clicking an eligible Codex commits that specific switch; right-click, long-press and keyboard inspection remain separate. Other pile viewers retain their inspection behavior.
- Browser verification: the Codex lesson showed four eligible card actions with no embedded buttons; right-click opened Salikan information without switching, and the subsequent click displayed Codex switched. Support selection changed the attack from 11,000 to 17,000 with one 6,000 supporter, retained across resize.
- 34 focused chooser/notice/privacy/availability tests passed. Production build passed; the existing chunk-size warning remains.
- Screenshots: `.tmp/support-clean-final.png`, `.tmp/codex-no-buttons-landscape.png`.
