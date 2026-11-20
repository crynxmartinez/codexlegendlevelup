import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { FULL_INDEX as index } from '../data/loader.js';
import { ALL_SCRIPTS } from '../core/game.js';
import { moveCard } from '../core/state.js';
import deck from '../../decks/maguindanao-set-1.json';
import { offerPreview } from './offer-preview.js';
it('previews exactly which copies leave, relevant effects and no committed outcome', () => {
  const game = createGame(index, [deck, deck], { seed: 9 });
  const ps = game.players[0];
  const add = (uid: string, suffix: string, slot: number) => {
    const defId = Object.keys(index).find(id => id.endsWith(suffix))!;
    game.cards[uid] = { ...structuredClone(game.cards[ps.persona!]!), uid, defId, zone: 'check', slot: null, faceDown: false };
    moveCard(game, uid, 'ally', { slot });
  };
  add('offered', 'house-shell-shadow-pahira', 0); add('sal-a', 'balete-laughing-spirit-ba-i-a-salendagao', 1);
  add('sal-b', 'balete-laughing-spirit-ba-i-a-salendagao', 2);
  const before = JSON.stringify(game);
  const preview = offerPreview(index, game, ALL_SCRIPTS, ['offered'], 0);
  expect(preview).toContain('To Grave:'); expect(preview).toContain('Pahira · You · Far left');
  expect(preview).toContain('Salendagao · You · Left'); expect(preview).toContain('Salendagao · You · Right');
  expect(preview).toContain('Possible pending effects'); expect(preview).toContain('checked after payment');
  expect(JSON.stringify(game)).toBe(before);
});
