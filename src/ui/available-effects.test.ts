import { expect, it, vi } from 'vitest';
import { availableEffectCards, canEndWithNoActions, markAvailableEffects } from './available-effects.js';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
const game = () => createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Luzon!], {seed:2});
it('lights the zone even when its top card already has a visible card node',()=>{
  const g=game(),uid=g.players[0].hand[0]!; g.cards[uid]!.zone='grave';
  const card={classList:{add:vi.fn()}},zone={classList:{add:vi.fn()}};
  vi.stubGlobal('CSS',{escape:(value:string)=>value});
  vi.stubGlobal('document',{querySelectorAll:()=>[],querySelector:(selector:string)=>selector.includes('.z-grave')?zone:card});
  try {
    markAvailableEffects(g,[{kind:'ability',uid,abilityIndex:0}]);
    expect(card.classList.add).toHaveBeenCalledWith('effect-available');
    expect(zone.classList.add).toHaveBeenCalledWith('effect-available');
  } finally {vi.unstubAllGlobals();}
});
it('lights only legal skills or own response candidates, including the active Codex', () => {
  const g = game(), card = g.players[0].hand[0]!, foe = g.players[1].persona!;
  expect(availableEffectCards(g,[{kind:'ability',uid:card,abilityIndex:0},{kind:'useSkill'}],[foe,card]))
    .toEqual([card,g.players[0].activeCodex]);
  expect(availableEffectCards(g,[])).toEqual([]);
});
it('glows End Turn only when legal with no attacks or skills remaining', () => {
  const g = game(); g.turnPlayer=0; g.phase='battle';
  expect(canEndWithNoActions(g,[])).toBe(false);
  expect(canEndWithNoActions(g,[{kind:'endTurn'}])).toBe(true);
  expect(canEndWithNoActions(g,[{kind:'endTurn'},{kind:'useSkill'}])).toBe(false);
  expect(canEndWithNoActions(g,[{kind:'endTurn'},{kind:'attack',attacker:g.players[0].persona!,target:null,supporters:[]}])).toBe(false);
});
