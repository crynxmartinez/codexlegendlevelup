import fs from 'node:fs/promises';
import sharp from 'sharp';
const m=JSON.parse(await fs.readFile('art-source/anime-v2/manifest.json','utf8'));
const [deck,start='0',count='8']=process.argv.slice(2);
const cards=m.cards.filter(c=>c.deck===deck).slice(+start,+start+(+count));
const layers=[];
for(const [i,c] of cards.entries()){
 const image=await sharp(c.originalArt).resize(1060,1484).extract({left:60,top:1140,width:940,height:200}).png().toBuffer();
 layers.push({input:image,left:0,top:i*230+30});
 layers.push({input:Buffer.from(`<svg width="940" height="30"><text x="10" y="22" fill="white" font-size="18">${+start+i}: ${c.name.replaceAll('&','&amp;')}</text></svg>`),left:0,top:i*230});
}
await sharp({create:{width:940,height:cards.length*230,channels:3,background:'#111'}}).composite(layers).png().toFile(`art-source/anime-v2/flavor-review-${deck}-${start}.png`);
