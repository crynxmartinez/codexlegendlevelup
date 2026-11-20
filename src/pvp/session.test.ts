import { expect, it } from 'vitest';
import { MatchSession, parseSetup } from './session.js';
import { STARTERS } from './catalog.js';
import { createChain, declineResponse } from '../core/response-chain.js';
import { moveCard } from '../core/state.js';
import type { ActiveBattle } from '../core/types.js';
import type { AttackResult } from '../core/battle.js';

it('marks only a battle-destroyed Ally for shattering, for both viewers', async () => {
  const s = new MatchSession([parseSetup({deck:STARTERS.Mindanao}),parseSetup({deck:STARTERS.Luzon})],8,()=>{});
  const target = s.game.players[1].hand[0]!;
  moveCard(s.game,target,'ally',{slot:0});
  const entry = s.game.cards[target]!.fieldEntry ?? 0;
  moveCard(s.game,target,'grave');
  const battle: ActiveBattle = {attacker:s.game.players[0].persona!,target,defender:1,supporters:[],blockers:[],attackPower:16000,defensePower:9000,stage:'resolved'};
  const result: AttackResult = {hit:true,attackPower:16000,defensePower:9000,personaHit:false,barrierBroken:false,attackCheck:null,barrierCheckCard:null,sentryUsed:false};
  await s.ctrl.hooks.onAttackResolved?.(battle,result);
  for (const seat of [0,1] as const) expect(s.frame(seat).cues.at(-1)?.battleDestroyed).toEqual({uid:target,fieldEntry:entry});
  await s.ctrl.hooks.onAttackResolved?.(battle,{...result,hit:false});
  expect(s.frame(0).cues.at(-1)?.battleDestroyed).toBeUndefined();
  await s.ctrl.hooks.onAttackResolved?.(battle,{...result,sentryUsed:true});
  expect(s.frame(0).cues.at(-1)?.battleDestroyed).toBeUndefined();
  await s.ctrl.hooks.onAttackResolved?.({...battle,target:null},{...result,personaHit:true,barrierBroken:true});
  expect(s.frame(0).cues.at(-1)?.battleDestroyed).toBeUndefined();
});
it('rejects tampered decks before expansion or engine setup',()=>{
  expect(()=>parseSetup({deck:{...STARTERS.Luzon,main:[{id:'x',copies:1e20}]}})).toThrow();
  const d=structuredClone(STARTERS.Luzon!);d.main.push(d.main[0]!);expect(()=>parseSetup({deck:d})).toThrow();
  expect(()=>parseSetup({deck:STARTERS.Luzon,choice:{codex:'invalid'}})).toThrow();
});
it('accepts all three starter setups',()=>{for(const deck of Object.values(STARTERS))expect(parseSetup({deck}).deck.name).toBe(deck.name);});
it('shows hidden hand movement counts without sending the opponent card identities',async()=>{
  const s=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})],9,()=>{});
  const uid=s.game.players[0].hand[0]!,defId=s.game.cards[uid]!.defId;
  moveCard(s.game,uid,'deck');await s.ctrl.drainFxForTest();
  const own=s.frame(0).cues.at(-1)!,other=s.frame(1).cues.at(-1)!;
  expect(own.handMove?.[0]).toMatchObject({uid,defId,to:'deck'});
  expect(other.handMove).toHaveLength(1);expect(other.handMove?.[0]?.defId).toBe('');
  expect(JSON.stringify(other)).not.toContain(uid);expect(other.owner).toBe(1);
  moveCard(s.game,uid,'hand');moveCard(s.game,uid,'grave');await s.ctrl.drainFxForTest();
  expect(s.frame(1).cues.at(-1)?.handMove?.[0]).toMatchObject({uid,defId,to:'grave',hidden:false});
});
it('sends only current public field targets in effect cues to either seat',async()=>{
  const s=new MatchSession([parseSetup({deck:STARTERS.Mindanao}),parseSetup({deck:STARTERS.Luzon})],8,()=>{});
  const source=s.game.players[0].persona!, target=s.game.players[1].persona!, secret=s.game.players[0].deck[0]!;
  const chain=createChain('c',{id:'link',owner:0,source,skillId:'skill',label:'skill',declared:[{prompt:'Targets',many:true,targets:[target,secret].map(uid=>({uid,zone:s.game.cards[uid]!.zone,entry:s.game.cards[uid]!.zoneEntry??0}))}]});
  s.game.responseChain=chain;declineResponse(chain,1);
  await s.ctrl.hooks.onAbilityActivated?.(source,'skill',0,'ability',1);
  for(const seat of [0,1] as const){
    const cue=s.frame(seat).cues.at(-1)!;
    expect(cue.targets).toEqual([{uid:target,fieldEntry:s.game.cards[target]!.fieldEntry??0}]);
    expect(JSON.stringify(cue)).not.toContain(secret);
  }
  chain.links[0]!.status='negated';
  await s.ctrl.hooks.onAbilityActivated?.(source,'skill',0,'ability',1);
  expect(s.frame(0).cues.at(-1)!.targets).toEqual([]);
});
it('uses unpredictable online instance IDs with intact zone references',()=>{
  const setups=[parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})] as const;
  const a=new MatchSession([...setups],42,()=>{}),b=new MatchSession([...setups],42,()=>{});
  expect(Object.keys(a.game.cards).every(id=>id.startsWith('card-'))).toBe(true);
  expect(Object.keys(a.game.cards)).not.toEqual(Object.keys(b.game.cards));
  for(const p of a.game.players)for(const uid of [...p.hand,...p.deck,...p.barriers,...p.codex,p.persona!])expect(a.game.cards[uid]).toBeDefined();
});
it('holds private reveals for their owner without exposing them to the opponent',async()=>{
  const s=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})],9,()=>{});
  const uid=s.game.players[0].deck[0]!;
  const read=s.decisions.chooser(0).revealCards!(0,[uid],'Read the revealed card');
  const own=s.frame(0),other=s.frame(1);
  expect(own.decision?.kind).toBe('revealCards');
  expect(own.state.cards[uid]?.defId).toBe(s.game.cards[uid]!.defId);
  expect(other.decision).toBeNull();expect(other.state.cards[uid]).toBeUndefined();
  expect(s.decisions.answer(1,own.decision!.id,true)).toBe(false);
  expect(s.decisions.answer(0,own.decision!.id,true)).toBe(true);await read;
});
it('rejects wrong turn, stale revisions and forged attacks without changing state',async()=>{
  const setups=[parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})] as const;
  const s=new MatchSession([...setups],42,()=>{});s.game.phase='main';
  const p=s.game.turnPlayer;
  const before=JSON.stringify(s.game);
  await expect(s.action((1-p) as 0|1,0,{kind:'endPhase'})).rejects.toThrow();
  await expect(s.action(p,100,{kind:'endPhase'})).rejects.toThrow();
  await expect(s.action(p,0,{kind:'attack',attacker:'evil',target:null,supporters:[]})).rejects.toThrow();
  expect(JSON.stringify(s.game)).toBe(before);
});
