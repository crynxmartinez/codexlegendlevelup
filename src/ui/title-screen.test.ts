import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./asset-downloads.js', () => ({ enterAssetDownloadMenu:vi.fn(), leaveAssetDownloadMenu:vi.fn() }));
vi.mock('./menu-transition.js', () => ({ destinationReady:vi.fn(),menuNavigationBusy:()=>false,menuNavigate:(fn:()=>unknown)=>fn() }));
import { mountTitle, validMenuMessage } from './title-screen.js';
let receive: (event: unknown) => void;
let removed: ReturnType<typeof vi.fn>;
let observerCallback: () => void;
class Node {
  style={cssText:''}; className=''; title=''; src=''; isConnected=true;
  contentWindow={postMessage:vi.fn()}; children:Node[]=[];
  replaceChildren(...nodes:Node[]){for(const n of this.children)n.isConnected=false;this.children=nodes;}
}
beforeEach(()=>{
  removed=vi.fn();
  vi.stubGlobal('location',{origin:'http://localhost:5173'});
  vi.stubGlobal('window',{addEventListener:(_name:string,fn:(e:unknown)=>void)=>{receive=fn;},removeEventListener:removed});
  vi.stubGlobal('document',{createElement:()=>new Node()});
  vi.stubGlobal('MutationObserver',class { constructor(fn:()=>void){observerCallback=fn;}observe(){}disconnect(){} });
});
afterEach(()=>vi.unstubAllGlobals());
it('accepts only the known menu message contract',()=>{
  expect(validMenuMessage(null)).toBe(false);
  expect(validMenuMessage({type:'codex-menu-action',action:'delete'})).toBe(false);
  expect(validMenuMessage({type:'other',action:'start'})).toBe(false);
  for(const action of ['start','decks','tutorial','settings','pvp','fighterlog'])expect(validMenuMessage({type:'codex-menu-action',action})).toBe(true);
});
it('uses the production menu, supplies active deck, and rejects foreign and duplicate senders',()=>{
  const activeDeck={name:'My saved',region:'Visayas',persona:{id:'kaptan',name:'Kaptan',art:'/cards/kaptan.webp'}};
  const root=new Node(),choose=vi.fn();mountTitle(root as unknown as HTMLElement,{activeDeck,choose});
  const frame=root.children[0]!;
  expect(frame.src).toBe('/ui/menu-v1/index.html');
  const send=(data:unknown,source:unknown=frame.contentWindow,origin='http://localhost:5173')=>receive({data,source,origin});
  send({type:'codex-menu-ready'});
  expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'codex-menu-context',activeDeck}),'http://localhost:5173');
  send({type:'codex-menu-action',action:'start'},{});
  send({type:'codex-menu-action',action:'start'},frame.contentWindow,'https://foreign.test');
  expect(choose).not.toHaveBeenCalled();
  send({type:'codex-menu-action',action:'decks'});send({type:'codex-menu-action',action:'decks'});
  expect(choose).toHaveBeenCalledTimes(1);expect(choose).toHaveBeenCalledWith('decks');
});
it('preserves a missing active deck instead of fabricating Luzon',()=>{
  const root=new Node();mountTitle(root as unknown as HTMLElement,{activeDeck:null,choose:vi.fn()});
  const frame=root.children[0]!;receive({origin:'http://localhost:5173',source:frame.contentWindow,data:{type:'codex-menu-ready'}});
  expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({activeDeck:null}),'http://localhost:5173');
});
it('acknowledges applied profiles only from the connected same-origin menu and restores session data',()=>{
  const root=new Node();mountTitle(root as unknown as HTMLElement,{choose:vi.fn()});const frame=root.children[0]!;
  const data={type:'codex-menu-profile-applied',profile:{fighter:'raina',nickname:'Session profile'},persisted:false};
  receive({origin:'https://foreign.test',source:frame.contentWindow,data});receive({origin:'http://localhost:5173',source:{},data});
  expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
  receive({origin:'http://localhost:5173',source:frame.contentWindow,data});
  expect(frame.contentWindow.postMessage).toHaveBeenCalledWith({type:'codex-menu-profile-ack'},'http://localhost:5173');
  mountTitle(root as unknown as HTMLElement,{choose:vi.fn()});const next=root.children[0]!;
  receive({origin:'http://localhost:5173',source:next.contentWindow,data:{type:'codex-menu-ready'}});
  expect(next.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({profileSession:expect.objectContaining({persisted:false,profile:expect.objectContaining({fighter:'raina',nickname:'Session profile'})})}),'http://localhost:5173');
});
it('disconnects when the title is removed and rejects stale messages',()=>{
  const root=new Node(),choose=vi.fn();mountTitle(root as unknown as HTMLElement,{choose});
  const frame=root.children[0]!;frame.isConnected=false;observerCallback();
  receive({origin:'http://localhost:5173',source:frame.contentWindow,data:{type:'codex-menu-action',action:'start'}});
  expect(removed).toHaveBeenCalled();expect(choose).not.toHaveBeenCalled();
});
it('resolves actual deck context after displaying a truthful loading state',async()=>{
  let finish!:(value:import('./title-screen.js').ActiveDeckContext|null)=>void;
  const root=new Node();mountTitle(root as unknown as HTMLElement,{resolveActiveDeck:()=>new Promise(resolve=>{finish=resolve;}),choose:vi.fn()});
  const frame=root.children[0]!;receive({origin:'http://localhost:5173',source:frame.contentWindow,data:{type:'codex-menu-ready'}});
  expect(frame.contentWindow.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({deckStatus:'loading',activeDeck:null}),'http://localhost:5173');
  const deck={name:'Actual saved deck',region:'Mindanao',persona:null};finish(deck);await Promise.resolve();
  expect(frame.contentWindow.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({deckStatus:'ready',activeDeck:deck}),'http://localhost:5173');
});
it('labels failed deck resolution unavailable and discards results from an unmounted title',async()=>{
  const root=new Node();mountTitle(root as unknown as HTMLElement,{resolveActiveDeck:async()=>{throw Error('storage denied');},choose:vi.fn()});
  const frame=root.children[0]!;receive({origin:'http://localhost:5173',source:frame.contentWindow,data:{type:'codex-menu-ready'}});await Promise.resolve();
  expect(frame.contentWindow.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({deckStatus:'unavailable'}),'http://localhost:5173');
  let finish!:(value:null)=>void;mountTitle(root as unknown as HTMLElement,{resolveActiveDeck:()=>new Promise(resolve=>{finish=resolve;}),choose:vi.fn()});
  const next=root.children[0]!;receive({origin:'http://localhost:5173',source:next.contentWindow,data:{type:'codex-menu-ready'}});next.isConnected=false;observerCallback();
  const calls=next.contentWindow.postMessage.mock.calls.length;finish(null);await Promise.resolve();expect(next.contentWindow.postMessage).toHaveBeenCalledTimes(calls);
});
