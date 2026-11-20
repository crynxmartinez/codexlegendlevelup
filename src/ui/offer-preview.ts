import type { ScriptRegistry } from '../cards/types.js';
import { publicCardOrigin } from '../core/card-origin.js';
import type { CardIndex } from '../core/state.js';
import type { GameState, PlayerId } from '../core/types.js';
import { originLabel } from './effect-provenance.js';

/** Read-only hints: no canRun callbacks, payment, movement or speculative resolution. */
export function offerPreview(index: CardIndex, game: GameState, scripts: ScriptRegistry, selected: string[], owner: PlayerId): string {
  if (!selected.length) return 'Select the units to preview this payment.';
  const origins = selected.map(uid => publicCardOrigin(index, game, uid)).filter(o => !!o);
  const lines = ['To Grave:', ...origins.map(o => `• ${originLabel(o, owner)}`)];
  const ps = game.players[owner];
  const sources = [...ps.allies.filter((u): u is string => !!u), ...ps.grave, ...(ps.persona ? [ps.persona] : [])];
  const related: string[] = [];
  for (const uid of sources) {
    const c = game.cards[uid], origin = publicCardOrigin(index, game, uid);
    if (!c || !origin) continue;
    const skills = scripts[c.defId]?.abilities ?? [];
    for (const skill of skills) {
      if (skill.trigger !== 'unitOffered' || !skill.scope.some(s => s.toLowerCase() === c.zone)) continue;
      const self = /last oath|when this (?:unit|card) is offered/i.test(skill.text);
      if (self ? !selected.includes(uid) : !selected.some(u => u !== uid)) continue;
      related.push(`${originLabel(origin, owner)}${self ? ' · Last Oath' : ''}${skill.requiresState ? ` · requires ${skill.requiresState}` : ''}`);
    }
  }
  if (ps.activeCodex) {
    const c = game.cards[ps.activeCodex], origin = publicCardOrigin(index, game, ps.activeCodex);
    const trigger = c && scripts[c.defId]?.codex?.skill?.trigger;
    if (origin && (Array.isArray(trigger) ? trigger.includes('unitOffered') : trigger === 'unitOffered')) related.push(originLabel(origin, owner));
  }
  if (related.length) lines.push('', 'Possible pending effects:', ...[...new Set(related)].map(s => `• ${s}`), 'Eligibility and usage limits are checked after payment. Responses may change resolution.');
  return lines.join('\n');
}
