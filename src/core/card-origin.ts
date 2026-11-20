import type { CardIndex } from './state.js';
import type { GameState, PlayerId, Zone } from './types.js';

/** Public location at the time an effect happened, not the card's later location. */
export interface CardOrigin { uid: string; name: string; owner: PlayerId; zone: Zone; slot: number | null }
export function publicCardOrigin(index: CardIndex, game: GameState, uid: string): CardOrigin | undefined {
  const c = game.cards[uid];
  if (!c || c.faceDown || !['ally', 'persona', 'grave', 'check', 'codex'].includes(c.zone)) return;
  const name = index[c.defId]?.name;
  if (!name) return;
  return { uid, name, owner: c.owner, zone: c.zone, slot: c.slot };
}
