import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { readFile } from 'node:fs/promises';
const base = process.env.CODEX_TEST_SERVER || 'http://127.0.0.1:2571';
const sdk = new Client(base);
const health = await (await fetch(`${base}/codex/health`)).json();
const deck = JSON.parse(await readFile(new URL('../../decks/agta-set-1.json', import.meta.url), 'utf8'));
const wait = async (predicate, label) => { for(let i=0;i<300;i++){if(predicate())return;await new Promise(r=>setTimeout(r,30));}throw Error(label); };
async function options(name, modern) {
  const response=await fetch(`${base}/codex/guest`,{method:'POST',headers:{Origin:'http://127.0.0.1:5176'}});
  assert.equal(response.status,200);
  return {guest:(await response.json()).token,name,protocol:health.protocol,content:health.content,setup:{deck,choice:{}},...(modern?{openingVersion:1}:{})};
}
async function test(modernPeer) {
  const a=await sdk.create('codex_match',await options('A',true));
  let b; const lobby=[],frames=[];
  const bind=(client,seat)=>{client.onMessage('*',()=>{});client.onMessage('lobby',m=>lobby[seat]=m);client.onMessage('view',m=>frames[seat]=m);client.send('sync');};
  try {
    bind(a,0);await wait(()=>lobby[0],'host lobby');
    b=await sdk.joinById(a.roomId,{...await options('B',modernPeer),invite:lobby[0].invite});bind(b,1);
    await wait(()=>lobby[0].seats.length===2&&lobby[1],'peer lobby');
    a.send('ready',true);b.send('ready',true);
    if(!modernPeer){await wait(()=>frames[0]&&frames[1],'legacy fallback');assert.equal(lobby[0].openingVersion,0);assert.equal(lobby[0].opening,undefined);console.log('PASS mixed-version legacy fallback');return;}
    await wait(()=>lobby[0].opening?.stage==='dice'&&lobby[1].opening?.stage==='dice','dice stage');
    a.send('opening',{kind:'confirm',stage:'persona',value:deck.persona});
    do {
      const round=lobby[0].opening.round;
      a.send('opening',{kind:'roll',round});
      await wait(()=>lobby[0].opening.rolls[0]!==null&&(!lobby[0].opening.rolls[1]||lobby[0].opening.round>round),'first roll');
      b.send('opening',{kind:'roll',round:lobby[0].opening.round});
      await wait(()=>lobby[0].opening.rolls.every(n=>n!==null),'both rolls');
    }while(lobby[0].opening.first===null);
    const outcome=structuredClone(lobby[0].opening);
    // Recover the same setup stage and result through Colyseus reconnect.
    const token=b.reconnectionToken;b.reconnection.enabled=false;b.connection.close();
    await new Promise(r=>setTimeout(r,200));b=await sdk.reconnect(token);lobby[1]=null;bind(b,1);
    await wait(()=>lobby[1]?.opening,'reconnect dice');assert.deepEqual(lobby[1].opening,outcome);
    for(const client of [a,b])client.send('opening',{kind:'confirm',stage:'dice'});
    await wait(()=>lobby[0].opening.stage==='persona','persona stage');
    a.send('opening',{kind:'confirm',stage:'persona',value:deck.persona});
    await wait(()=>lobby[0].opening.confirmed[0],'persona lock');assert.equal(lobby[1].opening.choices,undefined);
    b.send('opening',{kind:'confirm',stage:'persona',value:deck.persona});
    await wait(()=>lobby[0].opening.stage==='codex','codex stage');
    for(const client of [a,b])client.send('opening',{kind:'confirm',stage:'codex',value:deck.codex[0]});
    await wait(()=>lobby[0].opening.stage==='reveal','reveal');assert.equal(frames[0],undefined);
    for(const client of [a,b])client.send('opening',{kind:'confirm',stage:'reveal'});
    await wait(()=>frames[0]&&frames[1],'battle');
    assert.equal(frames[0].state.turnPlayer,outcome.first);assert.equal(frames[1].state.turnPlayer,1-outcome.first);
    assert.equal(frames[0].busy,true);assert.equal(frames[1].busy,true);
    for(const client of [a,b])client.send('loaded');
    await wait(()=>frames.some(f=>f.state.phase!=='start'||f.decision),'game runs after loaded');
    console.log('PASS new opening, hidden selections, reconnect, first player, loaded gate');
  } finally {await Promise.allSettled([a.leave(),b?.leave()]);}
}
await test(true);await test(false);
