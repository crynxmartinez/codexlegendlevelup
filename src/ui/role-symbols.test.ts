import { describe, expect, it } from 'vitest';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { DRAFTS } from '../localization/drafts.js';
import { createTutorialProfile } from '../core/tutorial-rules.js';
import { readableRules } from './card-info.js';
import { formatCardText, formatSkillText, markKeywords, roleSymbolKey } from './glossary.js';

// Keeping the authored words in the DOM is important to copying, accessibility,
// and the inspector's text-node based extraction of leading scope ribbons.
const textContent = (html: string) => html.replace(/<[^>]*>/g, '');
const symbols = (html: string) => html.match(/class="kw kw-role kw-role-(?:ally|persona)"/g) ?? [];
const authoredRoles = (text: string) => text.match(/\b(?:Ally|Allies|Personas?)\b/gi) ?? [];

describe('skill-only Ally and Persona emblems', () => {
  it('requires an explicit skill opt-in and leaves explanatory prose and logs as words', () => {
    const text = 'Your Persona and your Allies can use their skills.';
    for (const render of [formatCardText, markKeywords]) {
      expect(symbols(render(text))).toHaveLength(0);
      expect(textContent(render(text))).toBe(text);
    }
    expect(symbols(formatSkillText(text))).toHaveLength(2);
    expect(formatSkillText(text)).toBe(formatCardText(text, { roleSymbols: true }));
  });

  it('keeps brackets, timing, and original scope wording for the inspector ribbon', () => {
    const text = '[Persona/Ally] 1/Turn: Choose an Ally.';
    const html = formatSkillText(text);
    expect(textContent(html)).toBe(text);
    expect(symbols(html)).toHaveLength(3);
    expect(html).toContain('<span class="role-symbol-name">Persona</span>');
    expect(html).toContain('<span class="role-symbol-name">Ally</span>');
  });

  it('preserves singular, plural and case in accessible names', () => {
    const forms = ['Ally', 'ally', 'ALLY', 'Allies', 'allies', 'ALLIES', 'Persona', 'persona', 'PERSONA', 'Personas', 'personas', 'PERSONAS'];
    const html = formatSkillText(forms.join(' / '));
    expect(symbols(html)).toHaveLength(forms.length);
    for (const word of forms) expect(html).toContain(`aria-label="${word}"`);
    expect(textContent(html)).toBe(forms.join(' / '));
  });

  it('does not turn the Personify action or unrelated partial words into a role', () => {
    const text = 'Personify, Personifying, mag-Personify; personal, personality, Allyship, Alligator.';
    const html = formatSkillText(text);
    expect(symbols(html)).toHaveLength(0);
    expect(html).toContain('data-tip-title="Personify"');
    expect(textContent(html)).toBe(text);
    expect(roleSymbolKey(text)).toBe('');
  });

  it('retains Zone, Zones and ownership rather than conflating a card with its location', () => {
    const text = "Choose your Ally Zone, not the opponent's Ally Zones. Move from the Persona Zone to an empty Ally Zone.";
    const html = formatSkillText(text);
    expect(symbols(html)).toHaveLength(4);
    expect(textContent(html)).toBe(text);
    expect(html).toContain('</span></span> Zones');
    expect(html).toContain('</span></span> Zone');
  });

  it('preserves costs, quantities, exclusions and ownership inside and outside costs', () => {
    const text = "[Cost: Offer 2 of your other Allies] Choose 1 opponent's Ally, not your Persona. Mag-special call ng hanggang 1 Ally.";
    const html = formatSkillText(text);
    expect(textContent(html)).toBe(text);
    expect(symbols(html)).toHaveLength(4);
    expect(html).toContain('class="text-cost"');
    expect(html.match(/data-tip-title="Offer"/g)).toHaveLength(1);
  });

  it('retains focusable glossary help with full role definitions', () => {
    const html = formatSkillText('Ally Persona');
    expect(html.match(/role="button" tabindex="0"/g)).toHaveLength(2);
    expect(html).toContain('data-tip-title="Ally"');
    expect(html).toContain('data-tip="A = Ally (Allies). ');
    expect(html).toContain('data-tip-title="Persona"');
    expect(html).toContain('data-tip="P = Persona. ');
  });

  it('escapes injected markup while preserving skill formatting', () => {
    const html = formatSkillText('<img src=x onerror="bad()"> Ally <script>Persona</script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(symbols(html)).toHaveLength(2);
  });

  it('never scans the glossary definitions or newly emitted symbol markup again', () => {
    // Ally's definition mentions Persona; that must not insert another emblem
    // inside a data attribute or add a second symbol to this one-word skill.
    const html = formatSkillText('Ally');
    expect(symbols(html)).toHaveLength(1);
    expect(html.match(/data-tip-title=/g)).toHaveLength(1);
    expect(html).toContain('beside your Persona');
    expect(textContent(html)).toBe('Ally');
  });

  it('shows one plain-language key for the roles present in a multi-skill reader', () => {
    const html = readableRules('[Persona] Attack.\n[Ally] Support your Persona.\n[Ally] Draw.');
    expect(html.match(/class="role-symbol-key"/g)).toHaveLength(1);
    expect(html.match(/class="rule-entry"/g)).toHaveLength(3);
    expect(html.match(/class="role-key-icon kw-role-ally"/g)).toHaveLength(1);
    expect(html.match(/class="role-key-icon kw-role-persona"/g)).toHaveLength(1);
    expect(roleSymbolKey('Draw 1 card.')).toBe('');
    expect(roleSymbolKey('Choose your Allies.')).not.toContain('kw-role-persona');
  });
});

describe('real authored skill coverage', () => {
  const playable = Object.values(ALL_CARDS).filter(isSelectableCard);
  const localized = playable.map(card => ({ ...card, text: DRAFTS[card.id]?.text ?? card.text }));
  const tutorial = createTutorialProfile(Object.fromEntries(playable.map(card => [card.id, card])));
  const corpora = [
    { name: 'playable English catalogue', cards: playable },
    { name: 'playable Tagalog catalogue', cards: localized },
    { name: 'tutorial overrides and retained Level 3 skills', cards: tutorial.mapping },
  ];
  for (const { name, cards } of corpora) {
    it(`preserves every authored word and scope in the ${name}`, () => {
      expect(cards.length).toBeGreaterThan(0);
      const before = JSON.stringify(cards);
      for (const card of cards) {
        const html = formatSkillText(card.text);
        expect(textContent(html), card.id).toBe(textContent(formatCardText(card.text)));
        expect(symbols(html), card.id).toHaveLength(authoredRoles(card.text).length);
      }
      expect(JSON.stringify(cards)).toBe(before);
    });
  }
});
