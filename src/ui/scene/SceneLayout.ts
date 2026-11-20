export type ArenaTheme = 'Agta' | 'Babaylan' | 'Maguindanao';
export type GraphicsQuality = 'auto' | 'low' | 'standard' | 'high' | 'legacy';
export const ARENAS = {
  Agta: { region: 'Luzon', color: 0x8abb84, land: 0x344b40, rock: 0x263641, water: 0x183f47, accent: '#a7d59b' },
  Babaylan: { region: 'Visayas', color: 0x80d7e1, land: 0x45636a, rock: 0x344157, water: 0x205c71, accent: '#99e3ec' },
  Maguindanao: { region: 'Mindanao', color: 0xe4ac77, land: 0x6d5246, rock: 0x433943, water: 0x353e59, accent: '#efbc91' },
} as const;
/** Cosmetic seeds never consume the engine RNG. */
export function sceneRandom(seed: number): () => number {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
export function qualityRatio(q: GraphicsQuality, narrow: boolean): number {
  return q === 'low' || (q === 'auto' && narrow) ? 1 : q === 'high' ? 2 : 1.5;
}
