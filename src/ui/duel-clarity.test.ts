import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { createChain, appendLink, declineResponse } from '../core/response-chain.js';
import { emit, beginGroup } from '../core/events.js';
import { duelActivity, readyAttackHint, ActionRecapTracker } from './duel-clarity.js';
import { buffPower, autoChooser } from '../core/effects.js';
import { EffectExpiryTracker } from './effect-feedback.js';
import { moveCard } from '../core/state.js';
import { finalExchange } from './match-review.js';
import { needsResultPresentation } from './presentation.js';

const fixture = () => createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
it('never claims the opponent is choosing while local defense is pending on the opponent turn',()=>{
  const game=fixture();game.turnPlayer=1;
  game.activeBattle={attacker:game.players[1].persona!,target:null,supporters:[],defender:0,blockers:[],attackPower:11000,defensePower:11000,stage:'blocking'};
  expect(duelActivity(game,true,true)).toBeNull();
});
it('local cost, target and optional-effect decisions outrank turn and resolving messages',()=>{
  const game=fixture();game.turnPlayer=1;
  // Fourth argument describes actual chooser input, not any open information modal.
  expect(duelActivity(game,true,true,true)).toBeNull();
  game.responseChain=createChain('c',{id:'one',owner:1,source:game.players[1].persona!,skillId:'s',label:'s'});
  declineResponse(game.responseChain,0);
  expect(duelActivity(game,true,true,true)).toBeNull();
  expect(duelActivity(game,false,true,true)?.text).toBe('Reconnecting…');
});
it('shows opponent defense on our turn, then clears for checks and our own responses', () => {
  const game = fixture(), source = game.players[0].persona!;
  game.turnPlayer = 0;
  game.activeBattle = {attacker:source,supporters:[],target:null,defender:1,blockers:[],attackPower:11000,defensePower:11000,stage:'blocking'};
  expect(duelActivity(game)).toEqual({text:'Opponent choosing a response or defense…',opponentResponse:true});
  game.responseChain = createChain('defense', {id:'d',owner:1,source,skillId:'s',label:'s'});
  expect(duelActivity(game)?.opponentResponse).toBe(false);
  game.responseChain = null;
  game.activeBattle.defender = 0;
  expect(duelActivity(game)).toBeNull();
  game.activeBattle.defender = 1; game.activeBattle.stage = 'checking';
  expect(duelActivity(game)).toBeNull();
});
it('lights only the opponent response window and counts resolution in reverse order', () => {
  const game = fixture(), source = game.players[0].persona!;
  game.responseChain = createChain('c', { id: 'one', owner: 0, source, skillId: 's', label: 's' });
  expect(duelActivity(game)).toEqual({ text: 'Opponent choosing a response…', opponentResponse: true });
  appendLink(game.responseChain, { id: 'two', owner: 1, source, skillId: 's', label: 's' });
  expect(duelActivity(game)?.opponentResponse).toBe(false);
  declineResponse(game.responseChain, 0);
  expect(duelActivity(game)?.text).toBe('Resolving effect 1 of 2');
  game.responseChain.cursor = 0;
  expect(duelActivity(game)?.text).toBe('Resolving effect 2 of 2');
  expect(duelActivity(game, false)?.text).toBe('Reconnecting…');
  game.winner = 0; expect(duelActivity(game)).toBeNull();
});
it('counts legal attackers once even when they have several targets or supporters', () => {
  expect(readyAttackHint([{ kind: 'attack', attacker: 'a', target: null, supporters: [] }, { kind: 'attack', attacker: 'a', target: 'b', supporters: ['s'] }])).toBe('1 attacker still ready');
  expect(readyAttackHint([{ kind: 'endTurn' }])).toBeUndefined();
});
it('recaps paid Offers and actual Power changes once, without replaying a reconnect', () => {
  const game = fixture(), uid = game.players[0].persona!, tracker = new ActionRecapTracker();
  tracker.update(game, MATCH_INDEX); beginGroup(game);
  for (let i = 0; i < 2; i++) emit(game, { actor: 0, type: 'costPaid', sourceUids: [], targetUids: [], visibility: 'public', message: 'Offer', result: { outcome: 'offer' } });
  for (let i = 0; i < 4; i++) buffPower({ game, index: MATCH_INDEX, source: uid, me: 0, chooser: autoChooser }, uid, 5000);
  const powerEvents = game.duel!.events.filter(e => e.type === 'powerChanged');
  expect(powerEvents).toHaveLength(4); expect(needsResultPresentation(powerEvents[0]!, true)).toBe(false);
  emit(game, { actor: 0, type: 'abilityResolved', sourceUids: [uid], targetUids: [], visibility: 'public', message: 'Resolved', result: { outcome: 'resolved' } });
  const recap = tracker.update(game, MATCH_INDEX)!;
  expect(recap.text).toContain('2 Allies Offered'); expect(recap.text).toContain('+20,000 Power');
  expect(tracker.update(game, MATCH_INDEX)).toBeUndefined();
  const reconnected = new ActionRecapTracker(); expect(reconnected.update(game, MATCH_INDEX)).toBeUndefined();
});
it('holds the recap while a response is pending and excludes private enemy events', () => {
  const game = fixture(), tracker = new ActionRecapTracker(), source = game.players[0].persona!;
  tracker.reset(game); beginGroup(game);
  emit(game, { actor: 1, type: 'costPaid', sourceUids: [], targetUids: [], visibility: 'owner', message: 'secret', result: { outcome: 'offer' } });
  emit(game, { actor: 0, type: 'abilityResolved', sourceUids: [source], targetUids: [], visibility: 'public', message: 'Resolved', result: { outcome: 'resolved' } });
  game.responseChain = createChain('c', { id: 'one', owner: 0, source, skillId: 's', label: 's' });
  expect(tracker.update(game, MATCH_INDEX)).toBeUndefined();
  game.responseChain = null;
  expect(tracker.update(game, MATCH_INDEX)?.text).toBe('1 effect resolved');
});
it('fades removed effects only on the same field instance, including duplicate modifiers', () => {
  const game = fixture(), tracker = new EffectExpiryTracker(), uid = game.players[0].persona!, card = game.cards[uid]!;
  card.modifiers.push({ source: 'Test', amount: 5000, duration: 'endOfAttack' }, { source: 'Test', amount: 5000, duration: 'endOfAttack' });
  card.sevenHeadsTurn = game.turnNumber; expect(tracker.update(game)).toEqual([]);
  card.modifiers.pop(); card.sevenHeadsTurn = undefined;
  expect(tracker.update(game)).toEqual([{ uid, kind: 'power' }, { uid, kind: 'skill' }]);
  expect(tracker.update(game)).toEqual([]);
  moveCard(game, uid, 'grave'); expect(tracker.update(game)).toEqual([]);
});
it('uses public attack history for either player and avoids a fake finishing attack on surrender', () => {
  const game = fixture(), source = game.players[1].persona!;
  emit(game, { actor: 1, type: 'attackResolved', sourceUids: [source], targetUids: [], visibility: 'public', message: 'Hit', result: { outcome: 'personaHit' } });
  expect(finalExchange(game, MATCH_INDEX)).toContain('Opponent’s');
  game.winReason = 'surrender'; expect(finalExchange(game, MATCH_INDEX)).toBeUndefined();
});
