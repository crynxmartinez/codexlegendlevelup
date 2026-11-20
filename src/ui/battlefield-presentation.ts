/** Presentation selection never enters GameState, PlayerAction or the RNG. */
export type BattlefieldPresentation = 'classic' | 'anime';
export const DEFAULT_BATTLEFIELD: BattlefieldPresentation = 'anime';

export function requestedPresentation(_entry: string | undefined, _route: URLSearchParams): BattlefieldPresentation {
  // One public battlefield for every entry. Older ?anime links remain valid.
  return DEFAULT_BATTLEFIELD;
}

export function applyBattlefieldPresentation(mode: BattlefieldPresentation): void {
  document.body.classList.toggle('anime-battlefield', mode === 'anime');
}

const PORTRAITS: Readonly<Record<string, string>> = {
  'agta/set-1/wind-heart-rescuer-taguwasi': 'taguwasi',
  'babaylan/set-1/thunder-sovereign-kaptan': 'kaptan',
  'maguindanao/set-1/three-scourge-champion-sulayman': 'sulayman',
};
export function animePortrait(cardId: string, fallback: string): string {
  const name = PORTRAITS[cardId];
  return name ? `/ui/anime-v1/portrait-${name}.webp` : fallback;
}

/** Public presentation-only projection. No hand identities, deck order or hidden state. */
export interface AnimeChromeState {
  turn: number;
  localTurn: boolean;
  phase: string;
}

/** Keep engine/replay phase keys unchanged while presenting the player-facing name. */
export function phaseDisplayName(phase: string): string {
  return phase === 'start' ? 'draw' : phase;
}

export function createAnimeChrome(state: AnimeChromeState): HTMLElement {
  const shell = document.createElement('aside'); shell.className = 'anime-chrome';
  shell.setAttribute('aria-label', 'Match phase and remaining Plays');
  const turn = document.createElement('div'); turn.className = `anime-turn ${state.localTurn ? '' : 'opponent'}`;
  const whose = document.createElement('span'); whose.textContent = state.localTurn ? 'YOUR' : 'OPPONENT’S';
  const number = document.createElement('strong'); number.textContent = `TURN ${state.turn}`;
  turn.append(whose, number);
  const phases = document.createElement('ol'); phases.className = 'anime-phases';
  for (const phase of ['start', 'personify', 'main', 'battle', 'end']) {
    const item = document.createElement('li'); item.textContent = phaseDisplayName(phase);
    if (phase === state.phase) { item.className = 'current'; item.setAttribute('aria-current', 'step'); }
    phases.append(item);
  }
  shell.append(turn, phases); return shell;
}
