import type { TranslationDraft } from './drafts';
export type ReviewStatus = 'draft' | 'approved' | 'revision';
export interface ReviewEntry extends TranslationDraft {
  notes: string;
  status: ReviewStatus;
  source: string;
  /** Draft baseline when this review was saved, separate from the English source. */
  draftSource?: string;
  previous?: Pick<ReviewEntry, 'name' | 'text' | 'notes' | 'status'>;
}
export function reconcileEntry(entry: ReviewEntry, source: string, draft: TranslationDraft): ReviewEntry {
  return entry.source === source && entry.draftSource === sourceStamp(draft)
    ? entry : { ...entry, status: 'revision' };
}
export function sourceStamp(card: { name: string; text: string }): string {
  return JSON.stringify([card.name, card.text]);
}
export function canApprove(entry: TranslationDraft): boolean {
  return Boolean(entry.name.trim() && entry.text.trim());
}
export function editEntry(entry: ReviewEntry, field: 'name' | 'text' | 'notes', value: string): ReviewEntry {
  return { ...entry, [field]: value, status: field === 'notes' ? entry.status : 'draft' };
}
export function readEntries(raw: string | null): Record<string, ReviewEntry> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid review backup');
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) =>
    v && typeof v === 'object' && ['name', 'text', 'notes', 'source'].every(k => typeof v[k] === 'string') &&
    ['draft', 'approved', 'revision'].includes(v.status)));
}
