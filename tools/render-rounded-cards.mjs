/** Recompose approved illustrations using the shared rounded v3 frame. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
const base='art-source/anime-v2';
const out='art-source/rounded-v3';
const m=JSON.parse(await fs.readFile(`${base}/manifest.json`,'utf8'));
const W=1060,H=1484;
const svg=s=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`);
const frame=await sharp(`${out}/frame.png`).resize(W,H).ensureAlpha().raw().toBuffer();
if(frame[(700*W+530)*4+3]>0) throw Error('Frame aperture must be transparent');
function hue(data,i,h){
 const vals=[data[i],data[i+1],data[i+2]],max=Math.max(...vals),min=Math.min(...vals),c=max-min;
 const x=c*(1-Math.abs((h/60)%2-1));
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 rgb.forEach((v,k)=>data[i+k]=Math.round(v+min));
}
const glyphs={};
for(const region of ['luzon','visayas','mindanao']){
 const guide=region==='mindanao'?sharp(`${base}/templates/mindanao-lettering.png`).extract({left:400,top:50,width:800,height:220}):sharp(`output/regional-card-types-2026-10-08/${region}-lettering-guide.png`);
 const {data,info}=await guide.ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const visible=region==='mindanao'?data[i]>180&&data[i+1]>180&&data[i+2]>180:data[i]>100&&data[i+1]>70&&data[i+2]<160;data[i+3]=visible?255:0;data[i]=244;data[i+1]=202;data[i+2]=82;}
 glyphs[region]=await sharp(data,{raw:{...info,channels:4}}).trim().resize({width:250,height:44,fit:'inside'}).png().toBuffer();
}
const records=[];
const sample=process.argv.includes('--number-sample');
const selected=sample?m.cards.filter(c=>c.key==='maguindanao--set-1--boat-watching-tonong-tomitay'):process.argv.includes('--preview')?m.cards.filter((c,i,a)=>a.findIndex(x=>x.region===c.region&&x.type===c.type&&x.persona===c.persona)===i):m.cards;
for(const c of selected){
 const region=c.region.toLowerCase(),raw=Buffer.from(frame);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4;if(!raw[i+3])continue;
  if(raw[i]>raw[i+1]*2.8&&raw[i]>raw[i+2]*2)hue(raw,i,{luzon:48,visayas:225,mindanao:0}[region]);
  if(x>65&&x<208&&y>65&&y<195&&raw[i+2]>raw[i]*1.3&&raw[i+2]>raw[i+1]*1.1)hue(raw,i,{Unit:220,Force:32,Sentry:143,Action:280,Codex:355}[c.type]);
 }
 const layers=[];
 if(!c.backgroundContainsSubject){const subject=await sharp(c.subject).resize({width:984,height:1120,fit:'inside'}).png().toBuffer();const sm=await sharp(subject).metadata();layers.push({input:subject,left:Math.round((W-sm.width)/2),top:155});}
 layers.push({input:await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toBuffer(),left:0,top:0});
 if(c.persona){const banner=await sharp(`${base}/templates/${region}-persona.png`).resize(W,H).extract({left:875,top:0,width:133,height:215}).png().toBuffer();layers.push({input:banner,left:875,top:0});}
 if(c.type!=='Codex'){
  const text=svg(`<text x="140" y="166" text-anchor="middle" font-family="Times New Roman" font-weight="bold" font-size="112" fill="#fff4cb" stroke="#262019" stroke-width="2" paint-order="stroke">${c.level??0}</text>`);
  {
   const number=await sharp(text).trim({background:'#00000000',threshold:0}).png().toBuffer();
   const size=await sharp(number).metadata();
   layers.push({input:number,left:Math.round(146-size.width/2),top:Math.round(132-size.height/2)});
  }
 }
 const glyph=glyphs[region],gm=await sharp(glyph).metadata();layers.push({input:glyph,left:Math.round((W-gm.width)/2),top:Math.round(1411-gm.height/2)});
 await fs.mkdir(`${out}/cards`,{recursive:true});
 const file=sample?`${out}/number-centered-sample.png`:`${out}/cards/${c.key}.png`;
 const composed=await sharp(c.background).resize(W,H).composite(layers).png().toBuffer();
 await sharp(composed).composite([{input:svg('<rect x="24" y="20" width="1012" height="1444" rx="30" fill="white"/>'),blend:'dest-in'}]).png().toFile(file);
 records.push({id:c.id,key:c.key,region:c.region,type:c.type,persona:c.persona,file});
 console.log(c.key);
}
if(!sample)await fs.writeFile(`${out}/${process.argv.includes('--preview')?'preview':'manifest'}.json`,JSON.stringify(records,null,2));
