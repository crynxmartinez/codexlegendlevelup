import { describe, expect, it } from 'vitest';
import { canApprove, editEntry, readEntries, sourceStamp, reconcileEntry } from './review-state';
import { DRAFTS } from './drafts';
import { ALL_CARDS, isSelectableCard } from '../data/loader';
describe('translation review isolation and approval', () => {
  it('covers every active card with identical numeric rules and keyword tags', () => {
    expect(Object.keys(DRAFTS).sort()).toEqual(Object.values(ALL_CARDS).filter(isSelectableCard).map(c => c.id).sort());
    expect(Object.keys(DRAFTS)).toHaveLength(141);
    for (const [id, draft] of Object.entries(DRAFTS)) {
      const card = ALL_CARDS[id]!;
      expect(isSelectableCard(card)).toBe(true);
      expect(draft.text.match(/[+-]?\d+/g), id).toEqual(card.text.match(/[+-]?\d+/g));
      expect(draft.text.match(/\[[^\]]+\]/g)?.filter(t => !t.startsWith('[Cost:'))).toEqual(card.text.match(/\[[^\]]+\]/g)?.filter(t => !t.startsWith('[Cost:')));
    }
  });
  it('follows the agreed terms without replacing preserved keywords', () => {
    for (const [id, draft] of Object.entries(DRAFTS)) {
      expect(draft.name.trim(), id).not.toBe('');
      expect(draft.text.replace(/1\/turn/gi, ''), id).not.toMatch(/\bdiscard\b|\breleased?\b|\bactivation\b|\bcard(s)?\b|\bturn\b/i);
      const english = ALL_CARDS[id]!.text;
      expect(draft.text.match(/bawat kopya/g)?.length ?? 0, id).toBe(english.match(/per copy/g)?.length ?? 0);
      expect(draft.text.match(/pinagsasaluhan ng lahat/g)?.length ?? 0, id).toBe(english.match(/across all cards/g)?.length ?? 0);
      if (/discard/i.test(english)) expect(draft.text, id).toMatch(/bitaw|bumitaw/i);
      if (/released/i.test(english)) expect(draft.text, id).toMatch(/pakawalan/i);
      if (/activation/i.test(english)) expect(draft.text, id).toContain('pag aktiba');
    }
  });
  it('preserves edited wording but requires review when the published draft changes', () => {
    const draft = { name: 'Pamagat', text: 'Bagong salin' };
    const entry = { name: 'Aking pamagat', text: 'Aking salin', notes: 'Keep', status: 'approved' as const, source: 'english', draftSource: 'old' };
    expect(reconcileEntry(entry, 'english', draft)).toEqual({ ...entry, status: 'revision' });
    expect(reconcileEntry({ ...entry, draftSource: sourceStamp(draft) }, 'english', draft).status).toBe('approved');
  });
  it('requires title and skills, and resets approval after translation edits', () => {
    const entry = { name: 'Pamagat', text: 'Bumunot ng 1 baraha.', notes: '', status: 'approved' as const, source: 'original' };
    expect(canApprove({ name: ' ', text: entry.text })).toBe(false);
    expect(editEntry(entry, 'text', 'Bumunot.').status).toBe('draft');
    expect(editEntry(entry, 'notes', 'Good').status).toBe('approved');
    expect(entry.status).toBe('approved');
    expect(readEntries(JSON.stringify({ sample: entry })).sample).toEqual(entry);
    expect(readEntries('{"bad":{}}')).toEqual({});
    expect(sourceStamp({ name: 'a', text: 'b' })).not.toBe(sourceStamp({ name: 'a', text: 'c' }));
  });
});
