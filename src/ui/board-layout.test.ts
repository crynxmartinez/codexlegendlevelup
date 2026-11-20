/**
 * The board must not resize itself while a duel is running.
 *
 * This is a source-level guard rather than a rendering one because the thing
 * that went wrong is not visible in a rendered frame — it is visible in a
 * number, and only if you happen to measure at the right moment. What
 * happened: the Defense band grew from 26px to 96px to hold blockers. It sits
 * in `.mats`, a fixed-height flex column, as the one `flex: none` child among
 * `flex: 1` siblings — so all seventy of those pixels came off the two mats,
 * 35px each. `.mat` is `container-type: size`, so every card sized in `cqh`
 * shrank with it, and the mat's bottom grid row (exile / barrier / grave) is
 * `auto`, cannot shrink, and so rendered outside the mat's own border.
 *
 * jsdom does no layout, so none of that can be caught by rendering the board
 * here. What can be caught is the cause: a dimension on the band that depends
 * on the band's state.
 */
import { describe, it, expect } from 'vitest';
// `?raw` rather than node:fs: this project has no @types/node and pins
// `types` to vite/client, so the bundler's own text import is both the typed
// route and the one that keeps working if these files ever move.
import baseCss from './style.css?raw';
import mobileCss from './mobile-duel.css?raw';
const css = baseCss + '\n' + mobileCss;
import main from './main.ts?raw';
import panels from './duel-panel.ts?raw';

/** Every rule body whose selector list matches `test`. */
function bodiesFor(test: (selector: string) => boolean): string[] {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const selector = m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (selector && !selector.startsWith('@') && test(selector)) out.push(m[2]!);
  }
  return out;
}

const SIZING = /(^|[\s;])(min-height|max-height|height|min-width|max-width|width)\s*:/;

describe('the Defense band has no state-dependent size', () => {
  it('never sets a dimension on .live — that is what shrank both mats', () => {
    const bodies = bodiesFor((s) => /\.defense-zone[^,]*\.live|\.live[^,]*\.defense-zone/.test(s));
    expect(bodies.length, 'the .live rules should still exist').toBeGreaterThan(0);
    for (const body of bodies) {
      expect(SIZING.test(body), `.live rule sets a dimension:\n${body.trim()}`).toBe(false);
    }
  });

  it('never sets a dimension on .scored either', () => {
    for (const body of bodiesFor((s) => /\.defense-zone[^,]*\.scored/.test(s))) {
      expect(SIZING.test(body), `.scored rule sets a dimension:\n${body.trim()}`).toBe(false);
    }
  });

  it('does not animate a dimension', () => {
    // A transition on min-height is what made the shove a visible lurch
    // rather than an instant reflow, and it is also the tell that a dimension
    // was expected to change at all.
    for (const body of bodiesFor((s) => /(^|,)\s*\.defense-zone\s*$/.test(s))) {
      const t = /transition\s*:([^;]*)/.exec(body);
      if (!t) continue;
      expect(
        /height|width|padding|margin|all/.test(t[1]!),
        `.defense-zone animates a dimension: transition:${t[1]}`,
      ).toBe(false);
    }
  });

  it('is not given an inline height by the renderer', () => {
    // renderDefenseZone used to set zone.style.minHeight = '96px', which beat
    // the stylesheet and put the growth back however the CSS was written.
    // Anchored to the definition, not the first mention — the call site sits
    // earlier in the file than the method it calls.
    const start = main.indexOf('renderDefenseZone(): HTMLElement');
    expect(start, 'renderDefenseZone should still exist').toBeGreaterThan(-1);
    const end = main.indexOf('renderFoeHand(): HTMLElement', start);
    const near = main.slice(start, end > start ? end : start + 4000);
    expect(near).not.toMatch(/style\.(min)?[Hh]eight\s*=/);
  });

  it('keeps the blockers out of flow', () => {
    // The cards live in .dz-row, absolutely positioned, so that any number of
    // them costs the band — and therefore both mats — nothing.
    const rows = bodiesFor((s) => /(^|,)\s*\.dz-row\s*$/.test(s));
    expect(rows.length, '.dz-row should be styled').toBeGreaterThan(0);
    expect(rows.join('\n')).toMatch(/position\s*:\s*absolute/);
    expect(main).toMatch(/el\('div', 'dz-row'\)/);
  });
});

describe('.mats declares overflow once', () => {
  it('does not contradict itself across two blocks', () => {
    // It was declared twice with the same selector and opposite values, the
    // later `hidden` beating the earlier `visible` whose own comment explains
    // that hidden flattens the 3D context the board tilt depends on.
    const overflows = bodiesFor((s) => /(^|,)\s*\.mats\s*$/.test(s))
      .flatMap((b) => [...b.matchAll(/(?:^|[\s;])overflow\s*:\s*([^;]+)/g)].map((m) => m[1]!.trim()));
    expect(new Set(overflows).size, `conflicting overflow values: ${overflows.join(', ')}`)
      .toBeLessThanOrEqual(1);
  });
});

describe('selecting cards never resizes the battlefield', () => {
  it('does not make the battlefield scroll when a field target receives focus', () => {
    const mats = bodiesFor(s => /(^|,)\s*\.mats\s*$/.test(s));
    expect(mats.join('\n')).toMatch(/overflow\s*:\s*clip/);
    expect(mats.join('\n')).not.toMatch(/overflow\s*:\s*(hidden|auto|scroll)/);
  });
  it('does not reserve or release board space when a decision panel opens', () => {
    expect(panels).not.toContain('--decision-space');
    expect(css).not.toContain('--decision-space');
    for (const body of bodiesFor(s => s.includes('board-decision-active') && /#app|\.board-wrap|\.hand-bar|\.side/.test(s))) {
      expect(body).not.toMatch(/(?:height|width|padding|margin|display|grid-template)\s*:/);
    }
  });
});
