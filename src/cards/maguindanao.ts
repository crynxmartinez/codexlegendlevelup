/**
 * Maguindanao deck card scripts — redesigned with Offer + Last Oath.
 *
 * Offer: Send one of your Allies from the field to the Grave as a skill cost.
 * Last Oath: A skill that activates when that unit is Offered.
 * Garahana: Released while your Grave contains 5+ Maguindanaon unit cards.
 *
 * Personas: 4 (Blood Moon Bai-A-Labi, Datu Salik, Veiled Eclipse Maharaja, Pah)
 * L2: 6 (Nuraya, Jamal, Samira, Harun, Farid, Zafir)
 * L1: 6 (Mayla, Hakim, Sitti Rahma, Nasser, Kamil, Sitti Maira)
 * Force: 4, Action: 2, Sentry: 1, Codex: 5
 *
 * Pah, Zafir and Sitti Maira are in the card library but not in
 * decks/maguindanao.json — the shipped fifty is a tested list and adding to it
 * is a separate decision from adding to the pool.
 */
import {
  // Maguindanao-specific atoms
  damageUnitByAbility,
  buffAll,
  buffPower,
  chargeUnit,
  draw,
  garahanaOn,
  enemyAllies,
  exhaust,
  graveUnitCount,
  isUnitCard,
  offerTotal,
  offerValue,
  millTop,
  myAllyUnits,
  myUnits,
  offerUnit,
  specialCall,
  spendEnergy,
  type EffectContext,
} from '../core/effects.js';
import { def, inst, log, moveCard, you as legacyPlayerState, currentPower } from '../core/state.js';

// Historical printings are unavailable to new matches; retained for old fixtures.
const you = (...args: Parameters<typeof legacyPlayerState>) => legacyPlayerState(...args) as ReturnType<typeof legacyPlayerState> & { energy: number };
import type { CardScript, ScriptRegistry } from './types.js';

// --- shared helpers --------------------------------------------------------

/** Mode A of every Force card: give one of your units +5000. */
async function forceBuffMode(ctx: EffectContext): Promise<void> {
  const targets = myUnits(ctx);
  if (!targets.length) return;
  const pick = await ctx.chooser.chooseTarget(
    ctx.me, 'Give a unit +5000 until end of turn', targets,
  );
  if (pick) buffPower(ctx, pick, 5000);
}

/** Pick one of your own ally units to Offer. Returns uid or null. */
async function pickOwnUnitToOffer(
  ctx: EffectContext,
  prompt = 'Offer which of your units?',
): Promise<string | null> {
  const targets = myAllyUnits(ctx);
  if (!targets.length) return null;
  return ctx.chooser.chooseTarget(ctx.me, prompt, targets);
}

/** Offer the picked unit. */
function offerPicked(ctx: EffectContext, uid: string): boolean {
  return offerUnit(ctx, uid);
}

/**
 * Total Offer value standing in the controller's Ally Zones.
 *
 * What every "Offer N" cost should be measured against, rather than a head
 * count: two bodies is not the same as two Offer when one of them is Kamil.
 */
function offerableTotal(ctx: EffectContext): number {
  return offerTotal(ctx.index, ctx.game, myAllyUnits(ctx));
}

/**
 * Pick units worth N Offer between them. Returns the picked uids.
 *
 * `count` is the Offer being paid, not a number of cards, and the weights
 * tell the chooser what each candidate contributes — so a single Kamil fills
 * an Offer of 2 and the prompt stops asking.
 */
async function pickUpToNUnitsToOffer(
  ctx: EffectContext,
  n: number,
): Promise<string[]> {
  const targets = myAllyUnits(ctx);
  if (targets.length === 0) return [];
  const weights: Record<string, number> = {};
  for (const uid of targets) weights[uid] = offerValue(ctx.index, ctx.game, uid);
  return ctx.chooser.chooseCards(
    ctx.me, `Offer up to ${n} of your units`, targets,
    Math.min(n, offerableTotal(ctx)), { upTo: true, weights },
  );
}

/** Did the player actually pay an Offer of `n`? */
function paidOffer(ctx: EffectContext, offered: string[], n: number): boolean {
  return offerTotal(ctx.index, ctx.game, offered) >= n;
}


/** Level 3 or higher units sitting in the controller's Grave. */
function graveLevel3(ctx: EffectContext): string[] {
  return you(ctx.game, ctx.me).grave.filter((uid) => {
    const d = def(ctx.index, ctx.game, uid);
    return d.type === 'Unit' && d.level >= 3;
  });
}

/**
 * Put `uid` in the Persona Zone, sending whoever was there to the Grave.
 *
 * The outgoing Persona is read before it moves: `moveCard` clears
 * `ps.persona` on the way out, so naming it afterwards reads null.
 */
function personifyInto(ctx: EffectContext, uid: string): void {
  const ps = you(ctx.game, ctx.me);
  const outgoing = ps.persona;
  if (outgoing && outgoing !== uid) {
    moveCard(ctx.game, outgoing, 'grave');
    log(ctx.game, `${def(ctx.index, ctx.game, outgoing).name} left the field.`, [outgoing]);
  }
  moveCard(ctx.game, uid, 'persona');
  inst(ctx.game, uid).exhausted = false;
}

/** Pick an exhausted enemy ally. Returns uid or null. */
async function pickExhaustedEnemy(ctx: EffectContext, prompt: string): Promise<string | null> {
  const foes = enemyAllies(ctx).filter((uid) => inst(ctx.game, uid).exhausted);
  if (!foes.length) return null;
  return ctx.chooser.chooseTarget(ctx.me, prompt, foes);
}


// --- Personas (L3) — 4 cards, each with 2 skills (one Garahana-locked) ------

/** Blood Moon Bai-A-Labi: deck search + draw/power buff. */
const bloodMoonBaiALabi: CardScript = {
  id: 'maguindanao/blood-moon-bai-a-labi',
  abilities: [
    {
      text: '[Persona] 1/turn: [Cost: 1 Energy] Draw 1. This unit gets Power +3000, until end of turn.',
      scope: ['Persona'],
      perTurn: 1,
      energyCost: 1,
      canRun: (ctx) => you(ctx.game, ctx.me).energy >= 1,
      run: async (ctx) => {
        await draw(ctx, 1);
        buffPower(ctx, ctx.source, 3000);
        log(ctx.game, 'Blood Moon: Drew 1 and gained +3000.', [ctx.source]);
      },
    },
    {
      text: '[Garahana][Persona] 1/turn: When this unit attacks, [Cost: Offer 2 of your units] Draw 2, then this unit gets Power +5000 until end of turn.',
      scope: ['Persona'],
      requiresState: 'Garahana',
      trigger: 'attack',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (!garahanaOn(ctx)) return false;
        return offerableTotal(ctx) >= 2;
      },
      run: async (ctx) => {
        const offered = await pickUpToNUnitsToOffer(ctx, 2);
        if (!paidOffer(ctx, offered, 2)) return;
        for (const uid of offered) offerUnit(ctx, uid);
        await draw(ctx, 2);
        buffPower(ctx, ctx.source, 5000);
        log(ctx.game, 'Blood Moon: Offered 2, drew 2 and gained +5000 (Garahana).', [ctx.source]);
      },
    },
  ],
};

/** Kuta Wato Warcaller, Datu Salik: Offer → call with buff + granted Last Oath + Garahana draw. */
const kutaWatoWarcallerDatuSalik: CardScript = {
  id: 'maguindanao/kuta-wato-warcaller-datu-salik',
  abilities: [
    {
      text: '[Persona] 1/turn: [Cost: Offer 1 of your units] Special call 1 unit from your deck. That unit enters charged.',
      scope: ['Persona'],
      perTurn: 1,
      canRun: (ctx) => {
        if (myAllyUnits(ctx).length < 1) return false;
        return you(ctx.game, ctx.me).deck.some((uid) =>
          isUnitCard(def(ctx.index, ctx.game, uid)));
      },
      run: async (ctx) => {
        const cost = await pickOwnUnitToOffer(ctx, 'Offer which of your units?');
        if (!cost) return;
        offerPicked(ctx, cost);
        const ps = you(ctx.game, ctx.me);
        const deckUnits = ps.deck.filter((uid) => isUnitCard(def(ctx.index, ctx.game, uid)));
        if (deckUnits.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Salik: Special call which unit from your deck?', deckUnits,
        );
        if (!pick) return;
        ps.deck.splice(ps.deck.indexOf(pick), 1);
        await specialCall(ctx, pick);
        chargeUnit(ctx, pick);
        log(ctx.game, `Salik: ${def(ctx.index, ctx.game, pick).name} entered charged.`, [pick]);
      },
    },
    {
      text: '[Garahana][Persona] 1/turn: When this unit attacks, [Cost: Offer 2 of your units] '
        + 'this unit gets Power equal to the Power the offered units had when they were Offered.',
      scope: ['Persona'],
      requiresState: 'Garahana',
      trigger: 'attack',
      perTurn: 1,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        return garahanaOn(ctx) && offerableTotal(ctx) >= 2;
      },
      run: async (ctx) => {
        const offered = await pickUpToNUnitsToOffer(ctx, 2);
        if (!paidOffer(ctx, offered, 2)) return;
        // Read the Power *before* Offering: `offerUnit` sends them to the
        // Grave, and a unit in the Grave has lost every modifier it was
        // carrying. "When they were Offered" is the printed wording and it is
        // the whole difference between this and reading a base stat — a unit
        // buffed this turn is worth more to spend.
        const gained = offered.reduce(
          (n, uid) => n + currentPower(ctx.index, ctx.game, uid), 0,
        );
        for (const uid of offered) offerUnit(ctx, uid);
        if (gained <= 0) return;
        buffPower(ctx, ctx.source, gained);
        log(
          ctx.game,
          `Salik: Offered ${offered.length} for +${gained} power (Garahana).`,
          [ctx.source],
        );
      },
    },
  ],
};

/** Veiled Eclipse Maharaja: Offer → exhaust/damage + Garahana personify on miss. */
const veiledEclipseMaharaja: CardScript = {
  id: 'maguindanao/veiled-eclipse-maharaja',
  abilities: [
    {
      text: '[blue][Persona] 1/turn: [Cost: 1 Energy & exile this unit face up] Choose a '
        + 'Level 3 or higher unit in your Grave and Personify it. Usable only while a '
        + 'Level 3 or higher unit is in your Grave.',
      scope: ['Persona'],
      perTurn: 1,
      energyCost: 1,
      canRun: (ctx) => graveLevel3(ctx).length > 0,
      run: async (ctx) => {
        const candidates = graveLevel3(ctx);
        if (!candidates.length) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Maharaja: Personify into which Level 3 from your Grave?', candidates,
        );
        if (!pick) return;
        // Face up, and that matters: the second skill reads him from exile,
        // so a player has to be able to see him waiting there.
        moveCard(ctx.game, ctx.source, 'exile', { faceDown: false });
        personifyInto(ctx, pick);
        log(
          ctx.game,
          `Maharaja: Exiled himself and Personified into ${def(ctx.index, ctx.game, pick).name}.`,
          [ctx.source, pick],
        );
      },
    },
    {
      text: '[green][Garahana] 1/turn: After your Persona attacks, if the attack did not '
        + 'hit, [Cost: Offer 3 of your units] Personify this unit from exile.',
      // The only ability in the set that fires from exile — he put himself
      // there with the skill above, and this is how he comes back.
      scope: ['Exile'],
      requiresState: 'Garahana',
      trigger: 'attackMiss',
      perTurn: 1,
      canRun: (ctx) => {
        if (!garahanaOn(ctx)) return false;
        if (inst(ctx.game, ctx.source).zone !== 'exile') return false;
        const ps = you(ctx.game, ctx.me);
        // Your Persona's attack, not his own — he is not on the field.
        if (!ps.persona || ctx.event?.unit !== ps.persona) return false;
        return offerableTotal(ctx) >= 3;
      },
      run: async (ctx) => {
        const offered = await pickUpToNUnitsToOffer(ctx, 3);
        if (!paidOffer(ctx, offered, 3)) return;
        for (const uid of offered) offerUnit(ctx, uid);
        personifyInto(ctx, ctx.source);
        log(ctx.game, 'Maharaja: Returned from exile to the Persona Zone (Garahana).', [ctx.source]);
      },
    },
  ],
};


// --- L2 Units — 6 cards ----------------------------------------------------

/** Buluan Inaul Wardkeeper, Dayang Nuraya: buffs when another Ally is Offered. */
const buluanInaulWardkeeperDayangNuraya: CardScript = {
  id: 'maguindanao/buluan-inaul-wardkeeper-dayang-nuraya',
  abilities: [
    {
      text: '[Ally]: Whenever another of your Allies is Offered, choose one of your units. That unit gets Power +5000 for that battle.',
      scope: ['Ally'],
      trigger: 'unitDamagedByAbility',
      canRun: (ctx) => {
        const event = ctx.event;
        if (!event?.unit || event.unit === ctx.source) return false;
        if (event.damager !== ctx.me) return false;
        const owner = ctx.game.cards[event.unit]?.owner;
        return owner === ctx.me && myUnits(ctx).length > 0;
      },
      run: async (ctx) => {
        const targets = myUnits(ctx);
        if (targets.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Nuraya: Which unit gets +5000 for this battle?', targets,
        );
        if (pick) {
          buffPower(ctx, pick, 5000, 'endOfAttack');
          log(ctx.game, `Nuraya: ${def(ctx.index, ctx.game, pick).name} gets +5000 (ally offered).`, [pick]);
        }
      },
    },
  ],
};

/** Illana Lantaka Warder, Panglima Jamal: conditional damage if Offered this turn. */
const illanaLantakaWarderPanglimaJamal: CardScript = {
  id: 'maguindanao/illana-lantaka-warder-panglima-jamal',
  abilities: [
    {
      text: "[Ally] 1/turn: If you Offered an Ally this turn, [Cost: 2 Energy] Damage one of your opponent's exhausted ally units.",
      scope: ['Ally'],
      perTurn: 1,
      energyCost: 2,
      canRun: (ctx) => {
        if (you(ctx.game, ctx.me).unitsOfferedThisTurn === 0) return false;
        if (you(ctx.game, ctx.me).energy < 2) return false;
        return enemyAllies(ctx).some((uid) => inst(ctx.game, uid).exhausted);
      },
      run: async (ctx) => {
        const pick = await pickExhaustedEnemy(ctx, 'Jamal: Damage which exhausted enemy?');
        if (pick) {
          const pickName = def(ctx.index, ctx.game, pick).name;
          damageUnitByAbility(ctx, pick);
          log(ctx.game, `Jamal: Damaged ${pickName}.`, [pick]);
        }
      },
    },
  ],
};

/** Kuta Wato Gate-Bulwark, Bai Samira: treated as 2 Offer and 2 cards in Grave. */
const kutaWatoGateBulwarkBaiSamira: CardScript = {
  id: 'maguindanao/kuta-wato-gate-bulwark-bai-samira',
  abilities: [
    {
      text: '[Grave]: This card is counted as 2 cards.',
      // Scoped to the Grave, which is the only place it does anything: it is
      // Garahana's counter it doubles, not a cost.
      scope: ['Grave'],
      // Passive — resolved by maguindanaoGraveCountRaw in effects.ts, via
      // DOUBLE_GRAVE_IDS.
      canRun: () => false,
      run: async () => {},
    },
  ],
};

/** Liguasan Reed-Eye, Harun: damage enemy on attack if Offered this turn. */
const liguasanReedEyeHarun: CardScript = {
  id: 'maguindanao/liguasan-reed-eye-harun',
  abilities: [
    {
      text: "[Ally] 1/turn: When this unit attacks, if you Offered an Ally this turn, damage one of your opponent's ally units. At the end of your turn, Offer this unit.",
      scope: ['Ally'],
      perTurn: 1,
      trigger: 'attack',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        if (you(ctx.game, ctx.me).unitsOfferedThisTurn === 0) return false;
        return enemyAllies(ctx).length > 0;
      },
      run: async (ctx) => {
        const foes = enemyAllies(ctx);
        if (foes.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Harun: Damage which opponent ally?', foes,
        );
        if (pick) {
          const pickName = def(ctx.index, ctx.game, pick).name;
          damageUnitByAbility(ctx, pick);
          log(ctx.game, `Harun: Damaged ${pickName}.`, [pick]);
        }
      },
    },
    {
      // The price of the eye. Written as its own clause because it is its own
      // trigger: he goes at the end of every one of your turns, whether or not
      // he attacked, which is what makes him a body you are always spending
      // rather than one you sometimes are.
      text: '[Ally]: At the end of your turn, Offer this unit.',
      scope: ['Ally'],
      trigger: 'endOfTurn',
      canRun: (ctx) => inst(ctx.game, ctx.source).zone === 'ally',
      run: async (ctx) => {
        offerUnit(ctx, ctx.source);
        log(ctx.game, 'Harun: Offered at end of turn.', [ctx.source]);
      },
    },
  ],
};

/** Pulangi Wake-Cleaver, Panglima Farid: charge via Offer + power buff. */
const pulangiWakeCleaverPanglimaFarid: CardScript = {
  id: 'maguindanao/pulangi-wake-cleaver-panglima-farid',
  abilities: [
    {
      text: '[Ally] 1/turn: After this unit attacks, [Cost: Offer 1 of your other units] Charge this unit. It gets Power +3000, until end of turn.',
      scope: ['Ally'],
      perTurn: 1,
      trigger: 'attackResolved',
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        const others = myAllyUnits(ctx).filter((u) => u !== ctx.source);
        return others.length >= 1;
      },
      run: async (ctx) => {
        const others = myAllyUnits(ctx).filter((u) => u !== ctx.source);
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Farid: Offer which other unit to charge?', others,
        );
        if (!pick) return;
        offerUnit(ctx, pick);
        if (ctx.game.cards[ctx.source]) {
          inst(ctx.game, ctx.source).exhausted = false;
          buffPower(ctx, ctx.source, 3000);
          log(ctx.game, `Farid: charged via Offer! +3000 power.`, [ctx.source]);
        }
      },
    },
  ],
};


// --- L1 Units — 6 cards (Last Oath + utility) ------------------------------

/** Buluan Shell-Caller, Mayla: Last Oath — +3000 to another unit, draw 1, discard 1. */
const buluanShellCallerMayla: CardScript = {
  id: 'maguindanao/buluan-shell-caller-mayla',
  abilities: [
    {
      text: '[Last Oath]: When this unit is Offered, choose one of your other units. It gets Power +3000 until end of turn. Draw 1 card, then discard 1 card.',
      scope: ['Ally'],
      trigger: 'unitDamagedByAbility',
      canRun: (ctx) => {
        const event = ctx.event;
        if (!event?.unit || event.unit !== ctx.source) return false;
        if (event.damager !== ctx.me) return false;
        // The draw-then-discard happens regardless of whether there is another
        // unit to buff, so this ability is always worth offering.
        return true;
      },
      run: async (ctx) => {
        const targets = myUnits(ctx).filter((u) => u !== ctx.source);
        if (targets.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Mayla: Which other unit gets +3000?', targets,
          );
          if (pick) {
            buffPower(ctx, pick, 3000);
            log(ctx.game, `Mayla: ${def(ctx.index, ctx.game, pick).name} gets +3000.`, [pick]);
          }
        }
        await draw(ctx, 1);
        const ps = you(ctx.game, ctx.me);
        if (ps.hand.length === 0) return;
        const discard = await ctx.chooser.chooseTarget(
          ctx.me, 'Mayla: Discard which card?', [...ps.hand],
        );
        if (discard) {
          ps.hand.splice(ps.hand.indexOf(discard), 1);
          moveCard(ctx.game, discard, 'grave');
          log(ctx.game, `Mayla: Discarded ${def(ctx.index, ctx.game, discard).name}.`, [discard]);
        }
      },
    },
  ],
};

/** Illana Tide-Harpooner, Hakim: Last Oath — +3000 to another unit, damage enemy. */
const illanaTideHarpoonerHakim: CardScript = {
  id: 'maguindanao/illana-tide-harpooner-hakim',
  abilities: [
    {
      text: '[Last Oath]: When this unit is Offered, [Cost: 1 Energy] choose one of your other units. It gets Power +3000 until end of turn. Damage one opponent Ally.',
      scope: ['Ally'],
      trigger: 'unitDamagedByAbility',
      energyCost: 1,
      canRun: (ctx) => {
        const event = ctx.event;
        if (!event?.unit || event.unit !== ctx.source) return false;
        if (event.damager !== ctx.me) return false;
        if (you(ctx.game, ctx.me).energy < 1) return false;
        // Either half is worth doing on its own.
        return myUnits(ctx).some((u) => u !== ctx.source) || enemyAllies(ctx).length > 0;
      },
      run: async (ctx) => {
        const targets = myUnits(ctx).filter((u) => u !== ctx.source);
        if (targets.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Hakim: Which other unit gets +3000?', targets,
          );
          if (pick) {
            buffPower(ctx, pick, 3000);
            log(ctx.game, `Hakim: ${def(ctx.index, ctx.game, pick).name} gets +3000.`, [pick]);
          }
        }
        const foes = enemyAllies(ctx);
        if (foes.length === 0) return;
        const target = await ctx.chooser.chooseTarget(
          ctx.me, 'Hakim: Damage which opponent Ally?', foes,
        );
        if (target) {
          const targetName = def(ctx.index, ctx.game, target).name;
          damageUnitByAbility(ctx, target);
          log(ctx.game, `Hakim: Damaged ${targetName} (Last Oath).`, [target]);
        }
      },
    },
  ],
};

/** Kuta Wato Banner-Keeper, Sitti Rahma: defensive Offer + Last Oath. */
const kutaWatoBannerKeeperSittiRahma: CardScript = {
  id: 'maguindanao/kuta-wato-banner-keeper-sitti-rahma',
  abilities: [
    {
      text: '[Last Oath]: When this unit is Offered, choose one of your other units. It gets Power +3000 until end of turn. Then [Cost: 1 Energy] Search your deck for a Level 1 unit and special call it.',
      scope: ['Ally'],
      trigger: 'unitDamagedByAbility',
      canRun: (ctx) => {
        const event = ctx.event;
        if (!event?.unit || event.unit !== ctx.source) return false;
        if (event.damager !== ctx.me) return false;
        if (you(ctx.game, ctx.me).energy < 1) return false;
        return myUnits(ctx).some((u) => u !== ctx.source) &&
          you(ctx.game, ctx.me).deck.some((uid) => {
            const d = def(ctx.index, ctx.game, uid);
            return d.type === 'Unit' && d.level === 1;
          });
      },
      run: async (ctx) => {
        // +3000 to another unit.
        const targets = myUnits(ctx).filter((u) => u !== ctx.source);
        if (targets.length > 0) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Sitti Rahma: Which other unit gets +3000?', targets,
          );
          if (pick) {
            buffPower(ctx, pick, 3000);
            log(ctx.game, `Sitti Rahma: ${def(ctx.index, ctx.game, pick).name} gets +3000.`, [pick]);
          }
        }
        // Search deck for L1 unit.
        const ps = you(ctx.game, ctx.me);
        if (ps.energy < 1) return;
        spendEnergy(ctx, 1);
        const deckL1 = ps.deck.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level === 1;
        });
        if (deckL1.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Sitti Rahma: Special call which L1 unit from deck?', deckL1,
        );
        if (!pick) return;
        ps.deck.splice(ps.deck.indexOf(pick), 1);
        await specialCall(ctx, pick);
        log(ctx.game, `Sitti Rahma: Special called ${def(ctx.index, ctx.game, pick).name} from deck.`, [pick]);
      },
    },
  ],
};

/**
 * Liguasan Mudblade, Nasser: Last Oath — sink the top of your deck.
 *
 * He used to search out a Level 1 and special call it, which is the whole of
 * Sitti Rahma's Last Oath with her +3000 clause removed — the same Level, the
 * same stat line, the same Energy, no reason to run him. This is the only
 * effect in the set that fills a Grave without a unit dying, and Garahana
 * wants exactly that: five Maguindanaon units in the Grave, reachable until
 * now only by Offering your own board away. Free, like Mayla's and Hakim's
 * Last Oaths — being Offered is the cost.
 */
const liguasanMudbladeNasser: CardScript = {
  id: 'maguindanao/liguasan-mudblade-nasser',
  abilities: [
    {
      text: '[Last Oath]: When this unit is Offered, send the top 3 cards of your deck to your Grave.',
      scope: ['Ally'],
      trigger: 'unitDamagedByAbility',
      canRun: (ctx) => {
        const event = ctx.event;
        if (!event?.unit || event.unit !== ctx.source) return false;
        if (event.damager !== ctx.me) return false;
        return you(ctx.game, ctx.me).deck.length > 0;
      },
      run: async (ctx) => {
        const sent = millTop(ctx, 3);
        if (sent.length === 0) return;
        const units = sent.filter((uid) => isUnitCard(def(ctx.index, ctx.game, uid))).length;
        log(
          ctx.game,
          `Nasser: Sent ${sent.length} card${sent.length === 1 ? '' : 's'} to the Grave`
          + `${units > 0 ? ` (${units} Unit${units === 1 ? '' : 's'})` : ''}.`,
          sent,
        );
      },
    },
  ],
};

/** Pulangi Ember-Spear, Kamil: treated as 2 Offer and 2 cards in Grave. */
const pulangiEmberSpearKamil: CardScript = {
  id: 'maguindanao/pulangi-ember-spear-kamil',
  abilities: [
    {
      text: '[Ally]: When this unit is Offered, it counts as 2 Offer.',
      scope: ['Ally'],
      // Passive — resolved by offerValue and offerUnit in effects.ts, via
      // DOUBLE_OFFER_IDS.
      canRun: () => false,
      run: async () => {},
    },
  ],
};


// --- Force cycle (L0, P3000/D10000) — 4 cards (unchanged) ------------------

const buluanMirrorSeerDayangAmira: CardScript = {
  id: 'maguindanao/buluan-mirror-seer-dayang-amira',
  forceModes: [
    { label: '+5000 to a unit', run: forceBuffMode },
    {
      label: 'Exhaust up to two opponent units',
      run: async (ctx) => {
        const foes = enemyAllies(ctx).filter((uid) => !inst(ctx.game, uid).exhausted);
        if (!foes.length) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Exhaust which opponent unit? (up to 2)', foes,
        );
        if (pick) {
          const targets = [pick];
          const remaining = foes.filter((f) => f !== pick);
          if (remaining.length) {
            const pick2 = await ctx.chooser.chooseTarget(
              ctx.me, 'Exhaust another? (optional)', remaining,
            );
            if (pick2) targets.push(pick2);
          }
          exhaust(ctx, targets);
          log(ctx.game, `Amira: Exhausted ${targets.length} opponent unit(s).`, targets);
        }
      },
    },
  ],
};

const illanaStormwingRamitan: CardScript = {
  id: 'maguindanao/illana-stormwing-ramitan',
  forceModes: [
    { label: '+5000 to a unit', run: forceBuffMode },
    { label: 'Draw 1 card', run: async (ctx) => { await draw(ctx, 1); log(ctx.game, `Ramitan: Drew 1 card.`, []); } },
  ],
};

const liguasanMireBenderDuma: CardScript = {
  id: 'maguindanao/liguasan-mire-bender-duma',
  forceModes: [
    { label: '+5000 to a unit', run: forceBuffMode },
    {
      label: "Damage one of your opponent's exhausted Ally units",
      run: async (ctx) => {
        const exhausted = enemyAllies(ctx).filter((uid) => inst(ctx.game, uid).exhausted);
        if (!exhausted.length) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, "Damage which of your opponent's exhausted Allies?", exhausted,
        );
        if (pick) {
          const pickName = def(ctx.index, ctx.game, pick).name;
          damageUnitByAbility(ctx, pick);
          log(ctx.game, `Duma: Damaged ${pickName}.`, [pick]);
        }
      },
    },
  ],
};

const pulangiBloodcurrentSangkad: CardScript = {
  id: 'maguindanao/pulangi-bloodcurrent-sangkad',
  forceModes: [
    { label: '+5000 to a unit', run: forceBuffMode },
    { label: 'All your units +2000', run: async (ctx) => { buffAll(ctx, 2000); log(ctx.game, `Sangkad: All units +2000.`, []); } },
  ],
};

// --- Actions — 2 cards -----------------------------------------------------

/** Pulangi River Unbound: Offer 1 → break a barrier. */
const pulangiRiverUnbound: CardScript = {
  id: 'maguindanao/pulangi-river-unbound',
  action: {
    energyCost: 0,
    canRun: (ctx) => offerableTotal(ctx) >= 1 && enemyAllies(ctx).length > 0,
    run: async (ctx) => {
      const cost = await pickOwnUnitToOffer(ctx, 'Pulangi River Unbound: Offer which unit?');
      if (!cost) return;
      offerPicked(ctx, cost);
      const foes = enemyAllies(ctx);
      if (foes.length === 0) return;
      const pick = await ctx.chooser.chooseTarget(
        ctx.me, 'Pulangi River Unbound: Damage which opponent ally?', foes,
      );
      if (pick) {
        const pickName = def(ctx.index, ctx.game, pick).name;
        damageUnitByAbility(ctx, pick);
        log(ctx.game, `Pulangi River Unbound: Damaged ${pickName}.`, [pick]);
      }
    },
  },
};

/** Crimson Agung Resonance: team buff per Maguindanaon in Grave. */
const crimsonAgungResonance: CardScript = {
  id: 'maguindanao/crimson-agung-resonance',
  action: {
    energyCost: 2,
    canRun: (ctx) => myUnits(ctx).length > 0,
    run: async (ctx) => {
      // One unit, scaled by how full your Grave is.
      const count = graveUnitCount(ctx);
      if (count === 0) return;
      const targets = myUnits(ctx);
      if (targets.length === 0) return;
      const pick = await ctx.chooser.chooseTarget(
        ctx.me, `Agung: give one unit +${count * 1000}?`, targets,
      );
      if (!pick) return;
      buffPower(ctx, pick, count * 1000);
      log(
        ctx.game,
        `Crimson Agung Resonance: ${def(ctx.index, ctx.game, pick).name} gets +${count * 1000} (${count} units in Grave).`,
        [pick],
      );
    },
  },
};


// --- Sentry — 1 card (unchanged) -------------------------------------------

const kutaWatoOathShieldPanglimaSabir: CardScript = {
  id: 'maguindanao/kuta-wato-oath-shield-panglima-sabir',
  sentry: true,
  abilities: [
    {
      text: '[Battle]: When your Persona is taking damage, [Reveal this card] Nullify that damage, then exile this card face down.',
      scope: ['Hand'],
      run: async (ctx) => {
        log(ctx.game, 'Sabir: Sentry nullified the damage.');
      },
    },
  ],
};

// --- Codex (5) — redesigned ------------------------------------------------

/**
 * Pulangi River — Draw 2 + first call is offered.
 * Replace your draw: Draw 2. The first time you call a unit this turn,
 * it is Offered.
 * auto switch — at the start of turn.
 */
const pulangiRiver: CardScript = {
  id: 'maguindanao/pulangi-river',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'replacement',
      text: 'Replace your draw — [Cost: Offer 1 of your units] Draw 2.',
      // Replacement skills run in place of the draw step. If the cost cannot
      // be paid the draw is NOT replaced, so canRun gates on having a unit.
      canRun: (ctx) => offerableTotal(ctx) >= 1,
      run: async (ctx) => {
        const cost = await pickOwnUnitToOffer(ctx, 'Pulangi River: Offer which of your units?');
        if (!cost) return;
        offerPicked(ctx, cost);
        await draw(ctx, 2);
        log(ctx.game, `Pulangi River: Offered a unit and drew 2.`);
      },
    },
  },
};

/**
 * Kuta Wato — Personify from Grave via discard.
 * During personification or when you can personify during your turn,
 * [Discard 1 card] Personify from your Grave instead.
 * auto switch — at the start of turn.
 */
const kutaWato: CardScript = {
  id: 'maguindanao/kuta-wato',
  codex: {
    autoSwitchOn: 'startOfTurn',
    skill: {
      type: 'auto',
      trigger: 'personify',
      text: 'When you personify, you may personify with a Level 3 or higher unit from your Grave. Then discard 1 card.',
      canRun: (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // Must have a Level 3+ unit in Grave.
        return ps.grave.some((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level >= 3;
        });
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // Choose a Level 3+ unit from Grave.
        const eligible = ps.grave.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level >= 3;
        });
        if (eligible.length === 0) return;

        const chosen = await ctx.chooser.chooseTarget(
          ctx.me,
          'Kuta Wato: Choose a Level 3+ unit from your Grave to personify',
          eligible,
        );
        if (!chosen) return;

        // Personify from Grave. The old Persona goes to the Heart, as with
        // every other Personify (game-rules.md §11).
        const oldPersona = ps.persona;
        if (oldPersona) moveCard(ctx.game, oldPersona, 'heart');
        ps.persona = chosen;
        ps.grave = ps.grave.filter((uid) => uid !== chosen);
        inst(ctx.game, chosen).zone = 'persona';

        const d = def(ctx.index, ctx.game, chosen);
        log(ctx.game, `Kuta Wato: Personified ${d.name} from Grave.`, [chosen]);

        // Discard 1 card.
        if (ps.hand.length > 0) {
          const discard = await ctx.chooser.chooseTarget(
            ctx.me,
            'Kuta Wato: Discard 1 card',
            ps.hand,
          );
          if (discard) {
            moveCard(ctx.game, discard, 'grave');
            const dd = def(ctx.index, ctx.game, discard);
            log(ctx.game, `Kuta Wato: Discarded ${dd.name}.`, [discard]);
          }
        }
      },
    },
  },
};

/**
 * Liguasan Marsh — Offer Replacement.
 * The first time you will Offer a unit each turn, [Cost: 1 Energy]
 * search your deck for a unit and Offer that unit instead.
 * auto switch — at the start of main.
 */
const liguasanMarsh: CardScript = {
  id: 'maguindanao/liguasan-marsh',
  codex: {
    autoSwitchOn: 'startOfMain',
    skill: {
      type: 'continuous',
      text: 'The first time you Offer a unit during your Main, special call that unit back to the field.',
      canRun: () => true,
      run: async () => {
        // Continuous — implemented in offerUnit() (effects.ts), which queues the
        // recall onto game.pendingOfferRecall for flushOfferRecall() to resolve.
      },
    },
  },
};

/**
 * Illana Bay — Persona Attack.
 * [1/turn]: When your Persona attacks, [Cost: 1 Energy] it gets +5000 for
 * that battle. If 3+ Allies were Offered this turn, +10000 instead.
 * auto switch — when persona attacks.
 */
const illanaBay: CardScript = {
  id: 'maguindanao/illana-bay',
  codex: {
    autoSwitchOn: 'personaAttack',
    skill: {
      type: 'auto',
      trigger: 'personaAttack',
      text: 'When your Persona attacks, it gets Power +5000 for that battle. If you Offered 3 or more units this turn, it gets Power +10000 instead.',
      canRun: (ctx) => ctx.event?.unit === you(ctx.game, ctx.me).persona,
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const persona = ps.persona;
        if (!persona) return;
        const bonus = ps.unitsOfferedThisTurn >= 3 ? 10000 : 5000;
        buffPower(ctx, persona, bonus);
        log(ctx.game, `Illana Bay: ${def(ctx.index, ctx.game, persona).name} gets +${bonus} for this battle.`, [persona]);
      },
    },
  },
};

/**
 * Lake Buluan — Broken Barrier.
 * [1/turn]: When one of your Barriers is broken and it's not a Force,
 * search your deck for a Level 1 unit and special call it.
 * auto switch — when persona is being attacked.
 */
const lakeBuluan: CardScript = {
  id: 'maguindanao/lake-buluan',
  codex: {
    autoSwitchOn: 'personaAttacked',
    skill: {
      type: 'auto',
      trigger: 'barrierBroken',
      text: 'When your Barrier is broken and it is not a Force card, [Cost: discard 1 card] search your deck for a Level 1 unit and special call it to an Ally Zone.',
      canRun: (ctx) => {
        const revealed = ctx.event?.revealed;
        if (revealed && def(ctx.index, ctx.game, revealed).type === 'Force') return false;
        const ps = you(ctx.game, ctx.me);
        // Must have cards in hand to discard.
        if (ps.hand.length === 0) return false;
        return ps.deck.some((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level === 1;
        });
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        // Discard 1 card.
        if (ps.hand.length > 0) {
          const discard = await ctx.chooser.chooseTarget(
            ctx.me,
            'Lake Buluan: Discard 1 card',
            ps.hand,
          );
          if (!discard) return;
          moveCard(ctx.game, discard, 'grave');
          const dd = def(ctx.index, ctx.game, discard);
          log(ctx.game, `Lake Buluan: Discarded ${dd.name}.`, [discard]);
        }

        // Search deck for Level 1 unit and special call it.
        const deckL1 = ps.deck.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level === 1;
        });
        if (deckL1.length === 0) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Lake Buluan: Special call which L1 unit from deck?', deckL1,
        );
        if (!pick) return;
        ps.deck.splice(ps.deck.indexOf(pick), 1);
        await specialCall(ctx, pick);
        log(ctx.game, `Lake Buluan: Special called ${def(ctx.index, ctx.game, pick).name} from deck.`, [pick]);
      },
    },
  },
};

// --- registry --------------------------------------------------------------

/** Zafir reads this by name, so it lives in one place. */
const PAH_ID = 'maguindanao/sun-darkening-scourge-pah';

/**
 * Sun-Darkening Scourge, Pah — a Persona that spends its own line to swing.
 *
 * These abilities were printed on Bita Eclipse-Wing, Pah, which has been
 * removed; the same Pah, the same Level and stat line, a different card. The
 * id moved with them, so Zafir still finds his Persona by the constant above
 * rather than by a literal that would have gone quietly stale.
 *
 * Both abilities are paid in Allies, and the first pays more the closer Pah is
 * to losing: at one Barrier or none the bonus doubles. That is the same trade
 * the whole game is built on — a broken Barrier raises your Persona level —
 * pushed to the point where being nearly dead is the condition for the bigger
 * number.
 */
const sunDarkeningScourgePah: CardScript = {
  id: PAH_ID,
  abilities: [
    {
      text: '[blue][Persona]: [Cost: Offer 2 of your units] This unit gets Power '
        + '+5000 until end of turn. If you have 1 or fewer Barriers, +10000 instead.',
      scope: ['Persona'],
      canRun: (ctx) => offerableTotal(ctx) >= 2,
      run: async (ctx) => {
        const offered = await pickUpToNUnitsToOffer(ctx, 2);
        if (!paidOffer(ctx, offered, 2)) return;
        for (const uid of offered) offerUnit(ctx, uid);
        // Barriers still standing, not breaks taken: a player on their last
        // Barrier is the one this is for.
        const standing = you(ctx.game, ctx.me).barriers.length;
        const amount = standing <= 1 ? 10000 : 5000;
        buffPower(ctx, ctx.source, amount);
        log(
          ctx.game,
          `Pah: Offered 2 units, +${amount}`
          + `${standing <= 1 ? ` (${standing} Barrier left)` : ''}.`,
          [ctx.source],
        );
      },
    },
    {
      text: '[green][Garahana][Persona]: After this unit attacks, [Cost: Offer 3 of '
        + 'your units] charge this unit and it gets Power +5000 until end of turn.',
      scope: ['Persona'],
      requiresState: 'Garahana',
      trigger: 'attackResolved',
      canRun: (ctx) =>
        garahanaOn(ctx)
        && ctx.event?.unit === ctx.source
        && offerableTotal(ctx) >= 3,
      run: async (ctx) => {
        const offered = await pickUpToNUnitsToOffer(ctx, 3);
        if (!paidOffer(ctx, offered, 3)) return;
        for (const uid of offered) offerUnit(ctx, uid);
        chargeUnit(ctx, ctx.source);
        buffPower(ctx, ctx.source, 5000);
        log(ctx.game, 'Pah: Offered 3 units, charged and +5000 (Garahana).', [ctx.source]);
      },
    },
  ],
};

/**
 * Black-Standard Oathkeeper, Sitti Maira — one Level 1 brings the next.
 *
 * Called from hand she fetches another Level 1 out of the deck, which is how a
 * Maguindanao board fills fast enough to have units worth Offering.
 */
const blackStandardOathkeeperSittiMaira: CardScript = {
  id: 'maguindanao/black-standard-oathkeeper-sitti-maira',
  abilities: [
    {
      text: '[green][Ally]: When this unit is placed, [Cost: 2 Energy] search your '
        + 'deck for a Level 1 unit and special call it to an Ally Zone.',
      scope: ['Ally'],
      trigger: 'placed',
      energyCost: 2,
      canRun: (ctx) => {
        if (ctx.event?.unit !== ctx.source) return false;
        return you(ctx.game, ctx.me).deck.some((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level === 1;
        });
      },
      run: async (ctx) => {
        const ps = you(ctx.game, ctx.me);
        const level1 = ps.deck.filter((uid) => {
          const d = def(ctx.index, ctx.game, uid);
          return d.type === 'Unit' && d.level === 1;
        });
        if (!level1.length) return;
        const pick = await ctx.chooser.chooseTarget(
          ctx.me, 'Sitti Maira: Special call which Level 1 unit from your deck?', level1,
        );
        if (!pick) return;
        ps.deck.splice(ps.deck.indexOf(pick), 1);
        await specialCall(ctx, pick);
        log(
          ctx.game,
          `Sitti Maira: Special called ${def(ctx.index, ctx.game, pick).name} from deck.`,
          [pick],
        );
      },
    },
  ],
};

/**
 * Kuta Wato Abyssblade, Panglima Zafir — arrives swinging, and swings harder
 * for Pah.
 *
 * The Persona clause is the only card in the set that reads another card by
 * name, which is what makes the two of them a pair rather than two cards from
 * the same archipelago.
 */
const kutaWatoAbyssbladePanglimaZafir: CardScript = {
  id: 'maguindanao/kuta-wato-abyssblade-panglima-zafir',
  abilities: [
    {
      text: "[green][Ally]: When this unit is placed, [Cost: 2 Energy] Damage one of "
        + "your opponent's ally units. If Pah is your Persona, this unit gets Power "
        + '+5000 until end of turn.',
      scope: ['Ally'],
      trigger: 'placed',
      energyCost: 2,
      canRun: (ctx) =>
        ctx.event?.unit === ctx.source
        && you(ctx.game, ctx.me).energy >= 2
        && enemyAllies(ctx).length > 0,
      run: async (ctx) => {
        const targets = enemyAllies(ctx);
        if (targets.length) {
          const pick = await ctx.chooser.chooseTarget(
            ctx.me, 'Zafir: Damage which enemy ally?', targets,
          );
          if (pick) {
            const name = def(ctx.index, ctx.game, pick).name;
            damageUnitByAbility(ctx, pick);
            log(ctx.game, `Zafir: Damaged ${name}.`, [pick]);
          }
        }
        // The bonus is not conditional on the damage landing a target — it is
        // conditional on who is leading.
        const persona = you(ctx.game, ctx.me).persona;
        if (persona && def(ctx.index, ctx.game, persona).id === PAH_ID) {
          buffPower(ctx, ctx.source, 5000);
          log(ctx.game, 'Zafir: +5000, fighting under Pah.', [ctx.source]);
        }
      },
    },
  ],
};

export const MAGUINDANAO_SCRIPTS: ScriptRegistry = Object.fromEntries(
  [
    bloodMoonBaiALabi, kutaWatoWarcallerDatuSalik, veiledEclipseMaharaja,
    buluanInaulWardkeeperDayangNuraya, illanaLantakaWarderPanglimaJamal,
    kutaWatoGateBulwarkBaiSamira, liguasanReedEyeHarun, pulangiWakeCleaverPanglimaFarid,
    buluanShellCallerMayla, illanaTideHarpoonerHakim, kutaWatoBannerKeeperSittiRahma,
    liguasanMudbladeNasser, pulangiEmberSpearKamil,
    buluanMirrorSeerDayangAmira, illanaStormwingRamitan,
    liguasanMireBenderDuma, pulangiBloodcurrentSangkad,
    crimsonAgungResonance, pulangiRiverUnbound,
    kutaWatoOathShieldPanglimaSabir,
    illanaBay, kutaWato, lakeBuluan, liguasanMarsh, pulangiRiver,
    sunDarkeningScourgePah, kutaWatoAbyssbladePanglimaZafir,
    blackStandardOathkeeperSittiMaira,
  ].map((s) => [s.id, s]),
);
