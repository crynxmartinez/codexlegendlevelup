#!/usr/bin/env python3
"""Validate a decklist JSON against the deckbuilding rules in docs/game-rules.md."""
from __future__ import annotations

import csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECK_SIZE, MAX_COPIES, MAX_FORCE, MAX_SENTRY = 50, 3, 12, 3
MIN_CODEX, MAX_CODEX = 3, 5
COPY_OVERRIDE = {"steam/engine-core": 8}   # card text overrides the 3-copy rule


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "decks" / "angel.json"
    deck = json.loads(path.read_text(encoding="utf-8"))
    index = {r["id"]: r for r in csv.DictReader(
        open(ROOT / "cards.csv", encoding="utf-8-sig"))}

    errors, warnings = [], []
    total = 0
    counts = {"Force": 0, "Sentry Action": 0}
    levels: dict[str, int] = {}
    guilds: set[str] = set()

    for entry in deck["main"]:
        cid, n = entry["id"], entry["copies"]
        card = index.get(cid)
        if not card:
            errors.append(f"unknown card: {cid}")
            continue
        if card["card_type"] == "Codex":
            errors.append(f"Codex card in main deck: {cid}")
        cap = COPY_OVERRIDE.get(cid, MAX_COPIES)
        if n > cap:
            errors.append(f"{n} copies of {cid} (max {cap})")
        total += n
        counts[card["card_type"]] = counts.get(card["card_type"], 0) + n
        levels[card["level"] or "-"] = levels.get(card["level"] or "-", 0) + n
        guilds.add(card["guild"])

    if total != DECK_SIZE:
        errors.append(f"deck is {total} cards, must be exactly {DECK_SIZE}")
    if counts.get("Force", 0) > MAX_FORCE:
        errors.append(f"{counts['Force']} Force cards (max {MAX_FORCE})")
    if counts.get("Sentry Action", 0) > MAX_SENTRY:
        errors.append(f"{counts['Sentry Action']} Sentry (max {MAX_SENTRY})")
    if len(guilds) > 1:
        errors.append(f"deck mixes guilds: {sorted(guilds)}")

    codex = deck["codex"]
    if not MIN_CODEX <= len(codex) <= MAX_CODEX:
        errors.append(f"{len(codex)} Codex (must be {MIN_CODEX}-{MAX_CODEX})")
    if len(set(codex)) != len(codex):
        errors.append("Codex cards must be distinct")
    for cid in codex:
        card = index.get(cid)
        if not card:
            errors.append(f"unknown codex card: {cid}")
        elif card["card_type"] != "Codex":
            errors.append(f"not a Codex card: {cid}")

    persona = index.get(deck["persona"])
    if not persona:
        errors.append(f"unknown persona: {deck['persona']}")
    else:
        if persona["card_type"] != "Hero Unit":
            errors.append("persona must be a Hero Unit")
        if persona["level"] != "3":
            errors.append(f"starting persona must be lvl 3, got lvl {persona['level']}")
        if not any(e["id"] == deck["persona"] for e in deck["main"]):
            errors.append("persona must be part of the main deck")
        if persona["subtype"] != "Angel":
            warnings.append("persona is not Angel subtype — Cedric will not work")

    print(f"{deck['name']}  ({path.relative_to(ROOT).as_posix()})\n")
    print(f"  Main deck     {total}/{DECK_SIZE}")
    print(f"  Guild         {', '.join(sorted(guilds))}")
    print(f"  Persona       {persona['name'] if persona else '?'} "
          f"(lvl {persona['level']}, {persona['subtype']})" if persona else "")
    print(f"  Codex         {len(codex)}")
    print("\n  By type:")
    for t, n in sorted(counts.items(), key=lambda x: -x[1]):
        cap = {"Force": MAX_FORCE, "Sentry Action": MAX_SENTRY}.get(t)
        print(f"    {t:<16} {n:>2}" + (f"  (max {cap})" if cap else ""))
    print("\n  By level:")
    for lv in sorted(levels, key=lambda x: (x == "-", x)):
        bar = "#" * levels[lv]
        print(f"    lvl {lv:<3} {levels[lv]:>2}  {bar}")

    if warnings:
        print("\n  WARNINGS:")
        for w in warnings:
            print(f"    ! {w}")
    if errors:
        print("\n  ERRORS:")
        for e in errors:
            print(f"    x {e}")
        print("\nILLEGAL")
        return 1
    print("\nLEGAL")
    return 0


if __name__ == "__main__":
    sys.exit(main())
