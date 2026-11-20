# Saved game assets

The game home starts a nonblocking download of the active Agta, Babaylan and
Maguindanao artwork, board graphics, fonts, effects audio, shipped animation
video and music. The current pack is about 98 MiB. It excludes hidden cards,
source PNGs and unused UI experiments.

Downloads run silently, with no progress text, bar or buttons. The queue pauses when the menu is
left, the tab is hidden or connectivity is lost. At most two existing transfers
finish after a pause. Browser Data Saver starts paused. Failed downloads retry
on reconnection or periodically while the home is visible.
The next visit checks saved entries and resumes missing files.

## Implementation and updates

- `tools/asset-pack.mjs` builds an explicit allowlist from the active artwork
  mapping and shipped media. Every entry has a SHA-256 revision and byte size.
- Vite serves/emits `/asset-worker.js` with that manifest embedded. Registering
  it bypasses the HTTP cache for worker update checks.
- Only exact same-origin media URLs are intercepted. Pages, JS, CSS, match
  state, room requests and all third-party requests use the normal network.
- Cache Storage `codex-game-media-v1` uses URL + content revision keys. New
  media is verified before saving. Unchanged files survive a new worker;
  obsolete revisions are removed after replacement. No app reload is forced.
- Complete cached media supports byte ranges, including the animation video
  and soundtrack. Partial network responses are never saved as whole files.
- Quota/private-browser failures stop bulk saving and retain normal network
  loading. Missing or evicted assets are fetched again. Storage is not permanent.
- The existing duel preparation still decodes required card art and initializes
  animation/audio engines. Saving files does not keep every portrait decoded in
  RAM, and audio still respects the browser's interaction requirement.

HTTPS is required outside localhost. This is an asset cache, not offline PvP
or a complete offline game installation. The separate marketing site's existing
connection warm-up remains; its origin cannot populate the game's Cache Storage.

## Maintenance and checks

When adding active art, update `src/data/card-art-v2.json` with the runtime
exports. Add new effect files to the manifest builder when introducing new
effect media outside the current audio/font/music folders. Do not include the
high-resolution generation sources.

Run `npm run test:asset-cache` for persistence/restart, partial updates,
interrupted transfers, pause/resume, storage failure, corrupt response rejection,
media ranges and network-isolation checks. Run the duel-loading/artwork Vitest
tests and `npm run build` as integration checks.

Browser verification: confirm that the home screen has no download panel, then
inspect media requests and Cache Storage using browser developer tools. Check a phone-sized
landscape viewport. For a truly cold test, use a separate browser
profile or localhost port; do not erase a player's other site storage.

Reference: [MDN service-worker lifecycle and caching](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Verification — 2026-10-09

- 10 asset-cache tests passed; 16 focused duel-loading/artwork tests passed.
- TypeScript and the production Vite build passed.
- Browser: development and production-preview home screens reached saved
  status. Reload reused the pack. Production Pause/Resume worked, entering Deck
  paused saving, the Deck screen opened, and returning home finished the pack.
- The new status was checked at 740×360 and 390×844; the Resume button retained
  its 44-pixel touch height. These are browser viewports, not physical devices.
- Network loss, storage rejection and partial asset updates were tested in the
  worker harness. No live PvP match or production deployment was performed.
- Screenshot: `output/asset-cache/saved-home.png`.
