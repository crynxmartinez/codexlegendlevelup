import { canSee, type DuelEvent } from '../core/events.js';
import type { CardIndex } from '../core/state.js';
import type { GameState } from '../core/types.js';
import type { PlayerAction } from '../core/game.js';
import { cardDisplayName } from './card-name.js';

export function duelActivity(game: GameState, connected = true, busy = false, localInputPending = false): { text: string; opponentResponse: boolean } | null {
  if (game.winner !== null) return null;
  if (!connected) return { text: 'Reconnecting…', opponentResponse: false };
  if (localInputPending) return null;
  const chain = game.responseChain;
  if (chain?.phase === 'building') return { text: chain.responseOwner === 1 ? 'Opponent choosing a response…' : 'Your response', opponentResponse: chain.responseOwner === 1 };
  if (chain?.phase === 'resolving') return { text: `Resolving effect ${chain.links.length - chain.cursor} of ${chain.links.length}`, opponentResponse: false };
  const battle = game.activeBattle;
  if (battle?.stage === 'blocking') return battle.defender === 1 ? { text: 'Opponent choosing a response or defense…', opponentResponse: true } : null;
  if (busy && game.turnPlayer === 1) return { text: 'Opponent choosing a move…', opponentResponse: false };
  return null;
}

export function readyAttackHint(actions: readonly PlayerAction[]): string | undefined {
  const count = new Set(actions.flatMap(a => a.kind === 'attack' ? [a.attacker] : [])).size;
  return count ? `${count} attacker${count === 1 ? '' : 's'} still ready` : undefined;
}

export function mountDuelActivity(): (activity: ReturnType<typeof duelActivity>) => void {
  const edge = document.createElement('div'); edge.className = 'opponent-response-edge'; edge.setAttribute('aria-hidden', 'true');
  const field = document.createElement('div'); field.className = 'opponent-response-field'; field.setAttribute('aria-hidden', 'true');
  const label = document.createElement('div'); label.className = 'duel-activity'; label.setAttribute('role', 'status'); label.setAttribute('aria-live', 'polite'); label.hidden = true;
  document.body.append(edge, field, label);
  const update = (activity: ReturnType<typeof duelActivity>) => {
    edge.classList.toggle('on', !!activity?.opponentResponse);
    const rect = activity?.opponentResponse ? document.querySelector('.mat.foe')?.getBoundingClientRect() : undefined;
    field.classList.toggle('on', !!rect?.width);
    if (rect) { field.style.left = `${rect.left}px`; field.style.top = `${rect.top}px`; field.style.width = `${rect.width}px`; field.style.height = `${rect.height}px`; }
    label.hidden = !activity; label.classList.toggle('foe-response', !!activity?.opponentResponse);
    if (label.textContent !== (activity?.text ?? '')) label.textContent = activity?.text ?? '';
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) update(null); });
  window.addEventListener('pagehide', () => update(null));
  return update;
}

export interface ActionRecap { group: number; text: string }
export function actionRecap(events: readonly DuelEvent[], game: GameState, index: CardIndex): ActionRecap | undefined {
  const visible = events.filter(e => canSee(e, 0));
  const last = [...visible].reverse().find(e => e.type === 'abilityResolved');
  if (!last) return;
  const group = visible.filter(e => e.group === last.group);
  const resolved = new Set(group.filter(e => e.type === 'abilityResolved').map(e => e.chain?.linkId));
  if (group.some(e => e.type === 'abilityActivated' && !resolved.has(e.chain?.linkId))) return;
  const parts: string[] = [];
  const offers = group.filter(e => e.type === 'costPaid' && e.result?.outcome === 'offer').length;
  if (offers) parts.push(`${offers} ${offers === 1 ? 'Ally' : 'Allies'} Offered`);
  const boosts = new Map<string, number>();
  for (const event of group) if (event.type === 'powerChanged') for (const change of event.changes ?? []) {
    if (change.uid && change.what === 'power') boosts.set(change.uid, (boosts.get(change.uid) ?? 0) + change.to - change.from);
  }
  for (const [uid, amount] of boosts) {
    const name = index[game.cards[uid]?.defId ?? '']?.name;
    if (name && amount) parts.push(`${cardDisplayName(name)} ${amount > 0 ? '+' : '−'}${Math.abs(amount).toLocaleString()} Power`);
  }
  const results = group.filter(e => e.type === 'abilityResolved');
  const negated = results.filter(e => e.result?.outcome === 'negated').length;
  if (negated) parts.push(`${negated} activation${negated === 1 ? '' : 's'} negated`);
  const missed = results.filter(e => e.result?.outcome === 'partial').length;
  if (missed) parts.push(`${missed} effect${missed === 1 ? '' : 's'} lost targets`);
  if (!parts.length) parts.push(`${results.length} effect${results.length === 1 ? '' : 's'} resolved`);
  const extra = parts.length > 3 ? ` · +${parts.length - 3} more` : '';
  return { group: last.group, text: parts.slice(0, 3).join(' · ') + extra };
}

/** Baseline suppresses old results on entry/reconnect; new completed groups alone produce a recap. */
export class ActionRecapTracker {
  private seen = 0;
  private initialized = false;
  reset(game: GameState): void { this.seen = game.duel?.events.at(-1)?.id ?? 0; this.initialized = true; }
  update(game: GameState, index: CardIndex): ActionRecap | undefined {
    if (!this.initialized) { this.reset(game); return; }
    if (game.responseChain || game.pendingTriggers?.length || game.winner !== null) return;
    const events = game.duel?.events ?? [];
    const fresh = events.some(e => e.id > this.seen && e.type === 'abilityResolved' && canSee(e, 0));
    this.seen = events.at(-1)?.id ?? this.seen;
    return fresh ? actionRecap(events, game, index) : undefined;
  }
}

let recapNode: HTMLButtonElement | undefined;
let recapTimer: ReturnType<typeof setTimeout> | undefined;
export function clearActionRecap(): void { clearTimeout(recapTimer); recapNode?.remove(); recapNode = undefined; }
export function showActionRecap(recap: ActionRecap, open: () => void): void {
  clearActionRecap();
  if (document.hidden) return;
  const button = document.createElement('button'); recapNode = button;
  button.className = 'chain-recap'; button.type = 'button';
  const message = document.createElement('span'); message.textContent = recap.text;
  const hint = document.createElement('small'); hint.textContent = 'View history';
  button.append(message, hint); button.setAttribute('aria-label', `${recap.text}. View history`);
  button.onclick = () => { clearActionRecap(); open(); };
  button.onfocus = button.onpointerenter = () => clearTimeout(recapTimer);
  button.onblur = button.onpointerleave = () => { recapTimer = setTimeout(clearActionRecap, 6000); };
  document.body.append(button); recapTimer = setTimeout(clearActionRecap, 6000);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearActionRecap);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearActionRecap(); });
}
