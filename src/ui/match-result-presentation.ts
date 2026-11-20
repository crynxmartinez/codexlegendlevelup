import { destinationShell, menuElement as e } from './menu-destination.js';
import './match-review-polish.css';

export interface MatchResultPresentation {
  deckName: string | null;
  region: string | null;
  persona: { name: string; art: string | null } | null;
  turns: number;
  mode: 'vs-ai' | 'pvp';
  actions: {
    rematch: HTMLElement;
    history: HTMLElement;
    editDeck: HTMLElement;
    title: HTMLElement;
  };
}

/** Presentation only. Retain live nodes and handlers, including pending replay updates. */
export function presentMatchResult(page: HTMLElement, props: MatchResultPresentation): void {
  if (page.classList.contains('approved-match-result')) return;
  const resultWord = page.querySelector<HTMLElement>('.result-word');
  const resultDetails = Array.from(page.children).filter((node): node is HTMLElement =>
    node instanceof HTMLElement && node.matches('.result-line,.subtle,.final-exchange,.match-shields'));
  let recap = page.querySelector<HTMLElement>('.polished-key-moments');
  if (!recap) {
    recap = e('section', 'match-recap polished-key-moments');
    recap.append(e('h2', '', 'Key moments'));
  }
  const moments = e('div', 'result-moment-list');
  const recapTitle = recap.querySelector('h2') ?? e('h2', '', 'Key moments');
  for (const child of Array.from(recap.children)) if (child !== recapTitle) moments.append(child);
  if (!moments.children.length) {
    moments.append(e('p', 'result-no-moments', 'No key moments were recorded for this match. The match result and available history are still accessible.'));
  }
  recap.replaceChildren(recapTitle, moments);

  const content = e('main', 'result-content');
  const toolbar = e('div', 'result-toolbar');
  const title = e('div', 'result-title');
  title.append(e('p', 'result-eyebrow', [props.mode === 'pvp' ? 'PLAYER MATCH' : 'VS AI MATCH', props.region].filter(Boolean).join(' · ')));
  if (resultWord) title.append(resultWord);
  const primaryActions = e('div', 'result-primary-actions');
  props.actions.history.classList.add('result-history-action');
  primaryActions.append(props.actions.history, props.actions.rematch);
  toolbar.append(title, primaryActions);

  const layout = e('div', 'result-layout');
  const summary = e('aside', 'result-summary');
  summary.setAttribute('aria-label', 'Match summary');
  const deck = e('section', 'result-deck-card');
  if (props.persona?.art) {
    const art = e('img', 'result-persona-art');
    art.src = props.persona.art; art.alt = props.persona.name;
    art.addEventListener('error', () => {
      art.replaceWith(e('p', 'result-art-unavailable', 'Persona artwork unavailable'));
    }, { once: true });
    deck.append(art);
  }
  deck.append(e('h2', 'result-deck-name', props.deckName || 'Deck name unavailable'));
  deck.append(e('p', 'result-persona-name', props.persona ? `Persona · ${props.persona.name}` : 'Persona unavailable'));
  deck.append(e('p', 'result-turn-count', `${props.turns} ${props.turns === 1 ? 'TURN' : 'TURNS'}`));
  const details = e('div', 'result-facts');
  details.append(...resultDetails);
  summary.append(deck, details);
  layout.append(summary, recap); content.append(toolbar, layout);

  const footer = e('footer', 'result-footer');
  footer.append(e('p', 'result-footer-note', 'Replay is offered only for compatible, privacy-safe recordings.'));
  footer.append(props.actions.editDeck, props.actions.title);
  page.replaceChildren(content);
  page.classList.add('approved-match-result');
  destinationShell(page, 'Match Result', footer);
  const crumb = page.querySelector('.destination-crumb');
  if (crumb) crumb.textContent = 'Match / Key moments';
}
