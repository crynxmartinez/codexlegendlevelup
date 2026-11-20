import { afterEach,describe,it,expect,vi } from 'vitest';
import { TutorialSession } from './tutorial-mode.js';
describe('shared tutorial session',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('waits for the expected actor and battle event, never a text click',()=>{
    const s=new TutorialSession({id:'test',number:1,title:'Test',summary:'',focus:'orientation',steps:[
      {title:'Wait',body:'',expected:{kind:'attackResolved',defender:0}},
      {title:'Call',body:'',expected:{kind:'action',action:'call'}},
    ]});
    s.continue();s.observe({kind:'attackResolved',defender:1});expect(s.stepIndex).toBe(0);
    s.observe({kind:'attackResolved',defender:0});expect(s.stepIndex).toBe(1);
    expect(s.allows({kind:'endTurn'})).toBe(false);
    s.observe({kind:'action',action:{kind:'call',uid:'unit',slot:0}});expect(s.completed).toBe(true);
  });
  it('can finish a temporary lesson without reading or writing normal progress',()=>{
    const storage={getItem:vi.fn(()=> '["saved-lesson"]'),setItem:vi.fn()};
    vi.stubGlobal('localStorage',storage);
    const lesson={id:'temporary',number:0,title:'Temporary',summary:'',focus:'orientation' as const,steps:[
      {title:'Done',body:'',expected:{kind:'manual' as const}},
    ]};
    const temporary=new TutorialSession(lesson,{persistProgress:false});
    temporary.continue();
    expect(temporary.completed).toBe(true);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    const ordinary=new TutorialSession({...lesson,id:'ordinary'});
    ordinary.continue();
    expect(storage.getItem).toHaveBeenCalledWith('codex-legends.tutorial-progress.v1');
    expect(storage.setItem).toHaveBeenCalledWith('codex-legends.tutorial-progress.v1','["saved-lesson","ordinary"]');
  });
});
