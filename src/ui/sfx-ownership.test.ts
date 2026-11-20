import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./soundtrack.js', () => ({ SoundtrackPlayer: class { setScene() {} } }));
class Param { value = 0; setValueAtTime = vi.fn(); exponentialRampToValueAtTime = vi.fn(); setTargetAtTime = vi.fn(); cancelScheduledValues = vi.fn(); }
class AudioNode {
  gain = new Param(); frequency = new Param(); Q = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  connect = vi.fn(() => this); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
  onended?: () => void; type = ''; loop = false; buffer: unknown;
}
let sources: AudioNode[], gains: AudioNode[], doc: EventTarget & { hidden: boolean };
class Context {
  state = 'running'; currentTime = 2; sampleRate = 48000; destination = new AudioNode();
  resume = vi.fn(async () => {}); suspend = vi.fn(async () => {});
  createGain() { const n = new AudioNode(); gains.push(n); return n; }
  createDynamicsCompressor() { return new AudioNode(); }
  createBiquadFilter() { return new AudioNode(); }
  createOscillator() { const n = new AudioNode(); sources.push(n); return n; }
  createBufferSource() { const n = new AudioNode(); sources.push(n); return n; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  decodeAudioData = vi.fn(async () => ({ duration: .3 }));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.resetModules(); sources = []; gains = [];
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', Object.assign(new EventTarget(), { AudioContext: Context }));
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('cancels only owned synth voices including notes scheduled in the future', async () => {
  const { playCue } = await import('./sfx.js');
  const owner = new AbortController();
  playCue('barrierBreak', { signal: owner.signal }); const owned = [...sources];
  playCue('attack'); const unowned = sources.at(-1)!;
  expect(owned).toHaveLength(6); expect(owned.some(n => n.start.mock.calls[0]![0] > 2)).toBe(true);
  const calls = gains.map(n => n.gain.setTargetAtTime.mock.calls.length);
  owner.abort();
  expect(owned.every(n => n.stop.mock.calls.some(call => call.length === 0) && n.disconnect.mock.calls.length === 1)).toBe(true);
  expect(unowned.disconnect).not.toHaveBeenCalled();
  expect(gains.map(n => n.gain.setTargetAtTime.mock.calls.length)).toEqual(calls);
  const count = sources.length; playCue('impact', { signal: owner.signal }); expect(sources).toHaveLength(count);
});
it('owns sampled voices and removes ownership after natural completion', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })));
  const { initAudio, preloadAudio, playCue } = await import('./sfx.js'); initAudio(); await preloadAudio();
  const owner = new AbortController(); playCue('block', { signal: owner.signal }); const sample = sources.at(-1)!;
  expect(sample.buffer).toEqual({ duration: .3 }); sample.onended!(); owner.abort();
  expect(sample.disconnect).toHaveBeenCalledOnce(); expect(sample.stop).not.toHaveBeenCalled();
});
it('suppresses all future audition cues on explicit cancellation', async () => {
  const { auditionCombatSounds } = await import('./sfx.js'); const cancel = auditionCombatSounds();
  await vi.advanceTimersByTimeAsync(1); const count = sources.length; expect(count).toBeGreaterThan(0);
  cancel(); await vi.runAllTimersAsync(); expect(sources).toHaveLength(count); expect(vi.getTimerCount()).toBe(0);
});
it.each(['hidden', 'resize', 'pagehide'])('cancels the audition when %s', async kind => {
  const { auditionCombatSounds } = await import('./sfx.js'); auditionCombatSounds();
  if (kind === 'hidden') { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); }
  else window.dispatchEvent(new Event(kind));
  await vi.runAllTimersAsync(); expect(sources).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
});
it('does not let an audition suppress a subsequent live select cue', async () => {
  const { playCue } = await import('./sfx.js'); const owner = new AbortController();
  playCue('select', { signal: owner.signal }); playCue('select'); expect(sources).toHaveLength(2);
});
