import { destinationReady, menuNavigate } from './menu-transition.js';
import './menu-destination.css';

export const menuElement = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); node.className = cls; node.textContent = text; return node;
};
const e = menuElement;

// Modern Baybayin spellings: Luson, Bisayas and Mindanaw.
// Latin region names remain alongside these marks for identification.
const REGION_BAYBAYIN: Record<string, string> = {
  luzon: 'ᜎᜓᜐᜓᜈ᜔', visayas: 'ᜊᜒᜐᜌᜐ᜔', mindanao: 'ᜋᜒᜈ᜔ᜇᜈᜏ᜔',
};

/** Shared chrome only: callers continue to own their state and controls. */
export function destinationShell(page: HTMLElement, title: string, footer?: HTMLElement): void {
  page.classList.add('menu-destination');
  const header = e('header', 'destination-header');
  const heading = e('h1', '', title); heading.tabIndex = -1;
  const brand = e('div', 'destination-brand'); brand.setAttribute('role','img'); brand.setAttribute('aria-label','Codex Legend TCG');
  brand.append(e('span','destination-emblem'),e('span','destination-wordmark'));
  header.append(heading,brand); page.prepend(header);
  const crumb=e('div','destination-crumb',`Main Menu / ${title}`); page.append(crumb);
  if (footer) { footer.classList.add('destination-footer'); page.append(footer); }
  destinationReady(page);
}

export interface ShelfPresentationState { tab: 'starter' | 'saved'; selected: string; scrollTop?: number; restoreFocus?: boolean }
export function presentDeckShelf(page: HTMLElement, state: ShelfPresentationState): void {
  const cards = Array.from(page.querySelectorAll<HTMLElement>('.shelf-card:not(.shelf-add)'));
  let armed = false;
  const add = page.querySelector<HTMLElement>('.shelf-add')!;
  const footer = page.querySelector<HTMLElement>(':scope > .row')!;
  const help = page.querySelector<HTMLElement>(':scope > .subtle')!;
  const importButton = footer.querySelector<HTMLButtonElement>('button:first-child')!;
  const back = footer.querySelector<HTMLButtonElement>('button:last-child')!;
  const controls = new Map(cards.map(card => [card.dataset.deckId!, Array.from(card.querySelectorAll<HTMLButtonElement>('.shelf-actions button'))]));
  const left = e('section','destination-left shelf-choice-pane');
  const list = e('div','destination-deck-list');
  list.setAttribute('aria-label','Starter and saved decks');
  const create = e('button','destination-create','＋ Create Deck'); create.onclick = () => add.click();
  importButton.textContent='↓ Import Code'; importButton.className='destination-create';
  const utilities=e('div','shelf-library-actions'); utilities.append(create,importButton);
  const preview = e('aside','destination-preview shelf-preview'); preview.setAttribute('aria-live','polite');
  const footerActions=e('div','shelf-footer-actions');
  left.append(list,utilities);
  page.replaceChildren(left,preview);
  help.className = 'destination-help'; help.textContent='Select a deck to preview.';
  footer.replaceChildren(back,help,footerActions);
  destinationShell(page,'Edit Deck',footer);
  page.classList.add('deck-shelf-v2');
  page.querySelector('.destination-crumb')?.remove();
  const regionOrder = ['Luzon','Visayas','Mindanao'];
  cards.sort((a,b) => Number(b.classList.contains('built-in'))-Number(a.classList.contains('built-in'))
    || (a.classList.contains('built-in') ? regionOrder.indexOf(a.dataset.region!) - regionOrder.indexOf(b.dataset.region!) : 0));
  function show(card: HTMLElement) {
    state.selected = card.dataset.deckId!;
    state.tab=card.classList.contains('built-in')?'starter':'saved';
    for (const button of Array.from(list.querySelectorAll<HTMLElement>('button'))) {
      const selected = button.dataset.deckId === state.selected;
      button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected));
    }
    const art = card.querySelector<HTMLElement>('.shelf-art')!;
    const hero = e('div','shelf-hero'); hero.style.backgroundImage = card.dataset.previewArt ? `url("${card.dataset.previewArt}")` : art.style.backgroundImage;
    hero.setAttribute('role','img'); hero.setAttribute('aria-label',card.querySelector('.shelf-name')!.textContent!+' deck artwork');
    const fighter=e('img','shelf-fighter'); fighter.src=card.dataset.fighterArt||'/ui/menu-v1/characters/nico.webp'; fighter.alt='';
    const copy = e('div','destination-copy');
    copy.append(e('h2','',card.querySelector('.shelf-name')!.textContent!),e('p','',card.querySelector('.shelf-sub')!.textContent!));
    if (card.classList.contains('active')) copy.append(e('p','active-deck-caption','✓ Active deck'));
    const counts=e('dl','shelf-composition');
    for(const count of JSON.parse(card.dataset.counts||'[]') as Array<{label:string;value:number}>){const item=e('div');item.append(e('dt','',count.label),e('dd','',String(count.value)));counts.append(item);}
    copy.append(counts);
    const auxiliary=e('div','shelf-auxiliary'); footerActions.replaceChildren();
    // Reuse the original buttons, including disabled state and storage/validation handlers.
    for(const control of controls.get(state.selected)??[]){
      const isAuxiliary=control.dataset.shelfAction==='learn'||control.dataset.shelfAction==='more';
      (isAuxiliary?auxiliary:footerActions).append(control);
    }
    preview.replaceChildren(hero,fighter,copy,auxiliary);
  }
    for (const card of cards) {
      const name = card.querySelector('.shelf-name')!.textContent!;
      const button = e('button','destination-deck-tile'); button.dataset.deckId=card.dataset.deckId;
      button.dataset.region=card.dataset.region?.toLowerCase();
      const art=e('span','deck-tile-art');
      art.style.backgroundImage=card.dataset.bannerArt?`url("${card.dataset.bannerArt}")`:card.querySelector<HTMLElement>('.shelf-art')!.style.backgroundImage;
      const words=e('span','deck-tile-words');
      const region=e('span','deck-tile-region',REGION_BAYBAYIN[card.dataset.region?.toLowerCase()??'']??'');region.lang='tl-Tglg';region.setAttribute('aria-hidden','true');
      words.append(region,e('strong','',name),e('small','',card.classList.contains('built-in')?'Demo / Starter':card.dataset.region??'Saved deck'));
      if(card.classList.contains('active'))button.append(e('span','shelf-active-tag','Active'));
      const check=e('span','shelf-selection-mark','✓'); check.setAttribute('aria-hidden','true');button.append(art,words,check);
      button.onclick=()=>{
        if(!armed || state.selected!==card.dataset.deckId){armed=true;show(card);return;}
        state.restoreFocus=true;
        controls.get(state.selected)?.find(control=>control.dataset.shelfAction==='view')?.click();
      }; list.append(button);
    }
  if(cards.length)show(cards.find(c=>c.dataset.deckId===state.selected)||cards.find(c=>c.classList.contains('active'))||cards[0]!);
  list.scrollTop=state.scrollTop??0;
  list.addEventListener('scroll',()=>{state.scrollTop=list.scrollTop;},{passive:true});
  if(state.restoreFocus){
    state.restoreFocus=false;
    const selected=Array.from(list.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.dataset.deckId===state.selected);
    selected?.setAttribute('data-menu-focus','');
    requestAnimationFrame(()=>selected?.focus({preventScroll:true}));
  }
}

export function presentDeckBuilder(page: HTMLElement): void {
  const footer=e('footer','', 'Select library cards to add · Select deck cards to remove · Inspect for full card text');
  destinationShell(page,'Deck Builder',footer);
  page.querySelector('.destination-crumb')!.textContent='Edit Deck';
}

/** Existing settings nodes are regrouped; storage and callbacks are untouched. */
export function presentOptions(body: HTMLElement, close: HTMLButtonElement): HTMLElement {
  for (const choice of Array.from(body.querySelectorAll<HTMLElement>('.set-choice'))) {
    const hint=choice.querySelector<HTMLElement>('.sc-hint');
    if(hint){choice.title=hint.textContent||'';choice.setAttribute('aria-description',hint.textContent||'');hint.hidden=true;}
  }
  const page=e('section','option-destination');
  const nav=e('nav','option-categories'); nav.setAttribute('aria-label','Setting categories');
  const content=e('section','option-content');
  const sections=Array.from(body.children) as HTMLElement[];
  const group=(titles:string[])=>sections.filter(s=>titles.includes(s.querySelector('.set-title')?.textContent||''));
  const groups=[
    ['Gameplay',group(['Language / Wika','Duel pace','Effect prompts','Opponent'])],
    ['Display',group(['Board','Performance check'])],
    ['Audio',group(['Sound'])],
    ['Accessibility',group(['Animation and comfort'])],
    ['About & Credits',group(['About'])],
  ] as const;
  const panels=groups.map(([title,nodes],i)=>{
    const panel=e('div','option-group'); panel.hidden=i!==0;
    const heading=e('h2'); heading.append(e('span','',title));
    const controls=e('div','option-group-controls'); controls.append(...nodes);
    panel.append(heading,controls); content.append(panel);
    const button=e('button',i===0?'selected':'',title); button.setAttribute('aria-pressed',String(i===0));
    const icon=e('img','option-category-icon'); icon.alt='';
    icon.src=`/ui/menu-v1/kit/svg/icon-${['fight','playmat','option','player','info'][i]}.svg`; button.append(icon);
    button.onclick=()=>{for(const p of panels)p.hidden=p!==panel;for(const b of Array.from(nav.children)){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}content.scrollTop=0;};
    nav.append(button); return panel;
  });
  for(const note of Array.from(content.querySelectorAll('p'))) {
    if(note.textContent?.includes('cutscene toggle above')) note.textContent=note.textContent.replace('cutscene toggle above','Personify cutscenes switch in Display');
  }
  const footer=e('footer'); close.textContent='‹ Back'; footer.append(close,e('span','','Changes save immediately.'));
  page.append(nav,content); destinationShell(page,'Option',footer); document.body.append(page);
  const frame=document.querySelector<HTMLIFrameElement>('.game-main-menu'); if(frame)frame.inert=true;
  close.onclick=()=>{void menuNavigate(()=>{page.remove();if(frame){frame.inert=false;frame.contentWindow?.postMessage({type:'codex-menu-resume'},location.origin);frame.focus();}destinationReady();});};
  page.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('.modal-bg')){event.preventDefault();close.click();}});
  destinationReady(page); return page;
}
