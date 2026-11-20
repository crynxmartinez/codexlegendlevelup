/**
 * Liguasan Marsh announcing itself.
 *
 * The recall is queued out of offerUnit() and run later by the controller
 * rather than as a skill, so it used to reach in and move the card with
 * nothing on screen saying which card had decided that: a unit simply climbed
 * out of the Grave on its own. The log named the Codex; the board did not.
 *
 * The order below is the whole point. The card that causes a thing speaks
 * first, the card that moves lights second, and only then does it move — so
 * the test asserts the sequence, not merely that each beat happened.
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { AiChooser } from '../ai/bot.js';
import { you } from './state.js';
import type { GameState } from './types.js';

const index = indexForDecks(['Agta', 'Maguindanao']);

function setup() {
  const decks: [DeckList, DeckList] = [
    maguindanaoDeck as unknown as DeckList,
    agtaDeck as unknown as DeckList,
  ];
  const game = createGame(index, decks, { seed: 7 });
  const ai = new AiChooser(index, () => game);

  const beats: string[] = [];
  const gc = new GameController(game, index, {
    choosers: [ai, ai],
    hooks: {
      onAbilityActivated: async (uid, _label, _p, kind) => {
        beats.push(`announce:${kind}:${index[game.cards[uid]!.defId]!.name}`);
      },
      onFx: async (fx) => {
        if (fx.kind === 'emit') beats.push(`emit:${fx.from}->${fx.to}`);
      },
    },
  });
  return { game, gc, beats };
}

/** Put `uid` in the Grave and make the Marsh the player's live Codex. */
function primeRecall(game: GameState, uid: string): void {
  const ps = you(game, 0);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  game.cards[uid]!.zone = 'grave';
  ps.grave.push(uid);
  const marsh = ps.codex.find(
    (c) => game.cards[c]!.defId === 'maguindanao/liguasan-marsh',
  )!;
  ps.activeCodex = marsh;
  game.pendingOfferRecall.push({ uid, owner: 0, codex: marsh });
}

function aUnit(game: GameState): string {
  const uid = you(game, 0).deck.find(
    (u) => index[game.cards[u]!.defId]?.type === 'Unit',
  );
  if (!uid) throw new Error('no unit in deck');
  return uid;
}

it('the Codex announces itself before the card leaves the Grave', async () => {
  const { game, gc, beats } = setup();
  const uid = aUnit(game);
  primeRecall(game, uid);

  await gc.flushOfferRecall();
  // The emit is queued by the effect and drained by the controller a moment
  // later, exactly as runAbility() does after this flush.
  await gc.drainFxForTest();

  expect(beats).toEqual([
    'announce:codex:Liguasan Marsh',
    'emit:grave->field',
  ]);
  expect(you(game, 0).allies).toContain(uid);
});

it('says nothing when the recall cannot happen', async () => {
  const { game, gc, beats } = setup();
  const uid = aUnit(game);
  primeRecall(game, uid);

  // Every Ally Zone taken: the recall is dropped, so there is nothing to
  // announce and the Codex must not flash for an effect that did not occur.
  const ps = you(game, 0);
  const filler = ps.deck.filter((u) => index[game.cards[u]!.defId]?.type === 'Unit').slice(0, 4);
  filler.forEach((u, i) => { ps.allies[i] = u; game.cards[u]!.zone = 'ally'; });

  await gc.flushOfferRecall();
  await gc.drainFxForTest();

  expect(beats).toEqual([]);
  expect(game.cards[uid]!.zone).toBe('grave');
});
