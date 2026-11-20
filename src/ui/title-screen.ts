import { enterAssetDownloadMenu, leaveAssetDownloadMenu } from './asset-downloads.js';
import { destinationReady, menuNavigate, menuNavigationBusy } from './menu-transition.js';
import { applyMenuProfile, menuProfileSession } from './menu-profile.js';
import './menu-destination.css';
export type MenuAction = 'start' | 'decks' | 'tutorial' | 'pvp' | 'settings' | 'fighterlog' | 'devlog' | 'feedback' | 'credits';
export const MENU_ACTIONS: readonly MenuAction[] = ['start','decks','tutorial','pvp','settings','fighterlog','devlog','feedback','credits'];
export function validMenuMessage(data: unknown): data is { type: 'codex-menu-action'; action: MenuAction } {
  if (!data || typeof data !== 'object') return false;
  const value = data as Record<string,unknown>;
  return value.type === 'codex-menu-action' && MENU_ACTIONS.includes(value.action as MenuAction);
}
let dispose: (() => void) | undefined;
export interface ActiveDeckContext {
  name: string;
  region: string;
  persona: { id: string; name: string; art: string | null } | null;
}
/** Presentation-only document. Its global prototype CSS cannot reach a duel. */
export function mountTitle(root: HTMLElement, options: { activeDeck?: ActiveDeckContext | null; resolveActiveDeck?: () => Promise<ActiveDeckContext | null>; choose: (action: MenuAction) => void }): void {
  dispose?.();
  const frame = document.createElement('iframe');
  frame.title = 'Codex Legend main menu';
  frame.src = '/ui/menu-v1/index.html';
  frame.className = 'game-main-menu';
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100dvh;border:0;background:#071329;z-index:1';
  let departing = false;
  let ready=false,disposed=false;
  let activeDeck=options.activeDeck??null;
  let deckStatus: 'ready'|'loading'|'unavailable'=options.resolveActiveDeck?'loading':'ready';
  const context=()=>frame.contentWindow?.postMessage({type:'codex-menu-context',activeDeck,deckStatus,profileSession:menuProfileSession()},location.origin);
  const receive = (event: MessageEvent) => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || !frame.isConnected) return;
    if (event.data?.type === 'codex-menu-ready') {
      ready=true;context();
      destinationReady(root);
    } else if (event.data?.type === 'codex-menu-profile-applied' && applyMenuProfile(event.data.profile,event.data.persisted)) {
      frame.contentWindow?.postMessage({type:'codex-menu-profile-ack'},location.origin);
    } else if (validMenuMessage(event.data) && !departing && !menuNavigationBusy()) {
      const action = event.data.action;
      departing = ['start','decks','tutorial','pvp'].includes(action);
      if (departing) leaveAssetDownloadMenu();
      if (['start','decks','tutorial','pvp','settings','fighterlog'].includes(action)) void menuNavigate(() => options.choose(action), {
        label: ({start:'Preparing your duel',decks:'Opening Edit Deck',tutorial:'Opening Tutorial',pvp:'Opening Play with Friends',settings:'Opening Option',fighterlog:'Opening Fighter Log'} as Partial<Record<MenuAction,string>>)[action],
        onReturn: () => { departing=false; enterAssetDownloadMenu(); frame.contentWindow?.postMessage({type:'codex-menu-resume'},location.origin); },
      });
      else options.choose(action);
    }
  };
  window.addEventListener('message',receive);
  const observer = new MutationObserver(() => { if (!frame.isConnected) cleanup(); });
  const cleanup = () => { disposed=true;window.removeEventListener('message',receive); observer.disconnect(); if (dispose === cleanup) dispose=undefined; };
  dispose=cleanup;
  root.replaceChildren(frame);
  observer.observe(root,{childList:true});
  enterAssetDownloadMenu();
  if(options.resolveActiveDeck)void options.resolveActiveDeck().then(value=>{
    if(disposed||!frame.isConnected)return;activeDeck=value;deckStatus='ready';if(ready)context();
  },()=>{if(disposed||!frame.isConnected)return;deckStatus='unavailable';if(ready)context();});
}
