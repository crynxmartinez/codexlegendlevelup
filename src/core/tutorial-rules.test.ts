import { describe, expect, it, vi } from 'vitest';
import agta from '../../decks/agta-set-1.json' with { type: 'json' };
import babaylan from '../../decks/babaylan-set-1.json' with { type: 'json' };
import maguindanao from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { ALL_CARDS, FULL_INDEX, isSelectableCard } from '../data/loader.js';
import { ACTIVE_SCRIPTS, GameController } from './game.js';
import { createTutorialProfile, tutorialDeck, tutorialAttackPreview, type TutorialUnitRole } from './tutorial-rules.js';
import { createGame, validateDeck, validatePlayableDeck, type DeckList } from './setup.js';
import { autoChooser, specialCall, offerValue, graveCardValue, ventCost, type Chooser, type EffectContext } from './effects.js';
import { currentPower, def, inst, moveCard, you } from './state.js';
import { endTurn, switchCodex } from './turn.js';
import { evaluateStates } from './states.js';
import type { PlayerId, Zone } from './types.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';

const profile = createTutorialProfile(FULL_INDEX);
const noChoices = (): Chooser => ({ ...autoChooser,
  chooseAbility: vi.fn(async () => null), chooseTarget: async () => null,
  confirm: async () => false, personifyPrompt: async () => null,
  battleCards: async () => [], blockPrompt: async () => [],
});
function fixture(deck: DeckList = agta) {
  const training = tutorialDeck(deck, profile);
  const game = createGame(profile.index, [training, training], { seed: 13, firstPlayer: 0, rulesProfile: 'tutorial-v1' });
  game.turnNumber = 4; game.turnPlayer = 0; game.phase = 'main';
  const chooser = noChoices();
  const ctrl = new GameController(game, profile.index, { scripts: profile.scripts, choosers: [chooser, chooser] });
  const ps = you(game, 0);
  for (const owner of [0, 1] as const) {
    const side = you(game, owner);
    side.activeCodex = side.codex.find(uid => def(profile.index, game, uid).tutorial?.role === 'codex-attack')!;
    for (const uid of [...side.hand]) moveCard(game, uid, 'deck');
  }
  let serial = 0;
  const add = (id: string, zone: Zone = 'hand', owner: PlayerId = 0) => {
    const uid = `training-test-${serial++}`;
    game.cards[uid] = { ...structuredClone(inst(game, you(game, owner).persona!)), uid, defId: id,
      owner, zone: 'check', slot: null, exhausted: false, modifiers: [], usesThisTurn: {}, setOneUses: {} };
    if (zone === 'persona') moveCard(game, you(game, owner).persona!, 'grave');
    moveCard(game, uid, zone, { slot: zone === 'ally' ? you(game, owner).allies.indexOf(null) : undefined });
    return uid;
  };
  const role = (kind: TutorialUnitRole, level = 1) => Object.values(profile.index).find(card =>
    card.id.includes('/set-1/') && card.guild === profile.index[deck.persona]!.guild
    && card.level === level && card.tutorial?.role === kind)!.id;
  const ctx = (source = ps.persona!, owner: PlayerId = 0): EffectContext => ({
    game, index: profile.index, source, me: owner, chooser, settle: async () => { await ctrl.flushSpecialCallTriggers(); },
  });
  return { game, ctrl, chooser, ps, add, role, ctx, training };
}

describe('tutorial profile isolation', () => {
  it('copies definitions without changing the catalogue, art, names, stats or registry', () => {
    const before = JSON.stringify(FULL_INDEX);
    const scriptsBefore = Object.fromEntries(Object.entries(ACTIVE_SCRIPTS));
    const local = createTutorialProfile(FULL_INDEX);
    expect(JSON.stringify(FULL_INDEX)).toBe(before);
    for (const [id, card] of Object.entries(FULL_INDEX)) {
      expect(local.index[id]).not.toBe(card);
      for (const property of ['name', 'power', 'defense', 'level', 'art', 'thumb'] as const)
        expect((local.index[id] as unknown as Record<string, unknown>)[property]).toEqual((card as unknown as Record<string, unknown>)[property]);
      expect(ACTIVE_SCRIPTS[id]).toBe(scriptsBefore[id]);
      if (['Action', 'Force', 'Sentry'].includes(card.type)) {
        expect(local.index[id]).toEqual(card);
        expect(local.scripts[id]).toBe(ACTIVE_SCRIPTS[id]);
      }
    }
  });

  it.each([agta, babaylan, maguindanao])('two Codex are accepted only by the explicit tutorial rules: $name', deck => {
    const f = fixture(deck);
    expect(f.training.codex).toHaveLength(2);
    expect(() => validateDeck(profile.index, f.training, 'tutorial-v1')).not.toThrow();
    expect(() => validateDeck(FULL_INDEX, f.training)).toThrow();
    expect(() => validatePlayableDeck(FULL_INDEX, f.training)).toThrow();
    expect(() => validatePlayableDeck(FULL_INDEX, deck)).not.toThrow();
    expect(deck.codex).toHaveLength(5);
    expect(() => createGame(FULL_INDEX, [deck, deck])).not.toThrow();
    for (const id of f.training.codex) {
      expect(profile.scripts[id]?.codex?.autoSwitchOn).toEqual(ACTIVE_SCRIPTS[id]?.codex?.autoSwitchOn);
      expect(profile.scripts[id]?.codex?.autoSwitchWhen).toBe(ACTIVE_SCRIPTS[id]?.codex?.autoSwitchWhen);
    }
  });

  it('removes whole State skills, retains ordinary Level 3 abilities, and gives lower Units one automatic role', () => {
    for (const entry of profile.mapping) {
      const script = profile.scripts[entry.id];
      if (entry.role === 'persona') {
        const original = ACTIVE_SCRIPTS[entry.id]?.abilities ?? [];
        const expected = original.filter(a => !a.requiresState && !/\[(?:Bayanihan|Garahana|Andukha(?:\s+\d+)?)\]/i.test(a.text));
        expect(script?.abilities?.map(a => a.text), entry.id).toEqual(expected.map(a => a.text));
      } else if (['support', 'arrival', 'attack'].includes(entry.role)) {
        expect(script?.abilities, entry.id).toHaveLength(1);
        expect(script?.abilities?.[0]?.automatic).toBe(true);
      }
    }
  });
});

describe('two active-only tutorial Codex effects', () => {
  it.each([0, 1] as const)('recomputes Barrier bonus, repeated switching and replacement for player %i', owner => {
    const f = fixture(); const ps = you(f.game, owner); const persona = ps.persona!;
    f.game.turnPlayer = owner;
    const attack = ps.codex.find(uid => def(profile.index, f.game, uid).tutorial?.role === 'codex-attack')!;
    const barrier = ps.codex.find(uid => def(profile.index, f.game, uid).tutorial?.role === 'codex-barrier')!;
    const base = def(profile.index, f.game, persona).power;
    switchCodex(profile.index, f.game, barrier);
    expect(currentPower(profile.index, f.game, persona)).toBe(base);
    moveCard(f.game, ps.barriers[0]!, 'hand');
    expect(currentPower(profile.index, f.game, persona)).toBe(base + 1000);
    f.game.turnPlayer = owner === 0 ? 1 : 0;
    expect(currentPower(profile.index, f.game, persona)).toBe(base + 1000);
    f.game.turnPlayer = owner;
    switchCodex(profile.index, f.game, attack); expect(currentPower(profile.index, f.game, persona)).toBe(base);
    switchCodex(profile.index, f.game, barrier); expect(currentPower(profile.index, f.game, persona)).toBe(base + 1000);
    expect(ps.normalPlaysUsed).toBe(3);
    const incoming = f.add('agta/set-1/fifth-sky-tyrant-kalimangalnuk', 'persona', owner);
    expect(currentPower(profile.index, f.game, incoming)).toBe(def(profile.index, f.game, incoming).power + 1000);
    expect(inst(f.game, persona).modifiers).toEqual([]);
  });

  it('adds exactly 5k only to the attacking Persona and clears it after a real attack', async () => {
    const f = fixture(); f.game.phase = 'battle';
    const persona = f.ps.persona!, base = currentPower(profile.index, f.game, persona);
    let during = 0;
    f.ctrl.hooks.onBlockingStart = async () => { during = currentPower(profile.index, f.game, persona); };
    await f.ctrl.perform({ kind: 'attack', attacker: persona, supporters: [], target: null }, 0);
    expect(during).toBe(base + 5000);
    expect(currentPower(profile.index, f.game, persona)).toBe(base);
    expect(f.game.activeBattle).toBeNull();
  });
});

describe('automatic tutorial Unit effects through the controller', () => {
  it.each([1, 2])('normal/special Level %i arrival triggers once and expires at current turn end', async level => {
    const f = fixture(); const id = f.role('arrival', level), base = profile.index[id]!.power, bonus = level === 1 ? 3000 : 5000;
    const normal = f.add(id);
    await f.ctrl.perform({ kind: 'call', uid: normal, slot: 0 }, 0);
    expect(currentPower(profile.index, f.game, normal)).toBe(base + bonus);
    expect(inst(f.game, normal).modifiers).toHaveLength(1);
    const special = f.add(id, 'deck');
    await specialCall(f.ctx(), special); await f.ctrl.flushSpecialCallTriggers();
    expect(currentPower(profile.index, f.game, special)).toBe(base + bonus);
    await f.ctrl.flushSpecialCallTriggers();
    expect(inst(f.game, special).modifiers).toHaveLength(1);
    expect(f.chooser.chooseAbility).not.toHaveBeenCalled();
    endTurn(f.game);
    expect(currentPower(profile.index, f.game, normal)).toBe(base);
    expect(currentPower(profile.index, f.game, special)).toBe(base);
  });

  it('an opposing-turn special call expires this turn, and re-entry gets one fresh bonus', async () => {
    const f = fixture(); f.game.turnPlayer = 1;
    const uid = f.add(f.role('arrival'), 'deck'), base = def(profile.index, f.game, uid).power;
    await specialCall(f.ctx(), uid); await f.ctrl.flushSpecialCallTriggers();
    expect(currentPower(profile.index, f.game, uid)).toBe(base + 3000);
    moveCard(f.game, uid, 'hand');
    expect(inst(f.game, uid).modifiers).toEqual([]);
    await specialCall(f.ctx(), uid); await f.ctrl.flushSpecialCallTriggers();
    expect(currentPower(profile.index, f.game, uid)).toBe(base + 3000);
    expect(inst(f.game, uid).modifiers).toHaveLength(1);
    endTurn(f.game);
    expect(currentPower(profile.index, f.game, uid)).toBe(base);
  });

  it('an unchanged real Force may negate an automatic arrival bonus through the existing response window', async () => {
    const f = fixture(), uid = f.add(f.role('arrival'));
    const force = Object.values(ALL_CARDS).find(card => isSelectableCard(card)
      && card.type === 'Force' && card.archipelago === 'Luzon' && ACTIVE_SCRIPTS[card.id]?.forceModes?.[1]?.response === 'negate')!;
    const response = f.add(force.id, 'hand', 1);
    const answer: Chooser = { ...noChoices(), chooseAbility: async (_p, _q, choices) => {
      const at = choices.findIndex(choice => choice.uid === response); return at < 0 ? null : at;
    } };
    const ctrl = new GameController(f.game, profile.index, { scripts: profile.scripts, choosers: [f.chooser, answer] });
    await ctrl.perform({ kind: 'call', uid, slot: 0 }, 0);
    expect(currentPower(profile.index, f.game, uid)).toBe(def(profile.index, f.game, uid).power);
    expect(inst(f.game, response).zone).toBe('grave');
    expect(f.game.responseChain).toBeFalsy();
  });

  it('cleans attack/support bonuses when a response removes the attacker', async () => {
    const f = fixture(); f.game.phase = 'battle';
    const attacker = f.add(f.role('attack'), 'ally'), supporter = f.add(f.role('support'), 'ally');
    f.ctrl.hooks.onAbilityActivated = async source => {
      if (source === attacker) moveCard(f.game, attacker, 'hand');
    };
    await f.ctrl.perform({ kind: 'attack', attacker, supporters: [supporter], target: null }, 0);
    expect(f.game.activeBattle).toBeNull();
    expect(inst(f.game, attacker).modifiers).toEqual([]);
    expect(inst(f.game, supporter).modifiers).toEqual([]);
    expect(inst(f.game, supporter).exhausted).toBe(false);
  });

  it.each([1, 2])('Level %i attacker and supporters contribute once, with no automatic-bonus confirmation', async level => {
    const f = fixture(); f.game.phase = 'battle';
    const attacker = f.add(f.role('attack', level), 'ally');
    const supporter = f.add(f.role('support', 1), 'ally');
    const baseA = currentPower(profile.index, f.game, attacker), baseS = currentPower(profile.index, f.game, supporter);
    const attackBonus = level === 1 ? 3000 : 5000;
    let presented = 0;
    f.ctrl.hooks.onBlockingStart = async battle => { presented = battle!.attackPower; };
    await f.ctrl.perform({ kind: 'attack', attacker, supporters: [supporter], target: null }, 0);
    expect(presented).toBe(baseA + attackBonus + baseS + 3000);
    expect(currentPower(profile.index, f.game, attacker)).toBe(baseA);
    expect(currentPower(profile.index, f.game, supporter)).toBe(baseS);
    expect(inst(f.game, supporter).exhausted).toBe(true);
    expect(f.chooser.chooseAbility).not.toHaveBeenCalled();
  });

  it('resolves two legal supporting bonuses without an ordering dialog', async () => {
    const f = fixture(); f.game.phase = 'battle';
    f.add(f.role('arrival'), 'ally'); // outer slot; the inner two can support Persona
    const one = f.add(f.role('support'), 'ally'), two = f.add(f.role('support'), 'ally');
    const base = currentPower(profile.index, f.game, f.ps.persona!);
    let presented = 0;
    f.ctrl.hooks.onBlockingStart = async battle => { presented = battle!.attackPower; };
    await f.ctrl.perform({ kind: 'attack', attacker: f.ps.persona!, supporters: [one, two], target: null }, 0);
    expect(presented).toBe(base + 5000 + 2 * (def(profile.index, f.game, one).power + 3000));
    expect(f.chooser.chooseAbility).not.toHaveBeenCalled();
    expect(inst(f.game, one).exhausted).toBe(true);
    expect(inst(f.game, two).exhausted).toBe(true);
  });

  it('Level 2 support adds five thousand, not a second bonus directly to its attacker', async () => {
    const f = fixture(); f.game.phase = 'battle';
    const attacker = f.add(f.role('arrival', 2), 'ally'), supporter = f.add(f.role('support', 2), 'ally');
    const baseA = currentPower(profile.index, f.game, attacker), baseS = currentPower(profile.index, f.game, supporter);
    let presented = 0;
    f.ctrl.hooks.onBlockingStart = async battle => { presented = battle!.attackPower; };
    await f.ctrl.perform({ kind: 'attack', attacker, supporters: [supporter], target: null }, 0);
    expect(presented).toBe(baseA + baseS + 5000);
    expect(currentPower(profile.index, f.game, supporter)).toBe(baseS);
  });

  it('previews the same legal automatic attack/support bonuses, then reads actual resolved values', async () => {
    const f = fixture(); f.game.phase = 'battle';
    const attacker = f.add(f.role('attack', 2), 'ally'), supporter = f.add(f.role('support'), 'ally');
    const preview = tutorialAttackPreview(profile.index, f.game, attacker, [supporter, supporter])!;
    expect(preview.attackerPower).toBe(def(profile.index, f.game, attacker).power + 5000);
    expect(preview.supportPower).toBe(def(profile.index, f.game, supporter).power + 3000);
    f.ctrl.hooks.onBlockingStart = async battle => {
      expect(battle!.attackPower).toBe(preview.attackPower);
      expect(tutorialAttackPreview(profile.index, f.game, attacker, [supporter])).toEqual(preview);
    };
    await f.ctrl.perform({ kind: 'attack', attacker, supporters: [supporter], target: null }, 0);
    expect(tutorialAttackPreview(profile.index, f.game, f.ps.persona!, [])!.attackerPower)
      .toBe(def(profile.index, f.game, f.ps.persona!).power + 5000);
    const normal = createGame(FULL_INDEX, [agta, agta]);
    expect(tutorialAttackPreview(FULL_INDEX, normal, normal.players[0].persona!, [])).toBeNull();
  });
});

describe('replaced production helpers do not leak', () => {
  it.each([agta, babaylan, maguindanao])('no State or regional Power bonus after Heart/Grave/field changes: $name', deck => {
    const f = fixture(deck), persona = f.ps.persona!;
    const base = currentPower(profile.index, f.game, persona);
    for (let i = 0; i < 12; i++) f.add(f.role('support'), i < 6 ? 'heart' : 'grave');
    while (f.ps.allies.includes(null)) f.add(f.role('support'), 'ally');
    evaluateStates(profile.index, f.game, 0);
    expect(f.ps.releasedState).toBeNull();
    expect(currentPower(profile.index, f.game, persona)).toBe(base);
    for (const uid of f.ps.allies.filter((u): u is string => !!u)) expect(currentPower(profile.index, f.game, uid)).toBe(def(profile.index, f.game, uid).power);
  });

  it('removes replaced weighted-Offer/Grave and State Vent-cost bonuses', () => {
    const f = fixture(maguindanao);
    const kamil = f.add('maguindanao/pulangi-ember-spear-kamil', 'ally');
    expect(offerValue(profile.index, f.game, kamil)).toBe(1);
    expect(offerValue(FULL_INDEX, f.game, kamil)).toBe(2);
    const alad = f.add('maguindanao/set-1/last-witness-of-the-old-words-alad', 'grave');
    expect(graveCardValue(profile.index, f.game, alad)).toBe(1);
    expect(graveCardValue(FULL_INDEX, f.game, alad)).toBe(2);
    const b = fixture(babaylan), sinogo = b.add('babaylan/set-1/abyssal-revolt-sinogo', 'persona');
    for (let i = 0; i < 12; i++) b.add(b.role('support'), 'heart');
    expect(ventCost(b.ctx(sinogo), 5)).toBe(5);
  });
});

describe('tutorial practice games use the profile for both players', () => {
  it.each([agta, babaylan, maguindanao])('finishes a complete training mirror: $name', async deck => {
    const training = tutorialDeck(deck, profile);
    const game = createGame(profile.index, [training, training], { seed: 42, rulesProfile: 'tutorial-v1' });
    const ai = new AiChooser(profile.index, () => game);
    const ctrl = new GameController(game, profile.index, { scripts: profile.scripts, choosers: [ai, ai] });
    for (let turn = 0; turn < 100 && game.winner === null; turn++) {
      await ctrl.beginTurn(); await playAiTurn(ctrl, game.turnPlayer);
      for (const side of game.players) {
        expect(side.codex).toHaveLength(2);
        expect(side.releasedState).toBeNull();
        expect(side.allies.filter(Boolean).length).toBeLessThanOrEqual(4);
      }
    }
    expect(game.winner).not.toBeNull();
    expect(game.responseChain).toBeFalsy();
  }, 60000);
});
