import './utility-presentation.css';
import './modal-system.css';

/** Presentation and focus only; callers still own every action and saved value. */
export function presentMenuDialog(root: HTMLElement, panel: HTMLElement, head: HTMLElement, dismiss?: HTMLElement): void {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.classList.add('menu-utility');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', head.textContent ?? 'Information');
  if (dismiss) {
    const close = document.createElement('button');
    close.className = 'utility-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close dialog');
    close.onclick = () => dismiss.click(); head.append(close);
  }
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dismiss) { event.preventDefault(); event.stopPropagation(); dismiss.click(); }
    if (event.key === 'Tab') {
      const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href]')).filter(e => e.getClientRects().length && !e.closest('[inert]'));
      const at = controls.indexOf(document.activeElement as HTMLElement);
      if (at < 0 || (!event.shiftKey && at === controls.length - 1) || (event.shiftKey && at === 0)) {
        event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
      }
    }
  });
  const remove = root.remove.bind(root);
  root.remove = () => { remove(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
}
