import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProfileState,cleanActiveDeck} from '../assets/ui/menu-v1/profile-state.mjs';
import {KEY,Navigation} from '../assets/ui/menu-v1/model.mjs';
const memory=(initial={})=>{const values={...initial};return {values,getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v;}};};

test('a default profile is not claimed durably saved; legacy saved data is respected',()=>{
 assert.equal(new ProfileState(memory()).status,'not-saved');
 const legacy=new ProfileState(memory({'codex-menu-preview-v1':JSON.stringify({fighter:'lira',nickname:'Legacy'})}));
 assert.equal(legacy.status,'saved');assert.equal(legacy.draft.nickname,'Legacy');
});
test('editing, failure, cancel and successful retry preserve separate snapshots',()=>{
 const store=memory({[KEY]:JSON.stringify({fighter:'nico',nickname:'Old'})});const state=new ProfileState(store);
 state.draft.nickname='New';assert.equal(state.status,'unsaved');
 const failure=state.apply({setItem(){throw Error('denied');}});assert.equal(failure.persisted,false);
 assert.equal(state.status,'failed');assert.equal(state.saved.nickname,'Old');assert.equal(state.applied.nickname,'New');
 assert.equal(JSON.parse(store.values[KEY]).nickname,'Old');
 state.draft.nickname='Unapplied';state.cancel();assert.equal(state.draft.nickname,'New');assert.equal(state.status,'failed');
 const success=state.apply(store);assert.equal(success.persisted,true);assert.equal(state.status,'saved');assert.equal(JSON.parse(store.values[KEY]).nickname,'New');
 assert.equal(new ProfileState(store).draft.nickname,'New');
});
test('corrupt or denied storage does not fabricate a saved snapshot',()=>{
 assert.equal(new ProfileState(memory({[KEY]:'null'})).status,'not-saved');
 assert.equal(new ProfileState(memory({[KEY]:'broken'})).status,'not-saved');
 assert.equal(new ProfileState({getItem(){throw Error('denied');}}).status,'not-saved');
});
test('restoring a failed-write host session does not overwrite the durable snapshot',()=>{
 const state=new ProfileState(memory({[KEY]:JSON.stringify({nickname:'Old'})}));
 state.restoreSession({profile:{fighter:'amir',nickname:'Session'},persisted:false});
 assert.equal(state.status,'failed');assert.equal(state.applied.nickname,'Session');assert.equal(state.saved.nickname,'Old');assert.equal(state.hostApplied,true);
});
test('save normalizes nicknames without truncating a Unicode code point',()=>{
 const state=new ProfileState(memory());state.draft.nickname='  '+('😀'.repeat(26))+'  ';state.apply(memory());
 assert.equal(Array.from(state.applied.nickname).length,24);assert.equal(state.status,'saved');
});
test('deck context is nullable, truthful and keeps full names',()=>{
 assert.equal(cleanActiveDeck(null),null);assert.equal(cleanActiveDeck({name:''}),null);
 const clean=cleanActiveDeck({name:'Agta Set 1 — a long legacy name',region:'Mindanao',persona:{id:'sulayman',name:'Sulayman',art:'/cards/sulayman.webp'}});
 assert.equal(clean.name,'Agta Set 1 — a long legacy name');assert.equal(clean.region,'Mindanao');assert.equal(clean.persona.art,'/cards/sulayman.webp');
 assert.equal(cleanActiveDeck({name:'Deck'}).region,'Region not recorded');
});
test('missing or externally supplied Persona artwork uses a labelled fallback',()=>{
 for(const art of [null,'https://foreign.test/card.png','//foreign.test/card.png','javascript:alert(1)'])assert.equal(cleanActiveDeck({name:'Deck',region:'Luzon',persona:{name:'Taguwasi',art}}).persona.art,null);
});
test('deck-strip activation uses the existing preview-first navigation contract and Back selection',()=>{
 const nav=new Navigation();assert.equal(nav.activate('deck'),'selected');assert.equal(nav.route,'main');assert.equal(nav.activate('deck'),'enter');
 assert.equal(nav.enter('deck'),true);assert.equal(nav.back(),true);assert.equal(nav.selection.selected,'deck');assert.equal(nav.selection.armed,true);
 assert.equal(nav.activate('story'),'locked-preview');assert.equal(nav.activate('story'),'locked');assert.equal(nav.enter('story'),false);
});
