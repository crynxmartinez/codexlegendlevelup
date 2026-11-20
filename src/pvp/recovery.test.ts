import { expect, it, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { RemoteController } from './client.js';
import { MatchSession, parseSetup, type MatchFrame } from './session.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { prepareCards, commitCost } from '../core/activation.js';
import type { EffectContext } from '../core/effects.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

for (const seat of [0,1] as const) for (const lost of ['submission','acknowledgement'] as const) {
  it(`recovers a lost ${lost} for seat ${seat} without repeating payment or continuation`,async()=>{
    const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],42,()=>{});
    const handlers=new Map<string,(f:MatchFrame)=>void>();let disconnect=()=>{};
    const send=vi.fn((kind:string,payload:{id:string;answer:unknown})=>{
      if(kind==='answer' && !(lost==='submission'&&send.mock.calls.length===1))session.decisions.answer(seat,payload.id,payload.answer);
    });
    const room={onMessage:(k:string,fn:(f:MatchFrame)=>void)=>handlers.set(k,fn),onDrop:(fn:()=>void)=>{disconnect=fn;},onLeave:()=>{},send} as unknown as Room;
    const ctrl=new RemoteController(room,session.frame(seat));
    const player=session.game.players[seat],uid=player.hand[0]!,before=player.hand.length;
    const ctx:EffectContext={index:MATCH_INDEX,game:session.game,me:seat,source:player.persona!,chooser:session.decisions.chooser(seat)};
    let payments=0,resolutions=0;
    const pending=prepareCards(ctx,[uid],1,'discard','Pay one card').then(plan=>{
      expect(plan).not.toBeNull();expect(commitCost(ctx,plan!)).not.toBeNull();payments++;resolutions++;
    });
    const id=session.decisions.pending!.id;
    handlers.get('view')!(session.frame(seat));await tick();
    ctrl.answer(id,[uid]);ctrl.answer(id,[uid]);await tick();disconnect();
    handlers.get('view')!(session.frame(seat));await tick();await pending;
    const state=JSON.stringify(session.game);
    // Late duplicate and wrong-seat deliveries cannot re-enter a completed payment.
    session.decisions.answer(seat,id,[uid]);session.decisions.answer(seat===0?1:0,id,[uid]);
    handlers.get('view')!(session.frame(seat));await tick();ctrl.answer(id,[uid]);
    expect(send).toHaveBeenCalledTimes(lost==='submission'?2:1);
    expect(payments).toBe(1);expect(resolutions).toBe(1);
    expect(player.hand).toHaveLength(before-1);expect(player.grave.filter(x=>x===uid)).toHaveLength(1);
    expect(JSON.stringify(session.game)).toBe(state);session.close();
  });
}
function fixture(){
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],42,()=>{});
  const handlers=new Map<string,(f:any)=>void>();let drop=()=>{};
  const send=vi.fn();
  const room={onMessage:(k:string,fn:(f:any)=>void)=>handlers.set(k,fn),onDrop:(fn:()=>void)=>{drop=fn;},onLeave:()=>{},send} as unknown as Room;
  const first=session.frame(0),ctrl=new RemoteController(room,first);
  return {ctrl,first,send,view:(f:MatchFrame)=>handlers.get('view')!(f),drop:()=>drop()};
}
it('retries a locally sent but lost answer only after authoritative reconnect confirms it is pending',async()=>{
  const {ctrl,first,view,send,drop}=fixture();
  const decision={id:'pending',owner:0 as const,kind:'confirm' as const,args:[0,'Continue?']};
  view({...structuredClone(first),revision:1,decision});await tick();
  ctrl.answer('pending',true);ctrl.answer('pending',true);
  expect(send).toHaveBeenCalledTimes(1);
  drop();view({...structuredClone(first),revision:1,decision});await tick();
  expect(send.mock.calls).toEqual([['answer',{id:'pending',answer:true}],['answer',{id:'pending',answer:true}]]);
  view({...structuredClone(first),revision:2,decision});await tick();ctrl.answer('pending',true);
  expect(send).toHaveBeenCalledTimes(2);
});
it.each([null,{id:'next',owner:0 as const,kind:'confirm' as const,args:[0,'Next?']}])('never replays an accepted answer when reconnect has decision %j',async decision=>{
  const {ctrl,first,view,send,drop}=fixture();
  view({...structuredClone(first),revision:1,decision:{id:'old',owner:0,kind:'confirm',args:[0,'Continue?']}});await tick();
  ctrl.answer('old',true);drop();view({...structuredClone(first),revision:2,decision});await tick();
  ctrl.answer('old',true);expect(send).toHaveBeenCalledTimes(1);
});
it('requests sync even when rendering the recovery notice throws; stops after one failed retry',async()=>{
  const {ctrl,first,send,view}=fixture();
  ctrl.onFrame=()=>{throw new Error('renderer');};ctrl.onNotice=()=>{throw new Error('notice renderer');};
  view({...structuredClone(first),revision:1});await tick();
  expect(send.mock.calls).toEqual([['sync']]);expect(ctrl.frame.revision).toBe(first.revision);
  view({...structuredClone(first),revision:1});await tick();
  view({...structuredClone(first),revision:2});await tick();
  expect(send.mock.calls).toEqual([['sync']]);expect(ctrl.connected).toBe(false);
});
it('rejects a missing public defender before mutating the displayed table and accepts a valid same-revision sync',async()=>{
  const {ctrl,first,view,send}=fixture();const bad=structuredClone(first);bad.revision=1;
  bad.state.activeBattle={attacker:'missing',target:'missing',defender:0,blockers:['missing']} as NonNullable<MatchFrame['state']['activeBattle']>;
  const render=vi.fn();ctrl.onFrame=render;
  view(bad);await tick();expect(render).not.toHaveBeenCalled();expect(ctrl.game.activeBattle).toBeNull();
  const decision={id:'restore',owner:0 as const,kind:'confirm' as const,args:[0,'Continue?']};
  view({...structuredClone(first),revision:1,decision});await tick();
  expect(ctrl.connected).toBe(true);expect(ctrl.displayDecision).toEqual(decision);
  ctrl.answer('obsolete',true);ctrl.answer('restore',true);ctrl.answer('restore',true);
  expect(send.mock.calls).toEqual([['sync'],['answer',{id:'restore',answer:true}]]);
});
it('does not settle old callbacks or send a deferred answer after disconnect during an animation',async()=>{
  const {ctrl,first,view,send,drop}=fixture();let release!:()=>void;
  ctrl.onFrame=()=>new Promise<void>(resolve=>{release=resolve;});const settled=vi.fn();ctrl.onFrameSettled=settled;
  const decision={id:'old',owner:0 as const,kind:'confirm' as const,args:[0,'Continue?']};
  view({...structuredClone(first),revision:1,decision});drop();ctrl.answer('old',true);release();await tick();
  expect(settled).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();expect(ctrl.connected).toBe(false);
  ctrl.onFrame=()=>{};
  view({...structuredClone(first),revision:2,decision:null});await tick();
  expect(ctrl.connected).toBe(true);expect(send).not.toHaveBeenCalled();
});
