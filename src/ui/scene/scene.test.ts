import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import { buildIsland } from './Arenas.js';
import { ARENAS, qualityRatio, sceneRandom, type ArenaTheme } from './SceneLayout.js';
import { impulseSpring, stepSpring } from './SceneMotion.js';

describe('decorative scene boundaries', () => {
  it('uses reproducible independent random streams', () => {
    const a=sceneRandom(12), b=sceneRandom(12), other=sceneRandom(53);
    for(let i=0;i<100;i++){ other(); expect(a()).toBe(b()); }
  });
  it('caps desktop and mobile pixel density', () => {
    expect(qualityRatio('auto',true)).toBe(1);
    expect(qualityRatio('auto',false)).toBe(1.5);
    expect(qualityRatio('high',false)).toBe(2);
    expect(qualityRatio('low',false)).toBe(1);
  });
  it('bounds repeated impacts and long interruptions, then settles', () => {
    const body={offset:0,velocity:0};
    for(let i=0;i<1000;i++){impulseSpring(body);stepSpring(body, i%10===0?3600000:16);expect(Math.abs(body.offset)).toBeLessThanOrEqual(.3);}
    for(let i=0;i<600;i++)stepSpring(body,16);
    expect(Math.abs(body.offset)).toBeLessThan(.001);
    expect(Math.abs(body.velocity)).toBeLessThan(.001);
  });
  for(const theme of Object.keys(ARENAS) as ArenaTheme[])it(`batches ${theme} within the scenery draw budget`,()=>{
    const island=buildIsland(theme,123);
    const meshes=island.children.filter((n):n is Mesh=>n instanceof Mesh);
    expect(meshes.length).toBeLessThanOrEqual(12);
    expect(meshes.filter(m=>m.userData.spring).length).toBe(5);
    for(const mesh of meshes){
      expect(Array.from(mesh.geometry.attributes.position!.array).every(Number.isFinite)).toBe(true);
      mesh.geometry.dispose();(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());
    }
  });
});
