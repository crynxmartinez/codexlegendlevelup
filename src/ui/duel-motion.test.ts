import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardTransit, finishDuelMotion, holdDuelMotion, motionDuration, playMotion, flightFrames, batchDelay, attackMotion, cardFlightBounds, revealPanel } from './duel-motion.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { documentElement: { dataset: { duelPace: 'standard' } } });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function target() {
  let finish!: () => void, reject!: (reason?: unknown) => void;
  const animation = {
    finished: new Promise<void>((yes, no) => { finish = yes; reject = no; }),
    finish: vi.fn(() => finish()), cancel: vi.fn(() => reject(new Error('cancelled'))),
  };
  const node = { isConnected: true, animate: vi.fn(() => animation) } as unknown as HTMLElement;
  return { node, animation };
}
describe('duel movement lifecycle', () => {
  it('cancels an owned reading hold without changing the global motion epoch', async () => {
    const owner = new AbortController(), done = vi.fn();
    const hold = holdDuelMotion(5000, owner.signal).then(done);
    expect(vi.getTimerCount()).toBe(1); owner.abort(); await hold;
    expect(done).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('does not animate dialog entry when reduced motion is enabled', () => {
    document.documentElement.dataset.animationIntensity = 'minimal';
    const {node}=target(); revealPanel(node);
    expect(node.animate).not.toHaveBeenCalled();
  });
  it('keeps travelling cards portrait-shaped and centered inside wide and tall zones', () => {
    class Rect { constructor(public left:number, public top:number, public width:number, public height:number) {} }
    vi.stubGlobal('DOMRect', Rect);
    for (const [width,height] of [[140,80],[80,140],[100,140]]) {
      const bounds = cardFlightBounds(new Rect(20,30,width!,height!) as DOMRect);
      expect(bounds.width / bounds.height).toBeCloseTo(5 / 7);
      expect(bounds.left + bounds.width / 2).toBeCloseTo(20 + width! / 2);
      expect(bounds.top + bounds.height / 2).toBeCloseTo(30 + height! / 2);
      expect(bounds.width).toBeLessThanOrEqual(width!);
      expect(bounds.height).toBeLessThanOrEqual(height!);
    }
  });
  it('bounds a large batch while retaining selection order', () => {
    expect(batchDelay(19, 20)).toBeLessThanOrEqual(motionDuration() * .45);
    expect(batchDelay(1, 20)).toBeGreaterThan(batchDelay(0, 20));
    document.documentElement.dataset.animationIntensity = 'minimal';
    expect(batchDelay(19, 20)).toBe(0);
  });
  it('hits once at contact and returns home without a stale translation', async () => {
    const poses: string[] = [];
    const node = { isConnected: true, style: { translate: '' }, animate: vi.fn(() => ({
      finished: Promise.resolve(), cancel: vi.fn(),
    })) } as unknown as HTMLElement;
    await attackMotion(node, 0, -200, () => poses.push(node.style.translate));
    expect(poses).toEqual(['0px -44px']);
    expect(node.animate).toHaveBeenCalledTimes(2);
    expect(node.style.translate).toBe('');
  });
  it('fast-forward during windup still delivers one hit and omits the return animation', async () => {
    const { node } = target();
    Object.assign(node, { style: { translate: '' } });
    const hit = vi.fn();
    const strike = attackMotion(node, 100, 0, hit);
    finishDuelMotion(); await strike;
    expect(hit).toHaveBeenCalledOnce();
    expect(node.animate).toHaveBeenCalledOnce();
    expect(node.style.translate).toBe('');
  });
  it('explicitly finishes reading holds and cleans up their timers', async () => {
    const settled = vi.fn();
    const held = holdDuelMotion(900).then(settled);
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).not.toHaveBeenCalled();
    finishDuelMotion(); await held;
    expect(settled).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('settles immediately in a hidden tab without creating an animation', async () => {
    Object.assign(document, { hidden: true });
    const { node } = target();
    await playMotion(node, []);
    expect(node.animate).not.toHaveBeenCalled();
  });
  it('curves between the actual endpoints and lands without changing orientation', () => {
    const frames = flightFrames({ left: 0, top: 100, width: 50, height: 70 } as DOMRect,
      { left: 200, top: 0, width: 100, height: 140 } as DOMRect);
    expect(frames[0]!.transform).toBe('translate(-200px,100px) scale(0.5,0.5)');
    expect(frames[1]!.offset).toBe(.55);
    expect(frames[2]!.transform).toBe('translate(0,0) scale(1)');
  });
  it('omits travelling cards from every render without changing the rules hand', () => {
    const hand = ['a', 'b', 'c'];
    const transit = new CardTransit();
    const landed = transit.begin('b');
    expect(transit.visible(hand)).toEqual(['a', 'c']);
    expect(transit.visible([...hand])).toEqual(['a', 'c']);
    expect(hand).toEqual(['a', 'b', 'c']);
    landed();
    expect(transit.visible(hand)).toEqual(hand);
  });
  it('keeps nested or overlapping travel hidden until both are cleaned up', () => {
    const transit = new CardTransit();
    const first = transit.begin('a'), second = transit.begin('a');
    first(); first();
    expect(transit.has('a')).toBe(true);
    second();
    expect(transit.has('a')).toBe(false);
  });
  it('finishes a visual without requiring another timer or input', async () => {
    const { node, animation } = target();
    const playing = playMotion(node, [{ opacity: 0 }, { opacity: 1 }]);
    finishDuelMotion(); await playing;
    expect(animation.finish).toHaveBeenCalledOnce();
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans up a browser-cancelled animation', async () => {
    const { node, animation } = target();
    const playing = playMotion(node, []);
    animation.cancel(); await playing;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cannot stall indefinitely when a suspended animation never completes', async () => {
    const { node, animation } = target();
    const playing = playMotion(node, [], 300, 45);
    await vi.advanceTimersByTimeAsync(495); await playing;
    expect(animation.cancel).toHaveBeenCalledOnce();
  });
  it('tolerates missing or failing animation support', async () => {
    const { node } = target();
    vi.mocked(node.animate).mockImplementation(() => { throw new Error('unsupported'); });
    await expect(playMotion(node, [])).resolves.toBeUndefined();
    await expect(playMotion({ isConnected: false } as HTMLElement, [])).resolves.toBeUndefined();
  });
  it('uses each speed profile while reduced motion caps travel only', () => {
    const durations = ['learning', 'standard', 'fast'].map(pace => {
      document.documentElement.dataset.duelPace = pace;
      return motionDuration();
    });
    expect(durations).toEqual([650, 500, 120]);
    document.documentElement.dataset.animationIntensity = 'minimal';
    expect(motionDuration()).toBe(80);
  });
});

it('holds an attack approach long enough to read before returning without impact',async()=>{
  const {attackWindup}=await import('./duel-motion.js');
  const node={isConnected:true,animate:vi.fn(()=>({finished:Promise.resolve(),cancel:vi.fn()}))} as unknown as HTMLElement;
  await attackWindup(node,0,-200);
  const [frames,options]=(node.animate as ReturnType<typeof vi.fn>).mock.calls[0]!;
  expect(options.duration).toBe(900);
  expect(frames[1].translate).toBe('0px -32px');
  expect(frames[2].translate).toBe(frames[1].translate);
  expect(frames[3].translate).toBe('0 0');
});

it('finishes the rotation before starting the forward approach', async () => {
  const { attackWindup } = await import('./duel-motion.js');
  let finishTurn!: () => void;
  const turn = { transitionProperty:'transform', finished:new Promise<void>(resolve => { finishTurn = resolve; }), finish:vi.fn(), cancel:vi.fn() };
  const animate = vi.fn(() => ({finished:Promise.resolve(),cancel:vi.fn()}));
  const node = { isConnected:true, getAnimations:()=>[turn], animate } as unknown as HTMLElement;
  const moving = attackWindup(node, 0, -200);
  await Promise.resolve(); expect(animate).not.toHaveBeenCalled();
  finishTurn(); await moving;
  expect(turn.finish).toHaveBeenCalledOnce();
  expect(animate).toHaveBeenCalledOnce();
});

it('fast-forwarding rotation does not start a late attack approach', async () => {
  const { attackWindup } = await import('./duel-motion.js');
  let finishTurn!: () => void;
  const turn = { transitionProperty:'transform', finished:new Promise<void>(resolve => { finishTurn = resolve; }), finish:()=>finishTurn(), cancel:vi.fn() };
  const animate = vi.fn();
  const node = { isConnected:true,getAnimations:()=>[turn],animate } as unknown as HTMLElement;
  const moving = attackWindup(node, 0, -200);
  finishDuelMotion(); await moving;
  expect(animate).not.toHaveBeenCalled();
});
