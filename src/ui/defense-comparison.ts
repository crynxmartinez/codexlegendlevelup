/** Read-only presentation. Callers supply the existing engine's attack/base values. */
export interface DefensePreviewInput {
  attack: number;
  base: number;
  targetName: string;
  firstBonus?: number;
  attackerName?: string;
}
export function previewDefense(input: DefensePreviewInput, contributions: readonly (number | undefined)[]) {
  const known = contributions.every(value => value !== undefined && Number.isFinite(value));
  const added = known ? contributions.reduce<number>((total, value) => total + value!, 0)
    + (contributions.length ? input.firstBonus ?? 0 : 0) : null;
  const defense = added === null ? null : input.base + added;
  return {
    attack: input.attack,
    defense,
    attackDetail: input.attackerName,
    defenseDetail: added === null ? 'Contribution unavailable' : `${input.base.toLocaleString()} Unit + ${added.toLocaleString()} selected DEF`,
    outcome: defense === null ? 'Read card details before confirming'
      : defense > input.attack ? 'Defense would hold' : 'Attack would hit',
    note: 'Ties hit · Checks can change this',
    stage: 'Before check',
  };
}
