import { expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from '../core/setup.js';
import { inst, moveCard, you } from '../core/state.js';
import { chooseOfferPayment, tacticalResponse } from './tactics.js';
import { AI_HARD } from './evaluate.js';
import { AiChooser } from './bot.js';

function fixture() {
  const game = createGame(index, [deck, deck], { seed: 5 });
  game.turnPlayer = 0; game.phase = 'battle';
  const ps = you(game, 0);
  const force = [...ps.hand, ...ps.deck].find(u => index[inst(game, u).defId]?.type === 'Force')!;
  game.activeBattle = { attacker: you(game, 1).persona!, supporters: [], target: null, defender: 0,
    blockers: [], attackPower: 11000, defensePower: 11000, stage: 'blocking' };
  return { game, ps, force };
}
it('saves a pure Power response unless it changes a battle outcome', () => {
  const { game, force } = fixture();
  const options = [{ uid: force, cardName: 'Force', text: 'One of your Units gets Power +3000 until end of turn.' }];
  expect(tacticalResponse(index, game, 0, options)).toBe(0);
  game.activeBattle!.attackPower = 16000;
  expect(tacticalResponse(index, game, 0, options)).toBeNull();
  game.activeBattle!.attackPower = 9000;
  expect(tacticalResponse(index, game, 0, options)).toBeNull();
});
it('uses the minimum useful Offer payment and keeps a charged attacker', () => {
  const { game, ps } = fixture();
  const units = [...ps.deck, ...ps.hand].filter(u => index[inst(game, u).defId]?.type === 'Unit').slice(0, 2);
  units.forEach((uid, slot) => moveCard(game, uid, 'ally', { slot }));
  inst(game, units[1]!).defId = inst(game, units[0]!).defId;
  inst(game, units[1]!).exhausted = true;
  expect(chooseOfferPayment(index, game, units, 2, { firstSelectedMinimum: 2 })).toEqual([units[1]]);
  expect(chooseOfferPayment(index, game, units, 3, { firstSelectedMinimum: 2 })).toHaveLength(2);
  expect(chooseOfferPayment(index, game, units, 4, { firstSelectedMinimum: 2 })).toEqual([]);
});
it('keeps Hard decisions separate from card-check odds', () => {
  const { game } = fixture();
  expect(AI_HARD.tactical).toBe(true);
  expect(game.players.map(p => p.forceCheckBias)).toEqual([0, 0]);
});
it('can use a useful draw response outside battle while saving a battle-only buff', () => {
  const { game, force } = fixture(); game.activeBattle = null;
  expect(tacticalResponse(index, game, 0, [{ uid: force, cardName: 'Force', text: 'Draw 1 card.' }])).toBe(0);
  expect(tacticalResponse(index, game, 0, [{ uid: force, cardName: 'Force', text: 'Power +3000' }])).toBeNull();
});
it('puts the chosen battle buff on the threatened Unit', async () => {
  const { game, ps } = fixture();
  const ally = ps.deck.find(u => index[inst(game, u).defId]?.type === 'Unit')!;
  moveCard(game, ally, 'ally', { slot: 0 }); game.activeBattle!.target = ally;
  const ai = new AiChooser(index, () => game, AI_HARD);
  expect(await ai.chooseTarget(0, 'Choose a Unit for Power +3000', [ps.persona!, ally])).toBe(ally);
});
