import * as T from 'three';
import { buildIsland } from './Arenas.js';
import { CardView } from './CardView.js';
import { stepSpring, impulseSpring, type Spring } from './SceneMotion.js';
import { TextureCache } from './TextureCache.js';
import { qualityRatio, ARENAS, type ArenaTheme, type GraphicsQuality } from './SceneLayout.js';
/** A single renderer owns scenery and the card layer. Existing DOM is the input/accessibility layer. */
export class SceneHost {
  readonly renderer: T.WebGLRenderer;
  private world=new T.Scene(); private cards=new T.Scene();
  private camera=new T.PerspectiveCamera(38,1,.1,150);
  private cardCamera=new T.OrthographicCamera(0,1,1,0,.1,1000);
  private textures=new TextureCache();
  private views=new Map<string,{node:HTMLElement;view:CardView}>();
  private islands:T.Group[]=[]; private surfaces:T.Mesh[]=[];
  private portraits:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>[]=[];
  private mode='';private theme:ArenaTheme='Agta';private last=0;private scanAt=0;private dead=false;
  private quality:GraphicsQuality='auto';private ratio=1;private sample:number[]=[];private lastQualityAt=0;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private lost=(e:Event)=>{e.preventDefault();this.dispose();};
  constructor(){
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.domElement.className='arena-scene';this.renderer.domElement.setAttribute('aria-hidden','true');
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.setClearColor(0x090d16);this.renderer.autoClear=false;
    this.renderer.info.autoReset=false;
    this.world.fog=new T.FogExp2(0x090d16,.009);
    this.world.add(new T.HemisphereLight(0xb2d0ed,0x273044,2));
    const sun=new T.DirectionalLight(0xffd39b,3);sun.position.set(-8,18,9);this.world.add(sun);
    this.cards.add(new T.HemisphereLight(0xdce8ff,0x182334,3));
    const lamp=new T.DirectionalLight(0xffffff,2);lamp.position.set(-200,900,500);this.cards.add(lamp);
    this.cardCamera.position.z=500;
    document.body.prepend(this.renderer.domElement);document.documentElement.classList.add('arena3d');
    this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
    this.renderer.setAnimationLoop(this.tick);
  }
  setTheme(theme:ArenaTheme){if(this.theme!==theme){this.theme=theme;this.mode='';}document.documentElement.style.setProperty('--arena-accent',ARENAS[theme].accent);}
  setQuality(q:GraphicsQuality){this.quality=q;this.ratio=qualityRatio(q,innerWidth<800);this.renderer.setPixelRatio(this.ratio);}
  get disposed(){return this.dead;}
  pulse(){
    if(this.quality==='low'||innerWidth<800||this.reduced.matches||document.documentElement.dataset.animationIntensity==='minimal')return;
    this.islands.forEach(island=>island.children.forEach(child=>{if(child.userData.spring)impulseSpring(child.userData.spring as Spring);}));
  }
  private clearWorld(){
    for(const island of this.islands){this.world.remove(island);island.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});}
    this.islands=[];this.portraits=[];
  }
  private build(mode:string){
    this.mode=mode;this.clearWorld();
    if(mode==='hub'){
      (Object.keys(ARENAS) as ArenaTheme[]).forEach((theme,i)=>{
        const island=buildIsland(theme,100+i);island.position.set((i-1)*10,0,0);island.scale.setScalar(.8);this.world.add(island);this.islands.push(island);
        const portrait=new T.Mesh(new T.PlaneGeometry(3.4,4.8),new T.MeshBasicMaterial({transparent:true,side:T.DoubleSide}));
        portrait.position.set(0,3.5,0);portrait.rotation.x=-.22;portrait.userData.theme=theme;island.add(portrait);this.portraits.push(portrait);
      });
      this.camera.position.set(-7,22,34);this.camera.lookAt(-7,0,0);
      if(innerWidth<700){this.camera.position.set(0,42,66);this.camera.lookAt(0,0,0);}
    }else{
      const island=buildIsland(this.theme,101);island.scale.setScalar(2.4);this.world.add(island);this.islands.push(island);
      this.camera.position.set(0,23,28);this.camera.lookAt(0,0,0);
    }
  }
  private tick=(now:number)=>{
    if(this.dead||document.hidden)return;
    try{
      const elapsed=this.last?now-this.last:16;this.last=now;
      const mode=document.querySelector('.title-screen')?'hub':document.querySelector('.mat')?'duel':'menu';
      if(mode!==this.mode)this.build(mode);
      const w=innerWidth,h=innerHeight;
      if(this.renderer.domElement.clientWidth!==w||this.renderer.domElement.width!==Math.round(w*this.ratio)||this.renderer.domElement.height!==Math.round(h*this.ratio)){
        this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
        if(mode==='hub'){
          if(w<700){this.camera.position.set(0,42,66);this.camera.lookAt(0,0,0);}
          else {this.camera.position.set(-7,22,34);this.camera.lookAt(-7,0,0);}
        }
        this.cardCamera.right=w;this.cardCamera.top=h;this.cardCamera.updateProjectionMatrix();
      }
      if(now-this.scanAt>100){this.scanAt=now;this.scan();}
      const urls=new Set<string>();
      for(const portrait of this.portraits){
        const button=document.querySelector<HTMLElement>(`[data-arena="${portrait.userData.theme}"]`);
        const url=button?.dataset.arenaArt??'';urls.add(url);const texture=this.textures.get(url);portrait.visible=!!texture;
        if(texture&&portrait.material.map!==texture){portrait.material.map=texture;portrait.material.needsUpdate=true;}
      }
      for(const {node,view} of this.views.values())urls.add(view.update(node,this.textures,h));
      if(Math.floor(now/1000)!==Math.floor((now-elapsed)/1000)){
        this.textures.sweep(urls);
        if(import.meta.env.DEV)this.renderer.domElement.dataset.sceneMetrics=JSON.stringify(this.metrics);
      }
      const mats=Array.from(document.querySelectorAll<HTMLElement>('.mat'));
      this.surfaces.forEach((surface,i)=>{const node=mats[i];surface.visible=!!node;if(node){const r=node.getBoundingClientRect();surface.position.set(r.x+r.width/2,h-r.y-r.height/2,0);surface.scale.set(r.width,r.height,6);}});
      if(!this.reduced.matches&&document.documentElement.dataset.animationIntensity!=='minimal'){
        let bodies=0;const limit=this.quality==='low'||innerWidth<800?0:this.quality==='high'?24:12;
        this.islands.forEach((island,i)=>{
          island.position.y=Math.sin(now*.00035+i)*.12;
          for(const child of island.children)if(child.userData.spring && bodies++<limit){
            const spring=child.userData.spring as Spring;stepSpring(spring,elapsed);child.position.y=1.25+spring.offset;child.rotation.y=now*.0003;
          }
        });
      }
      this.renderer.info.reset();this.renderer.clear();this.renderer.render(this.world,this.camera);
      if(mode==='duel'){this.renderer.clearDepth();this.renderer.render(this.cards,this.cardCamera);}
      this.sample.push(elapsed);if(this.sample.length>120)this.sample.shift();
      if(this.quality==='auto'&&now-this.lastQualityAt>6000&&this.sample.length===120){
        this.lastQualityAt=now;const avg=this.sample.reduce((a,b)=>a+b,0)/120;
        if(avg>27&&this.ratio>1){this.ratio=1;this.renderer.setPixelRatio(1);}
      }
    }catch(error){console.warn('Arena renderer fell back to the standard board.',error);this.dispose();}
  };
  private scan(){
    const alive=new Set<string>();
    for(const node of Array.from(document.querySelectorAll<HTMLElement>('.mat [data-scene-art]'))){
      const uid=node.dataset.sceneKey??node.dataset.uid!;alive.add(uid);let entry=this.views.get(uid);
      if(!entry){const view=new CardView();this.cards.add(view.group);entry={node,view};this.views.set(uid,entry);}else entry.node=node;
    }
    for(const [uid,entry] of this.views)if(!alive.has(uid)){this.cards.remove(entry.view.group);entry.view.dispose();entry.node.classList.remove('scene-card-ready');this.views.delete(uid);}
    while(this.surfaces.length<2){const surface=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x152532,metalness:.3,roughness:.6}));this.surfaces.push(surface);this.cards.add(surface);}
  }
  get metrics(){return {cards:this.views.size,drawCalls:this.renderer.info.render.calls,textures:this.renderer.info.memory.textures,frameMs:this.sample.length?this.sample.reduce((a,b)=>a+b,0)/this.sample.length:0,ratio:this.ratio};}
  dispose(){
    if(this.dead)return;this.dead=true;this.renderer.setAnimationLoop(null);
    this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);
    this.clearWorld();for(const {node,view} of this.views.values()){node.classList.remove('scene-card-ready');view.dispose();}this.views.clear();
    for(const surface of this.surfaces){surface.geometry.dispose();(surface.material as T.Material).dispose();}
    this.textures.dispose();this.renderer.dispose();this.renderer.domElement.remove();document.documentElement.classList.remove('arena3d');
  }
}
let host:SceneHost|null=null;
export function startScene(quality:GraphicsQuality='auto'){
  if(quality==='legacy'){host?.dispose();host=null;return;}
  if(!host || host.disposed){try{host=new SceneHost();}catch(error){console.warn('3D unavailable; using the standard board.',error);return;}}
  host.setQuality(quality);
}
export function setArenaTheme(theme:ArenaTheme){host?.setTheme(theme);}
export function sceneMetrics(){return host?.metrics??null;}
export function pulseScene(){host?.pulse();}
