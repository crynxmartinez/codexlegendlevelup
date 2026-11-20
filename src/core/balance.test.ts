/** Not an assertion suite - prints balance stats for 60 AI-vs-AI games. */
import { it } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import { indexForDeck } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { you } from './state.js';

const index = indexForDeck('Agta');
const deck = agtaDeck as unknown as DeckList;

it('balance report', async () => {
  const turnCounts: number[] = [];
  const stateRatio: number[] = [];
  let p0 = 0, p1 = 0, unfinished = 0;

  for (let seed = 1; seed <= 60; seed++) {
    const game = createGame(index, [deck, deck], { seed });
    const chooser = new AiChooser(index, () => game);
    const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
    let turns = 0, stateOn = 0;
    while (game.winner === null && turns < 80) {
      await ctrl.beginTurn();
      if (you(game, game.turnPlayer).releasedState) stateOn++;
      await playAiTurn(ctrl, game.turnPlayer);
      turns++;
    }
    if (game.winner === null) unfinished++;
    else if (game.winner === 0) p0++; else p1++;
    turnCounts.push(turns);
    stateRatio.push(turns ? stateOn / turns : 0);
  }

  turnCounts.sort((a, b) => a - b);
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`
  games              60
  unfinished         ${unfinished}
  first/second wins  ${p0} / ${p1}
  turns min/med/max  ${turnCounts[0]} / ${turnCounts[30]} / ${turnCounts[59]}
  turns average      ${avg(turnCounts).toFixed(1)}
  State uptime       ${(avg(stateRatio) * 100).toFixed(0)}% of turns
`);
}, 120000);
