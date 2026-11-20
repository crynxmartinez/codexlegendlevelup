/**
 * Which unit to Offer.
 *
 * This file began as a strategy layer — named lines the one-ply search cannot
 * find, because no single step of them looks good alone. Three were written,
 * for the Marsh recursion, for completing the Bayanihan line, and for calling
 * a unit back out of the Heart. Measured against the baseline over 120 paired
 * games they came to 48.3% with the search unchanged and 46.7% with a wider
 * one, against a control of exactly 50.0%. They were deleted rather than
 * tuned, which was the rule agreed before they were written.
 *
 * What is left is the one part that needs no win rate to justify it. Offering
 * a unit that prints a Last Oath fires a free skill for a cost you were
 * paying regardless; Offering one that does not, fires nothing. That is a
 * dominance argument, not a guess, and a measurement that cannot resolve
 * three points either way does not refute it. The bot chose by `worstFirst`
 * before — biggest body, weakest stats — which treats Offering as pure cost
 * and never notices the card asking to be spent.
 */
import { def, you } from '../core/state.js';
import type { CardIndex } from '../core/state.js';
import type { GameState, PlayerId } from '../core/types.js';

const MARSH = 'maguindanao/liguasan-marsh';

/**
 * The card's printed rules text.
 *
 * `CardIndex` is declared as holding `CardDef`, but what the loader actually
 * puts in it is `CardRecord`, and the rules text lives there under `text`.
 * `CardDef.abilities` is an empty array on every record in cards.json — which
 * is why the engine's own `hasLastOath`, written against it, has always
 * returned false.
 */
function printedText(index: CardIndex, game: GameState, uid: string): string {
  const d = def(index, game, uid) as unknown as { text?: string };
  return d.text ?? '';
}

/** Does this card print a Last Oath — a skill that fires when it is Offered? */
export function printsLastOath(index: CardIndex, game: GameState, uid: string): boolean {
  return /\[Last Oath\]/i.test(printedText(index, game, uid));
}

/**
 * Liguasan Marsh is up, unused, and it is still your Main.
 *
 * In that window an Offer costs nothing: the first unit Offered comes
 * straight back to the field. Anything paid for by Offering is discounted,
 * and a Last Oath on the way out is pure profit.
 */
function marshWindowOpen(index: CardIndex, game: GameState, p: PlayerId): boolean {
  const ps = you(game, p);
  if (!ps.activeCodex) return false;
  if (def(index, game, ps.activeCodex).id !== MARSH) return false;
  return (
    !ps.liguasanMarshUsedThisTurn
    && game.phase === 'main'
    && game.turnPlayer === p
  );
}

/**
 * Which of these units would you rather Offer?
 *
 * The default answer is `worstFirst` — the biggest, weakest body — which is
 * right when Offering is a pure cost and wrong whenever the unit does
 * something on its way out. A Last Oath is a free trigger for a cost you were
 * paying anyway, and inside the Marsh window the body comes back as well, so
 * there is nothing left to weigh.
 *
 * Returns the candidates reordered, best-to-Offer first.
 */
export function offerOrder(
  index: CardIndex,
  game: GameState,
  p: PlayerId,
  candidates: string[],
): string[] | null {
  const oathed = candidates.filter((u) => printsLastOath(index, game, u));
  if (!oathed.length) return null;
  const rest = candidates.filter((u) => !oathed.includes(u));
  // Inside the Marsh window the body is coming back, so spend the *best* Last
  // Oath. Outside it, the Oath is still free but the body is not — take the
  // cheapest one that has one.
  const marsh = marshWindowOpen(index, game, p);
  oathed.sort((a, b) => {
    const la = def(index, game, a).level;
    const lb = def(index, game, b).level;
    return marsh ? lb - la : la - lb;
  });
  return [...oathed, ...rest];
}
