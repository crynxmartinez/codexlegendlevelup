import { describe, expect, it } from 'vitest';
import deck from '../../decks/babaylan-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { moveCard } from './state.js';
import { GameController } from './game.js';
import { autoChooser, createKaluluwaTokens, essenceCard, essenceFromDeck, releaseSpirits, retrieveFromHeart, specialCall, ventCard, type EffectContext } from './effects.js';
import type { HeartMoveFx, Zone } from './types.js';

function fixture() {
  const game = createGame(index, [deck, deck], { seed: 18 });
  game.players[0].activeCodex = null;
  const ctx: EffectContext = { game, index, me: 0, source: game.players[0].persona!, chooser: autoChooser };
  const unit = game.players[0].deck.find(u => index[game.cards[u]!.defId]!.type === 'Unit')!;
  const fx = () => game.pendingFx.filter((e): e is HeartMoveFx => e.kind === 'heartMove');
  return { game, ctx, unit, fx };
}

describe('Heart movement presentation contract', () => {
  it.each(['deck','hand','ally','persona','grave'] as Zone[])('Sanib snapshots its %s source', from => {
    const {game,ctx,unit,fx} = fixture();
    moveCard(game, unit, from, {slot: from === 'ally' ? 2 : undefined});
    game.pendingFx.length = 0;
    essenceCard(ctx, unit);
    expect(fx()).toHaveLength(1);
    expect(fx()[0]).toMatchObject({reason:'essence',before:0,after:1,cards:[{uid:unit,from,to:'heart',fromSlot:from==='ally'?2:null}]});
  });
  it('does not enable an illegal Sanib from Exile', () => {
    const {game,ctx,unit,fx}=fixture(); moveCard(game,unit,'exile'); essenceCard(ctx,unit);
    expect(game.cards[unit]!.zone).toBe('exile'); expect(fx()).toHaveLength(0);
  });
  it('keeps different Heart destinations separate and preserves their counts', () => {
    const {game,unit,fx}=fixture();
    const other=game.players[0].deck.find(u=>u!==unit)!;
    moveCard(game,unit,'heart');moveCard(game,other,'heart');game.pendingFx.length=0;
    moveCard(game,unit,'hand');moveCard(game,other,'grave');
    expect(fx().map(e=>[e.cards[0]!.to,e.before,e.after])).toEqual([['hand',2,1],['grave',1,0]]);
  });
  it.each(['hand','ally','grave','deck','exile','persona'] as Zone[])('direct Heart -> %s skills cannot skip travel', to => {
    const {game,unit,fx}=fixture();moveCard(game,unit,'heart');game.pendingFx.length=0;
    moveCard(game,unit,to,{slot:to==='ally'?3:undefined});
    expect(fx()[0]).toMatchObject({reason:'move',before:1,after:0,cards:[{uid:unit,from:'heart',to,toSlot:to==='ally'?3:null}]});
  });
  it('captures Exile -> Heart for a future explicitly permitted move', () => {
    const {game,unit,fx}=fixture();moveCard(game,unit,'exile',{faceDown:true});moveCard(game,unit,'heart');
    expect(fx()[0]!.cards[0]).toMatchObject({from:'exile',to:'heart',hidden:true});
  });
  it('batches deck Sanib with accurate counts', () => {
    const {ctx,fx}=fixture();essenceFromDeck(ctx,3);
    expect(fx()).toHaveLength(1);expect(fx()[0]).toMatchObject({reason:'essence',before:0,after:3});expect(fx()[0]!.cards).toHaveLength(3);
  });
  it('Kalas batches the whole cost and retains deleted token art', async () => {
    const {game,ctx,unit,fx}=fixture();moveCard(game,unit,'heart');createKaluluwaTokens(ctx,2);
    const tokens=game.players[0].heart.filter(u=>u!==unit);game.pendingFx.length=0;
    expect(await releaseSpirits(ctx,3)).toBe(true);
    expect(fx()).toHaveLength(1);expect(fx()[0]).toMatchObject({reason:'vent',before:3,after:0});
    expect(fx()[0]!.cards.map(c=>c.to)).toEqual(['grave','vanished','vanished']);
    for(const u of tokens){expect(game.cards[u]).toBeUndefined();expect(fx()[0]!.cards.find(c=>c.uid===u)!.defId).toBe('babaylan/kaluluwa');}
  });
  it('cancelled Kalas produces no departure and pays no cards', async () => {
    const {game,ctx,unit,fx}=fixture();moveCard(game,unit,'heart');game.pendingFx.length=0;
    ctx.chooser={...autoChooser,chooseCards:async()=>[]};
    expect(await releaseSpirits(ctx,1)).toBe(false);expect(fx()).toHaveLength(0);expect(game.players[0].heart).toContain(unit);
  });
  it('retrieval and special call produce one journey, with arrival after travel', async () => {
    const {game,ctx,unit,fx}=fixture();moveCard(game,unit,'heart');game.pendingFx.length=0;
    retrieveFromHeart(ctx,unit);expect(fx()).toHaveLength(1);expect(game.pendingFx.some(e=>e.kind==='emit')).toBe(false);
    moveCard(game,unit,'heart');game.pendingFx.length=0;
    await specialCall(ctx,unit,{allowOverwrite:false});
    expect(game.pendingFx.map(e=>e.kind)).toEqual(['heartMove','arrive']);
  });
  it('waits for the Kalas animation before offering its triggered skill', async () => {
    const {game,ctx,unit}=fixture();game.cards[unit]!.defId='babaylan/set-1/spring-sentinel-ulango';moveCard(game,unit,'heart');game.pendingFx.length=0;
    const order:string[]=[];const chooser={...autoChooser,chooseAbility:async()=>{order.push('decision');return null;}};
    const ctrl=new GameController(game,index,{choosers:[chooser,chooser],hooks:{onFx:async e=>{if(e.kind==='heartMove'){order.push('travel');await Promise.resolve();order.push('landed');}}}});
    ventCard(ctx,unit);await ctrl.flushSpiritTriggers();
    expect(order).toContain('decision');expect(order.indexOf('landed')).toBeLessThan(order.indexOf('decision'));
  });
});
