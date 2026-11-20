import { ALL_CARDS, isSelectableCard } from '../data/loader';
import { DRAFTS } from './drafts';
import { canApprove, editEntry, readEntries, sourceStamp, reconcileEntry } from './review-state';
import type { ReviewEntry } from './review-state';
import './review.css';

const STORAGE_KEY = 'codex.tagalog-review.v1';
const cards = Object.values(ALL_CARDS).filter(isSelectableCard).sort((a, b) =>
  Number(Boolean(DRAFTS[b.id])) - Number(Boolean(DRAFTS[a.id])) || a.deck.localeCompare(b.deck) || a.name.localeCompare(b.name));
let saved: Record<string, ReviewEntry> = {};
let storageWarning = '';
try { saved = readEntries(localStorage.getItem(STORAGE_KEY)); }
catch { storageWarning = 'Could not load saved reviews. Export your work before leaving this page.'; }
let selectedId = cards[0]!.id;
const root = document.querySelector<HTMLDivElement>('#review')!;
root.innerHTML = `<header><div><p class="eyebrow">CODEX LEGENDS / EDITORIAL WORKSPACE</p><h1>Tagalog, in your words.</h1><p>Review the meaning, not a word-for-word translation. English and gameplay stay unchanged.</p></div><a href="/">Back to game ↗</a></header>
<section class="notice"><a href="/title-review.html">Published Tagalog titles — all 141 cards, 3 options each ↗</a><br>${Object.keys(DRAFTS).length} Tagalog drafts · All ${cards.length} active cards listed · Keywords retained · Card = <strong>baraha</strong> · Discard = <strong>bitaw</strong> · Release = <strong>Pakawalan</strong><br>Tagalog is now the default card display in the game; switch to English in Settings. Your edits and approvals here are saved only in this browser and do not publish automatically. Export a backup to share your decisions.</section>
<div class="toolbar"><label>Deck<select id="deck"><option value="">All decks</option><option>Agta</option><option>Babaylan</option><option>Maguindanao</option></select></label><label>Status<select id="status"><option value="">All statuses</option><option value="draft">Draft ready</option><option value="pending">Awaiting draft</option><option value="approved">Approved</option><option value="revision">Needs revision</option></select></label><label>Find a card<input id="search" type="search" placeholder="English or Tagalog name"></label><button id="export">Export review backup</button><span id="progress"></span></div>
<p id="message" role="status"></p><main><nav aria-label="Cards to review" id="list"></nav><article id="editor"></article></main>`;
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const message = byId('message');
message.textContent = storageWarning;
function entryFor(id: string): ReviewEntry {
  const card = ALL_CARDS[id]!;
  const draft = DRAFTS[id] ?? { name: '', text: '' };
  const entry = saved[id] ?? { ...draft, notes: '', status: 'draft', source: sourceStamp(card), draftSource: sourceStamp(draft) };
  return reconcileEntry(entry, sourceStamp(card), draft);
}
function statusFor(id: string): string {
  const entry = entryFor(id);
  return canApprove(entry) ? entry.status : 'pending';
}
function persist(entry: ReviewEntry) {
  saved = { ...saved, [selectedId]: entry };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); message.textContent = 'Saved in this browser. Live game unchanged.'; }
  catch { message.textContent = 'Browser storage failed. Export a backup now to keep your work.'; }
  renderList();
}
function filteredCards() {
  const deck = byId<HTMLSelectElement>('deck').value;
  const status = byId<HTMLSelectElement>('status').value;
  const search = byId<HTMLInputElement>('search').value.toLocaleLowerCase();
  return cards.filter(c => (!deck || c.deck === deck) && (!status || statusFor(c.id) === status) &&
    (c.name + ' ' + entryFor(c.id).name).toLocaleLowerCase().includes(search));
}
function renderList() {
  const list = byId('list'); list.replaceChildren();
  for (const card of filteredCards()) {
    const button = document.createElement('button');
    button.textContent = `${card.name} · ${statusFor(card.id)}`;
    button.setAttribute('aria-current', String(card.id === selectedId));
    button.onclick = () => { selectedId = card.id; renderList(); renderEditor(); };
    list.append(button);
  }
  if (!list.children.length) list.textContent = 'No cards match these filters.';
  byId('progress').textContent = `${cards.filter(c => statusFor(c.id) === 'approved').length} / ${cards.length} approved`;
}
function renderEditor() {
  const card = ALL_CARDS[selectedId]!;
  const editor = byId('editor');
  editor.innerHTML = `<div class="card-heading"><div><p id="meta" class="eyebrow"></p><h2 id="card-title"></h2></div><span id="badge"></span></div><div class="review-body"><img id="art"><div class="wording"><div class="columns"><section><h3>English · original</h3><h4 id="english-name"></h4><pre id="english-text"></pre></section><section lang="tl"><h3>Tagalog · editable draft</h3><label>Pamagat<input id="name"></label><label>Skill wording<textarea id="text" rows="14"></textarea></label></section></div><label>Your notes<textarea id="notes" rows="2" placeholder="Tell us what should change…"></textarea></label><p class="hint">Bracketed tags are preserved game keywords. Editing the title or skills resets approval.</p><div class="actions"><button id="approve" class="primary">Approve this card</button><button id="revision">Needs revision</button><button id="next">Next card / skip →</button></div></div></div>`;
  byId('meta').textContent = `${card.deck} / ${card.type}`;
  byId('card-title').textContent = card.name;
  byId('english-name').textContent = card.name;
  byId('english-text').textContent = card.text;
  const latest = DRAFTS[selectedId];
  const prior = saved[selectedId];
  if (latest && prior && prior.draftSource !== sourceStamp(latest)) {
    const update = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Updated translation available — your saved wording has been preserved';
    const proposal = document.createElement('pre'); proposal.textContent = `${latest.name}\n\n${latest.text}`;
    const use = document.createElement('button'); use.textContent = 'Use updated translation';
    use.onclick = () => {
      persist({ ...entryFor(selectedId), ...latest, status: 'draft', source: sourceStamp(card), draftSource: sourceStamp(latest), previous: { name: prior.name, text: prior.text, notes: prior.notes, status: prior.status } });
      renderEditor();
    };
    update.append(summary, proposal, use); editor.prepend(update);
  }
  const art = byId<HTMLImageElement>('art'); art.src = '/' + card.art.replace(/^\/?assets\//, ''); art.alt = card.name;
  const refreshStatus = () => {
    byId('badge').textContent = statusFor(selectedId);
    byId<HTMLButtonElement>('approve').disabled = !canApprove(entryFor(selectedId));
  };
  for (const field of ['name', 'text', 'notes'] as const) {
    const input = byId<HTMLInputElement | HTMLTextAreaElement>(field);
    input.value = entryFor(selectedId)[field];
    input.oninput = () => { persist(editEntry(entryFor(selectedId), field, input.value)); refreshStatus(); };
  }
  byId('approve').onclick = () => {
    const entry = entryFor(selectedId);
    if (canApprove(entry)) persist({ ...entry, status: 'approved', source: sourceStamp(card), draftSource: sourceStamp(DRAFTS[selectedId] ?? { name: '', text: '' }) });
    renderEditor();
  };
  byId('revision').onclick = () => { persist({ ...entryFor(selectedId), status: 'revision' }); refreshStatus(); };
  byId('next').onclick = () => {
    const visible = filteredCards();
    if (!visible.length) return;
    selectedId = visible[(visible.findIndex(c => c.id === selectedId) + 1) % visible.length]!.id;
    renderList(); renderEditor();
  };
  refreshStatus();
}
for (const id of ['deck', 'status', 'search']) byId(id).addEventListener('input', renderList);
byId('export').onclick = () => {
  const entries = Object.fromEntries(cards.filter(c => saved[c.id] || DRAFTS[c.id]).map(c => [c.id, entryFor(c.id)]));
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'codex-tagalog-review.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
renderList(); renderEditor();
