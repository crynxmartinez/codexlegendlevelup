import type { ModifierDuration } from '../core/types.js';
import { modifierSource, originLabel, signedPower, type ModGroup } from './effect-provenance.js';
import type { Box } from './overlay-placement.js';

export const POWER_DURATION_LABELS: Record<ModifierDuration, string> = {
  endOfTurn: 'Until this turn ends',
  endOfAttack: 'Until this attack ends',
  endOfBattlePhase: 'Until the Battle Phase ends',
  endOfOpponentTurn: "Until the opponent's turn ends",
  permanent: 'Permanent',
};

/** Values are supplied by currentPower, never recomputed as replacement rules. */
export interface PowerDetailsContext {
  name: string;
  printed: number;
  current: number;
  stack: number;
}
export interface PowerDetailsModel extends PowerDetailsContext {
  stackBonus: number;
  unexplained: number;
  entries: { source: string; amount: number; duration: string; cause: string }[];
  afterTurn?: number;
}

export function powerDetailsModel(context: PowerDetailsContext, groups: readonly ModGroup[]): PowerDetailsModel {
  const stackBonus = context.printed * (Math.max(1, context.stack) - 1);
  const listed = groups.reduce((sum, group) => sum + group.amount * group.count, 0);
  const unexplained = context.current - context.printed - stackBonus - listed;
  const turnBonus = groups.filter(group => !group.passive && group.duration === 'endOfTurn')
    .reduce((sum, group) => sum + group.amount * group.count, 0);
  // A snapshot cannot predict condition-dependent bonuses or undisclosed PvP
  // provenance. Only state a conditional subtotal when all changes are known.
  const canProject = unexplained === 0 && turnBonus !== 0
    && groups.every(group => !group.passive && ['endOfTurn', 'permanent'].includes(group.duration));
  return {
    ...context, stackBonus, unexplained,
    entries: groups.map(group => ({
      source: modifierSource(group), amount: group.amount * group.count,
      duration: group.passive ? 'Continuous · while its condition applies' : POWER_DURATION_LABELS[group.duration],
      cause: group.causes.length ? `Offered: ${group.causes.map(cause => originLabel(cause)).join('; ')}` : '',
    })),
    ...(canProject ? { afterTurn: context.current - turnBonus } : {}),
  };
}

/** A foreground explanation may cover utilities, but not the opponent's HUD.
 * Keep its approved right edge and use the space below the portrait and Plays. */
export function powerDetailsSafeBox(view: Box, panel: Box, identityAreas: readonly Box[] = []): Box {
  const ceiling = view.top + 8, floor = Math.max(ceiling, view.top + view.height - 8);
  let top = Math.max(ceiling, panel.top);
  for (const area of identityAreas) {
    if (area.left < panel.left + panel.width && area.left + area.width > panel.left)
      top = Math.max(top, area.top + area.height + 8);
  }
  top = Math.min(top, floor);
  return { left:panel.left, width:panel.width, top, height:Math.max(0, Math.min(panel.height, floor - top)) };
}

/** Called after mounting; resize and board replacement already dismiss this popover. */
export function fitPowerDetails(panel: HTMLElement): void {
  const viewport = window.visualViewport;
  const view = { left:viewport?.offsetLeft ?? 0, top:viewport?.offsetTop ?? 0,
    width:viewport?.width ?? innerWidth, height:viewport?.height ?? innerHeight };
  const rect = panel.getBoundingClientRect();
  const header = panel.querySelector<HTMLElement>('.power-details-head')!;
  const minimumHeight = header.getBoundingClientRect().height + 80;
  const identities = Array.from(document.querySelectorAll<HTMLElement>('.side.foe .identity-panel, .side.foe > .anime-zone-plays'))
    .filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden')
    .map(node => node.getBoundingClientRect());
  const fitted = powerDetailsSafeBox(view, rect, identities);
  if (fitted.top === rect.top && fitted.height === rect.height) return;
  panel.style.top = `${fitted.top}px`;
  panel.style.maxHeight = `${fitted.height}px`;
  if (fitted.height < minimumHeight) {
    panel.classList.add('power-details-short');
    panel.style.setProperty('--power-head-height', `${Math.max(44, fitted.height - 80)}px`);
  }
}

const text = (tag: string, className: string, value: string) => {
  const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
};

/** Non-blocking inspection. It never submits a card choice or changes state. */
export function createPowerDetails(model: PowerDetailsModel, close: () => void): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'mod-popover power-details';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', `${model.name}: current Power details`);
  const header = text('header', 'power-details-head', '');
  const title = text('div', '', '');
  title.append(text('small', 'power-details-eyebrow', 'CURRENT POWER'),
    text('h2', 'power-details-name', model.name),
    text('strong', 'power-details-total', model.current.toLocaleString()));
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'power-details-close';
  dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Close Power details'); dismiss.onclick = close;
  header.append(title, dismiss); panel.append(header);
  const body = text('div', 'power-details-body', '');
  const printed = text('div', 'power-details-printed', '');
  printed.append(text('span', '', 'Printed Power'), text('b', '', model.printed.toLocaleString()));
  body.append(printed);
  const entry = (source: string, amount: number, duration: string, cause = '') => {
    const row = text('section', 'power-details-entry', '');
    const detail = text('div', 'power-details-source', '');
    detail.append(text('b', '', source), text('small', '', duration));
    if (cause) detail.append(text('small', 'power-details-cause', cause));
    row.append(detail, text('strong', amount < 0 ? 'power-details-negative' : 'power-details-positive', signedPower(amount)));
    body.append(row);
  };
  if (model.stackBonus) entry(`Stack ×${Math.max(1, model.stack)}`, model.stackBonus, 'Printed Power of the current stack');
  for (const row of model.entries) entry(row.source, row.amount, row.duration, row.cause);
  if (model.unexplained) entry('Other current effects', model.unexplained, 'Included in current Power; source or duration is not available in this view.');
  if (model.afterTurn !== undefined) {
    const note = text('p', 'power-details-note', `After this turn: ${model.afterTurn.toLocaleString()}`);
    note.append(text('small', '', 'If no other effects apply.')); body.append(note);
  } else if (model.entries.length || model.unexplained) {
    body.append(text('p', 'power-details-note', 'Current values. Each effect ends at the time or condition shown above.'));
  }
  panel.append(body); return panel;
}
