import { BARRIER_COUNT } from '../core/types.js';

/**
 * Damage removes the first Barrier in the engine's queue. Leave its socket
 * empty instead of shifting every surviving card toward the start of the row.
 * Derive slots from the count, not remembered UIDs: PvP deliberately renumbers
 * concealed Barrier aliases in each snapshot, including after reconnect.
 */
export function barrierSlots(barriers: readonly string[]): Array<string | undefined> {
  const empty = BARRIER_COUNT - barriers.length;
  return Array.from({ length: BARRIER_COUNT }, (_, slot) => barriers[slot - empty]);
}
