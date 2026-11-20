import './setup-inspection.css';
import './duel-inspection.css';

/** Restyle the existing inspector; its card data, rules and dismissal remain shared. */
export function presentSetupInspection(overlay: HTMLElement, setup: HTMLElement, close: HTMLButtonElement,
  copy?: { context: string; back: string; note: string; duel?: boolean;
    location?: { label: string; state?: string } }) {
  overlay.classList.add('setup-inspection');
  if (copy?.duel) overlay.classList.add('duel-inspection');
  overlay.setAttribute('aria-modal', 'true');
  // Keep instance-specific Power sources and skill availability in a duel.
  // Deck guide / catalogue metadata do not belong in the shared rules reader.
  overlay.querySelectorAll('.inspect-extra').forEach(section => {
    if (!copy?.duel || !section.closest('.inspect-live')) section.remove();
  });
  // Authored rules remain the primary reading area; live diagnostics stay
  // available beneath them instead of displacing both skills on short screens.
  if (copy?.duel) {
    const live = overlay.querySelector('.inspect-live');
    if (live) overlay.querySelector('.text')?.after(live);
  }
  const panel = overlay.querySelector<HTMLElement>('.inspect')!;
  const art = panel.querySelector<HTMLImageElement>(':scope > .art')!;
  const artPane = document.createElement('figure'); artPane.className = 'setup-inspect-art';
  art.replaceWith(artPane); artPane.append(art);
  if (copy?.duel && copy.location) {
    const caption = document.createElement('figcaption'); caption.className = 'duel-inspect-location';
    const label = document.createElement('strong'); label.textContent = copy.location.label;
    caption.append(label);
    if (copy.location.state) {
      const state = document.createElement('span'); state.textContent = copy.location.state; caption.append(state);
    }
    artPane.append(caption);
  }
  const header = document.createElement('header');
  header.className = 'setup-inspect-header';
  const title = document.createElement('strong'); title.textContent = 'Card details';
  const context = document.createElement('span');
  context.textContent = copy?.context ?? (setup.classList.contains('setup-codex') ? 'Codex selection' : 'Persona selection');
  const brand = document.createElement('div'); brand.className = 'setup-inspect-brand';
  brand.setAttribute('role', 'img'); brand.setAttribute('aria-label', 'Codex Legend TCG');
  const emblem = document.createElement('span'); emblem.className = 'setup-inspect-emblem';
  const wordmark = document.createElement('span'); wordmark.className = 'setup-inspect-wordmark';
  brand.append(emblem, wordmark);
  close.textContent = '×';
  header.append(title, context, brand, close);
  panel.prepend(header);
  // Move authored leading condition tags into a ribbon without changing rules
  // or replacing the glossary spans with plain text.
  overlay.querySelectorAll<HTMLElement>('.rule-entry').forEach(rule => {
    const prefix = rule.textContent?.match(/^(?:\s*\[[^\]]+\])+(?:\s*1\/Turn:?)?/u)?.[0];
    if (!prefix) return;
    const walker = document.createTreeWalker(rule, NodeFilter.SHOW_TEXT);
    let remaining = prefix.length;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent?.length ?? 0;
      if (remaining > length) { remaining -= length; continue; }
      const range = document.createRange(); range.setStart(rule, 0); range.setEnd(node, remaining);
      const label = document.createElement('div'); label.className = 'setup-rule-heading';
      label.append(range.extractContents()); rule.prepend(label); break;
    }
  });
  const footer = document.createElement('footer'); footer.className = 'setup-inspect-footer';
  const note = document.createElement('span'); note.textContent = copy?.note ?? 'Inspection keeps your current selection.';
  const back = document.createElement('button'); back.textContent = copy?.back ?? 'Back to selection';
  back.onclick = event => { event.stopPropagation(); close.click(); };
  if (copy?.duel) {
    const live = panel.querySelector<HTMLElement>('.inspect-live');
    const rules = panel.querySelector<HTMLElement>('.text');
    if (live) {
      const lore = panel.querySelector('.card-lore');
      if (lore) live.append(lore);
      const toggle = document.createElement('button'); toggle.className = 'duel-inspect-details-toggle';
      toggle.textContent = 'Battle details ▸';
      toggle.setAttribute('aria-expanded', 'false');
      live.id = 'duel-card-battle-details'; live.hidden = true;
      toggle.setAttribute('aria-controls', live.id);
      // The existing live information is a second reading view within this
      // same inspector. Opening it never resizes the dialog or answers a choice.
      toggle.onclick = event => {
        event.stopPropagation();
        const showing = live.hidden;
        live.hidden = !showing;
        if (rules) rules.hidden = showing;
        toggle.setAttribute('aria-expanded', String(showing));
        toggle.textContent = showing ? '‹ Card skills' : 'Battle details ▸';
        if (showing) live.querySelectorAll('details').forEach(section => { section.open = true; });
        panel.querySelector('.body')!.scrollTop = 0;
      };
      footer.append(toggle);
    }
    footer.setAttribute('aria-label', copy.note);
  } else footer.append(note);
  footer.append(back); panel.append(footer);
  // A nested inspection leaves the pending decision intact. Block its controls
  // while reading, then restore their original inert state on every close path.
  const backgrounds = new Set<HTMLElement>([setup]);
  if (copy?.duel) document.querySelectorAll<HTMLElement>('.duel-panel, .duel-restore, .rail')
    .forEach(node => backgrounds.add(node));
  const priorInert = [...backgrounds].map(node => ({ node, inert: node.inert }));
  for (const { node } of priorInert) node.inert = true;
  return () => { for (const { node, inert } of priorInert) node.inert = inert; };
}
