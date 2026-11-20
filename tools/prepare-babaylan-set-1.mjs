import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async p => JSON.parse(await fs.readFile(new URL(p, root), 'utf8'));
const write = async (p, data) => fs.writeFile(new URL(p, root), JSON.stringify(data, null, 2) + '\n');
const cards = await read('src/data/set-1.json');
const proposals = await read('content/babaylan-set-1-skills.json');
proposals['babaylan/set-1/abyssal-revolt-sinogo'].skill = proposals['babaylan/set-1/abyssal-revolt-sinogo'].skill.replace('[blue][Persona] 1/Turn:', '[green][Persona] 1/Turn: When this Unit attacks,').replace('[/blue]', '[/green]');
for (const d of Object.values(proposals)) d.status = 'implemented';
proposals['babaylan/set-1/unseen-defender-tata-cero'].skill = '[green][Ally]: When this Unit is attacked, it gets Power +5000 until end of that battle. If it remains in an Ally Zone after that battle, Essence it.[/green]';
// Clarify the workbook's ambiguous delayed return without changing its threshold.
proposals['babaylan/set-1/mountain-sovereign-maria-cacao'].skill = proposals['babaylan/set-1/mountain-sovereign-maria-cacao'].skill.replace('at the end of that battle', 'at the end of its next battle this turn');
await write('content/babaylan-set-1-skills.json', proposals);
const bab = cards.filter(c => c.deck === 'Babaylan');
const id = n => bab[n - 1].id;
const distribution = [[7,3],[1,2],[3,2],[6,1],[8,3],[9,3],[11,3],[16,3],[17,3],[18,3],[21,3],[22,2],[27,2],[32,2],[35,1]];
const main = distribution.map(([n,copies]) => ({id:id(n),copies}));
main.push({id:'babaylan/warden-of-the-twelfth-tide-bituon',copies:2});
for (const n of [23,24,25,26]) main.push({id:id(n),copies:3});
if (main.reduce((n,c)=>n+c.copies,0) !== 50) throw new Error('Babaylan deck must have 50 cards');
await write('decks/babaylan-set-1.json', {name:'Babaylan Set 1',persona:id(7),main,codex:[37,38,39,40,43].map(id)});
// Agta's implemented starter is maintained by tools/export-agta-set-1.ts.
