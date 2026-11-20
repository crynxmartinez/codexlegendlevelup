import { forceResponse, FORCE_RESPONSES, forceResponsePrinted } from './force-responses.js';
import { cardPayment } from '../core/activation.js';
/** Agta Set 1: controlled top-deck calls, spent-ally recycling and Bayanihan. */
import catalogue from '../data/set-1.json' with { type: 'json' };
import type { AbilityScript, ScriptRegistry } from './types.js';
import { orderDeckTop, orderDeckBottom, buffPower, draw, specialCall, sipol, bayanihanOn, chargeUnit, damageUnitByAbility, registerSipolMode, type SipolMode, type EffectContext as C, type TriggerName } from '../core/effects.js';
import { currentPower, def, inst, moveCard, you, opponentOf } from '../core/state.js';
import { planCards } from '../core/activation.js';
import { reevaluateState } from '../core/states.js';
export const AGTA_SET_ONE_IDS = catalogue.filter(c=>c.deck==='Agta').map(c=>c.id);
const id=(n:number)=>AGTA_SET_ONE_IDS[n-1]!;
const ps=(c:C)=>you(c.game,c.me);
const allies=(c:C)=>ps(c).allies.filter((u):u is string=>!!u);
const units=(c:C)=>[...allies(c),...(ps(c).persona?[ps(c).persona!]:[])];
const enemies=(c:C)=>you(c.game,opponentOf(c.me)).allies.filter((u):u is string=>!!u);
const unit=(c:C,u:string)=>def(c.index,c.game,u).type==='Unit';
const ownTurn=(c:C)=>c.game.turnPlayer===c.me;
const self=(c:C)=>c.event?.unit===c.source;
const deckCall=(c:C)=>c.event?.special===true&&c.event.from==='deck';
const placedSelf=(c:C)=>self(c)&&deckCall(c);
const exhausted=(c:C)=>allies(c).filter(u=>inst(c.game,u).exhausted);
const open=(c:C)=>ps(c).allies.includes(null);
async function settle(c:C){await c.settle?.();reevaluateState(c.index,c.game,c.me);}
async function pick(c:C,pool:string[],prompt:string){if(!pool.length)return null;const u=await c.chooser.chooseTarget(c.me,prompt,pool);return u&&pool.includes(u)?u:null;}
function bottom(c:C,u:string){moveCard(c.game,u,'deck');const a=ps(c).deck;a.splice(a.indexOf(u),1);a.push(u);}
async function recycle(c:C,pool=exhausted(c)){const u=await pick(c,pool,'Return an Ally to the bottom of your deck');if(u){bottom(c,u);await settle(c);}return u;}
async function boost(c:C,n:number,pool=units(c)){const u=await pick(c,pool,`Choose a Unit for Power +${n}`);if(u)buffPower(c,u,n);}
async function filter(c:C){await draw(c,1);const u=await pick(c,[...ps(c).hand],'Discard a card');if(u)moveCard(c.game,u,'grave');}
async function scry(c:C){const u=ps(c).deck[0];if(!u)return;await c.chooser.revealCards(c.me,[u],'Look at the top card');if(await c.chooser.confirm(c.me,'Put it on the bottom?'))bottom(c,u);}
/** Snapshot all candidates. Resolve calls only after the unused cards are bottomed. */
async function callTop(c:C,n:number,count=1,power=0,predicate:(c:C,u:string)=>boolean=unit){
 const top=ps(c).deck.slice(0,n);if(!top.length)return [];
 await c.chooser.revealCards(c.me,top,`Look at the top ${n} cards`);
 const chosen:string[]=[];const capacity=ps(c).allies.filter(u=>!u).length;
 for(let i=0;i<Math.min(count,capacity);i++){const u=await pick(c,top.filter(u=>!chosen.includes(u)&&predicate(c,u)),'Choose a Unit to call to an open Ally Zone');if(!u)break;chosen.push(u);}
 const rest=top.filter(u=>!chosen.includes(u));
 await orderDeckBottom(c,rest);
 const called:string[]=[];
 for(const u of chosen){if(await specialCall(c,u,{allowOverwrite:false})){if(power)buffPower(c,u,power);called.push(u);}else bottom(c,u);}
 await settle(c);return called;
}
async function sip(c:C){await sipol(c);await settle(c);}
const rules:Record<string,{skill:string;role:string}>={};
export const AGTA_SET_ONE_SCRIPTS:ScriptRegistry={};
function add(n:number,role:string,abilities:AbilityScript[]){AGTA_SET_ONE_SCRIPTS[id(n)]={id:id(n),abilities};rules[id(n)]={role,skill:abilities.map(a=>a.text).join('\n')};}
function a(text:string,run:(c:C)=>Promise<void>,opts:Partial<AbilityScript>={}):AbilityScript{return{text,run,scope:['Ally'],perTurn:1,...opts};}
const persona={scope:['Persona'] as AbilityScript['scope']};
const placed={trigger:'placed' as const,canRun:placedSelf};
const attack={trigger:'attack' as const,canRun:self};
/**
 * Sumipat: look at the top card and decide whether it stays or goes under.
 *
 * Sipol's quieter sibling — Sipol calls a body out of the deck, Sumipat only
 * chooses what the deck offers next. `n` is how many cards you get to judge,
 * one at a time, and a card you keep is skipped rather than shown again: a
 * Sumipat 3 that re-asked about the same card twice would be a Sumipat 1 with
 * extra clicks.
 */
async function sumipat(c: C, n = 1) {
  let depth = 0;
  for (let i = 0; i < n; i++) {
    const u = ps(c).deck[depth];
    if (!u) break;
    await c.chooser.revealCards(c.me, [u], `Sumipat ${i + 1} of ${n}`, 'Top card of your deck');
    if (await c.chooser.confirm(c.me, 'Put it on the bottom?')) bottom(c, u);
    else depth++;
  }
}

/** Put a card on TOP of the deck, from wherever it is. */
function toTop(c: C, u: string) {
  moveCard(c.game, u, 'deck');
  const d = ps(c).deck;
  const at = d.indexOf(u);
  if (at >= 0) d.splice(at, 1);
  d.unshift(u);
}

/** Sipol, reporting which Unit actually landed in a Zone. */
async function sipolCalled(c: C): Promise<string | null> {
  const before = new Set(allies(c));
  await sip(c);
  return allies(c).find(u => !before.has(u)) ?? null;
}

add(1, 'Deck-shaping rescuer', [
  a('[green][Persona] At the start of your Main Phase, look at the top 3 cards of your deck and put them back on top in any order.[/green]',
    async c => {
      const top = ps(c).deck.slice(0, 3);
      if (!top.length) return;
      await orderDeckTop(c, top);
    },
    { ...persona, trigger: 'startOfMain', canRun: c => ownTurn(c) && ps(c).deck.length > 0 }),
  a('[green][Bayanihan][Persona] 1/Turn: When this Unit attacks, Sipol 1.[/green]',
    sip,
    { ...persona, ...attack, requiresState: 'Bayanihan',
      canRun: c => self(c) && ps(c).deck.length > 0 }),
]);

add(2, 'Full-field tyrant', [
  a('[blue][Persona] 1/Turn: Sipol 1, then this Unit gets Power equal to the Power of the Unit called, until end of turn.[/blue]',
    async c => {
      const called = await sipolCalled(c);
      // Only a Unit that actually reached a Zone pays. A Sipol that whiffed
      // bottomed the card and this Unit gets nothing for it.
      if (called) buffPower(c, c.source, currentPower(c.index, c.game, called));
    },
    { ...persona, canRun: c => ps(c).deck.length > 0 }),
  // The Bayanihan half is continuous and lives in passiveBonuses(): it has to
  // apply on attack, support and defence alike, and lapse the instant a Zone
  // empties. Printed here so the card still says it.
  a('[green][Bayanihan][Persona] During your turn, all of your Units get Power +2000.[/green]',
    async () => {}, { ...persona, passive: true, canRun: () => false }),
]);

add(3, 'Rebuild and ascend', [
  a('[green][Persona] 1/Turn: When this Unit attacks, draw 1, then this Unit gets Power +3000 until end of turn.[/green]',
    async c => { await draw(c, 1); buffPower(c, c.source, 3000); },
    { ...persona, ...attack, }),
  a('[green][Bayanihan][Ally] 1/Turn: If this Unit was specially called during a Battle Phase, after your Persona attacks, [Cost: Discard 2 cards] Personify into this Unit, charged.[/green]',
    async c => {
      // Not `personify()` — that one refuses outside the Personify phase, and
      // this happens mid-battle by design. Same two moves it would make.
      const outgoing = ps(c).persona;
      if (outgoing) moveCard(c.game, outgoing, 'heart');
      moveCard(c.game, c.source, 'persona');
      chargeUnit({ ...c, activation: undefined }, c.source);
      await settle(c);
    },
    { trigger: 'attackResolved', requiresState: 'Bayanihan',
      canRun: c => c.event?.unit === ps(c).persona
        && inst(c.game, c.source).zone === 'ally'
        && inst(c.game, c.source).calledFromDeckInBattleTurn === c.game.turnNumber
        && ps(c).hand.length >= 2 }),
]);

/**
 * The Bayanihan swap every Level 2 Unit carries.
 *
 * Released formation and a body still standing turns the Unit's own skill into
 * a strike. "On the field" is load-bearing: several of these skills take the
 * Unit off the board, and one that has already left is not there to swap.
 *
 * Any Energy the base skill costs is paid inside it rather than declared on the
 * ability, because the engine charges a declared cost before the skill runs —
 * which would bill you for a skill Bayanihan just replaced.
 */
const onField = (c: C) => inst(c.game, c.source).zone === 'ally';
/**
 * The Unit is arriving right now.
 *
 * Held separately from `onField` because the two can disagree. Several of
 * these skills take the Unit off the board, and placement triggers resolve
 * in a batch — so a Unit whose own arrival skill is still to run can
 * already have been moved by an earlier one. Without this it would fall
 * through to the base skill at the exact moment the swap was meant to
 * apply.
 */
const beingPlaced = (c: C) => c.event?.name === 'placed' && c.event.unit === c.source;
const swapped = (c: C) => bayanihanOn(c) && (onField(c) || beingPlaced(c));
const SWAP = 'When Bayanihan is released and this Unit is on the field or '
  + 'when placed, its skill becomes: choose one of your Units; it gets '
  + 'Power +3000 until end of turn.';

async function orBoost(c: C, otherwise: (c: C) => Promise<void>) {
  if (c.activation?.data.bayanihanSwap ?? swapped(c)) await boost(c, 3000);
  else await otherwise(c);
}


add(4, 'Scout on arrival', [
  a(`[green][Ally] 1/Turn: When specially called, Sumipat 1. ${SWAP}[/green]`,
    c => orBoost(c, c2 => sumipat(c2, 1)), placed),
]);

add(5, 'Reshuffles a dead draw', [
  a(`[green][Ally] 1/Turn: When specially called, reveal the top card of your deck. If it is not a Unit, put it on the bottom and put this Unit on top of your deck. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {

      const u = ps(c2).deck[0];
      if (!u) return;
      await c2.chooser.revealCards(c2.me, [u], 'Months-Of-Battle Warrior', 'Top card of your deck');
      if (unit(c2, u)) return;
      bottom(c2, u);
      toTop(c2, c2.source);
      await settle(c2);
    }),
    { ...placed, canRun: c => placedSelf(c) && true }),
]);

add(6, 'Returns for the next wave', [
  a(`[green][Ally] 1/Turn: When your Persona attacks, put this Unit on top of your deck. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => { toTop(c2, c2.source); await settle(c2); }),
    { trigger: 'attack',
      canRun: c => c.event?.unit === ps(c).persona && onField(c) }),
]);

// The one Level 2 Unit with no Bayanihan swap. It already pays off a full
// board by counting arrivals, and swapping that for a one-off strike would
// turn the Unit that rewards the formation into one more way to spend it.
add(7, 'Grows with every arrival', [
  a('[green][Ally] 1/Turn: When a card is placed into an Ally Zone from your deck or your hand, this Unit gets Power +2000 until end of turn.[/green]',
    async c => { buffPower(c, c.source, 2000); },
    { trigger: 'placed',
      canRun: c => ownTurn(c) && onField(c) && !!c.event?.unit && c.event.unit !== c.source
        && (c.event.from === 'deck' || c.event.from === 'hand') }),
]);

add(8, 'Raptor digs, or strikes', [
  a(`[green][Ally] 1/Turn: When specially called, Sipol 1. ${SWAP}[/green]`,
    c => orBoost(c, sip), placed),
]);

add(9, 'Trades a card for a body', [
  a(`[green][Ally] 1/Turn: When specially called, put 1 card from your hand on top of your deck, then Sipol 1. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {
      const u = await pick(c2, [...ps(c2).hand], 'Put a card from your hand on top of your deck');
      if (u) toTop(c2, u);
      // Finish the hand-to-deck journey before Sipol reveals or calls that card.
      await c2.present?.();
      await sip(c2);
    }), placed),
]);

add(10, 'Reads three, or strikes', [
  a(`[green][Ally] 1/Turn: When specially called, Sumipat 3. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {  await sumipat(c2, 3); }),
    { ...placed, canRun: c => placedSelf(c) && true }),
]);
/* ---- the eight Level 1 Units ------------------------------------------- */
// Each carries the same Bayanihan swap as the Level 2s, on the trigger it
// already had. The two HAND abilities are the exception and cannot: the swap
// wants the Unit on the field, and a card being played out of hand is not.

const fromHand = (c: C) => c.event?.from === 'hand';

add(11, 'Rides the deck back', [
  a(`[green][Ally] 1/Turn: When placed from your hand, put this Unit on top of your deck. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {

      toTop(c2, c2.source);
      await settle(c2);
    }),
    { trigger: 'placed',
      canRun: c => self(c) && fromHand(c) && true }),
]);

add(12, 'Spreads the strike', [
  a(`[green][Ally] 1/Turn: When placed, choose two of your Units; they each get Power +2000 until end of turn. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {

      const pool = units(c2);
      const chosen = await c2.chooser.chooseCards(
        c2.me, 'Choose two Units for Power +2000', pool, Math.min(2, pool.length), { upTo: true });
      for (const u of [...new Set(chosen)].filter(u => pool.includes(u)).slice(0, 2)) {
        buffPower(c2, u, 2000);
      }
    }),
    { trigger: 'placed',
      canRun: c => self(c) && true }),
]);

add(13, 'Trades a card on arrival', [
  a(`[green][Ally] 1/Turn: When placed from your hand, discard 1 card, then draw 1 card. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => {
      const u = await pick(c2, [...ps(c2).hand], 'Discard a card');
      if (u) moveCard(c2.game, u, 'grave');
      await draw(c2, 1);
    }),
    { trigger: 'placed', canRun: c => self(c) && fromHand(c) }),
]);

add(14, 'Grows on every deck call', [
  a(`[green][Ally] 1/Turn: When a Unit is placed from your deck, this Unit gets Power +3000 until end of turn. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => { buffPower(c2, c2.source, 3000); }),
    { trigger: 'placed',
      canRun: c => onField(c) && !!c.event?.unit && c.event.unit !== c.source
        && c.event.from === 'deck' }),
]);

// A hand ability, so no Bayanihan swap: the Unit is not on the field to swap.
add(15, 'Puts itself back', [
  a('[blue][Hand] 1/Turn: Put this card on top of your deck.[/blue]',
    async c => { toTop(c, c.source); },
    { scope: ['Hand'], }),
]);

// Likewise a hand ability, and likewise without the swap.
add(16, 'Trades itself for a card', [
  a('[blue][Hand] 1/Turn: Discard this card, then draw 1 card.[/blue]',
    async c => { if (!c.activation) moveCard(c.game, c.source, 'grave'); await draw(c, 1); },
    { scope: ['Hand'] }),
]);

add(17, 'Recalls a Unit to the top', [
  a(`[blue][Ally] 1/Turn: [Cost: put this Unit on the bottom of your deck] Choose one of your Units and put it on top of your deck. ${SWAP}[/blue]`,
    c => orBoost(c, async c2 => {

      if (!c2.activation) bottom(c2, c2.source);
      const u = await pick(c2, units(c2).filter(x => x !== c2.source),
        'Put one of your Units on top of your deck');
      if (u) toTop(c2, u);
      await settle(c2);
    }),
    { canRun: c => swapped(c)
        || (units(c).some(u => u !== c.source)) }),
]);

add(18, 'Strengthens as it supports', [
  a(`[green][Ally] 1/Turn: When this Unit supports an attack, it gets Power +3000 until end of turn. ${SWAP}[/green]`,
    c => orBoost(c, async c2 => { buffPower(c2, c2.source, 3000); }),
    { trigger: 'attack',
      canRun: c => onField(c) && !!c.event?.supporters?.includes(c.source) }),
]);

/**
 * The four Forces.
 *
 * A Force is two cards in one, and which one you get is decided by how it
 * reached play rather than by a choice. Left in the deck it is a check: turned
 * up on an attack or a Barrier break it hands a Unit +5000, free. Held in hand
 * it responds to its printed event on either player's turn. Reveal and discard
 * it as the cost; that payment remains spent if its activation is negated.
 */

for (const [i, n] of [19, 20, 21, 22].entries()) {
  AGTA_SET_ONE_SCRIPTS[id(n)] = { id: id(n), forceModes: [
    { label: 'One Unit gets Power +5000 this turn.', run: async c => { await boost(c, 5000); } },
    forceResponse(FORCE_RESPONSES[i]!),
  ] };
  rules[id(n)] = { role: 'Force response', skill: forceResponsePrinted(FORCE_RESPONSES[i]!) };
}
function action(n:number,_oldCost:number,text:string,run:(c:C)=>Promise<void>,canRun?:(c:C)=>boolean){AGTA_SET_ONE_SCRIPTS[id(n)]={id:id(n),action:{run,canRun}};rules[id(n)]={role:'Main-phase tactical Action',skill:`[blue][Action] ${text}[/blue]`};}
action(23,1,'Look at the top 3; call up to 1 Unit to an open Ally Zone. Bottom the rest in any order.',async c=>{await callTop(c,3);});
action(24,2,'Look at the top 5; call up to 2 Level 2 or lower Units to open Ally Zones. Bottom the rest in any order.',async c=>{await callTop(c,5,2,0,(c,u)=>unit(c,u)&&def(c.index,c.game,u).level<=2);});
action(25,0,'Look at the top card; you may bottom it. Then draw 1 and discard 1.',async c=>{await scry(c);await filter(c);});
action(26,1,'Look at the top 5; reveal a Level 3 Unit among them and add it to hand. Bottom the rest in any order.',async c=>{const top=ps(c).deck.slice(0,5);await c.chooser.revealCards(c.me,top,'Find a rescuer');const u=await pick(c,top.filter(u=>unit(c,u)&&def(c.index,c.game,u).level===3),'Choose a Level 3 Unit');if(u)moveCard(c.game,u,'hand');const rest=top.filter(x=>x!==u);await orderDeckBottom(c,rest);});
action(27,1,'Sipol 1. Then, if Bayanihan is released, one of your Units gets Power +5000 this turn.',async c=>{await sip(c);if(bayanihanOn(c))await boost(c,5000);});
action(28,2,'Bottom one of your Allies. If you do, destroy an opposing Level 2 or lower Ally, then Sipol 1.',async c=>{if(!await recycle(c,allies(c)))return;const u=await pick(c,enemies(c).filter(u=>def(c.index,c.game,u).level<=2),'Destroy an opposing Level 2 or lower Ally');if(u)damageUnitByAbility(c,u);await settle(c);await sip(c);},c=>allies(c).length>0);
action(29,2,'Look at the top 5; call up to 1 Unit to an open Ally Zone with Power +5000 this turn. Bottom the rest. If Bayanihan is released, your Persona gets Power +5000 this turn.',async c=>{await callTop(c,5,1,5000);if(bayanihanOn(c)&&ps(c).persona)buffPower(c,ps(c).persona!,5000);});
action(30,2,'With Bayanihan: destroy an opposing Ally. Your Persona gets Power +5000 this turn.',async c=>{const u=await pick(c,enemies(c),'Destroy an opposing Ally');if(u)damageUnitByAbility(c,u);if(ps(c).persona)buffPower(c,ps(c).persona!,5000);},bayanihanOn);
action(31,1,'Return a Level 2 or lower Unit from your Grave to your hand.',async c=>{const u=await pick(c,ps(c).grave.filter(u=>unit(c,u)&&def(c.index,c.game,u).level<=2),'Recover a Unit');if(u)moveCard(c.game,u,'hand');});
action(32,2,'Your Units get Power +3000 this turn, or +5000 if Bayanihan is released.',async c=>{for(const u of units(c))buffPower(c,u,bayanihanOn(c)?5000:3000);});
/**
 * The ten Codex, as one engine with ten entrances.
 *
 * Each is tied to a different moment or a different kind of trouble, and the
 * rule is the same for all of them: the Codex whose moment has arrived may
 * switch in for free when its trigger and board conditions are met.
 *
 * They fuel Sipol and Bayanihan rather than repeating them. Sipol digs a Unit
 * off the top into a Zone; Bayanihan releases while all four Zones hold Luzon
 * Arch Units. Every Codex here either makes the dig better, makes it cheaper,
 * or turns something the opponent did into another dig.
 *
 * The four that key off the opponent being ahead are the deck's comeback half,
 * in the shape Duel Masters gave the idea: they are eligible only while you
 * are behind, so they cost nothing when you are winning and are waiting when
 * you are not.
 */

/** How the printed card describes the moment its Codex arrives. */
const WINDOW_TEXT: Record<string, string> = {
  startOfTurn: 'before you draw',
  personify: 'before you Personify',
  startOfMain: 'at the start of your Main Phase',
  personaAttack: 'when your Persona attacks',
  personaAttacked: 'when your Persona is under attack',
  barrierBroken: "when your Barrier breaks during your opponent's turn",
};

/** Shared by every Codex in the set, so the rule is printed once per card. */
function printedFor(on: TriggerName, text: string, note?: string): string {
  const when = WINDOW_TEXT[on] ?? on;
  return `[Codex] Auto-switch ${when}${note ? `, ${note}` : ''}, `
    + 'you may switch to this Codex for free.\n'
    + '[Bayanihan] Released while all four Ally Zones contain Luzon Arch '
    + 'Units.\n'
    + `[green]${text}[/green]`;
}

/** An auto-type Codex: fires on its trigger, once a turn. */
function codex(
  n: number, on: TriggerName, trigger: TriggerName, text: string,
  run: (c: C) => Promise<void>,
  canRun: (c: C) => boolean = () => true,
  when?: (c: C) => boolean, note?: string,
) {
  AGTA_SET_ONE_SCRIPTS[id(n)] = {
    id: id(n),
    codex: {
      autoSwitchOn: on,
      autoSwitchWhen: when,
      skill: {
        type: 'auto', trigger, text: `1/Turn: ${text}`, maxUses: 1,
        canRun: c => inst(c.game, c.source).setOneUses?.agtaCodex !== c.game.turnNumber
          && canRun(c),
        run: async c => {
          (inst(c.game, c.source).setOneUses ??= {}).agtaCodex = c.game.turnNumber;
          await run(c);
        },
      },
    },
  };
  rules[id(n)] = { role: 'Bayanihan engine', skill: printedFor(on, `1/Turn: ${text}`, note) };
}

/** A Codex that stands in for a step of the turn instead of reacting to one. */
function replacement(
  n: number, on: TriggerName, replaces: 'draw' | 'personify', text: string,
  run: (c: C) => Promise<void>, note?: string,
) {
  AGTA_SET_ONE_SCRIPTS[id(n)] = {
    id: id(n),
    codex: { autoSwitchOn: on, skill: { type: 'replacement', replaces, text, run } },
  };
  rules[id(n)] = { role: 'Bayanihan engine', skill: printedFor(on, text, note) };
}

/** A Codex that only changes what Sipol does while it is active. */
function sipolCodex(
  n: number, on: TriggerName, text: string, mode: SipolMode,
  when?: (c: C) => boolean, note?: string,
) {
  AGTA_SET_ONE_SCRIPTS[id(n)] = {
    id: id(n),
    codex: { autoSwitchOn: on, autoSwitchWhen: when,
      skill: { type: 'continuous', text, run: async () => {} } },
  };
  registerSipolMode(id(n), mode);
  rules[id(n)] = { role: 'Bayanihan engine', skill: printedFor(on, text, note) };
}

/* ---- the situations the comeback half waits for ------------------------- */

const foe = (c: C) => you(c.game, opponentOf(c.me));
const myUnits = (c: C) => units(c).length;
const foeUnits = (c: C) => foe(c).allies.filter(Boolean).length
  + (foe(c).persona ? 1 : 0);
const behindOnUnits = (c: C) => myUnits(c) < foeUnits(c);
const behindOnHand = (c: C) => ps(c).hand.length < foe(c).hand.length;
const behindOnBarriers = (c: C) => ps(c).barriers.length < foe(c).barriers.length;
const nearlyOut = (c: C) => ps(c).barriers.length <= 2;
const mainPhase = (c: C) => c.game.phase === 'main' && c.game.turnPlayer === c.me;

/* ---- 33 · Dawnward Country, Arawen -------------------------------------- */
// The draw becomes a dig. You see three and decide the order they arrive in,
// then Sipol off the top you just arranged — so the Sipol is aimed rather than
// hoped for. You do not draw: the card you would have had is the price of
// knowing, and of the body Sipol may put on the board instead.
replacement(33, 'startOfTurn', 'draw',
  'Instead of drawing, look at the top 3 cards of your deck and put them back '
  + 'on top in any order. Then Sipol 1.',
  async c => {
    await orderDeckTop(c, ps(c).deck.slice(0, 3));
    await sip(c);
  });

/* ---- 34 · Barbed Sky Passage, Salikan ----------------------------------- */
// Personify out of the deck rather than the hand. The passage is the point:
// a Level 3 you never drew can still become you. Decline, or find none, and
// all five go to the bottom — you looked, and looking cost you the step.
replacement(34, 'personify', 'personify',
  'Instead of Personifying from your hand, look at the top 5 cards of your '
  + 'deck and Personify one Level 3 Unit among them. Put the rest on the '
  + 'bottom in any order.',
  async c => {
    const seen = ps(c).deck.slice(0, 5);
    if (!seen.length) return;
    await c.chooser.revealCards(c.me, seen, 'Barbed Sky Passage', 'Top 5 of your deck');
    const current = ps(c).persona;
    const eligible = seen.filter(u => unit(c, u)
      && def(c.index, c.game, u).level === 3
      && (!current || def(c.index, c.game, u).level >= def(c.index, c.game, current).level));
    const chosen = eligible.length
      ? await pick(c, eligible, 'Personify which Level 3 Unit?') : null;
    if (chosen) {
      ps(c).deck.splice(ps(c).deck.indexOf(chosen), 1);
      if (current) moveCard(c.game, current, 'heart');
      moveCard(c.game, chosen, 'persona');
    }
    // Everything not taken goes under, in an order you choose.
    const rest = seen.filter(u => u !== chosen);
    await orderDeckBottom(c, rest);
    await settle(c);
  });

/* ---- 35 · Fifth Heaven, Ularan ------------------------------------------ */
// A dig bought mid-swing. The Unit lands while the attack is still resolving,
// which is how a fourth Zone gets filled at the one moment Bayanihan is worth
// the most.
codex(35, 'personaAttack', 'personaAttack',
  'When your Persona attacks, Sipol 1.',
  async c => {  await sip(c); },
  c => c.event?.unit === ps(c).persona && open(c));

/* ---- 36 · Brothers' Refuge, Taliman ------------------------------------- */
// The shield that broke pays for the body that replaces it — but only when the
// check found nothing. A Force already did its work; this is what you get when
// it did not. Duel Masters' Shield Trigger, read the Agta way.
codex(36, 'barrierBroken', 'barrierBroken',
  'When you check a Barrier and it is not a Force, discard 1 card, then Sipol 1.',
  async c => {
    const u = await pick(c, [...ps(c).hand], 'Discard a card');
    if (!u) return;
    moveCard(c.game, u, 'grave');
    await sip(c);
  },
  c => ps(c).hand.length > 0 && !!c.event?.revealed
    && def(c.index, c.game, c.event.revealed).type !== 'Force',
  c => c.game.turnPlayer !== c.me, "and the check is not a Force");

/* ---- 37 · Healing House, Aligan ----------------------------------------- */
// Revolution 2. While you are nearly out of shields, every Sipol looks at two
// and you choose — the whiff rate halves exactly when a whiff would end you.
// The card you pass on is exiled, so the help is not free.
sipolCodex(37, 'startOfTurn',
  'While this is active, if you would Sipol during your Main Phase, look at '
  + 'the top 2 instead and choose one for the Sipol. Exile the other.',
  { look: 2, rest: 'exile', when: mainPhase },
  nearlyOut, 'if you have 2 or fewer Barriers');

/* ---- 38 · Wedding Clearing, Amuran -------------------------------------- */
// The gathering. Three digs at once, bought with the turn's Energy, for the
// board that is behind — the clearing fills because everyone came.
codex(38, 'startOfTurn', 'codexPlayed',
  'When this Codex becomes active, [Cost: Discard 1 card] Sipol 3.',
  async c => {  await sip(c); await sip(c); await sip(c); },
  c => ps(c).hand.length > 0,
  behindOnUnits, 'if your opponent has more Units than you');

/* ---- 39 · Golden Threshold, Nagdan -------------------------------------- */
// The gate you open at the top of the Main Phase, and only while you are the
// one who needs it. Two digs is a Zone and a half.
codex(39, 'startOfMain', 'startOfMain',
  'At the start of your Main Phase, if you have fewer Units than your '
  + 'opponent, Sipol 2.',
  async c => {  await sip(c); await sip(c); },
  c => ownTurn(c) && behindOnUnits(c));

/* ---- 40 · Heaven's Rift, Siwangan --------------------------------------- */
// Payment for a turn spent digging. It arrives on their swing, which is where
// a Persona that grew by 5000 decides whether the attack was worth making.
codex(40, 'personaAttacked', 'personaAttacked',
  'When your Persona is under attack, if you Sipol’d 3 or more times '
  + 'during your last turn, your Persona gets Power +5000 until end of turn.',
  async c => { if (ps(c).persona) buffPower(c, ps(c).persona!, 5000); },
  c => (ps(c).sipolLastTurn ?? 0) >= 3);

/* ---- 41 · Mystic Sky River, Dalunan ------------------------------------- */
// The dig becomes a card instead of a body. Deliberately at odds with
// Bayanihan, which wants Zones filled — the river gives you the hand back when
// the hand is what you are short of, and you give up the board to take it.
sipolCodex(41, 'startOfTurn',
  'While this is active, if you would Sipol during your Main Phase, put the '
  + 'card into your hand instead of calling it.',
  { toHand: true, when: mainPhase },
  behindOnHand, 'if your opponent has more cards in hand than you');

/* ---- 42 · Storm Court, Kaliman ------------------------------------------ */
// The only one that does nothing until the field is already full, which is why
// it is the Codex you switch to when their shields are the problem: Bayanihan
// is the reward, and this makes the reward hit harder.
// The bonus itself is in passiveBonuses(): it is continuous, so it has to
// apply on attack, support and defence alike, and lapse the moment a Zone
// empties. Nothing fires here — being active IS the effect.
continuousCodex(42, 'startOfTurn',
  'While Bayanihan is released, your Units get Power +1000.',
  behindOnBarriers, 'if your opponent has more Barriers than you');

/** A Codex whose whole effect is a continuous bonus applied elsewhere. */
function continuousCodex(
  n: number, on: TriggerName, text: string,
  when?: (c: C) => boolean, note?: string,
) {
  AGTA_SET_ONE_SCRIPTS[id(n)] = {
    id: id(n),
    codex: { autoSwitchOn: on, autoSwitchWhen: when,
      skill: { type: 'continuous', text, run: async () => {} } },
  };
  rules[id(n)] = { role: 'Bayanihan engine', skill: printedFor(on, text, note) };
}

export const AGTA_SET_ONE_RULES=rules;

AGTA_SET_ONE_SCRIPTS[id(3)]!.abilities![1]!.prepare = cardPayment(c => [...ps(c).hand], 2, 'discard', 'Discard 2 cards to Personify');
AGTA_SET_ONE_SCRIPTS[id(16)]!.abilities![0]!.prepare = async c => planCards(c, [c.source], 'discard');
AGTA_SET_ONE_SCRIPTS[id(16)]!.abilities![0]!.prepare!.describe = () => ({ label: 'Discard this card' });
AGTA_SET_ONE_SCRIPTS[id(17)]!.abilities![0]!.prepare = async c => swapped(c)
  ? { cards: [], data: { bayanihanSwap: true } }
  : { ...planCards(c, [c.source], 'bottom'), data: { bayanihanSwap: false } };
AGTA_SET_ONE_SCRIPTS[id(17)]!.abilities![0]!.prepare!.describe = c => ({ label: swapped(c) ? 'No extra payment · Bayanihan swap' : 'Put this card on the bottom of your deck' });
AGTA_SET_ONE_SCRIPTS[id(38)]!.codex!.skill!.prepare = cardPayment(c => [...ps(c).hand], 1, 'discard', 'Discard 1 card for Sipol 3');

// Public targets are declared before responses. Searches and targets created by
// this effect (for example a freshly called Sipol Unit) remain resolution choices.
const swapChosen = (c: C) => c.activation?.data.bayanihanSwap === true;
for (const n of [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 17, 18]) {
  const skill = AGTA_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!;
  skill.prepare ??= async c => ({ cards: [], data: { bayanihanSwap: swapped(c) } });
  skill.targets = [{ prompt: 'Choose a Unit for Power +3000', pool: units, when: swapChosen }];
}
AGTA_SET_ONE_SCRIPTS[id(12)]!.abilities![0]!.targets!.push({ prompt: 'Choose two Units for Power +2000', pool: units, count: 2, optional: true, when: c => !swapChosen(c) });
AGTA_SET_ONE_SCRIPTS[id(17)]!.abilities![0]!.targets!.push({ prompt: 'Put one of your Units on top of your deck', pool: c => units(c).filter(u => u !== c.source), when: c => !swapChosen(c) });
AGTA_SET_ONE_SCRIPTS[id(28)]!.action!.targets = [
  { prompt: 'Return an Ally to the bottom of your deck', pool: allies },
  { prompt: 'Destroy an opposing Level 2 or lower Ally', pool: c => enemies(c).filter(u => def(c.index, c.game, u).level <= 2) },
];
AGTA_SET_ONE_SCRIPTS[id(30)]!.action!.targets = [{ prompt: 'Destroy an opposing Ally', pool: enemies }];
AGTA_SET_ONE_SCRIPTS[id(31)]!.action!.targets = [{ prompt: 'Recover a Unit', pool: c => ps(c).grave.filter(u => unit(c, u) && def(c.index, c.game, u).level <= 2) }];

// Public call intent is rules metadata, never inferred from translated card text.
AGTA_SET_ONE_SCRIPTS[id(1)]!.abilities![1]!.specialCalls = true;
AGTA_SET_ONE_SCRIPTS[id(2)]!.abilities![0]!.specialCalls = true;
for (const n of [8, 9]) AGTA_SET_ONE_SCRIPTS[id(n)]!.abilities![0]!.specialCalls = c => !(c.activation?.data.bayanihanSwap ?? swapped(c));
for (const n of [23, 24, 27, 28, 29]) AGTA_SET_ONE_SCRIPTS[id(n)]!.action!.specialCalls = true;
for (const n of [33, 35, 36, 38, 39]) AGTA_SET_ONE_SCRIPTS[id(n)]!.codex!.skill!.specialCalls = true;
