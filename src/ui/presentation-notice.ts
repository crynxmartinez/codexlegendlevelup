import { waitFor } from './pace.js';
import { settings } from './settings.js';
import './check-reveal.css';
import { traceExposure, tracePresentation, traceContext, presentationTrace } from './presentation-diagnostics.js';

/** Screen-space placement; only public, already-revealed check cards use this. */
export function checkRevealPosition(mine: boolean, viewport: { width: number; height: number },
  size: { width: number; height: number }, anchor?: { left: number; right: number }): { left: number; top: number } {
  const edge = viewport.height <= 600 ? 8 : 72;
  const x = mine ? (anchor ? anchor.right + 12 : viewport.width - size.width - 12)
    : (anchor ? anchor.left - size.width - 12 : 12);
  return {
    left: Math.max(8, Math.min(viewport.width - size.width - 8, x)),
    top: Math.max(8, Math.min(viewport.height - size.height - 8, mine ? viewport.height - size.height - edge : edge)),
  };
}

const active = new Set<() => void>();
export function clearPresentationNotices(): void { for (const finish of [...active]) finish(); }

/** Informational only. Never registers a decision or answers a chooser. */
export function presentNotice(options: {
  title: string; detail: string;
  cards?: { name: string; image: string; inspect?: (node: HTMLElement) => void }[];
  anchor?: HTMLElement | null;
  checkReveal?: { mine: boolean; force: boolean };
}): Promise<void> {
  if (document.hidden) return Promise.resolve();
  return new Promise(resolve => {
    const notice = document.createElement('aside'); notice.className = 'duel-notice';
    if (options.checkReveal) notice.className += ` check-reveal-notice ${options.checkReveal.mine ? 'mine' : 'foe'}${options.checkReveal.force ? 'force' : ''}`;
    notice.setAttribute('role', 'status');
    const title = document.createElement('strong'); title.textContent = options.title;
    const detail = document.createElement('p'); detail.textContent = options.detail;
    const cards = document.createElement('div'); cards.className = 'duel-notice-cards';
    for (const card of options.cards ?? []) {
      const image = document.createElement('img'); image.src = card.image; image.alt = card.name;
      image.draggable = false; card.inspect?.(image); cards.append(image);
    }
    notice.append(title, cards, detail); document.body.append(notice);
    traceExposure(notice,options.checkReveal?'check':'notice');
    if(presentationTrace.enabled){
      const captured=traceContext();
      for(const image of Array.from(cards.querySelectorAll('img'))){
        if(image.complete&&image.naturalWidth)tracePresentation('art.ready',captured);
        else {tracePresentation('art.pending',captured);image.addEventListener('load',()=>tracePresentation('art.ready',captured),{once:true});image.addEventListener('error',()=>tracePresentation('art.failed',captured),{once:true});}
      }
    }
    const place = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const rect = options.anchor?.getBoundingClientRect();
      if (options.checkReveal) {
        const position = checkRevealPosition(options.checkReveal.mine, { width, height },
          { width: notice.offsetWidth, height: notice.offsetHeight }, rect ? { left: rect.left - left, right: rect.right - left } : undefined);
        notice.style.left = `${left + position.left}px`; notice.style.top = `${top + position.top}px`;
        return;
      }
      notice.style.left = `${left + Math.max(12, Math.min(width - notice.offsetWidth - 12, rect ? rect.left - left - notice.offsetWidth : (width - notice.offsetWidth) / 2))}px`;
      notice.style.top = `${top + Math.max(12, Math.min(height - notice.offsetHeight - 12, rect ? rect.top - top : height * .18))}px`;
    };
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      clearTimeout(timer); observer.disconnect();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', finish); window.removeEventListener('resize', place);
      active.delete(finish); notice.remove(); resolve();
    };
    const hidden = () => { if (document.hidden) finish(); };
    const observer = new MutationObserver(() => { if (!notice.isConnected) finish(); });
    observer.observe(document.body, { childList: true });
    const timer = setTimeout(finish, waitFor(settings().duelPace, 'importantResult') ?? 1600);
    active.add(finish); document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', finish); window.addEventListener('resize', place);
    place();
  });
}
