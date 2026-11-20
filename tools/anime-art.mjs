/** Resumable active-card-only artwork production. Original files remain intact. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = path.join(root, 'art-source/anime-v2');
const manifestPath = path.join(dir, 'manifest.json');
const args = process.argv.slice(2);
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const save = async m => fs.writeFile(manifestPath, JSON.stringify(m, null, 2) + '\n');
await fs.mkdir(dir, { recursive: true });
if (args[0] === 'init') {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { ALL_CARDS, isSelectableCard } = await vite.ssrLoadModule('/src/data/loader.ts');
    const active = Object.values(ALL_CARDS).filter(c => isSelectableCard(c) && ['Agta', 'Babaylan', 'Maguindanao'].includes(c.deck));
    let old; try { old = await read(manifestPath); } catch {}
    const cards = active.map(c => ({
      id: c.id, key: c.id.replaceAll('/', '--'), name: c.name, deck: c.deck,
      region: c.archipelago, type: c.type, level: c.level ?? null,
      power: c.power ?? null, defense: c.defense ?? null, subtypes: c.subtypes,
      persona: c.type === 'Unit' && /\[Persona\]/i.test(c.text),
      rules: c.text, flavor: c.flavor, originalArt: c.art, originalThumb: c.thumb,
      status: 'pending', ...(old?.cards.find(x => x.id === c.id) ?? {}),
    }));
    await save({ version: 2, scope: 'Active Agta, Babaylan and Maguindanao only; hidden and retired cards excluded', method: 'built-in image generation; transparent subject, background, reusable frame', cards });
    console.log(JSON.stringify({ count: cards.length, byDeck: Object.fromEntries(['Agta', 'Babaylan', 'Maguindanao'].map(d => [d, cards.filter(c => c.deck === d).length])) }));
  } finally { await vite.close(); }
} else if (args[0] === 'list') {
  const m = await read(manifestPath);
  console.log(JSON.stringify(m.cards.slice(Number(args[1] ?? 0), Number(args[2] ?? 141))));
} else if (args[0] === 'save') {
  const [, key, kind, source] = args;
  if (!['subject', 'background', 'card'].includes(kind)) throw Error('Unsupported artifact kind');
  const m = await read(manifestPath); const card = m.cards.find(c => c.key === key);
  if (!card) throw Error('Card is not active');
  const targetDir = path.join(dir, 'cards', key); await fs.mkdir(targetDir, { recursive: true });
  const target = path.join(targetDir, `${kind}.png`);
  await fs.copyFile(source, target);
  const meta = await sharp(target).metadata();
  if (kind === 'subject' && !meta.hasAlpha) throw Error('Subject needs actual alpha transparency');
  card[kind] = path.relative(root, target).replaceAll('\\', '/');
  card.status = card.card && card.subject ? 'needs-review' : `${kind}-generated`;
  await save(m); console.log(JSON.stringify({ id:card.id, kind, path:target, width:meta.width, height:meta.height, hasAlpha:meta.hasAlpha }));
} else if (args[0] === 'ingest') {
  const m = await read(manifestPath);
  for (const record of await read(path.resolve(args[1]))) {
    const card = m.cards.find(c => c.key === record.key);
    if (!card || !['subject','background'].includes(record.kind)) throw Error('Invalid production record');
    const targetDir = path.join(dir,'cards',card.key);
    await fs.mkdir(targetDir,{recursive:true});
    const target = path.join(targetDir,`${record.kind}.png`);
    const meta = await sharp(record.path).metadata();
    if(record.kind==='subject' && !meta.hasAlpha) throw Error(`Missing alpha: ${card.key}`);
    await fs.copyFile(record.path,target);
    card[record.kind] = path.relative(root,target).replaceAll('\\','/');
    if(record.kind === 'background') card.backgroundContainsSubject = record.containsSubject === true;
    card.status = card.card ? 'needs-review' : `${record.kind}-generated`;
    await fs.writeFile(path.join(targetDir,`${record.kind}-generation.json`),JSON.stringify(record,null,2)+'\n');
  }
  await save(m);
  console.log('Saved batch source files and prompts');
} else if (args[0] === 'status') {
  const m = await read(manifestPath);
  console.log(JSON.stringify({ total:m.cards.length, subjects:m.cards.filter(c=>c.subject).length, backgrounds:m.cards.filter(c=>c.background).length, cards:m.cards.filter(c=>c.card).length, integrated:m.cards.filter(c=>c.status==='integrated').length }));
} else {
  throw Error('Usage: node tools/anime-art.mjs init | list [start end] | save key subject|background|card source | status');
}
