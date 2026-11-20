/** Cosmetic identity only. Never read by the rules engine. */
export const MENU_PROFILE_KEY = 'codex-legends.menu-profile.v1';
import { PROFILE_FIGHTERS } from '../pvp/profile.js';
export const MENU_FIGHTERS = PROFILE_FIGHTERS;
export type MenuFighter = typeof MENU_FIGHTERS[number];
export interface AppliedMenuProfile {
  profile: { fighter: MenuFighter; nickname: string; motion: boolean; language: string; sound: boolean; playmat: 'current'; sleeve: 'original' };
  persisted: boolean;
}
let appliedProfile: AppliedMenuProfile | null = null;
/** Same-origin title bridge only. Session identity survives iframe replacement. */
export function applyMenuProfile(raw: unknown, persisted: unknown): boolean {
  if (!raw || typeof raw !== 'object' || typeof persisted !== 'boolean') return false;
  const value = raw as Record<string,unknown>;
  if (!MENU_FIGHTERS.includes(value.fighter as MenuFighter) || typeof value.nickname !== 'string' || !value.nickname.trim()) return false;
  appliedProfile = { persisted, profile: {
    fighter:value.fighter as MenuFighter, nickname:Array.from(value.nickname.trim()).slice(0,24).join(''),
    motion:value.motion!==false, language:value.language==='Tagalog'?'Tagalog':'English', sound:value.sound===true,
    playmat:'current', sleeve:'original',
  } };
  return true;
}
export function menuProfileSession(): AppliedMenuProfile | null {
  return appliedProfile ? {persisted:appliedProfile.persisted,profile:{...appliedProfile.profile}} : null;
}
/** Pick once per match, independently of the rules engine's seeded RNG. */
export function randomAiFighter(): MenuFighter {
  return MENU_FIGHTERS[Math.floor(Math.random() * MENU_FIGHTERS.length)]!;
}
export function menuProfile(): { fighter: string; nickname: string } {
  if (appliedProfile) return {fighter:appliedProfile.profile.fighter,nickname:appliedProfile.profile.nickname};
  try {
    // The original standalone menu saved this key. Match the menu's fallback
    // so returning players do not lose their identity when entering a duel.
    const raw = JSON.parse(localStorage.getItem(MENU_PROFILE_KEY) ?? localStorage.getItem('codex-menu-preview-v1') ?? '{}');
    return {
      fighter: MENU_FIGHTERS.includes(raw?.fighter) ? raw.fighter : 'nico',
      nickname: typeof raw?.nickname === 'string' && raw.nickname.trim() ? Array.from(raw.nickname.trim()).slice(0,24).join('') : 'Player',
    };
  } catch { return { fighter:'nico', nickname:'Player' }; }
}
