import { destinationShell, menuElement as e } from './menu-destination.js';
import type { CardRecord } from '../data/loader.js';
import type { DeckProblem } from '../core/deckcheck.js';
import './deck-presentation.css';
import './deck-builder-approved.css';

/** Presentation only. The caller retains the draft, validation and persistence. */
export function refinedShell(page: HTMLElement, title: string, footer: HTMLElement): void {
  destinationShell(page, title, footer);
  page.className = 'deck-refined';
  page.querySelector('.destination-crumb')?.remove();
  page.querySelector('.destination-header')!.className = 'hero';
  page.querySelector('.destination-brand')!.className = 'brand';
  page.querySelector('.destination-emblem')!.className = 'brand-emblem';
  page.querySelector('.destination-wordmark')!.className = 'brand-wordmark';
  footer.className = 'refined-footer';
}

export function presentRefinedBuilder(page: HTMLElement): void {
  const bar = page.querySelector<HTMLElement>('.builder-bar')!;
  const name = bar.querySelector<HTMLInputElement>('input')!;
  const [save, cancel, learn] = Array.from(bar.querySelectorAll<HTMLButtonElement>(':scope > button'));
  const tabs = bar.querySelector<HTMLElement>('.panel-tabs')!;
  tabs.className = 'mobile-tabs'; tabs.setAttribute('aria-label','Deck Builder panels');
  for (const tab of Array.from(tabs.children)) {
    tab.className = tab.classList.contains('on') ? 'current' : '';
    tab.setAttribute('aria-pressed', String(tab.classList.contains('current')));
  }
  const columns = page.querySelector<HTMLElement>('.builder-cols')!;
  page.dataset.panel = columns.classList.contains('showing-deck') ? 'deck' : 'library';
  const region = page.querySelector('.panel-library .bpanel-h')!.textContent!.replace(/ library$/i,'');
  const label = e('label','deck-name'); label.append(e('span','','Deck name:'),name); name.className='';
  bar.className='toolbar';
  learn!.className='slant'; cancel!.className='slant'; save!.className='slant primary';
  bar.replaceChildren(label,e('span','builder-region',`Region: ${region}`),learn!,cancel!);
  columns.className='panels';
  const left=columns.querySelector<HTMLElement>('.panel-deck')!;
  const right=columns.querySelector<HTMLElement>('.panel-library')!;
  let totals: HTMLElement | undefined;
  for(const [panel,cls] of [[left,'panel your-deck'],[right,'panel library']] as const) {
    const head=panel.querySelector<HTMLElement>('.bpanel-head')!;
    const heading=head.querySelector<HTMLElement>('h3')!;
    const title=e('div','panel-title'); title.append(heading); heading.className='';
    panel.className=cls; panel.prepend(title);
    if(panel===left){totals=head.querySelector<HTMLElement>('.builder-counters')!;totals.className='totals';
      for(const counter of Array.from(totals.children)){
        const value=counter.querySelector('.bcount-n')!.textContent!;
        const [label,want]=counter.querySelector('.bcount-l')!.textContent!.split(' / ');
        counter.className=counter.classList.contains('over')?'over':counter.classList.contains('okay')?'okay':'';
        counter.replaceChildren(e('span','',label==='cards'?'Main':label),e('b','',`${value} / ${want}`));
      }head.remove();}
    else {
      const filters=e('div','filters'); const row=e('div','search-row');
      const input=head.querySelector<HTMLInputElement>('input')!; input.className='';
      row.append(input,head.querySelector('select')!);
      const chips=head.querySelector<HTMLElement>('.filter-chips')!;chips.className='chips';
      for(const chip of Array.from(chips.children)){chip.className=chip.classList.contains('on')?'current':'';chip.setAttribute('aria-pressed',String(chip.classList.contains('current')));}
      filters.append(row,chips);head.replaceWith(filters);
    }
  }
  left.querySelector('.bpanel-body')!.className='deck-scroll';
  right.querySelector('.bpanel-body')!.className='library-scroll';
  const codex=left.querySelector<HTMLElement>('.bpanel-foot')!;codex.className='codex-dock';
  codex.querySelector('.deck-grid')?.classList.replace('deck-grid','codex-row');
  const status=page.querySelector<HTMLElement>('.builder-problems')!;
  status.classList.remove('builder-problems');
  const summary=e('div','builder-summary');summary.append(status,totals!);
  const main=e('main','builder');main.append(bar,summary,columns);
  const footer=e('footer'),back=e('button','slant builder-back','‹ Back');back.onclick=()=>cancel!.click();
  footer.append(back,tabs,e('span','builder-save-note',page.dataset.dirty==='true'?'Changes not saved':'No unsaved changes'),save!);
  page.replaceChildren(main);refinedShell(page,'Deck Builder',footer);page.classList.add('builder-approved');
}

/** Missing requirements are progress; illegal entries / overages need correction. */
export function deckReadiness(problems: DeckProblem[], size: number, force: number, codex: number): 'ready'|'incomplete'|'invalid' {
  if(!problems.length)return 'ready';
  return problems.every(p=>
    (p.where==='size'&&size<50)||(p.where==='force'&&force<12)||p.where==='persona'||
    (p.where==='codex'&&codex<5&&!p.cardId&&p.message.startsWith(`${codex} Codex —`))
  )?'incomplete':'invalid';
}

export const REGION_COPY = {
  Luzon: {tag:'KEEP ALLIES AVAILABLE',copy:'Build your field with call effects and Sipol. Plan how your Allies support attacks, then rebuild for the next turn.',key:'Bayanihan · Sipol'},
  Visayas: {tag:'BUILD HEART. CHOOSE YOUR MOMENT.',copy:'Build your Heart with Sanib, then choose when to spend it through Kalas. Read each card’s Andukha requirements.',key:'Andukha · Sanib · Kalas'},
  Mindanao: {tag:'MAKE EVERY OFFER MATTER',copy:'Pair Offer costs with Allies you can afford to lose. Use Last Oath effects and ways to rebuild your field.',key:'Garahana · Offer · Last Oath'},
};
export interface RegionChoice { id:string;region:keyof typeof REGION_COPY;deck:string;tone:string;map:{left:number;top:number;width:number} }
export function presentArchipelago(page:HTMLElement, choices:readonly RegionChoice[], cards:Record<string,CardRecord>, art:(path:string)=>string, finish:(deck:string|null)=>void):void {
  const main=e('main','region-screen'), mapPane=e('section','map-pane'), detail=e('section','region-detail');
  const caption=e('div','map-caption');caption.append(e('small','','ONE DECK. ONE CARD POOL.'),e('h2','','Where will you begin?'));
  const stage=e('div','map-stage'),islands=e('div','map-islands'),note=e('p','map-note','Luzon · Visayas · Mindanao');
  stage.append(islands);
  note.append(e('br'),e('span','','Choose a region to preview its cards.'));mapPane.append(caption,stage,note);
  const tabs=e('div','region-tabs'),intro=e('div','region-intro'),roster=e('div','region-cards'),confirmation=e('div','region-confirm');
  const explanation=e('p');explanation.append(e('strong','','This choice sets your deck’s card pool.'),e('br'),document.createTextNode('To use another region later, create another deck.'));
  const create=e('button','primary slant');let selected=choices[0]!;let finished=false;
  const done=(value:string|null)=>{if(finished)return;finished=true;create.disabled=true;finish(value);};
  create.onclick=()=>done(selected.deck);confirmation.append(explanation,create);detail.append(tabs,intro,roster,confirmation);main.append(mapPane,detail);
  const buttons: {button:HTMLButtonElement;choice:RegionChoice;map:boolean}[]=[];
  for(const choice of choices){
    const island=e('button','island');island.type='button';island.setAttribute('aria-label',`Preview ${choice.region}`);
    island.style.cssText=`left:${choice.map.left}%;top:${choice.map.top}%;width:${choice.map.width}%;--map-color:${choice.tone};--map:url('/ui/philippines-${choice.id}.webp')`;
    const image=e('img');image.src=`/ui/philippines-${choice.id}.webp`;image.alt='';island.append(image,e('span','',choice.region));islands.append(island);
    const tab=e('button','',choice.region);tab.style.setProperty('--region-color',choice.tone);tabs.append(tab);
    buttons.push({button:island,choice,map:true},{button:tab,choice,map:false});
    island.onclick=tab.onclick=()=>select(choice);
  }
  function select(choice:RegionChoice){selected=choice;const info=REGION_COPY[choice.region];
    for(const item of buttons){const active=item.choice===choice;item.button.classList.toggle(item.map?'chosen':'current',active);item.button.setAttribute('aria-pressed',String(active));if(!item.map)item.button.textContent=(active?'✓ ':'')+item.choice.region;}
    intro.replaceChildren(e('small','',info.tag),e('h2','',choice.region),e('p','',info.copy),e('div','mechanics',info.key));
    roster.replaceChildren();
    Object.values(cards).filter(c=>c.deck===choice.deck&&c.type==='Unit'&&c.level===3).slice(0,3).forEach(c=>{const figure=e('figure'),img=e('img','card-art');img.src=art(c.art);img.alt=c.name;figure.append(img,e('figcaption','',c.name));roster.append(figure);});
    create.textContent=`Create ${choice.region} Deck →`;
  }
  const footer=e('footer'),back=e('button','back-design','‹ Back to Edit Deck');back.onclick=()=>done(null);footer.append(back);
  page.replaceChildren(main);refinedShell(page,'Choose Archipelago',footer);select(selected);
}
