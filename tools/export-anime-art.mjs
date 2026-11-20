import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root,'art-source/anime-v2/manifest.json'),'utf8'));
const mapping = {};
if (manifest.cards.length !== 141 || manifest.cards.some(c => c.status !== 'approved')) {
  throw Error('Review the complete active set before replacing the runtime artwork mapping.');
}
// Reject changed or incomplete masters before touching any runtime output.
for (const c of manifest.cards) {
  if (!c.subject || !c.background || !c.card || !['Agta','Babaylan','Maguindanao'].includes(c.deck)) throw Error(`Incomplete card: ${c.id}`);
  const source = await fs.readFile(path.join(root,c.card));
  const meta = await sharp(source).metadata();
  if (meta.width !== 1060 || meta.height !== 1484 ||
      createHash('sha256').update(source).digest('hex') !== c.review?.sha256) {
    throw Error(`Framed master must be reviewed again: ${c.id}`);
  }
}
for (const c of manifest.cards.filter(c => c.status === 'approved')) {
  if (!c.subject || !c.background || !c.card || !['Agta','Babaylan','Maguindanao'].includes(c.deck)) throw Error(`Incomplete card: ${c.id}`);
  for (const [size,height,quality] of [['web',1484,88],['board',512,85],['thumb',256,82]]) {
    const relative = `assets/cards/${size}/anime-v2/${c.key}.webp`;
    const destination = path.join(root,relative);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await sharp(path.join(root,c.card)).resize({height}).webp({quality}).toFile(destination);
    if(size !== 'board') (mapping[c.id] ??= {})[size === 'web' ? 'art' : 'thumb'] = relative;
  }
}
await fs.writeFile(path.join(root,'src/data/card-art-v2.json'),JSON.stringify(mapping,null,2)+'\n');
console.log(`Exported ${Object.keys(mapping).length} reviewed active cards`);
