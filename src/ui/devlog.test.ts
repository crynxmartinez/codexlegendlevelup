/**
 * The Dev Log is a document, and a document lists everything.
 *
 * This replaced a poster that fit on one screen, which it did by capping every
 * section at twelve and printing "+3 more" past that. A changelog that stops
 * listing things is one you have to go and check somewhere else, which is the
 * one job it has.
 *
 * None of this is visible in a rendered frame under jsdom, which does no
 * layout — but all of it is visible in the source, which is what these read.
 * Same approach as board-layout.test.ts and mobile-layout.test.ts, and for the
 * same reason.
 */
import { describe, it, expect } from 'vitest';
import src from './devlog.ts?raw';
import css from './style.css?raw';
import { VERSIONS } from '../data/patches.js';

/** Every rule body whose selector list matches `test`. */
function bodiesFor(test: (selector: string) => boolean): { sel: string; body: string }[] {
  const out: { sel: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sel = m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (sel && !sel.startsWith('@') && test(sel)) out.push({ sel, body: m[2]! });
  }
  return out;
}

describe('a patch lists every change it made', () => {
  it('truncates nothing', () => {
    // The poster drew `changes.slice(0, SECTION_CAP)` and then counted what it
    // had left out. Both have to be gone: a cap that is only raised is a cap.
    expect(src.includes('SECTION_CAP'), 'the section cap should be gone').toBe(false);
    expect(
      /\.slice\(\s*0\s*,/.test(src),
      'a patch section must not slice its own list',
    ).toBe(false);
    expect(src.includes('more`'), 'nothing should be summarised as "+n more"').toBe(false);
  });

  it('draws a card section even when it is empty', () => {
    // "Nothing was nerfed" is a real statement about a patch, and the
    // commonest question someone opens a changelog to answer. A section that
    // vanishes when empty reads as an oversight rather than as the answer —
    // and every patch shipped so far has had three empty card sections.
    expect(
      src.includes("'None this patch.'"),
      'an empty card section should say so, not disappear',
    ).toBe(true);
    const empty = VERSIONS.flatMap((v) => v.patches)
      .filter((p) => !p.nerfs.length && !p.buffs.length && !p.adjusted.length);
    expect(empty.length, 'this is not a hypothetical case').toBeGreaterThan(0);
  });
});

describe('the page scrolls, because it has to', () => {
  it('gives the document its own scroller', () => {
    // `.devlog.doc` is a fixed-height flex column: head, then body. If the
    // body is not the scroller, a long patch either overflows the panel or
    // scrolls the head out of reach with it.
    const doc = bodiesFor((s) => /(^|,)\s*\.dl-doc\s*$/.test(s));
    expect(doc.length, 'the .dl-doc rule should exist').toBeGreaterThan(0);
    const body = doc.map((r) => r.body).join(';');
    expect(/overflow-y:\s*auto/.test(body), '.dl-doc must scroll').toBe(true);
    expect(/min-height:\s*0/.test(body),
      'a flex child will not shrink below its content without this').toBe(true);
  });

  it('keeps the way out pinned above the scroller', () => {
    // On a patch tall enough to need scrolling, Close must not be at the
    // bottom of it.
    const head = bodiesFor((s) => s.includes('.devlog.doc') && s.includes('.dl-head'));
    expect(head.length, 'the doc head rule should exist').toBeGreaterThan(0);
    expect(
      head.some((r) => /flex:\s*none/.test(r.body)),
      'the head must not scroll away with the document',
    ).toBe(true);
  });
});

describe('a change reads as a row', () => {
  it('shows both the one-line and the many-line form of a note', () => {
    // `notes` was added alongside `note` rather than replacing it, so a change
    // written either way still draws. A row that only read `note` would
    // silently show the first line of a three-line change.
    expect(src.includes('function bullets('), 'the bullets helper should exist').toBe(true);
    expect(
      /c\.notes\s*&&\s*c\.notes\.length\s*\?\s*c\.notes\s*:\s*\[c\.note\]/.test(src),
      'bullets() should prefer `notes` and fall back to `note`',
    ).toBe(true);
  });

  it('collapses the picture column when there is no picture', () => {
    // System changes have nothing to draw, and so does a card whose art is
    // missing. Without this the row keeps a 56px hole where the art would be
    // and the text starts at an indent that matches nothing above it.
    const rule = bodiesFor((s) => /\.dl-entry:not\(:has\(\.dl-ethumb\)\)/.test(s));
    expect(rule.length, 'the no-thumbnail rule should exist').toBeGreaterThan(0);
    expect(
      rule.some((r) => /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(r.body)),
      'a row with no thumbnail should be one column',
    ).toBe(true);
  });
});
