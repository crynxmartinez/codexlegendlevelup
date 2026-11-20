/** Fixed typography and reusable frame composition; never regenerates approved subjects. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(root, 'art-source/anime-v2');
const manifestFile = path.join(base, 'manifest.json');
const m = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const key = process.argv[2];
const card = m.cards.find(c => c.key === key);
if (!card?.subject || !card?.background) throw Error('Both approved source layers are required');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"','&quot;');
const svg = text => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1484">${text}</svg>`);
const font = 'Times New Roman';
const label = (text,x,y,size,extra='') => `<text x="${x+1}" y="${y+2}" font-family="${font}" font-size="${size}" fill="#111" ${extra}>${esc(text)}</text><text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="#fff4cb" ${extra}>${esc(text)}</text>`;
const region = card.region.toLowerCase();
const bottomOffset = region === 'mindanao' ? 26 : 0;
const framePath = path.join(base, 'templates', `${region}-common.png`);
let frame = await sharp(framePath).resize(1060,1484).png().toBuffer();
// Recolor gemstone pixels only, retaining the shared faceting and gold mount.
if (card.type !== 'Action') {
  const raw = await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const target = {Unit:220, Force:32, Sentry:143, Codex:355}[card.type];
  for(let y=38;y<176;y++) for(let x=52;x<187;x++) {
    if (((x-120)/69)**2+((y-108)/72)**2>1) continue;
    const i=(y*1060+x)*4, r=raw.data[i]/255,g=raw.data[i+1]/255,b=raw.data[i+2]/255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    if(delta<0.10 || b<g*1.15) continue;
    const sat=delta/max, h=target/60, c=max*sat, t=c*(1-Math.abs(h%2-1)),v=max-c;
    const rgb=h<1?[c,t,0]:h<2?[t,c,0]:h<3?[0,c,t]:h<4?[0,t,c]:h<5?[t,0,c]:[c,0,t];
    rgb.forEach((n,k)=>raw.data[i+k]=Math.round((n+v)*255));
  }
  frame=await sharp(raw.data,{raw:{width:1060,height:1484,channels:4}}).png().toBuffer();
}
const layers = [];
const subject = await sharp(path.join(root, card.subject)).resize({width:984,height:1120,fit:'inside'}).png().toBuffer();
const sm = await sharp(subject).metadata();
if (!card.backgroundContainsSubject) layers.push({input:subject,left:Math.round((1060-sm.width)/2),top:155});
layers.push({input:frame,left:0,top:0});
if(card.persona) {
  const banner=await sharp(path.join(base,'templates',`${region}-persona.png`)).resize(1060,1484).extract({left:865,top:0,width:171,height:235}).png().toBuffer();
  layers.push({input:banner,left:865,top:0});
}
if (['Unit','Force'].includes(card.type)) {
  const plaque=await sharp(path.join(base,'templates','luzon-persona.png')).extract({left:764,top:1298,width:294,height:112}).png().toBuffer();
  layers.push({input:plaque,left:764,top:1298+bottomOffset});
}
if (['Unit','Force'].includes(card.type) && card.defense>0) {
  const tabMask=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="70" height="300"><path d="M35 0 L70 34 V267 L35 300 L0 267 V34 Z" fill="white"/></svg>');
  const tab=await sharp(path.join(root,'docs/design/card-frames/v1/masters/unit-defense-master.png')).extract({left:0,top:480,width:70,height:300}).composite([{input:tabMask,blend:'dest-in'}]).png().toBuffer();
  layers.push({input:tab,left:0,top:480});
  layers.push({input:svg(`<defs><linearGradient id="defense"><stop stop-color="#021a09"/><stop offset=".55" stop-color="#06431b"/><stop offset="1" stop-color="#01230c"/></linearGradient></defs><rect x="9" y="578" width="49" height="165" fill="url(#defense)"/><text transform="translate(23 661) rotate(90)" font-family="Times New Roman" font-size="37" text-anchor="middle" fill="#fff4cb">${Number(card.defense).toLocaleString('en-US')}</text>`),left:0,top:0});
}
// Measure and render with the same SVG engine; Pango and SVG font metrics differ.
const fittedLabel = async (value, maxWidth, preferred, x, centerY, centered=false) => {
  const source=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="180">${label(value,5,120,preferred)}</svg>`);
  let rendered=await sharp(source).trim({background:'#00000000'}).png().toBuffer();
  let size=await sharp(rendered).metadata();
  if(size.width>maxWidth) {
    rendered=await sharp(rendered).resize({width:maxWidth}).png().toBuffer();
    size=await sharp(rendered).metadata();
  }
  layers.push({input:rendered,left:Math.round(centered?x-size.width/2:x),top:Math.round(centerY-size.height/2)});
};
const titleWidth = card.persona ? 610 : 720;
await fittedLabel(card.name.toUpperCase(),titleWidth,38,220+titleWidth/2,96,true);
let text = '';
if (card.type !== 'Codex') text += label(card.level ?? 0,124,145,116,'text-anchor="middle" font-weight="bold"');
const tribeTypes = card.subtypes.filter(s=>!s.endsWith(' Arch') && s!=='Persona');
if(card.type==='Force' && !tribeTypes.includes('Force')) tribeTypes.push('Force');
if(card.type==='Sentry' && !tribeTypes.includes('Sentry')) tribeTypes.push('Sentry');
const subtype = card.type === 'Codex' ? 'Codex' : card.type === 'Action' ? 'Normal Action' : tribeTypes.join(' / ') || card.type;
await fittedLabel(subtype,242,29,144,1330+bottomOffset);
text += `<text x="144" y="${1382+bottomOffset}" font-family="Georgia" font-size="27" fill="#0b0c0c">${esc(card.region)}</text>`;
if (['Unit','Force'].includes(card.type)) text += label(Number(card.power).toLocaleString('en-US'),1014,1368+bottomOffset,52,'text-anchor="end" font-weight="bold"');
// Lettering is copied from the previously verified regional guides, not drawn by AI per card.
const guidePath = path.join(root,`output/regional-card-types-2026-10-08/${region}-lettering-guide.png`);
const guide = region==='mindanao' ? sharp(path.join(base,'templates','mindanao-lettering.png')).extract({left:400,top:50,width:800,height:220}) : sharp(guidePath);
const { data,info } = await guide.ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4) {
  const visible = region === 'mindanao' ? data[i]>180 && data[i+1]>180 && data[i+2]>180 : data[i]>100 && data[i+1]>70 && data[i+2]<160;
  data[i+3] = visible ? 255 : 0;
  data[i]=244; data[i+1]=202; data[i+2]=82;
}
const hasPower=['Unit','Force'].includes(card.type);
const glyph = await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).trim().resize({width:hasPower?240:360,height:66,fit:'inside'}).png().toBuffer();
const gm = await sharp(glyph).metadata();
layers.push({input:glyph,left:Math.round((hasPower?585:700)-gm.width/2),top:1331+bottomOffset});
const flavors={};
for (const file of (await fs.readdir(base)).filter(f=>/^flavor.*\.json$/.test(f)).sort()) Object.assign(flavors,JSON.parse(await fs.readFile(path.join(base,file),'utf8')));
const flavor=flavors[card.key] || card.flavor;
if (flavor) {
  const words=flavor.split(/\s+/), lines=[''];
  for(const word of words) {
    const n=lines.length-1;
    if((lines[n]+' '+word).trim().length>62) lines.push(word);
    else lines[n]=(lines[n]+' '+word).trim();
  }
  text += `<defs><linearGradient id="flavorShade" x2="0" y2="1"><stop stop-color="#07121b" stop-opacity="0"/><stop offset=".5" stop-color="#07121b" stop-opacity=".8"/><stop offset="1" stop-color="#07121b" stop-opacity="0"/></linearGradient></defs><rect x="80" y="1185" width="900" height="110" fill="url(#flavorShade)"/>`;
  lines.slice(0,2).forEach((line,i)=>text+=`<text x="530" y="${lines.length===1?1250:1227+i*34}" font-family="Georgia" font-size="26" font-style="italic" text-anchor="middle" fill="#ffe79a">${esc(line)}</text>`);
  text+='<path d="M220 1280 H515 L530 1275 L545 1280 H840" fill="none" stroke="#d9ae49" stroke-width="2"/>';
}
layers.push({input:svg(text),left:0,top:0});
const out = path.join(base,'cards',key,'card.png');
await sharp(path.join(root,card.background)).resize(1060,1484).composite(layers).png().toFile(out);
card.card = path.relative(root,out).replaceAll('\\','/'); card.status='needs-review';
await fs.writeFile(manifestFile,JSON.stringify(m,null,2)+'\n');
console.log(out);
