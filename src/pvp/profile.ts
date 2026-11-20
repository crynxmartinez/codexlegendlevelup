/** Optional public cosmetics. Never affects rules, decks or setup capabilities. */
export const PROFILE_FIGHTERS = ['nico', 'lira', 'amir', 'celina', 'dario', 'raina'] as const;
export type ProfileFighter = typeof PROFILE_FIGHTERS[number];
export function profileFighter(value: unknown): ProfileFighter | undefined {
  return typeof value === 'string' && (PROFILE_FIGHTERS as readonly string[]).includes(value)
    ? value as ProfileFighter : undefined;
}
export interface OpeningIdentity { name: string; fighter?: string; connected?: boolean }
