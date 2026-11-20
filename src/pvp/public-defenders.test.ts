import { describe, expect, it } from 'vitest';
import { MatchSession, parseSetup, type MatchFrame } from './session.js';
import { STARTERS } from './catalog.js';
import { moveCard } from '../core/state.js';
import type { PlayerId } from '../core/types.js';

/** Real engine attack, not a hand-written imitation of the wire format. */
describe.each([0, 1] as const)('public committed defenders, attacking seat %i', attacker => {
  it.each([0, 1, 2])('preserves %i defenders through checks, sync and cleanup', async count => {
    const defender = (1 - attacker) as PlayerId;
    const snapshots: { view: MatchFrame; owner: PlayerId; concealed: string[]; zones: Record<string, string> }[] = [];
    const revealedChecks = new Set<string>();
    let session: MatchSession;
    session = new MatchSession([parseSetup({ deck: STARTERS.Luzon }), parseSetup({ deck: STARTERS.Luzon })], 42, () => {
      for (const owner of [0, 1] as const) {
        const publicIds = new Set(session.game.activeBattle?.blockers ?? []);
        const frame = session.frame(owner);
        if (frame.presentation?.hook.startsWith('onCheck')) revealedChecks.add(frame.presentation.args[0] as string);
        snapshots.push({ view: JSON.parse(JSON.stringify(frame)), owner,
          concealed: session.game.players[(1-owner) as PlayerId].hand.filter(uid => !publicIds.has(uid) && !revealedChecks.has(uid)),
          zones: Object.fromEntries([...publicIds].map(uid => [uid, session.game.cards[uid]!.zone])) });
      }
    });
    const game = session.game;
    game.phase = 'battle'; game.turnPlayer = attacker;
    for (const p of game.players) {
      p.activeCodex = null;
      for (const uid of [...p.hand]) moveCard(game, uid, 'deck');
    }
    const candidates = Object.values(game.cards).filter(c => c.owner === defender && c.defId.endsWith('/river-calling-sister-alig')).map(c => c.uid);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    candidates.forEach(uid => moveCard(game, uid, 'hand'));
    const blockers = candidates.slice(0, count);
    const attack = session.ctrl.legalActions(attacker).find(a => a.kind === 'attack' && a.target === null && a.attacker === game.players[attacker].persona);
    expect(attack).toBeTruthy();
    let done = false;
    const run = session.action(attacker, session.revision, { ...attack!, supporters: [] }).finally(() => { done = true; });
    let last = '';
    for (let spins = 0; !done && spins < 1000; spins++) {
      const d = session.decisions.pending;
      if (d && d.id !== last) {
        last = d.id;
        // A reconnect is a fresh projection without a historical animation hook.
        const sync = session.frame(d.owner);
        expect(sync.decision?.id).toBe(d.id);
        expect(session.frame((1-d.owner) as PlayerId).decision).toBeNull();
        const answer = d.kind === 'blockPrompt' ? blockers
          : d.kind === 'confirm' ? false
          : d.kind === 'revealCards' || d.kind === 'revealConfirm' ? true
          : d.kind === 'chooseCards' || d.kind === 'battleCards' ? [] : null;
        expect(session.decisions.answer(d.owner, d.id, answer)).toBe(true);
        expect(session.decisions.answer(d.owner, d.id, answer)).toBe(false);
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(done).toBe(true); await run;
    expect(snapshots.some(s => s.view.presentation?.hook === 'onBeforeAttackCheck')).toBe(true);
    for (const { view, concealed, zones } of snapshots) {
      for (const uid of view.state.activeBattle?.blockers ?? []) {
        expect(view.state.cards[uid], `r${view.revision} ${view.presentation?.hook}: missing public defender`).toBeDefined();
        expect(view.state.cards[uid]!.defId).not.toBe('__hidden__');
        expect(view.state.cards[uid]!.zone).toBe(zones[uid]);
        if (zones[uid] === 'hand') expect(view.state.players[view.state.activeBattle!.defender].hand).toContain(uid);
      }
      for (const uid of concealed) expect(view.state.cards[uid], 'unselected opposing hand must stay concealed').toBeUndefined();
    }
    blockers.forEach(uid => expect(game.players[defender].grave).toContain(uid));
    expect(game.activeBattle).toBeNull();
    expect(session.busy).toBe(false);
    expect(session.ctrl.legalActions(attacker).some(a => a.kind === 'endTurn')).toBe(true);
  });
});
