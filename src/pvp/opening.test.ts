import { describe, it, expect } from 'vitest';
import { MatchOpening } from './opening.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { personaChoices } from '../core/setup.js';
import { MatchSession } from './session.js';
const setups = [{ deck: STARTERS.Luzon!, choice: {} }, { deck: STARTERS.Visayas!, choice: {} }] as const;
const create = (dice = [6, 2]) => new MatchOpening([{ ...setups[0] }, { ...setups[1] }], () => dice.shift()!);
const advance = (opening: MatchOpening) => {
  opening.confirm(0, 'dice'); opening.confirm(1, 'dice');
  for (const p of [0, 1] as const) opening.confirm(p, 'persona', personaChoices(MATCH_INDEX, setups[p].deck)[0]);
  for (const p of [0, 1] as const) opening.confirm(p, 'codex', setups[p].deck.codex[0]);
};
describe('server-owned PvP opening', () => {
  it('requires rolling before choices and ignores duplicate/out-of-stage commands', () => {
    const o = create(); o.confirm(0, 'persona', 'bad'); o.confirm(0, 'dice');
    expect(o.stage).toBe('dice'); expect(o.confirmed).toEqual([false, false]);
    o.roll(0, 1); o.roll(0, 1); o.roll(1, 1);
    expect(o.rolls).toEqual([6, 2]); expect(o.first).toBe(0);
    advance(o); expect(o.stage).toBe('reveal');
    o.roll(0, 1); expect(o.first).toBe(0);
  });
  it('rerolls ties with a new round and rejects stale roll messages', () => {
    const o = create([3, 3, 1, 6]); o.roll(0, 1); o.roll(1, 1);
    expect(o.first).toBeNull(); o.roll(0, 1); expect(o.round).toBe(2);
    o.roll(1, 1); expect(o.rolls).toEqual([1, null]);
    o.roll(1, 2); expect(o.first).toBe(1);
  });
  it('hides choices until both selections are locked and rejects foreign cards', () => {
    const o = create(); o.roll(0, 1); o.roll(1, 1); o.confirm(0, 'dice'); o.confirm(1, 'dice');
    expect(() => o.confirm(0, 'persona', 'invalid')).toThrow();
    o.confirm(0, 'persona', personaChoices(MATCH_INDEX, setups[0].deck)[0]);
    expect(o.view().choices).toBeUndefined(); expect(o.stage).toBe('persona');
    o.confirm(1, 'persona', personaChoices(MATCH_INDEX, setups[1].deck)[0]);
    expect(() => o.confirm(0, 'codex', setups[1].deck.codex[0])).toThrow();
    o.confirm(0, 'codex', setups[0].deck.codex[0]); expect(o.view().choices).toBeUndefined();
    o.confirm(1, 'codex', setups[1].deck.codex[0]); expect(o.view().choices).toHaveLength(2);
  });
  it('starts the engine with the displayed first player only after joint reveal', () => {
    const o = create([1, 6]); o.roll(0, 1); o.roll(1, 1); advance(o);
    o.confirm(0, 'reveal'); expect(o.complete).toBe(false);
    o.confirm(1, 'reveal'); expect(o.complete).toBe(true);
    const session = new MatchSession(o.selected(), 5, () => {}, o.first!);
    expect(session.game.turnPlayer).toBe(1); session.close();
  });
});
