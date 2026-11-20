import { expect,it,vi } from 'vitest';
import { FramePlayback } from './presentation.js';
import { waitFor,type DuelPace } from '../ui/pace.js';

// Virtual arrival delays, not a browser/network emulation. A WebSocket preserves
// order; this models delayed delivery and queued bursts without reordering it.
it.each((['learning','standard','fast'] as DuelPace[]).flatMap(pace=>[false,true].map(reduced=>({pace,reduced}))))
('drains delayed bursts at $pace, reduced=$reduced without overlapping or dropping frames',async({pace,reduced})=>{
  vi.useFakeTimers();
  try {
    const startedAt=Date.now();
    const started:number[]=[],finished:number[]=[];let active=0,maxActive=0,maxDepth=0;
    const failures:unknown[]=[];
    const playback=new FramePlayback<number>(async n=>{
      active++;maxActive=Math.max(maxActive,active);started.push(n);
      await new Promise(r=>setTimeout(r,waitFor(pace,'cardMove',reduced)!));
      finished.push(n);active--;
    },e=>failures.push(e),(_kind,depth)=>{maxDepth=Math.max(maxDepth,depth);});
    const arrivals=[0,40,250,250,250,500,560,800,800,800,800,1200];
    arrivals.forEach((ms,i)=>setTimeout(()=>playback.push(i),ms));
    await vi.runAllTimersAsync();
    expect(started).toEqual(arrivals.map((_,i)=>i));expect(finished).toEqual(started);
    expect(maxActive).toBe(1);expect(playback.pending).toBe(false);expect(failures).toEqual([]);
    expect(maxDepth).toBeLessThanOrEqual(arrivals.length);
    expect(Date.now()-startedAt).toBeLessThanOrEqual(1200 + arrivals.length * waitFor(pace,'cardMove',reduced)!);
  } finally {vi.useRealTimers();}
});
