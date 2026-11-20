import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({publicDir:false,define:{'import.meta.env.VITE_GAME_SERVER_URL':JSON.stringify('')},build:{outDir:'dist-desktop',emptyOutDir:true,rollupOptions:{input:resolve('desktop/index.html')}}});
