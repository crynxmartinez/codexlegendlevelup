import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { createChain } from '../core/response-chain.js';
import { moveCard } from '../core/state.js';
import { chainSummary } from './chain-status.js';

it('describes only public targets still present at the declared entry', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
  const field = game.cards[game.players[0].persona!]!;
  const hand = game.cards[game.players[1].hand[0]!]!;
  game.responseChain = createChain('response', { id:'link', owner:1, source:game.players[1].persona!, skillId:'skill', label:'[Cost] Damage a Unit.', declared:[{
    prompt:'Choose', many:true, targets:[field, hand].map(card => ({ uid:card.uid, zone:card.zone, entry:card.zoneEntry ?? 0 })),
  }] });
  const summary = chainSummary(game, MATCH_INDEX)!;
  expect(summary.effect).toBe('Damage a Unit.');
  expect(summary.targets).toEqual([field.uid]);
  expect(summary.targetLabel).toContain('You · Persona');
  moveCard(game, field.uid, 'grave');
  expect(chainSummary(game, MATCH_INDEX)!.targets).toEqual([]);
});
