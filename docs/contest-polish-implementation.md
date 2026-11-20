# Contest polish — 3 October 2026

The owner approved this sequence and will handle playtesting later. This update
does not run a testing pass or add a testing stage. Compilation is separate from
playtesting; neither is evidence of a deployed or contest-ready build.

## Implementation sequence

1. Soundtrack: integrate locally supplied music through the existing audio mixer,
   crossfade scene changes, retain individual volumes, hidden-tab suspension and
   recording support. Journey of Hearts is planned for title/learning;
   Break Those Limits for victory; instrumentals for battles. The owner supplied
   three MP4 files from their local music folder; their AAC audio is extracted
   into M4A without another lossy encode. No YouTube download was performed.
2. Effect readability: preserve linked numbered chains, activation glow,
   source/target/result timing, automatic routine results and connected travel.
   Give paid activations a clear cost label before committing.
3. Choices and card information: retain short names, one horizontal choice rail,
   full inspection, printed/live Power and unavailable-skill explanations.
4. Five-chapter journey: show saved completion and encounter progress, improve
   resume wording, keep optional hints and one immediate instruction.
5. All screen sizes: finish title, journey, credits, room and result layouts;
   landscape mobile uses safe areas, reachable buttons and bounded content.
6. Competitive flow: clear ready/waiting/reconnect/closed-room messages, disabled
   input while disconnected and honest rematch wording. No rules changes.
7. Release and submission: player-facing dev log, credits, synopsis, disclosure
   worksheet and timed trailer/demo scripts. Music exports, recorded footage,
   team details and signatures remain owner-supplied deliverables. Music files
   have now been supplied and integrated.

## Already implemented before this pass

The five chapters; horizontal six-zone viewers; concise support decisions;
normal-game automatic checks; card flight/draw fixes; stable field/hand elements;
linked chains and active-link lighting; reduced motion and particle budgets;
match recap; private invitations and rematches. See the earlier journey, whole
game polish and linked-chain records. Do not treat old verification entries as
new work or assume they cover this pass.

## Release boundary

Client and shared Colyseus match server must carry compatible game rules. Build
and publish the matching pair; do not claim a live update from a local build.
Record actual publication results separately. The user's later playtesting is
not silently marked complete.

## Implementation status

- Soundtrack scene streaming, fades, fallback score, music player, credits and
  individual volume controls: implemented. Audio totals 8,377,001 bytes versus
  19,082,754 original video bytes (56.1% saved); originals unchanged.
- Existing effect sequencing/glow/travel retained; cost decisions now label the
  payment. Vent buttons avoid claiming the printed cost is the discounted cost.
- Five-chapter saved progress and encounter count, plus honest fresh-match labels:
  implemented. Existing short coach, targeted highlights and optional hints retained.
- Landscape room, music, result and journey layouts: implemented; no new browser
  or physical-device playthrough claimed.
- Room copy fallback, short names, Codex inspection, ready/away/error feedback,
  guarded disconnected commands and clear rematch wording: implemented.
- Patch 1.11, soundtrack provenance note, synopsis/disclosure worksheet and timed
  video scripts: prepared under `docs/contest/`. Actual MP4 recordings, final
  attribution, team details and signatures are still needed.
- TypeScript/Vite production build: passed. Existing large-main-chunk advisory
  remains. No automated test suites or browser playtesting run in this pass.
- Publication: client and shared match server published. See
  [the release record](contest/release-1-11.md). No gameplay playthrough is claimed.
