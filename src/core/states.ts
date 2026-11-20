/**
 * Codex State evaluation.
 *
 * A State is released by its Codex's printed condition and gates every ability
 * tagged with that State's name. Only one State is released at a time.
 */
import { def, you, type CardIndex } from './state.js';
import type { GameState, PlayerId } from './types.js';
import { isUnitCard, maguindanaoGraveCountRaw } from './effects.js';

/** Returns true when the named State's release condition currently holds. */
export type StateCondition = (
  index: CardIndex,
  game: GameState,
  p: PlayerId,
) => boolean;

export const STATE_CONDITIONS: Record<string, StateCondition> = {
  // Garahana: "While there are 5 or more Maguindanaon unit cards in your Grave."
  // maguindanaoGraveCountRaw applies both printed rules: only Maguindanaon
  // units count, and Kamil / Bai Samira each count as 2 cards.
  Garahana: (index, game, p) => maguindanaoGraveCountRaw(index, game, p) >= 5,
  // Bayanihan: Agta's State — all 4 ally zones occupied by Luzon Arch units.
  Bayanihan: (index, game, p) => {
    const ps = you(game, p);
    return ps.allies.every((uid) => {
      if (!uid) return false;
      const d = def(index, game, uid);
      return isUnitCard(d) && d.subtypes?.includes('Luzon Arch');
    });
  },
  // Andukha: Babaylan's State — Heart contains at least 6 cards (Baya counts as 2).
  // Matches the printed Codex text; power bonuses at 6/9/12 in currentPower().
  Andukha: (index, game, p) => {
    let count = 0;
    for (const uid of you(game, p).heart) {
      count += def(index, game, uid).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
    }
    return count >= 6;
  },
};

/**
 * How close `p` is to releasing a State, as a fraction of the way there.
 *
 * `STATE_CONDITIONS` answers yes or no, which is all the rules need and all
 * the rules should have. A player — or a bot — needs the other question:
 * whether the last three turns of Offering, or Sanib, or filling the line
 * were worth anything. Without it every one of those plays reads as a pure
 * loss right up until the single moment it does not.
 *
 * Lives here rather than in the AI so that a State added later comes with its
 * own gradient, in the same file as the condition it belongs to, instead of
 * being invisible to the bot until someone remembers a second table.
 *
 * Can exceed 1: Andukha keeps paying at 9 and 12, so the extra is real.
 */
export type StateProgress = (
  index: CardIndex,
  game: GameState,
  p: PlayerId,
) => number;

export const STATE_PROGRESS: Record<string, StateProgress> = {
  Garahana: (index, game, p) => maguindanaoGraveCountRaw(index, game, p) / 5,

  Bayanihan: (index, game, p) => {
    const ps = you(game, p);
    let n = 0;
    for (const uid of ps.allies) {
      if (!uid) continue;
      const d = def(index, game, uid);
      if (isUnitCard(d) && d.subtypes?.includes('Luzon Arch')) n++;
    }
    return n / ps.allies.length;
  },

  Andukha: (index, game, p) => {
    let count = 0;
    for (const uid of you(game, p).heart) {
      count += def(index, game, uid).id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
    }
    return count / 6;
  },
};

/**
 * Progress toward the State `p`'s active Codex actually prints, or 0 when
 * there is no Codex up, no State on it, or no gradient written for it.
 */
export function activeStateProgress(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
): number {
  const ps = you(game, p);
  if (!ps.activeCodex) return 0;
  const name = def(index, game, ps.activeCodex).state;
  if (!name) return 0;
  return STATE_PROGRESS[name]?.(index, game, p) ?? 0;
}

/**
 * Evaluate the active Codex's State at the start of `p`'s turn.
 * Releases it (until end of the opponent's turn) or clears it.
 */
export function evaluateStates(index: CardIndex, game: GameState, p: PlayerId): void {
  const ps = you(game, p);
  const previous = ps.releasedState;
  ps.releasedState = null;
  if (!ps.activeCodex) return;

  const stateName = def(index, game, ps.activeCodex).state;
  if (!stateName) return;

  const condition = STATE_CONDITIONS[stateName];
  if (!condition) return; // archetype not implemented yet

  if (condition(index, game, p)) {
    ps.releasedState = stateName;
    // Set 1 States are continuous: checking the same condition again is not a new release.
    if (previous === stateName && def(index, game, ps.activeCodex).id.includes('/set-1/')) return;
    game.pendingFx.push({ kind: 'stateReleased', state: stateName, player: p });
    game.log.push(`Player ${p} released ${stateName}.`);
    (game.pendingStateReleases ??= []).push(p);
    game.logCards.push([]);
  }
}

/**
 * Re-evaluate Grace (and other continuous States) after every action.
 * Unlike evaluateStates, this only logs when the state actually changes
 * (releases or clears), to avoid spamming the log.
 */
export function reevaluateState(index: CardIndex, game: GameState, p: PlayerId): void {
  const ps = you(game, p);
  if (!ps.activeCodex) return;

  const stateName = def(index, game, ps.activeCodex).state;
  if (!stateName) return;

  // Which States can turn themselves back off when the board changes.
  //
  // Split by SET, not by name, because the printed cards disagree and
  // both are right. The five legacy Agta Codex print "release Bayanihan
  // until end of turn" — a latch, and it stays one. The Set 1 Codex
  // print it as a condition that holds while all four Ally Zones contain
  // Luzon Arch Units, so theirs lapses the moment a Zone empties. Storm
  // Court's +1000 depends on that being true continuously.
  //
  // Garahana already had the same split for the same reason.
  const activeId = def(index, game, ps.activeCodex).id;
  const continuous = stateName === 'Andukha'
    || (stateName === 'Garahana' && activeId.startsWith('maguindanao/set-1/'))
    || (stateName === 'Bayanihan' && activeId.startsWith('agta/set-1/'));
  if (!continuous) return;

  const condition = STATE_CONDITIONS[stateName];
  if (!condition) return;

  const wasReleased = ps.releasedState === stateName;
  const nowReleased = condition(index, game, p);

  if (nowReleased && !wasReleased) {
    ps.releasedState = stateName;
    game.pendingFx.push({ kind: 'stateReleased', state: stateName, player: p });
    game.log.push(`Player ${p} released ${stateName}.`);
    (game.pendingStateReleases ??= []).push(p);
    game.logCards.push([]);
  } else if (!nowReleased && wasReleased) {
    ps.releasedState = null;
    game.log.push(`Player ${p}'s ${stateName} faded.`);
    game.logCards.push([]);
  }
}

/**
 * Check whether an event-driven State (like Ethereal) should release now.
 * Called after wisp creation/stacking. Only releases if not already released
 * and the condition is met. Does NOT clear an existing release — the window
 * runs until end of opponent's turn regardless.
 */
export function tryReleaseEventState(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
): void {
  const ps = you(game, p);
  if (ps.releasedState) return; // already released this cycle
  if (!ps.activeCodex) return;

  const stateName = def(index, game, ps.activeCodex).state;
  if (!stateName) return;

  const condition = STATE_CONDITIONS[stateName];
  if (!condition) return;

  if (condition(index, game, p)) {
    ps.releasedState = stateName;
    game.pendingFx.push({ kind: 'stateReleased', state: stateName, player: p });
    game.log.push(`Player ${p} released ${stateName}.`);
    (game.pendingStateReleases ??= []).push(p);
    game.logCards.push([]);
  }
}

/** Is `state` currently released for this player? */
export function isReleased(game: GameState, p: PlayerId, state: string): boolean {
  return you(game, p).releasedState === state;
}
