/**
 * Pace changes how long the game waits, and nothing else.
 *
 * The rule that must not break: a duel played on Fast and the same duel played
 * on Learning reach the same state. Timing is presentation; if a profile ever
 * reaches into the rules, this is where it should be caught.
 *
 * The other risk is a zero. A result that appears and vanishes inside a frame
 * has not been shown, it has been skipped, and skipping a result is the one
 * thing pace is not allowed to do — so every profile has a floor.
 */
import { describe, it, expect } from 'vitest';
import {
  PACE_PROFILES, PACE_DESCRIPTIONS, defaultPace, isPresentation,
  requiresAcknowledgement, waitFor,
  type DuelPace, type PaceProfile,
} from './pace.js';

const PACES: DuelPace[] = ['learning', 'standard', 'fast'];
const MOMENTS = Object.keys(PACE_PROFILES.standard) as (keyof PaceProfile)[];

describe('every pace is complete and sane', () => {
  it('defines every moment for every pace', () => {
    for (const p of PACES) {
      for (const m of MOMENTS) {
        expect(PACE_PROFILES[p][m], `${p}.${m} is missing`).toBeDefined();
      }
    }
  });

  it('never lets a result flash past', () => {
    // 200ms is roughly the floor for noticing something appeared at all.
    for (const p of PACES) {
      const v = PACE_PROFILES[p].importantResult;
      if (v === 'manual') continue;
      expect(v, `${p} shows an important result for ${v}ms`).toBeGreaterThanOrEqual(200);
      expect(PACE_PROFILES[p].resultHold, `${p} result hold`).toBeGreaterThanOrEqual(200);
    }
  });

  it('gets faster in the direction it says it does', () => {
    for (const m of MOMENTS) {
      const learning = PACE_PROFILES.learning[m];
      const standard = PACE_PROFILES.standard[m];
      const fast = PACE_PROFILES.fast[m];
      if (typeof standard !== 'number' || typeof fast !== 'number') continue;
      expect(fast, `fast.${m} is not faster than standard`).toBeLessThanOrEqual(standard);
      if (typeof learning === 'number') {
        expect(standard, `standard.${m} is not faster than learning`)
          .toBeLessThanOrEqual(learning);
      }
    }
  });

  it('describes each pace to the player', () => {
    for (const p of PACES) {
      expect(PACE_DESCRIPTIONS[p].label.length).toBeGreaterThan(0);
      expect(PACE_DESCRIPTIONS[p].detail.length).toBeGreaterThan(20);
    }
  });
});

describe('normal play never requires result acknowledgement', () => {
  it('keeps saved Learning settings readable without blocking', () => {
    expect(requiresAcknowledgement('learning', 'importantResult')).toBe(false);
    expect(waitFor('learning', 'importantResult')).toBeGreaterThan(900);
  });

  it('does not stop the routine ones', () => {
    expect(requiresAcknowledgement('learning', 'routine')).toBe(false);
    expect(waitFor('learning', 'routine')).toBeGreaterThan(0);
  });

  it('uses finite holds for every normal-game pace', () => {
    for (const p of PACES) {
      for (const m of MOMENTS) {
        expect(requiresAcknowledgement(p, m), `${p}.${m} should be timed`).toBe(false);
      }
    }
  });
});

describe('reduced motion is a different axis from speed', () => {
  it('shortens movement', () => {
    const normal = waitFor('learning', 'cardMove')!;
    const reduced = waitFor('learning', 'cardMove', true)!;
    expect(reduced).toBeLessThan(normal);
  });

  it('does not shorten reading time', () => {
    // Someone who gets motion sick still needs time to read the result.
    for (const p of PACES) {
      for (const m of ['resultHold', 'targetHold', 'abilityIntro'] as (keyof PaceProfile)[]) {
        expect(waitFor(p, m, true), `${p}.${m} was cut by reduced motion`)
          .toBe(waitFor(p, m, false));
      }
    }
  });

  it('still leaves a cut rather than a teleport', () => {
    expect(waitFor('fast', 'cardMove', true)).toBeGreaterThan(0);
  });
});

describe('the default respects who is asking', () => {
  it('starts a normal game at Standard', () => {
    expect(defaultPace(false)).toBe('standard');
  });

  it('does not slow down someone who was already playing', () => {
    expect(defaultPace(true)).toBe('standard');
  });
});

describe('presentation time is separable from decision time', () => {
  it('marks every moment in the table as presentation', () => {
    // Needed before a PvP clock exists: animation speed must never become a
    // competitive advantage, so none of this may be charged to a player.
    for (const m of MOMENTS) {
      expect(isPresentation(m), `${m} would be charged to the player`).toBe(true);
    }
  });
});
it('gives source activation its own reading time, including reduced motion', () => {
  expect(waitFor('standard', 'sourceActivation')).toBe(2800);
  for (const pace of ['fast', 'standard', 'learning'] as const) {
    expect(waitFor(pace, 'sourceActivation', true)).toBe(waitFor(pace, 'sourceActivation'));
    expect(isPresentation('sourceActivation')).toBe(true);
  }
});
