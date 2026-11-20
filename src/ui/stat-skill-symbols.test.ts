import { describe, expect, it } from 'vitest';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { createTutorialProfile } from '../core/tutorial-rules.js';
import { DRAFTS } from '../localization/drafts.js';
import { escapeHtml, formatCardText, formatSkillText, markKeywords, roleSymbolKey } from './glossary.js';

const textContent = (html: string) => html.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
const symbols = (html: string, stat = '(?:power|defense|barrier|plays)') =>
  html.match(new RegExp(`class="kw kw-stat kw-stat-${stat}"`, 'g')) ?? [];

describe('supplemental skill stat symbols', () => {
  it('opts in only through skill rendering while prose and logs retain their words', () => {
    const text = 'Gain 1 Play. Your Current Power and Defense protect your Barriers.';
    for (const render of [formatCardText, markKeywords]) {
      expect(symbols(render(text))).toHaveLength(0);
      expect(textContent(render(text))).toBe(text);
    }
    expect(symbols(formatSkillText(text))).toHaveLength(4);
  });

  it('keeps every singular, plural, case and Current modifier visible', () => {
    const text = 'Power / power / Current Power / CURRENT POWER / Defense / defense / Barrier / Barriers / Shields / shield';
    const html = formatSkillText(text);
    expect(symbols(html)).toHaveLength(10);
    expect(textContent(html)).toBe(text);
    expect(html).toContain('>Current Power</span>');
    expect(html).toContain('>CURRENT POWER</span>');
    expect(html).not.toContain('role-symbol-name');
    expect(html).not.toContain('aria-hidden');
  });

  it.each([
    'Gain +1 Play this turn.',
    'Your opponent loses 2 plays.',
    'This costs 1 Play.',
    'Spend up to 2 additional plays.',
    'You have at least 3 plays remaining.',
    'You get 1 extra Play this turn.',
    'Pay 1 Play to draw.',
    '[Cost: 1 Play] Draw 1 card.',
    '1 Play',
    '(2 Plays)',
    'You start with 2 plays available.',
  ])('marks numeric allowance wording without consuming quantity: %s', text => {
    const html = formatSkillText(text);
    expect(symbols(html, 'plays')).toHaveLength(1);
    expect(textContent(html)).toBe(text);
    expect(html).toContain('data-tip-title="Plays"');
  });

  it.each([
    'Play this card only if you Offered 3 or more this turn.',
    'Play with - [Cost: Kalas 2] Draw 2 cards.',
    'Choose 1 card in play. Move 2 cards out of play.',
    'Player 1 plays a card. Player 2 plays first.',
    'Level 3 plays differently.',
    'You may play 2 cards from your hand.',
    'Gain a play. Spend your remaining plays.',
    'Gameplay, display and replay have no allowance symbol.',
    '1 play this card from your hand.',
  ])('does not reinterpret generic play or an ambiguous allowance: %s', text => {
    const html = formatSkillText(text);
    expect(symbols(html, 'plays')).toHaveLength(0);
    expect(textContent(html)).toBe(text);
  });

  it('retains total Defense wording and does not turn Attack commands into Power', () => {
    const text = 'Attack. Total Defense is Current Power plus Defense. Attack check and Barrier check resolve.';
    const html = formatSkillText(text);
    expect(symbols(html, 'defense')).toHaveLength(2);
    expect(symbols(html, 'power')).toHaveLength(1);
    expect(symbols(html)).toHaveLength(3);
    expect(html).toContain('>Current Power</span>');
    expect(html).toContain('>Barrier check</span>');
    expect(textContent(html)).toBe(text);
  });

  it('preserves cost, quantity, timing, ownership and exclusions beside existing role emblems', () => {
    const text = '[blue][Persona/Ally] 1/Turn [Cost: 1 Play and Offer 2 other Allies] Gain Power +3000 until end of turn.\nYour opponent loses 1 Barrier; keep Current Power and Defense unchanged.';
    const html = formatSkillText(text);
    expect(textContent(html)).toBe(textContent(formatCardText(text)));
    expect(symbols(html)).toHaveLength(5);
    expect(html).toContain('class="text-cost"');
    expect(html).toContain('background:#3498db');
    expect(html.match(/class="kw kw-role kw-role-(?:ally|persona)"/g)).toHaveLength(3);
    expect(html.match(/data-tip-title="Offer"/g)).toHaveLength(1);
  });

  it('keeps one focusable help target per stat with the existing readable accessible name', () => {
    const html = formatSkillText('Current Power; Defense; Shields; Gain 1 Play.');
    expect(symbols(html)).toHaveLength(4);
    expect(html.match(/role="button" tabindex="0"/g)).toHaveLength(4);
    expect(html.match(/<span/g)).toHaveLength(4);
    expect(html.match(/data-tip-title=/g)).toHaveLength(4);
    for (const word of ['Current Power', 'Defense', 'Shields', 'Play']) {
      expect(html).toContain(`>${word}</span>`);
    }
    expect(html).toContain('data-tip-title="Power"');
    expect(html).toContain('data-tip-title="Barrier"');
  });

  it('escapes HTML and does not scan definitions or emitted markup again', () => {
    const text = '<img src=x onerror="bad()"> Current Power & Defense <script>Shields</script> [Cost: 1 Play]';
    const html = formatSkillText(text);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(textContent(html)).toBe(escapeHtml(text));
    expect(symbols(html)).toHaveLength(4);
    // The Power definition contains "Power"; only the authored occurrence is marked.
    expect(symbols(formatSkillText('Current Power'))).toHaveLength(1);
    expect(formatSkillText('Current Power').match(/data-tip-title=/g)).toHaveLength(1);
  });

  it('does not add a redundant legend for stat labels', () => {
    expect(roleSymbolKey('Power, Defense, Barriers. Gain 1 Play.')).toBe('');
    const key = roleSymbolKey('Your Ally gains Power. Your Persona loses 1 Barrier.');
    expect(key.match(/class="role-key-icon/g)).toHaveLength(2);
    expect(key).not.toContain('kw-stat');
  });
});

describe('authored skill preservation with stat symbols', () => {
  const playable = Object.values(ALL_CARDS).filter(isSelectableCard);
  const localized = playable.map(card => ({ ...card, text: DRAFTS[card.id]?.text ?? card.text }));
  const tutorial = createTutorialProfile(Object.fromEntries(playable.map(card => [card.id, card])));
  for (const { name, cards } of [
    { name: 'English catalogue', cards: playable },
    { name: 'Tagalog catalogue', cards: localized },
    { name: 'tutorial skills', cards: tutorial.mapping },
  ]) {
    it(`preserves all readable rules and source records in the ${name}`, () => {
      const before = JSON.stringify(cards);
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(textContent(formatSkillText(card.text)), card.id).toBe(textContent(formatCardText(card.text)));
      }
      expect(JSON.stringify(cards)).toBe(before);
    });
  }
});
