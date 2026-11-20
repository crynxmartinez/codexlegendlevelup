import type { ActiveBattle } from '../core/types.js';
/** Old servers publish battle stages without presentation hooks. */
export class LegacyAttack {
  private active: string | null;
  constructor(initial: ActiveBattle | null | undefined) { this.active = this.key(initial); }
  private key(b: ActiveBattle | null | undefined): string | null { return b ? `${b.attacker}:${b.target ?? 'persona'}` : null; }
  take(b: ActiveBattle | null | undefined): boolean {
    const key = this.key(b), fresh = key !== null && key !== this.active && b?.stage === 'declared';
    this.active = key; return fresh;
  }
}
