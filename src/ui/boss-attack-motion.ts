import type { BossAttackProfile } from './boss-attack-profiles.js';
import { motionDuration, motionEpoch, motionReduced, playMotion } from './duel-motion.js';

/** Frame metadata is decorative; it never determines damage or hit count. */
export interface BossAttackSheet {
  url: string;
  columns: number;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  firstFrame?: number;
  frames?: number;
  /** Legacy metadata is accepted but V2 art always faces right. */
  rotationDegrees?: number;
}
export interface BossAttackAsset {
  formation?: BossAttackSheet;
  travel: BossAttackSheet;
  impact?: BossAttackSheet;
  dispersal?: BossAttackSheet;
}
export type BossAttackPhase = 'formation' | 'travel' | 'impact' | 'dispersal';
export type BossAttackOutcome = 'hit' | 'blocked' | 'sentry' | 'cancelled';
export interface BossAttackPlayback {
  mode: 'sprite' | 'reduced' | 'fallback' | 'prevented' | 'skipped' | 'cancelled';
  assetReady: boolean;
  contactCount: number;
  elapsedMs: number;
  interrupted: boolean;
}
export interface BossAttackOptions {
  profile: BossAttackProfile;
  from: DOMRect;
  to: DOMRect;
  outcome: BossAttackOutcome;
  impact: () => void;
  signal?: AbortSignal;
  /** Optional fixed-coordinate host for native-dialog presentation previews. */
  host?: HTMLElement;
}

const assets = new Map<string, BossAttackAsset>();
const images = new Map<string, { promise: Promise<boolean>; ready: boolean; expires: number; width: number; height: number }>();
const phaseNames: readonly BossAttackPhase[] = ['formation', 'travel', 'impact', 'dispersal'];
const frameLength = (sheet: BossAttackSheet): number => sheet.frames ?? sheet.frameCount - (sheet.firstFrame ?? 0);
function assetSheets(asset: BossAttackAsset): BossAttackSheet[] {
  return phaseNames.map(phase => asset[phase]).filter((sheet): sheet is BossAttackSheet => !!sheet);
}
function validSheet(sheet: BossAttackSheet): boolean {
  const first = sheet.firstFrame ?? 0, count = frameLength(sheet);
  return !!sheet.url && [sheet.columns, sheet.frameCount, sheet.frameWidth, sheet.frameHeight, count]
    .every(n => Number.isInteger(n) && n > 0)
    && Number.isInteger(first) && first >= 0 && first + count <= sheet.frameCount;
}

/** Exact card IDs take priority over a legacy family registration. */
export function registerBossAttackAssets(manifest: Readonly<Record<string, BossAttackAsset>>): void {
  for (const [key, asset] of Object.entries(manifest)) {
    if (!asset.travel || !assetSheets(asset).every(validSheet)) {
      throw new Error('Invalid boss attack sheet: ' + key);
    }
    assets.set(key, {
      travel: { ...asset.travel },
      ...(asset.formation ? { formation: { ...asset.formation } } : {}),
      ...(asset.impact ? { impact: { ...asset.impact } } : {}),
      ...(asset.dispersal ? { dispersal: { ...asset.dispersal } } : {}),
    });
  }
}

function profileAssets(profile: BossAttackProfile): BossAttackAsset {
  const registered = assets.get(profile.id) ?? assets.get(profile.assetKey);
  if (registered) return registered;
  const authored = profile.travelAsset;
  const sheet: BossAttackSheet = {
    url: authored.src, frameCount: authored.frames, columns: authored.columns,
    frameWidth: authored.frameSize, frameHeight: authored.frameSize,
  };
  // The profile URL remains a safe fallback if the production registry was not imported.
  if (sheet.frameCount === 16) return {
    formation: { ...sheet, firstFrame: 0, frames: 3 },
    travel: { ...sheet, firstFrame: 3, frames: 7 },
    impact: { ...sheet, firstFrame: 10, frames: 4 },
    dispersal: { ...sheet, firstFrame: 14, frames: 2 },
  };
  return { travel: sheet };
}

function sheetReady(sheet: BossAttackSheet): boolean {
  const image = images.get(sheet.url);
  return !!image?.ready && image.width === sheet.columns * sheet.frameWidth
    && image.height === Math.ceil(sheet.frameCount / sheet.columns) * sheet.frameHeight;
}
function preloadSheet(sheet: BossAttackSheet, timeoutMs: number): Promise<boolean> {
  const url = sheet.url;
  const cached = images.get(url);
  if (cached && cached.expires > Date.now()) return cached.promise.then(() => sheetReady(sheet));
  if (typeof Image === 'undefined') return Promise.resolve(false);
  const entry = { promise: Promise.resolve(false), ready: false, expires: Infinity, width: 0, height: 0 };
  entry.promise = new Promise<boolean>(resolve => {
    const image = new Image();
    let settled = false, decoding = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null; image.onerror = null;
      entry.ready = ready;
      entry.width = image.naturalWidth; entry.height = image.naturalHeight;
      entry.expires = ready ? Infinity : Date.now() + 15000;
      resolve(ready);
    };
    const loaded = () => {
      if (settled || decoding) return;
      if (image.naturalWidth !== sheet.columns * sheet.frameWidth
        || image.naturalHeight !== Math.ceil(sheet.frameCount / sheet.columns) * sheet.frameHeight) {
        finish(false); return;
      }
      decoding = true;
      if (typeof image.decode === 'function') {
        // Decode shares the download timeout; a stalled decoder cannot block play.
        void Promise.resolve().then(() => image.decode()).then(() => finish(true), () => finish(false));
      } else finish(true);
    };
    image.onload = loaded;
    image.onerror = () => finish(false);
    timer = setTimeout(() => finish(false), Math.max(0, Math.min(5000, timeoutMs)));
    try {
      image.src = url;
      if (image.complete && image.naturalWidth > 0) loaded();
    } catch { finish(false); }
  });
  images.set(url, entry);
  return entry.promise;
}

/** Warm every phase, including the two palm attacks; never await downloads mid-attack. */
export async function preloadBossAttack(profile: BossAttackProfile, timeoutMs = 3000): Promise<boolean> {
  return (await Promise.all(assetSheets(profileAssets(profile)).map(sheet => preloadSheet(sheet, timeoutMs)))).every(Boolean);
}

/** Each authored cell gets a hold; background coordinates never interpolate. */
export function bossSpriteFrames(sheet: BossAttackSheet): Keyframe[] {
  if (!validSheet(sheet)) return [];
  const rows = Math.ceil(sheet.frameCount / sheet.columns);
  const first = sheet.firstFrame ?? 0, count = frameLength(sheet);
  const frames = Array.from({ length: count }, (_, index): Keyframe => {
    const frame = first + index, col = frame % sheet.columns, row = Math.floor(frame / sheet.columns);
    return {
      backgroundPosition: (sheet.columns > 1 ? col * 100 / (sheet.columns - 1) : 0) + '% '
        + (rows > 1 ? row * 100 / (rows - 1) : 0) + '%',
      offset: index / count, easing: 'steps(1, end)',
    };
  });
  frames.push({ ...frames[frames.length - 1]!, offset: 1 });
  return frames;
}

export interface BossAttackPath {
  startX: number; startY: number; endX: number; endY: number;
  dx: number; dy: number; distance: number; angle: number;
}
export function bossAttackPath(from: DOMRect, to: DOMRect): BossAttackPath {
  const ax = from.left + from.width / 2, ay = from.top + from.height / 2;
  const bx = to.left + to.width / 2, by = to.top + to.height / 2;
  const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
  const edge = (r: DOMRect) => Math.min(
    dx ? Math.abs(r.width / 2 / dx) : Infinity,
    dy ? Math.abs(r.height / 2 / dy) : Infinity, .3);
  const sourceEdge = edge(from) * .45, targetEdge = edge(to) * .7;
  const startX = ax + dx * sourceEdge, startY = ay + dy * sourceEdge;
  const endX = bx - dx * targetEdge, endY = by - dy * targetEdge;
  return { startX, startY, endX, endY, dx: endX - startX, dy: endY - startY,
    distance: length, angle: Math.atan2(dy, dx) * 180 / Math.PI };
}
function usefulBounds(rect: DOMRect): boolean {
  return [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
}
function effectNode(className: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = className;
  node.setAttribute('aria-hidden', 'true');
  node.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:940;contain:layout style;';
  return node;
}
function attachSheet(node: HTMLElement, sheet: BossAttackSheet): void {
  node.style.backgroundImage = 'url(' + JSON.stringify(sheet.url) + ')';
  node.style.backgroundSize = sheet.columns * 100 + '% ' + Math.ceil(sheet.frameCount / sheet.columns) * 100 + '%';
  node.style.backgroundRepeat = 'no-repeat';
  node.style.backgroundPosition = String(bossSpriteFrames(sheet)[0]?.backgroundPosition ?? '0% 0%');
}

/**
 * One authored group per attack, with independent source/travel/contact phases.
 * The seven feathers or paired claws already exist in the artwork: never clone them.
 */
export async function playBossAttack({ profile, from, to, outcome, impact, signal, host }: BossAttackOptions): Promise<BossAttackPlayback> {
  const started = performance.now(), startEpoch = motionEpoch();
  const report: BossAttackPlayback = { mode: 'skipped', assetReady: false, contactCount: 0, elapsedMs: 0, interrupted: false };
  let contacted = false;
  const contact = () => {
    if (contacted || outcome === 'cancelled' || signal?.aborted) return;
    contacted = true; report.contactCount++; impact();
  };
  if (outcome === 'cancelled') { report.mode = 'cancelled'; return report; }
  if (signal?.aborted) { report.interrupted = true; return report; }
  if (typeof document === 'undefined' || document.hidden || !usefulBounds(from) || !usefulBounds(to)) {
    contact(); return report;
  }
  const layers: HTMLElement[] = [];
  const removeLayers = () => {
    for (const node of layers) {
      for (const animation of node.getAnimations?.({ subtree: true }) ?? []) animation.cancel();
      node.remove();
    }
  };
  const interrupted = () => signal?.aborted || motionEpoch() !== startEpoch || document.hidden;
  signal?.addEventListener('abort', removeLayers, { once: true });
  const path = bossAttackPath(from, to), asset = profileAssets(profile), reduced = motionReduced();
  const sheets = assetSheets(asset);
  report.assetReady = sheets.every(sheetReady);
  if (!report.assetReady) void preloadBossAttack(profile);
  report.mode = outcome === 'sentry' ? 'prevented' : reduced ? 'reduced' : report.assetReady ? 'sprite' : 'fallback';

  // Fast retains >=32ms per authored frame. Reading holds remain outside this renderer.
  const duration = Math.max(16 * 32, motionDuration() * 2);
  const frameMs = duration / sheets.reduce((sum, sheet) => sum + frameLength(sheet), 0);
  const shortDuration = Math.min(240, motionDuration() * 2);
  const size = Math.min(288, Math.max(112, Math.min(from.width, from.height, to.width, to.height) * 2.5));
  let group: HTMLElement | undefined, sprite: HTMLElement | undefined;

  const mark = (node: HTMLElement, phase: BossAttackPhase) => {
    node.dataset.phase = phase; node.dataset.cardId = profile.id; node.dataset.boss = profile.id;
  };
  const makeSprite = () => {
    if (group && sprite) return;
    group = effectNode('boss-attack-source');
    group.style.left = path.startX - size / 2 + 'px'; group.style.top = path.startY - size / 2 + 'px';
    group.style.width = size + 'px'; group.style.height = size + 'px';
    sprite = document.createElement('div');
    sprite.className = 'boss-attack-sprite';
    sprite.style.width = '100%'; sprite.style.height = '100%';
    sprite.style.transform = 'rotate(' + path.angle + 'deg)';
    sprite.style.transformOrigin = '50% 50%';
    group.append(sprite); (host ?? document.body).append(group); layers.push(group);
  };
  const setPhase = (sheet: BossAttackSheet, phase: BossAttackPhase) => {
    makeSprite();
    mark(group!, phase); mark(sprite!, phase);
    group!.className = phase === 'formation' ? 'boss-attack-source'
      : phase === 'travel' ? 'boss-attack-projectile' : phase === 'impact' ? 'boss-attack-contact' : 'boss-attack-dispersal';
    attachSheet(sprite!, sheet);
  };
  const playPhase = async (sheet: BossAttackSheet, phase: BossAttackPhase) => {
    setPhase(sheet, phase);
    if (phase === 'impact') contact(); // First contact is authored frame 11, never a travel frame.
    const ms = frameLength(sheet) * frameMs;
    const destination = path.dx + 'px ' + path.dy + 'px';
    if (phase === 'travel') group!.style.translate = destination;
    await Promise.all([
      playMotion(sprite!, bossSpriteFrames(sheet), ms, 0, 'linear'),
      ...(phase === 'travel' ? [playMotion(group!, [
        { translate: '0px 0px' }, { translate: destination },
      ], ms, 0, 'linear')] : []),
    ]);
  };
  const stationarySource = async () => {
    const source = effectNode('boss-attack-source');
    mark(source, 'formation');
    source.style.left = from.left + 'px'; source.style.top = from.top + 'px';
    source.style.width = from.width + 'px'; source.style.height = from.height + 'px';
    source.style.border = '1px solid #bcecf4'; source.style.borderRadius = '5px';
    source.style.boxSizing = 'border-box';
    (host ?? document.body).append(source); layers.push(source);
    await playMotion(source, [{ opacity: .5 }, { opacity: 0 }], shortDuration * .4);
    source.remove();
  };
  const restrainedContact = async (ms: number) => {
    if (interrupted()) return;
    group?.remove();
    const node = effectNode('boss-attack-contact');
    mark(node, 'impact'); node.dataset.outcome = outcome;
    const markerSize = Math.min(124, Math.max(36, Math.min(to.width, to.height) * .95));
    node.style.left = path.endX - markerSize / 2 + 'px'; node.style.top = path.endY - markerSize / 2 + 'px';
    node.style.width = markerSize + 'px'; node.style.height = markerSize + 'px';
    node.style.boxSizing = 'border-box';
    node.style.border = outcome === 'sentry' ? '4px double #bcf3ff' : '2px solid #bcf3ff';
    node.style.borderRadius = outcome === 'hit' ? '50%' : '35% 35% 45% 45%';
    (host ?? document.body).append(node); layers.push(node);
    contact();
    await playMotion(node, [{ opacity: .65 }, { opacity: 0 }], ms);
    node.remove();
  };

  try {
    if (outcome === 'sentry') {
      await restrainedContact(shortDuration);
    } else if (!report.assetReady || reduced) {
      if (report.assetReady && reduced && asset.formation) {
        setPhase({ ...asset.formation, firstFrame: (asset.formation.firstFrame ?? 0) + frameLength(asset.formation) - 1, frames: 1 }, 'formation');
        await playMotion(sprite!, [{ opacity: .55 }, { opacity: 0 }], shortDuration * .4);
        group?.remove();
      } else await stationarySource();
      if (interrupted()) return report;
      // Reduced motion omits travel and avoids rapidly flashing authored impact cells.
      await restrainedContact(shortDuration * .6);
    } else {
      if (asset.formation) await playPhase(asset.formation, 'formation');
      if (interrupted()) return report;
      await playPhase(asset.travel, 'travel');
      if (interrupted()) return report;
      if (outcome === 'hit' && asset.impact) {
        await playPhase(asset.impact, 'impact');
        if (!interrupted() && asset.dispersal) await playPhase(asset.dispersal, 'dispersal');
      } else {
        const remaining = (asset.impact ? frameLength(asset.impact) : 2) + (asset.dispersal ? frameLength(asset.dispersal) : 0);
        await restrainedContact(remaining * frameMs);
      }
    }
  } finally {
    removeLayers();
    signal?.removeEventListener('abort', removeLayers);
    report.interrupted = !!interrupted();
    report.elapsedMs = performance.now() - started;
    // Resize/fast-forward settles a resolved result; abort and cancellation never do.
    contact();
  }
  return report;
}
