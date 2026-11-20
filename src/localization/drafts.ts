import agta from './tl/agta.json';
import babaylan from './tl/babaylan.json';
import maguindanao from './tl/maguindanao.json';
import { ALL_CARDS } from '../data/loader';
import { PUBLISHED_TITLES, proposedName } from './title-state';

export interface TranslationDraft { name: string; text: string }
/** Authored display translations. Canonical English remains in data/loader. */
const originals: Record<string, TranslationDraft> = { ...agta, ...babaylan, ...maguindanao };
const renamed = Object.entries(PUBLISHED_TITLES).map(([id, title]) => ({
  id, oldName: originals[id]!.name, name: proposedName(ALL_CARDS[id]!.name, title),
}));
const names = new Map(renamed.map(entry => [entry.id, entry.name]));
/** Rename exact full-card references only; never substitute mechanics or partial words. */
export function updatePublishedNameReferences(text: string): string {
  for (const entry of renamed) text = text.split(entry.oldName).join(entry.name);
  return text;
}
export const DRAFTS: Record<string, TranslationDraft> = Object.fromEntries(
  Object.entries(originals).map(([id, draft]) => [id, {
    name: names.get(id) ?? draft.name, text: updatePublishedNameReferences(draft.text),
  }]),
);
