import { describe, expect, it } from 'vitest';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { BOSS_ATTACK_PROFILES, getBossAttackProfile } from './boss-attack-profiles.js';

describe('boss attack presentation profiles', () => {
  it('covers the exact active Level 3 Unit roster, including every region', () => {
    const bosses = Object.values(ALL_CARDS).filter(card =>
      isSelectableCard(card) && card.type === 'Unit' && card.level === 3);
    expect(bosses).toHaveLength(20);
    expect(Object.keys(BOSS_ATTACK_PROFILES).sort()).toEqual(bosses.map(card => card.id).sort());
    expect(bosses.filter(card => card.archipelago === 'Luzon')).toHaveLength(3);
    expect(bosses.filter(card => card.archipelago === 'Visayas')).toHaveLength(7);
    expect(bosses.filter(card => card.archipelago === 'Mindanao')).toHaveLength(10);
  });

  it('resolves stable card IDs without aliases, inherited object keys or hidden-card leakage', () => {
    const id = 'agta/set-1/wind-heart-rescuer-taguwasi';
    expect(getBossAttackProfile(id)).toBe(BOSS_ATTACK_PROFILES[id]);
    for (const invalid of ['Taguwasi', '__hidden__', 'toString', '__proto__', '',
      'maguindanao/set-1/ridge-bed-multiplier-omaka-an']) {
      expect(getBossAttackProfile(invalid)).toBeUndefined();
    }
    for (const card of Object.values(ALL_CARDS)) {
      if (!isSelectableCard(card) || card.type !== 'Unit' || card.level !== 3) {
        expect(getBossAttackProfile(card.id)).toBeUndefined();
      }
    }
  });

  it('retains descriptive families while assigning a distinct V2 sheet to every boss', () => {
    const profiles = Object.values(BOSS_ATTACK_PROFILES);
    expect(new Set(profiles.map(value => value.assetKey)).size).toBe(11);
    expect(new Set(profiles.map(value => value.travelAsset.src)).size).toBe(20);
    expect(new Set(profiles.map(value => value.silhouette.shape)).size).toBe(20);
    const geometry = profiles.map(({ assetKey, silhouette: { shape: _shape, ...values } }) =>
      JSON.stringify([assetKey, values]));
    expect(new Set(geometry).size).toBe(20);
    for (const value of profiles) {
      expect(value.family).toBe(value.assetKey);
      expect(value.travelAsset.src).toMatch(/^\/effects\/boss-attacks-v2\/[a-z0-9-]+\.webp$/);
      expect(value.travelAsset.frames).toBe(16);
      expect(value.travelAsset.frameSize).toBe(512);
      expect(value.travelAsset.columns).toBe(4);
      expect(value.silhouette.projectileCount).toBeGreaterThanOrEqual(1);
      expect(value.silhouette.projectileCount).toBeLessThanOrEqual(7);
      expect(value.silhouette.aspectRatio).toBeGreaterThan(0);
      expect(value.silhouette.scale).toBeGreaterThan(0);
      expect(Math.abs(value.silhouette.curve)).toBeLessThanOrEqual(.25);
      for (const color of Object.values(value.palette)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps approved paired and seven-part visuals within a single profile', () => {
    expect(getBossAttackProfile('maguindanao/set-1/rattan-haunt-scourge-kurita')?.silhouette)
      .toMatchObject({ shape: 'paired-claws', projectileCount: 2 });
    expect(getBossAttackProfile('maguindanao/set-1/seven-sight-final-scourge-gurayn')?.silhouette)
      .toMatchObject({ shape: 'seven-feather-fan', projectileCount: 7 });
    expect(getBossAttackProfile('maguindanao/set-1/gurayen-wrath-mate-maka-ogis')?.silhouette)
      .toMatchObject({ shape: 'serpent-bite', projectileCount: 1 });
  });

  it('is immutable presentation metadata and leaves card rules and statistics untouched', () => {
    const before = JSON.stringify(ALL_CARDS);
    expect(Object.isFrozen(BOSS_ATTACK_PROFILES)).toBe(true);
    for (const value of Object.values(BOSS_ATTACK_PROFILES)) {
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.palette)).toBe(true);
      expect(Object.isFrozen(value.silhouette)).toBe(true);
      expect(Object.isFrozen(value.travelAsset)).toBe(true);
      expect(Reflect.set(value.silhouette, 'projectileCount', 100)).toBe(false);
      expect(value).not.toHaveProperty('damage');
      expect(value).not.toHaveProperty('targets');
      expect(value).not.toHaveProperty('power');
      expect(getBossAttackProfile(value.id)).toBe(value);
    }
    expect(JSON.stringify(ALL_CARDS)).toBe(before);
  });
});
