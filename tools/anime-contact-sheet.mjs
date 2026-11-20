import fs from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
const manifest=JSON.parse(await fs.readFile('art-source/anime-v2/manifest.json','utf8'));
const [deck='Babaylan',kind='originalArt',start='0',count='12']=process.argv.slice(2);
const cards=manifest.cards.filter(c=>c.deck===deck && c[kind]).slice(+start,+start+(+count));
const width=280,height=420,cols=4;
const parts=[];
for(let i=0;i<cards.length;i++){
 const card=cards[i];
 const input=await sharp(card[kind]).resize(width,height-26,{fit:'contain',background:'#151515'}).png().toBuffer();
 parts.push({input,left:(i%cols)*width,top:Math.floor(i/cols)*height});
 const label=card.name.replaceAll('&','&amp;').replaceAll('<','&lt;');
 parts.push({input:Buffer.from(`<svg width="280" height="26"><rect width="280" height="26" fill="#111"/><text x="8" y="18" fill="white" font-size="11">${+start+i}: ${label}</text></svg>`),left:(i%cols)*width,top:Math.floor(i/cols)*height+height-26});
}
const out=`art-source/anime-v2/${deck}-${kind}-${start}-contact.png`;
await sharp({create:{width:cols*width,height:Math.ceil(cards.length/cols)*height,channels:3,background:'#111'}}).composite(parts).png().toFile(out);
console.log(path.resolve(out));
