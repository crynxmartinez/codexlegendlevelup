import type { PlayerId } from '../core/types.js';
import { personaChoices } from '../core/setup.js';
import { MATCH_INDEX } from './catalog.js';
import type { MatchSetup } from './session.js';

export const OPENING_VERSION = 1;
export type OpeningStage = 'dice' | 'persona' | 'codex' | 'reveal';
export interface OpeningView {
  version: 1; stage: OpeningStage; round: number;
  rolls: [number | null, number | null]; first: PlayerId | null;
  confirmed: [boolean, boolean];
  choices?: [{ persona: string; codex: string }, { persona: string; codex: string }];
}

/** Server-owned setup. Views expose no opponent choice before the joint reveal. */
export class MatchOpening {
  stage: OpeningStage = 'dice';
  round = 1;
  rolls: [number | null, number | null] = [null, null];
  first: PlayerId | null = null;
  confirmed: [boolean, boolean] = [false, false];
  private choices: [{ persona: string; codex: string }, { persona: string; codex: string }] =
    [{ persona: '', codex: '' }, { persona: '', codex: '' }];
  constructor(private setups: [MatchSetup, MatchSetup], private die: () => number) {}

  roll(player: PlayerId, round: unknown): void {
    if (this.stage !== 'dice' || round !== this.round) return;
    if (this.rolls[0] !== null && this.rolls[0] === this.rolls[1]) {
      this.rolls = [null, null]; this.round++;
    }
    if (this.rolls[player] !== null) return;
    this.rolls[player] = this.die();
    const [a, b] = this.rolls;
    if (a !== null && b !== null && a !== b) this.first = a > b ? 0 : 1;
  }

  confirm(player: PlayerId, stage: unknown, value?: unknown): void {
    if (stage !== this.stage || this.confirmed[player]) return;
    if (this.stage === 'dice' && this.first === null) return;
    if (this.stage === 'persona') {
      if (typeof value !== 'string' || !personaChoices(MATCH_INDEX, this.setups[player].deck).includes(value)) throw new Error('Choose a Persona from your deck');
      this.choices[player].persona = value;
    }
    if (this.stage === 'codex') {
      if (typeof value !== 'string' || !this.setups[player].deck.codex.includes(value)) throw new Error('Choose a Codex from your deck');
      this.choices[player].codex = value;
    }
    this.confirmed[player] = true;
    if (this.confirmed.every(Boolean) && this.stage !== 'reveal') {
      this.stage = this.stage === 'dice' ? 'persona' : this.stage === 'persona' ? 'codex' : 'reveal';
      this.confirmed = [false, false];
    }
  }

  get complete(): boolean { return this.stage === 'reveal' && this.confirmed.every(Boolean); }
  selected(): [MatchSetup, MatchSetup] {
    if (this.stage !== 'reveal') throw new Error('Setup is not complete');
    return this.setups.map((s, i) => ({ deck: s.deck, choice: { ...this.choices[i]! } })) as [MatchSetup, MatchSetup];
  }
  view(): OpeningView {
    return { version: 1, stage: this.stage, round: this.round, rolls: [...this.rolls], first: this.first,
      confirmed: [...this.confirmed], ...(this.stage === 'reveal' ? { choices: this.choices.map(c => ({ ...c })) as OpeningView['choices'] } : {}) };
  }
}
