import packedBossAssets from '../../assets/effects/boss-attacks-v2/manifest.json';
import { registerBossAttackAssets, type BossAttackAsset, type BossAttackSheet } from './boss-attack-motion.js';

/** Final authored V2 groups. Keys are exact card IDs, never shared family aliases. */
export const BOSS_ATTACK_ASSETS: Readonly<Record<string, BossAttackAsset>> = Object.freeze(
  Object.fromEntries(packedBossAssets.entries.map(entry => {
    const sheet = {
      url: entry.url, columns: entry.columns, frameCount: entry.frameCount,
      frameWidth: entry.frameWidth, frameHeight: entry.frameHeight,
    };
    const phase = (range: { firstFrame: number; frames: number }): BossAttackSheet =>
      Object.freeze({ ...sheet, ...range });
    const asset: BossAttackAsset = Object.freeze({
      formation: phase(entry.phases.formation),
      travel: phase(entry.phases.travel),
      impact: phase(entry.phases.impact),
      dispersal: phase(entry.phases.dispersal),
    });
    return [entry.id, asset];
  })),
);

registerBossAttackAssets(BOSS_ATTACK_ASSETS);
