/**
 * Card text formatting.
 *
 * This exists because the first version of the single-pass rewrite shipped a
 * crash: the badge alternative carried a nested capture group, which shifted
 * every later argument of the replacer along by one, so a keyword match handed
 * `keywordSpan` an undefined word and the whole screen died on `toLowerCase`.
 * Nothing about that is visible by reading the regex — only by running it.
 */
import { it, expect } from 'vitest';
import { formatCardText, markKeywords, KEYWORDS, KEYWORD_PATTERN } from './glossary.js';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';

it('marks a keyword with its definition, keeping the printed form', () => {
  const out = formatCardText('When this unit is Offered, draw a card.');

  expect(out).toContain('data-tip-title="Offer"');
  expect(out).toContain('>Offered</span>');
  expect(out).toContain('class="kw text-offer"');
});

it('renders colour badges and costs without disturbing keywords', () => {
  const out = formatCardText('[blue][Cost: 1 Energy] Sipol 1.');

  expect(out).toContain('background:#3498db');
  expect(out).toContain('class="text-cost"');
  expect(out).toContain('data-tip-title="Cost"');
  expect(out).toContain(': 1 Energy]</span>');
  expect(out).toContain('data-tip-title="Sipol"');
});

it('adds a red State square alongside each timing color', () => {
  for (const [color, hex, state] of [['green','#27ae60','Andukha 9'], ['blue','#3498db','Garahana'], ['yellow','#f1c40f','Bayanihan']]) {
    const out = formatCardText(`[${color}][${state}] This skill needs its State.`);
    expect(out).toContain(`background:${hex}`);
    expect(out.match(/background:#e74c3c/g)).toHaveLength(1);
  }
});

it('marks an inline State condition without marking the unrelated skill beside it', () => {
  const out = formatCardText('[blue]Draw 1.[/blue][green]When Bayanihan is released, gain Power.[/green]');
  expect(out.match(/background:#e74c3c/g)).toHaveLength(1);
  expect(out.indexOf('background:#e74c3c')).toBeGreaterThan(out.indexOf('background:#27ae60'));
  expect(formatCardText('[green][red][Andukha 6] Gain Power.').match(/background:#e74c3c/g)).toHaveLength(1);
  expect(formatCardText('[green]Draw 1.')).not.toContain('background:#e74c3c');
});

it('marks keywords inside a cost, where most of them are printed', () => {
  const out = formatCardText('[Cost: Offer 1 of your units] Draw 2.');

  // The cost bracket is matched whole, so its contents need their own pass.
  expect(out).toContain('data-tip-title="Offer"');
  expect(out).toContain('class="text-cost"');
  // Still one span for the one keyword — the inner pass must not re-run
  // over the outer output.
  expect(out.match(/data-tip-title="Offer"/g) ?? []).toHaveLength(1);
});

it('never re-scans its own output', () => {
  // The Kalas definition contains the word "Kaluluwa". A sequential chain of
  // replaces would have found it inside the emitted attribute and nested a
  // span in the middle of it.
  const out = formatCardText('Kalas 2.');

  expect(out).toContain('data-tip-title="Kalas"');
  // One keyword in, one span out.
  expect(out.match(/class="kw/g) ?? []).toHaveLength(1);
  expect(out).not.toContain('<span class="kw text-andukha">Kaluluwa</span> tokens');
});

it('prefers the longest form when two keywords overlap', () => {
  expect(formatCardText('Last Oath: do a thing.')).toContain('data-tip-title="Last Oath"');
  // "Barrier check" must win over both "Barrier" and "check".
  expect(markKeywords('Barrier check revealed a Force.'))
    .toContain('data-tip-title="Check"');
});

it('escapes the text it is given', () => {
  const out = formatCardText('<script>alert(1)</script>');

  expect(out).not.toContain('<script>');
  expect(out).toContain('&lt;script&gt;');
});

it('leaves text with no keywords alone', () => {
  expect(formatCardText('Choose one, then continue.')).toBe('Choose one, then continue.');
});

it('explains Sumipat and common printed variants without partial word matches', () => {
  expect(formatCardText('Sumipat 3.')).toContain('data-tip-title="Sumipat"');
  for (const form of ['specially called','special called','special calling']) {
    expect(formatCardText(form)).toContain(`>${form}</span>`);
    expect(formatCardText(form)).toContain('data-tip-title="Special call"');
  }
  expect(formatCardText('shields')).toContain('data-tip-title="Barrier"');
  expect(formatCardText('Personifying')).toContain('data-tip-title="Personify"');
  expect(formatCardText('1/turn')).toContain('data-tip-title="1/Turn"');
  expect(formatCardText('Drawbridge')).not.toContain('data-tip');
});

it('covers every scope and State tag in the active card catalogue', () => {
  for (const card of Object.values(ALL_CARDS).filter(isSelectableCard)) {
    for (const match of card.text.matchAll(/\[([^\]]+)\]/g)) {
      if (/^\/?(?:blue|green|yellow|red|pink)$|^Cost:/i.test(match[1]!)) continue;
      for (const term of match[1]!.replace(/\s+\d+$/, '').split('/')) {
        expect(formatCardText(term), `${card.name}: ${term}`).toContain('data-tip=');
      }
    }
  }
});

it('marks log lines as well as card text', () => {
  const out = markKeywords('Player 1 special called Kislap.');

  expect(out).toContain('data-tip-title="Special call"');
  expect(out).toContain('>special called</span>');
});

it('every keyword form actually matches the pattern built from it', () => {
  const re = new RegExp(`^(?:${KEYWORD_PATTERN})$`, 'i');
  for (const kw of KEYWORDS) {
    for (const form of kw.forms) {
      expect(re.test(form), `${kw.term} form "${form}"`).toBe(true);
    }
  }
});

it('every keyword form survives the word boundaries around it', () => {
  // The test above anchors the pattern with ^…$, which is not how it is used:
  // `formatCardText` wraps it in \b…\b. A term that begins or ends with
  // anything but a word character — a hyphen, an apostrophe, a digit-free
  // punctuation mark — passes the anchored test and matches nothing real.
  // The States have been renamed once already; this is the check that a
  // future rename cannot quietly break every card that prints the word.
  for (const kw of KEYWORDS) {
    for (const form of kw.forms) {
      const out = formatCardText(`Then ${form} to finish.`);
      expect(out, `${kw.term} form "${form}"`)
        .toContain(`data-tip-title="${kw.term}"`);
    }
  }
});

it('every keyword definition is a real sentence, not a stub', () => {
  for (const kw of KEYWORDS) {
    expect(kw.text.length, kw.term).toBeGreaterThan(40);
    expect(kw.text.trim().endsWith('.'), kw.term).toBe(true);
    // Matching is case-insensitive, so a form may be cased differently from
    // the term it heads — "check" for "Check". What must not happen is a term
    // with no form that reaches it at all.
    const forms = kw.forms.map((f) => f.toLowerCase());
    expect(forms, `${kw.term} lists a form for its own term`)
      .toContain(kw.term.toLowerCase());
  }
});
