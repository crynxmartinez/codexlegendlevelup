import * as THREE from 'three';
/** Images enter the GPU only when visible, and share one allocation per URL. */
export class TextureCache {
  private entries = new Map<string, { texture: THREE.Texture; ready: boolean; touched: number }>();
  private loader = new THREE.TextureLoader();
  private closed = false;
  get(url: string): THREE.Texture | null {
    if (!url || this.closed) return null;
    let entry = this.entries.get(url);
    if (!entry) {
      const texture = this.loader.load(url, () => { if (this.closed) texture.dispose(); else entry!.ready = true; }, undefined, () => {});
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      entry = { texture, ready: false, touched: performance.now() }; this.entries.set(url, entry);
    }
    entry.touched = performance.now();
    return entry.ready ? entry.texture : null;
  }
  sweep(active: Set<string>) {
    for (const [url, e] of this.entries) if (!active.has(url) && performance.now() - e.touched > 10000) { e.texture.dispose(); this.entries.delete(url); }
  }
  dispose() { this.closed = true; for (const e of this.entries.values()) e.texture.dispose(); this.entries.clear(); }
}
