type PackState = 'checking' | 'downloading' | 'ready' | 'paused' | 'retry' | 'storage' | 'unavailable';
type PackStatus = { state: PackState; savedBytes: number; totalBytes: number };
let status: PackStatus = { state: 'checking', savedBytes: 0, totalBytes: 0 };
let registration: ServiceWorkerRegistration | undefined;
let initialized = false, atHome = false, saveData = false;

function send(command: string) {
  (navigator.serviceWorker?.controller ?? registration?.active)?.postMessage({ type: 'asset-pack', command });
}
function sync() {
  if (location.protocol === 'codex:') return;
  const allowed = atHome && !saveData && !document.hidden && navigator.onLine;
  send(allowed ? 'start' : 'pause');
  if (!navigator.onLine && status.state !== 'ready') status.state = 'retry';
}
/** Register without blocking the first render. Direct duel links only save assets on demand. */
export function initializeAssetDownloads() {
  if (location.protocol === 'codex:') { initialized = true; status.state = 'ready'; return; }
  if (initialized) return;
  initialized = true;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.state = 'unavailable'; return;
  }
  // Respect a browser's data-saving preference on the first visit.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) saveData = true;
  navigator.serviceWorker.addEventListener('message', event => {
    const data = event.data;
    if (data?.type !== 'asset-pack' || typeof data.savedBytes !== 'number' || typeof data.totalBytes !== 'number'
      || !['checking', 'downloading', 'ready', 'paused', 'retry', 'storage'].includes(data.state)) return;
    status = data;
  });
  navigator.serviceWorker.addEventListener('controllerchange', sync);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  document.addEventListener('visibilitychange', sync);
  // Recover an interrupted browser worker, without retrying storage failures in a loop.
  window.setInterval(() => {
    if (atHome && !saveData && !document.hidden && navigator.onLine && !['ready', 'storage', 'unavailable'].includes(status.state)) sync();
  }, 60000);
  window.setTimeout(() => {
    void navigator.serviceWorker.register('/asset-worker.js', { scope: '/', updateViaCache: 'none' })
      .then(async reg => { registration = reg; await navigator.serviceWorker.ready; sync(); })
      .catch(() => { status.state = 'unavailable'; });
  }, 1000);
}

export function leaveAssetDownloadMenu() { atHome = false; sync(); }

/** Save quietly while the home screen is visible; no player-facing download UI. */
export function enterAssetDownloadMenu() {
  atHome = true;
  initializeAssetDownloads(); sync();
}
