import { expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { ALL_CARDS, FULL_INDEX as index, isSelectableCard } from '../data/loader.js';
import { createGame } from './setup.js';
import { GameController } from './game.js';
import { autoChooser, type Chooser } from './effects.js';
import { canSwitchCodex, switchCodex, startTurn } from './turn.js';
import { inst, maxPlays, moveCard } from './state.js';
import type { CardScript } from '../cards/types.js';
import { playAiTurn } from '../ai/bot.js';
import { TUTORIAL_DECKS } from './tutorial-decks.js';
import { createTutorialProfile } from './tutorial-rules.js';
import type { PlayerId } from './types.js';

function fixture(decline = false, owner: PlayerId = 0) {
  const game = createGame(index, [deck, deck], { seed: 8 });
  game.turnNumber = 10; game.turnPlayer = owner; game.phase = 'main';
  const ps = game.players[owner];
  let prompts = 0;
  const chooser: Chooser = { ...autoChooser, chooseAbility: async () => null,
    chooseTarget: async (_p, prompt, pool) => {
      if (/switch Codex/i.test(prompt)) { prompts++; return decline ? null : pool[0] ?? null; }
      return pool[0] ?? null;
    } };
  const scripts: Record<string, CardScript> = Object.fromEntries(ps.codex.map(uid => {
    const id = inst(game, uid).defId;
    return [id, { id, codex: { autoSwitchOn: 'personaAttacked', autoSwitchWhen: () => true } }];
  }));
  const ctrl = new GameController(game, index, { scripts, choosers: [chooser, chooser] });
  return { game, ps, ctrl, scripts, prompts: () => prompts };
}

it.each([0, 1] as const)('charges player %i one play for each manual switch and rejects switching with no plays left', async owner => {
  const { game, ps, ctrl } = fixture(false, owner);
  expect(ps.normalPlaysUsed).toBe(0);
  ps.switchedCodexLastTurn = true;
  const budget = maxPlays(index, game, owner);
  for (let spent = 0; spent < budget; spent++) {
    const next = ps.codex.find(uid => uid !== ps.activeCodex)!;
    expect(canSwitchCodex(index, game, next)).toBe(true);
    expect(ctrl.legalActions(owner)).toContainEqual({ kind: 'switchCodex', uid: next });
    const before = ps.activeCodex!;
    await ctrl.perform({ kind: 'switchCodex', uid: next }, owner);
    expect(ps.activeCodex).toBe(next);
    expect(inst(game, before).faceDown).toBe(true);
    expect(inst(game, next).faceDown).toBe(false);
    expect(ps.normalPlaysUsed).toBe(spent + 1);
  }
  const next = ps.codex.find(uid => uid !== ps.activeCodex)!;
  expect(canSwitchCodex(index, game, next)).toBe(false);
  expect(ctrl.legalActions(owner).some(action => action.kind === 'switchCodex')).toBe(false);
  const snapshot = structuredClone(game);
  expect(() => switchCodex(index, game, next)).toThrow('illegal codex switch');
  expect(game).toEqual(snapshot);
  await expect(ctrl.perform({ kind: 'switchCodex', uid: next }, owner)).rejects.toThrow('illegal codex switch');
  expect(game.players).toEqual(snapshot.players);
  expect(game.cards).toEqual(snapshot.cards);
  expect(game.pendingFx).toEqual(snapshot.pendingFx);
  expect(game.players[owner === 0 ? 1 : 0].normalPlaysUsed).toBe(0);
});

it.each([0, 1] as const)('the chosen initial Codex is free for player %i', owner => {
  const wanted = deck.codex[1]!;
  const game = createGame(index, [deck, deck], { seed: 8, choices: [{ codex: wanted }, { codex: wanted }] });
  const ps = game.players[owner];
  expect(inst(game, ps.activeCodex!).defId).toBe(wanted);
  expect(ps.normalPlaysUsed).toBe(0);
});

it.each(Object.entries(TUTORIAL_DECKS))('%s training uses the same one-play manual cost for both seats', async (_region, training) => {
  const profile = createTutorialProfile(index);
  for (const owner of [0, 1] as const) {
    const game = createGame(profile.index, [training, training], { seed: 8, rulesProfile: 'tutorial-v1' });
    game.turnPlayer = owner; game.phase = 'main';
    const ps = game.players[owner];
    const ctrl = new GameController(game, profile.index, { scripts: profile.scripts, choosers: [autoChooser, autoChooser] });
    const budget = maxPlays(profile.index, game, owner);
    ps.normalPlaysUsed = budget - 1;
    const next = ps.codex.find(uid => uid !== ps.activeCodex)!;
    await ctrl.perform({ kind: 'switchCodex', uid: next }, owner);
    expect(ps.activeCodex).toBe(next);
    expect(ps.normalPlaysUsed).toBe(budget);
    expect(ctrl.legalActions(owner).some(action => action.kind === 'switchCodex')).toBe(false);
  }
});

it('does not spend a play for the active Codex or an invalid card', () => {
  const { game, ps } = fixture();
  const snapshot = structuredClone(game);
  expect(() => switchCodex(index, game, ps.activeCodex!)).toThrow();
  expect(() => switchCodex(index, game, ps.persona!)).toThrow();
  expect(() => switchCodex(index, game, 'missing-card')).toThrow();
  expect(ps.normalPlaysUsed).toBe(0);
  expect(game).toEqual(snapshot);
});

it('keeps manual switches in the owner Main Phase and blocks switching after game over', () => {
  const { game, ps } = fixture();
  const next = ps.codex.find(uid => uid !== ps.activeCodex)!;
  game.phase = 'battle';
  expect(canSwitchCodex(index, game, next)).toBe(false);
  game.phase = 'main'; game.turnPlayer = 1;
  expect(canSwitchCodex(index, game, next, { player: 0 })).toBe(false);
  expect(canSwitchCodex(index, game, next, { player: 0, automatic: true })).toBe(true);
  game.winner = 1;
  expect(canSwitchCodex(index, game, next, { player: 0, automatic: true })).toBe(false);
});

it('the AI finishes its turn without cycling through manual switches', async () => {
  const { game, ps, ctrl } = fixture(true);
  for (const uid of [...ps.hand]) moveCard(game, uid, 'deck');
  const budget = maxPlays(index, game, 0);
  const chosen: string[] = [];
  ctrl.hooks.onAiAction = async action => { if (action.kind === 'switchCodex') chosen.push(action.uid); };
  await playAiTurn(ctrl, 0);
  expect(game.turnPlayer).toBe(1);
  expect(chosen.length).toBeLessThanOrEqual(budget);
  expect(new Set(chosen).size).toBe(chosen.length);
  expect(chosen.length).toBeLessThan(ps.codex.length);
  expect(ps.normalPlaysUsed).toBe(chosen.length);
});

it.each([0, 1] as const)('allows player %i repeated free automatic switches on the opponent turn with no plays left', async owner => {
  const { game, ps, ctrl, prompts } = fixture(false, owner);
  const opponent = owner === 0 ? 1 : 0;
  game.turnPlayer = opponent; game.phase = 'battle';
  ps.codexSwitchedThisTurn = true; ps.switchedCodexLastTurn = true; ps.autoSwitchTriggersUsed = ['personaAttacked'];
  const budget = maxPlays(index, game, owner);
  ps.normalPlaysUsed = budget;
  for (let i = 0; i < budget; i++) {
    const before = ps.activeCodex;
    await ctrl.fireTrigger('personaAttacked', owner);
    expect(ps.activeCodex).not.toBe(before);
    expect(ps.normalPlaysUsed).toBe(budget);
  }
  await ctrl.fireTrigger('personaAttacked', owner);
  expect(prompts()).toBe(budget + 1);
  expect(game.players[opponent].normalPlaysUsed).toBe(0);
  game.turnPlayer = owner; startTurn(index, game, { skipDraw: true });
  expect(ps.normalPlaysUsed).toBe(0);
});

it('allows a free auto switch after a paid manual switch', async () => {
  const { game, ps, ctrl } = fixture();
  switchCodex(index, game, ps.codex.find(uid => uid !== ps.activeCodex)!);
  expect(ps.normalPlaysUsed).toBe(1);
  await ctrl.fireTrigger('personaAttacked', 0);
  expect(ps.normalPlaysUsed).toBe(1);
});

it.each([0, 1])('preserves %i remaining plays during free opponent-turn Codex switches', async remaining => {
  const { game, ps, ctrl, prompts } = fixture();
  const budget = maxPlays(index, game, 0);
  ps.normalPlaysUsed = budget - remaining;
  await ctrl.finishTurn();
  expect(game.turnPlayer).toBe(1);
  startTurn(index, game, { skipDraw: true });
  game.phase = 'battle';
  expect(ps.normalPlaysUsed).toBe(budget - remaining);
  const before = ps.activeCodex;
  await ctrl.fireTrigger('personaAttacked', 0);
  expect(prompts()).toBe(1);
  expect(ps.normalPlaysUsed).toBe(budget - remaining);
  expect(ps.activeCodex).not.toBe(before);

  const next = ps.codex.find(uid => uid !== ps.activeCodex)!;
  expect(canSwitchCodex(index, game, next, { player: 0, automatic: true })).toBe(true);
  switchCodex(index, game, next, { player: 0, automatic: true });
  await ctrl.fireTrigger('personaAttacked', 0);
  expect(prompts()).toBe(2);
  expect(ps.normalPlaysUsed).toBe(budget - remaining);
  expect(game.players[1].normalPlaysUsed).toBe(0);

  await ctrl.finishTurn();
  expect(game.turnPlayer).toBe(0);
  startTurn(index, game, { skipDraw: true });
  expect(ps.normalPlaysUsed).toBe(0);
});

it('declining auto switching leaves the Codex and plays untouched', async () => {
  const { ps, ctrl, prompts } = fixture(true), active = ps.activeCodex;
  await ctrl.fireTrigger('personaAttacked', 0);
  expect(prompts()).toBe(1); expect(ps.normalPlaysUsed).toBe(0); expect(ps.activeCodex).toBe(active);
});

it('keeps skill limits per Codex when switching away and back', async () => {
  const { ps, ctrl, scripts } = fixture();
  let resolved = 0;
  for (const script of Object.values(scripts)) script.codex!.skill = {
    type: 'action', maxUses: 1, text: 'Draw a blessing', run: async () => { resolved++; },
  };
  const original = ps.activeCodex!, next = ps.codex.find(uid => uid !== original)!;
  await ctrl.perform({ kind: 'useSkill' }, 0);
  await ctrl.perform({ kind: 'switchCodex', uid: next }, 0);
  expect(ctrl.legalActions(0)).toContainEqual({ kind: 'useSkill' });
  await ctrl.perform({ kind: 'useSkill' }, 0);
  await ctrl.perform({ kind: 'switchCodex', uid: original }, 0);
  expect(ctrl.legalActions(0)).not.toContainEqual({ kind: 'useSkill' });
  expect(resolved).toBe(2); expect(ps.normalPlaysUsed).toBe(2);
});

it('preserves printed free automatic switching on every selectable Codex without the retired switch limit', () => {
  const cards = Object.values(ALL_CARDS).filter(c => isSelectableCard(c) && c.type === 'Codex');
  expect(cards).toHaveLength(30);
  for (const card of cards) {
    expect(card.text).toContain('switch to this Codex for free');
    expect(card.text).not.toContain('spend 1 play');
    expect(card.text).not.toMatch(/did not switch|have not switched/);
  }
});
