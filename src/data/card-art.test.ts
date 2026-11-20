/**
 * Every card's art actually exists, spelled exactly as the record spells it.
 *
 * Windows does not care about the case of a path and Vercel does, so a record
 * pointing at `web/agta/...` when the folder on disk is `web/Agta/...` loads
 * perfectly on the machine it was written on and 404s for every player. That
 * is not hypothetical: the folders in this repo are `Agta`, `Babaylan` and
 * `maguindanao` — two capitalised, one not — and twenty-two records were
 * written with the wrong case before this test existed.
 *
 * `import.meta.glob` is what makes the check possible: it enumerates the real
 * files through the bundler, so the keys carry the true case, and no node
 * filesystem types are needed.
 */
import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from './loader.js';

const cards = Object.values(ALL_CARDS);

const files = new Set(Object.keys(
  import.meta.glob('/assets/cards/**/*.webp', { eager: true, query: '?url' }),
));

/** `assets/cards/web/X.webp` as the glob spells its keys. */
const key = (p: string) => (p.startsWith('/') ? p : `/${p}`);

interface Card { id: string; art?: string; thumb?: string }

describe('card art', () => {
  it('finds some art at all — otherwise every test below passes vacuously', () => {
    expect(files.size).toBeGreaterThan(100);
  });

  it('every art path exists, with exactly the case the record uses', () => {
    const missing = (cards as Card[])
      .filter((c) => c.art && !files.has(key(c.art)))
      .map((c) => `${c.id} -> ${c.art}`);
    expect(missing).toEqual([]);
  });

  it('every thumb path exists, with exactly that case', () => {
    const missing = (cards as Card[])
      .filter((c) => c.thumb && !files.has(key(c.thumb)))
      .map((c) => `${c.id} -> ${c.thumb}`);
    expect(missing).toEqual([]);
  });

  it('the board size the UI derives from the art path exists too', () => {
    // `boardUrl` in ui/assets.ts builds this by swapping the folder, so a
    // card can have both art and thumb and still show nothing on the board.
    const missing = (cards as Card[])
      .filter((c) => c.art)
      .map((c) => ({ id: c.id, board: key(c.art!).replace('/web/', '/board/') }))
      .filter((c) => !files.has(c.board))
      .map((c) => `${c.id} -> ${c.board}`);
    expect(missing).toEqual([]);
  });
});
