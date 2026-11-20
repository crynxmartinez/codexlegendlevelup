/* Generated with a content-hashed allowlist by tools/asset-pack.mjs. Static media only. */
const PACK = __ASSET_PACK__;
const CACHE = 'codex-game-media-v1';
const entries = new Map(PACK.entries.map(entry => [entry.url, entry]));
const keyFor = entry => `${self.location.origin}${entry.url}?asset-revision=${entry.revision}`;
const totalBytes = PACK.entries.reduce((sum, e) => sum + e.bytes, 0);
const pending = new Map();
let paused = true, running, storageFailed = false;
let status = { state: 'checking', savedBytes: 0, totalBytes };

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
async function publish(state, savedBytes = status.savedBytes) {
  status = { type: 'asset-pack', state, savedBytes, totalBytes };
  for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage(status);
}

async function stored(entry) {
  try { return await (await caches.open(CACHE)).match(keyFor(entry)); }
  catch { storageFailed = true; return undefined; }
}

async function download(entry) {
  const key = keyFor(entry);
  if (pending.has(key)) return (await pending.get(key)).clone();
  const task = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      // The revision also bypasses stale HTTP-cache copies after a release.
      const response = await fetch(key, { signal: controller.signal, credentials: 'same-origin' });
      if (response.status !== 200 || !response.headers.get('Content-Type')?.startsWith(entry.type)) throw new Error('Invalid media response');
      const body = await response.clone().arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), b => b.toString(16).padStart(2, '0')).join('');
      if (digest !== entry.revision) throw new Error('Media version mismatch');
      if (!storageFailed) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(key, response.clone());
          // Keep the old revision until its replacement is safely saved.
          for (const old of await cache.keys()) {
            if (new URL(old.url).pathname === entry.url && old.url !== key) await cache.delete(old);
          }
        } catch { storageFailed = true; }
      }
      return response;
    } finally { clearTimeout(timer); }
  })();
  pending.set(key, task);
  try { return (await task).clone(); } finally { pending.delete(key); }
}

async function run() {
  try {
    const cache = await caches.open(CACHE);
    const saved = new Set((await cache.keys()).map(r => r.url));
    const currentKeys = new Set(PACK.entries.map(keyFor));
    const queue = PACK.entries.filter(e => !saved.has(keyFor(e)));
    let savedBytes = PACK.entries.filter(e => saved.has(keyFor(e))).reduce((sum, e) => sum + e.bytes, 0);
    await publish('downloading', savedBytes);
    let failed = false;
    async function next() {
      while (queue.length && !paused && !storageFailed) {
        const entry = queue.shift();
        try {
          if (!(await stored(entry))) await download(entry);
          if (!storageFailed) savedBytes += entry.bytes;
        } catch { failed = true; }
        await publish('downloading', savedBytes);
      }
    }
    // Small bounded queue leaves bandwidth and decoding work to the live game.
    await Promise.all([next(), next()]);
    const state = storageFailed ? 'storage' : savedBytes === totalBytes ? 'ready' : paused ? 'paused' : failed ? 'retry' : 'paused';
    if (state === 'ready') {
      for (const old of await cache.keys()) if (!currentKeys.has(old.url)) await cache.delete(old);
    }
    await publish(state, savedBytes);
  } catch { storageFailed = true; await publish('storage'); }
}

self.addEventListener('message', event => {
  if (event.data?.type !== 'asset-pack') return;
  const command = event.data.command;
  if (command === 'pause') { paused = true; event.waitUntil(publish('paused')); }
  if (command === 'status') event.waitUntil(publish(status.state));
  if (command === 'start') {
    paused = false;
    if (!running) { storageFailed = false; running = run().finally(() => { running = undefined; }); }
    event.waitUntil(running);
  }
});

async function rangeResponse(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return null;
  const bytes = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  const entry = entries.get(url.pathname);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !entry || url.search) return;
  event.respondWith((async () => {
    const cached = await stored(entry);
    const range = request.headers.get('Range');
    if (range) return cached ? (await rangeResponse(cached, range) ?? fetch(request)) : fetch(request);
    if (cached) return cached;
    try { return await download(entry); }
    catch { return fetch(request); } // Optional saving must never prevent ordinary online loading.
  })());
});
