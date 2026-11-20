/** Reviewed story notes. Gameplay abilities and artwork remain fictional adaptations. */
export interface CardLore { story: string; source: string; url: string; context: string }
const mindanao = {
  source: 'Mabel Cook Cole, Philippine Folk Tales (1916) · Mythology of Mindanao',
  url: 'https://www.gutenberg.org/cache/epub/12814/pg12814-images.html',
  context: 'This is one historical English retelling, recorded during the colonial period. Versions and spellings differ across tellers. The card’s abilities are a fictional adaptation.',
};
export const CARD_LORE: Readonly<Record<string, CardLore>> = {
  'babaylan/set-1/last-moon-devourer-bakunawa': {
    story: 'The National Museum describes an Abaknon belief from Capul, Northern Samar: a lunar eclipse happens when a snake swallows the moon, and elders call for its release. This is one local account of the moon-swallowing motif.',
    source: 'National Museum of the Philippines · Abaknon and their view of the world (2021)',
    url: 'https://www.nationalmuseum.gov.ph/2021/10/29/abaknon-and-their-view-of-the-world/',
    context: 'This account belongs to a particular community; it does not represent every Visayan tradition. The card’s design and abilities are a fictional adaptation.',
  },
  'maguindanao/set-1/matutun-branch-devourer-tarabusaw': {
    ...mindanao,
    story: 'In Cole’s retelling, Tarabusaw lives on Mount Matutun and fights Sulayman with branches torn from trees. Sulayman survives the long struggle and defeats him when the monster tires.',
  },
  'maguindanao/set-1/land-restoring-raja-indarapatra': {
    ...mindanao,
    story: 'Indarapatra sends his brother Sulayman to help the people of Mindanao. A withering tree signals danger; he follows, restores his brother to life, and helps survivors return from hiding.',
  },
  'maguindanao/set-1/three-scourge-champion-sulayman': {
    ...mindanao,
    story: 'Sulayman travels to Mindanao to confront the creatures devastating its settlements. He defeats Kurita and Tarabusaw, then strikes down the great bird Pah, whose falling wing crushes him.',
  },
};
