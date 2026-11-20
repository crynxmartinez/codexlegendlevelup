/** Decorative companions to readable stat labels, never a new rules resource. */
export type StatSymbol = 'power' | 'defense' | 'barrier' | 'plays';

export function statSymbolMarkup(kind: StatSymbol): string {
  return `<span class="stat-symbol stat-symbol-${kind}" aria-hidden="true"></span>`;
}

export function createStatSymbol(kind: StatSymbol): HTMLSpanElement {
  const symbol = document.createElement('span');
  symbol.className = `stat-symbol stat-symbol-${kind}`;
  symbol.setAttribute('aria-hidden', 'true');
  return symbol;
}
