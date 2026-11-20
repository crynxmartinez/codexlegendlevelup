const path = require('node:path');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { Readable } = require('node:stream');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav','.m4a':'audio/mp4','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.mp4':'video/mp4','.txt':'text/plain'};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
function resolveResource(root,raw){const u=new URL(raw);if(u.protocol!=='codex:'||u.hostname!=='game'||u.port||u.username||u.password)throw new Error('Invalid origin');const name=decodeURIComponent(u.pathname);if(name.includes('\\')||name.includes('\0')||name.split('/').includes('..')||name.includes(':'))throw new Error('Invalid path');const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(target!==root&&!target.startsWith(root+path.sep))throw new Error('Outside bundle');return target;}
async function serve(root,request){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  let target,stat;try{target=resolveResource(root,request.url);stat=await fs.stat(target);if(!stat.isFile())throw new Error();const real=await fs.realpath(target),base=await fs.realpath(root);if(!real.startsWith(base+path.sep))throw new Error();}catch{return new Response('Resource not found',{status:404});}
  const headers={'Content-Type':types[path.extname(target).toLowerCase()]||'application/octet-stream','Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  let start=0,end=stat.size-1,status=200;const range=request.headers.get('range');
  if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${stat.size}`}});if(m[1]){start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;}else{start=Math.max(0,stat.size-Number(m[2]));}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=stat.size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${stat.size}`}});status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
  headers['Content-Length']=String(Math.max(0,end-start+1));return new Response(request.method==='HEAD'||stat.size===0?null:Readable.toWeb(createReadStream(target,{start,end})),{status,headers});
}
module.exports={serve,resolveResource};
