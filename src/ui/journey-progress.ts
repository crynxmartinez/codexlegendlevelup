/** Only completed encounters are persisted; live engine state is never serialized. */
export type JourneyRegion = 'luzon' | 'visayas' | 'mindanao';
export type JourneyChapter = 1 | 2 | 3 | 4 | 5;
export const JOURNEY_KEY = 'codex-legends.journey.v1';
export const JOURNEY_LESSON_VERSION = 3;
export const JOURNEY_ENCOUNTER_COUNTS = { 3: 4, 4: 5 } as const;
export const journeyEncounterKey = (chapter: 3 | 4, region: JourneyRegion): string => chapter === 3 ? `battle-${region}` : region;
export interface JourneyProgress {
  version: 1;
  lessonVersion: number;
  completed: JourneyChapter[];
  started: JourneyChapter[];
  region: JourneyRegion;
  encounters: Record<string, number>;
}
export const JOURNEY_CHAPTERS = [
  { id: 1, title: 'First Battle', summary: 'No card-game experience needed. Learn where to play a card, attack and defend.', time: 'One guided battle' },
  { id: 2, title: 'Simple Skills', summary: 'See a Power bonus appear, use it, then learn when it ends.', time: 'A short practice battle' },
  { id: 3, title: 'Support and Defense', summary: 'Help an attacker, defend, then try your region’s Sentry and Action.', time: '4 short lessons' },
  { id: 4, title: 'Persona and Codex', summary: 'Change your lead Unit, compare two Codex and try your Personas’ ordinary skills.', time: '5 short lessons' },
  { id: 5, title: 'Practice Duel', summary: 'Make your own choices in a five-Barrier duel using the same tutorial cards.', time: 'A full practice match' },
] as const;
const validChapter = (v: unknown): v is JourneyChapter => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 5;
export const validRegion = (v: unknown): v is JourneyRegion => ['luzon', 'visayas', 'mindanao'].includes(String(v));
const empty = (): JourneyProgress => ({ version: 1, lessonVersion: JOURNEY_LESSON_VERSION, completed: [], started: [], region: 'luzon', encounters: {} });
let volatile = empty();
let pendingSave = false;
export function readJourney(): JourneyProgress {
  try {
    if (pendingSave) {
      try { localStorage.setItem(JOURNEY_KEY, JSON.stringify(volatile)); pendingSave = false; }
      catch { return structuredClone(volatile); }
    }
    const raw = localStorage.getItem(JOURNEY_KEY);
    if (raw) {
      let data: any;
      try { data = JSON.parse(raw); } catch { return empty(); }
      if (!data || typeof data !== 'object') return empty();
      if (data.version !== 1) return empty();
      const p = empty();
      p.completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(validChapter))] as JourneyChapter[] : [];
      p.started = Array.isArray(data.started) ? [...new Set(data.started.filter(validChapter))] as JourneyChapter[] : [];
      p.region = validRegion(data.region) ? data.region : 'luzon';
      for (const key of ['battle-luzon', 'battle-visayas', 'battle-mindanao', 'luzon', 'visayas', 'mindanao']) {
        const n = data.encounters?.[key];
        const max = key.startsWith('battle-') ? JOURNEY_ENCOUNTER_COUNTS[3] : JOURNEY_ENCOUNTER_COUNTS[4];
        if (Number.isInteger(n) && n >= 0 && n <= max) {
          // Completion remains earned, but revised lessons restart safely.
          // An old three-encounter path never implies the new skills were seen.
          p.encounters[key] = data.lessonVersion === JOURNEY_LESSON_VERSION ? n : 0;
        }
      }
      if (data.lessonVersion !== JOURNEY_LESSON_VERSION) saveJourney(p);
      return p;
    }
    const p = empty();
    // Only these legacy records prove a victory. Catalogue clicks do not.
    for (const [key, chapter] of [['codex-legends.first-battle.v1', 1], ['codex-legends.next-battle.v1', 2]] as const) {
      try { const old = JSON.parse(localStorage.getItem(key) ?? '{}');
        if ([1, 2, 3].includes(old.version) && old.completed === true) p.completed.push(chapter);
      } catch { /* A damaged old record must not prevent the other migration. */ }
    }
    p.started = [...p.completed]; saveJourney(p); return p;
  } catch { return structuredClone(volatile); }
}
function saveJourney(p: JourneyProgress): void {
  volatile = structuredClone(p);
  try { localStorage.setItem(JOURNEY_KEY, JSON.stringify(p)); pendingSave = false; }
  catch { pendingSave = true; /* Keep playing if storage is blocked or full. */ }
}
export function startJourney(chapter: JourneyChapter, region?: JourneyRegion): void {
  const p = readJourney(); p.started = [...p.started.filter(c => c !== chapter), chapter];
  if (region) p.region = region; saveJourney(p);
}
export function selectJourneyRegion(region: JourneyRegion): void {
  const p = readJourney(); p.region = region; saveJourney(p);
}
export function completeJourney(chapter: JourneyChapter): void {
  const p = readJourney(); if (!p.completed.includes(chapter)) p.completed.push(chapter);
  if (!p.started.includes(chapter)) p.started.push(chapter); saveJourney(p);
}
export function finishEncounter(chapter: 3 | 4, encounter: number, region: JourneyRegion): void {
  const p = readJourney(), key = journeyEncounterKey(chapter, region);
  // A deep link or replay cannot skip unfinished encounters in the record.
  if (encounter === (p.encounters[key] ?? 0)) p.encounters[key] = encounter + 1;
  if (p.encounters[key] === JOURNEY_ENCOUNTER_COUNTS[chapter] && !p.completed.includes(chapter)) p.completed.push(chapter);
  saveJourney(p);
}
export function resetJourney(): void { saveJourney(empty()); }
export function journeyUrl(chapter?: JourneyChapter, region?: JourneyRegion): string {
  return chapter ? `?tutorial=journey-${chapter}${region ? `&region=${region}` : ''}` : '?tutorial';
}
/** Old bookmarks stay useful, but never open the retired catalogue. */
export function legacyJourneyChapter(id: string | null): JourneyChapter | null {
  if (!id) return null;
  const current = /^journey-([1-5])$/.exec(id); if (current) return Number(current[1]) as JourneyChapter;
  if (['first-battle', 'field', 'main', 'battle'].includes(id)) return 1;
  if (['next-battle', 'defense', 'guided-duel', 'practice'].includes(id)) return 2;
  if (['force', 'skills-costs', 'response-chains'].includes(id)) return 3;
  if (['personify', 'codex-states', 'zones'].includes(id) || /^(agta-|bab-|mag-)/.test(id)) return 4;
  return null;
}
