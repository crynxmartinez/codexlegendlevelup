import { formatSkillText } from './glossary.js';
/** Confirmation never spends a card or commits an activation by itself. */
export function skillConfirmation(prompt: string) {
  const body = document.createElement('div'); body.className = 'skill-confirmation';
  const description = document.createElement('p'); description.className = 'skill-confirmation-effect';
  description.innerHTML = formatSkillText(prompt); body.append(description);
  const manualCodex = /^Switch to .+\? Manual switching costs 1 Play\./.test(prompt);
  const freeCodex = /^Switch to .+\? Switching is free\./.test(prompt);
  const codex = manualCodex || freeCodex;
  return { body, title: codex ? 'Switch Codex?' : 'Use this effect?', accept: manualCodex ? 'Switch · 1 Play' : freeCodex ? 'Switch' : 'Use effect', decline: codex ? 'Keep current' : 'Skip', unavailable: false };
}
