import {beforeEach,afterEach,it,expect,vi} from 'vitest';
let transition: typeof import('./menu-transition.js');
class Element {
  tagName:string; className=''; textContent=''; hidden=false; isConnected=true; tabIndex=0;
  children:Element[]=[]; attrs:Record<string,string>={}; onclick?:()=>void;
  classes=new Set<string>();
  classList={add:(...names:string[])=>names.forEach(n=>this.classes.add(n))};
  remove=vi.fn(()=>{this.isConnected=false;});
  focus=vi.fn(()=>{active=this;});
  constructor(tag='div'){this.tagName=tag.toUpperCase();}
  setAttribute(k:string,v:string){this.attrs[k]=v;}
  hasAttribute(k:string){return k in this.attrs;}
  append(...nodes:Element[]){this.children.push(...nodes);}
  click(){this.onclick?.();}
  querySelector(){return this.children.find(n=>n.tagName==='BUTTON') || null;}
  querySelectorAll(){return this.children.filter(n=>n.tagName==='BUTTON');}
  get firstElementChild():Element|null{return this.children[0] || null;}
}
let nodes:Element[],active:Element|null,root:Element;
const find=(text:string)=>nodes.find(n=>n.textContent===text)!;
beforeEach(async()=>{
 vi.resetModules();vi.useFakeTimers();nodes=[];active=null;root=new Element();root.append(new Element());
 vi.stubGlobal('window',{matchMedia:()=>({matches:false})});
 vi.stubGlobal('localStorage',{getItem:()=>null});
 vi.stubGlobal('document',{createElement:(tag:string)=>{const n=new Element(tag);nodes.push(n);return n;},body:{append:vi.fn()},querySelector:()=>root,get activeElement(){return active;},addEventListener:vi.fn(),removeEventListener:vi.fn()});
 transition=await import('./menu-transition.js');
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('swaps once while covered and releases before the controller closes',async()=>{
 let exit!:(value:string)=>void;
 const open=vi.fn(()=>new Promise<string>(resolve=>{exit=resolve;}));
 const flow=transition.menuNavigate(open);
 await transition.menuNavigate(vi.fn(()=>{throw Error('duplicate');}));
 await vi.advanceTimersByTimeAsync(140);expect(open).toHaveBeenCalledOnce();
 transition.destinationReady();await vi.advanceTimersByTimeAsync(212);
 expect(transition.menuNavigationBusy()).toBe(false);expect(nodes[0]!.remove).toHaveBeenCalledOnce();
 exit('saved');expect(await flow).toBe('saved');
});
it('shows delayed feedback only after 700ms and cancels it on arrival',async()=>{
 transition.menuNavigate(()=>undefined,{label:'Opening Deck Builder'});
 await vi.advanceTimersByTimeAsync(699);expect(nodes[0]!.classes.has('slow')).toBe(false);
 await vi.advanceTimersByTimeAsync(1);expect(nodes[0]!.classes.has('slow')).toBe(true);
 expect(find('Opening Deck Builder')).toBeDefined();
 transition.destinationReady();await vi.advanceTimersByTimeAsync(9000);
 expect(nodes[0]!.classes.has('stalled')).toBe(false);
});
it('supports reduced motion and focus restoration',async()=>{
 vi.stubGlobal('window',{matchMedia:()=>({matches:true})});
 const target=new Element(),button=new Element('button');target.append(button);
 const flow=transition.menuNavigate(()=>7);await vi.advanceTimersByTimeAsync(1);
 expect(nodes[0]!.className).toContain('reduced');transition.destinationReady(target as unknown as HTMLElement);
 await vi.advanceTimersByTimeAsync(5);expect(button.focus).toHaveBeenCalledWith({preventScroll:true});expect(await flow).toBe(7);
});
it('retries a settled failure without losing the original awaited result',async()=>{
 const open=vi.fn().mockRejectedValueOnce(Error('failed')).mockImplementationOnce(()=>{transition.destinationReady();return 'saved';});
 const flow=transition.menuNavigate(open);await vi.advanceTimersByTimeAsync(150);
 expect(find('Retry')).toBeDefined();expect(nodes[0]!.classes.has('stalled')).toBe(true);
 await vi.advanceTimersByTimeAsync(9000);
 expect(find('This screen could not be opened. Please try again.')).toBeDefined();
 find('Retry').click();await vi.advanceTimersByTimeAsync(250);
 expect(await flow).toBe('saved');expect(open).toHaveBeenCalledTimes(2);expect(transition.menuNavigationBusy()).toBe(false);
});
it('does not duplicate an unresolved controller on Retry and Back delegates to its guard',async()=>{
 const open=vi.fn(()=>new Promise(()=>{}));const native=new Element('button');native.textContent='Cancel';native.onclick=vi.fn();root.append(native);
 const flow=transition.menuNavigate(open);await vi.advanceTimersByTimeAsync(8100);
 find('Retry').click();find('Retry').click();expect(open).toHaveBeenCalledOnce();
 find('Back').click();expect(native.onclick).toHaveBeenCalledOnce();expect(await flow).toBeUndefined();expect(transition.menuNavigationBusy()).toBe(false);
});
it('uses an available mounted screen when its ready signal is missing',async()=>{
 transition.menuNavigate(()=>{const screen=new Element();screen.append(new Element('button'));root.children=[screen];});
 await vi.advanceTimersByTimeAsync(8300);expect(transition.menuNavigationBusy()).toBe(false);
});
