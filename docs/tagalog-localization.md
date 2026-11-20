# Tagalog card display and review

All 141 active Set 1 cards have authored Tagalog names and rules in `src/localization/tl/`, grouped by deck. English remains canonical in `src/data/loader.ts` and the engine. Card IDs, scripts, costs, stats, frames and artwork are unchanged.

Tagalog is the default card-display language. Settings > Language / Wika offers Tagalog and English and saves the preference. Reopen card panels after switching. This is card localization, not a full translation of menus, tutorial dialogue, glossary definitions or every dynamically generated game prompt. Unknown effect text falls back to English rather than guessing a translation.

## Editorial guide

- Translate whole thoughts naturally, preserving exact mechanics.
- Card: baraha; discard: bitaw (bitawan / bumitaw in sentences).
- Release: Pakawalan (napakawalan for the released state).
- Activation: pag aktiba; turn: turno; end of turn: pagtatapos ng turno.
- Gets Power +5000: bigyan ito ng Power +5000.
- Return: magbalik ng isang Level 2 o mas mababang Unit mula sa iyong Grave papunta sa iyong kamay.
- Keep Persona, Garahana, Sipol, Bayanihan, Andukha, Essence, Vent, Offer, Last Oath and other mechanics keywords. Preserve character and place identities. Write distinctive Tagalog epithets rather than literal translations of the English title.
- Preserve per-copy versus shared-name limits, optional effects, thresholds, durations, zones, sequence, costs, signs and numeric values.

## Review

Open `/translation-review.html`. Every translation is still an editorial draft; the user requested them as the default display while reviewing. Review approvals do not change runtime rules or automatically publish browser edits. Export the JSON review backup and use it for the next authored revision.

Reviews persist at the current browser origin. Changing host or port uses different storage. Updated published drafts flag older saved reviews for revision without overwriting edits. “Use updated translation” keeps the previous wording in the exported entry's `previous` field.

Structural tests cover all active IDs, numbers, tags, terminology and English isolation. They do not certify literary quality or cultural interpretation; titles and prose remain subject to the owner's individual approval.

## Creative-title approval (2026-10-12)

Open `/title-review.html` for all 141 active cards, with 3 creative options each (423 total). Actions appear first; filters include Action, Unit, Sentry, Force, Codex and Persona. The owner explicitly approved all recommendations, including newly authored titles, on 2026-10-12. Option A is now published in the Tagalog game display, not just a proposal. Proper names remain intact; established Tagalog descriptors such as Tunung ng Tubig and Bundok Lantoy are retained. These are creative names, not traditional epithets.

Action titles use 1–4 words and read as card names, not sentences: Punit na Langit, Luha ng Lantoy, Tanghaling Dilim. Other epithets use up to 5 words. Codex titles evoke places; Units, Forces and Sentries get distinctive epithets too.

Title choices, custom wording, notes, requests for another direction and skips use their own `codex.tagalog-title-review.v1` browser-storage key. They never approve skills or overwrite the existing translation review. Editing a chosen title resets its approval; a changed proposal baseline flags saved decisions for re-review. Export title decisions to share them for the next publishing step.

`title-proposals.json` holds Persona choices; `title-options.json` holds the other types. `PUBLISHED_TITLES` selects the owner-approved first choices. `drafts.ts` applies these names over the original locale JSON and updates exact full-name references in localized skills; skill prompts use the same name-reference update. English records, IDs, gameplay, frames and mechanics are untouched. Browser decisions default to the published approval only when no saved decision exists; prior browser edits are preserved. Subsequent edits do not automatically republish names and must be exported. The published-title label always shows what the game actually uses.
