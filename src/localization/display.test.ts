import { afterEach, describe, expect, it } from 'vitest';
import { ALL_CARDS, indexForDecks, isSelectableCard } from '../data/loader';
import { DISPLAY_CARDS, cardSearchText, displayCardName, displayRuleText } from './display';
import { cardLanguage, setCardLanguage } from './language';
import { DRAFTS } from './drafts';
import { ALL_SCRIPTS } from '../core/game';

afterEach(() => setCardLanguage('tl'));
describe('display language is independent of game rules', () => {
  it('defaults to Tagalog and switches every active card back to exact English', () => {
    expect(cardLanguage()).toBe('tl');
    const index = indexForDecks(['Agta', 'Babaylan', 'Maguindanao']);
    for (const card of Object.values(ALL_CARDS).filter(isSelectableCard)) {
      const original = JSON.stringify(card);
      setCardLanguage('tl');
      expect(DISPLAY_CARDS[card.id]!.name).toBe(DRAFTS[card.id]!.name);
      expect(DISPLAY_CARDS[card.id]!.text).toBe(DRAFTS[card.id]!.text);
      expect(displayCardName(card.name)).toBe(DRAFTS[card.id]!.name);
      expect(displayRuleText(card.text)).toBe(DRAFTS[card.id]!.text);
      setCardLanguage('en');
      expect(DISPLAY_CARDS[card.id]!.name).toBe(card.name);
      expect(DISPLAY_CARDS[card.id]!.text).toBe(card.text);
      expect(index[card.id]!.name).toBe(card.name);
      expect(JSON.stringify(card)).toBe(original);
    }
  });
  it('searches both languages and falls back safely for unknown text', () => {
    expect(cardSearchText('agta/set-1/alig-restores-her-brothers')).toContain('magbalik');
    expect(cardSearchText('agta/set-1/alig-restores-her-brothers')).toContain('return a level');
    expect(displayRuleText('Unknown effect')).toBe('Unknown effect');
    expect(displayCardName('Unknown name')).toBe('Unknown name');
  });
  it('translates every authored active-card ability without changing scripts', () => {
    for (const card of Object.values(ALL_CARDS).filter(isSelectableCard)) {
      for (const ability of ALL_SCRIPTS[card.id]?.abilities ?? []) {
        expect(displayRuleText(ability.text), `${card.id}: ${ability.text}`).not.toBe(ability.text);
      }
    }
  });
});
