/**
 * The structured record of a duel.
 *
 * Three properties matter more than any individual event, and all three are
 * the kind that hold right up until the day they quietly stop:
 *
 *  - ORDER. Ids ascend, never repeat, and a cost is recorded before the effect
 *    it paid for. Every feature built on the record — the timeline, Last
 *    Action, replay — is an index into this order.
 *  - GROUPING. One click produces one group, however far the cascade runs.
 *  - VISIBILITY. A public event never names a card the other player is not
 *    entitled to see. This one is the reason the whole model exists rather
 *    than parsing the text log: the same records are what a PvP server would
 *    put on the wire, and a leak there is not a cosmetic bug.
 *
 * These run over real games rather than hand-built states, because the failure
 * mode is a single emitter somewhere deep in a card script getting it wrong.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { assertPublicSafe, canSee, eventLogOf, groupOf, lastVisibleGroup, viewFor } from './events.js';
import type { DuelEvent } from './events.js';
import type { GameState, PlayerId } from './types.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
  Babaylan: babaylanDeck as unknown as DeckList,
};
const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);

/** Play a whole game between two bots and hand back the state. */
async function playGame(a: string, b: string, seed: number, maxTurns = 30): Promise<GameState> {
  const game = createGame(index, [DECKS[a]!, DECKS[b]!], { seed });
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  let turns = 0;
  while (game.winner === null && turns < maxTurns) {
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer);
    turns++;
  }
  return game;
}

function events(game: GameState): DuelEvent[] {
  return eventLogOf(game).events;
}

describe('the record is ordered', () => {
  it('gives every event a higher id than the one before it', async () => {
    const game = await playGame('Agta', 'Maguindanao', 11);
    const all = events(game);
    expect(all.length, 'a whole game should produce events').toBeGreaterThan(50);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.id, `event ${i} out of order`).toBeGreaterThan(all[i - 1]!.id);
    }
  });

  it('files a cascade under the action that started it', async () => {
    const game = await playGame('Maguindanao', 'Agta', 5);
    const all = events(game);
    // A group is contiguous: everything one click caused is recorded before
    // anything the next click causes. Without that, "show me the last action"
    // has to search rather than slice.
    const seen = new Set<number>();
    let current = -1;
    for (const e of all) {
      if (e.group !== current) {
        expect(seen.has(e.group), `group ${e.group} was reopened later`).toBe(false);
        seen.add(e.group);
        current = e.group;
      }
    }
    expect(seen.size, 'a game is more than one group').toBeGreaterThan(5);
  });

  it('finishes paying an Offer before the offered card reacts', async () => {
    // The rules requirement is that the cost is PAID before the reward
    // resolves: an offered unit is in the Grave before its Last Oath fires.
    //
    // Not "the Offer is recorded before anything that card does" — a card can
    // Offer itself to pay for its own skill, and then its activation
    // legitimately precedes the payment. An earlier draft asserted that and
    // was caught by exactly such a card. What must hold is that the move to
    // the Grave lands between the payment and any later reaction.
    let checked = 0;
    for (const seed of [5, 17, 29]) {
      const game = await playGame('Maguindanao', 'Agta', seed);
      const log = eventLogOf(game);
      for (const paid of log.events) {
        if (paid.type !== 'costPaid') continue;
        const offered = paid.sourceUids[0];
        if (!offered) continue;
        const group = groupOf(log, paid.group);
        const toGrave = group.find(
          (x) => x.id > paid.id && x.type === 'cardMoved'
            && x.movements?.some((m) => m.uid === offered && m.to === 'grave'),
        );
        if (!toGrave) continue;
        const reactions = group.filter(
          (x) => x.id > paid.id && x.type === 'abilityActivated'
            && x.sourceUids.includes(offered),
        );
        for (const r of reactions) {
          checked++;
          expect(
            toGrave.id,
            `${offered} reacted at #${r.id} before reaching the Grave at #${toGrave.id}`,
          ).toBeLessThan(r.id);
        }
      }
    }
    expect(checked, 'no Offer led to a reaction in these games').toBeGreaterThan(0);
  });

  it('never emits an Energy payment in a current match', async () => {
    const game = await playGame('Agta', 'Maguindanao', 5);
    const energy = events(game).filter(
      (x) => x.type === 'costPaid' && x.changes?.some((c) => c.what === 'energy'),
    );
    expect(energy).toEqual([]);
  });
});

describe('the record does not leak', () => {
  /**
   * The important one.
   *
   * A card sitting in a hand, deck, Heart, Barrier row or Extra deck may not
   * be named by a public event. `assertPublicSafe` reads the card's CURRENT
   * zone, which is the strictest reading available after the fact: a card
   * that was revealed and then hidden again still has to have been marked.
   */
  it('never names a concealed card in a public event', async () => {
    for (const [a, b, seed] of [
      ['Agta', 'Maguindanao', 3],
      ['Babaylan', 'Agta', 8],
      ['Maguindanao', 'Babaylan', 13],
    ] as const) {
      const game = await playGame(a, b, seed);
      const zoneOf = (uid: string) => game.cards[uid]?.zone ?? null;
      for (const e of events(game)) {
        expect(
          () => assertPublicSafe(e, zoneOf),
          `${a} vs ${b} seed ${seed}`,
        ).not.toThrow();
      }
    }
  });

  it('keeps a draw private to the player who drew it', async () => {
    const game = await playGame('Agta', 'Maguindanao', 3);
    const drawn = events(game).filter((e) => e.type === 'cardDrawn');
    for (const e of drawn) {
      expect(e.visibility, 'a draw is not public information').not.toBe('public');
    }
  });

  it('hands each player only what they may see', async () => {
    const game = await playGame('Agta', 'Maguindanao', 3);
    const log = eventLogOf(game);
    for (const viewer of [0, 1] as PlayerId[]) {
      const mine = viewFor(log, viewer);
      expect(mine.length).toBeGreaterThan(0);
      for (const e of mine) expect(canSee(e, viewer)).toBe(true);
      // And the other player's private events are genuinely absent.
      const other: PlayerId = viewer === 0 ? 1 : 0;
      const leaked = mine.filter((e) => e.visibility === 'owner' && e.actor === other);
      expect(leaked, 'private events reached the wrong player').toEqual([]);
    }
  });

  it('marks a move between two concealed zones as hidden', async () => {
    const game = await playGame('Babaylan', 'Agta', 8);
    const concealed = new Set(['deck', 'hand', 'heart', 'barrier', 'extra']);
    for (const e of events(game)) {
      for (const m of e.movements ?? []) {
        if (concealed.has(m.from) && concealed.has(m.to)) {
          expect(m.hidden, `${m.from}->${m.to} was not marked hidden`).toBe(true);
        }
      }
    }
  });
});

describe('the record can be read back', () => {
  it('finds the last group a player is allowed to see', async () => {
    const game = await playGame('Agta', 'Maguindanao', 11);
    const log = eventLogOf(game);
    for (const viewer of [0, 1] as PlayerId[]) {
      const g = lastVisibleGroup(log, viewer);
      expect(g, 'Last Action needs something to open').not.toBeNull();
      const inGroup = groupOf(log, g!).filter((e) => canSee(e, viewer));
      expect(inGroup.length, 'the group it points at must be visible').toBeGreaterThan(0);
    }
  });

  it('says why the match ended', async () => {
    // Surrender is the one ending a test can force without playing to a win.
    const game = createGame(index, [DECKS.Agta!, DECKS.Maguindanao!], { seed: 2 });
    const chooser = new AiChooser(index, () => game);
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
    await ctrl.beginTurn();
    ctrl.concede(0);
    const ended = events(game).filter((e) => e.type === 'matchEnded');
    expect(ended.length, 'the end of a match is an event').toBe(1);
    expect(ended[0]!.result?.outcome).toBe('surrender');
    expect(ended[0]!.visibility).toBe('public');
  });

  it('is deterministic for a given seed', async () => {
    const a = await playGame('Agta', 'Maguindanao', 21);
    const b = await playGame('Agta', 'Maguindanao', 21);
    const shape = (g: GameState) =>
      events(g).map((e) => `${e.id}:${e.type}:${e.group}`).join('|');
    expect(shape(a)).toBe(shape(b));
  });
});
