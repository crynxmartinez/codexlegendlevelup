# Tester clarity follow-up — 7 October 2026

Implemented in the shared game UI for AI, PvP and the five-chapter tutorial.
No translations or game-rule changes. Changes are local, not deployed by this update.

## Delivered

- Compact decisions retain reachable action rows, wrapping button labels and
  short Resume selection controls. Numbered choices survive minimize/restore.
- One keyword help surface supports mouse, touch and keyboard without activating
  a card or dismissing its inspector. Added the missing fixed popup layout.
- Help placement excludes the current target, highlighted tutorial targets and
  action rows. Large explanations scroll in the remaining space. If no coach
  rectangle fits, an explicit Show instruction control opens temporary help.
  Ambient tips skip a placement that cannot be made safely.
- Tutorial instructions, optional Why text and hints use the glossary. Expanded
  basic terms and corrected State timing, Force/check behavior and the final hit
  required after all Barriers are gone. Existing public State progress is retained.
- Input copy follows deliberate pointer/keyboard input with a pointer-capability
  fallback. It does not infer touch from width or change on incidental hover.
- Teaching actions lead with their first instruction; explanatory sentences remain
  in Why. Existing five chapters, outcome-based advancement and progress remain.
  Coaches hide during shared movement and yield to decisions/inspection.
- Card rules are separated into authored paragraphs with recognized labels;
  exact wording is retained. Live skill timing, cost (where supplied by its
  payment descriptor), usage limit and State requirements appear separately.
  Existing current Power, modifier provenance and availability information remain.
- Home is directly available on the game screen. Cancel retains the current
  battle. Confirming abandons local play while preserving completed tutorial
  progress. Online sends surrender before consented room leave and clears tab
  recovery data. Temporary disconnection retains the recoverable seat; a room
  already closed can still return Home.
- Added entries to the current in-game dev log.

## Evidence

- 109 distinct focused checks passed across glossary, placement/input copy,
  preservation of rules text, card choices, movement, tutorial/journey progress,
  next-battle logic and online exit. The initial suite had 108 checks; the final
  exit slice added a closed-room case and reran its 11 relevant checks.
- Production build passed. The existing large-chunk advisory remains.
- Browser: desktop 1280x720, landscape 844x390 and 568x320. Shared chooser fixture
  uses production modules. At 568x320, selected all five cards, minimized/restored
  with 5/5 retained, then confirmed the original order. Checked deck-search/filter
  visibility at 844x390 and keyword help with reachable confirmation controls.
- Real tutorial: keyword controls appear in coach text. Canceling Home retains
  the current step; confirming returns to title. Actual card inspection retains
  the inspector when opening Bayanihan help. No errors in the inspected game flow.
  The real tutorial coach was also checked at 844x390; its measured rectangle did
  not overlap the highlighted Persona.
- Screenshots: `.tmp/clarity-landscape.png` and `.tmp/clarity-card-info.png`.

Physical Android/iOS interaction and live two-player Home/surrender behavior were
not exercised in this update. Server surrender/leave ordering was checked against
the existing handler and with client lifecycle tests. Broader owner playtesting
and previous deployment follow-ups remain separate from this local implementation.
