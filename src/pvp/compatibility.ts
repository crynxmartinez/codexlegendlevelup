import { CONTENT_REVISION, MATCH_PROTOCOL } from './catalog.js';

export interface MatchVersion { protocol: number; content: string; openingVersion?: 1 }
/** Historical server identity. Its Rally targets no longer match current rules. */
export const PREVIOUS_MATCH_VERSION: MatchVersion = { protocol: 2, content: 'submission-clarity-2026-10-04' };
export function supportedMatchVersion(raw: unknown): MatchVersion | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as { protocol?: unknown; content?: unknown; contentRevision?: unknown };
  const content = v.content ?? v.contentRevision;
  if (v.protocol === MATCH_PROTOCOL && content === CONTENT_REVISION) return { protocol: MATCH_PROTOCOL, content: CONTENT_REVISION };
  return null;
}

export async function readMatchVersion(base: string, request: typeof fetch = fetch): Promise<MatchVersion> {
  let response: Response;
  try { response = await request(new URL('/codex/health', base.replace(/^ws/, 'http')), { cache:'no-store', signal:AbortSignal.timeout(8000) }); }
  catch { throw new Error('The match server is temporarily unavailable. Try again shortly.'); }
  if (!response.ok) throw new Error('The match server is temporarily unavailable. Try again shortly.');
  let health: unknown;
  try { health = await response.json(); } catch { throw new Error('The match server is temporarily unavailable. Try again shortly.'); }
  const version = supportedMatchVersion(health);
  if (!version) throw new Error('The match server is updating. Please try again shortly.');
  return { ...version, ...((health as { openingVersion?: unknown }).openingVersion === 1 ? { openingVersion: 1 as const } : {}) };
}
