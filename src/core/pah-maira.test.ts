/**
 * Sun-Darkening Scourge, Pah and Black-Standard Oathkeeper, Sitti Maira.
 *
 * Pah's abilities were printed on Bita Eclipse-Wing, Pah, which has been
 * removed. Same Level, same stat line, same skills, different card — so these
 * tests moved with the id rather than being rewritten.
 *
 * Both are new, so their abilities have never been run against the engine.
 * These check the parts that could plausibly be wrong: that a cost paid in
 * Allies actually removes them, that Pah's bonus doubles on the condition it
 * claims and not before, that being charged after attacking really lets the
 * unit swing again, and that Sitti Maira takes the card she fetches out of the
 * deck rather than duplicating it.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { currentPower, def, inst, you } from './state.js';
import { autoChooser, type ChooseCardsOptions, type Chooser, type EffectContext } from './effects.js';
import type { CardInstance, GameState, PlayerId } from './types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const ME: PlayerId = 0;
const PAH = 'maguindanao/sun-darkening-scourge-pah';
const MAIRA = 'maguindanao/black-standard-oathkeeper-sitti-maira';
const ZAFIR = 'maguindanao/kuta-wato-abyssblade-panglima-zafir';

/** Takes everything it is offered, and picks the first candidate. */
function greedy(): Chooser {
  return {
    ...autoChooser,
    async chooseCards(
      _p: PlayerId, _q: string, candidates: string[], count: number,
      _o?: ChooseCardsOptions,
    ) {
      return candidates.slice(0, count);
    },
    async chooseTarget(_p: PlayerId, _q: string, candidates: string[]) {
      return candidates[0] ?? null;
    },
  };
}

function fresh(): GameState {
  return createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 5 },
  );
}

function ctxFor(game: GameState, source: string, event?: EffectContext['event']): EffectContext {
  return { index, game, me: ME, source, chooser: greedy(), event };
}

/**
 * Mint a copy of a card that is not in the decklist.
 *
 * Both of these live in the library and neither is in decks/maguindanao.json,
 * which is deliberate — so createGame never makes one and a test has to.
 */
let minted = 0;
function mint(game: GameState, defId: string, zone: CardInstance['zone']): string {
  const uid = `x${++minted}`;
  game.cards[uid] = {
    uid, defId, owner: ME, zone, slot: null,
    exhausted: false, faceDown: false, modifiers: [], stack: 1,
    screen: false, usesThisTurn: {}, relocatedThisTurn: false,
    screenWhileCharged: false,
  };
  return uid;
}

/** Put a unit into `slot` — minted if named, otherwise off the top of the deck. */
function place(game: GameState, slot: number, defId?: string): string {
  const ps = you(game, ME);
  let uid: string | undefined;
  if (defId) {
    uid = mint(game, defId, 'ally');
  } else {
    uid = ps.deck.find((u) => {
      const d = def(index, game, u);
      return d.type === 'Unit' && !ps.allies.includes(u);
    });
    if (!uid) throw new Error('no unit left in the deck to place');
    ps.deck.splice(ps.deck.indexOf(uid), 1);
    inst(game, uid).zone = 'ally';
  }
  ps.allies[slot] = uid;
  inst(game, uid).slot = slot;
  return uid;
}

/** Pah, standing as the Persona, with `allies` bodies beside him. */
function withPah(game: GameState, allies: number): string {
  const ps = you(game, ME);
  const pah = mint(game, PAH, 'persona');
  ps.persona = pah;
  for (let i = 0; i < allies; i++) place(game, i);
  return pah;
}

const pahAbility = (n: number) => MAGUINDANAO_SCRIPTS[PAH]!.abilities![n]!;
const mairaAbility = () => MAGUINDANAO_SCRIPTS[MAIRA]!.abilities![0]!;
const zafirAbility = () => MAGUINDANAO_SCRIPTS[ZAFIR]!.abilities![0]!;

describe('Pah — Offer two, swing harder', () => {
  it('spends two Allies and gives +5000 while the Barriers hold', async () => {
    const game = fresh();
    const pah = withPah(game, 2);
    const before = currentPower(index, game, pah);

    await pahAbility(0).run(ctxFor(game, pah));

    expect(currentPower(index, game, pah) - before).toBe(5000);
    // Both Allies actually left the field — a cost that does not is not a cost.
    expect(you(game, ME).allies.filter(Boolean)).toHaveLength(0);
    expect(you(game, ME).grave.length).toBeGreaterThanOrEqual(2);
  });

  it('gives +10000 instead on the last Barrier', async () => {
    const game = fresh();
    const pah = withPah(game, 2);
    const ps = you(game, ME);
    ps.barriers = ps.barriers.slice(0, 1);
    const before = currentPower(index, game, pah);

    await pahAbility(0).run(ctxFor(game, pah));

    expect(currentPower(index, game, pah) - before).toBe(10000);
  });

  it('is unavailable without two Allies to spend', () => {
    const game = fresh();
    const pah = withPah(game, 1);
    expect(pahAbility(0).canRun!(ctxFor(game, pah))).toBe(false);
  });

  it('charges Pah after an attack, so he can swing again', async () => {
    const game = fresh();
    const pah = withPah(game, 3);
    you(game, ME).releasedState = 'Garahana';
    inst(game, pah).exhausted = true;
    const before = currentPower(index, game, pah);

    const event = { name: 'attackResolved' as const, unit: pah };
    expect(pahAbility(1).canRun!(ctxFor(game, pah, event))).toBe(true);
    await pahAbility(1).run(ctxFor(game, pah, event));

    expect(inst(game, pah).exhausted).toBe(false);
    expect(currentPower(index, game, pah) - before).toBe(5000);
    expect(you(game, ME).allies.filter(Boolean)).toHaveLength(0);
  });

  it('does not fire on somebody else\'s attack, or without Garahana', () => {
    const game = fresh();
    const pah = withPah(game, 3);
    const other = you(game, ME).allies.find(Boolean)!;

    // Garahana released, but a different unit attacked.
    you(game, ME).releasedState = 'Garahana';
    expect(pahAbility(1).canRun!(
      ctxFor(game, pah, { name: 'attackResolved', unit: other }),
    )).toBe(false);

    // Pah attacked, but Garahana is locked.
    you(game, ME).releasedState = null;
    expect(pahAbility(1).canRun!(
      ctxFor(game, pah, { name: 'attackResolved', unit: pah }),
    )).toBe(false);
  });
});

describe('Sitti Maira — one Level 1 brings the next', () => {
  it('pulls a Level 1 out of the deck and onto the field', async () => {
    const game = fresh();
    const maira = place(game, 0, MAIRA);
    const ps = you(game, ME);
    const deckBefore = ps.deck.length;

    const event = { name: 'placed' as const, unit: maira };
    expect(mairaAbility().canRun!(ctxFor(game, maira, event))).toBe(true);
    await mairaAbility().run(ctxFor(game, maira, event));

    const called = ps.allies.filter(Boolean).filter((u) => u !== maira);
    expect(called).toHaveLength(1);
    const d = def(index, game, called[0]!);
    expect(d.type).toBe('Unit');
    expect(d.level).toBe(1);
    // Fetched, not copied.
    expect(ps.deck).toHaveLength(deckBefore - 1);
    expect(ps.deck).not.toContain(called[0]);
  });

  it('only answers to its own placement', () => {
    const game = fresh();
    const maira = place(game, 0, MAIRA);
    const other = place(game, 1);
    expect(mairaAbility().canRun!(
      ctxFor(game, maira, { name: 'placed', unit: other }),
    )).toBe(false);
  });

  it('costs two Energy', () => {
    expect(mairaAbility().energyCost).toBe(2);
  });
});

describe('Zafir — arrives swinging, harder under Pah', () => {
  /** An enemy ally to shoot at, and enough Energy to pay for it. */
  function withEnemy(game: GameState): string {
    const foe = you(game, 1);
    const uid = foe.deck.find((u) => def(index, game, u).type === 'Unit')!;
    foe.deck.splice(foe.deck.indexOf(uid), 1);
    foe.allies[0] = uid;
    inst(game, uid).zone = 'ally';
    inst(game, uid).slot = 0;
    you(game, ME).energy = 2;
    return uid;
  }

  it('damages an enemy ally when it lands', async () => {
    const game = fresh();
    const target = withEnemy(game);
    const zafir = place(game, 0, ZAFIR);

    const event = { name: 'placed' as const, unit: zafir };
    expect(zafirAbility().canRun!(ctxFor(game, zafir, event))).toBe(true);
    await zafirAbility().run(ctxFor(game, zafir, event));

    expect(you(game, 1).allies).not.toContain(target);
    expect(inst(game, target).zone).toBe('grave');
  });

  it('takes no bonus under any other Persona', async () => {
    const game = fresh();
    withEnemy(game);
    const zafir = place(game, 0, ZAFIR);
    const before = currentPower(index, game, zafir);

    await zafirAbility().run(ctxFor(game, zafir, { name: 'placed', unit: zafir }));

    expect(currentPower(index, game, zafir) - before).toBe(0);
  });

  it('takes +5000 with Pah leading', async () => {
    const game = fresh();
    withEnemy(game);
    const pah = mint(game, PAH, 'persona');
    you(game, ME).persona = pah;
    const zafir = place(game, 1, ZAFIR);
    const before = currentPower(index, game, zafir);

    await zafirAbility().run(ctxFor(game, zafir, { name: 'placed', unit: zafir }));

    expect(currentPower(index, game, zafir) - before).toBe(5000);
  });

  it('is unavailable with an empty enemy board, or without the Energy', () => {
    const game = fresh();
    const zafir = place(game, 0, ZAFIR);
    const event = { name: 'placed' as const, unit: zafir };

    // Nothing to shoot.
    you(game, ME).energy = 2;
    expect(zafirAbility().canRun!(ctxFor(game, zafir, event))).toBe(false);

    // Something to shoot, but one Energy short.
    withEnemy(game);
    you(game, ME).energy = 1;
    expect(zafirAbility().canRun!(ctxFor(game, zafir, event))).toBe(false);
  });
});
