import type { PendingDecision } from './decisions.js';

const prompt = 'Choose the next card for the TOP of your deck';
function pool(d: PendingDecision | null): string[] | null {
  return d?.kind === 'chooseTarget' && d.args[1] === prompt && Array.isArray(d.args[2])
    && d.args[2].every(uid => typeof uid === 'string') ? d.args[2] as string[] : null;
}
/** One visible ordering choice for the old server's sequential continuation. */
export class LegacyDeckOrder {
  private remaining: string[] = [];
  private context = '';
  private answered = '';
  clear(): void { this.remaining = []; this.context = ''; this.answered = ''; }
  next(d: PendingDecision | null, context: string): string | undefined {
    if (!this.remaining.length || !d || d.id === this.answered) return;
    const cards = pool(d);
    if (context !== this.context || !cards || cards.length !== this.remaining.length
      || !cards.every(uid => this.remaining.includes(uid))) { this.clear(); return; }
    return this.remaining[0];
  }
  display(d: PendingDecision | null, context: string): PendingDecision | null {
    if (this.next(d, context)) return null;
    const cards = pool(d);
    return d && cards ? { ...d, kind: 'chooseCards', args: [d.args[0], 'Order the top of your deck', cards, cards.length,
      { ordered: true, confirm: 'OK', detail: 'Choose cards in order: 1, 2, 3… Number 1 is drawn first. Click again to reorder, then press OK.' }] } : d;
  }
  answer(d: PendingDecision | null, answer: unknown, context: string): unknown {
    const cards = pool(d);
    if (d && cards && Array.isArray(answer) && answer.length === cards.length
      && new Set(answer).size === cards.length && answer.every(uid => cards.includes(uid))) {
      this.remaining = answer.slice(1); this.context = context; this.answered = d.id;
      return answer[0];
    }
    if (d && answer === this.next(d, context)) { this.remaining.shift(); this.answered = d.id; }
    return answer;
  }
}
