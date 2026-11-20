import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { readFile } from 'node:fs/promises';
import { assertPrivacy, assertAgreement } from './assert-views.mjs';
const base=process.env.CODEX_TEST_SERVER||'http://127.0.0.1:2572',sdk=new Client(base);
const version=await(await fetch(base+'/codex/health')).json();
const deck=JSON.parse(await readFile(new URL('../../decks/agta-set-1.json',import.meta.url),'utf8'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,label){for(let i=0;i<400;i++){if(fn())return;await delay(25);}throw Error(label);}
async function options(name){const r=await fetch(base+'/codex/guest',{method:'POST',headers:{Origin:'http://127.0.0.1:5176'}});assert.equal(r.status,200);return {guest:(await r.json()).token,name,protocol:version.protocol,content:version.content,setup:{deck}};}
// Reuse only test identities after their rooms close. This stays below the real guest rate limit.
const guests=[await options('Recovery A'),await options('Recovery B')];
for(const firstAway of [0,1])for(const bothAway of [false,true]) {
  const clients=[],lobby=[],views=[];
  function bind(client,seat){clients[seat]=client;lobby[seat]=null;client.onMessage('*',()=>{});client.onMessage('lobby',v=>lobby[seat]=v);client.onMessage('view',v=>{assertPrivacy(v);views[seat]=v;});client.send('sync');}
  try {
    bind(await sdk.create('codex_match',guests[0]),0);await wait(()=>lobby[0],'host');
    bind(await sdk.joinById(clients[0].roomId,{...guests[1],invite:lobby[0].invite}),1);await wait(()=>lobby[1],'peer');
    for(const c of clients)c.send('ready',true);await wait(()=>views.length===2&&views.every(Boolean),'initial frames');
    const initial=views.map(v=>v.state.players[0].hand.length);
    const tokens=clients.map(c=>c.reconnectionToken);
    clients[firstAway].send('loaded');await delay(60);
    clients[firstAway].reconnection.enabled=false;clients[firstAway].connection.close();
    const other=1-firstAway;await wait(()=>lobby[other].seats[firstAway].connected===false,'first disconnected');
    if(bothAway){clients[other].send('loaded');await delay(60);clients[other].reconnection.enabled=false;clients[other].connection.close();await delay(150);}
    // One reconnect before the final loaded message also tests delayed artwork.
    if(!bothAway){bind(await sdk.reconnect(tokens[firstAway]),firstAway);await wait(()=>lobby[firstAway]?.seats.every(s=>s.connected),'reconnected while still loading');assert.equal(lobby[firstAway].loading,true);clients[other].send('loaded');}
    else {
      clients[other]=await sdk.reconnect(tokens[other]);bind(clients[other],other);
      await wait(()=>lobby[other]?.seats[other].connected&&!lobby[other].seats[firstAway].connected,'only one returned');assert.equal(lobby[other].loading,true);
      bind(await sdk.reconnect(tokens[firstAway]),firstAway);
    }
    await wait(()=>views.every(v=>v.state.phase!=='start'),'ready reconnect must release loading');
    await wait(()=>views[0].revision===views[1].revision,'matching frames');assertAgreement(...views);
    // Existing rule: the first player skips their first-turn draw.
    for(const seat of [0,1])assert.equal(views[seat].state.players[0].hand.length,initial[seat],'recovery must not add an opening draw');
    const stable=views.map(v=>JSON.stringify(v.state));
    for(const c of clients){c.send('loaded');c.send('loaded');c.send('sync');}
    await delay(120);assert.deepEqual(views.map(v=>JSON.stringify(v.state)),stable,'duplicate readiness cannot redraw');
    console.log(`PASS loading recovery seat ${firstAway}, both disconnected ${bothAway}; no extra opening draw; both views agree`);
  }finally{await Promise.allSettled(clients.map(c=>c.leave()));await delay(100);}
}
