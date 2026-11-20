import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Lossless re-encoding: original artwork, pixel dimensions and source PNGs stay intact.
for (const name of ['game-mat-fractured-v1', 'fullscreen-fractured-v1']) {
  const source = new URL(`../art-source/duel-backgrounds/${name}.png`, import.meta.url);
  const target = new URL(`../assets/ui/${name}.webp`, import.meta.url);
  const data = await readFile(source);
  await sharp(data).webp({ lossless: true, effort: 6 }).toFile(fileURLToPath(target));
  const before = await sharp(data).ensureAlpha().raw().toBuffer();
  const after = await sharp(await readFile(target)).ensureAlpha().raw().toBuffer();
  if (!before.equals(after)) throw new Error(`Pixel comparison failed: ${name}`);
  const bytes = (await stat(target)).size;
  console.log(`${name}: ${data.length} -> ${bytes} bytes; identical decoded pixels`);
}
