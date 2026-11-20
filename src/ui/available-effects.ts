import type { PlayerAction } from '../core/game.js';
import type { GameState } from '../core/types.js';
import type { TriggerName } from '../core/effects.js';

export function triggerReason(trigger: TriggerName): string {
  const labels: Partial<Record<TriggerName, string>> = {
    unitOffered: 'An Ally was Offered', placed: 'This Unit entered the field',
    attack: 'An attack was declared', personaAttack: 'Your Persona attacked',
    personaAttacked: 'Your Persona is being attacked', attackResolved: 'An attack finished',
    barrierBroken: 'A Barrier broke', vented: 'Cards left Heart through Kalas',
    essenced: 'Cards entered Heart', codexChanged: 'Your Codex changed',
    stateReleased: 'Your State was released', forceResolved: 'A Force check resolved',
    startOfTurn: 'The turn began', endOfTurn: 'The turn is ending',
    tokenCreated: 'A token was created', supported: 'A Unit supported an attack',
  };
  return labels[trigger] ?? 'Its trigger condition was met';
}

/** Only authoritative legal actions and YOUR current response candidates earn a glow. */
export function availableEffectCards(game: GameState, actions: readonly PlayerAction[], candidates: readonly string[] = []): string[] {
  return [...new Set([...candidates, ...actions.flatMap(a =>
    ['ability', 'useSkill', 'switchCodex', 'playForce', 'playAction'].includes(a.kind) && 'uid' in a ? [a.uid]
      : a.kind === 'useSkill' && game.players[0].activeCodex ? [game.players[0].activeCodex] : [])])]
    .filter(uid => game.cards[uid]?.owner === 0);
}

export function canEndWithNoActions(game: GameState, actions: readonly PlayerAction[]): boolean {
  return game.turnPlayer === 0 && game.phase === 'battle' && game.winner === null
    && actions.some(a => a.kind === 'endTurn')
    && !actions.some(a => ['attack', 'ability', 'useSkill', 'playForce', 'playAction'].includes(a.kind));
}

export function markAvailableEffects(game: GameState, actions: readonly PlayerAction[], candidates: readonly string[] = []): void {
  document.querySelectorAll('.effect-available').forEach(node => node.classList.remove('effect-available'));
  for (const uid of availableEffectCards(game, actions, candidates)) {
    const card = game.cards[uid]!;
    const field = document.querySelector<HTMLElement>(`.card[data-uid="${CSS.escape(uid)}"], .hand-card[data-uid="${CSS.escape(uid)}"]`);
    if (field) field.classList.add('effect-available');
    // A visible pile-top card and its zone both need the affordance.
    {
      const zone = ['grave', 'heart', 'codex', 'exile', 'extra'].includes(card.zone) ? card.zone : undefined;
      if (zone) document.querySelector(`.mat:not(.foe) ${zone === 'heart' ? '.heart-btn' : `.z-${zone}`}`)?.classList.add('effect-available');
    }
  }
}
