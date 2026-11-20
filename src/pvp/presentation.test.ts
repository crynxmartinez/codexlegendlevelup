import { expect, it } from 'vitest';
import { FramePlayback, presentationForViewer, type MatchPresentation } from './presentation.js';
import { MatchSession, parseSetup, type MatchFrame } from './session.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { moveCard } from '../core/state.js';
import { createChain, declineResponse } from '../core/response-chain.js';
import { switchCodex } from '../core/turn.js';

const setup = () => [parseSetup({ deck: STARTERS.Mindanao }), parseSetup({ deck: STARTERS.Luzon })] as const;
it('does not apply a later frame until the current animation has completed', async () => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const seen: string[] = [];
  const playback = new FramePlayback<string>(async value => { seen.push(value); if (value === 'glow') await held; }, error => { throw error; });
  playback.push('glow'); playback.push('draw'); playback.push('next link'); playback.push('decision');
  expect(seen).toEqual(['glow']);
  release(); await held; await new Promise(resolve => setTimeout(resolve, 0));
  expect(seen).toEqual(['glow', 'draw', 'next link', 'decision']);
  expect(playback.pending).toBe(false);
});
it('drops stale queued frames on reconnect without starting overlapping playback', async () => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const seen: number[] = [];
  const playback = new FramePlayback<number>(async value => { seen.push(value); if (value === 1) await held; }, error => { throw error; });
  playback.push(1); playback.push(2); playback.clear(); playback.push(3);
  expect(seen).toEqual([1]); release(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(seen).toEqual([1, 3]);
});
it('publishes separate immutable snapshots for each link, draw and check step', async () => {
  const frames: MatchFrame[] = [];
  const s = new MatchSession([...setup()], 42, () => frames.push(s.frame(0)));
  const uid = s.game.players[0].persona!;
  const chain = s.game.responseChain = createChain('chain', { id:'one', source:uid, owner:0, skillId:'skill', label:'Draw a card' });
  await s.ctrl.hooks.onChainUpdated?.();
  declineResponse(chain, 1);
  await s.ctrl.hooks.onAbilityActivated?.(uid, 'Draw a card', 0, 'ability', 1);
  const drawn = s.game.players[0].deck[0]!; moveCard(s.game, drawn, 'hand');
  await s.ctrl.hooks.onEffectDraw?.(drawn, 0);
  expect(frames.map(f => f.presentation?.hook)).toEqual(['onChainUpdated', 'onAbilityActivated', 'onEffectDraw']);
  expect(frames[0]!.state.responseChain?.phase).toBe('building');
  expect(frames[1]!.state.players[0].hand).not.toContain(drawn);
  expect(frames[2]!.state.players[0].hand).toContain(drawn);
  expect(s.frame(0).presentation).toBeUndefined(); // reconnect never replays a historical hook
  const shield = s.game.players[1].barriers[0]!; moveCard(s.game, shield, 'check');
  await s.ctrl.hooks.onCheckCardPlaced?.(shield, 'barrier', 1);
  await s.ctrl.hooks.onCheckRevealed?.(shield, false, 'barrier');
  expect(frames.slice(-2).map(f => f.presentation?.hook)).toEqual(['onCheckCardPlaced', 'onCheckRevealed']);
});
it('keeps hidden draws and returns private, but publishes calls and their source identity', () => {
  const s = new MatchSession([...setup()], 42, () => {});
  const uid = s.game.players[0].hand[0]!, defId = s.game.cards[uid]!.defId;
  const event: MatchPresentation = { id:1, hook:'onCardDrawn', args:[uid, 0] };
  const view = s.frame(1).state;
  const secret = presentationForViewer(event, s.game, view, 1);
  expect(JSON.stringify(secret)).not.toContain(uid);
  expect(JSON.stringify(secret)).not.toContain(defId);
  expect(secret.args[1]).toBe(1);
  const call = presentationForViewer({id:2, hook:'onCardCalled', args:[uid, 2, 0]}, s.game, view, 1);
  expect(call.args).toEqual([uid,2,1]);
  expect(view.cards[uid]?.defId).toBe(defId);
  expect(view.players[1].hand).toContain(uid); // exactly this departing back disappears
  const other = s.game.players[0].hand[1]!;
  expect(view.cards[other]).toBeUndefined();
  const returned = presentationForViewer({id:3, hook:'onFx', args:[{kind:'handMove',owner:0,cards:[{uid:other,defId:s.game.cards[other]!.defId,to:'deck',toSlot:null,hidden:true}]}]}, s.game, view, 1);
  expect(JSON.stringify(returned)).not.toContain(other);
  expect(JSON.stringify(returned)).not.toContain(s.game.cards[other]!.defId);
});
it('preserves both hidden Rally cards as distinct backs and remaps both viewers', () => {
  const s = new MatchSession([...setup()], 42, () => {});
  const cards = s.game.players[0].hand.slice(0,2);
  const event: MatchPresentation = {id:4,hook:'onRally',args:[cards,0]};
  const foe = presentationForViewer(event,s.game,s.frame(1).state,1);
  expect(new Set(foe.args[0] as string[]).size).toBe(2);
  expect(foe.args[1]).toBe(1);
  for (const uid of cards) expect(JSON.stringify(foe)).not.toContain(uid);
  expect(presentationForViewer(event,s.game,s.frame(0).state,0).args).toEqual([cards,0]);
});

it.each([
  [0, 0, false], [0, 1, false], [1, 0, false], [1, 1, false],
  [0, 0, true], [0, 1, true], [1, 0, true], [1, 1, true],
] as const)('projects the public Codex predecessor from seat %i to viewer %i, automatic=%s without revealing reserves', (owner, viewer, automatic) => {
  const s = new MatchSession([...setup()], 42, () => {});
  s.game.turnPlayer = owner; s.game.phase = 'main';
  const ps = s.game.players[owner], previousUid = ps.activeCodex!;
  const previousDefId = s.game.cards[previousUid]!.defId;
  const next = ps.codex.find(uid => uid !== previousUid)!;
  switchCodex(MATCH_INDEX, s.game, next, { player: owner, automatic });
  const event: MatchPresentation = { id: 5, hook: 'onFx', args: [s.game.pendingFx.at(-1)!] };
  const original = structuredClone(event);
  const view = s.frame(viewer).state, beforeCards = structuredClone(view.cards);
  const projected = presentationForViewer(event, s.game, view, viewer);
  expect(projected.args).toEqual([{ kind: 'codexFlip', uid: next, player: owner === viewer ? 0 : 1, previousDefId }]);
  expect(event).toEqual(original);
  expect(view.cards).toEqual(beforeCards);
  expect(ps.normalPlaysUsed).toBe(automatic ? 0 : 1);
  if (owner !== viewer) {
    for (const uid of ps.codex.filter(uid => uid !== next)) expect(view.cards[uid]).toBeUndefined();
    expect(view.players[1].codex.filter(uid => uid !== next).every(uid => view.cards[uid]!.defId === '__hidden__')).toBe(true);
    expect(JSON.stringify(projected)).not.toContain(previousUid);
  }
});

it.each([undefined, '', 'unknown-codex', '__hidden__', 42])('omits legacy or unknown Codex predecessor metadata: %s', previousDefId => {
  const s = new MatchSession([...setup()], 42, () => {});
  const uid = s.game.players[0].activeCodex!;
  const projected = presentationForViewer({ id: 6, hook: 'onFx', args: [
    { kind: 'codexFlip', uid, player: 0, ...(previousDefId !== undefined ? { previousDefId } : {}) },
  ] }, s.game, s.frame(1).state, 1);
  expect(projected.args).toEqual([{ kind: 'codexFlip', uid, player: 1 }]);
});

it('does not forward a non-Codex definition as predecessor art', () => {
  const s = new MatchSession([...setup()], 42, () => {});
  const uid = s.game.players[0].activeCodex!, previousDefId = s.game.cards[s.game.players[0].persona!]!.defId;
  const projected = presentationForViewer({ id: 7, hook: 'onFx', args: [
    { kind: 'codexFlip', uid, player: 0, previousDefId },
  ] }, s.game, s.frame(1).state, 1);
  expect(projected.args).toEqual([{ kind: 'codexFlip', uid, player: 1 }]);
});
