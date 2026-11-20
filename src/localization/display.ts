import { ALL_CARDS, type CardRecord } from '../data/loader';
import { DRAFTS, updatePublishedNameReferences } from './drafts';
import { cardLanguage } from './language';
import skillPrompts from './tl/skill-prompts.json';

const normalize = (text: string) => text.replace(/\[\/?(?:green|red|blue|yellow|purple|gold)\]/gi, '').replace(/\s+/g, ' ').trim();
const rules = new Map<string, string>();
const names = new Map<string, string>();
for (const [english, tagalog] of Object.entries(skillPrompts)) rules.set(normalize(english), updatePublishedNameReferences(tagalog));
for (const [id, draft] of Object.entries(DRAFTS)) {
  const card = ALL_CARDS[id];
  if (!card) continue;
  names.set(card.name, draft.name);
  rules.set(normalize(card.text), draft.text);
  const english = card.text.split('\n');
  const tagalog = draft.text.split('\n');
  english.forEach((line, i) => { if (tagalog[i]) rules.set(normalize(line), tagalog[i]!); });
}

/** Exact authored phrases only; never translate engine text by word substitution. */
export function displayRuleText(english: string): string {
  return cardLanguage() === 'tl' ? rules.get(normalize(english)) ?? english : english;
}
export function displayCardName(english: string): string {
  return cardLanguage() === 'tl' ? names.get(english) ?? english : english;
}
export function cardSearchText(id: string): string {
  const card = ALL_CARDS[id];
  const draft = DRAFTS[id];
  return `${card?.name ?? ''} ${card?.text ?? ''} ${draft?.name ?? ''} ${draft?.text ?? ''}`.toLocaleLowerCase();
}

/** UI-only copies with live getters. Never pass this catalogue to game logic. */
export const DISPLAY_CARDS: Record<string, CardRecord> = Object.fromEntries(
  Object.entries(ALL_CARDS).map(([id, card]) => [id, {
    ...card,
    get name() { return cardLanguage() === 'tl' ? DRAFTS[id]?.name ?? card.name : card.name; },
    get text() { return cardLanguage() === 'tl' ? DRAFTS[id]?.text ?? card.text : card.text; },
  }]),
);
