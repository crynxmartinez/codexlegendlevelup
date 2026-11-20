import { ALL_CARDS } from '../data/loader.js';
import { initAudio, playCue, preloadAudio, type CueName } from './sfx.js';
import { settings, setSetting, type DuelSettings } from './settings.js';
import { registerPresentationControl } from './duel-panel.js';
import { BOSS_ATTACK_PROFILES } from './boss-attack-profiles.js';
import './boss-attack-assets.js';
import { playBossAttack, preloadBossAttack } from './boss-attack-motion.js';
import { playPersonaImpact } from './persona-impact.js';
import { shatterBarrier } from './barrier-shatter.js';
import { holdDuelMotion, motionEpoch } from './duel-motion.js';
import { waitFor } from './pace.js';
import { spectacleDuration } from './battle-feedback.js';
import './barrier-shatter.css';
import './effects-preview.css';

export const PREVIEW_STEPS: readonly [CueName, string, string][] = [
  ['select', 'Choose your attacker', 'Choose an eligible attacker before choosing its target.'],
  ['confirm', 'Choose the target', 'Your attack is aimed at the highlighted card.'],
  ['block', 'Defense declared', 'Defending cards contribute to the defense total.'],
  ['flip', 'Persona check', 'Reveal the top card in Check, then follow its result.'],
  ['force', 'Force revealed', 'Resolve the Force and show which cards it affects.'],
  ['block', 'Defense holds', 'Example: 11,000 Attack Power against 16,000 defense.'],
  ['impact', 'Defense broken', 'Example: 11,000 Attack Power against 11,000 defense. Ties hit.'],
  ['barrierBreak', 'Barrier broken', 'A Persona hit breaks a Barrier. The revealed card is a separate step.'],
  ['essence', 'Sanib', 'A card moves into Heart.'],
  ['vent', 'Kalas', 'Selected Heart cards leave as the skill resolves.'],
  ['offer', 'Offer', 'An Ally is Offered before its reward resolves.'],
  ['codex', 'Codex switched', 'The new Codex becomes active before its effect.'],
  ['stateRelease', 'State released', 'Your deck has met its State condition.'],
];
const PROFILE = BOSS_ATTACK_PROFILES['babaylan/set-1/thunder-sovereign-kaptan']!;
const TARGET = 'agta/set-1/wind-heart-rescuer-taguwasi';
const cardArt = (id: string): string => '/' + ALL_CARDS[id]!.art.replace(/^\/?assets\//, '').replace(/^\//, '');
let closePrevious: (() => void) | undefined;

/** Presentation only: no GameState, match RNG, replay or card ownership is touched. */
export function showEffectsPreview(art: string, onClose?: () => void): void {
  closePrevious?.();
  const previousFocus = document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog'); dialog.className = 'effects-preview-live';
  dialog.setAttribute('aria-label', 'Effects preview'); registerPresentationControl(dialog);
  dialog.innerHTML = `<section class="ep-panel">
    <header class="ep-header"><div><small>OPTION / PRESENTATION</small><h2>FEEL EVERY MOMENT</h2></div><img src="/ui/menu-v1/logo-approved.png" alt="Codex Legend TCG"></header>
    <div class="ep-main"><aside class="ep-controls"><div class="ep-scroll"><small>LIVE EFFECTS PREVIEW</small><h3>Your pace.<br>Your comfort.</h3><p>Try one attack before your next duel.</p><div class="ep-fields"></div><button class="ep-all" type="button">PLAY ALL 13 EXAMPLES</button></div><div class="ep-controls-bottom"><div class="ep-actions"><button class="ep-play ep-primary" type="button">PLAY SAMPLE</button><button class="ep-stop" type="button" disabled>STOP</button></div><p>Uses your Option settings. Changes apply immediately.</p></div></aside>
    <section class="ep-preview"><div class="ep-title"><h3>ATTACK → CONTACT → RESULT</h3><span>EXISTING GAME EFFECTS</span></div>
      <div class="ep-board"><div class="ep-source-label">KAPTAN<small>ACTING SOURCE</small></div><div class="ep-card ep-source"><img alt="Dagundong ng Langit, Kaptan"><b>ATK 11k</b></div><div class="ep-battle"><span>11,000 ATK</span><b>VS</b><span class="ep-defense">11,000 DEF</span></div><div class="ep-card ep-target"><img alt="Saklolo ng Hangin, Taguwasi"><b>ATK 11k</b></div><div class="ep-target-label">TAGUWASI<small>DEFENDING PERSONA</small></div><div class="ep-barriers" aria-label="Sample Barriers"></div><div class="ep-hand" aria-label="Sample hand; not interactive"></div></div>
      <div class="ep-caption"><strong class="ep-status" aria-live="polite">Ready to preview</strong><span class="ep-detail">One repeatable sample. No match progress changes.</span></div><ol class="ep-timeline"><li data-phase="attack">01 · ATTACK</li><li data-phase="contact">02 · CONTACT</li><li data-phase="result">03 · RESULT</li></ol>
    </section></div><footer class="ep-footer"><span>No cards or game progress change.</span><button class="ep-next" type="button">NEXT EFFECT</button><button class="ep-close" type="button">CLOSE PREVIEW</button></footer>
  </section>`;
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
  const source = get('.ep-source'), target = get('.ep-target'), board = get('.ep-board');
  const play = get<HTMLButtonElement>('.ep-play'), stop = get<HTMLButtonElement>('.ep-stop');
  const all = get<HTMLButtonElement>('.ep-all'), next = get<HTMLButtonElement>('.ep-next'), fields = get('.ep-fields');
  source.querySelector('img')!.src = cardArt(PROFILE.id); target.querySelector('img')!.src = cardArt(TARGET);
  for (let i = 0; i < 5; i++) { const image = new Image(); image.src = '/ui/card-back.webp'; image.alt = 'Hidden sample Barrier'; get('.ep-barriers').append(image); }
  for (const id of ['agta/set-1/life-breath-mother-nanolay', 'agta/set-1/fifth-sky-tyrant-kalimangalnuk', TARGET, PROFILE.id, 'agta/set-1/life-breath-mother-nanolay']) { const image = new Image(); image.src = cardArt(id); image.alt = ALL_CARDS[id]!.name; get('.ep-hand').append(image); }
  let disposed = false, owner: AbortController | undefined, playing = false, generation = 0, exampleIndex = -1;
  const cleanupVisuals = () => {
    dialog.querySelectorAll<HTMLElement>('.boss-attack-source,.boss-attack-projectile,.boss-attack-contact,.boss-attack-dispersal,.barrier-shatter').forEach(node => { for (const animation of node.getAnimations({ subtree: true })) animation.cancel(); node.remove(); });
    for (const card of [source, target]) { card.classList.remove('ep-marked'); for (const animation of card.getAnimations()) animation.cancel(); }
    get('.ep-barriers').querySelectorAll<HTMLImageElement>('img').forEach(image => { image.style.visibility = ''; image.classList.remove('ep-broken'); });
  };
  function buttons(running: boolean) { play.disabled = running; all.disabled = running; stop.disabled = !running; }
  function stage(phase: string, title: string, explanation: string) {
    get('.ep-status').textContent = title; get('.ep-detail').textContent = explanation;
    dialog.querySelectorAll<HTMLElement>('.ep-timeline li').forEach(node => node.classList.toggle('ep-active', node.dataset.phase === phase));
  }
  function cancel(message = 'Sample stopped') {
    generation++; owner?.abort(); owner = undefined; playing = false; cleanupVisuals(); buttons(false);
    if (!disposed) stage('', message, 'Play again when you are ready. No match progress changed.');
  }
  function select(label: string, values: readonly [string, string][], initial: string, changed: (value: string) => void) {
    const field = document.createElement('label'); field.textContent = label;
    const input = document.createElement('select'); input.setAttribute('aria-label', label);
    values.forEach(([value, name]) => { const option = document.createElement('option'); option.value = value; option.textContent = name; input.append(option); });
    input.value = initial; input.onchange = () => { cancel('Settings updated'); changed(input.value); };
    field.append(input); fields.append(field); return input;
  }
  select('Presentation speed', [['learning', 'Relaxed'], ['standard', 'Standard'], ['fast', 'Fast']], settings().duelPace, value => setSetting('duelPace', value as DuelSettings['duelPace']));
  select('Animation intensity', [['minimal', 'Minimal'], ['standard', 'Standard'], ['full', 'Full']], settings().animationIntensity, value => setSetting('animationIntensity', value as DuelSettings['animationIntensity']));
  select('Impact shake', [['off', 'Off'], ['low', 'Low'], ['full', 'Full']], settings().screenShake, value => setSetting('screenShake', value as DuelSettings['screenShake']));
  const sample = select('Sample', [['attack', 'Attack → contact → result'], ...PREVIEW_STEPS.map((step, i): [string, string] => [String(i), `${i + 1}. ${step[1]}`])], 'attack', () => {});
  const outcome = select('Attack outcome', [['hit', 'Successful hit'], ['blocked', 'Defense holds']], 'hit', value => { get('.ep-defense').textContent = value === 'hit' ? '11,000 DEF' : '16,000 DEF'; });
  select('Sound effects', [['on', 'On'], ['off', 'Off']], settings().sfx ? 'on' : 'off', value => { initAudio(); setSetting('sfx', value === 'on'); });
  for (const [key, label] of [['sfxVolume', 'Effects volume'], ['musicVolume', 'Music volume'], ['ambienceVolume', 'Ambience volume']] as const) {
    const field = document.createElement('label'), output = document.createElement('output'), slider = document.createElement('input');
    field.textContent = label; slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = String(Math.round(settings()[key] * 100)); slider.setAttribute('aria-label', label); output.textContent = slider.value + '%';
    slider.oninput = () => { if (playing) cancel('Volume updated'); initAudio(); setSetting(key, Number(slider.value) / 100); output.textContent = slider.value + '%'; };
    field.append(output, slider); fields.append(field);
  }
  const comfort = document.createElement('p'); comfort.className = 'ep-comfort'; comfort.textContent = 'Minimal and your device’s reduced-motion preference reduce movement while keeping reading time.'; fields.append(comfort);
  const valid = (signal: AbortSignal) => !disposed && !signal.aborted && dialog.isConnected && !document.hidden;
  const cue = (name: CueName, signal: AbortSignal, intensity = .5) => { if (valid(signal)) playCue(name, { signal, intensity }); };
  async function barrier(signal: AbortSignal) {
    if (!valid(signal)) return;
    const image = get('.ep-barriers').querySelector('img')!;
    stage('result', 'Barrier broken', 'The glass stays behind the hand. The revealed card is a separate step.');
    const rect = image.getBoundingClientRect(); image.style.visibility = 'hidden'; cue('barrierBreak', signal);
    try { await shatterBarrier(rect, signal, board); } finally { image.style.visibility = ''; }
    if (valid(signal)) image.classList.add('ep-broken');
  }
  async function attack(signal: AbortSignal, hit: boolean) {
    source.querySelector('img')!.src = cardArt(PROFILE.id); get('.ep-source-label').innerHTML = 'KAPTAN<small>ACTING SOURCE</small>';
    get('.ep-defense').textContent = hit ? '11,000 DEF' : '16,000 DEF';
    stage('attack', 'Kaptan is attacking', 'Follow the source, contact, then the result.');
    await holdDuelMotion(waitFor(settings().duelPace, 'routine')!, signal); if (!valid(signal)) return;
    cue('attack', signal); const epoch = motionEpoch(); let recoil: Promise<void> | undefined;
    await playBossAttack({ profile: PROFILE, from: source.getBoundingClientRect(), to: target.getBoundingClientRect(), outcome: hit ? 'hit' : 'blocked', signal, host: dialog, impact: () => {
      if (!valid(signal)) return;
      stage('contact', hit ? 'Attack connected' : 'Defense holds', hit ? 'One contact accent. The Persona reacts to the landed hit.' : 'The attack was stopped. No damage recoil or Barrier break.');
      cue(hit ? 'impact' : 'block', signal, .35);
      if (hit) recoil = playPersonaImpact(target, source.getBoundingClientRect(), { hit: true, personaHit: true, sentryUsed: false }, { epoch, signal, shake: settings().screenShake });
    } });
    await recoil; if (!valid(signal)) return;
    if (hit) await barrier(signal); else stage('result', 'Defense holds', 'No Barrier is broken.');
    await holdDuelMotion(waitFor(settings().duelPace, 'resultHold')!, signal);
  }
  async function example(index: number, signal: AbortSignal) {
    exampleIndex = index; sample.value = String(index); cleanupVisuals();
    if (index === 5 || index === 6) { await attack(signal, index === 6); return; }
    if (index === 7) { await barrier(signal); await holdDuelMotion(waitFor(settings().duelPace, 'resultHold')!, signal); return; }
    const [name, title, detail] = PREVIEW_STEPS[index]!;
    source.querySelector('img')!.src = art; get('.ep-source-label').innerHTML = 'SAMPLE CARD<small>SOUND & FEEDBACK EXAMPLE</small>';
    (index === 1 ? target : source).classList.add('ep-marked'); stage('', `${index + 1}/${PREVIEW_STEPS.length} · ${title}`, detail); cue(name, signal);
    await holdDuelMotion(Math.max(950, spectacleDuration(1700, settings().duelPace, false)), signal);
  }
  async function start(allExamples = false) {
    if (playing || disposed || document.hidden) return;
    cancel(); const mine = generation; owner = new AbortController(); const signal = owner.signal;
    playing = true; buttons(true); initAudio(); void preloadAudio(); stage('', 'Preparing sample', 'Loading the existing attack artwork…');
    await preloadBossAttack(PROFILE); if (!valid(signal)) return;
    try {
      if (allExamples) { for (let index = 0; index < PREVIEW_STEPS.length && valid(signal); index++) await example(index, signal); }
      else if (sample.value === 'attack') await attack(signal, outcome.value === 'hit'); else await example(Number(sample.value), signal);
      if (valid(signal)) stage('result', 'Sample complete', 'Replay it, choose another effect, or change a setting.');
    } catch { if (valid(signal)) stage('', 'Preview unavailable', 'Your match is unchanged. Try this sample again.'); }
    finally { if (mine === generation) { owner?.abort(); owner = undefined; playing = false; buttons(false); } }
  }
  play.onclick = () => void start(); all.onclick = () => void start(true); stop.onclick = () => { cancel(); play.focus(); };
  next.onclick = () => { cancel(); sample.value = String((exampleIndex + 1) % PREVIEW_STEPS.length); void start(); };
  const hidden = () => { if (document.hidden) cancel('Preview paused while hidden'); }, resized = () => cancel('Preview stopped after resize');
  const done = () => {
    if (disposed) return;
    disposed = true; cancel(); observer.disconnect(); dialog.close(); dialog.remove();
    document.removeEventListener('visibilitychange', hidden); window.removeEventListener('resize', resized); window.removeEventListener('pagehide', done);
    if (closePrevious === done) closePrevious = undefined; if (previousFocus?.isConnected) previousFocus.focus();
    onClose?.();
  };
  const observer = new MutationObserver(() => { if (!dialog.isConnected) done(); });
  get<HTMLButtonElement>('.ep-close').onclick = done;
  dialog.addEventListener('cancel', event => { event.preventDefault(); done(); });
  dialog.addEventListener('keydown', event => {
    // Native selects/ranges keep their arrow/typeahead keys; no duel hotkeys leak out.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); done(); }
    if (event.key === 'Tab') {
      const inputs = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),select,input')).filter(node => !node.hidden);
      if (event.shiftKey && document.activeElement === inputs[0]) { event.preventDefault(); inputs.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === inputs.at(-1)) { event.preventDefault(); inputs[0]?.focus(); }
    }
  });
  document.addEventListener('visibilitychange', hidden); window.addEventListener('resize', resized); window.addEventListener('pagehide', done);
  document.body.append(dialog); dialog.showModal(); observer.observe(document.body, { childList: true }); closePrevious = done; play.focus(); void preloadBossAttack(PROFILE);
}
