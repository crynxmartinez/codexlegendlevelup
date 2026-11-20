import { describe, expect, it } from 'vitest';
import { cardStatBadges, compactCardStat } from './card-stats.js';

const darawan = { id:'agta/set-1/returning-sky-captain-darawan', type:'Unit', power:6000, defense:10000 };

describe('contextual card statistics', () => {
  it('shows printed Power and Defense on a known hand or catalogue card', () => {
    expect(cardStatBadges(darawan).map(({ label, value, text }) => ({ label, value, text }))).toEqual([
      { label:'ATK', value:6000, text:'6k' }, { label:'DEF', value:10000, text:'10k' },
    ]);
  });
  it('uses the supplied effective field Power without also displaying printed Defense', () => {
    const values = cardStatBadges(darawan, { context:'field', currentPower:9000 });
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ label:'ATK', value:9000, description:'ATK: current Power 9,000' });
    expect(darawan).toMatchObject({ power:6000, defense:10000 });
  });
  it('shows only printed Defense for a committed defender, without folding in a battle bonus', () => {
    expect(cardStatBadges(darawan, { context:'defense' })).toEqual([
      expect.objectContaining({ label:'DEF', value:10000, description:'DEF: Defense contribution 10,000' }),
    ]);
  });
  it('keeps current Power and printed Defense distinct in explicit inspection', () => {
    expect(cardStatBadges(darawan, { context:'inspect', currentPower:12000 }).map(b => b.value)).toEqual([12000, 10000]);
  });
  it('supports Forces and preserves real zero Defense', () => {
    expect(cardStatBadges({ type:'Force', power:3000, defense:15000 }).map(b => b.text)).toEqual(['3k', '15k']);
    expect(cardStatBadges({ type:'Unit', power:11000, defense:0 })[1]).toMatchObject({ label:'DEF', value:0, text:'0' });
  });
  it.each(['Action', 'Codex', 'Sentry', 'Hidden'])('never fabricates statistics for %s', type => {
    expect(cardStatBadges({ type, power:0, defense:0 })).toEqual([]);
  });
  it('does not expose hidden identity or infer sentinel zero values', () => {
    expect(cardStatBadges(darawan, { context:'printed', hidden:true })).toEqual([]);
    expect(cardStatBadges({ ...darawan, id:'__hidden__', power:0, defense:0 })).toEqual([]);
    expect(cardStatBadges(darawan, { context:'field', currentPower:9000, hidden:true })).toEqual([]);
  });
  it('does not turn absent or non-finite data into zero or silently use printed field Power', () => {
    expect(cardStatBadges({ type:'Unit', defense:0 }).map(b => b.label)).toEqual(['DEF']);
    expect(cardStatBadges({ type:'Force', power:NaN, defense:Infinity })).toEqual([]);
    expect(cardStatBadges(darawan, { context:'field', currentPower:NaN })).toEqual([]);
  });
  it('does not alter the card values when an effective Power is zero or negative', () => {
    expect(cardStatBadges(darawan, { context:'field', currentPower:0 })[0]?.text).toBe('0');
    expect(cardStatBadges(darawan, { context:'field', currentPower:-1000 })[0]?.text).toBe('-1k');
  });
});

it.each([[0,'0'],[15000,'15k'],[1500,'1,500'],[11500,'11,500'],[-1500,'-1,500']])('formats exact value %s as %s', (value, text) => {
  expect(compactCardStat(value as number)).toBe(text);
});
