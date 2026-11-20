/** Controllers own drafts and navigation. Never restart a pending controller. */
let cover: HTMLElement | undefined;
let busy = false;
let revealTimer: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let slowTimer: ReturnType<typeof setTimeout> | undefined;
let exitTimer: ReturnType<typeof setTimeout> | undefined;
let reduced = false;
let readyTarget: HTMLElement | undefined;
let removeKeys: (() => void) | undefined;
export function menuMotionReduced(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  try { return JSON.parse(localStorage.getItem('codex-legends.menu-profile.v1') || '{}').motion === false; }
  catch { return false; }
}
export function menuNavigationBusy(): boolean { return busy; }
function clearTimers(): void {
  clearTimeout(revealTimer); clearTimeout(watchdog); clearTimeout(slowTimer); clearTimeout(exitTimer);
}
function dismiss(): void {
  clearTimers(); removeKeys?.(); removeKeys = undefined;
  cover?.remove(); cover = undefined; busy = false; readyTarget = undefined;
}
export function destinationReady(target?: HTMLElement): void {
  if (!busy || !cover) return;
  if (target) readyTarget = target;
  clearTimeout(revealTimer);
  const current = cover;
  revealTimer = setTimeout(() => {
    if (cover !== current) return;
    clearTimers(); current.classList.add('leaving');
    exitTimer = setTimeout(() => {
      if (cover !== current) return;
      const focusTarget = readyTarget;
      dismiss();
      if (focusTarget?.isConnected) {
        const focus = focusTarget.querySelector<HTMLElement>('[data-menu-focus]')
          ?? focusTarget.querySelector<HTMLElement>('h1, h2, button, input');
        if (focus) {
          if (!focus.hasAttribute('tabindex') && /^H[12]$/.test(focus.tagName)) focus.tabIndex = -1;
          focus.focus({preventScroll:true});
        }
      }
    }, reduced ? 0 : 180);
  }, reduced ? 0 : 32);
}
export interface MenuTransitionOptions { label?: string; onReturn?: () => void }
export function menuNavigate<T>(open: () => T | Promise<T>, options: MenuTransitionOptions = {}): Promise<T | undefined> {
  if (busy) return Promise.resolve(undefined);
  busy = true; reduced = menuMotionReduced();
  const previousFocus = document.activeElement as HTMLElement | null;
  const original = document.querySelector('#app')?.firstElementChild;
  const current = document.createElement('div'); cover = current;
  current.className = 'menu-navigation-cover' + (reduced ? ' reduced' : '');
  current.setAttribute('role','dialog'); current.setAttribute('aria-modal','true');
  current.setAttribute('aria-label','Opening screen'); current.tabIndex = -1;
  const content = document.createElement('section'); content.className = 'menu-loading-content';
  const logo = document.createElement('img'); logo.src='/ui/menu-v1/logo-approved.png'; logo.alt='Codex Legend TCG';
  const title = document.createElement('h2'); title.textContent = options.label || 'Opening screen';
  const status = document.createElement('p'); status.textContent = 'Preparing your screen…'; status.setAttribute('role','status');
  const light = document.createElement('div'); light.className='menu-loading-light'; light.setAttribute('aria-hidden','true');
  const recovery = document.createElement('div'); recovery.className='menu-loading-recovery'; recovery.hidden=true;
  const retry = document.createElement('button'); retry.type='button'; retry.textContent='Retry';
  const back = document.createElement('button'); back.type='button'; back.textContent='Back';
  recovery.append(retry,back); content.append(logo,title,status,light,recovery); current.append(content); document.body.append(current);
  current.focus({preventScroll:true});
  const keys = (event: KeyboardEvent) => {
    if (cover !== current) return;
    if(event.key==='Tab') {
      event.preventDefault();
      if(!recovery.hidden) (document.activeElement===retry ? back : retry).focus();
    } else if(event.key==='Escape' && !recovery.hidden) { event.preventDefault(); back.click(); }
  };
  document.addEventListener('keydown',keys); removeKeys=()=>document.removeEventListener('keydown',keys);
  let failed = false;
  let cancelFlow = () => {};
  const mounted = () => {
    const root = document.querySelector<HTMLElement>('#app');
    const next = root?.firstElementChild as HTMLElement | null;
    return next && next !== original && next.querySelector('button, input, [role="button"]') ? next : undefined;
  };
  const stalled = (message: string) => {
    if (cover !== current) return;
    clearTimeout(watchdog);
    current.classList.add('slow','stalled'); recovery.hidden=false; status.textContent=message; retry.focus({preventScroll:true});
  };
  back.onclick = () => {
    const root = document.querySelector<HTMLElement>('#app');
    // Existing Back/Cancel retains its controller's unsaved-change protection.
    const nativeBack = Array.from(root?.querySelectorAll<HTMLButtonElement>('button') || []).find(b =>
      !b.disabled && /^(back|cancel|keep building)$/i.test(b.textContent?.trim() || ''));
    dismiss();
    if(nativeBack) nativeBack.click();
    else { options.onReturn?.(); if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); }
    cancelFlow();
  };
  slowTimer=setTimeout(()=>{if(cover===current)current.classList.add('slow');},700);
  watchdog=setTimeout(()=>{
    const target=mounted();
    if(target) destinationReady(target);
    else stalled('This is taking longer than expected.');
  },8000);
  return new Promise(resolve=>{
    cancelFlow=()=>resolve(undefined);
    const run = () => {
      try {
        Promise.resolve(open()).then(resolve,()=>{
          if(cover===current){failed=true;stalled('This screen could not be opened. Please try again.');}
        });
      } catch { failed=true;stalled('This screen could not be opened. Please try again.'); }
    };
    retry.onclick=()=>{
      const target=mounted();
      if(target) { destinationReady(target); return; }
      // Never start a second copy of a pending screen controller.
      if(failed && document.querySelector('#app')?.firstElementChild===original) {
        failed=false; recovery.hidden=true; status.textContent='Trying again…';
        clearTimeout(watchdog);
        watchdog=setTimeout(()=>stalled('This is taking longer than expected.'),8000);
        run();
      } else { status.textContent='Still waiting for this screen. You can go back safely.'; }
    };
    setTimeout(run,reduced ? 0 : 140);
  });
}
