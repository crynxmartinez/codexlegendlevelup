import { expect, it } from 'vitest';
import { readFeedback, saveFeedback, feedbackCsv } from './feedback-store.js';
const answers = { experience:'Some', clarity:4, pace:'About right', confusion:'Checks', returnReason:'Another deck' };
it('appends separate responses and reads them after reloading storage', () => {
  let raw: string | null = null;
  const storage = { getItem:()=>raw, setItem:(_key:string,value:string)=>{raw=value;} };
  saveFeedback(storage,answers); saveFeedback(storage,{...answers,clarity:2});
  expect(readFeedback(storage).map(r=>r.clarity)).toEqual([4,2]);
  expect(new Set(readFeedback(storage).map(r=>r.id)).size).toBe(2);
});
it('does not overwrite corrupt existing feedback', () => {
  let writes=0;
  expect(()=>saveFeedback({getItem:()=>'{bad',setItem:()=>{writes++;}},answers)).toThrow();
  expect(writes).toBe(0);
});
it('reports full or blocked storage instead of pretending to save', () => {
  expect(()=>saveFeedback({getItem:()=>null,setItem:()=>{throw Error('quota');}},answers)).toThrow('quota');
});
it('exports quotes and multiline answers safely for spreadsheets', () => {
  const csv=feedbackCsv([{...answers,id:'1',createdAt:'today',confusion:'a,"quote"\nline',returnReason:'=SUM(1,2)'}]);
  expect(csv).toContain('"a,""quote""\nline"'); expect(csv).toContain('"\'=SUM(1,2)"');
});
