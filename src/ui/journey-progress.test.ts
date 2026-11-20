import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { JOURNEY_CHAPTERS, JOURNEY_KEY, JOURNEY_LESSON_VERSION, readJourney, startJourney, selectJourneyRegion, completeJourney, finishEncounter, resetJourney, legacyJourneyChapter } from './journey-progress.js';
let store: Map<string,string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', { getItem:(k:string)=>store.get(k)??null, setItem:(k:string,v:string)=>store.set(k,v) });
});
afterEach(()=>vi.unstubAllGlobals());
describe('five-chapter journey progress', () => {
  it('has exactly five chapters and preserves proven old battle completions', () => {
    expect(JOURNEY_CHAPTERS.map(c=>c.id)).toEqual([1,2,3,4,5]);
    store.set('codex-legends.first-battle.v1',JSON.stringify({version:1,chapter:2,completed:true}));
    store.set('codex-legends.next-battle.v1',JSON.stringify({version:1,completed:true}));
    store.set('codex-legends.tutorial-progress.v1',JSON.stringify(['practice','mag-challenge']));
    store.set('codex-legends.archipelago-challenge.v1','3');
    expect(readJourney().completed).toEqual([1,2]);
    expect(store.get('codex-legends.archipelago-challenge.v1')).toBe('3');
    expect(store.get('codex-legends.tutorial-progress.v1')).toContain('mag-challenge');
  });
  it('does not promote old catalogue clicks or unfinished First Battle', () => {
    store.set('codex-legends.first-battle.v1',JSON.stringify({version:1,chapter:2,completed:false}));
    store.set('codex-legends.tutorial-progress.v1',JSON.stringify(['battle','practice']));
    expect(readJourney().completed).toEqual([]);
  });
  it('imports the completed version 2 First Battle checkpoint', () => {
    store.set('codex-legends.first-battle.v1', JSON.stringify({version:2, chapter:2, completed:true}));
    expect(readJourney().completed).toEqual([1]);
  });
  it('retains earned chapters but restarts revised regional lessons safely', () => {
    store.set(JOURNEY_KEY, JSON.stringify({version:1, completed:[1,2,4], started:[1,2,3,4], region:'visayas',
      encounters:{battle:2, luzon:3, visayas:1}}));
    expect(readJourney()).toMatchObject({lessonVersion:JOURNEY_LESSON_VERSION, completed:[1,2,4], region:'visayas',
      encounters:{luzon:0, visayas:0}});
    expect(JSON.parse(store.get(JOURNEY_KEY)!).lessonVersion).toBe(JOURNEY_LESSON_VERSION);
  });
  it('checkpoints only a completed encounter in order, with one region sufficient', () => {
    startJourney(4,'visayas'); finishEncounter(4,2,'visayas'); expect(readJourney().completed).toEqual([]);
    finishEncounter(4,0,'visayas'); expect(readJourney().encounters.visayas).toBe(1);
    finishEncounter(4,0,'visayas'); expect(readJourney().encounters.visayas).toBe(1);
    finishEncounter(4,1,'visayas'); finishEncounter(4,2,'visayas');
    expect(readJourney().completed).toEqual([]);
    finishEncounter(4,3,'visayas'); finishEncounter(4,4,'visayas');
    expect(readJourney().completed).toEqual([4]); expect(readJourney().region).toBe('visayas');
    expect(readJourney().encounters.mindanao).toBeUndefined();
  });
  it('keeps chapter replay and loss from clearing an earned completion', () => {
    completeJourney(2); startJourney(2); expect(readJourney().completed).toEqual([2]);
    expect(readJourney().started).toEqual([2]);
  });
  it('keeps support checkpoints separate for each regional preset', () => {
    startJourney(3, 'visayas'); finishEncounter(3,0,'visayas');
    selectJourneyRegion('mindanao'); finishEncounter(3,0,'mindanao'); finishEncounter(3,1,'mindanao');
    expect(readJourney()).toMatchObject({region:'mindanao',encounters:{'battle-visayas':1,'battle-mindanao':2}});
    expect(readJourney().encounters['battle-luzon']).toBeUndefined();
    finishEncounter(3,2,'mindanao'); expect(readJourney().completed).toEqual([]);
    finishEncounter(3,3,'mindanao'); expect(readJourney().completed).toEqual([3]);
  });
  it('changing the training region does not start a chapter or erase earned completion', () => {
    completeJourney(1); selectJourneyRegion('visayas');
    expect(readJourney()).toMatchObject({region:'visayas',completed:[1],started:[1]});
  });
  it('remembers the last resumed chapter without duplicating it', () => {
    resetJourney(); startJourney(4); startJourney(2); startJourney(4);
    expect(readJourney().started).toEqual([2,4]);
  });
  it('resets only the new record and does not re-import completed chapters', () => {
    store.set('codex-legends.next-battle.v1',JSON.stringify({version:1,completed:true}));
    readJourney(); resetJourney(); expect(readJourney().completed).toEqual([]);
    expect(store.has('codex-legends.next-battle.v1')).toBe(true);
  });
  it('rejects corrupted chapter and checkpoint values', () => {
    store.set(JOURNEY_KEY,JSON.stringify({version:1,lessonVersion:JOURNEY_LESSON_VERSION,completed:[1,99,'3'],started:null,region:'invalid',encounters:{battle:99,visayas:2}}));
    expect(readJourney()).toMatchObject({completed:[1],started:[],region:'luzon',encounters:{visayas:2}});
  });
  it('works with blocked storage', () => {
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
    resetJourney();startJourney(3);finishEncounter(3,0,'luzon');
    expect(readJourney().encounters['battle-luzon']).toBe(1);
  });
  it('retains this session when reads work but writes fail, then persists after recovery', () => {
    resetJourney();
    vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:()=>{throw Error('quota');}});
    startJourney(4,'mindanao');finishEncounter(4,0,'mindanao');
    expect(readJourney().encounters.mindanao).toBe(1);
    vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)});
    expect(readJourney().region).toBe('mindanao');
    expect(JSON.parse(store.get(JOURNEY_KEY)!).encounters.mindanao).toBe(1);
  });
  it.each([['field',1],['main',1],['battle',1],['defense',2],['force',3],['response-chains',3],['personify',4],['codex-states',4],['zones',4],['agta-challenge',4],['bab-carousel',4],['mag-offer',4],['journey-5',5]] as const)('redirects %s to chapter %i', (old, chapter) => {
    expect(legacyJourneyChapter(old)).toBe(chapter);
  });
  it('routes unknown bookmarks to the journey menu',()=>expect(legacyJourneyChapter('unknown')).toBeNull());
});
