import {describe,it,expect} from 'vitest';
import {deckTheme,spectacleDuration} from './battle-feedback.js';
import {PREVIEW_STEPS} from './effects-preview.js';
describe('presentation safety',()=>{
 it('fast and minimal reduce movement without zero-duration events',()=>{
  expect(spectacleDuration(600,'fast',false)).toBeLessThan(spectacleDuration(600,'standard',false));
  expect(spectacleDuration(600,'standard',true)).toBeLessThan(spectacleDuration(600,'standard',false));
  expect(spectacleDuration(0,'fast',true)).toBeGreaterThan(0);
 });
 it('deck styling does not mistake another faction for a known deck',()=>{
  expect(deckTheme('babaylan/set-1/amara')).toBe('babaylan');
  expect(deckTheme('elf/babaylan')).toBe('neutral');
 });
 it('covers defense, checks and all three resource mechanics in the preview',()=>{
  const cues=PREVIEW_STEPS.map(s=>s[0]);
  for(const cue of ['block','impact','flip','force','essence','vent','offer','stateRelease'])expect(cues).toContain(cue);
 });
});
