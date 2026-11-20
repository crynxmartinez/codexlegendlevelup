import { expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { switchCodex } from './turn.js';
import type { PlayerId } from './types.js';

function fixture(owner: PlayerId = 0) {
  const game = createGame(index, [deck, deck], { seed: 8 });
  game.turnPlayer = owner; game.phase = 'main';
  const ps = game.players[owner];
  const previous = game.cards[ps.activeCodex!]!;
  const next = ps.codex.find(uid => uid !== previous.uid)!;
  return { game, ps, previous, next };
}

it.each([
  [0, false], [0, true], [1, false], [1, true],
] as const)('captures the public predecessor once for seat %i, automatic=%s without changing its cost', (owner, automatic) => {
  const { game, ps, previous, next } = fixture(owner);
  const previousDefId = previous.defId;
  switchCodex(index, game, next, { player: owner, automatic });
  const first = game.pendingFx.at(-1)!;
  expect(first).toEqual({ kind: 'codexFlip', uid: next, player: owner, previousDefId });
  expect(previous.faceDown).toBe(true);
  expect(game.cards[next]!.faceDown).toBe(false);
  expect(ps.normalPlaysUsed).toBe(automatic ? 0 : 1);
  // A later switch changes the active instance, not the already captured event.
  switchCodex(index, game, previous.uid, { player: owner, automatic: true });
  expect(first).toEqual({ kind: 'codexFlip', uid: next, player: owner, previousDefId });
  expect(game.pendingFx.at(-1)).toEqual({ kind: 'codexFlip', uid: previous.uid, player: owner,
    previousDefId: game.cards[next]!.defId });
  expect(ps.normalPlaysUsed).toBe(automatic ? 0 : 1);
});

it('does not take predecessor art from a face-down active card or another face-up reserve', () => {
  const { game, ps, previous, next } = fixture();
  previous.faceDown = true;
  const other = ps.codex.find(uid => uid !== previous.uid && uid !== next)!;
  game.cards[other]!.faceDown = false;
  switchCodex(index, game, next, { automatic: true });
  expect(game.pendingFx.at(-1)).toEqual({ kind: 'codexFlip', uid: next, player: 0 });
});

it('omits predecessor metadata when no active Codex exists', () => {
  const { game, ps, next } = fixture();
  ps.activeCodex = null;
  switchCodex(index, game, next, { automatic: true });
  expect(game.pendingFx.at(-1)).toEqual({ kind: 'codexFlip', uid: next, player: 0 });
});

it.each(['unknown', 'not-codex', 'wrong-owner', 'wrong-zone', 'outside-pile'] as const)(
  'omits metadata for an invalid public predecessor: %s', invalid => {
    const { game, ps, previous, next } = fixture();
    if (invalid === 'unknown') previous.defId = 'unknown-codex';
    if (invalid === 'not-codex') previous.defId = game.cards[ps.persona!]!.defId;
    if (invalid === 'wrong-owner') previous.owner = 1;
    if (invalid === 'wrong-zone') previous.zone = 'hand';
    if (invalid === 'outside-pile') ps.codex = ps.codex.filter(uid => uid !== previous.uid);
    switchCodex(index, game, next, { automatic: true });
    expect(game.pendingFx.at(-1)).toEqual({ kind: 'codexFlip', uid: next, player: 0 });
  },
);
