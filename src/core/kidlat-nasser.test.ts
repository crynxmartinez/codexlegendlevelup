/**
 * Deerstep Runner, Kidlat and Liguasan Mudblade, Nasser.
 *
 * Both were rewritten because each was strictly dominated by another card in
 * its own deck — Sinta did everything Kidlat did and also fired on a special
 * call, and Sitti Rahma was Nasser's whole Last Oath plus a free +3000. The
 * replacements are both new verbs for the engine, so what these check is that
 * the new verb actually happens and that it stops where it is supposed to:
 * that Kidlat only touches the *whiff* and not a successful Sipol or the card
 * Thousand Knots pays as a cost, and that Nasser's mill both reaches the Grave
 * and moves the Garahana counter it exists to move.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { AGTA_SCRIPTS } from '../cards/agta.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { def, inst, you } from './state.js';
import {
  autoChooser, sipol, isUnitCard, maguindanaoGraveCountRaw, millTop, offerUnit,
  type Chooser, type EffectContext,
} from './effects.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Agta', 'Maguindanao']);
const ME: PlayerId = 0;
const KIDLAT = 'agta/deerstep-runner-kidlat';
const NASSER = 'maguindanao/liguasan-mudblade-nasser';

function agtaGame(): GameState {
  return createGame(
    index,
    [agtaDeck as unknown as DeckList, magDeck as unknown as DeckList],
    { seed: 11 },
  );
}

function magGame(): GameState {
  return createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 11 },
  );
}

function ctxFor(
  game: GameState, source: string, chooser: Chooser = autoChooser,
  event?: EffectContext['event'],
): EffectContext {
  return { index, game, me: ME, source, chooser, event };
}

/**
 * Pull a card of the wanted kind out of the deck and put it on top.
 *
 * `skip` matters: called twice in a row without it, the second call finds the
 * card the first one just moved to index 0 and hands back the same uid.
 */
function stackTop(game: GameState, wantUnit: boolean, skip: string[] = []): string {
  const ps = you(game, ME);
  const uid = ps.deck.find(
    (u) => !skip.includes(u) && isUnitCard(def(index, game, u)) === wantUnit,
  );
  if (!uid) throw new Error(`no ${wantUnit ? 'Unit' : 'non-Unit'} left in the deck`);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.deck.unshift(uid);
  return uid;
}

/** Put a copy of `defId` from the deck into ally `slot`. */
function place(game: GameState, defId: string, slot: number): string {
  const ps = you(game, ME);
  const uid = ps.deck.find((u) => def(index, game, u).id === defId);
  if (!uid) throw new Error(`${defId} is not in this decklist`);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.allies[slot] = uid;
  inst(game, uid).zone = 'ally';
  inst(game, uid).slot = slot;
  return uid;
}

describe('Kidlat — a whiffed Sipol becomes a card', () => {
  it('puts the revealed non-Unit into hand instead of the bottom', async () => {
    const game = agtaGame();
    place(game, KIDLAT, 0);
    const whiff = stackTop(game, false);
    const ps = you(game, ME);
    const deckBefore = ps.deck.length;
    const handBefore = ps.hand.length;

    const called = await sipol(ctxFor(game, ps.allies[0]!));

    expect(called).toBe(false);
    expect(ps.hand).toContain(whiff);
    expect(inst(game, whiff).zone).toBe('hand');
    // It left the deck rather than being cycled to the bottom.
    expect(ps.deck).toHaveLength(deckBefore - 1);
    expect(ps.deck).not.toContain(whiff);
    expect(ps.hand).toHaveLength(handBefore + 1);
  });

  it('bottoms it as before when Kidlat is not on the field', async () => {
    const game = agtaGame();
    const whiff = stackTop(game, false);
    const ps = you(game, ME);
    const deckBefore = ps.deck.length;
    const handBefore = ps.hand.length;

    await sipol(ctxFor(game, whiff));

    expect(ps.hand).toHaveLength(handBefore);
    expect(ps.deck).toHaveLength(deckBefore);
    expect(ps.deck[ps.deck.length - 1]).toBe(whiff);
  });

  it('leaves a successful Sipol alone — he only changes the miss', async () => {
    const game = agtaGame();
    place(game, KIDLAT, 0);
    const unit = stackTop(game, true);
    const ps = you(game, ME);
    const handBefore = ps.hand.length;

    const called = await sipol(ctxFor(game, ps.allies[0]!));

    expect(called).toBe(true);
    expect(ps.allies).toContain(unit);
    expect(inst(game, unit).zone).toBe('ally');
    // Nothing was banked: the Unit went to the field, not the hand.
    expect(ps.hand).toHaveLength(handBefore);
  });

  it('does not refund the card Thousand Knots pays to the bottom', async () => {
    // Thousand Knots reads "[Cost: send that card to the bottom of the deck]
    // reveal one more". Kidlat must not hand that card back, or the cost is
    // not a cost. autoChooser.revealConfirm returns true, so the reroll is
    // always taken here.
    const game = agtaGame();
    place(game, KIDLAT, 0);
    const ps = you(game, ME);
    const knots = ps.codex.find(
      (uid) => def(index, game, uid).id === 'agta/thousand-knots',
    );
    expect(knots, 'Thousand Knots is in the Agta decklist').toBeTruthy();
    ps.activeCodex = knots!;
    game.phase = 'main';
    game.turnPlayer = ME;

    // Two whiffs on top: the first is spent as the reroll cost, the second is
    // the one Kidlat is allowed to bank.
    const second = stackTop(game, false);
    const first = stackTop(game, false, [second]);
    expect(first).not.toBe(second);

    await sipol(ctxFor(game, ps.allies[0]!));

    // The cost went to the bottom of the deck, not to hand.
    expect(ps.hand).not.toContain(first);
    expect(ps.deck).toContain(first);
    // The reroll's own whiff is Kidlat's to keep.
    expect(ps.hand).toContain(second);
  });
});

describe('Nasser — the Last Oath that sinks the deck', () => {
  it('sends the top three cards of the deck to the Grave', async () => {
    const game = magGame();
    const nasser = place(game, NASSER, 0);
    const ps = you(game, ME);
    const doomed = ps.deck.slice(0, 3);
    const deckBefore = ps.deck.length;

    const ability = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    const event = { name: 'unitDamagedByAbility' as const, unit: nasser, damager: ME };
    expect(ability.canRun!(ctxFor(game, nasser, autoChooser, event))).toBe(true);
    await ability.run(ctxFor(game, nasser, autoChooser, event));

    expect(ps.deck).toHaveLength(deckBefore - 3);
    for (const uid of doomed) {
      expect(ps.grave).toContain(uid);
      expect(inst(game, uid).zone).toBe('grave');
    }
  });

  it('advances Garahana by the Maguindanaon units it buries', async () => {
    // This is the whole reason the card exists: Garahana wants 5 Maguindanaon
    // units in the Grave, and before this nothing put one there except
    // Offering your own board away.
    const game = magGame();
    const nasser = place(game, NASSER, 0);
    const ps = you(game, ME);
    const before = maguindanaoGraveCountRaw(index, game, ME);
    const buried = ps.deck.slice(0, 3);
    // Counted here from the printed rules rather than by calling the engine's
    // own helper, so the two have to agree: Maguindanaon units only, Forces
    // included (they are Level 0 bodies), Alad and Bai Samira worth two.
    const expected = buried.reduce((n, uid) => {
      const d = def(index, game, uid);
      if (!isUnitCard(d) || !d.subtypes?.some(s => s === 'Maguindanao' || s === 'Maguindanaon')) return n;
      return n + (d.id === 'maguindanao/set-1/last-witness-of-the-old-words-alad' || d.id === 'maguindanao/kuta-wato-gate-bulwark-bai-samira' ? 2 : 1);
    }, 0);
    expect(expected, 'the top of this deck should bury something countable')
      .toBeGreaterThan(0);

    const ability = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    await ability.run(ctxFor(
      game, nasser, autoChooser,
      { name: 'unitDamagedByAbility', unit: nasser, damager: ME },
    ));

    expect(maguindanaoGraveCountRaw(index, game, ME) - before).toBe(expected);
  });

  it('fires for real when Nasser is Offered, not only when called directly', async () => {
    const game = magGame();
    const nasser = place(game, NASSER, 0);
    const ps = you(game, ME);
    const deckBefore = ps.deck.length;

    // offerUnit is what a cost calls; the Last Oath rides the event it emits.
    offerUnit(ctxFor(game, nasser), nasser);
    expect(inst(game, nasser).zone).toBe('grave');

    const ability = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    const event = { name: 'unitDamagedByAbility' as const, unit: nasser, damager: ME };
    expect(ability.canRun!(ctxFor(game, nasser, autoChooser, event))).toBe(true);
    await ability.run(ctxFor(game, nasser, autoChooser, event));

    expect(ps.deck).toHaveLength(deckBefore - 3);
  });

  it('ignores another unit being Offered', () => {
    const game = magGame();
    const nasser = place(game, NASSER, 0);
    const other = place(game, 'maguindanao/illana-tide-harpooner-hakim', 1);

    const ability = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    expect(ability.canRun!(ctxFor(
      game, nasser, autoChooser,
      { name: 'unitDamagedByAbility', unit: other, damager: ME },
    ))).toBe(false);
  });

  it('costs no Energy — being Offered is the cost', () => {
    const ability = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    expect(ability.energyCost).toBeUndefined();

    const game = magGame();
    const nasser = place(game, NASSER, 0);
    you(game, ME).energy = 0;
    expect(ability.canRun!(ctxFor(
      game, nasser, autoChooser,
      { name: 'unitDamagedByAbility', unit: nasser, damager: ME },
    ))).toBe(true);
  });
});

describe('millTop — stops rather than throws', () => {
  it('takes what is left when the deck is shorter than asked', () => {
    const game = magGame();
    const ps = you(game, ME);
    ps.deck = ps.deck.slice(0, 1);
    const last = ps.deck[0]!;

    const sent = millTop(ctxFor(game, last), 3);

    expect(sent).toEqual([last]);
    expect(ps.deck).toHaveLength(0);
    expect(ps.grave).toContain(last);
  });

  it('does nothing at all on an empty deck', () => {
    const game = magGame();
    const ps = you(game, ME);
    const anchor = ps.deck[0]!;
    ps.deck = [];
    const graveBefore = ps.grave.length;

    expect(millTop(ctxFor(game, anchor), 3)).toEqual([]);
    expect(ps.grave).toHaveLength(graveBefore);
  });
});

describe('neither card is dominated any more', () => {
  it('Kidlat and Sinta no longer share an effect', () => {
    const kidlat = AGTA_SCRIPTS[KIDLAT]!.abilities![0]!;
    const sinta = AGTA_SCRIPTS['agta/ember-resin-grandmother-sinta']!.abilities![0]!;
    expect(kidlat.text).not.toBe(sinta.text);
    // Sinta keeps the Sipol trigger; Kidlat is now a passive with none.
    expect(sinta.trigger).toBe('placed');
    expect(kidlat.trigger).toBeUndefined();
  });

  it('Nasser and Sitti Rahma no longer share an effect', () => {
    const nasser = MAGUINDANAO_SCRIPTS[NASSER]!.abilities![0]!;
    const rahma = MAGUINDANAO_SCRIPTS[
      'maguindanao/kuta-wato-banner-keeper-sitti-rahma'
    ]!.abilities![0]!;
    expect(nasser.text).not.toBe(rahma.text);
    // Rahma searches, Nasser buries. Neither text should mention the other's verb.
    expect(nasser.text).not.toMatch(/search/i);
    expect(rahma.text).not.toMatch(/Grave/i);
  });
});
