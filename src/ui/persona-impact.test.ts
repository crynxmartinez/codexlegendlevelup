import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playPersonaImpact } from './persona-impact.js';
import { finishDuelMotion, motionEpoch, playMotion } from './duel-motion.js';

const hit = { hit: true, personaHit: true, sentryUsed: false };
const rect = (top: number): DOMRect => ({ left: 100, top, width: 100, height: 140 } as DOMRect);
const options = () => ({ epoch: motionEpoch(), shake: 'full' as const });

function target(autoFinish = true) {
  const classes = new Set<string>();
  const animations: Array<{ finished: Promise<void>; finish: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }> = [];
  const node = {
    isConnected: true,
    style: { transform: 'rotate(90deg) scale(1.08)', translate: '2px 3px', rotate: '' },
    classList: { add: vi.fn((name: string) => classes.add(name)), remove: vi.fn((name: string) => classes.delete(name)) },
    getBoundingClientRect: vi.fn(() => rect(100)),
    animate: vi.fn((_frames: Keyframe[], _options: KeyframeAnimationOptions) => {
      let resolve!: () => void, reject!: (reason?: unknown) => void;
      const animation = {
        finished: new Promise<void>((yes, no) => { resolve = yes; reject = no; }),
        finish: vi.fn(() => resolve()), cancel: vi.fn(() => reject(new Error('cancelled'))),
      };
      animations.push(animation);
      if (autoFinish) queueMicrotask(() => animation.finish());
      return animation;
    }),
  };
  return { node: node as unknown as HTMLElement, view: node, animations, classes };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubGlobal('document', { hidden: false, documentElement: {
    dataset: { duelPace: 'standard' }, classList: { add: vi.fn(), remove: vi.fn() },
  } });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { finishDuelMotion(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Persona contact recoil', () => {
  it.each([{ sourceTop: 400, sign: -1 }, { sourceTop: -200, sign: 1 }])(
    'recoils away from the source in either board direction ($sourceTop) without changing posture', async ({ sourceTop, sign }) => {
      const { node, view, classes } = target();
      const original = { ...view.style };
      await playPersonaImpact(node, rect(sourceTop), hit, options());
      expect(view.animate).toHaveBeenCalledOnce();
      const [frames, timing] = view.animate.mock.calls[0]!;
      expect(frames.map(frame => frame.offset)).toEqual([0, .15, .38, .62, .8, 1]);
      const displacement = (frame: Keyframe) => String(frame.translate).split(' ').map(value => Number.parseFloat(value));
      expect(displacement(frames[1]!)[0]).toBe(0);
      expect(displacement(frames[1]!)[1]).toBeCloseTo(7 * sign);
      expect(displacement(frames[2]!)[1]).toBeCloseTo(7 * sign * -.45);
      expect(frames[0]!.translate).toBe('0px 0px');
      expect(frames.at(-1)!.translate).toBe('0px 0px');
      expect(frames.every(frame => frame.composite === 'add' && !('transform' in frame) && !('rotate' in frame) && !('scale' in frame))).toBe(true);
      expect(timing.duration).toBe(280);
      expect(view.style).toEqual(original);
      expect(classes.has('persona-impact')).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('reduces low shake amplitude without adding another hold', async () => {
    const { node, view } = target();
    await playPersonaImpact(node, rect(-200), hit, { ...options(), shake: 'low' });
    const [frames, timing] = view.animate.mock.calls[0]!;
    expect(Number(String(frames[1]!.translate).split(' ')[1]!.replace('px', ''))).toBeCloseTo(3.85);
    expect(timing.duration).toBe(280);
  });

  it.each([
    { label: 'blocked', result: { ...hit, hit: false, personaHit: false } },
    { label: 'Sentry', result: { ...hit, sentryUsed: true } },
    { label: 'cancelled', result: { ...hit, cancelReason: 'attacker-ineligible' as const } },
    { label: 'Ally hit', result: { ...hit, personaHit: false } },
  ])('does not recoil a Persona for $label', async ({ result }) => {
    const { node, view } = target();
    await playPersonaImpact(node, rect(400), result, options());
    expect(view.animate).not.toHaveBeenCalled();
    expect(view.classList.add).not.toHaveBeenCalled();
  });

  it.each(['off', 'minimal', 'os-reduced', 'hidden'] as const)('respects %s motion restrictions', async restriction => {
    const { node, view } = target();
    if (restriction === 'minimal') document.documentElement.dataset.animationIntensity = 'minimal';
    if (restriction === 'os-reduced') vi.stubGlobal('matchMedia', () => ({ matches: true }));
    if (restriction === 'hidden') Object.assign(document, { hidden: true });
    await playPersonaImpact(node, rect(400), hit, { ...options(), shake: restriction === 'off' ? 'off' : 'full' });
    expect(view.animate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips missing, detached, coincident and invalid target geometry', async () => {
    const { node, view } = target();
    await playPersonaImpact(null, rect(400), hit, options());
    await playPersonaImpact(node, undefined, hit, options());
    view.isConnected = false;
    await playPersonaImpact(node, rect(400), hit, options());
    view.isConnected = true;
    await playPersonaImpact(node, rect(100), hit, options());
    view.getBoundingClientRect.mockReturnValue({ ...rect(100), width: 0 } as DOMRect);
    await playPersonaImpact(node, rect(400), hit, options());
    view.getBoundingClientRect.mockReturnValue({ ...rect(100), top: NaN } as DOMRect);
    await playPersonaImpact(node, rect(400), hit, options());
    expect(view.animate).not.toHaveBeenCalled();
  });

  it('does not start late after fast-forward or a pre-aborted match', async () => {
    const { node, view } = target();
    const before = options();
    finishDuelMotion();
    await playPersonaImpact(node, rect(400), hit, before);
    const controller = new AbortController(); controller.abort();
    await playPersonaImpact(node, rect(400), hit, { ...options(), signal: controller.signal });
    expect(view.animate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts only its owned animation and removes listeners, class and timer', async () => {
    const own = target(false), other = target(false), controller = new AbortController();
    const listen = vi.spyOn(controller.signal, 'addEventListener');
    const unlisten = vi.spyOn(controller.signal, 'removeEventListener');
    const unrelated = playMotion(other.node, [{ opacity: 0 }, { opacity: 1 }], 900);
    const playing = playPersonaImpact(own.node, rect(400), hit, { ...options(), signal: controller.signal });
    expect(own.classes.has('persona-impact')).toBe(true);
    expect(vi.getTimerCount()).toBe(2);
    controller.abort(); await playing;
    expect(own.animations[0]!.cancel).toHaveBeenCalled();
    expect(other.animations[0]!.cancel).not.toHaveBeenCalled();
    expect(other.animations[0]!.finish).not.toHaveBeenCalled();
    expect(own.classes.has('persona-impact')).toBe(false);
    expect(unlisten).toHaveBeenCalledWith('abort', listen.mock.calls[0]![1]);
    expect(own.view.style).toEqual({ transform: 'rotate(90deg) scale(1.08)', translate: '2px 3px', rotate: '' });
    expect(vi.getTimerCount()).toBe(1);
    other.animations[0]!.finish(); await unrelated;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up when fast-forward finishes an active recoil', async () => {
    const { node, animations, classes } = target(false);
    const playing = playPersonaImpact(node, rect(400), hit, options());
    finishDuelMotion(); await playing;
    expect(animations[0]!.finish).toHaveBeenCalledOnce();
    expect(classes.has('persona-impact')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles a stalled animation within the shared completion bound', async () => {
    const { node, animations, classes } = target(false);
    const playing = playPersonaImpact(node, rect(400), hit, options());
    await vi.advanceTimersByTimeAsync(430); await playing;
    expect(animations[0]!.cancel).toHaveBeenCalled();
    expect(classes.has('persona-impact')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
