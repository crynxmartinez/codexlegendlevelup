import { MATCH_PROTOCOL, CONTENT_REVISION } from '../../src/pvp/catalog.js';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import type { Application } from 'express';
interface Guest { id:string; expires:number }
// A separate signing domain lets Cloud workers validate guests consistently.
// Tavern tickets are never accepted as Codex sessions, or vice versa.
const key=createHmac('sha256',process.env.CODEX_GUEST_SECRET??process.env.MATCH_TICKET_SECRET??randomBytes(32)).update('codex-private-guests-v1').digest();
const sign=(body:string)=>createHmac('sha256',key).update(body).digest('base64url');
const attempts=new Map<string,{n:number;until:number}>();
export const occupied=new Map<string,string>();
export function guest(token:unknown):Guest {
  if(typeof token!=='string'||token.length>512)throw new Error('A guest session is required');
  const [body,signature,...extra]=token.split('.');
  if(!body||!signature||extra.length)throw new Error('Invalid guest session');
  const expected=Buffer.from(sign(body)),provided=Buffer.from(signature);
  if(expected.length!==provided.length||!timingSafeEqual(expected,provided))throw new Error('Invalid guest session');
  let g:Guest;try{g=JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw new Error('Invalid guest session');}
  if(!g||typeof g.id!=='string'||!/^[a-f0-9]{32}$/.test(g.id)||!Number.isFinite(g.expires)||g.expires<Date.now())throw new Error('Guest session expired. Reconnect from the lobby.');return g;
}
export function registerCodexGuests(app:Application):void {
  app.post('/codex/guest',(req,res)=>{
    const origin=req.headers.origin;
    const allowed=(process.env.CODEX_ORIGINS??'http://127.0.0.1:5174,http://localhost:5174,https://game.codexlegendtcg.site,https://codexlegendtcggame.vercel.app').split(',');
    if(!origin||!allowed.includes(origin)){res.status(403).json({error:'This game address is not allowed'});return;}
    res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
    const ip=req.ip??req.socket.remoteAddress??'unknown',now=Date.now();
    for(const [key,a] of attempts)if(a.until<now)attempts.delete(key);
    const a=attempts.get(ip)??{n:0,until:now+60000};a.n++;attempts.set(ip,a);
    if(a.n>20||attempts.size>10000){res.status(429).json({error:'Please wait before reconnecting'});return;}
    const body=Buffer.from(JSON.stringify({id:randomBytes(16).toString('hex'),expires:now+86400000})).toString('base64url');
    const token=`${body}.${sign(body)}`;
    res.json({token});
  });
  app.get('/codex/health',(_req,res)=>res.json({ok:true,game:'codex-legends',protocol:MATCH_PROTOCOL,content:CONTENT_REVISION,contentRevision:CONTENT_REVISION,openingVersion:1}));
}
