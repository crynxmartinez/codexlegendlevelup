import {writeFileSync} from 'node:fs';
import {AGTA_SET_ONE_IDS as ids,AGTA_SET_ONE_RULES as rules} from '../src/cards/agta-set-1.js';
import {ALL_CARDS} from '../src/data/loader.js';
const distribution=[[1,3],[2,2],[3,2],[4,3],[5,3],[6,3],[7,2],[9,2],[11,3],[12,2],[13,3],[14,2],[15,1],[18,2],[24,2],[27,1]];
const main=distribution.map(([n,copies])=>({id:ids[n!-1],copies}));
for(const n of [19,20,21,22])main.push({id:ids[n-1],copies:3});
main.push({id:'agta/sierra-watchkeeper-banoy',copies:2});
if(main.reduce((a,c)=>a+c.copies!,0)!==50)throw Error('Deck size');
writeFileSync('decks/agta-set-1.json',JSON.stringify({name:'Agta Set 1',persona:ids[0],main,codex:[33,34,36,39,40].map(n=>ids[n-1])},null,2)+'\n');
writeFileSync('content/agta-set-1-skills.json',JSON.stringify(Object.fromEntries(ids.map(id=>[id,{name:ALL_CARDS[id]!.name,...rules[id]}])),null,2)+'\n');
writeFileSync('docs/agta-set-1-card-guide.md','# Agta Set 1 — card-by-card implementation\n\nGenerated from the actual scripts. All numbered cards are new Set 1 printings. Banoy retains its existing Sentry effect and is also tagged Set 1.\n\n'+ids.map((id,i)=>`## ${i+1}. ${ALL_CARDS[id]!.name}\n\n${ALL_CARDS[id]!.type} · Level ${ALL_CARDS[id]!.level} · ${ALL_CARDS[id]!.subtypes.join(', ')}\n\nRole: ${rules[id]!.role}\n\n${rules[id]!.skill}\n`).join('\n'));

