import type { DeckList } from '../core/setup.js';
import { FORCE_COUNT } from '../core/deckcheck.js';
import { ALL_CARDS, type CardRecord } from '../data/loader.js';

export interface DeckAdvice { title: string; count: string; text: string }

/** Composition hints only. Never changes deck legality or claims a winning ratio. */
export function deckAdvice(deck: DeckList, archetype: string): DeckAdvice[] {
  const entries = deck.main.flatMap(e => ALL_CARDS[e.id] && e.copies > 0 ? [{ card: ALL_CARDS[e.id]!, copies: e.copies }] : []);
  const count = (match: (c: CardRecord) => boolean) => entries.reduce((n, e) => n + (match(e.card) ? e.copies : 0), 0);
  const units = count(c => c.type === 'Unit');
  const early = count(c => c.type === 'Unit' && c.level <= 2);
  const actions = count(c => c.type === 'Action');
  const forces = count(c => c.type === 'Force');
  const tips: DeckAdvice[] = [
    { title: 'Develop your field', count: `${early} Level 1–2 Units · ${units} Units total`,
      text: early ? 'Try sample hands below. Can you call Allies and still keep useful cards for defense? Check their skills, not just their Levels.' : 'Consider Level 1–2 Units with useful call skills or Defense. Try sample hands to see whether your current lineup gets started reliably.' },
    { title: 'Balance your Plays', count: `${actions} Actions`,
      text: actions ? 'Actions and normal calls each use 1 Play. Check whether your opening hand lets you build a field as well as use Actions.' : 'You have no Actions. That can be intentional; check whether your Units and Codex cover the support effects you need.' },
    { title: 'Keep a response ready', count: `${forces} / ${FORCE_COUNT} Forces`,
      text: forces === FORCE_COUNT ? 'Your Force count is complete. Read each response condition before discarding one or calling it as a Unit.' : `A legal deck needs exactly ${FORCE_COUNT} Forces. Their response conditions differ; keep track of which situations your hand can answer.` },
  ];
  const mentions = (word: string) => count(c => new RegExp(`\\b${word}\\b`, 'i').test(c.text));
  if (archetype === 'Maguindanao') tips.push({ title: 'Support your Offers',
    count: `${mentions('Offer')} with Offer text · ${mentions('Last Oath')} with Last Oath text`,
    text: 'Pair Offer costs with Allies you can afford to lose, Last Oaths and ways to rebuild. These counts mark rules-text mentions, not guaranteed combos.' });
  if (archetype === 'Babaylan') tips.push({ title: 'Build before you Kalas',
    count: `${mentions('Sanib')} with Sanib text · ${mentions('Kalas')} with Kalas text`,
    text: 'Check how you fill Heart before spending it. Include ways to reach your Andukha threshold and useful Kalas effects. Counts mark rules-text mentions, not guaranteed combos.' });
  if (archetype === 'Agta') tips.push({ title: 'Keep Allies available',
    count: `${mentions('Sipol')} with Sipol text`,
    text: 'Plan how to rebuild after attacks and supporting. Check your call effects and Sipol requirements. This count marks rules-text mentions, not guaranteed extra calls.' });
  return tips;
}
