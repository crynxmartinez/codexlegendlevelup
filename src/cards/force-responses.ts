import type { CardScript } from './types.js';
import { planCards } from '../core/activation.js';
import { buffPower, draw, type EffectContext as C } from '../core/effects.js';
import { def, inst, log, moveCard, you, opponentOf } from '../core/state.js';

type ForceMode = NonNullable<CardScript['forceModes']>[number];
export const FORCE_RESPONSES = ['rally', 'negate', 'special-call', 'attack'] as const;
export type ForceResponse = typeof FORCE_RESPONSES[number];
export const FORCE_RESPONSE_TEXT: Record<ForceResponse, string> = {
  rally: "When an opponent's Ally on the field activates its ability, [Cost: Reveal and discard this card] choose one of your Allies and one of your opponent's Allies. Rally them to the bottom of their owners' decks.",
  negate: "When your opponent activates a card's ability, [Cost: Reveal and discard this card] negate that activation.",
  'special-call': 'When your opponent activates an effect that would special call one or more Units, [Cost: Reveal and discard this card] draw 2 cards.',
  attack: "When an opponent's Unit attacks, [Cost: Reveal and discard this card] choose one of your Units. It gets Power +5000 until the end of that attack. Draw 1 card.",
};
const RESPONSE_SUMMARY: Record<ForceResponse, string> = {
  rally: "Choose an Ally on each side. Rally both to their owners' deck bottoms.",
  negate: "Negate the opponent's activation.",
  'special-call': 'Draw 2 before the calling effect resolves.',
  attack: 'Your chosen Unit gets +5000 this attack. Draw 1.',
};
export const forceResponsePrinted = (kind: ForceResponse) => `[yellow][Force][Hand] On either player's turn: ${FORCE_RESPONSE_TEXT[kind]}[/yellow]\n[green]On an attack or Barrier check: choose one of your Units; it gets Power +5000 until end of turn.[/green]`;
const ownUnits = (c: C) => [...you(c.game, c.me).allies.filter((u): u is string => !!u), ...(you(c.game, c.me).persona ? [you(c.game, c.me).persona!] : [])];
const ownAllies = (c: C) => you(c.game, c.me).allies.filter((u): u is string => !!u);
const enemyAllies = (c: C) => you(c.game, opponentOf(c.me)).allies.filter((u): u is string => !!u);
const topLink = (c: C) => c.game.responseChain?.phase === 'building' ? c.game.responseChain.links.at(-1) : undefined;
const opposingSource = (c: C) => {
  const link = topLink(c), card = link && c.game.cards[link.source];
  return link && link.owner !== c.me && link.sourceZone === 'ally' && card?.zone === 'ally'
    && (card.zoneEntry ?? 0) === link.sourceEntry ? [link.source] : [];
};
const OWN_RALLY = 'Choose your Ally to Rally';
const ENEMY_RALLY = "Choose your opponent's Ally to Rally";
const PROTECT = 'Choose your Unit for +5000 this attack';

/** The hand skill only. Attack and Barrier check effects remain independent. */
export function forceResponse(kind: ForceResponse): ForceMode {
  const canRun = (c: C) => {
    if (!you(c.game, c.me).hand.includes(c.source)) return false;
    const link = topLink(c);
    if (kind === 'attack') {
      const b = c.game.activeBattle;
      return !!b && b.defender === c.me && !b.sentryUsed && ['declared', 'blocking'].includes(b.stage)
        && (!c.game.responseChain || !!link) && ownUnits(c).length > 0;
    }
    if (!link || link.owner === c.me || link.status !== 'committed') return false;
    if (kind === 'rally') return opposingSource(c).length > 0 && ownAllies(c).length > 0;
    return kind === 'negate' || !!link.specialCalls;
  };
  return {
    response: kind, label: FORCE_RESPONSE_TEXT[kind], canRun,
    prepare: Object.assign(async (c: C) => canRun(c) ? {
      ...planCards(c, [c.source], 'discard'), data: { respondingTo: topLink(c)?.id ?? '' },
    } : null, { describe: () => ({ label: 'Reveal and discard this card', effect: RESPONSE_SUMMARY[kind] }) }),
    targets: kind === 'rally' ? [
      { prompt: OWN_RALLY, pool: ownAllies },
      { prompt: ENEMY_RALLY, pool: enemyAllies },
    ] : kind === 'attack' ? [{ prompt: PROTECT, pool: ownUnits }] : [],
    run: async c => {
      const targetLink = c.game.responseChain?.links.find(l => l.id === c.activation?.data.respondingTo);
      if (kind === 'negate') {
        if (targetLink?.status === 'committed') { targetLink.status = 'negated'; c.game.responseChain!.revision++; }
      } else if (kind === 'special-call') await draw(c, 2);
      else if (kind === 'attack') {
        const unit = await c.chooser.chooseTarget(c.me, PROTECT, ownUnits(c));
        if (unit && c.game.activeBattle) buffPower(c, unit, 5000, 'endOfAttack');
        await draw(c, 1);
      } else {
        const own = await c.chooser.chooseTarget(c.me, OWN_RALLY, ownAllies(c));
        const enemy = await c.chooser.chooseTarget(c.me, ENEMY_RALLY, enemyAllies(c));
        for (const uid of [own, enemy].filter((u): u is string => !!u)) {
          const owner = inst(c.game, uid).owner;
          await c.hooks?.onRally?.([uid], owner);
          moveCard(c.game, uid, 'deck');
          const deck = you(c.game, owner).deck;
          deck.splice(deck.indexOf(uid), 1); deck.push(uid);
          log(c.game, `${def(c.index, c.game, uid).name} was Rallied to the bottom of its owner's deck.`);
        }
      }
    },
  };
}
