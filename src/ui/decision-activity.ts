import type { Chooser } from '../core/effects.js';
import type { GameState } from '../core/types.js';

const pending = new WeakMap<GameState,number>();
export const localDecisionPending = (game:GameState):boolean => (pending.get(game)??0)>0;
const methods = ['chooseAbility','chooseCards','chooseTarget','chooseMode','chooseSlot','confirm',
  'personifyPrompt','battleCards','blockPrompt','revealConfirm','revealCards'] as const satisfies readonly (keyof Chooser)[];

/** Track the chooser continuation, so minimizing or inspecting cannot disguise pending local input. */
export function trackDecisionActivity(chooser:Chooser, gameRef:()=>GameState):void {
  for(const key of methods){
    const original=chooser[key].bind(chooser) as (...args:unknown[])=>Promise<unknown>;
    (chooser as unknown as Record<string,unknown>)[key]=async (...args:unknown[])=>{
      const game=gameRef();pending.set(game,(pending.get(game)??0)+1);
      try { return await original(...args); }
      finally { const count=(pending.get(game)??1)-1;if(count)pending.set(game,count);else pending.delete(game); }
    };
  }
}
