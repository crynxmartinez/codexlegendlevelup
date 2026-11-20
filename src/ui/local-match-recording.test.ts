import { describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { GameController } from '../core/game.js';
import { createGame } from '../core/setup.js';
import { stateHash } from '../core/replay.js';
import { STARTERS, MATCH_INDEX } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';
import { LocalMatchRecording, LocalReplaySession, recordingUnavailable } from './local-match-recording.js';
import { describeResult } from './replay-store.js';

async function fixture(first: 0 | 1 = 0, natural = false) {
  const decks = [STARTERS.Luzon!, STARTERS.Visayas!] as const;
  const game = createGame(MATCH_INDEX, [...decks], { seed: 18, firstPlayer: first });
  const ai = new AiChooser(MATCH_INDEX, () => game);
  const players: [{ nickname: string; region: string }, { nickname: string; region: string }] = [{ nickname: 'Original name', region: 'Luzon' }, { nickname: 'AI opponent', region: 'Visayas' }];
  const recording = new LocalMatchRecording(game, [ai, ai], { decks: [...decks], names: [decks[0].name, decks[1].name], viewer: first, promptPolicy: 'all', players });
  players[0].nickname = 'Changed after match start';
  const ctrl = new GameController(game, MATCH_INDEX, { choosers: recording.choosers });
  recording.attach(ctrl);
  for (let turn = 0; turn < (natural ? 80 : 3) && game.winner === null; turn++) {
    await ctrl.beginTurn(); await playAiTurn(ctrl, game.turnPlayer);
  }
  if (!natural && game.winner === null) { game.winner = 1; game.winReason = 'surrender'; }
  expect(game.winner).not.toBeNull();
  return { game, recording, entry: recording.completed() };
}

describe('completed local recordings', () => {
  it('reconstructs a naturally completed match with every checkpoint and exact visible exchange', async () => {
    const { game, entry } = await fixture(0, true);
    const hash = stateHash(game);
    expect(entry.summary.players![0].nickname).toBe('Original name');
    expect(recordingUnavailable(entry)).toBeNull();
    expect(entry.localCapture!.exchanges.length).toBeGreaterThan(1);
    const replay = new LocalReplaySession(entry, MATCH_INDEX);
    for (const step of entry.replay.steps) await replay.apply(step);
    expect(stateHash(replay.game)).toBe(hash);
    expect(stateHash(game)).toBe(hash);
  });
  it('keeps seat identity and reconstructs explicit terminal-only surrender', async () => {
    const { entry } = await fixture(1);
    const replay = new LocalReplaySession(entry, MATCH_INDEX);
    for (const step of entry.replay.steps) await replay.apply(step);
    expect(stateHash(replay.game)).toBe(entry.replay.result!.finalHash);
    expect(describeResult(entry.summary)).toContain('won');
    const view = playerView(replay.game, 1, null, []);
    expect(view.players[1].hand.every(uid => view.cards[uid]?.defId === '__hidden__')).toBe(true);
    expect(view.players[0].barriers.every(uid => view.cards[uid]?.defId === '__hidden__')).toBe(true);
  });
  it('refuses live export and a second attachment', () => {
    const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 6 });
    const ai = new AiChooser(MATCH_INDEX, () => game);
    const rec = new LocalMatchRecording(game, [ai, ai], { decks: [STARTERS.Luzon!, STARTERS.Visayas!], names: ['A', 'B'], viewer: 0, promptPolicy: 'all', players: [{}, {}] });
    const ctrl = new GameController(game, MATCH_INDEX, { choosers: rec.choosers }); rec.attach(ctrl);
    expect(() => rec.completed()).toThrow(/still running/);
    expect(() => rec.attach(ctrl)).toThrow(/already attached/);
  });
  it('refuses an in-flight concession even after the interrupted boundary settles', async () => {
    const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 6 });
    const ai = new AiChooser(MATCH_INDEX, () => game);
    const rec = new LocalMatchRecording(game, [ai, ai], { decks: [STARTERS.Luzon!, STARTERS.Visayas!], names: ['A', 'B'], viewer: 0, promptPolicy: 'all', players: [{}, {}] });
    const ctrl = new GameController(game, MATCH_INDEX, { choosers: rec.choosers });
    let release!: () => void;
    // Model a controller awaiting an unresolved human response or presentation.
    ctrl.perform = async () => new Promise<void>(resolve => { release = resolve; });
    rec.attach(ctrl);
    const action = ctrl.perform({ kind: 'endPhase' }, 0);
    expect(rec.isPending).toBe(true);
    expect(ctrl.concede(0)).toBe(true);
    expect(rec.unavailableReason).toMatch(/unresolved action/);
    expect(() => rec.completed()).toThrow(/unresolved action/);
    release(); await action;
    expect(rec.isPending).toBe(false);
    expect(() => rec.completed()).toThrow(/unresolved action/);
  });
  it('fails rather than guessing an unavailable group, legacy viewer, PvP source or damaged checkpoint', async () => {
    const { entry } = await fixture();
    expect(recordingUnavailable(entry, -10)).toMatch(/exact position/);
    const legacy = structuredClone(entry); delete legacy.summary.viewer;
    expect(recordingUnavailable(legacy)).toMatch(/legacy/);
    expect(describeResult(legacy.summary)).toContain('perspective not recorded');
    const pvp = structuredClone(entry); pvp.summary.mode = 'pvp';
    expect(recordingUnavailable(pvp)).toMatch(/privacy-safe/);
    const damaged = structuredClone(entry); damaged.replay.hashes![0] = 'wrong';
    const replay = new LocalReplaySession(damaged, MATCH_INDEX);
    await expect(replay.apply(damaged.replay.steps[0]!)).rejects.toThrow(/differs/);
  });
  it('detects mapping drift even when rules hashes are unchanged', async () => {
    const { entry } = await fixture();
    entry.localCapture!.exchanges[0]!.eventIds = [999999];
    const replay = new LocalReplaySession(entry, MATCH_INDEX);
    await expect((async () => { for (const step of entry.replay.steps) await replay.apply(step); })()).rejects.toThrow(/event position/);
  });
  it('commits a real captured match once and reloads its immutable metadata and checkpoints', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('localStorage', { getItem: () => null, removeItem: () => {} });
    try {
      const { recording, entry } = await fixture();
      const first = recording.saveCompleted();
      expect(recording.saveCompleted()).toBe(first);
      expect((await first).saved).toBe(true);
      vi.resetModules();
      const store = await import('./replay-store.js');
      await store.initReplayStore();
      const loaded = store.findReplay(entry.summary.id)!;
      expect(loaded).toEqual(entry);
      expect(loaded.summary.players![0].nickname).toBe('Original name');
      const session = new LocalReplaySession(loaded, MATCH_INDEX);
      for (const step of loaded.replay.steps) await session.apply(step);
      expect(stateHash(session.game)).toBe(loaded.replay.result!.finalHash);
    } finally { vi.unstubAllGlobals(); }
  });
});
