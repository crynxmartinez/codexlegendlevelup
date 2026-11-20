import { describe, expect, it, vi } from 'vitest';
import { FULL_INDEX } from '../data/loader.js';
import { GameController, type PlayerAction } from '../core/game.js';
import { currentPower, you } from '../core/state.js';
import { autoChooser } from '../core/effects.js';
import { createFirstBattle } from './first-battle.js';
import { journeyHuman } from './journey-battle.js';
import { TUTORIAL_LESSON_CARDS, TUTORIAL_DECKS, type TutorialRegion } from '../core/tutorial-decks.js';
import { NextBattleSession, nextBattleHint, nextBattleOpponent, playNextBattleTurn, defenseHelp, NEXT_BATTLE_PROGRESS, createSimpleSkills, SimpleSkillsSession, playSimpleSkillsOpponent } from './next-battle.js';

const make = () => {
  const { game, cards, profile } = createFirstBattle(FULL_INDEX);
  const ctrl = new GameController(game, profile.index, { scripts:profile.scripts, choosers: [autoChooser, nextBattleOpponent(profile.index, game)] });
  return { game, cards, ctrl };
};
describe('Your Next Battle', () => {
  it('offers legal choices and hints without changing the game or peeking at the deck', () => {
    const { game, ctrl } = make();
    const before = JSON.stringify(game);
    const hint = nextBattleHint(ctrl);
    expect(hint.action?.kind).toBe('call');
    expect(ctrl.legalActions(0)).toContainEqual(hint.action);
    expect(new Set(ctrl.legalActions(0).filter(a => a.kind === 'call').map(a => a.uid)).size).toBeGreaterThan(1);
    expect(JSON.stringify(game)).toBe(before);
    you(game, 1).deck.reverse(); you(game, 1).hand.reverse();
    expect(nextBattleHint(ctrl)).toEqual(hint);
  });
  it('only escalates help on request and resets it after a decision', () => {
    const { ctrl } = make(); const session = new NextBattleSession();
    const h = nextBattleHint(ctrl);
    expect(session.level).toBe(0);
    session.request(h.key); expect(session.level).toBe(1);
    session.request(h.key); session.request(h.key); session.request(h.key);
    expect(session.level).toBe(3);
    session.action({kind:'endPhase'}); expect(session.level).toBe(0);
  });
  it('explains equal defense as a hit, and does not promise protection from checks', () => {
    const hints = defenseHelp(11000,11000,[{name:'Example',defense:5000}]);
    expect(hints.join(' ')).toMatch(/ties hit/i);
    expect(hints[2]).toContain('16,000');
    expect(hints[2]).toMatch(/check/i);
    expect(defenseHelp(30000,11000,[])[2]).toMatch(/cannot/i);
  });
  it('accepts different first calls and makes a bounded opponent turn through real rules', async () => {
    for (const choice of [0,1]) {
      const { game, ctrl } = make();
      const calls = ctrl.legalActions(0).filter(a => a.kind === 'call' && a.slot === 0);
      await ctrl.perform(calls[choice]!,0);
      await ctrl.perform({kind:'endPhase'},0); await ctrl.perform({kind:'endTurn'},0);
      await ctrl.beginTurn(); await playNextBattleTurn(ctrl);
      expect(game.turnPlayer).toBe(0);
      expect(you(game,1).allies.filter(Boolean)).toHaveLength(1);
      expect(game.players.every(p=>p.normalPlaysUsed>=0)).toBe(true);
    }
  });
  it('allows a player to lose and finishes a reasonable attacking line without scripted victory', async () => {
    for(const passive of [true,false]) {
      const {game,ctrl}=make();
      for(let turn=0;turn<25 && game.winner===null;turn++) {
        if(turn) await ctrl.beginTurn();
        if(game.winner!==null) break;
        if(game.turnPlayer===1) { await playNextBattleTurn(ctrl); continue; }
        for(let move=0;move<24 && game.winner===null && game.turnPlayer===0;move++) {
          const action=passive ? {kind:game.phase==='main'?'endPhase':'endTurn'} as const : nextBattleHint(ctrl).action;
          expect(action).toBeDefined();
          await ctrl.perform(action!,0);
        }
      }
      expect(game.winner).not.toBeNull();
      if(passive) expect(game.winner).toBe(1);
      expect(game.players.every(p=>p.normalPlaysUsed>=0)).toBe(true);
    }
  });
  it('saves one local recap, recovers corrupt progress, and tolerates blocked storage', () => {
    const values=new Map<string,string>([[NEXT_BATTLE_PROGRESS,'{broken']]);
    vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
    try {
      const s=new NextBattleSession(); s.action({kind:'call',uid:'x',slot:0}); s.finish(true); s.finish(true);
      expect(JSON.parse(values.get(NEXT_BATTLE_PROGRESS)!)).toMatchObject({version:1,attempts:1,completed:true,last:{calls:1}});
      vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}});
      expect(()=>new NextBattleSession().finish(false)).not.toThrow();
    } finally {vi.unstubAllGlobals();}
  });
  it('can be won by calling two different Allies and choosing attacks', async () => {
    const {game,cards,profile}=createFirstBattle(FULL_INDEX);
    const ctrl=new GameController(game,profile.index,{scripts:profile.scripts,choosers:[nextBattleOpponent(profile.index,game),nextBattleOpponent(profile.index,game)]});
    const ammani=you(game,0).hand.find(uid=>game.cards[uid]!.defId.endsWith('months-of-battle-warrior-ammani'))!;
    await ctrl.perform({kind:'call',uid:ammani,slot:3},0);
    await ctrl.perform({kind:'call',uid:cards.ally,slot:0},0);
    for(let turn=0;turn<3 && game.winner===null;turn++) {
      await ctrl.perform({kind:'endPhase'},0);
      for(const uid of [cards.ally,ammani,cards.persona]) {
        if(game.winner!==null) break;
        await ctrl.perform({kind:'attack',attacker:uid,target:null,supporters:[]},0);
      }
      if(game.winner===null) {
        await ctrl.perform({kind:'endTurn'},0);await ctrl.beginTurn();await playNextBattleTurn(ctrl);await ctrl.beginTurn();
      }
    }
    expect(game.winner).toBe(0);
  });
});

describe('Simple Skills', () => {
  it.each<TutorialRegion>(['luzon', 'visayas', 'mindanao'])('%s teaches real arrival and attack bonuses, then waits for both to expire before completion', async region => {
    const { game, profile, cards } = createSimpleSkills(FULL_INDEX, region);
    const names = { luzon: ['Dalewasan', 'Annibo'], visayas: ['Luning', 'Tata Cero'], mindanao: ['Rinayung', 'Tarabuk'] };
    expect([cards.arrivalName, cards.attackerName]).toEqual(names[region]);
    expect(game.cards[cards.arrival]!.defId).toBe(TUTORIAL_LESSON_CARDS[region].l1Arrival);
    expect(game.cards[cards.attacker]!.defId).toBe(TUTORIAL_LESSON_CARDS[region].l2Attack);
    for (const p of [0, 1] as const) {
      expect(game.cards[you(game, p).persona!]!.defId).toBe(TUTORIAL_DECKS[region].persona);
      expect(game.cards[you(game, p).activeCodex!]!.defId).toBe(TUTORIAL_DECKS[region].codex[0]);
    }
    const session = new SimpleSkillsSession(cards);
    const attackValues: number[] = [];
    const ctrl = new GameController(game, profile.index, {
      scripts: profile.scripts,
      choosers: [journeyHuman(autoChooser,game,profile.index), nextBattleOpponent(profile.index, game)],
      hooks: {
        onBlockingStart: async battle => { attackValues.push(battle.attackPower); },
        onPhaseChange: async (phase, player) => { session.observe({kind:'phase',phase,player}); },
      },
    });
    const perform = async (action: PlayerAction) => {
      expect(session.allows(action)).toBe(true);
      expect(ctrl.legalActions(0)).toContainEqual(action);
      await ctrl.perform(action, 0);
      session.observe({kind:'action',action});
    };
    expect(you(game, 0).barriers).toHaveLength(2);
    expect(you(game, 1).barriers).toHaveLength(2);
    expect(you(game, 0).codex).toHaveLength(2);
    session.continue();
    await perform({kind:'call',uid:cards.arrival,slot:1});
    expect(currentPower(profile.index, game, cards.arrival)).toBe(cards.arrivalPower + 3000);
    expect(session.step.title).toBe('This bonus lasts for the turn');
    session.continue();
    await perform({kind:'endPhase'});
    await perform({kind:'attack',attacker:cards.attacker,target:null,supporters:[]});
    expect(attackValues).toEqual([cards.attackerPower + 5000]);
    expect(currentPower(profile.index, game, cards.attacker)).toBe(cards.attackerPower);
    expect(currentPower(profile.index, game, cards.arrival)).toBe(cards.arrivalPower + 3000);
    expect(you(game, 1).barriers).toHaveLength(1);
    expect(game.winner).toBeNull();
    expect(session.step.title).toBe('The attack bonus has ended');
    session.continue();
    await perform({kind:'endTurn'});
    expect(currentPower(profile.index, game, cards.arrival)).toBe(cards.arrivalPower);
    expect(session.step.hidden).toBe(true);
    expect(session.completed).toBe(false);
    await ctrl.beginTurn();
    await playSimpleSkillsOpponent(ctrl);
    await ctrl.beginTurn();
    expect(session.step.title).toBe('Both bonuses are gone');
    expect(game.cards[cards.attacker]!.exhausted).toBe(false);
    expect(currentPower(profile.index, game, cards.arrival)).toBe(cards.arrivalPower);
    expect(session.completed).toBe(false);
    session.continue();
    expect(session.completed).toBe(true);
    expect(game.winner).toBeNull();
    expect(session.allows({kind:'endPhase'})).toBe(false);
  });

  it('does not accept a different card, extra support, or unrelated action as lesson progress', () => {
    const { cards, game } = createSimpleSkills(FULL_INDEX);
    const session = new SimpleSkillsSession(cards);
    session.continue();
    expect(session.allows({kind:'call',uid:cards.arrival,slot:0})).toBe(false);
    expect(session.allows({kind:'call',uid:cards.attacker,slot:1})).toBe(false);
    session.observe({kind:'action',action:{kind:'call',uid:cards.attacker,slot:1}});
    expect(session.step.title).toBe('Call your arrival Unit');
    session.continue();
    expect(session.step.title).toBe('Call your arrival Unit');
    session.observe({kind:'action',action:{kind:'call',uid:cards.arrival,slot:1}});
    session.continue();
    session.observe({kind:'action',action:{kind:'endPhase'}});
    expect(session.allows({kind:'attack',attacker:cards.attacker,target:null,supporters:[cards.arrival]})).toBe(false);
    expect(session.allows({kind:'attack',attacker:you(game,0).persona!,target:null,supporters:[]})).toBe(false);
    session.observe({kind:'action',action:{kind:'endTurn'}});
    expect(session.step.title).toBe('Try the attack bonus');
  });
});
