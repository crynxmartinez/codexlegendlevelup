import { forceResponse, FORCE_RESPONSES } from './force-responses.js';
import { offerCost } from '../core/activation.js';
/** Maguindanao Set 1: reviewed workbook rules, implemented in native game terms. */
import proposals from '../../content/maguindanao-set-1-skills.json' with { type: 'json' };
import type { AbilityScript, CardScript, ScriptRegistry } from './types.js';
import {
  buffPower, chargeUnit, damageUnitByAbility, draw, isUnitCard, graveUnitCount, graveCardValue,
  orderDeckBottom, millTop, offerUnit, offerValue, offerTotal, specialCall, shuffleDeck,
  type EffectContext as C, type TriggerName,
} from '../core/effects.js';
import { currentPower, def, inst, log, moveCard, opponentOf, you } from '../core/state.js';
import { reevaluateState } from '../core/states.js';
import { commitCost, prepareOffer } from '../core/activation.js';
import { recordSkillUse, usedSkill } from '../core/skill-usage.js';

const entries = Object.entries(proposals);
const ids = entries.map(([id]) => id);
const id = (n: number) => ids[n - 1]!;
const own = (c: C) => you(c.game, c.me);
const allies = (c: C) => own(c).allies.filter((u): u is string => !!u);
const others = (c: C) => allies(c).filter(u => u !== c.source);
const units = (c: C) => [...allies(c), ...(own(c).persona ? [own(c).persona!] : [])];
const enemies = (c: C) => you(c.game, opponentOf(c.me)).allies.filter((u): u is string => !!u);
const tired = (c: C) => enemies(c).filter(u => inst(c.game, u).exhausted);
const sub = (c: C, u: string, s: string) => def(c.index, c.game, u).subtypes.includes(s);
const mag = (c: C, u: string) => isUnitCard(def(c.index, c.game, u)) &&
  (sub(c, u, 'Maguindanaon') || sub(c, u, 'Maguindanao'));
const l2 = (c: C, u: string) => mag(c, u) && def(c.index, c.game, u).level <= 2;
const l1 = (c: C, u: string) => mag(c, u) && def(c.index, c.game, u).level === 1;
const beastBird = (c: C, u: string) => isUnitCard(def(c.index, c.game, u)) && (sub(c, u, 'Beast') || sub(c, u, 'Bird'));
const smallBeastBird = (c: C, u: string) => beastBird(c, u) && def(c.index, c.game, u).level <= 2;
const force = (c: C, u: string) => def(c.index, c.game, u).type === 'Force';
const state = (c: C) => { reevaluateState(c.index, c.game, c.me); return own(c).releasedState === 'Garahana'; };
const hasOffer = (c: C, n = 1, pool = others(c)) => offerTotal(c.index, c.game, [...pool].sort((a, b) => offerValue(c.index, c.game, a, false) - offerValue(c.index, c.game, b, false)), true) >= n;
const selfEvent = (c: C) => c.event?.unit === c.source;
const otherOffer = (c: C) => !!c.event?.unit && c.event.unit !== c.source && c.game.cards[c.event.unit]?.owner === c.me;
const pick = async (c: C, list: string[], prompt: string, player = c.me) => list.length ? (c.chooserFor?.(player) ?? c.chooser).chooseTarget(player, prompt, list) : null;

async function settle(c: C) { await c.settle?.(); reevaluateState(c.index, c.game, c.me); }
async function payOffer(c: C, n = 1, pool = others(c)): Promise<string[]> {
  // Controller activations already paid atomically before the response window.
  // Direct effect/replacement callers still perform their real movement here.
  if (c.activation) return c.activation.offered;
  const plan = await prepareOffer(c, n, pool);
  if (!plan) return [];
  const receipt = commitCost(c, plan);
  if (!receipt) return [];
  const selected = receipt.offered;
  await settle(c);
  return selected;
}
async function discard(c: C) {
  const u = await pick(c, own(c).hand, 'Choose a card to discard');
  if (u) moveCard(c.game, u, 'grave');
  reevaluateState(c.index, c.game, c.me);
  return u;
}
async function filter(c: C) { await draw(c, 1); return discard(c); }
async function buff(c: C, amount: number, pool = units(c)) {
  const u = await pick(c, pool, `Choose a unit for Power +${amount}`);
  if (u) buffPower(c, u, amount);
}
async function charge(c: C, pool = allies(c), amount = 0) {
  const u = await pick(c, pool, 'Choose an Ally to charge');
  if (u) { chargeUnit(c, u); if (amount) buffPower(c, u, amount); }
}
async function damage(c: C, pool = enemies(c), player = c.me) {
  const u = await pick(c, pool, 'Choose an Ally to damage', player);
  if (u) { damageUnitByAbility(c, u); await settle(c); }
}
async function exhaust(c: C, count = 1) {
  const pool = enemies(c).filter(u => !inst(c.game, u).exhausted);
  const picks = await c.chooser.chooseCards(c.me, `Exhaust up to ${count} opposing Allies`, pool, Math.min(count, pool.length), { upTo: true });
  for (const u of picks) inst(c.game, u).exhausted = true;
}
function bottom(c: C, u: string) {
  moveCard(c.game, u, 'deck');
  own(c).deck.shift(); own(c).deck.push(u);
}
async function orderBottom(c: C, cards: string[]) {
  await orderDeckBottom(c, cards);
}
async function look(c: C, n: number, predicate: (c: C, u: string) => boolean) {
  const top = own(c).deck.slice(0, n);
  await c.chooser.revealCards(c.me, top, `Look at the top ${n} cards`);
  const u = await pick(c, top.filter(u => predicate(c, u)), 'You may reveal one card and add it to your hand');
  if (u) {
    const opponent = opponentOf(c.me);
    await (c.chooserFor?.(opponent) ?? c.chooser).revealCards(opponent, [u], 'Revealed card', 'This card goes to the other player’s hand.');
    log(c.game, `${def(c.index, c.game, u).name} was revealed and added to hand.`, [u]);
    moveCard(c.game, u, 'hand');
  }
  await orderBottom(c, top.filter(x => x !== u));
}
async function call(c: C, pool: string[], temporary = false, exhausted = false, openOnly = false, prompt = 'Choose a unit to special call') {
  const u = await pick(c, pool, prompt);
  if (!u) return null;
  const fromDeck = inst(c.game, u).zone === 'deck';
  if (!await specialCall(c, u, { allowOverwrite: !openOnly })) return null;
  inst(c.game, u).exhausted = exhausted;
  if (temporary) inst(c.game, u).temporaryOffer = { turn: c.game.turnNumber, entry: inst(c.game, u).fieldEntry ?? 0 };
  if (fromDeck) shuffleDeck(c.game, c.me);
  await settle(c);
  return u;
}

export const MAGUINDANAO_SET_ONE_SCRIPTS: ScriptRegistry = {};
function register(n: number, script: Omit<CardScript, 'id'>) {
  MAGUINDANAO_SET_ONE_SCRIPTS[id(n)] = { id: id(n), ...script };
}
function ability(n: number, line: number, run: (c: C) => Promise<void>, options: Partial<AbilityScript> = {}): AbilityScript {
  const text = entries[n - 1]![1].skill.split('\n')[line]!;
  const scope: AbilityScript['scope'] = text.includes('[Persona]') ? ['Persona'] : text.includes('[Grave]') ? ['Grave'] : ['Ally'];
  return { text, scope, run, ...options };
}
function persona(n: number, first: (c: C) => Promise<void>, second: (c: C) => Promise<void>, a: Partial<AbilityScript> = {}, b: Partial<AbilityScript> = {}) {
  register(n, { abilities: [ability(n, 0, first, { perTurn: 1, ...a }), ability(n, 1, second, { perTurn: 1, requiresState: 'Garahana', ...b })] });
}
function unit(n: number, run: (c: C) => Promise<void>, options: Partial<AbilityScript> = {}, second?: AbilityScript) {
  register(n, { abilities: [ability(n, 0, run, options), ...(second ? [second] : [])] });
}
const attack = { trigger: 'attack' as const, canRun: (c: C) => selfEvent(c) && hasOffer(c) };
const after = { trigger: 'attackResolved' as const, canRun: (c: C) => selfEvent(c) && hasOffer(c, 2) };
const oath = { trigger: 'unitOffered' as const, canRun: selfEvent };
const placed = { trigger: 'placed' as const, canRun: selfEvent };
const passive = { passive: true, canRun: () => false };

persona(1, async c => { await buff(c, 3000); }, async c => {
  buffPower(c, c.source, 1000, 'permanent');
}, { trigger: 'unitOffered', canRun: otherOffer }, { trigger: 'barrierBroken', perTurn: undefined, automatic: true });
persona(2, async c => {
  if ((await payOffer(c)).length) await call(c, own(c).grave.filter(u => l1(c, u)));
}, async c => { await draw(c, 1); buffPower(c, c.source, 2000 * own(c).unitsOfferedThisTurn); },
{ canRun: c => hasOffer(c) && (own(c).grave.some(u => l1(c, u)) || allies(c).some(u => l1(c, u))) },
{ });
persona(3, async c => {
  if (!(await payOffer(c)).length) return;
  const top = own(c).deck.slice(0, 3);
  if (!top.length) return;
  const selected = await c.chooser.chooseCards(c.me, 'Arrange the top cards: 1 is the next card you will check. Then press OK.', top, top.length, { ordered: true, confirm: 'OK' });
  const ordered = [...new Set(selected.filter(u => top.includes(u))), ...top.filter(u => !selected.includes(u))];
  own(c).deck.splice(0, top.length, ...ordered);
}, async c => { await draw(c, 1); await charge(c); },
{ ...attack, }, { trigger: 'forceResolved', canRun: c => c.event?.checkKind === 'attack' });
persona(4, async c => {
  const pool = others(c).filter(u => beastBird(c, u));
  const u = await pick(c, pool, 'Offer a Beast or Bird Ally');
  if (!u) return;
  const power = currentPower(c.index, c.game, u);
  offerUnit(c, u); inst(c.game, c.source).omakaOffered = u; inst(c.game, c.source).omakaTurn = c.game.turnNumber;
  await settle(c); buffPower(c, c.source, power, 'endOfAttack');
}, async c => {
  const u = inst(c.game, c.source).omakaOffered;
  if (u && inst(c.game, u).zone === 'grave') await call(c, [u]);
}, { trigger: 'attack', canRun: c => selfEvent(c) && others(c).some(u => beastBird(c, u)) },
{ trigger: 'attackResolved', canRun: c => selfEvent(c) && inst(c.game, c.source).omakaTurn === c.game.turnNumber && !!inst(c.game, c.source).omakaOffered && c.game.cards[inst(c.game, c.source).omakaOffered!]?.zone === 'grave' });
persona(5, async c => {
  if ((await payOffer(c, 2)).length) buffPower(c, c.source, own(c).barriers.length <= 2 ? 10000 : 5000);
}, async c => { if ((await payOffer(c, 3)).length) { chargeUnit(c, c.source); buffPower(c, c.source, 5000); } },
{ canRun: c => hasOffer(c, 2) }, { trigger: 'attackResolved', canRun: c => selfEvent(c) && hasOffer(c, 3) });
persona(6, async c => {
  if ((await payOffer(c)).length) { await damage(c); buffPower(c, c.source, 5000, 'endOfAttack'); }
}, async c => { if ((await payOffer(c)).length) await damage(c); },
{ ...attack, canRun: c => selfEvent(c) && hasOffer(c) && enemies(c).length > 0 },
{ trigger: 'attackResolved', canRun: c => selfEvent(c) && hasOffer(c) && enemies(c).length > 0 });
persona(7, async c => {
  if ((await payOffer(c, 2)).length) inst(c.game, c.source).firstAttackExtraCheckTurn = c.game.turnNumber;
}, async c => {
  if ((await payOffer(c, 2)).length) { chargeUnit(c, c.source); inst(c.game, c.source).skipCheckTurn = c.game.turnNumber; }
}, { canRun: c => hasOffer(c, 2) && inst(c.game, c.source).firstAttackTakenTurn !== c.game.turnNumber }, after);
persona(8, async c => {
  await call(c, own(c).deck.filter(u => l2(c, u)));
}, async c => {
  if (!(await payOffer(c, 3)).length) return;
  const pool = own(c).deck.filter(u => l2(c, u));
  const chosen = [...new Set(await c.chooser.chooseCards(c.me, 'Choose two Level 2 or lower Units to special call', pool, Math.min(2, pool.length)))].filter(u => pool.includes(u)).slice(0, 2);
  for (const u of chosen) {
    if (inst(c.game, u).zone === 'deck' && await specialCall(c, u, { allowOverwrite: true })) {
      chargeUnit(c, u); buffPower(c, u, 5000); await settle(c);
    }
  }
  shuffleDeck(c.game, c.me);
}, { canRun: c => own(c).deck.some(u => l2(c, u)) },
{ trigger: 'attackResolved', canRun: c => selfEvent(c) && hasOffer(c, 3) && own(c).deck.some(u => l2(c, u)) });
persona(9, async c => {
  const u = c.activation?.offered[0] ?? await pick(c, others(c), 'Offer an Ally and add its Power for this battle');
  if (!u) return;
  const power = c.activation?.powers[u] ?? currentPower(c.index, c.game, u);
  if (!c.activation) offerUnit(c, u);
  await settle(c); buffPower(c, c.source, power, 'endOfAttack');
}, async () => {}, attack, { ...passive, perTurn: undefined });
persona(10, async c => {
  if (!(await payOffer(c)).length) return;
  const u = await call(c, own(c).deck.filter(u => mag(c, u)));
  if (u) { buffPower(c, c.source, 3000); buffPower(c, u, 3000); }
}, async c => {
  if (!(await payOffer(c, 3)).length) return;
  const pool = enemies(c);
  const chosen = [...new Set(await c.chooser.chooseCards(c.me, 'Choose up to two opposing Allies to damage', pool, Math.min(2, pool.length), { upTo: true }))].filter(u => pool.includes(u)).slice(0, 2);
  for (const u of chosen) { if (inst(c.game, u).zone === 'ally') { damageUnitByAbility(c, u); await settle(c); } }
  buffPower(c, c.source, 10000, 'endOfAttack');
  inst(c.game, c.source).sulaymanHitDrawTurn = c.game.turnNumber;
}, { canRun: c => hasOffer(c) && own(c).deck.some(u => mag(c, u)) }, { trigger: 'attack', canRun: c => selfEvent(c) && hasOffer(c, 3) });
MAGUINDANAO_SET_ONE_SCRIPTS[id(10)]!.abilities!.push({
  text: 'When this attack hits, draw 1 card.', scope: ['Persona'], trigger: 'attackHit',
  canRun: c => selfEvent(c) && inst(c.game, c.source).sulaymanHitDrawTurn === c.game.turnNumber,
  run: async c => { inst(c.game, c.source).sulaymanHitDrawTurn = undefined; await draw(c, 1); },
});

/** Base bonus remains event-based; the optional follow-up has its own limit. */
function lastOath(n: number, label: string, followup: (c: C) => Promise<void>, available: (c: C) => boolean = () => true) {
  unit(n, async c => {
    await buff(c, 3000, allies(c));
    await c.present?.();
    const scope = n === 20 || n === 41 ? 'name' : 'copy';
    if (!usedSkill(c.game, c.me, c.source, 'last-oath-follow-up', scope) && available(c) && await c.chooser.confirm(c.me, `Use the follow-up to ${label}?`)) {
      recordSkillUse(c.game, c.me, c.source, 'last-oath-follow-up', scope);
      await followup(c);
    }
  }, oath);
}
unit(11, async c => { await look(c, 5, (c, u) => sub(c, u, 'Beast') || sub(c, u, 'Bird')); }, oath);
// Mandatory expiry is handled by finishSetOneTurn, not an optional green prompt.
unit(12, async c => { buffPower(c, c.source, 5000); }, { ...placed, canRun: c => selfEvent(c) && own(c).unitsOfferedThisTurn > 0 }, ability(12, 1, async () => {}, passive));
unit(13, async c => { if ((await payOffer(c)).length && inst(c.game, c.source).zone === 'ally') { chargeUnit(c, c.source); buffPower(c, c.source, 3000); } },
{ trigger: 'attackResolved', perTurn: 1, canRun: c => selfEvent(c) && hasOffer(c) });
unit(14, async c => { const sent = millTop(c, 3); buffPower(c, c.source, sent.filter(u => isUnitCard(def(c.index, c.game, u))).length * 3000); }, { ...placed, perTurn: 1 });
unit(15, async c => { await buff(c, 5000); }, { trigger: 'unitOffered', requiresState: 'Garahana', canRun: otherOffer });
unit(16, async c => { if (own(c).persona) buffPower(c, own(c).persona!, 2000, 'endOfOpponentTurn'); }, { ...oath, canRun: c => selfEvent(c) && !!own(c).persona });
unit(17, async c => {
  if (await specialCall(c, c.source, { allowOverwrite: true })) {
    // If called during the opponent's turn, it is due at the end of OUR next turn.
    inst(c.game, c.source).temporaryOffer = { turn: c.game.turnNumber + (c.game.turnPlayer === c.me ? 0 : 1), entry: inst(c.game, c.source).fieldEntry ?? 0 };
    await settle(c);
  }
}, { scope: ['Grave'], trigger: 'unitOffered', requiresState: 'Garahana', latchStateOnTrigger: true, perTurn: 1,
  canRun: c => inst(c.game, c.source).zone === 'grave' && !!c.event?.firstOfferThisTurn });
unit(18, async c => { await damage(c, tired(c)); }, { trigger: 'attackResolved', perTurn: 1, canRun: c => selfEvent(c) && own(c).unitsOfferedThisTurn > 0 && tired(c).length > 0 }, ability(18, 1, async () => {}, passive));
lastOath(19, 'draw 1 card, then discard 1', async c => { await filter(c); }, c => own(c).deck.length > 0);
lastOath(20, 'search your deck and special call a Level 1 Maguindanaon Unit', async c => { await call(c, own(c).deck.filter(u => l1(c, u))); }, c => own(c).deck.some(u => l1(c, u)));
lastOath(21, 'look at the top 5 cards for a Maguindanaon Unit', async c => { await look(c, 5, mag); }, c => own(c).deck.length > 0);
unit(22, async () => {}, { ...passive, scope: ['Grave'] });
lastOath(23, 'send the top card of your deck to the Grave', async c => { millTop(c, 1); await settle(c); }, c => own(c).deck.length > 0);
lastOath(26, 'give another Unit Power +3000', async c => { await buff(c, 3000, units(c).filter(u => u !== c.source)); }, c => units(c).some(u => u !== c.source));
lastOath(39, 'damage one opposing Ally', async c => { await damage(c); }, c => enemies(c).length > 0);
persona(40, async c => {
  if (!(await payOffer(c, 2)).length) return;
  const top = own(c).deck.slice(0, 7);
  await c.chooser.revealCards(c.me, top, 'Look at the top 7 cards');
  const pool = top.filter(u => beastBird(c, u));
  const chosen = [...new Set(await c.chooser.chooseCards(c.me, 'Choose up to two Beasts or Birds to special call', pool, Math.min(2, pool.length), { upTo: true }))].filter(u => pool.includes(u)).slice(0, 2);
  for (const u of chosen) {
    if (inst(c.game, u).zone === 'deck' && await specialCall(c, u, { allowOverwrite: true })) { chargeUnit(c, u); await settle(c); }
  }
  await orderBottom(c, top.filter(u => inst(c.game, u).zone === 'deck'));
}, async c => {
  if (!(await payOffer(c, 3)).length) return;
  const u = await pick(c, own(c).hand.filter(u => def(c.index, c.game, u).id === id(40)), 'Choose Gurayn from your hand to Personify, charged');
  if (!u) return;
  const outgoing = own(c).persona;
  if (outgoing) moveCard(c.game, outgoing, 'heart');
  moveCard(c.game, u, 'persona'); chargeUnit(c, u); await settle(c);
}, { trigger: 'attack', canRun: c => selfEvent(c) && hasOffer(c, 2) && own(c).deck.length > 0 },
{ trigger: 'attackResolved', canRun: c => selfEvent(c) && hasOffer(c, 3) && own(c).hand.some(u => def(c.index, c.game, u).id === id(40)) });

lastOath(41, 'special call another Datu Karim from your deck', async c => { await call(c, own(c).deck.filter(u => def(c.index, c.game, u).id === id(41))); }, c => own(c).deck.some(u => def(c.index, c.game, u).id === id(41)));

for (const [i, n] of [24, 25, 27, 28].entries()) register(n, { forceModes: [
  { label: 'One unit gets Power +5000 until end of turn', run: async c => { await buff(c, 5000); } },
  forceResponse(FORCE_RESPONSES[i]!),
] });

function action(n: number, _oldCost: number, run: (c: C) => Promise<void>, canRun?: (c: C) => boolean) { register(n, { action: { run, canRun } }); }
action(29, 2, async c => {
  for (const s of ['Beast', 'Bird']) await call(c, own(c).grave.filter(u => smallBeastBird(c, u) && sub(c, u, s)), true, false, false, `Choose a ${s} to special call`);
});
action(30, 1, async c => { await call(c, own(c).deck.filter(u => l1(c, u)), true); }, c => own(c).deck.some(u => l1(c, u)));
action(31, 2, async c => {
  if (!(await payOffer(c)).length) return;
  const previously = tired(c);
  const pool = enemies(c);
  const chosen = await c.chooser.chooseCards(c.me, 'Choose up to two opposing Allies', pool, Math.min(2, pool.length), { upTo: true });
  for (const u of chosen) inst(c.game, u).exhausted = true;
  if (state(c)) await damage(c, chosen.filter(u => previously.includes(u)));
}, c => hasOffer(c));
action(32, 2, async c => {
  const u = await pick(c, allies(c).filter(u => sub(c, u, 'Beast')), 'Choose a Beast Ally for one additional attack');
  if (u) inst(c.game, u).grantedRepeat = { turn: c.game.turnNumber, entry: inst(c.game, u).fieldEntry ?? 0 };
}, c => allies(c).some(u => sub(c, u, 'Beast')));
action(33, 1, async c => { await draw(c, 2); await discard(c); if (state(c) && own(c).persona) buffPower(c, own(c).persona!, 3000); }, c => own(c).unitsOfferedThisTurn >= 3);
action(34, 2, async c => {
  if (own(c).unitsOfferedThisTurn >= 3 && await c.chooser.chooseMode(c.me, 'Choose the effect', ['Exhaust one, then damage one exhausted Ally', 'Exhaust up to two Allies']) === 0) { await exhaust(c); await damage(c, tired(c)); }
  else await exhaust(c, 2);
});
action(35, 0, async c => {
  if (!(await payOffer(c)).length) return;
  if (enemies(c).length) await damage(c, enemies(c), opponentOf(c.me)); else await draw(c, 1);
}, c => hasOffer(c));
action(36, 2, async c => {
  for (const n of [19, 20]) await call(c, [...own(c).deck, ...own(c).grave].filter(u => def(c.index, c.game, u).id === id(n)), true);
});
action(37, 2, async c => { if (own(c).persona) inst(c.game, own(c).persona!).sevenHeadsTurn = c.game.turnNumber; });
action(38, 1, async c => {
  const pool = own(c).grave.filter(u => l1(c, u));
  const selected = await c.chooser.chooseCards(c.me, 'Choose up to two Level 1 Maguindanaon units', pool, Math.min(2, pool.length), { upTo: true });
  const u = await pick(c, selected, 'Choose the card to return to hand');
  if (u) moveCard(c.game, u, 'hand');
  for (const other of selected.filter(x => x !== u)) bottom(c, other);
  await settle(c);
});

/**
 * The ten Codex, as ten entrances to the Offer engine.
 *
 * Maguindanao pays with its own board: Offering a Unit puts it in the Grave,
 * Garahana releases while five or more Maguindanaon Units are down there, and
 * the reward comes back out. Every Codex here either finds something to Offer,
 * makes an Offer pay twice, or turns the Grave into Power.
 *
 * Each is tied to a different moment or a different kind of trouble, and one
 * switch a turn is all you get — so the question is which moment to spend it
 * on. The four that key off the opponent being ahead are eligible only while
 * you are behind, so they cost nothing when you are winning.
 *
 * Printed text lives in content/maguindanao-set-1-skills.json, three lines per
 * card: the window, the State, the skill. The factory reads the third.
 */

const foeOf = (c: C) => you(c.game, opponentOf(c.me));
const myBodies = (c: C) => units(c).length;
const foeBodies = (c: C) => foeOf(c).allies.filter(Boolean).length
  + (foeOf(c).persona ? 1 : 0);
const behindUnits = (c: C) => myBodies(c) < foeBodies(c);
const behindHand = (c: C) => own(c).hand.length < foeOf(c).hand.length;
const behindBarriers = (c: C) => own(c).barriers.length < foeOf(c).barriers.length;
const lowBarriers = (c: C) => own(c).barriers.length <= 2;
const theirTurn = (c: C) => c.game.turnPlayer !== c.me;
const myTurn = (c: C) => c.game.turnPlayer === c.me;
const brokenBarriers = (c: C) => Math.max(0, 5 - own(c).barriers.length);
const anyUnit = (c: C, u: string) => isUnitCard(def(c.index, c.game, u));

/**
 * An auto-switching Codex.
 *
 * `on` is the window it may arrive in; `trigger` is what its skill answers.
 * They are usually different — Restored Magindanao arrives when the Persona is
 * attacked and answers the Barrier check that follows.
 */
function codex(
  n: number, on: TriggerName, trigger: TriggerName | undefined,
  run: (c: C) => Promise<void>,
  canRun?: (c: C) => boolean, when?: (c: C) => boolean, once = true,
) {
  register(n, {
    codex: {
      autoSwitchOn: on,
      autoSwitchWhen: when,
      skill: {
        type: trigger ? 'auto' : 'action', trigger, maxUses: once ? 1 : undefined,
        text: entries[n - 1]![1].skill.split('\n')[2]!,
        canRun: c => (!once
          || inst(c.game, c.source).setOneUses?.codex !== c.game.turnNumber)
          && (!canRun || canRun(c)),
        run: async c => {
          if (once) (inst(c.game, c.source).setOneUses ??= {}).codex = c.game.turnNumber;
          await run(c);
        },
      },
    },
  });
}

/** A Codex that stands in for a step of the turn rather than reacting to one. */
function codexReplaces(
  n: number, on: TriggerName, replaces: 'draw' | 'personify',
  run: (c: C) => Promise<void>,
) {
  register(n, {
    codex: {
      autoSwitchOn: on,
      skill: {
        type: 'replacement', replaces,
        text: entries[n - 1]![1].skill.split('\n')[2]!,
        run,
      },
    },
  });
}

/* ---- 42 · City Beyond the Sunset, Mantapuli ----------------------------- */
// Pay into the Grave first. Only a released Garahana earns the draw;
// the payment itself can supply the fifth qualifying Unit.
codexReplaces(42, 'startOfTurn', 'draw', async c => {
  const canOffer = others(c).length > 0;
  const offering = canOffer && await c.chooser.confirm(
    c.me, 'Mantapuli: Offer an Ally to pay? (Decline to send the top card instead)');
  if (offering) {
    const paid = await payOffer(c, 1);
    // Declining the Offer prompt still has to pay something, or the draw
    // would be free.
    if (!paid.length) millTop(c, 1);
  } else {
    millTop(c, 1);
  }
  reevaluateState(c.index, c.game, c.me);
  await c.present?.();
  if (state(c)) await draw(c, 1);
});

/* ---- 46 · Peak of Seven Sights, Mount Gurayn ---------------------------- */
// Seven sights, five of them spent on your own deck. The Persona you never
// drew is still down there.
codexReplaces(46, 'personify', 'personify', async c => {
  const seen = own(c).deck.slice(0, 5);
  if (!seen.length) return;
  await c.chooser.revealCards(c.me, seen, 'Peak of Seven Sights', 'Top 5 of your deck');
  const current = own(c).persona;
  const eligible = seen.filter(u => anyUnit(c, u)
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
  // Everything not taken goes under — all five if you took none.
  for (const u of seen.filter(x => x !== chosen)) {
    const d = own(c).deck;
    if (d.includes(u)) {
      d.splice(d.indexOf(u), 1);
      d.push(u);
    }
  }
  reevaluateState(c.index, c.game, c.me);
});

/* ---- 43 · Forest of Broken Branches, Mount Matutun ---------------------- */
// Tarabusaw's mountain. A branch comes down every turn, and when the branch
// was a Unit it is worth Power — filling the Grave and hitting harder are the
// same act.
codex(43, 'startOfMain', 'startOfMain', async c => {
  const sent = millTop(c, 1);
  await c.present?.();
  const u = sent[0];
  if (u && anyUnit(c, u)) await buff(c, 5000);
  reevaluateState(c.index, c.game, c.me);
}, c => myTurn(c) && own(c).deck.length > 0);

/* ---- 44 · Throne of the Sun-Shadow, Mount Bita -------------------------- */
// The throne is paid for. Every Offer this turn is 3000 more on the swing, so
// a turn spent feeding the Grave arrives all at once.
codex(44, 'personaAttack', 'personaAttack', async c => {
  const n = own(c).unitsOfferedThisTurn;
  if (n > 0 && own(c).persona) buffPower(c, own(c).persona!, 3000 * n);
}, c => c.event?.unit === own(c).persona && own(c).unitsOfferedThisTurn > 0);

/* ---- 50 · The Sea-Withdrawn Lowlands, Restored Magindanao --------------- */
// The land comes back. A check that found nothing becomes a body from the
// deck, and the discard is the sea taking something in return.
codex(50, 'personaAttacked', 'barrierBroken', async c => {
  await call(c, own(c).deck.filter(u => anyUnit(c, u)));
  await discard(c);
}, c => !!c.event?.revealed && !force(c, c.event.revealed)
  && own(c).deck.some(u => anyUnit(c, u)));

/* ---- 49 · Cave Beneath the Earth, the Last Refuge ----------------------- */
// The further in you are driven, the harder you are to move. It counts the
// Barriers already gone, so it is strongest when there is least left.
codex(49, 'barrierBroken', 'barrierBroken', async c => {
  const n = brokenBarriers(c);
  if (n > 0 && own(c).persona) buffPower(c, own(c).persona!, 1000 * n);
}, c => brokenBarriers(c) > 0, theirTurn);

/* ---- 45 · The Rattan Haunt, Mount Kabalalan ---------------------------- */
// Kurita's marsh: what goes in pulls something else out. One Offer becomes a
// second body, which is the trade you want when the shields are nearly gone.
codex(45, 'startOfTurn', 'unitOffered', async c => {
  const offered = c.event?.unit;
  await call(c, own(c).deck.filter(u => u !== offered && anyUnit(c, u)));
}, c => myTurn(c) && own(c).deck.some(u => u !== c.event?.unit && anyUnit(c, u)),
  lowBarriers);

/* ---- 48 · Reach of the Ridge Giants, Illana Bay ------------------------- */
// The controller opens this opportunity before payment, outside the trigger queue.
register(48, { codex: {
  autoSwitchOn: 'startOfTurn', autoSwitchWhen: behindUnits,
  skill: {
    type: 'auto', trigger: [], maxUses: 1,
    text: entries[47]![1].skill.split('\n')[2]!,
    run: async c => {
      if (own(c).firstOfferTurn !== c.game.turnNumber) own(c).illanaBayArmedTurn = c.game.turnNumber;
    },
  },
} });

/* ---- 51 · Shore of the Broken Hills, Cape Timbalangan ------------------- */
// What the tide brings in. Two cards for one, the moment it arrives, for the
// hand that is behind.
codex(51, 'startOfTurn', 'codexPlayed', async c => {
  await draw(c, 2);
  await discard(c);
}, undefined, behindHand);

/* ---- 47 · Mirror of the Giant War, Lake Lanao --------------------------- */
// The lake that remembers the war. Your own State releasing is reflected
// across the whole board at once.
codex(47, 'startOfTurn', 'stateReleased', async c => {
  for (const u of units(c)) buffPower(c, u, 1000);
}, undefined, behindBarriers);

/** Action-granted effects remain data, so AI simulations can clone the game. */
export function prepareSetOneTrigger(c: C) {
  if (!c.event?.unit || inst(c.game, c.event.unit).owner !== c.me) return;
  const card = inst(c.game, c.source);
  const matches = (card.defId === id(42) && c.event.name === 'unitOffered' && l1(c, c.event.unit)) ||
    (card.defId === id(45) && c.event.name === 'offerResolved' && c.game.phase === 'main' && c.game.turnPlayer === c.me);
  if (matches && card.setOneUses?.firstOffer !== c.game.turnNumber) {
    (card.setOneUses ??= {}).firstOffer = c.game.turnNumber;
    c.event.firstOfferCodex = c.source;
  }
}

export async function setOneAttack(c: C) {
  const card = inst(c.game, c.source);
  if (card.zone === 'persona') {
    if (card.firstAttackTakenTurn !== c.game.turnNumber && card.firstAttackExtraCheckTurn === c.game.turnNumber && c.game.activeBattle) {
      c.game.activeBattle.extraChecks = (c.game.activeBattle.extraChecks ?? 0) + 1;
    }
    card.firstAttackTakenTurn = c.game.turnNumber;
    card.firstAttackExtraCheckTurn = undefined;
  }
  if (card.sevenHeadsTurn === c.game.turnNumber && card.zone === 'persona') {
    buffPower(c, c.source, Math.min(10000, graveUnitCount(c) * 1000), 'endOfAttack');
  }
}
/** Granted after-attack skills enter the same owned trigger queue as printed skills. */
export function grantedAfterAttack(c: C): AbilityScript[] {
  const card = inst(c.game, c.source);
  const result: AbilityScript[] = [];
  if (card.grantedRepeat?.turn === c.game.turnNumber && card.grantedRepeat.entry === card.fieldEntry && card.zone === 'ally') {
    result.push({ id: 'granted:until-tarabusaw', text: '[Cost: Offer another Ally] Charge this Beast; it gets Power +3000 until end of turn.',
      scope: ['Ally'], perTurn: 1, prepare: offerCost(1), canRun: ctx => hasOffer(ctx),
      run: async ctx => { chargeUnit(ctx, ctx.source); buffPower(ctx, ctx.source, 3000); } });
  }
  if (card.sevenHeadsTurn === c.game.turnNumber && card.zone === 'persona' && own(c).grave.reduce((n, u) => n + (mag(c, u) ? graveCardValue(c.index, c.game, u) : 0), 0) >= 7) {
    result.push({ id: 'granted:seven-heads', text: 'Damage an exhausted opposing Ally.', scope: ['Persona'], perTurn: 1,
      targets: [{ prompt: 'Choose an Ally to damage', pool: tired }],
      canRun: ctx => tired(ctx).length > 0,
      run: async ctx => { await damage(ctx, tired(ctx)); } });
  }
  return result;
}
export async function setOneAfterAttack(c: C) {
  const card = inst(c.game, c.source);
  card.sulaymanHitDrawTurn = undefined;
  card.grantedRepeat = undefined; // The first attack consumes the permission, even if declined.
}
export function hasSetOneTurnExpiry(c: C): boolean {
  return allies(c).some(u => (!def(c.index, c.game, u).tutorial && [id(12), id(18)].includes(def(c.index, c.game, u).id)) ||
    (inst(c.game, u).temporaryOffer?.turn === c.game.turnNumber && inst(c.game, u).temporaryOffer?.entry === inst(c.game, u).fieldEntry));
}
export async function finishSetOneTurn(c: C) {
  // Expire the current batch atomically. The controller drains its triggers,
  // then checks again for units newly called with a same-turn expiry.
  const due = allies(c).filter(u => (!def(c.index, c.game, u).tutorial && [id(12), id(18)].includes(def(c.index, c.game, u).id)) ||
    (inst(c.game, u).temporaryOffer?.turn === c.game.turnNumber && inst(c.game, u).temporaryOffer?.entry === inst(c.game, u).fieldEntry));
  for (const u of due) offerUnit(c, u);
  await settle(c);
}

// Non-Energy activation costs. These prepare the full payment before responses;
// run() receives the immutable receipt and cannot pay the same Offer again.
for (const [n, slot, count] of [
  [2, 0, 1], [3, 0, 1], [5, 0, 2], [5, 1, 3], [6, 0, 1], [6, 1, 1],
  [7, 0, 2], [7, 1, 2], [8, 1, 3], [9, 0, 1], [10, 0, 1], [10, 1, 3],
  [13, 0, 1], [40, 0, 2], [40, 1, 3],
] as const) {
  MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.abilities![slot]!.prepare = offerCost(count);
}
for (const n of [31, 35]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.action!.prepare = offerCost(1);
for (const n of [14, 16]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!.perTurn = 1;

// Public targets are declared before responses. Searches and newly created cards
// remain resolution choices; optional Last Oath follow-ups stay in their clause.
MAGUINDANAO_SET_ONE_SCRIPTS[id(1)]!.abilities![0]!.targets = [{ prompt: 'Choose a unit for Power +3000', pool: units }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(2)]!.abilities![0]!.targets = [{ prompt: 'Choose a unit to special call', pool: c => own(c).grave.filter(u => l1(c, u)) }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(3)]!.abilities![1]!.targets = [{ prompt: 'Choose an Ally to charge', pool: allies }];
for (const slot of [0, 1]) MAGUINDANAO_SET_ONE_SCRIPTS[id(6)]!.abilities![slot]!.targets = [{ prompt: 'Choose an Ally to damage', pool: enemies }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(10)]!.abilities![1]!.targets = [{ prompt: 'Choose up to two opposing Allies to damage', pool: enemies, count: 2, optional: true }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(15)]!.abilities![0]!.targets = [{ prompt: 'Choose a unit for Power +5000', pool: units }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(18)]!.abilities![0]!.targets = [{ prompt: 'Choose an Ally to damage', pool: tired }];
for (const n of [19, 20, 21, 23, 26, 39, 41]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!.targets = [{ prompt: 'Choose a unit for Power +3000', pool: allies }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(31)]!.action!.targets = [{ prompt: 'Choose up to two opposing Allies', pool: enemies, count: 2, optional: true }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(32)]!.action!.targets = [{ prompt: 'Choose a Beast Ally for one additional attack', pool: c => allies(c).filter(u => sub(c, u, 'Beast')) }];
MAGUINDANAO_SET_ONE_SCRIPTS[id(38)]!.action!.targets = [{ prompt: 'Choose up to two Level 1 Maguindanaon units', pool: c => own(c).grave.filter(u => l1(c, u)), count: 2, optional: true }];

MAGUINDANAO_SET_ONE_SCRIPTS[id(29)]!.action!.targets = ['Beast', 'Bird'].map(s => ({ prompt: `Choose a ${s} to special call`, pool: (c: C) => own(c).grave.filter(u => smallBeastBird(c, u) && sub(c, u, s)), optional: true }));

// Short previews are evaluated from live public state, before any payment.
for (const [n, preview] of [
  [5, (c: C) => `This Unit gains +${own(c).barriers.length <= 2 ? '10,000' : '5,000'} Power until end of turn`],
  [7, () => 'One extra check on this Unit’s first attack this turn'],
  [10, () => 'Special call a Maguindanaon; both Units gain +3,000 this turn'],
] as const) {
  const cost = MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!.prepare!;
  const describe = cost.describe!;
  cost.describe = c => ({ ...describe(c), effect: preview(c) });
}

for (const [n, slot] of [[2, 0], [4, 1], [8, 0], [8, 1], [10, 0], [17, 0], [20, 0], [40, 0], [41, 0]]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n!)]!.abilities![slot!]!.specialCalls = true;
for (const n of [29, 30, 36]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.action!.specialCalls = true;
for (const n of [45, 50]) MAGUINDANAO_SET_ONE_SCRIPTS[id(n)]!.codex!.skill!.specialCalls = true;
