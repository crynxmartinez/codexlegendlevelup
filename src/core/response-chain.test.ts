import { describe, expect, it } from 'vitest';
import { appendLink, createChain, declineResponse, finishLink, nextLink } from './response-chain.js';

const link = (id: string, owner: 0 | 1) => ({ id, owner, source: id, skillId: 'test', label: id });

describe('alternating responses and locked LIFO', () => {
  it('one opposing decline resolves the original link without a self-chain opportunity', () => {
    const chain = createChain('chain-1', link('main', 0));
    expect(chain.responseOwner).toBe(1);
    declineResponse(chain, 1);
    expect(nextLink(chain)?.id).toBe('main');
    expect(() => appendLink(chain, link('self-chain', 0))).toThrow();
    finishLink(chain, 'main', 'resolved');
    expect(chain.phase).toBe('complete');
  });

  it('resolves an opposing response before the original after the original player declines', () => {
    const chain = createChain('chain-2', link('main', 0));
    appendLink(chain, link('response', 1));
    expect(chain.responseOwner).toBe(0);
    declineResponse(chain, 0);
    expect(nextLink(chain)?.id).toBe('response');
    finishLink(chain, 'response', 'resolved');
    expect(nextLink(chain)?.id).toBe('main');
    finishLink(chain, 'main', 'resolved');
    expect(chain.phase).toBe('complete');
  });

  it('locks the whole chain, including between links, and preserves activation ordinals', () => {
    const chain = createChain('chain-3', link('main', 0));
    appendLink(chain, link('opponent', 1));
    appendLink(chain, link('answer', 0));
    declineResponse(chain, 1);
    const resolved: string[] = [];
    while (nextLink(chain)) {
      const current = nextLink(chain)!;
      resolved.push(current.id);
      expect(() => appendLink(chain, link('late', 1))).toThrow();
      finishLink(chain, current.id, 'resolved');
    }
    expect(resolved).toEqual(['answer', 'opponent', 'main']);
    expect(chain.links.map(l => l.ordinal)).toEqual([1, 2, 3]);
  });

  it('rejects wrong-seat responses, duplicate links, stale completion and premature resolution', () => {
    const chain = createChain('chain-4', link('main', 0));
    expect(() => appendLink(chain, link('bad', 0))).toThrow();
    expect(() => declineResponse(chain, 0)).toThrow();
    expect(nextLink(chain)).toBeNull();
    expect(() => finishLink(chain, 'main', 'resolved')).toThrow();
    expect(() => appendLink(chain, link('main', 1))).toThrow();
    appendLink(chain, link('valid', 1));
    declineResponse(chain, 0);
    expect(() => finishLink(chain, 'main', 'resolved')).toThrow();
    finishLink(chain, 'valid', 'negated');
    expect(nextLink(chain)?.id).toBe('main');
    expect(chain.links[1]!.status).toBe('negated');
  });

  it('round-trips all rule state without resolver closures', () => {
    const chain = createChain('saved', link('main', 0));
    appendLink(chain, link('reply', 1));
    const saved = JSON.parse(JSON.stringify(chain));
    declineResponse(saved, 0);
    expect(nextLink(saved)?.id).toBe('reply');
    expect(chain.phase).toBe('building');
  });
});
