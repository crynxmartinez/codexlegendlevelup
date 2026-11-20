/**
 * A replay has one job: produce the same duel twice.
 *
 * The test that matters is the round trip — record a real game, replay it from
 * the seed and the recorded answers, and compare a hash of everything a player
 * could see. Anything less proves nothing: a replay that gets the winner right
 * and the deck order wrong is a replay that will diverge on the next feature
 * built on top of it.
 *
 * The second thing under test is refusal. A replay that silently guesses when
 * it runs out of answers produces a plausible duel that never happened, and
 * someone will eventually use one to argue about a rule.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import {
  RecordingChooser, ReplayChooser, ReplayDivergence, REPLAY_FORMAT_VERSION,
  assertNotLive, decodeReplay, encodeReplay, prepareForReplay, stateHash,
  type Replay, type ReplayStep,
} from './replay.js';
import type { GameState, PlayerId } from './types.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
  Babaylan: babaylanDeck as unknown as DeckList,
};
const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);

interface Recorded {
  game: GameState;
  replay: Replay;
}

/** Play a bot game, writing down every action and every answer. */
async function record(a: string, b: string, seed: number, turns = 12): Promise<Recorded> {
  // Uids come from a module-level counter, so every game in this file has to
  // start it from zero or the recorded actions name cards the rebuild has not
  // created. See prepareForReplay.
  prepareForReplay();
  const game = createGame(index, [DECKS[a]!, DECKS[b]!], { seed });
  const inner = new AiChooser(index, () => game);
  const rec = new RecordingChooser(inner);
  const ctrl = new GameController(game, index, { choosers: [rec, rec] });

  const steps: ReplayStep[] = [];
  const originalPerform = ctrl.perform.bind(ctrl);
  ctrl.perform = async (action, p) => {
    steps.push({ t: 'act', action, p });
    await originalPerform(action, p);
  };

  let n = 0;
  while (game.winner === null && n < turns) {
    steps.push({ t: 'turn' });
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer);
    n++;
  }

  return {
    game,
    replay: {
      header: {
        formatVersion: REPLAY_FORMAT_VERSION,
        engineVersion: 'test',
        seed,
        decks: [a, b],
        setup: [{}, {}],
        firstPlayer: 0,
        visibility: 'private',
        recordedAt: new Date(0).toISOString(),
      },
      steps,
      choices: rec.choices,
      result: {
        winner: game.winner,
        reason: game.winReason,
        finalHash: stateHash(game),
      },
    },
  };
}

/**
 * Re-run a recording.
 *
 * The bot is never consulted: every answer comes from the recording, which is
 * the whole point. If the engine asks a question the recording does not have,
 * ReplayChooser throws rather than improvising.
 */
async function replay(r: Replay): Promise<GameState> {
  const [a, b] = r.header.decks;
  prepareForReplay();
  const game = createGame(index, [DECKS[a]!, DECKS[b]!], { seed: r.header.seed });
  const chooser = new ReplayChooser(r.choices);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  // Straight down the recorded list. No inference about whose turn it is and
  // no early exit on a winner: the recording already stopped where the duel
  // did, and second-guessing it is how a replay drifts.
  for (const step of r.steps) {
    if (step.t === 'turn') await ctrl.beginTurn();
    else await ctrl.perform(step.action, step.p);
  }
  return game;
}

describe('a recording reproduces the duel', () => {
  it('ends in the same state, for all three decks', async () => {
    for (const [a, b, seed] of [
      ['Agta', 'Maguindanao', 4],
      ['Babaylan', 'Agta', 6],
      ['Maguindanao', 'Babaylan', 9],
    ] as const) {
      const { replay: r } = await record(a, b, seed);
      const again = await replay(r);
      expect(stateHash(again), `${a} vs ${b} seed ${seed}`).toBe(r.result!.finalHash);
    }
  });

  it('reproduces deck order, not merely the winner', async () => {
    const { game, replay: r } = await record('Agta', 'Maguindanao', 4);
    const again = await replay(r);
    for (const pid of [0, 1] as PlayerId[]) {
      expect(again.players[pid].deck, 'deck order must match exactly')
        .toEqual(game.players[pid].deck);
      expect(again.players[pid].grave).toEqual(game.players[pid].grave);
      expect(again.players[pid].barriers).toEqual(game.players[pid].barriers);
    }
  });

  it('reproduces how many checks happened', async () => {
    // checkCount drives the Force handicap, so a replay that got it wrong
    // would diverge on the next check rather than immediately.
    const { game, replay: r } = await record('Agta', 'Maguindanao', 4);
    const again = await replay(r);
    expect(again.checkCount).toBe(game.checkCount);
  });

  it('captures the nested answers, not just the actions', async () => {
    const { replay: r } = await record('Maguindanao', 'Agta', 7);
    const acts = r.steps.filter((s) => s.t === 'act');
    expect(acts.length, 'a dozen turns is several actions').toBeGreaterThan(3);
    expect(r.choices.length, 'abilities ask questions the actions do not carry')
      .toBeGreaterThan(0);
  });
});

describe('the hash notices what a player would notice', () => {
  it('differs when a card is somewhere else', async () => {
    const { game } = await record('Agta', 'Maguindanao', 4);
    const before = stateHash(game);
    const moved = game.players[0].deck.shift();
    if (moved) game.players[0].hand.push(moved);
    expect(stateHash(game)).not.toBe(before);
  });

  it('ignores the event log, which is not rules state', async () => {
    const { game } = await record('Agta', 'Maguindanao', 4);
    const before = stateHash(game);
    game.log.push('a line that changes nothing');
    expect(stateHash(game)).toBe(before);
  });
});

describe('a replay refuses rather than improvises', () => {
  it('throws when the recording runs out of answers', async () => {
    const chooser = new ReplayChooser([]);
    await expect(chooser.confirm(0, 'anything')).rejects.toThrow(ReplayDivergence);
  });

  it('throws when the engine asks a different question', async () => {
    const chooser = new ReplayChooser([{ q: 'confirm', p: 0, a: true }]);
    await expect(chooser.chooseTarget(0, 'x', [])).rejects.toThrow(/diverged/);
  });

  it('reports how many answers are left', () => {
    const chooser = new ReplayChooser([{ q: 'confirm', p: 0, a: true }]);
    expect(chooser.remaining).toBe(1);
  });
});

describe('replay codes survive the round trip', () => {
  it('encodes and decodes to the same replay', async () => {
    const { replay: r } = await record('Agta', 'Maguindanao', 4, 6);
    const decoded = decodeReplay(encodeReplay(r));
    expect(decoded).not.toBeNull();
    expect(decoded!.result!.finalHash).toBe(r.result!.finalHash);
    expect(decoded!.choices.length).toBe(r.choices.length);
  });

  it('produces a URL-safe code', async () => {
    const { replay: r } = await record('Agta', 'Maguindanao', 4, 4);
    expect(encodeReplay(r)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects damage rather than half-reading it', () => {
    expect(decodeReplay('not a replay at all')).toBeNull();
    expect(decodeReplay('')).toBeNull();
  });

  it('rejects a replay from an incompatible format', async () => {
    const { replay: r } = await record('Agta', 'Maguindanao', 4, 4);
    r.header.formatVersion = REPLAY_FORMAT_VERSION + 1;
    expect(decodeReplay(encodeReplay(r)), 'a future replay must not half-load').toBeNull();
  });
});

describe('a live duel cannot be exported', () => {
  it('refuses while the game is still running', async () => {
    const { game } = await record('Agta', 'Maguindanao', 4, 2);
    if (game.winner === null) {
      expect(() => assertNotLive(game)).toThrow(/still running/);
    }
  });

  it('allows it once the duel is over', async () => {
    const { game } = await record('Agta', 'Maguindanao', 4, 2);
    game.winner = 0;
    expect(() => assertNotLive(game)).not.toThrow();
  });
});
