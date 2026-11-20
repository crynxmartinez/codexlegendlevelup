# Linked-card chain presentation

The reference is the user's two Yu-Gi-Oh screenshots. This implementation uses existing Codex card art and original SVG chain links. It changes presentation, not activation legality, costs, response priority or LIFO resolution.

- On commitment, show the active card and at most two earlier committed links. Keep original ordinals, including double digits. A small count identifies earlier links outside the display.
- During resolution, show only the current and earlier waiting links. The active card is largest; already-resolved cards disappear from the next cue.
- Use short names, one caption and owner-colored borders. The overlay never accepts clicks; existing decision panels take priority. No Continue button is introduced.
- Use the existing pace, animation and cancellation functions. Resize, orientation change, page hiding, disposal and fast-forward settle temporary visuals. Minimal/reduced motion removes tilt and travel.
- Size artwork using viewport width and height, and use the existing 512px board artwork. Geometry is bounded to three cards and two static SVG connections. No animation dependency is added.
- Optional PvP cue metadata snapshots only committed public links: ordinal, owner and definition ID. Owner perspective is remapped per viewer; costs, receipts, event context and unrevealed responses are excluded. Older cue messages retain their single-card fallback. Live PvP needs the matching server update; no deployment is claimed.

## Verification

- 53 focused tests passed across chain UI, engine ordering, PvP session/privacy and presentation. The additional 13 duel-motion tests passed.
- Production TypeScript/Vite build passed; existing large bundle warning remains.
- `tests/browser/chain-cue.html` exercises the production component. Desktop 1280×720 and landscape 667×375: three-card chain, sixteen-link display, 3→2→1 resolution, bounds and cleanup passed. Reduced motion retained all three numbers without card tilt.
- The fixture preserves a still after each animation for visual inspection; live gameplay does not preserve that still.
- A live Chapter 3 test reached the first target choice, but its browser tab disappeared before commitment. Do not count that as a completed live-chain playthrough. Physical-phone and deployed two-client testing remain unverified.
- Screenshots: `.tmp/chain-cinematic-desktop.png` and `.tmp/chain-cinematic-landscape.png`.

## Follow-up: active light and setup picker

- Only the active cinematic card receives a soft background light, colored by owner. It fades up once on activation/resolution, then leaves with that cue; waiting links do not receive it. Reduced motion keeps a steady, quieter light.
- Persona and starting Codex selection now use equal-width native button tiles, short names and one horizontal rail. Artwork and tile widths are bounded by viewport height and width. The full name remains available in inspection; confirmation is still explicit.
- Fixed the picker to the viewport so an inherited body scroll offset cannot clip its heading. Five cards and Confirm fit at 1280×720 and 667×375 without vertical rail scrolling. Right-click inspection did not select a card; normal selection enabled Confirm.
- Browser evidence: `.tmp/setup-codex-desktop.png`, `.tmp/setup-codex-landscape.png`, `.tmp/chain-activation-glow.png`. Computed styles confirmed that only the active chain card has a background light.
