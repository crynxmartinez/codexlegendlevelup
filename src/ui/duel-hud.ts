/**
 * The layer that answers the questions the board cannot, on screen.
 *
 *   What just happened?   — the match log, and Last Action for the detail
 *   Why did it happen?    — Last Action: cost, target and result, labelled
 *   Why will this not go? — a refusal note beside the card, in the engine's
 *                           own words
 *
 * Three things have been removed from here, for one reason. An action banner
 * narrated every event; a status line said Now / Next / Waiting-for; a combat
 * calculator added the attack up. The board already carries all of it — the
 * match log narrates, the turn button reads GO TO BATTLE or WAITING, the
 * phase tab names the phase, the priority light says who holds it, and the
 * stat panels carry every number in the sum. A second copy is not redundancy,
 * it is a thing to read before you can look at the cards, and the banner's
 * copy fell behind the board besides.
 *
 * So what is left is only what nothing else says: the refusals, the hold for
 * an important beat, the source/target rings, and one live region, because a
 * screen reader has none of those board affordances.
 *
 * It implements `PresentationSink`, so it knows nothing about timing: the
 * queue decides when each beat happens and this decides what it looks like.
 * That split is the reason a pace change is a settings read rather than a
 * rewrite of the board.
 *
 * WHERE IT SITS. What remains is `position: fixed` and appears only while it
 * has something to say. The rules are in style.css but the intent is worth
 * stating here: this layer must never cover a targeted card, the hand, the
 * turn controls, the tutorial coach, the match log, or a decision modal.
 *
 * WHAT IT MUST NOT DO. It never names a card the viewer is not entitled to
 * see. The events carry that decision already — a hidden movement arrives
 * marked — and this only ever draws what it is handed.
 */
import type { PresentationSink, PresentedStep } from './presentation.js';
import { linesFor, type TimelineEntry } from './timeline.js';
import { playCue, duckMusic } from './sfx.js';
import { feedbackAt } from './battle-feedback.js';
import { glResource } from './fx-gl.js';
import { registerPresentationControl } from './duel-panel.js';

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/** What the HUD needs from the board it sits over. */
export interface HudHost {
  /** The rendered element for a card, if it is currently on screen. */
  nodeFor(uid: string): HTMLElement | null;
  /** A card's name, for the Last Action panel. */
  nameOf(uid: string): string;
  /** A card's thumbnail URL, for the Last Action panel. */
  thumbOf(uid: string): string | null;
  /** Open the Last Action panel. */
  onLastAction?: () => void;
  inspect?: (uid: string) => void;
}

/** "You" and "Opponent", never "Player 0". */
function actorName(actor: number | null): string {
  if (actor === null) return 'The duel';
  return actor === 0 ? 'You' : 'Opponent';
}

export class DuelHud implements PresentationSink {
  private readonly root: HTMLElement;
  private readonly live: HTMLElement;
  /** Nodes currently carrying a temporary class, so clear() is exact. */
  private marked: HTMLElement[] = [];
  private readonly readers = new Set<HTMLElement>();

  constructor(private readonly host: HudHost) {
    this.root = el('div', 'duel-hud');

    /**
     * One live region, and only public events reach it.
     *
     * `polite` rather than `assertive`: a screen reader that interrupts on
     * every card movement is unusable. Routine beats never reach the queue at
     * all, so only the handful of important events are spoken.
     */
    this.live = el('div', 'dh-live');
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    this.root.appendChild(this.live);

    document.body.appendChild(this.root);
  }

  destroy(): void {
    this.clear();
    for (const reader of this.readers) reader.remove();
    this.root.remove();
  }

  // --- PresentationSink ----------------------------------------------------

  /**
   * There is no banner.
   *
   * It was removed: the match log already narrates the duel, and a second
   * narration that ran on its own clock fell behind the board rather than
   * describing it. What is left of "announce" is the part the log cannot do —
   * putting the line where a screen reader will read it.
   *
   * Only public events are read aloud. An owner-only event is on screen for
   * the player it belongs to and must not be announced into a shared room.
   */
  announce(step: PresentedStep): void {
    const e = step.event;
    if (e.type === 'costPaid') {
      duckMusic();
      if (e.result?.outcome === 'offer') playCue('offer');
      feedbackAt(this.host.nodeFor(e.sourceUids[0] ?? ''), e.result?.outcome === 'offer' ? 'Ally Offered' : 'Cost paid');
    }
    if (e.visibility === 'public') {
      this.live.textContent = `${actorName(e.actor)}: ${e.message}`;
    }
  }

  highlightSource(uids: string[]): void {
    this.mark(uids, 'dh-src', 'Source');
  }

  highlightTarget(uids: string[]): void {
    this.mark(uids, 'dh-tgt', 'Target');
  }

  async move(step: PresentedStep): Promise<void> {
    // Pulse each destination zone. The card movement itself is already
    // animated by the board; this only says where it is going, because a card
    // that arrives without its destination having been named is a card that
    // appeared out of nowhere.
    for (const m of step.event.movements ?? []) {
      const zone = document.querySelector(`.mat${m.owner === 0 ? ':not(.foe)' : '.foe'} .z-${m.to}`);
      if (m.to === 'heart' || m.from === 'heart') {
        if (zone) { const r = zone.getBoundingClientRect(); glResource(r.x + r.width / 2, r.y + r.height / 2, 'babaylan'); }
        playCue(m.to === 'heart' ? 'essence' : 'vent');
        feedbackAt(zone ?? this.host.nodeFor(m.uid), m.to === 'heart' ? 'Into Heart' : `From Heart · ${m.to === 'ally' ? 'called to field' : m.to}`,
          'babaylan');
      }
      if (zone instanceof HTMLElement) {
        zone.classList.add('dh-dest');
        this.marked.push(zone);
      }
    }
  }

  /**
   * Nothing is drawn for a result.
   *
   * The board already says it: the match log names it, the Barrier row is one
   * shorter, the turn button reads GO TO BATTLE or WAITING, the phase tab
   * names the phase and the stat panels carry every number. A caption
   * repeating that is one more thing between the player and the cards.
   *
   * The spoken line still goes out, because a screen reader has none of those.
   */
  showResult(step: PresentedStep): void {
    const e = step.event;
    if (e.result && e.visibility === 'public') {
      this.live.textContent = e.result.detail ?? e.message;
    }
  }

  clear(): void {
    for (const n of this.marked) {
      n.classList.remove('dh-src', 'dh-tgt', 'dh-dest');
      n.removeAttribute('data-dh-label');
      n.querySelector(':scope > .dh-label')?.remove();
    }
    this.marked = [];
  }

  // --- last action ---------------------------------------------------------

  /** Draw one action group as a readable panel. */
  showEntry(entry: TimelineEntry, title = 'Last action'): HTMLElement {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bg = el('div', 'dh-panel-bg');
    bg.dataset.panelBrowse = 'true';
    registerPresentationControl(bg);
    const panel = el('div', 'dh-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    const head = el('div', 'dh-panel-head');
    head.appendChild(el('h3', undefined, title));
    const close = el('button', 'dh-panel-close', '×');
    close.setAttribute('aria-label', 'Close');
    close.onclick = () => bg.remove();
    head.appendChild(close);
    panel.appendChild(head);

    const content = el('div', 'dh-panel-content');
    const lines = el('div', 'dh-panel-lines');
    // Only the same visible source UIDs already available to the history reader.
    // The source is not conflated with a target or a newly called card.
    const sourceUid = entry.head.sourceUids.slice(0, 4).find(uid => !!this.host.thumbOf(uid));
    if (sourceUid) {
      const source = el('div', 'dh-panel-source');
      const image = el('img') as HTMLImageElement;
      image.src = this.host.thumbOf(sourceUid)!;
      image.alt = this.host.nameOf(sourceUid);
      source.append(image, el('strong', undefined, this.host.nameOf(sourceUid)));
      if (this.host.inspect) {
        const read = el('button', 'dh-source-read', 'Read source');
        read.onclick = () => this.host.inspect?.(sourceUid);
        source.append(read);
      }
      content.append(source);
    }

    for (const line of linesFor(entry)) {
      const row = el('div', `dh-line ${line.kind}`);
      row.appendChild(el('span', 'dh-tag', line.kind));
      row.appendChild(el('span', 'dh-text', line.text));
      for (const uid of line.uids.slice(0, 4)) {
        if (uid === sourceUid) continue;
        const t = this.host.thumbOf(uid);
        if (!t) continue;
        const img = el('img', 'dh-mini') as HTMLImageElement;
        img.src = t;
        img.alt = this.host.nameOf(uid);
        if (this.host.inspect) {
          const read = el('button', 'dh-card-inspect');
          read.setAttribute('aria-label', `Read ${this.host.nameOf(uid)}`);
          read.onclick = () => this.host.inspect?.(uid);
          read.appendChild(img); row.appendChild(read);
        } else row.appendChild(img);
      }
      lines.appendChild(row);
    }

    content.append(lines); panel.append(content);
    const footer = el('div', 'dh-panel-footer');
    const done = el('button', 'dh-panel-done', 'Close');
    done.onclick = () => bg.remove();
    footer.append(done); panel.append(footer);

    bg.appendChild(panel);
    bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); bg.remove(); }
      if (e.key === 'Tab') {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]'))
          .filter(node => node.getClientRects().length && !node.closest('[inert]'));
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
      }
    };
    // A nested card inspector owns its own Escape/focus. Listening locally
    // prevents that Escape from also removing this reader behind it.
    panel.addEventListener('keydown', onKey);
    const remove = bg.remove.bind(bg);
    let removed = false;
    bg.remove = () => {
      if (removed) return;
      removed = true;
      panel.removeEventListener('keydown', onKey); remove(); this.readers.delete(bg);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    document.body.appendChild(bg);
    this.readers.add(bg);
    close.focus();
    return bg;
  }

  /**
   * Say why a card will not act.
   *
   * A small, self-dismissing note beside the card rather than a modal: the
   * player clicked something expecting it to work, and stopping the game to
   * explain a refusal makes the refusal feel bigger than it is.
   */
  showRefusal(uid: string, reason: string, requirement?: string): void {
    const node = this.host.nodeFor(uid);
    const note = el('div', 'dh-why');
    note.setAttribute('role', 'status');
    note.appendChild(el('div', 'dh-why-reason', reason));
    if (requirement) note.appendChild(el('div', 'dh-why-req', requirement));
    if (node) {
      const r = node.getBoundingClientRect();
      note.style.left = `${Math.round(r.left + r.width / 2)}px`;
      note.style.top = `${Math.round(r.top - 8)}px`;
    } else {
      note.style.left = '50%';
      note.style.top = '18%';
    }
    this.root.appendChild(note);
    // Long enough to read a sentence, and it goes on its own — a refusal that
    // needs dismissing is a second thing the player has to do about a mistake.
    window.setTimeout(() => note.remove(), 2600);
  }

  // --- helpers -------------------------------------------------------------

  private mark(uids: string[], cls: string, label: string): void {
    for (const uid of uids) {
      const node = this.host.nodeFor(uid);
      if (!node) continue;
      node.classList.add(cls);
      // Colour alone is never the indicator.
      node.setAttribute('data-dh-label', label);
      node.querySelector(':scope > .dh-label')?.remove();
      node.appendChild(el('span', 'dh-label', label));
      this.marked.push(node);
    }
  }

}
