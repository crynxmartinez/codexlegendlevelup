import type { ChoiceCard } from './card-choice.js';

export function codexSwitchInstruction(options: { own: boolean; yourTurn: boolean; main: boolean; pending: boolean; available: boolean; remainingPlays: number }): string {
  if (!options.own) return "Opponent's Codex. Select a face-up card to read its skills.";
  if (options.pending) return 'Finish the current decision before switching Codex.';
  if (!options.yourTurn || !options.main) return 'Manual switching is available during your Main Phase and costs 1 Play. Automatic switches are free.';
  if (options.remainingPlays < 1) return 'No Plays left. Manually switching Codex costs 1 Play. Automatic switches are still free when their trigger occurs.';
  if (!options.available) return 'Codex switching is unavailable for this step.';
  return 'Choose a Codex · Manual switch costs 1 Play · No once-per-turn limit.';
}

/** Browsing must not reveal deck order or face-down opponent cards. */
export function zoneCardVisible(zone: string, owner: number, viewer: number, faceDown: boolean, activeCodex = false): boolean {
  if (zone === 'deck') return false;
  if (zone === 'hand') return owner === viewer;
  if (zone === 'codex') return owner === viewer || activeCodex || !faceDown;
  return !faceDown;
}

export function concealedCard(uid: string, zone: string, back: string): ChoiceCard {
  return { uid, zone, name: 'Face-down card', image: back, type: 'Hidden', detail: '', stats: 'Hidden card', hidden: true };
}
