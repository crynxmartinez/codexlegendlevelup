# One-shot migrations — DO NOT RUN

Archived October 4, 2026. Files have `.txt` suffixes so they cannot be mistaken
for current executable tools. The old `build_carddata.py` spreadsheet generator
is also archived here; its ignored spreadsheet inputs describe retired decks.

Current data: maintain `src/data/cards.json` directly for retained definitions;
use `tools/import-set-1.mjs` for reviewed `content/set-1.json` changes. Skill text
overrides are loaded by `src/data/loader.ts`. Never run archived generators over
the current catalogue.

These scripts were used once to bulk-populate `src/data/cards.json`. They are
kept only as a record of how that data was first generated.

**Running any of them overwrites card text wholesale and silently reverts
later edits.**

`rebuild-card-data.cjs` did exactly that on 2026-09-01: it deleted every Agta
and Maguindanao card and re-added them from hardcoded Aug-31 literals, which
wiped every `[Auto-Switch]` line, every closing colour tag, and a batch of
text corrections. The damage was invisible in the running game, because the
card *scripts* were untouched — only the rules text players read regressed.

`src/data/cards.json` is now the source of truth. Edit it directly, or with a
targeted script that changes only the fields it means to.
