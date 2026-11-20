import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const manifest=JSON.parse(await fs.readFile('docs/desktop/evidence/staged-payload.json','utf8'));
for(const row of manifest.files){assert.match(row.path,/^(renderer\/|shell\/|licenses\/|package\.json$)/);const bytes=await fs.readFile('desktop-dist/app/'+row.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);}
const html=await fs.readFile('desktop-dist/app/renderer/index.html','utf8');assert.ok(!/googletagmanager|gtag\(/.test(html));
for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)[^"]*"/g))await fs.access('desktop-dist/app/renderer'+match[1]);
const model=await fs.readFile('desktop-dist/app/renderer/ui/menu-v1/model.mjs','utf8');assert.ok(model.includes('offlineFriends[4]=true'));
const report={at:new Date().toISOString(),stagedFiles:manifest.files.length,stagedBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),stagedHashesMatch:true,rootEntryAndDirectDependenciesPresent:true,desktopAnalytics:false};
await fs.writeFile('docs/desktop/evidence/staging-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
