/**
 * Auto-switch is tied to a phase, not a board state.
 *
 * Guards two things that have drifted apart before: that each Codex declares
 * the trigger it is meant to, that its printed text says the same thing, and
 * that every one of those triggers actually reaches tryAutoSwitch in a real
 * game (a Codex wired to a moment the engine never calls would silently never
 * switch).
 */
import { it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeck from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks, cardById } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { ACTIVE_SCRIPTS, GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { AGTA_SCRIPTS } from '../cards/agta.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { BABAYLAN_SCRIPTS } from '../cards/babaylan.js';
import type { CardScript } from '../cards/types.js';

const EXPECTED: Record<string, string> = {
  'agta/hidden-path': 'startOfTurn',
  'agta/shared-ember': 'startOfTurn',
  'agta/thousand-knots': 'startOfMain',
  'agta/listening-canopy': 'personaAttack',
  'agta/returning-river': 'personaAttacked',
  'maguindanao/illana-bay': 'personaAttack',
  'maguindanao/kuta-wato': 'startOfTurn',
  'maguindanao/lake-buluan': 'personaAttacked',
  'maguindanao/liguasan-marsh': 'startOfMain',
  'maguindanao/pulangi-river': 'startOfTurn',
  'babaylan/heart-spring-beneath-the-ancient-balete': 'startOfTurn',
  'babaylan/the-ancestral-caverns-of-samar': 'startOfTurn',
  'babaylan/the-healing-grove-of-bandilaan': 'startOfMain',
  'babaylan/the-sacred-crown-of-kanlaon': 'personaAttack',
  'babaylan/the-storm-altar-of-madja-as': 'personaAttacked',
};

const PHRASE: Record<string, string> = {
  startOfTurn: 'At the start of your turn',
  startOfMain: 'At the start of your Main Phase',
  personaAttack: 'When your Persona attacks',
  personaAttacked: 'When your Persona is attacked',
};

function cardIdOf(game: { cards: Record<string, { defId: string }> }, uid: string): string {
  return game.cards[uid]?.defId ?? '';
}

const ALL: Record<string, CardScript> = {
  ...AGTA_SCRIPTS, ...MAGUINDANAO_SCRIPTS, ...BABAYLAN_SCRIPTS,
};

it('every Codex declares the phase trigger its card prints', () => {
  const wrong: string[] = [];
  for (const [id, trigger] of Object.entries(EXPECTED)) {
    const on = ALL[id]?.codex?.autoSwitchOn;
    if (on !== trigger) wrong.push(`${id}: code=${String(on)} expected=${trigger}`);

    const first = (cardById(id).text ?? '').split('\n')[0] ?? '';
    if (!first.startsWith(`[Auto-Switch] ${PHRASE[trigger]},`)) {
      wrong.push(`${id}: printed text does not say "${PHRASE[trigger]}" — got "${first.slice(0, 70)}"`);
    }
  }
  expect(wrong).toEqual([]);
});

it('no Codex is left on the removed scenario gate', () => {
  const stragglers = Object.keys(EXPECTED).filter(
    (id) => (ALL[id]?.codex as { autoSwitchWhen?: unknown } | undefined)?.autoSwitchWhen,
  );
  expect(stragglers).toEqual([]);
});

it('every trigger gets its own window, and declining one still offers the next', async () => {
  const index = indexForDecks(['Agta', 'Maguindanao', 'Babaylan']);
  const decks: Record<string, DeckList> = {
    Agta: agtaDeck as unknown as DeckList,
    Maguindanao: maguindanaoDeck as unknown as DeckList,
    Babaylan: babaylanDeck as unknown as DeckList,
  };
  const pairs: [string, string][] = [
    ['Agta', 'Maguindanao'], ['Babaylan', 'Agta'], ['Maguindanao', 'Babaylan'],
  ];

  // The original guarantee, kept: a Codex wired to a moment the engine never
  // reaches can never switch, and that is invisible without a test.
  //
  // The NEW guarantee, which is why the merged offer was unwound: decline is
  // tracked per window rather than per turn, so saying no at the start of the
  // turn no longer silences the Main-phase window. That was what made the
  // separate moments unreachable and forced them into one question.
  const offeredTriggers = new Set<string>();
  /** Per turn: the triggers offered, in order, after a decline. */
  let declinedThenOfferedAgain = 0;
  let totalOffers = 0;

  for (const [a, b] of pairs) {
    for (let seed = 1; seed <= 8; seed++) {
      const game = createGame(index, [decks[a]!, decks[b]!], { seed });
      const ai = new AiChooser(index, () => game);
      let turnKey = '';
      let declinedThisTurn = false;

      const recorder = Object.create(ai) as AiChooser & {
        chooseTarget: (p: 0 | 1, prompt: string, c: string[]) => Promise<string | null>;
      };
      recorder.chooseTarget = async (p, prompt, candidates) => {
        if (!/switch Codex/i.test(prompt)) {
          return ai.chooseTarget(p, prompt, candidates);
        }
        totalOffers++;
        for (const uid of candidates) {
          const on = ACTIVE_SCRIPTS[cardIdOf(game, uid)]?.codex?.autoSwitchOn;
          for (const t of (Array.isArray(on) ? on : [on])) if (t) offeredTriggers.add(t);
        }
        const key = `${p}:${game.turnNumber}`;
        if (key !== turnKey) {
          turnKey = key;
          declinedThisTurn = false;
        } else if (declinedThisTurn) {
          // Same seat, same turn, a second window after a refusal — the exact
          // thing turn-scoped decline made impossible.
          declinedThenOfferedAgain++;
        }
        declinedThisTurn = true;
        return null;
      };

      const gc = new GameController(game, index, { choosers: [recorder, recorder] });
      let t = 0;
      while (game.winner === null && t < 40) {
        await gc.beginTurn();
        await playAiTurn(gc, game.turnPlayer);
        t++;
      }
    }
  }

  console.log(`RESULT ${totalOffers} offers; triggers reached: `
    + `${[...offeredTriggers].sort().join(', ')}; `
    + `second windows after a decline: ${declinedThenOfferedAgain}`);

  // Each of these has at least one legacy Codex wired to it, so each must be
  // reachable. Personify and barrierBroken have no legacy Codex and are
  // covered by the Set 1 Agta tests instead.
  for (const trig of ['startOfTurn', 'startOfMain', 'personaAttack', 'personaAttacked']) {
    expect([...offeredTriggers], `${trig} is never offered — its Codex are unreachable`)
      .toContain(trig);
  }
  expect(
    declinedThenOfferedAgain,
    'declining one window must not silence the rest of the turn',
  ).toBeGreaterThan(0);
}, 300000);
