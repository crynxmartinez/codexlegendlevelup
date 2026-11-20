import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mountJourney } from './journey-menu.js';
import { readJourney, resetJourney, selectJourneyRegion, startJourney, type JourneyProgress } from './journey-progress.js';
import { resetFirstBattleProgress } from './first-battle-session.js';
import { menuNavigate } from './menu-transition.js';

vi.mock('./journey-progress.js', async importOriginal => ({
  ...await importOriginal<typeof import('./journey-progress.js')>(),
  readJourney: vi.fn(), resetJourney: vi.fn(), selectJourneyRegion: vi.fn(), startJourney: vi.fn(),
}));
vi.mock('./first-battle-session.js', () => ({ resetFirstBattleProgress: vi.fn() }));
vi.mock('./menu-transition.js', () => ({ menuNavigate: vi.fn(async (open: () => void) => open()) }));
vi.mock('./menu-destination.js', () => ({
  destinationShell: (page: HTMLElement, _title: string, footer: HTMLElement) => page.append(footer),
}));

class Element {
  textContent = ''; className = ''; id = ''; type = ''; href = ''; max = 0; value = 0;
  children: Element[] = []; dataset: Record<string, string> = {}; attributes: Record<string, string> = {};
  onclick?: () => void;
  append(...nodes: Element[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: Element[]) { this.children = nodes; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
}
function descendants(root: Element): Element[] { return [root, ...root.children.flatMap(descendants)]; }
function findClass(root: Element, className: string): Element {
  const result = descendants(root).find(node => node.className.split(' ').includes(className));
  if (!result) throw new Error(`Missing ${className}`);
  return result;
}
const text = (node: Element): string => node.textContent + node.children.map(text).join('');
const saved: JourneyProgress = {
  version: 1, lessonVersion: 3, region: 'visayas', completed: [1], started: [1, 3], encounters: { 'battle-visayas': 2 },
};
let root: Element;

beforeEach(() => {
  vi.clearAllMocks(); root = new Element();
  vi.mocked(readJourney).mockReturnValue(structuredClone(saved));
  vi.stubGlobal('document', { createElement: () => new Element() });
  vi.stubGlobal('location', { search: '?tutorial', href: 'http://localhost/?tutorial' });
});
afterEach(() => vi.unstubAllGlobals());

it('opens the independent Lvl Up demo without changing journey progress or the selected training region', async () => {
  const launch = vi.fn();
  mountJourney(root as unknown as HTMLElement, vi.fn(), launch);
  const demo = findClass(root, 'journey-demo-start');
  expect(text(demo)).toBe('Lvl Up 3.0');
  expect(demo.attributes['aria-describedby']).toBe(findClass(root, 'journey-demo-description').id);
  expect(text(findClass(root, 'journey-demo-description'))).toContain('2 Barriers');
  demo.onclick?.(); await Promise.resolve();
  expect(location.search).toBe('?tutorial=lvl-up-3');
  expect(menuNavigate).toHaveBeenCalledWith(expect.any(Function), { label: 'Opening Lvl Up 3.0' });
  expect(startJourney).not.toHaveBeenCalled();
  expect(selectJourneyRegion).not.toHaveBeenCalled();
  expect(resetJourney).not.toHaveBeenCalled();
  expect(resetFirstBattleProgress).not.toHaveBeenCalled();
  expect(launch).not.toHaveBeenCalled();
  expect(vi.mocked(readJourney).mock.results[0]?.value).toEqual(saved);
});

it('preserves all five chapter actions and resumes the selected chapter with its saved region', async () => {
  const launch = vi.fn();
  mountJourney(root as unknown as HTMLElement, vi.fn(), launch);
  const path = findClass(root, 'journey-path');
  expect(path.attributes['aria-label']).toBe('Five chapters');
  expect(path.children).toHaveLength(5);
  expect(path.children[2]?.attributes['aria-current']).toBe('step');
  const play = findClass(findClass(root, 'journey-detail'), 'primary');
  expect(text(play)).toBe('Continue chapter');
  play.onclick?.(); await Promise.resolve();
  expect(startJourney).toHaveBeenCalledWith(3, 'visayas');
  expect(launch).toHaveBeenCalledWith(3);
  expect(location.search).toBe('?tutorial');
});

it('retains explicit chapter selection and replay independently of the demo', async () => {
  const launch = vi.fn();
  mountJourney(root as unknown as HTMLElement, vi.fn(), launch);
  findClass(root, 'journey-path').children[0]?.onclick?.();
  const replay = findClass(findClass(root, 'journey-detail'), 'primary');
  expect(text(replay)).toBe('Replay chapter');
  replay.onclick?.(); await Promise.resolve();
  expect(startJourney).toHaveBeenCalledWith(1, 'visayas');
  expect(launch).toHaveBeenCalledWith(1);
  expect(text(findClass(root, 'journey-demo-start'))).toBe('Lvl Up 3.0');
});
