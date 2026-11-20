import type { CardIndex } from '../core/state.js';
import type { GameState } from '../core/types.js';
import { publicEffectTargets } from '../core/effect-presentation.js';
import { cardDisplayName } from './card-name.js';
import { fieldPosition } from './field-card-info.js';

/** Latest committed public effect; never expose private response candidates. */
export function chainSummary(game: GameState, index: CardIndex) {
  const chain = game.responseChain;
  const latest = chain?.links.at(-1);
  if (!chain || !latest) return undefined;
  return {
    source: latest.source,
    name: index[game.cards[latest.source]?.defId ?? '']?.name ?? 'a card effect',
    owner: latest.owner === 0 ? 'You' : 'Opponent',
    count: chain.links.length,
    effect: latest.label.replace(/\[Cost\]\s*/gi, '').replace(/\[\/?[a-z]+\]/gi, '').trim(),
    targets: publicEffectTargets(game, latest),
    targetLabel: publicEffectTargets(game, latest).map(uid => {
      const card = game.cards[uid]!;
      return `${cardDisplayName(index[card.defId]?.name ?? 'Unit')} · ${fieldPosition(card, 0)}`;
    }).join(' / '),
  };
}

export function chainProgress(game: GameState): string | undefined {
  const chain = game.responseChain;
  if (!chain || chain.phase === 'complete') return undefined;
  const remaining = chain.links.slice(0, chain.phase === 'resolving' ? chain.cursor + 1 : chain.links.length).reverse().map(link => link.ordinal);
  const order = remaining.length > 4 ? `${remaining.slice(0, 3).join(' → ')} → … → 1` : remaining.join(' → ');
  if (chain.phase === 'resolving') return remaining.length ? `Resolving ${order}` : undefined;
  return `${chain.responseOwner === 0 ? 'Your response' : 'Opponent’s response'} · ${order}`;
}
