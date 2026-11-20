# Codex Legend desktop integration

The Windows x64 desktop edition packages the current game renderer and assets for offline play. Release 1.0.2 uses the existing desktop app identity and save location. Packaging does not launch or install the game, and package verification does not establish visual or gameplay acceptance.

## Build and package

Run these commands from the repository root after installing the normal project dependencies with `npm ci`:

1. `npm run desktop:tools` installs the isolated, locked Electron toolchain. Use `npm run desktop:runtime` only if Electron's runtime download is missing.
2. `npm run desktop:check` runs TypeScript and desktop protocol/backup infrastructure tests.
3. `npm run desktop:build` compiles the current renderer, copies runtime assets, and prepares `desktop-dist/app` with the shell, icon and dependency notices. This recreates only generated staging/build directories.
4. `node desktop/tools/verify-stage.mjs` checks staged hashes, the entry point, direct resources and offline menu adaptation.
5. `npm run desktop:pack` produces `release-desktop/win-unpacked/CodexLegend.exe` and verifies its archive against the staged files. Keep the complete `win-unpacked` folder together.
6. Alternatively, `npm run desktop:dist` produces `release-desktop/CodexLegend-Setup-1.0.2-x64.exe`. Installer tooling may require downloads. The installer does not run the game automatically.

Close the desktop game before replacing an existing package and retain a copy of its entire application folder for rollback. Both packaging commands verify the actual ASAR, Windows x64 executable header and file hashes, writing results to `docs/desktop/evidence`. `node desktop/tools/verify-package.mjs` repeats that verification without launching the game. The installer filename is derived from the packaged manifest version.

`desktop/Create-Desktop-Shortcut.ps1` creates or updates `Codex Legend.lnk` on the current user's Desktop, pointing to the verified unpacked executable. Run it only when a shortcut is wanted; do not change Windows execution policy to run it. Normal `npm run build` and browser development remain independent of desktop packaging.

## Controls, saves and update boundaries

Existing game controls are preserved. F11 toggles fullscreen. Escape retains game back/cancel behavior. The native Game menu provides CL1 import, deck-code export, completed recording transfer, complete backup export/import, previous-backup recovery and Exit. Closing asks before ending an unfinished duel and attempts a recovery backup first. Unfinished duels are not resumed.

The stable identity is `Codex Legend` (`com.codexlegend.desktop`), with persistent session `persist:codex-legend-v1` and origin `codex://game`. Windows saves normally reside in `%APPDATA%\Codex Legend`; the Help menu shows the exact path. Replacing the application folder does not remove this separate save directory, and the installer is configured to retain app data on uninstall. Keep these identity values unchanged across updates.

A complete backup export is a folder containing `codex-backup.json` and referenced `blobs/`; keep them together. Browser and desktop saves remain separate and require explicit import. Build and package commands do not import, clear or migrate player saves.

The offline edition does not start a network server, updater, account or runtime asset downloader; online Play with Friends is unavailable. Explicit external reference links require confirmation and are unnecessary for offline play. After packaging, separately verify a cold offline launch, rendering, audio, game flow, saves and close/reopen behavior before claiming desktop runtime acceptance.
