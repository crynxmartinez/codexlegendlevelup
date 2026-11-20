# Personify cutscenes

Drop a `.webm` into `assets/ui/cutscenes/` and the card gets a cutscene. Nothing is registered in
code — the player derives the filename from the card's id, so adding art is the
only step.

Fires when a player **Personifies into a Level 3 unit**, once per card per duel,
skippable on click. A card with no file here simply plays the normal Personify
animation, so these can be added one at a time.

## Filenames

The card id with `/` replaced by `-`:

| Card | File |
|---|---|
| Kuta Wato Warcaller, Datu Salik | `maguindanao-kuta-wato-warcaller-datu-salik.webm` |
| Veiled Eclipse Maharaja | `maguindanao-veiled-eclipse-maharaja.webm` |
| Blood Moon Bai-A-Labi | `maguindanao-blood-moon-bai-a-labi.webm` |
| The Boar Spear, Makisig | `agta-the-boar-spear-makisig.webm` |
| Arrow of the Sierra, Amihan | `agta-arrow-of-the-sierra-amihan.webm` |
| Voice Beneath the Rain, Laya | `agta-voice-beneath-the-rain-laya.webm` |
| Heart of the Twelve Spirits, Amaya | `babaylan-heart-of-the-twelve-spirits-amaya.webm` |
| Spear of the Emerald Tide, Maraya | `babaylan-spear-of-the-emerald-tide-maraya.webm` |
| Vessel Beneath the Moon, Lunay | `babaylan-vessel-beneath-the-moon-lunay.webm` |

## Format

| | |
|---|---|
| Container / codec | WebM, VP9 |
| Alpha | Optional. The cutscene sits on a dark wash, so an opaque clip is fine — alpha only helps if you want the board visible behind the character. |
| Size | Whatever the art is. The player fits to `min(92vw, 1100px)` wide and 78vh tall, preserving aspect. |
| Length | 3–6 s. Longer is fine here: unlike an idle loop this plays once and is skippable, so mid-clip drift is far less noticeable. |
| Audio | Stripped — the game plays its own cues. |

**No frame.** The card border, name plate, level gem and flavour text should not
be in the video. The player draws the card's name underneath in the game's own
type, and a baked-in frame would fight it.
