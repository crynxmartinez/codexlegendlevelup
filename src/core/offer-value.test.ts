/**
 * "Treated as 2 Offer" has to be true when the cost is paid, not only after.
 *
 * Kamil and Bai Samira print it, and it was honoured in two of the three
 * places it matters — the units-Offered-this-turn counter and the Grave count
 * — but not in the cost itself, which counted cards. Offering Kamil against
 * "Offer 2 of your units" left the confirm button reading 1/2 with nothing
 * else worth selecting, so the card's own text was not true of the game.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { currentPower, def, inst, moveCard, you } from './state.js';
import {
  autoChooser, maguindanaoGraveCountRaw, offerTotal, offerValue,
  type ChooseCardsOptions, type Chooser, type EffectContext,
} from './effects.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const ME: PlayerId = 0;

const KAMIL = 'maguindanao/pulangi-ember-spear-kamil';
const SAMIRA = 'maguindanao/kuta-wato-gate-bulwark-bai-samira';
const HARUN = 'maguindanao/liguasan-reed-eye-harun';
const SALIK = 'maguindanao/kuta-wato-warcaller-datu-salik';

function fresh(): GameState {
  const g = createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 6 },
  );
  you(g, ME).energy = 4;
  return g;
}

/**
 * Stand a card in the Persona zone.
 *
 * Not `place` — that leaves it in an Ally Zone, where it would also count
 * toward the Offer total and quietly make every "can you pay?" test pass.
 */
function placePersona(g: GameState, defId: string): string {
  const ps = you(g, ME);
  const uid = ps.deck.find((u) => def(index, g, u).id === defId);
  if (!uid) throw new Error(`${defId} is not in this decklist`);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.persona = uid;
  inst(g, uid).zone = 'persona';
  inst(g, uid).slot = null;
  return uid;
}

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

/** Records what the cost asked for, then answers it the way a player would. */
function recording(pick: (c: string[]) => string[]): Chooser & {
  seen: { count: number; weights?: Record<string, number> } | null;
} {
  const spy = {
    ...autoChooser,
    seen: null as { count: number; weights?: Record<string, number> } | null,
    async chooseCards(
      _p: PlayerId, _q: string, candidates: string[], count: number,
      opts: ChooseCardsOptions = {},
    ) {
      spy.seen = { count, ...(opts.weights ? { weights: opts.weights } : {}) };
      return pick(candidates);
    },
  };
  return spy;
}

describe('Offer value', () => {
  it('prices Kamil at 2 and everyone else at 1', () => {
    // Kamil doubles the cost; Bai Samira doubles the Grave. They used to do
    // both, which is what made them the same card.
    const g = fresh();
    const kamil = place(g, KAMIL, 0);
    const samira = place(g, SAMIRA, 1);
    const harun = place(g, HARUN, 2);
    expect(offerValue(index, g, kamil)).toBe(2);
    expect(offerValue(index, g, samira), 'Samira is a Grave card, not a cost').toBe(1);
    expect(offerValue(index, g, harun)).toBe(1);
    expect(offerTotal(index, g, [kamil, harun])).toBe(3);
  });

  it('counts Bai Samira as two in the Grave, and Kamil as one', () => {
    // The other half of the split, and the half Garahana reads.
    const g = fresh();
    const samira = place(g, SAMIRA, 0);
    const before = maguindanaoGraveCountRaw(index, g, ME);
    moveCard(g, samira, 'grave');
    const afterSamira = maguindanaoGraveCountRaw(index, g, ME);
    expect(afterSamira - before, 'Samira counts twice').toBe(2);

    const kamil = place(g, KAMIL, 0);
    moveCard(g, kamil, 'grave');
    expect(
      maguindanaoGraveCountRaw(index, g, ME) - afterSamira,
      'Kamil counts once now',
    ).toBe(1);
  });

  it('lets one Kamil pay an Offer of 2', async () => {
    // Salik's Garahana skill: on attack, [Cost: Offer 2 of your units] this
    // unit gains the Power the offered units had. Kamil is 6000, so paying
    // with him alone is both the cost test and the effect test.
    const g = fresh();
    const kamil = place(g, KAMIL, 0);
    placePersona(g, SALIK);
    you(g, ME).releasedState = 'Garahana';
    const ps = you(g, ME);
    const powerBefore = currentPower(index, g, ps.persona!);
    const kamilPower = currentPower(index, g, kamil);

    const chooser = recording(() => [kamil]);
    const ability = MAGUINDANAO_SCRIPTS[SALIK]!.abilities![1]!;
    // The skill fires on Salik's attack, so the guard needs that event.
    const ctx: EffectContext = {
      index, game: g, me: ME, source: ps.persona!, chooser,
      event: { name: 'attack', unit: ps.persona! },
    };

    expect(ability.canRun!(ctx), 'Kamil alone should satisfy the guard').toBe(true);
    await ability.run(ctx);

    // The cost was paid and the effect happened.
    expect(inst(g, kamil).zone).toBe('grave');
    expect(currentPower(index, g, ps.persona!) - powerBefore).toBe(kamilPower);
  });

  it('tells the chooser what each candidate is worth', async () => {
    const g = fresh();
    const kamil = place(g, KAMIL, 0);
    const harun = place(g, HARUN, 1);
    placePersona(g, SALIK);
    you(g, ME).releasedState = 'Garahana';

    const chooser = recording(() => [kamil]);
    const ability = MAGUINDANAO_SCRIPTS[SALIK]!.abilities![1]!;
    await ability.run({ index, game: g, me: ME, source: you(g, ME).persona!, chooser });

    expect(chooser.seen?.weights?.[kamil]).toBe(2);
    expect(chooser.seen?.weights?.[harun]).toBe(1);
  });

  it('still refuses when the board cannot pay', () => {
    // One ordinary body is worth 1, and the cost is 2.
    const g = fresh();
    place(g, HARUN, 0);
    placePersona(g, SALIK);
    you(g, ME).releasedState = 'Garahana';
    const ability = MAGUINDANAO_SCRIPTS[SALIK]!.abilities![1]!;
    expect(ability.canRun!({
      index, game: g, me: ME, source: you(g, ME).persona!, chooser: autoChooser,
      event: { name: 'attack', unit: you(g, ME).persona! },
    })).toBe(false);
  });

  it('does not fire when the player under-pays', async () => {
    // Picking one ordinary unit against an Offer of 2 is not a payment, and
    // the effect must not happen anyway.
    const g = fresh();
    const harun = place(g, HARUN, 0);
    const kamil = place(g, KAMIL, 1);
    placePersona(g, SALIK);
    you(g, ME).releasedState = 'Garahana';
    const ps = you(g, ME);
    const powerBefore = currentPower(index, g, ps.persona!);

    const chooser = recording(() => [harun]);
    const ability = MAGUINDANAO_SCRIPTS[SALIK]!.abilities![1]!;
    await ability.run({ index, game: g, me: ME, source: ps.persona!, chooser });

    expect(currentPower(index, g, ps.persona!), 'an under-paid cost buys nothing')
      .toBe(powerBefore);
    expect(inst(g, kamil).zone).toBe('ally');
  });
});
