# Codex Legends

A browser implementation of the Codex Legends TCG. MVP: **Angel deck, player vs AI.**

> **Continuing this project?** Read [`HANDOFF.md`](HANDOFF.md) first — it covers the
> architecture, the rules that are easy to get wrong, and how to add a deck.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Playing

1. **Roll** for who goes first.
2. **Choose your Persona** — any lvl 3 Hero in the deck. Astraea is the only *Angel*-subtype Persona, and Dawn Knight, Cedric only works under her.
3. **Choose your starting Codex** — you may switch once during each Main Phase.
4. Play. **Right-click any card** to open a full-size inspect panel showing the *corrected* card data — the art carries known typos.

Win by breaking all five of your opponent's Barriers, then landing one more hit on their Persona.

## Layout

```
src/
  core/      rules engine — no DOM, fully unit-tested
    types.ts      domain model
    setup.ts      dice roll, Persona/Codex choice, opening board
    turn.ts       phases, energy, calls, Personify, Codex switching
    battle.ts     attack/support/block, attack + barrier checks
    states.ts     Codex State evaluation (Grace)
    handcount.ts  hand size as effects see it (Sabrina counts as 2)
    effects.ts    effect atoms + the async Chooser interface
    game.ts       trigger dispatch, turn loop, legalActions/perform
  cards/     hand-written card scripts (all 23 Angel cards)
  ai/        greedy bot, drives the same action API as the human
  ui/        board, right-click inspect panel, modals
             the mat is drawn in CSS, not a background image, so zones
             and cards line up by construction at any window size
  data/      cards.json (generated) + loader
decks/       decklists
docs/        all documentation (start with HANDOFF.md)
tools/       Python build pipeline
```

The rules engine has no DOM dependency, so the AI, the tests and the UI all drive
identical code. Anything the AI can do, a player can do.

## Data pipeline

Card data was read off the card art (there was no spreadsheet) and lives in
`cards.csv`, the human-editable source of truth.

```bash
python tools/build_carddata.py     # cards.csv    -> src/data/cards.json
python tools/build_spreadsheet.py  # cards.jsonl  -> cards.csv + cards.xlsx
python tools/validate_deck.py      # check a decklist against the rules
python tools/convert_cards.py      # card art     -> WebP (two sizes)
python tools/convert_ui.py         # mat/back     -> WebP
```

### Errata

The art contains known errors, so `cards.csv` carries both the corrected value and
what is printed (`guild` vs `guild_printed`). The right-click inspect panel shows the corrected
data and flags the difference. Current errata:

- **Angel deck guild** — 11 cards print "Ala Rasi Guild"; the deck is all **Hub Nur**.
- **Grace** — reworded to *"at the start of your turn, if you have more cards in hand than your opponent, release until the end of your opponent's turn."*

## Tests

```bash
npm test
```

39 tests: rules coverage in `engine.test.ts`, real-card-data integration in
`angel.test.ts`, and full AI-vs-AI games in `sim.test.ts`.
`balance.test.ts` prints a 60-game report rather than asserting.

Current balance over 60 AI-vs-AI games:

| | |
|---|---|
| Games completed | 60 / 60 |
| First / second player wins | 27 / 33 |
| Turns (min / median / max) | 6 / 9 / 11 |
| Grace uptime | 61% of turns |

## Docs

- [`docs/game-rules.md`](game-rules.md) — core rules, updated as decks go in
- [`docs/angel-deck.md`](angel-deck.md) — Angel mechanics and rulings
- [`docs/engine-corrections.md`](engine-corrections.md) — bugs found and fixed

## Documentation

Everything lives in `docs/`.

| Doc | Read it when |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | You are picking the project up — architecture, conventions, pitfalls |
| [`game-rules.md`](game-rules.md) | You need the authoritative rules (supersedes the v6.7 PDF) |
| [`angel-deck.md`](angel-deck.md) | You are working on Angel, or using it as the template for a new deck |
| [`engine-corrections.md`](engine-corrections.md) | You want the history of rules bugs and how they were found |

## Status

- **Working:** full game loop vs AI, all 23 Angel cards scripted, 51 tests green
- **Next:** the other nine decks — see `HANDOFF.md` §8
