# Battle preparation and source movement

Release scope: shared AI, tutorial and online presentation. Verification details and live-match limits are recorded below.

- Battle preparation now runs before gameplay and before the opening deal, including resumed tutorial sections and private matches. Incoming online frames wait behind preparation and the opening sequence.
- Prepares board/back images and compact card art, fonts, the optional particle renderer, its generated glow/ring textures and first GPU render, effect sounds, and the existing Datu Salik signature clip. No music/video autoplay during preparation.
- Online image preparation uses the public selectable catalogue plus already visible cards, not an opponent's private deck list. Image work has four workers and per-image failure/timeout handling. Loading has a Continue now escape and a 15-second ceiling; optional graphics retain CSS fallbacks.
- Heart activation lights the Heart label while lifting its card over the Persona. Grave activation continues to light its pile and display the actual source before applying its effect. Negated links retain their negation presentation.
- The protocol-2 compatibility adapter now reconstructs explicit public special calls from Deck, Grave, Heart, Exile and Extra to the field, in addition to Deck-to-Grave travel. Private movements are not inferred.
- Removed queue-length acceleration from legacy result cues. Shared timing still respects the player's explicit Standard/Relaxed/Fast choice and reduced-motion setting.
- Available-effect highlights refresh after online presentation ends. A visible pile-top card no longer prevents its zone from also being highlighted. Stable online frames refresh controls after playback.
- The existing red opponent-response edge follows public response priority, including during the player's own turn. It is not an indication of the opponent's private candidate cards.

## Evidence

- Production build passed; existing chunk-size advisory remains. Unused-code typecheck passed before the final test-only additions.
- 54 distinct focused tests passed across playback, legacy public travel, loading/failure handling, chain motion, priority, available effects and movement lifecycle.
- Production-module browser fixture at desktop and 844x390 landscape: renderer reported ready after preparation; no captured warning/error. Heart and Grave: chain presentation approximately 1.7 seconds, followed by approximately 0.9 seconds of source lift/highlight. Deck: highlight, 0.3-second lift, then approximately 1.15 seconds of flight/landing, in order. Red response edge and Exile availability outline visible in landscape.
- Real resumed First Battle displayed the new loading screen with animation/font preparation before resuming its instruction.
- Live server health still reports protocol 2 / submission-clarity-2026-10-04. No server deployment performed. A full two-player live match and physical-phone performance have not been verified in this update.

Loading reduces first-use stalls; it cannot guarantee frame rate on every device or make old servers provide intermediate events they do not send.
