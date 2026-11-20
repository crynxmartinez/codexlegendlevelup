# Fixed Barrier slots — 2026-11-17

When the engine removed the first Barrier, the renderer assigned every survivor to the preceding socket. The shared renderer now leaves consumed sockets empty and preserves all five socket positions. This changes presentation only; damage, reveal, checks, and the existing shatter animation are unchanged.

`src/ui/barrier-layout.ts` derives placement from the remaining count rather than remembered card IDs. PvP intentionally renumbers concealed Barrier aliases in snapshots, so ID-based placement would be unreliable after an update or reconnect. The current engine breaks Barriers in queue order.

## Verification

- **Automated:** 65 tests passed across Barrier layout, shatter cleanup, board layout, mobile layout, and PvP views. Layout tests cover five-to-zero and two-to-zero engine breaks for both players, hidden aliases for both viewer seats, and reconstructed snapshots.
- **Build:** production build passed. Existing large-chunk advisory remains.
- **Browser:** built-in browser only, isolated fixture using the production BoardUI and GameController. Actual attacks resolved against both players. At 1280×720, all ten socket coordinates were identical before and after each side lost a Barrier. At 844×390, a consecutive local break also left all socket coordinates unchanged.
- **Visual:** reviewed completed attack states on desktop and mobile landscape. Evidence is in `evidence/`; `geometry.json` contains before/after bounds. This does not claim frame-by-frame verification of the unchanged animation.
- **Not verified here:** a hosted two-client PvP match. PvP coverage above is automated view/snapshot coverage.
- **Release scope:** the Barrier layout fix, its tests, and this verification evidence only. Unrelated working-tree changes were preserved. Hosted deployment is not verified by these local checks.

The local fixture is `.tmp/barrier-slots.html` (Vite on port 5174). Its buttons exercise actual attacks; recharging and turn switching between examples are fixture setup only. It does not save tutorial progress or modify saved decks.
