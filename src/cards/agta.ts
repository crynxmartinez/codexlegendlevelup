/**
 * Agta deck card scripts — redesigned with Sipol + Bayanihan.
 *
 * Sipol: Reveal the top card of your deck. If it is a Unit, special call it
 *   to an Ally Zone, replacing a unit if the zones are full. Otherwise, place
 *   it on the bottom of your deck.
 * Bayanihan: Released when all 4 Ally Zones are occupied by Luzon Arch Units.
 *   Once released, remains until end of turn.
 *
 * Personas: 3 (Amihan, Makisig, Laya)
 * L2: 5 (Kislap, Kidlat, Mayumi, Sinta, Ulan)
 * L1: 5 (Aya, Pilo, Berto, Sari, Nena)
 * Force: 4, Action: 2, Sentry: 1, Codex: 5
 */
import {
  arrangeTopN,
  bayanihanOn,
  buffAll,
  buffPower,
  damageUnitByAbility,
  draw,
  enemyAllies,
  exhaust,
  sipol,
  isUnitCard,
  myUnits,
  specialCall,
  spendEnergy,
  type EffectContext,
} from '../core/effects.js';
import { def, inst, log, moveCard, you as legacyPlayerState } from '../core/state.js';

// Historical printings are unavailable to new matches; retained for old fixtures.
const you = (...args: Parameters<typeof legacyPlayerState>) => legacyPlayerState(...args) as ReturnType<typeof legacyPlayerState> & { energy: number };
import type { CardScript, ScriptRegistry } from './types.js';

// --- shared helpers --------------------------------------------------------

/** Mode A of every Force card: give one of your units +5000. */
async function forceBuffMode(ctx: EffectContext): Promise<void> {
  const targets = myUnits(ctx);
  if (!targets.length) return;
  const pick = await ctx.chooser.chooseTarget(
    ctx.me,
    'Give a unit +5000 until end of turn',
    targets,
  );
  if (pick) buffPower(ctx, pick, 5000);
}

/** Check if a unit is Luzon Arch. */
function isLuzonArch(ctx: EffectContext, uid: string): boolean {
  const d = def(ctx.index, ctx.game, uid);
  return d.subtypes?.includes('Luzon Arch') === true;
}

/** Get all Luzon Arch allies on the controller's field (excluding Persona). */
function luzonArchAllies(ctx: EffectContext): string[] {
  return you(ctx.game, ctx.me).allies.filter((uid): uid is string => {
    if (!uid) return false;
    return isLuzonArch(ctx, uid);
  });
}

/** Get all Luzon Arch units on the controller's field (including Persona). */
function allLuzonArchUnits(ctx: EffectContext): string[] {
  const ps = you(ctx.game, ctx.me);
  const units = [...ps.allies.filter((uid): uid is string => !!uid)];
  if (ps.persona && isLuzonArch(ctx, ps.persona)) units.push(ps.persona);
  return units;
}

// --- Personas (L3) — 3 cards ----------------------------------------------

/**
 * Arrow of the Sierra, Amihan — Ezel-style explosive superior calling.
 * Base: [Persona] 1/turn: [Cost: 1 Energy] Sipol 1. If a Unit is called,
 *   it gets Power +2000 until end of turn.
 * Bayanihan: [Bayanihan][Persona] 1/turn: When this unit attacks, [Cost: 2 Energy]
 *   Reveal the top two cards. Special call up to two Units to Ally Zones.
 *   Place the rest on the bottom. Called Units get +2000 until end of turn.
 */
const amihan: CardScript = {
  id: 'agta/arrow-of-the-sierra-amihan',
  abilities: [
    {
      text: '[Persona] 1/turn: [Cost: 1 Energy] Sipol 1.',
      scope: ['Persona'],
      perTurn: 1,
      energyCost: 1,
      canRun: (ctx) => you(ctx.game, ctx.me).deck.length > 0,
      run: async (ctx) => {
        const called = await sipol(ctx);
        log(ctx.game, `Amihan: Used Sipol${called ? '' : ' (no unit called)'}.`, [ctx.source]);
      },
    },
    {
      text: '[Bayanihan][Persona]: When this unit attacks, reveal the top 2 cards of your deck and special call them to Ally Zones, replacing a unit if the zones are full (the replaced unit is destroyed). This unit gets Power equal to the sum of the Power of the units called this way, until end of turn. If you reveal a non-Unit, put it on the bottom of your deck.',
      scope: ['Persona'],
      requiresState: 'Bayanihan',
      trigger: 'attack',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!bayanihanOn(ctx)) return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const count = Math.min(2, ps.deck.length);
        if (count === 0) return;
        const topUids = ps.deck.splice(0, count);
        let powerSum = 0;
        let called = 0;
        for (const uid of topUids) {
          const d = def(ctx.index, ctx.game, uid);
          // Bayanihan fills every Ally Zone, so this must be able to call onto
          // a full board — it replaces a unit rather than fizzling.
          if (isUnitCard(d) && (await specialCall(ctx, uid, { allowOverwrite: true }))) {
            powerSum += d.power;
            called++;
          } else {
            // Non-Unit goes to the bottom of the deck.
            ps.deck.push(uid);
            inst(ctx.game, uid).zone = 'deck';
          }
        }
        if (powerSum > 0) {
          buffPower(ctx, ctx.source, powerSum);
          log(ctx.game, `Amihan: Called ${called} unit(s), +${powerSum} power.`, [ctx.source]);
        } else {
          log(ctx.game, `Amihan: No units called from the top 2 — cards to the bottom.`, [ctx.source]);
        }
      },
    },
  ],
};

/**
 * The Boar-Spear, Makisig — Alfred-style board presence.
 * Passive: [Persona]: During your turn, this unit gets Power +2000 for each
 *   Luzon Arch ally on your field. (Applied on attack)
 * Board-building: [Persona] 1/turn: [Cost: 1 Energy] Sipol 1. If a Unit was
 *   called, choose one Luzon Arch ally. It gets Power +5000 until end of turn.
 */
const makisig: CardScript = {
  id: 'agta/the-boar-spear-makisig',
  abilities: [
    {
      text: '[Persona] 1/turn: [Cost: 1 Energy] Sipol 1. A Unit called by this effect gets Power +2000 until end of turn.',
      scope: ['Persona'],
      perTurn: 1,
      energyCost: 1,
      canRun: (ctx) => you(ctx.game, ctx.me).deck.length > 0,
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const before = ps.allies.filter((uid): uid is string => !!uid);
        const called = await sipol(ctx);
        if (!called) return;
        const after = ps.allies.filter((uid): uid is string => !!uid);
        const fresh = after.find((uid) => !before.includes(uid));
        if (fresh) {
          buffPower(ctx, fresh, 2000);
          log(ctx.game, `Makisig: ${def(ctx.index, ctx.game, fresh).name} gets +2000.`, [fresh]);
        }
      },
    },
  ],
};

/**
 * Voice Beneath the Rain, Laya — battle personify from the field.
 * [Ally]: When this Level 3 Unit is special called from your deck during
 *   Battle, after your Persona attacks, you may Personify this Unit as
 *   charged. If you do, move your previous Persona to an open Ally Zone as
 *   exhausted. This consumes the turn's Personify allowance.
 * [Bayanihan][Persona]: When this unit is placed in the Persona Zone during
 *   Battle, Sipol 1. If you successfully called a unit, this and that unit
 *   get Power +5000 until end of turn.
 */
const laya: CardScript = {
  id: 'agta/voice-beneath-the-rain-laya',
  abilities: [
    {
      text: '[Ally]: When this Level 3 Unit is special called from your deck during Battle, after your Persona attacks, you may Personify this Unit as charged. If you do, move your previous Persona to an Ally Zone as exhausted. This consumes the turn\'s Personify allowance.',
      scope: ['Ally'],
      trigger: 'attackResolved',
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ctx.event?.unit !== ps.persona) return false;
        if (ctx.game.phase !== 'battle') return false;
        if (ps.personifiedThisTurn) return false;
        const layaOnField = ps.allies.includes(ctx.source);
        if (!layaOnField) return false;
        // Printed: "When this Level 3 Unit is special called from your deck
        // during Battle" — a normally called Laya does not qualify, and
        // neither does one fetched in Main.
        //
        // `calledFromDeck` records only WHERE she came from. The phase check
        // above cannot supply the "when": this ability triggers on
        // `attackResolved`, which never fires outside Battle, so that line was
        // always true. A Laya pulled from the deck during Main sat in an Ally
        // Zone carrying the flag and personified the moment the Persona swung.
        //
        // This battle, not merely some battle: the call is what opens the
        // window, and "after your Persona attacks" is the timing inside it.
        const called = inst(ctx.game, ctx.source).calledFromDeckInBattleTurn;
        if (called !== ctx.game.turnNumber) return false;
        return true;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const wantPersonify = await ctx.chooser.confirm(
          ctx.me, 'Laya: Personify this unit as charged? (Previous Persona moves to an Ally Zone exhausted)',
        );
        if (!wantPersonify) return;
        // Remove Laya from her ally slot.
        const layaSlot = inst(ctx.game, ctx.source).slot;
        if (layaSlot != null) ps.allies[layaSlot] = null;
        // Move old persona to an open ally slot, exhausted.
        const oldPersona = ps.persona;
        if (oldPersona) {
          const openSlot = ps.allies.findIndex((s) => s === null);
          if (openSlot >= 0) {
            ps.allies[openSlot] = oldPersona;
            inst(ctx.game, oldPersona).slot = openSlot;
            inst(ctx.game, oldPersona).zone = 'ally';
            inst(ctx.game, oldPersona).exhausted = true;
            log(ctx.game, `Laya: ${def(ctx.index, ctx.game, oldPersona).name} moved to Ally Zone (exhausted).`, [oldPersona]);
          } else {
            // No open slot — send old persona to heart.
            moveCard(ctx.game, oldPersona, 'heart');
            log(ctx.game, `Laya: No open slot — ${def(ctx.index, ctx.game, oldPersona).name} sent to Heart.`, [oldPersona]);
          }
        }
        // Move Laya to persona zone, charged.
        inst(ctx.game, ctx.source).zone = 'persona';
        inst(ctx.game, ctx.source).slot = -1;
        inst(ctx.game, ctx.source).exhausted = false;
        ps.persona = ctx.source;
        ps.personifiedThisTurn = true;
        log(ctx.game, `Laya: Personified into ${def(ctx.index, ctx.game, ctx.source).name} (charged, during Battle)!`, [ctx.source]);
      },
    },
    {
      text: '[Bayanihan][Persona]: When this unit is placed in the Persona Zone during Battle, Sipol 1. If you successfully called a unit, this and that unit get Power +5000 until end of turn.',
      scope: ['Persona'],
      requiresState: 'Bayanihan',
      trigger: 'placed',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (ctx.game.phase !== 'battle') return false;
        // Only fires if Laya is now in the Persona Zone (after personify).
        return inst(ctx.game, ctx.source).zone === 'persona' && bayanihanOn(ctx);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.deck.length === 0) return;
        const before = ps.allies.filter((uid): uid is string => !!uid);
        const called = await sipol(ctx);
        if (called) {
          // Buff both Laya and the unit this Sipol actually called.
          const after = ps.allies.filter((uid): uid is string => !!uid);
          const lastCalled = after.find((uid) => !before.includes(uid));
          if (lastCalled) {
            buffPower(ctx, ctx.source, 5000);
            buffPower(ctx, lastCalled, 5000);
            log(ctx.game, `Laya: Sipol called ${def(ctx.index, ctx.game, lastCalled).name}. Both get +5000 (Bayanihan).`, [ctx.source, lastCalled]);
          } else {
            buffPower(ctx, ctx.source, 5000);
            log(ctx.game, `Laya: +5000 (Bayanihan, sipol called).`, [ctx.source]);
          }
        } else {
          log(ctx.game, `Laya: Sipol did not call a unit (Bayanihan).`, [ctx.source]);
        }
      },
    },
  ],
};

// --- L2 Units — 5 cards (superior-call engines) ---------------------------

/**
 * Honey Keep Cliffer, Kislap — gets +2000 when another unit is special called.
 * [Ally] 1/turn: When another Unit is special called from your deck, this unit
 *   gets Power +2000 until end of turn.
 */
const kislap: CardScript = {
  id: 'agta/honey-keep-cliffer-kislap',
  abilities: [
    {
      text: '[Ally] 1/turn: When another Unit is special called from your deck, this unit gets Power +2000 until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit === ctx.source) return false;
        if (!ctx.event?.special || ctx.event?.from !== 'deck') return false;
        return !!ctx.event?.unit;
      },
      run: async (ctx) => {
        buffPower(ctx, ctx.source, 2000);
        log(ctx.game, `Kislap: +2000 (another unit special called).`, [ctx.source]);
      },
    },
  ],
};

/**
 * Deerstep Runner, Kidlat — a whiffed Sipol goes to hand, not the bottom.
 *
 * He used to Sipol on being placed from hand, which made him a strictly worse
 * Sinta: same Level, same stat line, same Energy, same single call to
 * `sipol` — and one extra line in his guard that turned off every trigger
 * from a special call, which is how Agta puts most of its units down. Fourteen
 * of the deck's twenty-five cards already reveal off the top, so the fix was a
 * different verb rather than a different door: Sipol's failure case was pure
 * loss, and now it is a card.
 */
const kidlat: CardScript = {
  id: 'agta/deerstep-runner-kidlat',
  abilities: [
    {
      text: '[Ally]: When a Sipol you control reveals a card that is not a Unit, '
        + 'add it to your hand instead of placing it on the bottom of your deck.',
      scope: ['Ally'],
      // Passive — resolved inside `sipol` in effects.ts, which is where the
      // bottom-of-deck it replaces happens.
      canRun: () => false,
      run: async () => {},
    },
  ],
};

/**
 * Moon-Net Fisher, Mayumi — on placed, Sipol 1.
 * [Ally]: When placed, Sipol 1.
 */
const mayumi: CardScript = {
  id: 'agta/moon-net-fisher-mayumi',
  abilities: [
    {
      text: '[Ally]: When specially called, Sipol 1.',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!ctx.event?.special) return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => { await sipol(ctx); },
    },
  ],
};

/**
 * Ember Resin Grandmother, Sinta — on placed, Sipol 1.
 * [Ally]: When placed, [Cost: 1 Energy] Sipol 1.
 */
const sinta: CardScript = {
  id: 'agta/ember-resin-grandmother-sinta',
  abilities: [
    {
      text: '[Ally]: When placed, [Cost: 1 Energy] Sipol 1.',
      scope: ['Ally'],
      trigger: 'placed',
      energyCost: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        return you(ctx.game, ctx.me).energy >= 1 && you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        await sipol(ctx);
      },
    },
  ],
};

/**
 * Storm Bark Elder, Ulan — Bayanihan: +2000 per ally unit on attack/support.
 * [Bayanihan][Ally] 1/turn: When this unit attacks or supports, it gets
 *   Power +2000 for each ally unit, until end of that battle.
 */
const ulan: CardScript = {
  id: 'agta/storm-bark-elder-ulan',
  abilities: [
    {
      text: '[Bayanihan][Ally]: When this unit attacks, it gets Power +2000 for each of your Ally Units, until end of turn.',
      scope: ['Ally'],
      requiresState: 'Bayanihan',
      trigger: 'attack',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        return bayanihanOn(ctx);
      },
      run: async (ctx) => {
        const allyCount = you(ctx.game, ctx.me).allies.filter((uid): uid is string => !!uid).length;
        if (allyCount > 0) {
          buffPower(ctx, ctx.source, 2000 * allyCount);
          log(ctx.game, `Ulan: +${2000 * allyCount} power (${allyCount} ally units, Bayanihan).`, [ctx.source]);
        }
      },
    },
    {
      text: '[Bayanihan][Ally]: When this unit supports, it gets Power +2000 for each of your Ally Units, until end of turn.',
      scope: ['Ally'],
      requiresState: 'Bayanihan',
      trigger: 'supported',
      canRun: (ctx) => {
        if (!ctx.event?.supporters?.includes(ctx.source)) return false;
        return bayanihanOn(ctx);
      },
      run: async (ctx) => {
        const allyCount = you(ctx.game, ctx.me).allies.filter((uid): uid is string => !!uid).length;
        if (allyCount > 0) {
          buffPower(ctx, ctx.source, 2000 * allyCount);
          log(ctx.game, `Ulan: +${2000 * allyCount} power (${allyCount} ally units, Bayanihan, supporting).`, [ctx.source]);
        }
      },
    },
  ],
};

// --- L1 Units — 5 cards (community foundation) ----------------------------

/**
 * Firefly Pathkeeper, Aya — when special called, scry top.
 * [Ally]: When this unit is special called from your deck, look at the top
 *   card of your deck. You may place it on the bottom.
 */
const aya: CardScript = {
  id: 'agta/firefly-pathkeeper-aya',
  abilities: [
    {
      text: '[Ally]: When this unit is special called from your deck, look at the top card of your deck. You may place it on the bottom.',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!ctx.event?.special || ctx.event?.from !== 'deck') return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const top = ps.deck[0];
        if (!top) return;
        const name = def(ctx.index, ctx.game, top).name;
        const toBottom = await ctx.chooser.revealConfirm(
          ctx.me, top, `Aya: Send ${name} to the bottom of your deck?`,
        );
        if (toBottom) {
          ps.deck.shift();
          ps.deck.push(top);
          log(ctx.game, `Aya: Sent ${name} to the bottom.`, [top]);
        }
      },
    },
  ],
};

/**
 * Mudcrab Catcher, Pilo — when special called, buff another Luzon Arch unit.
 * [Ally]: When this unit is special called from your deck, choose another
 *   Luzon Arch Unit. It gets Power +1000 until end of turn.
 */
const pilo: CardScript = {
  id: 'agta/mudcrab-catcher-pilo',
  abilities: [
    {
      text: '[Ally]: When this unit is special called from your deck, choose another Luzon Arch Unit. It gets Power +1000 until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!ctx.event?.special || ctx.event?.from !== 'deck') return false;
        return allLuzonArchUnits(ctx).some((uid) => uid !== ctx.source);
      },
      run: async (ctx) => {
        const targets = allLuzonArchUnits(ctx).filter((uid) => uid !== ctx.source);
        if (targets.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Pilo: Which Luzon Arch unit gets +1000?', targets,
        );
        if (pick) {
          buffPower(ctx, pick, 1000);
          log(ctx.game, `Pilo: ${def(ctx.index, ctx.game, pick).name} gets +1000.`, [pick]);
        }
      },
    },
  ],
};

/**
 * Ember-Pot Bearer, Berto — supports Luzon Arch units.
 * [Ally]: When this unit supports a Luzon Arch Unit, that Unit gets
 *   Power +1000 for each ally unit, until end of that battle.
 */
const berto: CardScript = {
  id: 'agta/ember-pot-bearer-berto',
  abilities: [
    {
      text: '[Ally]: When this unit is special called from your deck and supports a Luzon Arch attacker, choose one of your other Luzon Arch Ally Units. It gets Power +1000 for each of your Ally Units, until end of turn.',
      scope: ['Ally'],
      trigger: 'supported',
      canRun: (ctx) => {
        if (!ctx.event?.supporters?.includes(ctx.source)) return false;
        if (!inst(ctx.game, ctx.source).calledFromDeck) return false;
        const battle = ctx.game.activeBattle;
        if (!battle || !battle.attacker) return false;
        return isLuzonArch(ctx, battle.attacker);
      },
      run: async (ctx) => {
        const targets = luzonArchAllies(ctx).filter((uid) => uid !== ctx.source);
        if (!targets.length) return;
        const allyCount = you(ctx.game, ctx.me).allies.filter((uid): uid is string => !!uid).length;
        const bonus = 1000 * allyCount;
        if (bonus <= 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me,
          `Berto: Which other Luzon Arch ally gets +${bonus}?`,
          targets,
        );
        if (!pick) return;
        buffPower(ctx, pick, bonus);
        log(
          ctx.game,
          `Berto: ${def(ctx.index, ctx.game, pick).name} gets +${bonus} (${allyCount} ally units).`,
          [pick],
        );
      },
    },
  ],
};

/**
 * Leaf Whistle Scout, Sari — when special called, self buff.
 * [Ally]: When this unit is special called from your deck, it gets Power +3000,
 *   until end of turn.
 */
const sari: CardScript = {
  id: 'agta/leaf-whistle-scout-sari',
  abilities: [
    {
      text: '[Ally]: When this unit is special called from your deck, choose another Luzon Arch Unit. It gets Power +1000 for each ally unit, until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) =>
        ctx.event?.unit === ctx.source &&
        ctx.event?.special === true &&
        ctx.event?.from === 'deck',
      run: async (ctx) => {
        const targets = allLuzonArchUnits(ctx).filter((uid) => uid !== ctx.source);
        if (!targets.length) return;
        const allyCount = you(ctx.game, ctx.me).allies.filter((uid): uid is string => !!uid).length;
        const bonus = 1000 * allyCount;
        if (bonus <= 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me,
          `Sari: Which other Luzon Arch Unit gets +${bonus}?`,
          targets,
        );
        if (!pick) return;
        buffPower(ctx, pick, bonus);
        log(
          ctx.game,
          `Sari: ${def(ctx.index, ctx.game, pick).name} gets +${bonus} (${allyCount} ally units).`,
          [pick],
        );
      },
    },
  ],
};

/**
 * Rattan Bridge Weaver, Nena — when special called, Foresight 3.
 * [Ally]: When this unit is special called from your deck, Foresight 3.
 */
const nena: CardScript = {
  id: 'agta/rattan-bridge-weaver-nena',
  abilities: [
    {
      text: '[Ally]: When this unit is special called from your deck, Foresight 3 (look at the top 3 cards of your deck, reorder them on top or bottom).',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!ctx.event?.special || ctx.event?.from !== 'deck') return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        await arrangeTopN(ctx, 3);
        log(ctx.game, `Nena: Foresight 3.`, [ctx.source]);
      },
    },
  ],
};

// --- Force cycle — 4 cards ------------------------------------------------

function force(id: string, label: string, run: (ctx: EffectContext) => Promise<void>): CardScript {
  return {
    id,
    forceModes: [
      { label: 'Give one of your units +5000 until end of turn', run: forceBuffMode },
      { label, run },
    ],
  };
}

const lunod = force('agta/mangrove-maw-lunod', 'Draw one card',
  async (ctx) => { await draw(ctx, 1); });

const pulot = force('agta/golden-hiveheart-pulot', 'All your units get +2000 until end of turn',
  async (ctx) => { buffAll(ctx, 2000); });

const dagsa = force('agta/root-tusk-boar-dagsa', 'Exhaust up to two opponent units',
  async (ctx) => {
    const targets = enemyAllies(ctx);
    if (!targets.length) return;
    const picked = await ctx.chooser.chooseCards(
      ctx.me, 'Exhaust up to two opponent units', targets,
      Math.min(2, targets.length), { upTo: true },
    );
    exhaust(ctx, picked);
  });

const salimbay = force('agta/storm-talon-eagle-salimbay', "Damage one of your opponent's exhausted Ally units",
  async (ctx) => {
    const targets = enemyAllies(ctx).filter((uid) => inst(ctx.game, uid).exhausted);
    if (!targets.length) return;
    const pick = await ctx.chooser.chooseTarget(
      ctx.me, "Damage which of your opponent's exhausted Allies?", targets,
    );
    if (pick) damageUnitByAbility(ctx, pick);
  });

// --- Actions — 2 cards ----------------------------------------------------

/**
 * Rattan Snarefall — Sipol 2.
 * [Cost: 3 Energy] Sipol 2.
 */
const rattanSnarefall: CardScript = {
  id: 'agta/rattan-snarefall',
  action: {
    energyCost: 3,
    canRun: (ctx) => you(ctx.game, ctx.me).deck.length > 0,
    run: async (ctx) => {
      await sipol(ctx);
      await sipol(ctx);
    },
  },
};

/**
 * Sierra's Vanishing Trail — Sipol 1, then draw 1.
 * [Cost: 1 Energy] Sipol 1, then draw 1.
 */
const sierrasVanishingTrail: CardScript = {
  id: 'agta/sierras-vanishing-trail',
  action: {
    energyCost: 1,
    canRun: (ctx) => you(ctx.game, ctx.me).deck.length > 0,
    run: async (ctx) => {
      await sipol(ctx);
      await draw(ctx, 1);
    },
  },
};

// --- Sentry — 1 card ------------------------------------------------------

/**
 * Sierra Watchkeeper, Banoy — Sentry with Sipol on reveal.
 * [Battle]: When your Persona is taking damage, [Reveal this card + 1 Energy]
 *   Nullify that damage, then Sipol 1, then exile this card face down.
 */
const banoy: CardScript = {
  id: 'agta/sierra-watchkeeper-banoy',
  sentry: true,
  abilities: [
    {
      text: '[Battle]: When your Persona is taking damage, [Reveal this card] Nullify that damage, Sipol 1, then exile this card face down.',
      scope: ['Hand'],
      specialCalls: true,
      run: async (ctx) => {
        log(ctx.game, 'Banoy: Sentry nullified the damage.');
        await sipol(ctx);
      },
    },
  ],
};

// --- Codex (5) — redesigned ------------------------------------------------

/**
 * Hidden Path — Draw Replacement.
 * At the start of your Draw Phase, instead of drawing one card, reveal the top
 * two cards of your deck. Choose one card. If it is a Unit, special call it to
 * an Ally Zone. Otherwise, add it to
 * your hand. Place the other card on the bottom of your deck.
 * Bayanihan bonus: If Bayanihan is released, reveal three cards instead of two.
 * auto switch — at the start of turn.
 */
const hiddenPath: CardScript = {
  id: 'agta/hidden-path',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'replacement',
      text: 'At the start of your Draw Phase, instead of drawing, reveal the top two cards of your deck. Choose one — if it is a Unit, special call it to an Ally Zone (otherwise add it to your hand). Place the other on the bottom. If Bayanihan is released, reveal three instead.',
      canRun: () => true,
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const n = bayanihanOn(ctx) ? 3 : 2;
        const count = Math.min(n, ps.deck.length);
        if (count === 0) return;
        const topUids = ps.deck.splice(0, count);
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, `Hidden Path: Choose one card (top ${count})`, topUids,
        );
        const chosen = pick ?? topUids[0]!;
        const rest = topUids.filter((uid) => uid !== chosen);
        // Place rest on bottom.
        for (const uid of rest) {
          ps.deck.push(uid);
          inst(ctx.game, uid).zone = 'deck';
        }
        const d = def(ctx.index, ctx.game, chosen);
        if (isUnitCard(d)) {
          await specialCall(ctx, chosen);
          log(ctx.game, `Hidden Path: Special called ${d.name}.`, [chosen]);
          return;
        }
        // Add to hand.
        ps.hand.push(chosen);
        inst(ctx.game, chosen).zone = 'hand';
        log(ctx.game, `Hidden Path: Added ${d.name} to hand.`, [chosen]);
      },
    },
  },
};

/**
 * Shared Ember — Personify.
 * When you Personify from your hand, reveal the top card of your deck. If it is
 * a Unit, special call it to an Ally Zone. Otherwise, place it on the
 * bottom of your deck.
 * auto switch — at personify.
 */
const sharedEmber: CardScript = {
  id: 'agta/shared-ember',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'auto',
      trigger: 'personify',
      text: 'When you Personify from your hand, reveal the top two cards of your deck. Special call one Unit among them to an Ally Zone. Place the rest on the bottom of your deck.',
      canRun: (ctx) => {
        if (!ctx.event?.unit) return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const count = Math.min(2, ps.deck.length);
        if (count === 0) return;
        const topUids = ps.deck.splice(0, count);
        const units = topUids.filter((uid) => isUnitCard(def(ctx.index, ctx.game, uid)));
        let calledUid: string | null = null;
        if (units.length > 0) {
          calledUid =
            units.length === 1
              ? units[0]!
              : await ctx.chooser.chooseTarget(
                  ctx.me,
                  'Shared Ember: Special call which Unit?',
                  units,
                );
          if (calledUid) {
            await specialCall(ctx, calledUid);
            log(
              ctx.game,
              `Shared Ember: Special called ${def(ctx.index, ctx.game, calledUid).name}.`,
              [calledUid],
            );
          }
        }
        for (const uid of topUids) {
          if (uid === calledUid) continue;
          ps.deck.push(uid);
          inst(ctx.game, uid).zone = 'deck';
        }
      },
    },
  },
};

/**
 * Thousand Knots — Sipol Reroll (passive).
 * If you Sipol during your Main, if the revealed card was not a Unit,
 * you may reveal the next card of your deck instead (reroll once).
 * Place the non-Unit card on the bottom of your deck.
 * The reroll logic is implemented in sipol() in effects.ts.
 * auto switch — at the start of main.
 */
const thousandKnots: CardScript = {
  id: 'agta/thousand-knots',
  codex: {
    autoSwitchOn: 'startOfMain',
    skill: {
      type: 'continuous',
      text: 'When you Sipol during your Main, if the revealed card was not a Unit, [Cost: send that card to the bottom of the deck] reveal one more.',
      canRun: () => true,
      run: async () => {
        // Passive — the reroll is handled inside sipol() in effects.ts.
      },
    },
  },
};

/**
 * Listening Canopy — When Persona attacks.
 * [1/turn]: When your Persona attacks, [Cost: 1 Energy] Sipol 1. A Unit called
 * by this effect gets Power +2000 until end of turn.
 * Bayanihan bonus: If Bayanihan is released, all your Units get Power +2000
 * until end of turn.
 * auto switch — when persona attacks.
 */
const listeningCanopy: CardScript = {
  id: 'agta/listening-canopy',
  codex: {
    autoSwitchOn: 'personaAttack',
    skill: {
      type: 'auto',
      trigger: 'personaAttack',
      text: '[1/turn]: When your Persona attacks, [Cost: 1 Energy] Sipol 1. A Unit called by this effect gets Power +2000 until end of turn. If Bayanihan is released, all your Units get Power +2000 until end of turn.',
      canRun: (ctx) => {
        if (ctx.event?.unit !== you(ctx.game, ctx.me).persona) return false;
        if (you(ctx.game, ctx.me).energy < 1) return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1) return;
        spendEnergy(ctx, 1);
        const before = ps.allies.filter((uid): uid is string => !!uid);
        const called = await sipol(ctx);
        if (called) {
          // Buff the unit this Sipol actually called — not the last ally by
          // slot order, which is a different unit when the call fills a gap.
          const after = ps.allies.filter((uid): uid is string => !!uid);
          const fresh = after.find((uid) => !before.includes(uid));
          if (fresh) {
            buffPower(ctx, fresh, 2000);
            log(ctx.game, `Listening Canopy: ${def(ctx.index, ctx.game, fresh).name} gets +2000.`, [fresh]);
          }
        }
        // Printed as "If Bayanihan is released" — the state being up is enough;
        // it does not have to have been released by this Sipol, and it is not
        // conditional on a unit being called.
        if (bayanihanOn(ctx)) {
          const allUnits = myUnits(ctx);
          for (const uid of allUnits) buffPower(ctx, uid, 2000);
          log(ctx.game, `Listening Canopy: Bayanihan — all ${allUnits.length} units get +2000.`, []);
        }
      },
    },
  },
};

/**
 * Returning River — When a Barrier is broken.
 * [1/turn]: When your Barrier is broken by a non-Force check card, reveal the
 * top two cards of your deck. Choose up to one Unit card from among them and
 * special call it to an Ally Zone as exhausted. Place the remaining cards
 * on the bottom of your deck.
 * auto switch — when persona is attacked.
 */
const returningRiver: CardScript = {
  id: 'agta/returning-river',
  codex: {
    autoSwitchOn: 'personaAttacked',
    skill: {
      type: 'auto',
      trigger: 'barrierBroken',
      text: 'When your Barrier is broken and it is not a Force card, reveal the top two cards of your deck. Choose up to one Unit and special call it to an Ally Zone as exhausted. Place the rest on the bottom.',
      canRun: (ctx) => {
        // Only trigger if the broken barrier's check card was NOT a Force.
        const revealed = ctx.event?.revealed;
        if (revealed && def(ctx.index, ctx.game, revealed).type === 'Force') return false;
        const ps = you(ctx.game, ctx.me);
        return ps.deck.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const count = Math.min(2, ps.deck.length);
        const topUids = ps.deck.splice(0, count);
        const units = topUids.filter((uid) => isUnitCard(def(ctx.index, ctx.game, uid)));
        if (units.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Returning River: Special call which Unit? (enters exhausted, or cancel)', units,
          );
          if (pick) {
            await specialCall(ctx, pick);
            inst(ctx.game, pick).exhausted = true;
            log(ctx.game, `Returning River: Special called ${def(ctx.index, ctx.game, pick).name} (exhausted).`, [pick]);
            // Place remaining on bottom.
            const rest = topUids.filter((uid) => uid !== pick);
            for (const uid of rest) {
              ps.deck.push(uid);
              inst(ctx.game, uid).zone = 'deck';
            }
            return;
          }
        }
        // Place all on bottom.
        for (const uid of topUids) {
          ps.deck.push(uid);
          inst(ctx.game, uid).zone = 'deck';
        }
        log(ctx.game, `Returning River: No unit called. Cards to bottom.`, []);
      },
    },
  },
};

// --- registry --------------------------------------------------------------

export const AGTA_SCRIPTS: ScriptRegistry = Object.fromEntries(
  [
    amihan, makisig, laya,
    kislap, kidlat, mayumi, sinta, ulan,
    aya, pilo, berto, sari, nena,
    lunod, pulot, dagsa, salimbay,
    rattanSnarefall, sierrasVanishingTrail,
    banoy,
    hiddenPath, listeningCanopy, returningRiver, sharedEmber, thousandKnots,
  ].map((s) => [s.id, s]),
);
