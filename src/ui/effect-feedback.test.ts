import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { moveCard } from '../core/state.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { createChain, appendLink, declineResponse, finishLink } from '../core/response-chain.js';
import { publicEffectTargets, effectOutcomeLabel } from '../core/effect-presentation.js';
import { GrantedSkillTracker } from './effect-feedback.js';
import { chainProgress } from './chain-status.js';

const fixture = () => createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
it('shows each newly granted skill once, without replaying the initial snapshot', () => {
  const game = fixture(), card = game.cards[game.players[0].persona!]!;
  card.sevenHeadsTurn = game.turnNumber;
  const tracker = new GrantedSkillTracker();
  expect(tracker.update(game)).toEqual([]);
  card.sulaymanHitDrawTurn = game.turnNumber;
  expect(tracker.update(game)).toEqual([card.uid]);
  expect(tracker.update(game)).toEqual([]);
  card.sulaymanHitDrawTurn = undefined;
  expect(tracker.update(game)).toEqual([]);
  game.turnNumber++;
  expect(tracker.update(game)).toEqual([]);
});
it('highlights only declared public targets in the same zone entry, never a negated link', () => {
  const game = fixture(), p = game.players[0];
  const unit = p.hand[0]!, secret = p.deck[0]!;
  moveCard(game, unit, 'ally', { slot: 0 });
  const chain = createChain('c', { id:'one', owner:0, source:p.persona!, skillId:'skill', label:'skill', declared:[{
    prompt:'Target', many:true, targets:[unit, secret].map(uid => ({ uid, zone:game.cards[uid]!.zone, entry:game.cards[uid]!.zoneEntry ?? 0 })),
  }] });
  expect(publicEffectTargets(game, chain.links[0])).toEqual([unit]);
  chain.links[0]!.status = 'negated'; expect(publicEffectTargets(game, chain.links[0])).toEqual([]);
  chain.links[0]!.status = 'committed';
  moveCard(game, unit, 'grave'); moveCard(game, unit, 'ally', { slot:0 });
  expect(publicEffectTargets(game, chain.links[0])).toEqual([]);
});
it('shows the response owner and only the remaining reverse resolution order', () => {
  const game = fixture(), source = game.players[0].persona!;
  const chain = createChain('c', { id:'one', owner:0, source, skillId:'skill', label:'skill' }); game.responseChain = chain;
  expect(chainProgress(game)).toBe('Opponent’s response · 1');
  appendLink(chain, {id:'two', owner:1, source, skillId:'skill', label:'skill'});
  expect(chainProgress(game)).toBe('Your response · 2 → 1');
  declineResponse(chain, 0); expect(chainProgress(game)).toBe('Resolving 2 → 1');
  finishLink(chain, 'two', 'negated'); expect(chainProgress(game)).toBe('Resolving 1');
  finishLink(chain, 'one', 'partial'); expect(chainProgress(game)).toBeUndefined();
  expect(effectOutcomeLabel('partial')).toBe('Target unavailable — affected part skipped');
  expect(effectOutcomeLabel('negated')).toBe('Activation negated');
  expect(effectOutcomeLabel('resolved')).toBeUndefined();
});
