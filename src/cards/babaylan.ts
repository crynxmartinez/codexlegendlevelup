/**
 * Babaylan deck card scripts — Kaluluwa Tokens, Sanib, Kalas & Andukha.
 *
 * Sanib: Put a card into the Heart zone (from deck, hand, or field).
 * Kalas X: Remove X cards from the Heart (player chooses which). Tokens cease
 *   to exist; other cards go to Grave.
 * Create X Kaluluwa tokens: Generate X Spirit tokens directly in the Heart.
 * Andukha X: Active while Heart contains at least X cards (Baya counts as 2).
 * [Heart]: Ability that activates while the card is in the Heart zone.
 * Charge: Return an exhausted Unit to ready.
 *
 * Personas: 3 (Amaya, Maraya, Lunay)
 * L2: 5 (Salaya, Ilaya, Sidlak, Kadasig, Dalina)
 * L1: 5 (Yana, Nalia, Dayaw, Maliya, Baya)
 * Force: 4, Action: 2, Sentry: 1, Codex: 5
 */
import {
  buffAll,
  buffPower,
  chargeUnit,
  createKaluluwaTokens,
  draw,
  enemyAllies,
  essenceCard,
  essenceFromDeck,
  essenceUnitFromField,
  exhaust,
  hasAndukha,
  kaluluwaCount,
  myAllyUnits,
  myUnits,
  releaseSpirits,
  searchAndCallBabaylan,
  searchAndCallUnit,
  shuffleDeck,
  specialCallFromHeart,
  spendEnergy,
  ventCard,
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
    ctx.me, 'Force: Which unit gets +5000?', targets,
  );
  if (pick) {
    buffPower(ctx, pick, 5000);
    log(ctx.game, `Force: ${def(ctx.index, ctx.game, pick).name} gets +5000.`, [pick]);
  }
}

/** Check if a Babaylan unit exists in deck with level <= maxLevel. */
function deckHasBabaylan(ctx: EffectContext, maxLevel: number): boolean {
  const ps = you(ctx.game, ctx.me);
  return ps.deck.some((uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return d.type === 'Unit' && d.level <= maxLevel && d.subtypes?.includes('Babaylan');
  });
}

/**
 * Babaylan Units of at most `maxLevel` sitting in the Heart.
 *
 * The Heart is the deck's own resource — Sanib fills it and Kalas spends it —
 * so a card that reaches into it is asking you to have built one, where the
 * same search against the deck asks nothing.
 */
function heartBabaylan(ctx: EffectContext, maxLevel: number): string[] {
  return you(ctx.game, ctx.me).heart.filter((uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return d.type === 'Unit' && d.level <= maxLevel && d.subtypes?.includes('Babaylan');
  });
}

/** Check if there's an open ally slot. */
function hasOpenSlot(ctx: EffectContext): boolean {
  return you(ctx.game, ctx.me).allies.some((s) => s === null);
}

/** Check if a unit exists in Heart. */
function heartHasUnit(ctx: EffectContext): boolean {
  const ps = you(ctx.game, ctx.me);
  return ps.heart.some((uid) => def(ctx.index, ctx.game, uid).type === 'Unit');
}

// --- Level 3 Personas ------------------------------------------------------

/** Heart of the Twelve Spirits, Amaya: extra Kaluluwa on first essence + Andukha 9 draw. */
const amaya: CardScript = {
  id: 'babaylan/heart-of-the-twelve-spirits-amaya',
  abilities: [
    {
      text: '[Persona] 1/Turn: The first time during your turn that you put cards into Heart, create 1 Kaluluwa token and Sanib it.',
      scope: ['Persona'],
      trigger: 'spiritsGenerated',
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // "during your turn" is printed on the card and has to be checked:
        // spirits can be generated on the opponent's turn too (Storm Altar of
        // Madja-as fires when your Barrier is broken, which is their turn).
        if (ctx.game.turnPlayer !== ctx.me) return false;
        return !ps.amayaExtraSpiritUsed && ctx.event?.unit !== ctx.source;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        ps.amayaExtraSpiritUsed = true;
        createKaluluwaTokens(ctx, 1);
      },
    },
    {
      text: '[Andukha 9][Persona] 1/Turn: [Cost: 1 Energy & Kalas 2] draw two cards, then Sanib 1 card from hand. If you have Andukha 9, this Unit gets Power +10000 until end of turn.',
      scope: ['Persona'],
      perTurn: 1,
      requiresState: 'Andukha',
      canRun: (ctx) => {
        if (!hasAndukha(ctx, 9)) return false;
        const ps = you(ctx.game, ctx.me);
        return ps.energy >= 1 && ps.heart.length >= 2 && ps.hand.length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1 || !(await releaseSpirits(ctx, 2))) return;
        spendEnergy(ctx, 1);
        await draw(ctx, 2);
        // Sanib 1 card from hand.
        if (ps.hand.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Amaya: Sanib which card from hand?', [...ps.hand],
          );
          if (pick) {
            essenceCard(ctx, pick);
          }
        }
        // +10000 power if Andukha 9.
        if (hasAndukha(ctx, 9) && ps.persona) {
          buffPower(ctx, ps.persona, 10000);
          log(ctx.game, `Amaya: Persona gets +10000 power.`, [ps.persona]);
        }
      },
    },
  ],
};

/** Spear of the Emerald Tide, Maraya: search call + Andukha 9 charge on attack. */
const maraya: CardScript = {
  id: 'babaylan/spear-of-the-emerald-tide-maraya',
  abilities: [
    {
      text: '[Persona] 1/Turn: [Cost: 1 Energy & Kalas 2] search your deck for a Level 2 or lower Babaylan Unit, special call it to an Ally Zone, then shuffle your deck.',
      scope: ['Persona'],
      perTurn: 1,
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        return ps.energy >= 1 && ps.heart.length >= 2 && hasOpenSlot(ctx) && deckHasBabaylan(ctx, 2);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1 || !(await releaseSpirits(ctx, 2))) return;
        spendEnergy(ctx, 1);
        await searchAndCallBabaylan(ctx, 2);
      },
    },
    {
      text: '[Andukha 9][Persona] 1/Turn: When this Unit attacks, [Cost: 2 Energy & Kalas 3] choose up to two exhausted Babaylan Allies and Charge them. If Andukha 12, those units get Power +5000 until end of turn.',
      scope: ['Persona'],
      trigger: 'personaAttack',
      perTurn: 1,
      requiresState: 'Andukha',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!hasAndukha(ctx, 9)) return false;
        const ps = you(ctx.game, ctx.me);
        return ps.energy >= 2 && ps.heart.length >= 3;
      },
      run: async (ctx) => {
        const hadA12 = hasAndukha(ctx, 12);
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 2 || !(await releaseSpirits(ctx, 3))) return;
        spendEnergy(ctx, 2);
        const exhaustedBabaylan = myAllyUnits(ctx).filter((uid) => {
          const c = inst(ctx.game, uid);
          return c.exhausted && def(ctx.index, ctx.game, uid).subtypes?.includes('Babaylan');
        });
        for (let i = 0; i < 2 && exhaustedBabaylan.length > 0; i++) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, `Maraya: Charge which exhausted Babaylan Ally? (${i + 1}/2)`, exhaustedBabaylan,
          );
          if (!pick) break;
          exhaustedBabaylan.splice(exhaustedBabaylan.indexOf(pick), 1);
          chargeUnit(ctx, pick);
          if (hadA12) buffPower(ctx, pick, 5000);
        }
      },
    },
  ],
};

/** Vessel Beneath the Moon, Lunay: Andukha 12 essence units to search call. */
const lunay: CardScript = {
  id: 'babaylan/vessel-beneath-the-moon-lunay',
  abilities: [
    {
      text: '[Persona]: At the start of your Battle Phase, create 1 Kaluluwa token. If all four Ally Zones are occupied, create 1 additional Kaluluwa token.',
      scope: ['Persona'],
      trigger: 'startOfBattle',
      canRun: (ctx) => ctx.event?.unit === ctx.source || ctx.event?.name === 'startOfBattle',
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        let amount = 1;
        if (ps.allies.every((s) => s !== null)) amount = 2;
        createKaluluwaTokens(ctx, amount);
      },
    },
    {
      text: "[Andukha 12][Persona] 1/Turn: At the end of the battle in which this Unit attacked your opponent's Persona, [Cost: 1 Energy & Sanib up to 4 of your Units] search your deck for 1 Unit, special call it. If you Sanib 4, call 2 instead.",
      scope: ['Persona'],
      trigger: 'attackResolved',
      perTurn: 1,
      requiresState: 'Andukha',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!hasAndukha(ctx, 12)) return false;
        const ps = you(ctx.game, ctx.me);
        // Need at least 1 ally to essence, and either an open slot or
        // allies to essence (essencing opens slots for the search call).
        return ps.energy >= 1 && myAllyUnits(ctx).length > 0;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1) return;
        spendEnergy(ctx, 1);
        // Choose up to 4 units to essence.
        const allies = myAllyUnits(ctx);
        const essenced: string[] = [];
        for (let i = 0; i < 4 && allies.length > 0; i++) {
          const remaining = allies.filter((uid) => !essenced.includes(uid));
          if (remaining.length === 0) break;
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, `Lunay: Sanib which Unit? (${i + 1}/4, or cancel to stop)`, remaining,
          );
          if (!pick) break;
          essenced.push(pick);
          essenceUnitFromField(ctx, pick);
        }
        // Search for 1 unit (or 2 if essenced 4).
        const callCount = essenced.length >= 4 ? 2 : 1;
        for (let i = 0; i < callCount; i++) {
          if (!hasOpenSlot(ctx)) break;
          await searchAndCallUnit(ctx, 3);
        }
      },
    },
  ],
};

// --- Level 2 Units ---------------------------------------------------------

/** Lantern of the Mangrove Gate, Salaya: [Heart] special call on persona attack. */
const salaya: CardScript = {
  id: 'babaylan/lantern-of-the-mangrove-gate-salaya',
  abilities: [
    {
      text: '[Heart] 1/Turn: When your Persona attacks, [Cost: 2 Energy] special call this card from Heart. Then create 2 Kaluluwa tokens and Sanib them. If you have Andukha 9 or greater, this Unit gets Power +5000 until end of turn.',
      scope: ['Heart'],
      trigger: 'personaAttack',
      perTurn: 1,
      canRun: (ctx) => {
        // Only while in Heart.
        const c = ctx.source ? inst(ctx.game, ctx.source) : null;
        if (!c || c.zone !== 'heart') return false;
        if (ctx.event?.unit !== you(ctx.game, ctx.me).persona) return false;
        return you(ctx.game, ctx.me).energy >= 2 && hasOpenSlot(ctx);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 2) return;
        spendEnergy(ctx, 2);
        // Special call this card from Heart.
        const called = await specialCallFromHeart(ctx, ctx.source!);
        if (!called) return;
        createKaluluwaTokens(ctx, 2);
        if (hasAndukha(ctx, 9)) {
          buffPower(ctx, ctx.source!, 5000);
        }
      },
    },
  ],
};

/** Keeper of the Spirit Bowl, Ilaya: search call + essence the searched unit. */
const ilaya: CardScript = {
  id: 'babaylan/keeper-of-the-spirit-bowl-ilaya',
  abilities: [
    {
      text: '[Ally] 1/Turn: [Cost: 2 Energy] search your deck for a Level 1 or lower Babaylan Unit, Sanib it, then shuffle your deck.',
      scope: ['Ally'],
      perTurn: 1,
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        return ps.energy >= 2 && deckHasBabaylan(ctx, 1);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 2) return;
        spendEnergy(ctx, 2);
        // Search for a L1 Babaylan unit, then essence it (to Heart).
        const candidates = ps.deck.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level <= 1 && d.subtypes?.includes('Babaylan');
        });
        if (candidates.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Ilaya: Search and Sanib which Babaylan Unit (L1 or lower)?', candidates,
        );
        if (!pick) return;
        ps.deck.splice(ps.deck.indexOf(pick), 1);
        shuffleDeck(ctx.game, ctx.me);
        essenceCard(ctx, pick);
      },
    },
  ],
};

/** Bell Dancer of the Tides, Sidlak: Charge on battle-phase special call + Andukha 9 buff. */
const sidlak: CardScript = {
  id: 'babaylan/bell-dancer-of-the-tides-sidlak',
  abilities: [
    {
      text: '[Ally] 1/Turn: When another Babaylan Unit is special called during your Battle Phase, [Cost: 1 Energy] Charge this Unit. If you have Andukha 9 or greater, this Unit gets Power +5000 until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit === ctx.source) return false;
        if (ctx.event?.special !== true) return false;
        // Printed: "during your Battle Phase".
        if (ctx.game.phase !== 'battle' || ctx.game.turnPlayer !== ctx.me) return false;
        const calledD = def(ctx.index, ctx.game, ctx.event?.unit ?? '');
        if (!calledD?.subtypes?.includes('Babaylan')) return false;
        return you(ctx.game, ctx.me).energy >= 1;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1) return;
        spendEnergy(ctx, 1);
        chargeUnit(ctx, ctx.source);
        if (hasAndukha(ctx, 9)) {
          buffPower(ctx, ctx.source, 5000);
        }
      },
    },
  ],
};

/** Spear Between Two Worlds, Kadasig: call from Heart on attack + Andukha 12 buff. */
const kadasig: CardScript = {
  id: 'babaylan/spear-between-two-worlds-kadasig',
  abilities: [
    {
      text: '[Ally] 1/Turn: When this Unit attacks, [Cost: 2 Energy] check your Heart, special call 1 Unit from among them. If Andukha 12 or greater, this and that Unit get Power +5000 until end of turn.',
      scope: ['Ally'],
      trigger: 'attack',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        const ps = you(ctx.game, ctx.me);
        return ps.energy >= 2 && heartHasUnit(ctx) && hasOpenSlot(ctx);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 2) return;
        spendEnergy(ctx, 2);
        const heartUnits = ps.heart.filter((uid) => def(ctx.index, ctx.game, uid).type === 'Unit');
        if (heartUnits.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Kadasig: Special call which Unit from Heart?', heartUnits,
        );
        if (!pick) return;
        const hadA12 = hasAndukha(ctx, 12);
        await specialCallFromHeart(ctx, pick);
        if (hadA12) {
          buffPower(ctx, ctx.source!, 5000);
          buffPower(ctx, pick, 5000);
        }
      },
    },
  ],
};

/** Reader of Moonlit Currents, Dalina: power per card in Heart. */
const dalina: CardScript = {
  id: 'babaylan/reader-of-moonlit-currents-dalina',
  abilities: [
    {
      text: '[Ally] 1/Turn: When this Unit is placed, [Cost: 1 Energy] this Unit gets Power +1000 for each card in Heart until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        return you(ctx.game, ctx.me).energy >= 1;
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1) return;
        spendEnergy(ctx, 1);
        // Count effective heart cards (Baya = 2).
        let heartCount = 0;
        for (const uid of ps.heart) {
          heartCount += def(ctx.index, ctx.game, uid).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
        }
        const bonus = heartCount * 1000;
        if (bonus > 0) {
          buffPower(ctx, ctx.source, bonus);
          log(ctx.game, `Dalina: +${bonus} power (${heartCount} cards in Heart).`, [ctx.source]);
        }
      },
    },
  ],
};

// --- Level 1 Units ---------------------------------------------------------

/** Shell Bell Initiate, Yana: create 1 Kaluluwa token on placed. */
const yana: CardScript = {
  id: 'babaylan/shell-bell-initiate-yana',
  abilities: [
    {
      text: '[Ally]: When this Unit is placed, create 1 Kaluluwa token and Sanib it.',
      scope: ['Ally'],
      trigger: 'placed',
      canRun: (ctx) => ctx.event?.unit === ctx.source,
      run: async (ctx) => {
        createKaluluwaTokens(ctx, 1);
      },
    },
  ],
};

/** Reader of Shallow Waters, Nalia: essence self at end of turn if supported. */
const nalia: CardScript = {
  id: 'babaylan/reader-of-shallow-waters-nalia',
  abilities: [
    {
      text: '[Ally]: When this Unit supports a Babaylan Unit, mark it.',
      scope: ['Ally'],
      trigger: 'supported',
      canRun: (ctx) => {
        if (ctx.event?.name !== 'supported') return false;
        const supporters = ctx.event?.supporters;
        if (!supporters || !supporters.includes(ctx.source!)) return false;
        // Check if the attacker (supported unit) is a Babaylan.
        const attackerD = def(ctx.index, ctx.game, ctx.event?.unit ?? '');
        return attackerD?.subtypes?.includes('Babaylan') === true;
      },
      run: async (ctx) => {
        inst(ctx.game, ctx.source!).supportedBabaylan = true;
      },
    },
    {
      text: '[Ally]: At the end of your turn, if this Unit supported a Babaylan Unit this turn, Sanib this Unit.',
      scope: ['Ally'],
      trigger: 'endOfTurn',
      canRun: (ctx) => {
        if (ctx.event?.name !== 'endOfTurn') return false;
        const c = inst(ctx.game, ctx.source!);
        return c.zone === 'ally' && !!c.supportedBabaylan;
      },
      run: async (ctx) => {
        essenceUnitFromField(ctx, ctx.source!);
      },
    },
  ],
};

/** Weaver of the Spirit Threads, Dayaw: power per essence this turn. */
const dayaw: CardScript = {
  id: 'babaylan/weaver-of-the-spirit-threads-dayaw',
  abilities: [
    {
      text: '[Ally]: Each time you put cards into Heart this turn, this Unit gets Power +2000 until end of turn.',
      scope: ['Ally'],
      trigger: 'spiritsGenerated',
      canRun: (ctx) => ctx.event?.unit !== ctx.source,
      run: async (ctx) => {
        buffPower(ctx, ctx.source, 2000);
        log(ctx.game, `Dayaw: +2000 power.`, [ctx.source]);
      },
    },
  ],
};

/** Keeper of the Mangrove Remedies, Maliya: [Heart] vent itself for Kaluluwa. */
const maliya: CardScript = {
  id: 'babaylan/keeper-of-the-mangrove-remedies-maliya',
  abilities: [
    {
      text: '[Heart]: [Cost: Kalas this card] Create 2 Kaluluwa tokens and Sanib them.',
      scope: ['Heart'],
      canRun: (ctx) => {
        const c = ctx.source ? inst(ctx.game, ctx.source) : null;
        return !!c && c.zone === 'heart';
      },
      run: async (ctx) => {
        ventCard(ctx, ctx.source!);
        createKaluluwaTokens(ctx, 2);
      },
    },
  ],
};

/** Drummer of the First Calling, Baya: counts as 2 in Heart. */
const baya: CardScript = {
  id: 'babaylan/drummer-of-the-first-calling-baya',
  abilities: [
    {
      text: '[Heart]: This card is counted as 2 cards in Heart.',
      scope: ['Heart'],
      canRun: () => false, // Passive — handled by spiritCount/andukhaPowerBonus.
      run: async () => {},
    },
  ],
};

// --- Force Cards -----------------------------------------------------------

const isara: CardScript = {
  id: 'babaylan/smoke-tender-of-the-mangrove-altar-isara',
  forceModes: [
    { label: 'Choose one of your Units; it gets Power +5000 until end of turn.', run: forceBuffMode },
    {
      label: 'Exhaust up to one Charged opposing Ally Unit.',
      run: async (ctx) => {
        const targets = enemyAllies(ctx).filter((uid) => !inst(ctx.game, uid).exhausted);
        if (targets.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Isara: Exhaust which opposing Ally? (or cancel)', targets,
        );
        if (pick) {
          exhaust(ctx, [pick]);
          log(ctx.game, `Isara: Exhausted ${def(ctx.index, ctx.game, pick).name}.`, [pick]);
        }
      },
    },
  ],
};

const danira: CardScript = {
  id: 'babaylan/banner-bearer-of-ancestral-path-danira',
  forceModes: [
    { label: 'Choose one of your Units; it gets Power +5000 until end of turn.', run: forceBuffMode },
    {
      label: 'All your Units get Power +2000 until end of turn.',
      run: async (ctx) => {
        buffAll(ctx, 2000);
        log(ctx.game, `Danira: All units get +2000.`, []);
      },
    },
  ],
};

const sulaya: CardScript = {
  id: 'babaylan/pearl-diver-of-the-spirit-shoal-sulaya',
  forceModes: [
    { label: 'Choose one of your Units; it gets Power +5000 until end of turn.', run: forceBuffMode },
    {
      label: 'Draw one card.',
      run: async (ctx) => {
        await draw(ctx, 1);
        log(ctx.game, `Sulaya: Drew a card.`, []);
      },
    },
  ],
};

const hilaya: CardScript = {
  id: 'babaylan/morning-offering-bearer-hilaya',
  forceModes: [
    { label: 'Choose one of your Units; it gets Power +5000 until end of turn.', run: forceBuffMode },
    {
      label: 'Create 2 Kaluluwa tokens.',
      run: async (ctx) => {
        createKaluluwaTokens(ctx, 2);
      },
    },
  ],
};

// --- Action Cards ----------------------------------------------------------

const whispersGather: CardScript = {
  id: 'babaylan/whispers-gather-in-the-heart',
  action: {
    energyCost: 2,
    canRun: (ctx) => you(ctx.game, ctx.me).energy >= 2,
    run: async (ctx) => {
      createKaluluwaTokens(ctx, 2);
      if (hasAndukha(ctx, 9)) {
        const babaylanUnits = myUnits(ctx).filter((uid) =>
          def(ctx.index, ctx.game, uid).subtypes?.includes('Babaylan'),
        );
        if (babaylanUnits.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Whispers: Which Babaylan Unit gets +5000?', babaylanUnits,
          );
          if (pick) {
            buffPower(ctx, pick, 5000);
            log(ctx.game, `Whispers: ${def(ctx.index, ctx.game, pick).name} gets +5000.`, [pick]);
          }
        }
      }
    },
  },
};

/**
 * The Ancestors Open the Way — out of the Heart, not the deck.
 *
 * It used to be Maraya's first skill printed on a card: the same search of the
 * same deck for the same Level 2 or lower Babaylan. Reading the Heart instead
 * makes it a different card — it costs nothing to hold but only pays once you
 * have Sanib something worth calling back, which is the loop this deck is
 * built around.
 */
const theAncestorsOpenTheWay: CardScript = {
  id: 'babaylan/the-ancestors-open-the-way',
  action: {
    energyCost: 2,
    canRun: (ctx) =>
      you(ctx.game, ctx.me).energy >= 2
      && hasOpenSlot(ctx)
      && heartBabaylan(ctx, 2).length > 0,
    run: async (ctx) => {
      const candidates = heartBabaylan(ctx, 2);
      if (!candidates.length) return;
      const pick = await ctx.chooser.chooseTarget(
        ctx.me,
        'The Ancestors Open the Way: call which Unit out of your Heart?',
        candidates,
      );
      if (!pick) return;
      // Moves the card, fires the placed trigger and writes its own log line.
      specialCallFromHeart(ctx, pick);
    },
  },
};

// --- Sentry ----------------------------------------------------------------

const bituon: CardScript = {
  id: 'babaylan/warden-of-the-twelfth-tide-bituon', sentry: true,
  abilities: [{
    text: '[Battle] Exile this card face down: nullify an attack against your Persona. Then create 1 Kaluluwa in your Heart, or 2 if Andukha 9 was active when you committed this card.',
    scope: ['Hand'],
    prepare: async ctx => ({ cards: [], data: { tokens: hasAndukha(ctx, 9) ? 2 : 1 } }),
    run: async ctx => { createKaluluwaTokens(ctx, Number(ctx.activation?.data.tokens ?? (hasAndukha(ctx, 9) ? 2 : 1))); },
  }],
};

// --- Codex Cards ------------------------------------------------------------

/**
 * Heart Spring Beneath the Ancient Balete — Draw replacement.
 * Auto-switch at start of turn.
 * Replace your draw with: Sanib 1 card from top of deck.
 */
const heartSpring: CardScript = {
  id: 'babaylan/heart-spring-beneath-the-ancient-balete',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'replacement',
      text: 'At your Draw Step, instead of drawing, Sanib 2 cards from the top of your deck.',
      canRun: (ctx) => you(ctx.game, ctx.me).deck.length > 0,
      run: async (ctx) => {
        essenceFromDeck(ctx, 2);
      },
    },
  },
};

/**
 * The Ancestral Caverns of Samar — Personify search + essence.
 * Auto-switch at start of turn.
 * When you Personify to a Level 3+ unit, search your deck for a unit, reveal
 * it, then Sanib it.
 */
const ancestralCaverns: CardScript = {
  id: 'babaylan/the-ancestral-caverns-of-samar',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'auto',
      trigger: 'personify',
      text: 'When you Personify to a Level 3 or higher unit, you may personify from Heart. Then choose one card from hand and Sanib it.',
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // Must have a Level 3+ unit in Heart to personify from.
        return ps.heart.some((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level >= 3;
        });
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // Choose a Level 3+ unit from Heart to personify.
        const eligible = ps.heart.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level >= 3;
        });
        if (eligible.length === 0) return;

        const chosen = await ctx.chooser.chooseTarget(
          ctx.me,
          'Ancestral Caverns: Choose a Level 3+ unit from Heart to personify',
          eligible,
        );
        if (!chosen) return;

        // Personify from Heart. The old Persona goes to the Heart, as with
        // every other Personify (game-rules.md §11).
        const oldPersona = ps.persona;
        if (oldPersona) moveCard(ctx.game, oldPersona, 'heart');
        ps.persona = chosen;
        ps.heart = ps.heart.filter((uid) => uid !== chosen);
        inst(ctx.game, chosen).zone = 'persona';

        const d = def(ctx.index, ctx.game, chosen);
        log(ctx.game, `Ancestral Caverns: Personified ${d.name} from Heart.`, [chosen]);

        // Choose one card from hand and Sanib it.
        if (ps.hand.length > 0) {
          const toEssence = await ctx.chooser.chooseTarget(
            ctx.me,
            'Ancestral Caverns: Choose one card from hand to Sanib',
            ps.hand,
          );
          if (toEssence) {
            essenceCard(ctx, toEssence);
            const dd = def(ctx.index, ctx.game, toEssence);
            log(ctx.game, `Ancestral Caverns: Sanib ${dd.name} from hand.`, [toEssence]);
          }
        }
      },
    },
  },
};

/**
 * The Healing Grove of Bandilaan — Special call → Kaluluwa.
 * Auto-switch at start of turn.
 * During your Main Phase, each time you special call a unit/token to the field,
 * create a Kaluluwa token and Sanib it.
 */
const healingGrove: CardScript = {
  id: 'babaylan/the-healing-grove-of-bandilaan',
  codex: {
    autoSwitchOn: 'startOfMain',
    skill: {
      type: 'auto',
      trigger: 'placed',
      text: 'Each time you special call a unit from deck or Heart, create a Kaluluwa token and Sanib it.',
      canRun: (ctx) => {
        if (ctx.event?.special !== true) return false;
        return ctx.event?.from === 'deck' || ctx.event?.from === 'heart';
      },
      run: async (ctx) => {
        createKaluluwaTokens(ctx, 1);
      },
    },
  },
};

/**
 * The Sacred Crown of Kanlaon — Persona attack bonuses.
 * Auto-switch when Persona attacks.
 * When your Persona attacks, it gains bonuses per number of cards in Heart:
 * 6+ → +5000 power. 12+ → opponent cannot call Level 2+ to defense.
 * 20+ → opponent cannot call Level 1+ to defense.
 */
const sacredCrown: CardScript = {
  id: 'babaylan/the-sacred-crown-of-kanlaon',
  codex: {
    autoSwitchOn: 'personaAttack',
    skill: {
      type: 'auto',
      trigger: 'personaAttack',
      text: 'When your Persona attacks, it gains bonuses per cards in Heart:\n\u2022 6+ \u2014 Persona gets Power +5000.\n\u2022 12+ \u2014 Opponent cannot call Level 2 or higher to defense.\n\u2022 20+ \u2014 Opponent cannot call Level 1 or higher to defense.',
      canRun: (ctx) => {
        if (ctx.event?.unit !== you(ctx.game, ctx.me).persona) return false;
        return hasAndukha(ctx, 6);
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        let heartCount = 0;
        for (const uid of ps.heart) {
          heartCount += def(ctx.index, ctx.game, uid).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
        }
        if (heartCount >= 6 && ps.persona) {
          buffPower(ctx, ps.persona, 5000);
          log(ctx.game, `Sacred Crown: Persona gets +5000 (${heartCount} cards in Heart).`, [ps.persona]);
        }
        const battle = ctx.game.activeBattle;
        if (battle && heartCount >= 12) {
          battle.maxBlockLevel = 1;
          log(ctx.game, `Sacred Crown: Opponent cannot call Level 2+ to defense.`);
          if (heartCount >= 20) {
            battle.maxBlockLevel = 0;
            log(ctx.game, `Sacred Crown: Opponent cannot call Level 1+ to defense.`);
          }
        }
      },
    },
  },
};

/**
 * The Storm Altar of Madja-as — Barrier broken recovery.
 * Auto-switch when Persona is being attacked.
 * When your Barrier is broken and it's not a Force card, create 2 Kaluluwa
 * tokens and Sanib them. If you have 10+ Kaluluwa tokens, draw 1 card.
 */
const stormAltar: CardScript = {
  id: 'babaylan/the-storm-altar-of-madja-as',
  codex: {
    autoSwitchOn: 'personaAttacked',
    skill: {
      type: 'auto',
      trigger: 'barrierBroken',
      text: 'When your Barrier is broken and it is not a Force card, create 1 Kaluluwa token and Sanib it. If you have 10 or more Kaluluwa tokens, draw 1 card.',
      canRun: (ctx) => {
        const revealed = ctx.event?.revealed;
        if (revealed) {
          const d = def(ctx.index, ctx.game, revealed);
          if (d.type === 'Force') return false;
        }
        return true;
      },
      run: async (ctx) => {
        createKaluluwaTokens(ctx, 1);
        if (kaluluwaCount(ctx) >= 10) {
          await draw(ctx, 1);
          log(ctx.game, `Storm Altar: 10+ Kaluluwa tokens \u2014 drew 1 card.`);
        }
      },
    },
  },
};

// --- helper for action cards ---

// --- Registry --------------------------------------------------------------

const registry: ScriptRegistry = {
  'babaylan/heart-of-the-twelve-spirits-amaya': amaya,
  'babaylan/spear-of-the-emerald-tide-maraya': maraya,
  'babaylan/vessel-beneath-the-moon-lunay': lunay,
  'babaylan/lantern-of-the-mangrove-gate-salaya': salaya,
  'babaylan/keeper-of-the-spirit-bowl-ilaya': ilaya,
  'babaylan/bell-dancer-of-the-tides-sidlak': sidlak,
  'babaylan/spear-between-two-worlds-kadasig': kadasig,
  'babaylan/reader-of-moonlit-currents-dalina': dalina,
  'babaylan/shell-bell-initiate-yana': yana,
  'babaylan/reader-of-shallow-waters-nalia': nalia,
  'babaylan/weaver-of-the-spirit-threads-dayaw': dayaw,
  'babaylan/keeper-of-the-mangrove-remedies-maliya': maliya,
  'babaylan/drummer-of-the-first-calling-baya': baya,
  'babaylan/smoke-tender-of-the-mangrove-altar-isara': isara,
  'babaylan/banner-bearer-of-ancestral-path-danira': danira,
  'babaylan/pearl-diver-of-the-spirit-shoal-sulaya': sulaya,
  'babaylan/morning-offering-bearer-hilaya': hilaya,
  'babaylan/whispers-gather-in-the-heart': whispersGather,
  'babaylan/the-ancestors-open-the-way': theAncestorsOpenTheWay,
  'babaylan/warden-of-the-twelfth-tide-bituon': bituon,
  'babaylan/heart-spring-beneath-the-ancient-balete': heartSpring,
  'babaylan/the-sacred-crown-of-kanlaon': sacredCrown,
  'babaylan/the-healing-grove-of-bandilaan': healingGrove,
  'babaylan/the-storm-altar-of-madja-as': stormAltar,
  'babaylan/the-ancestral-caverns-of-samar': ancestralCaverns,
};

export const BABAYLAN_SCRIPTS = registry;
