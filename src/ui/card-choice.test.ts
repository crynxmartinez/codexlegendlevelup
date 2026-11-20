import { describe, expect, it } from 'vitest';
import { selectionTotal, allowsChoiceFilters, allowsBoardChoice, selectedCardSummary, choiceCardStatBadges, type ChoiceCard } from './card-choice.js';
const cards: ChoiceCard[] = [
 { uid:'a', name:'Same name', image:'', type:'Unit', detail:'', stats:'', weight:2 },
 { uid:'b', name:'Same name', image:'', type:'Unit', detail:'', stats:'' },
];
describe('visible choice statistics', () => {
 it('shows both printed values on known cards and only supplied current Power on field choices', () => {
   const card: ChoiceCard = { ...cards[0]!, zone:'hand', power:6000, defense:10000 };
   expect(choiceCardStatBadges(card).map(b => [b.label, b.value])).toEqual([['ATK',6000],['DEF',10000]]);
   expect(choiceCardStatBadges({ ...card, zone:'ally', power:9000 }).map(b => [b.label, b.value])).toEqual([['ATK',9000]]);
 });
 it('keeps zero Defense, Force values and hidden-card secrecy in shared pile/choice tiles', () => {
   expect(choiceCardStatBadges({ ...cards[0]!, type:'Force', zone:'grave', power:3000, defense:15000 }).map(b => b.value)).toEqual([3000,15000]);
   expect(choiceCardStatBadges({ ...cards[0]!, power:11000, defense:0 })[1]?.text).toBe('0');
   expect(choiceCardStatBadges({ ...cards[0]!, hidden:true, power:6000, defense:10000 })).toEqual([]);
   expect(choiceCardStatBadges({ ...cards[0]!, sentry:true, power:0, defense:0 })).toEqual([]);
 });
 it('does not parse free-form stat prose to invent missing structured values', () => {
   expect(choiceCardStatBadges({ ...cards[0]!, stats:'Power 6,000 · Defense 10,000' })).toEqual([]);
 });
 it('preserves field Power when a supporting Ally uses its contribution as the display caption', () => {
   const supporter: ChoiceCard = { ...cards[0]!, type:'+9,000 Power', cardType:'Unit', zone:'ally', power:9000, defense:10000 };
   expect(choiceCardStatBadges(supporter).map(b => [b.label, b.value])).toEqual([['ATK',9000]]);
   expect(choiceCardStatBadges({ ...supporter, hidden:true })).toEqual([]);
   expect(choiceCardStatBadges({ ...supporter, cardType:'Sentry', power:0, defense:0 })).toEqual([]);
 });
});
it('only offers direct selection for visible field/hand choices, never hidden, ordered or skill choices', () => {
  const options = { title:'Choose', instruction:'', cards:cards.map(c => ({...c, zone:'hand'})) };
  expect(allowsBoardChoice(options)).toBe(true);
  expect(allowsBoardChoice({...options, ordered:true})).toBe(false);
  expect(allowsBoardChoice({...options, effectDetails:true})).toBe(false);
  expect(allowsBoardChoice({...options, cards:[{...options.cards[0]!, hidden:true}]})).toBe(false);
  expect(allowsBoardChoice({...options, cards:[{...options.cards[0]!, zone:'grave'}]})).toBe(false);
});
it('names selected field copies by position before committing', () => {
  const targets = cards.map((c, i) => ({ ...c, name:'Title, Rinamuntaw', position:i ? 'You · Right' : 'You · Left' }));
  expect(selectedCardSummary(targets, ['b'])).toBe('Rinamuntaw · You · Right');
  expect(selectedCardSummary(targets, ['a', 'b'])).toContain('Left / Rinamuntaw · You · Right');
});
describe('card choice accounting', () => {
 it('applies Illana Bay only to the first selected Unit without stacking its inherent value', () => {
   expect(selectionTotal(cards, ['a', 'b'], 2)).toBe(3);
   expect(selectionTotal(cards, ['b', 'a'], 2)).toBe(4);
   expect(selectionTotal(cards, ['b'], 2)).toBe(2);
 });
 it('counts weighted costs, independent copies, and repeated IDs correctly', () => {
   expect(selectionTotal(cards,['a'])).toBe(2);
   expect(selectionTotal(cards,['a','b'])).toBe(3);
   expect(selectionTotal(cards,['a','a'])).toBe(2);
 });
});

describe('pile-only choice filters', () => {
 it.each(['deck', 'grave', 'heart', 'exile'])('offers filters for %s', zone => {
   expect(allowsChoiceFilters(cards.map(c => ({ ...c, zone })))).toBe(true);
 });
 it.each(['codex', 'hand', 'ally', 'persona', 'barrier', 'check', 'extra', undefined])('keeps %s choices simple', zone => {
   expect(allowsChoiceFilters(cards.map(c => ({ ...c, zone })))).toBe(false);
 });
 it('does not add filters to mixed field and pile choices or empty choices', () => {
   expect(allowsChoiceFilters([{ ...cards[0]!, zone:'deck' }, { ...cards[1]!, zone:'hand' }])).toBe(false);
   expect(allowsChoiceFilters([])).toBe(false);
 });
});
