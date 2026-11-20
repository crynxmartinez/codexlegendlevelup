/**
 * Voice Beneath the Rain, Laya — the call has to happen in Battle.
 *
 * Printed: "When this Level 3 Unit is special called from your deck DURING
 * BATTLE, after your Persona attacks, you may Personify this Unit as charged."
 *
 * Two clauses, two moments, and the engine only ever recorded one of them.
 * `calledFromDeck` says WHERE a unit came from and never WHEN, so a Laya
 * fetched out of the deck during Main sat in an Ally Zone carrying the flag
 * and personified the instant the Persona swung.
 *
 * The guard that looks like it covers this does not: the ability triggers on
 * `attackResolved`, which never fires outside Battle, so `phase !== 'battle'`
 * was a tautology. That is the failure worth holding down — a check that reads
 * correctly, passes review, and rules nothing out.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta.json' with { type: 'json' };
import magDeck from '../../decks/maguindanao.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { AGTA_SCRIPTS } from '../cards/agta.js';
import { def, inst, moveCard, you } from './state.js';
import { autoChooser, specialCall, type EffectContext } from './effects.js';
import type { GameState, Phase, PlayerId } from './types.js';

const index = indexForDecks(['Agta', 'Maguindanao']);
const ME: PlayerId = 0;
const LAYA = 'agta/voice-beneath-the-rain-laya';
const MAKISIG = 'agta/the-boar-spear-makisig';

/** Laya's [Ally] battle-personify. */
const battlePersonify = AGTA_SCRIPTS[LAYA]!.abilities![0]!;

function fresh(): GameState {
  const g = createGame(
    index,
    [agtaDeck as unknown as DeckList, magDeck as unknown as DeckList],
    { seed: 7 },
  );
  you(g, ME).energy = 4;
  return g;
}

/** Take a copy of a card from wherever setup happened to put it. */
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

/** The event this ability listens for: your Persona has finished attacking. */
function attacked(persona: string): EffectContext['event'] {
  return { name: 'attackResolved', unit: persona };
}

function ctxFor(g: GameState, source: string, event?: EffectContext['event']): EffectContext {
  return { index, game: g, me: ME, source, chooser: autoChooser, event };
}

/**
 * A Persona out front, and Laya on top of the deck ready to be called.
 *
 * She is put on top rather than handed straight to an Ally Zone because the
 * whole question is what `specialCall` records on the way out of the deck.
 */
function ready(g: GameState): { persona: string; laya: string } {
  const ps = you(g, ME);
  const persona = pull(g, MAKISIG);
  moveCard(g, persona, 'persona');
  const laya = pull(g, LAYA);
  moveCard(g, laya, 'deck');
  ps.deck.splice(ps.deck.indexOf(laya), 1);
  ps.deck.unshift(laya);
  return { persona, laya };
}

/** Call Laya out of the deck while the game sits in `phase`. */
async function callInPhase(g: GameState, laya: string, phase: Phase): Promise<void> {
  g.phase = phase;
  await specialCall(ctxFor(g, laya), laya);
  expect(inst(g, laya).zone, 'she should be on the field either way').toBe('ally');
}

describe('Laya only personifies off a call made during Battle', () => {
  it('fires when she is called from the deck during Battle', async () => {
    const g = fresh();
    const { persona, laya } = ready(g);

    await callInPhase(g, laya, 'battle');

    expect(
      battlePersonify.canRun!(ctxFor(g, laya, attacked(persona))),
      'called in Battle, Persona has attacked — this is the printed case',
    ).toBe(true);
  });

  it('does not fire when she is called from the deck during Main', async () => {
    const g = fresh();
    const { persona, laya } = ready(g);

    // Fetched in Main, then the turn moves on to Battle and the Persona swings.
    await callInPhase(g, laya, 'main');
    g.phase = 'battle';

    expect(
      battlePersonify.canRun!(ctxFor(g, laya, attacked(persona))),
      'the call happened in Main, so the printed trigger never occurred',
    ).toBe(false);
  });

  it('does not fire on a later turn, having been called in an earlier Battle', async () => {
    const g = fresh();
    const { persona, laya } = ready(g);

    await callInPhase(g, laya, 'battle');
    expect(battlePersonify.canRun!(ctxFor(g, laya, attacked(persona)))).toBe(true);

    // The call opens the window and "after your Persona attacks" is the timing
    // inside it, so the window closes with the turn. Without a turn stamp she
    // would keep the right to personify for the rest of the game.
    g.turnNumber += 2;
    you(g, ME).personifiedThisTurn = false;

    expect(
      battlePersonify.canRun!(ctxFor(g, laya, attacked(persona))),
      'a Battle two turns ago is not this battle',
    ).toBe(false);
  });

  it('does not fire when she reaches the field without being called at all', () => {
    const g = fresh();
    const persona = pull(g, MAKISIG);
    moveCard(g, persona, 'persona');
    const laya = pull(g, LAYA);
    moveCard(g, laya, 'ally', { slot: 0 });
    g.phase = 'battle';

    expect(
      battlePersonify.canRun!(ctxFor(g, laya, attacked(persona))),
      'a normally played Laya was never special called',
    ).toBe(false);
  });

  it('stops qualifying if she is later called from somewhere other than the deck', async () => {
    const g = fresh();
    const { persona, laya } = ready(g);

    await callInPhase(g, laya, 'battle');
    expect(battlePersonify.canRun!(ctxFor(g, laya, attacked(persona)))).toBe(true);

    // Back to the Grave and out again the same turn. The stamp is assigned on
    // every call rather than only set, so the second call overwrites it.
    moveCard(g, laya, 'grave');
    await specialCall(ctxFor(g, laya), laya);

    expect(
      battlePersonify.canRun!(ctxFor(g, laya, attacked(persona))),
      'this call came from the Grave, not the deck',
    ).toBe(false);
  });
});
