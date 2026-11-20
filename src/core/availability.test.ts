/**
 * An explanation may never disagree with the rules.
 *
 * This is the whole risk of the feature. A reason that is merely unhelpful
 * costs nothing; a reason that is WRONG — "this Unit is exhausted" about a
 * unit that is charged and simply has no legal target — teaches the player a
 * rule the game does not have, and they will play around it for weeks.
 *
 * So the first test is the contract itself, checked over real games: a card is
 * reported enabled exactly when `legalActions()` contains an action for it.
 * The rest check that the specific sentences fire on the specific situations
 * they describe.
 */
import { describe, it, expect } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { explainAbility, explainCard, explainDefender } from './availability.js';
import { inst, you } from './state.js';
import type { GameState, PlayerId } from './types.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
};
const index = indexForDecks(['Agta', 'Maguindanao']);
const ME: PlayerId = 0;

function fresh(seed = 4): { game: GameState; ctrl: GameController } {
  const game = createGame(index, [DECKS.Agta!, DECKS.Maguindanao!], { seed });
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  return { game, ctrl };
}

/** Every card either player could plausibly click on. */
function clickable(game: GameState, p: PlayerId): string[] {
  const ps = you(game, p);
  return [
    ...ps.hand,
    ...ps.allies.filter((x): x is string => !!x),
    ...(ps.persona ? [ps.persona] : []),
    ...ps.codex,
  ];
}

describe('an explanation agrees with the rules', () => {
  it('reports enabled exactly when there is a legal action, all game', async () => {
    const { game, ctrl } = fresh(9);
    let checks = 0;
    for (let turn = 0; turn < 8 && game.winner === null; turn++) {
      await ctrl.beginTurn();
      const p = game.turnPlayer;
      const legal = ctrl.legalActions(p);
      for (const uid of clickable(game, p)) {
        const a = explainCard(index, game, uid, p, legal);
        const hasLegal = legal.some((x) => {
          switch (x.kind) {
            case 'call': case 'playAction': case 'playForce':
            case 'ability': case 'switchCodex': case 'relocate':
              return x.uid === uid;
            case 'attack':
              return x.attacker === uid || x.supporters.includes(uid);
            default: return false;
          }
        });
        expect(a.enabled, `${uid} disagreed with legalActions`).toBe(hasLegal);
        if (!a.enabled) {
          expect(a.reason, `${uid} was refused without a reason`).toBeTruthy();
        }
        checks++;
      }
      await playAiTurn(ctrl, p);
    }
    expect(checks, 'the walk should have examined plenty of cards').toBeGreaterThan(40);
  });

  it('always gives a reason and never a bare refusal', async () => {
    const { game, ctrl } = fresh(12);
    await ctrl.beginTurn();
    const legal = ctrl.legalActions(game.turnPlayer);
    for (const uid of clickable(game, game.turnPlayer)) {
      const a = explainCard(index, game, uid, game.turnPlayer, legal);
      if (a.enabled) continue;
      expect(a.reason!.length, 'an empty reason is worse than none').toBeGreaterThan(8);
      expect(a.reason!.endsWith('.'), `"${a.reason}" should be a sentence`).toBe(true);
    }
  });
});

describe('the sentences match the situation', () => {
  it("says it is not your turn when it is not", async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const idle: PlayerId = game.turnPlayer === 0 ? 1 : 0;
    const uid = you(game, idle).hand[0]!;
    const a = explainCard(index, game, uid, idle, ctrl.legalActions(idle));
    expect(a.enabled).toBe(false);
    expect(a.reason).toBe('It is not your turn.');
  });

  it('names the wrong phase rather than guessing', async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    game.phase = 'battle';
    const uid = you(game, p).hand[0]!;
    const a = explainCard(index, game, uid, p, ctrl.legalActions(p));
    expect(a.enabled).toBe(false);
    expect(a.reason).toMatch(/Main Phase/);
  });

  it('counts the plays that are gone', async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    game.phase = 'main';
    const ps = you(game, p);
    ps.normalPlaysUsed = 99;
    const uid = ps.hand[0]!;
    const a = explainCard(index, game, uid, p, ctrl.legalActions(p));
    expect(a.enabled).toBe(false);
    expect(a.reason).toMatch(/used all \d+ plays/);
  });

  it('says a Unit is exhausted, and when it will not be', async () => {
    // The legal list is passed empty on purpose. An exhausted Persona can
    // still have an activated skill the engine offers, and `explainCard`
    // correctly reports that as enabled — an earlier draft of this test
    // exhausted the Persona and expected a refusal, and the contract test
    // above caught it. What is under test here is which reason is chosen
    // once the engine has genuinely offered nothing.
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    const persona = you(game, p).persona!;
    inst(game, persona).exhausted = true;
    const a = explainCard(index, game, persona, p, []);
    expect(a.enabled).toBe(false);
    expect(a.reason).toBe('This Unit is exhausted.');
    expect(a.requirement).toMatch(/charges/);
  });

  it('explains the one-play manual Codex cost when the play allowance is exhausted', async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    game.phase = 'main';
    const ps = you(game, p);
    ps.normalPlaysUsed = 99;
    const other = ps.codex.find((u) => u !== ps.activeCodex);
    if (!other) return;
    const a = explainCard(index, game, other, p, ctrl.legalActions(p));
    expect(a.enabled).toBe(false);
    expect(a.reason).toBe('No plays left. Manually switching Codex costs 1 play.');
    expect(a.requirement).toMatch(/free switch.*printed condition/);
  });

  it('does not confuse a Codex skill with the manual switch play cost', async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    game.phase = 'main';
    const ps = you(game, p);
    ps.normalPlaysUsed = 99;
    for (const uid of ps.codex) {
      const a = explainAbility(index, game, uid, 0, p, []);
      expect(a.enabled).toBe(false);
      expect(a.reason).toBe('This skill is not available right now.');
      expect(a.reason).not.toMatch(/plays|face up|switch/i);
    }
  });

  it('says the duel is over once it is', async () => {
    const { game, ctrl } = fresh();
    await ctrl.beginTurn();
    const p = game.turnPlayer;
    game.winner = p;
    const uid = you(game, p).hand[0]!;
    const a = explainCard(index, game, uid, p, []);
    expect(a.reason).toBe('The duel is over.');
  });
});

describe('defending has its own reasons', () => {
  it('accepts a card the engine listed as eligible', () => {
    const { game } = fresh();
    const uid = you(game, ME).hand[0]!;
    expect(explainDefender(index, game, uid, ME, [uid]).enabled).toBe(true);
  });

  it('explains a card that cannot block this attack', () => {
    const { game } = fresh();
    const hand = you(game, ME).hand;
    game.activeBattle = {
      attacker: hand[0]!, supporters: [], target: null, defender: ME,
      blockers: [], attackPower: 1, defensePower: 0, stage: 'declared',
    };
    const a = explainDefender(index, game, hand[1]!, ME, []);
    expect(a.enabled).toBe(false);
    expect(a.reason).toBe('This Unit cannot defend this attack.');
  });

  it('does not offer a card that is not in hand', () => {
    const { game } = fresh();
    const persona = you(game, ME).persona!;
    const a = explainDefender(index, game, persona, ME, []);
    expect(a.enabled).toBe(false);
    expect(a.reason).toMatch(/in your hand/);
  });
});
