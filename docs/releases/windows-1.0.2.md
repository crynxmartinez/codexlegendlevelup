# Windows 1.0.2 and approved symbol release

20 November 2026.

Includes the approved Power/Defense/Barrier/Plays symbols, Ally/Persona skill emblems, and Baybayin battlefield star. Card artwork, values, legal decisions, saved decks and the desktop application's identity are unchanged.

- Public installer: https://github.com/crynxmartinez/codexlegend-downloads/releases/tag/v1.0.2
- Private game release: https://github.com/crynxmartinez/codexlegendtcggame/releases/tag/v1.0.2
- Website: https://www.codexlegendtcg.site

The downloads repository contains installer binaries only. Existing game and marketing source repositories remain private. Installer assets belong in Releases, outside Git source history.

## Verification scope

Before publication, the complete local suite passed: 1,687 Vitest tests passed, 3 skipped, plus 20 Node asset/profile checks passed. The asset audit found no missing runtime files; game-server TypeScript passed. The browser production build passed. The stat symbols were checked in the built-in browser at 1280×720 and 844×390, including nested inspection and defense selection/confirmation.

Desktop packaging uses the existing Windows x64 NSIS configuration, retains application data on uninstall, and does not start the game after installation. Stage/package verification compares the actual ASAR contents to staged hashes and checks the x64 executable and bundled resources. Release attachments include the installer and its SHA-256 checksum.

This is an unsigned installer. Packaging and content verification are not a fresh Windows install/uninstall or cold offline gameplay test. The desktop edition remains offline; it does not add online PvP. No changes were made to the user's installed game or browser profile during packaging.

The separate local submission ZIP contains one root folder with browser, server and desktop source, required runtime assets, lockfiles and rebuild instructions. Dependencies, caches, build outputs, private credentials and unrelated Unity/design experiments are excluded.
