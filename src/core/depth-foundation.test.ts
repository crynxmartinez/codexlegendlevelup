import { describe, expect, it } from 'vitest';
import deck from '../../decks/agta-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame, validatePlayableDeck } from './setup.js';
import { checkDeck } from './deckcheck.js';
import { GameController } from './game.js';
import { moveCard, maxPlays } from './state.js';
import { AiChooser } from '../ai/bot.js';
import { stateHash } from './replay.js';

describe('depth measurement foundations', () => {
  it('offers every subset of two Persona supporters', () => {
    const g = createGame(index, [deck, deck], { seed: 15 });
    g.turnPlayer = 0; g.phase = 'battle';
    const ps = g.players[0];
    const units = ps.deck.filter(u => index[g.cards[u]!.defId]!.type === 'Unit').slice(0, 2);
    units.forEach((u, i) => moveCard(g, u, 'ally', { slot: i + 1 }));
    const actions = new GameController(g, index).legalActions(0)
      .filter(a => a.kind === 'attack' && a.attacker === ps.persona && a.target === null);
    expect(actions.map(a => a.kind === 'attack' ? a.supporters : [])).toEqual([[], [units[0]], [units[1]], units]);
  });

  it('does not reject a free Codex switch when plays are exhausted', async () => {
    const g = createGame(index, [deck, deck], { seed: 15 });
    g.turnPlayer = 0; g.phase = 'main';
    g.players[0].normalPlaysUsed = maxPlays(index, g, 0);
    const candidates = g.players[0].codex.filter(u => u !== g.players[0].activeCodex);
    const ai = new AiChooser(index, () => g);
    expect(candidates).toContain(await ai.chooseTarget(0, 'Start — switch Codex?', candidates));
  });

  it('rejects inconsistent Force counts through both validators', () => {
    const bad = structuredClone(deck);
    const force = bad.main.find(e => index[e.id]!.type === 'Force')!;
    const unit = bad.main.find(e => index[e.id]!.type === 'Unit' && e.copies < 3)!;
    force.copies--; unit.copies++;
    expect(checkDeck(index, bad).some(p => p.where === 'force')).toBe(true);
    expect(() => validatePlayableDeck(index, bad)).toThrow();
  });

  it('detects rules differences while ignoring presentation', () => {
    const g = createGame(index, [deck, deck], { seed: 15 });
    const original = stateHash(g);
    g.log.push('presentation only');
    g.logCards.push([]);
    expect(stateHash(g)).toBe(original);
    const mutations = [
      () => { g.players[0].normalPlaysUsed++; },
      () => { g.players[0].releasedState = 'Bayanihan'; },
      () => { g.cards[g.players[0].persona!]!.relocatedThisTurn = true; },
      () => { g.skillUses = { sample: { turn: 1, count: 1 } }; },
    ];
    for (const mutate of mutations) {
      const before = stateHash(g); mutate(); expect(stateHash(g)).not.toBe(before);
    }
  });
});
