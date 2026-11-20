/**
 * The presentation queue has to hold three promises, and they are the kind
 * that fail quietly.
 *
 *  1. It never blocks the rules. An animation that throws, or one whose
 *     element has gone, must leave a clean board and a moving queue — a frozen
 *     board with the engine waiting on a promise is the worst outcome here and
 *     the easiest one to ship.
 *  2. Skipping is not skipping state. "Finish animation" ends the current hold
 *     early; it must not dismiss an acknowledgement the pace asked for, and it
 *     must not drop queued events.
 *  3. Order is strict. A later event may not start before the current one has
 *     shown its source, target and result.
 */
import { describe, it, expect, vi } from 'vitest';
import { PresentationQueue, isImportant, statusFor, aiThinkTime, needsResultPresentation, announceNativeResults } from './presentation.js';
import type { PresentationSink, PresentedStep, DuelStatus } from './presentation.js';
import type { DuelEvent, DuelEventType } from '../core/events.js';
import type { DuelPace } from './pace.js';

let seq = 0;
it('does not repeat native hook results (local and protocol 3), but retains hookless and unhandled events', () => {
  for (const type of ['barrierBroken', 'sentryRevealed', 'personaChanged', 'codexSwitched', 'stateReleased'] as const) {
    expect(needsResultPresentation(ev(type), true)).toBe(false);
    expect(needsResultPresentation(ev(type), false)).toBe(true);
  }
  expect(needsResultPresentation(ev('forceResolved'), true)).toBe(true);
  expect(needsResultPresentation(ev('matchEnded'), true)).toBe(true);
});
function ev(type: DuelEventType, over: Partial<DuelEvent> = {}): DuelEvent {
  return {
    id: ++seq, group: 1, turn: 1, phase: 'main', actor: 0, type,
    sourceUids: [], targetUids: [], visibility: 'public',
    message: `${type} happened`, ...over,
  };
}

it('retains public native-result announcements without replaying visuals or announcing private events', () => {
  const { sink, calls } = recorder();
  const native = ['barrierBroken', 'sentryRevealed', 'personaChanged', 'codexSwitched', 'stateReleased'] as const;
  announceNativeResults([
    ...native.map(type => ev(type)), ev('forceResolved'), ev('matchEnded'), ev('powerChanged'),
    ev('codexSwitched', { visibility: 'owner' }), ev('personaChanged', { visibility: 'internal' }),
  ], step => sink.announce(step));
  expect(calls).toEqual(native.map(type => `announce:${type}`));
});

/** A sink that writes down what it was asked to do, in order. */
function recorder(over: Partial<PresentationSink> = {}) {
  const calls: string[] = [];
  const sink: PresentationSink = {
    announce: (s) => { calls.push(`announce:${s.event.type}`); },
    highlightSource: (u) => { calls.push(`source:${u.join(',')}`); },
    highlightTarget: (u) => { calls.push(`target:${u.join(',')}`); },
    move: async (s) => { calls.push(`move:${s.event.type}`); },
    showResult: (s) => { calls.push(`result:${s.event.type}`); },
    clear: () => { calls.push('clear'); },
    ...over,
  };
  return { sink, calls };
}

/** A queue with no real waiting, so the tests are fast and deterministic. */
function make(sink: PresentationSink, pace: DuelPace = 'standard', onStatus?: (s: DuelStatus) => void) {
  return new PresentationQueue(sink, {
    pace: () => pace,
    reducedMotion: () => false,
    sleep: async () => {},
    ...(onStatus ? { onStatus } : {}),
  });
}

describe('an event is shown in an order a player can follow', () => {
  it('announces, then source, then target, then movement, then result', async () => {
    const { sink, calls } = recorder();
    const q = make(sink);
    q.enqueue([ev('codexSwitched', {
      sourceUids: ['a'], targetUids: ['b'],
      movements: [{ uid: 'a', from: 'hand', to: 'ally', owner: 0 }],
    })]);
    await q.run();
    expect(calls).toEqual([
      'announce:codexSwitched', 'source:a', 'target:b', 'move:codexSwitched',
      'result:codexSwitched', 'clear',
    ]);
  });

  it('skips the stages an event has nothing for', async () => {
    const { sink, calls } = recorder();
    const q = make(sink);
    q.enqueue([ev('personaChanged')]);
    await q.run();
    expect(calls).toEqual(['announce:personaChanged', 'result:personaChanged', 'clear']);
  });

  it('finishes one event completely before starting the next', async () => {
    const { sink, calls } = recorder();
    const q = make(sink);
    q.enqueue([ev('codexSwitched', { sourceUids: ['a'] }), ev('sentryRevealed', { sourceUids: ['b'] })]);
    await q.run();
    const firstClear = calls.indexOf('clear');
    const secondAnnounce = calls.indexOf('announce:sentryRevealed');
    expect(secondAnnounce, 'the second event began before the first finished')
      .toBeGreaterThan(firstClear);
  });
});

describe('routine events are recorded, never performed', () => {
  /**
   * The bug this fixes was visible in play: the banner was still narrating the
   * Main Phase while the player was in Battle.
   *
   * Measured over six turns of a real duel: 283 events, 111 of them
   * `cardMoved` — one for every zone change the engine makes. At Standard pace
   * each cost about 1.3 seconds to present, so movements alone produced some
   * 24 seconds of presentation per turn, against a turn the engine finishes in
   * under one. The queue fell behind by half a minute a turn, and compounded.
   */
  it('drops a routine event instead of queueing it', () => {
    const { sink, calls } = recorder();
    const q = make(sink);
    q.enqueue([ev('cardMoved'), ev('cardDrawn'), ev('phaseChanged')]);
    expect(q.pending, 'the machine’s bookkeeping is not a performance').toBe(0);
    expect(calls).toEqual([]);
  });

  it('still queues the ones that matter', () => {
    const q = make(recorder().sink);
    q.enqueue([ev('barrierBroken'), ev('forceResolved'), ev('matchEnded')]);
    expect(q.pending).toBe(3);
  });

  it('cannot fall behind a turn, because a turn has few important events', () => {
    // A whole turn's worth of traffic, in the proportion a real duel produces.
    const events = [
      ...Array.from({ length: 18 }, () => ev('cardMoved')),
      ...Array.from({ length: 5 }, () => ev('phaseChanged')),
      ...Array.from({ length: 4 }, () => ev('cardDrawn')),
      ev('barrierBroken'),
    ];
    const q = make(recorder().sink);
    q.enqueue(events);
    expect(q.pending, '28 events became one thing worth showing').toBe(1);
  });
});

describe('presentation never blocks the rules', () => {
  it('keeps going when an animation throws', async () => {
    const { calls } = recorder();
    const sink: PresentationSink = {
      announce: (s) => { calls.push(`announce:${s.event.type}`); },
      highlightSource: () => { throw new Error('element is gone'); },
      highlightTarget: () => {},
      move: async () => {},
      showResult: (s) => { calls.push(`result:${s.event.type}`); },
      clear: () => { calls.push('clear'); },
    };
    const q = make(sink);
    q.enqueue([ev('codexSwitched', { sourceUids: ['a'] }), ev('sentryRevealed')]);
    await expect(q.run()).resolves.toBeUndefined();
    // The failed step is abandoned but cleaned up, and the next one still runs.
    expect(calls).toContain('clear');
    expect(calls).toContain('announce:sentryRevealed');
    expect(calls).toContain('result:sentryRevealed');
  });

  it('clears the board even when a step fails', async () => {
    const clear = vi.fn();
    const q = make({
      announce: () => { throw new Error('boom'); },
      highlightSource: () => {}, highlightTarget: () => {},
      move: async () => {}, showResult: () => {}, clear,
    });
    q.enqueue([ev('codexSwitched')]);
    await q.run();
    expect(clear, 'temporary classes would be left behind').toHaveBeenCalled();
  });

  it('empties the queue rather than stalling on a bad event', async () => {
    const q = make({
      announce: () => { throw new Error('boom'); },
      highlightSource: () => {}, highlightTarget: () => {},
      move: async () => {}, showResult: () => {}, clear: () => {},
    });
    q.enqueue([ev('codexSwitched'), ev('sentryRevealed'), ev('personaChanged')]);
    await q.run();
    expect(q.pending).toBe(0);
    expect(q.isRunning).toBe(false);
  });
});

describe('finishing an animation does not skip the game', () => {
  it('still shows the result of the step it finished', async () => {
    const { sink, calls } = recorder();
    const q = make(sink, 'learning');
    q.enqueue([ev('codexSwitched', { sourceUids: ['a'] })]);
    const run = q.run();
    q.finishCurrent();
    await run;
    expect(calls).toContain('result:codexSwitched');
  });

  it('does not drop the events still queued behind it', async () => {
    const { sink, calls } = recorder();
    const q = make(sink);
    q.enqueue([ev('codexSwitched'), ev('sentryRevealed'), ev('personaChanged')]);
    const run = q.run();
    q.finishCurrent();
    await run;
    for (const t of ['codexSwitched', 'sentryRevealed', 'personaChanged']) {
      expect(calls, `${t} was skipped entirely`).toContain(`result:${t}`);
    }
  });

  it('automatically finishes important results even with saved Learning pace', async () => {
    const { sink, calls } = recorder();
    const q = make(sink, 'learning');
    q.enqueue([ev('barrierBroken'), ev('forceResolved')]);
    await q.run();
    expect(calls).toContain('result:barrierBroken');
    expect(calls).toContain('result:forceResolved');
    expect(q.isRunning).toBe(false);
  });

});

describe('important events get the stronger treatment', () => {
  it('marks the ones a new player must not miss', () => {
    for (const t of ['barrierBroken', 'forceResolved', 'sentryRevealed',
      'personaChanged', 'codexSwitched', 'stateReleased', 'matchEnded'] as DuelEventType[]) {
      expect(isImportant(ev(t)), `${t} should be important`).toBe(true);
    }
  });

  it('leaves the routine ones routine', () => {
    for (const t of ['cardDrawn', 'phaseChanged', 'cardMoved'] as DuelEventType[]) {
      expect(isImportant(ev(t)), `${t} should not interrupt`).toBe(false);
    }
  });

  it.each(['learning', 'standard', 'fast'] as DuelPace[])('finishes %s results without user input', async pace => {
    const { sink } = recorder();
    const q = make(sink, pace);
    q.enqueue([ev('barrierBroken')]);
    await q.run();
    expect(q.pending).toBe(0);
  });

});

describe('the status line is derived, never guessed', () => {
  it('names who is being waited on', () => {
    expect(statusFor(ev('defenseStarted', { actor: 1 })).waitingFor).toBe('opponent');
    expect(statusFor(ev('defenseStarted', { actor: 0 })).waitingFor).toBe('you');
  });

  it('says what happens next where it knows', () => {
    const s = statusFor(ev('attackDeclared', { actor: 1 }));
    expect(s.now).toMatch(/Opponent/);
    expect(s.next).toBeTruthy();
    expect(s.waitingFor, 'their attack is your decision').toBe('you');
  });

  it('uses You and Opponent, never player numbers', () => {
    for (const t of ['turnStarted', 'attackDeclared', 'defenseStarted'] as DuelEventType[]) {
      for (const actor of [0, 1] as const) {
        const s = statusFor(ev(t, { actor }));
        expect(s.now, `${t} leaked a player number`).not.toMatch(/Player [01]/);
      }
    }
  });

  it('updates as the queue runs, and ends on the player', async () => {
    const seen: DuelStatus[] = [];
    const { sink } = recorder();
    const q = make(sink, 'standard', (s) => seen.push(s));
    // An important event, because routine ones no longer reach the queue.
    q.enqueue([ev('barrierBroken', { actor: 1 })]);
    await q.run();
    expect(seen.length, 'the status should move while the queue runs')
      .toBeGreaterThan(1);
    expect(seen.at(-1)!.waitingFor, 'the board should hand control back').toBe('you');
  });
});

describe('the AI is never instant', () => {
  it('takes longer to think at a slower pace', () => {
    expect(aiThinkTime('learning')).toBeGreaterThan(aiThinkTime('standard'));
    expect(aiThinkTime('standard')).toBeGreaterThan(aiThinkTime('fast'));
    expect(aiThinkTime('fast'), 'an instant opponent reads as a bug').toBeGreaterThan(0);
  });
});

describe('tearing down', () => {
  it('does not show a stale result after resetting during a source hold', async () => {
    const { sink, calls } = recorder();
    const q = new PresentationQueue(sink, { pace: () => 'learning', reducedMotion: () => false, sleep: () => new Promise(() => {}) });
    q.enqueue([ev('barrierBroken', { sourceUids: ['a'] })]);
    const running = q.run(); q.reset(); await running;
    expect(calls).not.toContain('result:barrierBroken');
    expect(calls).not.toContain('ack');
    expect(q.isRunning).toBe(false);
  });
  it('releases a pending timed result on teardown', async () => {
    const { sink } = recorder();
    const q = new PresentationQueue(sink, { pace: () => 'learning', reducedMotion: () => false, sleep: () => new Promise(() => {}) });
    q.enqueue([ev('barrierBroken')]);
    const running = q.run(); q.reset(); await running;
    expect(q.isRunning).toBe(false);
  });
  it('drops what is queued and clears the board', async () => {
    const clear = vi.fn();
    const q = make({
      announce: () => {}, highlightSource: () => {}, highlightTarget: () => {},
      move: async () => {}, showResult: () => {}, clear,
    });
    q.enqueue([ev('codexSwitched'), ev('sentryRevealed')]);
    q.reset();
    expect(q.pending).toBe(0);
    expect(clear).toHaveBeenCalled();
  });
});

function _unused(_s: PresentedStep): void { /* keeps the type imported */ }
void _unused;
