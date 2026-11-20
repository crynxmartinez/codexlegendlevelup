/** Rebuild the reviewable mapping from the same definitions used by the tutorial. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_CARDS, FULL_INDEX, isSelectableCard } from '../src/data/loader.js';
import { createTutorialProfile } from '../src/core/tutorial-rules.js';

const profile = createTutorialProfile(FULL_INDEX);
const directory = 'docs/design/tutorial-training-v1';
const escape = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
const availability = (id: string) => isSelectableCard(ALL_CARDS[id]!) ? 'current' : ALL_CARDS[id]!.hidden ? 'hidden' : 'historical';
const current = profile.mapping.filter(card => availability(card.id) === 'current');
const hidden = profile.mapping.filter(card => availability(card.id) === 'hidden');
const historical = profile.mapping.filter(card => availability(card.id) === 'historical');
const lines = [
  '# Tutorial card mapping', '',
  'Generated from `createTutorialProfile(FULL_INDEX)` by `tools/export-tutorial-profile.ts`.', '',
  'Tutorial variants keep original names, artwork, base Power and printed Defense. Normal catalogue objects and scripts are not modified. Roles are assigned deterministically in catalogue order within each guild and level. Current cards use the same selectable-card predicate as the browser. Hidden and historical definitions from the full-index audit are documented separately; they are not added to the selectable tutorial roster.', '',
  `This audit contains ${current.length} selectable variants (${current.filter(card => card.role === 'persona').length} Level 3 Units), ${hidden.length} hidden variant and ${historical.length} historical variants.`, '',
  '## Two Codex per regional training deck', '',
  '| Guild | Attack Codex | Barrier Codex |', '|---|---|---|',
  ...Object.entries(profile.codexByGuild).map(([guild, pair]) => `| ${guild} | ${profile.index[pair.attack]!.name} | ${profile.index[pair.barrier]!.name} |`), '',
  'Attack: Persona +5,000 only while attacking. Barrier: Persona +1,000 per own broken Barrier while active, including the opposing turn. Bonuses are read from the active Codex and current Persona; they are not stored as stacking modifiers. Original automatic switching windows and conditions remain. Five-Barriers start at +0; early two-Barrier lessons use Attack Codex.', '',
  '## Current Level 1 and Level 2 Units', '',
  '| Card | Level | Role | Tutorial effect |', '|---|---:|---|---|',
  ...current.filter(card => card.level === 1 || card.level === 2).map(card => `| ${escape(card.name)}<br>\`${card.id}\` | ${card.level} | ${card.role} | ${escape(card.text)} |`), '',
  'Support increases the supporter’s existing contribution once. Arrival applies once for each normal/special placement and expires at the current turn end. Attack and support expire after that attack. The simple self-bonuses resolve automatically through the existing effect/response sequence.', '',
  '## Level 3 retained skills and removed State skills', '',
  'These ordinary skills remain unchanged and can still be complex. They are disclosed below rather than silently simplified. State-tagged skills are removed entirely, including their hardcoded passives. Prepared lessons should avoid requiring the retained advanced skills before their concepts are introduced.', '',
  ...current.filter(card => card.role === 'persona').flatMap(card => [
    `### ${card.name}`, '', `ID: \`${card.id}\``, '',
    '**Retained (may be complex):**', '', ...(card.retainedSkills.length ? card.retainedSkills.map(text => `- ${text}`) : ['- No executable ordinary skill in the current registry.']), '',
    '**Removed State skills:**', '', ...(card.removedStateSkills.length ? card.removedStateSkills.map(text => `- ${text}`) : ['- None.']), '',
  ]),
  '## Hidden and historical definitions — not selectable', '',
  'These entries are included only because the exporter audits the full catalogue. Their presence here does not make them available in the current browser tutorial. Full effect text and removed/retained skills remain in `card-mapping.json`, with an explicit availability classification.', '',
  '| Card | Availability | Level | Variant role |', '|---|---|---:|---|',
  ...[...hidden, ...historical].map(card => `| ${escape(card.name)}<br>\`${card.id}\` | ${availability(card.id)} | ${card.level} | ${card.role} |`), '',
  '## Isolation and intentional exceptions', '',
  '- Actions, Forces and Sentries retain their original definitions and script objects. Their costs, effects and legitimate data-driven grants remain.',
  '- Normal playable deck validation still requires five Codex. The explicit tutorial profile alone accepts one Attack and one Barrier Codex.',
  '- Replaced lower-Level Unit passives, weighted Offer/Grave behavior, fixed end-turn Offer callbacks, Sipol Codex replacements, Andukha Power, State auras and Sinogo’s State-gated Vent discount are excluded for tutorial variants.',
  '- Existing common rules remain: levels, support adjacency, exhaustion, checks, damage, Personification, draw, victory and response windows.',
  '- No original assets, catalogue records, saved decks or production script entries are mutated.', '',
];
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/CARD-MAPPING.md`, lines.join('\n'));
writeFileSync(`${directory}/card-mapping.json`, JSON.stringify({ codexByGuild: profile.codexByGuild,
  counts: { current: current.length, hidden: hidden.length, historical: historical.length },
  cards: profile.mapping.map(card => ({ ...card, availability: availability(card.id) })),
}, null, 2) + '\n');
console.log(`Exported ${current.length} current, ${hidden.length} hidden and ${historical.length} historical tutorial variants.`);
