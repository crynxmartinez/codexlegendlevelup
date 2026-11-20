import { expect, it, vi } from 'vitest';
import agta from '../../decks/agta-set-1.json';
import babaylan from '../../decks/babaylan-set-1.json';
import maguindanao from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { DuelAudit } from './duel-audit.js';
import { RecordingChooser, ReplayChooser, stateHash } from './replay.js';

it('preserves target prompt options while recording', async () => {
  const game = createGame(index, [agta, agta], { seed: 29 });
  const ai = new AiChooser(index, () => game);
  const target = vi.spyOn(ai, 'chooseTarget').mockResolvedValue(null);
  const options = { draft: true, optional: true };
  const recording = new RecordingChooser(ai);
  await recording.chooseTarget(0, 'Choose', [], options);
  expect(target).toHaveBeenCalledWith(0, 'Choose', [], options);
  expect(recording.choices).toEqual([{ q: 'chooseTarget', p: 0, a: null }]);
});

for (const deck of [agta, babaylan, maguindanao]) {
  it(`records and reproduces ${deck.name} decisions without exposing a live export`, async () => {
    const game = createGame(index, [deck, deck], { seed: 29 });
    const ai = new AiChooser(index, () => game);
    const audit = new DuelAudit(game, [ai, ai], 'all');
    const ctrl = new GameController(game, index, { choosers: audit.choosers });
    audit.attach(ctrl);
    expect(() => audit.exportCompleted()).toThrow(/still running/);
    for (let i = 0; i < 4 && game.winner === null; i++) {
      await ctrl.beginTurn(); await playAiTurn(ctrl, game.turnPlayer);
    }
    // End this short evidence fixture with an explicit external surrender.
    const beforeSurrender = stateHash(game);
    game.winner = 1; game.winReason = 'surrender';
    const saved = JSON.parse(JSON.stringify(audit.exportCompleted())) as ReturnType<DuelAudit['exportCompleted']>;
    expect(saved.choices.length).toBeGreaterThan(0);
    expect(saved.hashes).toHaveLength(saved.steps.length);
    for (const decision of saved.decisions) {
      const view = decision.visible;
      // A committed defender is public even before it leaves the hand. Every
      // other opposing hand card must remain concealed at this decision boundary.
      const publicDefenders = view.activeBattle?.defender === 1 ? view.activeBattle.blockers : [];
      for (const uid of view.players[1].hand) {
        if (publicDefenders.includes(uid)) expect(index[view.cards[uid]!.defId]).toBeDefined();
        else expect(view.cards[uid]!.defId, `concealed opponent card ${uid}`).toBe('__hidden__');
      }
      for (const player of view.players) for (const uid of [...player.deck, ...player.barriers]) {
        expect(view.cards[uid]!.defId).toBe('__hidden__');
      }
    }
    const rebuilt = structuredClone(saved.initialState);
    const chooser = new ReplayChooser(saved.choices);
    const replay = new GameController(rebuilt, index, { choosers: [chooser, chooser], promptPolicy: () => saved.promptPolicy });
    for (let i = 0; i < saved.steps.length; i++) {
      const step = saved.steps[i]!;
      if (step.t === 'turn') await replay.beginTurn(); else await replay.perform(step.action, step.p);
      expect(stateHash(rebuilt), `boundary ${i}`).toBe(saved.hashes[i]);
    }
    expect(stateHash(rebuilt)).toBe(beforeSurrender);
    expect(chooser.remaining).toBe(0);
    expect(saved.terminalOverride?.beforeHash).toBe(stateHash(rebuilt));
    rebuilt.winner = saved.terminalOverride!.winner;
    rebuilt.winReason = 'surrender';
    expect(stateHash(rebuilt)).toBe(saved.result.finalHash);
  }, 30000);
}
