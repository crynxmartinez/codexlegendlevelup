/** A prepared training position using isolated tutorial effects and the normal controller. */
import { createGame } from '../core/setup.js';
import { GameController, type PlayerAction } from '../core/game.js';
import { autoChooser, type Chooser } from '../core/effects.js';
import { def, moveCard, you, type CardIndex } from '../core/state.js';
import type { GameState, PlayerId } from '../core/types.js';
import { createTutorialProfile } from '../core/tutorial-rules.js';
import { TUTORIAL_DECKS, TUTORIAL_LESSON_CARDS, type TutorialRegion } from '../core/tutorial-decks.js';

export interface FirstBattleCards {
  persona: string; ally: string; blocker: string; firstCheck: string;
  foePersona: string; foeAlly: string; foeBlocker: string;
  region: TutorialRegion;
  personaName: string; allyName: string;
  personaPower: number; allyPower: number; blockerDefense: number;
}
export type FirstBattleChapter = 0 | 1 | 2;

export function createFirstBattle(normalIndex: CardIndex, region: TutorialRegion = 'luzon') {
  const profile = createTutorialProfile(normalIndex), index = profile.index;
  const deck = TUTORIAL_DECKS[region], roles = TUTORIAL_LESSON_CARDS[region];
  if (!deck || !roles) throw new Error(`Unknown First Battle region: ${region}`);
  const game = createGame(index, [deck, deck], { seed: 210926, firstPlayer: 0,
    rulesProfile: 'tutorial-v1', choices: [{ codex: deck.codex[0] }, { codex: deck.codex[0] }] });
  const picks: Array<{ ally: string; blocker: string; check: string }> = [];
  for (const p of [0, 1] as const) {
    const ps = you(game, p);
    for (const uid of [...ps.hand, ...ps.barriers]) moveCard(game, uid, 'deck');
    const take = (cardId: string, zone: 'hand' | 'barrier' | 'check') => {
      const uid = ps.deck.find(u => game.cards[u]!.defId === cardId);
      if (!uid) throw new Error(`First Battle needs ${cardId}`);
      moveCard(game, uid, zone, { faceDown: zone === 'barrier' });
      return uid;
    };
    // The alternate Level 3 has no Ally skill in these presets. Keeping it as
    // the first call isolates the basic rules before Chapter 2 teaches skills.
    const ally = take(roles.alternatePersona, 'hand');
    // Attack Codex makes the Persona's first attack 16k. A 10k defender
    // raises the target's 11k to 21k, so this demonstration really stops it.
    const blocker = take(roles.l1Attack, 'hand');
    take(roles.l2Support, 'hand');
    take(roles.l2Arrival, 'hand');
    take(roles.l1Arrival, 'hand');
    take(roles.l1Attack, 'barrier');
    take(roles.l1Support, 'barrier');
    const check = take(roles.l2Support, 'check');
    moveCard(game, check, 'deck');
    // Checks and turn draws are ordinary Units. Keep the rest of the legal deck intact.
    ps.deck.sort((a, b) => Number(def(index, game, a).type !== 'Unit') - Number(def(index, game, b).type !== 'Unit'));
    ps.deck.splice(ps.deck.indexOf(check), 1);
    ps.deck.unshift(check);
    ps.switchedCodexLastTurn = true;
    picks.push({ ally, blocker, check });
  }
  game.phase = 'main';
  game.pendingFx.length = 0;
  const cards: FirstBattleCards = {
    persona: you(game, 0).persona!, ally: picks[0]!.ally, blocker: picks[0]!.blocker,
    firstCheck: picks[0]!.check,
    foePersona: you(game, 1).persona!, foeAlly: picks[1]!.ally, foeBlocker: picks[1]!.blocker,
    // Character names remain recognizable when the UI translates the title.
    region, personaName: index[roles.persona]!.name.split(', ').at(-1)!,
    allyName: index[roles.alternatePersona]!.name.split(', ').at(-1)!,
    personaPower: index[roles.persona]!.power, allyPower: index[roles.alternatePersona]!.power,
    blockerDefense: index[roles.l1Attack]!.defense,
  };
  return { game, cards, profile };
}

export function firstBattleMoves(c: FirstBattleCards) {
  return {
    call: { kind: 'call', uid: c.ally, slot: 0 },
    persona: { kind: 'attack', attacker: c.persona, target: null, supporters: [] },
    ally: { kind: 'attack', attacker: c.ally, target: null, supporters: [] },
    foeCall: { kind: 'call', uid: c.foeAlly, slot: 0 },
    foePersona: { kind: 'attack', attacker: c.foePersona, target: null, supporters: [] },
    foeAlly: { kind: 'attack', attacker: c.foeAlly, target: null, supporters: [] },
  } satisfies Record<string, PlayerAction>;
}

/** Optional advanced effects are declined; mandatory rules and card scripts stay active. */
export function firstBattleChooser(game: GameState, c: FirstBattleCards, player: PlayerId): Chooser {
  return {
    ...autoChooser,
    chooseAbility: async () => null,
    chooseTarget: async () => null,
    personifyPrompt: async () => null,
    battleCards: async () => [],
    blockPrompt: async (_p, _info, candidates) => {
      const blocker = player === 0 ? c.blocker : c.foeBlocker;
      const firstAttack = game.activeBattle?.attacker === (player === 0 ? c.foePersona : c.persona);
      return firstAttack && candidates.includes(blocker) ? [blocker] : [];
    },
  };
}

/** Rebuild a checkpoint through legal moves, never hydrate a half-resolved effect. */
export async function prepareFirstBattle(index: CardIndex, chapter: FirstBattleChapter = 0, region: TutorialRegion = 'luzon') {
  const prepared = createFirstBattle(index, region);
  const { game, cards } = prepared;
  const ctrl = new GameController(game, prepared.profile.index, {
    scripts: prepared.profile.scripts,
    choosers: [firstBattleChooser(game, cards, 0), firstBattleChooser(game, cards, 1)],
  });
  const m = firstBattleMoves(cards);
  if (chapter >= 1) {
    for (const a of [m.call, { kind: 'endPhase' }, m.persona, m.ally, { kind: 'endTurn' }] as PlayerAction[]) await ctrl.perform(a, 0);
  }
  if (chapter >= 2) {
    await ctrl.beginTurn();
    for (const a of [m.foeCall, { kind: 'endPhase' }, m.foePersona, m.foeAlly, { kind: 'endTurn' }] as PlayerAction[]) await ctrl.perform(a, 1);
    await ctrl.beginTurn();
  }
  game.pendingFx.length = 0;
  // Rebuilding is not a new set of visible events.
  if (game.duel) game.duel.events.length = 0;
  return prepared;
}
