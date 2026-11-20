import { expect, it, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { RemoteController } from './client.js';
import { MatchSession, parseSetup, type MatchFrame } from './session.js';
import { STARTERS } from './catalog.js';
import { PREVIOUS_MATCH_VERSION } from './compatibility.js';

it('keeps online state and input on the displayed frame until its animation finishes', async () => {
  const messages = new Map<string, (frame: MatchFrame) => void>();
  const room = { onMessage: (kind: string, fn: (frame: MatchFrame) => void) => messages.set(kind, fn), onDrop: () => {}, onLeave: () => {}, send: () => {} } as unknown as Room;
  const session = new MatchSession([parseSetup({deck:STARTERS.Luzon}), parseSetup({deck:STARTERS.Mindanao})], 4, () => {});
  const first = session.frame(0);
  const ctrl = new RemoteController(room, first);
  let finish!: () => void;
  const held = new Promise<void>(resolve => { finish = resolve; });
  const seen: string[] = [];
  ctrl.onFrame = async () => { seen.push(ctrl.game.phase); if (ctrl.frame.presentation) await held; };
  const phase: MatchFrame = {...structuredClone(first), revision:1, busy:true, legal:[], presentation:{id:1,hook:'onPhaseChange',args:['main',0]}};
  phase.state.phase='main';
  const ready: MatchFrame = {...structuredClone(first), revision:2, busy:false, legal:[{kind:'endTurn'}]};
  ready.state.phase='battle';
  messages.get('view')!(phase); messages.get('view')!(ready);
  expect(ctrl.game.phase).toBe('main');
  expect(ctrl.legalActions(0)).toEqual([]);
  expect(seen).toEqual(['main']);
  finish(); await new Promise(resolve => setTimeout(resolve,0));
  expect(seen).toEqual(['main','battle']);
  expect(ctrl.legalActions(0)).toEqual([{kind:'endTurn'}]);
  messages.get('view')!(phase); // delayed older packets cannot rewind the visible table
  expect(ctrl.game.phase).toBe('battle');
});

it('keeps the supported room version fixed and rejects stale server frames', async () => {
  const messages = new Map<string, (frame: MatchFrame) => void>();
  const room = { onMessage: (kind: string, fn: (frame: MatchFrame) => void) => messages.set(kind, fn), onDrop: () => {}, onLeave: () => {}, send: () => {} } as unknown as Room;
  const session = new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],4,()=>{});
  const first=session.frame(0);
  const ctrl=new RemoteController(room,first);
  expect(ctrl.version).toEqual({protocol:first.protocol,content:first.content});
  const next={...structuredClone(first),revision:1};next.state.phase='battle';
  messages.get('view')!(next);await new Promise(resolve=>setTimeout(resolve,0));
  expect(ctrl.game.phase).toBe('battle');
  const wrong={...session.frame(0),...PREVIOUS_MATCH_VERSION};wrong.revision=2;wrong.state.phase='main';
  messages.get('view')!(wrong);
  expect(ctrl.game.phase).toBe('battle');
});

it('submits the current server ordering decision once with the full chosen order', async () => {
  const messages=new Map<string,(frame:MatchFrame)=>void>();
  const sent:unknown[]=[];
  const room={onMessage:(k:string,fn:(f:MatchFrame)=>void)=>messages.set(k,fn),onDrop:()=>{},onLeave:()=>{},send:(kind:string,data:unknown)=>{if(kind==='answer')sent.push(data);}} as unknown as Room;
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],4,()=>{});
  const first=session.frame(0);
  const ctrl=new RemoteController(room,first),visible:string[]=[];
  ctrl.onFrame=()=>{if(ctrl.displayDecision)visible.push(ctrl.displayDecision.id);};
  const send=async(id:string,cards:string[])=>{
    messages.get('view')!({...structuredClone(first),revision:Number(id),decision:{id,owner:0,kind:'chooseCards',args:[0,'Choose the order for the TOP of your deck',cards,cards.length,{ordered:true}]}});
    await new Promise(resolve=>setTimeout(resolve,0));
  };
  await send('1',['a','b','c']);
  expect(ctrl.displayDecision?.kind).toBe('chooseCards');
  ctrl.answer('1',['c','a','b']);
  expect(visible).toEqual(['1']);
  expect(sent).toEqual([{id:'1',answer:['c','a','b']}]);
});

it('rejects the retired room protocol before accepting any decisions', () => {
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],4,()=>{});
  expect(()=>new RemoteController({} as Room,{...session.frame(0),...PREVIOUS_MATCH_VERSION})).toThrow(/server is updating/);
});

it('holds online frames during loading and restores legal actions before refreshing highlights',async()=>{
  const deck=STARTERS.Mindanao!;
  const session=new MatchSession([{deck,choice:{}},{deck,choice:{}}],5,()=>{});
  const handlers=new Map<string,(frame:ReturnType<MatchSession['frame']>)=>void>();
  const room={onMessage:(name:string,cb:(frame:MatchFrame)=>void)=>handlers.set(name,cb),onDrop:()=>{},onLeave:()=>{},send:vi.fn()} as unknown as Room;
  const ctrl=new RemoteController(room,session.frame(0));
  const resume=ctrl.pausePresentation(), shown=vi.fn(); ctrl.onFrame=shown;
  let settledActions=0; ctrl.onFrameSettled=()=>{settledActions=ctrl.legalActions(0).length;};
  const next=session.frame(0); next.revision++; next.legal=[{kind:'endTurn'}];
  next.presentation={id:1,hook:'onPhaseChange',args:['main',0]};
  handlers.get('view')!(next); await Promise.resolve();
  expect(shown).not.toHaveBeenCalled(); expect(ctrl.frame.revision).toBeLessThan(next.revision);
  resume(); await vi.waitFor(()=>expect(shown).toHaveBeenCalledOnce());
  expect(ctrl.presenting).toBe(false); expect(settledActions).toBe(1);
});

it('does not apply a disconnected frame when loading finishes',async()=>{
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],4,()=>{});
  let receive!:(frame:MatchFrame)=>void, drop!:()=>void;
  const room={onMessage:(name:string,cb:(frame:MatchFrame)=>void)=>{if(name==='view')receive=cb;},onDrop:(cb:()=>void)=>{drop=cb;},onLeave:()=>{},send:vi.fn()} as unknown as Room;
  const first=session.frame(0),ctrl=new RemoteController(room,first),resume=ctrl.pausePresentation();
  receive({...structuredClone(first),revision:first.revision+1}); drop(); resume();
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(ctrl.frame.revision).toBe(first.revision); expect(ctrl.connected).toBe(false);
});

it('notifies presentation cleanup when a room closes directly during playback',async()=>{
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],4,()=>{});
  let receive!:(frame:MatchFrame)=>void, leave!:()=>void;
  const room={onMessage:(name:string,cb:(frame:MatchFrame)=>void)=>{if(name==='view')receive=cb;},onDrop:()=>{},onLeave:(cb:()=>void)=>{leave=cb;},send:vi.fn()} as unknown as Room;
  const first=session.frame(0),ctrl=new RemoteController(room,first);
  const ownership=new AbortController(),contact=vi.fn(),settled=vi.fn();
  ctrl.onFrameSettled=settled;
  ctrl.onFrame=async()=>{
    await new Promise<void>(resolve=>ownership.signal.addEventListener('abort',()=>resolve(),{once:true}));
    if(!ownership.signal.aborted)contact();
  };
  // BoardUI uses this notification to abort the old match's decorative layers.
  ctrl.onNotice=vi.fn(()=>{expect(ctrl.connected).toBe(false);ownership.abort();});
  const pending=ctrl.perform({kind:'endTurn'}).catch(error=>(error as Error).message);
  receive({...structuredClone(first),revision:first.revision+1,busy:true,presentation:{id:1,hook:'onPhaseChange',args:['battle',0]}});
  leave();
  expect(ownership.signal.aborted).toBe(true);
  expect(ctrl.onNotice).toHaveBeenCalledWith('Room closed. Return to the title screen to create another.');
  expect(await pending).toBe('Room closed.');
  await new Promise(resolve=>setTimeout(resolve,0));
  receive({...structuredClone(first),revision:first.revision+2});
  expect(contact).not.toHaveBeenCalled();expect(settled).not.toHaveBeenCalled();
  expect(ctrl.connected).toBe(false);expect(ctrl.frame.revision).toBe(first.revision+1);
  expect(ctrl.legalActions(0)).toEqual([]);
  session.close();
});
