import { describe, expect, it } from 'vitest';
import { ALL_CARDS, isSelectableCard } from '../data/loader';
import { DRAFTS } from './drafts';
import { TITLE_PROPOSALS, PUBLISHED_TITLES, characterName, editTitle, proposedName, readTitleDecisions, titleBaseline, titleDecision } from './title-state';

describe('creative titles for all card types', () => {
  it('provides three distinct short options and publishes the approved first choice for all 141 cards', () => {
    const personas = Object.values(ALL_CARDS).filter(isSelectableCard);
    expect(personas).toHaveLength(141);
    expect(Object.keys(TITLE_PROPOSALS).sort()).toEqual(personas.map(c => c.id).sort());
    for (const card of personas) {
      const proposal = TITLE_PROPOSALS[card.id]!;
      expect(new Set(proposal.options).size, card.id).toBe(3);
      expect(proposal.reason.length).toBeGreaterThan(30);
      for (const title of proposal.options) {
        expect(title.trim().split(/\s+/).length, title).toBeGreaterThanOrEqual(1);
        expect(title.trim().split(/\s+/).length, title).toBeLessThanOrEqual(card.type === 'Action' ? 4 : 5);
        expect(title).not.toContain(',');
        if (card.name.includes(',')) expect(characterName(proposedName(card.name, title))).toBe(characterName(card.name));
        else expect(proposedName(card.name, title)).toBe(title);
      }
      expect(DRAFTS[card.id]!.name).toBe(proposedName(card.name, proposal.options[0]!));
      expect(PUBLISHED_TITLES[card.id]).toBe(proposal.options[0]);
    }
    expect(new Set(personas.map(c => DRAFTS[c.id]!.name)).size).toBe(141);
  });
  it('never auto-selects or approves a recommended title', () => {
    expect(titleDecision(undefined, 'baseline')).toEqual({ title: '', notes: '', status: 'draft', baseline: 'baseline' });
  });
  it('starts with owner-approved published titles but preserves existing browser edits', () => {
    expect(titleDecision(undefined, 'baseline', 'Punit na Langit')).toEqual({ title: 'Punit na Langit', notes: '', status: 'approved', baseline: 'baseline' });
    const saved = { title: 'Custom title', notes: 'Keep', status: 'draft' as const, baseline: 'baseline' };
    expect(titleDecision(saved, 'baseline', 'Punit na Langit')).toEqual(saved);
  });
  it('updates exact full-name references in skills alongside the published card title', () => {
    for (const id of ['babaylan/set-1/unbroken-invocation-amara', 'maguindanao/set-1/seven-sight-final-scourge-gurayn']) {
      expect(DRAFTS[id]!.text).toContain(DRAFTS[id]!.name);
    }
    expect(proposedName('Voice Beneath the Current, Water Tunung', 'Bulong ng Agos')).toBe('Bulong ng Agos, Tunung ng Tubig');
    expect(proposedName('Day Became Night', 'Tanghaling Dilim')).toBe('Tanghaling Dilim');
  });
  it('resets approval when edited and preserves stale decisions for re-review', () => {
    const approved = { title: 'Lilim ng Araw', notes: 'Keep this', status: 'approved' as const, baseline: 'old' };
    expect(editTitle(approved, 'Pakpak ng Dilim')).toEqual({ ...approved, title: 'Pakpak ng Dilim', status: 'draft' });
    expect(titleDecision(approved, 'new')).toEqual({ ...approved, status: 'revision' });
    expect(approved.status).toBe('approved');
    expect(titleBaseline('Pah', { options: ['a'], reason: 'old' })).not.toBe(titleBaseline('Pah', { options: ['b'], reason: 'old' }));
  });
  it('round-trips decisions and rejects blank approvals or invalid stored data', () => {
    const id = 'maguindanao/set-1/sun-darkening-scourge-pah';
    const entry = { title: 'Lilim ng Araw', notes: '<script>not executable</script>', status: 'approved', baseline: 'current' };
    expect(readTitleDecisions(JSON.stringify({ [id]: entry }))[id]).toEqual(entry);
    expect(readTitleDecisions(JSON.stringify({ [id]: { ...entry, title: ' ' } }))[id]!.status).toBe('draft');
    expect(readTitleDecisions(JSON.stringify({ unknown: entry, [id]: { status: 'approved' } }))).toEqual({});
    expect(() => readTitleDecisions('[]')).toThrow();
  });
});
