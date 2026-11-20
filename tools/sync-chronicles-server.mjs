import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../game-server/package.json',import.meta.url));
const {build}=require('esbuild');
const destination=process.argv[2];
if(!destination)throw new Error('Pass the Chronicles project directory');
const project=resolve(import.meta.dirname,'..'),out=resolve(destination,'game-server/vendor/codex');
await mkdir(out,{recursive:true});
const result=await build({absWorkingDir:project,entryPoints:['game-server/src/shared-entry.ts'],outfile:resolve(out,'index.cjs'),bundle:true,platform:'node',format:'cjs',target:'node22',packages:'external',metafile:true,
  banner:{js:'// Generated from Codex Legends. Rebuild with tools/sync-chronicles-server.mjs; do not edit.'}});
const inputs={};for(const path of Object.keys(result.metafile.inputs).sort())inputs[path]=createHash('sha256').update(await readFile(resolve(project,path))).digest('hex');
await writeFile(resolve(out,'manifest.json'),JSON.stringify({sourceRepository:'https://github.com/crynxmartinez/codexlegendtcggame',protocol:require(resolve(out,'index.cjs')).CODEX_PROTOCOL,contentRevision:require(resolve(out,'index.cjs')).CODEX_CONTENT_REVISION,files:inputs},null,2)+'\n');
await writeFile(resolve(out,'index.d.cts'),"import { Room } from 'colyseus';\nimport type { Application } from 'express';\nexport declare class CodexMatch extends Room {}\nexport declare function registerCodexGuests(app: Application):void;\nexport declare const CODEX_STARTERS: Record<string,unknown>;\nexport declare const CODEX_PROTOCOL: number;\nexport declare const CODEX_CONTENT_REVISION: string;\n");
console.log(`Updated ${relative(project,out)} (${Object.keys(inputs).length} source files, SHA-256 manifest)`);
