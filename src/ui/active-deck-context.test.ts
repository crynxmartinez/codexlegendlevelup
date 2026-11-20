import {afterEach,it,expect,vi} from 'vitest';
import {activeDeckContext,resolveActiveSelection,resolveTitleActiveDeck,TITLE_BUILTIN_DECKS} from './active-deck-context.js';
function storage(values:Record<string,string>={}){vi.stubGlobal('localStorage',{getItem:(key:string)=>values[key]??null});}
afterEach(()=>vi.unstubAllGlobals());
it('resolves all real starter decks with the actual display name, region and current Persona artwork',()=>{
 for(const [archetype,region] of [['Agta','Luzon'],['Babaylan','Visayas'],['Maguindanao','Mindanao']]){
  storage({'codex-legends.activeDeck':`builtin:${archetype}`});const selection=resolveActiveSelection()!;const context=activeDeckContext(selection)!;
  expect(selection.deck).toBe(TITLE_BUILTIN_DECKS[archetype!]);expect(context.name).toBe(selection.deck.name);expect(context.region).toBe(region);
  expect(context.persona?.id).toBe(selection.deck.persona);expect(context.persona?.art).toMatch(/^\/cards\//);expect(context.persona?.name.length).toBeGreaterThan(0);
 }
});
it('derives a saved deck region from its Persona instead of its arbitrary custom name',()=>{
 const saved={...TITLE_BUILTIN_DECKS.Babaylan!,id:'saved',name:'North',archetype:'Babaylan',updated:1};
 storage({'codex-legends.activeDeck':'saved','codex-legends.decks':JSON.stringify([saved])});
 const context=resolveTitleActiveDeck()!;expect(context.name).toBe('North');expect(context.region).toBe('Visayas');
});
it('does not promote absent, deleted, unknown or illegal saved selections',()=>{
 storage();expect(resolveActiveSelection()).toBeNull();
 storage({'codex-legends.activeDeck':'builtin:Unknown'});expect(resolveActiveSelection()).toBeNull();
 storage({'codex-legends.activeDeck':'deleted'});expect(resolveActiveSelection()).toBeNull();
 const broken={...TITLE_BUILTIN_DECKS.Agta!,id:'broken',name:'Broken',archetype:'Agta',updated:1,main:[]};
 storage({'codex-legends.activeDeck':'broken','codex-legends.decks':JSON.stringify([broken])});expect(resolveActiveSelection()).toBeNull();
 expect(activeDeckContext(null)).toBeNull();
});
it('surfaces denied storage to the boot loading status without writing or deleting anything',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>{throw Error('Denied');},setItem:vi.fn()});expect(()=>resolveTitleActiveDeck()).toThrow('Denied');
 expect(localStorage.setItem).not.toHaveBeenCalled();
});
