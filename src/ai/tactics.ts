import { currentPower, def, inst, you, type CardIndex } from '../core/state.js';
import type { GameState, PlayerId } from '../core/types.js';
import type { AbilityOption, ChooseCardsOptions } from '../core/effects.js';
import { weightedSelectionTotal } from '../core/selection-weight.js';
import { printsLastOath } from './lines.js';

/** Four Ally slots keep exhaustive payment ordering small (at most 24 orders). */
export function chooseOfferPayment(index: CardIndex, game: GameState, candidates: string[], count: number, opts: ChooseCardsOptions): string[] {
  let best: string[] = [], bestScore = Infinity;
  const loss = (uid: string) => {
    const card = inst(game, uid), power = currentPower(index, game, uid) / 1000;
    const readyAttack = game.turnPlayer === card.owner && !card.exhausted;
    return Math.max(.5, power + (readyAttack ? 5 : 0) - (printsLastOath(index, game, uid) ? 7 : 0));
  };
  const visit = (chosen: string[], score: number) => {
    const total = weightedSelectionTotal(chosen, opts.weights, opts.firstSelectedMinimum);
    if (total >= count) { if (score < bestScore) { bestScore = score; best = chosen; } return; }
    if (score >= bestScore) return;
    for (const uid of candidates) if (!chosen.includes(uid)) visit([...chosen, uid], score + loss(uid));
  };
  visit([], 0); return best;
}

/** Compare only public battle numbers and the bot's own response cards. */
export function tacticalResponse(index: CardIndex, game: GameState, owner: PlayerId, options: AbilityOption[]): number | null {
  const battle = game.activeBattle;
  const defending = battle?.defender === owner, ps = you(game, owner);
  const attack = battle?.attackPower ?? 0, defense = battle?.defensePower ?? 0;
  let best: number | null = null, bestValue = 0;
  options.forEach((option, i) => {
    const card = def(index, game, option.uid);
    const text = option.text.replace(/\[\/?(?:green|yellow|red|blue|teal)\]/g, '');
    let value = 0;
    if (card.type === 'Sentry') {
      if (defending && battle?.target === null && attack >= defense && ps.barriers.length <= 2) value = 100;
    } else {
      const power = /Power\s*\+\s*([\d,]+)/i.exec(text);
      // Save a pure Power response when it cannot change the current outcome.
      if (/negate that activation/i.test(text)) value = 80;
      else if (/rally them/i.test(text)) {
        const enemy = game.responseChain?.links.at(-1)?.source;
        const own = ps.allies.filter((u): u is string => !!u);
        if (enemy && own.some(u => currentPower(index, game, u) <= currentPower(index, game, enemy))) value = 55;
      } else if (/draw 2 cards/i.test(text) && ps.deck.length >= 2) value = 50;
      else if (power && !/draw|damage|charge|call|return|essence|sipol/i.test(text)) {
        const amount = Number(power[1]!.replaceAll(',', ''));
        if (defending && attack >= defense && defense + amount > attack) value = 70;
        if (battle && !defending && attack < defense && attack + amount >= defense) value = 65;
      } else if (/draw\s+(?:1|one)/i.test(text)) value = 35;
      else if (/charge/i.test(text) && ps.allies.some(u => u && inst(game, u).exhausted)) value = 30;
      else if (/damage/i.test(text) && you(game, owner === 0 ? 1 : 0).allies.some(Boolean)) value = 40;
    }
    if (value > bestValue) { bestValue = value; best = i; }
  });
  return best;
}
