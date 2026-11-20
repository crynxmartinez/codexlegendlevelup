import { describe, expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { currentPower, moveCard } from '../core/state.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { PowerCueTracker, PhaseCueTracker, phaseCueKey, cueTiming, powerCuePosition, powerCueOverlap } from './combat-emphasis-cues.js';

const fixture = () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Luzon!], { seed: 4 });
  const card = game.cards[game.players[0].persona!]!, tracker = new PowerCueTracker();
  tracker.update(game, MATCH_INDEX);
  return { game, card, tracker, read: () => tracker.update(game, MATCH_INDEX) };
};

describe('actual visible Power cues', () => {
  it('shows one actual gain and its signed expiry, never another rerender', () => {
    const { card, read } = fixture();
    card.modifiers.push({ amount: 3000, source: 'Hininga ng Buhay, Nanolay', duration: 'endOfTurn' });
    expect(read()).toMatchObject([{ uid: card.uid, before: 11000, after: 14000, delta: 3000, source: 'Nanolay', detail: 'Until this turn ends', expired: false }]);
    expect(read()).toEqual([]);
    card.modifiers = [];
    expect(read()).toMatchObject([{ delta: -3000, expired: true, detail: 'Effect ended' }]);
    expect(read()).toEqual([]);
  });
  it('uses positive direction when a negative modifier expires', () => {
    const { card, read } = fixture();
    card.modifiers.push({ amount: -3000, source: 'Effect', duration: 'endOfAttack' });
    expect(read()[0]?.delta).toBe(-3000);
    card.modifiers = [];
    expect(read()).toMatchObject([{ delta: 3000, expired: true }]);
  });
  it('uses the engine result when the nominal reduction would pass zero', () => {
    const { game, card, read } = fixture(), before = currentPower(MATCH_INDEX, game, card.uid);
    card.modifiers.push({ amount: -20000, source: 'Effect', duration: 'endOfTurn' });
    const after = currentPower(MATCH_INDEX, game, card.uid);
    expect(read()[0]?.delta).toBe(after - before);
    card.modifiers = [];
    expect(read()[0]?.delta).toBe(before - after);
  });
  it('coalesces a snapshot and skips net-zero, preserving separate resolved changes', () => {
    const { card, read } = fixture();
    card.modifiers.push({ amount: 3000, source: 'A', duration: 'endOfTurn' }, { amount: -3000, source: 'B', duration: 'endOfTurn' });
    expect(read()).toEqual([]);
    card.modifiers.push({ amount: 3000, source: 'A', duration: 'endOfTurn' }, { amount: 5000, source: 'B', duration: 'endOfTurn' });
    expect(read()).toMatchObject([{ delta: 8000, source: '2 effects' }]);
    expect(read()).toEqual([]);
    card.modifiers.push({ amount: 3000, source: 'A', duration: 'endOfTurn' });
    expect(read()[0]?.delta).toBe(3000);
    card.modifiers.push({ amount: 5000, source: 'B', duration: 'endOfTurn' });
    expect(read()[0]?.delta).toBe(5000);
  });
  it('treats duplicate modifiers individually and resets without reconnect echo', () => {
    const { game, card, tracker, read } = fixture();
    const modifier = { amount: 3000, source: 'A', duration: 'endOfTurn' as const };
    card.modifiers.push({ ...modifier }, { ...modifier });
    expect(read()[0]?.delta).toBe(6000);
    card.modifiers.pop();
    expect(read()).toMatchObject([{ delta: -3000, expired: true }]);
    tracker.reset();
    expect(tracker.update(game, MATCH_INDEX)).toEqual([]);
  });
  it('does not reveal hidden cards or replay a card returning to the field', () => {
    const { game, card, read } = fixture();
    const hidden = game.cards[game.players[1].hand[0]!]!;
    hidden.modifiers.push({ amount: 5000, source: 'Secret', duration: 'endOfTurn' });
    expect(read()).toEqual([]);
    card.faceDown = true;
    card.modifiers.push({ amount: 3000, source: 'Hidden', duration: 'endOfTurn' });
    expect(read()).toEqual([]);
    card.faceDown = false; expect(read()).toEqual([]);
    moveCard(game, card.uid, 'grave'); expect(read()).toEqual([]);
    moveCard(game, card.uid, 'ally', { slot: 0 }); expect(read()).toEqual([]);
  });
});

it('deduplicates phase announcements but distinguishes player, phase and turn', () => {
  const tracker = new PhaseCueTracker();
  expect(tracker.take(phaseCueKey(1, 'battle', 0))).toBe(true);
  expect(tracker.take(phaseCueKey(1, 'battle', 0))).toBe(false);
  expect(tracker.take(phaseCueKey(1, 'end', 0))).toBe(true);
  expect(tracker.take(phaseCueKey(2, 'battle', 1))).toBe(true);
  tracker.reset(phaseCueKey(2, 'battle', 1));
  expect(tracker.take(phaseCueKey(2, 'battle', 1))).toBe(false);
});
it('reuses pace reading holds and puts the single pulse inside the hold', () => {
  expect(cueTiming('standard')).toEqual({ hold: 850, enter: 200, exit: 160, pulse: 340 });
  expect(cueTiming('fast').hold).toBe(220);
  expect(cueTiming('learning').hold).toBe(1100);
  for (const pace of ['standard', 'fast', 'learning'] as const) expect(cueTiming(pace).pulse).toBeLessThan(cueTiming(pace).hold);
});
it('avoids adjacent Allies rather than covering them with the Power label', () => {
  const card = { left: 400, top: 300, width: 100, height: 140 };
  const obstacles = [{ left: 250, top: 300, width: 100, height: 140 }, { left: 550, top: 300, width: 100, height: 140 }];
  expect(powerCuePosition(card, { width: 180, height: 80 }, { width: 900, height: 600 }, obstacles)).toEqual({ left: 360, top: 210 });
  const small = powerCuePosition({ left: 830, top: 350, width: 100, height: 140 }, { width: 148, height: 65 }, { width: 932, height: 430 });
  expect(small.left).toBeGreaterThanOrEqual(8); expect(small.left + 148).toBeLessThanOrEqual(924);
  expect(small.top + 65).toBeLessThanOrEqual(422);
});

it('uses a free side rail in the crowded 844×390 layout without covering hands, Barriers or controls', () => {
  const card = { left: 386, top: 210, width: 48, height: 66 };
  const obstacles = [
    // Two field rows, neighbours close enough that all four local candidates collide.
    ...[298, 386, 477].map(left => ({ left, top: 112, width: 48, height: 66 })),
    ...[298, 477].map(left => ({ left, top: 210, width: 48, height: 66 })),
    { left: 100, top: 285, width: 618, height: 105 }, // Actual .hand-bar, not .hand.
    { left: 100, top: -35, width: 618, height: 80 }, // Opponent hand.
    { left: 208, top: 305, width: 405, height: 38 },
    { left: 208, top: 30, width: 405, height: 38 },
    { left: 8, top: 300, width: 205, height: 84 },
    { left: 635, top: 0, width: 201, height: 90 },
    { left: 0, top: 100, width: 90, height: 142 },
    { left: 100, top: 55, width: 76, height: 220 },
    { left: 642, top: 113, width: 74, height: 222 },
    { left: 720, top: 325, width: 116, height: 50 },
  ];
  const view = { width: 844, height: 390 };
  const wide = { width: 148, height: 82 }, compact = { width: 116, height: 110 };
  const widePosition = powerCuePosition(card, wide, view, obstacles);
  expect(powerCueOverlap(widePosition, wide, [card, ...obstacles])).toBeGreaterThan(0);
  const position = powerCuePosition(card, compact, view, obstacles);
  expect(position).toEqual({ left: 720, top: 140 });
  expect(powerCueOverlap(position, compact, [card, ...obstacles])).toBe(0);
});
