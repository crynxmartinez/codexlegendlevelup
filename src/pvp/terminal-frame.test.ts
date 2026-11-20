import { expect,it,vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { MatchSession,parseSetup,type MatchFrame } from './session.js';
import { STARTERS } from './catalog.js';
import { RemoteController } from './client.js';

it.each([0,1] as const)('delivers a newer terminal snapshot to both clients when seat %i surrenders during a decision',async loser=>{
  const session=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})],42,()=>{});
  // Match the room's existing finish path: concede, close, publish final frame.
  const pending=session.decisions.chooser(loser).confirm(loser,'Optional effect?').catch(error=>error);
  const clients=([0,1] as const).map(seat=>{
    const messages=new Map<string,(f:MatchFrame)=>void>();
    const room={onMessage:(name:string,fn:(f:MatchFrame)=>void)=>messages.set(name,fn),onDrop:()=>{},onLeave:()=>{},send:vi.fn()} as unknown as Room;
    const first=session.frame(seat),ctrl=new RemoteController(room,first);
    const rendered=vi.fn();ctrl.onFrame=rendered;
    return {seat,first,ctrl,rendered,view:messages.get('view')!};
  });
  expect(session.ctrl.concede(loser)).toBe(true);session.close();expect(await pending).toBeInstanceOf(Error);
  for(const c of clients){
    const terminal=session.frame(c.seat);
    expect(terminal.revision).toBeGreaterThan(c.first.revision);
    expect(terminal.decision).toBeNull();expect(terminal.legal).toEqual([]);
    c.view(terminal);await new Promise(r=>setTimeout(r,0));
    expect(c.ctrl.game.winner).toBe(loser===c.seat?1:0);
    expect(c.rendered).toHaveBeenCalledTimes(1);
    c.view(terminal);await new Promise(r=>setTimeout(r,0));
    expect(c.rendered).toHaveBeenCalledTimes(1);
  }
  const revision=session.revision;session.close();expect(session.revision).toBe(revision);
});
