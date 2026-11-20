#!/usr/bin/env python3
"""
Convert card art in assets/cards/ to WebP.

Originals are KEPT by default. Pass --delete-originals only when you are sure.

Outputs, mirroring the input folder structure:
    assets/cards/web/<name>.webp    full size - the inspect overlay only
    assets/cards/board/<name>.webp  what the board and hand actually draw
    assets/cards/thumb/<name>.webp  piles, flying cards, small rows

Three sizes rather than two because the middle one is the one almost every
pixel of a session goes through. A card standing in an Ally Zone is about
110x155 CSS px; it was being served the 1024x1536 render, ~360KB, and the
board draws a dozen of them. The `board` size is 512px on the long edge,
which is still crisp at 2x device pixel ratio on any screen the mat can grow
to, and costs about 56KB.

Usage:
    python tools/convert_cards.py                 # convert everything new
    python tools/convert_cards.py --force         # re-convert everything
    python tools/convert_cards.py --quality 90
    python tools/convert_cards.py --no-thumbs
    python tools/convert_cards.py --from-web      # rebuild board+thumb from web/
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # card scans can be large; we trust our own folder

SOURCE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif", ".webp"}
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "assets" / "Deck" / "Deck"
DEFAULT_OUT = ROOT / "assets" / "cards"


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def load_rgb(path: Path) -> Image.Image:
    """Open an image, flattening exotic modes to something WebP accepts."""
    img = Image.open(path)
    img.load()
    if img.mode in ("RGBA", "LA"):
        return img.convert("RGBA")
    if img.mode == "P":
        return img.convert("RGBA" if "transparency" in img.info else "RGB")
    if img.mode in ("CMYK", "YCbCr", "I", "F", "L", "1"):
        return img.convert("RGB")
    return img


def fit(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_edge:
        return img
    scale = max_edge / longest
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def save_webp(img: Image.Image, dest: Path, quality: int, lossless: bool) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    params = {"method": 6}
    if lossless:
        params["lossless"] = True
    else:
        params["quality"] = quality
    img.save(dest, "WEBP", **params)


def sources(src: Path, out: Path, allow_src_inside_out: bool = False) -> list[Path]:
    if not src.exists():
        return []
    found = []
    for p in sorted(src.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in SOURCE_EXTS:
            continue
        # Never treat our own output as input - except under --from-web, where
        # reading one output size to write the others is the whole point.
        if not allow_src_inside_out and (out == src or out in p.parents):
            continue
        found.append(p)
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description="Convert card art to WebP.")
    ap.add_argument("--quality", type=int, default=85, help="WebP quality 1-100 (default 85)")
    ap.add_argument("--max-edge", type=int, default=1400, help="cap on the long edge (default 1400)")
    ap.add_argument("--board-edge", type=int, default=512,
                    help="board/hand long edge (default 512)")
    ap.add_argument("--thumb-edge", type=int, default=384, help="thumbnail long edge (default 384)")
    ap.add_argument("--no-thumbs", action="store_true", help="skip thumbnail generation")
    ap.add_argument("--from-web", action="store_true",
                    help="rebuild board+thumb from assets/cards/web instead of originals")
    ap.add_argument("--lossless", action="store_true", help="lossless WebP (much larger files)")
    ap.add_argument("--force", action="store_true", help="re-convert even if output is up to date")
    ap.add_argument("--delete-originals", action="store_true",
                    help="DESTRUCTIVE: remove source files after a successful convert")
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC, help="source folder to scan")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output folder root")
    args = ap.parse_args()

    src, out_root = args.src.resolve(), args.out.resolve()
    out_web = out_root / "web"
    out_board, out_thumb = out_root / "board", out_root / "thumb"

    # The original scans are not in the repository - only the converted web
    # art is. `--from-web` regenerates the two smaller sizes from it, which is
    # what you want when adding a size rather than adding a card.
    if args.from_web:
        src = out_web
    files = sources(src, out_root, allow_src_inside_out=args.from_web)
    if not files:
        print(f"No source images found under {src}")
        print("Drop your card art there (jpg/png/etc) and run this again.")
        return 0

    print(f"Found {len(files)} image(s) under {src}\n")

    converted = skipped = failed = 0
    bytes_in = bytes_out = 0
    failures: list[tuple[Path, str]] = []
    done_sources: list[Path] = []

    for source in files:
        rel = source.relative_to(src).with_suffix(".webp")
        web_dest = out_web / rel
        board_dest = out_board / rel
        thumb_dest = out_thumb / rel

        # Under --from-web the web file IS the source, so freshness is judged
        # against the size we are actually producing.
        gate = board_dest if args.from_web else web_dest
        if not args.force and gate.exists() and gate.stat().st_mtime >= source.stat().st_mtime:
            skipped += 1
            continue

        try:
            img = load_rgb(source)
            if not args.from_web:
                save_webp(fit(img, args.max_edge), web_dest, args.quality, args.lossless)
            save_webp(fit(img, args.board_edge), board_dest, min(args.quality, 84), False)
            if not args.no_thumbs:
                save_webp(fit(img, args.thumb_edge), thumb_dest, min(args.quality, 80), False)
            img.close()
        except Exception as exc:  # keep going; report at the end
            failed += 1
            failures.append((source, str(exc)))
            continue

        in_size = source.stat().st_size
        out_size = (board_dest if args.from_web else web_dest).stat().st_size
        bytes_in += in_size
        bytes_out += out_size
        converted += 1
        done_sources.append(source)
        pct = (1 - out_size / in_size) * 100 if in_size else 0
        print(f"  {rel.as_posix():<52} {human(in_size):>9} -> {human(out_size):>9}  ({pct:+.0f}%)")

    print()
    print(f"Converted {converted}, skipped {skipped} (already current), failed {failed}")
    if bytes_in:
        saved = bytes_in - bytes_out
        print(f"Size: {human(bytes_in)} -> {human(bytes_out)}  (saved {human(saved)}, "
              f"{saved / bytes_in * 100:.0f}%)")
    print(f"Output: {out_web if not args.from_web else out_board}")
    if not args.from_web:
        print(f"        {out_board}")
    if not args.no_thumbs:
        print(f"        {out_thumb}")

    if failures:
        print("\nFailures:")
        for path, err in failures:
            print(f"  {path.relative_to(src).as_posix()}: {err}")

    if args.delete_originals:
        if failures:
            print("\nRefusing to delete originals because some files failed.")
            return 1
        for source in done_sources:
            source.unlink()
        print(f"\nDeleted {len(done_sources)} original file(s).")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
