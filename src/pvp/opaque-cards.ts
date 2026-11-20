import type {GameState} from '../core/types.js';
/** Offline instance numbers reveal deck-list position. Randomize once, before play. */
export function opaqueInitialCards(game:GameState):GameState {
  const ids=new Map(Object.keys(game.cards).map(uid=>[uid,`card-${crypto.randomUUID()}`]));
  const rewrite=(value:unknown):unknown=>{
    if(typeof value==='string')return ids.get(value)??value;
    if(Array.isArray(value))return value.map(rewrite);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[ids.get(key)??key,rewrite(item)]));
    return value;
  };
  return rewrite(game) as GameState;
}
