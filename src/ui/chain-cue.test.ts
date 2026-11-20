import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setCardLanguage } from '../localization/language.js';
const motion = vi.hoisted(() => ({ blocked: false, reduced: true }));
vi.mock('./settings.js', () => ({ settings: () => ({ duelPace: 'standard' }) }));
vi.mock('./duel-motion.js', () => ({
  motionReduced: () => motion.reduced,
  motionDuration: () => 80,
  motionEpoch: () => 0,
  playMotion: vi.fn(() => motion.blocked ? new Promise<void>(() => {}) : Promise.resolve()),
  holdDuelMotion: () => Promise.resolve(),
}));
import { activationGlowFrames, chainCueTiming, clearChainCues, presentChainCue, visibleChainCards } from './chain-cue.js';
import { playMotion } from './duel-motion.js';
class Node extends EventTarget {
  style = {};
  isConnected = false; textContent = ''; children: Node[] = [];
  classList = { add: vi.fn(), remove: vi.fn(), contains: () => false };
  getBoundingClientRect() { return { x:100, y:100, width:70, height:98 }; }
  setAttribute() {}
  append(...nodes: Node[]) { nodes.forEach(n => { n.isConnected = true; this.children.push(n); }); }
  remove() { this.isConnected = false; }
}
let doc: EventTarget & { hidden: boolean; body: Node; createElement: () => Node; createElementNS: () => Node };
const options = { name: 'Voice Beneath the Current, Water Tunung', image: '', ordinal: 2,
  total: 2, stage: 'resolving' as const, opponent: true };
it('reduces movement without stealing reading time and keeps Fast faster', () => {
  for (const pace of ['learning', 'standard', 'fast'] as const) {
    const normal = chainCueTiming(pace, 'resolving', false, false);
    const reduced = chainCueTiming(pace, 'resolving', false, true);
    expect(reduced.glow).toBeLessThanOrEqual(100);
    expect(reduced.glow + reduced.hold).toBe(normal.glow + normal.hold);
    expect(chainCueTiming(pace, 'resolving', true, false).glow).toBe(0);
  }
  expect(chainCueTiming('fast', 'activated', false, false).hold).toBeLessThan(chainCueTiming('standard', 'activated', false, false).hold);
});
beforeEach(() => {
  vi.clearAllMocks();
  motion.blocked = false;
  motion.reduced = true;
  doc = Object.assign(new EventTarget(), { hidden: false, body: new Node(), createElement: () => new Node(), createElementNS: () => new Node() });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('innerWidth', 844); vi.stubGlobal('innerHeight', 390);
  vi.stubGlobal('DOMRect', class { constructor(public x:number, public y:number, public width:number, public height:number) {} });
});
afterEach(() => { clearChainCues(); vi.unstubAllGlobals(); setCardLanguage('tl'); });
it('pulses outward and back with no lit final hold, including reduced motion', () => {
  for (const reduced of [false, true]) {
    const frames = activationGlowFrames(reduced);
    expect(frames.map(f => f.opacity)).toEqual([0, reduced ? .45 : 1, 0]);
    expect(frames[0]!.transform).toBe(frames[2]!.transform);
    expect(frames).toHaveLength(3);
  }
});
it('reveals new links without light and pulses only during resolution, without lifting normal cards', async () => {
  await presentChainCue({ ...options, stage:'activated' });
  expect(vi.mocked(playMotion).mock.calls.filter(([node]) => node.className === 'chain-cue-glow')).toHaveLength(0);
  vi.clearAllMocks();
  await presentChainCue(options);
  expect(vi.mocked(playMotion).mock.calls.filter(([node]) => node.className === 'chain-cue-glow')).toHaveLength(1);
  // Only the initial entrance animates the card; resolution animates its light.
  expect(vi.mocked(playMotion).mock.calls.filter(([node]) => node.className.includes('chain-cue-card'))).toHaveLength(1);
});
it.each([['tl', 'Tunung ng Tubig'], ['en', 'Water Tunung']] as const)('keeps the original link number and localized short name (%s), then cleans up automatically', async (language, name) => {
  setCardLanguage(language);
  const source = new Node();
  await presentChainCue({ ...options, source: source as unknown as HTMLElement });
  const cue = doc.body.children[0]!;
  expect(cue.children[0]!.children.at(-1)!.children[1]!.textContent).toBe('2');
  expect(cue.children[1]!.children[0]!.textContent).toBe('Resolving · Chain 2 of 2');
  expect(cue.children[1]!.children[1]!.textContent).toBe(name);
  expect(cue.isConnected).toBe(false);
  expect(source.classList.remove).toHaveBeenCalledWith('effect-source-active');
  const motions = vi.mocked(playMotion).mock.calls;
  expect(motions.at(-1)![0].className).toBe('effect-source-lift');
  expect(doc.body.children[1]!.isConnected).toBe(false);
});
it('bounds a long chain and keeps original ordinals while resolving backwards', () => {
  const links=Array.from({length:16},(_,i)=>({...options,ordinal:i+1}));
  expect(visibleChainCards(links[15]!,links).map(c=>c.ordinal)).toEqual([14,15,16]);
  expect(visibleChainCards(links[1]!,links).map(c=>c.ordinal)).toEqual([1,2]);
  expect(visibleChainCards(links[0]!,links).map(c=>c.ordinal)).toEqual([1]);
});
it('labels a negated link instead of presenting it as a resolving effect', async () => {
  await presentChainCue({ ...options, negated: true });
  const cue = doc.body.children[0]!;
  expect(cue.children[0]!.children[0]!.textContent).toBe('NEGATED');
  expect(cue.children[1]!.children[0]!.textContent).toBe('Negated · Chain 2 of 2');
});
it.each([false, true])('negation discharges on the chain card without activation glow or lift (reduced=%s)', async reduced => {
  motion.reduced = reduced;
  const source = new Node();
  await presentChainCue({ ...options, negated: true, source: source as unknown as HTMLElement });
  const calls = vi.mocked(playMotion).mock.calls;
  expect(calls.filter(([node]) => node.className === 'chain-cue-glow')).toHaveLength(0);
  expect(source.classList.add).not.toHaveBeenCalled();
  expect(calls.filter(([node]) => vi.mocked(node.classList.add).mock.calls.some(args => args.includes('chain-cue-lightning')))).toHaveLength(1);
  expect(calls.filter(([node]) => node.className === 'chain-cue-muted')).toHaveLength(1);
  const cardMotions = calls.filter(([node]) => node.className?.includes('chain-cue-card'));
  expect(cardMotions).toHaveLength(2); // Entrance, then a sideways shock in place.
  expect((cardMotions[1]![1] as Keyframe[]).every(frame => String(frame.translate).endsWith(' 0'))).toBe(true);
});
it('renders a linked chain and clears on orientation change without waiting for input', async () => {
  motion.blocked=true;
  const done=presentChainCue({...options,links:[{...options,ordinal:1},options]});
  const stage=doc.body.children[0]!.children[0]!;
  expect(stage.children[0]!.children.length).toBeGreaterThan(5);
  window.dispatchEvent(new Event('orientationchange'));await done;
  expect(doc.body.children[0]!.isConnected).toBe(false);
});
it('skips a hidden tab without creating a presentation', async () => {
  doc.hidden = true; await presentChainCue(options); expect(doc.body.children).toHaveLength(0);
});
it('remote disposal releases a pending animation and removes its source highlight', async () => {
  motion.blocked = true;
  const abort = new AbortController(), source = new Node();
  const done = presentChainCue({ ...options, signal: abort.signal, source: source as unknown as HTMLElement });
  abort.abort(); await done;
  expect(doc.body.children[0]!.isConnected).toBe(false);
  expect(source.classList.remove).toHaveBeenCalledOnce();
});
it('teardown releases every pending cue without a click', async () => {
  motion.blocked = true;
  const pending = [presentChainCue(options), presentChainCue(options)];
  clearChainCues(); clearChainCues(); await Promise.all(pending);
  expect(doc.body.children.every(node => !node.isConnected)).toBe(true);
});

it('inspects the chosen waiting or negated link without dismissing the chain', async () => {
  motion.blocked = true;
  const earlier = vi.fn(), current = vi.fn();
  const done = presentChainCue({ ...options, negated: true, inspect: current,
    links: [{ ...options, ordinal: 1, inspect: earlier }] });
  const cue = doc.body.children[0]!, stage = cue.children[0]!;
  // Connection and headline precede the two independently readable cards.
  const context = new Event('contextmenu', { cancelable: true });
  stage.children[2]!.dispatchEvent(context);
  expect(context.defaultPrevented).toBe(true);
  expect(earlier).toHaveBeenCalledOnce(); expect(current).not.toHaveBeenCalled();
  stage.children[3]!.dispatchEvent(new Event('click', { cancelable: true }));
  expect(current).toHaveBeenCalledOnce(); expect(cue.isConnected).toBe(true);
  clearChainCues(); await done;
  expect(cue.isConnected).toBe(false);
});
