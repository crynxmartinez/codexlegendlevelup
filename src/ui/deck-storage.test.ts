import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as lib from './decklib.js';
import { MATCH_INDEX, STARTERS } from '../pvp/catalog.js';
const KEY = 'codex-legends.decks', ACTIVE = 'codex-legends.activeDeck';
let data: Map<string,string>, rejectWrite: (key:string)=>boolean, failRead: boolean;
const deck = (id:string):lib.StoredDeck => ({...structuredClone(STARTERS.Luzon!),id,archetype:'Agta',updated:1});
beforeEach(()=>{
  data=new Map();rejectWrite=()=>false;failRead=false;
  vi.stubGlobal('localStorage',{
    getItem:(k:string)=>{if(failRead)throw Error('blocked');return data.get(k)??null;},
    setItem:(k:string,v:string)=>{if(rejectWrite(k))throw Error('quota');data.set(k,v);},
    removeItem:(k:string)=>{if(rejectWrite(k))throw Error('blocked');data.delete(k);},
  });
});
afterEach(()=>vi.unstubAllGlobals());
it('reports failed saving and never selects an unsaved deck; retry persists it',()=>{
  lib.saveDeck(MATCH_INDEX,deck('original'));rejectWrite=k=>k===KEY;
  expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:false,saved:false});
  expect(lib.activeDeckId()).toBe('original');expect(lib.loadDecks(MATCH_INDEX).map(d=>d.id)).toEqual(['original']);
  rejectWrite=()=>false;expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:true});
  expect(lib.activeDeckId()).toBe('new');
});
it('reports partial active-selection failure; retry updates the same record',()=>{
  lib.saveDeck(MATCH_INDEX,deck('original'));rejectWrite=k=>k===ACTIVE;
  expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:false,saved:true});
  expect(lib.activeDeckId()).toBe('original');
  rejectWrite=()=>false;lib.saveDeck(MATCH_INDEX,deck('new'));
  expect(lib.loadDecks(MATCH_INDEX).filter(d=>d.id==='new')).toHaveLength(1);
  expect(lib.activeDeckId()).toBe('new');
});
it('preserves valid entries independently and backs up damaged raw data before a rewrite',()=>{
  const raw=JSON.stringify([deck('valid'),null,{name:'broken'}]);data.set(KEY,raw);
  expect(lib.loadDecks(MATCH_INDEX).map(d=>d.id)).toEqual(['valid']);
  expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:true});
  expect(lib.loadDecks(MATCH_INDEX).map(d=>d.id).sort()).toEqual(['new','valid']);
  expect([...data].some(([k,v])=>k.startsWith(KEY+'.recovery.')&&v===raw)).toBe(true);
});
it('never overwrites damaged data when backup fails',()=>{
  const raw=JSON.stringify([deck('valid'),null]);data.set(KEY,raw);rejectWrite=k=>k.startsWith(KEY+'.recovery.');
  expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:false});expect(data.get(KEY)).toBe(raw);
});
it('refuses writes after invalid JSON or unreadable storage',()=>{
  data.set(KEY,'{broken');expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:false});expect(data.get(KEY)).toBe('{broken');
  failRead=true;expect(lib.saveDeck(MATCH_INDEX,deck('new'))).toMatchObject({ok:false});
});
it('backs up obsolete references and retains the remaining deck',()=>{
  const old=deck('old');old.main.push({id:'removed-card',copies:2});const raw=JSON.stringify([old]);data.set(KEY,raw);
  lib.saveDeck(MATCH_INDEX,deck('new'));
  expect(lib.loadDecks(MATCH_INDEX).find(d=>d.id==='old')!.main.some(e=>e.id==='removed-card')).toBe(false);
  expect([...data].some(([k,v])=>k.startsWith(KEY+'.recovery.')&&v===raw)).toBe(true);
});
it('refuses a nonexistent active deck and reports failed deletion',()=>{
  lib.saveDeck(MATCH_INDEX,deck('original'));
  expect(lib.setActiveDeck('missing')).toMatchObject({ok:false});expect(lib.activeDeckId()).toBe('original');
  rejectWrite=k=>k===KEY;expect(lib.deleteDeck(MATCH_INDEX,'original')).toMatchObject({ok:false});
  expect(lib.loadDecks(MATCH_INDEX)).toHaveLength(1);
  expect(lib.activeDeckId()).toBe('original');
});
it('does not delete an active deck if clearing its selection fails',()=>{
  lib.saveDeck(MATCH_INDEX,deck('original'));const raw=data.get(KEY);
  rejectWrite=k=>k===ACTIVE;
  expect(lib.deleteDeck(MATCH_INDEX,'original')).toMatchObject({ok:false});
  expect(data.get(KEY)).toBe(raw);expect(lib.activeDeckId()).toBe('original');
});
it('distinguishes an empty collection from read failure and leaves originals intact',()=>{
  expect(lib.readDeckCollection(MATCH_INDEX)).toMatchObject({ok:true,decks:[],recovered:false});
  failRead=true;expect(lib.readDeckCollection(MATCH_INDEX)).toMatchObject({ok:false});
  expect(lib.deleteDeck(MATCH_INDEX,'anything')).toMatchObject({ok:false});expect(data.size).toBe(0);
});
it('supports create, edit, duplicate and import with stable identities, then delete/reload',()=>{
  const original=deck('original');expect(lib.saveDeck(MATCH_INDEX,original)).toEqual({ok:true});
  const edited={...original,name:'Edited'};lib.saveDeck(MATCH_INDEX,edited);
  lib.saveDeck(MATCH_INDEX,{...edited,id:'duplicate',name:'Copy'});
  const decoded=lib.fromCode(MATCH_INDEX,lib.toCode(edited));expect(typeof decoded).not.toBe('string');
  if(typeof decoded==='string')throw Error(decoded);
  rejectWrite=k=>k===ACTIVE;
  expect(lib.saveDeck(MATCH_INDEX,decoded.deck)).toMatchObject({ok:false,saved:true});
  rejectWrite=()=>false;expect(lib.saveDeck(MATCH_INDEX,decoded.deck)).toEqual({ok:true});
  expect(lib.loadDecks(MATCH_INDEX)).toHaveLength(3);
  expect(lib.loadDecks(MATCH_INDEX).find(d=>d.id==='original')!.name).toBe('Edited');
  expect(lib.deleteDeck(MATCH_INDEX,decoded.deck.id)).toEqual({ok:true});
  expect(lib.activeDeckId()).toBeNull();expect(lib.loadDecks(MATCH_INDEX)).toHaveLength(2);
});
