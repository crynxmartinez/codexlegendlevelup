import { revealPanel } from './duel-motion.js';
import './modal-system.css';
/** Shared presentation only. Closing/minimizing never answers an engine choice. */
import { panelIcon } from './panel-icons.js';
interface Panel {
  root: HTMLElement;
  dialog: HTMLElement;
  minimized: boolean;
  toggle: () => void;
  boardClick?: (uid: string) => boolean;
}
const panels: Panel[] = [];
const inspectors = new WeakMap<HTMLElement, () => void>();
const presentationControls = new WeakSet<HTMLElement>();
/** Acknowledgement controls advance presentation, never a card decision. */
export function registerPresentationControl(node: HTMLElement): void { presentationControls.add(node); }
function isPresentationControl(target: Element): boolean {
  for (let node: Element | null = target; node; node = node.parentElement) {
    if (node instanceof HTMLElement && presentationControls.has(node)) return true;
  }
  return false;
}
export const duelDecisionPending = () => panels.some(p => p.root.isConnected);
export function registerPanelInspection(node: HTMLElement, inspect: () => void) { inspectors.set(node, inspect); }
const topPanel = () => panels.filter(p => p.root.isConnected).at(-1);

function updatePanels() {
  const top = topPanel();
  for (const panel of panels) panel.root.classList.toggle('duel-suspended', panel !== top);
  document.body.classList.toggle('duel-pending', !!top);
  if (document.querySelector('.board-wrap')) { document.body.scrollTop = 0; }
  window.dispatchEvent(new Event('duel-panel-layout'));
}

// A transparent backdrop must not make game commands possible. Read-only
// card inspection and explicitly registered field targets remain available.
if (typeof document !== 'undefined') document.addEventListener('click', event => {
  const top = topPanel();
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.credits-dialog, .stat-tip, [data-tip]')) return;
  if (!top || !target || target.closest('.duel-panel, .inspect-bg, .mod-popover')) return;
  if (document.querySelector('.inspect-bg')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
  if (isPresentationControl(target)) return;
  if (target.closest('[data-panel-browse]')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const card = target.closest<HTMLElement>('[data-choice-target]')
    ?? target.closest<HTMLElement>('.card[data-uid], .hand-card[data-uid]');
  const uid = card?.dataset.choiceTarget ?? card?.dataset.uid;
  if (!top.minimized && uid && top.boardClick?.(uid)) return;
  for (let node: HTMLElement | null = target as HTMLElement; node; node = node.parentElement) {
    const inspect = inspectors.get(node);
    if (inspect) { inspect(); return; }
  }
}, true);

if (typeof document !== 'undefined') document.addEventListener('keydown', event => {
  const top = topPanel();
  if (!top || document.querySelector('.inspect-bg') || (event.key === 'Escape' && document.querySelector('.stat-tip.show'))) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.credits-dialog')) return;
  // Registered presentation surfaces may contain native selects/ranges. Their
  // arrows, Home/End and typeahead must not become blocked duel commands.
  if (target && isPresentationControl(target)) return;
  if (event.key === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation(); top.toggle(); return;
  }
  if (target?.closest('.duel-panel, [data-panel-browse]')) return;
  if (['Tab', 'Shift', 'Control', 'Alt', 'ContextMenu'].includes(event.key) || (event.shiftKey && event.key === 'F10')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if ((event.key === 'Enter' || event.key === ' ') && target instanceof HTMLElement) target.click();
}, true);

export function mountDuelPanel(root: HTMLElement, dialog: HTMLElement, head: HTMLElement, title: string,
  options: { expand?: boolean; initiallyExpanded?: boolean; boardClick?: (uid: string) => boolean; dismiss?: () => void } = {}) {
  const previous = document.activeElement as HTMLElement | null;
  root.classList.add('duel-panel', 'modal-v2', 'modal-v3'); dialog.classList.add('duel-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'false'); dialog.setAttribute('aria-label', title);
  const controls = document.createElement('div'); controls.className = 'duel-controls';
  const min = document.createElement('button'); panelIcon(min, 'minimize', 'Minimize');
  const restore = document.createElement('button'); restore.className = 'duel-restore'; restore.hidden = true;
  let status = '', expanded = options.expand !== false && !!options.initiallyExpanded, disposed = false;
  root.classList.toggle('duel-expanded', expanded);
  let priorPanelFocus: HTMLElement | null = null;
  const updateRestore = () => { restore.textContent = `Resume selection${status ? ` · ${status}` : ''}`; restore.title = title; };
  const panel: Panel = { root, dialog, minimized: false, boardClick: options.boardClick,
    toggle: () => {
      if (options.dismiss) { options.dismiss(); return; }
      panel.minimized = !panel.minimized;
      min.setAttribute('aria-expanded', String(!panel.minimized));
      if (panel.minimized) priorPanelFocus = document.activeElement as HTMLElement | null;
      root.classList.toggle('duel-minimized', panel.minimized);
      restore.hidden = !panel.minimized;
      updateRestore(); updatePanels();
      revealPanel(panel.minimized ? restore : dialog);
      if (panel.minimized) restore.focus({ preventScroll: true }); else (priorPanelFocus?.isConnected ? priorPanelFocus : min).focus({ preventScroll: true });
    },
  };
  const expand = document.createElement('button');
  panelIcon(expand, expanded ? 'compact' : 'expand', expanded ? 'Compact' : 'Expand');
  expand.setAttribute('aria-expanded', String(expanded));
  min.setAttribute('aria-expanded', 'true');
  if (options.expand !== false) controls.append(expand);
  expand.onclick = () => {
    expanded = !expanded; root.classList.toggle('duel-expanded', expanded);
    panelIcon(expand, expanded ? 'compact' : 'expand', expanded ? 'Compact' : 'Expand'); expand.setAttribute('aria-expanded', String(expanded));
    updatePanels();
    revealPanel(dialog);
  };
  min.onclick = panel.toggle; restore.onclick = panel.toggle;
  if (!options.dismiss) { controls.append(min); head.append(controls); root.append(restore); }
  document.body.append(root); panels.push(panel);
  const viewport = window.visualViewport;
  const fitViewport = () => {
    root.style.setProperty('--duel-vh', `${viewport?.height ?? innerHeight}px`);
    root.style.setProperty('--duel-vw', `${viewport?.width ?? innerWidth}px`);
    root.style.setProperty('--duel-left', `${viewport?.offsetLeft ?? 0}px`);
    root.style.setProperty('--duel-top', `${viewport?.offsetTop ?? 0}px`);
    updatePanels();
  };
  viewport?.addEventListener('resize', fitViewport);
  viewport?.addEventListener('scroll', fitViewport);
  window.addEventListener('resize', fitViewport);
  fitViewport();
  revealPanel(dialog);
  const observer = new ResizeObserver(updatePanels); observer.observe(dialog);
  const detach = new MutationObserver(() => { if (!root.isConnected) dispose(); });
  detach.observe(document.body, { childList: true });
  const remove = root.remove.bind(root);
  function dispose() {
    if (disposed) return; disposed = true;
    observer.disconnect(); detach.disconnect();
    viewport?.removeEventListener('resize', fitViewport);
    viewport?.removeEventListener('scroll', fitViewport);
    window.removeEventListener('resize', fitViewport);
    const index = panels.indexOf(panel); if (index >= 0) panels.splice(index, 1);
    updatePanels();
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  }
  root.remove = () => { remove(); dispose(); };
  updateRestore(); updatePanels();
  return { min, expand, setStatus: (value: string) => { status = value; updateRestore(); },
    refresh: updatePanels, remove: () => root.remove() };
}
