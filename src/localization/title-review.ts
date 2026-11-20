import { ALL_CARDS } from '../data/loader';
import { CARD_LORE } from '../data/card-lore';
import { DRAFTS } from './drafts';
import { TITLE_PROPOSALS, PUBLISHED_TITLES, cardTitleType, characterName, editTitle, proposedName, readTitleDecisions, titleBaseline, titleDecision } from './title-state';
import type { TitleDecision } from './title-state';
import './review.css';
import './title-review.css';

const STORAGE_KEY = 'codex.tagalog-title-review.v1';
const typeOrder = ['Action', 'Unit', 'Sentry', 'Force', 'Codex', 'Persona'];
const ids = Object.keys(TITLE_PROPOSALS).sort((a, b) => typeOrder.indexOf(cardTitleType(ALL_CARDS[a]!)) - typeOrder.indexOf(cardTitleType(ALL_CARDS[b]!)));
let selected = ids[0]!;
let saved: Record<string, TitleDecision> = {};
let warning = '';
try { saved = readTitleDecisions(localStorage.getItem(STORAGE_KEY)); }
catch { warning = 'Saved titles could not be loaded. Use Export title decisions to keep a backup of this session.'; }
const root = document.querySelector<HTMLDivElement>('#review')!;
root.innerHTML = `<header><div><p class="eyebrow">CODEX LEGENDS / CREATIVE TITLES / ALL CARD TYPES</p><h1>Isang pangalan. Sariling dating.</h1><p>Creative Tagalog card titles—not word-for-word translations.</p></div><a href="/translation-review.html">Skill translation review ↗</a></header>
<section class="notice">${ids.length} cards · ${ids.length * 3} options · All recommended titles approved by the owner and published in Tagalog.<br>Actions come first. English and character identities stay unchanged. Further browser edits are review-only: export them to request another published revision. Existing saved edits are preserved.</section>
<div class="toolbar"><label>Deck<select id="deck"><option value="">All decks</option><option>Agta</option><option>Babaylan</option><option>Maguindanao</option></select></label><label>Card type<select id="type"><option value="">All types</option><option>Action</option><option>Unit</option><option>Sentry</option><option>Force</option><option>Codex</option><option>Persona</option></select></label><label>Status<select id="status"><option value="">All statuses</option><option value="draft">Draft</option><option value="approved">Approved title</option><option value="revision">Needs another direction</option><option value="skipped">Skipped</option></select></label><label>Find a card<input id="search" type="search" placeholder="Character, English name or proposed title"></label><button id="export">Export title decisions</button><span id="progress"></span></div><p id="message" role="status"></p><main><nav id="list" aria-label="Cards to review"></nav><article id="editor"></article></main>`;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
element('message').textContent = warning;
function baseline(id: string) { return titleBaseline(ALL_CARDS[id]!.name, TITLE_PROPOSALS[id]!); }
function decision(id: string) { return titleDecision(saved[id], baseline(id), PUBLISHED_TITLES[id]); }
function persist(entry: TitleDecision) {
  saved = { ...saved, [selected]: entry };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); element('message').textContent = 'Review edit saved in this browser. Export to request publication; the currently published title is unchanged.'; }
  catch { element('message').textContent = 'Browser storage is unavailable. Export your decisions before leaving.'; }
  renderList();
}
function visibleIds() {
  const deck = element<HTMLSelectElement>('deck').value;
  const status = element<HTMLSelectElement>('status').value;
  const query = element<HTMLInputElement>('search').value.trim().toLocaleLowerCase();
  const type = element<HTMLSelectElement>('type').value;
  return ids.filter(id => (!type || cardTitleType(ALL_CARDS[id]!) === type) && (!deck || ALL_CARDS[id]!.deck === deck) && (!status || decision(id).status === status) &&
    `${ALL_CARDS[id]!.name} ${TITLE_PROPOSALS[id]!.options.join(' ')} ${decision(id).title}`.toLocaleLowerCase().includes(query));
}
function renderList() {
  const list = element('list'); list.replaceChildren();
  for (const id of visibleIds()) {
    const button = document.createElement('button');
    button.textContent = `${DRAFTS[id]!.name} · ${cardTitleType(ALL_CARDS[id]!)} · ${decision(id).status}`;
    button.setAttribute('aria-current', String(selected === id));
    button.onclick = () => { selected = id; renderList(); renderEditor(); };
    list.append(button);
  }
  if (!list.children.length) list.textContent = 'No cards match these filters.';
  element('progress').textContent = `${ids.length} / ${ids.length} titles published · ${ids.filter(id => decision(id).status !== 'approved').length} saved review edits pending`;
}
function nextCard() {
  const visible = visibleIds();
  if (!visible.length) return;
  selected = visible[(visible.indexOf(selected) + 1) % visible.length]!;
  renderList(); renderEditor();
}
function renderEditor() {
  const card = ALL_CARDS[selected]!;
  const proposal = TITLE_PROPOSALS[selected]!;
  const entry = decision(selected);
  element('editor').innerHTML = `<div class="card-heading"><div><p id="meta" class="eyebrow"></p><h2 id="identity"></h2></div><span id="badge"></span></div><div class="review-body title-body"><img id="art"><div><p class="hint">English · unchanged</p><h3 id="english-name"></h3><p class="hint">Published Tagalog title · approved by owner</p><p id="current-name"></p><div id="options" class="title-options" role="group" aria-label="Proposed Tagalog titles"></div><p id="reason"></p><label lang="tl">Your title / Sarili mong pamagat<input id="title" maxlength="160" placeholder="Choose an option above or write a title"></label><p id="preview" lang="tl" aria-live="polite"></p><label>Notes / Another direction<textarea id="notes" rows="3" placeholder="What tone or meaning would you prefer?"></textarea></label><div class="actions"><button id="approve" class="primary">Approve title only</button><button id="revise">Request another direction</button><button id="skip">Skip for now</button><button id="next">Next card →</button></div><details><summary>Story and skill reference</summary><p id="story"></p><pre id="rules"></pre></details></div></div>`;
  element('meta').textContent = `${card.deck} / ${cardTitleType(card)} / Level ${card.level}`;
  element('identity').textContent = characterName(card.name);
  element('english-name').textContent = card.name;
  element('current-name').textContent = DRAFTS[selected]!.name;
  element('reason').textContent = `Why option A: ${proposal.reason}`;
  element('story').textContent = CARD_LORE[selected]?.story ?? 'No dedicated story note is stored for this card. Proposals use the existing card identity and theme; they are creative suggestions, not traditional epithets or new lore.';
  element('rules').textContent = card.text;
  const art = element<HTMLImageElement>('art'); art.src = '/' + card.art.replace(/^\/?assets\//, ''); art.alt = card.name;
  const title = element<HTMLInputElement>('title'); title.value = entry.title;
  const notes = element<HTMLTextAreaElement>('notes'); notes.value = entry.notes;
  for (const [i, candidate] of proposal.options.entries()) {
    const button = document.createElement('button'); button.className = 'title-option';
    button.textContent = `${String.fromCharCode(65 + i)}${i === 0 ? ' · Recommended' : ''}\n${proposedName(card.name, candidate)}`;
    button.dataset.title = candidate;
    button.onclick = () => { persist(editTitle(decision(selected), candidate)); title.value = candidate; refreshSelection(); };
    element('options').append(button);
  }
  function refreshSelection() {
    const current = decision(selected);
    element('badge').textContent = current.status;
    element('preview').textContent = current.title.trim() ? proposedName(card.name, current.title) : 'No title selected yet. Recommendations are not approvals.';
    element<HTMLButtonElement>('approve').disabled = !current.title.trim();
    for (const button of Array.from(element('options').querySelectorAll<HTMLButtonElement>('button'))) {
      button.setAttribute('aria-pressed', String(button.dataset.title === current.title));
    }
  }
  title.oninput = () => { persist(editTitle(decision(selected), title.value)); refreshSelection(); };
  notes.oninput = () => persist({ ...decision(selected), notes: notes.value });
  element('approve').onclick = () => {
    const current = decision(selected);
    if (current.title.trim()) persist({ ...current, status: 'approved', baseline: baseline(selected) });
    refreshSelection();
  };
  element('revise').onclick = () => { persist({ ...decision(selected), status: 'revision' }); refreshSelection(); };
  element('skip').onclick = () => { persist({ ...decision(selected), status: 'skipped' }); renderEditor(); nextCard(); };
  element('next').onclick = nextCard;
  refreshSelection();
}
for (const id of ['deck', 'type', 'status', 'search']) element(id).addEventListener('input', renderList);
element('export').onclick = () => {
  const entries = Object.fromEntries(ids.map(id => [id, { ...decision(id), englishName: ALL_CARDS[id]!.name,
    proposedName: decision(id).title.trim() ? proposedName(ALL_CARDS[id]!.name, decision(id).title) : null }]));
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, kind: 'all-card-title-decisions', publishedTitles: PUBLISHED_TITLES, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'codex-tagalog-title-decisions.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
renderList(); renderEditor();
