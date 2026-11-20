/**
 * Veiled Eclipse Maharaja — out through exile, and back again.
 *
 * He is the only card in the set that acts from exile, which is normally
 * where cards go to stop mattering. That needed two things the engine did not
 * have: `Exile` as an ability scope, and `attackMiss` allowed to reach a card
 * that is not the one attacking — it was hard-coded as always being about the
 * attacker, which was true until a card watched its own Persona miss from
 * somewhere else.
 *
 * Both halves are worth holding down, because either could stop working
 * without anything else in the game noticing: a scope that silently never
 * matches, and a trigger that silently never arrives.
 */
import { describe, it, expect } from 'vitest';
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { def, inst, moveCard, you } from './state.js';
import { autoChooser, type EffectContext } from './effects.js';
import type { GameState, PlayerId } from './types.js';

const index = indexForDecks(['Maguindanao', 'Agta']);
const ME: PlayerId = 0;
const MAHARAJA = 'maguindanao/veiled-eclipse-maharaja';
const SALIK = 'maguindanao/kuta-wato-warcaller-datu-salik';
const KAMIL = 'maguindanao/pulangi-ember-spear-kamil';
const HARUN = 'maguindanao/liguasan-reed-eye-harun';

const skill = (n: number) => MAGUINDANAO_SCRIPTS[MAHARAJA]!.abilities![n]!;

function fresh(): GameState {
  const g = createGame(
    index,
    [magDeck as unknown as DeckList, agtaDeck as unknown as DeckList],
    { seed: 12 },
  );
  you(g, ME).energy = 4;
  return g;
}

/**
 * Take a copy of a card from wherever the setup happened to put it.
 *
 * Not just the deck: Maharaja is this decklist's default Persona, so one copy
 * is already in the Persona Zone before a test starts and the rest may be in
 * hand. Searching only the deck failed on the card the file is about.
 */
function pull(g: GameState, defId: string): string {
  const ps = you(g, ME);
  for (const pile of [ps.deck, ps.hand] as string[][]) {
    const uid = pile.find((u) => def(index, g, u).id === defId);
    if (uid) { pile.splice(pile.indexOf(uid), 1); return uid; }
  }
  if (ps.persona && def(index, g, ps.persona).id === defId) {
    const uid = ps.persona;
    ps.persona = null;
    return uid;
  }
  throw new Error(`no copy of ${defId} anywhere`);
}

function asPersona(g: GameState, defId: string): string {
  const uid = pull(g, defId);
  moveCard(g, uid, 'persona');
  return uid;
}

function toGrave(g: GameState, defId: string): string {
  const uid = pull(g, defId);
  moveCard(g, uid, 'grave');
  return uid;
}

function toAlly(g: GameState, defId: string, slot: number): string {
  const uid = pull(g, defId);
  moveCard(g, uid, 'ally', { slot });
  return uid;
}

function ctxFor(g: GameState, source: string, event?: EffectContext['event']): EffectContext {
  return { index, game: g, me: ME, source, chooser: autoChooser, event };
}

describe('Maharaja skill 1 — exile himself, raise the dead', () => {
  it('needs a Level 3 in the Grave', () => {
    const g = fresh();
    const mah = asPersona(g, MAHARAJA);
    expect(skill(0).canRun!(ctxFor(g, mah)), 'empty Grave').toBe(false);

    toGrave(g, SALIK);
    expect(skill(0).canRun!(ctxFor(g, mah)), 'a Level 3 is waiting').toBe(true);
  });

  it('is not satisfied by a Grave holding only smaller units', () => {
    const g = fresh();
    const mah = asPersona(g, MAHARAJA);
    toGrave(g, KAMIL);   // Level 1
    toGrave(g, HARUN);   // Level 2
    expect(skill(0).canRun!(ctxFor(g, mah))).toBe(false);
  });

  it('exiles himself face up and puts the Grave unit in the Persona Zone', async () => {
    const g = fresh();
    const mah = asPersona(g, MAHARAJA);
    const salik = toGrave(g, SALIK);

    await skill(0).run(ctxFor(g, mah));

    expect(inst(g, mah).zone).toBe('exile');
    // Face up matters: skill 2 reads him there, and a player has to see him.
    expect(inst(g, mah).faceDown).toBe(false);
    expect(you(g, ME).persona).toBe(salik);
    expect(inst(g, salik).zone).toBe('persona');
    expect(you(g, ME).grave).not.toContain(salik);
  });

  it('costs an Energy', () => {
    expect(skill(0).energyCost).toBe(1);
  });
});

describe('Maharaja skill 2 — back out of exile on a miss', () => {
  /** Maharaja in exile, three bodies to spend, Garahana up, Salik leading. */
  function exiled(g: GameState): { mah: string; persona: string } {
    const mah = pull(g, MAHARAJA);
    moveCard(g, mah, 'exile', { faceDown: false });
    const persona = asPersona(g, SALIK);
    you(g, ME).releasedState = 'Garahana';
    toAlly(g, KAMIL, 0);   // worth 2 Offer on his own
    toAlly(g, HARUN, 1);
    return { mah, persona };
  }

  it('fires on your Persona missing, not on his own attack', () => {
    const g = fresh();
    const { mah, persona } = exiled(g);

    const miss = { name: 'attackMiss' as const, unit: persona };
    expect(skill(1).canRun!(ctxFor(g, mah, miss)), 'your Persona missed').toBe(true);

    // Some other unit missing is not the trigger.
    const other = you(g, ME).allies.find(Boolean)!;
    expect(skill(1).canRun!(ctxFor(g, mah, { name: 'attackMiss', unit: other })))
      .toBe(false);
  });

  it('needs Garahana', () => {
    const g = fresh();
    const { mah, persona } = exiled(g);
    you(g, ME).releasedState = null;
    expect(skill(1).canRun!(ctxFor(g, mah, { name: 'attackMiss', unit: persona })))
      .toBe(false);
  });

  it('needs three Offer, which two bodies can be', () => {
    const g = fresh();
    const { mah, persona } = exiled(g);
    const miss = { name: 'attackMiss' as const, unit: persona };
    // Kamil counts as 2, Harun as 1 — three between them.
    expect(skill(1).canRun!(ctxFor(g, mah, miss))).toBe(true);

    // Take Harun away and two Offer is not three.
    const ps = you(g, ME);
    const harun = ps.allies[1]!;
    ps.allies[1] = null;
    moveCard(g, harun, 'grave');
    expect(skill(1).canRun!(ctxFor(g, mah, miss))).toBe(false);
  });

  it('spends the board and takes the Persona Zone back', async () => {
    const g = fresh();
    const { mah, persona } = exiled(g);

    await skill(1).run(ctxFor(g, mah, { name: 'attackMiss', unit: persona }));

    expect(you(g, ME).persona).toBe(mah);
    expect(inst(g, mah).zone).toBe('persona');
    expect(inst(g, mah).exhausted, 'he arrives ready').toBe(false);
    // The Persona he replaced went to the Grave, and so did the cost.
    expect(inst(g, persona).zone).toBe('grave');
    expect(you(g, ME).allies.filter(Boolean)).toHaveLength(0);
  });

  it('is scoped to Exile, which is where he is', () => {
    // A scope the engine did not know about would simply never match, and
    // the ability would be dead without ever erroring.
    expect(skill(1).scope).toContain('Exile');
  });
});
