import { expect, it } from 'vitest';
import { AiChooser } from '../ai/bot.js';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { localDecisionPending, trackDecisionActivity } from './decision-activity.js';
import type { Chooser } from '../core/effects.js';

it('tracks every chooser continuation until it settles, including failure and overlapping inspections',async()=>{
  const game=createGame(MATCH_INDEX,[STARTERS.Luzon!,STARTERS.Luzon!],{seed:42});
  const other=createGame(MATCH_INDEX,[STARTERS.Luzon!,STARTERS.Luzon!],{seed:43});
  const ai=new AiChooser(MATCH_INDEX,()=>game);
  const names=['chooseAbility','chooseCards','chooseTarget','chooseMode','chooseSlot','confirm','personifyPrompt','battleCards','blockPrompt','revealConfirm','revealCards'] as const;
  const pending:{resolve:(value:unknown)=>void;reject:(reason:Error)=>void}[]=[];
  const chooser=Object.fromEntries(names.map(key=>[key,()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))])) as unknown as Chooser;
  // Verify the wrapped names match actual chooser methods.
  expect(names.every(key=>typeof ai[key]==='function')).toBe(true);
  trackDecisionActivity(chooser,()=>game);
  const invoke=chooser as unknown as Record<string,()=>Promise<unknown>>;
  const calls=names.map(key=>invoke[key]!().catch(()=>undefined));
  expect(localDecisionPending(game)).toBe(true);expect(localDecisionPending(other)).toBe(false);
  for(let i=0;i<pending.length-1;i++){pending[i]!.resolve(true);await Promise.resolve();expect(localDecisionPending(game)).toBe(true);}
  pending.at(-1)!.reject(Error('dismissed'));await Promise.all(calls);
  expect(localDecisionPending(game)).toBe(false);
});
