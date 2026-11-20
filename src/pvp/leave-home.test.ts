import { it, expect, vi } from 'vitest';
import { RemoteController } from './client.js';

function fixture(winner: number | null = null) {
  const calls:string[]=[];
  const ctrl={ connected:true, game:{winner}, room:{send:(name:string)=>calls.push(name),leave:vi.fn(async(consent:boolean)=>{calls.push(`leave:${consent}`);})},playback:{clear:vi.fn()},deckOrder:{clear:vi.fn()},deferredAnswer:{id:'old',answer:true}};
  const leave=()=>RemoteController.prototype.leaveToHome.call(ctrl as unknown as RemoteController);
  return {ctrl,calls,leave};
}
it('surrenders before consented leave and clears deferred answers',async()=>{
  const {ctrl,calls,leave}=fixture();await leave();
  expect(calls).toEqual(['surrender','leave:true']);expect(ctrl.deferredAnswer).toBeUndefined();expect(ctrl.playback.clear).toHaveBeenCalledOnce();
});
it('does not turn a completed game into another surrender',async()=>{
  const {calls,leave}=fixture(0);await leave();expect(calls).toEqual(['leave:true']);
});
it('keeps a disconnected seat recoverable until leave can reach the server',async()=>{
  const {ctrl,calls,leave}=fixture();ctrl.connected=false;
  await expect(leave()).rejects.toThrow('reconnection');expect(calls).toEqual([]);expect(ctrl.playback.clear).not.toHaveBeenCalled();
});
it('can return Home after the server has already closed the room',async()=>{
  const {ctrl,calls,leave}=fixture();Object.assign(ctrl,{closed:true,connected:false});
  await leave();expect(calls).toEqual([]);
});
