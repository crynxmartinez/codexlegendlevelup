import { afterEach, describe, expect, it, vi } from 'vitest';
import { boardChoicePlacement, mountBoardChoiceLayout } from './choice-layout.js';
import { intersects } from './overlay-placement.js';

describe('decision target clearance', () => {
  it.each([[1920,900],[1366,700],[1100,560],[844,390],[740,360]])('fits around local and opponent targets at %s × %s', (width,height) => {
    for (const y of [.24,.62]) {
      const target = {left:width*.3,top:height*y,width:width*.4,height:height*.16};
      const fit = boardChoicePlacement({left:0,top:0,width,height}, [target], true);
      expect(fit).toBeDefined();
      expect(intersects(fit!, {left:target.left-6,top:target.top-6,width:target.width+12,height:target.height+12})).toBe(false);
      expect(fit!.left).toBeGreaterThanOrEqual(8); expect(fit!.top).toBeGreaterThanOrEqual(8);
      expect(fit!.left+fit!.width).toBeLessThanOrEqual(width-8);
      expect(fit!.top+fit!.height).toBeLessThanOrEqual(height-8);
    }
  });
  it('protects both sides and respects a scrolled visual viewport', () => {
    const view = {left:20,top:40,width:1366,height:700};
    const targets = [{left:400,top:180,width:560,height:130},{left:400,top:440,width:560,height:130}];
    const fit = boardChoicePlacement(view, targets, false);
    expect(fit).toBeDefined();
    for (const target of targets) expect(intersects(fit!, target)).toBe(false);
    expect(fit!.top).toBeGreaterThanOrEqual(48);
  });
  it('requests the existing list when the field leaves no usable prompt rectangle', () => {
    const view = {left:0,top:0,width:740,height:360};
    expect(boardChoicePlacement(view, [view], true)).toBeUndefined();
    expect(boardChoicePlacement(view, [], true)).toBeUndefined();
  });
  it('grows a bounded combat preview past the old 240px cap without crossing protected areas', () => {
    const view = {left:0,top:0,width:1440,height:900};
    const barriers = {left:330,top:90,width:735,height:86};
    const hand = {left:382,top:729,width:691,height:171};
    const supporter = {left:480,top:500,width:120,height:165};
    const fit = boardChoicePlacement(view, [barriers,hand,supporter], false, 251);
    expect(fit).toBeDefined(); expect(fit!.height).toBe(251);
    for (const protectedArea of [barriers,hand,supporter]) expect(intersects(fit!,protectedArea)).toBe(false);
  });
  it('uses Card List when a mobile support summary cannot fit fully around hand and Barriers', () => {
    const view = {left:0,top:0,width:844,height:390};
    const barriers = {left:181,top:40,width:456,height:35};
    const hand = {left:208,top:260,width:426,height:130};
    const supporter = {left:300,top:211,width:70,height:80};
    expect(boardChoicePlacement(view, [barriers,hand,supporter], false, 200)).toBeUndefined();
  });
});

class NodeStub {
  isConnected = true;
  classes = new Set<string>();
  classList = { contains:(name:string)=>this.classes.has(name), add:(...names:string[])=>names.forEach(n=>this.classes.add(n)),
    remove:(...names:string[])=>names.forEach(n=>this.classes.delete(n)),
    toggle:(name:string,on:boolean)=>on ? this.classes.add(name) : this.classes.delete(name) };
  values = new Map<string,string>();
  style = {setProperty:(name:string,value:string)=>this.values.set(name,value)};
  getClientRects() { return [this.getBoundingClientRect()]; }
  getBoundingClientRect() { return {left:400,top:500,width:500,height:140}; }
}
afterEach(() => vi.unstubAllGlobals());
it('coalesces layout events, keeps manual minimize/list state and disposes pending work', () => {
  const win = new EventTarget(), viewport = Object.assign(new EventTarget(), {width:1366,height:700,offsetTop:0,offsetLeft:0});
  Object.assign(win,{visualViewport:viewport});
  vi.stubGlobal('window',win);
  const frames = new Map<number,FrameRequestCallback>(); let id = 0;
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++id,fn);return id;});
  vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect=disconnect;});
  const root=new NodeStub(), dialog=new NodeStub(), target=new NodeStub(), fallback=vi.fn();
  const stop=mountBoardChoiceLayout(root as unknown as HTMLElement,dialog as unknown as HTMLElement,[target as unknown as HTMLElement],true,fallback);
  const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(0));};
  win.dispatchEvent(new Event('resize')); win.dispatchEvent(new Event('duel-panel-layout'));
  expect(frames.size).toBe(1); flush();
  expect(root.classes.has('cc-board-docked')).toBe(true); expect(fallback).not.toHaveBeenCalled();
  root.classes.add('duel-minimized'); win.dispatchEvent(new Event('resize')); flush();
  expect(root.classes.has('duel-minimized')).toBe(true); expect(root.classes.has('cc-board-docked')).toBe(false);
  root.classes.delete('duel-minimized'); root.classes.add('board-list-open');
  win.dispatchEvent(new Event('resize')); flush();
  expect(root.classes.has('board-list-open')).toBe(true); expect(fallback).not.toHaveBeenCalled();
  win.dispatchEvent(new Event('resize')); expect(frames.size).toBe(1);
  stop(); stop(); expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledOnce();
  win.dispatchEvent(new Event('resize')); viewport.dispatchEvent(new Event('resize'));
  win.dispatchEvent(new Event('duel-panel-layout')); expect(frames.size).toBe(0);
});
