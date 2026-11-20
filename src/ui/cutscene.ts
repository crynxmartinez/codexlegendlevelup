/**
 * Signature cutscenes.
 *
 * Master Duel's most cinematic moments are not simulated live — they are
 * pre-rendered video played over the board. That is why they look far beyond
 * what the rest of the game renders in real time, and the technique transfers
 * unchanged.
 *
 * A cutscene is a VP9 WebM **with an alpha channel**, composited over the
 * board so card art shows through the transparent areas. A card earns one by
 * having a file at `assets/ui/cutscenes/<defId with / as ->.webm`; nothing is
 * registered per card in code.
 *
 * Everything here is a no-op until such a file exists, so cutscenes can be
 * added one at a time without touching the game.
 */
import { gsap } from 'gsap';
import { settings } from './settings.js';

/** Resolved cutscene URL per card, or null when the card has none. */
const known = new Map<string, string | null>();
/** Cutscenes already shown this duel, so a repeat does not re-interrupt. */
const seen = new Set<string>();
const preparedVideos = new Map<string, HTMLVideoElement>();

/** The shipped signature clip, prepared silently alongside the duel effects. */
export async function preloadCutscenes(): Promise<void> {
  if (!settings().cutscenes || settings().animationIntensity === 'minimal' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const url = '/ui/cutscenes/Datu%20Salik.webm';
  if (preparedVideos.has(url)) return;
  const video = document.createElement('video');
  video.preload = 'auto'; video.muted = true; video.playsInline = true;
  await new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); video.onloadeddata = video.onerror = null; resolve(); };
    const timer = setTimeout(finish, 4000);
    video.onloadeddata = () => { preparedVideos.set(url, video); finish(); };
    video.onerror = finish; video.src = url; video.load();
  });
}

/**
 * Filenames worth trying for a card, most specific first.
 *
 * Naming a file after the card is the natural thing to do, so all three forms
 * are accepted rather than making anyone transcribe a def id:
 *
 *   maguindanao-kuta-wato-warcaller-datu-salik   (the id)
 *   Kuta Wato Warcaller, Datu Salik              (the printed name)
 *   Datu Salik                                   (just the person)
 *
 * Both .webm and .mp4 are accepted. WebM can carry alpha; MP4 cannot, but the
 * cutscene plays over a dark wash so an opaque clip is fine.
 */
function candidateUrls(defId: string, cardName: string): string[] {
  const stems = [defId.replace(/\//g, '-'), cardName];
  // "Kuta Wato Warcaller, Datu Salik" → "Datu Salik"
  const afterComma = cardName.split(',').pop()?.trim();
  if (afterComma && afterComma !== cardName) stems.push(afterComma);

  const urls: string[] = [];
  for (const stem of stems) {
    for (const ext of ['webm', 'mp4']) {
      // encodeURI, not encodeURIComponent: the latter escapes commas to %2C,
      // which the static file server does not decode back — the same trap the
      // card art paths hit.
      urls.push(encodeURI(`/ui/cutscenes/${stem}.${ext}`));
    }
  }
  return urls;
}

/**
 * Find this card's cutscene, if it has one. Asked once per card and cached.
 *
 * A HEAD request is enough, but the content type has to be checked too: a dev
 * server answers a missing path with 200 and an HTML index, so `res.ok` alone
 * would find a "video" everywhere.
 */
async function findCutscene(defId: string, cardName: string): Promise<string | null> {
  const prepared = candidateUrls(defId, cardName).find(url => preparedVideos.has(url));
  if (prepared) return prepared;
  const cached = known.get(defId);
  if (cached !== undefined) return cached;

  let found: string | null = null;
  for (const url of candidateUrls(defId, cardName)) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('video')) {
        found = url;
        // Say which file won. WebM is tried before MP4 because only WebM can
        // carry alpha — but if both exist for a card, the one that loads is
        // not obvious from the outside, and picking the wrong one silently is
        // how a badly-compressed export ends up shipping.
        console.info(
          `[cutscene] ${defId} → ${decodeURI(url)}` +
          ` (${Math.round(Number(res.headers.get('content-length') ?? 0) / 1024)} KB)`,
        );
        break;
      }
    } catch {
      // Try the next candidate.
    }
  }
  known.set(defId, found);
  return found;
}

export function resetCutscenes(): void {
  seen.clear();
}

/**
 * Play the cutscene for `defId` if one exists and has not been seen this duel.
 * Resolves when it finishes, is skipped, or immediately when there is nothing
 * to play — so callers can always await it.
 */
export async function playCutscene(defId: string, cardName: string): Promise<boolean> {
  if (!settings().cutscenes) return false;
  if (settings().animationIntensity === 'minimal' || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (settings().cutsceneFrequency === 'first' && seen.has(defId)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const url = await findCutscene(defId, cardName);
  if (!url) return false;

  seen.add(defId);

  const stage = document.createElement('div');
  stage.className = 'cutscene';

  const video = preparedVideos.get(url) ?? document.createElement('video');
  if (!preparedVideos.has(url)) video.src = url;
  video.currentTime = 0;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = 'cs-video';

  const name = document.createElement('div');
  name.className = 'cs-name';
  name.textContent = cardName;

  const skip = document.createElement('button');
  skip.className = 'cs-skip';
  skip.textContent = 'Skip';

  stage.append(video, name, skip);
  document.body.appendChild(stage);

  // GSAP earns its place here rather than in the CSS layer: this is one
  // timeline over three independent elements, and the video's own duration —
  // unknown until it loads — has to drive when the rest lets go.
  const tl = gsap.timeline();
  tl.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' })
    .fromTo(video, { scale: 1.08 }, { scale: 1, duration: 0.9, ease: 'power3.out' }, 0)
    .fromTo(name,
      { opacity: 0, y: 18, letterSpacing: '0.3em' },
      { opacity: 1, y: 0, letterSpacing: '0.14em', duration: 0.7, ease: 'power2.out' }, 0.15)
    .to(name, { opacity: 0, duration: 0.4, ease: 'power1.in' }, '+=1.1');

  // GSAP runs off requestAnimationFrame, which a background or throttled tab
  // never fires. A `fromTo` applies its start values immediately, so a stalled
  // timeline leaves the name at opacity 0 and the backdrop half-faded. Snap it
  // to the finished state rather than leaving a half-drawn screen.
  const watchdog = window.setTimeout(() => {
    if (tl.progress() < 1) tl.progress(1);
  }, (tl.duration() + 0.4) * 1000);

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      tl.kill();
      // Removal must NOT depend on an animation completing. If the tab is
      // throttled, an onComplete that never fires would leave the game stuck
      // behind an invisible full-screen overlay — so the timer owns the
      // teardown and the tween is only the polish on top.
      stage.style.transition = 'opacity .3s ease-in';
      stage.style.opacity = '0';
      window.setTimeout(() => {
        stage.remove();
        resolve();
      }, 320);
    };
    video.onended = finish;
    // A file that fails to decode must not hang the turn.
    video.onerror = finish;
    skip.onclick = finish;
    stage.onclick = finish;
    // Hard ceiling, in case a video reports no end.
    setTimeout(finish, 12000);
  });

  return true;
}
