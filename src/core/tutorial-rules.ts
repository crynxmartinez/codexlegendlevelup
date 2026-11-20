/** Tutorial variants reuse catalogue art and statistics, never its shared objects. */
import type { AbilityScript, CardScript, ScriptRegistry } from '../cards/types.js';
import { ACTIVE_SCRIPTS } from './game.js';
import { buffPower } from './effects.js';
import { currentPower, def, inst, you, type CardIndex } from './state.js';
import { canSupport } from './battle.js';
import type { AbilityDef, CardDef, GameState, Guild } from './types.js';
import type { DeckList } from './setup.js';
import unitRoleIds from '../data/tutorial-decks/unit-roles.json' with { type: 'json' };

export const TUTORIAL_RULES_PROFILE = 'tutorial-v1' as const;
export type TutorialUnitRole = 'support' | 'arrival' | 'attack';
export interface TutorialMapping {
  id: string; name: string; level: number; role: NonNullable<CardDef['tutorial']>['role'];
  text: string; removedStateSkills: string[]; retainedSkills: string[];
}
export interface TutorialProfile {
  index: CardIndex;
  scripts: ScriptRegistry;
  codexByGuild: Partial<Record<Guild, { attack: string; barrier: string }>>;
  mapping: TutorialMapping[];
}
// Frozen teaching assignments preserve the approved profile, including historical fixtures.
// Adding a catalogue card must never rotate the roles of cards already being taught.
const unitRoles = unitRoleIds as Readonly<Record<string, TutorialUnitRole>>;
const codexPairs: TutorialProfile['codexByGuild'] = {
  'Gubat Banwa': { attack: 'agta/set-1/dawnward-country-arawen', barrier: 'agta/set-1/barbed-sky-passage-salikan' },
  'Visayas Arch': { attack: 'babaylan/set-1/sovereign-heights-mount-lantoy', barrier: 'babaylan/set-1/silent-threshold-kabulaw' },
  'Mindanao Arch': { attack: 'maguindanao/set-1/city-beyond-the-sunset-mantapuli', barrier: 'maguindanao/set-1/forest-of-broken-branches-mount-matutun' },
};
const stateText = /\[(?:Bayanihan|Garahana|Andukha(?:\s+\d+)?)\]/i;
const isStateSkill = (skill: Pick<AbilityScript, 'requiresState' | 'text'>) => !!skill.requiresState || stateText.test(skill.text);
const unitBonus = (level: number) => level === 1 ? 3000 : 5000;
const definitions = (abilities: AbilityScript[]): AbilityDef[] => abilities.map((ability, i) => ({
  type: ability.passive ? 'Continuous' : ability.trigger ? 'Conditional' : 'Activated',
  scope: ability.scope.filter(scope => scope !== 'Exile') as AbilityDef['scope'],
  ...(ability.requiresState ? { requiresState: ability.requiresState } : {}),
  ...(ability.perTurn ? { perTurn: ability.perTurn } : {}),
  text: ability.text, effect: ability.id ?? `tutorial-retained-${i}`,
}));

function unitSkill(role: TutorialUnitRole, level: number): AbilityScript {
  const amount = unitBonus(level);
  const value = amount.toLocaleString('en-US');
  const text = role === 'support'
    ? `[Ally] When this Unit supports, it gets Power +${value} for that attack. This increases its support contribution once.`
    : role === 'arrival'
      ? `[Ally] When this Unit is normally called or specially called, it gets Power +${value} until this turn ends.`
      : `[Ally] When this Unit attacks, it gets Power +${value} for that attack.`;
  return { id: `tutorial-l${level}-${role}`, text, scope: ['Ally'], automatic: true,
    trigger: role === 'support' ? 'supported' : role === 'arrival' ? 'placed' : 'attack',
    canRun: context => role === 'support'
      ? !!context.event?.supporters?.includes(context.source)
      : context.event?.unit === context.source,
    run: async context => buffPower(context, context.source, amount, role === 'arrival' ? 'endOfTurn' : 'endOfAttack'),
  };
}

/** Explicit card-ID roles, independent of catalogue insertion or display order. */
export function createTutorialProfile(normalIndex: CardIndex, normalScripts: ScriptRegistry = ACTIVE_SCRIPTS): TutorialProfile {
  const index: CardIndex = Object.fromEntries(Object.entries(normalIndex).map(([id, card]) => [id, structuredClone(card)]));
  const scripts: ScriptRegistry = { ...normalScripts };
  const mapping: TutorialMapping[] = [];
  const codexByGuild: TutorialProfile['codexByGuild'] = {};
  for (const [guild, pair] of Object.entries(codexPairs)) {
    if (index[pair.attack]?.type === 'Codex' && index[pair.barrier]?.type === 'Codex')
      codexByGuild[guild as Guild] = { ...pair };
  }
  const codexRoles = new Map<string, 'codex-attack' | 'codex-barrier'>();
  for (const pair of Object.values(codexByGuild)) {
    codexRoles.set(pair.attack, 'codex-attack'); codexRoles.set(pair.barrier, 'codex-barrier');
  }
  for (const card of Object.values(index)) {
    const original = normalScripts[card.id];
    let role: NonNullable<CardDef['tutorial']>['role'] | undefined;
    let text = '';
    const removedStateSkills: string[] = [];
    const retainedSkills: string[] = [];
    if (card.type === 'Unit' && [1, 2].includes(card.level)) {
      role = unitRoles[card.id];
      if (!role) continue;
      const skill = unitSkill(role, card.level);
      scripts[card.id] = { id: card.id, abilities: [skill] };
      card.abilities = definitions([skill]); text = skill.text;
    } else if (card.type === 'Unit' && card.level === 3) {
      role = 'persona';
      const skills = (original?.abilities ?? []).filter(skill => {
        if (isStateSkill(skill)) { removedStateSkills.push(skill.text); return false; }
        retainedSkills.push(skill.text); return true;
      }).map(skill => ({ ...skill }));
      scripts[card.id] = { ...(original ?? { id: card.id }), abilities: skills };
      card.abilities = original ? definitions(skills) : card.abilities.filter(skill => !isStateSkill(skill));
      text = card.abilities.map(skill => skill.text).join('\n');
    } else if (codexRoles.has(card.id)) {
      role = codexRoles.get(card.id)!;
      text = role === 'codex-attack'
        ? 'While this Codex is active, your Persona gets Power +5,000 while it is attacking. The bonus ends with that attack.'
        : 'While this Codex is active, your Persona gets Power +1,000 for each of your broken Barriers, on either player\'s turn.';
      const originalText = (normalIndex[card.id] as CardDef & { text?: string }).text;
      const switchText = originalText?.split('\n').find(line => /auto.switch/i.test(line));
      if (switchText) text = `${switchText}\n${text}`;
      delete card.state;
      card.abilities = [{ type: 'Continuous', scope: ['Persona'], text, effect: `tutorial-${role}` }];
      const script: CardScript = { id: card.id, codex: {
        autoSwitchOn: original?.codex?.autoSwitchOn,
        autoSwitchWhen: original?.codex?.autoSwitchWhen,
        skill: { type: 'continuous', text, run: async () => {} },
      } };
      scripts[card.id] = script;
    }
    if (!role) continue;
    card.tutorial = { version: 1, role };
    // CardRecord carries text as well as abilities; callers can merge either shape.
    Object.assign(card, { text });
    mapping.push({ id: card.id, name: card.name, level: card.level, role, text, removedStateSkills, retainedSkills });
  }
  return { index, scripts, mapping, codexByGuild };
}

export function tutorialDeck(deck: DeckList, profile: TutorialProfile): DeckList {
  const guild = profile.index[deck.persona]?.guild;
  const pair = guild && profile.codexByGuild[guild];
  if (!pair) throw new Error(`Tutorial needs two Codex for ${deck.name}.`);
  return { ...deck, main: deck.main.map(entry => ({ ...entry })), codex: [pair.attack, pair.barrier] };
}

/** Before confirming an attack, explain automatic training bonuses from the same role policy.
 * During combat actual resolved values win, including responses that negate a bonus.
 */
export function tutorialAttackPreview(index: CardIndex, game: GameState, attacker: string, supporters: string[]):
  { attackPower: number; attackerPower: number; supportPower: number } | null {
  if (game.rulesProfile !== TUTORIAL_RULES_PROFILE) return null;
  const card = inst(game, attacker), definition = def(index, game, attacker);
  const projected = game.activeBattle?.attacker !== attacker;
  let attackerPower = currentPower(index, game, attacker);
  if (projected && card.zone === 'ally' && definition.tutorial?.role === 'attack') attackerPower += unitBonus(definition.level);
  const codex = you(game, card.owner).activeCodex;
  if (projected && card.zone === 'persona' && codex && def(index, game, codex).tutorial?.role === 'codex-attack') attackerPower += 5000;
  const supportPower = [...new Set(supporters)].filter(uid => canSupport(game, uid, attacker)).reduce((sum, uid) => {
    const support = def(index, game, uid);
    return sum + currentPower(index, game, uid)
      + (projected && support.tutorial?.role === 'support' ? unitBonus(support.level) : 0);
  }, 0);
  return { attackPower: attackerPower + supportPower, attackerPower, supportPower };
}
