/**
 * Presentation events have to reach the client before the prompt they explain.
 *
 * An effect that searches a pile queues a `search` event — the pile lifts and
 * brightens — and then asks the player to choose. Queued events are drained by
 * the controller, and it drains at a handful of fixed points, none of which
 * used to be "before a prompt". So the announcement played once the whole
 * ability had finished: the pile lit up to say it was being searched after the
 * search was over.
 *
 * `effects.ts` makes nineteen chooser calls and no flushes of its own, so this
 * is enforced on the way into the chooser rather than at each call site.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser } from '../ai/bot.js';
import { scryTop, specialCall, type EffectContext } from './effects.js';
import { you } from './state.js';
import type { FxEvent } from './types.js';

/** Everything the client was told, in the order it was told. */
type Beat = { at: 'fx'; kind: FxEvent['kind'] } | { at: 'prompt'; name: string };

function harness() {
  const decks: [DeckList, DeckList] = [
    agtaDeck as unknown as DeckList,
    maguindanaoDeck as unknown as DeckList,
  ];
  const index = indexForDecks(['Agta', 'Maguindanao']);
  const game = createGame(index, decks, { seed: 3 });

  const beats: Beat[] = [];

  const ai = new AiChooser(index, () => game);
  const spy = Object.create(ai) as AiChooser;
  spy.revealConfirm = async () => {
    beats.push({ at: 'prompt', name: 'revealConfirm' });
    return false;
  };

  const gc = new GameController(game, index, {
    choosers: [spy, spy],
    hooks: { onFx: async (fx) => { beats.push({ at: 'fx', kind: fx.kind }); } },
  });

  return { game, gc, index, beats };
}

it('the pile is shown being searched before the player is asked about it', async () => {
  const { game, gc, index, beats } = harness();

  const ctx: EffectContext = {
    index,
    game,
    me: 0,
    source: you(game, 0).deck[0]!,
    chooser: gc.chooserFor(0),
  };

  await scryTop(ctx);

  const search = beats.findIndex((b) => b.at === 'fx' && b.kind === 'search');
  const prompt = beats.findIndex((b) => b.at === 'prompt');

  expect(search).toBeGreaterThanOrEqual(0);
  expect(prompt).toBeGreaterThanOrEqual(0);
  expect(search).toBeLessThan(prompt);
});

it('nothing is left queued once the prompt has been answered', async () => {
  const { game, gc, index } = harness();

  const ctx: EffectContext = {
    index,
    game,
    me: 0,
    source: you(game, 0).deck[0]!,
    chooser: gc.chooserFor(0),
  };

  await scryTop(ctx);

  expect(game.pendingFx).toHaveLength(0);
});

it('a unit called out of the deck is seen leaving the deck, then landing', async () => {
  const { game, gc, index, beats } = harness();

  // Any unit, put on top of the deck so the call has a pile to come out of.
  const unit = you(game, 0).deck.find(
    (u) => index[game.cards[u]!.defId]!.type === 'Unit',
  )!;

  const ctx: EffectContext = {
    index,
    game,
    me: 0,
    source: unit,
    chooser: gc.chooserFor(0),
  };

  await specialCall(ctx, unit);
  await gc.drainFxForTest();

  const kinds = beats.filter((b) => b.at === 'fx').map((b) => b.kind);
  const emit = kinds.indexOf('emit');
  const arrive = kinds.indexOf('arrive');

  expect(emit).toBeGreaterThanOrEqual(0);
  expect(arrive).toBeGreaterThanOrEqual(0);
  // The journey has to precede the landing, or the card lands and then flies.
  expect(emit).toBeLessThan(arrive);
});

it('a card played from hand gets no journey — it is already on screen', async () => {
  const { game, gc, index, beats } = harness();

  const unit = you(game, 0).hand.find(
    (u) => index[game.cards[u]!.defId]!.type === 'Unit',
  )!;

  const ctx: EffectContext = {
    index,
    game,
    me: 0,
    source: unit,
    chooser: gc.chooserFor(0),
  };

  await specialCall(ctx, unit);
  await gc.drainFxForTest();

  const kinds = beats.filter((b) => b.at === 'fx').map((b) => b.kind);
  expect(kinds).not.toContain('emit');
  expect(kinds).toContain('arrive');
});
