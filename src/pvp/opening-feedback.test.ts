import { describe, expect, it } from 'vitest';
import { OpeningFeedback } from './opening-feedback.js';
import { MatchOpening } from './opening.js';
import { STARTERS } from './catalog.js';
import { profileFighter } from './profile.js';

const create=(values=[5,2])=>new MatchOpening([{deck:STARTERS.Luzon!,choice:{}},{deck:STARTERS.Visayas!,choice:{}}],()=>values.shift()!);
describe('PvP roll feedback without local outcomes',()=>{
  for(const seat of [0,1] as const){
    it(`keeps seat ${seat} locked across duplicate snapshots and delayed opponent rolls`,()=>{
      const o=create(),f=new OpeningFeedback();expect(f.receive(o.view(),seat)).toEqual([false,false]);
      expect(f.submit('roll',o.view(),seat)).toBe(true);
      expect(f.submit('roll',o.view(),seat)).toBe(false);
      f.receive(o.view(),seat);expect(f.pending).toBe('roll');
      o.roll((1-seat) as 0|1,1);f.receive(o.view(),seat);expect(f.pending).toBe('roll');
      o.roll(seat,1);expect(f.receive(o.view(),seat)[seat]).toBe(true);expect(f.pending).toBeUndefined();
      expect(f.receive(o.view(),seat)).toEqual([false,false]);
      expect(f.submit('confirm',o.view(),seat)).toBe(true);
      f.receive(o.view(),seat);expect(f.pending).toBe('confirm');
      o.confirm(seat,'dice');f.receive(o.view(),seat);expect(f.pending).toBeUndefined();
      expect(f.submit('confirm',o.view(),seat)).toBe(false);
    });
  }
  it('handles simultaneous tie submissions acknowledged in the next round',()=>{
    const o=create([3,3,2,6]);o.roll(0,1);o.roll(1,1);
    const a=new OpeningFeedback(),b=new OpeningFeedback();a.receive(o.view(),0);b.receive(o.view(),1);
    a.submit('roll',o.view(),0);b.submit('roll',o.view(),1);
    o.roll(0,1);o.roll(1,1);a.receive(o.view(),0);b.receive(o.view(),1);
    expect(a.pending).toBeUndefined();expect(b.pending).toBeUndefined();
    expect(b.submit('roll',o.view(),1)).toBe(true);o.roll(1,2);
    expect(o.first).toBe(1);expect(b.receive(o.view(),1)).toEqual([false,true]);
  });
  it('restores a missed authoritative result without replay or resend on reconnect',()=>{
    const o=create(),f=new OpeningFeedback();f.receive(o.view(),0);f.submit('roll',o.view(),0);
    f.connection(false);expect(f.submit('roll',o.view(),0)).toBe(false);
    o.roll(0,1);o.roll(1,1);f.connection(true);
    expect(f.receive(o.view(),0)).toEqual([false,false]);expect(f.pending).toBeUndefined();
    expect(f.submit('roll',o.view(),0)).toBe(false);expect(f.submit('confirm',o.view(),0)).toBe(true);
  });
  it('does not animate completed rolls on the first restored snapshot',()=>{
    const o=create();o.roll(0,1);o.roll(1,1);
    expect(new OpeningFeedback().receive(o.view(),1)).toEqual([false,false]);
  });
  it('clears rejected submissions without fabricating a result',()=>{
    const o=create(),f=new OpeningFeedback();f.receive(o.view(),0);f.submit('roll',o.view(),0);f.release();
    expect(f.submit('roll',o.view(),0)).toBe(true);expect(o.rolls).toEqual([null,null]);
  });
  it('accepts only known optional character identifiers, with no implicit identity assignment',()=>{
    expect(profileFighter('amir')).toBe('amir');
    for(const value of [undefined,null,'../nico','https://example.com','Taguwasi',{},1])expect(profileFighter(value)).toBeUndefined();
  });
});
