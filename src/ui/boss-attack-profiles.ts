import packedBossAssets from '../../assets/effects/boss-attacks-v2/manifest.json';
import type { GameState } from '../core/types.js';

/** Presentation metadata only. These profiles never determine damage, targets or attacks. */
export type BossAttackAssetKey =
  | 'slash' | 'lightning' | 'wave' | 'wind' | 'nature' | 'claws'
  | 'serpent' | 'ribbons' | 'roots' | 'feathers' | 'palm';
export type BossAttackFamily = BossAttackAssetKey;

export interface BossAttackSpriteAsset {
  readonly src: string;
  readonly frames: number;
  readonly frameSize: number;
  readonly columns: number;
}

export interface BossAttackSilhouette {
  readonly shape: string;
  /** Visual elements within ONE attack; never additional hits or game actions. */
  readonly projectileCount: number;
  /** Fan angle in degrees. */
  readonly spread: number;
  /** Width divided by height before orienting along the travel direction. */
  readonly aspectRatio: number;
  /** Signed perpendicular displacement as a fraction of source-to-target distance. */
  readonly curve: number;
  readonly rotationDeg: number;
  readonly scale: number;
}

export interface BossAttackProfile {
  readonly id: string;
  readonly name: string;
  readonly attackName: string;
  readonly family: BossAttackFamily;
  readonly assetKey: BossAttackAssetKey;
  readonly palette: Readonly<{ primary: string; secondary: string; accent: string }>;
  readonly silhouette: Readonly<BossAttackSilhouette>;
  readonly travelAsset: Readonly<BossAttackSpriteAsset>;
  /** Separate impact artwork may be registered without changing travel artwork. */
  readonly impactAsset?: Readonly<BossAttackSpriteAsset>;
}

function profile(
  id: string,
  name: string,
  attackName: string,
  assetKey: BossAttackAssetKey,
  colors: readonly [string, string, string],
  silhouette: BossAttackSilhouette,
): BossAttackProfile {
  const packed = packedBossAssets.entries.find(entry => entry.id === id);
  if (!packed) throw new Error(`Missing packed boss attack asset: ${id}`);
  return Object.freeze({
    id, name, attackName, family: assetKey, assetKey,
    palette: Object.freeze({ primary: colors[0], secondary: colors[1], accent: colors[2] }),
    silhouette: Object.freeze(silhouette),
    travelAsset: Object.freeze({
      src: packed.url,
      frames: 16, frameSize: 512, columns: 4,
    }),
  });
}

const profiles: readonly BossAttackProfile[] = [
  profile('agta/set-1/wind-heart-rescuer-taguwasi', 'Saklolo ng Hangin, Taguwasi',
    'Wind crescent', 'wind', ['#eaffff', '#4dd9c7', '#ffffff'],
    { shape: 'wind-crescent', projectileCount: 1, spread: 0, aspectRatio: 1.8, curve: .12, rotationDeg: 0, scale: 1 }),
  profile('agta/set-1/fifth-sky-tyrant-kalimangalnuk', 'Lupit ng Kalangitan, Kalimangalnuk',
    'Golden pressure vortex', 'palm', ['#ffd66d', '#b88528', '#fff3bf'],
    { shape: 'pressure-vortex', projectileCount: 1, spread: 0, aspectRatio: 1, curve: 0, rotationDeg: 45, scale: 1.15 }),
  profile('agta/set-1/life-breath-mother-nanolay', 'Hininga ng Buhay, Nanolay',
    'Petal and leaf bloom', 'nature', ['#f5fff4', '#74bc73', '#ffffff'],
    { shape: 'petal-bloom', projectileCount: 5, spread: 38, aspectRatio: .75, curve: .13, rotationDeg: 15, scale: .64 }),

  profile('babaylan/set-1/mountain-sovereign-maria-cacao', 'Diwa ng Kabundukan, Maria Cacao',
    'Emerald cacao leaves', 'nature', ['#48d58a', '#176c42', '#d6ffbe'],
    { shape: 'cacao-leaves', projectileCount: 3, spread: 24, aspectRatio: 2, curve: -.12, rotationDeg: -10, scale: .82 }),
  profile('babaylan/set-1/harvest-warden-mangaw', 'Biyaya ng Ani, Mangaw',
    'Golden grain wave', 'nature', ['#f6d26a', '#b69538', '#fff2bb'],
    { shape: 'grain-wave', projectileCount: 5, spread: 16, aspectRatio: 2.5, curve: .04, rotationDeg: 0, scale: .68 }),
  profile('babaylan/set-1/thunder-sovereign-kaptan', 'Dagundong ng Langit, Kaptan',
    'White-blue lightning', 'lightning', ['#e9fbff', '#579bff', '#ffffff'],
    { shape: 'lightning-bolt', projectileCount: 1, spread: 0, aspectRatio: 3, curve: 0, rotationDeg: 0, scale: 1.1 }),
  profile('babaylan/set-1/ocean-sovereign-maguayan', 'Tinig ng Laot, Maguayan',
    'Broad turquoise wave', 'wave', ['#39d7dc', '#157ca1', '#ddffff'],
    { shape: 'broad-wave', projectileCount: 1, spread: 0, aspectRatio: .85, curve: 0, rotationDeg: 0, scale: 1.3 }),
  profile('babaylan/set-1/abyssal-revolt-sinogo', 'Himagsik ng Kalaliman, Sinogo',
    'Abyssal water claws', 'claws', ['#4599f5', '#164884', '#b6f2ff'],
    { shape: 'water-claws', projectileCount: 3, spread: 12, aspectRatio: 2.3, curve: -.08, rotationDeg: 10, scale: .85 }),
  profile('babaylan/set-1/last-moon-devourer-bakunawa', 'Gutom sa Buwan, Bakunawa',
    'Silver-blue serpent fang', 'serpent', ['#a9c9e8', '#3468a7', '#f0f7ff'],
    { shape: 'moon-serpent-fang', projectileCount: 1, spread: 0, aspectRatio: 2.5, curve: -.18, rotationDeg: 0, scale: 1.2 }),
  profile('babaylan/set-1/unbroken-invocation-amara', 'Panatang Di-Matitinag, Amara',
    'White-gold invocation ribbons', 'ribbons', ['#fff4d5', '#d6b970', '#ffffff'],
    { shape: 'invocation-ribbons', projectileCount: 3, spread: 28, aspectRatio: 3.2, curve: .2, rotationDeg: 0, scale: .82 }),

  profile('maguindanao/set-1/nonok-veiled-guardian-apo-a-bekong', 'Kalinga ng Nonok, Apo a Bekong',
    'Golden root lash', 'roots', ['#dfbd6b', '#806136', '#fff0b6'],
    { shape: 'root-lash', projectileCount: 1, spread: 0, aspectRatio: 3.2, curve: .18, rotationDeg: 0, scale: 1 }),
  profile('maguindanao/set-1/beneath-water-ancestress-potri-rainalaut', 'Alaala sa Kailaliman, Potri Rainalaut',
    'Pale-blue water coil', 'ribbons', ['#c4efff', '#65a9ce', '#f5fdff'],
    { shape: 'water-coil', projectileCount: 1, spread: 0, aspectRatio: 1.4, curve: -.24, rotationDeg: 25, scale: 1.1 }),
  profile('maguindanao/set-1/boat-watching-tonong-tomitay', 'Kalinga sa Paglalayag, Tomitay',
    'Focused water thrust', 'ribbons', ['#79dce9', '#298eae', '#e4ffff'],
    { shape: 'water-thrust', projectileCount: 1, spread: 0, aspectRatio: 4, curve: .015, rotationDeg: 0, scale: .85 }),
  profile('maguindanao/set-1/sun-darkening-scourge-pah', 'Lilim ng Araw, Pah',
    'Black-crimson wing gust', 'feathers', ['#ae2649', '#171c2b', '#e36378'],
    { shape: 'feather-wing-gust', projectileCount: 3, spread: 42, aspectRatio: 1.6, curve: -.1, rotationDeg: -15, scale: 1 }),
  profile('maguindanao/set-1/rattan-haunt-scourge-kurita', 'Sindak sa Yantok, Kurita',
    'Paired moss-green claws', 'claws', ['#8aaa67', '#445637', '#dce1ac'],
    { shape: 'paired-claws', projectileCount: 2, spread: 22, aspectRatio: 1.4, curve: .08, rotationDeg: -20, scale: 1.1 }),
  profile('maguindanao/set-1/matutun-branch-devourer-tarabusaw', 'Poot ng Matutun, Tarabusaw',
    'Branch smash', 'roots', ['#b89b69', '#65513c', '#d5c391'],
    { shape: 'branch-smash', projectileCount: 1, spread: 0, aspectRatio: 1.3, curve: -.04, rotationDeg: 35, scale: 1.35 }),
  profile('maguindanao/set-1/land-restoring-raja-indarapatra', 'Panata ng Pagbangon, Indarapatra',
    'Ivory-gold palm shockwave', 'palm', ['#fff0ca', '#d9b565', '#ffffff'],
    { shape: 'palm-shockwave', projectileCount: 1, spread: 0, aspectRatio: .85, curve: 0, rotationDeg: 0, scale: 1.2 }),
  profile('maguindanao/set-1/gurayen-wrath-mate-maka-ogis', 'Katuwang ng Poot, Maka-Ogis',
    'Dark-gold serpent bite', 'serpent', ['#b59a56', '#3b382b', '#e5cf8e'],
    { shape: 'serpent-bite', projectileCount: 1, spread: 0, aspectRatio: 1.65, curve: .24, rotationDeg: 15, scale: 1.1 }),
  profile('maguindanao/set-1/three-scourge-champion-sulayman', 'Tapang na May Kapalit, Sulayman',
    'Silver curved slash', 'slash', ['#e4eff8', '#b4384b', '#ffffff'],
    { shape: 'curved-sword-slash', projectileCount: 1, spread: 0, aspectRatio: 1.8, curve: .15, rotationDeg: -20, scale: 1.15 }),
  profile('maguindanao/set-1/seven-sight-final-scourge-gurayn', 'Pitong Tanaw ng Sindak, Gurayn',
    'Seven crimson feathers', 'feathers', ['#bd3b56', '#432937', '#f1a0a9'],
    { shape: 'seven-feather-fan', projectileCount: 7, spread: 48, aspectRatio: 3.2, curve: .08, rotationDeg: 0, scale: .55 }),
];

/** Exactly the active Level 3 Unit roster; archived cards and hidden Omaka-an are absent. */
export const BOSS_ATTACK_PROFILES: Readonly<Record<string, BossAttackProfile>> =
  Object.freeze(Object.fromEntries(profiles.map(value => [value.id, value])));

/** Exact ID lookup: names, hidden identities and unrelated cards have no boss effect. */
export function getBossAttackProfile(id: string): BossAttackProfile | undefined {
  return Object.hasOwn(BOSS_ATTACK_PROFILES, id) ? BOSS_ATTACK_PROFILES[id] : undefined;
}

/** Special attacks belong to the current Persona, never to a Level 3 Ally. */
export function getPersonaAttackProfile(
  game: Pick<GameState, 'cards' | 'players'>, attacker: string,
): BossAttackProfile | undefined {
  const card = game.cards[attacker];
  if (!card || card.zone !== 'persona' || game.players[card.owner].persona !== attacker) return undefined;
  return getBossAttackProfile(card.defId);
}
