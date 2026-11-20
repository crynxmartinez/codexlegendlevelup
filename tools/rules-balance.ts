/** Same runner is copied into the isolated baseline tree for a paired comparison. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FULL_INDEX as index } from '../src/data/loader.js';
import { createGame } from '../src/core/setup.js';
import { GameController } from '../src/core/game.js';
import { AiChooser, playAiTurn } from '../src/ai/bot.js';
import luzon from '../decks/agta-set-1.json';
import visayas from '../decks/babaylan-set-1.json';
import mindanao from '../decks/maguindanao-set-1.json';

const [label = 'current', output = '.tmp/balance-current.json', count = '100', firstOnly] = process.argv.slice(2);
const seeds = Number(count);
if (!Number.isInteger(seeds) || seeds < 1) throw new Error('Supply a positive seed count.');
const decks = { Luzon: luzon, Visayas: visayas, Mindanao: mindanao };
if (firstOnly && !(firstOnly in decks)) throw new Error(`Unknown first region: ${firstOnly}`);
const totalGames = (firstOnly ? 3 : 9) * seeds;
const results: Record<string, unknown>[] = [];
await mkdir(dirname(output), { recursive: true });
for (const [first, firstDeck] of Object.entries(decks)) {
  if (firstOnly && first !== firstOnly) continue;
  for (const [second, secondDeck] of Object.entries(decks)) {
    for (let seed = 1; seed <= seeds; seed++) {
      const game = createGame(index, [firstDeck, secondDeck], { seed, firstPlayer: 0 });
      let decisions = 0, peakHeart = 0, peakChain = 0, actions = 0, stagnantActions = 0;
      const observe = () => {
        peakHeart = Math.max(peakHeart, ...game.players.map(p => p.heart.length));
        peakChain = Math.max(peakChain, (game as any).responseChain?.links.length ?? 0);
      };
      const bot = new AiChooser(index, () => game);
      const chooser = new Proxy(bot, { get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          if (/^(choose|confirm|personify)/.test(String(prop))) decisions++;
          observe(); return value.apply(target, args);
        };
      } });
      let previous = '';
      const ctrl = new GameController(game, index, { choosers: [chooser, chooser], hooks: {
        onAiAction: async () => {
          actions++; observe();
          const state = JSON.stringify([game.turnNumber, game.phase, game.players, game.cards]);
          if (state === previous) stagnantActions++;
          previous = state;
        },
      } });
      let turns = 0, error: string | undefined;
      try {
        while (game.winner === null && turns < 80) {
          await ctrl.beginTurn(); await playAiTurn(ctrl, game.turnPlayer); turns++; observe();
        }
      } catch (e) { error = String(e); }
      const events = game.duel?.events ?? [];
      results.push({ first, second, seed, winner: game.winner, turns, firstTurnWin: turns === 1 && game.winner !== null,
        outcome: game.winReason, error, decisions, actions, stagnantActions, peakHeart, peakChain,
        // Event counts only: old/current engines do not emit every draw or
        // charge. Do not interpret these fields as complete gameplay totals.
        draws: events.filter(e => e.type === 'cardDrawn').length,
        specialCalls: game.log.filter(line => /special called/i.test(line)).length,
        charges: events.filter(e => e.type === 'unitCharged').length,
        offers: events.filter(e => e.type === 'costPaid' && e.result?.outcome === 'offer').length,
      });
      if (seed % 10 === 0 || seed === seeds) {
        await writeFile(output, JSON.stringify({ label, seeds, results }, null, 2) + '\n');
        console.log(`${label}: ${first}/${second} seed ${seed}; ${results.length}/${totalGames} games`);
      }
    }
  }
}
console.log(`${label}: finished; ${results.filter(r => r.winner === null || r.error).length} unfinished/errors`);
