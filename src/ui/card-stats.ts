import { createStatSymbol } from './stat-symbols.js';

/** Runtime labels only: approved card artwork is never rewritten. */
export interface CardStatRecord {
  id?: string;
  type: string;
  power?: number | null;
  defense?: number | null;
}

export type CardStatView =
  | { context: 'printed' | 'defense'; hidden?: boolean }
  | { context: 'field'; currentPower: number; hidden?: boolean }
  | { context: 'inspect'; currentPower?: number; hidden?: boolean };

export interface CardStatBadge {
  kind: 'power' | 'defense';
  label: 'ATK' | 'DEF';
  value: number;
  text: string;
  description: string;
  context: CardStatView['context'];
}

/** Compact only exact thousands; 1,500 must never become an inaccurate 2k. */
export function compactCardStat(value: number): string {
  return value !== 0 && value % 1000 === 0
    ? `${value / 1000}k`
    : value.toLocaleString('en-US', { maximumFractionDigits: 20 });
}

/**
 * ATK is the short UI label for Power, not another combat calculation.
 * Callers supply currentPower from the existing engine for field instances.
 * A catalogue record's `hidden` property is not visibility: secrecy is explicit
 * in the view, with an additional guard for the PvP hidden-card sentinel.
 */
export function cardStatBadges(card: CardStatRecord, view: CardStatView = { context: 'printed' }): CardStatBadge[] {
  if (view.hidden || card.id === '__hidden__' || !['Unit', 'Force'].includes(card.type)) return [];
  const badges: CardStatBadge[] = [];
  const current = view.context === 'field' || (view.context === 'inspect' && view.currentPower !== undefined);
  const power = current && 'currentPower' in view ? view.currentPower : card.power;
  const add = (kind: CardStatBadge['kind'], value: number | null | undefined, label: CardStatBadge['label'], meaning: string) => {
    // Missing data is not zero. A real 0, including zero Defense, remains visible.
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    badges.push({ kind, label, value, text: compactCardStat(value), context: view.context,
      description: `${label}: ${meaning} ${value.toLocaleString('en-US', { maximumFractionDigits: 20 })}` });
  };
  if (view.context !== 'defense') add('power', power, 'ATK', current ? 'current Power' : 'printed Power');
  if (view.context !== 'field') add('defense', card.defense, 'DEF', 'Defense contribution');
  return badges;
}

/** Separate, noninteractive corners; callers keep their existing card controls. */
export function createCardStatBadge(badge: CardStatBadge): HTMLSpanElement {
  const node = document.createElement('span');
  node.className = `card-stat card-stat-${badge.kind}`;
  node.dataset.statContext = badge.context;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', badge.description);
  node.title = badge.description;
  const label = document.createElement('small'); label.className = 'card-stat-label'; label.textContent = badge.label;
  label.prepend(createStatSymbol(badge.kind));
  const value = document.createElement('strong'); value.className = 'card-stat-value'; value.textContent = badge.text;
  node.append(label, value);
  return node;
}

export function createCardStatBadges(card: CardStatRecord, view: CardStatView = { context: 'printed' }): HTMLSpanElement[] {
  return cardStatBadges(card, view).map(createCardStatBadge);
}
