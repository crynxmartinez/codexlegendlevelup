import { CARD_LORE } from '../data/card-lore.js';

export function cardLore(id: string): HTMLElement | null {
  const entry = CARD_LORE[id];
  if (!entry) return null;
  const details = document.createElement('details'); details.className = 'card-lore';
  const summary = document.createElement('summary'); summary.textContent = 'Behind this card';
  const story = document.createElement('p'); story.textContent = entry.story;
  const context = document.createElement('p'); context.className = 'lore-context'; context.textContent = entry.context;
  const source = document.createElement('a'); source.href = entry.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
  source.textContent = `Read source: ${entry.source}`;
  details.append(summary, story, context, source);
  details.addEventListener('click', event => event.stopPropagation());
  return details;
}
