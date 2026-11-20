# Codex Legend TCG — Level Up submission

Welcome! This is the public source submission for **Codex Legend TCG, release 1.0.2**.
Explore Luzon, Visayas and Mindanao through a Philippine-inspired card game: learn
in Tutorial, play against AI, or challenge another player in a private browser room.

## Play or download

- **[Play in your browser](https://codexlegendtcggame.vercel.app/)** — AI, Tutorial and private online PvP.
- **[Download the Windows x64 installer](https://github.com/crynxmartinez/codexlegendlevelup/releases/download/v1.0.2/CodexLegend-Setup-1.0.2-x64.exe)** — offline AI, Tutorial and local saves.
- **[Download the complete source ZIP](https://github.com/crynxmartinez/codexlegendlevelup/releases/download/v1.0.2/Codex-Legend-Source-1.0.2.zip)** — one folder with game source, required runtime assets and build instructions.
- **[Release notes and checksums](https://github.com/crynxmartinez/codexlegendlevelup/releases/tag/v1.0.2)**.

For a first visit, start with **Tutorial**. The Windows edition does not include
online PvP, and its saves are separate from browser saves. The installer is unsigned,
so Windows may display an unknown-publisher warning. The browser link above uses
the working Vercel address while the custom domain is unavailable.

## Run the source

Install **Node.js 22 LTS** and npm, then run these commands from the repository root:

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite. See **[START-HERE.md](START-HERE.md)** for
production builds, local two-player setup, desktop packaging and test commands.
This repository includes the browser client, authoritative PvP server, desktop
wrapper, tests and required runtime art, audio and fonts.

The game uses Plays for normal calls, Actions and manual Codex switches. Automatic
switches are free; Energy is no longer a gameplay resource.

## Documentation

[`docs/README.md`](docs/README.md) covers architecture, rules references and data tooling.

| Doc | Read it when |
|---|---|
| [`docs/energy-free-chains-release.md`](docs/energy-free-chains-release.md) | Current Energy-free rules and response chains |
| [`docs/manual-codex-one-play.md`](docs/manual-codex-one-play.md) | Manual Codex switches and Play costs |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Historical architecture notes |
| [`docs/engine-corrections.md`](docs/engine-corrections.md) | History of rules bugs |
| [`docs/README.md`](docs/README.md) | Quick start and project layout |

Existing source and asset rights and bundled third-party notices are retained.
Publishing this submission does not add a new open-source or asset redistribution license.
