import { availableSupporters } from '../core/battle';
import { maxPlays, personaLevel } from '../core/state';
import type { PlayerId } from '../core/types';
import { stateReadout } from '../ui/state-readout';
import { MATCH_INDEX } from './catalog';
import type { MatchSession } from './session';

/** Optional native presentation fields. Never extend the visibility of a frame. */
export function nativeFrame(session: MatchSession, viewer: PlayerId) {
  const frame = session.frame(viewer);
  const hud = ([viewer, (1 - viewer) as PlayerId]).map((owner, seat) => {
    const active = session.game.players[owner].activeCodex;
    const state = active ? MATCH_INDEX[session.game.cards[active]!.defId]?.state : undefined;
    return {
      level: personaLevel(MATCH_INDEX, session.game, owner),
      playsLeft: maxPlays(MATCH_INDEX, session.game, owner) - session.game.players[owner].normalPlaysUsed,
      state,
      progress: state ? stateReadout(MATCH_INDEX, frame.state, seat as PlayerId, state) : null,
    };
  });
  const supporters = Object.fromEntries(frame.legal.filter(a => a.kind === 'attack')
    .map(a => [a.attacker, availableSupporters(session.game, a.attacker)]));
  return { ...frame, hud, supporters };
}
