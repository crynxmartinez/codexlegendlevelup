import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENAS, sceneRandom, type ArenaTheme } from './SceneLayout.js';
/** Original procedural scenery. No imported models or cultural claims. */
export function buildIsland(theme: ArenaTheme, seed: number): T.Group {
  const g = new T.Group(), a = ARENAS[theme], rand = sceneRandom(seed);
  const material = (color: number) => new T.MeshStandardMaterial({ color, roughness: .85, flatShading: true });
  const rock = material(a.rock), land = material(a.land), foliage = material(a.color), gold = material(0xc0a474);
  const add = (geo: T.BufferGeometry, mat: T.Material, x:number,y:number,z:number) => {
    const m = new T.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  };
  const base = add(new T.CylinderGeometry(5.8,3.8,2.3,9),rock,0,-1.2,0);base.rotation.y=.3;
  add(new T.CylinderGeometry(6.15,5.6,.12,32),new T.MeshStandardMaterial({color:a.water,metalness:.35,roughness:.28}),0,-2.5,0);
  add(new T.CylinderGeometry(5.75,5.75,.25,9),land,0,.05,0);
  const platform = add(new T.CylinderGeometry(2.7,2.9,.28,8),material(0x182932),0,.32,0);
  platform.rotation.y=Math.PI/8;
  const ring=add(new T.TorusGeometry(2.7,.045,6,48),gold,0,.49,0);ring.rotation.x=Math.PI/2;
  // Perimeter vegetation or terraces leave the center clear.
  for(let i=0;i<19;i++) {
    const angle=rand()*Math.PI*2, radius=3.5+rand()*1.4, x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    if(theme==='Agta') {
      add(new T.CylinderGeometry(.07,.15,1.2,5),rock,x,.7,z);
      add(new T.ConeGeometry(.55+rand()*.3,1.5+rand(),6),foliage,x,1.6,z);
    } else if(theme==='Babaylan') {
      const m=add(new T.OctahedronGeometry(.22+rand()*.3),foliage,x,.6,z);m.scale.y=2;
    } else {
      const m=add(new T.BoxGeometry(.6+rand(),.35+rand(),.65),rock,x,.5,z);m.rotation.y=angle;
    }
  }
  for(let i=0;i<5;i++) {
    const angle=i*Math.PI*2/5;
    const pillar=add(new T.CylinderGeometry(.12,.2,.7,6),gold,Math.cos(angle)*3,.7,Math.sin(angle)*3);
    const glow=add(new T.OctahedronGeometry(.16),new T.MeshBasicMaterial({color:a.color}),pillar.position.x,1.25,pillar.position.z);
    glow.userData.float=true;
    glow.userData.spring={offset:0,velocity:0};
  }
  // Batch static decoration by material. The five ornaments remain independent.
  const batches=new Map<T.Material,T.Mesh[]>();
  for(const child of [...g.children]) if(child instanceof T.Mesh && !child.userData.float){
    const mat=child.material as T.Material;
    const batch=batches.get(mat)??[];batch.push(child);batches.set(mat,batch);
  }
  for(const [mat,meshes] of batches){
    const pieces=meshes.map(mesh=>{
      mesh.updateMatrix();const copy=mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if(!copy.index)return copy;
      const expanded=copy.toNonIndexed();copy.dispose();return expanded;
    });
    const geometry=mergeGeometries(pieces);
    if(geometry){for(const mesh of meshes){g.remove(mesh);mesh.geometry.dispose();}g.add(new T.Mesh(geometry,mat));}
    pieces.forEach(piece=>piece.dispose());
  }
  return g;
}
