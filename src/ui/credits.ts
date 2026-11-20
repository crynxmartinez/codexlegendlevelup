import { MUSIC_LIBRARY } from '../data/soundtrack.js';
import { previewSoundtrack } from './sfx.js';
import { settings, setSetting } from './settings.js';
import './utility-presentation.css';
import { presentReadingSections } from './modal-sections.js';
import './modal-system.css';

export function openCredits(): void {
  if (document.querySelector('.credits-dialog')) return;
  const previous = document.activeElement as HTMLElement | null;
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
    const node = document.createElement(tag); node.textContent = text; return node;
  };
  const dialog = make('dialog'); dialog.className = 'credits-dialog';
  dialog.dataset.panelBrowse = 'true'; dialog.setAttribute('aria-label', 'About and credits');
  const head = make('header'), close = make('button', 'Close');
  head.append(make('h2', 'About & credits'), close);
  const body = make('div'); body.className = 'credits-content';
  body.append(make('p', 'Codex Legend TCG is a trading card game inspired by Philippine history, with a splash of mythology. Become your Persona, call forth Allies, break the opposing Barriers, then land the finishing hit.'),
    make('h3', 'Original soundtrack'), make('p', 'Original songs supplied by the creator of Codex Legends.'));
  const status = make('p', 'Select a song to listen.'); status.setAttribute('role', 'status');
  const songs = make('div'); songs.className = 'credits-songs';
  for (const track of MUSIC_LIBRARY) {
    const button = make('button', track.title); button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      previewSoundtrack(track);
      for (const child of Array.from(songs.children)) child.setAttribute('aria-pressed', String(child === button));
      status.textContent = `${track.title} · ${settings().sfx && settings().musicVolume > 0 ? 'Music player' : 'Sound is muted in Settings'}`;
    };
    songs.append(button);
  }
  const level = make('label', 'Music volume'); const volume = make('input');
  volume.type = 'range'; volume.min = '0'; volume.max = '100'; volume.value = String(Math.round(settings().musicVolume * 100));
  volume.setAttribute('aria-label', 'Music volume');
  volume.oninput = () => setSetting('musicVolume', Number(volume.value) / 100);
  level.append(volume);
  const stop = make('button', 'Return to game music');
  stop.onclick = () => { previewSoundtrack(); status.textContent = 'Game music restored.'; for (const child of Array.from(songs.children)) child.setAttribute('aria-pressed', 'false'); };
  body.append(songs, status, level, stop,
    make('h3', 'About this game'),
    make('p', 'Philippine history is the foundation, with a splash of mythology. Card abilities are fictional game mechanics; they do not represent the beliefs or practices of every community.'),
    make('p', 'Development and asset creation include AI assistance. The quiet battle music and sound effects are generated locally by the game.'),
    make('h3', 'Art & attribution'),
    make('p', 'Card illustrations and game backgrounds are part of the Codex Legends project. Some art was created with AI assistance. Individual artist credits appear on cards when supplied.'),
    make('h3', 'Typography'));
  const license = make('a', 'Read the bundled font license'); license.href = '/fonts/LICENSE.txt'; license.target = '_blank'; license.rel = 'noopener'; body.append(license);
  const sections: {label:string;element:HTMLElement}[]=[];
  let section=make('section'); sections.push({label:'Overview',element:section});
  for(const node of Array.from(body.children)) {
    if(node.tagName==='H3'){section=make('section');sections.push({label:node.textContent??'Information',element:section});}
    section.append(node);
  }
  presentReadingSections(body,sections,'About and credits sections');
  dialog.append(head, body); document.body.append(dialog);
  const finish = () => { previewSoundtrack(); dialog.remove(); if (previous?.isConnected) previous.focus(); };
  close.onclick = () => dialog.close(); dialog.addEventListener('close', finish, { once: true });
  dialog.showModal(); close.focus();
}
