import type { CardInstance, PlayerId } from '../core/types.js';

/** Left/right match the displayed mat, including the rotated opposing mat. */
export function fieldPosition(card: CardInstance, viewer: PlayerId): string | undefined {
  if (card.zone !== 'ally' && card.zone !== 'persona') return undefined;
  const side = card.owner === viewer ? 'You' : 'Foe';
  if (card.zone === 'persona') return `${side} · Persona`;
  if (card.slot === null) return `${side} · Ally`;
  const slot = card.owner === viewer ? card.slot : 3 - card.slot;
  return `${side} · ${['Far left', 'Left', 'Right', 'Far right'][slot] ?? 'Ally'}`;
}

export function waitingAttackEffect(card: CardInstance, turn: number): string | undefined {
  if (card.zone !== 'ally' || card.grantedRepeat?.turn !== turn || card.grantedRepeat.entry !== (card.fieldEntry ?? 0)) return undefined;
  return 'Until Tarabusaw Tired: after this Unit’s first attack, you may Offer another Ally to charge it and give it +3000 this turn.';
}

export interface GrantedSkillInfo { id: string; source: string; description: string; expiry: string }
/** Extra skills/rules granted to this field instance, not its printed skills or Power modifiers. */
export function grantedSkills(card: CardInstance, turn: number): GrantedSkillInfo[] {
  if (!['ally', 'persona'].includes(card.zone)) return [];
  const skills: GrantedSkillInfo[] = [];
  const repeat = waitingAttackEffect(card, turn);
  if (repeat) skills.push({ id: 'repeat', source: 'Until Tarabusaw Tired', description: 'After the first attack, you may Offer another Ally to charge this Unit and give it +3000 Power.', expiry: 'Once, then removed: after the first attack this turn. The +3000 lasts until end of turn.' });
  if (card.zone === 'persona' && card.sevenHeadsTurn === turn) skills.push({ id: 'seven-heads', source: 'Seven Heads Before One King', description: 'When attacking: +1000 Power per Unit card in your Grave, up to +10000, for that attack. After attacking, with 7+ Maguindanaon Units in Grave: damage an exhausted opposing Ally (once per turn).', expiry: 'Until end of turn.' });
  if (card.zone === 'persona' && card.sulaymanHitDrawTurn === turn) skills.push({ id: 'hit-draw', source: 'Sulayman', description: 'When this attack hits, draw 1.', expiry: 'Until this attack ends; consumed when it hits.' });
  if (card.zone === 'persona' && card.firstAttackExtraCheckTurn === turn && card.firstAttackTakenTurn !== turn) skills.push({ id: 'extra-check', source: 'Tarabusaw', description: 'Your first attack this turn gets one additional attack check.', expiry: 'Once, then removed: first attack this turn.' });
  if (card.skipCheckTurn === turn) skills.push({ id: 'skip-check', source: 'Tarabusaw', description: 'Do not perform an attack check for this Unit’s next attack.', expiry: 'Once, then removed: next attack this turn.' });
  return skills;
}

export function grantedSkillText(skill: GrantedSkillInfo): string {
  return `${skill.source} — ${skill.description} ${skill.expiry}`;
}
