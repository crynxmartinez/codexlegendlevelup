# Codex Legends: current project guide

The playable game supports Luzon, Visayas and Mindanao, five tutorial chapters,
AI battles and private PvP. Play is the first menu action; Tutorial opens the
existing journey. There is no separate Quick Practice menu entry.

## Rules and entry points

- [Energy-free rules and response chains](energy-free-chains-release.md)
- [Manual Codex switching costs 1 Play](manual-codex-one-play.md)
- [Force responses](force-responses-1.15.md)
- [Private PvP](private-pvp-release.md)
- [Submission gameplay polish](contest/submission-polish-2026-10-04.md)

Normal calls, Action cards and each manual Codex switch consume 1 Play.
Automatic Codex switches, starting Codex selection, special calls and skills do
not consume Plays. Other printed costs still apply.
The owner's Play allowance persists through the opponent's turn and refreshes on
the owner's next turn. There is no once-per-turn Codex-switch cap.

## Source layout

- `src/core/`: authoritative rules, costs, chains, state and replay compatibility.
- `src/cards/`: card scripts, including retained historical definitions.
- `src/data/`: runtime catalogue, text overlays and release notes.
- `src/ui/`: DOM board, choices, tutorial, sound and presentation.
- `src/ui/scene/`: unfinished 3D work; exercised by `tools/scene-smoke.html`.
- `src/pvp/` and `game-server/`: private match client, shared contract and server.
- `assets/`: published runtime files only. Generated card/audio/cutscene paths
  are checked by `npm run audit:assets`.
- `art-source/`: editable background originals and reference art; not published.

## Data and artwork

Approved card-frame references and consistency rules: [Card frame standard v1](design/card-frames/v1/STANDARD.md). Read this before creating or editing card artwork; its master images supersede earlier frame concepts.

`src/data/cards.json` retains older definitions and selected cards still used by
the game. Do not regenerate it from the old spreadsheets. `content/set-1.json`
feeds `src/data/set-1.json` through `tools/import-set-1.mjs`. Card-script and
reviewed skill-text overrides are combined in `src/data/loader.ts`.

```bash
node tools/import-set-1.mjs             # after reviewing Set 1 source edits
node tools/optimize-duel-backgrounds.mjs # source PNGs -> lossless WebP
python tools/convert_cards.py --from-web # existing art -> board/thumb sizes
python tools/validate_deck.py            # deck validator; see its arguments
```

The three card image sizes serve different screen sizes. Keep each referenced
variant. [Audio](audio-assets.md), [music](music-assets.md) and
[cutscenes](cutscene-assets.md) document dynamic media loading.

## Quality checks

```bash
npm run check:unused
npm run audit:assets
npm run build
npm test -- <focused-test-file>
```

The normal build also rejects unused declarations and parameters. CI checks the
asset inventory and production build. The asset audit reports unknown public
files for review; extend it when adding a new dynamic URL scheme.

## Historical records

[The old project guide](archive/README-legacy.md), [HANDOFF](HANDOFF.md) and older
design plans describe earlier versions. They are history, not current operating
instructions. Obsolete generators are disabled text in [the tooling archive](archive/tooling/README.md).
