import { placeHelp } from './overlay-placement.js';
/** A single help surface owns its input; reading never commits the parent card. */
export function mountKeywordHelp(): void {
  let node: HTMLElement | undefined, host: HTMLElement | undefined, pinned = false;
  const hide = () => { node?.classList.remove('show'); host?.removeAttribute('aria-describedby'); host = undefined; pinned = false; };
  const show = (next: HTMLElement) => {
    if (!next.dataset.tip) return;
    host?.removeAttribute('aria-describedby'); host = next;
    if (!node) {
      node = document.createElement('aside'); node.className = 'stat-tip'; node.id = 'keyword-help';
      node.setAttribute('role', 'note'); document.body.append(node);
    }
    node.replaceChildren();
    const title = document.createElement('strong'); title.className = 'stat-tip-head'; title.textContent = next.dataset.tipTitle ?? 'Help';
    const close = document.createElement('button'); close.className = 'keyword-close'; close.textContent = '×'; close.setAttribute('aria-label','Close explanation');
    close.onclick = e => { e.stopPropagation(); const prior=host; prior?.focus({preventScroll:true}); hide(); };
    const body = document.createElement('div'); body.className = 'stat-tip-body'; body.textContent = next.dataset.tip;
    node.append(title,close,body); node.classList.add('show'); next.setAttribute('aria-describedby',node.id);
    placeHelp(node,next,true);
  };
  const find = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;
  document.addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('.stat-tip')) return;
    const next=find(e.target);
    if (next) { e.preventDefault(); e.stopImmediatePropagation(); if(host===next && pinned) hide(); else {show(next);pinned=true;} }
    else if(pinned) { hide(); e.preventDefault(); e.stopImmediatePropagation(); }
  },true);
  document.addEventListener('pointerover', e => { if(pinned || e.pointerType==='touch')return; const next=find(e.target); if(next)show(next); });
  document.addEventListener('pointerout', e => { if(!pinned && !(e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-tip],.stat-tip')))hide(); });
  document.addEventListener('focusin', e => { const next=find(e.target); if(next)show(next); });
  document.addEventListener('keydown', e => {
    if(e.key==='Escape' && host) { e.preventDefault();e.stopImmediatePropagation();hide();return; }
    const next=find(e.target);
    if(next && ['Enter',' '].includes(e.key)) { e.preventDefault();e.stopImmediatePropagation();show(next);pinned=true; }
  },true);
  const reposition=()=> { if(host && node) { if(!host.isConnected || !host.getClientRects().length || getComputedStyle(host).visibility==='hidden')hide(); else placeHelp(node,host,true); } };
  window.addEventListener('resize',reposition); window.visualViewport?.addEventListener('resize',reposition);
  window.visualViewport?.addEventListener('scroll',reposition);
  window.addEventListener('duel-panel-layout',hide);
  window.addEventListener('scroll',e=>{if(!(e.target instanceof Element && e.target.closest('.stat-tip')))hide();},true);
  new MutationObserver(()=>{if(host&&!host.isConnected)hide();}).observe(document.body,{childList:true,subtree:true});
}
