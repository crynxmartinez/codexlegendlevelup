import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../data/loader.js';
import { createGame } from '../core/setup.js';
import { moveCard } from '../core/state.js';
import type { PlayerId } from '../core/types.js';
import { STARTERS } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';
import { BOSS_ATTACK_PROFILES, getPersonaAttackProfile } from './boss-attack-profiles.js';

const owners = [0, 1] as const;
const profiles = Object.keys(BOSS_ATTACK_PROFILES);

function ready(id: string, owner: PlayerId) {
  const deck = STARTERS[ALL_CARDS[id]!.archipelago!]!;
  const game = createGame(ALL_CARDS, [deck, deck], { seed: 181126, firstPlayer: owner });
  const persona = game.players[owner].persona!;
  const ally = game.players[owner].deck[0]!;
  game.cards[persona]!.defId = id;
  game.cards[ally]!.defId = id;
  moveCard(game, ally, 'ally', { slot: 0 });
  return { game, persona, ally };
}

describe('special attack eligibility follows the current Persona', () => {
  it.each(profiles)('limits %s to the active Persona for either owner', id => {
    for (const owner of owners) {
      const { game, persona, ally } = ready(id, owner);
      const before = structuredClone(game);
      expect(getPersonaAttackProfile(game, persona)).toBe(BOSS_ATTACK_PROFILES[id]);
      expect(getPersonaAttackProfile(game, ally)).toBeUndefined();
      expect(game).toEqual(before);
    }
  });

  it.each(owners)('updates eligibility when player %i replaces their Persona with the same card definition', owner => {
    const id = profiles[0]!;
    const { game, persona, ally } = ready(id, owner);
    expect(getPersonaAttackProfile(game, persona)).toBe(BOSS_ATTACK_PROFILES[id]);
    expect(getPersonaAttackProfile(game, ally)).toBeUndefined();

    moveCard(game, persona, 'ally', { slot: 1 });
    moveCard(game, ally, 'persona');
    expect(game.players[owner].persona).toBe(ally);
    expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
    expect(getPersonaAttackProfile(game, ally)).toBe(BOSS_ATTACK_PROFILES[id]);

    moveCard(game, ally, 'grave');
    expect(getPersonaAttackProfile(game, ally)).toBeUndefined();
    moveCard(game, persona, 'persona');
    expect(getPersonaAttackProfile(game, persona)).toBe(BOSS_ATTACK_PROFILES[id]);
  });

  it.each(owners)('requires both Persona membership and the Persona zone for player %i', owner => {
    const { game, persona, ally } = ready(profiles[0]!, owner);
    game.cards[ally]!.zone = 'persona';
    expect(getPersonaAttackProfile(game, ally)).toBeUndefined();
    game.cards[persona]!.zone = 'ally';
    expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
    game.cards[persona]!.zone = 'persona';
    game.players[owner].persona = null;
    expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
  });

  it.each(['__hidden__', 'toString', '__proto__', '', 'missing/card',
    'maguindanao/set-1/ridge-bed-multiplier-omaka-an'])('rejects unsupported current Persona ID %s', id => {
    const { game, persona } = ready(profiles[0]!, 0);
    game.cards[persona]!.defId = id;
    expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
  });

  it('rejects missing cards and supported definitions outside the field', () => {
    const { game, persona } = ready(profiles[0]!, 0);
    expect(getPersonaAttackProfile(game, 'missing-instance')).toBeUndefined();
    for (const zone of ['hand', 'deck', 'heart', 'grave', 'exile'] as const) {
      moveCard(game, persona, zone);
      expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
    }
    delete game.cards[persona];
    expect(getPersonaAttackProfile(game, persona)).toBeUndefined();
  });

  it.each(profiles)('keeps %s eligibility consistent in both PvP viewer orientations', id => {
    for (const owner of owners) {
      const { game, persona, ally } = ready(id, owner);
      for (const viewer of owners) {
        const view = playerView(game, viewer, null, []);
        const before = structuredClone(view);
        expect(view.cards[persona]!.owner).toBe(owner === viewer ? 0 : 1);
        expect(getPersonaAttackProfile(view, persona)).toBe(BOSS_ATTACK_PROFILES[id]);
        expect(getPersonaAttackProfile(view, ally)).toBeUndefined();
        expect(view).toEqual(before);
      }
    }
  });
});
