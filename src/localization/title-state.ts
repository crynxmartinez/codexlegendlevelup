import proposals from './title-proposals.json';
import options from './title-options.json';
export interface TitleProposal { options: string[]; reason: string }
export const TITLE_PROPOSALS: Readonly<Record<string, TitleProposal>> = {
  ...Object.fromEntries(Object.entries(options).map(([id, choices]) => [id, {
    options: choices,
    reason: 'Option A keeps the existing theme in a compact card name, rather than a sentence or an instruction. Alternatives offer a different emphasis without changing the card rules.',
  }])), ...proposals,
};
/** Owner approved all recommended titles, including this batch, on 2026-10-12. */
export const PUBLISHED_TITLES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TITLE_PROPOSALS).map(([id, proposal]) => [id, proposal.options[0]!]),
);
export function cardTitleType(card: { type: string; level: number }): string {
  return card.type === 'Unit' && card.level === 3 ? 'Persona' : card.type;
}
export type TitleStatus = 'draft' | 'approved' | 'revision' | 'skipped';
export interface TitleDecision { title: string; notes: string; status: TitleStatus; baseline: string }
/** Retain established localized descriptors; actual personal/place names stay intact. */
const identityLabels: Record<string, string> = {
  'Mount Lantoy': 'Bundok Lantoy', 'Argao River': 'Ilog Argao',
  'Dingayop Spring': 'Bukal ng Dingayop', 'Dingayop Cavern': 'Yungib ng Dingayop',
  'Danao Highlands': 'Kabundukan ng Danao', 'Bantayan Waters': 'Katubigan ng Bantayan',
  'Tañon Strait': 'Kipot ng Tañon', 'Moonwake Shore': 'Baybayin ng Moonwake',
  'Crocodile-Form Apu': 'Apu na Anyo ng Buwaya', 'the Old Woman': 'ang Matandang Babae',
  'Water Tunung': 'Tunung ng Tubig', 'Sky Tunung': 'Tunung ng Langit',
  'Mountain Tunung': 'Tunung ng Bundok', 'Tree Tunung': 'Tunung ng Puno',
  'Mount Matutun': 'Bundok Matutun', 'Mount Bita': 'Bundok Bita',
  'Mount Kabalalan': 'Bundok Kabalalan', 'Mount Gurayn': 'Bundok Gurayn',
  'Lake Lanao': 'Lawa ng Lanao', 'Illana Bay': 'Look ng Illana',
  'the Last Refuge': 'ang Huling Kanlungan', 'Restored Magindanao': 'Muling Naibalik na Magindanao',
  'Cape Timbalangan': 'Tangway ng Timbalangan',
};
export function characterName(englishName: string): string {
  const identity = englishName.slice(englishName.indexOf(',') + 1).trim();
  return identityLabels[identity] ?? identity;
}
export function proposedName(englishName: string, title: string): string {
  return englishName.includes(',') ? `${title.trim()}, ${characterName(englishName)}` : title.trim();
}
export function titleBaseline(englishName: string, proposal: TitleProposal): string {
  return JSON.stringify([englishName, proposal]);
}
export function titleDecision(saved: TitleDecision | undefined, baseline: string, publishedTitle = ''): TitleDecision {
  if (!saved) return { title: publishedTitle, notes: '', status: publishedTitle ? 'approved' : 'draft', baseline };
  return saved.baseline === baseline ? saved : { ...saved, status: 'revision' };
}
export function editTitle(entry: TitleDecision, title: string): TitleDecision {
  return { ...entry, title, status: 'draft' };
}
/** Rebuild only the known scalar fields; never trust stored status or HTML. */
export function readTitleDecisions(raw: string | null): Record<string, TitleDecision> {
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid title review data');
  const result: Record<string, TitleDecision> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!TITLE_PROPOSALS[id] || !entry || typeof entry !== 'object') continue;
    if (typeof entry.title !== 'string' || typeof entry.notes !== 'string' || typeof entry.baseline !== 'string') continue;
    if (!['draft', 'approved', 'revision', 'skipped'].includes(entry.status)) continue;
    result[id] = { title: entry.title, notes: entry.notes, baseline: entry.baseline,
      status: entry.status === 'approved' && !entry.title.trim() ? 'draft' : entry.status };
  }
  return result;
}
