/**
 * Last Oath fires only for the unit that was Offered.
 *
 * Reproduces a report that Illana Tide-Harpooner, Rinamuntaw offered its Last Oath
 * when a *different* unit was Offered.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { def, you } from './state.js';
import { autoChooser, offerUnit, type AbilityOption, type Chooser } from './effects.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const HAKIM = 'maguindanao/set-1/first-son-of-the-returned-land-rinamuntaw';
const ME: PlayerId = 0;

/** Remembers every ability it is offered, and declines everything. */
function recordingChooser(log: string[]): Chooser {
  return {
    ...autoChooser,
    async chooseAbility(_p: PlayerId, _prompt: string, options: AbilityOption[]) {
      for (const o of options) log.push(o.cardName);
      return null;
    },
  };
}

function setup(): { game: GameState; ctrl: GameController; offered: string[] } {
  const game = createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 3 },
  );
  const offered: string[] = [];
  const chooser = recordingChooser(offered);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  return { game, ctrl, offered };
}

/** Put a specific card on the field from the deck, in `slot`. */
function place(game: GameState, defId: string, slot: number): string {
  const ps = you(game, ME);
  const uid = ps.deck.find((u) => def(index, game, u).id === defId);
  if (!uid) throw new Error(`no ${defId} in deck`);
  ps.deck.splice(ps.deck.indexOf(uid), 1);
  ps.allies[slot] = uid;
  game.cards[uid]!.zone = 'ally';
  game.cards[uid]!.slot = slot;
  return uid;
}

describe("Rinamuntaw's Last Oath", () => {
  it('does NOT fire when a different unit is Offered', async () => {
    const { game, ctrl, offered } = setup();
    game.turnPlayer = ME;
    const hakim = place(game, HAKIM, 0);
    // Any other Maguindanao unit to be the actual Offer.
    const otherId = (magDeck as unknown as DeckList).main
      .map((e) => e.id)
      .find((id) => id !== HAKIM && id.startsWith('maguindanao/') && !id.includes('codex'))!;
    const other = place(game, otherId, 1);

    offerUnit(
      { index, game, me: ME, source: other, chooser: ctrl.chooserFor(ME) },
      other,
    );
    await ctrl.flushDamageTriggers();

    const hakimName = def(index, game, hakim).name;
    expect(offered, `offered abilities were: ${JSON.stringify(offered)}`)
      .not.toContain(hakimName);
  });

  it('DOES fire when Rinamuntaw itself is Offered', async () => {
    const { game, ctrl, offered } = setup();
    game.turnPlayer = ME;
    // His Last Oath costs 1 Energy now; without it the skill correctly
    // declines and this would be testing the wrong thing.


    const hakim = place(game, HAKIM, 0);
    // A second unit so Rinamuntaw's "choose one of your OTHER units" has a target.
    const otherId = (magDeck as unknown as DeckList).main
      .map((e) => e.id)
      .find((id) => id !== HAKIM && id.startsWith('maguindanao/'))!;
    place(game, otherId, 1);

    offerUnit(
      { index, game, me: ME, source: hakim, chooser: ctrl.chooserFor(ME) },
      hakim,
    );
    await ctrl.flushDamageTriggers();

    expect(offered).toContain(def(index, game, hakim).name);
  });
});
