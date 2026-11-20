/** Deterministic RNG (mulberry32) so games and AI runs are reproducible. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates, in place. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = items[i]!;
    const b = items[j]!;
    items[i] = b;
    items[j] = a;
  }
  return items;
}

/**
 * One deterministic value from a seed and a counter, with no state to carry.
 *
 * `GameState` cannot hold a generator: the AI clones the whole state with
 * `structuredClone` to try an action, and a closure does not survive that. A
 * pure hash of (seed, n) gives a stream that a clone reproduces exactly and
 * that a saved game does not have to serialise.
 */
export function rollAt(seed: number, n: number): number {
  let t = (Math.imul(seed >>> 0, 0x9e3779b1) + Math.imul(n >>> 0, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
