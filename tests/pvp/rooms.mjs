import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { readFile } from 'node:fs/promises';
import { assertPrivacy, assertAgreement } from './assert-views.mjs';
const server = process.env.CODEX_TEST_SERVER || 'http://127.0.0.1:2570';
const sdk = new Client(server);
const version = await (await fetch(`${server}/codex/health`)).json();
const pause = ms => new Promise(r => setTimeout(r, ms));
// Respect the production room's 25-message/sec limit. Headless decisions otherwise
// burst much faster than UI playback and correctly trigger transport protection.
const outgoing=new WeakMap();
function send(client,type,payload){const next=(outgoing.get(client)??Promise.resolve()).then(async()=>{await pause(110);client.send(type,payload);});outgoing.set(client,next);return next;}
async function until(test, message='Timed out') { for(let i=0;i<400;i++){if(test())return;await pause(25);}throw new Error(message); }
async function options(name) {
  const response=await fetch(`${server}/codex/guest`,{method:'POST',headers:{Origin:'http://127.0.0.1:5174'}});
  assert.equal(response.status,200);
  return {guest:(await response.json()).token,protocol:version.protocol,content:version.content,name,
    setup:{deck:JSON.parse(await readFile(new URL(`../../decks/${name}-set-1.json`,import.meta.url),'utf8'))}};
}
function choose(d){const a=d.args;
  switch(d.kind){
    case 'revealCards':return true;
    case 'confirm':case 'revealConfirm':return false;
    case 'chooseAbility':return a[3]?.allowDecline===false?0:null;
    case 'personifyPrompt':return null;
    case 'chooseMode':return 0;
    case 'chooseSlot':return a[2][0];
    case 'chooseTarget':return a[2][0]??null;
    case 'battleCards':case 'blockPrompt':return [];
    case 'chooseCards':{
      const opts=a[4]??{};if(opts.decline||opts.upTo)return [];
      let left=a[3];const selected=[];
      for(const uid of a[2]){const weight=opts.weights?.[uid]??1;if(weight<=left){selected.push(uid);left-=weight;}}
      assert.equal(left,0,'A valid required selection exists');return selected;
    }
    default:throw new Error(`Unhandled choice ${d.kind}`);
  }
}
async function play(deckA,deckB){
  const a=await options(deckA),b=await options(deckB);
  await assert.rejects(()=>sdk.create('codex_match',{...a,protocol:0}), /The game changed\. Refresh before joining\./);
  await assert.rejects(()=>sdk.create('codex_match',{...a,content:'incompatible-content'}), /The game changed\. Refresh before joining\./);
  const ca=await sdk.create('codex_match',a);let lobby;
  ca.onMessage('*',()=>{});ca.onMessage('lobby',v=>lobby=v);ca.send('sync');await until(()=>lobby);
  await assert.rejects(()=>sdk.joinById(ca.roomId,{...b,invite:'wrong'}));
  await pause(150); // Failed reservations release asynchronously.
  const cb=await sdk.joinById(ca.roomId,{...b,invite:lobby.invite});cb.onMessage('*',()=>{});
  const clients=[ca,cb],views=[];const decisions=[new Set(),new Set()];let choices=0;
  const bind=(c,seat)=>{c.onMessage('notice',message=>{throw new Error(`Server rejected test input for seat ${seat}: ${JSON.stringify(message)}`);});c.onMessage('view',v=>{
    views[seat]=v;
    assertPrivacy(v);
    if(v.decision&&!decisions[seat].has(v.decision.id)){decisions[seat].add(v.decision.id);choices++;void send(c,'answer',{id:v.decision.id,answer:choose(v.decision)});}
  });};
  clients.forEach(bind);
  ca.send('ready',true);cb.send('ready',true);await until(()=>views[0]&&views[1]);
  ca.send('loaded');cb.send('loaded');await until(()=>views.some(v=>v.legal.length));
  const originalHand=[...views[1].state.players[0].hand];
  const token=cb.reconnectionToken;cb.reconnection.enabled=false;cb.connection.close();await pause(150);
  const back=await sdk.reconnect(token);back.onMessage('*',()=>{});
  bind(back,1);
  clients[1]=back;let synced=false;back.onMessage('view',()=>synced=true);back.send('sync');await until(()=>synced);
  assert.deepEqual(views[1].state.players[0].hand,originalHand);
  let moves=0;
  while(views[0].state.winner===null&&moves<1500){
    try { await until(()=>views[0].state.winner!==null||(views[0].revision===views[1].revision&&views.every(v=>!v.busy)&&views.some(v=>v.legal.length)),'No legal move after resolution'); }
    catch(error) { console.error(JSON.stringify(views.map(v=>({revision:v.revision,busy:v.busy,phase:v.state.phase,decision:v.decision,legal:v.legal,winner:v.state.winner})),null,2));throw error; }
    if(views[0].state.winner!==null)break;
    assertAgreement(...views);
    const seat=views[0].legal.length?0:1,v=views[seat],c=clients[seat];
    const move=v.legal.find(a=>a.kind==='attack')??v.legal.find(a=>a.kind==='call')??v.legal.find(a=>a.kind==='endPhase')??v.legal.find(a=>a.kind==='endTurn');
    assert.ok(move,`No usable action: ${JSON.stringify(v.legal)}`);await send(c,'action',{revision:v.revision,action:move});moves++;
    await until(()=>views[seat].revision>v.revision);
  }
  assert.notEqual(views[0].state.winner,null,'Match must finish');
  await until(()=>views[1].state.winner!==null);assert.equal(views[0].state.winner,1-views[1].state.winner);
  assert.ok(choices>0);console.log(`${deckA} vs ${deckB}: ${moves} moves, ${choices} decisions, consistent winner; privacy and reconnect passed`);
  let reset=false;ca.onMessage('lobby',v=>{if(!v.playing)reset=true;});ca.send('rematch');back.send('rematch');await until(()=>reset);
  await Promise.all([ca.leave(),back.leave()]);
}
for(const pair of [['agta','babaylan'],['babaylan','maguindanao'],['maguindanao','agta']])await play(...pair);
