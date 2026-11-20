import type { GameState, PlayerId } from '../core/types.js';
import type { CardIndex } from '../core/state.js';
import { graveCardValue, isUnitCard } from '../core/effects.js';

/** Read only public/available card definitions; never infer a hidden card. */
export function stateReadout(index: CardIndex, game: GameState, player: PlayerId, state: string) {
  const ps = game.players[player];
  const threshold = state === 'Garahana' ? 5 : state === 'Andukha' ? 6 : 4;
  const zone = state === 'Garahana' ? ps.grave : state === 'Andukha' ? ps.heart : ps.allies.filter((u): u is string => !!u);
  let hidden = false;
  const entries: { uid: string; value: number }[] = [];
  for (const uid of zone) {
    const card = game.cards[uid], d = card && index[card.defId];
    if (!d || card.faceDown) { hidden = true; continue; }
    const value = state === 'Garahana'
      ? isUnitCard(d) && d.subtypes.some(s => s === 'Maguindanao' || s === 'Maguindanaon') ? graveCardValue(index, game, uid) : 0
      : state === 'Andukha' ? d.id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1
      : isUnitCard(d) && d.subtypes.includes('Luzon Arch') ? 1 : 0;
    if (value) entries.push({ uid, value });
  }
  return { count: entries.reduce((n, c) => n + c.value, 0), threshold, entries, hidden,
    rule: state === 'Garahana' ? 'Five Maguindanao Units in Grave. Alad counts as two. Forces count as Units; Actions do not.'
      : state === 'Andukha' ? 'Six cards in Heart. Baya counts as two.' : 'A Luzon Unit in each of your four Ally Zones.',
    reminder: 'The State locks again when its condition is no longer met. Your active Codex must carry this State.' };
}
