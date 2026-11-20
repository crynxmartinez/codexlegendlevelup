import type { AbilityOption } from '../core/effects.js';

export interface AbilityChoice {
  option: AbilityOption;
  /** Index in the authoritative decision, not the displayed tile list. */
  index: number;
  occurrences: number;
}

/** Keep queued occurrences intact while presenting one tile per card/skill. */
export function abilityChoices(options: AbilityOption[], pending: boolean): AbilityChoice[] {
  const choices: AbilityChoice[] = [];
  const groups = new Map<string, AbilityChoice>();
  options.forEach((option, index) => {
    const key = JSON.stringify([option.uid, option.skillId ?? option.text, option.cause ? option.id ?? index : undefined]);
    const existing = pending ? groups.get(key) : undefined;
    if (existing) { existing.occurrences++; return; }
    const choice = { option, index, occurrences: 1 };
    choices.push(choice);
    groups.set(key, choice);
  });
  return choices;
}
