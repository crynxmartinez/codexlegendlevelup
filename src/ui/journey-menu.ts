import { JOURNEY_CHAPTERS, JOURNEY_ENCOUNTER_COUNTS, journeyEncounterKey, readJourney, resetJourney, journeyUrl, startJourney, selectJourneyRegion, type JourneyChapter, type JourneyRegion } from './journey-progress.js';
import './journey.css';
import { resetFirstBattleProgress } from './first-battle-session.js';
import { destinationShell } from './menu-destination.js';
import { menuNavigate } from './menu-transition.js';
const regionArt = {
  luzon: new URL('../../assets/ui/philippines-luzon.webp', import.meta.url).href,
  visayas: new URL('../../assets/ui/philippines-visayas.webp', import.meta.url).href,
  mindanao: new URL('../../assets/ui/philippines-mindanao.webp', import.meta.url).href,
};

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const e = document.createElement(tag); e.textContent = text; e.className = className; return e;
};
export function mountJourney(root: HTMLElement, leave: () => void, launch: (chapter: JourneyChapter) => void, initialChapter?: JourneyChapter): void {
  let progress = readJourney();
  let selected: JourneyChapter = initialChapter ?? [...progress.started].reverse().find(c => !progress.completed.includes(c))
    ?? JOURNEY_CHAPTERS.find(c => !progress.completed.includes(c.id))?.id ?? 5;
  const page = make('section', '', 'journey-screen journey-with-demo'); root.replaceChildren(page);
  const back = make('button', '‹ Back'); back.onclick = () => { void menuNavigate(leave); };
  const path = make('nav', '', 'journey-path'); path.setAttribute('aria-label', 'Five chapters');
  const detail = make('section', '', 'journey-detail'); detail.setAttribute('aria-live', 'polite');
  const completion = make('div', '', 'journey-completion');
  const demo = make('section', '', 'journey-demo-entry');
  const demoStart = make('button', '', 'journey-demo-start primary'); demoStart.type = 'button';
  demoStart.append(make('span', 'Lvl Up 3.0'));
  const demoDescription = make('p', '', 'journey-demo-description'); demoDescription.id = 'journey-demo-description';
  demoDescription.append(make('strong', 'Short guided Luzon battle'), make('small', 'New player demo · 2 Barriers · Simple effects'));
  demoStart.setAttribute('aria-describedby', demoDescription.id);
  // This standalone demo deliberately leaves the five-chapter record and chosen region alone.
  demoStart.onclick = () => { void menuNavigate(() => { location.search = '?tutorial=lvl-up-3'; }, { label: 'Opening Lvl Up 3.0' }); };
  demo.append(demoStart, demoDescription);
  const footer = make('footer');
  const normal = make('a', 'Play with regular cards'); normal.href = '?start';
  normal.onclick = event => { event.preventDefault(); void menuNavigate(() => { location.href = normal.href; }); };
  const reset = make('button', 'Reset journey', 'journey-reset');
  reset.onclick = () => {
    if (reset.dataset.confirm !== 'yes') { reset.dataset.confirm = 'yes'; reset.textContent = 'Confirm reset'; return; }
    resetJourney(); resetFirstBattleProgress(); progress = readJourney(); selected = 1; reset.dataset.confirm = ''; reset.textContent = 'Reset journey'; render();
  };
  footer.append(back, make('span', 'New to card games? Start with First Battle.'), normal, reset);
  const illustration = make('div', '', 'journey-illustration'); illustration.setAttribute('role','img'); illustration.setAttribute('aria-label','Lira, Codex Legend duelist');
  page.append(illustration, demo, completion, path, detail);
  destinationShell(page, 'Tutorial', footer);
  function render() {
    const meter = make('progress'); meter.max = 5; meter.value = progress.completed.length;
    meter.setAttribute('aria-label', `${progress.completed.length} of 5 chapters complete`);
    completion.replaceChildren(make('span', `${progress.completed.length} / 5 chapters complete`), meter);
    path.replaceChildren();
    for (const chapter of JOURNEY_CHAPTERS) {
      const done = progress.completed.includes(chapter.id);
      const node = make('button', '', `journey-node${done ? ' done' : ''}`);
      node.setAttribute('aria-current', String(selected === chapter.id ? 'step' : 'false'));
      node.append(make('span', String(chapter.id).padStart(2, '0'), 'journey-number'), make('strong', chapter.title),
        make('small', done ? 'Complete' : progress.started.includes(chapter.id) ? 'In progress' : 'Not started'));
      node.onclick = () => { selected = chapter.id; render(); }; path.append(node);
    }
    const chapter = JOURNEY_CHAPTERS[selected - 1]!;
    const done = progress.completed.includes(selected);
    const started = progress.started.includes(selected);
    const play = make('button', done ? 'Replay chapter' : started && (selected === 2 || selected === 5) ? 'Start fresh match' : started ? 'Continue chapter' : 'Start chapter', 'primary');
    play.onclick = () => { void menuNavigate(() => { startJourney(selected, progress.region); launch(selected); }); };
    const regionName = progress.region[0]!.toUpperCase() + progress.region.slice(1);
    const change = make('button', `Training deck: ${regionName} · Change`, 'journey-change-region');
    change.onclick = () => { void menuNavigate(() => {
      void chooseJourneyRegion(root).then(() => menuNavigate(() => mountJourney(root, leave, launch, selected)));
    }); };
    detail.replaceChildren(make('p', `CHAPTER ${selected} / 5 · ${chapter.time}`, 'eyebrow'), make('h2', chapter.title), make('p', chapter.summary), change, play);
    detail.append(make('small', 'Tutorial versions use simple effects and two Codex. Regular matches use the cards’ normal effects and five Codex.'));
    if (selected === 3 || selected === 4) {
      const key = journeyEncounterKey(selected, progress.region);
      const completed = progress.encounters[key] ?? 0;
      detail.append(make('small', `${completed} / ${JOURNEY_ENCOUNTER_COUNTS[selected]} encounters complete · ${regionName}`));
    }
    if (selected === 2 || selected === 5) detail.append(make('small', 'Returning starts a fresh match. Completed chapters stay saved.'));
  }
  render();
}
export function chooseJourneyRegion(root: HTMLElement): Promise<JourneyRegion> {
  return new Promise(resolve => {
    const page = make('section', '', 'journey-screen journey-regions'); root.replaceChildren(page);
    const footer = make('footer'); const back = make('a', 'Back to journey'); back.href = journeyUrl();
    back.onclick = event => { event.preventDefault(); void menuNavigate(()=>{location.href=back.href;}); };
    footer.append(back);
    page.append(make('p', 'Choose your training deck for all five chapters. Every region teaches the same basics, then introduces its own card skills.'));
    destinationShell(page,'Tutorial cards',footer);
    const grid = make('div', '', 'journey-region-grid');
    const progress = readJourney();
    for (const [region, name, body] of [
      ['luzon', 'Luzon', 'Practice with Luzon cards and the two simple tutorial Codex.'],
      ['visayas', 'Visayas', 'Practice with Visayas cards and the two simple tutorial Codex.'],
      ['mindanao', 'Mindanao', 'Practice with Mindanao cards and the two simple tutorial Codex.'],
    ] as const) {
      const card = make('button', '', `journey-region ${region}`);
      const image = make('img'); image.src = regionArt[region]; image.alt = ''; image.decoding = 'async';
      card.append(image);
      card.append(make('h2', name), make('p', body), make('small', progress.region === region ? 'Current training deck' : '50 cards · 2 tutorial Codex'));
      card.onclick = () => { selectJourneyRegion(region); resolve(region); }; grid.append(card);
    }
    page.append(grid);
  });
}
