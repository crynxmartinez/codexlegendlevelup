/**
 * How long the game holds still so a player can read it.
 *
 * Every delay in a duel used to be a number written where it was needed — an
 * AI turn slept for about two seconds because someone typed 2000 in the AI
 * loop. That makes pace impossible to change: "faster" means finding every
 * literal, and a literal that is missed becomes the slowest thing on screen.
 *
 * So there is one table, and the interface asks it for a named moment rather
 * than a number. Adding a pace is then editing one row.
 *
 * THIS IS PRESENTATION TIME ONLY. Nothing here is allowed to change what the
 * rules do, only how long the interface pauses before showing the next thing.
 * A player on Fast and a player on Learning must reach the same state from the
 * same actions — which is what the test beside this file asserts by walking
 * every profile and comparing them.
 *
 * The separation also matters for PvP later: a decision clock has to count the
 * time a player had to decide, not the time their animations took, or fast
 * settings become a competitive advantage. `isPresentation` marks the moments
 * that must not be charged to a player.
 */

export type DuelPace = 'learning' | 'standard' | 'fast';

/**
 * A named moment the interface waits at.
 *
 * Normal-game profiles use finite holds. Tutorial sessions own their explicit
 * teaching pauses independently of the saved pace setting.
 */
export interface PaceProfile {
  /** A draw, a phase change — things that happen constantly. */
  routine: number;
  /** A card travelling from one zone to another. */
  cardMove: number;
  /** The flourish before an ability resolves, so the source is seen first. */
  abilityIntro: number;
  /** Source-card lift, readable glow and return before its effect starts. */
  sourceActivation: number;
  /** Readable chain and Barrier presentation, separate from routine movement. */
  chainActivation: number;
  chainNegation: number;
  barrierShatter: number;
  /** How long the target stays ringed before the result replaces it. */
  targetHold: number;
  /** How long a result stays up. */
  resultHold: number;
  /** The least an AI turn may appear to take, so it does not look instant. */
  aiThinkMinimum: number;
  /** Barrier breaks, Force checks, Personification, a winning attack. */
  importantResult: number | 'manual';
}

export const PACE_PROFILES: Record<DuelPace, PaceProfile> = {
  /**
   * Relaxed (saved as learning). Results advance automatically, and the
   * gap between a cause and its effect is wide enough to connect them.
   */
  learning: {
    routine: 420,
    cardMove: 650,
    abilityIntro: 900,
    sourceActivation: 3600,
    chainActivation: 1400,
    chainNegation: 1300,
    barrierShatter: 1200,
    targetHold: 800,
    resultHold: 1100,
    aiThinkMinimum: 1400,
    importantResult: 1600,
  },
  /**
   * Standard. Leave enough time to follow each source, movement and result
   * in both local and online matches; Fast remains an explicit preference.
   */
  standard: {
    routine: 240,
    cardMove: 500,
    abilityIntro: 800,
    sourceActivation: 2800,
    chainActivation: 1100,
    chainNegation: 1200,
    barrierShatter: 950,
    targetHold: 550,
    resultHold: 850,
    aiThinkMinimum: 850,
    importantResult: 1300,
  },
  /**
   * Fast. Short everywhere, but never zero on a result: a state that appears
   * and disappears inside one frame has not been shown, it has been skipped,
   * and skipping results is the one thing pace may not do.
   */
  fast: {
    routine: 60,
    cardMove: 120,
    abilityIntro: 160,
    sourceActivation: 1400,
    chainActivation: 300,
    chainNegation: 400,
    barrierShatter: 320,
    targetHold: 120,
    resultHold: 220,
    aiThinkMinimum: 220,
    importantResult: 320,
  },
};

/** Moments that are presentation, not decision — never charged to a clock. */
const PRESENTATION_MOMENTS: ReadonlySet<keyof PaceProfile> = new Set([
  'routine', 'cardMove', 'abilityIntro', 'sourceActivation', 'targetHold', 'resultHold',
  'aiThinkMinimum', 'importantResult',
  'chainActivation', 'chainNegation', 'barrierShatter',
]);

/**
 * Whether waiting here is the game presenting rather than the player thinking.
 *
 * Everything in the table is presentation today. The predicate exists anyway,
 * because the moment a decision clock is added the question "does this count
 * against the player" has to have one answer in one place rather than being
 * decided again at each call site.
 */
export function isPresentation(moment: keyof PaceProfile): boolean {
  return PRESENTATION_MOMENTS.has(moment);
}

/** Normal matches start at Standard; guided pauses belong to tutorials. */
export function defaultPace(_hasExistingSettings: boolean): DuelPace {
  return 'standard';
}

/**
 * How long to wait, in milliseconds, or null for "until the player says so".
 *
 * `reducedMotion` shortens movement and nothing else. It is a separate axis
 * from pace on purpose: reduced motion is about things sliding across the
 * screen, Fast is about how long you have to read. Someone who gets motion
 * sick still needs time to read, and collapsing the two would take it away.
 */
export function waitFor(
  pace: DuelPace,
  moment: keyof PaceProfile,
  reducedMotion = false,
): number | null {
  const profile = PACE_PROFILES[pace];
  const value = profile[moment];
  if (value === 'manual') return null;
  if (reducedMotion && (moment === 'cardMove' || moment === 'routine')) {
    // Movement is what reduced motion is about. The floor is not zero: a
    // card that teleports is still a card whose journey was not explained,
    // so it becomes a short cut rather than no cut.
    return Math.min(value, 80);
  }
  return value;
}

/**
 * Whether this moment stops for the player at this pace.
 *
 * The interface uses this to decide between a timed hold and an
 * acknowledgement, so the two never disagree about what is about to happen.
 */
export function requiresAcknowledgement(
  pace: DuelPace,
  moment: keyof PaceProfile,
): boolean {
  return PACE_PROFILES[pace][moment] === 'manual';
}

/** What the settings panel says about each pace, in the player's words. */
export const PACE_DESCRIPTIONS: Record<DuelPace, { label: string; detail: string }> = {
  learning: {
    label: 'Relaxed',
    detail: 'Longer time to read skills, checks and Barrier breaks. Results continue automatically.',
  },
  standard: {
    label: 'Standard',
    detail: 'Results hold for a moment. Draws and calls move along quickly.',
  },
  fast: {
    label: 'Fast',
    detail: 'Short animations. Nothing is skipped — decisions and results '
      + 'still appear, just briefly.',
  },
};
