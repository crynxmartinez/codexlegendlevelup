import {expect,it} from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import {FULL_INDEX as index} from '../data/loader.js';
import {createGame} from '../core/setup.js';
import {moveCard} from '../core/state.js';
import {stateReadout} from './state-readout.js';
it('shows weighted Grave progress without counting Actions or changing state',()=>{
 const game=createGame(index,[deck,deck],{seed:17}), ps=game.players[0];
 const alad=Object.values(game.cards).find(c=>c.owner===0&&c.defId.endsWith('/last-witness-of-the-old-words-alad'))!;
 const action=ps.deck.find(u=>index[game.cards[u]!.defId]?.type==='Action')!;
 moveCard(game,alad.uid,'grave');moveCard(game,action,'grave');
 const info=stateReadout(index,game,0,'Garahana');
 expect(info.count).toBe(2);expect(info.threshold).toBe(5);expect(info.entries).toEqual([{uid:alad.uid,value:2}]);expect(ps.releasedState).toBeNull();
});
it('does not disclose or invent hidden opponent Heart contributions',()=>{
 const game=createGame(index,[deck,deck],{seed:17}),uid=game.players[1].deck[0]!;
 moveCard(game,uid,'heart');game.cards[uid]!.defId='__hidden__';
 const info=stateReadout(index,game,1,'Andukha');expect(info.hidden).toBe(true);expect(info.entries).toEqual([]);
});
