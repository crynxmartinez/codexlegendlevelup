import { formatSkillText, roleSymbolKey } from './glossary.js';
/** One paragraph per authored rule, without repeating its timing as a heading. */
export function readableRules(text: string): string {
  const lines = text.split(/\n+/).filter(line => line.trim());
  return `${roleSymbolKey(text)}<div class="rules-list">${lines.map(line => `<div class="rule-entry">${formatSkillText(line)}</div>`).join('')}</div>`;
}
