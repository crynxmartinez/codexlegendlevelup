import { describe, expect, it } from 'vitest';
import { LegacyDeckOrder } from './legacy-deck-order.js';
import { LegacyAttack } from './legacy-attack.js';
import type { PendingDecision } from './decisions.js';
import type { ActiveBattle } from '../core/types.js';
const choice=(id:string,cards:string[]):PendingDecision=>({id,owner:0,kind:'chooseTarget',args:[0,'Choose the next card for the TOP of your deck',cards]});
describe('legacy deck-order continuation',()=>{
 it('shows one numbered choice then submits the remaining cards without another modal',()=>{
  const a=new LegacyDeckOrder(), d=choice('1',['a','b','c']);
  expect(a.display(d,'turn1')?.kind).toBe('chooseCards');
  expect(a.answer(d,['c','a','b'],'turn1')).toBe('c');
  expect(a.next(d,'turn1')).toBeUndefined();
  expect(a.next(null,'turn1')).toBeUndefined();
  const next=choice('2',['a','b']);
  expect(a.display(next,'turn1')).toBeNull();
  expect(a.next(next,'turn1')).toBe('a');
  expect(a.answer(next,'a','turn1')).toBe('a');
  const last=choice('3',['b']);
  expect(a.next(last,'turn1')).toBe('b');
  a.answer(last,'b','turn1');
  expect(a.next(last,'turn1')).toBeUndefined();
 });
 it('does not automate a changed candidate set or a different turn/chain',()=>{
  for(const [cards,context] of [[['a','x'],'same'],[['a','b'],'new']] as const){
   const a=new LegacyDeckOrder();a.answer(choice('1',['a','b','c']),['c','a','b'],'same');
   const d=choice('2',[...cards]);expect(a.next(d,context)).toBeUndefined();expect(a.display(d,context)?.kind).toBe('chooseCards');
  }
 });
 it('clears stored choices on reconnect and leaves other prompts alone',()=>{
  const a=new LegacyDeckOrder();a.answer(choice('1',['a','b']),['b','a'],'same');a.clear();
  expect(a.display(choice('2',['a']),'same')).not.toBeNull();
  const other={...choice('3',['x']),args:[0,'Choose a unit',['x']]};expect(a.display(other,'same')).toBe(other);
 });
});
describe('legacy attack cue',()=>{
 const battle=(stage:ActiveBattle['stage']='declared')=>({attacker:'a',target:'b',stage} as ActiveBattle);
 it('animates declaration once, then allows a new attack by the same card',()=>{
  const a=new LegacyAttack(null);expect(a.take(battle())).toBe(true);expect(a.take(battle())).toBe(false);
  expect(a.take(battle('blocking'))).toBe(false);a.take(null);expect(a.take(battle())).toBe(true);
 });
 it('does not replay a battle restored after reconnect',()=>{
  expect(new LegacyAttack(battle()).take(battle())).toBe(false);
  expect(new LegacyAttack(null).take(battle('checking'))).toBe(false);
 });
});
