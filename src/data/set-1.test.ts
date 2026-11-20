import { describe, expect, it } from 'vitest';
import source from '../../content/set-1.json' with { type: 'json' };
import oldCards from './cards.json' with { type: 'json' };
import { ALL_CARDS, cardsForDeck, FULL_INDEX } from './loader.js';
import { ALL_SCRIPTS, GameController } from '../core/game.js';
import { createGame, validateDeck, type DeckList } from '../core/setup.js';
import { checkDeck } from '../core/deckcheck.js';
import { moveCard } from '../core/state.js';
import { AiChooser } from '../ai/bot.js';

describe('Set 1 integration', () => {
  it('loads every new card without replacing the existing catalogue', () => {
    expect(source).toHaveLength(139);
    expect(Object.keys(ALL_CARDS)).toHaveLength(oldCards.length + 139);
    for (const old of oldCards) {
      if (['agta/sierra-watchkeeper-banoy','maguindanao/kuta-wato-oath-shield-panglima-sabir', 'babaylan/warden-of-the-twelfth-tide-bituon'].includes(old.id)) expect(ALL_CARDS[old.id]?.set).toBe('set-1');
      else {
        // Legacy Maguindanao cards retain their original data plus the approved tribal tag.
        const expected = old.deck === 'Maguindanao' && !old.subtypes.some(s => s === 'Maguindanaon' || s === 'Maguindanao')
          ? { ...old, subtypes: [...old.subtypes, 'Maguindanaon'] }
          : old;
        expect(ALL_CARDS[old.id]).toEqual(expected);
      }
    }
    for (const c of source) {
      expect(ALL_CARDS[c.id]).toMatchObject({
        name: c.name, type: c.type, level: c.level, power: c.power,
        defense: c.defense, set: 'set-1', effectsPending: false, abilities: [],
      });
        expect(ALL_CARDS[c.id]!.text.length).toBeGreaterThan(20);
        expect(ALL_SCRIPTS[c.id]).toBeDefined();
    }
  });

  for (const [archetype, region, count] of [
    ['Agta', 'Luzon', 43], ['Babaylan', 'Visayas', 47], ['Maguindanao', 'Mindanao', 52],
  ] as const) {
    it(`${archetype} supports a legal Set 1 deck and paid Action play`, async () => {
      const pool = cardsForDeck(archetype).filter((c) => c.set === 'set-1');
      expect(pool).toHaveLength(count);
      expect(pool.every((c) => c.archipelago === region)).toBe(true);
      expect(pool.every((c) => c.subtypes.includes(`${region} Arch`))).toBe(true);
      const persona = pool.find((c) => c.type === 'Unit' && c.level === 3)!;
      const action = pool.find((c) => c.type === 'Action' && c.id.includes('/set-1/'))!;
      const main = pool.filter((c) => c.type === 'Force').map((c) => ({ id: c.id, copies: 3 }));
      main.push({ id: persona.id, copies: 3 }, { id: action.id, copies: 3 });
      let remaining = 32;
      for (const unit of pool.filter((c) => c.type === 'Unit' && c.id !== persona.id)) {
        const copies = Math.min(3, remaining);
        if (!copies) break;
        main.push({ id: unit.id, copies }); remaining -= copies;
      }
      const deck: DeckList = {
        name: `${archetype} Set 1`, persona: persona.id, main,
        codex: pool.filter((c) => c.type === 'Codex').slice(0, 5).map((c) => c.id),
      };
      expect(checkDeck(FULL_INDEX, deck)).toEqual([]);
      expect(() => validateDeck(FULL_INDEX, deck)).not.toThrow();
      const game = createGame(FULL_INDEX, [deck, deck], { seed: 7 });
      const chooser = new AiChooser(FULL_INDEX, () => game);
      const ctrl = new GameController(game, FULL_INDEX, { choosers: [chooser, chooser] });
      game.turnPlayer = 0; game.phase = 'main';
      const uid = Object.values(game.cards).find((c) => c.owner === 0 && c.defId === action.id)!.uid;
      moveCard(game, uid, 'hand');
      const ps = game.players[0];
      const plays = ps.normalPlaysUsed;
      expect(ctrl.legalActions(0)).toContainEqual({ kind: 'playAction', uid });
      await ctrl.perform({ kind: 'playAction', uid }, 0);
      expect(game.cards[uid]!.zone).toBe('grave');
      expect(ps.energy).toBeUndefined();
      expect(ps.normalPlaysUsed).toBe(plays + 1);
    });
  }
});
