import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_CARDS, isSelectableCard } from '../src/data/loader.js';
import { ACTIVE_SCRIPTS } from '../src/core/game.js';
import { RULES_REVISION } from '../src/core/rules-version.js';

const cards = Object.values(ALL_CARDS).filter(isSelectableCard);
const manifest = cards.map(card => {
  const script = ACTIVE_SCRIPTS[card.id];
  if (!script) throw new Error(`Missing live script: ${card.id}`);
  if (/\bEnergy\b/i.test(card.text)) throw new Error(`Obsolete live text: ${card.id}`);
  const effects = [
    ...(script.abilities ?? []).map((a, i) => ({ id: a.id ?? `${card.id}:ability:${i}`, kind: a.trigger ? 'triggered' : 'manual', scope: a.scope, trigger: a.trigger, state: a.requiresState, limit: a.perTurn, useScope: a.useScope ?? 'copy', payment: !!a.prepare, targets: a.targets?.map(t => t.prompt) ?? [] })),
    ...(script.forceModes ?? []).map((a, i) => ({ id: `${card.id}:force-${i ? 'hand' : 'check'}`, kind: i ? 'response' : 'check', payment: !!a.prepare, targets: a.targets?.map(t => t.prompt) ?? [] })),
    ...(script.action ? [{ id: `${card.id}:action`, kind: 'action', payment: !!script.action.prepare, targets: script.action.targets?.map(t => t.prompt) ?? [] }] : []),
    ...(script.codex?.skill ? [{ id: `${card.id}:codex`, kind: script.codex.skill.type, payment: !!script.codex.skill.prepare, targets: script.codex.skill.targets?.map(t => t.prompt) ?? [] }] : []),
  ];
  return { id: card.id, name: card.name, region: card.archipelago, type: card.type, text: card.text, effects };
});
mkdirSync('docs/generated', { recursive: true });
writeFileSync('docs/generated/current-rules-manifest.json', JSON.stringify({ revision: RULES_REVISION, cards: manifest }, null, 2) + '\n');
for (const [deck, region] of [['Agta', 'Luzon'], ['Babaylan', 'Visayas'], ['Maguindanao', 'Mindanao']]) {
  const selected = cards.filter(c => c.deck === deck);
  const lines = [`# ${region} Set 1 — current card guide`, '', `Rules revision: \`${RULES_REVISION}\`. Generated from loaded card text.`, '', 'Normal calls and Action cards use one play. Skills, Force activations, Sentries and special calls use no plays. Printed card costs and usage limits still apply.', '', 'Art may show older wording. The in-game card inspector and this guide contain the current rules.', ''];
  for (const card of selected) lines.push(`## ${card.name}`, '', `ID: \`${card.id}\` · ${card.type}`, '', card.text, '');
  writeFileSync(`docs/${deck!.toLowerCase()}-set-1-card-guide.md`, lines.join('\n'));
}
console.log(`Exported ${cards.length} active cards and their effect identities; no Energy in loaded rules text.`);
