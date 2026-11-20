import { afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({motion:vi.fn(),feedback:vi.fn(),keyword:vi.fn(),trail:vi.fn(),clearKeyword:vi.fn(),stopTrail:vi.fn()}));
vi.mock('./duel-motion.js',()=>({playMotion:mocks.motion,motionDuration:()=>200,batchDelay:()=>0,motionEpoch:()=>0}));
vi.mock('./battle-feedback.js',()=>({feedbackAt:mocks.feedback}));
vi.mock('./sfx.js',()=>({playCue:vi.fn()}));
vi.mock('./card-art-cache.js',()=>({readyFlightArt:()=>Promise.resolve()}));
vi.mock('./movement-cue.js',()=>({showMovementKeyword:mocks.keyword,followCardWithLight:mocks.trail}));
import { animateHeartMove } from './heart-motion.js';

it('lights Grave before flight and updates Heart only after arrival, then clears presentation',async()=>{
  const events:string[]=[];
  const count={textContent:'2 in Heart'};
  const make=(name:string,x:number)=>({name,className:'',dataset:{},style:{cssText:'',backgroundImage:'',visibility:''},
    classList:{add:vi.fn(),remove:vi.fn()},setAttribute:vi.fn(),remove:vi.fn(),
    querySelector:()=>count,getBoundingClientRect:()=>({x,y:200,width:80,height:112})});
  const grave=make('grave',600),heart=make('heart',300),fly=make('fly',600);
  vi.stubGlobal('innerWidth',1280);vi.stubGlobal('innerHeight',720);
  vi.stubGlobal('document',{hidden:false,body:{append:vi.fn()},createElement:()=>fly});
  mocks.keyword.mockImplementation(()=>{events.push('keyword');return mocks.clearKeyword;});
  mocks.trail.mockImplementation(()=>{events.push('trail');return mocks.stopTrail;});
  mocks.motion.mockImplementation(async node=>{events.push(node.name);if(node===grave || node===fly) expect(count.textContent).toBe('2 in Heart');});
  mocks.feedback.mockImplementation(()=>{events.push('result');expect(count.textContent).toBe('3 in Heart');});
  await animateHeartMove({kind:'heartMove',reason:'essence',owner:0,before:2,after:3,cards:[
    {uid:'public-grave-card',defId:'test',from:'grave',to:'heart',fromSlot:null,toSlot:null,hidden:false}
  ]},{card:()=>null,zone:zone=>(zone==='heart'?heart:grave) as unknown as HTMLElement,
    art:()=>'/test.webp',back:'/back.webp',viewer:0,duration:ms=>ms,reduced:false,anime:true});
  expect(events).toEqual(['keyword','grave','trail','fly','result','heart']);
  expect(fly.remove).toHaveBeenCalled();expect(mocks.stopTrail).toHaveBeenCalled();expect(mocks.clearKeyword).toHaveBeenCalledOnce();
});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
