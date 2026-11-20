/// <reference types="vitest" />
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { assetPackPlugin } from './tools/asset-pack.mjs';

/**
 * The game is the root page of this repository.
 *
 * `site/` holds the marketing homepage, which is moving to its own repo. It is
 * built here only while it is still present, so this config keeps working once
 * it is gone.
 */
const inputs: Record<string, string> = {
  main: resolve(__dirname, 'index.html'),
  translationReview: resolve(__dirname, 'translation-review.html'),
  titleReview: resolve(__dirname, 'title-review.html'),
};
if (existsSync(resolve(__dirname, 'site/index.html'))) {
  inputs.site = resolve(__dirname, 'site/index.html');
}

// `assets/` is served as the public root so card art and board art resolve the
// same way in dev and in a production build. A path stored as
// "assets/cards/web/x.webp" is requested as "/cards/web/x.webp".
export default defineConfig({
  plugins: [assetPackPlugin()],
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: inputs },
  },
  server: { port: 5173 },
  // Vitest stubs CSS imports to an empty string by default, which silently
  // turned `import css from './style.css?raw'` into `''` — so a test asserting
  // things about the stylesheet passed by finding nothing in it. The reference
  // directive above types this key without importing vitest/config here, which
  // would put a devDependency in the production build's import graph.
  test: { css: true, include: ['src/**/*.test.ts', 'game-server/tests/**/*.test.ts'], pool: 'threads', maxWorkers: 2, minWorkers: 1 },
});
