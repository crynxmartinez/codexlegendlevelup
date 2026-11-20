# Full-screen background artwork v1

Source: `art-source/duel-backgrounds/fullscreen-fractured-v1.png`
Runtime asset: `assets/ui/fullscreen-fractured-v1.webp`

Generated as a new 2D full-screen background using
`art-source/duel-backgrounds/game-mat-fractured-v1.png` as a style reference. The original mat is
unchanged. The artwork fills the duel screen behind both mats and the hand.
`#app:has(.board-wrap)` applies it only while the battlefield is present, using
centered `cover` sizing for landscape and portrait screens. Title and tutorial
menus retain their existing backgrounds. No overlay intercepts card interaction.

Direction: dark ocean-atlas and fractured obsidian, antique gold contour lines,
subtle teal-lit cracks, detail concentrated along the edges. Quiet dark center
and bottom center leave space for two mats, cards, hand, and interface. No trees,
characters, buildings, card slots, writing, logos, or rectangular mat border.

Requested landscape 16:9 at the highest available resolution. Actual generated
PNG resolution: 1672 × 941. This is the native output, not a 4K upscale.

Source: built-in image generation, output
`exec-2d123dec-b35d-4992-b6af-2c5802583ab8.png`.
