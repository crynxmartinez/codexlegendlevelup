/**
 * Duel settings.
 *
 * The lesson from Master Duel is that how often the game interrupts you is a
 * *preference*, not a constant: a new player wants to be asked about
 * everything, a veteran wants to be left alone except when it matters. Rather
 * than hardcode one answer, we expose the dial.
 *
 * Presentation-only — the rules engine never reads any of this.
 */

import { setSfxEnabled, setSfxVolume, setAtmosphereVolumes } from './sfx.js';
import { setGlFxEnabled } from './fx-gl.js';
import { defaultPace, type DuelPace } from './pace.js';
import { setCardLanguage, type CardLanguage } from '../localization/language.js';

export type PromptFrequency = 'all' | 'auto' | 'minimal';

/** Normal uses the baseline search. Hard considers more candidates and saves
 * responses/attackers strategically. Both use ordinary shuffled-deck odds. */
export type AiDifficulty = 'normal' | 'hard';

export interface DuelSettings {
  language: CardLanguage;
  graphicsQuality: 'auto' | 'low' | 'standard' | 'high' | 'legacy';
  /**
   * How eagerly optional prompts interrupt play. None of these make anything
   * illegal — they only decide what gets re-offered after a refusal.
   *  - `all`     nothing is remembered; every effect is offered again
   *  - `auto`    a declined Codex switch is not re-offered this duel (default)
   *  - `minimal` no declined effect is re-offered this duel
   */
  promptFrequency: PromptFrequency;
  /** Show a card's rules text automatically when it acts. */
  autoDesc: boolean;
  /** Render your own face-down cards semi-transparent. */
  seeSetCards: boolean;
  /** Show the "whose decision is this" indicator. */
  priorityLight: boolean;
  /** Card chooser layout. */
  chooserLayout: 'grid' | 'list';
  /** Scale arrival and activation flourishes with a card's Level. */
  scaleSpectacle: boolean;
  /** Sound effects. */
  sfx: boolean;
  /** Master volume, 0..1. */
  sfxVolume: number;
  /** WebGL particle layer over the board. */
  glFx: boolean;
  /** Pre-rendered signature cutscenes, where a card has one. */
  cutscenes: boolean;
  /** Coaching tips while you play. */
  tips: boolean;
  /** Is the match log expanded? */
  logOpen: boolean;
  /** How hard the opponent plays. See AiDifficulty. */
  aiDifficulty: AiDifficulty;
  /**
   * How long the game holds still so you can read it. See ui/pace.ts.
   *
   * Optional in the type, and that is load-bearing: a stored settings object
   * written before this existed has no `duelPace`, and the merge below would
   * hand it the new default. Someone who has been playing at the old speed
   * should not have their game slowed down without asking, so the absence is
   * detected rather than papered over — see `loadSettings`.
   */
  duelPace: DuelPace;
  musicVolume: number;
  ambienceVolume: number;
  animationIntensity: 'minimal' | 'standard' | 'full';
  screenShake: 'off' | 'low' | 'full';
  cutsceneFrequency: 'first' | 'always';
}

export const DEFAULT_SETTINGS: DuelSettings = {
  language: 'tl',
  graphicsQuality: 'legacy',
  promptFrequency: 'auto',
  autoDesc: true,
  seeSetCards: true,
  priorityLight: true,
  chooserLayout: 'grid',
  scaleSpectacle: true,
  sfx: true,
  sfxVolume: 0.6,
  glFx: true,
  cutscenes: true,
  tips: true,
  logOpen: true,
  aiDifficulty: 'normal',
  // Tutorials teach explicitly; normal matches advance between real decisions.
  duelPace: 'standard',
  musicVolume: 0.12,
  ambienceVolume: 0.08,
  animationIntensity: 'standard',
  screenShake: 'low',
  cutsceneFrequency: 'first',
};

const KEY = 'codex-legends.settings';

let current: DuelSettings = { ...DEFAULT_SETTINGS };

/**
 * Read stored settings. Storage can throw outright in a private window or with
 * site data blocked, so every access is guarded and falls back to defaults.
 */
export function loadSettings(): DuelSettings {
  current = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DuelSettings>;
      // Merge rather than replace, so a setting added later still gets its
      // default instead of coming back undefined.
      current = { ...DEFAULT_SETTINGS, ...parsed };
      // Except pace. Defaulting it to Learning would slow down every existing
      // player on the next launch, which is a worse surprise than a missing
      // explanation. Saved settings that predate the setting get Standard.
      if (parsed.duelPace === undefined) current.duelPace = defaultPace(true);
    }
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  if (current.language !== 'en' && current.language !== 'tl') current.language = 'tl';
  setCardLanguage(current.language);
  return current;
}

export function settings(): DuelSettings {
  return current;
}

export function setSetting<K extends keyof DuelSettings>(
  key: K,
  value: DuelSettings[K],
): void {
  current = { ...current, [key]: value };
  if (key === 'language') setCardLanguage(current.language);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not persisting is survivable; the session still honours the change.
  }
  applySettingsToDocument();
}

/**
 * Settings that are purely a matter of styling ride on the root element, so
 * CSS can act on them without any component having to re-read the store.
 */
export function applySettingsToDocument(): void {
  setSfxEnabled(current.sfx);
  setSfxVolume(current.sfxVolume);
  setAtmosphereVolumes(current.musicVolume, current.ambienceVolume);
  setGlFxEnabled(current.glFx);
  const root = document.documentElement;
  root.classList.toggle('opt-see-set', current.seeSetCards);
  root.classList.toggle('opt-no-priority', !current.priorityLight);
  root.classList.toggle('opt-chooser-list', current.chooserLayout === 'list');
  root.classList.toggle('opt-flat-spectacle', !current.scaleSpectacle);
  root.dataset.animationIntensity = current.animationIntensity;
  root.dataset.duelPace = current.duelPace;
}

/** Human-readable labels for the settings panel. */
export const SETTING_LABELS: Record<PromptFrequency, { name: string; hint: string }> = {
  all: {
    name: 'Ask every time',
    hint: 'Nothing is ever remembered. Every optional effect is offered again.',
  },
  auto: {
    name: 'Remember Codex refusals',
    hint: 'Stops re-offering a Codex switch you already turned down this turn. Recommended.',
  },
  minimal: {
    name: 'Remember every refusal',
    hint: 'Stops re-offering any effect you declined this duel. Nothing becomes illegal — you are just not asked twice.',
  },
};
