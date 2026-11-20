import * as T from 'three';
import { TextureCache } from './TextureCache.js';
/** DOM retains accessible hit areas and tutorial anchors; this view paints their physical card faces. */
export class CardView {
  readonly group = new T.Group();
  private face = new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({transparent:true}));
  private edge = new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x9b8765,roughness:.55,metalness:.3}));
  constructor(){this.face.position.z=1;this.group.add(this.edge,this.face);}
  update(node: HTMLElement, cache: TextureCache, viewportHeight:number): string {
    const url=node.dataset.sceneArt ?? '', texture=cache.get(url);
    const rect=node.getBoundingClientRect();
    const style=getComputedStyle(node);
    this.group.visible=!!texture && rect.width>0 && style.visibility!=='hidden' && Number(style.opacity)>0;
    node.classList.toggle('scene-card-ready', this.group.visible);
    if(!this.group.visible)return url;
    const transform=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);
    const angle=Math.atan2(transform.b,transform.a);
    // Ancestor mat may rotate the opponent's cards by another half turn.
    const foe=node.closest('.mat.foe');
    const sx=Math.hypot(transform.a,transform.b),sy=Math.hypot(transform.c,transform.d);
    const width=node.offsetWidth*sx,height=node.offsetHeight*sy;
    this.group.position.set(rect.x+rect.width/2,viewportHeight-rect.y-rect.height/2,6);
    this.group.rotation.z=-angle+(foe?Math.PI:0);
    this.edge.scale.set(width+2,height+2,3);
    this.face.scale.set(width,height,1);
    this.face.position.z=2;
    if(this.face.material.map!==texture){this.face.material.map=texture;this.face.material.needsUpdate=true;}
    this.face.material.opacity=Number(style.opacity);
    this.edge.material.color.set(node.matches('.sel,.selected,.attacking')?0x74dcf3:0x9b8765);
    return url;
  }
  dispose(){this.group.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();(n.material as T.Material).dispose();}});}
}
