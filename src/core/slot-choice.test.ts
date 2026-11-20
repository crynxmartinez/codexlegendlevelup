/**
 * Where a special-called unit lands.
 *
 * This used to be asked with `chooseMode` and a list of words — "Leftmost",
 * "Rightmost" — which made the player hold the board in their head and
 * translate. It is now `chooseSlot`, so the client can ask the question on a
 * picture of the zones instead.
 *
 * The tests below pin the two things a picture-based prompt depends on: that
 * the question arrives as a slot question at all, and that the candidate list
 * is the set of indices the client is meant to light up. The second case is
 * the one that matters most — with the board full, the answer destroys one of
 * your own units, so the client must be told exactly which ones are on offer.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { specialCall } from './effects.js';
import type { EffectContext } from './effects.js';
import { you } from './state.js';
import type { GameState } from './types.js';

const index = indexForDecks(['Agta', 'Maguindanao']);

/** Records every slot question and answers with a fixed index. */
function recorder(answer: number) {
  const asked: Array<{ prompt: string; candidates: number[] }> = [];
  const modes: string[] = [];
  const chooser = {
    async chooseAbility() { return null; },
    async chooseCards(_p: unknown, _q: unknown, c: string[], n: number) { return c.slice(0, n); },
    async chooseTarget(_p: unknown, _q: unknown, c: string[]) { return c[0] ?? null; },
    async chooseMode(_p: unknown, prompt: string) { modes.push(prompt); return 0; },
    async chooseSlot(_p: unknown, prompt: string, candidates: number[]) {
      asked.push({ prompt, candidates: [...candidates] });
      return answer;
    },
    async confirm() { return false; },
    async personifyPrompt() { return null; },
    async battleCards() { return []; },
    async blockPrompt() { return []; },
    async revealConfirm() { return false; },
    async revealCards() {},
  };
  return { chooser, asked, modes };
}

function ctxFor(game: GameState, chooser: unknown): EffectContext {
  // `source` is the card the ability is printed on; nothing here reads it.
  return {
    game, index, me: 0, source: '',
    chooser: chooser as EffectContext['chooser'],
  };
}

/** A unit sitting in hand, ready to be called onto the field. */
function unitInHand(game: GameState): string {
  const ps = you(game, 0);
  const uid = ps.deck.find((u) => {
    return index[game.cards[u]!.defId]?.type === 'Unit';
  });
  if (!uid) throw new Error('no unit in deck');
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  game.cards[uid]!.zone = 'hand';
  ps.hand.push(uid);
  return uid;
}

it('asks for a slot, not a mode, when there is a choice of empty zones', async () => {
  const game = createGame(index, [agtaDeck as unknown as DeckList, maguindanaoDeck as unknown as DeckList], { seed: 3 });
  const { chooser, asked, modes } = recorder(2);
  const uid = unitInHand(game);

  await specialCall(ctxFor(game, chooser), uid);

  expect(asked).toHaveLength(1);
  expect(modes).toHaveLength(0);
  expect(asked[0]!.candidates).toEqual([0, 1, 2, 3]);
  expect(you(game, 0).allies[2]).toBe(uid);
});

it('does not ask when only one zone is free', async () => {
  const game = createGame(index, [agtaDeck as unknown as DeckList, maguindanaoDeck as unknown as DeckList], { seed: 3 });
  const { chooser, asked } = recorder(0);
  const ps = you(game, 0);

  const filler = [0, 1, 2].map(() => unitInHand(game));
  filler.forEach((u, i) => {
    ps.allies[i] = u;
    game.cards[u]!.zone = 'ally';
    ps.hand.splice(ps.hand.indexOf(u), 1);
  });
  const uid = unitInHand(game);

  await specialCall(ctxFor(game, chooser), uid);

  expect(asked).toHaveLength(0);
  expect(ps.allies[3]).toBe(uid);
});

it('offers the occupied zones when the board is full, and destroys the one chosen', async () => {
  const game = createGame(index, [agtaDeck as unknown as DeckList, maguindanaoDeck as unknown as DeckList], { seed: 3 });
  const { chooser, asked } = recorder(1);
  const ps = you(game, 0);

  const filler = [0, 1, 2, 3].map(() => unitInHand(game));
  filler.forEach((u, i) => {
    ps.allies[i] = u;
    game.cards[u]!.zone = 'ally';
    ps.hand.splice(ps.hand.indexOf(u), 1);
  });
  const doomed = filler[1]!;
  const uid = unitInHand(game);

  await specialCall(ctxFor(game, chooser), uid);

  expect(asked).toHaveLength(1);
  expect(asked[0]!.candidates).toEqual([0, 1, 2, 3]);
  expect(asked[0]!.prompt).toContain('replace');
  expect(ps.allies[1]).toBe(uid);
  expect(game.cards[doomed]!.zone).not.toBe('ally');
});
