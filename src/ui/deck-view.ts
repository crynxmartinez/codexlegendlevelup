import { artUrl } from './assets.js';
import { menuElement as e, destinationShell } from './menu-destination.js';
import { downloadDeckImage } from './deck-image-export.js';
import { cardDisplayName } from './card-name.js';
import type { DeckViewModel } from './deck-view-model.js';
import './deck-view.css';

interface DeckViewerOptions {
  model: DeckViewModel;
  name: string;
  region: string;
  starter: boolean;
  coverUrl: string;
  coverId?: string;
  fighterUrl: string;
  code: string;
  inspect: (id: string, restoreFocus: () => void) => void;
  back: () => void;
}

/** Read-only surface. Editing, storage, and game rules remain with the existing controllers. */
export function presentDeckViewer(page: HTMLElement, options: DeckViewerOptions): void {
  const { model } = options;
  page.classList.add('deck-view-screen');
  const sidebar = e('aside', 'deck-view-summary');
  const art = e('img', 'deck-view-cover'); art.src = options.coverUrl; art.alt = `${options.region} deck artwork`;
  const fighter = e('div', 'deck-view-fighter'); fighter.dataset.person=options.fighterUrl.split('/').pop()?.replace('.webp','');
  const fighterImage=e('img'); fighterImage.src=options.fighterUrl; fighterImage.alt=''; fighter.append(fighterImage);
  const heading = e('h2', '', options.name);
  const counts = e('dl', 'deck-composition');
  for (const { label, value } of model.counts) {
    const pair = e('div'); pair.append(e('dt', '', label), e('dd', '', String(value))); counts.append(pair);
  }
  sidebar.append(art, fighter, heading, counts);
  const content = e('section', 'deck-view-content'); content.setAttribute('aria-label', 'Read-only decklist');
  const status = e('p', 'deck-view-counts', `${options.starter ? 'Normal starter · ' : ''}${model.mainCount} main · ${model.codexCount} Codex`);
  const makeCards = (entries: DeckViewModel['main'], label: string) => {
    const group = e('div', 'deck-view-grid'); group.setAttribute('aria-label', label);
    for (const entry of entries) {
      const button = e('button', 'deck-view-card');
      button.dataset.cardId = entry.id;
      button.setAttribute('aria-label', `${entry.card.name}, ${entry.group}, ${entry.copies} ${entry.copies === 1 ? 'copy' : 'copies'}. Inspect card`);
      const picture = e('span', 'deck-view-picture');
      const image = e('img'); image.src = artUrl(entry.card.thumb); image.alt = ''; image.loading = 'lazy';
      picture.append(image, e('span', 'deck-view-quantity', `×${entry.copies}`));
      button.title=entry.card.name;
      button.append(picture, e('span', 'deck-view-name', cardDisplayName(entry.card.name)));
      const inspect = () => options.inspect(entry.id, () => { if (button.isConnected) button.focus({ preventScroll: true }); });
      button.onclick = inspect;
      button.oncontextmenu = event => { event.preventDefault(); inspect(); };
      group.append(button);
    }
    return group;
  };
  content.append(status, makeCards(model.main, 'Main deck: grouped by Unit level and card type'));
  const codex = e('section', 'deck-view-codex');
  codex.append(e('h2', '', `Codex / ${model.codexCount}`), e('p', '', 'Held outside the main deck'), makeCards(model.codex, 'Codex cards'));
  content.append(codex);
  const footer = e('footer');
  const back = e('button', '', '‹ Back'); back.onclick = options.back;
  const hint = e('span', 'deck-view-hint', 'Read-only · Select a card to inspect');
  const copy = e('button', '', 'Copy deck code');
  const exportButton = e('button', '', 'Save deck image');
  const notice = e('div', 'deck-view-notice'); notice.setAttribute('role', 'status');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(options.code); notice.replaceChildren(e('p', '', 'Deck code copied.')); }
    catch {
      const field = e('textarea'); field.value = options.code; field.readOnly = true; field.setAttribute('aria-label', 'Deck code');
      notice.replaceChildren(e('p', '', 'Copy this code to share or import your deck.'), field);
      field.focus(); field.select();
      const close = e('button', '', 'Close'); close.onclick = () => { notice.replaceChildren(); copy.focus(); }; notice.append(close);
    }
  };
  exportButton.onclick = async () => {
    if (exportButton.disabled) return;
    exportButton.disabled = true; exportButton.textContent = 'Preparing image…'; notice.replaceChildren();
    try { await downloadDeckImage(model, options.name, options.region, options.starter, options.coverId); notice.append(e('p', '', 'Deck image downloaded. Share the deck code to let others import it.')); }
    catch (error) { notice.append(e('p', '', error instanceof Error ? error.message : 'Could not export this deck. Try again.')); }
    finally { exportButton.disabled = false; exportButton.textContent = 'Save deck image'; }
  };
  footer.append(back, hint, copy, exportButton);
  page.append(sidebar, content, notice);
  destinationShell(page, `${options.name} / Decklist`, footer);
  page.querySelector('.destination-crumb')?.remove();
  page.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('.modal-bg')) { event.preventDefault(); options.back(); }
  });
}
