import { expect,it } from 'vitest';
import { STARTERS } from '../pvp/catalog.js';
import { deckStats,sampleHand } from './deck-learning.js';
it('counts physical copies and samples five without changing the deck',()=>{
  for(const deck of Object.values(STARTERS)){
    const before=JSON.stringify(deck),stats=deckStats(deck),hand=sampleHand(deck,()=>0.25);
    expect(Object.values(stats.levels).reduce((a,b)=>a+b,0)).toBe(50);
    expect(Object.values(stats.costs).reduce((a,b)=>a+b,0)).toBe(50);
    expect(hand.length).toBe(5);
    for(const id of hand)expect(hand.filter(v=>v===id).length).toBeLessThanOrEqual(deck.main.find(e=>e.id===id)!.copies-(id===deck.persona?1:0));
    expect(JSON.stringify(deck)).toBe(before);
  }
});
