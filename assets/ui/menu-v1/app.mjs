import {Navigation,menus} from './model.mjs';
import {ProfileState,cleanActiveDeck} from './profile-state.mjs';
const kit='/ui/menu-v1/kit/';
const manifest=await fetch(kit+'manifest.json').then(r=>{if(!r.ok)throw Error('Asset kit unavailable');return r.json()});
const chars=manifest.characters, nav=new Navigation(), $=s=>document.querySelector(s);
let activeDeck=null,deckStatus=parent===window?'ready':'loading',contextReceived=false;
const returnKey='codex-legends.menu-return.v1';
try {
 const saved=JSON.parse(sessionStorage.getItem(returnKey)||'null');
 if(saved&&['main','fight','note'].includes(saved.route)){
  nav.route=saved.route;nav.stack=saved.route==='main'?[]:['main'];nav.ensure();
  for(const [route,state] of Object.entries(saved.states||{}))if(menus[route]?.some(item=>item[0]===state?.selected))nav.states[route]={selected:state.selected,armed:!!state.armed};
 }
} catch { /* The title remains usable with unavailable storage. */ }
const destinations={ai:'start',friends:'pvp',deck:'decks',option:'settings',tutorial:'tutorial',log:'fighterlog'};
function openDestination(id){if(nav.busy)return true;if(destinations[id]){try{sessionStorage.setItem(returnKey,JSON.stringify({route:nav.route,states:nav.states}))}catch{}parent.postMessage({type:'codex-menu-action',action:destinations[id]},location.origin);return true;}return false;}
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin)return;
 if(event.data?.type==='codex-menu-resume'){nav.busy=false;document.querySelector('[data-choice="'+nav.selection?.selected+'"]')?.focus();return;}
 if(event.data?.type==='codex-menu-context'){
  activeDeck=cleanActiveDeck(event.data.activeDeck);deckStatus=['loading','unavailable'].includes(event.data.deckStatus)?event.data.deckStatus:'ready';
  if(!contextReceived){contextReceived=true;profileState.restoreSession(event.data.profileSession);profile=profileState.applied;draft=profileState.draft;setMotion();render();document.querySelector('[data-choice="'+nav.selection?.selected+'"]')?.focus();}
  else if(nav.route==='main'){const old=$('.active-strip'),focused=document.activeElement===old,newStrip=activeDeckStrip();old?.replaceWith(newStrip);if(focused)newStrip.focus();}
 }
 if(event.data?.type==='codex-menu-profile-ack'){profileState.hostApplied=true;updateSaveStatus();}
});
const profileStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const profileState=new ProfileState(profileStorage);
let profile=profileState.applied,draft=profileState.draft,tab='playmat',toastTimer,transitionTimer;
const e=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el};
const img=(src,cls,alt='')=>{const i=e('img',cls);i.src=src;i.alt=alt;i.draggable=false;return i};
const icon=id=>img(['note','fight'].includes(id)?'/ui/menu-v1/icon-'+id+'.svg':kit+'svg/icon-'+id+'.svg','icon');
const character=(id=profile.fighter)=>chars.find(c=>c.id===id)||chars[0];
const art=(id,cls='character-art')=>img('/'+character(id).duelist,cls,character(id).name);
const titles={main:'Main Menu',fight:'Fight',note:'Player Note',fighter:'Choose Fighter',nickname:'Nickname',cosmetics:'Playmat & Sleeves',option:'Option',ai:'VS AI',friends:'Play with Friends',rank:'Rank',log:'Fighter Log',deck:'Edit Deck',tutorial:'Tutorial'};
function announce(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function save(){if(nav.busy||(nav.route==='nickname'&&!draft.nickname.trim()))return;profileState.draft=draft;const result=profileState.apply(profileStorage);profile=profileState.applied;draft=profileState.draft;parent.postMessage({type:'codex-menu-profile-applied',...result},location.origin);announce(result.persisted?'Saved on this device.':'Could not save on this device. Your changes are applied here.');if($('#nickname'))$('#nickname').value=draft.nickname;setMotion();updateSaveStatus();}
function saveCopy(){const state=profileState.status;return state==='unsaved'?['○','Unsaved changes','Apply to store these changes on this device.']:state==='failed'?['!','Could not save on this device',profileState.hostApplied?'Applied for this game session. Retry to keep it after closing this tab.':'Applied here for this session. Retry to keep it after closing this tab.']:state==='saved'?['✓','Saved on this device','Your nickname and fighter are stored in this browser.']:['○','Not saved on this device','Apply to keep this profile in this browser.'];}
function saveStatus(){const box=e('div','profile-save-status');box.setAttribute('role','status');box.setAttribute('aria-live','polite');return box;}
function updateSaveStatus(){profileState.draft=draft;const [symbol,title,body]=saveCopy();document.querySelectorAll('.profile-save-status').forEach(box=>{const key=profileState.status+body;if(box.dataset.statusKey===key)return;box.dataset.statusKey=key;box.dataset.state=profileState.status;const copy=e('div');copy.append(e('strong','',title),e('p','',body));box.replaceChildren(e('span','status-symbol',symbol),copy);});document.querySelectorAll('[data-save-profile]').forEach(b=>{b.textContent=profileState.status==='failed'?'RETRY SAVE':b.dataset.saveProfile;b.disabled=nav.route==='nickname'&&!draft.nickname.trim();});const preview=$('.profile-stage .profile-preview-state');if(preview)preview.textContent=character(draft.fighter).name+' · '+(profileState.dirty?'Draft preview':profileState.status==='saved'?'Saved profile':'Session profile');if(menus[nav.route]){const saved=$('.profile-badge-status');if(saved)saved.textContent=title;}updateFooter();}
function setMotion(){document.body.classList.toggle('reduce',!profile.motion||matchMedia('(prefers-reduced-motion: reduce)').matches);}
function button(text,fn,cls='action'){const b=e('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function portrait(id){const p=e('div','portrait');p.dataset.person=id;p.append(art(id,''));return p}
function navigate(action){if(nav.busy)return;nav.busy=true;const reduced=document.body.classList.contains('reduce');$('#wipe').classList.remove('go');if(!reduced){void $('#wipe').offsetWidth;$('#wipe').classList.add('go')}
clearTimeout(transitionTimer);setTimeout(()=>{action();profileState.cancel();draft=profileState.draft;tab='playmat';render();},reduced?0:140);
transitionTimer=setTimeout(()=>{nav.busy=false;$('#wipe').classList.remove('go');(document.querySelector('[data-choice="'+nav.selection?.selected+'"]')||$('#title')).focus({preventScroll:true})},reduced?20:340);}
function enter(){const item=menus[nav.route]?.find(x=>x[0]===nav.selection.selected);if(!item)return;
if(item[4]){announce('Locked — coming later.');return;}if(!nav.selection.armed){nav.activate(item[0]);updateSelection();return;}if(!openDestination(item[0]))navigate(()=>nav.enter(item[0]));}
function select(id){const result=nav.activate(id);if(result==='enter'){if(!openDestination(id))navigate(()=>nav.enter(id));return;}
if(result==='locked'||result==='locked-preview'){announce('Locked — coming later.');const tile=$('[data-choice="'+id+'"]');tile?.classList.remove('lock-nudge');if(tile){void tile.offsetWidth;tile.classList.add('lock-nudge')}}if(result!=='busy'&&result!=='invalid')updateSelection();}
function updateSelection(){document.querySelectorAll('[data-choice]').forEach(b=>{const selected=b.dataset.choice===nav.selection.selected;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});const strip=$('.active-strip');if(strip)strip.setAttribute('aria-pressed',String(nav.selection.selected==='deck'));renderArt();updateFooter();}
function renderArt(){const old=$('.art-panel');if(!old)return;old.replaceWith(makeArt());}
function makeArt(){
 const item=menus[nav.route]?.find(x=>x[0]===nav.selection.selected),id=item?.[0];
 const p=e('aside','art-panel fresh');p.setAttribute('aria-label','Selected menu preview');
 let charId=({option:'amir',tutorial:'lira',ai:'nico',log:'raina'})[id]||profile.fighter;
 if(id==='story')charId='lira';if(id==='friends')charId='amir';if(id==='rank')charId='dario';if(id==='collection')charId='celina';if(id==='shop')charId='raina';
 if(id==='fight'){p.classList.add('approved-duel');const illustration=e('div','approved-duel-art');illustration.setAttribute('role','img');illustration.setAttribute('aria-label','Nico and Amir face each other holding Codex cards — approved illustration');p.append(illustration);}
 if(id==='friends'){p.classList.add('duo');p.append(art('amir','character-art secondary'));charId='nico';}
 if(id==='deck'||id==='collection'){
 p.classList.add('cards-panel');const fan=e('div','card-fan');for(const region of ['visayas','mindanao','luzon'])fan.append(img('/ui/menu-v1/cards/'+region+'.webp','',region+' Persona card'));p.append(fan);
 }else if(id==='cosmetics'||id==='shop'){
 p.classList.add('cosmetics-panel');p.append(img(profile.playmat==='sky'?'/ui/menu-v1/sky.webp':'/ui/anime-v1/arena.webp','mat-art','Playmat preview'),img('/ui/card-back.webp','sleeve-art','Original Codex sleeve'));
 }else if(id!=='fight')p.append(art(charId));
 const copy=e('div','panel-copy');copy.append(e('h2','',item?.[1]||'Codex Legend'),e('p','',item?.[3]||''));
 if(id==='deck'&&activeDeck)copy.append(e('p','active-deck-preview-name',activeDeck.name),e('p','active-deck-preview-meta',activeDeck.region+' · '+(activeDeck.persona?'Persona · '+activeDeck.persona.name:'Persona not recorded')));
 if(nav.route==='note')copy.append(e('p','eyebrow',profile.nickname+' · '+character().name));
 if(item?.[4])copy.append(e('p','eyebrow','LOCKED · COMING LATER'));
 p.append(copy);return p;
}
function menu(){
 const layout=e('section','menu-layout'),left=e('div','menu-left'),tiles=e('div','tiles'+(nav.route==='note'?' note-tiles':''));
 tiles.setAttribute('aria-label',titles[nav.route]+' choices');
 for(const [id,title,ico,desc,locked] of menus[nav.route]){
 const b=button('',()=>select(id),'tile'+(locked?' locked':''));b.dataset.choice=id;b.setAttribute('aria-label',title+(locked?' — locked':''));b.setAttribute('aria-pressed',String(nav.selection.selected===id));if(nav.selection.selected===id)b.classList.add('selected');
 b.append(e('strong','',title),icon(id==='note'?'note':ico));if(locked)b.append(img('/ui/menu-v1/chain.svg','chain'),img(kit+'svg/padlock.svg','lock'),e('span','locked-caption','LOCKED'));
 b.addEventListener('keydown',ev=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();const bs=[...tiles.children],i=bs.indexOf(b),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-2,ArrowDown:2}[ev.key];bs[(i+delta+bs.length)%bs.length].focus();}});tiles.append(b);
 }
 const badge=nav.route==='main'?activeDeckStrip():e('p','deck-badge');if(nav.route!=='main'){badge.append(e('span','','PLAYER: '+profile.nickname.toUpperCase()));if(nav.route==='note')badge.append(e('small','profile-badge-status',saveCopy()[1]));badge.title='Your player profile';}
 left.append(tiles,badge);layout.append(left,makeArt());return layout;
}
function activeDeckStrip(){
 const b=button('',()=>select('deck'),'active-strip');b.setAttribute('aria-pressed',String(nav.selection.selected==='deck'));
 const name=deckStatus==='loading'?'Loading deck details…':deckStatus==='unavailable'?'Deck details unavailable':activeDeck?.name||'No active deck',persona=activeDeck?.persona;
 b.setAttribute('aria-label',activeDeck?`Active deck ${name}, ${activeDeck.region}, ${persona?'Persona '+persona.name:'Persona not recorded'}. Preview Edit Deck; activate again to enter.`:name+'. Preview Edit Deck; activate again to choose a deck.');b.setAttribute('aria-busy',String(deckStatus==='loading'));
 const media=e('span','active-art'),picture=img(persona?.art||'/ui/card-back.webp','',persona?.art?persona.name:'Existing sleeve — Persona artwork unavailable');
 const fallback=()=>{picture.onerror=null;picture.src='/ui/card-back.webp';picture.alt='Existing sleeve — Persona artwork unavailable';media.classList.add('missing');if(!media.querySelector('small'))media.append(e('small','','NO ART'));};
 picture.addEventListener('error',fallback,{once:true});media.append(picture);if(!persona?.art)media.append(e('small','',deckStatus==='loading'?'LOADING':deckStatus==='unavailable'?'UNAVAILABLE':activeDeck?'NO ART':'NO DECK'));
 const copy=e('span','active-copy');copy.append(e('span','deck-eyebrow',activeDeck?'ACTIVE DECK · '+activeDeck.region.toUpperCase():'ACTIVE DECK'),e('strong','deck-title',name),e('span','deck-meta',deckStatus==='loading'?'Checking your saved selection.':deckStatus==='unavailable'?'Open Edit Deck to review your selection.':activeDeck?(persona?'Persona · '+persona.name:'Persona not recorded'):'Choose a deck in Edit Deck.'));b.title=name;
 b.append(media,copy,e('span','deck-go','EDIT DECK ›'));return b;
}
function fighter(){
 const wrap=e('section','fighter-view'),c=character(draft.fighter),idx=chars.indexOf(c),stage=e('div','carousel');
 stage.append(art(chars[(idx+5)%6].id,'neighbor'),art(chars[(idx+1)%6].id,'neighbor right'),art(c.id,'hero'));
 const choose=id=>{draft.fighter=id;renderContent();updateSaveStatus();};
 stage.append(button('‹',()=>choose(chars[(idx+5)%6].id),'arrow prev'),button('›',()=>choose(chars[(idx+1)%6].id),'arrow next'));
 stage.querySelector('.prev').ariaLabel='Previous fighter';stage.querySelector('.next').ariaLabel='Next fighter';
 const name=e('div','fighter-label');name.append(e('h2','',c.name),e('p','',c.region));stage.append(name);
 const pp=e('aside','portrait-preview');pp.append(e('p','','PORTRAIT PREVIEW'),portrait(c.id),e('strong','',profile.nickname),saveStatus());stage.append(pp);
 const roster=e('div','roster');roster.setAttribute('aria-label','Choose a fighter');
 chars.forEach(ch=>{const b=button('',()=>choose(ch.id),'fighter-thumb'+(ch.id===draft.fighter?' selected':''));b.dataset.fighter=ch.id;b.setAttribute('aria-label',ch.name);b.setAttribute('aria-pressed',String(ch.id===draft.fighter));b.append(portrait(ch.id),e('small','',ch.name.split(' ')[0]));if(ch.id===profile.fighter)b.append(e('span','tick','✓'));roster.append(b);});
 wrap.append(stage,roster);return wrap;
}
function profileArt(){
 const panel=e('aside','profile-art');panel.append(art(draft.fighter,''));const name=e('div','profile-name');name.append(e('strong','',draft.nickname),e('div','',character(draft.fighter).name));panel.append(name);return panel;
}
function detail(){
 if(nav.route==='nickname')return nicknameEditor();
 const wrap=e('section','detail-layout'),body=e('div','detail-body');body.append(e('h2','',titles[nav.route]));
 if(nav.route==='log'){for(const [label,action] of [['Patch notes','devlog'],['Feedback','feedback']])body.append(button(label,()=>parent.postMessage({type:'codex-menu-action',action},location.origin)));}
 if(nav.route==='log'){
 body.append(e('p','','Match-by-match history is available from History during a duel.'),e('p','notice','Saved cross-match records are not available yet.'));
 }
 wrap.append(body,profileArt());return wrap;
}

function nicknameEditor(){
 const page=e('section','profile-note-page'),wrap=e('div','profile-edit-layout'),editor=e('div','profile-editor'),tabs=e('nav','profile-tabs');tabs.setAttribute('aria-label','Player Note sections');page.append(e('p','profile-route-label','PLAYER NOTE / NICKNAME'),wrap);
 for(const [route,label] of [['fighter','Fighter'],['nickname','Nickname'],['cosmetics','Playmat & Sleeves']]){const b=button((route===nav.route?'✓ ':'')+label,()=>{if(route!==nav.route)navigate(()=>{nav.route=route;nav.ensure();});},'profile-tab'+(route===nav.route?' selected':''));b.setAttribute('aria-current',route===nav.route?'page':'false');tabs.append(b);}
 const surface=e('div','profile-surface'),heading=e('div');heading.append(e('span','profile-eyebrow','YOUR PLAYER IDENTITY'),e('h2','','Make your name known.'));
 const field=e('div'),label=e('label','','Nickname'),input=e('input');input.id='nickname';input.type='text';input.maxLength=24;input.value=draft.nickname;input.autocomplete='off';label.htmlFor='nickname';input.setAttribute('aria-describedby','nickname-help');
 input.addEventListener('input',()=>{draft.nickname=input.value;$('.profile-stage .profile-preview-name').textContent=input.value||'Player';updateSaveStatus();});
 const help=e('p','profile-help','This name appears beside your selected character. Up to 24 characters.');help.id='nickname-help';field.append(label,input,help);
 const actions=e('div','profile-actions');actions.append(button('CANCEL',()=>navigate(()=>nav.back()),'profile-button'),button('SAVE NAME',save,'profile-button primary'));actions.lastElementChild.dataset.saveProfile='SAVE NAME';
 surface.append(heading,field,saveStatus(),e('p','profile-local-note','Local saving does not sync your profile to another browser or device.'),actions);editor.append(tabs,surface);
 const stage=e('aside','profile-stage');stage.setAttribute('aria-label','Profile preview');stage.append(art(draft.fighter,''));const overlay=e('div','profile-overlay'),copy=e('div');copy.append(e('span','profile-eyebrow','PROFILE PREVIEW'),e('h2','profile-preview-name',draft.nickname),e('p','profile-preview-state',character(draft.fighter).name));overlay.append(portrait(draft.fighter),copy);stage.append(overlay);wrap.append(editor,stage);return page;
}

function cosmetics(){
 const wrap=e('section','cosmetic-view'),left=e('div','cosmetic-left'),tabs=e('div','tabs');tabs.setAttribute('role','tablist');
 for(const t of ['playmat','sleeves']){const b=button(t.toUpperCase(),()=>{tab=t;renderContent()},'action'+(tab===t?' primary':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===t));tabs.append(b)}
 const choices=e('div','choices');const options=tab==='playmat'?[['current','Current Field','Existing battlefield','/ui/anime-v1/arena.webp']]:[['original','Original Sleeve','Existing Codex card back','/ui/card-back.webp']];
 for(const [id,title,desc,src]of options){const selected=(tab==='playmat'?draft.playmat:draft.sleeve)===id;const b=button('',()=>{if(tab==='playmat')draft.playmat=id;else draft.sleeve=id;renderContent()},'choice'+(selected?' selected':'')+(tab==='sleeves'?' sleeve':''));b.dataset.cosmetic=id;b.setAttribute('aria-pressed',String(selected));const t=e('div');t.append(e('strong','',title),e('small','',desc));b.append(img(src,'',title),t);choices.append(b)}
 left.append(tabs,choices,saveStatus());
 const right=e('div','cosmetic-right'+(tab==='sleeves'?' sleeves-mode':''));
 if(tab==='sleeves'){
  const sleeve=e('div','sleeve-preview');sleeve.append(img('/ui/card-back.webp','','Original sleeve'));right.append(sleeve);
 }else{
  const field=e('div','field-preview');field.append(img(draft.playmat==='sky'?'/ui/menu-v1/sky.webp':'/ui/anime-v1/arena.webp','','Selected playmat'));right.append(field);
 }
 wrap.append(left,right);return wrap;
}
function renderContent(){const content=$('#content');content.replaceChildren(menus[nav.route]?menu():nav.route==='fighter'?fighter():nav.route==='cosmetics'?cosmetics():detail());updateSaveStatus();}
function updateFooter(){
 $('#back').hidden=nav.route==='main';const b=$('#enter');b.disabled=false;b.hidden=false;
 if(menus[nav.route]){const i=menus[nav.route].find(x=>x[0]===nav.selection.selected);b.textContent=i[4]?'LOCKED':nav.selection.armed?'ENTER ›':'SELECT ›';b.disabled=!!i[4];$('#hint').textContent=nav.selection.armed?'Click the selected tile again, or press Enter.':'Click once to preview. Click again to enter.';}
 else if(nav.route==='fighter'){b.textContent=profileState.status==='failed'?'RETRY SAVE':'USE THIS FIGHTER';$('#hint').textContent='Preview a fighter, then confirm your choice.';}
 else if(nav.route==='nickname'){b.hidden=true;$('#hint').textContent='Preview your changes. Apply when ready.';}
 else if(nav.route==='cosmetics'||nav.route==='option'){b.textContent=profileState.status==='failed'?'RETRY SAVE':'APPLY';$('#hint').textContent='Preview first. Apply when ready.';}
 else{b.hidden=true;$('#hint').textContent='Use Back to return.';}
}
function render(){$('#shell').dataset.route=nav.route;$('#title').textContent=nav.route==='nickname'?'Player Note':titles[nav.route];$('#title').tabIndex=-1;$('#crumb').textContent=nav.route==='main'?'CODEX LEGEND TCG':'MAIN MENU / '+(nav.route==='note'?'PROFILE':nav.route.toUpperCase());renderContent();updateFooter();}
$('#back').addEventListener('click',()=>navigate(()=>nav.back()));
$('#enter').addEventListener('click',()=>{if(nav.busy)return;if(menus[nav.route]){enter();return}if(['fighter','nickname','cosmetics','option'].includes(nav.route)){save();if(nav.route==='fighter')renderContent();}});
document.addEventListener('keydown',ev=>{if(ev.repeat)return;if(ev.key==='Escape'&&nav.stack.length){ev.preventDefault();navigate(()=>nav.back())}if(ev.key==='Enter'&&(ev.target===document.body||ev.target===$('#title')||ev.target===$('#nickname'))){ev.preventDefault();if(nav.route==='nickname'){if(draft.nickname.trim())save();}else $('#enter').click()}});
setMotion();render();
parent.postMessage({type:'codex-menu-ready'},location.origin);
