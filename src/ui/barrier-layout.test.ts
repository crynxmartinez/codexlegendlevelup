import { describe, expect, it } from 'vitest';
import { damagePersona } from '../core/battle.js';
import { createGame } from '../core/setup.js';
import { moveCard, type CardIndex } from '../core/state.js';
import { BARRIER_COUNT, type GameState, type PlayerId } from '../core/types.js';
import { FULL_INDEX } from '../data/loader.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';
import { createFirstBattle } from './first-battle.js';
import { barrierSlots } from './barrier-layout.js';

const players: PlayerId[] = [0, 1];

function assertBreaksStayInPlace(game: GameState, index: CardIndex, owner: PlayerId): void {
  const original = [...game.players[owner].barriers];
  const initial = barrierSlots(original);
  expect(initial).toHaveLength(BARRIER_COUNT);
  expect(initial.slice(0, BARRIER_COUNT - original.length)).toEqual(
    Array(BARRIER_COUNT - original.length).fill(undefined),
  );
  for (const uid of original) {
    const before = barrierSlots(game.players[owner].barriers);
    const slot = initial.indexOf(uid);
    expect(damagePersona(index, game, owner)).toEqual({ broken: true, revealed: uid });
    expect(game.cards[uid]!.breaking).toBe(true);
    // The flip plays before resolveCheck removes the card: retain its origin.
    expect(barrierSlots(game.players[owner].barriers)).toEqual(before);
    game.cards[uid]!.breaking = false;
    moveCard(game, uid, 'check');
    const after = barrierSlots(game.players[owner].barriers);
    expect(after).toHaveLength(BARRIER_COUNT);
    expect(after[slot]).toBeUndefined();
    for (const survivor of game.players[owner].barriers) {
      expect(after.indexOf(survivor)).toBe(initial.indexOf(survivor));
    }
    moveCard(game, uid, 'hand');
  }
  expect(barrierSlots(game.players[owner].barriers)).toEqual(Array(BARRIER_COUNT).fill(undefined));
}

describe('fixed Barrier sockets', () => {
  it.each(players)('keeps every survivor fixed through five engine breaks for player %s', owner => {
    const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 42 });
    assertBreaksStayInPlace(game, MATCH_INDEX, owner);
  });

  it.each(players)('keeps the two prepared tutorial Barriers fixed for player %s', owner => {
    const { game, profile } = createFirstBattle(FULL_INDEX, 'luzon');
    expect(game.players[owner].barriers).toHaveLength(2);
    assertBreaksStayInPlace(game, profile.index, owner);
  });

  it.each(players)('preserves occupied positions with masked PvP aliases for viewer %s', viewer => {
    for (const owner of players) {
      const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 42 });
      const original = [...game.players[owner].barriers];
      const seat = owner === viewer ? 0 : 1;
      const initialView = playerView(game, viewer, null, []);
      expect(initialView.players[seat].barriers).toEqual(original.map((_, i) => `hidden-${seat}-barriers-${i}`));
      for (let broken = 0; broken < BARRIER_COUNT; broken++) {
        const uid = game.players[owner].barriers[0]!;
        damagePersona(MATCH_INDEX, game, owner);
        const during = playerView(game, viewer, null, []);
        expect(barrierSlots(during.players[seat].barriers)[broken]).toBe(`hidden-${seat}-barriers-0`);
        game.cards[uid]!.breaking = false;
        moveCard(game, uid, 'check', { faceDown: false });
        const after = playerView(game, viewer, null, []);
        const slots = barrierSlots(after.players[seat].barriers);
        expect(slots.slice(0, broken + 1)).toEqual(Array(broken + 1).fill(undefined));
        for (let i = broken + 1; i < BARRIER_COUNT; i++) {
          const alias = `hidden-${seat}-barriers-${i - broken - 1}`;
          expect(slots[i]).toBe(alias);
          expect(after.cards[alias]).toMatchObject({ owner: seat, defId: '__hidden__', faceDown: true });
          expect(after.cards[original[i]!]).toBeUndefined();
        }
        // A newly reconstructed snapshot needs no remembered identity or history.
        expect(barrierSlots(playerView(game, viewer, null, []).players[seat].barriers)).toEqual(slots);
        moveCard(game, uid, 'hand');
      }
    }
  });
});
