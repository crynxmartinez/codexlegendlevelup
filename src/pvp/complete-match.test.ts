import { expect, it } from 'vitest';
import { MatchSession, parseSetup } from './session.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { AiChooser } from '../ai/bot.js';
import type { PlayerId } from '../core/types.js';

// Deliberately simple legal policy, not a balance test. Decisions use only the
// same sanitized view delivered to that seat, never the opposing private hand.
it.each([
  ['Luzon','Visayas',0], ['Luzon','Visayas',1],
  ['Visayas','Mindanao',0], ['Visayas','Mindanao',1],
  ['Mindanao','Luzon',0], ['Mindanao','Luzon',1],
] as const)('completes %s/%s with first seat %i through public snapshots', async (left,right,first) => {
  let frames=0, defenders=0, decisions=0;
  const hooks=new Set<string>();
  const decisionKinds=new Set<string>(),fxKinds=new Set<string>();let maxChainDepth=0;
  let s:MatchSession;
  s=new MatchSession([parseSetup({deck:STARTERS[left]}),parseSetup({deck:STARTERS[right]})],42,()=>{
    const before=JSON.stringify(s.game);
    for(const seat of [0,1] as const){
      const f=s.frame(seat);frames++;
      if(f.presentation)hooks.add(f.presentation.hook);
      if(f.presentation?.hook==='onFx')fxKinds.add((f.presentation.args[0] as {kind:string}).kind);
      maxChainDepth=Math.max(maxChainDepth,f.state.responseChain?.links.length??0);
      for(const uid of f.state.activeBattle?.blockers??[]){
        expect(f.state.cards[uid]?.defId).toBeTruthy();
        expect(f.state.cards[uid]?.defId).not.toBe('__hidden__');defenders++;
      }
      expect(f.state.rngSeed).toBe(0);
      expect(f.decision===null||f.decision.owner===0).toBe(true);
      // Fresh projection must not change costs, positions, RNG or rule state.
    }
    expect(JSON.stringify(s.game)).toBe(before);
  },first);
  async function settle(work:Promise<void>){
    let done=false,error:unknown;work.then(()=>{done=true;},e=>{done=true;error=e;});
    let last='';
    for(let spin=0;!done&&spin<3000;spin++){
      const d=s.decisions.pending;
      if(d&&d.id!==last){
        last=d.id;const f=s.frame(d.owner),owned=f.decision!;
        const chooser=new AiChooser(MATCH_INDEX,()=>f.state);
        const method=chooser[owned.kind] as (...args:any[])=>Promise<unknown>;
        const answer=await method.apply(chooser,owned.args);
        expect(s.decisions.answer(d.owner,d.id,answer===undefined?true:answer),d.kind).toBe(true);decisions++;
        decisionKinds.add(d.kind);
      }
      await new Promise(r=>setTimeout(r,0));
    }
    if(error)throw error;expect(done).toBe(true);
  }
  await settle(s.start());
  for(let step=0;s.game.winner===null&&step<1200;step++){
    const seat=s.game.turnPlayer as PlayerId,legal=s.ctrl.legalActions(seat);
    const pick=legal.find(a=>a.kind==='call')??legal.find(a=>a.kind==='attack')
      ??legal.find(a=>a.kind==='endPhase')??legal.find(a=>a.kind==='endTurn');
    expect(pick,`no progression action: ${legal.map(a=>a.kind)}`).toBeTruthy();
    await settle(s.action(seat,s.revision,pick));
  }
  expect(s.game.winner).not.toBeNull();expect(s.busy).toBe(false);expect(s.decisions.pending).toBeNull();
  expect(s.frame(0).state.winner).toBe(s.game.winner);
  expect(s.frame(1).state.winner).toBe(1-s.game.winner!);
  console.info(JSON.stringify({left,right,first,winner:s.game.winner,turns:s.game.turnNumber,frames,defenders,decisions,maxChainDepth,decisionKinds:[...decisionKinds],fxKinds:[...fxKinds],hooks:[...hooks]}));
},120000);
