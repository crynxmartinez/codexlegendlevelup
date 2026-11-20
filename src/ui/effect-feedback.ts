import type { GameState } from '../core/types.js';
import { grantedSkills } from './field-card-info.js';
import { motionReduced, playMotion } from './duel-motion.js';

/** First snapshot/reconnect is a baseline, never a replay of old skill grants. */
export class GrantedSkillTracker {
  private previous?: Map<string, string[]>;
  update(game: GameState): string[] {
    const next = new Map<string, string[]>(), added: string[] = [];
    for (const card of Object.values(game.cards)) {
      const skills = grantedSkills(card, game.turnNumber).map(skill => `${game.turnNumber}:${card.fieldEntry ?? 0}:${skill.id}`);
      if (!skills.length) continue;
      next.set(card.uid, skills);
      if (this.previous && skills.some(skill => !this.previous!.get(card.uid)?.includes(skill))) added.push(card.uid);
    }
    this.previous = next;
    return added;
  }
}

interface EffectSnapshot { entry: number; power: string[]; skills: string[] }
export interface EndedEffect { uid: string; kind: 'power' | 'skill' }
export class EffectExpiryTracker {
  private previous = new Map<string, EffectSnapshot>();
  reset(): void { this.previous.clear(); }
  update(game: GameState): EndedEffect[] {
    const next = new Map<string, EffectSnapshot>(), ended: EndedEffect[] = [];
    for (const card of Object.values(game.cards)) {
      if (!['ally', 'persona'].includes(card.zone) || card.faceDown) continue;
      const snapshot: EffectSnapshot = { entry: card.fieldEntry ?? 0,
        power: card.modifiers.map(m => JSON.stringify([m.sourceId ?? m.source, m.origin?.uid, m.amount, m.duration])),
        skills: grantedSkills(card, game.turnNumber).map(s => s.id) };
      const previous = this.previous.get(card.uid);
      if (previous?.entry === snapshot.entry) for (const kind of ['power', 'skills'] as const) {
        const remaining = [...snapshot[kind]];
        const removed = previous[kind].some(key => { const at = remaining.indexOf(key); if (at < 0) return true; remaining.splice(at, 1); return false; });
        if (removed) ended.push({ uid: card.uid, kind: kind === 'power' ? 'power' : 'skill' });
      }
      next.set(card.uid, snapshot);
    }
    this.previous = next;
    return ended;
  }
}

export function fadeEndedEffect(rect: DOMRect, kind: EndedEffect['kind']): void {
  if (document.hidden) return;
  const badge = document.createElement('span'); badge.className = `effect-expired ${kind}`;
  badge.textContent = kind === 'skill' ? '+ Skill ended' : 'Power ended';
  badge.setAttribute('aria-hidden', 'true'); document.body.append(badge);
  const size = badge.getBoundingClientRect();
  badge.style.left = `${Math.max(8, Math.min(innerWidth - size.width - 8, rect.left))}px`;
  badge.style.top = `${Math.max(8, Math.min(innerHeight - size.height - 8, rect.top))}px`;
  void playMotion(badge, [{ opacity: 1 }, { opacity: 0 }], motionReduced() ? 160 : 250, 0, 'ease-out').finally(() => badge.remove());
}
