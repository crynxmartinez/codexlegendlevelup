import { expect, it, vi } from 'vitest';
import { CONTENT_REVISION, MATCH_PROTOCOL } from './catalog.js';
import { PREVIOUS_MATCH_VERSION, readMatchVersion, supportedMatchVersion } from './compatibility.js';

it('rejects older servers whose Rally targeting disagrees with current card rules', () => {
  expect(supportedMatchVersion({protocol:MATCH_PROTOCOL,content:CONTENT_REVISION})).toEqual({protocol:MATCH_PROTOCOL,content:CONTENT_REVISION});
  expect(supportedMatchVersion(PREVIOUS_MATCH_VERSION)).toBeNull();
  expect(supportedMatchVersion({protocol:3,content:'online-presentation-2026-10-07'})).toBeNull();
  expect(supportedMatchVersion({protocol:2,content:CONTENT_REVISION})).toBeNull();
  expect(supportedMatchVersion({protocol:3,content:PREVIOUS_MATCH_VERSION.content})).toBeNull();
  expect(supportedMatchVersion({protocol:99,content:'unknown'})).toBeNull();
});
it('negotiates the deployed server before matchmaking without caching the result', async () => {
  const current = {protocol:MATCH_PROTOCOL,content:CONTENT_REVISION};
  const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ok:true,game:'codex-legends',...current})));
  expect(await readMatchVersion('wss://example.com',request)).toEqual(current);
  expect(String(request.mock.calls[0]![0])).toBe('https://example.com/codex/health');
  expect(request.mock.calls[0]![1]?.cache).toBe('no-store');
});
it('reports unavailable or unknown servers without telling players to refresh endlessly', async () => {
  for (const response of [new Response('',{status:523}),new Response('<html>offline</html>'),new Response(JSON.stringify({protocol:99,content:'unknown'}))]) {
    const request=vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(readMatchVersion('https://example.com',request)).rejects.toThrow(/server.*(unavailable|updating)/i);
  }
});
it('negotiates the optional opening without changing battle protocol compatibility', async () => {
  const current = { protocol: MATCH_PROTOCOL, content: CONTENT_REVISION };
  for (const openingVersion of [undefined, 1, 99]) {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...current, openingVersion })));
    expect(await readMatchVersion('https://example.com', request)).toEqual({ ...current, ...(openingVersion === 1 ? { openingVersion: 1 } : {}) });
  }
});
