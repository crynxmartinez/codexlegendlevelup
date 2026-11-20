/**
 * Asset URL helpers.
 *
 * `assets/` is Vite's publicDir (see vite.config.ts), so a stored path like
 * "assets/cards/web/Angel Deck/Name.webp" is served from "/cards/web/...".
 *
 * Card filenames contain spaces, commas and curly apostrophes. Use encodeURI,
 * NOT encodeURIComponent: the latter escapes commas to %2C, which the static
 * file server does not decode back, producing a 404.
 */
export function artUrl(path: string): string {
  return encodeURI('/' + path.replace(/^assets\//, ''));
}

/**
 * The size the board and hand actually draw.
 *
 * `art` is the 1024x1536 render, and it is the right file for exactly one
 * place: the inspect overlay, which shows a card up to 760px tall. Everywhere
 * else - a unit in an Ally Zone at ~110x155, a revealed card in a modal, the
 * barrier that just broke - it was 360KB of image for a few thousand pixels,
 * a dozen times a duel. `board` is the same picture at 512px on the long
 * edge, still crisp at 2x on any screen the mat can grow to, for about 56KB.
 *
 * Derived from the `art` path rather than stored per card, because the two
 * folders mirror each other by construction (tools/convert_cards.py) and a
 * second column in cards.csv is one more thing that can disagree with disk.
 */
export function boardUrl(path: string): string {
  return artUrl(path.replace('assets/cards/web/', 'assets/cards/board/'));
}

export const CARD_BACK = '/ui/card-back.webp';

/**
 * CSS positions the real board zones over the WebP background. Original PNGs
 * and the early mat reference live in art-source/, outside Vite's public root.
 */
