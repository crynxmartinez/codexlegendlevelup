# Codex Legend TCG — source submission

Release 1.0.2
Game source baseline: 8622fbd7c8940daab927c218584a63eca299b153

This folder contains the browser game, authoritative PvP server, offline Windows desktop wrapper, tests, required runtime art/audio/fonts, dependency lockfiles and build tools. It is source code, not the Windows installer.

## Browser game

Install Node.js 22 LTS and npm. From this folder:

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local address Vite prints. For a production build run `npm run build`, then `npm run preview -- --host 127.0.0.1`. The included .env.production contains only the public hosted PvP endpoint; no private signing key is supplied.

## Local PvP server (optional)

In one PowerShell window, from this folder:

```powershell
npm ci --prefix game-server
$env:CODEX_HOST = '127.0.0.1'
$env:PORT = '2570'
$env:CODEX_ORIGINS = 'http://127.0.0.1:5173'
npm run dev --prefix game-server
```

In a second PowerShell window:

```powershell
$env:VITE_GAME_SERVER_URL = 'http://127.0.0.1:2570'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Use separate browser sessions for the two players. The local single-process server generates an ephemeral guest signing key when none is configured. Match rooms do not survive server restarts. Production deployment requires private operational configuration outside this submission.

## Windows desktop

Run `npm ci` first, then follow `desktop/README.md`: `npm run desktop:tools`, `npm run desktop:check`, `npm run desktop:build`, and `npm run desktop:dist`. Installer output is generated under release-desktop. Electron/runtime downloads require internet. The desktop edition is offline; browser and desktop saves remain separate.

## Checks

`npm test`, `npm run audit:assets`, `npm run build`, and `npm run desktop:check`. For server typechecking/build, first install game-server dependencies, then run `node node_modules/typescript/bin/tsc --noEmit -p game-server/tsconfig.json` and `npm run build --prefix game-server`. Full tests include simulations and may take several minutes.

## Contents and exclusions

SOURCE-MANIFEST.json records SHA-256 and byte size for every included release file. This package omits dependency installations, Git internals, generated builds, private credentials, saved player data, the separate marketing website, unpublished Unity experiments, raw artwork/reference archives, pitch recordings and QA screenshot/video archives. Supplied runtime artwork is sufficient to run/build the game; optional artwork regeneration tools may require original design material that is intentionally not distributed. Existing source/asset rights and bundled third-party notices are retained; this submission does not grant a new public redistribution license.

Documentation may include historical reports and machine paths; the commands above are the current submission entry point.
