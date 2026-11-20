import type { CardOrigin } from '../core/card-origin.js';
import type { PowerModifier, PlayerId } from '../core/types.js';
import { cardDisplayName } from './card-name.js';

export function originLabel(origin: CardOrigin, viewer: PlayerId = 0): string {
  const side = origin.owner === viewer ? 'You' : 'Foe';
  const slot = origin.owner === viewer ? origin.slot : origin.slot === null ? null : 3 - origin.slot;
  const place = origin.zone === 'ally' && slot !== null
    ? ['Far left', 'Left', 'Right', 'Far right'][slot] ?? 'Ally'
    : origin.zone[0]!.toUpperCase() + origin.zone.slice(1);
  return `${cardDisplayName(origin.name)} · ${side} · ${place}`;
}

export interface ModGroup extends PowerModifier { count: number; passive?: boolean; causes: CardOrigin[] }
export function groupModifiers(mods: PowerModifier[]): ModGroup[] {
  const groups: ModGroup[] = [];
  for (const m of mods) {
    const existing = groups.find(g => g.amount === m.amount && g.source === m.source && g.duration === m.duration
      && g.origin?.uid === m.origin?.uid && g.origin?.slot === m.origin?.slot && g.origin?.zone === m.origin?.zone);
    if (existing) { existing.count++; if (m.cause) existing.causes.push(m.cause); }
    else groups.push({ ...m, count: 1, causes: m.cause ? [m.cause] : [] });
  }
  return groups;
}
export const signedPower = (value: number): string => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
export function modifierSource(g: ModGroup): string { return g.origin ? originLabel(g.origin) : cardDisplayName(g.source); }
