/**
 * The game has to stay playable on a phone held sideways.
 *
 * A landscape phone is around 375px tall, and that is the constraint every
 * regression here broke. None of them are visible in a rendered frame under
 * jsdom, which does no layout — but each has a cause that is visible in the
 * source, which is what these assert. Same approach as board-layout.test.ts,
 * and for the same reason.
 *
 * Every one of these fired for real before it was written:
 *
 *  - `#app` reserved 150px for the duel's fixed HUD strips unconditionally,
 *    so the title screen got a 225px box out of a 375px window and cut off
 *    its own logo and last menu item.
 *  - `.modal` scrolled as a whole, button row included, so Confirm and Skip
 *    sat below the fold on any prompt with more than three cards in it.
 *  - `attachInspect` bound `oncontextmenu` alone, which does not exist on a
 *    touch device, so a card's rules text could not be reached at all.
 *  - The interface told the player to right-click in 22 places while they
 *    held a device with no right-click.
 */
import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
vi.mock('./asset-downloads.js', () => ({ enterAssetDownloadMenu:vi.fn(), leaveAssetDownloadMenu:vi.fn() }));
vi.mock('./menu-transition.js', () => ({ destinationReady:vi.fn(), menuNavigationBusy:()=>false, menuNavigate:(fn:()=>unknown)=>fn() }));
import { mountTitle } from './title-screen.js';
import css from './style.css?raw';
import mobileCss from './mobile-duel.css?raw';
import main from './main.ts?raw';
import polish from './game-polish.css?raw';

describe('mobile match feedback and safe controls', () => {
  it('shows explicit match feedback without default coaching', () => {
    expect(main).toContain('if (this.hint && !this.tutorial && !this.nextBattle)');
    expect(main).toContain('status.textContent = this.hint');
    expect(main).toContain("status.setAttribute('role', 'status')");
    expect(mobileCss).toContain('body #app .mobile-match-status');
  });
  it('provides a 44px state target and notch-aware corner controls', () => {
    expect(mobileCss).toContain('min-height: 44px; bottom: 0; align-items: flex-end');
    expect(mobileCss).toContain('right: max(6px, env(safe-area-inset-right))');
    expect(mobileCss).toContain('left: max(8px, env(safe-area-inset-left))');
  });
  it('removes empty lobby spacers and keeps overflow scrollable', () => {
    expect(polish).toContain('.pvp-status:empty { display:none; }');
    expect(polish).toContain('.pvp-seats:empty { display:none; }');
    expect(polish).toContain('overflow-y:auto;');
  });
});

describe('tutorial-only coaching', () => {
  it('does not invoke legacy walkthroughs or ambient tips during matches', () => {
    expect(main).not.toMatch(/\b(?:phaseTip|checkTips)\s*\(/);
    expect(main).not.toContain('Show tips while I play');
    expect(main).not.toContain('Show them again');
    expect(main).toContain('clearTips();');
  });

  it('preserves dedicated tutorial coaching and observation', () => {
    expect(main).toContain('this.tutorial?.observe');
    expect(main).toContain('!this.tutorialCoachSuppressed && !this.tutorial.step.hidden');
  });
});

describe('landscape touch hand safety', () => {
  it('opens an inspector before committing a touch hand action', () => {
    expect(main).toContain("inputMode() !== 'touch'");
    expect(main).toContain('enabled: playable && !this.busy && !duelDecisionPending()');
    expect(main).toContain('run: () => { void this.onHandClick(uid, this.legalActions()); }');
    expect(main).toContain("play.enabled ? 'Play card' : 'Not playable now'");
    expect(main).toContain('button.disabled = !play.enabled');
    expect(main).toContain("'Back to hand'");
  });

  it('reserves readable hand cards and explicit touch actions', () => {
    expect(mobileCss).toContain('min-width: 62px; margin-left: 0');
    expect(mobileCss).toContain('.inspect-play-actions button { flex: 1; min-height: 44px;');
    expect(mobileCss).toContain('overscroll-behavior-x: contain');
  });

  it('keeps compact HUD labels and the approved blue Visayas map', () => {
    expect(mobileCss).toContain('.side .s-persona > span, body #app .side .s-plays > span { font-size: 0; }');
    expect(css).toContain(".archipelago-visayas { background: #4595ef; mask: url('/ui/philippines-visayas.webp')");
  });
});

/** The one condition that means "a phone", by shape rather than by width. */
const COMPACT_COND = /\(max-width:\s*700px\)\s*,\s*\(max-height:\s*500px\)\s*and\s*\(orientation: landscape\)/;

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

/** The condition on the @media block a selector lives inside. */
function conditionFor(selector: string): string | null {
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    // Walk to this block's closing brace, counting nesting.
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
    }
    if (css.slice(from, i).includes(selector)) return m[1]!.trim();
  }
  return null;
}

/** The source of a top-level function, by name, up to its closing brace. */
function functionSource(name: string): string {
  const start = main.indexOf(`function ${name}(`);
  expect(start, `${name}() should exist in main.ts`).toBeGreaterThan(-1);
  let depth = 0;
  let i = main.indexOf('{', start);
  const from = i;
  for (; i < main.length; i++) {
    if (main[i] === '{') depth++;
    else if (main[i] === '}' && --depth === 0) return main.slice(from, i + 1);
  }
  throw new Error(`could not find the end of ${name}()`);
}

describe('the duel HUD does not charge every other screen for its space', () => {
  it('reserves strip space only when a duel is on screen', () => {
    // `.board-wrap` is the duel's root. An unscoped `#app` padding rule costs
    // the title screen, the deck editor, the Dev Log and every setup screen
    // 150px of a 375px window for two strips that are not there.
    const padded = bodiesFor((s) => /(^|,)\s*#app\s*$/.test(s))
      .filter((r) => /(^|[\s;])padding\s*:/.test(r.body));
    expect(
      padded.map((r) => r.body.trim()),
      'a bare `#app` rule sets padding; scope it to `#app:has(> .board-wrap)`',
    ).toEqual([]);
  });

  it('still reserves that space during a duel', () => {
    const scoped = bodiesFor((s) => s.includes('#app:has(> .board-wrap)'));
    expect(scoped.length, 'the duel-scoped padding rule should exist').toBeGreaterThan(0);
    expect(scoped.some((r) => /padding\s*:/.test(r.body))).toBe(true);
  });
});

describe('a prompt never hides its own buttons', () => {
  it('the modal box does not scroll as a whole', () => {
    // If the modal scrolls, the button row scrolls with it and a short screen
    // puts the answer to the prompt out of sight.
    for (const r of bodiesFor((s) => /(^|,)\s*\.modal\s*$/.test(s))) {
      expect(
        /overflow(-y)?\s*:\s*(auto|scroll)/.test(r.body),
        `.modal scrolls as a whole:\n${r.body.trim()}`,
      ).toBe(false);
    }
  });

  it('the modal is a column whose body takes the slack', () => {
    const modal = bodiesFor((s) => /(^|,)\s*\.modal\s*$/.test(s));
    expect(modal.length, 'the .modal rule should exist').toBeGreaterThan(0);
    const all = modal.map((r) => r.body).join(';');
    expect(/flex-direction\s*:\s*column/.test(all), '.modal must be a column').toBe(true);

    // The head, sub-line and button row keep their size; something else grows.
    const pinned = bodiesFor((s) => s.includes('.modal > .row'));
    expect(pinned.length, 'the button row should be pinned').toBeGreaterThan(0);
    expect(pinned.some((r) => /flex\s*:\s*none/.test(r.body))).toBe(true);
  });

  it('the setup screens pin their action too', () => {
    // `pickScreen` is Choose your Persona and Choose your starting Codex.
    expect(main.includes("classList.add('pick-screen')"),
      'pickScreen should mark itself so the stylesheet can pin its button').toBe(true);
    const row = bodiesFor((s) => s.includes('.screen.pick-screen > .pick-row'));
    expect(row.length, 'the scrolling row rule should exist').toBeGreaterThan(0);
    expect(row.some((r) => /overflow-y\s*:\s*auto/.test(r.body))).toBe(true);
  });
});

describe('a card can be read without a mouse', () => {
  it('inspect is reachable by a touch gesture, not only by right-click', () => {
    const src = functionSource('attachInspect');
    expect(src.includes('oncontextmenu'), 'right-click should still work').toBe(true);
    // Not `src.includes('pointerdown')`: this function's own comment mentions
    // `onpointerdown`, so a bare substring check passes on prose. Verified by
    // swapping the registration to 'mousedown' — the loose form did not notice.
    expect(
      /addEventListener\(\s*'pointerdown'/.test(src),
      'attachInspect binds contextmenu only — there is no right-click on a phone',
    ).toBe(true);
  });

  it('the press cancels on a drag, so scrolling a list does not open cards', () => {
    const src = functionSource('attachInspect');
    expect(/addEventListener\(\s*'pointermove'/.test(src)).toBe(true);
    expect(/addEventListener\(\s*'pointercancel'/.test(src)).toBe(true);
  });

  it('a long press does not also play the card it opened', () => {
    // Lifting a finger after a press still produces a click, and on a hand
    // card that click plays it. Reading a card must not play it.
    expect(main.includes('armClickSwallow'),
      'the click that follows a long press has to be swallowed').toBe(true);
  });

  it('tells the player which gesture their device has', () => {
    expect(main.includes('const readVerb'), 'readVerb() should exist').toBe(true);
    // Exactly one literal may survive: the one inside readVerb(). All three
    // quote forms count — the first version of this checked only for a single
    // quote and missed a template literal put back by hand.
    const literals = main.match(/['"`]Right-click/g) ?? [];
    expect(
      literals.length,
      'a hard-coded "Right-click" in a user-facing string is wrong on a phone; '
      + 'use readVerb()',
    ).toBe(1);
  });
});

describe('a phone is decided by shape, not by width', () => {
  /**
   * The bug this replaced: a landscape phone is WIDE and short — 844, 915 and
   * 932 across are all common — so every width-only breakpoint caught the
   * iPhone SE at 667 and no other phone in landscape, and they got the desktop
   * layout inside a 400px-tall window.
   */
  const COMPACT = /\(max-width:\s*700px\)\s*,\s*\(max-height:\s*500px\)\s*and\s*\(orientation:\s*landscape\)/;

  it('gates the phone HUD layout on the compact condition', () => {
    const cond = conditionFor('--- HUDs become full-width strips ---');
    expect(cond, 'the phone HUD block should still exist').toBeTruthy();
    expect(COMPACT.test(cond!), `phone HUD block is gated on: ${cond}`).toBe(true);
  });

  it('does not stack the card inspector on a landscape phone', () => {
    // The inspector is a picture beside a panel, and it stacks into one column
    // on a narrow window. That was gated on width alone, so a 748x410 window
    // took the branch -- and there it is exactly backwards. The card went on
    // top at 300px wide, which is 420px tall in a 354px box, and the name, the
    // stats and the rules text landed entirely below the fold. It scrolls, so
    // it was reachable, but a card that fills the window gives no sign there
    // is anything under it: what the player saw was a cropped picture.
    const cond = conditionFor('.inspect { flex-direction: column;');
    expect(cond, 'the stacking rule should still exist').toBeTruthy();
    expect(
      /min-height/.test(cond!),
      `the inspector stacks on width alone, so a landscape phone gets it: ${cond}`,
    ).toBe(true);
  });

  it('gives the inspector a real height on a short screen', () => {
    // `.inspect` otherwise carries only a max-height, and a percentage height
    // on the picture inside resolves against nothing -- so the 5:7 ratio drove
    // the height instead and a 300px-wide card came out 420px tall.
    const box = bodiesFor((s) => /(^|,)\s*\.inspect\s*$/.test(s))
      .some((r) => /(^|[\s;])height\s*:\s*100%/.test(r.body));
    expect(box, '.inspect needs a definite height for `.art { height: 100% }`').toBe(true);
  });

  it('gates the one-panel deck builder on the compact condition', () => {
    const cond = conditionFor('.panel-tabs { display: flex; }');
    expect(cond, 'the single-column builder block should still exist').toBeTruthy();
    expect(COMPACT.test(cond!), `builder block is gated on: ${cond}`).toBe(true);
  });
});

describe('the board keeps the board', () => {
  it('takes the phase and priority tabs off a short screen', () => {
    // Both repeat what the HUD chip says, and they said it on top of the mats.
    const hidden = bodiesFor((s) => /\.phase-tab/.test(s) && /\.priority-light/.test(s))
      .some((r) => /display\s*:\s*none/.test(r.body));
    expect(hidden, 'phase/priority tabs should be hidden in short landscape').toBe(true);
  });

  it('lays the rail along the top strip instead of down the mats', () => {
    // Vertically it ran through the one column both mats keep their deck,
    // exile and barrier counts in.
    const rail = bodiesFor((s) => /(^|,)\s*\.rail\s*$/.test(s))
      .some((r) => /flex-direction\s*:\s*row/.test(r.body));
    expect(rail, '.rail should become a row in short landscape').toBe(true);
  });

  it('reserves the top strip but not a bottom one', () => {
    // The player's cluster shares the hand row, which exists anyway; the
    // opponent's needs its own. Reserving both cost the mats 150px.
    const scoped = bodiesFor((s) => s.includes('#app:has(> .board-wrap)'))
      .map((r) => r.body.trim());
    expect(scoped.length, 'the duel padding rules should exist').toBeGreaterThan(1);
    expect(
      scoped.some((b) => /padding:\s*34px\s+0\s+0/.test(b)),
      'short landscape should reserve only a top strip',
    ).toBe(true);
  });
});

describe('touch targets', () => {
  it('are at least 44px on a coarse pointer', () => {
    // Apple asks for 44pt, Material for 48dp. The rule has to exist and has to
    // be inside a coarse-pointer query, or it would also pad out mouse UIs.
    // Find the shared controls themselves: unrelated coarse-pointer rules
    // (such as inline keyword emblems) may appear earlier in the stylesheet.
    const targets = ['button', '.btn-link', '.ka-item', '.turn-btn', '.rail-btn', '.dl-patch', '.dl-vhead'];
    const controls = bodiesFor(sel => targets.every(target => sel.split(',').map(part => part.trim()).includes(target)));
    const coarse = controls.filter(({ sel }) => /\(pointer:\s*coarse\)/.test(conditionFor(sel) ?? ''));
    expect(coarse.length, 'shared controls should have a (pointer: coarse) rule').toBeGreaterThan(0);
    expect(coarse.some(({ body }) => /min-height:\s*44px/.test(body)),
      'controls need a 44px floor on touch').toBe(true);
  });
});

describe('the current mobile flank plates', () => {
  const rule = (selector: string) => mobileCss.slice(mobileCss.indexOf(selector)).split('}')[0] ?? '';

  it('keeps names visible beside the pile counts', () => {
    expect(rule('body #app .mat-side .zlabel {')).toMatch(/display:\s*block/);
  });

  it('shows life in the corner HUD while retaining the mat animation anchor', () => {
    const parsed = ts.createSourceFile('main.ts', main, ts.ScriptTarget.Latest, true);
    const fn = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'placeBarrierIndicators') as ts.FunctionDeclaration;
    expect(fn).toBeDefined();
    const executable = ts.transpileModule(fn.getText(parsed), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    for (const compact of [false,true]) for (const anime of [false,true]) {
      const barrier = {parentElement:null}, header = {appendChild:vi.fn()}, mat = {querySelector:()=>barrier,appendChild:vi.fn()};
      const doc = {body:{classList:{contains:()=>anime}},querySelector:(selector:string)=>selector.startsWith('.mat')?mat:{querySelector:()=>header}};
      new Function('document','compactLayout',`${executable};placeBarrierIndicators();`)(doc,()=>compact);
      expect(header.appendChild).toHaveBeenCalledTimes(compact&&!anime?2:0);
      expect(mat.appendChild).toHaveBeenCalledTimes(compact&&!anime?0:2);
    }
    expect(rule('body #app .side .z-barrier {')).toMatch(/position:\s*static/);
    expect(rule('body #app .side .z-barrier {')).toMatch(/grid-row:\s*3/);
  });

  it('reserves board space for the corner HUD and action rail', () => {
    const board = rule('body #app > .board-wrap {');
    expect(board).toContain('--mobile-top');
    expect(board).toContain('--mobile-bottom');
    expect(board).toContain('--mobile-rail');
  });

  it('keeps both flank columns at the same explicit width', () => {
    expect(rule('body #app .mat-side {')).toMatch(/width:\s*57px/);
    expect(rule('body #app .mat-side {')).toMatch(/min-width:\s*57px/);
  });
});
describe('the title screen', () => {
  it('does not dim the quiet menu entries with opacity', () => {
    // Every entry runs `kaItemIn` with `animation-fill-mode: both`, and an
    // animation's final keyframe -- `to { opacity: 1 }` -- beats any static
    // declaration in the cascade. So `.ka-quiet { opacity: .72 }` never once
    // applied, and the five entries rendered as five identical slabs with
    // Start no more prominent than Go back to site.
    const anim = /@keyframes kaItemIn\s*\{[^}]*\}[^}]*\}/.exec(css)?.[0] ?? '';
    expect(/opacity:\s*1/.test(anim), 'kaItemIn should still end at opacity 1').toBe(true);

    const quiet = bodiesFor((s) => /(^|,)\s*\.ka-quiet\s*$/.test(s));
    expect(quiet.length, 'the .ka-quiet rule should exist').toBeGreaterThan(0);
    for (const r of quiet) {
      expect(
        /(^|[\s;])opacity\s*:/.test(r.body),
        `.ka-quiet dims with opacity, which the entry animation overrides:\n${r.body.trim()}`,
      ).toBe(false);
    }
    expect(
      quiet.some((r) => /(^|[\s;])color\s*:/.test(r.body)),
      '.ka-quiet has to be set apart by something the animation does not touch',
    ).toBe(true);
  });

  function currentTitle(activeDeck: import('./title-screen.js').ActiveDeckContext | null = null) {
    const frame={title:'',src:'',className:'',style:{cssText:''},isConnected:true,contentWindow:{postMessage:vi.fn()}};
    let receive:(event:unknown)=>void=()=>{};
    vi.stubGlobal('document',{createElement:()=>frame});
    vi.stubGlobal('location',{origin:'http://localhost'});
    vi.stubGlobal('window',{addEventListener:(_key:string,fn:typeof receive)=>{receive=fn;},removeEventListener:vi.fn()});
    vi.stubGlobal('MutationObserver',class { observe(){}disconnect(){} });
    mountTitle({replaceChildren:vi.fn()} as unknown as HTMLElement,{activeDeck,choose:vi.fn()});
    receive({origin:'http://localhost',source:frame.contentWindow,data:{type:'codex-menu-ready'}});
    return frame;
  }
  it('gives the current menu the full dynamic viewport without duel HUD reservations', () => {
    try {
      const frame=currentTitle();
      expect(frame.src).toBe('/ui/menu-v1/index.html');
      expect(frame.style.cssText).toContain('position:fixed;inset:0;width:100%;height:100dvh');
      expect(frame.title).toBe('Codex Legend main menu');
    } finally {vi.unstubAllGlobals();}
  });
  it('supplies actual deck metadata and preserves an absent selection without a fabricated region', () => {
    try {
      for(const activeDeck of [{name:'Agta Set 1',region:'Luzon',persona:{id:'taguwasi',name:'Taguwasi',art:'/cards/taguwasi.webp'}},{name:'Custom 12',region:'Visayas',persona:null},null]) {
        const frame=currentTitle(activeDeck);
        expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'codex-menu-context',activeDeck}),'http://localhost');
      }
    } finally {vi.unstubAllGlobals();}
  });
});

describe('the deck editor shows the deck', () => {
  it('does not size decklist cards from rows that can collapse', () => {
    // The decklist is fifty cards in five fixed `1fr` rows so a full deck is
    // one picture rather than a scroll. That needs the rows to have height to
    // divide, and it has no floor. Measured at 748x410: the panel body came to
    // 74px, the grid took 31 of it, each row resolved to about 3px, and
    // `aspect-ratio` derived the width from that -- all fifty cards rendered
    // at 2x3px. Present, laid out, addressable and invisible.
    const desktop = bodiesFor((s) => /\.panel-deck .bpanel-body \.deck-grid$/.test(s));
    expect(desktop.length, 'the fixed-row rule should still exist').toBeGreaterThan(0);
    expect(desktop.some((r) => /grid-template-rows:\s*repeat\(5/.test(r.body)),
      'the desktop decklist should still be five fixed rows').toBe(true);

    const cond = conditionFor('.panel-deck .bpanel-body .deck-grid .dcard {');
    expect(cond, 'a compact override for the decklist card should exist').toBeTruthy();
    expect(COMPACT_COND.test(cond!), `decklist override is gated on: ${cond}`).toBe(true);

    const compact = bodiesFor((s) => /\.panel-deck .bpanel-body \.deck-grid \.dcard$/.test(s))
      .map((r) => r.body).join(';');
    expect(/height:\s*auto/.test(compact),
      'a compact decklist card must take its height from the ratio, not the row').toBe(true);
    expect(/width:\s*100%/.test(compact),
      'and its width from the column it sits in').toBe(true);
  });

  it('gives the builder panels the one flexible row', () => {
    // `.builder-screen` is `auto auto minmax(0, 1fr)` for the bar, an optional
    // problems strip and the panels. The strip is only built when the deck has
    // problems, so on a valid deck the panels auto-placed into the second
    // `auto` row and sized to their own content while the flexible row sat
    // empty under them -- 43px of a 410px window given to nothing.
    //
    // Not `-1` either: a negative line index counts explicit grid LINES, so
    // `-1` is the line that ends the last row, and the panels landed in a
    // fourth implicit row with the third still empty.
    const cols = bodiesFor((s) => /(^|,)\s*\.builder-cols\s*$/.test(s));
    expect(cols.length, 'the .builder-cols rule should exist').toBeGreaterThan(0);
    const body = cols.map((r) => r.body).join(';');
    expect(/grid-row:\s*3\b/.test(body),
      '.builder-cols must claim row 3, the only flexible track').toBe(true);
  });
});
