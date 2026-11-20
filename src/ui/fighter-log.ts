import { DISPLAY_CARDS } from '../localization/display.js';
import { MATCH_INDEX } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';
import { artUrl, CARD_BACK } from './assets.js';
import { destinationShell, menuElement as e } from './menu-destination.js';
import { initReplayStore, loadReplays, replayStorageError, describeResult, describeWhen, type StoredReplay } from './replay-store.js';
import { LocalReplaySession, recordingUnavailable } from './local-match-recording.js';
import { ReplayPlayer } from './replay-player.js';
import { settings } from './settings.js';
import './fighter-log.css';

function action(label: string, run: () => void, cls = ''): HTMLButtonElement {
  const button = e('button', cls, label); button.type = 'button'; button.onclick = run; return button;
}
function cardImage(id?: string, cls = ''): HTMLImageElement {
  const img = e('img', cls); const card = id ? DISPLAY_CARDS[id] : undefined;
  img.src = card?.thumb ? artUrl(card.thumb) : CARD_BACK; img.alt = card?.name ?? 'Artwork not recorded';
  img.onerror = () => { img.onerror = null; img.src = CARD_BACK; }; return img;
}
function knownOpponent(entry: StoredReplay): string {
  const viewer = entry.summary.viewer;
  return viewer === undefined ? 'Opponent not recorded' : entry.summary.players?.[1 - viewer]?.nickname || 'Opponent not recorded';
}
function deckLabel(entry: StoredReplay): string {
  const s = entry.summary;
  return s.viewer === undefined ? s.name || 'Legacy match record' : s.decks?.[s.viewer] || 'Deck name not recorded';
}
function makeDialog(title: string, cls: string, onClose?: () => void) {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = e('dialog', cls); dialog.setAttribute('aria-label', title);
  const footer = e('footer'); const back = action('‹ Back', () => dialog.close());
  footer.append(back); destinationShell(dialog, title, footer);
  let ignoredCloses = 0, disposed = false;
  const finish = () => { if (disposed) return; disposed = true; dialog.remove(); onClose?.(); if (opener?.isConnected) opener.focus(); };
  dialog.addEventListener('close', () => { if (ignoredCloses) { ignoredCloses--; return; } finish(); });
  document.body.append(dialog); dialog.showModal(); back.focus();
  return { dialog, footer, back, finish,
    suspend: () => { if (dialog.open) { ignoredCloses++; dialog.close(); dialog.hidden = true; } },
    resume: (target: HTMLElement) => { if (disposed || !dialog.isConnected) return; dialog.hidden = false; dialog.showModal(); target.focus(); },
  };
}

export interface FighterLogOptions { onBack?: () => void; onPatchNotes: () => void | Promise<void>; onFeedback: () => void | Promise<void> }
/** Real local records only. The approved design examples are never loaded as match data. */
export function openFighterLog(options: FighterLogOptions): () => void {
  const { dialog, footer, suspend, resume, finish } = makeDialog('Fighter Log', 'fighter-log-screen', options.onBack);
  footer.append(e('span', '', 'Saved on this device · completed local AI matches'));
  const toolbar = e('div', 'fighter-log-toolbar');
  const all = action('✓ All records', () => { onlyPlayable = false; refresh(); }, 'selected');
  const recorded = action('Playable recordings', () => { onlyPlayable = true; refresh(); });
  // Existing utility panels are normal DOM overlays. A native modal must leave
  // the top layer while they are open, retaining its rows/selection underneath.
  let relatedCleanup: (() => void) | null = null;
  const openRelated = (run: () => void | Promise<void>, selector: string, target: HTMLElement) => {
    if (relatedCleanup) return;
    suspend();
    let seen = false, ended = false;
    const restore = () => {
      if (ended) return; ended = true; observer.disconnect(); clearTimeout(openTimeout);
      relatedCleanup = null; resume(target);
    };
    const observer = new MutationObserver(() => {
      const open = document.querySelector(selector);
      if (open) seen = true; else if (seen) restore();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'inert'] });
    const openTimeout = setTimeout(() => { if (!seen) restore(); }, 10000);
    relatedCleanup = () => { ended = true; observer.disconnect(); clearTimeout(openTimeout); relatedCleanup = null; };
    try {
      const opened = run(); seen = Boolean(document.querySelector(selector));
      void Promise.resolve(opened).catch(error => { console.warn('Could not open related panel', error); restore(); });
    }
    catch (error) { console.warn('Could not open related panel', error); restore(); }
  };
  const links = e('div');
  const patchNotes = action('Patch notes', () => openRelated(options.onPatchNotes, '.devlog-bg', patchNotes));
  const feedback = action('Feedback', () => openRelated(options.onFeedback, '.feedback.open', feedback));
  links.append(patchNotes, feedback);
  toolbar.append(all, recorded, links);
  const layout = e('div', 'fighter-log-layout');
  const listPane = e('section', 'fighter-log-pane'); listPane.append(e('h2', '', 'Your matches'));
  const list = e('div', 'fighter-log-list'); listPane.append(list);
  const detailPane = e('section', 'fighter-log-pane'); detailPane.append(e('h2', '', 'Match details'));
  const details = e('div', 'fighter-log-details'); detailPane.append(details); layout.append(listPane, detailPane);
  const notice = e('p', 'fighter-log-notice', 'Reading saved matches…'); notice.setAttribute('role', 'status');
  dialog.append(toolbar, layout, notice);
  let rows: StoredReplay[] = [], selected: string | null = null, onlyPlayable = false;
  function show(row: StoredReplay) {
    selected = row.summary.id;
    for (const button of Array.from(list.querySelectorAll<HTMLButtonElement>('button'))) {
      const active = button.dataset.record === selected; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
    }
    details.replaceChildren();
    const s = row.summary, viewer = s.viewer;
    const hero = e('div', 'fighter-log-hero');
    hero.append(cardImage(viewer === undefined ? undefined : s.personas?.[viewer]));
    const words = e('div'); words.append(e('p', 'fighter-log-result', describeResult(s)), e('h3', '', deckLabel(row)));
    const facts = e('dl', 'fighter-log-facts');
    const persona = viewer === undefined ? undefined : s.personas?.[viewer];
    for (const [label, value] of [
      ['Archipelago', viewer === undefined ? 'Not recorded' : s.players?.[viewer]?.region || 'Not recorded'],
      ['Mode', s.mode === 'ai' ? 'VS AI' : s.mode === 'pvp' ? 'PvP' : 'Not recorded'],
      ['Recorded Persona', persona ? DISPLAY_CARDS[persona]?.name ?? 'Unavailable card' : 'Not recorded'],
      ['Opponent', knownOpponent(row)],
      ['Date', Number.isFinite(Date.parse(s.recordedAt)) ? new Date(s.recordedAt).toLocaleString() : 'Not recorded'],
      ['Decks', Array.isArray(s.decks) ? s.decks.join(' / ') : 'Not recorded'],
    ]) { facts.append(e('dt', '', label), e('dd', '', value)); }
    words.append(facts); hero.append(words); details.append(hero);
    const reason = recordingUnavailable(row);
    const actions = e('div', 'fighter-log-actions');
    const view = action('View details', () => { eventList.hidden = !eventList.hidden; view.setAttribute('aria-expanded', String(!eventList.hidden)); });
    view.setAttribute('aria-expanded', 'false');
    const watch = action('▶ Watch match', () => openRecordedMatch(row), 'primary'); watch.disabled = Boolean(reason);
    const eventList = e('div', 'fighter-log-events'); eventList.hidden = true;
    eventList.append(e('h3', '', 'Recorded facts'), e('p', '', `${describeResult(s)}. ${knownOpponent(row)}.`));
    eventList.append(e('p', '', `End reason: ${s.reason ?? 'Not recorded'}. Duration: ${s.seconds === undefined ? 'Not recorded' : `${s.seconds} seconds`}.`));
    eventList.append(e('p', '', 'The recording reconstructs completed local AI decisions. Opponent hands and face-down Barriers stay hidden.'));
    actions.append(view, watch); details.append(actions, e('p', 'fighter-log-status', reason ?? 'Compatible local recording · read-only playback'), eventList);
  }
  function refresh() {
    all.classList.toggle('selected', !onlyPlayable); all.textContent = `${onlyPlayable ? '' : '✓ '}All records`;
    recorded.classList.toggle('selected', onlyPlayable); recorded.textContent = `${onlyPlayable ? '✓ ' : ''}Playable recordings`;
    all.setAttribute('aria-pressed', String(!onlyPlayable)); recorded.setAttribute('aria-pressed', String(onlyPlayable));
    const shown = onlyPlayable ? rows.filter(r => !recordingUnavailable(r)) : rows;
    list.replaceChildren();
    for (const row of shown) {
      const s = row.summary, viewer = s.viewer;
      const button = action('', () => show(row), 'fighter-log-record'); button.dataset.record = s.id;
      const text = e('span'); text.append(e('strong', '', deckLabel(row)), e('span', '', knownOpponent(row)), e('small', '', `${describeWhen(s.recordedAt)} · ${describeResult(s)}`));
      button.append(cardImage(viewer === undefined ? undefined : s.personas?.[viewer]), text); list.append(button);
    }
    const chosen = shown.find(row => row.summary.id === selected) ?? shown[0];
    if (chosen) show(chosen);
    else {
      list.append(e('p', 'fighter-log-empty', onlyPlayable ? 'No compatible recordings are available.' : 'No completed matches saved here yet.'));
      details.replaceChildren(e('h3', '', 'Your next completed AI match can appear here.'), e('p', '', 'Only successfully saved local records are listed. PvP and tutorial recordings are unavailable.'), e('p', '', 'History during a duel remains available.'));
    }
  }
  void initReplayStore().then(() => {
    if (!dialog.isConnected) return;
    rows = loadReplays(); notice.textContent = replayStorageError() ? `Local storage unavailable: ${replayStorageError()}. Existing readable records are preserved.` : 'Local records only. Unknown legacy details stay unknown.';
    refresh();
  });
  return () => { relatedCleanup?.(); if (dialog.open) dialog.close(); else finish(); };
}

export interface RecordedMatchOptions { group?: number; onClose?: () => void }
export function openRecordedMatch(entry: StoredReplay, options: RecordedMatchOptions = {}): () => void {
  const { dialog, footer } = makeDialog(options.group === undefined ? 'Recorded match' : 'Watch this exchange', 'recorded-match-screen', options.onClose);
  const reason = recordingUnavailable(entry, options.group);
  if (reason) { dialog.append(e('p', 'recorded-match-error', reason)); return () => dialog.close(); }
  let session: LocalReplaySession;
  try { session = new LocalReplaySession(entry, MATCH_INDEX); }
  catch (error) { dialog.append(e('p', 'recorded-match-error', `Recording unavailable: ${String(error)}`)); return () => dialog.close(); }
  const range = options.group === undefined ? { start: 0, end: entry.replay.steps.length } : entry.localCapture!.exchanges.find(r => r.group === options.group)!;
  const status = e('p', 'recorded-match-status'); status.setAttribute('role', 'status');
  const board = e('section', 'recorded-match-board');
  const timeline = e('ol', 'recorded-match-events');
  const body = e('div', 'recorded-match-body'); body.append(board, timeline); dialog.append(status, body);
  let disposed = false;
  const ownedTimers = new Map<ReturnType<typeof setTimeout>, () => void>();
  const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(() => { ownedTimers.delete(timer); resolve(); }, ms); ownedTimers.set(timer, resolve); });
  const pace = () => settings().duelPace === 'fast' ? 500 : settings().duelPace === 'learning' ? 1200 : 850;
  const render = () => {
    if (disposed) return;
    const view = playerView(session.game, entry.summary.viewer!, null, session.game.duel?.events ?? []);
    board.replaceChildren();
    for (const seat of [1, 0] as const) {
      const row = e('section', 'recorded-match-side'); const player = view.players[seat];
      row.append(e('h2', '', `${seat === 0 ? 'You' : knownOpponent(entry)} · ${player.barriers.length} Barriers · ${player.hand.length} cards in hand`));
      const field = e('div', 'recorded-match-field');
      for (const uid of [player.allies[0], player.allies[1], player.persona, player.allies[2], player.allies[3]]) {
        const slot = e('figure');
        if (uid) {
          const card = view.cards[uid];
          slot.append(cardImage(card?.defId), e('figcaption', '', card ? DISPLAY_CARDS[card.defId]?.name ?? 'Hidden card' : 'Empty'));
          const battle = view.activeBattle;
          if (battle?.attacker === uid) slot.append(e('span', 'recorded-match-marker', 'Attacker'));
          if (battle?.target === uid) slot.append(e('span', 'recorded-match-marker', 'Target'));
        }
        else slot.append(e('span', 'recorded-match-vacant', 'Ally'));
        field.append(slot);
      }
      row.append(field);
      if (seat === 0) { const hand = e('div', 'recorded-match-hand'); for (const uid of player.hand) hand.append(cardImage(view.cards[uid]?.defId)); row.append(hand); }
      board.append(row);
    }
    timeline.replaceChildren();
    const events = (view.duel?.events ?? []).filter(event => options.group === undefined || event.group === options.group);
    for (const event of events.slice(-12)) timeline.append(e('li', '', `Turn ${event.turn} · ${event.message}`));
    if (!events.length) timeline.append(e('li', '', 'Ready at the recorded starting position.'));
  };
  const mark = async (message: string) => { if (disposed || !player.position.playing) return; status.textContent = message; render(); await wait(pace()); };
  const play = action('▶ Play', () => { if (player.position.index >= range.end) void player.seek(range.start).then(() => { if (!disposed && !player.position.broken) player.play(); }); else player.play(); }, 'primary');
  const pause = action('Pause', () => player.pause());
  const previous = action('‹ Step', () => void player.seek(Math.max(range.start, player.position.index - 1)));
  const next = action('Step ›', () => void player.seek(Math.min(range.end, player.position.index + 1)));
  const position = e('span'); footer.append(previous, play, pause, next, position);
  const player = new ReplayPlayer(entry.replay.steps, {
    reset: async () => { session.reset(); },
    apply: async step => {
      const animate = player.position.playing && !disposed;
      session.setHooks(animate ? {
        onAttackDeclared: async () => mark('Recorded attack declared'),
        onBlockingStart: async () => mark('Recorded defense decision'),
        onAttackResolved: async (_battle, result) => mark(result.hit ? 'Recorded attack connected' : 'Recorded attack stopped'),
        onCardCalled: async uid => mark(`Calling ${DISPLAY_CARDS[session.game.cards[uid]?.defId ?? '']?.name ?? 'a Unit'}`),
        onAbilityActivated: async (_uid, label) => mark(label),
      } : {});
      await session.apply(step);
    }, render,
    onError: error => { if (!disposed) status.textContent = `Playback stopped: ${String(error)}. The saved record has not been changed.`; },
    onChange: current => {
      if (disposed) return;
      if (current.playing && current.index >= range.end) { player.pause(); return; }
      play.disabled = current.playing || current.broken; pause.disabled = !current.playing;
      previous.disabled = current.playing || current.index <= range.start; next.disabled = current.playing || current.index >= range.end;
      play.textContent = current.index >= range.end ? '↻ Replay' : '▶ Play';
      position.textContent = `Step ${current.index} / ${range.end}`;
      if (!current.broken) status.textContent = current.index >= range.end ? 'Recorded exchange complete · return to review when ready.' : `Read-only local recording · Turn ${current.turn}`;
    },
  }, { interval: pace });
  const visibility = () => { if (document.hidden) player.pause(); };
  document.addEventListener('visibilitychange', visibility);
  dialog.addEventListener('close', () => {
    disposed = true; player.destroy(); document.removeEventListener('visibilitychange', visibility);
    for (const [timer, resolve] of ownedTimers) { clearTimeout(timer); resolve(); } ownedTimers.clear();
  }, { once: true });
  void player.seek(range.start);
  return () => { if (dialog.open) dialog.close(); };
}
