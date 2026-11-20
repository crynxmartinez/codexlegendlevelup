/** Read-only inventory. Generated card, audio and cutscene URLs are included. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const walk = p => fs.readdirSync(p, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(p, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const relative = p => path.relative(root, p).replaceAll('\\', '/');
const sources = walk(path.join(root, 'src')).filter(p => /\.(ts|css)$/.test(p) && !p.endsWith('.test.ts'));
const sourceText = sources.map(p => fs.readFileSync(p, 'utf8')).join('\n') + read('index.html');
const required = new Set(['assets/robots.txt', 'assets/sitemap.xml', 'assets/fonts/LICENSE.txt']);
for (const region of ['luzon', 'visayas', 'mindanao']) required.add(`assets/ui/philippines-${region}.webp`);
const cards = [...JSON.parse(read('src/data/cards.json')), ...JSON.parse(read('src/data/set-1.json'))];
const artwork = JSON.parse(read('src/data/card-art-v2.json'));
// Versioned menu/arena kit, including dynamically selected portraits and icons.
// Keep this explicit registry reviewed; do not allow every file under assets/.
for (const file of JSON.parse(read('tools/runtime-ui-assets.json'))) required.add(file);
// Retain the original catalogue for saved games; require every active override too.
for (const [id, replacement] of Object.entries(artwork)) {
  const card = cards.find(card => card.id === id);
  // Active eligibility (including the three promoted Sentries) is checked
  // against the effective loader by card-art-v2.test.ts.
  if (!card) throw new Error(`Unknown artwork override: ${id}`);
  for (const file of [replacement.art, replacement.thumb, replacement.art?.replace('/web/', '/board/')]) {
    if (!file) throw new Error(`Incomplete artwork override: ${id}`);
    required.add(file);
  }
}
for (const card of cards) {
  for (const file of [card.art, card.thumb, card.art?.replace('/web/', '/board/')]) {
    if (file) required.add(file);
  }
}
// These files are requested by combining the cue name and variation at runtime.
const sampleList = read('src/ui/sfx.ts').match(/const sampleNames = \[([^\]]+)\]/)?.[1];
if (!sampleList) throw new Error('Audio registry changed; update the asset audit.');
for (const match of sampleList.matchAll(/'([^']+)'/g)) {
  for (let i = 0; i < 3; i++) required.add(`assets/audio/${match[1]}-${i}.wav`);
}
// Optional cutscenes are discovered from card ids, full names or short names.
const optional = new Set();
// Retain the previously published anime frame exports for old clients/replays.
// Current cards use the rounded-v3 overrides above; legacy art is not preloaded.
for (const id of Object.keys(artwork)) {
  for (const size of ['web', 'board', 'thumb']) optional.add(`assets/cards/${size}/anime-v2/${id.replaceAll('/', '--')}.webp`);
}
for (const card of cards) {
  for (const stem of [card.id.replaceAll('/', '-'), card.name, card.name.split(',').at(-1).trim()]) {
    for (const ext of ['webm', 'mp4']) optional.add(`assets/ui/cutscenes/${stem}.${ext}`);
  }
}
// Quoted same-origin paths cover backgrounds, fonts, soundtrack and fixed UI art.
for (const match of sourceText.matchAll(/["'`]\/(ui|music|fonts|audio|cards)\/([^"'`\n]+)["'`]/g)) {
  if (!match[2].includes('${') && /\.(webp|png|jpg|svg|m4a|mp3|wav|woff2|txt)$/.test(match[2])) required.add(`assets/${match[1]}/${match[2]}`);
}
const files = walk(path.join(root, 'assets'));
const available = new Set(files.map(relative));
const missing = [...required].filter(p => !available.has(p));
const review = files.map(relative).filter(p => !required.has(p) && !optional.has(p));
const bytes = files.reduce((sum, p) => sum + fs.statSync(p).size, 0);
console.log(JSON.stringify({ files: files.length, bytes, MiB: +(bytes / 1048576).toFixed(2), missing, review }, null, 2));
if (missing.length || review.length) process.exitCode = 1;
