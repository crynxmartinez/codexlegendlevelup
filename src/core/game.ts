import { prepareTargets, withDeclaredTargets, targetFailure, type TargetFailure } from './activation-targets.js';
/**
 * Game controller: trigger dispatch, the turn loop, and the player action API.
 *
 * Everything a player (human or AI) can do goes through `legalActions()` and
 * `perform()`, so the AI and the UI drive the exact same code path.
 */
import { AGTA_SCRIPTS } from '../cards/agta.js';
import { AGTA_SET_ONE_SCRIPTS } from '../cards/agta-set-1.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { BABAYLAN_SCRIPTS } from '../cards/babaylan.js';
import { SET_ONE_SCRIPTS } from '../cards/set-1.js';
import { BABAYLAN_SET_ONE_SCRIPTS, prepareBabaylanEvent, finishBabaylanReturns, payTrialDebt } from '../cards/babaylan-set-1.js';
import { MAGUINDANAO_SET_ONE_SCRIPTS, grantedAfterAttack, setOneAttack, setOneAfterAttack, finishSetOneTurn, hasSetOneTurnExpiry, prepareSetOneTrigger } from '../cards/maguindanao-set-1.js';
import type { AbilityScript, CardScript, ScriptRegistry } from '../cards/types.js';
import { commitCost } from './activation.js';
import { appendLink, createChain, declineResponse, finishLink, nextLink, type LinkActivation } from './response-chain.js';
import { publicEffectTargets, effectOutcomeLabel } from './effect-presentation.js';
import { recordSkillUse, usedSkill } from './skill-usage.js';

/** Combined script registry for all implemented decks. */
export const ALL_SCRIPTS: ScriptRegistry = {
  ...AGTA_SCRIPTS,
  ...MAGUINDANAO_SCRIPTS,
  ...BABAYLAN_SCRIPTS,
  ...SET_ONE_SCRIPTS,
  ...AGTA_SET_ONE_SCRIPTS,
  ...BABAYLAN_SET_ONE_SCRIPTS,
  ...MAGUINDANAO_SET_ONE_SCRIPTS,
};
/** The live game never loads retired card effects. ALL_SCRIPTS is an archive for explicit fixtures. */
export const ACTIVE_SCRIPTS: ScriptRegistry = {
  ...AGTA_SET_ONE_SCRIPTS, ...BABAYLAN_SET_ONE_SCRIPTS, ...MAGUINDANAO_SET_ONE_SCRIPTS,
  ...Object.fromEntries(['agta/sierra-watchkeeper-banoy', 'babaylan/warden-of-the-twelfth-tide-bituon', 'maguindanao/kuta-wato-oath-shield-panglima-sabir'].map(id => [id, ALL_SCRIPTS[id]!])),
};
delete ACTIVE_SCRIPTS['maguindanao/set-1/ridge-bed-multiplier-omaka-an'];
import {
  resolveAttack,
  attackEntriesStillPresent,
  canAttack,
  canSupport,
  doAttackCheck,
  endBattlePhase,
  legalTargets,
  type AttackDeclaration,
  type AttackResult,
} from './battle.js';
import {
  autoChooser,
  canActivateIllanaBay,
  damageUnitByAbility,
  offerUnit,
  runEndOfTurn,
  SLOT_LABELS,
  type Chooser,
  type EffectContext,
  type TriggerEvent,
  type TriggerName,
  specialCall,
} from './effects.js';
import { tryReleaseEventState, isReleased, evaluateStates, reevaluateState } from './states.js';
import {
  currentPower, def, draw, inst, log, moveCard, opponentOf, you,
  maxPlays,
  type CardIndex,
} from './state.js';
import {
  canNormalCall,
  canPersonify,
  canSwitchCodex,
  endTurn as endTurnState,
  normalCall,
  personify,
  startTurn,
  hasTurnDraw,
  switchCodex,
  toMainPhase,
} from './turn.js';
import type { ActiveBattle, FxEvent, GameState, Phase, PlayerId } from './types.js';
import { beginGroup, emit } from './events.js';

/**
 * A Force holds two effects, and which one you get depends on how the card
 * reached play — it is never a choice between them.
 *
 * `FORCE_CHECK` is the reward for leaving Forces in your deck: turned up on
 * an attack or Barrier check it fires free and automatically, and every Force
 * in the game prints the same one, so the check is uniform.
 *
 * `FORCE_SKILL` is the card's own skill, the reason to run one Force over
 * another. Current Forces respond from hand to their printed condition on
 * either player's turn, revealing and discarding themselves as payment.
 */
const FORCE_CHECK = 0;
const FORCE_SKILL = 1;

export type PlayerAction =
  | { kind: 'call'; uid: string; slot: number }
  | { kind: 'playAction'; uid: string }
  | { kind: 'playForce'; uid: string; mode: number }
  | { kind: 'ability'; uid: string; abilityIndex: number }
  | { kind: 'switchCodex'; uid: string }
  | { kind: 'useSkill' }
  | { kind: 'attack'; attacker: string; target: string | null; supporters: string[] }
  | { kind: 'relocate'; uid: string; toSlot: number }
  | { kind: 'endPhase' }
  | { kind: 'endTurn' };

/** Presentation pause points. The UI implements these; tests leave them out. */
export interface BattleHooks {
  onAbilityResolved?: (uid: string, owner: PlayerId, outcome: string, summary?: string) => Promise<void>;
  onAttackDeclared?: (b: ActiveBattle) => Promise<void>;
  onBlockingStart?: (b: ActiveBattle) => Promise<void>;
  onBlockersDeclared?: (b: ActiveBattle) => Promise<void>;
  /** Fired after defense is committed, immediately before a Persona attack check. */
  onBeforeAttackCheck?: (owner: PlayerId) => Promise<void>;
  onAttackResolved?: (b: ActiveBattle, r: AttackResult) => Promise<void>;
  /**
   * A card was revealed on a check (attack check or barrier check). The UI
   * shows a modal with the card art; if it is a Force, its check effect is
   * about to fire. Resolves once the player has acknowledged the reveal.
   */
  onCheckRevealed?: (uid: string, isForce: boolean, kind: 'attack' | 'barrier') => Promise<void>;
  /** Fired AFTER a card is placed in the check zone, BEFORE the modal. Used for
   *  the deck→check fly animation (attack) or barrier flip animation. */
  onCheckCardPlaced?: (uid: string, kind: 'attack' | 'barrier', owner: PlayerId) => Promise<void>;
  /** Fired AFTER the check modal closes, BEFORE the card moves to hand. Used
   *  for the check→hand fly animation. */
  onCheckCardToHand?: (uid: string, owner: PlayerId) => Promise<void>;
  /** Fired after a checked card has finished moving into its destination zone. */
  onCheckResolved?: (uid: string, isForce: boolean, kind: 'attack' | 'barrier', owner: PlayerId) => Promise<void>;
  /** A token was created. The UI can show a brief notification. */
  onTokenCreated?: (uid: string, owner: PlayerId) => Promise<void>;
  /** Fired after any AI action so the client can redraw and pace itself. */
  onAiAction?: (a: PlayerAction) => Promise<void>;
  /** Fired when the phase changes, so the UI can announce it. */
  onPhaseChange?: (phase: Phase, player: PlayerId) => Promise<void>;
  /** Fired BEFORE a unit is called to an ally slot, so the UI can animate. */
  onCardCalled?: (uid: string, slot: number, player: PlayerId) => Promise<void>;
  /** Runs after the draw commits, so the UI can reserve and hide its hand slot while flying. */
  onCardDrawn?: (uid: string, player: PlayerId) => Promise<void>;
  /** Fired BEFORE a persona swap, so the UI can animate the card to the persona slot. */
  onPersonify?: (uid: string, player: PlayerId) => Promise<void>;
  /** Fired when a Sentry is revealed — the card flies to Defense, then exiles. */
  onSentryRevealed?: (uid: string, player: PlayerId) => Promise<void>;
  /** Fired BEFORE cards are rallied to the bottom of the deck. */
  onRally?: (uids: string[], player: PlayerId) => Promise<void>;
  /** Fired BEFORE a card is drawn by an effect (not the draw phase). */
  onEffectDraw?: (uid: string, player: PlayerId) => Promise<void>;
  /**
   * Fired BEFORE a card's ability (or the active Codex's skill) resolves, so
   * the UI can play the activation flourish — the card glows, floats up and
   * announces itself before anything happens.
   */
  onAbilityActivated?: (
    uid: string,
    label: string,
    player: PlayerId,
    kind: 'ability' | 'codex',
    /** 1-based position in the current resolution chain. */
    chainIndex: number,
  ) => Promise<void>;
  /** Costs and chain order changed; refresh the public board before a decision. */
  onChainUpdated?: () => Promise<void>;
  /** Drain of presentation events queued by the rules engine. */
  onFx?: (fx: FxEvent) => Promise<void>;
}

/**
 * Card text as the player should hear it read aloud.
 *
 * Rules text carries markup the reader does not need — colour spans, the
 * exact wording of a cost, Andukha counts — and repeats the phase it
 * already happens in. What is left is the sentence the card is actually
 * doing, which is what the log records and what the announcement shows.
 */
export function skillLabel(text: string): string {
  return (text || 'skill')
    .replace(/\[\/?(blue|green|yellow|red|pink|teal)\]/gi, '')
    .replace(/\[Cost:[^\]]*\]/gi, '[Cost]')
    .replace(/\[Kaluluwa\]/gi, 'Kaluluwa')
    .replace(/\[Sanib\]/gi, 'Sanib')
    .replace(/\[Kalas\]/gi, 'Kalas')
    .replace(/\[Andukha \d+\]/gi, '')
    .replace(/\[(Persona|Ally|Heart|Hand)\]/gi, '')
    .replace(/During your Main Phase,?\s*/gi, '')
    .replace(/^[\s:]+/, '')
    .trim();
}

/** One pending trigger: a unit ability, or the active Codex's green effect. */
type TriggerCandidate = { trigger: TriggerName } & (
  | { kind: 'ability'; uid: string; ability: AbilityScript; label: string; text: string }
  | {
      kind: 'codex';
      uid: string;
      run: (ctx: EffectContext) => Promise<void>;
      label: string;
      text: string;
    }
);

/** Plain-English name for the moment an ability fired. */
const TRIGGER_LABEL: Partial<Record<TriggerName, string>> = {
  placed: 'A unit was placed',
  attack: 'Your unit attacks',
  attackHit: 'Your attack connected',
  attackMiss: 'Your attack missed',
  attackResolved: 'An attack resolved',
  supported: 'Your unit was supported',
  startOfTurn: 'Start of your turn',
  startOfMain: 'Start of your Main',
  startOfBattle: 'Start of Battle',
  endOfTurn: 'End of your turn',
  barrierBroken: 'Your Barrier broke',
  codexPlayed: 'Your Codex became active',
  personaAttack: 'Your Persona attacks',
  personaAttacked: 'Your Persona is under attack',
  unitAttacked: 'Your unit is under attack',
  tokenCreated: 'A token was created',
  essenced: 'A card entered your Heart',
  vented: 'Cards were Kalas from your Heart',
  kaluluwaCreated: 'Kaluluwa were created',
  unitDamagedByAbility: 'A unit was damaged by an ability',
};

/**
 * How eagerly optional prompts interrupt play. A presentation preference the
 * client supplies — it never changes what is legal, only what is re-offered
 * after the player has already said no once.
 */
/** Phase names as a player would say them. */
const PHASE_NAMES: Record<Phase, string> = {
  start: 'Draw',
  personify: 'Personify',
  main: 'Main',
  battle: 'Battle',
  end: 'End',
};

export type PromptPolicy = 'all' | 'auto' | 'minimal';

export interface GameControllerOptions {
  scripts?: ScriptRegistry;
  choosers?: [Chooser, Chooser];
  hooks?: BattleHooks;
  /** Read live, so changing the setting mid-duel takes effect at once. */
  promptPolicy?: () => PromptPolicy;
}

export class GameController {
  readonly game: GameState;
  readonly index: CardIndex;
  /** Readable so a speculative clone can be built with the same scripts. */
  readonly scripts: ScriptRegistry;
  private choosers: [Chooser, Chooser];
  readonly hooks: BattleHooks;
  private promptPolicy: () => PromptPolicy;
  /**
   * Players who have already turned down a Codex auto-switch THIS TURN. Under
   * anything but 'all' we stop asking them again within the turn — the offer
   * recurs at four separate moments, which is exactly the prompt that wears
   * out.
   *
   * Cleared every turn, for both seats. It used to be scoped to the whole
   * duel, which meant one decline on turn 2 silently ended Codex auto-switch
   * for the rest of the game — including the later triggers the player had
   * been holding out for. Both seats, because `personaAttacked` is offered to
   * the defender, who is not the turn player.
   */
  /**
   * Which auto-switch windows each seat has already turned down.
   *
   * Keyed by seat AND window, not by seat alone. Turn-scoped decline is
   * what forced every trigger into one offer at the start of the turn:
   * saying no to the first window silenced all the later ones, so a Codex
   * tied to a late moment could never be reached by a player who had
   * declined an early one. Per window, "not now" means not at THIS
   * moment, and the Main-phase window still gets asked.
   */
  private declinedAutoSwitch = new Set<string>();
  private collectingTriggers = 0;
  private drainingTriggers = false;
  private deferredSwitches: Array<{ name: TriggerName; owner: PlayerId; event: TriggerEvent }> = [];

  constructor(game: GameState, index: CardIndex, opts: GameControllerOptions = {}) {
    this.game = game;
    this.index = index;
    this.scripts = opts.scripts ?? ACTIVE_SCRIPTS;
    this.choosers = opts.choosers ?? [autoChooser, autoChooser];
    this.hooks = opts.hooks ?? {};
    this.promptPolicy = opts.promptPolicy ?? (() => 'all');
  }

  /**
   * Choosers, each wrapped so that asking the player anything first puts the
   * queued presentation events on screen.
   *
   * A prompt is the moment the player is asked to look at something, so
   * whatever the effect queued to explain itself — the pile lifting to say
   * "I am searching your Grave" — has to have played before the modal covers
   * the board. Queued events otherwise sit until the controller's next drain,
   * which happens after the whole ability has finished: the announcement
   * arrives once the thing it was announcing is over.
   *
   * Wrapping here rather than at each call site is deliberate. There are 19
   * chooser calls in effects.ts alone, and an effect author adding the
   * twentieth should not have to know this rule exists.
   */
  private readonly wrappedChoosers: (Chooser | null)[] = [null, null];

  chooserFor(p: PlayerId): Chooser {
    const cached = this.wrappedChoosers[p];
    if (cached) return cached;

    const inner = this.choosers[p];
    const wrapped = new Proxy(inner, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop) as unknown;
        if (typeof value !== 'function') return value;
        return async (...args: unknown[]) => {
          await this.flushFx();
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });
    this.wrappedChoosers[p] = wrapped;
    return wrapped;
  }

  scriptFor(uid: string): CardScript | undefined {
    return this.scripts[def(this.index, this.game, uid).id];
  }

  private ctx(uid: string, p: PlayerId, event?: TriggerEvent): EffectContext {
    return {
      index: this.index,
      game: this.game,
      me: p,
      source: uid,
      chooser: this.chooserFor(p),
      chooserFor: (player) => this.chooserFor(player),
      event,
      hooks: this.hooks,
      present: () => this.flushFx(),
      beforeOfferCost: count => this.prepareIllanaBay(p, count),
      settle: async () => { await this.flushFx(); await this.flushDamageTriggers(); await this.flushSpiritTriggers(); await this.flushSpecialCallTriggers(); await this.flushStateReleases(); },
    };
  }

  private preparingOfferBonus = false;

  private async prepareIllanaBay(owner: PlayerId, count: number): Promise<void> {
    if (this.preparingOfferBonus || !canActivateIllanaBay(this.game, owner)) return;
    const ps = you(this.game, owner), uid = ps.activeCodex!;
    const skill = this.scriptFor(uid)?.codex?.skill;
    if (!skill) return;
    const selected = await this.chooserFor(owner).chooseAbility(owner, `Use Illana Bay before Offer ${count}?`,
      [{ uid, cardName: def(this.index, this.game, uid).name, text: skill.text }],
      { kind: 'cost', allowDecline: true });
    if (selected !== 0 || ps.activeCodex !== uid || !canActivateIllanaBay(this.game, owner)) return;
    this.preparingOfferBonus = true;
    try {
      await this.startEffect(uid, owner, { id: `${inst(this.game, uid).defId}:codex`, text: skill.text, scope: [], run: skill.run }, undefined, () => {
        ps.illanaBayActivatedTurn = this.game.turnNumber;
        recordSkillUse(this.game, owner, uid, `${inst(this.game, uid).defId}:codex`);
      });
    } finally { this.preparingOfferBonus = false; }
  }

  // --- ability legality ----------------------------------------------------

  /** Zone a card is in, mapped to the ability scope names. */
  private scopeOf(uid: string): string {
    const c = inst(this.game, uid);
    if (c.zone === 'ally') return 'Ally';
    if (c.zone === 'persona') return 'Persona';
    if (c.zone === 'hand') return 'Hand';
    if (c.zone === 'heart') return 'Heart';
    if (c.zone === 'grave') return 'Grave';
    if (c.zone === 'exile') return 'Exile';
    return c.zone;
  }

  canUseAbility(uid: string, ability: AbilityScript, p: PlayerId, event?: TriggerEvent): boolean {
    const c = inst(this.game, uid);
    if (c.owner !== p) return false;
    // A unit destroyed by an ability may still need to fire its "when damaged"
    // trigger from the grave. Skip the scope check for the damaged unit itself.
    const isEssencedPersona = event?.name === 'essenced' && event.from === 'persona' && !!event.cards?.includes(uid);
    const isDamagedSelf = isEssencedPersona || ((event?.name === 'unitDamagedByAbility' || event?.name === 'unitOffered') && event?.unit === uid) || (event?.name === 'vented' && !!event.cards?.includes(uid));
    const observedOnField = event?.name === 'unitOffered' && event.fieldObservers?.includes(uid) && (ability.scope.includes('Ally') || ability.scope.includes('Persona'));
    if (!isDamagedSelf && !observedOnField && !ability.scope.includes(this.scopeOf(uid) as never)) return false;
    if (ability.requiresState && you(this.game, p).releasedState !== ability.requiresState && !(ability.latchStateOnTrigger && event?.qualifiedState?.source === uid && event.qualifiedState.state === ability.requiresState)) {
      return false;
    }
    if (ability.perTurn !== undefined && usedSkill(this.game, p, uid, this.skillId(uid, ability), ability.useScope) >= ability.perTurn) return false;
    if (ability.canRun && !ability.canRun(this.ctx(uid, p, event))) return false;
    return true;
  }

  /** Finish the previous effect before lifting the next source card. */
  private async announceAbility(...args: Parameters<NonNullable<BattleHooks['onAbilityActivated']>>): Promise<void> {
    await this.flushFx();
    await this.hooks.onAbilityActivated?.(...args);
  }

  private skillId(uid: string, ability: AbilityScript): string {
    return ability.id ?? `${inst(this.game, uid).defId}:ability:${this.scriptFor(uid)?.abilities?.indexOf(ability) ?? 0}`;
  }

  private async runAbility(uid: string, ability: AbilityScript, p: PlayerId, event?: TriggerEvent): Promise<boolean> {
    return this.startEffect(uid, p, ability, event, () => {
      recordSkillUse(this.game, p, uid, this.skillId(uid, ability), ability.useScope);
      // Retained presentation counters are not the rules ledger.
      inst(this.game, uid).usesThisTurn[ability.text] = (inst(this.game, uid).usesThisTurn[ability.text] ?? 0) + 1;
    });
  }

  /** Commit one complete activation before any opponent response. */
  private async startEffect(
    uid: string, owner: PlayerId, ability: AbilityScript, event?: TriggerEvent,
    onCommit?: () => void,
  ): Promise<boolean> {
    if (this.game.responseChain && this.game.responseChain.phase !== 'complete') throw new Error('Cannot start a chain during another chain.');
    const resolvers = new Map<string, () => Promise<void>>();
    const failures = new Map<string, Set<TargetFailure>>();
    const commit = async (source: string, player: PlayerId, effect: AbilityScript, trigger?: TriggerEvent, extraCommit?: () => void): Promise<LinkActivation | null> => {
      const ctx = this.ctx(source, player, trigger);
      const before = inst(this.game, source);
      const sourceZone = before.zone, sourceEntry = before.zoneEntry ?? 0, turn = this.game.turnNumber;
      const plan = effect.prepare ? await effect.prepare(ctx) : { cards: [] };
      if (!plan) return null;
      // A pre-payment chain can remove the source or end the game.
      const current = this.game.cards[source];
      if (this.game.winner !== null || this.game.turnNumber !== turn || !current || current.zone !== sourceZone || (current.zoneEntry ?? 0) !== sourceEntry) return null;
      if (effect.requiresState && you(this.game, player).releasedState !== effect.requiresState && !(effect.latchStateOnTrigger && trigger?.qualifiedState?.source === source && trigger.qualifiedState.state === effect.requiresState)) return null;
      if (effect.perTurn !== undefined && usedSkill(this.game, player, source, this.skillId(source, effect), effect.useScope) >= effect.perTurn) return null;
      if (effect.canRun && !effect.canRun(ctx)) return null;
      const declared = await prepareTargets(ctx, plan, effect.targets ?? []);
      if (!declared) return null;
      const receipt = commitCost(ctx, plan);
      if (!receipt) return null;
      extraCommit?.();
      const serial = this.game.chainSerial = (this.game.chainSerial ?? 0) + 1;
      const link: LinkActivation = { id: `link-${serial}`, owner: player, source, skillId: this.skillId(source, effect), label: skillLabel(effect.text), paidCards: receipt.cards, declared, targets: declared.flatMap(c => c.targets.map(t => t.uid)), receipt, event: trigger ? structuredClone(trigger) : undefined, sourceEntry: receipt.source?.entry,
        sourceZone, specialCalls: typeof effect.specialCalls === 'function' ? effect.specialCalls({ ...ctx, activation: receipt }) : effect.specialCalls };
      resolvers.set(link.id, async () => {
        const resolveCtx = this.ctx(source, player, trigger);
        resolveCtx.activation = receipt;
        const reasons = new Set<TargetFailure>();
        failures.set(link.id, reasons);
        for (const choice of declared) for (const target of choice.targets) {
          const reason = targetFailure(this.game, target);
          if (reason) reasons.add(reason);
        }
        await effect.run(withDeclaredTargets(resolveCtx, declared, reason => reasons.add(reason)));
      });
      emit(this.game, { actor: player, type: 'abilityActivated', chain: { id: this.game.responseChain?.id ?? `chain-${serial}`, linkId: link.id, ordinal: (this.game.responseChain?.links.length ?? 0) + 1, stage: 'committed' }, sourceUids: [source], targetUids: [], visibility: 'public', message: `${def(this.index, this.game, source).name} activated ${link.label}.` });
      return link;
    };
    const first = await commit(uid, owner, ability, event, onCommit);
    if (!first) return false;
    const chain = this.game.responseChain = createChain(`chain-${this.game.chainSerial}`, first);
    try {
    await this.flushFx();
    await this.hooks.onChainUpdated?.();
    await this.collectQueuedTriggers();
    while (chain.phase === 'building') {
      const responder = chain.responseOwner!;
      const candidates = this.responseCandidates(responder);
      const selected = candidates.length ? await this.chooserFor(responder).chooseAbility(
        responder, 'Your response — choose one card, or decline to resolve the chain',
        candidates.map(c => ({ uid: c.uid, id: `${c.uid}:${this.skillId(c.uid, c.ability)}`, cardName: def(this.index, this.game, c.uid).name, text: c.ability.text, effectSummary: c.ability.prepare?.describe?.(this.ctx(c.uid, responder)).effect, costLabel: c.ability.prepare?.describe?.(this.ctx(c.uid, responder)).label })),
        { kind: 'response', allowDecline: true, chainId: chain.id },
      ) : null;
      if (selected === null) { declineResponse(chain, responder); break; }
      const candidate = candidates[selected];
      if (!candidate) throw new Error('Invalid response selection.');
      const response = await commit(candidate.uid, responder, candidate.ability, undefined, candidate.onCommit);
      if (!response) { await new Promise<void>(resolve => setTimeout(resolve, 0)); continue; } // Cancelling a draft does not decline.
      appendLink(chain, response);
      await this.flushFx();
      await this.hooks.onChainUpdated?.();
      await this.collectQueuedTriggers();
    }
    while (nextLink(chain) && this.game.winner === null) {
      const link = nextLink(chain)!;
      await this.announceAbility(link.source, link.label, link.owner, 'ability', link.ordinal);
      const eventStart = this.game.duel?.events.length ?? 0;
      const targets = publicEffectTargets(this.game, link);
      if (link.status !== 'negated') await resolvers.get(link.id)!();
      await this.collectQueuedTriggers();
      finishLink(chain, link.id, link.status === 'negated' ? 'negated' : failures.get(link.id)?.size ? 'partial' : 'resolved');
      const drawn = (this.game.duel?.events.slice(eventStart) ?? []).filter(e => e.type === 'cardDrawn' && e.actor === link.owner)
        .flatMap(e => e.changes ?? []).filter(c => c.what === 'drawn').reduce((n, c) => n + c.to - c.from, 0);
      const outcomeLabel = effectOutcomeLabel(link.status, failures.get(link.id));
      const summary = outcomeLabel ? `${outcomeLabel}${drawn ? ` · Drew ${drawn}` : ''}` : drawn ? `Drew ${drawn}` : 'Resolved';
      emit(this.game, { actor: link.owner, type: 'abilityResolved', chain: { id: chain.id, linkId: link.id, ordinal: link.ordinal, stage: 'resolved' }, sourceUids: [link.source], targetUids: targets, visibility: 'public', result: { outcome: link.status, detail: summary }, message: `Link ${link.ordinal}: ${link.label} — ${summary}.` });
      await this.flushFx();
      await this.hooks.onAbilityResolved?.(link.source, link.owner, link.status, summary);
    }
    } finally { this.game.responseChain = null; }
    await this.drainPendingTriggers();
    return true;
  }

  /** Only explicitly permitted hand responses; ordinary Last Oaths never appear here. */
  private responseCandidates(owner: PlayerId): Array<{ uid: string; ability: AbilityScript; onCommit: () => void }> {
    const game = this.game;
    if (game.responseChain && game.responseChain.phase !== 'building') return [];
    const ordinaryWindow = (game.phase === 'battle' || (game.phase === 'main' && game.turnPlayer === owner))
      && (!game.activeBattle || ['declared', 'blocking'].includes(game.activeBattle.stage));
    const result: Array<{ uid: string; ability: AbilityScript; onCommit: () => void }> = [];
    for (const uid of you(game, owner).hand) {
      const script = this.scriptFor(uid);
      const mode = script?.forceModes?.[FORCE_SKILL];
      if (mode && (mode.response || ordinaryWindow) && this.forcePlayable(uid, owner)) result.push({ uid,
        ability: { id: `${inst(game, uid).defId}:force-hand`, text: mode.label, scope: ['Hand'], prepare: mode.prepare, targets: mode.targets, canRun: mode.canRun, run: mode.run },
        onCommit: () => this.commitForce(uid, owner),
      });
      const battle = game.activeBattle;
      if (ordinaryWindow && script?.sentry && battle && battle.defender === owner && battle.target === null && !battle.sentryUsed && !game.responseChain?.links.some(link => link.owner === owner && link.skillId.endsWith(':sentry'))) {
        const skill = script.abilities?.find(a => a.scope.includes('Hand'));
        if (skill && (!skill.canRun || skill.canRun(this.ctx(uid, owner)))) result.push({ uid,
          ability: { ...skill, id: `${inst(game, uid).defId}:sentry`, run: async ctx => {
            await this.hooks.onSentryRevealed?.(uid, owner);
            await skill.run(ctx);
            if (game.activeBattle === battle) battle.sentryUsed = true;
          } },
          onCommit: () => { moveCard(game, uid, 'exile', { faceDown: true, handMotion: !this.hooks.onSentryRevealed }); },
        });
      }
    }
    return result;
  }

  /** Collect whole batches while suppressing recursive effect execution. */
  private async collectQueuedTriggers(): Promise<void> {
    this.collectingTriggers++;
    try {
      await this.flushTokenTriggers(0);
      await this.flushSpecialCallTriggers();
      await this.flushDamageTriggers();
      await this.flushSpiritTriggers();
      await this.flushStateReleases();
    } finally { this.collectingTriggers--; }
  }

  async fireTrigger(name: TriggerName, p: PlayerId, event: TriggerEvent = { name }): Promise<void> {
    reevaluateState(this.index, this.game, p);
    if (name !== 'startOfTurn' && name !== 'personify') {
      if (this.game.responseChain || this.collectingTriggers) this.deferredSwitches.push({ name, owner: p, event });
      else await this.tryAutoSwitch(name, p, event, true);
    }
    const source = you(this.game, p).persona;
    if (source) prepareBabaylanEvent(this.ctx(source, p, event), event);
    const codex = you(this.game, p).activeCodex;
    if (codex && !def(this.index, this.game, codex).tutorial) prepareSetOneTrigger(this.ctx(codex, p, event));
    if (name === 'placed' && event.unit) await this.applyCallRules(inst(this.game, event.unit).owner, event.unit);
    for (const candidate of this.triggerCandidates(name, p, event)) {
      const serial = this.game.pendingTriggerSerial = (this.game.pendingTriggerSerial ?? 0) + 1;
      (this.game.pendingTriggers ??= []).push({
        id: `trigger-${serial}`, owner: p, source: candidate.uid, kind: candidate.kind,
        abilityIndex: candidate.kind === 'ability' ? this.scriptFor(candidate.uid)?.abilities?.indexOf(candidate.ability) : undefined,
        event: { ...structuredClone(event), qualifiedState: candidate.kind === 'ability' && candidate.ability.latchStateOnTrigger && candidate.ability.requiresState
          ? { source: candidate.uid, state: candidate.ability.requiresState } : undefined }, label: candidate.label, text: candidate.text,
      });
    }
    if (name === 'attackResolved' && event.unit && this.game.cards[event.unit]) {
      for (const ability of grantedAfterAttack(this.ctx(event.unit, p, event))) {
        if (!this.canUseAbility(event.unit, ability, p, event)) continue;
        const serial = this.game.pendingTriggerSerial = (this.game.pendingTriggerSerial ?? 0) + 1;
        (this.game.pendingTriggers ??= []).push({ id: `trigger-${serial}`, owner: p, source: event.unit,
          kind: 'granted', grantedId: ability.id, event: structuredClone(event), label: ability.text, text: ability.text });
      }
    }
    await this.drainPendingTriggers();
  }

  private async drainPendingTriggers(): Promise<void> {
    if (this.game.responseChain || this.collectingTriggers || this.drainingTriggers) return;
    this.drainingTriggers = true;
    try {
      await this.collectQueuedTriggers();
      while (this.game.winner === null) {
        for (const window of this.deferredSwitches.splice(0)) await this.tryAutoSwitch(window.name, window.owner, window.event, true);
        const pending = this.game.pendingTriggers ??= [];
        const available = pending.flatMap(occurrence => {
          if (!this.game.cards[occurrence.source]) return [];
          const script = this.scriptFor(occurrence.source);
          const ability = occurrence.kind === 'ability' ? script?.abilities?.[occurrence.abilityIndex!]
            : occurrence.kind === 'granted' ? grantedAfterAttack(this.ctx(occurrence.source, occurrence.owner, occurrence.event)).find(a => a.id === occurrence.grantedId) : undefined;
          const skill = script?.codex?.skill;
          const legal = occurrence.kind === 'granted' && !ability ? false : ability ? this.canUseAbility(occurrence.source, ability, occurrence.owner, occurrence.event)
            : you(this.game, occurrence.owner).activeCodex === occurrence.source && (skill?.maxUses === undefined || usedSkill(this.game, occurrence.owner, occurrence.source, `${inst(this.game, occurrence.source).defId}:codex`) < skill.maxUses) && (!skill?.canRun || skill.canRun(this.ctx(occurrence.source, occurrence.owner, occurrence.event)));
          return legal ? [{ occurrence, ability, skill }] : [];
        });
        if (!available.length) { pending.length = 0; break; }
        const owner = available.some(c => c.occurrence.owner === this.game.turnPlayer) ? this.game.turnPlayer : opponentOf(this.game.turnPlayer);
        const choices = available.filter(c => c.occurrence.owner === owner);
        const mandatory = choices.filter(c => c.ability?.automatic);
        // These self-only training bonuses commute; ordering them adds no choice.
        const simpleTrainingBonuses = this.game.rulesProfile === 'tutorial-v1'
          && choices.every(c => c.ability?.automatic && c.ability.id?.startsWith('tutorial-l'));
        const selected = (choices.length === 1 && mandatory.length) || simpleTrainingBonuses ? 0 : await this.chooserFor(owner).chooseAbility(
          owner, mandatory.length ? 'Choose your next triggered effect — required effects remain' : 'Choose your next triggered effect',
          choices.map(c => ({ id: c.occurrence.id, trigger: c.occurrence.event.name, cause: c.occurrence.event.offeredFrom, skillId: c.ability ? this.skillId(c.occurrence.source, c.ability) : `${inst(this.game, c.occurrence.source).defId}:codex`, uid: c.occurrence.source, cardName: def(this.index, this.game, c.occurrence.source).name, text: c.occurrence.text, costLabel: (c.ability?.prepare ?? this.scriptFor(c.occurrence.source)?.codex?.skill?.prepare)?.describe?.(this.ctx(c.occurrence.source, owner, c.occurrence.event)).label })),
          { kind: 'pending', allowDecline: mandatory.length === 0 },
        );
        if (selected === null) {
          // Decline optional occurrences only; mandatory ones remain owned choices.
          const optional = new Set(choices.filter(c => !c.ability?.automatic).map(c => c.occurrence.id));
          this.game.pendingTriggers = pending.filter(c => !optional.has(c.id));
          if (!optional.size) {
            const next = mandatory[0]!;
            if (next.ability) await this.runAbility(next.occurrence.source, next.ability, owner, next.occurrence.event);
            this.game.pendingTriggers = (this.game.pendingTriggers ?? []).filter(item => item.id !== next.occurrence.id);
          }
          continue;
        }
        const chosen = choices[selected];
        if (!chosen) throw new Error('Invalid pending-trigger selection.');
        const { occurrence, ability, skill } = chosen;
        let committed = false;
        if (ability) committed = await this.runAbility(occurrence.source, ability, owner, occurrence.event);
        else {
          const run = skill?.run ?? this.scriptFor(occurrence.source)?.codex?.run;
          if (run) committed = await this.startEffect(occurrence.source, owner, { id: `${inst(this.game, occurrence.source).defId}:codex`, text: occurrence.text, scope: [], prepare: skill?.prepare, targets: skill?.targets, specialCalls: skill?.specialCalls, run }, occurrence.event, () => recordSkillUse(this.game, owner, occurrence.source, `${inst(this.game, occurrence.source).defId}:codex`));
        }
        if (committed) this.game.pendingTriggers = (this.game.pendingTriggers ?? []).filter(item => item.id !== occurrence.id);
        else await new Promise<void>(resolve => setTimeout(resolve, 0));
        await this.collectQueuedTriggers();
      }
    } finally { this.drainingTriggers = false; }
  }

  /** Printed rules text for a card, used when an ability has none of its own. */
  private codexText(uid: string): string {
    const d = def(this.index, this.game, uid) as { text?: string; name: string };
    return d.text ?? d.name;
  }

  /** Everything that wants to fire on this trigger, in board order. */
  private triggerCandidates(
    name: TriggerName,
    p: PlayerId,
    event: TriggerEvent,
  ): TriggerCandidate[] {
    const ps = you(this.game, p);
    const out: TriggerCandidate[] = [];

    const onField = [...ps.allies.filter((x): x is string => !!x), ps.persona].filter(
      (x): x is string => !!x,
    );
    // For unitDamagedByAbility: the damaged unit may have been destroyed and
    // sent to grave before the trigger fires. Include it so its own "when
    // damaged" ability can still resolve.
    if ((name === 'unitDamagedByAbility' || name === 'unitOffered') && event.unit && !onField.includes(event.unit)) {
      const c = this.game.cards[event.unit];
      if (c && c.owner === p) onField.push(event.unit);
    }
    if (name === 'vented') {
      for (const uid of event.cards ?? []) {
        if (this.game.cards[uid]?.owner === p && !onField.includes(uid) && !ps.heart.includes(uid)) onField.push(uid);
      }
    }
    for (const uid of event.fieldObservers ?? []) if (!onField.includes(uid)) onField.push(uid);
    for (const uid of event.graveObservers ?? ps.grave) {
      if (!onField.includes(uid) && this.scriptFor(uid)?.abilities?.some(a => a.scope.includes('Grave') && a.trigger === name)) onField.push(uid);
    }
    if (name === 'essenced' && event.from === 'persona') {
      for (const uid of event.cards ?? []) if (!onField.includes(uid) && this.game.cards[uid]) onField.push(uid);
    }
    for (const uid of onField) {
      const script = this.scriptFor(uid);
      if (!script?.abilities) continue;
      for (const ability of script.abilities) {
        if (ability.trigger !== name) continue;
        // Triggers that name a specific unit only fire for that unit.
        // Exception: "observer" triggers watch events on OTHER units, so
        // don't filter them out by event.unit.
        const isObserver = name === 'tokenCreated' || name === 'unitDamagedByAbility' || name === 'unitOffered' || name === 'offerResolved' || name === 'forceResolved' || name === 'codexChanged'
          || name === 'supported' || name === 'attackResolved' || name === 'placed'
          || name === 'personaAttacked' || name === 'effectExhausted' || name === 'battleFinished';
        // For attack/personaAttack triggers: if the ability has its own canRun,
        // it may be watching ANOTHER unit's attack (e.g. "when your Persona
        // attacks" on a non-persona unit). Let canRun handle the filtering
        // instead of the event.unit check.
        // `attackMiss` used to be about the attacking unit and nothing else,
        // which is why it was excluded here. Maharaja watches his own
        // Persona's attack miss from exile, so the card firing is not the card
        // attacking — and an ability with its own canRun can be trusted to say
        // whose attack it cares about. `attackHit` is deliberately left out:
        // nothing uses it, so widening it would be untested.
        const isAttackObserver =
          (name === 'attack' || name === 'personaAttack' || name === 'attackResolved'
            || name === 'attackMiss')
          && !!ability.canRun;
        if (event.unit && event.unit !== uid && !isObserver && !isAttackObserver) continue;
        if (!this.canUseAbility(uid, ability, p, event)) continue;
        out.push({
          trigger: name,
          kind: 'ability',
          uid,
          ability,
          label: `${def(this.index, this.game, uid).name} — ${ability.text}`,
          text: ability.text,
        });
      }
    }

    // Babaylan/Oni: scan cards in Heart for Heart-scoped triggered abilities.
    for (const uid of ps.heart) {
      const script = this.scriptFor(uid);
      if (!script?.abilities) continue;
      for (const ability of script.abilities) {
        if (!ability.scope?.includes('Heart')) continue;
        if (ability.trigger !== name) continue;
        // Heart abilities can be observers (e.g. "when your Persona attacks").
        const isObserver = name === 'personaAttack' || name === 'placed' || name === 'spiritsGenerated' || name === 'personaAttacked' || name === 'startOfBattle' || name === 'endOfTurn' || name === 'effectExhausted' || name === 'barrierBroken';
        if (event.unit && event.unit !== uid && !isObserver) continue;
        if (!this.canUseAbility(uid, ability, p, event)) continue;
        out.push({
          trigger: name,
          kind: 'ability',
          uid,
          ability,
          label: `${def(this.index, this.game, uid).name} (Heart) \u2014 ${ability.text}`,
          text: ability.text,
        });
      }
    }

    // Oni: scan cards in hand for hand-scoped passive triggers (I'm Back).
    for (const uid of ps.hand) {
      const script = this.scriptFor(uid);
      if (!script?.abilities) continue;
      for (const ability of script.abilities) {
        if (!ability.scope?.includes('Hand')) continue;
        if (ability.trigger !== name) continue;
        if (!this.canUseAbility(uid, ability, p, event)) continue;
        out.push({
          trigger: name,
          kind: 'ability',
          uid,
          ability,
          label: `${def(this.index, this.game, uid).name} (Hand) — ${ability.text}`,
          text: ability.text,
        });
      }
    }

    if (ps.activeCodex) {
      const script = this.scriptFor(ps.activeCodex);
      const codex = script?.codex;
      // Legacy triggered codex effect (being phased out).
      if (codex?.triggers?.length && codex?.run && codex.triggers.includes(name)) {
        out.push({
          trigger: name,
          kind: 'codex',
          uid: ps.activeCodex,
          run: codex.run,
          label: `${def(this.index, this.game, ps.activeCodex).name} (Codex)`,
          text: this.codexText(ps.activeCodex),
        });
      }
      // New skill system: auto-type skills fire on matching triggers.
      if (codex?.skill?.type === 'auto') {
        // Only fire on the skill's designated trigger(s) (if specified).
        const skillTriggers = codex.skill.trigger
          ? (Array.isArray(codex.skill.trigger) ? codex.skill.trigger : [codex.skill.trigger])
          : null;
        if (skillTriggers && !skillTriggers.includes(name)) {
          // skip — this skill doesn't fire on this trigger
        } else {
          const ctx = this.ctx(ps.activeCodex, p, event);
          if (!codex.skill.canRun || codex.skill.canRun(ctx)) {
            out.push({
              trigger: name,
              kind: 'codex',
              uid: ps.activeCodex,
              run: codex.skill.run,
              label: `${def(this.index, this.game, ps.activeCodex).name} (Skill)`,
              text: codex.skill.text,
            });
          }
        }
      }
      // Also scan the active Codex's abilities array for Deck-scoped triggers.
      if (script?.abilities) {
        for (const ability of script.abilities) {
          if (!ability.scope?.includes('Deck')) continue;
          if (ability.trigger !== name) continue;
          if (!this.canUseAbility(ps.activeCodex, ability, p, event)) continue;
          out.push({
            trigger: name,
            kind: 'ability',
            uid: ps.activeCodex,
            ability,
            label: `${def(this.index, this.game, ps.activeCodex).name} (Codex) — ${ability.text}`,
            text: ability.text,
          });
        }
      }
    }
    return out;
  }



  /** Offer one optional, free switch at this trigger occurrence. */
  private async tryAutoSwitch(
    trigger: TriggerName | TriggerName[],
    p: PlayerId,
    event?: TriggerEvent,
    babaylanOnly = false,
  ): Promise<void> {
    const wanted = Array.isArray(trigger) ? trigger : [trigger];
    const ps = you(this.game, p);

    const eligible = ps.codex.filter((uid) => {
      if (!canSwitchCodex(this.index, this.game, uid, { player: p, automatic: true })) return false;
      // Set 1 Codex switch through their own path, where board conditions
      // are honoured; the legacy ones do not have conditions and go through
      // the other. Named for the deck it started with, and it has to list
      // every Set 1 deck: a deck missing here has its `autoSwitchWhen`
      // silently ignored and is offered from the wrong path.
      const isSetOne = /^(babaylan|agta|maguindanao)\/set-1\//
        .test(inst(this.game, uid).defId);
      if (babaylanOnly && !isSetOne) return false;
      if (isSetOne && !babaylanOnly) return false;
      const condition = this.scriptFor(uid)?.codex?.autoSwitchWhen;
      if (isSetOne && condition && !condition(this.ctx(uid, p, event))) return false;
      const on = this.scriptFor(uid)?.codex?.autoSwitchOn;
      if (!on) return false;
      const has = Array.isArray(on) ? on : [on];
      return has.some((t) => wanted.includes(t));
    });
    if (eligible.length === 0) return;
    // Asked once and declined: under a quieter policy, don't keep asking.
    const windowKey = `${p}:${wanted.join(',')}`;
    if (this.promptPolicy() !== 'all' && this.declinedAutoSwitch.has(windowKey)) return;

    const chosen = await this.chooserFor(p).chooseTarget(
      p,
      wanted.length === 1
        ? `${TRIGGER_LABEL[wanted[0]!] ?? wanted[0]} — switch Codex? Free.`
        : 'Switch Codex? Free.',
      eligible,
    );
    if (!chosen) {
      this.declinedAutoSwitch.add(windowKey);
      return;
    }

    if (!eligible.includes(chosen) || !canSwitchCodex(this.index, this.game, chosen, { player: p, automatic: true })) return;
    this.activateCodex(chosen, p, true);
    const on = this.scriptFor(chosen)?.codex?.autoSwitchOn;
    ps.autoSwitchTriggersUsed.push(
      (Array.isArray(on) ? on[0] : on) ?? wanted[0]!,
    );
    await this.fireCodexPlayed(chosen, p);
  }

  /** Flip a Codex face up as the active one. */
  private activateCodex(uid: string, p: PlayerId, isAuto: boolean = false): void {
    switchCodex(this.index, this.game, uid, { player: p, automatic: isAuto });
    emit(this.game, {
      actor: p,
      type: 'codexSwitched',
      sourceUids: [uid],
      targetUids: [],
      visibility: 'public',
      message: `Codex switched to ${def(this.index, this.game, uid).name}.`,
    });
  }

  /**
   * A Codex becoming active fires its green "when played" ability - and green
   * is optional, so the player is asked, exactly as with any other green.
   */
  private async fireCodexPlayed(uid: string, p: PlayerId): Promise<void> {
    await this.fireTrigger('codexChanged', p);
    if (/^(agta|babaylan|maguindanao)\/set-1\//.test(this.game.cards[uid]?.defId ?? '')) {
      await this.fireTrigger('codexPlayed', p);
      return;
    }
    const script = this.scriptFor(uid);
    if (!script?.codex?.triggers?.includes('codexPlayed') || !script?.codex?.run) return;

    const pick = await this.chooserFor(p).chooseAbility(
      p,
      'Your Codex became active — use its effect?',
      [{ uid, cardName: def(this.index, this.game, uid).name, text: this.codexText(uid) }],
    );
    if (pick === null) return;
    await script.codex.run(this.ctx(uid, p, { name: 'codexPlayed' }));
    await this.flushTokenTriggers(p);
    await this.flushSpecialCallTriggers();
    await this.flushDamageTriggers();
    await this.flushSpiritTriggers();
    tryReleaseEventState(this.index, this.game, p);
  }

  /**
   * Sweep pending token creations and fire tokenCreated triggers.
   * Called after any effect that might create tokens.
  /**
   * Fire tokenCreated triggers for pending token creations.
   */
  async flushTokenTriggers(p: PlayerId): Promise<void> {
    this.collectingTriggers++;
    try { await this.flushTokenTriggersBatch(p); } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();
  }

  private async flushTokenTriggersBatch(p: PlayerId): Promise<void> {
    const pending = this.game.pendingTokenCreated.splice(0);
    if (pending.length === 0) return;

    // Fire tokenCreated for each token in the batch (for Lirien etc).
    for (const uid of pending) {
      if (this.game.cards[uid]) {
        await this.hooks.onTokenCreated?.(uid, inst(this.game, uid).owner);
      }
      await this.fireTrigger('tokenCreated', this.game.cards[uid]?.owner ?? p, { name: 'tokenCreated', unit: uid });
    }
  }

  /**
   * Liguasan Marsh: special call an Offered unit back to the field. Queued by
   * offerUnit() because that is synchronous and specialCall is not.
   */
  async flushOfferRecall(): Promise<void> {
    const pending = this.game.pendingOfferRecall.splice(0);
    for (const evt of pending) {
      const c = this.game.cards[evt.uid];
      if (!c || c.zone !== 'grave') continue;
      const ps = you(this.game, evt.owner);
      if (!ps.allies.some((slot) => slot === null)) continue;

      // The Codex speaks before it acts. This recall is queued out of
      // offerUnit() rather than run as a skill, so it used to reach in and
      // move the card with nothing on screen saying which card had decided
      // that — the unit simply climbed out of the Grave on its own. Announce
      // the Codex first, then let specialCall light the Grave and fly the
      // card, so the causing card, the moving card and the movement each get
      // their own beat, in that order.
      // `evt.codex`, not the current active Codex: an auto-switch between
      // the Offer and this flush would otherwise make some other card take
      // the credit, while the log below still names the Marsh.
      const skill = this.scriptFor(evt.codex)?.codex?.skill;
      await this.announceAbility(
        evt.codex, skillLabel(skill?.text ?? ''), evt.owner, 'codex', 1,
      );

      ps.grave = ps.grave.filter((uid) => uid !== evt.uid);
      await specialCall(this.ctx(evt.uid, evt.owner), evt.uid);
      log(
        this.game,
        `Liguasan Marsh: ${def(this.index, this.game, evt.uid).name} was special called back to the field.`,
        [evt.uid],
      );
    }
  }

  /** Flush pending special calls — fire placed trigger for special calls. */
  /** Announce any State that released since the last drain. */
  async flushStateReleases(): Promise<void> {
    this.collectingTriggers++;
    try { await this.flushStateReleasesBatch(); } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();
  }

  private async flushStateReleasesBatch(): Promise<void> {
    const pending = this.game.pendingStateReleases?.splice(0) ?? [];
    for (const owner of pending) {
      await this.fireTrigger('stateReleased', owner, { name: 'stateReleased' });
    }
  }

  async flushSpecialCallTriggers(): Promise<void> {
    this.collectingTriggers++;
    try { await this.flushSpecialCallTriggersBatch(); } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();
  }

  private async flushSpecialCallTriggersBatch(): Promise<void> {
    const pending = this.game.pendingSpecialCalls.splice(0);
    for (const evt of pending) {
      if (this.game.cards[evt.uid]) {
        await this.applyCallRules(evt.owner, evt.uid, true);
        // Fire the placed trigger with special: true so cards that only
        // respond to special calls (e.g. Mayumi) can distinguish.
        await this.fireTrigger('placed', evt.owner, {
          name: 'placed', unit: evt.uid, special: true, from: evt.from,
        });
      }
    }
  }

  /**
   * Fire the unitDamagedByAbility trigger.
   * Called after any effect that damages a unit by ability.
   */
  async flushDamageTriggers(): Promise<void> {
    this.collectingTriggers++;
    try { await this.flushDamageTriggersBatch(); } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();
  }

  private async flushDamageTriggersBatch(): Promise<void> {
    const protectedDamage = this.game.pendingRefugeDamage?.splice(0) ?? [];
    for (const evt of protectedDamage) {
      if (this.game.cards[evt.uid]?.zone !== 'ally') continue;
      const ps = you(this.game, evt.owner);
      const ctx = this.ctx(evt.codex, evt.owner);
      const choices = ps.allies.filter((u): u is string => !!u && u !== evt.uid);
      let prevented = false;
      if (ps.activeCodex === evt.codex && !inst(this.game, evt.codex).usesThisTurn.refuge && choices.length &&
          await ctx.chooser.confirm(evt.owner, 'Last Refuge: Offer another Ally to prevent this ability damage?')) {
        const chosen = await ctx.chooser.chooseTarget(evt.owner, 'Offer which other Ally?', choices);
        if (chosen && choices.includes(chosen)) {
          inst(this.game, evt.codex).usesThisTurn.refuge = 1;
          prevented = offerUnit(ctx, chosen);
          await this.flushDamageTriggers();
        }
      }
      if (!prevented) damageUnitByAbility(this.ctx(evt.source, evt.damager), evt.uid, true);
    }
    const pending = this.game.pendingDamageByAbility.splice(0);
    for (const evt of pending) {
      // Re-evaluate event-driven states for the damager.
      tryReleaseEventState(this.index, this.game, evt.damager);
      // Fire the trigger for both players — some abilities (Audra, Runa)
      // react to ANY unit being damaged, not just their own.
      const event = { name: 'unitDamagedByAbility' as const, unit: evt.damagedUid ?? undefined, damager: evt.damager };
      if (evt.offered) {
        await this.fireTrigger('unitOffered', evt.damagedOwner, { ...event, name: 'unitOffered', offeredFrom: evt.offeredFrom, firstOfferThisTurn: evt.firstOfferThisTurn, fieldObservers: evt.fieldObservers, graveObservers: evt.graveObservers });
        await this.fireTrigger('offerResolved', evt.damagedOwner, { ...event, name: 'offerResolved' });
        continue;
      }
      await this.fireTrigger('unitDamagedByAbility', evt.damagedOwner, event);
      // Also fire for the damager so their "observer" abilities can react.
      if (evt.damager !== evt.damagedOwner) {
        await this.fireTrigger('unitDamagedByAbility', evt.damager, event);
      }
    }
  }





  /** Babaylan: fire spiritsGenerated triggers (Amaya extra Spirit, Dayaw buff). */
  async flushSpiritTriggers(): Promise<void> {
    this.collectingTriggers++;
    try { await this.flushSpiritTriggersBatch(); } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();
  }

  private async flushSpiritTriggersBatch(): Promise<void> {
    // The complete Sanib/Kalas cost must be visible before its reactions ask for input.
    await this.flushFx();
    while (this.game.pendingBabaylan?.length) {
      const evt = this.game.pendingBabaylan.shift()!;
      await this.fireTrigger(evt.name, evt.owner, { ...evt });
    }
    const pending = this.game.pendingSpiritGeneration.splice(0);
    for (const evt of pending) {
      await this.fireTrigger('spiritsGenerated', evt.owner, {
        name: 'spiritsGenerated',
      });
    }
    // Check Andukha 12 permanent persona bonus.
    for (const pid of [0, 1] as PlayerId[]) {
      const ps = you(this.game, pid);
      // Effective heart count (Baya counts as 2).
      let heartCount = 0;
      for (const uid of ps.heart) {
        heartCount += def(this.index, this.game, uid).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
      }
      if (this.game.rulesProfile !== 'tutorial-v1' && !ps.andukha12Granted && heartCount >= 12 && ps.persona && !def(this.index, this.game, ps.persona).id.startsWith('babaylan/set-1/')) {
        ps.andukha12Granted = true;
        // Permanent +3000 to persona.
        inst(this.game, ps.persona).modifiers.push({
          amount: 3000,
          duration: 'permanent',
          source: 'Andukha 12',
        });
        log(this.game, `Player ${pid}: Andukha 12 reached — Persona permanently gets +3000.`, [ps.persona]);
      }
      // Re-evaluate Andukha state (may release at 6+ or clear if spirits spent).
      tryReleaseEventState(this.index, this.game, pid);
      reevaluateState(this.index, this.game, pid);
    }
  }


  /** Elf: apply continuous rules that fire on unit calls (Undiscovered Valley).
   */
  async applyCallRules(p: PlayerId, _calledUid: string, _special = false): Promise<void> {
    const ps = you(this.game, p);

    for (const rule of this.game.activeRules) {
      if (rule.owner !== p) continue;
      if (rule.label.startsWith('Undiscovered Valley')) {
        const stampede = isReleased(this.game, p, 'Stampede');
        if (stampede) {
          // Choose up to 3 units to get +1000.
          const targets = [...ps.allies.filter((x): x is string => !!x), ps.persona].filter(
            (x): x is string => !!x,
          );
          for (let i = 0; i < Math.min(3, targets.length); i++) {
            const remaining = targets.filter(() => {
              // Don't buff the same unit twice — simple approach: just buff first 3.
              return true;
            });
            if (!remaining.length) break;
            const pick = await this.chooserFor(p).chooseTarget(
              p, `Undiscovered Valley: buff which unit +1000? (${i + 1}/3)`, remaining,
            );
            if (!pick) break;
            inst(this.game, pick).modifiers.push({
              amount: 1000, duration: 'endOfTurn', source: 'Undiscovered Valley',
            });
            targets.splice(targets.indexOf(pick), 1);
          }
        } else {
          // Persona gets +1000.
          if (ps.persona) {
            inst(this.game, ps.persona).modifiers.push({
              amount: 1000, duration: 'endOfTurn', source: 'Undiscovered Valley',
            });
          }
        }
      }
    }

    // Bayanihan (Agta): check if all ally zones are now occupied by Luzon Arch units.
    tryReleaseEventState(this.index, this.game, p);
  }

  private async announcePhase(phase: Phase): Promise<void> {
    emit(this.game, {
      actor: this.game.turnPlayer,
      type: 'phaseChanged',
      sourceUids: [],
      targetUids: [],
      phase,
      visibility: 'public',
      message: `${PHASE_NAMES[phase] ?? phase} phase.`,
    });
    await this.hooks.onPhaseChange?.(phase, this.game.turnPlayer);
  }

  async beginTurn(): Promise<void> {
    const p = this.game.turnPlayer;
    beginGroup(this.game);
    emit(this.game, {
      actor: p,
      type: 'turnStarted',
      sourceUids: [],
      targetUids: [],
      visibility: 'public',
      message: `Turn ${this.game.turnNumber}.`,
    });
    // A decline is good for this turn only, and for whoever declined — the
    // defender declines on someone else's turn, so both seats reset here.
    this.declinedAutoSwitch.clear();
    // Start the turn WITHOUT drawing — the draw is animated separately below.
    startTurn(this.index, this.game, { skipDraw: true });
    await this.announcePhase('start');

    // Separate printed timing windows remain available while their owner has plays.
    await this.tryAutoSwitch('startOfTurn', p);
    await this.tryAutoSwitch('startOfTurn', p, { name: 'startOfTurn' }, true);

    // Evaluate states BEFORE the draw step so draw-replacement codexes
    // can check state conditions. States are re-evaluated after
    // the draw as well.
    evaluateStates(this.index, this.game, p);
    await this.flushFx();

    // Commit first, then animate into the new hand slot (as effect draws do).
    // The UI hides that destination until arrival; Main waits for the flight.
    // Check if the active Codex has a replacement-type skill that replaces the draw.
    const ps0 = you(this.game, p);
    const activeCodexScript = ps0.activeCodex ? this.scriptFor(ps0.activeCodex) : null;
    const drawReplacement = activeCodexScript?.codex?.skill;
    // `replaces` defaults to 'draw': every replacement meant the draw before
    // Personify and Sipol had replacements of their own, and the legacy
    // Codex do not declare it.
    const replacesDraw = drawReplacement?.type === 'replacement'
      && (drawReplacement.replaces ?? 'draw') === 'draw';
    if (!hasTurnDraw(this.game)) {
      log(this.game, 'The first player skips their first-turn draw.');
    } else if (replacesDraw && ps0.activeCodex) {
      // The skill replaces the normal draw. Fire it with a startOfTurn event.
      const ctx = this.ctx(ps0.activeCodex, p, { name: 'startOfTurn' });
      if (!drawReplacement.canRun || drawReplacement.canRun(ctx)) {
        await this.startEffect(ps0.activeCodex, p, { ...drawReplacement, trigger: undefined, scope: [], id: `${inst(this.game, ps0.activeCodex).defId}:codex` }, { name: 'startOfTurn' });
        await this.collectQueuedTriggers();
        await this.drainPendingTriggers();
        await this.flushFx();
        // The replacement skill may have special-called a unit (e.g. Hidden Path).
        // Flush those pending triggers so "when specially called" abilities fire.
        await this.flushSpecialCallTriggers();
      } else {
        // Can't use the replacement — draw normally.
        const drawnUid = draw(this.game, p);
        if (drawnUid) await this.hooks.onCardDrawn?.(drawnUid, p);
      }
    } else {
      const drawnUid = draw(this.game, p);
      if (drawnUid) {
        await this.hooks.onCardDrawn?.(drawnUid, p);
      }
    }

    // Deck-out ends the game during the draw step. Everything below — states,
    // start-of-turn triggers, the Personify prompt, the Main phase — belongs
    // to a turn that is no longer going to be played, and offering it to a
    // player who has already lost is worse than doing nothing.
    if (this.game.winner !== null) return;

    evaluateStates(this.index, this.game, p);
    await this.flushFx();
    await this.fireTrigger('startOfTurn', p);

    // WINDOW 2 of 6 — before you Personify.
    //
    // Before the candidates are gathered, so a Codex switched in here can
    // replace the whole step rather than merely decorate it.
    await this.tryAutoSwitch('personify', p);
    await this.tryAutoSwitch('personify', p, { name: 'personify' }, true);

    // Personify phase: if the player has personification options, ask them.
    const ps = you(this.game, p);

    // A Codex may stand in for the Personify step entirely — Salikan
    // Personifies out of the deck rather than the hand. It runs instead of
    // the prompt, and whatever it does counts as the Personify for the
    // turn, including doing nothing.
    const personifySkill = ps.activeCodex
      ? this.scriptFor(ps.activeCodex)?.codex?.skill : null;
    if (personifySkill?.type === 'replacement'
      && personifySkill.replaces === 'personify' && ps.activeCodex) {
      const ctx = this.ctx(ps.activeCodex, p, { name: 'personify' });
      if (!personifySkill.canRun || personifySkill.canRun(ctx)) {
        await this.announcePhase('personify');
        const previousPersona = ps.persona;
        await this.startEffect(ps.activeCodex, p, { ...personifySkill, trigger: undefined, scope: [], id: `${inst(this.game, ps.activeCodex).defId}:codex` }, { name: 'personify' });
        await this.collectQueuedTriggers();
        await this.drainPendingTriggers();
        await this.flushFx();
        if (ps.persona && ps.persona !== previousPersona) {
          ps.personifiedThisTurn = true;
          emit(this.game, {
            actor: p, type: 'personaChanged', sourceUids: [ps.persona], targetUids: [],
            visibility: 'public', message: `${def(this.index, this.game, ps.persona).name} became your Persona.`,
          });
          await this.hooks.onPersonify?.(ps.persona, p);
          await this.fireTrigger('personify', p, { name: 'personify', unit: ps.persona });
        }
        await this.flushSpecialCallTriggers();
        evaluateStates(this.index, this.game, p);
        await this.flushFx();
        await this.startMain(p);
        return;
      }
    }

    const personifyCandidates = ps.hand.filter((uid) =>
      canPersonify(this.index, this.game, uid),
    );
    // Kuta Wato: personify from Grave — [Discard 1 card] instead of from hand.
    const hasKutaWato = ps.activeCodex && !def(this.index, this.game, ps.activeCodex).tutorial &&
      this.scriptFor(ps.activeCodex)?.id === 'maguindanao/kuta-wato';
    let gravePersonifyCandidates: string[] = [];
    if (hasKutaWato && ps.hand.length > 0) {
      for (const uid of ps.grave) {
        const d = def(this.index, this.game, uid);
        if (d.type === 'Unit' && d.level >= 3 && d.subtypes?.includes('Maguindanao')) {
          if (!ps.persona || d.level >= def(this.index, this.game, ps.persona).level) {
            gravePersonifyCandidates.push(uid);
          }
        }
      }
    }
    const allCandidates = [...personifyCandidates, ...gravePersonifyCandidates];
    if (allCandidates.length > 0) {
      await this.announcePhase('personify');
      const choice = await this.chooserFor(p).personifyPrompt(p, allCandidates);
      if (choice !== null) {
        ps.personifiedThisTurn = true;
        const fromGrave = gravePersonifyCandidates.includes(choice);
        if (fromGrave) {
          // Kuta Wato: discard 1 card, then personify from Grave.
          const toDiscard = await this.chooserFor(p).chooseTarget(
            p, 'Kuta Wato: Discard which card? (cost for personify from Grave)', [...ps.hand],
          );
          if (toDiscard) {
            ps.hand.splice(ps.hand.indexOf(toDiscard), 1);
            moveCard(this.game, toDiscard, 'grave');
            log(this.game, `Player ${p} discarded ${def(this.index, this.game, toDiscard).name} (Kuta Wato).`, [toDiscard]);
          }
          // Same ceremony wherever the unit came from: the Grave route was
          // skipping the hook, so a Kuta Wato personify got no animation and
          // no cutscene while the ordinary one did.
          emit(this.game, {
            actor: p,
            type: 'personaChanged',
            sourceUids: [choice],
            targetUids: [],
            visibility: 'public',
            message: `${def(this.index, this.game, choice).name} became your Persona.`,
          });
          await this.hooks.onPersonify?.(choice, p);
          // Remove from Grave and personify.
          ps.grave.splice(ps.grave.indexOf(choice), 1);
          const outgoing = ps.persona;
          if (outgoing) moveCard(this.game, outgoing, 'heart');
          moveCard(this.game, choice, 'persona');
          log(this.game, `Player ${p} personified into ${def(this.index, this.game, choice).name} (from Grave, Kuta Wato).`, [choice]);
        } else {
          emit(this.game, {
            actor: p,
            type: 'personaChanged',
            sourceUids: [choice],
            targetUids: [],
            visibility: 'public',
            message: `${def(this.index, this.game, choice).name} became your Persona.`,
          });
          await this.hooks.onPersonify?.(choice, p);
          personify(this.index, this.game, choice);
        }
        // Fire personify trigger so Codex skills can react.
        await this.fireTrigger('personify', p, { name: 'personify', unit: choice });
      }
    }
    await this.startMain(p);
  }

  /**
   * Open the Main Phase.
   *
   * Its own method because the Personify step has two exits — the normal
   * prompt and a Codex that replaced it — and both have to arrive here.
   */
  private async startMain(p: PlayerId): Promise<void> {
    toMainPhase(this.game);
    await this.announcePhase('main');
    // WINDOW 3 of 6 — the first action of your Main.
    //
    // Offered as the phase opens, which is the moment before the first
    // action can be taken. A `startOfMain` Codex needs to be active when
    // Main begins to be worth anything, so asking after the first play
    // would be asking too late.
    await this.tryAutoSwitch('startOfMain', p);
    await this.fireTrigger('startOfMain', p);
  }

  async enterBattle(): Promise<void> {
    this.game.phase = 'battle';
    await this.announcePhase('battle');
    await this.fireTrigger('startOfBattle', this.game.turnPlayer);
  }

  /**
   * Concede the duel.
   *
   * A player who has clearly lost currently has no way out but closing the
   * tab, which is a worse experience than losing and costs us the feedback of
   * whatever they would have said afterwards.
   *
   * Refuses once the game is decided, so conceding cannot overwrite a win that
   * has already happened — a click landing during the winning animation must
   * not turn a victory into a surrender.
   */
  concede(p: PlayerId): boolean {
    if (this.game.winner !== null) return false;
    this.game.winner = opponentOf(p);
    this.game.winReason = 'surrender';
    log(this.game, `Player ${p} surrendered. Player ${this.game.winner} wins!`);
    emit(this.game, {
      actor: p,
      type: 'matchEnded',
      sourceUids: [],
      targetUids: [],
      result: { outcome: 'surrender', detail: 'The duel was conceded.' },
      visibility: 'public',
      message: 'The duel was conceded.',
    });
    return true;
  }

  async finishTurn(): Promise<void> {
    const p = this.game.turnPlayer;
    this.game.phase = 'end';
    await this.announcePhase('end');
    await this.fireTrigger('endOfTurn', p);
    this.collectingTriggers++;
    try {
    const debtSource = you(this.game, p).activeCodex ?? you(this.game, p).persona;
    if (debtSource) await payTrialDebt(this.ctx(debtSource, p));
    if (you(this.game, p).persona) await finishSetOneTurn(this.ctx(you(this.game, p).persona!, p));
    if (you(this.game, p).persona) await finishBabaylanReturns(this.ctx(you(this.game, p).persona!, p), 'turn');
    await runEndOfTurn(this.game, p, this.chooserFor(p));
    } finally { this.collectingTriggers--; }
    await this.collectQueuedTriggers();
    await this.drainPendingTriggers();

    // A deferred trigger may call Apu or schedule a Heart return during cleanup.
    // Finish every newly due batch before advancing the turn, with its triggers
    // still offered as owned chains between batches.
    while (this.game.winner === null && you(this.game, p).persona && (
      hasSetOneTurnExpiry(this.ctx(you(this.game, p).persona!, p)) ||
      this.game.babaylanReturns?.some(r => r.owner === p && r.turn === this.game.turnNumber && r.when === 'turn')
    )) {
      this.collectingTriggers++;
      try {
        await finishSetOneTurn(this.ctx(you(this.game, p).persona!, p));
        await finishBabaylanReturns(this.ctx(you(this.game, p).persona!, p), 'turn');
      } finally { this.collectingTriggers--; }
      await this.collectQueuedTriggers();
      await this.drainPendingTriggers();
    }

    // Flush any damage triggers queued by end-of-turn effects (Siv).
    await this.flushDamageTriggers();
    await this.flushSpiritTriggers();

    // Expire endOfBattlePhase rules and run their customRun.
    const battlePhaseRules = this.game.activeRules.filter(
      (r) => r.expires === 'endOfBattlePhase',
    );
    for (const rule of battlePhaseRules) {
      if (rule.customRun) await rule.customRun();
    }
    this.game.activeRules = this.game.activeRules.filter(
      (r) => r.expires !== 'endOfBattlePhase',
    );

    endBattlePhase(this.game);

    // Track whether codex was switched this turn (manual or auto) for the
    // Historical switch information; it does not gate the next turn.
    const ps = you(this.game, p);
    ps.switchedCodexLastTurn = ps.codexSwitchedThisTurn || ps.autoSwitchedThisTurn;
    // Same rollover as the Codex flag, for the same reason: "last turn"
    // has to mean the turn that just ended, from the moment it ends.
    ps.sipolLastTurn = ps.sipolThisTurn ?? 0;
    ps.sipolThisTurn = 0;

    endTurnState(this.game);
  }


  /** Drain queued presentation events to the client, in order. */
  /** Drain queued events on demand. Tests only — play drains at its own points. */
  async drainFxForTest(): Promise<void> {
    await this.flushFx();
  }

  private async flushFx(): Promise<void> {
    if (!this.hooks.onFx) {
      this.game.pendingFx.length = 0;
      return;
    }
    const pending = this.game.pendingFx.splice(0);
    for (const fx of pending) await this.hooks.onFx(fx);
  }

  legalActions(p: PlayerId): PlayerAction[] {
    const out: PlayerAction[] = [];
    const ps = you(this.game, p);
    if (this.game.winner !== null || this.game.turnPlayer !== p || this.game.responseChain || this.drainingTriggers) return out;

    if (this.game.phase === 'main') {
      for (const uid of ps.hand) {
        const d = def(this.index, this.game, uid);
        const script = this.scriptFor(uid);

        if (d.type === 'Unit' || d.type === 'Force') {
          for (let slot = 0; slot < ps.allies.length; slot++) {
            if (canNormalCall(this.index, this.game, uid, { slot })) {
              out.push({ kind: 'call', uid, slot });
            }
          }
        }
        if (this.forcePlayable(uid, p)) {
          out.push({ kind: 'playForce', uid, mode: FORCE_SKILL });
        }
        if (d.type === 'Action' && script?.action) {
          const ok =
            (!script.action.canRun || script.action.canRun(this.ctx(uid, p)));
          if (ok && ps.normalPlaysUsed < maxPlays(this.index, this.game, p)) out.push({ kind: 'playAction', uid });
        }
      }

      for (const uid of ps.codex) {
        if (canSwitchCodex(this.index, this.game, uid)) out.push({ kind: 'switchCodex', uid });
      }

      // Codex skill: action-type skills can be activated from Main phase.
      if (ps.activeCodex) {
        const script = this.scriptFor(ps.activeCodex);
        const skill = script?.codex?.skill;
        if (skill?.type === 'action') {
          const maxUses = skill.maxUses ?? 1;
          if (usedSkill(this.game, p, ps.activeCodex, `${inst(this.game, ps.activeCodex).defId}:codex`) < maxUses) {
            const ctx = this.ctx(ps.activeCodex, p);
            if (!skill.canRun || skill.canRun(ctx)) {
              out.push({ kind: 'useSkill' });
            }
          }
        }
      }

      // Activated abilities on the field.
      for (const uid of [...ps.allies.filter((x): x is string => !!x), ps.persona]) {
        if (!uid) continue;
        const script = this.scriptFor(uid);
        script?.abilities?.forEach((ability, i) => {
          if (ability.trigger) return; // triggered, not activated
          if (this.canUseAbility(uid, ability, p)) {
            out.push({ kind: 'ability', uid, abilityIndex: i });
          }
        });
      }

      // Activated abilities on a card still in hand.
      //
      // The only Hand-scope abilities before this were Sentries, which are
      // revealed by the defence prompt rather than played, so nothing ever
      // offered a hand card as an ordinary action and a card printed with
      // one was unplayable. Sentries stay out of this list: their Hand
      // ability IS the reveal, and offering it on your own turn would let
      // you spend the shield before anything attacked it.
      for (const uid of ps.hand) {
        const script = this.scriptFor(uid);
        if (script?.sentry) continue;
        script?.abilities?.forEach((ability, i) => {
          if (ability.trigger) return;
          if (!ability.scope?.includes('Hand')) return;
          if (this.canUseAbility(uid, ability, p)) {
            out.push({ kind: 'ability', uid, abilityIndex: i });
          }
        });
      }

      // Activated abilities from Heart zone (e.g. Maliya).
      for (const uid of ps.heart) {
        const script = this.scriptFor(uid);
        script?.abilities?.forEach((ability, i) => {
          if (ability.trigger) return; // triggered, not activated
          if (!ability.scope?.includes('Heart')) return;
          if (this.canUseAbility(uid, ability, p)) {
            out.push({ kind: 'ability', uid, abilityIndex: i });
          }
        });
      }

      // Relocation uses the per-card movement limit, never a normal play.
      {
        for (let fromSlot = 0; fromSlot < ps.allies.length; fromSlot++) {
          const uid = ps.allies[fromSlot];
          if (!uid) continue;
          if (inst(this.game, uid).relocatedThisTurn) continue;
          for (let toSlot = 0; toSlot < ps.allies.length; toSlot++) {
            if (toSlot === fromSlot) continue;
            out.push({ kind: 'relocate', uid, toSlot });
          }
        }
      }

      out.push({ kind: 'endPhase' });
    }

    if (this.game.phase === 'battle') {
      const targets = legalTargets(this.game, opponentOf(p));
      const attackers = [...ps.allies.filter((x): x is string => !!x), ps.persona].filter(
        (x): x is string => !!x && canAttack(this.game, x),
      );
      for (const attacker of attackers) {
        const supporters = ps.allies
          .filter((x): x is string => !!x)
          .filter((s) => canSupport(this.game, s, attacker));
        for (const target of targets) {
          // Every subset is a distinct commitment: preserve one Ally's attack
          // instead of forcing bots to choose between none and all.
          for (let mask = 0; mask < 2 ** supporters.length; mask++) {
            out.push({ kind: 'attack', attacker, target,
              supporters: supporters.filter((_, i) => (mask & (1 << i)) !== 0) });
          }
        }
      }
      // A Force is a battle card as much as a Main Phase one: its skill is
      // printed yellow, and yellow means it reaches across the battle. Here
      // that is the attacker spending one between swings.
      for (const uid of ps.hand) {
        if (this.forcePlayable(uid, p)) {
          out.push({ kind: 'playForce', uid, mode: FORCE_SKILL });
        }
      }

      out.push({ kind: 'endTurn' });
    }

    return out;
  }

  /** Can this hand card be played for its Force skill right now? */
  private forcePlayable(uid: string, p: PlayerId): boolean {
    if (!you(this.game, p).hand.includes(uid)) return false;
    const d = def(this.index, this.game, uid);
    if (d.type !== 'Force') return false;
    const mode = this.scriptFor(uid)?.forceModes?.[FORCE_SKILL];
    if (!mode) return false;
    return !mode.canRun || mode.canRun(this.ctx(uid, p));
  }

  /**
   * Play a Force from hand for its skill. Shared by the ordinary action and
   * by the defence window, which reaches it on the opponent's turn.
   */
  private async playForceFromHand(uid: string, p: PlayerId): Promise<void> {
    if (!this.forcePlayable(uid, p)) return;
    const mode = this.scriptFor(uid)!.forceModes![FORCE_SKILL]!;
    await this.startEffect(uid, p, {
      id: `${inst(this.game, uid).defId}:force-hand`, text: mode.label,
      scope: ['Hand'], prepare: mode.prepare, targets: mode.targets, canRun: mode.canRun, run: mode.run,
    }, undefined, () => this.commitForce(uid, p));
  }

  private commitForce(uid: string, owner: PlayerId): void {
    // New Force skills pay their own discard; legacy fixtures still use this move.
    if (inst(this.game, uid).zone === 'hand') moveCard(this.game, uid, 'grave');
    log(this.game, `${def(this.index, this.game, uid).name} was revealed and discarded to activate its Force skill.`, [uid]);
    emit(this.game, { actor: owner, type: 'costPaid', sourceUids: [uid], targetUids: [], visibility: 'public', message: 'Force revealed and discarded.' });
  }

  async perform(action: PlayerAction, p: PlayerId): Promise<void> {
    if (this.game.responseChain || this.collectingTriggers || this.drainingTriggers) throw new Error('Finish the current effect before taking another action.');
    if (p !== this.game.turnPlayer) throw new Error('It is not your turn.');
    const ps = you(this.game, p);
    // Everything this action causes — the call, the trigger it fires, the cost
    // that trigger pays, the Last Oath that cost sets off — is filed under one
    // group, so the interface can show "this is what that click did".
    beginGroup(this.game);
    switch (action.kind) {
      case 'call': {
        await this.hooks.onCardCalled?.(action.uid, action.slot, p);
        normalCall(this.index, this.game, action.uid, { slot: action.slot });
        log(this.game, `Player ${p} called ${def(this.index, this.game, action.uid).name} to ${SLOT_LABELS[action.slot] ?? `slot ${action.slot}`}.`, [action.uid]);
        emit(this.game, {
          actor: p,
          type: 'cardCalled',
          sourceUids: [action.uid],
          targetUids: [],
          visibility: 'public',
          message: `${def(this.index, this.game, action.uid).name} was called.`,
        });
        await this.fireTrigger('placed', p, { name: 'placed', unit: action.uid, special: false });
        // Pulangi River: the first unit called this turn is Offered.
        if (ps.pulangiRiverFirstCallPending) {
          ps.pulangiRiverFirstCallPending = false;
          // Offer the just-called unit via offerUnit so Last Oath triggers fire.
          const ctx = this.ctx(action.uid, p);
          offerUnit(ctx, action.uid);
          log(this.game, `Pulangi River: ${def(this.index, this.game, action.uid).name} was Offered (first call this turn).`, [action.uid]);
          // Flush triggers from the offer (Last Oath, etc.).
          await this.flushDamageTriggers();
        }
        break;
      }
      case 'playAction': {
        const effect = this.scriptFor(action.uid)?.action;
        if (!effect || !ps.hand.includes(action.uid) || ps.normalPlaysUsed >= maxPlays(this.index, this.game, p)
          || (effect.canRun && !effect.canRun(this.ctx(action.uid, p)))) break;
        await this.startEffect(action.uid, p, {
          id: `${inst(this.game, action.uid).defId}:action`, text: 'Action skill', scope: ['Hand'],
          canRun: effect.canRun, prepare: effect.prepare, targets: effect.targets, specialCalls: effect.specialCalls, run: effect.run,
        }, undefined, () => {
          ps.normalPlaysUsed++;
          moveCard(this.game, action.uid, 'grave');
          emit(this.game, { actor: p, type: 'cardPlayed', sourceUids: [action.uid], targetUids: [],
            visibility: 'public', message: `${def(this.index, this.game, action.uid).name} was played (1 play).` });
        });
        break;
      }
      case 'playForce': {
        await this.playForceFromHand(action.uid, p);
        break;
      }
      case 'ability': {
        const script = this.scriptFor(action.uid);
        const ability = script?.abilities?.[action.abilityIndex];
        if (ability && this.canUseAbility(action.uid, ability, p)) await this.runAbility(action.uid, ability, p);
        break;
      }
      case 'switchCodex': {
        switchCodex(this.index, this.game, action.uid);
        await this.fireCodexPlayed(action.uid, p);
        break;
      }
      case 'useSkill': {
        if (!ps.activeCodex) break;
        const script = this.scriptFor(ps.activeCodex);
        const skill = script?.codex?.skill;
        if (!skill || skill.type !== 'action') break;
        const maxUses = skill.maxUses ?? 1;
        if (usedSkill(this.game, p, ps.activeCodex, `${inst(this.game, ps.activeCodex).defId}:codex`) >= maxUses) break;
        if (skill.canRun && !skill.canRun(this.ctx(ps.activeCodex, p))) break;
        const uid = ps.activeCodex;
        await this.startEffect(uid, p, { id: `${inst(this.game, uid).defId}:codex`, text: skill.text,
          scope: [], prepare: skill.prepare, targets: skill.targets, specialCalls: skill.specialCalls, run: skill.run }, undefined, () => {
            ps.skillUsedThisTurn++;
            recordSkillUse(this.game, p, uid, `${inst(this.game, uid).defId}:codex`);
          });
        break;
      }
      case 'relocate': {
        const uid = action.uid;
        const c = inst(this.game, uid);
        const fromSlot = c.slot;
        // Validate: must be in an ally slot, not already moved.
        if (fromSlot == null || ps.allies[fromSlot] !== uid) break;
        if (c.relocatedThisTurn) break;

        const occupant = ps.allies[action.toSlot];
        const label = (slot: number) => SLOT_LABELS[slot] ?? `slot ${slot}`;

        ps.allies[fromSlot] = occupant ?? null;
        ps.allies[action.toSlot] = uid;
        c.slot = action.toSlot;
        c.relocatedThisTurn = true;

        if (occupant) {
          // Swap: the displaced unit takes the vacated slot and has also moved.
          const oc = inst(this.game, occupant);
          oc.slot = fromSlot;
          oc.relocatedThisTurn = true;
          log(this.game, `${def(this.index, this.game, uid).name} and ${def(this.index, this.game, occupant).name} swapped places (${label(fromSlot)} <-> ${label(action.toSlot)}).`, [uid, occupant]);
        } else {
          log(this.game, `Relocated ${def(this.index, this.game, uid).name} from ${label(fromSlot)} to ${label(action.toSlot)}.`, [uid]);
        }
        break;
      }
      case 'attack':
        try {
          await this.doAttack(action, p);
        } finally {
          // Never leave a half-resolved attack on the board if it was
          // rejected part-way through.
          this.game.activeBattle = null;
        }
        break;
      case 'endPhase':
        await this.enterBattle();
        break;
      case 'endTurn':
        await this.finishTurn();
        break;
    }

    // Flush any token creation and damage triggers pending from this action.
    await this.flushTokenTriggers(p);
    await this.flushSpecialCallTriggers();
    await this.flushDamageTriggers();
    await this.flushSpiritTriggers();
    // Re-evaluate event-driven States (Overwhelm/Glory/Stampede check field state).
    tryReleaseEventState(this.index, this.game, p);
    tryReleaseEventState(this.index, this.game, p === 0 ? 1 : 0);
    // Re-evaluate continuous States (Overwhelm) for both players.
    reevaluateState(this.index, this.game, 0);
    reevaluateState(this.index, this.game, 1);
    // Drain presentation events last, so a State released by any of the above
    // is shown for this action rather than sitting queued until the next one.
    await this.flushFx();
  }

  // --- attacking -----------------------------------------------------------

  async doAttack(
    action: Extract<PlayerAction, { kind: 'attack' }>,
    p: PlayerId,
  ): Promise<void> {
    const defender = opponentOf(p);
    const isPersonaAttack = inst(this.game, action.attacker).zone === 'persona';

    // WINDOW 4 of 6 — your Persona attacks.
    //
    // Before the declaration is built, so a Codex switched in here can
    // still affect the swing it was switched in for.
    if (isPersonaAttack) {
      await this.tryAutoSwitch('personaAttack', p, {
        name: 'personaAttack', unit: action.attacker, target: action.target,
      });
    }

    const declaration: AttackDeclaration = {
      attacker: action.attacker,
      attackerEntry: inst(this.game, action.attacker).zoneEntry ?? 0,
      targetUid: action.target ?? you(this.game, defender).persona ?? undefined,
      targetEntry: (action.target ?? you(this.game, defender).persona) ? (inst(this.game, (action.target ?? you(this.game, defender).persona)!).zoneEntry ?? 0) : undefined,
      supporters: action.supporters,
      target: action.target,
    };

    // The attacker is turned sideways by resolveAttack. Until then the client
    // reads `activeBattle` to show who is swinging, so legality still holds.
    const runningAttack =
      currentPower(this.index, this.game, action.attacker) +
      action.supporters.reduce(
        (sum, u) => sum + currentPower(this.index, this.game, u), 0,
      );

    this.game.activeBattle = {
      attacker: action.attacker,
      supporters: action.supporters,
      target: action.target,
      defender,
      blockers: [],
      attackPower: runningAttack,
      defensePower: this.baseDefense(action.target, defender),
      stage: 'declared',
    };
    emit(this.game, {
      actor: p,
      type: 'attackDeclared',
      sourceUids: [action.attacker, ...action.supporters],
      targetUids: action.target ? [action.target] : [],
      changes: [{ what: 'attackPower', uid: action.attacker, from: 0, to: runningAttack }],
      visibility: 'public',
      message: `${def(this.index, this.game, action.attacker).name} attacks`
        + `${action.target ? ' ' + def(this.index, this.game, action.target).name : ' the Persona'}.`,
    });
    await this.hooks.onAttackDeclared?.(this.game.activeBattle);

    this.collectingTriggers++;
    try {
    // Pre-attack triggers.
    await this.fireTrigger('attack', p, { name: 'attack', unit: action.attacker });
    await setOneAttack(this.ctx(action.attacker, p));
    if (isPersonaAttack) {
      // No auto-switch offer here either — `personaAttack` Codex are in the
      // start-of-turn offer. See tryAutoSwitch's call in beginTurn.
      await this.fireTrigger('personaAttack', p, {
        name: 'personaAttack', unit: action.attacker,
      });
    }
    if (action.supporters.length) {
      await this.fireTrigger('supported', p, {
        name: 'supported', unit: action.attacker,
        supporters: action.supporters,
      });
    }
    await this.fireTrigger('unitAttacked', defender, {
      name: 'unitAttacked',
      unit: action.target ?? undefined,
    });
    // If the attack targets the defender's Persona, fire personaAttacked
    // so defensive triggers (Sitti Rahma, etc.) can fire.
    if (action.target === null) {
      const defenderPersona = you(this.game, defender).persona;
      // Auto-switch: the DEFENDER may switch when their Persona is attacked.
      // WINDOW 5 of 6 — your Persona is under attack, on their turn.
      await this.tryAutoSwitch('personaAttacked', defender);
      await this.fireTrigger('personaAttacked', defender, {
        name: 'personaAttacked',
        unit: defenderPersona ?? undefined,
      });
    }

    } finally { this.collectingTriggers--; }
    await this.drainPendingTriggers();

    // Recompute after triggers - buffs may have landed.
    this.refreshBattlePower();

    // The attacker's battle-card window: a Force spent here buys its skill,
    // and anything it does to the board is done before the defender is asked
    // to answer the attack.
    if (this.battleContinues(declaration)) await this.openBattleWindow(p, 'attacker', declaration);

    // Then the defence, in two steps. First the same window on the other
    // side, widened by the Sentry; then, only if no Sentry was committed,
    // the blockers. A Sentry nullifies, so being asked to block after
    // choosing one would be asking for cards that cannot matter.
    this.game.activeBattle.stage = 'blocking';
    if (this.battleContinues(declaration)) await this.hooks.onBlockingStart?.(this.game.activeBattle);

    const sentryUid = this.battleContinues(declaration) ? await this.openBattleWindow(p, 'defender', declaration) : null;
    const block = {
      blockers: sentryUid || !this.battleContinues(declaration) ? [] : await this.askForBlockers(declaration, defender),
    };
    const sentryUsed = !!this.game.activeBattle.sentryUsed;

    this.game.activeBattle.blockers = block.blockers;
    this.refreshBattlePower();
    await this.hooks.onBlockersDeclared?.(this.game.activeBattle);

    // ATTACK CHECK — only on Persona attacks, reveals the top of the
    // ATTACKER's deck. This happens AFTER blockers are declared (so the
    // defender commits before seeing the check) but BEFORE the hit
    // comparison (so a Force revealed here can buff the attack).
    this.game.activeBattle.stage = 'checking';
    let attackCheckUid: string | null = null;
    if (!sentryUsed && this.battleContinues(declaration) && isPersonaAttack && inst(this.game, action.attacker).skipCheckTurn !== this.game.turnNumber) {
      await this.hooks.onBeforeAttackCheck?.(p);
      attackCheckUid = doAttackCheck(this.index, this.game, p);

      if (attackCheckUid) {
        // Show the revealed card in a modal, then resolve any Force on it
        // (its check effect fires for free). That +5000 applies to THIS
        // attack's power.
        await this.resolveCheck(attackCheckUid, p, 'attack');
        // Recompute battle power — the Force buff may have changed things.
        this.refreshBattlePower();
      }

      // Extra attack checks (e.g. Savage Forge).
      while (this.battleContinues(declaration) && ((this.game.activeBattle.extraChecks ?? 0) > 0 || you(this.game, p).extraAttackChecks > 0)) {
        if ((this.game.activeBattle.extraChecks ?? 0) > 0) this.game.activeBattle.extraChecks!--;
        else you(this.game, p).extraAttackChecks--;
        const extraUid = doAttackCheck(this.index, this.game, p);
        if (extraUid) {
          await this.resolveCheck(extraUid, p, 'attack');
          this.refreshBattlePower();
        }
      }
    }

    if (isPersonaAttack && this.game.cards[action.attacker]) inst(this.game, action.attacker).skipCheckTurn = undefined;

    const result = resolveAttack(
      this.index, this.game, declaration, block, sentryUsed, attackCheckUid,
    );

    this.game.activeBattle.stage = 'resolved';
    this.game.activeBattle.hit = result.hit;
    this.game.activeBattle.attackPower = result.attackPower;
    this.game.activeBattle.defensePower = result.defensePower;
    emit(this.game, {
      actor: this.game.activeBattle.defender === 0 ? 1 : 0,
      type: 'attackResolved',
      sourceUids: [this.game.activeBattle.attacker],
      targetUids: this.game.activeBattle.target ? [this.game.activeBattle.target] : [],
      result: {
        outcome: result.hit
          ? (result.personaHit ? 'personaHit' : (result.barrierBroken ? 'barrierBroken' : 'hit'))
          : 'stopped',
        detail: result.hit ? undefined : 'The attack was stopped.',
      },
      visibility: 'public',
      message: result.hit ? 'The attack got through.' : 'The attack was stopped.',
    });
    await this.hooks.onAttackResolved?.(this.game.activeBattle, result);
    this.game.activeBattle = null;

    // Apply pending persona charge (Mountain Top Bridges) after resolveAttack
    // has exhausted the attacker.
    if (you(this.game, p).pendingPersonaCharge) {
      you(this.game, p).pendingPersonaCharge = false;
      const persona = you(this.game, p).persona;
      if (persona && this.game.cards[persona]) {
        this.game.cards[persona]!.exhausted = false;
        you(this.game, p).personaChargedThisBattle = true;
        log(this.game, `${def(this.index, this.game, persona).name} charged! (Mountain Top Bridges)`, [persona]);
      }
    }

    if (result.hit) {
      await this.fireTrigger('attackHit', p, {
        name: 'attackHit', unit: action.attacker,
      });
    } else {
      await this.fireTrigger('attackMiss', p, {
        name: 'attackMiss', unit: action.attacker,
      });
    }
    // attackResolved fires after any attack (hit or miss) — used by Dryad
    // multi-attack triggers (e.g. Lirien charges a wisp after it attacks).
    await this.fireTrigger('attackResolved', p, {
      name: 'attackResolved', unit: action.attacker,
    });
    await setOneAfterAttack(this.ctx(action.attacker, p));
    if (result.barrierBroken && result.barrierCheckCard) {
      // Track barrier break for state evaluation.
      you(this.game, defender).barrierBrokenThisTurn = true;
      // Re-evaluate event-driven states (barrier broken may release them).
      tryReleaseEventState(this.index, this.game, defender);
      // First resolve the check (move the barrier card to hand/grave),
      // THEN fire the barrierBroken trigger so effects like Lake Buluan
      // see the barrier as fully broken and resolved.
      await this.resolveCheck(result.barrierCheckCard, defender, 'barrier');
      // WINDOW 6 of 6 — your Barrier broke, on their turn.
      //
      // Offered to the DEFENDER, who is not the turn player. Their one
      // switch is still theirs to spend, and this is the moment a Codex
      // that answers being attacked has to arrive — before the trigger
      // below, so a Codex switched in now sees its own Barrier break.
      await this.tryAutoSwitch('barrierBroken', defender, {
        name: 'barrierBroken', revealed: result.barrierCheckCard,
      });
      await this.fireTrigger('barrierBroken', defender, {
        name: 'barrierBroken',
        revealed: result.barrierCheckCard,
      });
    }
    const finished: TriggerEvent = { name: 'battleFinished', hit: result.hit, unit: action.attacker, target: action.target, supporters: action.supporters };
    for (const owner of [p, defender]) {
      await this.fireTrigger('battleFinished', owner, { ...finished });
      const persona = you(this.game, owner).persona;
      if (persona) await finishBabaylanReturns(this.ctx(persona, owner), 'battle', finished);
    }
  }

  /** The attacked unit's own Power, before any blockers. */
  private baseDefense(target: string | null, defender: PlayerId): number {
    const unit = target ?? you(this.game, defender).persona;
    if (!unit || !this.game.cards[unit]) return 0;
    return currentPower(this.index, this.game, unit);
  }

  /** Keep the presented totals in step with buffs and blockers. */
  private refreshBattlePower(): void {
    const b = this.game.activeBattle;
    if (!b) return;
    // Safe power lookup — tokens may have ceased to exist mid-attack.
    const safePower = (uid: string) =>
      this.game.cards[uid] ? currentPower(this.index, this.game, uid) : 0;
    const safeBlock = (uid: string) =>
      this.game.cards[uid] ? (def(this.index, this.game, uid).defense || 0) : 0;
    b.attackPower =
      safePower(b.attacker) +
      b.supporters.reduce((s, u) => s + safePower(u), 0);
    b.defensePower =
      this.baseDefense(b.target, b.defender) +
      b.blockers.reduce((s, u) => s + safeBlock(u), 0)
      + (b.blockers.length && you(this.game, b.defender).lakeBuluanDefenseBonus ? 5000 : 0);
  }

  /**
   * Resolve a card revealed on a check (attack or barrier).
   *
   * The card sits in the Check zone while the UI shows it in a modal. If it is
   * a Force, its check effect fires for free - never its skill, which is paid
   * for from hand. Then the card goes to the owner's hand.
   */
  private async resolveCheck(
    uid: string,
    owner: PlayerId,
    kind: 'attack' | 'barrier',
  ): Promise<void> {
    const d = def(this.index, this.game, uid);
    const isForce = d.type === 'Force';

    // Animate the card arriving in the check zone (deck→check or barrier flip).
    await this.hooks.onCheckCardPlaced?.(uid, kind, owner);

    // For barrier checks: now that the flip animation is done, actually move
    // the card from the barriers array to the check zone in game state.
    if (kind === 'barrier') {
      const c = this.game.cards[uid];
      if (c?.breaking) {
        c.breaking = false;
        moveCard(this.game, uid, 'check');
      }
    }

    // Let the UI present the revealed card in a modal.
    emit(this.game, {
      actor: this.game.turnPlayer,
      type: isForce ? 'forceResolved' : 'checkRevealed',
      sourceUids: [uid],
      targetUids: [],
      result: { outcome: isForce ? 'force' : 'noForce' },
      visibility: 'public',
      message: `${def(this.index, this.game, uid).name} was revealed on the `
        + `${kind === 'attack' ? 'attack' : 'Barrier'} check`
        + `${isForce ? ' — it is a Force.' : '.'}`,
    });
    await this.hooks.onCheckRevealed?.(uid, isForce, kind);

    // A Force revealed on a check gives its check effect, free. Its own
    // skill is not on offer here — that one is paid for, from hand.
    if (isForce) {
      const check = this.scriptFor(uid)?.forceModes?.[FORCE_CHECK];
      if (check) {
        log(this.game, `${d.name} triggers on the check - ${check.label}`, [uid]);
        await check.run(this.ctx(uid, owner));
        await this.flushFx();
      }
    }

    // Animate the card flying from check zone to hand, then move it.
    await this.hooks.onCheckCardToHand?.(uid, owner);
    // Lake Buluan: send the check card to grave instead of hand.
    const ownerPs = you(this.game, owner);
    if (ownerPs.lakeBuluanCheckSwap) {
      ownerPs.lakeBuluanCheckSwap = false;
      moveCard(this.game, uid, 'grave');
      log(this.game, `Lake Buluan: Sent ${d.name} to grave instead of hand.`, [uid]);
    } else {
      moveCard(this.game, uid, 'hand');
    }
    await this.hooks.onCheckResolved?.(uid, isForce, kind, owner);
    if (isForce) await this.fireTrigger('forceResolved', owner, { name: 'forceResolved', revealed: uid, checkKind: kind });
    await this.flushDamageTriggers();
    await this.flushSpecialCallTriggers();
  }

  /** What the battle-card window and the block prompt call the target. */
  private targetName(attack: AttackDeclaration): string {
    if (attack.target === null) return 'the Persona';
    return this.game.cards[attack.target]
      ? def(this.index, this.game, attack.target).name
      : 'destroyed unit';
  }


  /** Stop spending cards as soon as the declared attack is interrupted. */
  private battleContinues(attack: AttackDeclaration): boolean {
    return this.game.winner === null && attackEntriesStillPresent(this.game, attack) && !!this.game.cards[attack.attacker] && canAttack(this.game, attack.attacker)
      && legalTargets(this.game, opponentOf(this.game.turnPlayer)).includes(attack.target)
      && !this.game.activeBattle?.sentryUsed;
  }

  /** Resolve the ordered response immediately, revalidating each card. */
  private async openBattleWindow(
    attacker: PlayerId,
    role: 'attacker' | 'defender',
    attack: AttackDeclaration,
  ): Promise<string | null> {
    const p = role === 'attacker' ? attacker : opponentOf(attacker);
    const candidates = this.responseCandidates(p).filter(c => role === 'defender' || !this.scriptFor(c.uid)?.sentry);
    if (!candidates.length) return null;
    const choice = await this.chooserFor(p).chooseAbility(p,
      role === 'attacker' ? 'Before your attack — activate one Force?' : 'Respond to the attack — Force or Sentry?',
      candidates.map(c => ({ uid: c.uid, id: `${c.uid}:${this.skillId(c.uid, c.ability)}`, cardName: def(this.index, this.game, c.uid).name, text: c.ability.text, effectSummary: c.ability.prepare?.describe?.(this.ctx(c.uid, p)).effect, costLabel: c.ability.prepare?.describe?.(this.ctx(c.uid, p)).label })),
      { kind: 'battle', allowDecline: true });
    if (choice === null) return null;
    const selected = candidates[choice];
    if (!selected || !this.battleContinues(attack)) return null;
    await this.startEffect(selected.uid, p, selected.ability, undefined, selected.onCommit);
    this.refreshBattlePower();
    return this.game.activeBattle?.sentryUsed ? selected.uid : null;
  }

  /**
   * Ask the defender for blockers. Reached only when no Sentry was committed,
   * because a Sentry nullifies and blockers behind one are cards thrown away.
   */
  private async askForBlockers(
    attack: AttackDeclaration,
    defender: PlayerId,
  ): Promise<string[]> {
    const ps = you(this.game, defender);
    if (ps.hand.length === 0) return [];

    const b = this.game.activeBattle;
    const minDef = b?.minBlockDefense ?? 0;
    const maxLevel = b?.maxBlockLevel;
    // Sentries stay out of this list: their Hand ability IS the reveal, and a
    // 0-defense Sentry pitched as a blocker is a shield thrown away.
    const candidates = ps.hand.filter((uid) => {
      if (this.scriptFor(uid)?.sentry) return false;
      const d = def(this.index, this.game, uid);
      if (d.type !== 'Unit' && d.type !== 'Force') return false;
      if (minDef > 0 && d.defense < minDef) return false;
      if (maxLevel !== undefined && d.type === 'Unit' && d.level > maxLevel) return false;
      return true;
    });
    if (!candidates.length) return [];

    const picked = await this.chooserFor(defender).blockPrompt(
      defender,
      {
        attackPower: b?.attackPower ?? 0,
        defensePower: b?.defensePower ?? 0,
        targetName: this.targetName(attack),
        // Lake Buluan, read rather than spent — blockValue() would consume the
        // bonus and log it, on a choice not yet made.
        firstBonus: ps.lakeBuluanDefenseBonus ? 5000 : 0,
      },
      candidates,
    );
    return [...new Set(picked)].filter((uid) => candidates.includes(uid) && ps.hand.includes(uid));
  }

}
