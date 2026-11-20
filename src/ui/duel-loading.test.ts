import { afterEach, expect, it, vi } from 'vitest';
import { duelAssetUrls, prepareDuelArt } from './duel-loading.js';
import { prepareCardArt, warmCardArt } from './card-art-cache.js';
import { createGame } from '../core/setup.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
import { playerView } from '../pvp/view.js';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('uses the same public catalogue regardless of concealed opponent deck', () => {
  const game = createGame(MATCH_INDEX, [STARTERS.Mindanao!, STARTERS.Luzon!], {seed:2});
  const view = playerView(game, 0, null, []);
  const urls = duelAssetUrls(view, true);
  const detailUrls = duelAssetUrls(view, true, true);
  for (const card of Object.values(view.cards)) if (card.owner === 1 && card.faceDown) card.defId = 'private-secret';
  expect(duelAssetUrls(view, true)).toEqual(urls);
  expect(duelAssetUrls(view, true, true)).toEqual(detailUrls);
  expect(urls.some(url => url.includes('__hidden__') || url.includes('private-secret'))).toBe(false);
  expect(urls).toContain('/ui/card-back.webp');
  expect(new Set(urls).size).toBe(urls.length);
});

it('keeps failed artwork on the loading screen until retry succeeds or the player continues', async () => {
  vi.useFakeTimers();
  const body = loadingDocument();
  const images: { onload: () => void; onerror: () => void }[] = [];
  vi.stubGlobal('Image', class {
    src=''; decoding=''; onload=()=>{}; onerror=()=>{}; decode=async()=>{};
    constructor(){ images.push(this); }
  });
  const done = vi.fn();
  const loading = prepareDuelArt(['/retry-overlay.webp']).then(done);
  images[0]!.onerror(); await vi.advanceTimersByTimeAsync(0);
  images[1]!.onerror(); await vi.advanceTimersByTimeAsync(0);
  expect(done).not.toHaveBeenCalled();
  expect(body.children[0]!.children.some(n => n.textContent.includes('could not load'))).toBe(true);
  body.children[0]!.children.find(n => n.textContent === 'Retry artwork')!.onclick!();
  images[2]!.onload(); await loading;
  expect(body.children[0]!.removed).toBe(true);
});
it('waits for loading and decoding, shares work and retries failed art', async () => {
  const images: FakeImage[] = [];
  class FakeImage {
    src=''; decoding=''; onload!:()=>void; onerror!:()=>void;
    decode = vi.fn(async()=>{});
    constructor(){images.push(this);}
  }
  vi.stubGlobal('Image',FakeImage);
  const first = prepareCardArt('/test-ready.webp');
  expect(prepareCardArt('/test-ready.webp')).toBe(first);
  images[0]!.onload(); expect(await first).toBe(true);
  expect(images[0]!.decode).toHaveBeenCalledOnce();
  const failed = prepareCardArt('/test-failed.webp'); images[1]!.onerror();
  expect(await failed).toBe(false);
  const retry = prepareCardArt('/test-failed.webp'); images[2]!.onload(); expect(await retry).toBe(true);
});
it('a stalled image cannot block loading forever', async()=>{
  vi.useFakeTimers(); vi.stubGlobal('Image',class { src=''; decoding=''; });
  const loading = prepareCardArt('/test-stalled.webp');
  await vi.advanceTimersByTimeAsync(12000); expect(await loading).toBe(false);
});

function loadingDocument() {
  class Node {
    children: Node[]=[]; textContent=''; className=''; removed=false;
    onclick?:()=>void;
    setAttribute() {}
    append(...nodes:Node[]){this.children.push(...nodes);}
    remove(){this.removed=true;}
  }
  const body=new Node(); vi.stubGlobal('document',{body,createElement:()=>new Node()});
  return body;
}
it('keeps the loading screen until animation preparation completes', async()=>{
  const body=loadingDocument(); let finish!:()=>void;
  const ready=new Promise<void>(resolve=>{finish=resolve;});
  const done=vi.fn(); const loading=prepareDuelArt([],[{label:'animations',load:()=>ready}]).then(done);
  await Promise.resolve(); expect(done).not.toHaveBeenCalled();
  const story = body.children[0]!.children[1]!;
  expect(story.className).toBe('loading-heritage');
  expect(story.children[0]!.textContent).toContain('Our heritage');
  expect(story.children[2]!.textContent.length).toBeGreaterThan(40);
  expect(body.children[0]!.children.some(node => /images ready|Effects ready/.test(node.textContent))).toBe(false);
  finish(); await loading; expect(body.children[0]!.removed).toBe(true);
});
it('an optional graphics failure or timeout cannot strand the player', async()=>{
  let body=loadingDocument();
  await prepareDuelArt([],[{label:'animations',load:async()=>{throw new Error('No WebGL');}}]);
  expect(body.children[0]!.removed).toBe(true);
  vi.useFakeTimers(); body=loadingDocument();
  const loading=prepareDuelArt([],[{label:'animations',load:()=>new Promise(()=>{})}]);
  await vi.advanceTimersByTimeAsync(15000); await loading;
  expect(body.children[0]!.removed).toBe(true);
});

it('retries failed downloads and reports failures separately from ready images', async () => {
  const attempts = new Map<string, number>();
  const loader = vi.fn(async (url: string) => {
    attempts.set(url, (attempts.get(url) ?? 0) + 1);
    return url !== 'missing' && (url !== 'retry' || attempts.get(url) === 2);
  });
  const report = await warmCardArt(['ok', 'retry', 'missing', 'ok'], undefined, loader);
  expect(report.ready).toBe(2);
  expect(report.failed).toEqual(['missing']);
  expect(attempts.get('ok')).toBe(1);
  expect(attempts.get('retry')).toBe(2);
});

it('continuing early keeps downloading the remaining artwork', async () => {
  vi.useFakeTimers();
  const body = loadingDocument();
  const images: { src: string; onload: () => void; decode: () => Promise<void> }[] = [];
  vi.stubGlobal('Image', class {
    src=''; decoding=''; onload=()=>{}; decode=async()=>{};
    constructor(){ images.push(this); }
  });
  const loading = prepareDuelArt(Array.from({length:10}, (_,i)=>`/continue-${i}.webp`));
  await vi.advanceTimersByTimeAsync(10000);
  const overlay = body.children[0]!;
  overlay.children.find(n=>n.textContent === 'Continue while loading')!.onclick!();
  await loading;
  const first = [...images]; first.forEach(image=>image.onload());
  await vi.advanceTimersByTimeAsync(0);
  expect(images.length).toBeGreaterThan(first.length);
  for (let i=0;i<images.length;i++) { images[i]!.onload(); await vi.advanceTimersByTimeAsync(0); }
});
