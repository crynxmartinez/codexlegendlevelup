import {expect,it} from 'vitest';
import {appendEffect,sequenceSummary,type EffectStep} from './effect-sequence.js';
it('keeps long sequences readable and replaces the completed branch on the next effect',()=>{
  let steps:EffectStep[]=[];
  for(let i=1;i<=5;i++)steps=appendEffect(steps,`Card ${i}`,i);
  expect(sequenceSummary(steps)).toContain('Effect 5');
  expect(sequenceSummary(steps)).toContain('Card 4');
  steps=appendEffect(steps,'Next branch',2);
  expect(steps.map(s=>s.name)).toEqual(['Card 1','Next branch']);
  expect(appendEffect(steps,'Next action',1)).toEqual([{name:'Next action',index:1}]);
});
