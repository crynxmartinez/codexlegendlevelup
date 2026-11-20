import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { moveCard } from '../core/state.js';
import { playerView } from '../pvp/view.js';
import { fieldPosition, waitingAttackEffect, grantedSkills } from './field-card-info.js';

it('distinguishes identical field copies by their displayed positions', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
  const card = game.cards[game.players[0].persona!]!;
  expect(fieldPosition(card, 0)).toBe('You · Persona');
  const left = { ...card, zone: 'ally' as const, slot: 1 }, right = { ...left, slot: 2 };
  expect(fieldPosition(left, 0)).toBe('You · Left');
  expect(fieldPosition(right, 0)).toBe('You · Right');
  expect(fieldPosition(left, 1)).toBe('Foe · Right');
  expect(fieldPosition({ ...left, zone: 'grave' }, 0)).toBeUndefined();
});

it('publishes the active granted attack skills, then removes consumed or expired grants', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
  const card = game.cards[game.players[0].persona!]!;
  card.sevenHeadsTurn = card.sulaymanHitDrawTurn = card.firstAttackExtraCheckTurn = card.skipCheckTurn = game.turnNumber;
  const expected = ['seven-heads', 'hit-draw', 'extra-check', 'skip-check'];
  expect(grantedSkills(card, game.turnNumber).map(s => s.id)).toEqual(expected);
  for (const seat of [0, 1] as const) expect(grantedSkills(playerView(game, seat, null, []).cards[card.uid]!, game.turnNumber).map(s => s.id)).toEqual(expected);
  card.firstAttackTakenTurn = game.turnNumber;
  card.sulaymanHitDrawTurn = undefined;
  expect(grantedSkills(card, game.turnNumber).map(s => s.id)).toEqual(['seven-heads', 'skip-check']);
  expect(grantedSkills(card, game.turnNumber + 1)).toEqual([]);
  moveCard(game, card.uid, 'grave');
  expect(grantedSkills(card, game.turnNumber)).toEqual([]);
});

it('shows the waiting effect to both seats and expires it on a new field entry or turn', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Mindanao!], { seed: 4 });
  const uid = game.players[0].hand[0]!;
  moveCard(game, uid, 'ally', { slot: 1 });
  const card = game.cards[uid]!;
  card.grantedRepeat = { turn: game.turnNumber, entry: card.fieldEntry ?? 0 };
  expect(waitingAttackEffect(card, game.turnNumber)).toContain('Until Tarabusaw Tired');
  for (const seat of [0, 1] as const) {
    expect(waitingAttackEffect(playerView(game, seat, null, []).cards[uid]!, game.turnNumber)).toContain('Offer another Ally');
  }
  expect(waitingAttackEffect(card, game.turnNumber + 1)).toBeUndefined();
  moveCard(game, uid, 'grave');
  expect(waitingAttackEffect(card, game.turnNumber)).toBeUndefined();
  moveCard(game, uid, 'ally', { slot: 1 });
  expect(waitingAttackEffect(card, game.turnNumber)).toBeUndefined();
});
