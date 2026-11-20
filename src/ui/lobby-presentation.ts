import { destinationShell, menuElement as e } from './menu-destination.js';
import './utility-presentation.css';
import './lobby-presentation.css';

export function presentPrivateLobby(root: HTMLElement, panel: HTMLElement): void {
  root.classList.add('anime-lobby');
  destinationShell(root, 'Play with Friends');
  const art = e('aside', 'lobby-art');
  const illustration = e('div', 'lobby-facing-art');
  illustration.setAttribute('role', 'img');
  illustration.setAttribute('aria-label', 'Nico and Amir face each other holding Codex cards');
  const copy = e('div', 'lobby-art-copy');
  copy.append(e('h2', '', 'Ready to duel'), e('p', '', 'Roll dice → Choose Persona → Choose Codex → Battle'));
  art.append(illustration, copy); root.append(art);
  panel.setAttribute('aria-label', 'Private match');
}
