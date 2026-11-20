import { forceResponse, FORCE_RESPONSES } from './force-responses.js';
import { ventPayment, cardPayment, planCards } from '../core/activation.js';
/** Babaylan Set 1. Heart is a resource bank and a source of returning attackers. */
import proposals from '../../content/babaylan-set-1-skills.json' with { type: 'json' };
import type { AbilityScript, ScriptRegistry } from './types.js';
import {
  buffPower, createKaluluwaTokens, draw, essenceCard, essenceFromDeck,
  essenceTopCard, essenceUnitFromField, exhaust, hasAndukha, spiritCount, kaluluwaCount,
  orderDeckBottom, releaseSpirits, ventSelectedCards, specialCall, shuffleDeck, ventCost, ventCard, damageUnitByAbility, isUnitCard,
  type EffectContext as C, type TriggerName, type TriggerEvent,
} from '../core/effects.js';
import { currentPower, def, inst, moveCard, opponentOf, you } from '../core/state.js';
import { reevaluateState } from '../core/states.js';
import { recordSkillUse, usedSkill } from '../core/skill-usage.js';

export const BABAYLAN_SET_ONE_IDS = Object.keys(proposals);
const id = (n: number) => BABAYLAN_SET_ONE_IDS[n - 1]!;
const entries = Object.values(proposals);
const own = (c: C) => you(c.game, c.me);
const allies = (c: C) => own(c).allies.filter((u): u is string => !!u);
const units = (c: C) => [...allies(c), ...(own(c).persona ? [own(c).persona!] : [])];
const enemies = (c: C) => you(c.game, opponentOf(c.me)).allies.filter((u): u is string => !!u);
const unit = (c: C, u: string) => def(c.index, c.game, u).type === 'Unit';
const sub = (c: C, u: string, s: string) => def(c.index, c.game, u).subtypes.includes(s);
const divine = (c: C, u: string) => unit(c, u) && sub(c, u, 'Divine');
const beast = (c: C, u: string) => unit(c, u) && (sub(c, u, 'Beast') || sub(c, u, 'Bird'));
const small = (c: C, u: string) => unit(c, u) && def(c.index, c.game, u).level <= 2;
const ritual = (c: C, u: string) => unit(c, u) && sub(c, u, 'Babaylan');
const open = (c: C) => own(c).allies.includes(null);
const self = (c: C) => c.event?.unit === c.source;
const heartCall = (c: C) => c.event?.special === true && c.event.from === 'heart';
const canVent = (c: C, amount = 0) => own(c).heart.length >= ventCost(c, amount);
const pick = async (c: C, pool: string[], prompt: string) => {
  if (!pool.length) return null;
  const u = await c.chooser.chooseTarget(c.me, prompt, pool);
  return u && pool.includes(u) ? u : null;
};
async function settle(c: C) { await c.settle?.(); reevaluateState(c.index, c.game, c.me); }
async function payVent(c: C, amount = 0) {
  if (c.activation) return true; // Receipt proves this activation already paid.
  if (!canVent(c, amount)) return false;
  if (amount && !await releaseSpirits(c, amount)) return false;
  await settle(c);
  return true;
}
async function discard(c: C) { const u = await pick(c, [...own(c).hand], 'Choose a card to discard'); if (u) moveCard(c.game, u, 'grave'); }
async function handEssence(c: C) { const u = await pick(c, [...own(c).hand], 'Choose a card from hand to Sanib'); if (u) essenceCard(c, u); await settle(c); }
async function filter(c: C, toHeart = false) { await draw(c, 1); if (toHeart) await handEssence(c); else await discard(c); }
async function buff(c: C, amount: number, pool = units(c)) { const u = await pick(c, pool, `Choose a Unit for Power +${amount}`); if (u) buffPower(c, u, amount); }
async function call(c: C, pool: string[], exhausted = false, openOnly = true, beforeTriggers?: (u: string) => void) {
  if (openOnly && !open(c)) return null;
  const u = await pick(c, pool, 'Choose a Unit to special call');
  if (!u || !await specialCall(c, u, { allowOverwrite: !openOnly })) return null;
  inst(c.game, u).exhausted = exhausted;
  beforeTriggers?.(u);
  await settle(c);
  return u;
}
function returnLater(c: C, uid: string, when: 'battle' | 'turn', optional = false, _oldCost = 0, restore?: string) {
  (c.game.babaylanReturns ??= []).push({ owner: c.me, uid, entry: inst(c.game, uid).fieldEntry ?? 0,
    turn: c.game.turnNumber + (when === 'turn' && c.game.turnPlayer !== c.me ? 1 : 0), when, optional, restore, source: c.source });
}
async function topEssence(c: C, n: number) { essenceFromDeck(c, n); await settle(c); }
async function lookEssence(c: C, n: number, predicate: (c: C, u: string) => boolean) {
  const top = own(c).deck.slice(0, n);
  await c.chooser.revealCards(c.me, top, `Look at the top ${n} cards`);
  const u = await pick(c, top.filter(u => predicate(c, u)), 'Choose a Unit to Sanib');
  if (u) essenceCard(c, u);
  const rest = top.filter(x => x !== u);
  await orderDeckBottom(c, rest);
  await settle(c);
}
async function recover(c: C, pool: string[]) { const u = await pick(c, pool, 'Choose a Unit to return to hand'); if (u) moveCard(c.game, u, 'hand'); await settle(c); return u; }
async function graveEssence(c: C, count: number) {
  const pool = own(c).grave.filter(u => unit(c, u));
  const picked = await c.chooser.chooseCards(c.me, `Sanib up to ${count} Units from Grave`, pool, Math.min(count, pool.length), { upTo: true });
  for (const u of [...new Set(picked)].filter(u => pool.includes(u)).slice(0, count)) essenceCard(c, u);
  await settle(c);
}
const no = () => false;
export const BABAYLAN_SET_ONE_SCRIPTS: ScriptRegistry = {};
function ability(n: number, line: number, run: (c: C) => Promise<void>, opts: Partial<AbilityScript> = {}): AbilityScript {
  const text = entries[n - 1]!.skill.split('\n')[line]!;
  const threshold = Number(/\[Andukha (\d+)\]/i.exec(text)?.[1] ?? 0);
  return { text, scope: text.includes('[Persona]') ? ['Persona'] : text.includes('[Heart]') ? ['Heart'] : ['Ally'], run,
    passive: opts.canRun === no,
    conditionReason: threshold ? c => hasAndukha(c, threshold) ? undefined : `Locked · needs Andukha ${threshold} (Heart value ${spiritCount(c)} / ${threshold})` : undefined,
    ...opts };
}
function register(n: number, ...abilities: AbilityScript[]) { BABAYLAN_SET_ONE_SCRIPTS[id(n)] = { id: id(n), abilities }; }
const attack = { trigger: 'attack' as const, perTurn: 1 };
const placed = { trigger: 'placed' as const, perTurn: 1, canRun: self };
const ventedSelf = (c: C) => !!c.event?.cards?.includes(c.source);

async function optionalEffect(c: C, label: string, effect: () => Promise<void>) {
  await c.present?.();
  if (!usedSkill(c.game, c.me, c.source, 'optional-follow-up') && await c.chooser.confirm(c.me, `Use the follow-up to ${label}?`)) {
    recordSkillUse(c.game, c.me, c.source, 'optional-follow-up');
    await effect();
  }
}
const essenceUnitEvent = (c: C) => !!c.event?.cards?.some(u => c.game.cards[u] && isUnitCard(def(c.index, c.game, u)));
// Kaluluwa are Token cards; they count as Sanib cards, but not as Units.
const onVent = { trigger: 'vented' as const, canRun: ventedSelf };
register(1, ability(1, 0, async c => {
  if (!await payVent(c)) return;
  if (!c.activation) await topEssence(c, 2);
  await call(c, own(c).heart.filter(u => divine(c, u) && small(c, u)), false, true, u => { buffPower(c, u, 5000); returnLater(c, u, 'turn'); });
}, { perTurn: 1, canRun: c => canVent(c) && own(c).deck.length >= 2 && open(c) }),
ability(1, 1, async c => { createKaluluwaTokens(c, 1); await settle(c); }, { trigger: 'essenced', perTurn: 1, canRun: c => c.game.turnPlayer === c.me && hasAndukha(c, 6) && essenceUnitEvent(c) }));
register(2, ability(2, 0, async c => {
  await topEssence(c, 1);
  await optionalEffect(c, 'create 2 Kaluluwa in your Heart', async () => { createKaluluwaTokens(c, 2); await settle(c); });
}, { trigger: 'startOfMain', perTurn: 1, canRun: c => c.game.turnPlayer === c.me }),
ability(2, 1, async () => {}, { canRun: no }));
register(3, ability(3, 0, async c => {
  const card = c.activation?.cards[0] ?? await pick(c, [...own(c).hand], 'Choose a card from hand to Sanib');
  if (!card || !await payVent(c)) return;
  if (!c.activation) essenceCard(c, card); await settle(c); await draw(c, 1); buffPower(c, c.source, 3000);
}, { ...attack, canRun: c => self(c) && canVent(c) && own(c).hand.length > 0 }),
ability(3, 1, async c => { await lookEssence(c, 5, divine); buffPower(c, c.source, 5000); }, { perTurn: 1, canRun: c => hasAndukha(c, 9) }));
register(4, ability(4, 0, async c => filter(c, true), { trigger: 'placed', perTurn: 1, canRun: heartCall }),
ability(4, 1, async c => {
  const u = c.activation?.cards[0] ?? await pick(c, allies(c), 'Choose an Ally to Sanib and add its Power for this battle');
  if (!u || !await payVent(c)) return;
  const power = c.activation?.powers[u] ?? currentPower(c.index, c.game, u);
  if (!c.activation) essenceUnitFromField(c, u); await settle(c); buffPower(c, c.source, power, 'endOfAttack');
}, { ...attack, canRun: c => self(c) && hasAndukha(c, 9) && canVent(c) && allies(c).length > 0 }));
register(5, ability(5, 0, async c => {
  if (!await payVent(c, 5)) return;
  await call(c, own(c).deck.filter(u => beast(c, u)), false, true, u => returnLater(c, u, 'turn'));
  shuffleDeck(c.game, c.me);
}, { ...attack, canRun: c => self(c) && canVent(c, 5) && open(c) && own(c).deck.some(u => beast(c, u)) }),
ability(5, 1, async () => {}, { canRun: no }));
register(6, ability(6, 0, async c => {
  const before = c.game.pendingBabaylan?.length ?? 0;
  if (!c.activation && (!canVent(c, 6) || !await releaseSpirits(c, 6))) return;
  const tokens = c.activation?.tokens ?? c.game.pendingBabaylan?.[before]?.tokens ?? 0;
  await settle(c);
  buffPower(c, c.source, 10000, 'endOfAttack');
  if (c.game.activeBattle) c.game.activeBattle.maxBlockLevel = 1;
  if (tokens >= 6) await draw(c, 1);
}, { ...attack, canRun: c => self(c) && c.game.activeBattle?.target === null && canVent(c, 6) }),
ability(6, 1, async c => {
  const pool = [...own(c).grave];
  const chosen = [...new Set(await c.chooser.chooseCards(c.me, 'Sanib up to three cards from your Grave', pool, Math.min(3, pool.length), { upTo: true }))].filter(u => pool.includes(u)).slice(0, 3);
  for (const u of chosen) essenceCard(c, u);
  await settle(c);
}, { trigger: 'battleFinished', canRun: c => self(c) && c.event?.hit === false && hasAndukha(c, 9) && own(c).grave.length > 0 }));
register(7, ability(7, 0, async c => { await call(c, own(c).heart.filter(u => unit(c, u))); },
{ trigger: 'essenced', perTurn: 1, canRun: c => c.event?.from === 'persona' && !!c.event.cards?.includes(c.source) && open(c) }),
ability(7, 1, async c => {
  if (!c.activation && !own(c).heart.includes(c.source)) return; if (!c.activation) ventCard(c, c.source); await settle(c);
  const u = await pick(c, own(c).deck.filter(u => ritual(c, u) && small(c, u) && def(c.index, c.game, u).id !== id(7)), 'Search for a Babaylan Unit to Sanib');
  if (u) essenceCard(c, u); shuffleDeck(c.game, c.me); await settle(c);
  await call(c, own(c).heart.filter(u => ritual(c, u)), false, true, u => buffPower(c, u, 5000));
}, { scope: ['Heart'], perTurn: 1, canRun: c => hasAndukha(c, 9) && canVent(c) && open(c) && own(c).heart.includes(c.source) && own(c).deck.some(u => ritual(c, u) && small(c, u) && def(c.index, c.game, u).id !== id(7)) }));
register(8, ability(8, 0, async c => { await topEssence(c, 1); createKaluluwaTokens(c, 1); await settle(c); }, { ...placed, perTurn: undefined }));
register(9, ability(9, 0, async c => {
  await topEssence(c, 1);
  if (own(c).hand.some(u => unit(c, u)) && open(c)) await optionalEffect(c, 'special call a Unit from your hand', async () => {
    await call(c, own(c).hand.filter(u => unit(c, u)), false, true, u => { returnLater(c, c.source, 'turn'); returnLater(c, u, 'turn'); });
  });
}, { ...placed, perTurn: undefined }));
register(10, ability(10, 0, async c => { if (await payVent(c)) buffPower(c, c.source, 1000 * kaluluwaCount(c), 'endOfAttack'); }, { trigger: 'attack', canRun: c => self(c) && canVent(c) }));
register(11, ability(11, 0, async c => { buffPower(c, c.source, 3000); }, { ...placed, perTurn: undefined }));
register(12, ability(12, 0, async c => { await draw(c, 1); }, onVent));
register(13, ability(13, 0, async c => { const u = await pick(c, enemies(c), 'Choose an opposing Ally to damage'); if (u) { damageUnitByAbility(c, u); await settle(c); } }, onVent));
register(14, ability(14, 0, async c => {
  const pool = units(c);
  const chosen = [...new Set(await c.chooser.chooseCards(c.me, 'Choose up to two Units for Power +3000', pool, Math.min(2, pool.length), { upTo: true }))].filter(u => pool.includes(u)).slice(0, 2);
  for (const u of chosen) buffPower(c, u, 3000);
}, onVent));
register(18, ability(18, 0, async c => {
  if (!canVent(c)) return; if (!c.activation) essenceCard(c, c.source); await settle(c);
  await buff(c, 5000);
}, { scope: ['Hand', 'Ally'], trigger: 'essenced', canRun: c => canVent(c) && ['hand', 'ally'].includes(inst(c.game, c.source).zone) && units(c).some(u => u !== c.source) }));
register(16, ability(16, 0, async () => {}, { canRun: no }));
register(17, ability(17, 0, async c => {
  await optionalEffect(c, 'create 1 additional Kaluluwa in your Heart', async () => { createKaluluwaTokens(c, 1, true); await settle(c); });
}, { trigger: 'kaluluwaCreated', canRun: c => !c.event?.bonusCreation && (c.event?.tokens ?? 0) > 0 && canVent(c) }));
register(15, ability(15, 0, async c => { essenceUnitFromField(c, c.source); await settle(c); }, { trigger: 'endOfTurn', automatic: true, canRun: c => c.game.turnPlayer === c.me }));
register(19, ability(19, 0, async c => {
  if (!await payVent(c)) return; buffPower(c, c.source, 5000);
  returnLater(c, c.source, 'turn'); c.game.babaylanReturns!.at(-1)!.companion = true;
}, { perTurn: 1, canRun: c => canVent(c) }));
register(20, ability(20, 0, async c => { await optionalEffect(c, 'give this Unit Power +5000', async () => { buffPower(c, c.source, 5000); }); }, { trigger: 'vented', canRun: c => canVent(c) }));
register(21, ability(21, 0, async c => { await optionalEffect(c, 'draw 1 card', async () => { await draw(c, 1); }); }, { trigger: 'essenced', canRun: c => !!c.event?.firstEssenceThisTurn && canVent(c) }));
register(22, ability(22, 0, async c => { await filter(c, true); }, onVent));

for (const [i, n] of [23, 24, 25, 26].entries()) {
  BABAYLAN_SET_ONE_SCRIPTS[id(n)] = { id: id(n), forceModes: [
    { label: 'One Unit gets Power +5000', run: async c => buff(c, 5000) },
    forceResponse(FORCE_RESPONSES[i]!),
  ] };
}
function action(n: number, _oldCost: number, run: (c: C) => Promise<void>, canRun?: (c: C) => boolean) {
  BABAYLAN_SET_ONE_SCRIPTS[id(n)] = { id: id(n), action: { run, canRun } };
}
action(27, 1, c => lookEssence(c, 3, unit));
action(28, 1, async c => { if (await payVent(c, 2)) { await draw(c, 2); await discard(c); } }, c => canVent(c, 2));
action(29, 2, async c => {
  const u = await pick(c, allies(c), 'Choose an Ally to Sanib'); if (!u) return;
  const level = def(c.index, c.game, u).level; essenceUnitFromField(c, u); await settle(c);
  await call(c, own(c).heart.filter(x => x !== u && unit(c, x) && def(c.index, c.game, x).level <= level), false, true, x => buffPower(c, x, 5000));
}, c => allies(c).length > 0);
action(30, 1, async c => { if (await payVent(c, 1)) await call(c, own(c).heart.filter(u => beast(c, u)), false, true, u => { buffPower(c, u, 5000); returnLater(c, u, 'turn'); }); }, c => canVent(c, 1) && open(c));
action(31, 2, async c => {
  if (!await payVent(c, 3)) return;
  const pool = enemies(c).filter(u => !inst(c.game, u).exhausted);
  const selected = [...new Set(await c.chooser.chooseCards(c.me, 'Exhaust up to two opposing Allies', pool, Math.min(2, pool.length), { upTo: true }))].filter(u => pool.includes(u)).slice(0, 2);
  exhaust(c, selected); await settle(c);
  if (hasAndukha(c, 12)) await buff(c, -5000, selected);
}, c => canVent(c, 3));
action(32, 1, async c => { await graveEssence(c, 2); await releaseSpirits(c, 1); });
action(33, 2, async c => { await topEssence(c, 2); if (hasAndukha(c, 9)) for (const u of units(c)) buffPower(c, u, 3000); });
action(34, 3, async c => {
  const offset = c.game.pendingBabaylan?.length ?? 0;
  if (!c.activation && !await releaseSpirits(c, 6)) return;
  const tokens = c.activation?.tokens ?? c.game.pendingBabaylan?.[offset]?.tokens ?? 0;
  await settle(c);
  const pool = enemies(c).filter(u => inst(c.game, u).exhausted);
  const selected = await c.chooser.chooseCards(c.me, 'Return up to two exhausted opposing Allies', pool, Math.min(2, pool.length), { upTo: true });
  for (const u of [...new Set(selected)].filter(u => pool.includes(u)).slice(0, 2)) moveCard(c.game, u, 'hand');
  if (tokens >= 6) await draw(c, 1);
}, c => canVent(c, 6));
action(35, 0, async c => { const u = await recover(c, own(c).heart.filter(u => unit(c, u))); if (u) { if (divine(c, u) && own(c).deck.length && await c.chooser.confirm(c.me, 'Sanib the top card of your deck?')) await topEssence(c, 1); if (beast(c, u)) await filter(c); } });
action(36, 2, async c => { await graveEssence(c, 2); if (hasAndukha(c, 12) && own(c).persona) buffPower(c, own(c).persona!, 10000); });

function codex(n: number, switchOn: TriggerName, trigger: TriggerName | TriggerName[], run: (c: C) => Promise<void>, canRun: (c: C) => boolean = () => true, once = true, switchWhen?: (c: C) => boolean) {
  BABAYLAN_SET_ONE_SCRIPTS[id(n)] = { id: id(n), codex: { autoSwitchOn: switchOn, autoSwitchWhen: switchWhen, skill: {
    type: 'auto', trigger, maxUses: once ? 1 : undefined, text: entries[n - 1]!.skill.split('\n')[2]!,
    canRun: c => (!once || inst(c.game, c.source).setOneUses?.codex !== c.game.turnNumber) && canRun(c),
    run: async c => { if (once) (inst(c.game, c.source).setOneUses ??= {}).codex = c.game.turnNumber; await run(c); },
  } } };
}
/**
 * The ten Codex, as ten entrances to the Heart.
 *
 * Babaylan pays forward: Kaluluwa tokens and essenced cards pile into the
 * Heart, Andukha releases at six and pays more at nine and twelve, and Kalas
 * spends the Heart back out. Every Codex here either fills the Heart faster,
 * makes what is in it worth more, or turns it back into board.
 *
 * Each is tied to a different moment or a different kind of trouble, and one
 * switch a turn is all you get. The four that key off the opponent being
 * ahead are eligible only while you are behind.
 */

const foeOf = (c: C) => you(c.game, opponentOf(c.me));
const bodies = (c: C) => units(c).length;
const foeBodies = (c: C) => foeOf(c).allies.filter(Boolean).length
  + (foeOf(c).persona ? 1 : 0);
const behindUnits = (c: C) => bodies(c) < foeBodies(c);
const behindHand = (c: C) => own(c).hand.length < foeOf(c).hand.length;
const behindBarriers = (c: C) => own(c).barriers.length < foeOf(c).barriers.length;
const lowBarriers = (c: C) => own(c).barriers.length <= 2;
const theirTurn = (c: C) => c.game.turnPlayer !== c.me;
const spirits = (c: C) => kaluluwaCount(c);

/** A Codex that stands in for a step of the turn rather than reacting to one. */
function codexReplaces(
  n: number, on: TriggerName, replaces: 'draw' | 'personify',
  run: (c: C) => Promise<void>,
) {
  BABAYLAN_SET_ONE_SCRIPTS[id(n)] = {
    id: id(n),
    codex: {
      autoSwitchOn: on,
      skill: {
        type: 'replacement', replaces,
        text: entries[n - 1]!.skill.split('\n')[2]!,
        run,
      },
    },
  };
}

/* ---- 46 · Great Calling, Moonwake Shore -------------------------------- */
// The calling itself. Two spirits answer instead of a card, and only a Heart
// already deep enough to hold Andukha gets the card as well.
codexReplaces(46, 'startOfTurn', 'draw', async c => {
  createKaluluwaTokens(c, 2);
  await settle(c);
  if (own(c).releasedState === 'Andukha') await draw(c, 1);
});

/* ---- 38 · Silent Threshold, Kabulaw ------------------------------------ */
// Crossing without being seen to cross. The Persona you never drew is still
// in the deck, and the four you pass over go under in the order you choose.
codexReplaces(38, 'personify', 'personify', async c => {
  const seen = own(c).deck.slice(0, 5);
  if (!seen.length) return;
  await c.chooser.revealCards(c.me, seen, 'Silent Threshold', 'Top 5 of your deck');
  const current = own(c).persona;
  const eligible = seen.filter(u => unit(c, u)
    && def(c.index, c.game, u).level === 3
    && (!current || def(c.index, c.game, u).level >= def(c.index, c.game, current).level));
  const chosen = eligible.length
    ? await c.chooser.chooseTarget(c.me, 'Personify which Level 3 Unit?', eligible)
    : null;
  if (chosen) {
    own(c).deck.splice(own(c).deck.indexOf(chosen), 1);
    if (current) moveCard(c.game, current, 'heart');
    moveCard(c.game, chosen, 'persona');
  }
  for (const u of seen.filter(x => x !== chosen)) {
    const d = own(c).deck;
    if (d.includes(u)) {
      d.splice(d.indexOf(u), 1);
      d.push(u);
    }
  }
  await settle(c);
});

/* ---- 40 · Fields Under Watch, Tabayag ---------------------------------- */
// The steady one. A card into the Heart every turn, and a spirit as well when
// the card was a Unit — the Heart deepens whether or not the deck cooperates.
codex(40, 'startOfMain', 'startOfMain', async c => {
  const u = essenceTopCard(c);
  if (u && unit(c, u)) createKaluluwaTokens(c, 1);
  await settle(c);
}, c => c.game.turnPlayer === c.me && own(c).deck.length > 0);

/* ---- 43 · Champion's Trial, Danao Highlands ---------------------------- */
// The trial is paid for afterwards. The swing takes every spirit in the Heart
// with it, and at the end of the turn three of them are spent — so the
// biggest Heart makes the biggest attack and the largest bill.
codex(43, 'personaAttack', ['personaAttack', 'endOfTurn'], async c => {
  if (c.event?.name === 'endOfTurn') {
    await payTrialDebt(c);
    return;
  }
  const n = spirits(c);
  if (n > 0 && own(c).persona) buffPower(c, own(c).persona!, 1000 * n);
  own(c).trialDebtTurn = c.game.turnNumber;
}, c => c.event?.name === 'endOfTurn'
  || (c.event?.unit === own(c).persona && spirits(c) > 0), false);

/** Once the attack bonus was accepted, its delayed payment cannot be declined. */
export async function payTrialDebt(c: C): Promise<void> {
  if (own(c).trialDebtTurn !== c.game.turnNumber) return;
  own(c).trialDebtTurn = undefined;
  const chooser = c.chooser;
  await releaseSpirits({ ...c, chooser: { ...chooser,
    chooseCards: async (p, prompt, candidates, count, opts) => {
      const chosen = await chooser.chooseCards(p, prompt, candidates, count, { ...opts, decline: undefined });
      return chosen.length === count && new Set(chosen).size === count
        && chosen.every(uid => candidates.includes(uid)) ? chosen : candidates.slice(0, count);
    },
  } }, Math.min(3, own(c).heart.length));
  await settle(c);
}

/* ---- 41 · Living Sanctuary, Dingayop Spring ---------------------------- */
// A check that found nothing is answered by the Heart instead: two spirits
// arrive, and one card leaves the hand to pay for the sanctuary.
codex(41, 'personaAttacked', 'barrierBroken', async c => {
  createKaluluwaTokens(c, 2);
  await settle(c);
  await discard(c);
}, c => !!c.event?.revealed
  && def(c.index, c.game, c.event.revealed).type !== 'Force'
  && own(c).hand.length > 0);

/* ---- 44 · Turning Pursuit, Bantayan Waters ----------------------------- */
// Their attack arms the answer to the next one. Broken on this attack, ready
// for the following — which may be next turn, so it is held on the player
// rather than on the turn.
codex(44, 'barrierBroken', ['barrierBroken', 'personaAttacked'], async c => {
  if (c.event?.name === 'barrierBroken') {
    own(c).pursuitArmed = true;
    return;
  }
  if (!own(c).pursuitArmed) return;
  own(c).pursuitArmed = false;
  const n = spirits(c);
  if (n > 0 && own(c).persona) buffPower(c, own(c).persona!, 1000 * n, 'endOfAttack');
}, undefined, false, theirTurn);

/* ---- 45 · Faithless Prison, Tañon Strait ------------------------------- */
// Two leave the Heart; one is let back onto the field and the other is kept.
// Kalas destroys Kaluluwa tokens outright, so only a real card can be called
// back — vent two tokens and the prison has nobody to hold.
codex(45, 'startOfTurn', 'codexPlayed', async c => {
  const before = c.game.pendingBabaylan?.length ?? 0;
  if (!c.activation && !await releaseSpirits(c, 2)) return;
  const vented = c.activation?.vented.filter(u => c.game.cards[u]) ?? (c.game.pendingBabaylan ?? [])
    .slice(before).flatMap(e => e.cards ?? [])
    .filter(u => c.game.cards[u]);
  await settle(c);
  if (!vented.length) return;
  const callable = vented.filter(u => unit(c, u));
  const chosen = callable.length
    ? await c.chooser.chooseTarget(c.me, 'Call which card back to the field?', callable)
    : null;
  if (chosen) await specialCall(c, chosen, { allowOverwrite: false });
  for (const u of vented) {
    if (u !== chosen && c.game.cards[u]) moveCard(c.game, u, 'exile');
  }
  await settle(c);
}, c => own(c).heart.length >= 2, true, lowBarriers);

/* ---- 42 · Hidden Court, Dingayop Cavern -------------------------------- */
// The court is already full; every arrival brings someone with it. The
// doubling itself lives in `essenceCard`, because essencing happens in a
// dozen places and a trigger would have to be fired from all of them.
// Nothing runs here — being active IS the effect.
codex(42, 'startOfTurn', 'essenced', async () => {}, () => false, false, behindUnits);

/* ---- 39 · Unseen Passage, Argao River ---------------------------------- */
// The river takes what you give it and gives back by the handful. Five out of
// the Heart is one card in hand, so a Heart built patiently cashes at once.
codex(39, 'startOfTurn', 'codexPlayed', async c => {
  const max = own(c).heart.length;
  if (max < 1 && !c.activation?.vented.length) return;
  const selected = c.activation?.vented ?? await c.chooser.chooseCards(
    c.me, 'Unseen Passage: choose cards to Kalas', [...own(c).heart], max,
    { from: 'heart', upTo: true, ventDrawPer: 5, confirm: 'Kalas selected cards', decline: 'Skip',
      detail: 'Choose any number of Heart cards. Draw 1 card for every 5 you Kalas, after this effect resolves; Kalas skills wait for the next chain.' });
  if (!c.activation && !ventSelectedCards(c, selected)) return;
  await settle(c);
  const drawn = Math.floor(selected.length / 5);
  if (drawn > 0) await draw(c, drawn);
}, c => own(c).heart.length > 0, true, behindHand);

/* ---- 37 · Sovereign Heights, Mount Lantoy ------------------------------ */
// The mountain answers when the State does. One moment, the whole board.
codex(37, 'startOfTurn', 'stateReleased', async c => {
  for (const u of units(c)) buffPower(c, u, 1000);
}, undefined, true, behindBarriers);

/** Claim first-event windows before a player can decline or recursively generate another event. */
export function prepareBabaylanEvent(c: C, event: TriggerEvent) {
  if (event.name === 'placed' && event.from === 'heart' && event.unit) (inst(c.game, event.unit).setOneUses ??= {}).heartCall = c.game.turnNumber;

}

export async function finishBabaylanReturns(c: C, when: 'battle' | 'turn', event?: TriggerEvent) {
  const matches = new Set([event?.unit, event?.target, ...(event?.supporters ?? [])]);
  const due = (c.game.babaylanReturns ?? []).filter(r => r.owner === c.me && r.turn === c.game.turnNumber && r.when === when && (when === 'turn' || matches.has(r.uid)));
  c.game.babaylanReturns = (c.game.babaylanReturns ?? []).filter(r => !due.includes(r) && r.turn >= c.game.turnNumber);
  for (const r of due) {
    const card = c.game.cards[r.uid];
    if (!card || card.zone !== 'ally' || card.fieldEntry !== r.entry) continue;
    if (r.restore && (!hasAndukha(c, 9) || !c.game.cards[r.source] || inst(c.game, r.source).zone !== 'persona')) continue;
    if (r.optional && !await c.chooser.confirm(c.me, r.restore ? 'Sanib this attacker and restore the original Ally exhausted?' : 'Sanib this Unit after its battle?')) continue;
    const companion = r.companion ? await pick(c, [...allies(c), ...own(c).hand].filter(u => u !== r.uid), 'Choose an Ally or a card from hand to Sanib with Doro') : null;
    essenceUnitFromField(c, r.uid);
    if (companion) essenceCard(c, companion);
    await settle(c);
    if (r.restore && c.game.cards[r.restore]?.zone === 'heart') await call(c, [r.restore], true);
  }
  if (when === 'battle') {
    const draws = (c.game.babaylanBattleDraws ?? []).filter(r => r.owner === c.me && r.turn === c.game.turnNumber);
    c.game.babaylanBattleDraws = (c.game.babaylanBattleDraws ?? []).filter(r => !draws.includes(r));
    for (const _ of draws) await draw(c, 1);
  }
}

// Explicit activation costs are prepared once, before any responses.
BABAYLAN_SET_ONE_SCRIPTS[id(1)]!.abilities![0]!.prepare = async c => own(c).deck.length >= 2 ? planCards(c, own(c).deck.slice(0, 2), 'essence') : null;
BABAYLAN_SET_ONE_SCRIPTS[id(3)]!.abilities![0]!.prepare = cardPayment(c => [...own(c).hand], 1, 'essence', 'Choose a hand card to Sanib');
BABAYLAN_SET_ONE_SCRIPTS[id(4)]!.abilities![1]!.prepare = cardPayment(c => allies(c), 1, 'essence', 'Choose an Ally to Sanib');
BABAYLAN_SET_ONE_SCRIPTS[id(5)]!.abilities![0]!.prepare = ventPayment(5);
BABAYLAN_SET_ONE_SCRIPTS[id(6)]!.abilities![0]!.prepare = ventPayment(6);
BABAYLAN_SET_ONE_SCRIPTS[id(7)]!.abilities![1]!.prepare = async c => own(c).heart.includes(c.source) ? planCards(c, [c.source], 'vent') : null;
BABAYLAN_SET_ONE_SCRIPTS[id(18)]!.abilities![0]!.prepare = async c => ['hand', 'ally'].includes(inst(c.game, c.source).zone) ? planCards(c, [c.source], 'essence') : null;
BABAYLAN_SET_ONE_SCRIPTS[id(1)]!.abilities![0]!.prepare!.describe = c => ({ label: 'Sanib the top 2 cards of your deck',
  missing: own(c).deck.length < 2 ? `Need ${2 - own(c).deck.length} more cards in your deck` : undefined });
BABAYLAN_SET_ONE_SCRIPTS[id(7)]!.abilities![1]!.prepare!.describe = () => ({ label: 'Kalas this card from Heart' });
BABAYLAN_SET_ONE_SCRIPTS[id(18)]!.abilities![0]!.prepare!.describe = () => ({ label: 'Sanib this card' });
for (const [n, count] of [[28, 2], [30, 1], [31, 3], [34, 6]] as const) BABAYLAN_SET_ONE_SCRIPTS[id(n)]!.action!.prepare = ventPayment(count);

BABAYLAN_SET_ONE_SCRIPTS[id(6)]!.abilities![1]!.targets = [{ prompt: 'Sanib up to three cards from your Grave', pool: c => [...own(c).grave], count: 3, optional: true }];
BABAYLAN_SET_ONE_SCRIPTS[id(7)]!.abilities![0]!.targets = [{ prompt: 'Choose a Unit to special call', pool: c => own(c).heart.filter(u => unit(c, u)) }];
BABAYLAN_SET_ONE_SCRIPTS[id(13)]!.abilities![0]!.targets = [{ prompt: 'Choose an opposing Ally to damage', pool: enemies }];
BABAYLAN_SET_ONE_SCRIPTS[id(14)]!.abilities![0]!.targets = [{ prompt: 'Choose up to two Units for Power +3000', pool: units, count: 2, optional: true }];
BABAYLAN_SET_ONE_SCRIPTS[id(18)]!.abilities![0]!.targets = [{ prompt: 'Choose a Unit for Power +5000', pool: c => units(c).filter(u => u !== c.source) }];
BABAYLAN_SET_ONE_SCRIPTS[id(29)]!.action!.targets = [{ prompt: 'Choose an Ally to Sanib', pool: allies }];
BABAYLAN_SET_ONE_SCRIPTS[id(30)]!.action!.targets = [{ prompt: 'Choose a Unit to special call', pool: c => own(c).heart.filter(u => beast(c, u)) }];
BABAYLAN_SET_ONE_SCRIPTS[id(31)]!.action!.targets = [{ prompt: 'Exhaust up to two opposing Allies', pool: c => enemies(c).filter(u => !inst(c.game, u).exhausted), count: 2, optional: true }];
for (const n of [32, 36]) BABAYLAN_SET_ONE_SCRIPTS[id(n)]!.action!.targets = [{ prompt: 'Sanib up to 2 Units from Grave', pool: c => own(c).grave.filter(u => unit(c, u)), count: 2, optional: true }];
BABAYLAN_SET_ONE_SCRIPTS[id(34)]!.action!.targets = [{ prompt: 'Return up to two exhausted opposing Allies', pool: c => enemies(c).filter(u => inst(c.game, u).exhausted), count: 2, optional: true }];
BABAYLAN_SET_ONE_SCRIPTS[id(35)]!.action!.targets = [{ prompt: 'Choose a Unit to return to hand', pool: c => own(c).heart.filter(u => unit(c, u)) }];
for (const n of [10, 18, 20]) BABAYLAN_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!.perTurn = 1;
BABAYLAN_SET_ONE_SCRIPTS[id(17)]!.abilities![0]!.perTurn = 1;
BABAYLAN_SET_ONE_SCRIPTS[id(17)]!.abilities![0]!.useScope = 'name';

BABAYLAN_SET_ONE_SCRIPTS[id(45)]!.codex!.skill!.prepare = ventPayment(2);
BABAYLAN_SET_ONE_SCRIPTS[id(39)]!.codex!.skill!.prepare = async c => {
  const pool = [...own(c).heart];
  const chosen = await c.chooser.chooseCards(c.me, 'Unseen Passage: choose cards to Kalas', pool, pool.length,
    { from: 'heart', upTo: true, ventDrawPer: 5, confirm: 'Kalas selected cards', decline: 'Cancel' });
  if (!chosen.length || new Set(chosen).size !== chosen.length || chosen.some(u => !pool.includes(u))) return null;
  return planCards(c, chosen, 'vent');
};
BABAYLAN_SET_ONE_SCRIPTS[id(39)]!.codex!.skill!.prepare!.describe = c => ({ label: 'Kalas any number · draw 1 per 5 Kalas',
  missing: own(c).heart.length ? undefined : 'Need a card in Heart to Kalas' });

for (const [n, slot] of [[1, 0], [5, 0], [7, 0], [7, 1], [9, 0]]) BABAYLAN_SET_ONE_SCRIPTS[id(n!)]!.abilities![slot!]!.specialCalls = true;
for (const n of [29, 30]) BABAYLAN_SET_ONE_SCRIPTS[id(n)]!.action!.specialCalls = true;
BABAYLAN_SET_ONE_SCRIPTS[id(45)]!.codex!.skill!.specialCalls = true;
