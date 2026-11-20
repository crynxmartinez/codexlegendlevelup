import {cleanProfile,KEY} from './model.mjs';

const equal=(a,b)=>!!a&&!!b&&JSON.stringify(cleanProfile(a))===JSON.stringify(cleanProfile(b));
/** Three distinct snapshots: editing, applied in this tab, and confirmed durable. */
export class ProfileState {
 constructor(storage){
  this.saved=null;this.failed=false;this.hostApplied=false;
  try{const text=storage.getItem(KEY)||storage.getItem('codex-menu-preview-v1');if(text){const raw=JSON.parse(text);if(raw&&typeof raw==='object'&&!Array.isArray(raw))this.saved=cleanProfile(raw);}}catch{}
  this.applied=cleanProfile(this.saved||{});this.draft={...this.applied};
 }
 get dirty(){return !equal(this.draft,this.applied);}
 get status(){return this.dirty?'unsaved':this.failed?'failed':equal(this.applied,this.saved)?'saved':'not-saved';}
 cancel(){this.draft={...this.applied};}
 apply(storage){
  this.applied=cleanProfile(this.draft);this.draft={...this.applied};this.hostApplied=false;
  try{storage.setItem(KEY,JSON.stringify(this.applied));this.saved={...this.applied};this.failed=false;}
  catch{this.failed=true;}
  return {profile:{...this.applied},persisted:!this.failed};
 }
 restoreSession(record){
  if(!record?.profile||typeof record.persisted!=='boolean')return;
  this.applied=cleanProfile(record.profile);this.draft={...this.applied};this.failed=!record.persisted;this.hostApplied=true;
  if(record.persisted)this.saved={...this.applied};
 }
}

/** Only catalogue paths supplied by the game may be used as preview artwork. */
export function cleanActiveDeck(raw){
 if(!raw||typeof raw!=='object'||typeof raw.name!=='string'||!raw.name.trim())return null;
 const persona=raw.persona&&typeof raw.persona==='object'?raw.persona:null;
 const art=typeof persona?.art==='string'&&/^\/(?!\/)[^\s]+$/.test(persona.art)?persona.art:null;
 return {name:raw.name.trim(),region:['Luzon','Visayas','Mindanao'].includes(raw.region)?raw.region:'Region not recorded',
  persona:persona&&typeof persona.name==='string'&&persona.name.trim()?{id:String(persona.id||''),name:persona.name.trim(),art}:null};
}
