import { expect, it, vi, afterEach } from 'vitest';
import agta from '../../decks/agta-set-1.json';
import babaylan from '../../decks/babaylan-set-1.json';
import maguindanao from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from '../core/setup.js';
import { GameController } from '../core/game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { DuelAudit } from '../core/duel-audit.js';
import { ReplayChooser, stateHash } from '../core/replay.js';
import { applyBattlefieldPresentation, createAnimeChrome } from './battlefield-presentation.js';

afterEach(() => vi.unstubAllGlobals());
// This verifies rule-state parity with the presentation projection enabled.
// Real pointer handling and animation anchors are verified separately in Opera.
for (const [a, b] of [[agta, babaylan], [babaylan, maguindanao], [maguindanao, agta]] as const) {
  it(`replays identical decisions across presentations: ${a.name} / ${b.name}`, async () => {
    class Node { className=''; textContent=''; setAttribute(){} append(){} }
    vi.stubGlobal('document', { createElement: () => new Node(), body: {classList: {toggle: vi.fn()}} });
    const game = createGame(index, [a, b], { seed: 7 });
    const ai = new AiChooser(index, () => game);
    const audit = new DuelAudit(game, [ai, ai], 'all');
    const controller = new GameController(game, index, {choosers: audit.choosers, promptPolicy: () => 'all'});
    audit.attach(controller);
    for (let turn=0; turn<4 && game.winner===null; turn++) {
      await controller.beginTurn(); await playAiTurn(controller, game.turnPlayer);
    }
    game.winner=1; game.winReason='surrender';
    const recorded=audit.exportCompleted();
    expect(recorded.steps.some(step => step.t==='act' && step.action.kind==='call')).toBe(true);
    expect(recorded.steps.some(step => step.t==='act' && step.action.kind==='attack')).toBe(true);
    const traces: string[][]=[];
    for (const mode of ['classic','anime'] as const) {
      const restored=structuredClone(recorded.initialState), chooser=new ReplayChooser(recorded.choices);
      const replay=new GameController(restored,index,{choosers:[chooser,chooser],promptPolicy:()=>'all'});
      const trace:string[]=[];
      applyBattlefieldPresentation(mode);
      for (let i=0;i<recorded.steps.length;i++) {
        const step=recorded.steps[i]!;
        if (step.t==='turn') await replay.beginTurn(); else await replay.perform(step.action,step.p);
        if(mode==='anime') createAnimeChrome({turn:restored.turnNumber,localTurn:restored.turnPlayer===0,phase:restored.phase});
        trace.push(stateHash(restored));
        expect(trace.at(-1), `${mode}, boundary ${i}`).toBe(recorded.hashes[i]);
      }
      expect(chooser.remaining).toBe(0); traces.push(trace);
    }
    expect(traces[0]).toEqual(traces[1]);
  },30000);
}
