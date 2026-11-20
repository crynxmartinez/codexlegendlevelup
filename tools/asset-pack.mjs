import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';

/** Explicit catalogue: no hidden cards, source PNGs, or unused UI experiments. */
export function createAssetPack(root) {
  const cards = JSON.parse(readFileSync(resolve(root, 'src/data/card-art-v2.json'), 'utf8'));
  const bossEffects = JSON.parse(readFileSync(resolve(root, 'assets/effects/boss-attacks-v2/manifest.json'), 'utf8')).entries;
  if (bossEffects.length !== 20 || new Set(bossEffects.map(entry => entry.url)).size !== 20
    || bossEffects.some(entry => !/^\/effects\/boss-attacks-v2\/[a-z0-9-]+\.webp$/.test(entry.url))) {
    throw new Error('Expected exactly 20 packed V2 boss attack assets.');
  }
  const paths = [
    'ui/card-back.webp', 'ui/game-mat-fractured-v1.webp', 'ui/fullscreen-fractured-v1.webp',
    'ui/anime-v1/seal-solar-baybayin.webp',
    'ui/role-symbols-v1/ally.svg', 'ui/role-symbols-v1/persona.svg',
    ...['power', 'defense', 'barrier', 'plays'].map(kind => `ui/stat-symbols-v1/${kind}.svg`),
    'ui/logo.png', ...['luzon', 'visayas', 'mindanao'].map(r => `ui/philippines-${r}.webp`),
    ...readdirSync(resolve(root, 'assets/fonts')).filter(f => f.endsWith('.woff2')).map(f => `fonts/${f}`),
    ...Object.values(cards).flatMap(c => [c.thumb, c.art.replace('/web/', '/board/')]).map(p => p.replace(/^assets\//, '')),
    ...readdirSync(resolve(root, 'assets/audio')).filter(f => f.endsWith('.wav')).map(f => `audio/${f}`),
    // Cache only the active V2 exports. V1 originals remain on disk, outside this pack.
    ...bossEffects.map(entry => entry.url.slice(1)),
    'ui/cutscenes/Datu Salik.webm',
    ...Object.values(cards).map(c => c.art.replace(/^assets\//, '')),
    ...readdirSync(resolve(root, 'assets/music')).filter(f => f.endsWith('.m4a')).map(f => `music/${f}`),
  ];
  const types = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/', '.webm': 'video/webm', '.m4a': 'audio/' };
  const entries = [...new Set(paths)].map(path => {
    const file = readFileSync(resolve(root, 'assets', path));
    return { url: encodeURI(`/${path}`), revision: createHash('sha256').update(file).digest('hex'), bytes: file.length, type: types[extname(path)] };
  });
  return { version: createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 16),
    totalBytes: entries.reduce((sum, e) => sum + e.bytes, 0), entries };
}

/** Same worker in development and production; hashes change whenever an asset changes. */
export function assetPackPlugin() {
  let root;
  const worker = () => readFileSync(resolve(root, 'tools/asset-worker.js'), 'utf8')
    .replace('__ASSET_PACK__', JSON.stringify(createAssetPack(root)));
  return {
    name: 'codex-saved-assets',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/asset-worker.js') return next();
        try {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(worker());
        } catch (error) { next(error); }
      });
    },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'asset-worker.js', source: worker() }); },
  };
}
