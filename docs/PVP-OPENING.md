# PvP opening and compatibility

The normal PvP flow is lobby (name/deck) → dice → Persona → Codex → joint reveal → battle. No tutorial coaching is involved.

## Deployment

Deploy the game-server and frontend. The server advertises `openingVersion: 1` from `/codex/health`; the frontend echoes that capability when joining. The room enables the staged opening only when both seats support it. No battle-protocol or card-rules revision was changed for this UI feature.

- New frontend + earlier server: show compatibility Persona/Codex selectors before connecting.
- New server + earlier compatible frontend: both seats use the existing lobby setup.
- Different supported UI releases can play together. Incompatible battle protocols or card-rules revisions remain rejected by the existing version guard; accepting them would allow inconsistent matches.
- Reconnection restores server-owned dice, stage and confirmation status. It does not reroll dice or unlock choices.
- A rematch clears opening state and returns both players to the lobby.

## Privacy and loading

The server generates dice with `randomInt`, validates choices against each locked deck and exposes only confirmation flags before both Codex choices are locked. Both players see the selections together at reveal. First player is passed explicitly to the engine.

Background warming starts with the local deck and common battlefield/card-back assets. It never receives an opponent-specific hidden deck asset list. Existing battle preparation and the two-client `loaded` gate remain responsible for the final transition. Optional effects retain their existing fallback behavior.

## Verification

- `npx vitest run src/pvp`
- `npm run build`
- In game-server: `npx tsc --noEmit -p tsconfig.json` and `npm run build`
- Start an isolated server on port 2571 with `CODEX_ORIGINS=http://127.0.0.1:5176`.
- `node tests/pvp/opening.mjs` tests two new clients, setup reconnect, hidden choices, first player, load gating and an older-client fallback.
- `tools/pvp-opening-audit.cjs` uses this workstation's Playwright/Chrome and a frontend at 5176 pointed to that local server. Screenshots go to ignored `art-source/pvp-opening-audit/`.

Live deployment and real-device testing are separate from local verification.
