import { expect, it } from 'vitest';
import { createGame } from './setup.js';
import { moveCard } from './state.js';
import { autoChooser, discard, rally, specialCallFromHand } from './effects.js';
import { normalCall } from './turn.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import type { HandMoveFx, Zone } from './types.js';
function fixture() {
  const game = createGame(MATCH_INDEX,[STARTERS.Mindanao!,STARTERS.Mindanao!],{seed:8});
  const ctx = {game,index:MATCH_INDEX,me:0 as const,source:game.players[0].persona!,chooser:autoChooser};
  const moves = () => game.pendingFx.filter((fx):fx is HandMoveFx=>fx.kind==='handMove');
  return {game,ctx,moves};
}
it('batches a multi-card discard and retains each paid card identity',async()=>{
  const {game,ctx,moves}=fixture(), hand=[...game.players[0].hand];
  await discard(ctx,'all');
  expect(moves()).toHaveLength(1);
  expect(moves()[0]!.cards.map(c=>c.uid)).toEqual(hand);
  expect(moves()[0]!.cards.every(c=>c.to==='grave'&&!c.hidden)).toBe(true);
  expect(game.players[0].hand).toEqual([]);
});
it.each(['deck','grave','exile','extra','barrier','check','codex'] as Zone[])('captures hand to %s before a later move',to=>{
  const {game,moves}=fixture(), uid=game.players[0].hand[0]!;
  moveCard(game,uid,to,{faceDown:to==='exile'});
  moveCard(game,uid,'hand');
  expect(moves()[0]?.cards[0]).toMatchObject({uid,to,hidden:['deck','exile','extra','barrier'].includes(to)});
});
it('does not duplicate dedicated Heart or normal-call travel',()=>{
  const {game,moves}=fixture(), ps=game.players[0];
  moveCard(game,ps.hand[0]!,'heart');
  const uid=ps.deck.find(u=>MATCH_INDEX[game.cards[u]!.defId]?.type==='Unit'&&MATCH_INDEX[game.cards[u]!.defId]!.level<=2)!;
  moveCard(game,uid,'hand');game.phase='main';game.turnPlayer=0;
  normalCall(MATCH_INDEX,game,uid,{slot:0});
  expect(moves()).toEqual([]);
  expect(game.pendingFx.some(fx=>fx.kind==='heartMove')).toBe(true);
});
it('rally keeps bottom order and queues travel only if a dedicated hook did not show it',async()=>{
  const {game,ctx,moves}=fixture(); const hand=[...game.players[0].hand];
  await rally(ctx,2);expect(moves()[0]!.cards).toHaveLength(2);
  expect(game.players[0].deck.slice(-2)).toEqual(hand.slice(0,2));
  game.pendingFx=[];
  let shown=0;await rally({...ctx,hooks:{onRally:async()=>{shown++;}}},1);
  expect(shown).toBe(1);expect(moves()).toEqual([]);
});
it('special calls from hand carry their exact destination slot',async()=>{
  const {game,ctx,moves}=fixture();
  const uid=game.players[0].deck.find(u=>MATCH_INDEX[game.cards[u]!.defId]?.type==='Unit')!;
  moveCard(game,uid,'hand');expect(await specialCallFromHand(ctx,uid)).toBe(true);
  expect(moves()[0]?.cards[0]).toMatchObject({uid,to:'ally',toSlot:0,hidden:false});
});
