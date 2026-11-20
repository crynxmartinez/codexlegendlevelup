# Manual Codex switching — current rule

Approved November 16, 2026. This supersedes the free manual switches in patch
1.17. The older 1.14 rule also charged automatic switches; that is historical.

- A successful manual Codex switch costs exactly **1 Play** from its owner's
  allowance, shared with normal calls and Actions. It still requires that
  owner's Main Phase. With no Plays remaining, manual switching is unavailable.
- Automatic switches remain optional and free, subject to their existing
  triggers and conditions, including during the opponent's turn.
- Starting Codex selection is free. Canceling, keeping the current Codex or an
  invalid switch spends nothing and does not change the active Codex.
- Each successful manual switch costs 1 Play; there is no separate switch cap.
  Switching away and back does not reset skill usage limits. A resulting effect
  being declined or negated does not refund the completed switch.
- AI battles, PvP and tutorial decks use the same engine rule.

## Shared implementation

`src/core/turn.ts` owns eligibility and payment. Both controller actions and
automatic switches use it. UI confirmations, pile instructions, glossary,
tutorial lessons and Play help explain the same cost.

The rules revision is `manual-codex-one-play-2026-11-16`. Client and match server
must use the same revision; mismatched clients are rejected by the existing
compatibility check. Older local recordings remain version-incompatible rather
than being replayed under changed rules.

The validation below covers the local build; online deployment must be verified
separately after publication.

## Verification — November 16, 2026

- `npm test`: 20 Node checks and 1,516 Vitest checks passed. Three existing
  opt-in cases remain skipped. Includes both PvP seats, all three regional
  pairings, stale submissions, invalid/no-Plays rejection, automatic switches,
  unchanged skill limits and tutorial playthroughs.
- `npm run build`: passed, including TypeScript. The existing large-chunk
  advisory remains. `game-server` build passed.
- Built-in browser: Chapter 4 displays the cost and spends one Play on switch.
  In Practice Duel, a triggered automatic switch preserved all 5 Plays;
  Keep current also preserved 5; manual confirmations reduced Plays one at a
  time to zero. At zero, the pile showed the no-Plays explanation, removed
  switch actions and retained card inspection. No browser console errors were
  reported. Screenshots are in `docs/audits/manual-codex-one-play/`.
- No public deployment or two-browser hosted PvP match was performed for this
  change. PvP checks used the real authoritative MatchSession locally.
