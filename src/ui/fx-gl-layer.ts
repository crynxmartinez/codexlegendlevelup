/**
 * WebGL effects layer.
 *
 * A transparent PixiJS canvas over the board. It does not replace the DOM
 * board — it adds the one class of effect the DOM fundamentally cannot do:
 * hundreds of additively-blended sprites. Additive blending is why a glow in a
 * game reads as light and a CSS `box-shadow` reads as a sticker; overlapping
 * particles sum toward white instead of painting over one another.
 *
 * Driven by the same effect vocabulary as the CSS layer (see `playFx`), so
 * every effect keeps one meaning across both. If WebGL is unavailable, or the
 * player turns it off, the CSS layer alone still renders everything.
 */
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { motionBudget, DecorationGovernor } from './motion-quality.js';
const governor = new DecorationGovernor();
const budget = () => {
  const base = motionBudget(innerWidth, innerHeight, devicePixelRatio, document.documentElement.dataset.animationIntensity);
  return { ...base, particles: Math.floor(base.particles * governor.scale), density: base.density * governor.scale,
    waves: Math.ceil(base.waves * governor.scale) };
};
let initializing = false;
const waves = new Map<Sprite, number>();
const delayed = new Set<ReturnType<typeof setTimeout>>();

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Downward acceleration, px/s². */
  gravity: number;
  /** Velocity retained per second: 1 = no drag. */
  drag: number;
  born: number;
  spin: number;
}

let app: Application | null = null;
let layer: Container | null = null;
let dot: Texture | null = null;
let ring: Texture | null = null;
let live: Particle[] = [];
let pool: Sprite[] = [];
let enabled = true;
let ready = false;

/** Hard ceiling, so a busy board cannot stall the frame. */
const MAX_PARTICLES = 800;

/** A soft radial dot, generated rather than shipped. */
function makeDot(size: number): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** A thin bright annulus, for shockwaves. */
function makeRing(size: number): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, r * 0.62, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/**
 * Bring the layer up. Safe to call repeatedly, and safe to fail: every emit
 * below is a no-op until this succeeds, so a machine without WebGL simply gets
 * the CSS effects.
 */
export async function initGlFx(): Promise<void> {
  if (app || initializing || !enabled || !document.querySelector('.board-wrap')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!budget().particles) return;

  initializing = true;
  try {
    if (!enabled || document.hidden) return;
    const a = new Application();
    await a.init({
      backgroundAlpha: 0,
      resizeTo: window,
      antialias: true,
      preference: 'webgl',
      preserveDrawingBuffer: false,
      autoDensity: true,
      resolution: budget().resolution,
    });

    if (!enabled || document.hidden || !document.querySelector('.board-wrap')) { a.destroy(true); return; }
    a.canvas.className = 'fx-gl';
    document.body.appendChild(a.canvas);

    layer = new Container();
    a.stage.addChild(layer);

    dot = makeDot(64);
    ring = makeRing(256);

    // Upload both procedural textures and compile normal/additive sprite paths
    // under the loading screen, before the first real hit or activation.
    const warmup = [new Sprite(dot), new Sprite(ring)];
    warmup[1]!.blendMode = 'add';
    for (const sprite of warmup) layer.addChild(sprite);
    a.canvas.style.visibility = 'hidden';
    try { a.render(); }
    finally { for (const sprite of warmup) { layer.removeChild(sprite); sprite.destroy(); } a.render(); a.canvas.style.visibility = ''; }

    a.ticker.maxFPS = 60;
    a.ticker.add((t) => { governor.sample(t.deltaMS); step(Math.min(.05, t.deltaMS / 1000)); });

    app = a;
    ready = true;
    a.stop();
  } catch (err) {
    // No WebGL, or context creation refused. The CSS layer covers everything —
    // but say so, because a silent failure here looks like "the effects just
    // do not work" and is impossible to diagnose from the outside.
    console.warn('[fx-gl] disabled:', err);
    app = null;
    ready = false;
  } finally { initializing = false; }
}

export function setGlFxEnabled(on: boolean): void {
  enabled = on;
  if (app) app.canvas.style.display = on ? '' : 'none';
  if (!on) { clearAll(); app?.stop(); }
}

export function glFxAvailable(): boolean {
  return ready;
}

export function glFxAnimating(): boolean { return !!enabled && !!layer?.children.length; }

function clearAll(): void {
  for (const timer of delayed) clearTimeout(timer); delayed.clear();
  for (const [sprite, frame] of waves) { cancelAnimationFrame(frame); sprite.removeFromParent(); sprite.destroy(); } waves.clear();
  for (const p of live) recycle(p.s);
  live = [];
  if (app && ready) app.renderer.render(app.stage);
}

function recycle(s: Sprite): void {
  s.visible = false;
  layer?.removeChild(s);
  if (pool.length < MAX_PARTICLES) pool.push(s);
}

function take(): Sprite | null {
  if (!layer || !dot) return null;
  const s = pool.pop() ?? new Sprite(dot);
  s.texture = dot;
  s.anchor.set(0.5);
  s.visible = true;
  s.rotation = 0;
  // Additive: overlapping particles sum toward white, which is what makes this
  // read as light rather than as stacked decals.
  s.blendMode = 'add';
  layer.addChild(s);
  return s;
}

/** Advance every live particle and retire the expired ones. */
function step(dt: number): void {
  if (!live.length) { if (!waves.size) app?.stop(); return; }
  const next: Particle[] = [];
  for (const p of live) {
    p.age += dt;
    if (p.age >= p.life) {
      recycle(p.s);
      continue;
    }
    p.vy += p.gravity * dt;
    const keep = Math.pow(p.drag, dt);
    p.vx *= keep;
    p.vy *= keep;
    p.s.x += p.vx * dt;
    p.s.y += p.vy * dt;
    p.s.rotation += p.spin * dt;

    // Fade and shrink together, so particles dissolve rather than blink out.
    const k = 1 - p.age / p.life;
    p.s.alpha = k * k;
    p.s.scale.set(p.born * (0.35 + 0.65 * k));
    next.push(p);
  }
  live = next;
  if (!live.length && !waves.size) { app?.renderer.render(app.stage); app?.stop(); }
}

interface EmitOpts {
  x: number;
  y: number;
  count: number;
  /** Base speed px/s, randomised ±40%. */
  speed: number;
  /** Direction in radians; omit for a full circle. */
  angle?: number;
  /** Half-width of the direction cone, radians. */
  spread?: number;
  colors: number[];
  size?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
}

function emit(o: EmitOpts): void {
  if (!ready || !enabled || !layer || document.hidden) return;
  const intensity = document.documentElement.dataset.animationIntensity;
  if (intensity === 'minimal' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const quality = budget();
  const room = quality.particles - live.length;
  if (room <= 0) return;
  const n = Math.min(Math.round(o.count * quality.density), room);
  app?.start();

  for (let i = 0; i < n; i++) {
    const s = take();
    if (!s) return;
    const dir = o.angle === undefined
      ? Math.random() * Math.PI * 2
      : o.angle + (Math.random() - 0.5) * 2 * (o.spread ?? 0.5);
    const sp = o.speed * (0.6 + Math.random() * 0.8);
    const size = (o.size ?? 0.5) * (0.6 + Math.random() * 0.8);

    s.x = o.x;
    s.y = o.y;
    s.tint = o.colors[(Math.random() * o.colors.length) | 0]!;
    s.scale.set(size);

    live.push({
      s,
      vx: Math.cos(dir) * sp,
      vy: Math.sin(dir) * sp,
      age: 0,
      life: (o.life ?? 0.7) * (0.7 + Math.random() * 0.6),
      gravity: o.gravity ?? 0,
      drag: o.drag ?? 0.35,
      born: size,
      spin: o.spin ?? 0,
    });
  }
}

/** An expanding bright annulus — the pressure wave of a landing or an impact. */
function shockwave(x: number, y: number, color: number, maxScale: number, life = 0.5): void {
  if (document.documentElement.dataset.animationIntensity === 'minimal' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!ready || !enabled || !layer || !ring || document.hidden) return;
  if (waves.size >= budget().waves) return;
  app?.start();
  const host = layer;
  const s = new Sprite(ring);
  s.anchor.set(0.5);
  s.x = x;
  s.y = y;
  s.tint = color;
  s.blendMode = 'add';
  s.scale.set(0.05);
  host.addChild(s);

  const t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / (life * 1000));
    // Fast out, slow settle: the leading edge should feel like pressure.
    const e = 1 - Math.pow(1 - k, 3);
    s.scale.set(0.05 + e * maxScale);
    s.alpha = (1 - k) * 0.85;
    if (k < 1) waves.set(s, requestAnimationFrame(tick));
    else {
      waves.delete(s); host.removeChild(s);
      s.destroy();
    }
  };
  waves.set(s, requestAnimationFrame(tick));
}

// ---------------------------------------------------------------------------
// The effect vocabulary — one function per event the engine emits
// ---------------------------------------------------------------------------

const GOLD = [0xffe6a8, 0xc9a961, 0xfff4d6];
const RED = [0xff8a7a, 0xff4d4d, 0xffd0c0];
const BLUE = [0xa8d8ff, 0x5aaaff, 0xe0f0ff];
const GREEN = [0xa8ffd0, 0x6ee7a8, 0xe0fff0];
const VIOLET = [0xd8b0ff, 0x9a6ade, 0xf0e0ff];
const EMBER = [0xffc46b, 0xff7a3c, 0xff5a2a];

/** A hostile effect crossing the board, then landing. */
export function glStrike(ax: number, ay: number, bx: number, by: number): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;

  // Sparks shed along the path, so the bolt leaves a wake.
  const steps = Math.min(16, Math.max(6, Math.round(len / 40)));
  for (let i = 0; i < steps; i++) {
    const k = i / steps;
    const timer = setTimeout(() => {
      delayed.delete(timer);
      emit({
        x: ax + dx * k,
        y: ay + dy * k,
        count: 4, speed: 90, colors: RED, size: 0.28, life: 0.34, drag: 0.2,
      });
    }, k * 130);
    delayed.add(timer);
  }
  const impactTimer = setTimeout(() => {
    delayed.delete(impactTimer);
    emit({ x: bx, y: by, count: 46, speed: 340, colors: RED, size: 0.42, life: 0.55, gravity: 420, drag: 0.25 });
    shockwave(bx, by, 0xff5a4a, 1.1, 0.42);
  }, 150);
  delayed.add(impactTimer);
}

/** A unit destroyed: embers thrown outward, then falling. */
export function glDestroy(x: number, y: number): void {
  emit({ x, y, count: 70, speed: 260, colors: EMBER, size: 0.5, life: 0.9, gravity: 620, drag: 0.4, spin: 3 });
  shockwave(x, y, 0xff7a3c, 0.9, 0.5);
}

/** Power gained or lost — motes rising or sinking. */
export function glPower(x: number, y: number, amount: number): void {
  const up = amount >= 0;
  emit({
    x, y,
    count: 26,
    speed: 120,
    angle: up ? -Math.PI / 2 : Math.PI / 2,
    spread: 0.7,
    colors: up ? GOLD : VIOLET,
    size: 0.34,
    life: 0.8,
    gravity: up ? -180 : 260,
    drag: 0.5,
  });
}

/** A unit landing. Level drives how much room the arrival gets. */
export function glArrive(x: number, y: number, level: number, route: string): void {
  const weight = Math.min(2, Math.max(0, level - 1));
  const colors = route === 'grave' ? VIOLET
    : route === 'deck' ? BLUE
      : route === 'replace' ? RED
        : GOLD;
  emit({
    x, y: y + 20,
    count: 30 + weight * 18,
    speed: 150 + weight * 60,
    angle: -Math.PI / 2,
    spread: 1.1,
    colors,
    size: 0.36 + weight * 0.08,
    life: 0.85,
    gravity: 340,
    drag: 0.4,
  });
  shockwave(x, y + 26, colors[1]!, 0.7 + weight * 0.3, 0.55);
}

/** Protection closing over a unit. */
export function glWard(x: number, y: number): void {
  emit({ x, y, count: 34, speed: 190, colors: BLUE, size: 0.3, life: 0.55, drag: 0.15 });
  shockwave(x, y, 0x7fc4ff, 0.75, 0.45);
}

/** Something given back. */
export function glRestore(x: number, y: number): void {
  emit({
    x, y: y + 14, count: 24, speed: 110,
    angle: -Math.PI / 2, spread: 0.6,
    colors: GREEN, size: 0.32, life: 0.9, gravity: -140, drag: 0.55,
  });
}

/** Deck resource accents: wind, spirit light, and falling embers. */
export function glResource(x: number, y: number, theme: string): void {
  const spirit = theme === 'babaylan', earth = theme === 'maguindanao';
  emit({ x, y, count: 22, speed: spirit ? 100 : 155,
    colors: spirit ? VIOLET : earth ? EMBER : GREEN,
    angle: earth ? Math.PI / 2 : -Math.PI / 2, spread: spirit ? 2.5 : .65,
    size: .3, life: .65, gravity: earth ? 210 : -90, drag: .35 });
}

/** Combat impact, scaled 0..1 by how badly the attack overkilled. */
export function glImpact(x: number, y: number, force: number): void {
  const f = Math.min(1, Math.max(0, force));
  emit({
    x, y,
    count: Math.round(40 + f * 60),
    speed: 300 + f * 320,
    colors: GOLD, size: 0.4 + f * 0.3, life: 0.5 + f * 0.3, gravity: 500, drag: 0.3,
  });
  shockwave(x, y, 0xffd98a, 0.9 + f * 1.2, 0.4 + f * 0.2);
}

/** A Barrier breaking — the loudest routine moment in the game. */
export function glBarrierBreak(x: number, y: number): void {
  emit({
    x, y, count: 90, speed: 420,
    colors: [0xffffff, 0xd8e8ff, 0x9ec6ff],
    size: 0.42, life: 0.85, gravity: 700, drag: 0.32, spin: 5,
  });
  shockwave(x, y, 0xcfe4ff, 1.5, 0.55);
}

/** A Codex State releasing: a wash across the owner's half of the board. */
export function glStateRelease(topHalf: boolean, state = ''): void {
  if (!ready || !enabled) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const yBase = topHalf ? h * 0.3 : h * 0.7;
  for (let i = 0; i < 8; i++) {
    const timer = setTimeout(() => {
      delayed.delete(timer);
      emit({
        x: Math.random() * w,
        y: yBase + (Math.random() - 0.5) * h * 0.35,
        count: 26, speed: 200, colors: state === 'Andukha' ? VIOLET : state === 'Garahana' ? EMBER : GREEN,
        size: 0.45, life: 1.1, gravity: -90, drag: 0.5,
      });
    }, i * 55);
    delayed.add(timer);
  }
}

/** Flush the same particle scene before an offline frame is copied. */
export function renderGlFrame(): void { if (app && ready) app.renderer.render(app.stage); }

if (typeof document !== 'undefined') {
  const settle = () => { clearAll(); app?.stop(); governor.reset(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('pagehide', settle);
  window.addEventListener('resize', () => {
    settle();
    if (app && ready) app.renderer.resolution = budget().resolution;
  });
}
