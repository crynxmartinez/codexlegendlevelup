import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./duel-motion.js',()=>({flyCard:vi.fn(async()=>{}),motionDuration:()=>300,batchDelay:(i:number)=>i*30}));
vi.mock('./sfx.js',()=>({playCue:vi.fn()}));
vi.mock('./battle-feedback.js',()=>({feedbackAt:vi.fn()}));
import { animateHandMove, type HandMotionHost } from './hand-motion.js';
import { flyCard } from './duel-motion.js';
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();});
function fixture() {
  vi.stubGlobal('document',{hidden:false});
  vi.stubGlobal('DOMRect',class { constructor(public x:number,public y:number,public width:number,public height:number){} });
  const nodes=[0,1].map(i=>({style:{visibility:''},getBoundingClientRect:()=>({x:30+i*60,y:300,width:60,height:84})} as HTMLElement));
  const pile={getBoundingClientRect:()=>({x:500,y:100,width:60,height:84})} as HTMLElement;
  const host:HandMotionHost={source:(_u,_o,i)=>nodes[i]!,origin:()=>nodes[0]!.getBoundingClientRect(),destination:()=>pile,art:id=>id+'.webp',back:'back.webp',viewer:0};
  return {nodes,host};
}
it('hides all departing hand cards before any flight begins and restores temporary styles',async()=>{
  const {nodes,host}=fixture();
  vi.mocked(flyCard).mockImplementation(async()=>{expect(nodes.every(n=>n.style.visibility==='hidden')).toBe(true);});
  await animateHandMove({kind:'handMove',owner:0,cards:[{uid:'a',defId:'a',to:'grave',toSlot:null,hidden:false},{uid:'b',defId:'b',to:'deck',toSlot:null,hidden:true}]},host);
  expect(flyCard).toHaveBeenCalledTimes(2);expect(nodes.every(n=>n.style.visibility==='')).toBe(true);
  expect(vi.mocked(flyCard).mock.calls[1]![0]).toMatchObject({image:'url("b.webp")',delay:30,to:{x:500,y:100}});
});
it('uses a card back for an opponent private return and skips cancelled presentation',async()=>{
  const {host}=fixture();vi.mocked(flyCard).mockImplementation(async()=>{});
  const fx={kind:'handMove' as const,owner:1 as const,cards:[{uid:'hidden',defId:'',to:'deck' as const,toSlot:null,hidden:true}]};
  await animateHandMove(fx,host);expect(vi.mocked(flyCard).mock.calls[0]![0].image).toBe('url("back.webp")');
  vi.mocked(flyCard).mockClear();const abort=new AbortController();abort.abort();
  await animateHandMove(fx,{...host,signal:abort.signal});expect(flyCard).not.toHaveBeenCalled();
});
