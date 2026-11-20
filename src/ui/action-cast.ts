import { mountDuelPanel } from './duel-panel.js';
import { formatSkillText } from './glossary.js';
import { cardDisplayName } from './card-name.js';

/** Reading a hand card is not authorization to cast it. */
export function confirmActionCast(data: {
  name: string; text: string; image: string; remainingPlays: number;
  costLabel?: string;
  inspect: (art: HTMLImageElement) => void;
}): Promise<boolean> {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => {
    const node = document.createElement(tag); node.className = cls; node.textContent = text; return node;
  };
  const root = make('div', 'modal-bg'), dialog = make('div', 'modal'), head = make('div', 'modal-head');
  head.append(make('h3', '', 'Cast this Action?'));
  const payment = `${data.remainingPlays} plays available`;
  const body = make('div', 'duel-body action-cast-preview');
  const art = make('img', ''); art.src = data.image; art.alt = data.name; data.inspect(art);
  const details = make('div', 'action-cast-details');
  const rules = make('div', 'action-cast-rules'); rules.innerHTML = formatSkillText(data.text);
  details.append(make('strong', 'action-cast-name', cardDisplayName(data.name)), rules); body.append(art, details);
  const row = make('div', 'row'), cancel = make('button', '', 'Cancel');
  const cast = make('button', 'primary', data.costLabel ? 'Choose cost · 1 play' : 'Cast · 1 play');
  cast.disabled = data.remainingPlays < 1;
  row.append(cancel, cast); dialog.append(head, make('div', 'sub', `${payment} · Uses 1 play${data.costLabel ? ` + ${data.costLabel}` : ''}`), body, row); root.append(dialog);
  return new Promise(resolve => {
    let done = false;
    const finish = (approved: boolean) => { if (done) return; done = true; root.remove(); resolve(approved); };
    const shell = mountDuelPanel(root, dialog, head, 'Cast this Action?'); shell.min.focus();
    cancel.onclick = () => finish(false);
    cast.onclick = event => {
      // The second click on a hand card might land over the newly opened button.
      if (event.detail > 1 || cast.disabled) return;
      cast.disabled = true; finish(true);
    };
  });
}
