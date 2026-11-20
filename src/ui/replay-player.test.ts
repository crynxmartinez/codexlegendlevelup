/**
 * The transport, against a host that records what it was asked to do.
 *
 * What is under test is not "does it move" but the two things that go wrong
 * quietly: a seek that lands on the wrong position because it was rebuilt from
 * the wrong place, and a seek that lands on the right position because a
 * slower earlier seek happened to finish last. A scrubber fires dozens of
 * seeks per drag, so the second is not a theoretical race.
 */
import { describe, expect, it } from 'vitest';
import { ReplayPlayer, type ReplayHost } from './replay-player.js';
import type { ReplayStep } from '../core/replay.js';
import type { PlayerAction } from '../core/game.js';

const act = (n: number): ReplayStep =>
  ({ t: 'act', action: { kind: 'endPhase' } as PlayerAction, p: (n % 2) as 0 | 1 });

/** turn, act, act, turn, act, act, turn, act — three turns, eight steps. */
const STEPS: ReplayStep[] = [
  { t: 'turn' }, act(0), act(1),
  { t: 'turn' }, act(2), act(3),
  { t: 'turn' }, act(4),
];

interface Spy extends ReplayHost {
  applied: number;
  resets: number;
  renders: number;
  /** Steps applied since the last reset — the position, as the host sees it. */
  depth: number;
}

function spy(opts: { delay?: number; failAt?: number } = {}): Spy {
  const h: Spy = {
    applied: 0, resets: 0, renders: 0, depth: 0,
    async reset() { h.resets++; h.depth = 0; },
    async apply() {
      if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay));
      if (opts.failAt !== undefined && h.depth === opts.failAt) {
        throw new Error('diverged');
      }
      h.applied++;
      h.depth++;
    },
    render() { h.renders++; },
  };
  return h;
}

const make = (h: ReplayHost, ms = 0) =>
  new ReplayPlayer(STEPS, h, { interval: () => ms, sleep: async () => {} });

describe('a position is always rebuilt, never accumulated', () => {
  it('rebuilds from the start on every seek', async () => {
    const h = spy();
    const p = make(h);
    await p.seek(5);
    expect(h.resets).toBe(1);
    expect(h.depth, 'the host should be five steps in').toBe(5);
    await p.seek(2);
    expect(h.resets, 'seeking back must rebuild').toBe(2);
    expect(h.depth).toBe(2);
  });

  it('steps back by rebuilding, and lands exactly one step earlier', async () => {
    const h = spy();
    const p = make(h);
    await p.seek(4);
    await p.stepBack();
    expect(p.position.index).toBe(3);
    expect(h.depth).toBe(3);
  });

  it('clamps rather than running off either end', async () => {
    const h = spy();
    const p = make(h);
    await p.seek(999);
    expect(p.position.index).toBe(STEPS.length);
    await p.seek(-4);
    expect(p.position.index).toBe(0);
    await p.stepBack();
    expect(p.position.index).toBe(0);
  });

  it('does not reset for a step forward while playing', async () => {
    // Forward is the one direction that needs no rebuild, and rebuilding would
    // replay every animation from the opening position.
    const h = spy();
    const p = make(h);
    await p.seek(0);
    const before = h.resets;
    await p.stepForward();
    expect(h.resets, 'a single forward step should still be a seek').toBe(before + 1);
    p.play();
    await new Promise((r) => setTimeout(r, 20));
    expect(h.resets, 'playing must not rebuild on every step').toBe(before + 1);
  });
});

describe('turns are what a person navigates by', () => {
  it('counts them', () => {
    expect(make(spy()).turnCount).toBe(3);
  });

  it('knows where each begins', () => {
    expect(make(spy()).turnStarts()).toEqual([0, 3, 6]);
  });

  it('reports which turn a position is in', async () => {
    const p = make(spy());
    await p.seek(0);
    expect(p.position.turn).toBe(0);
    await p.seek(1);
    expect(p.position.turn).toBe(1);
    await p.seek(4);
    expect(p.position.turn).toBe(2);
    await p.seek(8);
    expect(p.position.turn).toBe(3);
  });

  it('jumps forward to the next turn', async () => {
    const p = make(spy());
    await p.seek(1);
    await p.nextTurn();
    expect(p.position.index).toBe(3);
  });

  it('goes to the start of this turn first, then the one before', async () => {
    // The behaviour every media player has: the first press restarts the
    // chapter you are in, the second takes you to the previous one.
    const p = make(spy());
    await p.seek(5);
    await p.previousTurn();
    expect(p.position.index).toBe(3);
    await p.previousTurn();
    expect(p.position.index).toBe(0);
  });

  it('runs to the end when there is no next turn', async () => {
    const p = make(spy());
    await p.seek(7);
    await p.nextTurn();
    expect(p.position.index).toBe(STEPS.length);
  });
});

describe('the last seek wins', () => {
  it('abandons an earlier slow seek rather than letting it land', async () => {
    // A scrubber drag: several seeks in flight, the earliest the slowest. If
    // the stale one wins, the board stops somewhere the player did not ask for
    // and the scrubber and the board disagree.
    const h = spy({ delay: 1 });
    const p = make(h);
    const slow = p.seek(8);
    const fast = p.seek(2);
    await Promise.all([slow, fast]);
    expect(p.position.index).toBe(2);
    expect(h.depth, 'the host should hold the position that was asked for last').toBe(2);
  });

  it('does not interleave two rebuilds', async () => {
    const h = spy({ delay: 1 });
    const p = make(h);
    await Promise.all([p.seek(3), p.seek(6), p.seek(4)]);
    expect(h.depth).toBe(4);
    expect(p.position.index).toBe(4);
  });
});

describe('a divergence stops everything', () => {
  it('reports where, and refuses to carry on', async () => {
    let reported: unknown = null;
    const h = spy({ failAt: 3 });
    h.onError = (e) => { reported = e; };
    const p = make(h);
    await p.seek(6);
    expect(reported).toBeInstanceOf(Error);
    expect(p.position.broken).toBe(true);
  });

  it('will not play once broken', async () => {
    const h = spy({ failAt: 2 });
    const p = make(h);
    await p.seek(5);
    p.play();
    expect(p.position.playing, 'a broken replay must not resume').toBe(false);
  });

  it('recovers if a later seek stays clear of the bad step', async () => {
    const h = spy({ failAt: 5 });
    const p = make(h);
    await p.seek(8);
    expect(p.position.broken).toBe(true);
    await p.seek(2);
    expect(p.position.broken, 'a good position should clear the flag').toBe(false);
  });
});

describe('playing', () => {
  it('runs to the end and stops', async () => {
    const p = make(spy());
    await p.seek(0);
    p.play();
    await new Promise((r) => setTimeout(r, 30));
    expect(p.position.index).toBe(STEPS.length);
    expect(p.position.playing).toBe(false);
  });

  it('stops where it was paused', async () => {
    const h = spy({ delay: 2 });
    const p = make(h);
    await p.seek(0);
    p.play();
    await new Promise((r) => setTimeout(r, 5));
    p.pause();
    const at = p.position.index;
    await new Promise((r) => setTimeout(r, 20));
    expect(p.position.index, 'a paused replay must not creep forward')
      .toBeLessThanOrEqual(at + 1);
    expect(p.position.playing).toBe(false);
  });

  it('does not start at the end', async () => {
    const p = make(spy());
    await p.seek(STEPS.length);
    p.play();
    expect(p.position.playing).toBe(false);
  });

  it('stops for good when destroyed', async () => {
    const p = make(spy());
    await p.seek(0);
    p.play();
    p.destroy();
    await new Promise((r) => setTimeout(r, 20));
    expect(p.position.playing).toBe(false);
  });
});


describe('playback cannot race a seek', () => {
  it('waits for an in-flight action before resetting the engine', async () => {
    let finish!: () => void;
    let active = false;
    let raced = false;
    const h: ReplayHost = {
      async reset() { if (active) raced = true; },
      async apply() { active = true; await new Promise<void>(r => { finish = r; }); active = false; },
      render() {},
    };
    const p = new ReplayPlayer(STEPS, h, { interval: () => 0 });
    p.play();
    await new Promise(r => setTimeout(r, 0));
    const seek = p.seek(0);
    finish();
    await seek;
    expect(raced).toBe(false);
    expect(p.position.index).toBe(0);
    expect(p.position.playing).toBe(false);
  });
});
