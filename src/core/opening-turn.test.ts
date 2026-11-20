import { describe, it, expect } from 'vitest';
import deck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { GameController } from './game.js';
import { autoChooser } from './effects.js';
import { startTurn, endTurn } from './turn.js';
import { you, draw } from './state.js';

describe('Opening resources and draw turns', () => {
  for (const first of [0, 1] as const) {
    it(`both seats start without Energy; seat ${first} skips only its opening draw`, async () => {
      const game = createGame(index, [deck, deck], { seed: 17, firstPlayer: first });
      for (const p of [0, 1] as const) {
        expect(you(game,p).energy).toBeUndefined();
        expect(you(game,p).hand).toHaveLength(5);
        you(game,p).activeCodex=null;
      }
      const chooser={...autoChooser,chooseTarget:async()=>null,personifyPrompt:async()=>null,confirm:async()=>false};
      const ctrl=new GameController(game,index,{choosers:[chooser,chooser]});
      const draws: number[]=[];
      ctrl.hooks.onCardDrawn=async(uid,p)=>{
        // The renderer needs a real destination slot before starting the flight.
        expect(you(game,p).hand).toContain(uid);
        expect(you(game,p).deck).not.toContain(uid);
        expect(game.cards[uid]!.zone).toBe('hand');
        draws.push(p);
      };
      await ctrl.beginTurn();
      expect(you(game,first).hand).toHaveLength(5);expect(draws).toEqual([]);
      const second=first===0?1:0;
      expect(you(game,second).energy).toBeUndefined();
      endTurn(game);await ctrl.beginTurn();
      expect(you(game,second).energy).toBeUndefined();
      expect(you(game,second).hand).toHaveLength(6);expect(draws).toEqual([second]);
      endTurn(game);await ctrl.beginTurn();
      expect(you(game,first).hand).toHaveLength(6);expect(draws).toEqual([second,first]);
    });
  }
  it('the headless turn helper follows the same first-turn rule',()=>{
    const game=createGame(index,[deck,deck],{seed:8,firstPlayer:1});
    startTurn(index,game);expect(you(game,1).hand).toHaveLength(5);
    endTurn(game);startTurn(index,game);expect(you(game,0).hand).toHaveLength(6);
  });
  it('commits a fallback draw before animating, and waits before Main', async()=>{
    const game=createGame(index,[deck,deck],{seed:8,firstPlayer:0});
    game.turnNumber=3;
    const ps=you(game,0), uid=ps.deck[0]!;
    const chooser={...autoChooser,chooseTarget:async()=>null,personifyPrompt:async()=>null,confirm:async()=>false};
    const ctrl=new GameController(game,index,{choosers:[chooser,chooser]});
    const active=ps.activeCodex!, original=ctrl.scriptFor.bind(ctrl);
    ctrl.scriptFor=(id)=>id===active?{id:game.cards[active]!.defId,codex:{skill:{type:'replacement',replaces:'draw',text:'Unavailable draw replacement',canRun:()=>false,run:async()=>{throw new Error('Unavailable replacement ran');}}}}:original(id);
    let animated=false;
    ctrl.hooks.onCardDrawn=async(drawn,p)=>{
      expect(drawn).toBe(uid);expect(p).toBe(0);
      expect(ps.hand).toContain(uid);expect(ps.deck).not.toContain(uid);
      expect(game.phase).not.toBe('main');
      await Promise.resolve();animated=true;
    };
    await ctrl.beginTurn();
    expect(animated).toBe(true);expect(game.phase).toBe('main');
    expect(ps.hand.filter(card=>card===uid)).toHaveLength(1);
  });
  it('skips draw replacements on turn one but permits effect draws',async()=>{
    const game=createGame(index,[deck,deck],{seed:8,firstPlayer:0});
    const chooser={...autoChooser,chooseAbility:async()=>null,chooseTarget:async()=>null,personifyPrompt:async()=>null,confirm:async()=>false};
    const ctrl=new GameController(game,index,{choosers:[chooser,chooser]});
    let replacements=0;
    const active=you(game,0).activeCodex!;
    const original=ctrl.scriptFor.bind(ctrl);
    ctrl.scriptFor=(uid)=>uid===active?{id:game.cards[active]!.defId,codex:{skill:{type:'replacement',replaces:'draw',text:'test draw replacement',run:async()=>{replacements++;}}}}:original(uid);
    await ctrl.beginTurn();expect(replacements).toBe(0);expect(you(game,0).hand).toHaveLength(5);
    draw(game,0);expect(you(game,0).hand).toHaveLength(6);
    game.turnNumber=3;await ctrl.beginTurn();expect(replacements).toBe(1);
  });
});
