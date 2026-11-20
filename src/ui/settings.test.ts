import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./sfx.js', () => ({ setSfxEnabled: vi.fn(), setSfxVolume: vi.fn(), setAtmosphereVolumes: vi.fn() }));
vi.mock('./fx-gl.js', () => ({ setGlFxEnabled: vi.fn() }));
import { loadSettings, setSetting, settings } from './settings';
import { cardLanguage, setCardLanguage } from '../localization/language';

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('document', { documentElement: { classList: { toggle: vi.fn() }, dataset: {} } });
});
afterEach(() => { vi.unstubAllGlobals(); setCardLanguage('tl'); });
describe('persisted display language', () => {
  it('defaults new and pre-language settings to Tagalog', () => {
    expect(loadSettings().language).toBe('tl');
    storage.set('codex-legends.settings', JSON.stringify({ autoDesc: false }));
    expect(loadSettings().language).toBe('tl');
    expect(settings().autoDesc).toBe(false);
    expect(cardLanguage()).toBe('tl');
  });
  it('retains English after reload and switches back without modifying rules', () => {
    loadSettings(); setSetting('language', 'en');
    expect(cardLanguage()).toBe('en');
    expect(loadSettings().language).toBe('en');
    setSetting('language', 'tl');
    expect(loadSettings().language).toBe('tl');
  });
  it('falls back to Tagalog for invalid settings and blocked storage', () => {
    storage.set('codex-legends.settings', '{"language":"invalid"}');
    expect(loadSettings().language).toBe('tl');
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(loadSettings().language).toBe('tl');
    setSetting('language', 'en');
    expect(cardLanguage()).toBe('en');
  });
});
