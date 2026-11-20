import { warmCardArt } from './card-art-cache.js';
import { ALL_CARDS, isSelectableCard } from '../data/loader.js';
import { artUrl, boardUrl, CARD_BACK } from './assets.js';
import type { GameState } from '../core/types.js';
import { heritageAt } from '../data/loading-heritage.js';

let heritageCursor = 0;
function nextHeritage() {
  try { heritageCursor = Number(localStorage.getItem('codex.loading-heritage') ?? heritageCursor); } catch { /* In-memory rotation when storage is unavailable. */ }
  if (!Number.isSafeInteger(heritageCursor) || heritageCursor < 0) heritageCursor = 0;
  const fact = heritageAt(heritageCursor++);
  try { localStorage.setItem('codex.loading-heritage', String(heritageCursor)); } catch { /* Storage is optional. */ }
  return fact;
}

/** Online preloads the public catalogue, never requests an opponent's deck list. */
export function duelAssetUrls(game: GameState, online: boolean, detailed = false): string[] {
  const visible = Object.values(game.cards).flatMap(c => ALL_CARDS[c.defId] ? [ALL_CARDS[c.defId]!] : []);
  const records = online ? [...visible, ...Object.values(ALL_CARDS).filter(isSelectableCard)] : visible;
  if (detailed) return [...new Set(records.map(c => artUrl(c.art)))];
  return [...new Set([CARD_BACK, '/ui/game-mat-fractured-v1.webp', '/ui/fullscreen-fractured-v1.webp',
    '/ui/anime-v1/seal-solar-baybayin.webp',
    ...records.flatMap(c => [boardUrl(c.art), artUrl(c.thumb)])])];
}

/** Prepare battle portraits first. Continuing early leaves the queue running. */
export async function prepareDuelArt(images: string[], systems: {label: string; load: () => Promise<unknown>}[] = []): Promise<void> {
  const urls = [...new Set(images)].filter(Boolean);
  if (!urls.length && !systems.length) return;
  const overlay = document.createElement('section'); overlay.className = 'duel-loading';
  overlay.setAttribute('role', 'status');
  const title = document.createElement('h2'); title.textContent = 'Preparing your duel';
  const progress = document.createElement('progress'); progress.max = urls.length + systems.length; progress.value = 0;
  progress.setAttribute('aria-label', 'Battle preparation');
  const fact = nextHeritage();
  const story = document.createElement('article'); story.className = 'loading-heritage';
  const group = document.createElement('p'); group.className = 'loading-heritage-group'; group.textContent = `Our heritage · ${fact.community}`;
  const heading = document.createElement('h3'); heading.textContent = fact.title;
  const text = document.createElement('p'); text.textContent = fact.text;
  const source = document.createElement('a'); source.textContent = `Source: ${fact.source}`;
  source.href = fact.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
  story.append(group, heading, text, source);
  const status = document.createElement('p'); status.className = 'loading-detail';
  status.textContent = 'Preparing cards and animations…'; status.setAttribute('aria-live', 'polite');
  const skip = document.createElement('button'); skip.textContent = 'Continue while loading'; skip.hidden = true;
  const retry = document.createElement('button'); retry.textContent = 'Retry artwork'; retry.hidden = true;
  overlay.append(title, story, progress, status, retry, skip); document.body.append(overlay);
  let done = 0, closed = false, finish!: () => void;
  const dismissed = new Promise<void>(resolve => { finish = resolve; });
  skip.onclick = finish;
  let systemsDone = 0;
  const update = () => { progress.value = done + systemsDone; };
  update();
  const timer = setTimeout(() => {
    skip.hidden = false;
    status.textContent = 'Still loading. You can wait, or continue while artwork downloads.';
  }, 10000);
  const preparations = systems.map(async system => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([system.load(), new Promise<void>(resolve => { timeout = setTimeout(resolve, 15000); })]); }
    catch { /* Optional systems retain their built-in fallback. */ }
    finally { clearTimeout(timeout); systemsDone++; if(!closed)update(); }
  });
  const graphicsReady = Promise.all(preparations);
  const loadBatch = async (batch: string[]) => {
    const alreadyReady = done;
    const result = await warmCardArt(batch, report => { done = alreadyReady + report.ready; if (!closed) update(); });
    await graphicsReady;
    if (!result.failed.length) { finish(); return; }
    if (closed) return;
    status.textContent = 'Some artwork could not load. Retry, or continue with card placeholders.';
    skip.hidden = false; retry.hidden = false; retry.disabled = false;
    retry.onclick = () => { retry.disabled = true; status.textContent = 'Retrying artwork…'; void loadBatch(result.failed); };
  };
  void loadBatch(urls);
  try { await dismissed; }
  finally { closed = true; clearTimeout(timer); overlay.remove(); }
}
