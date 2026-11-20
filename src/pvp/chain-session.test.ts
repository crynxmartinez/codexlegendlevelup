import { expect, it, vi } from 'vitest';
import { MatchSession, parseSetup } from './session.js';
import { STARTERS } from './catalog.js';
import { moveCard } from '../core/state.js';

it('resyncs a paid response chain without exposing the other hand or paying twice', async () => {
  const s = new MatchSession([parseSetup({ deck: STARTERS.Luzon }), parseSetup({ deck: STARTERS.Luzon })], 42, () => {});
  s.game.phase = 'main'; s.game.turnPlayer = 0;
  const forces: string[] = [];
  for (const p of s.game.players) {
    p.activeCodex = null;
    for (const uid of [...p.hand]) moveCard(s.game, uid, 'deck');
    const copies = Object.values(s.game.cards).filter(c => c.owner === p.id && c.defId.endsWith('/beast-spirit-healer-subkal'));
    for (const c of copies.slice(0, 2)) moveCard(s.game, c.uid, 'hand');
    forces.push(copies[0]!.uid);
  }
  const root = Object.values(s.game.cards).find(c => c.owner === 0 && c.defId.endsWith('/the-three-brothers-ascend'))!;
  moveCard(s.game, root.uid, 'hand'); forces[0] = root.uid;
  const action = s.ctrl.legalActions(0).find(a => a.kind === 'playAction' && a.uid === root.uid)!;
  const running = s.action(0, s.revision, action);
  let answered = '';
  const next = async () => {
    await vi.waitFor(() => expect(s.decisions.pending?.id).toBeTruthy(), { timeout: 2000, interval: 1 });
    await vi.waitFor(() => expect(s.decisions.pending!.id).not.toBe(answered), { timeout: 2000, interval: 1 });
    return s.decisions.pending!;
  };
  const reply = (answer: unknown) => {
    const d = s.decisions.pending!; answered = d.id;
    expect(s.decisions.answer(d.owner, d.id, answer)).toBe(true);
    expect(s.decisions.answer(d.owner, d.id, answer)).toBe(false);
  };
  let d = await next(); expect(d.owner).toBe(1); expect(d.kind).toBe('chooseAbility');
  expect(s.game.players[0]!.grave).toContain(forces[0]);
  // Reconnect/sync reads the same outstanding decision and committed link.
  const restored = JSON.parse(JSON.stringify(s.frame(1)));
  expect(restored.decision.id).toBe(d.id);
  expect(restored.state.responseChain.links).toHaveLength(1);
  expect(s.frame(0).decision).toBeNull();
  expect(s.decisions.answer(0, d.id, 0)).toBe(false);
  reply(0);
  d = await next(); expect(d.owner).toBe(0); expect(d.kind).toBe('chooseAbility');
  const own = s.frame(0), enemy = s.frame(1);
  expect(own.state.responseChain!.links.map(l => l.ordinal)).toEqual([1, 2]);
  expect(own.state.responseChain!.links.every(l => !l.receipt && !l.event)).toBe(true);
  // Public target descriptions are safe to show; private choice prompts and receipts are not.
  expect(own.state.responseChain!.links.every(l => (l.declared ?? []).every(c => c.prompt === '' && c.targets.every(t => !!own.state.cards[t.uid])))).toBe(true);
  expect(enemy.decision).toBeNull();
  expect(own.state.cards[s.game.players[1]!.hand[0]!]).toBeUndefined();
  const joined=own.cues.at(-1)!.chain!;
  expect(joined.stage).toBe('activated');
  expect(joined.links.map(link=>[link.ordinal,link.owner])).toEqual([[1,0],[2,1]]);
  expect(enemy.cues.at(-1)!.chain!.links.map(link=>link.owner)).toEqual([1,0]);
  expect(joined.links.every(link=>Object.keys(link).sort().join(',')==='defId,ordinal,owner')).toBe(true);
  reply(null);
  await running;
  expect(s.game.responseChain).toBeNull(); expect(s.busy).toBe(false);
  expect(s.game.players.map(p => p.normalPlaysUsed)).toEqual([1, 0]);
  expect(s.game.players.map(p => p.grave.length)).toEqual([1, 1]);
  const resolved = s.game.duel!.events.filter(e => e.type === 'abilityResolved');
  expect(resolved.map(e => e.actor)).toEqual([1, 0]);
  const visuals=s.frame(0).cues.filter(cue=>cue.chain?.stage==='resolving');
  expect(visuals.map(cue=>cue.chain!.ordinal)).toEqual([2,1]);
  expect(visuals.map(cue=>cue.chain!.negated)).toEqual([false,true]);
  expect(visuals.map(cue=>cue.chain!.links.map(link=>link.ordinal))).toEqual([[1,2],[1]]);
});
