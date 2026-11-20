/**
 * Heart of the Twelve Spirits, Amaya — skill 1 is a *your turn* effect.
 *
 * Spirits can be generated on the opponent's turn: the Storm Altar of
 * Madja-as fires when your Barrier is broken, which happens while they are
 * attacking. The engine correctly notifies the spirits' owner whoever's turn
 * it is, so the "during your turn" clause has to be enforced by the card.
 */
import { describe, it, expect } from 'vitest';
import babaylanDeck from '../../decks/babaylan.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from '../test/historical.js';
import { you } from './state.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Babaylan', 'Agta']);
const AMAYA = 'babaylan/heart-of-the-twelve-spirits-amaya';
const BABAYLAN: PlayerId = 0;

function gameWithAmaya(): GameState {
  return createGame(
    index,
    [babaylanDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 5, choices: [{ persona: AMAYA }, {}] },
  );
}

/** Kaluluwa tokens are the only cards with a `k…` uid. */
function kaluluwaCount(game: GameState, p: PlayerId): number {
  return you(game, p).heart.filter((uid) => /^k\d+$/.test(uid)).length;
}

describe('Amaya skill 1 — "the first time during your turn"', () => {
  it('does not fire when spirits are generated on the opponent\'s turn', async () => {
    const game = gameWithAmaya();
    const ctrl = new GameController(game, index);

    game.turnPlayer = 1; // the opponent is attacking
    const before = kaluluwaCount(game, BABAYLAN);

    // A Barrier break on their turn generated spirits for us.
    game.pendingSpiritGeneration.push({ owner: BABAYLAN });
    await ctrl.flushSpiritTriggers();

    expect(kaluluwaCount(game, BABAYLAN)).toBe(before);
    expect(you(game, BABAYLAN).amayaExtraSpiritUsed).toBe(false);
  });

  it('still fires on your own turn', async () => {
    const game = gameWithAmaya();
    const ctrl = new GameController(game, index);

    game.turnPlayer = BABAYLAN;
    const before = kaluluwaCount(game, BABAYLAN);

    game.pendingSpiritGeneration.push({ owner: BABAYLAN });
    await ctrl.flushSpiritTriggers();

    expect(kaluluwaCount(game, BABAYLAN)).toBe(before + 1);
    expect(you(game, BABAYLAN).amayaExtraSpiritUsed).toBe(true);
  });
});
