import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const motion = vi.hoisted(() => ({ reduced: false, calls: [] as { node: unknown; frames: Keyframe[]; duration: number; delay: number; finish: () => void }[] }));
vi.mock('./duel-motion.js', () => ({
  motionReduced: () => motion.reduced,
  playMotion: (node: unknown, frames: Keyframe[], duration: number, delay = 0, _easing?: string, signal?: AbortSignal) => new Promise<void>(resolve => {
    motion.calls.push({ node, frames, duration, delay, finish: resolve });
    if (signal?.aborted) resolve(); else signal?.addEventListener('abort', () => resolve(), { once: true });
  }),
}));
import { presentPowerCue, presentPhaseCue, type PowerCue } from './combat-emphasis-cues.js';

class Node {
  className = ''; innerHTML = ''; textContent = ''; isConnected = true;
  style: Record<string, string> = {}; dataset: Record<string, string> = {};
  children: Node[] = []; parent?: Node;
  classList = { add: (value: string) => { this.className += ` ${value}`; } };
  append(...nodes: Node[]) { for (const node of nodes) { node.parent = this; node.isConnected = true; this.children.push(node); } }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
  setAttribute() {}
  contains(node: Node) { return this.children.includes(node); }
  querySelector(selector: string): Node | null { return this.children.find(node => node.className === selector.slice(1)) ?? null; }
  getBoundingClientRect() { return { left: 400, top: 250, width: this.className.includes('combat-power-cue') ? 180 : 100, height: this.className.includes('combat-power-cue') ? 80 : 140 }; }
}
let body: Node, observer: (() => void) | undefined;
const change: PowerCue = { uid: 'visible', before: 11000, after: 14000, delta: 3000, source: 'Nanolay', detail: 'Until this turn ends', expired: false };
beforeEach(() => {
  motion.calls.length = 0; motion.reduced = false; body = new Node(); observer = undefined;
  vi.stubGlobal('document', { hidden: false, body, createElement: () => new Node(), querySelectorAll: () => [] });
  vi.stubGlobal('innerWidth', 1280); vi.stubGlobal('innerHeight', 720);
  vi.stubGlobal('MutationObserver', class { constructor(callback: () => void) { observer = callback; } observe() {} disconnect() { observer = undefined; } });
});
afterEach(() => vi.unstubAllGlobals());

describe('cue lifecycle without a new animation system', () => {
  it('removes the layer after completion without changing the card or its badge', async () => {
    const card = new Node(), pending = presentPowerCue(card as unknown as HTMLElement, change, 'standard');
    expect(body.children).toHaveLength(1); expect(motion.calls).toHaveLength(1);
    expect(motion.calls[0]?.duration).toBe(850);
    expect(card.className).toBe(''); expect(card.children).toEqual([]);
    motion.calls[0]!.finish(); await pending;
    expect(body.children).toEqual([]); expect(observer).toBeUndefined();
  });
  it('clears an interrupted cue and a cue whose card is removed', async () => {
    const controller = new AbortController();
    const first = presentPowerCue(new Node() as unknown as HTMLElement, change, 'standard', controller.signal);
    controller.abort(); await first; expect(body.children).toEqual([]);
    const card = new Node(), second = presentPowerCue(card as unknown as HTMLElement, change, 'standard');
    card.remove(); observer?.(); await second; expect(body.children).toEqual([]);
  });
  it('keeps reading time in reduced motion while removing movement', async () => {
    motion.reduced = true;
    const pending = presentPowerCue(new Node() as unknown as HTMLElement, change, 'standard');
    expect(motion.calls[0]?.duration).toBe(850);
    expect(motion.calls[0]?.frames.every(frame => !('translate' in frame))).toBe(true);
    motion.calls[0]!.finish(); await pending;
  });
  it('does not mount a zero change or an already cancelled cue', async () => {
    await presentPowerCue(new Node() as unknown as HTMLElement, { ...change, delta: 0 }, 'standard');
    const controller = new AbortController(); controller.abort();
    await presentPowerCue(new Node() as unknown as HTMLElement, change, 'standard', controller.signal);
    expect(motion.calls).toEqual([]); expect(body.children).toEqual([]);
  });
  it('pulses only phase text once and cleans the banner on interruption', async () => {
    const banner = new Node(), words = new Node(); words.className = 'phase-text'; banner.append(words);
    const controller = new AbortController(), pending = presentPhaseCue(banner as unknown as HTMLElement, 'standard', controller.signal);
    expect(motion.calls).toHaveLength(2);
    expect(motion.calls[1]).toMatchObject({ node: words, duration: 340, delay: 200 });
    expect(motion.calls[1]?.frames.filter(frame => String(frame.textShadow).includes('#53e9ff'))).toHaveLength(1);
    controller.abort(); await pending; expect(body.children).toEqual([]);
  });
  it('retains the phase hold without a text pulse or slide under reduced motion', async () => {
    motion.reduced = true;
    const banner = new Node(), words = new Node(); words.className = 'phase-text'; banner.append(words);
    const pending = presentPhaseCue(banner as unknown as HTMLElement, 'standard');
    expect(motion.calls).toHaveLength(1); expect(motion.calls[0]?.duration).toBe(1210);
    expect(motion.calls[0]?.frames.every(frame => !('translate' in frame))).toBe(true);
    motion.calls[0]!.finish(); await pending; expect(body.children).toEqual([]);
  });
});
