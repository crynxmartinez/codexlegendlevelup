/** Current Set 1 skills are exercised through the same controller used by PvP. */
import { expect, it } from 'vitest';
import { MATCH_INDEX as index, STARTERS } from '../pvp/catalog.js';
import { createGame } from './setup.js';
import { GameController, ACTIVE_SCRIPTS } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { eventLogOf } from './events.js';

it.each(['Luzon', 'Visayas', 'Mindanao'])('%s skills fire in complete current-rules matches', async region => {
  const activated = new Set<string>();
  for (const seed of [2, 7, 19]) {
    const game = createGame(index, [STARTERS[region]!, STARTERS.Mindanao!], { seed });
    const chooser = new AiChooser(index, () => game);
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
    for (let turn = 0; turn < 100 && game.winner === null; turn++) {
      await ctrl.beginTurn();
      if (game.winner === null) await playAiTurn(ctrl, game.turnPlayer);
      expect(game.players.every(p => p.energy === undefined)).toBe(true);
      expect(game.responseChain).toBeFalsy();
    }
    expect(game.winner).not.toBeNull();
    for (const event of eventLogOf(game).events) {
      if (event.type !== 'abilityActivated') continue;
      for (const uid of event.sourceUids) {
        const id = game.cards[uid]!.defId;
        expect(ACTIVE_SCRIPTS[id], id).toBeDefined();
        if (game.cards[uid]!.owner === 0) activated.add(id);
      }
    }
  }
  expect(activated.size).toBeGreaterThan(3);
}, 60000);
