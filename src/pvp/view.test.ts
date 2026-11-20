import { expect, it } from 'vitest';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from './catalog.js';
import { playerView } from './view.js';
import {eventLogOf} from '../core/events.js';
import {draw} from '../core/state.js';
import { createChain } from '../core/response-chain.js';
import { decisionForViewer } from './decisions.js';

it('remaps public effect provenance for the second seat without exposing private decisions', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 42 });
  const uid = game.players[1].persona!;
  const origin = { uid, name: 'Public source', owner: 1 as const, zone: 'ally' as const, slot: 0 };
  game.cards[uid]!.modifiers.push({ amount: 5000, duration: 'endOfTurn', source: 'Public source', origin, cause: origin });
  const view = playerView(game, 1, null, []);
  expect(view.cards[uid]!.modifiers[0]!.origin?.owner).toBe(0);
  expect(game.cards[uid]!.modifiers[0]!.origin?.owner).toBe(1);
  const decision = decisionForViewer({ id: 'one', owner: 1, kind: 'chooseAbility', args: [1, 'Choose', [{ uid, cause: origin }]] }, 1);
  expect((decision.args[2] as { cause: typeof origin }[])[0]!.cause.owner).toBe(0);
});

it('shows committed public links with correct seats, without receipts or private waiting effects', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 42 });
  const publicSource = game.players[0].persona!;
  const secret = game.players[0].hand[0]!;
  game.responseChain = createChain('chain-1', { id: 'link-1', owner: 0, source: publicSource, skillId: 'skill', label: 'Visible effect',
    sourceZone: 'persona', receipt: { cards: [secret], offered: [], vented: [], tokens: 0, powers: {}, data: { secret } },
    event: { name: 'placed', unit: secret } });
  game.pendingTriggers = [{ id: 'private-trigger', owner: 0, source: secret, kind: 'ability', event: { name: 'placed' }, label: 'Private', text: 'Private' }];
  const view = playerView(game, 1, null, []);
  expect(view.responseChain?.responseOwner).toBe(0);
  expect(view.responseChain?.links[0]?.owner).toBe(1);
  expect(view.responseChain?.links[0]?.source).toBe(publicSource);
  expect(view.responseChain?.links[0]?.sourceZone).toBe('persona');
  expect(view.responseChain?.links[0]?.receipt).toBeUndefined();
  expect(view.responseChain?.links[0]?.event).toBeUndefined();
  expect(JSON.stringify(view)).not.toContain(secret);
  expect(view.pendingTriggers).toBeUndefined();
  expect(view.players.every(p => p.energy === undefined)).toBe(true);
});
it('does not let an opponent track hidden draw movement identifiers',()=>{
  const g=createGame(MATCH_INDEX,[STARTERS.Luzon!,STARTERS.Visayas!],{seed:42});
  const uid=draw(g,1)!;
  const v=playerView(g,0,null,eventLogOf(g).events);
  expect(v.duel!.events.flatMap(e=>e.movements??[]).some(m=>m.uid===uid)).toBe(false);
  expect(v.duel!.events.flatMap(e=>[...e.sourceUids,...e.targetUids])).not.toContain(uid);
});
it('never transmits decks, opponent hands, hidden barriers, seed or private queues', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 938274 });
  const view = playerView(game, 1, null, []);
  const json = JSON.stringify(view);
  expect(json).not.toContain('938274');
  for (const uid of [...game.players[0].hand, ...game.players[1].deck, ...game.players[0].barriers]) expect(view.cards[uid]).toBeUndefined();
  expect(view.players[0].hand).toEqual(game.players[1].hand);
  expect(view.players[1].hand.length).toBe(game.players[0].hand.length);
  expect(view.pendingOfferRecall).toEqual([]);
});
it('shows search candidates only to the decision owner', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Luzon!, STARTERS.Visayas!], { seed: 42 });
  const uid = game.players[0].deck[0]!;
  const d = { id: '1', owner: 0 as const, kind: 'chooseTarget' as const, args: [0, 'Search', [uid]] };
  expect(playerView(game, 0, d, []).cards[uid]?.defId).toBe(game.cards[uid]!.defId);
  expect(playerView(game, 1, d, []).cards[uid]).toBeUndefined();
});
