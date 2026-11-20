/**
 * The Ancestors Open the Way now reads the Heart, not the deck.
 *
 * It used to be Maraya's first skill printed on a card — the same search of
 * the same deck for the same Level 2 or lower Babaylan — so the interesting
 * property is not that it calls a unit, it is *where it refuses to look*. A
 * deck full of legal targets and an empty Heart must give nothing, because
 * that is the whole of the change and the only part a rename of the rules
 * text could not deliver on its own.
 */
import { describe, it, expect } from 'vitest';
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { BABAYLAN_SCRIPTS } from '../cards/babaylan.js';
import { def, inst, you } from './state.js';
import { autoChooser, type EffectContext } from './effects.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Babaylan', 'Agta']);
const ME: PlayerId = 0;
const CARD = 'babaylan/the-ancestors-open-the-way';

const action = () => BABAYLAN_SCRIPTS[CARD]!.action!;

function fresh(): GameState {
  const g = createGame(
    index,
    [babaylanDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 9 },
  );
  you(g, ME).energy = 2;
  return g;
}

function ctxFor(game: GameState, source: string): EffectContext {
  return { index, game, me: ME, source, chooser: autoChooser };
}

/** A Level ≤2 Babaylan Unit taken out of the deck and put into the Heart. */
function moveOneIntoHeart(game: GameState): string {
  const ps = you(game, ME);
  const uid = ps.deck.find((u) => {
    const d = def(index, game, u);
    return d.type === 'Unit' && d.level <= 2 && d.subtypes?.includes('Babaylan');
  });
  if (!uid) throw new Error('no legal Babaylan unit in this decklist');
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.heart.push(uid);
  inst(game, uid).zone = 'heart';
  return uid;
}

/** How many legal targets are sitting in the deck right now. */
function legalInDeck(game: GameState): number {
  return you(game, ME).deck.filter((u) => {
    const d = def(index, game, u);
    return d.type === 'Unit' && d.level <= 2 && d.subtypes?.includes('Babaylan');
  }).length;
}

describe('The Ancestors Open the Way — the Heart, and only the Heart', () => {
  it('calls a unit out of the Heart and onto the field', async () => {
    const game = fresh();
    const target = moveOneIntoHeart(game);
    const ps = you(game, ME);
    const heartBefore = ps.heart.length;

    expect(action().canRun!(ctxFor(game, target))).toBe(true);
    await action().run(ctxFor(game, target));

    expect(ps.allies).toContain(target);
    expect(inst(game, target).zone).toBe('ally');
    // It left the Heart rather than being copied out of it.
    expect(ps.heart).not.toContain(target);
    expect(ps.heart).toHaveLength(heartBefore - 1);
  });

  it('does nothing with an empty Heart, however full the deck is', () => {
    // This is the change. Before, the deck below was all it needed.
    const game = fresh();
    const ps = you(game, ME);
    ps.heart = [];
    expect(legalInDeck(game), 'the deck should still be full of legal targets')
      .toBeGreaterThan(0);

    expect(action().canRun!(ctxFor(game, ps.deck[0]!))).toBe(false);
  });

  it('leaves the deck untouched when it does fire', async () => {
    const game = fresh();
    const target = moveOneIntoHeart(game);
    const ps = you(game, ME);
    const deckBefore = [...ps.deck];

    await action().run(ctxFor(game, target));

    expect(ps.deck).toEqual(deckBefore);
  });

  it('ignores a Heart holding nothing it is allowed to call', () => {
    // Level 3s and non-Babaylan cards are in the Heart constantly — Sanib
    // puts whatever you spent there — so "the Heart is not empty" is not the
    // same question as "the Heart has a target".
    const game = fresh();
    const ps = you(game, ME);
    const tooBig = ps.deck.find((u) => {
      const d = def(index, game, u);
      return d.type === 'Unit' && d.level === 3;
    });
    expect(tooBig, 'the decklist should contain a Level 3').toBeTruthy();
    ps.deck.splice(ps.deck.indexOf(tooBig!), 1);
    ps.heart = [tooBig!];
    inst(game, tooBig!).zone = 'heart';

    expect(action().canRun!(ctxFor(game, tooBig!))).toBe(false);
  });

  it('needs an open Ally Zone and the Energy', () => {
    const game = fresh();
    const target = moveOneIntoHeart(game);
    const ps = you(game, ME);

    ps.energy = 1;
    expect(action().canRun!(ctxFor(game, target))).toBe(false);

    ps.energy = 2;
    ps.allies = ps.allies.map((_, i) => `filler${i}`) as typeof ps.allies;
    expect(action().canRun!(ctxFor(game, target))).toBe(false);
  });
});
