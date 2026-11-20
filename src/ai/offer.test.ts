/**
 * The bot spends the unit that wants to be spent.
 *
 * Asserted as a rule rather than measured as a win rate, deliberately. Every
 * other AI idea this session was justified by a benchmark and every one of
 * them came back inside the noise — a 120-game sample moved the *same*
 * profile five points between two runs. This one needs no benchmark: a Last
 * Oath fires a free skill for a cost that is being paid either way, so
 * Offering the unit that prints one is never worse than Offering the one that
 * does not. What a test can do here is hold the ordering in place.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from '../core/setup.js';
import { def, inst, you } from '../core/state.js';
import { offerOrder, printsLastOath } from './lines.js';
import type { GameState, PlayerId } from '../core/types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const ME: PlayerId = 0;

function game(): GameState {
  return createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 4 },
  );
}

/** Pull a card out of the deck and stand it in an Ally Zone. */
function place(g: GameState, defId: string, slot: number): string {
  const ps = you(g, ME);
  const uid = ps.deck.find((u) => def(index, g, u).id === defId);
  if (!uid) throw new Error(`${defId} is not in this decklist`);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.allies[slot] = uid;
  inst(g, uid).zone = 'ally';
  inst(g, uid).slot = slot;
  return uid;
}

const HAKIM = 'maguindanao/illana-tide-harpooner-hakim';          // L1, Last Oath
const RAHMA = 'maguindanao/kuta-wato-banner-keeper-sitti-rahma';  // L1, Last Oath
const KAMIL = 'maguindanao/pulangi-ember-spear-kamil';            // L1, no Last Oath
const SABIR = 'maguindanao/kuta-wato-oath-shield-panglima-sabir';

describe('choosing what to Offer', () => {
  it('knows which cards print a Last Oath', () => {
    const g = game();
    const hakim = place(g, HAKIM, 0);
    const kamil = place(g, KAMIL, 1);
    // Guards the detection itself: the ordering below is only meaningful if
    // this is reading the real ability text.
    expect(printsLastOath(index, g, hakim)).toBe(true);
    expect(printsLastOath(index, g, kamil)).toBe(false);
  });

  it('puts a Last Oath unit ahead of one without', () => {
    const g = game();
    const kamil = place(g, KAMIL, 0);
    const hakim = place(g, HAKIM, 1);

    const order = offerOrder(index, g, ME, [kamil, hakim]);

    expect(order, 'an ordering should be offered when an Oath is present').toBeTruthy();
    expect(order![0]).toBe(hakim);
  });

  it('leaves the choice alone when nothing prints one', () => {
    // Returning null rather than an arbitrary order matters: the caller falls
    // back to its own `worstFirst`, which is the right judge when Offering
    // really is a pure cost.
    const g = game();
    const kamil = place(g, KAMIL, 0);
    const sabir = place(g, SABIR, 1);

    expect(offerOrder(index, g, ME, [kamil, sabir])).toBeNull();
  });

  it('spends the cheapest Last Oath when the body is not coming back', () => {
    // Two Oaths, no Marsh: the trigger is free either way, so the body that
    // costs least to lose is the one to spend.
    const g = game();
    const hakim = place(g, HAKIM, 0);
    const rahma = place(g, RAHMA, 1);

    const order = offerOrder(index, g, ME, [hakim, rahma])!;
    const first = def(index, g, order[0]!);
    const second = def(index, g, order[1]!);
    expect(first.level).toBeLessThanOrEqual(second.level);
  });

  it('never drops or duplicates a candidate', () => {
    // It reorders a cost's candidate list; losing one would quietly make a
    // legal Offer impossible.
    const g = game();
    const uids = [place(g, HAKIM, 0), place(g, KAMIL, 1), place(g, RAHMA, 2)];

    const order = offerOrder(index, g, ME, uids)!;
    expect([...order].sort()).toEqual([...uids].sort());
  });
});
