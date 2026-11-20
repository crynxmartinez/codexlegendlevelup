import { describe, expect, it, vi } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { autoChooser, orderDeckBottom, orderDeckTop, type EffectContext } from './effects.js';
import { you } from './state.js';
function fixture() {
 const game=createGame(index,[deck,deck],{seed:17});const ps=you(game,0);
 const ctx:EffectContext={game,index,me:0,source:ps.persona!,chooser:{...autoChooser}};
 return {ctx,ps};
}
describe('one-confirmation bottom-deck ordering',()=>{
 it('asks once, leaves the deck unchanged while choosing, then uses the complete returned order',async()=>{
  const {ctx,ps}=fixture();const before=[...ps.deck],cards=before.slice(0,4);
  const order=[cards[2]!,cards[0]!,cards[3]!,cards[1]!];
  const choose=vi.fn(async(_p,_prompt,candidates,count,opts)=>{
   expect(ps.deck).toEqual(before);expect(candidates).toEqual(cards);expect(count).toBe(4);
   expect(opts).toMatchObject({ordered:true,confirm:'OK'});return order;
  });ctx.chooser.chooseCards=choose;
  await orderDeckBottom(ctx,cards);
  expect(choose).toHaveBeenCalledTimes(1);expect(ps.deck).toEqual([...before.slice(4),...order]);
 });
 it('ignores unknown and duplicate IDs and preserves any cards omitted by a non-UI chooser',async()=>{
  const {ctx,ps}=fixture();const before=[...ps.deck],cards=before.slice(0,4);
  ctx.chooser.chooseCards=async()=>[cards[2]!,cards[2]!,ps.hand[0]!,'missing'];
  await orderDeckBottom(ctx,[...cards,cards[0]!,'missing']);
  expect(ps.deck).toEqual([...before.slice(4),cards[2],cards[0],cards[1],cards[3]]);
  expect(new Set(ps.deck).size).toBe(before.length);
 });
 it('does not prompt when there is no ordering decision',async()=>{
  const {ctx,ps}=fixture();const choose=vi.fn();ctx.chooser.chooseCards=choose;
  const top=ps.deck[0]!;await orderDeckBottom(ctx,[]);await orderDeckBottom(ctx,[top]);
  expect(choose).not.toHaveBeenCalled();expect(ps.deck.at(-1)).toBe(top);
 });
});

describe('one-confirmation top-deck ordering',()=>{
 it('shows every card once and puts number 1 on top after confirmation',async()=>{
  const {ctx,ps}=fixture();const before=[...ps.deck],cards=before.slice(0,3);
  ctx.chooser.chooseCards=vi.fn(async()=>{expect(ps.deck).toEqual(before);return [cards[2]!,cards[0]!,cards[1]!];});
  ctx.chooser.chooseTarget=vi.fn(()=>{throw new Error('Must not ask card by card');});
  await orderDeckTop(ctx,cards);
  expect(ctx.chooser.chooseCards).toHaveBeenCalledOnce();
  expect(ps.deck).toEqual([cards[2],cards[0],cards[1],...before.slice(3)]);
 });
 it('retains every eligible card exactly once even with an incomplete chooser',async()=>{
  const {ctx,ps}=fixture();const before=[...ps.deck],cards=before.slice(0,3);
  ctx.chooser.chooseCards=async()=>[cards[2]!,cards[2]!,'unknown'];
  await orderDeckTop(ctx,cards);
  expect(ps.deck).toEqual([cards[2],cards[0],cards[1],...before.slice(3)]);
 });
});
