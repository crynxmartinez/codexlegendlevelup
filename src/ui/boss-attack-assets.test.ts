import { describe, expect, it } from 'vitest';
import manifest from '../../assets/effects/boss-attacks-v2/manifest.json';
import { BOSS_ATTACK_ASSETS } from './boss-attack-assets.js';
import { BOSS_ATTACK_PROFILES } from './boss-attack-profiles.js';

describe('final V2 boss attack assets', () => {
  it('registers each exact card ID once without family aliases or shared sheets', () => {
    expect(Object.keys(BOSS_ATTACK_ASSETS).sort()).toEqual(Object.keys(BOSS_ATTACK_PROFILES).sort());
    expect(Object.keys(BOSS_ATTACK_ASSETS)).toHaveLength(20);
    expect(new Set(Object.values(BOSS_ATTACK_ASSETS).map(asset => asset.travel.url)).size).toBe(20);
    for (const alias of ['wind', 'slash', 'palm', 'Taguwasi', '__hidden__']) {
      expect(BOSS_ATTACK_ASSETS).not.toHaveProperty(alias);
    }
  });

  it('plays every authored cell once through four nonoverlapping phases on one square sheet', () => {
    for (const [id, asset] of Object.entries(BOSS_ATTACK_ASSETS)) {
      const phases = [asset.formation, asset.travel, asset.impact, asset.dispersal];
      expect(phases.map(phase => [phase?.firstFrame, phase?.frames])).toEqual([[0, 3], [3, 7], [10, 4], [14, 2]]);
      const authoredFrames: number[] = [];
      for (const phase of phases) {
        expect(phase).toMatchObject({ url: BOSS_ATTACK_PROFILES[id]!.travelAsset.src,
          columns: 4, frameCount: 16, frameWidth: 512, frameHeight: 512 });
        expect(phase?.rotationDegrees ?? 0).toBe(0);
        expect(Object.isFrozen(phase)).toBe(true);
        for (let offset = 0; offset < phase!.frames!; offset++) authoredFrames.push(phase!.firstFrame! + offset);
      }
      expect(authoredFrames).toEqual(Array.from({ length: 16 }, (_, index) => index));
    }
  });

  it('maps the complete packed manifest, including the corrected Gurayn atlas', () => {
    expect(manifest.entries).toHaveLength(20);
    expect(new Set(manifest.entries.map(entry => entry.sha256)).size).toBe(20);
    for (const entry of manifest.entries) {
      expect(BOSS_ATTACK_ASSETS[entry.id]!.travel.url).toBe(entry.url);
    }
    const gurayn = manifest.entries.find(entry => entry.id === 'maguindanao/set-1/seven-sight-final-scourge-gurayn');
    expect(gurayn?.url).toBe('/effects/boss-attacks-v2/gurayn.webp');
  });
});
