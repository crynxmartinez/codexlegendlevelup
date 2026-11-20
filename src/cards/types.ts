/** Card script definitions - the hand-written logic behind each printed card. */
import type { EffectContext, TriggerName } from '../core/effects.js';

export type AbilityScope =
  | 'Ally' | 'Persona' | 'Hand' | 'Heart' | 'Grave' | 'Field' | 'Deck'
  // Exile is normally where cards go to stop mattering. Maharaja exiles
  // himself face up and reads the game from there, so a card can now be
  // waiting rather than gone.
  | 'Exile';

export interface AbilityScript {
  /** Declared call intent, captured when the activation commits. */
  specialCalls?: boolean | ((ctx: EffectContext) => boolean);
  /** Stable rules identity, independent of displayed wording. */
  id?: string;
  useScope?: 'copy' | 'name';
  /** Collect and validate actual cost choices without mutating the game. */
  prepare?: import('../core/activation.js').CostPreparer;
  targets?: import('../core/activation-targets.js').TargetSpec[];
  /** Rules text, for the hover panel. */
  text: string;
  /** Zones this ability works from. */
  scope: AbilityScope[];
  /** Codex State that must be released. */
  requiresState?: string;
  /** Preserve eligibility for copies that already witnessed the same trigger. */
  latchStateOnTrigger?: boolean;
  /** Trigger for conditional/battle abilities. Absent = activated on demand. */
  trigger?: TriggerName;
  /** Mandatory triggered effect: resolve with normal presentation, without an opt-in prompt. */
  automatic?: boolean;
  /** Max activations per turn. */
  perTurn?: number;
  /** Historical scripts only; current activations use prepare(). */
  energyCost?: number;
  /** Can this ability legally run right now? */
  canRun?: (ctx: EffectContext) => boolean;
  /** Read-only presentation metadata; legality remains in canRun(). */
  passive?: boolean;
  conditionReason?: (ctx: EffectContext) => string | undefined;
  /** Resolve the committed effect. Current costs are paid through prepare(). */
  run: (ctx: EffectContext) => Promise<void>;
}

/**
 * The skill half of a Force's printed text, for the menu that offers it.
 *
 * Parsed rather than restated so the label cannot drift away from the card:
 * the printed text is the one place the skill is written down.
 */
export function forceSkillLabel(printed: string): string {
  const first = printed.split('\n')[0] ?? '';
  const at = first.indexOf('Battle Phase: ');
  const tail = at >= 0 ? first.slice(at + 'Battle Phase: '.length) : first;
  return tail.replace(/\[\/?[a-z]+\]/g, '').trim();
}

export interface CardScript {
  id: string;
  /** How many cards this counts as while in hand (Sabrina = 2). */
  handCountValue?: number;
  abilities?: AbilityScript[];
  /**
   * A Force's two effects. Which one you get is decided by how the card
   * reached play, never by a choice:
   *
   *   [0] the CHECK effect - free and automatic when the card is turned up
   *       on an attack or Barrier check. Every Force prints the same one.
   *   [1] the card's own SKILL - no play from hand, responding to its printed
   *       condition on either player's turn. Legacy fixtures may be on demand.
   *
   * The pair is still an array because that is what the engine indexes and
   * what recorded replays carry; `FORCE_CHECK` and `FORCE_SKILL` in game.ts
   * are the names to read it by.
   */
  forceModes?: {
    response?: 'rally' | 'negate' | 'special-call' | 'attack';
    label: string;
    prepare?: AbilityScript['prepare'];
    targets?: AbilityScript['targets'];
    canRun?: (ctx: EffectContext) => boolean;
    run: (ctx: EffectContext) => Promise<void>;
  }[];
  /** Sentry: nullify one instance of Persona damage. */
  sentry?: boolean;
  /** Action: the whole card is one effect. */
  action?: {
    specialCalls?: AbilityScript['specialCalls'];
    prepare?: AbilityScript['prepare'];
    targets?: AbilityScript['targets'];
    energyCost?: number;
    canRun?: (ctx: EffectContext) => boolean;
    run: (ctx: EffectContext) => Promise<void>;
  };
  /** Codex: the skill (passive that alters a core game mechanic). */
  codex?: {
    /** Triggers that fire the legacy green ability (being phased out). */
    triggers?: TriggerName[];
    /** Legacy: auto-switch on a specific trigger phase. */
    autoSwitchOn?: TriggerName | TriggerName[];
    /** Scenario-based auto-switch: checks board state, fires at startOfTurn and startOfBattle. */
    autoSwitchWhen?: (ctx: EffectContext) => boolean;
    /** "not changed Codex during your previous turn" vs "for the turn". */
    autoSwitchWindow?: 'previousTurn' | 'thisTurn';
    /** Legacy triggered effect (being phased out in favor of skill). */
    run?: (ctx: EffectContext) => Promise<void>;
    /**
     * The Codex skill — a passive that alters a core game mechanic.
     * This is the primary identity of the card.
     */
    skill?: {
      specialCalls?: AbilityScript['specialCalls'];
      prepare?: AbilityScript['prepare'];
      targets?: AbilityScript['targets'];
      /** How the skill is applied. */
      type: 'action' | 'continuous' | 'auto' | 'replacement';
      /**
       * Which step a `replacement` skill stands in for.
       * Defaults to 'draw', which is what every replacement meant before
       * there was more than one kind — so the legacy Codex keep working
       * without being touched.
       */
      replaces?: 'draw' | 'personify' | 'sipol';
      /** Printed rules text. */
      text: string;
      /** Which trigger(s) fire this skill (for auto type). */
      trigger?: TriggerName | TriggerName[];
      /** Max uses per turn (for action type). Default: 1. */
      maxUses?: number;
      /** Can the skill be used right now? (for action/replacement types) */
      canRun?: (ctx: EffectContext) => boolean;
      /** Execute the skill. */
      run: (ctx: EffectContext) => Promise<void>;
    };
  };
}

export type ScriptRegistry = Record<string, CardScript>;
