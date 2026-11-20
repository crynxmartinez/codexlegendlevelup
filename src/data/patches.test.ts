/**
 * The Dev Log has to describe the game that exists.
 *
 * A changelog is the easiest document in a project to let rot, because nothing
 * breaks when it is wrong — it just quietly stops being true, and by the time
 * anyone notices, the history it claims to hold is unrecoverable. These are
 * the checks that make it break instead.
 *
 * The load-bearing one is the last: a version IS a set, so a new archipelago
 * appearing in the card data without a new version entry is a contradiction,
 * and the build should say so rather than shipping a Dev Log that describes
 * two thirds of the game.
 */
import { describe, it, expect } from 'vitest';
import { ALL_CARDS } from './loader.js';
import { VERSIONS, CURRENT_VERSION, LATEST_PATCH, patchCounts } from './patches.js';
import { RELEASE_LABEL } from './release-label.js';

/** Every archipelago the card data actually contains, from the id prefix. */
function archipelagosInData(): Set<string> {
  const out = new Set<string>();
  for (const id of Object.keys(ALL_CARDS)) {
    const prefix = id.split('/')[0];
    if (prefix) out.add(prefix);
  }
  return out;
}

describe('the Dev Log', () => {
  it('keeps the lightweight menu label in sync with the loaded Dev Log', () => {
    expect(RELEASE_LABEL).toEqual({ version: CURRENT_VERSION.version, name: CURRENT_VERSION.name, patch: LATEST_PATCH.id });
  });
  it('has at least one version, newest first', () => {
    expect(VERSIONS.length).toBeGreaterThan(0);
    const numbers = VERSIONS.map((v) => v.version);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
    expect(CURRENT_VERSION).toBe(VERSIONS[0]);
  });

  it('names every version, because a bare digit says nothing', () => {
    for (const v of VERSIONS) {
      expect(v.name.trim(), `version ${v.version} has no set name`).not.toBe('');
    }
  });

  it('numbers every patch under the set it belongs to', () => {
    // 1.2 lives under Version 1. A patch filed under the wrong set would show
    // up on the wrong poster and be counted in the wrong list.
    for (const v of VERSIONS) {
      for (const p of v.patches) {
        expect(p.id, `${p.id} is not a patch of version ${v.version}`)
          .toMatch(new RegExp(`^${v.version}\\.`));
      }
    }
  });

  it('orders patches newest first and ends on the launch entry', () => {
    for (const v of VERSIONS) {
      const minor = v.patches.map((p) => Number(p.id.split('.')[1]));
      expect(minor, `version ${v.version} patches are out of order`)
        .toEqual([...minor].sort((a, b) => b - a));
      // x.0 is the set's launch entry and is the one with no single date.
      const last = v.patches[v.patches.length - 1]!;
      expect(last.id).toBe(`${v.version}.0`);
      expect(last.date, 'the launch entry has no one date').toBeNull();
    }
  });

  it('every patch says something', () => {
    for (const v of VERSIONS) {
      for (const p of v.patches) {
        expect(p.title.trim(), `${p.id} has no title`).not.toBe('');
        const changed = p.nerfs.length + p.buffs.length + p.adjusted.length
          + p.systems.length + p.newCards.length;
        expect(changed, `${p.id} lists no changes at all`).toBeGreaterThan(0);
      }
    }
  });

  it('only names cards the game actually has', () => {
    // A bad id costs a missing tile on the poster and nothing else, which is
    // exactly the kind of quiet wrongness worth failing a build over.
    const missing: string[] = [];
    for (const v of VERSIONS) {
      for (const p of v.patches) {
        const ids = [
          ...p.nerfs.map((c) => c.id),
          ...p.buffs.map((c) => c.id),
          ...p.adjusted.map((c) => c.id),
          ...p.newCards,
        ];
        for (const id of ids) if (!ALL_CARDS[id]) missing.push(`${p.id}: ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every card change a note and a badge', () => {
    for (const v of VERSIONS) {
      for (const p of v.patches) {
        for (const c of [...p.nerfs, ...p.buffs, ...p.adjusted]) {
          expect(c.note.trim(), `${p.id} ${c.id} has no note`).not.toBe('');
          // The badge is what the poster draws on the art. A card change
          // without one is a card on a page with no reason given.
          expect(c.delta?.trim(), `${p.id} ${c.id} has no delta badge`)
            .toBeTruthy();
        }
      }
    }
  });

  it('counts what a patch changed', () => {
    const counts = patchCounts(LATEST_PATCH);
    const total = LATEST_PATCH.nerfs.length + LATEST_PATCH.buffs.length
      + LATEST_PATCH.adjusted.length + LATEST_PATCH.systems.length
      + LATEST_PATCH.newCards.length;
    expect(counts.length > 0).toBe(total > 0);
  });

  /**
   * The one that matters.
   *
   * A version is a set. If the card data grows an archipelago the Dev Log has
   * never heard of, either a new version entry is missing or the id prefix is
   * a typo — and both are worth stopping for. The list below is what Version 1
   * is; adding a fourth archipelago means adding Version 2 and extending it.
   */
  it('has a version for every archipelago in the card data', () => {
    const SET_1 = ['agta', 'babaylan', 'maguindanao'];
    const known = new Set(SET_1);
    // Set 2 and beyond extend this as they are added, next to their version.
    const unknown = [...archipelagosInData()].filter((a) => !known.has(a));
    expect(
      unknown,
      'the card data has an archipelago no version accounts for — add its '
      + 'set to VERSIONS in patches.ts and list it here',
    ).toEqual([]);
    // And the reverse: a set claimed but not shipped.
    expect(VERSIONS.some((v) => v.version === 1)).toBe(true);
  });
});
