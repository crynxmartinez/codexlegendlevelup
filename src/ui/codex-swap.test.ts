import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ epoch: 0, reduced: false }));
vi.mock('./card-art-cache.js', () => ({ readyFlightArt: vi.fn(async () => {}) }));
vi.mock('./duel-motion.js', () => ({
  motionEpoch: () => state.epoch, motionReduced: () => state.reduced,
  playMotion: vi.fn(async () => {}),
  holdDuelMotion: (ms: number, signal?: AbortSignal) => new Promise<void>(resolve => {
    if (signal?.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms); signal?.addEventListener('abort', finish, { once: true });
  }),
}));
import { playCodexSwap } from './codex-swap.js';
import { playMotion } from './duel-motion.js';

const observers: FakeObserver[] = [];
class FakeObserver {
  disconnected = false;
  constructor(readonly callback: () => void) { observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
}
class Style {
  cssText = ''; opacity = ''; height = '';
  private values = new Map<string, string>();
  private priorities = new Map<string, string>();
  setProperty(key: string, value: string, priority = '') { this.values.set(key, value); this.priorities.set(key, priority); }
  getPropertyValue(key: string) { return this.values.get(key) ?? ''; }
  getPropertyPriority(key: string) { return this.priorities.get(key) ?? ''; }
  removeProperty(key: string) { this.values.delete(key); this.priorities.delete(key); }
}
class Node extends EventTarget {
  className = ''; style = new Style(); children: Node[] = []; dataset: Record<string, string> = {};
  textContent = ''; isConnected = true; hidden = false; parentElement: Node | null = null;
  src = ''; alt = ''; draggable = false; onerror?: () => void;
  attrs: Record<string,string> = {};
  classList = { add: (name: string) => { this.className += ` ${name}`; } };
  rect = { left: 100, top: 200, right: 150, bottom: 270, width: 50, height: 70 };
  setAttribute(key: string, value: string) { this.attrs[key] = value; }
  append(...nodes: Node[]) { nodes.forEach(node => { node.parentElement = this; this.children.push(node); }); }
  remove() { this.isConnected = false; }
  querySelector() { return this.children.find(n => n.className === 'mini') ?? null; }
  getClientRects() { return this.isConnected ? [this.rect] : []; }
  getBoundingClientRect() { return this.rect; }
}
let doc: EventTarget & { hidden: boolean; body: Node; querySelectorAll: () => Node[]; createElement: () => Node; documentElement: { dataset: Record<string, string> } };
let zone: Node, mini: Node, protectedNodes: Node[];
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const root = () => doc.body.children.find(n => n.className === 'codex-swap')!;
const child = (name: string) => root().children.find(n => n.className.split(' ').includes(name))!;
function run(signal?: AbortSignal, onReveal = vi.fn()) {
  return { onReveal, done: playCodexSwap({ zone: zone as unknown as HTMLElement, newImage: '/new.webp', previousImage: '/old.webp', backImage: '/back.webp', name: 'Landas ng mga Tinik, Salikan', signal, onReveal }) };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); state.epoch = 0; state.reduced = false; observers.length = 0; protectedNodes = [];
  zone = new Node(); mini = new Node(); mini.className = 'mini'; zone.append(mini);
  doc = Object.assign(new EventTarget(), { hidden: false, body: new Node(), querySelectorAll: () => protectedNodes,
    createElement: () => new Node(), documentElement: { dataset: { duelPace: 'standard' } } });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('innerWidth', 1920); vi.stubGlobal('innerHeight', 1080);
  vi.stubGlobal('MutationObserver', FakeObserver); vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each(['learning', 'standard', 'fast'])('keeps the full two-second sequence at %s pace with one reveal', async pace => {
  doc.documentElement.dataset.duelPace = pace;
  const { done, onReveal } = run(); await flush();
  expect(root().dataset.stage).toBe('retire');
  await vi.advanceTimersByTimeAsync(249); expect(onReveal).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(root().dataset.stage).toBe('reveal'); expect(onReveal).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(400); expect(root().dataset.stage).toBe('read');
  expect(child('codex-swap-card').style.opacity).toBe('1');
  expect(child('codex-swap-caption').textContent).toBe('Codex active · Landas ng mga Tinik, Salikan');
  await vi.advanceTimersByTimeAsync(999); expect(root().dataset.stage).toBe('read');
  await vi.advanceTimersByTimeAsync(1); expect(root().dataset.stage).toBe('settle');
  await vi.advanceTimersByTimeAsync(349); expect(root().isConnected).toBe(true);
  await vi.advanceTimersByTimeAsync(1); await done;
  expect(root().isConnected).toBe(false); expect(onReveal).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});
it('reduces motion to fades but retains the same reading time and full art', async () => {
  state.reduced = true; const { done } = run(); await flush();
  await vi.advanceTimersByTimeAsync(650);
  expect(root().dataset.stage).toBe('read'); expect(child('codex-swap-card').children[0]!.src).toBe('/new.webp');
  await vi.advanceTimersByTimeAsync(1349); expect(root().isConnected).toBe(true);
  await vi.advanceTimersByTimeAsync(1); await done;
  expect(vi.mocked(playMotion).mock.calls.flatMap(call => call[1]).every(frame => !frame.transform && !frame.translate)).toBe(true);
});
it('hides only the mini art and restores its exact prior visibility priority', async () => {
  mini.style.setProperty('visibility', 'visible', 'important');
  const count = new Node(); count.className = 'n'; count.textContent = '5'; zone.append(count);
  const { done } = run(); await flush();
  expect(mini.style.getPropertyValue('visibility')).toBe('hidden');
  expect(zone.children).toEqual([mini, count]); expect(count.textContent).toBe('5');
  expect(zone.style.getPropertyValue('visibility')).toBe('');
  await vi.advanceTimersByTimeAsync(2000); await done;
  expect(mini.style.getPropertyValue('visibility')).toBe('visible'); expect(mini.style.getPropertyPriority('visibility')).toBe('important');
});
it.each(['resize', 'pagehide', 'orientationchange', 'abort', 'removed-zone'])('cleans up during reading on %s', async reason => {
  const owner = new AbortController(); const { done, onReveal } = run(owner.signal); await flush();
  await vi.advanceTimersByTimeAsync(900);
  if (reason === 'abort') owner.abort();
  else if (reason === 'removed-zone') { zone.remove(); observers.filter(o => !o.disconnected).forEach(o => o.callback()); }
  else window.dispatchEvent(new Event(reason));
  await done;
  expect(root().isConnected).toBe(false); expect(mini.style.getPropertyValue('visibility')).toBe('');
  expect(onReveal).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); expect(observers.every(o => o.disconnected)).toBe(true);
});
it('does not reveal after an epoch change or pre-reveal abort', async () => {
  const { done, onReveal } = run(); await flush(); state.epoch++;
  await vi.advanceTimersByTimeAsync(250); await done;
  expect(onReveal).not.toHaveBeenCalled(); expect(root().isConnected).toBe(false);
});
it('uses the back when no old artwork exists and falls back once if new artwork fails', async () => {
  const done = playCodexSwap({ zone: zone as unknown as HTMLElement, newImage: '/bad.webp', backImage: '/back.webp', name: 'Actual Codex' });
  await flush();
  const retiring = child('codex-swap-retiring');
  expect(retiring.children[0]!.children[0]!.src).toBe('/back.webp');
  const image = child('codex-swap-card').children[0]!;
  image.onerror!(); expect(image.src).toBe('/back.webp');
  image.onerror!(); expect(image.hidden).toBe(true);
  expect(child('codex-swap-card').className).toContain('codex-swap-missing');
  await vi.advanceTimersByTimeAsync(2000); await done;
});
it('keeps the mobile reveal clear of the hand and Barriers without moving them', async () => {
  vi.stubGlobal('innerWidth', 844); vi.stubGlobal('innerHeight', 390);
  const hand = new Node(); hand.rect = { left: 250, top: 290, right: 600, bottom: 390, width: 350, height: 100 };
  const barrier = new Node(); barrier.rect = { left: 270, top: 260, right: 580, bottom: 285, width: 310, height: 25 };
  protectedNodes = [hand, barrier]; const originals = protectedNodes.map(n => ({ ...n.rect }));
  const { done } = run(); await flush();
  const values = Object.fromEntries(root().style.cssText.split(';').map(part => part.split(':').map(v => parseFloat(v) || v)));
  const left = Number(values.left), top = Number(values.top), width = Number(values.width), height = Number(values.height);
  expect(width).toBe(120);
  for (const area of originals) expect(left < area.right && left + width > area.left && top < area.bottom && top + height > area.top).toBe(false);
  expect(protectedNodes.map(n => n.rect)).toEqual(originals);
  await vi.advanceTimersByTimeAsync(2000); await done;
});
it('uses the inward gap instead of covering the phase rail or player identity', async () => {
  vi.stubGlobal('innerWidth', 1366); vi.stubGlobal('innerHeight', 768);
  mini.rect = { left: 180, top: 480, right: 220, bottom: 536, width: 40, height: 56 };
  const phases = new Node(); phases.rect = { left: 0, top: 230, right: 178, bottom: 470, width: 178, height: 240 };
  const identity = new Node(); identity.rect = { left: 15, top: 640, right: 345, bottom: 745, width: 330, height: 105 };
  const hand = new Node(); hand.rect = { left: 500, top: 650, right: 1000, bottom: 768, width: 500, height: 118 };
  protectedNodes = [phases, identity, hand];
  const { done } = run(); await flush();
  const values = Object.fromEntries(root().style.cssText.split(';').map(part => part.split(':').map(v => parseFloat(v) || v)));
  const left = Number(values.left), top = Number(values.top), width = Number(values.width), height = Number(values.height);
  expect(left).toBeGreaterThanOrEqual(phases.rect.right);
  for (const { rect } of protectedNodes) expect(left < rect.right && left + width > rect.left && top < rect.bottom && top + height > rect.top).toBe(false);
  await vi.advanceTimersByTimeAsync(2000); await done;
});
it('finds the nearby gap between the two Barrier rows instead of the opposite edge', async () => {
  vi.stubGlobal('innerWidth', 1366); vi.stubGlobal('innerHeight', 768);
  mini.rect = { left: 191, top: 480, right: 231, bottom: 536, width: 40, height: 56 };
  const areas = [
    { left: 0, top: 230, right: 178, bottom: 470, width: 178, height: 240 },
    { left: 15, top: 640, right: 345, bottom: 745, width: 330, height: 105 },
    { left: 313, top: 78, right: 1011, bottom: 152, width: 698, height: 74 },
    { left: 313, top: 615, right: 1011, bottom: 689, width: 698, height: 74 },
    { left: 410, top: 616, right: 1050, bottom: 768, width: 640, height: 152 },
  ];
  protectedNodes = areas.map(rect => { const node = new Node(); node.rect = rect; return node; });
  const { done } = run(); await flush();
  const values = Object.fromEntries(root().style.cssText.split(';').map(part => part.split(':').map(v => parseFloat(v) || v)));
  const left = Number(values.left), top = Number(values.top), width = Number(values.width), height = Number(values.height);
  expect(left).toBe(243); expect(top + height).toBeLessThanOrEqual(605);
  for (const area of areas) expect(left < area.right && left + width > area.left && top < area.bottom && top + height > area.top).toBe(false);
  await vi.advanceTimersByTimeAsync(2000); await done;
});
