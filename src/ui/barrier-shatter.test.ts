import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ reduced: false, blocked: false }));
vi.mock('./settings.js', () => ({ settings: () => ({ duelPace: 'standard' }) }));
vi.mock('./fx-gl.js', () => ({ glBarrierBreak: vi.fn() }));
vi.mock('./duel-motion.js', () => ({
  motionEpoch: () => 0, motionReduced: () => state.reduced,
  holdDuelMotion: () => Promise.resolve(),
  playMotion: vi.fn(() => state.blocked ? new Promise<void>(() => {}) : Promise.resolve()),
}));
import { shatterUnit, shatterBarrier, GLASS_EDGE } from './barrier-shatter.js';
import { playMotion } from './duel-motion.js';
import { glBarrierBreak } from './fx-gl.js';
class Node extends EventTarget {
  className = ''; style: Record<string,string> = {}; children: Node[] = []; isConnected = false;
  classList = { add: vi.fn((name: string) => { this.className = [this.className, name].filter(Boolean).join(' '); }) };
  setAttribute() {}
  append(...nodes: Node[]) { nodes.forEach(node => { node.isConnected = true; this.children.push(node); }); }
  remove() { this.isConnected = false; }
}
let doc: EventTarget & { hidden: boolean; body: Node; querySelector: ReturnType<typeof vi.fn> };
let animeHost: Node | null;
const rect = { x: 150, y: 100, width: 140, height: 100 } as DOMRect;
const card = { rect, background: 'url("unit.webp")', rotation: 270 };
beforeEach(() => {
  vi.clearAllMocks(); state.reduced = false; state.blocked = false; animeHost = null;
  doc = Object.assign(new EventTarget(), { hidden: false, body: new Node(), querySelector: vi.fn(() => animeHost), createElement: () => new Node(), createElementNS: () => new Node() });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('innerWidth', 844); vi.stubGlobal('innerHeight', 390);
});
afterEach(() => vi.unstubAllGlobals());
it('splits the exact card art into aligned fragments and preserves sideways orientation', async () => {
  animeHost = new Node();
  await shatterUnit(card);
  const root = doc.body.children[0]!;
  expect(root.className).toBe('barrier-shatter unit-shatter');
  expect(animeHost.children).toHaveLength(0);
  expect(glBarrierBreak).toHaveBeenCalledOnce();
  expect(root.style.transform).toBe('rotate(270deg)');
  expect(root.style.cssText).toContain('width:100px;height:140px');
  const shards = root.children.filter(n => n.className === 'barrier-glass-shard');
  expect(shards).toHaveLength(GLASS_EDGE.length);
  expect(shards.every(n => n.style.backgroundImage === card.background)).toBe(true);
  expect(new Set(shards.map(n => n.style.clipPath)).size).toBe(GLASS_EDGE.length);
  expect(root.isConnected).toBe(false);
});
it('keeps the shield glass separate from Unit artwork', async () => {
  await shatterBarrier(rect);
  const root = doc.body.children[0]!;
  expect(root.className).toBe('barrier-shatter');
  expect(root.children.every(n => !n.style.backgroundImage)).toBe(true);
  expect(glBarrierBreak).toHaveBeenCalledOnce();
});
it('uses an explicit preview host without touching a live board or global particles', async () => {
  animeHost = new Node(); const preview = new Node();
  await shatterBarrier(rect, undefined, preview as unknown as HTMLElement);
  expect(preview.children).toHaveLength(1); expect(animeHost.children).toHaveLength(0);
  expect(doc.querySelector).not.toHaveBeenCalled(); expect(glBarrierBreak).not.toHaveBeenCalled();
  expect(preview.children[0]!.isConnected).toBe(false);
});
it('keeps an anime Barrier shell and its light below the hand without a global particle overlay', async () => {
  animeHost = new Node();
  await shatterBarrier(rect);
  const root = animeHost.children[0]!;
  expect(doc.querySelector).toHaveBeenCalledWith('body.anime-battlefield #app:has(.board-wrap)');
  expect(doc.body.children).toHaveLength(0);
  expect(root.className).toBe('barrier-shatter barrier-shatter-behind-hand');
  const shards = root.children.filter(node => node.className === 'barrier-glass-shard');
  expect(shards).toHaveLength(GLASS_EDGE.length);
  expect(root.children.some(node => node.className === 'barrier-glass-light')).toBe(true);
  expect(shards.every(node => vi.mocked(playMotion).mock.calls.some(call => call[0] === node as unknown as HTMLElement))).toBe(true);
  expect(glBarrierBreak).not.toHaveBeenCalled();
  expect(root.isConnected).toBe(false);
});
it('uses the same below-hand host in reduced motion without flying fragments', async () => {
  animeHost = new Node(); state.reduced = true;
  await shatterBarrier(rect);
  const root = animeHost.children[0]!;
  expect(root.className).toBe('barrier-shatter barrier-shatter-behind-hand');
  expect(doc.body.children).toHaveLength(0);
  expect(glBarrierBreak).not.toHaveBeenCalled();
  expect(vi.mocked(playMotion).mock.calls).toHaveLength(1);
  expect(root.isConnected).toBe(false);
});
it.each(['resize', 'abort'])('removes the below-hand shell when interrupted by %s', async event => {
  animeHost = new Node(); state.blocked = true;
  const signal = new AbortController();
  const done = shatterBarrier(rect, signal.signal);
  const root = animeHost.children[0]!;
  expect(root.isConnected).toBe(true);
  if (event === 'abort') signal.abort();
  else window.dispatchEvent(new Event(event));
  await done;
  expect(root.isConnected).toBe(false);
  expect(glBarrierBreak).not.toHaveBeenCalled();
});
it('uses a gentle fade without flying fragments or particle flashes in reduced motion', async () => {
  state.reduced = true; await shatterUnit(card);
  expect(glBarrierBreak).not.toHaveBeenCalled();
  expect(vi.mocked(playMotion).mock.calls).toHaveLength(2);
  expect(vi.mocked(playMotion).mock.calls.at(-1)?.[1]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
});
it.each(['resize', 'orientationchange', 'pagehide'])('cleans up immediately on %s', async event => {
  state.blocked = true; const done = shatterUnit(card);
  window.dispatchEvent(new Event(event)); await done;
  expect(doc.body.children[0]!.isConnected).toBe(false);
});
it('cleans up on remote cancellation and skips hidden pages', async () => {
  state.blocked = true; const abort = new AbortController(); const done = shatterUnit(card, abort.signal);
  abort.abort(); await done; expect(doc.body.children[0]!.isConnected).toBe(false);
  doc.hidden = true; await shatterUnit(card); expect(doc.body.children).toHaveLength(1);
});
