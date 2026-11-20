import fs from 'node:fs/promises';
import sharp from 'sharp';
const cards=JSON.parse(await fs.readFile('art-source/rounded-v3/manifest.json','utf8'));
const previous=JSON.parse(await fs.readFile('src/data/card-art-v2.json','utf8'));
if(cards.length!==141||cards.some(c=>!previous[c.id]))throw Error('Active set coverage mismatch');
const mapping={};
for(const c of cards){
 for(const [size,height,quality] of [['web',1484,88],['board',512,85],['thumb',256,82]]){
  const dir=`assets/cards/${size}/rounded-v3`;await fs.mkdir(dir,{recursive:true});
  const file=`${dir}/${c.key}.webp`;
  await sharp(c.file).resize({height}).webp({quality}).toFile(file);
  if(size!=='board')(mapping[c.id]??={})[size==='web'?'art':'thumb']=file;
 }
}
await fs.writeFile('src/data/card-art-v2.json',JSON.stringify(mapping,null,2)+'\n');
console.log(`Exported ${cards.length} cards at three resolutions`);
