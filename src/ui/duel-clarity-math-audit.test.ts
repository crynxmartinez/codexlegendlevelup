/** Design-audit fixtures. These document current behavior, not production changes. */
import { afterAll, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createGame } from '../core/setup.js';
import { currentPower, passiveBonuses, moveCard } from '../core/state.js';
import { blockValue, endBattlePhase } from '../core/battle.js';
import { endTurn } from '../core/turn.js';
import { autoChooser, buffPower, drainPower } from '../core/effects.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';
import { ALL_CARDS } from '../data/loader.js';
import { DRAFTS } from '../localization/drafts.js';
import { EffectExpiryTracker } from './effect-feedback.js';
import { GameController } from '../core/game.js';
import type { GameState, PlayerId, Zone } from '../core/types.js';

const report: Record<string, unknown> = {};
const fresh = (region: 'Luzon'|'Visayas'|'Mindanao' = 'Luzon') => createGame(MATCH_INDEX, [STARTERS[region]!, STARTERS[region]!], { seed: 18 });
let serial = 0;
function add(game: GameState, id: string, owner: PlayerId, zone: Zone, slot = 0) {
  const uid = `clarity-audit-${serial++}`;
  const base = structuredClone(game.cards[game.players[owner].persona!]!);
  game.cards[uid] = {...base, uid, defId:id, owner, zone:'check', slot:null, modifiers:[], exhausted:false, faceDown:false};
  if (zone === 'persona') moveCard(game, game.players[owner].persona!, 'grave');
  moveCard(game, uid, zone, zone === 'ally' ? {slot} : {});
  return uid;
}
function explainablePower(game: GameState, uid: string) {
  const c=game.cards[uid]!, d=MATCH_INDEX[c.defId]!;
  return d.power*Math.max(1,c.stack)+c.modifiers.reduce((n,m)=>n+m.amount,0)+passiveBonuses(MATCH_INDEX,game,uid).reduce((n,m)=>n+m.amount,0);
}

it('records real defence components and demonstrates why blockValue cannot be a preview API', () => {
  const g=fresh(), uid=add(g,'agta/set-1/moon-bright-captive-innawagan',0,'hand');
  const base=currentPower(MATCH_INDEX,g,g.players[0].persona!);
  expect(base).toBe(11000); expect(MATCH_INDEX[g.cards[uid]!.defId]!.defense).toBe(10000);
  g.players[0].lakeBuluanDefenseBonus=true;
  const first=blockValue(MATCH_INDEX,g,uid), second=blockValue(MATCH_INDEX,g,uid);
  expect([first,second]).toEqual([15000,10000]); expect(g.players[0].lakeBuluanDefenseBonus).toBe(false);
  report.defense={base,printedContribution:10000,totalWithoutBonus:21000,attackExample:22000,firstCommittedBlock:first,secondRead:second,note:'Bonus fixture is API coverage, not a claim the retired Lake Buluan card is currently selectable. Supported attack legality is checked separately.'};
});

it('reproduces the Maka-Ogis conditional contribution missing from current chip inputs', () => {
  const g=fresh('Mindanao'), uid=add(g,'maguindanao/set-1/gurayen-wrath-mate-maka-ogis',0,'persona');
  g.turnPlayer=0;g.players[0].releasedState='Garahana';g.players[0].unitsOfferedThisTurn=2;
  const total=currentPower(MATCH_INDEX,g,uid), explained=explainablePower(g,uid);
  expect(total).toBe(16000);expect(explained).toBe(11000);
  report.makaOgis={total,explained,unexplained:total-explained,classification:'Reproduced presentation-provenance omission; current total is correct'};
});

it('reproduces authoritative Aday power with an incomplete filtered-view breakdown in both seats', () => {
  const g=fresh('Visayas'), uid=add(g,'babaylan/set-1/answering-voice-aday',0,'ally');
  g.turnPlayer=0;g.turnNumber=4;g.babaylanEssences={0:{turn:4,count:2}};
  const total=currentPower(MATCH_INDEX,g,uid);expect(total).toBe(8000);
  const seats=([0,1] as const).map(viewer=>{const view=playerView(g,viewer,null,[]);return {viewer,total:currentPower(MATCH_INDEX,view,uid),explained:explainablePower(view,uid),essencesIncluded:!!view.babaylanEssences};});
  for(const s of seats){expect(s.total).toBe(8000);expect(s.explained).toBe(6000);expect(s.essencesIncluded).toBe(false);}
  report.aday={total,seats,classification:'Reproduced PvP read-model gap; use authoritative total and unavailable breakdown until safe shared projection exists'};
});

it('preserves stacked source provenance and expires the actual current-turn modifiers', () => {
  const g=fresh(), uid=add(g,'agta/set-1/life-breath-mother-nanolay',0,'persona');
  const action=add(g,'agta/set-1/the-wedding-becomes-a-battlefield',0,'grave');
  g.turnPlayer=0;
  buffPower({game:g,index:MATCH_INDEX,me:0,source:action,chooser:autoChooser},uid,3000);
  buffPower({game:g,index:MATCH_INDEX,me:0,source:uid,chooser:autoChooser},uid,3000);
  expect(currentPower(MATCH_INDEX,g,uid)).toBe(17000);
  const modifiers=structuredClone(g.cards[uid]!.modifiers);expect(modifiers.every(m=>m.sourceId&&m.origin)).toBe(true);
  g.pendingFx=[];endTurn(g);expect(currentPower(MATCH_INDEX,g,uid)).toBe(11000);
  expect(g.pendingFx).toContainEqual({kind:'powerExpire',target:uid,amount:6000});
  report.stacked={base:11000,total:17000,modifiers,afterEndTurn:11000,note:'Real catalogue source rules; directly constructed audit state, not a recorded full match'};
});

it('records negative-modifier fallback without inventing a current selectable card source', () => {
  const g=fresh(), uid=g.players[0].persona!;
  const amount=drainPower({game:g,index:MATCH_INDEX,me:0,source:uid,chooser:autoChooser},uid);
  expect(amount).toBe(11000);expect(currentPower(MATCH_INDEX,g,uid)).toBe(0);
  expect(g.cards[uid]!.modifiers[0]?.sourceId).toBeUndefined();
  report.reduction={amount:-amount,total:0,source:g.cards[uid]!.modifiers[0]?.source,note:'Generic existing drain helper only. No currently selectable script caller was found; use a labelled audit-state sheet, not a live-card mock rule.'};
});

it('documents phase expiry cleanup and its currently unspecific presentation cue', () => {
  const g=fresh(), uid=g.players[0].persona!, tracker=new EffectExpiryTracker();
  g.cards[uid]!.modifiers.push({amount:3000,duration:'endOfBattlePhase',source:'Audit expiry fixture'});
  tracker.update(g);g.pendingFx=[];endBattlePhase(g);
  expect(currentPower(MATCH_INDEX,g,uid)).toBe(11000);
  expect(tracker.update(g)).toEqual([{uid,kind:'power'}]);expect(g.pendingFx).toEqual([]);
  report.phaseExpiry={after:11000,tracker:{uid,kind:'power'},pendingFx:[],classification:'Expiry changes numbers correctly; existing display cue does not identify ended source/amount'};
});

it('expires opponent-turn duration according to the affected card owner', () => {
  const g=fresh(), uid=g.players[0].persona!;g.turnPlayer=0;
  g.cards[uid]!.modifiers.push({amount:3000,duration:'endOfOpponentTurn',source:'Audit boundary fixture'});
  endTurn(g);expect(currentPower(MATCH_INDEX,g,uid)).toBe(14000);
  endTurn(g);expect(currentPower(MATCH_INDEX,g,uid)).toBe(11000);
  report.opponentTurnExpiry={afterOwnTurn:14000,afterOpponentTurn:11000};
});

it('validates the proposed 22,000 supported attack against actual legal actions', () => {
  const g=fresh(), kali=add(g,'agta/set-1/fifth-sky-tyrant-kalimangalnuk',1,'persona');
  const nano=add(g,'agta/set-1/life-breath-mother-nanolay',1,'ally',1);
  const tag=add(g,'agta/set-1/wind-heart-rescuer-taguwasi',0,'persona');
  const inna=add(g,'agta/set-1/moon-bright-captive-innawagan',0,'hand');
  g.turnPlayer=1;g.turnNumber=4;g.phase='battle';
  expect(g.players[1].releasedState).not.toBe('Bayanihan');
  const action={kind:'attack',attacker:kali,target:null,supporters:[nano]};
  expect(new GameController(g,MATCH_INDEX).legalActions(1)).toContainEqual(action);
  const attackerPower=currentPower(MATCH_INDEX,g,kali), supportPower=currentPower(MATCH_INDEX,g,nano);
  const baseDefense=currentPower(MATCH_INDEX,g,tag), cardDefense=MATCH_INDEX[g.cards[inna]!.defId]!.defense;
  expect([attackerPower,supportPower,baseDefense,cardDefense]).toEqual([11000,11000,11000,10000]);
  report.supportedDefenseMockup={attackerPower,supportPower,attackTotal:attackerPower+supportPower,baseDefense,cardDefense,selectedDefense:baseDefense+cardDefense,
    label:'BEFORE CHECK · SHORT BY 1,000',supportSlot:1,legalActionConfirmed:true,
    note:'Constructed legal pre-check state. Not a recorded full exchange or proof the final hit resolves. Nanolay is an Ally supporter, so its Persona attack skill does not apply.'};
});

afterAll(()=>{
  const ids=['agta/set-1/wind-heart-rescuer-taguwasi','agta/set-1/moon-bright-captive-innawagan','agta/set-1/barbed-sky-messenger-dalewasan','agta/set-1/life-breath-mother-nanolay','agta/set-1/the-wedding-becomes-a-battlefield','maguindanao/set-1/gurayen-wrath-mate-maka-ogis','babaylan/set-1/answering-voice-aday'];
  report.cards=ids.map(id=>{const c=ALL_CARDS[id]!;return {id,name:c.name,displayName:DRAFTS[id]?.name??c.name,art:c.art,power:c.power,defense:c.defense,type:c.type,rule:c.text};});
  mkdirSync('docs/design/duel-clarity-v1',{recursive:true});
  writeFileSync('docs/design/duel-clarity-v1/math-evidence.json',JSON.stringify({kind:'isolated source-level audit fixtures; not browser or complete-match verification',...report},null,2));
});
