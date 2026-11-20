import type { PlayerId } from './types.js';

export interface LinkActivation {
  id: string;
  owner: PlayerId;
  source: string;
  skillId: string;
  label: string;
  targets?: string[];
  paidCards?: string[];
  receipt?: import('./activation.js').CostReceipt;
  event?: import('./effects.js').TriggerEvent;
  sourceEntry?: number;
  sourceZone?: import('./types.js').Zone;
  specialCalls?: boolean;
  declared?: import('./activation-targets.js').DeclaredChoice[];
}

export type LinkOutcome = 'resolved' | 'negated' | 'unavailable' | 'partial';
export interface ChainLink extends LinkActivation {
  ordinal: number;
  status: 'committed' | LinkOutcome;
}

/** Rules data only. Resolver functions belong to the controller, never a view. */
export interface ResponseChain {
  id: string;
  revision: number;
  phase: 'building' | 'resolving' | 'complete';
  responseOwner: PlayerId | null;
  links: ChainLink[];
  cursor: number;
}

export interface PendingTrigger {
  id: string;
  owner: PlayerId;
  source: string;
  kind: 'ability' | 'codex' | 'granted';
  grantedId?: string;
  abilityIndex?: number;
  event: import('./effects.js').TriggerEvent;
  label: string;
  text: string;
}

export function createChain(id: string, first: LinkActivation): ResponseChain {
  return {
    id, revision: 1, phase: 'building', responseOwner: first.owner === 0 ? 1 : 0,
    links: [{ ...first, ordinal: 1, status: 'committed' }], cursor: -1,
  };
}

export function appendLink(chain: ResponseChain, activation: LinkActivation): void {
  if (chain.phase !== 'building' || chain.responseOwner !== activation.owner) {
    throw new Error('This player does not own a response opportunity.');
  }
  if (chain.links.some(link => link.id === activation.id)) throw new Error('Duplicate chain link.');
  chain.links.push({ ...activation, ordinal: chain.links.length + 1, status: 'committed' });
  chain.responseOwner = activation.owner === 0 ? 1 : 0;
  chain.revision++;
}

/** A single decline locks the entire chain; there is no second pass. */
export function declineResponse(chain: ResponseChain, owner: PlayerId): void {
  if (chain.phase !== 'building' || chain.responseOwner !== owner) {
    throw new Error('This player cannot decline this response.');
  }
  chain.phase = 'resolving';
  chain.responseOwner = null;
  chain.cursor = chain.links.length - 1;
  chain.revision++;
}

export function nextLink(chain: ResponseChain): ChainLink | null {
  return chain.phase === 'resolving' ? chain.links[chain.cursor] ?? null : null;
}

export function finishLink(chain: ResponseChain, id: string, outcome: LinkOutcome): void {
  const link = nextLink(chain);
  if (!link || link.id !== id) throw new Error('Only the current resolving link can finish.');
  link.status = outcome;
  chain.cursor--;
  chain.revision++;
  if (chain.cursor < 0) chain.phase = 'complete';
}
