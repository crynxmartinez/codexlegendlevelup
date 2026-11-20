/** Local development evidence only. No card IDs, text, state, URLs or tokens. */
type Metric = { revision?:number; presentation?:number; depth?:number; ms?:number; count?:number; ratio?:number };
export type DiagnosticRow = Metric & { t:number; kind:string };
export class PresentationTrace {
  private rows:DiagnosticRow[]=[];
  private start=performance.now();
  dropped=0;
  constructor(readonly enabled=false,private limit=8000){}
  record(kind:string,data:Metric={}):void {
    if(!this.enabled)return;
    // Whitelist scalar fields at runtime, including when called from plain JS.
    const row:DiagnosticRow={t:performance.now()-this.start,kind:kind.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,64)};
    for(const key of ['revision','presentation','depth','ms','count','ratio'] as const){
      const value=data[key];if(typeof value==='number'&&Number.isFinite(value))row[key]=value;
    }
    if(this.rows.length===this.limit){this.rows.shift();this.dropped++;}this.rows.push(row);
  }
  snapshot(){return {clock:'local monotonic milliseconds',dropped:this.dropped,rows:this.rows.map(r=>({...r}))};}
}
export const presentationTrace=new PresentationTrace(!!import.meta.env.DEV && typeof location!=='undefined'
  && new URLSearchParams(location.search).get('presentationDiagnostics')==='1');
let context:Metric={};
export function traceFrame(revision:number,presentation=0):void {context={revision,presentation};}
export function traceContext():Metric {return {...context};}
export function tracePresentation(kind:string,data:Metric={}):void {presentationTrace.record(kind,{...context,...data});}

// Samples rendered bounds/ancestor opacity and five occlusion points, never text.
// This is an exposure estimate, not evidence of human reading or comprehension.
export function renderedFraction(node:HTMLElement):number {
  if(!node.isConnected||document.hidden)return 0;
  const r=node.getBoundingClientRect();if(!r.width||!r.height)return 0;
  for(let n:HTMLElement|null=node;n;n=n.parentElement){const s=getComputedStyle(n);
    if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.8)return 0;}
  const points=[[.5,.5],[.15,.2],[.85,.2],[.15,.8],[.85,.8]];
  return points.filter(([x,y])=>{
    const px=r.left+r.width*x!,py=r.top+r.height*y!;
    if(px<0||py<0||px>=innerWidth||py>=innerHeight)return false;
    const top=document.elementFromPoint(px,py);return top===node||!!top&&node.contains(top);
  }).length/points.length;
}

let sampling=true;
const watched=new Map<HTMLElement,{kind:string;context:Metric;start:number;visible:number;last:number;peak:number}>();
export function traceExposure(node:HTMLElement,kind:string):void {
  if(!presentationTrace.enabled||!sampling)return;
  finishExposure(node,'replaced');
  watched.set(node,{kind,context:{...context},start:performance.now(),visible:0,last:performance.now(),peak:0});
}
/** Record the first sampled opportunity to interact, separately from dispatch.
 * This observes existing DOM only; it never enables a control or answers a decision. */
export function traceDecisionAvailability(isCurrent:()=>boolean):void {
  if(!presentationTrace.enabled)return;
  const captured=traceContext(),start=performance.now();
  const sample=()=>{
    if(!isCurrent()){presentationTrace.record('decision.replaced',captured);return;}
    const panel=document.querySelector<HTMLElement>('.duel-panel');
    const controls=panel?Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')):[];
    const actionable=controls.filter(b=>!b.closest('[inert]')&&renderedFraction(b)>=.8).length;
    if(actionable){presentationTrace.record('decision.available',{...captured,ms:performance.now()-start,count:actionable});return;}
    if(performance.now()-start>=3000){presentationTrace.record('decision.availability-unverified',captured);return;}
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
function finishExposure(node:HTMLElement,reason:string):void {
  const w=watched.get(node);if(!w)return;
  presentationTrace.record(`exposure.${w.kind}.${reason}`,{...w.context,ms:w.visible,ratio:w.peak});watched.delete(node);
}
if(presentationTrace.enabled&&typeof document!=='undefined'){
  const start=performance.now();let previous=start,frameCount=0,frameTotal=0,maxFrame=0;
  const sample=(now:number)=>{
    const dt=now-previous;previous=now;frameCount++;frameTotal+=dt;maxFrame=Math.max(maxFrame,dt);
    for(const [node,w]of watched){
      // Hit testing cannot prove occlusion for pointer-transparent source text.
      // Do not misreport that limitation as zero readable exposure.
      if(node.isConnected&&getComputedStyle(node).pointerEvents==='none'){
        presentationTrace.record(`exposure.${w.kind}.occlusion-unverified`,w.context);watched.delete(node);continue;
      }
      const ratio=renderedFraction(node);w.peak=Math.max(w.peak,ratio);
      if(ratio>=.8)w.visible+=Math.min(now-w.last,100);w.last=now;
      if(!node.isConnected||now-w.start>10000||document.hidden)finishExposure(node,document.hidden?'hidden':'ended');
    }
    if(frameTotal>=1000){tracePresentation('frames',{ms:maxFrame,count:frameCount});frameCount=frameTotal=maxFrame=0;
      tracePresentation('temporary',{count:document.querySelectorAll('.duel-flight,.effect-source-lift,.pile-card-lift,.duel-notice,.chain-cue').length});}
    if(now-start<600000)requestAnimationFrame(sample);else{sampling=false;for(const node of watched.keys())finishExposure(node,'budget');}
  };
  requestAnimationFrame(sample);
  const mount=()=>{
    const panel=document.createElement('details');panel.id='presentation-diagnostics';
    panel.style.cssText='position:fixed;right:4px;bottom:4px;z-index:99000;background:#081a2c;color:white;padding:4px;font:12px sans-serif;max-width:260px';
    const summary=document.createElement('summary');summary.textContent='Local presentation diagnostics';
    const exportButton=document.createElement('button');exportButton.textContent='Export local trace';
    const output=document.createElement('textarea');output.readOnly=true;output.hidden=true;output.setAttribute('aria-label','Local presentation trace');
    exportButton.onclick=()=>{output.hidden=false;output.value=JSON.stringify(presentationTrace.snapshot());};
    panel.append(summary,exportButton,output);document.body.append(panel);
  };
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
}
