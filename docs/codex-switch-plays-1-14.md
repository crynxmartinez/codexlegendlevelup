# Codex switches use plays — 1.14

Each successful manual or automatic Codex switch spends one play from its owner's allowance. There is no separate per-turn switch cap and switching last turn does not prevent automatic switching this turn.

- Manual switches remain available in the owner's Main Phase.
- Automatic switches remain optional and require their printed timing and conditions.
- An automatic switch during the opponent's turn spends the owner's remaining plays. Plays refresh at the start of that owner's next turn; future plays cannot be borrowed.
- Starting Codex selection, declining a switch, and selecting the already active Codex do not spend plays.
- Calls, Action cards, and Codex switches share the allowance.
- Printed skill limits still apply. Switching away and back does not reset a Codex skill's usage.
- Activating an active Codex's skill does not itself spend a play. Negating a resulting effect does not refund an already completed switch.

The engine, solo AI, current Codex descriptions, tutorial instructions, switch confirmations, and availability messages use the new rule. Confirmation shows the one-play cost before committing.

## Verification and release status

124 focused checks passed across 11 files, covering switch payment, repeat switches, automatic switches on either player's turn, independent Codex skill usage, chain behavior, tutorials, AI tactics, and private-room decisions. Client and match-server builds passed. The card chooser was checked at 1366×768, 844×390, and 568×320 with a visible, usable confirmation button and no browser errors.

This is a local implementation, not a live deployment. The rules revision is `codex-switch-plays-2026-10-03`; the client and match server must be deployed together for private rooms. The proposed response cards are not included in this release.
