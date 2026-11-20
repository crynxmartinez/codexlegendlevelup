/** Short, sourced cultural notes. Add entries here as the game's communities grow.
 * These describe real people and traditions, separately from fictional card lore.
 */
export interface LoadingHeritage {
  id: string;
  community: string;
  title: string;
  text: string;
  source: string;
  url: string;
}

export const LOADING_HERITAGE: readonly LoadingHeritage[] = [
  {
    id: 'agta-livelihoods', community: 'Agta', title: 'Life along forest and coast',
    text: 'Research in the northern Sierra Madre describes Agta communities combining fishing, gathering, farming and trade. Coastal and river communities draw on different local resources.',
    source: 'Minter and colleagues · Human Ecology, 2014',
    url: 'https://link.springer.com/article/10.1007/s10745-014-9673-5',
  },
  {
    id: 'maguindanao-inaul', community: 'Maguindanao', title: 'Stories woven in thread',
    text: 'Inaul means “woven” in Maguindanaon. This weaving tradition is used to make malong, with carefully arranged threads shaping the fabric’s colors and patterns.',
    source: 'Bangsamoro Commission for the Preservation of Cultural Heritage',
    url: 'https://bcpch.bangsamoro.gov.ph/school-of-living-traditions/',
  },
  {
    id: 'babaylan-community', community: 'Babaylan traditions', title: 'Healers within the community',
    text: 'The Center for Babaylan Studies describes babaylan as healers recognized by their communities, many of them women. Babaylan names a role and tradition, rather than a single tribe.',
    source: 'Center for Babaylan Studies',
    url: 'https://www.centerforbabaylanstudies.org/faqs',
  },
];

/** Deterministic rotation keeps every entry in circulation as the list grows. */
export function heritageAt(index: number): LoadingHeritage {
  const slot = Number.isSafeInteger(index) && index >= 0 ? index % LOADING_HERITAGE.length : 0;
  return LOADING_HERITAGE[slot]!;
}
