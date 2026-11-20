import { mountTitle, type MenuAction } from './title-screen.js';
import { initAudio, setSoundscape } from './sfx.js';
import { loadSettings, applySettingsToDocument } from './settings.js';
import { initializeAssetDownloads } from './asset-downloads.js';

const root = document.getElementById('app')!;
loadSettings(); applySettingsToDocument(); setSoundscape('title');
initializeAssetDownloads();
let loading = false;
async function enter(action?: MenuAction) {
  if (loading) return;
  loading = true;
  initAudio();
  // Fullscreen must begin within the original gesture, before loading code.
  if (action === 'start' && matchMedia('(pointer: coarse)').matches) {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }
  const status = document.createElement('div'); status.className = 'loading-status';
  status.setAttribute('role', 'status'); status.textContent = 'Opening game…'; root.append(status);
  root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true; });
  try {
    const { startClient } = await import('./main.js');
    status.remove();
    await startClient(action);
  } catch {
    status.replaceChildren(document.createTextNode(location.protocol === 'codex:' ? 'The bundled game could not load. Retry, or reinstall the complete application if files are missing. ' : 'The game could not load. Check your connection. '));
    const retry = document.createElement('button'); retry.textContent = 'Reload';
    retry.onclick = () => location.reload(); status.append(retry);
  }
}

const route = new URLSearchParams(location.search);
const gameRoute = ['start', 'anime', 'decks', 'tutorial', 'practice', 'graduation', 'challenge', 'pvp', 'room', 'roomLobby', 'demo'].some(key => route.has(key));
if (gameRoute) void enter();
else {
  mountTitle(root, { resolveActiveDeck:async()=>{
    const {resolveTitleActiveDeck}=await import('./active-deck-context.js');
    return resolveTitleActiveDeck();
  }, choose: action => {
    if (action === 'pvp') location.search = '?pvp'; else void enter(action);
  } });
}
