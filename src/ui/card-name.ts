import { displayCardName } from '../localization/display.js';
/** Compact UI label. Keep the canonical full name for rules, search and inspection. */
export function cardDisplayName(fullName: string): string {
  fullName = displayCardName(fullName);
  const separator = fullName.indexOf(',');
  return separator < 0 ? fullName : fullName.slice(separator + 1).trim() || fullName;
}
