import {beforeEach,afterEach,it,expect,vi} from 'vitest';
let profileModule: typeof import('./menu-profile.js');
beforeEach(async()=>{vi.resetModules();profileModule=await import('./menu-profile.js');});
const MENU_PROFILE_KEY='codex-legends.menu-profile.v1';
const menuProfile=()=>profileModule.menuProfile();
afterEach(()=>vi.unstubAllGlobals());
function storage(values:Record<string,string>){vi.stubGlobal('localStorage',{getItem:(key:string)=>values[key]??null});}
it('reads the same legacy profile as Player Note',()=>{storage({'codex-menu-preview-v1':JSON.stringify({fighter:'amir',nickname:'Saved legacy name'})});expect(menuProfile()).toEqual({fighter:'amir',nickname:'Saved legacy name'});});
it('prefers the newly saved profile and respects long Unicode names',()=>{storage({[MENU_PROFILE_KEY]:JSON.stringify({fighter:'lira',nickname:'  Liwanag ng mga Pangarap  '}),'codex-menu-preview-v1':JSON.stringify({nickname:'Old'})});expect(menuProfile()).toEqual({fighter:'lira',nickname:'Liwanag ng mga Pangarap'});});
it('handles unavailable or damaged local storage',()=>{storage({[MENU_PROFILE_KEY]:'bad json'});expect(menuProfile().nickname).toBe('Player');vi.stubGlobal('localStorage',{getItem:()=>{throw Error('unavailable');}});expect(menuProfile().fighter).toBe('nico');});
it('uses explicitly applied session identity in the next duel when durable storage fails',()=>{
 storage({[MENU_PROFILE_KEY]:JSON.stringify({fighter:'nico',nickname:'Previously saved'})});
 expect(profileModule.applyMenuProfile({fighter:'raina',nickname:'  Session name  '},false)).toBe(true);
 expect(menuProfile()).toEqual({fighter:'raina',nickname:'Session name'});
 expect(profileModule.menuProfileSession()?.persisted).toBe(false);
 expect(profileModule.menuProfileSession()?.profile.nickname).toBe('Session name');
});
it('rejects malformed applied profiles and keeps the existing identity',()=>{
 storage({});
 expect(profileModule.applyMenuProfile({fighter:'unknown',nickname:'Bad'},true)).toBe(false);
 expect(profileModule.applyMenuProfile({fighter:'nico',nickname:''},false)).toBe(false);
 expect(profileModule.applyMenuProfile({fighter:'nico',nickname:'Good'},'yes')).toBe(false);
 expect(profileModule.menuProfileSession()).toBeNull();
 expect(menuProfile().nickname).toBe('Player');
});
it('tracks a successful retry without exposing a mutable session snapshot',()=>{
 storage({});profileModule.applyMenuProfile({fighter:'amir',nickname:'Session'},false);
 profileModule.applyMenuProfile({fighter:'lira',nickname:'Saved'},true);
 const snapshot=profileModule.menuProfileSession()!;snapshot.profile.nickname='Mutated';
 expect(profileModule.menuProfileSession()?.persisted).toBe(true);
 expect(menuProfile()).toEqual({fighter:'lira',nickname:'Saved'});
});
