import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAssetPack } from './asset-pack.mjs';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import sharp from 'sharp';

const origin = 'https://game.test';
const hash = (body) => createHash('sha256').update(body).digest('hex');
const entry = (url, body) => ({ url, revision: hash(body), bytes: body.length, type: 'image/webp' });
function harness(entries = [entry('/cards/a.webp', 'card')], saved = new Map()) {
  const handlers = {};
  const requests = [], messages = [];
  let fail = false, quota = false, body = 'card', barrier;
  const key = (value) => new URL(typeof value === 'string' ? value : value.url, origin).href;
  const cache = {
    match: async (value) => saved.get(key(value))?.clone(),
    put: async (value, response) => {
      if (quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      saved.set(key(value), response.clone());
    },
    keys: async () => [...saved.keys()].map(url => new Request(url)),
    delete: async (value) => saved.delete(key(value)),
  };
  runInNewContext(readFileSync('tools/asset-worker.js', 'utf8').replace('__ASSET_PACK__', JSON.stringify({ entries })), {
    self: { location: { origin }, addEventListener: (type, fn) => { handlers[type] = fn; },
      skipWaiting: async () => {}, clients: { claim: async () => {}, matchAll: async () => [{ postMessage: (m) => messages.push(m) }] } },
    caches: { open: async () => cache }, URL, Request, Response, Headers, AbortController,
    crypto: webcrypto, setTimeout, clearTimeout, console,
    fetch: async (value) => {
      requests.push(key(value)); if (fail) throw new Error('offline');
      if (barrier) await barrier;
      return new Response(body, { headers: { 'Content-Type': 'image/webp' } });
    },
  });
  return {
    saved, requests, messages,
    fail: (value) => { fail = value; }, quota: () => { quota = true; }, body: (value) => { body = value; },
    hold: (promise) => { barrier = promise; },
    message: async (command) => { let task;
      handlers.message({ data: { type: 'asset-pack', command }, waitUntil: (p) => { task = p; } }); await task; },
    request: async (path, options) => { let response;
      handlers.fetch({ request: new Request(new URL(path, origin), options), respondWith: (p) => { response = p; } });
      return response ? await response : undefined;
    },
  };
}
describe('saved game asset pack', () => {
  it('packages exactly the active artwork at all three sizes and required effects', () => {
    const pack = createAssetPack(process.cwd());
    const art = JSON.parse(readFileSync('src/data/card-art-v2.json', 'utf8'));
    const cards = pack.entries.filter(e => e.url.startsWith('/cards/'));
    assert.equal(cards.length, Object.keys(art).length * 3);
    const expected = Object.values(art).flatMap(c => [c.art, c.thumb, c.art.replace('/web/', '/board/')])
      .map(p => encodeURI(p.replace(/^assets/, ''))).sort();
    assert.deepEqual(cards.map(e => e.url).sort(), expected);
    assert.ok(pack.entries.some(e => e.url === '/audio/crack-0.wav'));
    assert.ok(pack.entries.some(e => e.url === '/ui/cutscenes/Datu%20Salik.webm'));
    assert.ok(pack.entries.some(e => e.url.endsWith('.woff2')));
    const bossEffects = pack.entries.filter(e => e.url.startsWith('/effects/boss-attacks-v2/'));
    const bossManifest = JSON.parse(readFileSync('assets/effects/boss-attacks-v2/manifest.json', 'utf8'));
    assert.equal(bossEffects.length, 20);
    assert.deepEqual(bossEffects.map(e => e.url).sort(), bossManifest.entries.map(e => e.url).sort());
    assert.ok(!pack.entries.some(e => e.url.startsWith('/effects/boss-attacks-v1/')));
    for (const asset of bossEffects) assert.equal(asset.revision, bossManifest.entries.find(entry => entry.url === asset.url).sha256);
    assert.ok(bossEffects.every(e => e.type === 'image/webp' && e.bytes > 0 && e.revision.length === 64));
    assert.ok(pack.totalBytes < 110 * 1024 * 1024);
    assert.ok(pack.entries.findIndex(e => e.url.startsWith('/cards/web/')) > pack.entries.findIndex(e => e.url.startsWith('/audio/')));
  });
  it('saves a first visit and reuses it after a worker restart, even offline', async () => {
    const first = harness(); await first.message('start');
    assert.equal(first.saved.size, 1);
    const returning = harness(undefined, first.saved); returning.fail(true);
    await returning.message('start');
    assert.equal(returning.requests.length, 0);
    assert.equal(await (await returning.request('/cards/a.webp'))?.text(), 'card');
    assert.equal(returning.messages.at(-1).state, 'ready');
  });
  it('ships the exact final V2 WebP bytes with transparent 2048-pixel atlases', async () => {
    const manifest = JSON.parse(readFileSync('assets/effects/boss-attacks-v2/manifest.json', 'utf8'));
    assert.equal(manifest.entries.length, 20);
    assert.equal(new Set(manifest.entries.map(entry => entry.sha256)).size, 20);
    for (const asset of manifest.entries) {
      const bytes = readFileSync(`assets${asset.url}`);
      assert.equal(bytes.length, asset.bytes, asset.id);
      assert.equal(hash(bytes), asset.sha256, asset.id);
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, 'webp', asset.id);
      assert.equal(metadata.width, 2048, asset.id);
      assert.equal(metadata.height, 2048, asset.id);
      assert.equal(metadata.hasAlpha, true, asset.id);
    }
  });
  it('serves a saved boss attack sprite offline without a network fallback', async () => {
    const effects = [entry('/effects/boss-attacks-v2/maguayan.webp', 'wave')];
    const first = harness(effects); first.body('wave'); await first.message('start');
    const returning = harness(effects, first.saved); returning.fail(true);
    assert.equal(await (await returning.request(effects[0].url))?.text(), 'wave');
    assert.equal(returning.requests.length, 0);
  });
  it('resumes missing downloads without downloading successful files again', async () => {
    const h = harness(); h.fail(true); await h.message('start');
    assert.equal(h.messages.at(-1).state, 'retry');
    h.fail(false); await h.message('start');
    assert.equal(h.saved.size, 1);
    assert.equal(h.messages.at(-1).state, 'ready');
  });
  it('downloads only changed assets and removes their obsolete copy', async () => {
    const first = harness([entry('/cards/a.webp', 'card'), entry('/cards/b.webp', 'card')]); await first.message('start');
    const next = harness([entry('/cards/a.webp', 'new'), entry('/cards/b.webp', 'card')], first.saved); next.body('new');
    await next.message('start');
    assert.equal(next.requests.length, 1); assert.equal(next.saved.size, 2);
    assert.equal(await (await next.request('/cards/a.webp'))?.text(), 'new');
  });
  it('pauses a bounded queue and resumes without repeating completed files', async () => {
    const h = harness(['a', 'b', 'c', 'd'].map(name => entry(`/cards/${name}.webp`, 'card')));
    let release;
    h.hold(new Promise(resolve => { release = resolve; }));
    const downloading = h.message('start');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.requests.length, 2);
    await h.message('pause'); release(); await downloading;
    assert.equal(h.saved.size, 2); assert.equal(h.messages.at(-1).state, 'paused');
    await h.message('start'); assert.equal(h.requests.length, 4);
    assert.equal(h.messages.at(-1).state, 'ready');
  });
  it('repairs an evicted cache entry when the game requests it', async () => {
    const h = harness(); await h.message('start'); h.saved.clear();
    assert.equal(await (await h.request('/cards/a.webp'))?.text(), 'card');
    assert.equal(h.saved.size, 1); assert.equal(h.requests.length, 2);
  });
  it('does not cache broken deployment responses or mismatched content', async () => {
    const h = harness(); h.body('<html>not an image</html>'); await h.message('start');
    assert.equal(h.saved.size, 0); assert.equal(h.messages.at(-1).state, 'retry');
  });
  it('storage failure stops background downloads but keeps network gameplay available', async () => {
    const h = harness(); h.quota(); await h.message('start');
    assert.equal(h.messages.at(-1).state, 'storage');
    assert.equal(await (await h.request('/cards/a.webp'))?.text(), 'card');
  });
  it('never intercepts pages, code, multiplayer requests, or third-party requests', async () => {
    const h = harness();
    for (const url of ['/', '/assets/game.js', '/matchmake/create/codex_match', 'https://other.test/cards/a.webp']) {
      assert.equal(await h.request(url), undefined);
    }
    assert.equal(await h.request('/cards/a.webp', { method: 'POST' }), undefined);
  });
  it('serves media byte ranges from a saved full file', async () => {
    const h = harness(); await h.message('start'); h.fail(true);
    const r = await h.request('/cards/a.webp', { headers: { Range: 'bytes=1-2' } });
    assert.equal(r?.status, 206); assert.equal(await r?.text(), 'ar');
    assert.equal(r?.headers.get('Content-Range'), 'bytes 1-2/4');
  });
});
