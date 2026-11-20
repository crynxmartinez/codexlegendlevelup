# Card status overlays

Field-card labels live inside `.card-hud`, separate from the card art's posture.
`syncCardHud` cancels a quarter-turn while preserving the opponent mat's existing
half-turn compensation. The layer follows the card's attack movement. Its
transition timing matches the card in `game-polish.css`, including fast and
reduced-motion settings.

- Top: compact signed Power changes and purple added-skill counts.
- Bottom right: current Power.
- Bottom left: available-ability count.
- Selection captions remain above the card. Heart controls remain in their
  existing slot position.
- Modifier buttons override the global mobile 44px minimum that previously
  enlarged them over the artwork. Players can also inspect the whole card.
- Badge pointer presses do not initiate the card's attack-aim gesture.

Use `tools/card-hud-preview.html` through Vite for an isolated visual check of
both players, positive/negative/continuous effects, multiple badges, and upright
or exhausted cards. This development fixture is not a game route or build input.

Verified 2026-10-09: 23 focused posture, duel-motion and effect-provenance tests
passed. A 700×400 browser preview verified horizontal labels and badge clicks;
the saved comparison is `output/card-hud/mobile-labels.png`. Actual duel startup
rendered the cards; a complete PvP match and physical-phone check were not run.
