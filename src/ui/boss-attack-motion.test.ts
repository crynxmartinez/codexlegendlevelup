import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOSS_ATTACK_PROFILES } from './boss-attack-profiles.js';
import { bossAttackPath, bossSpriteFrames, playBossAttack, preloadBossAttack, registerBossAttackAssets,
  type BossAttackAsset, type BossAttackPhase, type BossAttackSheet } from './boss-attack-motion.js';
import { finishDuelMotion } from './duel-motion.js';

type FakeAnimation = { finished: Promise<void>; finish: () => void; cancel: () => void };
class Node {
  className = ''; dataset: Record<string,string> = {}; style: Record<string,string> = {};
  children: Node[] = []; isConnected = false; animations: FakeAnimation[] = [];
  setAttribute = vi.fn();
  append(...nodes: Node[]) { this.children.push(...nodes); nodes.forEach(n => { n.isConnected = this.isConnected; }); }
  remove() { this.isConnected = false; this.children.forEach(n => n.remove()); }
  getAnimations({subtree = false} = {}): FakeAnimation[] {
    return [...this.animations, ...(subtree ? this.children.flatMap(n => n.getAnimations({subtree})) : [])];
  }
  animate = vi.fn((frames: Keyframe[], options: KeyframeAnimationOptions) => {
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    const animation = {finished,finish,cancel:finish}; this.animations.push(animation);
    calls.push({node:this,frames,options,animation,phase:this.dataset.phase});
    if (autoFinish) queueMicrotask(finish);
    return animation;
  });
}
const calls: Array<{node:Node;frames:Keyframe[];options:KeyframeAnimationOptions;animation:FakeAnimation;phase:string|undefined}> = [];
let nodes: Node[] = [], loadedUrls: string[] = [], autoFinish = true, sequence = 0;
const from = {left:200,top:500,width:100,height:140} as DOMRect;
const to = {left:600,top:150,width:100,height:140} as DOMRect;
const sulayman = BOSS_ATTACK_PROFILES['maguindanao/set-1/three-scourge-champion-sulayman']!;
const gurayn = BOSS_ATTACK_PROFILES['maguindanao/set-1/seven-sight-final-scourge-gurayn']!;
const phases: readonly BossAttackPhase[] = ['formation','travel','impact','dispersal'];

function sheet(url: string): BossAttackSheet { return {url,columns:4,frameCount:16,frameWidth:512,frameHeight:512}; }
function asset(url: string): BossAttackAsset { return {
  formation:{...sheet(url),firstFrame:0,frames:3}, travel:{...sheet(url),firstFrame:3,frames:7},
  impact:{...sheet(url),firstFrame:10,frames:4}, dispersal:{...sheet(url),firstFrame:14,frames:2},
}; }
function register(profile = sulayman, value = asset('/test-' + (++sequence) + '.webp')) {
  registerBossAttackAssets({[profile.id]:value}); return value;
}
async function ready(profile = sulayman) {
  const value=register(profile); expect(await preloadBossAttack(profile)).toBe(true); return value;
}
function active() { return nodes.filter(n => n.isConnected); }
async function flush() { for (let i=0;i<16;i++) await Promise.resolve(); }
async function finishPhase(phase: BossAttackPhase) {
  calls.filter(c=>c.phase===phase).forEach(c=>c.animation.finish()); await flush();
}
function spriteCalls() { return calls.filter(c=>c.node.className==='boss-attack-sprite'); }

beforeEach(() => {
  vi.useFakeTimers(); nodes=[]; loadedUrls=[]; calls.length=0; autoFinish=true;
  vi.stubGlobal('document', {
    hidden:false,
    documentElement:{dataset:{duelPace:'standard'},classList:{add:vi.fn(),remove:vi.fn()}},
    createElement:()=>{const n=new Node();nodes.push(n);return n;},
    body:{append:(node:Node)=>{node.isConnected=true;node.children.forEach(n=>{n.isConnected=true;});}},
  });
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  vi.stubGlobal('Image', class {
    complete=false; naturalWidth=2048; naturalHeight=2048;
    onload: null | (()=>void)=null; onerror: null | (()=>void)=null;
    decode=async()=>{};
    set src(value:string){loadedUrls.push(value);queueMicrotask(()=>{this.complete=true;this.onload?.();});}
  });
});
afterEach(() => {finishDuelMotion();vi.useRealTimers();vi.unstubAllGlobals();});

describe('V2 authored frame metadata and preload',()=>{
  it('keeps preview effects inside an explicit native-dialog host',async()=>{
    await ready();const host=new Node();host.isConnected=true;
    const append=vi.spyOn(document.body,'append');
    const result=await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact:vi.fn(),host:host as unknown as HTMLElement});
    expect(result.contactCount).toBe(1);expect(host.children.length).toBeGreaterThan(0);expect(append).not.toHaveBeenCalled();expect(active()).toHaveLength(0);
  });
  it('addresses every cell discretely and never wraps the final frame',()=>{
    const frames=bossSpriteFrames(sheet('/sheet.webp'));
    expect(frames).toHaveLength(17);
    expect(frames[0]).toMatchObject({backgroundPosition:'0% 0%',offset:0});
    expect(frames[15]).toMatchObject({backgroundPosition:'100% 100%',offset:15/16});
    expect(frames[16]).toMatchObject({backgroundPosition:'100% 100%',offset:1});
    expect(frames.slice(0,-1).every(f=>f.easing==='steps(1, end)')).toBe(true);
  });
  it('validates all four phase ranges',()=>{
    for(const phase of phases){
      const value=asset('/bad.webp');
      value[phase]={...sheet('/bad.webp'),firstFrame:14,frames:4};
      expect(()=>registerBossAttackAssets({bad:value})).toThrow('Invalid boss attack sheet');
    }
  });
  it('prefers an exact card registration over a family and decodes one shared atlas',async()=>{
    registerBossAttackAssets({[sulayman.assetKey]:asset('/family-' + (++sequence) + '.webp')});
    const exact=register();
    await preloadBossAttack(sulayman);
    expect(loadedUrls).toEqual([exact.travel.url]);
  });
  it('retains family fallback for an unregistered profile and splits unregistered 16-frame URLs',async()=>{
    const family={...sulayman,id:'unregistered-family-' + (++sequence)};
    const familyAsset=asset('/legacy-family-' + (++sequence) + '.webp');
    registerBossAttackAssets({[family.assetKey]:familyAsset});
    expect(await preloadBossAttack(family)).toBe(true);
    expect(loadedUrls).toEqual([familyAsset.travel.url]);
    const profile={...sulayman,id:'unregistered-profile-' + (++sequence),assetKey:'wind' as const,
      travelAsset:{...sulayman.travelAsset,src:'/fallback-' + (++sequence) + '.webp'}};
    await preloadBossAttack(profile);
    await playBossAttack({profile,from,to,outcome:'hit',impact:vi.fn()});
    expect(spriteCalls().map(c=>c.phase)).toEqual(phases);
    expect(spriteCalls().map(c=>c.frames.length-1)).toEqual([3,7,4,2]);
  });
  it('preloads every phase and keeps missing impact art from reporting ready',async()=>{
    const value=register(sulayman,{...asset('/shared-' + (++sequence) + '.webp'),
      impact:{...sheet('/unready-impact-' + (++sequence) + '.webp'),firstFrame:10,frames:4}});
    vi.stubGlobal('Image',class{
      complete=false;naturalWidth=2048;naturalHeight=2048;onload:null|(()=>void)=null;onerror:null|(()=>void)=null;
      decode=async()=>{};
      set src(url:string){loadedUrls.push(url);queueMicrotask(()=>url===value.impact!.url?this.onerror?.():this.onload?.());}
    });
    expect(await preloadBossAttack(sulayman)).toBe(false);
    expect(new Set(loadedUrls)).toEqual(new Set([value.travel.url,value.impact!.url]));
    expect((await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact:vi.fn()})).mode).toBe('fallback');
  });
  it('awaits decode and validates expected atlas dimensions before declaring readiness',async()=>{
    register();let resolveDecode!:()=>void;
    vi.stubGlobal('Image',class{
      complete=false;naturalWidth=2048;naturalHeight=2048;onload:null|(()=>void)=null;onerror=null;
      decode=()=>new Promise<void>(resolve=>{resolveDecode=resolve;});
      set src(_url:string){queueMicrotask(()=>this.onload?.());}
    });
    let finished=false;const loading=preloadBossAttack(sulayman).then(value=>{finished=true;return value;});
    await flush();expect(finished).toBe(false);
    resolveDecode();expect(await loading).toBe(true);
    register();const decode=vi.fn();
    vi.stubGlobal('Image',class{
      complete=false;naturalWidth=1024;naturalHeight=2048;onload:null|(()=>void)=null;onerror=null;
      decode=decode;set src(_url:string){queueMicrotask(()=>this.onload?.());}
    });
    expect(await preloadBossAttack(sulayman)).toBe(false);expect(decode).not.toHaveBeenCalled();
  });
  it.each(['reject','timeout'] as const)('settles a %s decoder without blocking later presentation',async kind=>{
    register();
    vi.stubGlobal('Image',class{
      complete=false;naturalWidth=2048;naturalHeight=2048;onload:null|(()=>void)=null;onerror=null;
      decode=()=>kind==='reject'?Promise.reject(new Error('decode')):new Promise<void>(()=>{});
      set src(_url:string){queueMicrotask(()=>this.onload?.());}
    });
    const loading=preloadBossAttack(sulayman,100);await flush();
    if(kind==='timeout')await vi.advanceTimersByTimeAsync(100);
    expect(await loading).toBe(false);
    expect((await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact:vi.fn()})).mode).toBe('fallback');
    expect(active()).toHaveLength(0);
  });
  it('uses screen-space endpoints in both directions, including coincident cards',()=>{
    const forward=bossAttackPath(from,to),reverse=bossAttackPath(to,from);
    expect(Math.sign(forward.dx)).toBe(-Math.sign(reverse.dx));
    expect(Math.sign(forward.dy)).toBe(-Math.sign(reverse.dy));
    expect(Math.abs(forward.angle-reverse.angle)).toBeCloseTo(180);
    expect(Object.values(bossAttackPath(from,from)).every(Number.isFinite)).toBe(true);
    expect(forward.endX).toBeLessThan(to.left+to.width/2);
    expect(forward.endY).toBeGreaterThan(to.top+to.height/2);
  });
});

describe('V2 attack phases and lifecycle',()=>{
  it('plays all sixteen frames once in one square group with a single contact at frame11',async()=>{
    const value=await ready(gurayn);
    let phaseAtContact:string|undefined,frameAtContact:string|undefined;
    const impact=vi.fn(()=>{
      const sprite=nodes.find(n=>n.className==='boss-attack-sprite')!;
      phaseAtContact=sprite.dataset.phase;frameAtContact=sprite.style.backgroundPosition;
    });
    const result=await playBossAttack({profile:gurayn,from,to,outcome:'hit',impact});
    expect(result).toMatchObject({mode:'sprite',contactCount:1,assetReady:true,interrupted:false});
    const sprites=nodes.filter(n=>n.className==='boss-attack-sprite');
    expect(sprites).toHaveLength(1); // The authored group already contains seven feathers.
    const group=nodes.find(n=>n.children.includes(sprites[0]!))!;
    expect(group.style.width).toBe(group.style.height);
    expect(sprites[0]!.style.filter).toBeUndefined();
    expect(sprites[0]!.style.transform).toBe('rotate(' + bossAttackPath(from,to).angle + 'deg)');
    expect(sprites[0]!.dataset.cardId).toBe(gurayn.id);
    expect(spriteCalls().map(c=>c.phase)).toEqual(phases);
    expect(spriteCalls().map(c=>c.frames.length-1)).toEqual([3,7,4,2]);
    expect(spriteCalls().flatMap(c=>c.frames.slice(0,-1).map(f=>f.backgroundPosition)))
      .toEqual(bossSpriteFrames(sheet(value.travel.url)).slice(0,-1).map(f=>f.backgroundPosition));
    expect(phaseAtContact).toBe('impact');
    expect(frameAtContact).toBe(bossSpriteFrames(value.impact!)[0]!.backgroundPosition);
    expect(impact).toHaveBeenCalledOnce();expect(active()).toHaveLength(0);
  });
  it('waits for all travel motion before contact and keeps the target anchor through dispersal',async()=>{
    await ready();autoFinish=false;const impact=vi.fn();
    const run=playBossAttack({profile:sulayman,from,to,outcome:'hit',impact});
    await finishPhase('formation');expect(impact).not.toHaveBeenCalled();
    const travel=calls.filter(c=>c.phase==='travel');
    expect(travel).toHaveLength(2);
    travel[0]!.animation.finish();await flush();expect(impact).not.toHaveBeenCalled();
    travel[1]!.animation.finish();await flush();expect(impact).toHaveBeenCalledOnce();
    const group=nodes.find(n=>n.className==='boss-attack-contact')!;
    expect(group.style.translate).toBe(bossAttackPath(from,to).dx+'px '+bossAttackPath(from,to).dy+'px');
    await finishPhase('impact');await finishPhase('dispersal');await run;
    expect(impact).toHaveBeenCalledOnce();expect(active()).toHaveLength(0);
  });
  it('shows a guard after travel for a blocked attack, never authored hit or hit debris',async()=>{
    await ready();const impact=vi.fn();
    await playBossAttack({profile:sulayman,from,to,outcome:'blocked',impact});
    expect(spriteCalls().map(c=>c.phase)).toEqual(['formation','travel']);
    const guard=nodes.find(n=>n.dataset.outcome==='blocked')!;
    expect(guard.style.backgroundImage).toBeUndefined();
    expect(guard.style.borderRadius).toBe('35% 35% 45% 45%');
    expect(impact).toHaveBeenCalledOnce();expect(active()).toHaveLength(0);
  });
  it('keeps Sentry prevention stationary and cancelled attacks silent',async()=>{
    await ready();const impact=vi.fn();
    expect((await playBossAttack({profile:sulayman,from,to,outcome:'sentry',impact})).mode).toBe('prevented');
    expect(spriteCalls()).toHaveLength(0);
    expect(nodes.find(n=>n.dataset.outcome==='sentry')?.style.border).toBe('4px double #bcf3ff');
    expect(impact).toHaveBeenCalledOnce();
    const count=nodes.length;
    expect(await playBossAttack({profile:sulayman,from,to,outcome:'cancelled',impact}))
      .toMatchObject({mode:'cancelled',contactCount:0});
    expect(nodes.length).toBe(count);expect(impact).toHaveBeenCalledOnce();
  });
  it.each(Object.values(BOSS_ATTACK_PROFILES).filter(p=>p.family==='palm'))('uses authored assets, not procedural shapes, for $name',async profile=>{
    const value=await ready(profile);
    expect(loadedUrls).toContain(value.travel.url);
    expect((await playBossAttack({profile,from,to,outcome:'hit',impact:vi.fn()})).mode).toBe('sprite');
    expect(nodes.filter(n=>n.className==='boss-attack-sprite')).toHaveLength(1);
    expect(spriteCalls().map(c=>c.phase)).toEqual(phases);
    expect(active()).toHaveLength(0);
  });
  it.each(phases)('aborts during %s and suppresses any not-yet-presented contact',async phase=>{
    await ready();autoFinish=false;const controller=new AbortController(),impact=vi.fn();
    const run=playBossAttack({profile:sulayman,from,to,outcome:'hit',impact,signal:controller.signal});
    for(const previous of phases){if(previous===phase)break;await finishPhase(previous);}
    expect(active().some(n=>n.dataset.phase===phase)).toBe(true);
    controller.abort();const result=await run;
    const contacts=phase==='formation'||phase==='travel'?0:1;
    expect(impact).toHaveBeenCalledTimes(contacts);
    expect(result).toMatchObject({interrupted:true,contactCount:contacts});
    expect(active()).toHaveLength(0);
  });
  it('fast-forward between phases settles once without launching the remaining phases',async()=>{
    await ready();autoFinish=false;const impact=vi.fn();
    const run=playBossAttack({profile:sulayman,from,to,outcome:'hit',impact});
    calls[0]!.animation.finish();finishDuelMotion();
    expect(await run).toMatchObject({interrupted:true,contactCount:1});
    expect(spriteCalls().map(c=>c.phase)).toEqual(['formation']);
    expect(impact).toHaveBeenCalledOnce();expect(active()).toHaveLength(0);
  });
  it.each(['setting','os'] as const)('respects reduced motion from %s without travel or hit animation',async source=>{
    await ready();
    if(source==='setting')document.documentElement.dataset.animationIntensity='minimal';
    else vi.stubGlobal('matchMedia',()=>({matches:true}));
    expect((await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact:vi.fn()})).mode).toBe('reduced');
    expect(calls.some(c=>c.phase==='travel'||c.phase==='dispersal')).toBe(false);
    expect(calls.flatMap(c=>c.frames).some(f=>f.backgroundPosition!==undefined)).toBe(false);
    expect(active()).toHaveLength(0);
  });
  it('uses shared pace timing while giving Fast each authored frame at least32ms',async()=>{
    await ready();
    for(const [pace,budget] of [['learning',1300],['standard',1000],['fast',512]] as const){
      calls.length=0;document.documentElement.dataset.duelPace=pace;
      await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact:vi.fn()});
      expect(spriteCalls().reduce((sum,c)=>sum+Number(c.options.duration),0)).toBeCloseTo(budget);
      for(const call of spriteCalls())expect(Number(call.options.duration)/(call.frames.length-1)).toBeGreaterThanOrEqual(32);
    }
  });
  it('missing assets give a restrained fallback and a bounded retry',async()=>{
    register();
    vi.stubGlobal('Image',class{onload=null;onerror=null;naturalWidth=0;naturalHeight=0;set src(_value:string){}});
    const impact=vi.fn();
    expect((await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact})).mode).toBe('fallback');
    expect(spriteCalls()).toHaveLength(0);expect(impact).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(3000);
    expect(vi.getTimerCount()).toBe(0);expect(active()).toHaveLength(0);
  });
  it('hidden, invalid and pre-aborted calls never create decorative nodes',async()=>{
    const impact=vi.fn();Object.assign(document,{hidden:true});
    await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact});
    Object.assign(document,{hidden:false});
    await playBossAttack({profile:sulayman,from:{...from,width:0},to,outcome:'hit',impact});
    const controller=new AbortController();controller.abort();
    await playBossAttack({profile:sulayman,from,to,outcome:'hit',impact,signal:controller.signal});
    expect(impact).toHaveBeenCalledTimes(2);expect(nodes).toHaveLength(0);
  });
});
