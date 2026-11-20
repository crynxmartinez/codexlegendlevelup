import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { followCardWithLight, recentTrail, showMovementKeyword } from './movement-cue.js';

class Node {
  isConnected = true; className = ''; textContent = ''; attributes: Record<string,string> = {}; children: Node[] = [];
  setAttribute(k:string,v:string) { this.attributes[k]=v; }
  append(...nodes:Node[]) { this.children.push(...nodes); }
  remove() { this.isConnected=false; }
  getBoundingClientRect() { return {left:100,top:80,width:60,height:84}; }
}
let body:Node, frames:Map<number,FrameRequestCallback>, next:number;
const stops:(()=>void)[]=[];
beforeEach(()=>{
  body=new Node(); frames=new Map(); next=0;
  vi.stubGlobal('document',{hidden:false,body,createElement:()=>new Node(),createElementNS:()=>new Node()});
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{ frames.set(++next,fn); return next; });
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>{stops.splice(0).forEach(stop=>stop());vi.unstubAllGlobals();});
function frame(time:number) { const callbacks=[...frames.values()]; frames.clear(); callbacks.forEach(fn=>fn(time)); }
describe('short moving light wake',()=>{
  it('expires old points and bounds work even on high-refresh displays',()=>{
    let points:ReturnType<typeof recentTrail>=[];
    for(let time=0;time<200;time++) points=recentTrail(points,{x:time,y:20,time});
    expect(points).toHaveLength(10);
    expect(recentTrail(points,{x:300,y:20,time:400})).toEqual([{x:300,y:20,time:400}]);
  });
  it('follows the rendered card center and removes its frame loop when the card leaves',()=>{
    const card=new Node(); stops.push(followCardWithLight(card as unknown as HTMLElement,false,false));
    frame(0);
    const svg=body.children[0]!;
    expect(svg.children[1]!.attributes.points).toBe('130.0,122.0');
    card.isConnected=false; frame(16);
    expect(svg.isConnected).toBe(false); expect(frames.size).toBe(0);
  });
  it('caps simultaneous trails and releases slots on repeated cleanup',()=>{
    for(let i=0;i<4;i++) stops.push(followCardWithLight(new Node() as unknown as HTMLElement,false,false));
    expect(body.children).toHaveLength(3);
    stops[0]!();stops[0]!();
    stops.push(followCardWithLight(new Node() as unknown as HTMLElement,true,false));
    expect(body.children).toHaveLength(4);
  });
  it('skips trail work for reduced motion and hidden tabs',()=>{
    stops.push(followCardWithLight(new Node() as unknown as HTMLElement,false,true));
    Object.assign(document,{hidden:true});
    stops.push(followCardWithLight(new Node() as unknown as HTMLElement,false,false));
    expect(body.children).toHaveLength(0);expect(frames.size).toBe(0);
  });
  it('keeps the keyword temporary without changing the phase',()=>{
    const stop=showMovementKeyword('SANIB',false,true);
    expect(body.children[0]!.textContent).toBe('SANIB');
    expect(body.children[0]!.className).toContain('reduced');
    stop();expect(body.children[0]!.isConnected).toBe(false);
  });
});
