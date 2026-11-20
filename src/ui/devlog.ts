/**
 * The Dev Log: what changed, and when.
 *
 * Two views, and they are deliberately different kinds of thing. The list of
 * sets, each collapsing to its patches, is navigation — a centred panel, the
 * right shape for a menu. A patch itself is a document, laid out the way Dota
 * lays out a gameplay update: one column on a dark page, section bars you can
 * find by scanning, and under each bar a row per thing that changed — its
 * picture, its name, and the changes as bullets.
 *
 * The document replaced a poster that fit on one screen. That poster had a
 * cap on every section, because a patch nerfing fifteen cards would otherwise
 * spill out of it, and a changelog that stops listing things at twelve is a
 * changelog you cannot trust. A page that scrolls has no such limit, so the
 * cap is gone and every change is drawn.
 *
 * Riot uses circular champion portraits and Valve uses a landscape crop of a
 * hero. Neither is available here: every image this game has is a whole card,
 * frame and title and stats included, and a circle cropped out of one is a
 * piece of gold border. So the unit in a row is the card, drawn as a card.
 */
import { ALL_CARDS, type CardRecord } from '../data/loader.js';
import {
  VERSIONS, patchCounts,
  type CardChange, type Patch, type Region, type SetVersion, type SystemChange,
} from '../data/patches.js';
import { artUrl } from './assets.js';
import './utility-presentation.css';

/**
 * How a card in here is made readable: the same gesture as everywhere else in
 * the game — right-click on a mouse, long-press on a touch screen.
 *
 * Injected rather than imported. The reader lives in main.ts, and main.ts
 * imports this module to open the log, so importing it back would draw a cycle
 * between two of the largest files in the project. A parameter keeps the
 * dependency pointing one way.
 */
export type CardReader = (node: HTMLElement, rec: CardRecord) => void;

export interface DevLogDeps {
  makeReadable: CardReader;
  /** The gesture, named in the terms this device actually offers. */
  readVerb: () => string;
}

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/**
 * A change as the lines it should be drawn as.
 *
 * `notes` when it is there, `note` when it is not. Written once here rather
 * than at each call site so the two forms cannot drift apart.
 */
function bullets(c: { note: string; notes?: string[] }): string[] {
  return c.notes && c.notes.length ? c.notes : [c.note];
}

/**
 * Open the Dev Log over whatever is on screen.
 *
 * An overlay rather than a `screen()`, so the title screen behind it is never
 * torn down and rebuilt — its key art costs five images to reassemble, and
 * closing the log should not make the menu flicker.
 *
 * Resolves when the player closes it.
 */
export function openDevLog({ makeReadable, readVerb }: DevLogDeps): Promise<void> {
  return new Promise((resolve) => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bg = el('div', 'devlog-bg');
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Patch notes');
    // Which set is expanded. The newest opens by default, because the newest
    // patch is what someone opening a changelog came to read.
    let openVersion: number | null = VERSIONS[0]?.version ?? null;

    const close = (): void => {
      document.removeEventListener('keydown', onKey);
      bg.remove();
      if (previous?.isConnected) previous.focus();
      resolve();
    };

    const onKey = (e: KeyboardEvent): void => {
      if (document.querySelector('.inspect-bg')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const items = Array.from(bg.querySelectorAll<HTMLElement>('button,select,[tabindex="0"]')).filter(n => n.getClientRects().length);
        const at = items.indexOf(document.activeElement as HTMLElement);
        if (at < 0 || (e.shiftKey ? at === 0 : at === items.length - 1)) { e.preventDefault(); items[e.shiftKey ? items.length - 1 : 0]?.focus(); }
      }
    };

    /** The list of sets and their patches. */
    const renderList = (): void => {
      bg.innerHTML = '';
      const panel = el('div', 'devlog');

      const head = el('div', 'dl-head');
      head.appendChild(el('h2', 'dl-title', 'Patch notes'));
      head.appendChild(closeBtn(close));
      panel.appendChild(head);

      const list = el('div', 'dl-list');
      for (const set of VERSIONS) {
        list.appendChild(versionBlock(
          set,
          openVersion === set.version,
          () => {
            // Clicking the open one closes it, so the list can be collapsed.
            openVersion = openVersion === set.version ? null : set.version;
            renderList();
          },
          (p) => renderDoc(set, p),
        ));
      }
      panel.appendChild(list);
      bg.appendChild(panel);
    };

    /** One patch, as a page you read down. */
    const renderDoc = (set: SetVersion, p: Patch): void => {
      bg.innerHTML = '';
      const panel = el('div', 'devlog doc');

      // Head first and outside the scroller, so Back and Close stay put while
      // the document moves under them. On a long patch the only way out
      // should never be at the bottom of it.
      const head = el('div', 'dl-head');
      const back = el('button', 'dl-back', 'All patches');
      // Back to the list with this set still open. Returning someone to a
      // collapsed list makes them re-find where they already were.
      back.onclick = () => { openVersion = set.version; renderList(); };
      head.appendChild(back);
      head.appendChild(el('h2', 'dl-title', 'Patch notes'));
      head.appendChild(closeBtn(close));
      panel.appendChild(head);

      const scroll = el('div', 'dl-doc');
      const col = el('div', 'dl-col');

      col.appendChild(masthead(set, p, (next) => renderDoc(set, next)));
      if (p.summary) col.appendChild(el('p', 'dl-summary', p.summary));

      // Right-click is not a discoverable gesture, so the page says so — once,
      // and only on a patch that actually draws a card to use it on.
      const hasArt = p.nerfs.length + p.buffs.length + p.adjusted.length
        + p.newCards.length > 0;
      if (hasArt) {
        col.appendChild(el(
          'p', 'dl-readhint', `${readVerb()} a card to read it full size.`,
        ));
      }

      // Systems first, as Dota leads with General Updates: it is the part of a
      // patch that changes how the game is played rather than what a single
      // card costs, and it is what most of this game's patches have been.
      if (p.systems.length) {
        col.appendChild(systemSection(p.systems));
      }

      // The three card sections are drawn even when empty. "Nothing was
      // nerfed" is a real statement about a patch and the commonest question
      // someone opens a changelog to answer; a section that vanishes when
      // empty reads as an oversight rather than as the answer.
      col.appendChild(cardSection('Nerfs', 'nerf', p.nerfs, makeReadable));
      col.appendChild(cardSection('Buffs', 'buff', p.buffs, makeReadable));
      col.appendChild(cardSection('Adjusted', 'adj', p.adjusted, makeReadable));

      if (p.newCards.length) col.appendChild(newSection(p.newCards, makeReadable));

      scroll.appendChild(col);
      const body = el('div', 'dl-reader');
      const nav = el('nav', 'dl-reader-nav');
      nav.setAttribute('aria-label', 'Patch versions');
      for (const version of VERSIONS) {
        nav.appendChild(el('h3', undefined, `Version ${version.version}`));
        for (const patch of version.patches) {
          const item = el('button', 'dl-reader-choice', patch.id);
          item.title = patch.title;
          if (patch.id === p.id && version.version === set.version) item.setAttribute('aria-current', 'page');
          item.onclick = () => { renderDoc(version, patch); bg.querySelector<HTMLElement>('[aria-current="page"]')?.focus(); };
          nav.appendChild(item);
        }
      }
      body.append(nav, scroll);
      panel.appendChild(body);
      const foot = el('footer', 'dl-reader-footer');
      const current = set.patches.indexOf(p);
      for (const [label, offset] of [['Previous', -1], ['Next', 1]] as const) {
        const step = el('button', undefined, label) as HTMLButtonElement;
        const next = set.patches[current + offset];
        step.disabled = !next;
        step.onclick = () => { if (next) { renderDoc(set, next); bg.querySelector<HTMLElement>('[aria-current="page"]')?.focus(); } };
        foot.appendChild(step);
      }
      panel.appendChild(foot);
      bg.appendChild(panel);
      // A patch opened from the list starts at its own top, not wherever the
      // last one was left.
      scroll.scrollTop = 0;
    };

    renderList();
    // Clicking the backdrop closes; clicking the panel itself must not.
    bg.onclick = (e) => { if (e.target === bg) close(); };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    bg.querySelector<HTMLButtonElement>('button')?.focus();
  });
}

function closeBtn(close: () => void): HTMLElement {
  const x = el('button', 'dl-close', '×');
  x.title = 'Close';
  x.setAttribute('aria-label', 'Close patch notes');
  x.onclick = close;
  return x;
}

/**
 * The head of the document: the number, what the patch is called, and a way
 * to reach the others without going back to the list.
 *
 * The country sits behind it rather than behind the whole page. As a wash
 * under a scrolling column it would either move with the text, which looks
 * broken, or stay fixed while paragraphs slide over it, which is worse. Under
 * the masthead it behaves like the banner image it always wanted to be.
 */
function masthead(
  set: SetVersion,
  p: Patch,
  go: (next: Patch) => void,
): HTMLElement {
  const mast = el('header', 'dl-mast');

  // All three archipelagos are always drawn, because the shape only reads as
  // the Philippines when it is whole — a lone island is a blob. The ones the
  // patch touched come up to full strength in their own colour (Luzon gold,
  // the Visayas green, Mindanao red, as the art already ships), and the rest
  // stay as a faint outline.
  const touched = new Set<Region>(p.regions ?? []);
  const wm = el('div', 'dl-marks');
  for (const r of ['luzon', 'visayas', 'mindanao'] as const) {
    const m = el('img', `dl-mark ${r}${touched.has(r) ? ' on' : ''}`) as HTMLImageElement;
    m.src = `/ui/philippines-${r}.webp`;
    m.alt = '';
    m.setAttribute('aria-hidden', 'true');
    m.decoding = 'async';
    wm.appendChild(m);
  }
  mast.appendChild(wm);

  const left = el('div', 'dl-mtext');
  left.appendChild(el('p', 'dl-kicker', p.date ? 'Patch' : 'Set launch'));
  left.appendChild(el('div', 'dl-ver', p.id));
  left.appendChild(el('h3', 'dl-dtitle', p.title));
  left.appendChild(el(
    'p', 'dl-dmeta',
    `Version ${set.version} — ${set.name}${p.date ? ' · ' + p.date : ''}`,
  ));
  mast.appendChild(left);

  // Only when there is somewhere to go. A set with one patch gets a picker
  // that can only choose what is already on screen.
  if (set.patches.length > 1) {
    const pick = el('div', 'dl-picker');
    pick.appendChild(el('label', 'dl-plabel', 'Patch'));
    const sel = el('select', 'dl-psel') as HTMLSelectElement;
    for (const other of set.patches) {
      const opt = el('option', undefined, other.id) as HTMLOptionElement;
      opt.value = other.id;
      if (other.id === p.id) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.onchange = () => {
      const next = set.patches.find((q) => q.id === sel.value);
      if (next && next.id !== p.id) go(next);
    };
    pick.appendChild(sel);
    mast.appendChild(pick);
  }

  return mast;
}

/**
 * A section bar: the thing you scan for.
 *
 * Left-anchored colour fading out to the right, which is the one device that
 * makes a page of patch notes readable at a glance — you find the section by
 * its stripe before you have read a word of it. The colour is the section's
 * own, so nerfs and buffs are told apart by the bar and not only by the text.
 */
function bar(name: string, kind: string, count?: number): HTMLElement {
  const b = el('div', `dl-bar ${kind}`);
  b.appendChild(el('span', undefined, name));
  if (count !== undefined && count > 0) {
    b.appendChild(el('span', 'dl-count', String(count)));
  }
  return b;
}

/** A row: a picture, a name, and what changed about it. */
function entry(
  name: string,
  lines: string[],
  opts: { thumb?: HTMLElement | null; delta?: string; kind?: string } = {},
): HTMLElement {
  const row = el('div', `dl-entry${opts.kind ? ' ' + opts.kind : ''}`);
  if (opts.thumb) row.appendChild(opts.thumb);
  const body = el('div', 'dl-ebody');

  const head = el('div', 'dl-ehead');
  head.appendChild(el('span', 'dl-ename', name));
  if (opts.delta) head.appendChild(el('span', `dl-delta ${opts.kind ?? ''}`, opts.delta));
  body.appendChild(head);

  const ul = el('ul', 'dl-bullets');
  for (const line of lines) ul.appendChild(el('li', undefined, line));
  body.appendChild(ul);

  row.appendChild(body);
  return row;
}

function systemSection(systems: SystemChange[]): HTMLElement {
  const sec = el('section', 'dl-sec');
  sec.appendChild(bar('System updates', 'sys', systems.length));
  const list = el('div', 'dl-entries');
  for (const s of systems) {
    list.appendChild(entry(s.title, bullets(s), { kind: 'sys' }));
  }
  sec.appendChild(list);
  return sec;
}

function cardSection(
  name: string,
  kind: string,
  changes: CardChange[],
  makeReadable: CardReader,
): HTMLElement {
  const sec = el('section', 'dl-sec');
  sec.appendChild(bar(name, kind, changes.length));
  if (!changes.length) {
    sec.appendChild(el('p', 'dl-none', 'None this patch.'));
    return sec;
  }
  const list = el('div', 'dl-entries');
  for (const c of changes) {
    const rec = ALL_CARDS[c.id];
    // A patch note naming a card the set does not have should be caught by
    // patches.test.ts, which checks every id. This is the belt to that pair of
    // braces: the change is still listed, just without a picture.
    list.appendChild(entry(rec ? rec.name : c.id, bullets(c), {
      thumb: cardThumb(c.id, makeReadable),
      delta: c.delta,
      kind,
    }));
  }
  sec.appendChild(list);
  return sec;
}

function newSection(ids: string[], makeReadable: CardReader): HTMLElement {
  const sec = el('section', 'dl-sec');
  sec.appendChild(bar('New cards', 'new', ids.length));
  const grid = el('div', 'dl-newgrid');
  for (const id of ids) {
    const art = cardArt(id, makeReadable);
    if (art) grid.appendChild(art);
  }
  sec.appendChild(grid);
  return sec;
}

function versionBlock(
  set: SetVersion,
  open: boolean,
  toggle: () => void,
  openPatch: (p: Patch) => void,
): HTMLElement {
  const box = el('div', `dl-version${open ? ' open' : ''}`);

  const head = el('button', 'dl-vhead');
  head.onclick = toggle;
  head.appendChild(el('span', 'dl-caret', open ? '▾' : '▸'));
  head.appendChild(el('span', 'dl-vname', `Codex Legends V.${set.version}`));
  head.appendChild(el('span', 'dl-vsub', set.name));
  head.appendChild(el(
    'span', 'dl-vcount',
    `${set.patches.length} patch${set.patches.length === 1 ? '' : 'es'}`,
  ));
  box.appendChild(head);

  if (open) {
    const rows = el('div', 'dl-patches');
    for (const p of set.patches) {
      const row = el('button', 'dl-patch');
      row.onclick = () => openPatch(p);
      row.appendChild(el('span', 'dl-pid', p.id));
      const mid = el('span', 'dl-pmid');
      mid.appendChild(el('span', 'dl-ptitle', p.title));
      // Counts, not just a title: a list of numbered patches with no shape to
      // them says nothing about which one is worth opening.
      const tags = el('span', 'dl-ptags');
      for (const c of patchCounts(p)) {
        tags.appendChild(el('span', `dl-tag ${c.kind}`, c.label));
      }
      mid.appendChild(tags);
      row.appendChild(mid);
      row.appendChild(el('span', 'dl-pdate', p.date ?? 'Launch'));
      rows.appendChild(row);
    }
    box.appendChild(rows);
  }
  return box;
}

/** The small card picture that leads a change row. */
function cardThumb(id: string, makeReadable: CardReader): HTMLElement | null {
  const rec = ALL_CARDS[id];
  if (!rec) return null;
  const box = el('div', 'dl-ethumb readable');
  const img = el('img') as HTMLImageElement;
  img.src = artUrl(rec.thumb);
  img.alt = rec.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  box.appendChild(img);
  makeReadable(box, rec);
  return box;
}

/**
 * A card drawn as a card, with its name under it. Used by the New Cards grid,
 * where the picture is the point and there is nothing to say about it yet.
 *
 * Returns null for an id the set does not have, so a bad entry costs a missing
 * tile rather than a broken image.
 */
function cardArt(id: string, makeReadable: CardReader): HTMLElement | null {
  const rec = ALL_CARDS[id];
  if (!rec) return null;
  const box = el('div', 'dl-card readable');
  const img = el('img') as HTMLImageElement;
  img.src = artUrl(rec.thumb);
  img.alt = rec.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  box.appendChild(img);
  box.appendChild(el('span', 'dl-cname', rec.name));
  makeReadable(box, rec);
  return box;
}
