/** Shared by cost selection, AI and server validation. Order is payment order. */
export function weightedSelectionTotal(ids: readonly string[], weights: Record<string, number> = {}, firstMinimum = 0): number {
  return [...new Set(ids)].reduce((sum, uid, i) => sum + Math.max(weights[uid] ?? 1, i === 0 ? firstMinimum : 0), 0);
}
