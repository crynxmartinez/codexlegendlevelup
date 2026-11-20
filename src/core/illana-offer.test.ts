import { expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX as index } from '../data/loader.js';
import { createGame } from './setup.js';
import { ACTIVE_SCRIPTS, GameController } from './game.js';
import { autoChooser, canActivateIllanaBay, ILLANA_BAY_ID, illanaBayArmed, offerTotal, offerUnit, type Chooser, type EffectContext } from './effects.js';
import { currentPower, inst, moveCard, you } from './state.js';
import { prepareOffer } from './activation.js';

function fixture(overrides: Partial<Chooser> = {}, required = 2) {
  const game = createGame(index, [deck, deck], { seed: 17 });
  game.phase = 'main'; game.turnPlayer = 0; game.turnNumber = 10;
  const ps = you(game, 0), hero = ps.persona!;
  const pah = 'maguindanao/set-1/sun-darkening-scourge-pah';
  inst(game, hero).defId = pah;
  const codex = ps.codex[0]!;
  inst(game, codex).defId = ILLANA_BAY_ID;
  expect(codex).toBeTruthy(); ps.activeCodex = codex;
  you(game, 1).activeCodex = null;
  const choices: string[] = [], resolutions: string[] = [];
  const chooser: Chooser = { ...autoChooser, chooseAbility: async (_p, _prompt, _options, context) => {
    choices.push(context?.kind ?? 'unknown'); return context?.kind === 'cost' ? 0 : null;
  }, ...overrides };
  const scripts = { ...ACTIVE_SCRIPTS, [pah]: { ...ACTIVE_SCRIPTS[pah]!, abilities: [
    { ...ACTIVE_SCRIPTS[pah]!.abilities![0]!, prepare: (ctx: EffectContext) => prepareOffer(ctx, required) },
  ] } };
  const ctrl = new GameController(game, index, { scripts, choosers: [chooser, chooser], hooks: {
    onAbilityActivated: async uid => { resolutions.push(uid); },
  } });
  function ally() {
    const uid = ps.deck.find(u => index[inst(game, u).defId]?.subtypes.includes('Beast'))!;
    expect(uid).toBeTruthy(); moveCard(game, uid, 'ally', { slot: ps.allies.indexOf(null) }); return uid;
  }
  const use = () => ctrl.perform({ kind: 'ability', uid: hero, abilityIndex: 0 }, 0);
  return { game, ps, hero, codex, chooser, ctrl, ally, use, choices, resolutions };
}

it('resolves Illana Bay before one non-Maguindanaon Unit pays a real Offer 2 skill', async () => {
  const f = fixture(), uid = f.ally(), power = currentPower(index, f.game, f.hero);
  inst(f.game, uid).defId = Object.values(index).find(d => d.type === 'Unit' && d.id.startsWith('agta/set-1/'))!.id;
  expect(f.ctrl.legalActions(0)).toContainEqual({ kind: 'ability', uid: f.hero, abilityIndex: 0 });
  f.chooser.chooseCards = async (p, prompt, candidates, count, opts) => {
    expect(f.resolutions).toEqual([f.codex]); expect(inst(f.game, uid).zone).toBe('ally');
    expect(opts?.firstSelectedMinimum).toBe(2);
    return autoChooser.chooseCards(p, prompt, candidates, count, opts);
  };
  await f.use();
  expect(f.resolutions).toEqual([f.codex, f.hero]);
  expect(inst(f.game, uid).zone).toBe('grave'); expect(f.ps.unitsOfferedThisTurn).toBe(2);
  expect(currentPower(index, f.game, f.hero)).toBe(power + 5000);
  expect(f.ps.normalPlaysUsed).toBe(0); expect(f.choices.filter(k => k === 'cost')).toHaveLength(1);
  expect(canActivateIllanaBay(f.game, 0)).toBe(false);
});

it('presents Illana Bay and Tarabusaw as separate committed chains before and after Offer payment', async () => {
  const f = fixture(), ally = f.ally();
  inst(f.game, f.hero).defId = 'maguindanao/set-1/matutun-branch-devourer-tarabusaw';
  const chains: Array<{ id: string; sources: string[]; allyZone: string }> = [];
  f.ctrl.hooks.onChainUpdated = async () => {
    const chain = f.game.responseChain!;
    chains.push({ id: chain.id, sources: chain.links.map(link => link.source), allyZone: inst(f.game, ally).zone });
  };
  expect(f.ctrl.legalActions(0)).toContainEqual({ kind: 'ability', uid: f.hero, abilityIndex: 0 });
  await f.use();
  expect(f.choices).toContain('cost');
  expect(f.resolutions).toEqual([f.codex, f.hero]);
  expect(chains.map(c => c.sources)).toEqual([[f.codex], [f.hero]]);
  expect(chains[0]!.id).not.toBe(chains[1]!.id);
  expect(chains.map(c => c.allyZone)).toEqual(['ally', 'grave']);
  expect(f.ps.unitsOfferedThisTurn).toBe(2);
  expect(inst(f.game, f.hero).firstAttackExtraCheckTurn).toBe(f.game.turnNumber);
});

it('counts only the first payment as two, then expires and becomes available next turn', async () => {
  const f = fixture({}, 3), a = f.ally(), b = f.ally();
  await f.use();
  expect(f.ps.unitsOfferedThisTurn).toBe(3);
  expect([inst(f.game, a).zone, inst(f.game, b).zone]).toEqual(['grave', 'grave']);
  const c = a; moveCard(f.game, c, 'ally', { slot: 0 });
  expect(offerTotal(index, f.game, [c])).toBe(1);
  offerUnit({ index, game: f.game, me: 0, source: f.hero, chooser: f.chooser }, c);
  expect(f.ps.unitsOfferedThisTurn).toBe(4);
  f.game.turnNumber++;
  expect(illanaBayArmed(f.game, 0)).toBe(false); expect(canActivateIllanaBay(f.game, 0)).toBe(true);
});

it('declining an unaffordable Offer 2 spends no Unit or skill use', async () => {
  const f = fixture({ chooseAbility: async () => null }), uid = f.ally();
  const power = currentPower(index, f.game, f.hero);
  await f.use();
  expect(inst(f.game, uid).zone).toBe('ally'); expect(f.resolutions).toEqual([]);
  expect(currentPower(index, f.game, f.hero)).toBe(power);
  expect(f.ps.illanaBayActivatedTurn).toBeUndefined(); expect(canActivateIllanaBay(f.game, 0)).toBe(true);
});

it('does not arm or prompt Illana Bay on unrelated automatic triggers', async () => {
  const f = fixture(); f.ally();
  await f.ctrl.fireTrigger('startOfMain', 0);
  expect(f.choices).toEqual([]); expect(f.resolutions).toEqual([]);
  expect(illanaBayArmed(f.game, 0)).toBe(false);
});

it('retains an armed bonus after cancelled payment without opening another chain', async () => {
  const f = fixture({ chooseCards: async () => [] }), uid = f.ally();
  await f.use(); expect(illanaBayArmed(f.game, 0)).toBe(true);
  expect(inst(f.game, uid).zone).toBe('ally'); expect(f.resolutions).toEqual([f.codex]);
  f.chooser.chooseCards = autoChooser.chooseCards;
  await f.use();
  expect(f.resolutions).toEqual([f.codex, f.hero]);
  expect(f.ps.unitsOfferedThisTurn).toBe(2); expect(f.choices.filter(k => k === 'cost')).toHaveLength(1);
});

it('lets an opponent respond before the bonus and cancels a source removed in that response', async () => {
  const f = fixture(), uid = f.ally(); f.game.phase = 'battle';
  const foe = you(f.game, 1), force = foe.deck.find(u => inst(f.game, u).defId.endsWith('/prayer-above-the-storm-sky-tunung'))!;
  moveCard(f.game, force, 'hand');
  let responded = false;
  f.chooser.chooseAbility = async (p, _prompt, _options, context) => {
    if (context?.kind === 'cost') return 0;
    if (p === 1 && context?.kind === 'response' && !responded) {
      responded = true;
      expect(inst(f.game, uid).zone).toBe('ally'); expect(illanaBayArmed(f.game, 0)).toBe(false);
      // A legal response may change the parent source before its cost is paid.
      moveCard(f.game, f.hero, 'grave');
      return 0;
    }
    return null;
  };
  await f.use();
  expect(responded).toBe(true); expect(f.resolutions).toContain(f.codex);
  expect(f.resolutions).not.toContain(f.hero); expect(inst(f.game, uid).zone).toBe('ally');
  expect(f.ps.unitsOfferedThisTurn).toBe(0);
});
