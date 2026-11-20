import { expect, it } from 'vitest';
import { combatLine, combatResultLabel } from './combat-clarity.js';
import type { AttackResult } from '../core/battle.js';
const result: AttackResult = { attackPower:11000,defensePower:11000,hit:true,personaHit:true,barrierBroken:true,attackCheck:null,barrierCheckCard:'barrier',sentryUsed:false };
it('does not present the final Barrier as a winning hit',()=>{
  expect(combatResultLabel(result,false)).toBe('Barrier broken');
  expect(combatResultLabel({...result,barrierBroken:false},true)).toBe('Final hit');
});
it('uses the actual outcome rather than inferring a block from equal numbers',()=>{
  expect(combatResultLabel(result)).toBe('Barrier broken');
  expect(combatResultLabel({...result,hit:false,barrierBroken:false})).toBe('Blocked');
});
it('distinguishes an explicitly cancelled attack from a zero-Power block or legacy result',()=>{
  const zeroResult: AttackResult = {...result,hit:false,personaHit:false,barrierBroken:false,barrierCheckCard:null,attackPower:0,defensePower:0};
  expect(combatResultLabel(zeroResult)).toBe('Blocked');
  expect(combatResultLabel({...zeroResult,cancelReason:'field-entry-changed'})).toBe('Attack cancelled');
  expect(combatResultLabel({...zeroResult,sentryUsed:true})).toBe('Sentry · damage prevented');
  expect(combatResultLabel({...zeroResult,sentryUsed:true,cancelReason:'attacker-ineligible'})).toBe('Attack cancelled');
});
it('distinguishes Sentry prevention, destruction, and a surviving hit',()=>{
  expect(combatResultLabel({...result,sentryUsed:true},true)).toBe('Sentry · damage prevented');
  expect(combatResultLabel({...result,barrierBroken:false,personaHit:false},false,true)).toBe('Ally destroyed');
  expect(combatResultLabel({...result,barrierBroken:false,personaHit:false})).toBe('Hit');
});
const rect=(x:number,y:number,width=80,height=112)=>({x,y,width,height} as DOMRect);
it('connects the card edges for attacks in either direction',()=>{
  expect(combatLine(rect(0,0),rect(0,300))).toEqual([40,112,40,300]);
  expect(combatLine(rect(0,300),rect(0,0))).toEqual([40,300,40,112]);
});
it('keeps coincident and tiny card geometry finite',()=>{
  expect(combatLine(rect(0,0),rect(0,0)).every(Number.isFinite)).toBe(true);
  expect(combatLine(rect(0,0,5,5),rect(10,10,5,5)).every(Number.isFinite)).toBe(true);
});
