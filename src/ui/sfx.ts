/**
 * Sound.
 *
 * Original local sound assets provide three variations per common cue.
 * Synthesized fallback cues keep the game audible before those assets load.
 * Music and ambience are quiet procedural motifs; every category has its
 * own volume and the protected mix is shared with MP4 recording.
 *
 * Browsers refuse to start audio until the user has interacted with the page,
 * so the context is created lazily on the first gesture and every call is a
 * no-op until then.
 */

import { SoundtrackPlayer } from './soundtrack.js';
import type { SoundtrackTrack } from '../data/soundtrack.js';
let soundtrack: SoundtrackPlayer | undefined;
let musicPreview: SoundtrackTrack | undefined;

/** The credits player shares the mix, volume, visibility and recording rules. */
export function previewSoundtrack(track?: SoundtrackTrack): void {
  if (track) initAudio();
  musicPreview = track;
  soundtrack?.setScene(track ? `preview:${track.file}` : soundscape, track);
  setAtmosphereVolumes(musicVolume, ambienceVolume);
}

export type CueName =
  | 'select' | 'confirm' | 'cancel' | 'flip' | 'block' | 'crack' | 'force'
  | 'codex' | 'essence' | 'vent' | 'offer'
  | 'cardPlay'
  | 'cardDraw'
  | 'attack'
  | 'impact'
  | 'barrierBreak'
  | 'destroy'
  | 'powerUp'
  | 'powerDown'
  | 'stateRelease'
  | 'search'
  | 'arrive'
  | 'ward'
  | 'restore'
  | 'prompt'
  | 'turn'
  | 'win'
  | 'lose';

export interface CueOptions {
  /** 0..1 — how hard the cue hits. Scales level and, where it makes sense, pitch. */
  intensity?: number;
  /** Semitone offset, so related events can be pitched apart. */
  detune?: number;
  /** Cancels this caller's voices, including scheduled synth notes, only. */
  signal?: AbortSignal;
}

let ctx: AudioContext | null = null;
let speakers: GainNode | null = null;
let recordingBus: MediaStreamAudioDestinationNode | null = null;
let recordingSilence: ConstantSourceNode | null = null;
let master: GainNode | null = null;
let effects: GainNode | null = null;
let music: GainNode | null = null;
let ambience: GainNode | null = null;
let musicVolume = 0.12, ambienceVolume = 0.08;
let soundscape = '', danger = false, musicTimer: ReturnType<typeof setInterval> | undefined;
let phrase = 0;
const samples = new Map<string, AudioBuffer>();
const sampleNames = ['select','confirm','cancel','flip','block','crack','force','codex','essence','vent','offer'];
const variants = new Map<string, number>();
const lastCue = new Map<string, number>();
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;
let volume = 0.6;

/**
 * Silence the game whenever nobody is looking at it.
 *
 * A browser will happily keep a hidden tab making noise — muting is the page's
 * job, not the browser's. Without this, a game left in a background tab, or
 * the demo match embedded on the website once the visitor has scrolled past,
 * carries on playing sound effects at somebody who cannot see where they are
 * coming from.
 *
 * Registered once, on the first `initAudio`, and it only ever resumes a
 * context that the player's own gesture already started.
 */
let visibilityBound = false;
function bindVisibility(): void {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void (ctx as AudioContext).suspend();
    else if (enabled) void (ctx as AudioContext).resume();
  });
}

/**
 * Create the audio context. Safe to call repeatedly; must be called from a
 * user gesture the first time or the context starts suspended.
 */
export function initAudio(): void {
  bindVisibility();
  // Nothing should start making noise while the page is in the background —
  // an automated click or a script-driven page can otherwise arm the mixer in
  // a tab the player is not even looking at.
  if (document.hidden) return;
  if (ctx) {
    if (ctx.state === 'suspended') void (ctx as AudioContext).resume();
    return;
  }
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;

  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    effects = ctx.createGain(); effects.gain.value = volume; effects.connect(master);
    music = ctx.createGain(); music.gain.value = 0; music.connect(master);
    soundtrack = new SoundtrackPlayer(ctx, music);
    soundtrack.setScene(soundscape);
    ambience = ctx.createGain(); ambience.gain.value = 0; ambience.connect(master);
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16; compressor.knee.value = 18;
    compressor.ratio.value = 5; compressor.attack.value = .004; compressor.release.value = .18;
    // Both speakers and saved clips receive the same protected mix.
    master.connect(compressor);
    speakers = ctx.createGain();
    speakers.gain.value = enabled ? 1 : 0;
    compressor.connect(speakers);
    speakers.connect(ctx.destination);
    mixedOutput = compressor;
    void preloadAudio();

    // One second of white noise, reused by every percussive cue.
    const len = Math.floor(ctx.sampleRate);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    setAtmosphereVolumes(musicVolume, ambienceVolume);
  } catch {
    ctx = null;
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  if (speakers && ctx) speakers.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.01);
}

export function setSfxVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (effects && ctx) effects.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
}

let mixedOutput: AudioNode | null = null;
export async function preloadAudio(): Promise<void> {
  if (!ctx) return;
  const audio = ctx;
  await Promise.all(sampleNames.flatMap(name => [0,1,2].map(async i => {
    const key = `${name}-${i}`;
    if (samples.has(key)) return;
    try {
      const res = await fetch(`/audio/${key}.wav`);
      if (res.ok) samples.set(key, await audio.decodeAudioData(await res.arrayBuffer()));
    } catch { /* A synthesized fallback remains available offline. */ }
  })));
}

export function setAtmosphereVolumes(m: number, a: number): void {
  musicVolume = Math.max(0, Math.min(1, m)); ambienceVolume = Math.max(0, Math.min(1, a));
  if (ctx) {
    music?.gain.cancelScheduledValues(ctx.currentTime);
    ambience?.gain.cancelScheduledValues(ctx.currentTime);
    music?.gain.setTargetAtTime(soundscape || musicPreview ? musicVolume : 0, ctx.currentTime, .15);
    ambience?.gain.setTargetAtTime(soundscape ? ambienceVolume : 0, ctx.currentTime, .15);
  }
}

/** Original, quiet motifs; deck identity is artistic, not a traditional recording. */
export function setSoundscape(deck: string, threatened = false): void {
  danger = threatened;
  if (soundscape === deck) return;
  soundscape = deck; phrase = 0;
  musicPreview = undefined;
  soundtrack?.setScene(deck);
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = undefined;
  setAtmosphereVolumes(musicVolume, ambienceVolume);
  if (!deck) return;
  const tick = () => {
    if (!ctx || ctx.state !== 'running' || document.hidden || !music || !ambience) return;
    const root = deck === 'title' || deck === 'tutorial' ? 130.81 : deck.includes('babaylan') ? 164.81 : deck.includes('maguindanao') ? 110 : 196;
    const notes = danger || deck === 'defeat' ? [0,3,7,3,0,10,7,3] : [0,7,12,7,4,7,14,7];
    const f = root * Math.pow(2, notes[phrase++ % notes.length]! / 12);
    if (!soundtrack?.playing && !musicPreview) atmosphereTone(f, .8, .12, music);
    if (phrase % 4 === 1) atmosphereTone(root / 2, 3, .13, ambience);
  };
  tick(); musicTimer = setInterval(tick, 800);
}

function atmosphereTone(freq: number, duration: number, level: number, bus: GainNode): void {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
  o.frequency.value = freq; o.type = 'sine';
  g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(level, now + .08);
  g.gain.exponentialRampToValueAtTime(.0001, now + duration);
  o.connect(g).connect(bus); o.onended = () => { o.disconnect(); g.disconnect(); };
  o.start(); o.stop(now + duration + .02);
}

export function duckMusic(): void {
  if (!ctx || !music || !soundscape) return;
  const now = ctx.currentTime;
  music.gain.cancelScheduledValues(now);
  music.gain.setTargetAtTime(musicVolume * .3, now, .035);
  music.gain.setTargetAtTime(musicVolume, now + .7, .25);
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

interface ToneSpec {
  freq: number;
  /** Glide to this frequency across the cue. */
  to?: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  attack?: number;
  delay?: number;
}

function ownVoice(source: AudioScheduledSourceNode, signal: AbortSignal | undefined, disconnect: () => void): void {
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    signal?.removeEventListener('abort', stop);
    disconnect();
  };
  const stop = () => { try { source.stop(); } catch { /* Already stopped. */ } cleanup(); };
  source.onended = cleanup;
  signal?.addEventListener('abort', stop, { once: true });
}

function toneVoice({
  freq,
  to,
  type = 'sine',
  dur = 0.18,
  gain = 0.3,
  attack = 0.004,
  delay = 0,
}: ToneSpec, signal?: AbortSignal): void {
  if (!ctx || !master || signal?.aborted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

  // Exponential decay: a percussive shape, not an organ note.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(effects!);
  ownVoice(osc, signal, () => { osc.disconnect(); g.disconnect(); });
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseSpec {
  dur?: number;
  gain?: number;
  /** Bandpass centre; glides to `to` if given. */
  freq?: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
}

function noiseVoice({
  dur = 0.14,
  gain = 0.25,
  freq = 1200,
  to,
  q = 1,
  type = 'bandpass',
  delay = 0,
}: NoiseSpec, signal?: AbortSignal): void {
  if (!ctx || !master || !noiseBuffer || signal?.aborted) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;

  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) filt.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filt).connect(g).connect(effects!);
  ownVoice(src, signal, () => { src.disconnect(); filt.disconnect(); g.disconnect(); });
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Semitones → frequency multiplier. */
const st = (n: number) => Math.pow(2, n / 12);

// ---------------------------------------------------------------------------
// cues
// ---------------------------------------------------------------------------

export function playCue(name: CueName, opts: CueOptions = {}): void {
  if (opts.signal?.aborted) return;
  if (!enabled && !recordingBus) return;
  if (!ctx) initAudio();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // Resource chains may update many cards in one beat. Avoid a wall of sound.
  if (!opts.signal && ['powerUp','powerDown','prompt','select'].includes(name) && now - (lastCue.get(name) ?? -1) < .07) return;
  if (!opts.signal) lastCue.set(name, now);
  // An isolated audition never changes the live match's music envelope.
  if (!opts.signal && ['impact','barrierBreak','force','stateRelease','codex'].includes(name)) duckMusic();
  if (sampleNames.includes(name)) {
    const variant = (variants.get(name) ?? 0) % 3; variants.set(name, variant + 1);
    const buffer = samples.get(`${name}-${variant}`);
    if (buffer && effects) {
      const source = ctx.createBufferSource(); source.buffer = buffer;
      source.connect(effects); ownVoice(source, opts.signal, () => source.disconnect()); source.start(); return;
    }
  }

  const i = Math.max(0, Math.min(1, opts.intensity ?? 0.5));
  const p = st(opts.detune ?? 0);
  const tone = (spec: ToneSpec) => toneVoice(spec, opts.signal);
  const noise = (spec: NoiseSpec) => noiseVoice(spec, opts.signal);

  switch (name) {
    case 'select': case 'confirm': case 'cancel':
      tone({ freq: name === 'cancel' ? 310 : 880, dur: .08, gain: .1 }); break;
    case 'flip': case 'vent': case 'offer':
      noise({ dur: .18, gain: .13, freq: name === 'offer' ? 400 : 1800, to: 300 }); break;
    case 'block': case 'crack':
      tone({ freq: 220, to: 90, dur: .22, gain: .23 });
      noise({ dur: .13, gain: .18, freq: name === 'crack' ? 3200 : 700 }); break;
    case 'force': case 'codex': case 'essence':
      tone({ freq: 440, to: 880, dur: .35, gain: .15 }); break;
    // A card meeting the table: a little air, then a low body.
    case 'cardPlay':
      noise({ dur: 0.07, gain: 0.16, freq: 2200, to: 700, q: 0.7 });
      tone({ freq: 110 * p, to: 70 * p, dur: 0.1, gain: 0.22, type: 'triangle' });
      break;

    // Paper sliding, nothing more.
    case 'cardDraw':
      noise({ dur: 0.13, gain: 0.11, freq: 900, to: 2800, q: 0.8 });
      break;

    // The swing itself — air moving, pitched down as it travels.
    case 'attack':
      noise({ dur: 0.19, gain: 0.2, freq: 3200, to: 500, q: 1.4 });
      break;

    // Contact. Heavier and lower the harder it lands.
    case 'impact':
      tone({ freq: (150 - i * 60) * p, to: (52 - i * 16) * p, dur: 0.16 + i * 0.12, gain: 0.3 + i * 0.3, type: 'sine' });
      noise({ dur: 0.09 + i * 0.06, gain: 0.18 + i * 0.22, freq: 1600, to: 260, q: 0.6 });
      if (i > 0.6) tone({ freq: 82, to: 40, dur: 0.34, gain: 0.26, type: 'triangle', delay: 0.02 });
      break;

    // Glass: a crack, then shards at inharmonic intervals.
    case 'barrierBreak':
      noise({ dur: 0.05, gain: 0.34, freq: 5200, q: 0.5, type: 'highpass' });
      tone({ freq: 2400, to: 1900, dur: 0.16, gain: 0.16, type: 'triangle' });
      tone({ freq: 3170, to: 2600, dur: 0.2, gain: 0.12, type: 'triangle', delay: 0.03 });
      tone({ freq: 4310, to: 3600, dur: 0.26, gain: 0.09, type: 'triangle', delay: 0.06 });
      noise({ dur: 0.5, gain: 0.12, freq: 3000, to: 600, q: 0.4, delay: 0.04 });
      tone({ freq: 120, to: 48, dur: 0.4, gain: 0.3, type: 'sine' });
      break;

    // Something collapsing inward.
    case 'destroy':
      noise({ dur: 0.34, gain: 0.22, freq: 900, to: 120, q: 0.5, type: 'lowpass' });
      tone({ freq: 190, to: 58, dur: 0.3, gain: 0.2, type: 'sawtooth' });
      break;

    case 'powerUp':
      tone({ freq: 520 * p, to: 790 * p, dur: 0.15, gain: 0.16, type: 'triangle' });
      tone({ freq: 780 * p, to: 1180 * p, dur: 0.17, gain: 0.09, type: 'sine', delay: 0.035 });
      break;

    case 'powerDown':
      tone({ freq: 620 * p, to: 330 * p, dur: 0.2, gain: 0.14, type: 'triangle' });
      break;

    // The biggest moment a deck gets: a rising chord with air under it.
    case 'stateRelease':
      tone({ freq: 262 * p, dur: 0.85, gain: 0.16, type: 'sine', attack: 0.09 });
      tone({ freq: 330 * p, dur: 0.85, gain: 0.13, type: 'sine', attack: 0.12, delay: 0.05 });
      tone({ freq: 392 * p, dur: 0.9, gain: 0.12, type: 'sine', attack: 0.14, delay: 0.1 });
      tone({ freq: 524 * p, to: 786, dur: 0.7, gain: 0.09, type: 'triangle', delay: 0.16 });
      noise({ dur: 0.9, gain: 0.08, freq: 600, to: 5200, q: 0.5, delay: 0.05 });
      break;

    // Riffling through a pile: a handful of tiny ticks.
    case 'search':
      for (let k = 0; k < 5; k++) {
        noise({ dur: 0.03, gain: 0.09, freq: 2600 + k * 260, q: 2.5, delay: k * 0.035 });
      }
      break;

    // A unit landing. Bigger units land lower and later.
    case 'arrive':
      tone({ freq: (420 - i * 150) * p, to: (300 - i * 110) * p, dur: 0.2 + i * 0.14, gain: 0.16, type: 'triangle' });
      tone({ freq: (128 - i * 40) * p, to: (64 - i * 18) * p, dur: 0.22 + i * 0.14, gain: 0.2, type: 'sine' });
      noise({ dur: 0.09, gain: 0.13, freq: 1800, to: 420, q: 0.7 });
      break;

    // A shield closing.
    case 'ward':
      tone({ freq: 660, to: 990, dur: 0.24, gain: 0.12, type: 'sine', attack: 0.02 });
      noise({ dur: 0.28, gain: 0.09, freq: 2400, to: 5000, q: 1.2 });
      break;

    case 'restore':
      tone({ freq: 330, to: 495, dur: 0.28, gain: 0.14, type: 'sine', attack: 0.03 });
      tone({ freq: 495, to: 660, dur: 0.24, gain: 0.08, type: 'sine', delay: 0.06 });
      break;

    // "The game is waiting on you."
    case 'prompt':
      tone({ freq: 880, dur: 0.07, gain: 0.09, type: 'sine' });
      tone({ freq: 1174, dur: 0.09, gain: 0.07, type: 'sine', delay: 0.07 });
      break;

    case 'turn':
      tone({ freq: 196, to: 262, dur: 0.3, gain: 0.11, type: 'sine', attack: 0.04 });
      break;

    // Major, rising.
    case 'win':
      [262, 330, 392, 524].forEach((f, k) =>
        tone({ freq: f, dur: 0.75, gain: 0.16, type: 'triangle', attack: 0.02, delay: k * 0.1 }),
      );
      noise({ dur: 1.1, gain: 0.07, freq: 900, to: 6000, q: 0.4, delay: 0.1 });
      break;

    // Minor, falling.
    case 'lose':
      [392, 311, 262, 196].forEach((f, k) =>
        tone({ freq: f, dur: 0.8, gain: 0.15, type: 'sine', attack: 0.03, delay: k * 0.13 }),
      );
      break;
  }
}

/** Owned settings audition. Caller cancels on close/replacement; visibility also cancels. */
export function auditionCombatSounds(): () => void {
  initAudio();
  const owner = new AbortController();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const cancel = () => {
    owner.abort(); timers.forEach(clearTimeout);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('pagehide', cancel);
    window.removeEventListener('resize', cancel);
  };
  const hidden = () => { if (document.hidden) cancel(); };
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', cancel);
  window.addEventListener('resize', cancel);
  for (const [name, delay] of [['select', 0], ['block', 250], ['impact', 650]] as const) {
    timers.push(setTimeout(() => playCue(name, { signal: owner.signal, intensity: .35 }), delay));
  }
  timers.push(setTimeout(cancel, 1500));
  return cancel;
}


/** Direct game audio: speaker mute never produces a silent saved video. */
export async function startRecordingAudio(): Promise<MediaStream> {
  initAudio();
  if (!ctx || !master) throw new Error('Game audio is unavailable.');
  await ctx.resume();
  if (ctx.state !== 'running') throw new Error('Enable game audio before starting a match.');
  recordingBus = ctx.createMediaStreamDestination();
  mixedOutput!.connect(recordingBus);
  // Keep AAC timestamps continuous even between short synthesized cues.
  recordingSilence = ctx.createConstantSource();
  recordingSilence.offset.value = 0;
  recordingSilence.connect(recordingBus);
  recordingSilence.start();
  return recordingBus.stream;
}
export function stopRecordingAudio(): void {
  recordingSilence?.stop();
  recordingSilence?.disconnect();
  recordingSilence = null;
  if (recordingBus) {
    mixedOutput?.disconnect(recordingBus);
    recordingBus.stream.getTracks().forEach(track => track.stop());
    recordingBus = null;
  }
}
