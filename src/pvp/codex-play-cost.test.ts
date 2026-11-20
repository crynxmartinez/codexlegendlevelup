import { expect, it } from 'vitest';
import { maxPlays } from '../core/state.js';
import type { PlayerAction } from '../core/game.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { MatchSession, parseSetup } from './session.js';

/** Decline optional skills through the same gate used by connected players. */
async function settle(session: MatchSession, work: Promise<void>): Promise<void> {
  let done = false, error: unknown;
  work.then(() => { done = true; }, reason => { done = true; error = reason; });
  for (let spin = 0; !done && spin < 300; spin++) {
    const decision = session.decisions.pending;
    if (decision) {
      let answer: unknown;
      switch (decision.kind) {
        case 'chooseAbility': case 'chooseTarget': case 'personifyPrompt': answer = null; break;
        case 'confirm': case 'revealConfirm': answer = false; break;
        case 'revealCards': answer = true; break;
        default: throw new Error(`Unexpected required decision: ${decision.kind}`);
      }
      expect(session.decisions.answer(decision.owner, decision.id, answer), decision.kind).toBe(true);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (error) throw error;
  expect(done, 'authoritative action completes after optional decisions').toBe(true);
}

it.each([
  ['Luzon', 'Visayas', 0], ['Luzon', 'Visayas', 1],
  ['Visayas', 'Mindanao', 0], ['Visayas', 'Mindanao', 1],
  ['Mindanao', 'Luzon', 0], ['Mindanao', 'Luzon', 1],
] as const)('charges manual switches once and rejects zero-Plays/stale actions: %s/%s, seat %i', async (left, right, seat) => {
  const session = new MatchSession([
    parseSetup({ deck: STARTERS[left] }), parseSetup({ deck: STARTERS[right] }),
  ], 42, () => {}, seat);
  const player = session.game.players[seat], opponent = session.game.players[1 - seat]!;
  // Choosing starting Codex cards is setup, not a paid manual switch.
  expect(session.game.players.map(p => p.normalPlaysUsed)).toEqual([0, 0]);
  await settle(session, session.start());
  expect(session.game.phase).toBe('main');
  expect(player.normalPlaysUsed).toBe(0);

  const action = session.frame(seat).legal.find((a): a is Extract<PlayerAction, { kind: 'switchCodex' }> => a.kind === 'switchCodex');
  expect(action).toBeDefined();
  const revision = session.revision, previous = player.activeCodex!;
  await settle(session, session.action(seat, revision, action));
  expect(player.activeCodex).toBe(action!.uid);
  expect(player.normalPlaysUsed).toBe(1);
  expect(opponent.normalPlaysUsed).toBe(0);
  expect(session.game.cards[previous]!.faceDown).toBe(true);
  expect(session.game.cards[action!.uid]!.faceDown).toBe(false);
  for (const viewer of [0, 1] as const) {
    const projectedSeat = viewer === seat ? 0 : 1;
    expect(session.frame(viewer).state.players[projectedSeat]!.normalPlaysUsed).toBe(1);
  }

  const afterSwitch = JSON.stringify(session.game), afterRevision = session.revision;
  await expect(session.action(seat, revision, action)).rejects.toThrow('The table changed');
  expect(JSON.stringify(session.game)).toBe(afterSwitch);
  expect(session.revision).toBe(afterRevision);

  // Spend the remaining allowance with legal switches, rather than editing
  // the counter or disabling on-play skills to manufacture an exhausted turn.
  for (let count = 0; player.normalPlaysUsed < maxPlays(MATCH_INDEX, session.game, seat) && count < 10; count++) {
    const next = session.frame(seat).legal.find(a => a.kind === 'switchCodex');
    expect(next).toBeDefined();
    const used = player.normalPlaysUsed;
    await settle(session, session.action(seat, session.revision, next));
    expect(player.normalPlaysUsed).toBe(used + 1);
  }
  expect(player.normalPlaysUsed).toBe(maxPlays(MATCH_INDEX, session.game, seat));
  expect(session.frame(seat).legal.some(a => a.kind === 'switchCodex')).toBe(false);
  const reserve = player.codex.find(uid => uid !== player.activeCodex)!;
  const beforeRejected = JSON.stringify(session.game), exhaustedRevision = session.revision;
  await expect(session.action(seat, session.revision, { kind: 'switchCodex', uid: reserve })).rejects.toThrow('That move is not available');
  expect(JSON.stringify(session.game)).toBe(beforeRejected);
  expect(session.revision).toBe(exhaustedRevision);
  expect(session.busy).toBe(false);
  expect(session.decisions.pending).toBeNull();
  session.close();
});
