import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const asar=require('../toolchain/node_modules/@electron/asar');
const evidence='docs/desktop/evidence';
const player='release-desktop/win-unpacked';
const archive=path.join(player,'resources/app.asar');
const expected=JSON.parse(await fs.readFile(path.join(evidence,'staged-payload.json'),'utf8')).files;
const expectedNames=new Set(expected.map(row=>row.path));
const packaged=asar.listPackage(archive).map(name=>name.replaceAll('\\','/').replace(/^\//,''));
const files=[];
for(const name of packaged){
 const stat=asar.statFile(archive,path.normalize(name),false);
 assert.ok(!stat.link&&!stat.unpacked,'Unexpected link or unpacked file: '+name);
 if(stat.files)continue;
 assert.ok(expectedNames.has(name),'File outside shipping manifest: '+name);
 files.push(name);
}
assert.equal(files.length,expected.length,'Packaged file count differs from staging');
for(const row of expected){
 const bytes=asar.extractFile(archive,path.normalize(row.path));
 if(row.path==='package.json')assert.deepEqual(JSON.parse(bytes),JSON.parse(await fs.readFile('desktop-dist/app/package.json','utf8')));
 else assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256,'Packaged hash differs: '+row.path);
}
const manifest=JSON.parse(asar.extractFile(archive,'package.json'));
assert.equal(manifest.main,'shell/main.cjs');
assert.ok(files.includes(manifest.main)&&files.includes('renderer/index.html'));
for(const file of ['LICENSE.electron.txt','LICENSES.chromium.html','icudtl.dat','resources.pak','v8_context_snapshot.bin'])await fs.access(path.join(player,file));
const executable=await fs.readFile(path.join(player,'CodexLegend.exe'));
assert.equal(executable.toString('ascii',0,2),'MZ');
const pe=executable.readUInt32LE(0x3c);
assert.equal(executable.toString('ascii',pe,pe+4),'PE\u0000\u0000');
assert.equal(executable.readUInt16LE(pe+4),0x8664,'Expected Windows AMD64 executable');
const rows=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
 const name=path.join(dir,entry.name);
 if(entry.isDirectory())await walk(name);
 else {const bytes=await fs.readFile(name);rows.push({path:name.replaceAll('\\','/'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
}}
await walk(player);
assert.match(manifest.version,/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,'Expected a safe application version');
const installer=`release-desktop/CodexLegend-Setup-${manifest.version}-x64.exe`;
try{const bytes=await fs.readFile(installer);rows.push({path:installer,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.writeFile(path.join(evidence,'package-checksums.json'),JSON.stringify(rows,null,2));
await fs.writeFile(path.join(evidence,'asar-files.json'),JSON.stringify(files,null,2));
const report={at:new Date().toISOString(),executable:path.join(player,'CodexLegend.exe'),architecture:'Windows x64',appVersion:manifest.version,packagedGameFiles:files.length,stagedPayloadMatches:true,additionalNodeModules:false,runtimeFiles:rows.length,applicationBytes:rows.filter(row=>row.path.startsWith(player+'/')).reduce((total,row)=>total+row.bytes,0),installerPresent:rows.some(row=>row.path===installer),gameLaunched:false};
await fs.writeFile(path.join(evidence,'package-inspection.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
