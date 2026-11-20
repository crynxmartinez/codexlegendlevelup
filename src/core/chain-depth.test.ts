/** Full-game regression: longer sequences must have a readable, ordered trail. */
import { it, expect } from 'vitest';
import { appendEffect, sequenceSummary, type EffectStep } from '../ui/effect-sequence.js';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
  Babaylan: babaylanDeck as unknown as DeckList,
};
const index = indexForDecks(Object.keys(DECKS));

const PAIRS: Array<[string, string]> = [
  ['Agta', 'Maguindanao'],
  ['Maguindanao', 'Babaylan'],
  ['Babaylan', 'Agta'],
];
const GAMES_PER_PAIR = 4;
const MAX_TURNS = 60;

it('represents every observed effect in order, including sequences beyond three', async () => {
  const depths = new Map<number, number>();

  for (const [a, b] of PAIRS) {
    for (let seed = 0; seed < GAMES_PER_PAIR; seed++) {
      const game = createGame(index, [DECKS[a]!, DECKS[b]!], { seed });
      const ai = new AiChooser(index, () => game);
      let trail: EffectStep[] = [];
      const gc = new GameController(game, index, {
        choosers: [ai, ai],
        hooks: {
          onAbilityActivated: async (_uid, _label, _p, _kind, chainIndex) => {
            trail=appendEffect(trail,_label,chainIndex);
            expect(trail.at(-1)).toEqual({index:chainIndex,name:_label});
            if(chainIndex>1)expect(sequenceSummary(trail)).toContain(`Effect ${chainIndex}`);
            depths.set(chainIndex, (depths.get(chainIndex) ?? 0) + 1);
          },
        },
      });
      for (let t = 0; t < MAX_TURNS && game.winner === null; t++) {
        await gc.beginTurn();
        await playAiTurn(gc, game.turnPlayer);
      }
    }
  }

  const total = [...depths.values()].reduce((a, b) => a + b, 0);
  expect(total, 'no abilities fired at all — the harness is broken').toBeGreaterThan(100);

  expect(Math.max(...depths.keys())).toBeGreaterThan(1);

}, 300000);
