import { SOUNDTRACK, musicScene, type SoundtrackTrack } from '../data/soundtrack.js';

interface PlayingTrack {
  track: SoundtrackTrack;
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

/** Stream long recordings instead of decoding several full songs into memory. */
export class SoundtrackPlayer {
  private active?: PlayingTrack;
  private revision = 0;
  private requested = '';
  private failed = new Set<string>();
  private retiring = new Map<PlayingTrack, ReturnType<typeof setTimeout>>();

  constructor(private readonly context: AudioContext, private readonly output: AudioNode) {
    document.addEventListener('visibilitychange', () => {
      this.clearRetiring();
      if (document.hidden) this.active?.audio.pause();
      else if (this.active) this.resume(this.active, this.revision);
    });
    // Retain the active element for back/forward-cache restoration. A hard
    // navigation disposes the document; a restored page resumes the same track.
    window.addEventListener('pagehide', () => { this.revision++; this.clearRetiring(); this.active?.audio.pause(); });
    window.addEventListener('pageshow', () => { if (!document.hidden && this.active) this.resume(this.active, this.revision); });
  }

  get playing(): boolean { return !!this.active && !this.active.audio.paused; }

  setScene(scene: string, override?: SoundtrackTrack): void {
    if (scene === this.requested) return;
    this.requested = scene;
    const track = override ?? (scene ? SOUNDTRACK[musicScene(scene)] : undefined);
    if (track && this.active?.track.file === track.file) return;
    const revision = ++this.revision;
    if (!track || this.failed.has(track.file)) { this.stop(); return; }
    // Restrict soundtrack assets to this game's public music directory.
    if (!/^\/music\/[\w .-]+\.(mp3|ogg|m4a|wav)$/i.test(track.file)) { this.stop(); return; }
    const audio = new Audio();
    audio.preload = 'none'; audio.loop = track.loop;
    const source = this.context.createMediaElementSource(audio);
    const gain = this.context.createGain(); gain.gain.value = 0;
    source.connect(gain).connect(this.output);
    const next = { audio, source, gain, track };
    this.stop(); this.active = next;
    audio.onerror = () => {
      if (this.active !== next) return;
      this.failed.add(track.file); this.stop();
    };
    audio.onended = () => { if (this.active === next && !track.loop) this.stop(); };
    audio.src = track.file;
    if (!document.hidden) this.resume(next, revision);
  }

  private resume(track: PlayingTrack, revision: number): void {
    void track.audio.play().then(() => {
      if (this.active !== track || revision !== this.revision || document.hidden) {
        track.audio.pause(); return;
      }
      track.gain.gain.setTargetAtTime(1, this.context.currentTime, .3);
    }).catch(error => {
      if (document.hidden || error instanceof DOMException && error.name === 'AbortError') return;
      if (this.active === track) { this.failed.add(track.track.file); this.stop(); }
    });
  }

  private stop(): void {
    const previous = this.active; this.active = undefined;
    if (!previous) return;
    previous.gain.gain.cancelScheduledValues(this.context.currentTime);
    previous.gain.gain.setTargetAtTime(0, this.context.currentTime, .2);
    if (document.hidden) { this.release(previous); return; }
    this.retiring.set(previous, setTimeout(() => {
      this.release(previous); this.retiring.delete(previous);
    }, 900));
  }

  private clearRetiring(): void {
    for (const [track, timer] of this.retiring) { clearTimeout(timer); this.release(track); }
    this.retiring.clear();
  }

  private release(track: PlayingTrack): void {
    track.audio.onerror = track.audio.onended = null;
    track.audio.pause(); track.audio.removeAttribute('src'); track.audio.load();
    track.source.disconnect(); track.gain.disconnect();
  }
}
