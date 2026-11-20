/** Bounded preparation of visible art. Never delays a decision or fetches hidden cards. */
const prepared = new Map<string, Promise<boolean>>();
export function prepareCardArt(url: string): Promise<boolean> {
  if (!url || typeof Image === 'undefined') return Promise.resolve(false);
  const existing = prepared.get(url); if (existing) return existing;
  const image = new Image(); image.decoding = 'async';
  const loaded = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Image unavailable')); });
  image.src = url;
  let timer: ReturnType<typeof setTimeout>;
  const ready = Promise.race([
    loaded.then(() => typeof image.decode === 'function' ? image.decode() : undefined).then(() => true),
    new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 12000); }),
  ]).catch(() => false).then(ok => { clearTimeout(timer); if (!ok) prepared.delete(url); return ok; });
  prepared.set(url, ready);
  if (prepared.size > 512) prepared.delete(prepared.keys().next().value!);
  return ready;
}
export interface ArtPreparation { ready: number; failed: string[] }
/** A shared, bounded queue; dismissing a loading overlay does not cancel it. */
export async function warmCardArt(urls: string[], progress?: (report: ArtPreparation) => void,
  load: (url: string) => Promise<boolean> = prepareCardArt, concurrency = 4): Promise<ArtPreparation> {
  const queue = [...new Set(urls)].filter(Boolean);
  let cursor = 0;
  const report: ArtPreparation = { ready: 0, failed: [] };
  const worker = async () => {
    while (cursor < queue.length) {
      const url = queue[cursor++]!;
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try { ok = await load(url); } catch { /* Retrying one transient failure is safe. */ }
      }
      if (ok) report.ready++; else report.failed.push(url);
      progress?.({ ready: report.ready, failed: [...report.failed] });
    }
  };
  await Promise.all(Array.from({ length: Math.min(queue.length, Math.max(1, concurrency)) }, worker));
  return report;
}

/** Keep the smaller portrait visible until the detailed image is decoded. */
export function upgradeCardArt(image: HTMLImageElement, detailed: string): void {
  void prepareCardArt(detailed).then(ready => {
    if (ready && image.isConnected) image.src = detailed;
  });
}
export async function readyFlightArt(cssImage: string): Promise<void> {
  // A second background can be the placeholder; prepare the visible portrait.
  const url = /url\(["']?([^"')]+)["']?\)/.exec(cssImage)?.[1];
  if (!url) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([prepareCardArt(url), new Promise<void>(resolve => { timer = setTimeout(resolve, 80); })]);
  if (timer !== undefined) clearTimeout(timer);
}
