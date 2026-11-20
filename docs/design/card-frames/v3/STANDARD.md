# Approved rounded frame — 2026-10-11

Supersedes v1 frame layout. User approved all six rounded samples and authorized updating the active cards.

- Gold/charcoal border with regional cloth: Luzon yellow, Visayas blue, Mindanao red.
- Faceted gems: Unit/Persona blue, Force orange, Sentry green, Action purple, Codex red without numeral.
- Level numerals use trimmed visible glyph bounds, centered at (146, 132) on the 1060 x 1484 shared template. User approved this correction on 2026-10-11.
- Persona banner only for eligible Personas.
- No title strip, name, power, defense tab, region logo, type labels or flavor sentence on artwork.
- Gold regional Baybayin in a compact black rounded rectangle integrated at the bottom edge.
- Keep illustrations and game rules unchanged. Preserve old masters and exports.

Approved reference: ../samples/tomitay-rounded-bottom-v3.png. Six approved examples: ../samples/rounded-set-v1/.

Production uses the built-in image generator's transparent frame, existing illustration layers and deterministic composition in tools/render-rounded-cards.mjs. Regional glyphs are reused from existing lettering guides. Export with tools/export-rounded-cards.mjs. Sources and generated masters remain in art-source/rounded-v3; runtime files use rounded-v3 paths for cache invalidation.
