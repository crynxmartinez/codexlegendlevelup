import type { DeckList } from '../core/setup.js';
import type { CardRecord } from '../data/loader.js';

export interface DeckViewEntry { id: string; copies: number; card: CardRecord; group: string }
export interface DeckViewModel {
  main: DeckViewEntry[];
  codex: DeckViewEntry[];
  mainCount: number;
  codexCount: number;
  counts: Array<{ label: string; value: number }>;
}

/** Presentation projection only. Persona is already in main; it is never added again. */
export function deckViewModel(deck: DeckList, catalogue: Readonly<Record<string, CardRecord>>): DeckViewModel {
  const entries = (raw: ReadonlyArray<{ id: string; copies: number }>): DeckViewEntry[] => {
    const counts = new Map<string, number>();
    for (const entry of raw) counts.set(entry.id, (counts.get(entry.id) ?? 0) + entry.copies);
    return Array.from(counts, ([id, copies]) => {
      const card = catalogue[id];
      if (!card) throw new Error(`Card is not available in the catalogue: ${id}`);
      return { id, copies, card, group: card.type === 'Unit' ? `Level ${card.level}` : card.type };
    });
  };
  const rank = (card: CardRecord) => card.type === 'Unit' ? 3 - card.level
    : ({ Force: 4, Action: 5, Sentry: 6, Codex: 7 } as Record<string, number>)[card.type] ?? 8;
  const main = entries(deck.main).sort((a, b) => rank(a.card) - rank(b.card) || a.card.name.localeCompare(b.card.name));
  const codex = entries(deck.codex.map(id => ({ id, copies: 1 })));
  const counts = ['Level 1', 'Level 2', 'Level 3', 'Force', 'Action', 'Sentry'].map(label => ({
    label, value: main.filter(entry => entry.group === label).reduce((sum, entry) => sum + entry.copies, 0),
  }));
  return { main, codex, mainCount: main.reduce((sum, entry) => sum + entry.copies, 0),
    codexCount: codex.reduce((sum, entry) => sum + entry.copies, 0), counts };
}

/** Fixed readable export geometry; long lists grow vertically instead of shrinking cards. */
export function deckImageLayout(mainEntries: number, codexEntries: number) {
  const width = 1800, columns = 7, cellWidth = 190, cellHeight = 332, gap = 12;
  const mainRows = Math.ceil(mainEntries / columns);
  const codexRows = Math.ceil(codexEntries / columns);
  const codexTop = 148 + Math.max(1, mainRows) * cellHeight + 34;
  return { width, height: Math.max(1120, codexTop + Math.max(1, codexRows) * cellHeight + 80),
    columns, cellWidth, cellHeight, gap, gridLeft: 360, mainTop: 148, codexTop };
}
