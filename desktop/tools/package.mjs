import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
const tool=path.resolve('desktop/toolchain/node_modules/electron-builder/out/cli/cli.js');
try{await fs.access(tool);await fs.access('desktop/toolchain/node_modules/electron/dist/electron.exe');await fs.access('desktop/toolchain/package-lock.json');}catch{throw new Error('Desktop toolchain/runtime/lockfile is missing. Run npm run desktop:tools when registry and Electron downloads are accessible. No executable has been packaged.');}
const result=spawnSync(process.execPath,[tool,'--config','desktop/builder.cjs','--win','--x64',...(process.argv.includes('--dir')?['--dir']:[]),'--publish','never'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
const verification=spawnSync(process.execPath,['desktop/tools/verify-package.mjs'],{stdio:'inherit'});if(verification.status!==0)process.exit(verification.status??1);
