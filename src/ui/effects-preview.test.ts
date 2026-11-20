import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: { duelPace: 'standard', animationIntensity: 'standard', screenShake: 'low', sfx: true, sfxVolume: .6, musicVolume: .12, ambienceVolume: .08 } }));
vi.mock('./sfx.js', () => ({ initAudio: vi.fn(), playCue: vi.fn(), preloadAudio: vi.fn(async () => {}) }));
vi.mock('./settings.js', () => ({ settings: () => state.values, setSetting: vi.fn((key: string, value: unknown) => Object.assign(state.values, { [key]: value })) }));
vi.mock('./duel-panel.js', () => ({ registerPresentationControl: vi.fn() }));
vi.mock('./boss-attack-assets.js', () => ({}));
vi.mock('./boss-attack-motion.js', () => ({ preloadBossAttack: vi.fn(async () => true), playBossAttack: vi.fn(async (opts: { impact: () => void; signal: AbortSignal }) => { if (!opts.signal.aborted) opts.impact(); }) }));
vi.mock('./persona-impact.js', () => ({ playPersonaImpact: vi.fn(async () => {}) }));
vi.mock('./barrier-shatter.js', () => ({ shatterBarrier: vi.fn(async () => {}) }));
vi.mock('./duel-motion.js', () => ({ motionEpoch: () => 0, holdDuelMotion: (ms: number, signal?: AbortSignal) => new Promise<void>(resolve => { if (signal?.aborted) { resolve(); return; } const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', done); resolve(); }; const timer = setTimeout(done, ms); signal?.addEventListener('abort', done, { once: true }); }) }));
import { showEffectsPreview, PREVIEW_STEPS } from './effects-preview.js';
import { playCue } from './sfx.js';
import { setSetting } from './settings.js';
import { preloadBossAttack, playBossAttack } from './boss-attack-motion.js';
import { playPersonaImpact } from './persona-impact.js';
import { shatterBarrier } from './barrier-shatter.js';
class Node extends EventTarget {
  className = ''; textContent = ''; style: Record<string, string> = {}; children: Node[] = []; elements = new Map<string, Node>(); attributes: Record<string, string> = {};
  disabled = false; isConnected = true; hidden = false; open = false; value = ''; dataset: Record<string, string> = {}; tagName: string; type = '';
  onclick?: () => void; onchange?: () => void; oninput?: () => void;
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() }; focus = vi.fn(); getAnimations = () => [];
  constructor(tag = 'div') { super(); this.tagName = tag.toUpperCase(); }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  append(...nodes: Node[]) { this.children.push(...nodes); }
  showModal() { this.open = true; } close() { this.open = false; } remove() { this.isConnected = false; }
  getBoundingClientRect() { return { x: 100, y: 100, left: 100, top: 100, width: 90, height: 126 }; }
  set innerHTML(html: string) {
    if (!html.includes('ep-panel')) return;
    for (const match of html.matchAll(/<(\w+)[^>]*class="([^"]+)"[^>]*>/g)) {
      const n = new Node(match[1]); n.className = match[2]!; n.disabled = match[0].includes('disabled');
      for (const name of n.className.split(' ')) this.elements.set('.' + name, n);
    }
  }
  querySelector(selector: string): Node | undefined {
    if (selector === 'img') { let n = this.children.find(c => c.tagName === 'IMG'); if (!n) { n = new Node('img'); this.append(n); } return n; }
    return this.elements.get(selector);
  }
  querySelectorAll(selector: string): Node[] {
    if (selector === 'img') return this.children.filter(n => n.tagName === 'IMG');
    if (selector.includes('.boss-')) return [];
    if (selector.includes('.ep-timeline')) return [];
    const all = [...new Set(this.elements.values()), ...this.children];
    return all.filter(n => ['BUTTON', 'SELECT', 'INPUT'].includes(n.tagName) && !n.disabled);
  }
}
let doc: EventTarget & { hidden: boolean; body: Node; activeElement: Node; createElement: (tag: string) => Node };
const current = () => doc.body.children.filter(n => n.isConnected).at(-1)!;
const get = (selector: string) => current().querySelector(selector)!;
const control = (label: string) => get('.ep-fields').children.flatMap(n => n.children).find(n => n.attributes['aria-label'] === label)!;
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(preloadBossAttack).mockResolvedValue(true);
  Object.assign(state.values, { duelPace: 'standard', animationIntensity: 'standard', screenShake: 'low', sfx: true, sfxVolume: .6, musicVolume: .12, ambienceVolume: .08 });
  doc = Object.assign(new EventTarget(), { hidden: false, body: new Node(), activeElement: new Node(), createElement: (tag: string) => new Node(tag) });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('Image', class extends Node { constructor() { super('img'); } });
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { for (const node of doc.body.children) if (node.isConnected) node.querySelector('.ep-close')?.onclick?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('uses real renderer hooks once, keeps 13 examples and does not save on opening', async () => {
  showEffectsPreview('card.webp'); expect(current().open).toBe(true); expect(PREVIEW_STEPS).toHaveLength(13); expect(setSetting).not.toHaveBeenCalled();
  get('.ep-play').onclick!(); get('.ep-play').onclick!(); await vi.runAllTimersAsync();
  expect(playBossAttack).toHaveBeenCalledOnce(); expect(playPersonaImpact).toHaveBeenCalledOnce(); expect(shatterBarrier).toHaveBeenCalledOnce();
  expect(vi.mocked(playCue).mock.calls.map(call => call[0])).toEqual(['attack', 'impact', 'barrierBreak']);
  expect(get('.ep-play').disabled).toBe(false);
});
it('does not recoil or break a Barrier for the blocked sample', async () => {
  showEffectsPreview('card.webp'); const outcome = control('Attack outcome'); outcome.value = 'blocked'; outcome.onchange!();
  get('.ep-play').onclick!(); await vi.runAllTimersAsync(); expect(playPersonaImpact).not.toHaveBeenCalled(); expect(shatterBarrier).not.toHaveBeenCalled();
  expect(vi.mocked(playCue).mock.calls.map(call => call[0])).toEqual(['attack', 'block']);
});
it.each(['stop', 'close', 'hidden', 'resize', 'replacement'])('cancels work and owned audio on %s', async event => {
  showEffectsPreview('card.webp'); const original = current(); get('.ep-play').onclick!(); await flush(); await vi.advanceTimersByTimeAsync(300);
  const count = vi.mocked(playCue).mock.calls.length;
  if (event === 'stop') get('.ep-stop').onclick!();
  if (event === 'close') get('.ep-close').onclick!();
  if (event === 'hidden') { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); }
  if (event === 'resize') window.dispatchEvent(new Event('resize'));
  if (event === 'replacement') showEffectsPreview('next.webp');
  await vi.runAllTimersAsync(); expect(playCue).toHaveBeenCalledTimes(count);
  expect(vi.mocked(playCue).mock.calls.every(call => call[1]?.signal?.aborted)).toBe(true);
  if (event === 'close' || event === 'replacement') expect(original.isConnected).toBe(false);
});
it('cannot start after closing while artwork loads', async () => {
  let finish!: (ready: boolean) => void; vi.mocked(preloadBossAttack).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  showEffectsPreview('card.webp'); get('.ep-play').onclick!(); get('.ep-close').onclick!(); finish(true); await vi.runAllTimersAsync(); expect(playCue).not.toHaveBeenCalled();
});
it('keeps all 13 examples reachable and advances Next effect', async () => {
  showEffectsPreview('card.webp'); get('.ep-next').onclick!(); await vi.runAllTimersAsync(); expect(control('Sample').value).toBe('0');
  get('.ep-next').onclick!(); await vi.runAllTimersAsync(); expect(control('Sample').value).toBe('1');
  get('.ep-all').onclick!(); await vi.runAllTimersAsync(); expect(control('Sample').value).toBe('12');
  for (const cue of ['select', 'confirm', 'block', 'flip', 'force', 'impact', 'barrierBreak', 'essence', 'vent', 'offer', 'codex', 'stateRelease']) expect(vi.mocked(playCue).mock.calls.some(call => call[0] === cue)).toBe(true);
});
it('uses the existing settings writer and stops the active sample before a change', async () => {
  showEffectsPreview('card.webp'); get('.ep-play').onclick!(); await flush(); const pace = control('Presentation speed'); pace.value = 'fast'; pace.onchange!();
  expect(setSetting).toHaveBeenCalledWith('duelPace', 'fast'); await vi.runAllTimersAsync(); expect(playCue).not.toHaveBeenCalled(); expect(get('.ep-play').disabled).toBe(false);
});
it('notifies its parent once after removal and restores the original focus', () => {
  const parent = vi.fn(() => expect(doc.body.children[0]!.isConnected).toBe(false));
  showEffectsPreview('card.webp', parent); const close = get('.ep-close'); close.onclick!(); close.onclick!();
  expect(parent).toHaveBeenCalledOnce(); expect(doc.activeElement.focus).toHaveBeenCalledOnce();
});
