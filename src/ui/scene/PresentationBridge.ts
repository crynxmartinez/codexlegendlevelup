import type { ArenaTheme, GraphicsQuality } from './SceneLayout.js';
type SceneModule = typeof import('./SceneHost.js');
let scene: SceneModule | undefined;
let loading: Promise<SceneModule> | undefined;
let request = 0;
let theme: ArenaTheme = 'Agta';

/** Load graphics separately; stale loads must never undo a switch to Simple board. */
export async function startScene(quality: GraphicsQuality): Promise<void> {
  const version = ++request;
  if (quality === 'legacy') { scene?.startScene('legacy'); return; }
  try {
    loading ??= import('./SceneHost.js');
    const module = await loading;
    if (version !== request) return;
    scene = module;
    scene.startScene(quality);
    scene.setArenaTheme(theme);
  } catch (error) {
    loading = undefined;
    console.warn('Arena graphics unavailable; the standard board remains usable.', error);
  }
}
export function setArenaTheme(value: ArenaTheme): void { theme=value;scene?.setArenaTheme(value); }
export function pulseScene(): void { scene?.pulseScene(); }
