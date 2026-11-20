import {feedbackCsv, readFeedback, saveFeedback} from './feedback-store.js';
import './utility-presentation.css';
let panel: HTMLElement | null = null;
let previous: HTMLElement | null = null;
let refreshCount = () => {};
function close(): void { if (!panel) return; panel.classList.remove('open'); panel.inert = true; if (previous?.isConnected) previous.focus(); }
export function setFeedbackVisible(visible: boolean): void { if (!visible) close(); }
export function openFeedback(): void {
  if (!panel) mountFeedback();
  previous = document.activeElement as HTMLElement | null;
  panel!.scrollTop = 0;
  panel!.inert = false; panel!.classList.add('open'); refreshCount(); panel!.querySelector<HTMLButtonElement>('.fb-close')?.focus();
}
function radios(name: string, options: string[]): string {
  return `<div class="fb-options">${options.map(value => `<label><input type="radio" name="${name}" value="${value}" required><span>${value}</span></label>`).join('')}</div>`;
}
export function mountFeedback(): void {
  if (panel) return;
  panel = document.createElement('aside'); panel.className = 'feedback'; panel.inert = true;
  panel.setAttribute('aria-label','Playtest feedback');
  panel.innerHTML = `<div class="fb-head"><h2>How did that go?</h2><button type="button" class="fb-close" aria-label="Close feedback">×</button></div>
  <p class="fb-intro">Five quick questions. Answers stay in this browser on this device and are not sent online.</p>
  <div class="fb-host"><form class="fb-local-form">
  <fieldset><legend>1. Card-game experience</legend>${radios('experience',['None','Some','Regular player'])}</fieldset>
  <fieldset><legend>2. How clear was your next action?</legend><p>1 = Very unclear · 5 = Very clear</p>${radios('clarity',['1','2','3','4','5'])}</fieldset>
  <fieldset><legend>3. How did the pace feel?</legend>${radios('pace',['Too slow','About right','Too fast'])}</fieldset>
  <label class="fb-written">4. What confused you most? <span>(optional)</span><textarea name="confusion" rows="3" maxlength="2000"></textarea></label>
  <label class="fb-written">5. What would make you want another match? <span>(optional)</span><textarea name="returnReason" rows="3" maxlength="2000"></textarea></label>
  <button type="submit" class="primary">Save feedback</button></form>
  <p class="fb-status" role="status" aria-live="polite"></p>
  <div class="fb-local-tools"><span class="fb-count"></span><button type="button" class="fb-export">Export answers (CSV)</button></div>
  <p class="fb-storage-note">Export after the event to keep a backup. Clearing browser data removes saved answers.</p></div>`;
  const form = panel.querySelector<HTMLFormElement>('form')!;
  const status = panel.querySelector<HTMLElement>('.fb-status')!;
  const count = panel.querySelector<HTMLElement>('.fb-count')!;
  const download = panel.querySelector<HTMLButtonElement>('.fb-export')!;
  // Keep submission/export available while the five real questions scroll.
  form.id = 'local-feedback-form';
  const footer = document.createElement('footer'); footer.className = 'fb-footer';
  const save = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  save.setAttribute('form', form.id);
  footer.append(save, panel.querySelector('.fb-local-tools')!);
  panel.append(footer);
  panel.querySelector<HTMLButtonElement>('.fb-close')!.onclick = close;
  refreshCount = () => {
    try { const n = readFeedback(localStorage).length; count.textContent = `${n} saved response${n === 1 ? '' : 's'}`; download.disabled = n === 0; }
    catch { count.textContent = 'Local storage unavailable'; download.disabled = true; }
  };
  form.onsubmit = event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const data = new FormData(form);
    try {
      saveFeedback(localStorage,{experience:String(data.get('experience')),clarity:Number(data.get('clarity')),pace:String(data.get('pace')),confusion:String(data.get('confusion') ?? '').trim(),returnReason:String(data.get('returnReason') ?? '').trim()});
      form.reset(); status.textContent = 'Thank you! Saved on this device. Ready for the next player.'; refreshCount();
    } catch { status.textContent = 'Could not save feedback. Your answers are still here. Check browser storage and try again.'; }
  };
  download.onclick = () => {
    try {
      const url = URL.createObjectURL(new Blob(['\uFEFF',feedbackCsv(readFeedback(localStorage))],{type:'text/csv;charset=utf-8'}));
      const a = document.createElement('a'); a.href = url; a.download = `codex-legends-feedback-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch { status.textContent = 'Could not export saved feedback. Please try again.'; }
  };
  document.body.append(panel); refreshCount();
  panel.addEventListener('keydown',event => {
    if (!panel?.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') {
      const controls=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea')).filter(e=>e.getClientRects().length);
      if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}
    }
  });
}
