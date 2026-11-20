import { inputCopy, inspectHint } from './input-copy.js';
import { formatCardText, formatSkillText } from './glossary.js';
import { displayRuleText } from '../localization/display.js';
import { panelIcon } from './panel-icons.js';
import { weightedSelectionTotal } from '../core/selection-weight.js';
import { prepareCardArt } from './card-art-cache.js';
import { mountBoardChoiceLayout } from './choice-layout.js';
import { mountDuelPanel } from './duel-panel.js';
import { cardDisplayName } from './card-name.js';
import { motionReduced, motionDuration, playMotion } from './duel-motion.js';
import { cardStatBadges, createCardStatBadge, type CardStatBadge } from './card-stats.js';
import { mountApprovedChoiceLayout, renderDefenseComparison, type DefenseComparison } from './approved-choice-layout.js';
import './card-stats.css';
import './approved-choice-layout.css';
import './choice-summary.css';
const browsers = new Set<() => void>();
/** Replace a zone viewer without answering any underlying game decision. */
export function closeCardBrowsers(): void { for (const close of [...browsers]) close(); }
/** Shared, UID-based chooser. Viewing and filtering never spend a card. */
export interface ChoiceCard {
  uid: string; name: string; image: string; type: string; detail: string;
  /** Catalogue type stays stable when `type` is an action-specific caption. */
  cardType?: string;
  stats: string; zone?: string; level?: number; power?: number; defense?: number; weight?: number; sentry?: boolean; cost?: number;
  hidden?: boolean;
  position?: string;
  condition?: string;
  disabledReason?: string;
}
export interface CardChoiceOptions {
  /** Approved, board-first layout. No changes to native hand or Barrier geometry. */
  choicePresentation?: 'defense' | 'placement';
  defenseComparison?: (ids: string[]) => DefenseComparison;
  selectionDetails?: (ids: string[]) => string;
  title: string; instruction: string; cards: ChoiceCard[];
  max?: number; exact?: boolean; ordered?: boolean; browse?: boolean;
  firstSelectedMinimum?: number; atLeast?: boolean;
  confirm?: string; decline?: string;
  /** Cancel a draft action, distinct from committing with no selected cards. */
  cancel?: { label: string; run: () => void };
  effectDetails?: boolean;
  /** One compact public effect explanation; never a second card rail. */
  responseContext?: { effect: string; targets: string[]; targetLabel: string; name?: string; owner?: string; image?: string; inspect?: () => void };
  summary?: (ids: string[]) => string;
  /** Short combat arithmetic must grow to fit, rather than scroll internally. */
  summaryLayout?: 'combat';
  onSelection?: (ids: string[]) => void;
  /** A selected skill can name its cost on the commit button without another dialog. */
  confirmLabel?: (ids: string[]) => string;
  showDefense?: boolean;
  inspect?: (uid: string) => void;
  /** Optional practice help never changes the selection. */
  help?: { levels: string[]; onRequest?: () => void };
  /** Legal face-up field targets can also be selected directly on the board. */
  boardTargets?: boolean;
  /** Explicit placement targets use the same draft/confirm flow as cards. */
  boardElements?: Map<string, HTMLElement>;
  /** Incoming card is distinct from the effect's source. */
  placement?: { name: string; image: string; inspect: () => void; cardType?: string; power?: number; defense?: number };
  /** Only explicit opt-in replaces inspection with a card-click action. */
  browseAction?: { label: string; onCardClick?: boolean; available: (uid: string) => boolean; run: (uid: string) => void };
  /** Read-only navigation replaces this viewer, never the suspended game choice. */
  navigation?: { label: string; value: string; options: { value: string; label: string }[]; change: (value: string) => void }[];
}
export function selectionTotal(cards: ChoiceCard[], ids: string[], firstMinimum = 0): number {
  return weightedSelectionTotal(ids, Object.fromEntries(cards.map(c => [c.uid, c.weight ?? 1])), firstMinimum);
}
export function ventSelectionSummary(ids: string[], drawPer: number): string {
  return `${ids.length} selected to Kalas · Draw ${Math.floor(ids.length / drawPer)} (${drawPer} Kalas = 1 draw)`;
}
export function selectedCardSummary(cards: ChoiceCard[], ids: string[]): string {
  return ids.map(id => cards.find(c => c.uid === id)).filter((c): c is ChoiceCard => !!c)
    .map(c => `${cardDisplayName(c.name)}${c.position ? ` · ${c.position}` : ''}`).join(' / ');
}
/** Large piles benefit from filtering; hand, field and Codex choices stay compact. */
export function allowsChoiceFilters(cards: ChoiceCard[]): boolean {
  return cards.length > 0 && cards.every(c => ['deck', 'grave', 'heart', 'exile'].includes(c.zone ?? ''));
}
export function allowsBoardChoice(o: CardChoiceOptions): boolean {
  return !o.browse && !o.ordered && !o.effectDetails && o.cards.length > 0
    && o.cards.every(c => !c.hidden && ['hand', 'ally', 'persona'].includes(c.zone ?? ''));
}
/** The caller supplies current Power for field choices; no rules are computed here. */
export function choiceCardStatBadges(card: ChoiceCard): CardStatBadge[] {
  if (card.sentry) return [];
  const field = card.zone === 'ally' || card.zone === 'persona';
  return cardStatBadges({ ...card, type:card.cardType ?? card.type }, field
    ? { context:'field', currentPower:card.power ?? Number.NaN, hidden:card.hidden }
    : { context:'printed', hidden:card.hidden });
}
export function openCardChoice(o: CardChoiceOptions): Promise<string[]> {
  o.cards.slice(0, 12).filter(c => !c.hidden).forEach(c => { void prepareCardArt(c.image); });
  if (/switch Codex\? Free\./i.test(o.title)) o = { ...o, title: 'Auto-switch Codex',
    instruction: 'Choose a Codex, or keep your current one. This automatic switch is free.', decline: 'Keep current', confirm: 'Switch' };
  return new Promise(resolve => {
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => {
      const n = document.createElement(tag); n.className = cls; n.textContent = text; return n;
    };
    const previous = document.activeElement as HTMLElement | null;
    const availableNodes = Array.from(document.querySelectorAll<HTMLElement>('.card[data-uid], .hand-card[data-uid]'));
    const targets = o.boardElements ?? new Map(o.cards.flatMap(c => {
      const node = availableNodes.find(n => n.dataset.uid === c.uid);
      return node ? [[c.uid, node] as const] : [];
    }));
    const direct = (allowsBoardChoice(o) || !!o.boardElements || (o.choicePresentation === 'defense' && !o.cards.length)) && o.cards.every(c => targets.has(c.uid));
    const approved = direct && !!o.choicePresentation;
    const bg = make('div', 'modal-bg cc-backdrop');
    // Scoped to this mounted chooser, so nested inspection/minimize preserve
    // emphasis and removal restores it without a global state to clean up.
    bg.dataset.choiceMode = o.browse ? 'browse' : 'decision';
    bg.classList.add('cc-managed');
    if (o.summaryLayout === 'combat') bg.classList.add('cc-combat-summary');
    if (direct) bg.classList.add('board-decision');
    if (direct && o.cards.some(c => c.zone === 'hand')) bg.classList.add('board-hand-decision');
    if (approved) { bg.classList.add('cc-approved'); bg.dataset.presentation = o.choicePresentation; }
    const dialog = make('section', 'cc-dialog');
    dialog.style.setProperty('--choice-width', `${Math.min(960, Math.max(840, o.cards.length * 156 + 160))}px`);
    if (o.ordered) dialog.classList.add('cc-ordered');
    if (o.effectDetails) dialog.classList.add('cc-effects');
    const spotlight = !direct && !o.browse && !o.ordered && !o.placement
      && o.cards.length === 1 && !o.cards[0]!.hidden;
    dialog.classList.toggle('cc-spotlight', spotlight);
    dialog.classList.toggle('cc-browse', !!o.browse);
    dialog.classList.toggle('cc-empty', o.cards.length === 0 && !o.placement);
    const head = make('header', 'cc-head');
    head.append(make('h3', '', o.title));
    const selectedCount = make('span', 'cc-selected-count'); selectedCount.setAttribute('aria-live', 'polite'); head.append(selectedCount);
    const filterable = !o.ordered && allowsChoiceFilters(o.cards);
    const deckSearch = !o.ordered && !o.browse && o.cards.length > 1 && o.cards.every(c => c.zone === 'deck');
    if (deckSearch) dialog.classList.add('cc-deck-search');
    const filters = make('button', 'cc-filter-toggle', 'Filters');
    panelIcon(filters, 'filter', 'Filters'); filters.setAttribute('aria-expanded', 'false');
    if (filterable) head.append(filters);
    const instruction = make('p', 'cc-instruction', o.instruction || (direct ? 'Select highlighted cards or zones, then confirm.' : ''));
    const baseInstruction = inputCopy(instruction.textContent ?? ""); instruction.innerHTML = formatCardText(baseInstruction);
    let helpText = '';
    instruction.setAttribute('aria-live', 'polite');
    const toolbar = make('div', 'cc-toolbar');
    const search = make('input', 'cc-search'); search.type = 'search'; search.placeholder = 'Search these cards';
    search.enterKeyHint = 'done'; search.autocomplete = 'off'; search.autocapitalize = 'none'; search.spellcheck = false;
    search.setAttribute('aria-label', 'Search available cards');
    const finishSearch = make('button', 'cc-search-done', 'Done');
    finishSearch.onclick = () => { search.blur(); filters.focus(); };
    search.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); search.blur(); filters.focus(); } };
    const filter = make('select', ''); filter.setAttribute('aria-label', 'Card type');
    for (const value of ['All types', ...new Set(o.cards.map(c => c.type))]) {
      const opt = make('option', '', value); opt.value = value; filter.append(opt);
    }
    const level = make('select', ''); level.setAttribute('aria-label', 'Level');
    for (const value of ['Any level', ...new Set(o.cards.map(c => String(c.level ?? 0)))]) {
      const opt = make('option', '', value); opt.value = value; level.append(opt);
    }
    const sort = make('select', ''); sort.setAttribute('aria-label', 'Sort cards');
    for (const value of ['Original order', 'Name', 'Defense']) {
      const opt = make('option', '', value); opt.value = value; sort.append(opt);
    }
    const clear = make('button', '', 'Clear'); clear.setAttribute('aria-label', 'Clear filters');
    const onlySelected = make('button', 'cc-selected-filter', 'Selected'); onlySelected.setAttribute('aria-pressed', 'false');
    let selectedOnly = false;
    const count = make('span', 'cc-count'); toolbar.append(search, finishSearch, filter, level, sort, clear, onlySelected, count);
    const content = make('div', 'cc-content');
    const grid = make('div', 'cc-grid');
    const prev = make('button', 'cc-scroll cc-scroll-prev', '‹'); prev.setAttribute('aria-label', 'Previous cards');
    const next = make('button', 'cc-scroll cc-scroll-next', '›'); next.setAttribute('aria-label', 'Next cards');
    content.append(prev, grid, next);
    // Reading an option is not selecting it. The same UID-based rail remains
    // the sole selection control; only public, supplied text is shown here.
    const detail = make('aside', 'cc-detail');
    detail.setAttribute('aria-label', o.effectDetails ? 'Effect details' : 'Card details');
    const detailArt = make('img', 'cc-detail-art'); detailArt.alt = '';
    const detailCopy = make('div', 'cc-detail-copy');
    const detailHeading = make('h4', '');
    const detailStats = make('p', 'cc-detail-stats');
    const detailRules = make('div', 'cc-detail-rules');
    detailCopy.append(detailHeading, detailStats, detailRules);
    if (o.effectDetails && !spotlight) detail.append(detailArt);
    detail.append(detailCopy);
    if (spotlight || o.effectDetails) content.append(detail);
    const footer = make('footer', 'cc-footer');
    const summary = make('div', 'cc-summary'); summary.setAttribute('aria-live', 'polite');
    const paymentDetails = make('details', 'cc-payment-details');
    const paymentHeading = make('summary', '', 'Payment details');
    const paymentText = make('div', 'cc-payment-text');
    paymentDetails.append(paymentHeading, paymentText);
    if (o.selectionDetails) footer.append(paymentDetails);
    const actions = make('div', 'cc-actions');
    const confirm = make('button', 'primary', o.confirm ?? 'Confirm');
    const decline = make('button', '', o.browse ? 'Close' : o.decline ?? '');
    const cancel = o.cancel ? make('button', 'cc-cancel', o.cancel.label) : null;
    footer.append(summary, actions);
    if (cancel) actions.append(cancel);
    if (o.browse || o.decline) actions.append(decline);
    if (!o.browse) actions.append(confirm);
    dialog.append(head, instruction);
    if (o.placement) {
      dialog.classList.add('cc-placement');
      dialog.style.height = 'auto';
      dialog.style.maxHeight = 'var(--placement-max-height, calc(var(--duel-vh, 100dvh) - 16px))';
      dialog.style.overflowY = 'auto';
      const incoming = make('button', 'cc-incoming'); incoming.type = 'button';
      // Geometry is safety-critical: a stale imported stylesheet must never
      // let full-resolution artwork participate in the board's layout.
      incoming.style.cssText = 'display:flex;align-items:center;gap:10px;min-width:0;max-width:100%;overflow:hidden;flex:none;padding:4px 8px;text-align:left';
      const image = make('img', ''); image.src = o.placement.image; image.alt = o.placement.name;
      image.width = 64; image.height = 90; image.draggable = false;
      image.style.cssText = 'display:block;width:var(--incoming-width,clamp(40px,10vh,64px));height:var(--incoming-height,clamp(56px,14vh,90px));max-width:var(--incoming-width,64px);max-height:var(--incoming-height,90px);object-fit:contain;flex:none';
      if (approved) {
        const art = make('span', 'cc-approved-incoming-art'); art.append(image);
        if (o.placement.cardType) art.append(...cardStatBadges({type:o.placement.cardType,
          power:o.placement.power, defense:o.placement.defense}, {context:'printed'}).map(createCardStatBadge));
        incoming.append(art);
      } else incoming.append(image);
      incoming.append(make('span', '', approved ? o.placement.name : `Calling ${o.placement.name} · Inspect`));
      incoming.setAttribute('aria-label', `Inspect incoming card ${o.placement.name}`);
      incoming.onclick = () => o.placement!.inspect();
      dialog.append(incoming);
    }
    if (o.responseContext) {
      const context = make('section', 'cc-response-context');
      if (o.responseContext.image) {
        const read = make('button', 'cc-response-source'); read.type = 'button';
        const image = make('img', ''); image.src = o.responseContext.image; image.alt = o.responseContext.name ?? 'Effect source';
        read.append(image); read.setAttribute('aria-label', `Read ${o.responseContext.name ?? 'effect source'}`);
        read.onclick = () => o.responseContext?.inspect?.();
        read.oncontextmenu = e => { e.preventDefault(); o.responseContext?.inspect?.(); };
        context.append(read);
      }
      const text = make('div', 'cc-response-text');
      const sourceName = [o.responseContext.owner, o.responseContext.name ?? 'Effect source'].filter(Boolean).join(' · ');
      const effect = make('p', ''); effect.innerHTML = formatSkillText(displayRuleText(o.responseContext.effect));
      if (o.ordered || deckSearch || direct) {
        const details = make('details', 'cc-source-details');
        details.open = !direct && !matchMedia(`(orientation: landscape) and (max-height: ${deckSearch ? 600 : 420}px)`).matches;
        details.append(make('summary', '', `${sourceName} · Skill`), effect); text.append(details);
      } else {
        if (o.responseContext.name) text.append(make('strong', '', sourceName));
        text.append(effect);
      }
      if (o.responseContext.targetLabel) text.append(make('p', '', `Targets: ${o.responseContext.targetLabel}`));
      context.append(text);
      dialog.append(context);
    }
    if (o.help) {
      const help = make('button', 'cc-help', 'Need a Hint?');
      let level = 0;
      help.onclick = () => {
        if (level >= o.help!.levels.length) {
          level = 0; helpText = ''; instruction.innerHTML = formatCardText(baseInstruction);
          instruction.classList.remove('cc-help-text'); help.textContent = 'Need a Hint?'; return;
        }
        o.help!.onRequest?.();
        helpText = o.help!.levels[level++] ?? '';
        instruction.innerHTML = formatCardText(inputCopy(helpText)); instruction.classList.add('cc-help-text');
        help.textContent = level >= o.help!.levels.length ? 'Hide Hint' : 'More Help';
      };
      head.append(help);
    }
    if (filterable) dialog.append(toolbar);
    dialog.append(content, footer);
    const choiceBody = make('div', 'cc-body');
    const mountChoiceBody = () => {
      for (const node of Array.from(dialog.children)) {
        if (node !== head && node !== footer && node !== choiceBody
          && !node.classList.contains('cc-approved-heading') && !node.classList.contains('cc-approved-rail')) choiceBody.append(node);
      }
      dialog.insertBefore(choiceBody, footer);
    };
    // Reading choices have one primary scroll region, with their heading and
    // commit controls outside it. Board decisions retain their measured layout.
    if (!direct) {
      mountChoiceBody();
      if (spotlight) detailStats.after(instruction);
    }
    bg.append(dialog);
    // Reuse the existing controls and inspection content in a task-specific shell.
    // Card List removes this layout class and restores the same original picker.
    const approvedHeading = make('div', 'cc-approved-heading');
    const approvedRail = make('aside', 'cc-approved-rail');
    const approvedSelected = make('div', 'cc-approved-selected');
    const comparison = make('div', 'cc-comparison'); comparison.setAttribute('aria-live', 'polite');
    const destination = make('div', 'cc-approved-destination'); destination.setAttribute('aria-live', 'polite');
    if (approved) {
      approvedHeading.append(head, instruction);
      dialog.prepend(approvedHeading);
      const context = dialog.querySelector('.cc-response-context');
      const incoming = dialog.querySelector('.cc-incoming');
      if (o.defenseComparison) approvedRail.append(comparison);
      if (context) approvedRail.append(context);
      if (incoming) approvedRail.append(make('small', 'cc-incoming-label', 'Incoming Unit'), incoming, destination);
      content.before(approvedRail);
      footer.prepend(approvedSelected);
    }
    let ids: string[] = []; let done = false;
    const closeBrowser = () => finish([]);
    const tiles = new Map<string, HTMLElement>();
    const cancelHolds = new Set<() => void>();
    const fieldNodes = direct || o.boardTargets ? [...targets.values()] : [];
    const attributes = ['tabindex', 'role', 'aria-label', 'aria-pressed', 'data-choice-target'] as const;
    const targetAttributes = fieldNodes.map(node => ({node, values:attributes.map(name => node.getAttribute(name))}));
    const placementGhosts: HTMLElement[] = [];
    if (o.placement && direct) {
      for (const node of fieldNodes) {
        const ghost = make('span', 'cc-placement-ghost');
        ghost.style.cssText = 'display:none;position:absolute;inset:0;background-size:contain;background-position:center;background-repeat:no-repeat;opacity:.65;pointer-events:none;z-index:3';
        ghost.style.backgroundImage = `url(${JSON.stringify(o.placement.image)})`;
        ghost.setAttribute('aria-hidden', 'true');
        node.append(ghost); placementGhosts.push(ghost);
      }
    }
    if (direct) for (const [uid, node] of targets) {
      node.dataset.choiceTarget = uid; node.tabIndex = 0; node.setAttribute('role', 'button');
      const card = o.cards.find(c => c.uid === uid)!;
      node.setAttribute('aria-label', `${cardDisplayName(card.name)}${card.position ? ` · ${card.position}` : ''}`);
    }
    const threatened = Array.from(document.querySelectorAll<HTMLElement>('.card[data-uid]'))
      .filter(n => o.responseContext?.targets.includes(n.dataset.uid!));
    threatened.forEach(n => n.classList.add('response-threat'));
    const shell = mountDuelPanel(bg, dialog, head, o.title, { expand: !direct,
      // All desktop card lists need room for artwork, not only responses.
      // Direct board choices and placement must leave the field accessible.
      // Lists need readable cards at every viewport. CSS handles available
      // space; resizing never resets an explicit compact/minimize choice.
      initiallyExpanded: false,
      boardClick: direct || o.boardTargets ? uid => {
      if (!o.cards.some(c => c.uid === uid)) return false;
      toggle(uid); return true;
    } : undefined });
    const remove = bg.remove.bind(bg);
    bg.remove = () => { browsers.delete(closeBrowser); cancelHolds.forEach(cancel => cancel()); tiles.clear(); o.onSelection?.([]);
      placementGhosts.forEach(ghost => ghost.remove());
      fieldNodes.forEach(n => n.classList.remove('decision-target', 'decision-selected'));
      for (const {node, values} of targetAttributes) attributes.forEach((name, i) => {
        if (values[i] === null) node.removeAttribute(name); else node.setAttribute(name, values[i]!);
      });
      threatened.forEach(n => n.classList.remove('response-threat')); remove(); };
    if (direct) {
      const list = make('button', 'cc-list-toggle', 'Card list'); list.setAttribute('aria-expanded', 'false');
      const showList = (open: boolean) => {
        const retainedFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // List mode uses the same persistent action footer as other readers.
        // Restore the original children before measuring direct board docks.
        if (!open && choiceBody.isConnected) choiceBody.replaceWith(...Array.from(choiceBody.childNodes));
        if (approved) {
          const context = dialog.querySelector('.cc-response-context');
          const incoming = dialog.querySelector('.cc-incoming');
          // The existing list stylesheet deliberately uses direct children.
          // Restore that structure while reading; keep the same live nodes.
          if (open) {
            dialog.prepend(head, instruction);
            if (incoming) content.before(incoming);
            if (context) content.before(context);
          } else {
            approvedHeading.append(head, instruction);
            if (context) approvedRail.prepend(context);
            if (incoming) destination.before(incoming);
          }
        }
        if (open) mountChoiceBody();
        bg.classList.toggle('board-list-open', open);
        if (open) bg.classList.remove('cc-board-docked');
        list.setAttribute('aria-expanded', String(open)); list.textContent = open ? 'Use board' : 'Card list'; shell.refresh();
        if (retainedFocus?.isConnected) retainedFocus.focus({ preventScroll: true });
      };
      list.onclick = () => showList(!bg.classList.contains('board-list-open'));
      head.append(list);
      const legalTargets = [...targets].filter(([uid]) => !o.cards.find(c => c.uid === uid)?.disabledReason).map(([, node]) => node);
      const stopLayout = approved
        ? mountApprovedChoiceLayout(bg, approvedHeading, approvedRail, footer, legalTargets, () => showList(true))
        : mountBoardChoiceLayout(bg, dialog, legalTargets, !!o.placement, () => showList(true));
      const removeWithTargets = bg.remove.bind(bg);
      bg.remove = () => { stopLayout(); removeWithTargets(); };
    }
    const finish = (result: string[]) => {
      if (done) return; done = true; bg.remove(); previous?.isConnected && previous.focus({ preventScroll: true }); resolve(result);
    };
    if (o.browse) browsers.add(closeBrowser);
    if (o.browse && o.navigation) {
      const navigation = make('nav', 'cc-navigation');
      for (const item of o.navigation) {
        const label = make('label', '', item.label);
        const select = make('select', ''); select.setAttribute('aria-label', item.label);
        for (const entry of item.options) {
          const option = make('option', '', entry.label); option.value = entry.value; select.append(option);
        }
        select.value = item.value;
        select.onchange = () => { const value = select.value; finish([]); item.change(value); };
        label.append(select); navigation.append(label);
      }
      head.after(navigation);
    }
    function toggle(uid: string) {
      if (done) return;
      const unavailable = o.cards.find(c => c.uid === uid)?.disabledReason;
      if (unavailable) { instruction.textContent = unavailable; return; }
      instruction.innerHTML = formatCardText(inputCopy(helpText || baseInstruction));
      if (ids.includes(uid)) ids = ids.filter(id => id !== uid);
      else {
        const card = o.cards.find(c => c.uid === uid)!;
        let chosen = o.max === 1 ? [uid] : [...ids, uid];
        if (card.sentry) chosen = chosen.filter(id => id === uid || !o.cards.find(c => c.uid === id)?.sentry);
        if (o.atLeast ? o.max === 1 || selectionTotal(o.cards, ids, o.firstSelectedMinimum) < (o.max ?? Infinity)
          : selectionTotal(o.cards, chosen, o.firstSelectedMinimum) <= (o.max ?? Infinity)) ids = chosen;
        else {
          instruction.textContent = `Limit ${o.max} — deselect a card first.`;
          return;
        }
      }
      render();
      const changed = Array.from(grid.querySelectorAll<HTMLElement>('[data-choice]')).find(n => n.dataset.choice === uid);
      const art = changed?.querySelector<HTMLElement>('.cc-art');
      if (art && !motionReduced()) void playMotion(art, [
        { scale: '.94' }, { scale: '1' },
      ], Math.min(180, motionDuration('routine')));
    }
    const updateScroll = () => {
      const overflow = grid.scrollWidth > grid.clientWidth + 1;
      prev.style.visibility = next.style.visibility = overflow ? 'visible' : 'hidden';
      prev.disabled = grid.scrollLeft <= 1;
      next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 1;
    };
    prev.onclick = () => grid.scrollBy({ left: -Math.max(120, grid.clientWidth * .7), behavior: motionReduced() ? 'auto' : 'smooth' });
    next.onclick = () => grid.scrollBy({ left: Math.max(120, grid.clientWidth * .7), behavior: motionReduced() ? 'auto' : 'smooth' });
    grid.onscroll = () => { cancelHolds.forEach(cancel => cancel()); updateScroll(); };
    // Mouse wheels browse the same horizontal row as touch swipes and arrows.
    grid.addEventListener('wheel', event => {
      if (event.ctrlKey || grid.scrollWidth <= grid.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? grid.clientWidth : 1;
      grid.scrollBy({ left: event.deltaY * scale, behavior: 'auto' });
    }, { passive: false });
    const sizeObserver = new ResizeObserver(updateScroll); sizeObserver.observe(grid);
    const baseRemove = bg.remove.bind(bg); bg.remove = () => { sizeObserver.disconnect(); baseRemove(); };
    const render = () => {
      const focused = document.activeElement?.getAttribute('data-choice');
      const scrollTop = grid.scrollTop;
      const scrollLeft = grid.scrollLeft;
      let visible = o.cards.filter(c => (level.value === 'Any level' || String(c.level ?? 0) === level.value) && (filter.value === 'All types' || filter.value === c.type)
        && `${c.name} ${c.detail} ${c.stats}`.toLowerCase().includes(search.value.toLowerCase().trim()));
      if (selectedOnly) visible = visible.filter(c => ids.includes(c.uid));
      if (sort.value === 'Name') visible = [...visible].sort((a, b) => a.name.localeCompare(b.name));
      if (sort.value === 'Defense') visible = [...visible].sort((a, b) => (b.defense ?? 0) - (a.defense ?? 0));
      count.textContent = `${visible.length} / ${o.cards.length} cards`;
      grid.replaceChildren();
      for (const c of visible) {
        let tile = tiles.get(c.uid);
        if (!tile) {
          tile = make('div', 'cc-card');
          const pick = make('button', 'cc-pick'); pick.dataset.choice = c.uid;
          pick.classList.toggle('cc-located', !!c.position);
          const hintText = c.hidden ? 'Face-down card' : inspectHint();
          pick.setAttribute('aria-label', `${c.name}. ${c.stats}. ${c.condition ?? ''}. ${hintText}. Keyboard: Shift+F10.`);
          if (c.disabledReason) { pick.setAttribute('aria-disabled', 'true'); tile.classList.add('cc-unavailable'); }
          const hint = make('span', 'cc-inspect-hint', hintText);
          let hold: ReturnType<typeof setTimeout> | undefined;
          let suppressClick = false, pointerDown = false, startX = 0, startY = 0, lastInspect = 0, startScroll = 0, touchGesture = false;
          const inspect = () => {
            if (c.hidden) return;
            if (Date.now() - lastInspect < 400) return;
            lastInspect = Date.now(); suppressClick = true; o.inspect?.(c.uid);
          };
          const cancelHold = () => { clearTimeout(hold); hold = undefined; };
          cancelHolds.add(cancelHold);
          pick.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); cancelHold(); inspect(); };
          pick.onkeydown = e => {
            if (e.key === 'Enter' || e.key === ' ') { suppressClick = false; touchGesture = false; }
            if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
              e.preventDefault(); e.stopPropagation(); inspect();
            }
          };
          pick.onpointerdown = e => {
            cancelHold(); pointerDown = true; suppressClick = false; startX = e.clientX; startY = e.clientY;
            startScroll = grid.scrollLeft; touchGesture = e.pointerType === 'touch' || e.pointerType === 'pen';
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              hold = setTimeout(() => { if (pick.isConnected) inspect(); }, 500);
            }
          };
          pick.onpointermove = e => {
            if (pointerDown && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) { cancelHold(); suppressClick = true; }
          };
          pick.onpointerup = () => { pointerDown = false; cancelHold(); };
          pick.onpointercancel = () => { pointerDown = false; cancelHold(); suppressClick = true; };
          pick.onpointerleave = () => { pointerDown = false; cancelHold(); };
          if (!o.browse) pick.setAttribute('aria-pressed', String(ids.includes(c.uid)));
          const img = make('img', ''); img.loading = tiles.size < 8 ? 'eager' : 'lazy'; img.decoding = 'async';
          img.src = c.image; img.alt = ''; img.draggable = false;
          const art = make('span', 'cc-art'); art.append(img, hint);
          // Multi-effect rows use tiny source thumbnails. Their choices are
          // effects, not competing card stats; keep their existing explanation.
          if (!o.effectDetails) art.append(...choiceCardStatBadges(c).map(createCardStatBadge));
          pick.append(art, make('span', 'cc-name', c.name), make('span', 'cc-meta', c.position ?? (o.showDefense && c.defense !== undefined ? `Defense ${c.defense.toLocaleString()}` : c.type)));
          if (c.condition) pick.append(make('span', 'cc-condition', o.showDefense && c.defense !== undefined ? `Defense ${c.defense.toLocaleString()}` : c.condition));
          if (c.disabledReason) { const reason = make('span', 'cc-unavailable-reason', c.disabledReason); reason.title = c.disabledReason; pick.append(reason); }
          pick.onclick = () => {
            if (suppressClick || (touchGesture && Math.abs(grid.scrollLeft - startScroll) > 8)) return;
            if (done) return;
            if (o.browse) {
              if (o.browseAction?.onCardClick && o.browseAction.available(c.uid)) { finish([]); o.browseAction.run(c.uid); }
              else inspect();
              return;
            }
            toggle(c.uid);
          };
          tile.append(pick);
          if (o.inspect && !c.hidden) {
            const read = make('button', 'cc-read', 'Read');
            read.setAttribute('aria-label', `Read ${cardDisplayName(c.name)}${c.position ? ` · ${c.position}` : ''}`);
            read.title = 'Read card';
            read.onclick = e => { e.stopPropagation(); cancelHold(); o.inspect?.(c.uid); };
            tile.append(read);
          }
          tiles.set(c.uid, tile);
        }
        tile.classList.toggle('selected', ids.includes(c.uid));
        const pick = tile.querySelector<HTMLButtonElement>('.cc-pick')!;
        if (!o.browse) pick.setAttribute('aria-pressed', String(ids.includes(c.uid)));
        tile.querySelector('.cc-number')?.remove();
        if (ids.includes(c.uid)) pick.append(make('span', 'cc-number', o.ordered ? `${ids.indexOf(c.uid) + 1}` : '✓'));
        tile.querySelector('.cc-browse-action')?.remove();
        if (o.browse && o.browseAction?.available(c.uid)) {
          if (o.browseAction.onCardClick)
            pick.setAttribute('aria-label', `${o.browseAction.label}: ${c.name}. ${c.stats}. ${inspectHint()}.`);
          else {
            const action = make('button', 'cc-browse-action', o.browseAction.label);
            action.setAttribute('aria-label', `${o.browseAction.label}: ${c.name}`);
            action.onclick = () => {
              if (done || !o.browseAction?.available(c.uid)) return;
              finish([]); o.browseAction.run(c.uid);
            };
            tile.append(action);
          }
        }
        grid.append(tile);
      }
      if (!visible.length) grid.append(make('p', '', filterable ? 'No matching cards. Clear your search or change the type.' : 'No cards available.'));
      const total = selectionTotal(o.cards, ids, o.firstSelectedMinimum);
      const selectedText = o.browse ? `${o.cards.length} cards` : `${total}${o.max !== undefined ? ` / ${o.max}` : ''} ${o.atLeast ? 'Offers' : 'selected'}`;
      o.onSelection?.([...ids]);
      selectedCount.textContent = selectedText; shell.setStatus(selectedText);
      const selectedKind = o.placement ? 'zone' : 'card';
      approvedSelected.textContent = ids.length ? `✓ ${ids.length} ${selectedKind}${ids.length === 1 ? '' : 's'} selected` : (o.cards.length ? 'Choose, then confirm' : 'No legal defense cards');
      fieldNodes.forEach(node => {
        const uid = node.dataset.choiceTarget ?? node.dataset.uid!;
        node.classList.toggle('decision-target', !o.cards.find(c => c.uid === uid)?.disabledReason);
        node.classList.toggle('decision-selected', ids.includes(uid));
        const ghost = node.querySelector<HTMLElement>('.cc-placement-ghost');
        if (ghost) ghost.style.display = ids.includes(uid) ? 'block' : 'none';
        if (direct) node.setAttribute('aria-pressed', String(ids.includes(uid)));
      });
      const selected = !o.browse && (direct || o.boardTargets) ? selectedCardSummary(o.cards, ids) : '';
      if (approved && o.defenseComparison) renderDefenseComparison(comparison, o.defenseComparison([...ids]));
      if (approved && o.placement) destination.textContent = selected ? `→ ${selected}` : 'Choose a highlighted Ally Zone';
      summary.innerHTML = formatCardText([o.summary?.(ids) || (o.effectDetails && o.cards.length === 1 ? o.cards[0]?.detail : ''), selected].filter(Boolean).join(' · '));
      summary.hidden = !summary.textContent;
      if (spotlight || o.effectDetails) {
        const shown = o.cards.find(c => c.uid === ids[0]) ?? visible.find(c => !c.hidden);
        detail.hidden = !shown || !!shown.hidden;
        if (shown && !shown.hidden) {
          detailHeading.textContent = shown.name;
          detailStats.textContent = [shown.type, shown.condition, shown.disabledReason].filter(Boolean).join(' · ');
          detailArt.src = shown.image;
          detailRules.innerHTML = formatSkillText(displayRuleText(ids.length && o.summary ? o.summary(ids) : shown.detail));
        }
        summary.hidden = true;
      }
      if (o.selectionDetails) paymentText.innerHTML = formatCardText(o.selectionDetails(ids));
      confirm.disabled = o.atLeast ? total < (o.max ?? 1) : o.exact ? total !== o.max : !ids.length;
      confirm.textContent = `${o.confirmLabel?.(ids) ?? o.confirm ?? 'Confirm'}${ids.length && !o.effectDetails ? ` (${ids.length})` : ''}`;
      grid.scrollTop = scrollTop;
      grid.scrollLeft = scrollLeft; updateScroll();
      if (focused) Array.from(grid.querySelectorAll<HTMLElement>('[data-choice]')).find(n => n.dataset.choice === focused)?.focus();
    };
    filters.onclick = () => { const open = dialog.classList.toggle('cc-filters-open'); filters.setAttribute('aria-expanded', String(open)); };
    search.oninput = render; filter.onchange = render; level.onchange = render; sort.onchange = render;
    onlySelected.onclick = () => { selectedOnly = !selectedOnly; onlySelected.setAttribute('aria-pressed', String(selectedOnly)); render(); };
    clear.onclick = () => { search.value = ''; filter.selectedIndex = 0; level.selectedIndex = 0; selectedOnly = false; onlySelected.setAttribute('aria-pressed','false'); render(); search.focus(); };
    confirm.onclick = () => { if (!confirm.disabled) finish([...ids]); };
    decline.onclick = () => finish([]);
    if (cancel) cancel.onclick = () => { if (!done) { o.cancel!.run(); finish([]); } };
    render(); shell.min.focus({ preventScroll: true });
  });
}
