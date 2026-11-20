import type { DeckList } from '../core/setup.js';
import { DISPLAY_CARDS as ALL_CARDS } from '../localization/display.js';
import { artUrl } from './assets.js';
import { deckAdvice } from './deck-advice.js';
import './deck-support.css';
import './modal-system.css';
import { destinationShell } from './menu-destination.js';
import { cardRole } from './deck-roles.js';
import './deck-learning-polish.css';

const guides:Record<string,{region:string;plan:string;sequence:string;lesson:string}>={
  Agta:{region:'Luzon',plan:'Build a field of Allies, then use support and extra calls to keep your attacks going.',sequence:'Develop Allies → release Bayanihan → use Sipol and call effects → attack in an order that leaves useful supporters charged.',lesson:'agta-bayanihan'},
  Babaylan:{region:'Visayas',plan:'Build your Heart before spending it. Sanib stores cards; Kalas spends them and can trigger another effect.',sequence:'Sanib cards → reach the required Andukha threshold → Kalas useful triggers → call new attackers from Heart.',lesson:'bab-heart'},
  Maguindanao:{region:'Mindanao',plan:'Offer Allies with Last Oath skills, then rebuild your field with search and recovery effects.',sequence:'Call useful Allies → Offer them as a cost → resolve the main chain → choose your waiting Last Oaths → rebuild before the next attack.',lesson:'mag-offer'},
};
export const MECHANICS=['Sanib','Kalas','Last Oath','Offer','Sipol','special call','draw','charge'];
export function deckStats(deck:DeckList){
  const levels:Record<string,number>={},costs:Record<string,number>={};
  for(const entry of deck.main){const c=ALL_CARDS[entry.id];if(!c)continue;
    const label=c.type==='Unit'?`Level ${c.level}`:c.type;levels[label]=(levels[label]??0)+entry.copies;
    const cost=c.type==='Action'?'1 play: Action':c.type==='Unit'?'1 play: normal call':c.type==='Force'?'0 plays: skill / 1 play: normal call':'0 plays: response';
    costs[cost]=(costs[cost]??0)+entry.copies;
  }
  return {levels,costs};
}
export function sampleHand(deck:DeckList,random:()=>number=Math.random):string[]{
  const cards=deck.main.flatMap(e=>Array.from({length:e.copies},()=>e.id));
  const persona=cards.indexOf(deck.persona);if(persona>=0)cards.splice(persona,1);
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j]!,cards[i]!];}
  return cards.slice(0,5);
}
export function openDeckLearning(deck:DeckList,archetype:string,inspect:(id:string,onClose:()=>void)=>void):void{
  const key = guides[archetype] ? archetype : ALL_CARDS[deck.persona]?.deck ?? 'Agta';
  const guide=guides[key] ?? guides.Agta!;
  const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog=make('dialog','','deck-learning anime-deck-learning approved-deck-guide');dialog.setAttribute('aria-label',`${guide.region} deck guide`);
  let inspecting=false;
  const read=(id:string,button:HTMLElement)=>{inspecting=true;dialog.close();inspect(id,()=>{inspecting=false;dialog.showModal();requestAnimationFrame(()=>button.focus());});};
  const close=make('button','Close');close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(inspecting)return;dialog.remove();if(opener?.isConnected)opener.focus();});
  const footer=make('footer');
  close.classList.add('guide-footer-action');close.replaceChildren(make('span','‹ BACK'));
  const practice=make('a','Practice this deck ›');practice.href=`?tutorial=journey-4&region=${guide.region.toLowerCase()}`;
  practice.classList.add('guide-footer-action','guide-practice');practice.replaceChildren(make('span','PRACTICE THIS DECK ›'));
  footer.append(close,make('span','Sample hands, inspection and practice remain available.'),practice);
  destinationShell(dialog,'Learn Deck',footer);
  const content=make('div','','guide-content');
  const plan=make('div','','guide-plan');const mainCount=deck.main.reduce((total,entry)=>total+entry.copies,0);plan.append(make('h2',deck.name),make('span',`${guide.region.toUpperCase()} · ${mainCount} CARDS + ${deck.codex.length} CODEX`,'guide-region'),make('p',guide.plan),make('p',guide.sequence,'learning-sequence'));
  const nav=make('nav','','guide-tabs');nav.setAttribute('aria-label','Deck guide sections');
  const pages=make('div','','guide-pages');
  content.append(plan,nav,pages);dialog.append(content);
  const advice = make('details', '', 'learning-advice');
  advice.append(make('summary', 'Building advice'));
  const tips = make('div', '', 'learning-advice-grid');
  for (const tip of deckAdvice(deck, key)) {
    const section = make('section');
    section.append(make('h3', tip.title), make('p', tip.count, 'learning-advice-count'), make('p', tip.text));
    tips.append(section);
  }
  advice.append(make('p', 'Suggestions for this deck, not extra deck rules. Counts include every copy.'), tips);
  const stats=deckStats(deck),counts=make('div','','learning-stats');
  for(const [title,values] of [['Cards by Level / type',stats.levels],['Plays used from hand',stats.costs]] as const){const part=make('section');part.append(make('h3',title));for(const [label,n]of Object.entries(values))part.append(make('p',`${label}: ${n}`));counts.append(part);}
  const breakdown = make('details'); breakdown.append(make('summary', 'Deck breakdown'), counts);
  const overview=make('section','','guide-overview');
  const keys=make('section','','guide-featured');keys.append(make('h3','Start with these cards'));
  const cards=make('div','','guide-card-list');keys.append(cards);
  keys.append(make('p','Select a card to see its role. Inspection keeps the full card text available.','guide-featured-note'));
  const detail=make('section','','guide-role-panel');detail.append(make('h3','How this card helps'));
  const roleBody=make('div','','guide-role-body');const roleFooter=make('div','','guide-role-footer');
  const inspectButton=make('button','⌕ INSPECT CARD','primary guide-action');roleFooter.append(inspectButton,make('small','Rules stay authoritative'));detail.append(roleBody,roleFooter);
  overview.append(keys,detail);
  const ids=[deck.persona,...deck.codex.slice(0,1),...deck.main.filter(e=>ALL_CARDS[e.id]?.level===1).slice(0,2).map(e=>e.id)];
  const featured: {id:string;button:HTMLButtonElement;badge:HTMLElement;caption:string}[]=[];
  const select=(id:string)=>{
    const c=ALL_CARDS[id]!;const role=cardRole(id);
    for(const item of featured){const selected=item.id===id;item.button.classList.toggle('selected',selected);item.button.setAttribute('aria-pressed',String(selected));item.badge.textContent=(selected?'✓ ':'')+item.caption;}
    roleBody.replaceChildren(make('p',c.name,'guide-full-name'));
    if(role){roleBody.append(make('h4',role.label),make('p',role.description));const planNote=make('div','','guide-role-note');planNote.append(make('b','In this deck’s plan'),make('p',role.planStep));roleBody.append(planNote);}
    else roleBody.append(make('h4','Read this card’s conditions'),make('p','Use the full card text below to check when this card can help. No additional role summary is authored for this card yet.'));
    const rules=make('div','','guide-rules');rules.append(make('b','Card text'),make('p',c.text.replace(/\[\/?(?:green|red|blue|yellow|purple|gold)\]/gi,'')));roleBody.append(rules);
    if(role)roleBody.append(make('p',role.caution,'guide-role-caution'));
    roleBody.scrollTop=0;inspectButton.onclick=()=>read(id,inspectButton);
  };
  for(const id of new Set(ids)){const c=ALL_CARDS[id];if(!c)continue;const b=make('button','','guide-feature-card');const image=make('img');image.src=artUrl(c.art);image.alt=c.name;const copies=deck.main.find(e=>e.id===id)?.copies??0;const caption=c.type==='Codex'?'CODEX':`${id===deck.persona?'PERSONA':`LEVEL ${c.level}`} · ${copies} ${copies===1?'COPY':'COPIES'}`;const badge=make('span',caption,'guide-card-badge');b.append(image,make('span',c.name,'guide-card-name'),badge);b.onclick=()=>select(id);b.oncontextmenu=event=>{event.preventDefault();read(id,b);};cards.append(b);featured.push({id,button:b,badge,caption});}
  if(featured.length)select(featured[0]!.id);else {cards.append(make('p','Add a Persona or featured cards to this deck.'));inspectButton.disabled=true;}
  const practicePage=make('section','','guide-reading-page');practicePage.append(make('h3','Try an opening hand'));
  const hand=make('div','','learning-hand');const deal=make('button','DEAL ANOTHER SAMPLE','guide-action');
  const render=()=>{hand.replaceChildren();const sample=sampleHand(deck);if(!sample.length)hand.append(make('p','Add main-deck cards to try a sample hand.','learning-empty'));for(const id of sample){const c=ALL_CARDS[id]!;const b=make('button');const image=make('img');image.src=artUrl(c.thumb);image.alt=c.name;b.append(image);b.onclick=()=>read(id,b);hand.append(b);}};render();deal.onclick=render;
  practicePage.append(hand,make('p','Practice sample only. Your real opening hand is shuffled separately.'),deal);
  const building=make('section','','guide-reading-page');advice.open=true;building.append(advice);
  const breakdownPage=make('section','','guide-reading-page');breakdown.open=true;breakdownPage.append(breakdown,make('p','Skill costs and Sentry conditions are separate. Read each card before spending your resources.'));
  const sections=[{name:'Overview',page:overview},{name:'Building advice',page:building},{name:'Deck breakdown',page:breakdownPage},{name:'Opening hand',page:practicePage}];
  sections.forEach(({name,page},i)=>{const button=make('button');button.dataset.label=name;button.append(make('span',(i===0?'✓ ':'')+name));button.setAttribute('aria-current',String(i===0));page.hidden=i!==0;button.onclick=()=>{sections.forEach(({page:p})=>p.hidden=p!==page);for(const b of Array.from(nav.children)){const current=b===button;b.setAttribute('aria-current',String(current));b.firstElementChild!.textContent=(current?'✓ ':'')+(b as HTMLElement).dataset.label;}};nav.append(button);pages.append(page);});
  document.body.append(dialog);dialog.showModal();close.focus();
}
