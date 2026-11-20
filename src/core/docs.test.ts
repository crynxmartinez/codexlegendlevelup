/** Guards the factual claims made in docs/HANDOFF.md. */
import { describe, expect, it } from 'vitest';
import { AGTA_SCRIPTS } from '../cards/agta.js';
import { AGTA_SET_ONE_SCRIPTS } from '../cards/agta-set-1.js';
import { MAGUINDANAO_SCRIPTS } from '../cards/maguindanao.js';
import { MAGUINDANAO_SET_ONE_SCRIPTS } from '../cards/maguindanao-set-1.js';
import { cardsForDeck, indexForDeck } from '../data/loader.js';

describe('handoff claims', () => {
  /**
   * Cards in the library whose skills have not been designed yet.
   *
   * Listed by id rather than counted, because a count only says how many were
   * forgotten and a list says which. Adding art and a stat line is one job and
   * writing the ability is another; what must not happen is a card slipping
   * through with neither and nobody noticing. Delete an id from here the same
   * commit its script arrives.
   *
   * One list across every deck rather than one per deck: the rule is the same
   * everywhere, and a second copy of it is a second thing to forget.
   */
  const AWAITING_SKILLS = new Set([
    // Agta
    'agta/heaven-rending-wind-taguwasi',
    'agta/fifth-sky-arrowlord-kalimangalnuk',
    'agta/life-restoring-mother-ina-nanolay',
    'agta/mystic-river-caller-alig',
    'agta/fallen-sky-warrior-talimanog',
    'agta/defiant-sky-warrior-ammani',
    'agta/enduring-sky-warrior-annibo',
    'agta/golden-gate-warden-nagdombilan',
    'agta/moon-stealing-wing-ammalabukkaw',
    'agta/captive-moon-innawagan',
    'agta/sunrise-seeking-wing-dalewasan',
    // Babaylan
    'babaylan/shapeshifting-savior-nagmalitong-yawa',
    'babaylan/celestial-matriarch-alunsina',
    'babaylan/lifespan-carver-sidapa',
    'babaylan/seven-year-challenger-labaw-donggon',
    'babaylan/tarangban-voyager-humadapnon',
    'babaylan/ridge-splitting-warrior-dumalapdap',
    'babaylan/heart-veiled-lord-saragnayon',
    'babaylan/ancestral-faithkeeper-tamblot',
    'babaylan/diwata-shrinekeeper-pagali',
    'babaylan/final-blow-heir-asu-mangga',
    'babaylan/heart-beast-hunter-buyung-baranungun',
    // Maguindanao
    'maguindanao/lowland-born-heir-rinamuntaw',
    'maguindanao/receding-sea-heiress-rinayung',
    'maguindanao/many-limbed-tidal-horror-kurita',
    'maguindanao/mountain-breaking-devourer-tarabusaw',
    'maguindanao/cave-light-heiress-bai-amina',
    'maguindanao/last-refuge-chief-datu-karim',
    'maguindanao/hollow-tree-emberkeeper-harun',
    'maguindanao/lost-ring-bearer-buganga',
    'maguindanao/legend-script-guardian-datu-kali-adam',
    'maguindanao/mantapuli-memory-keeper-alad',
    'maguindanao/many-bodied-hunter-omaka-an-shard',
    'maguindanao/bita-eclipse-hatchling-pahira',
    'maguindanao/dread-night-caller-balbal',
    'maguindanao/heaven-sheltered-survivor-lanao-sprite',
    'maguindanao/three-scourge-slayer-sulayman',
    'maguindanao/land-restoring-raja-indarapatra',
    'maguindanao/seven-sight-final-scourge-gurayan',
    'maguindanao/gurayen-wrath-mate-maka-ogis',
    'maguindanao/ridge-bed-devourer-omaka-an',
  ]);

  it('every Agta card has a script, or is knowingly waiting for one', () => {
    // Legacy unfinished printings stay documented; every Set 1 card is implemented.
    const cards = cardsForDeck('Agta').filter((c) => !c.effectsPending);
    const missing = cards
      .filter((c) => !AGTA_SCRIPTS[c.id] && !AGTA_SET_ONE_SCRIPTS[c.id] && !AWAITING_SKILLS.has(c.id))
      .map((c) => c.name);
    expect(missing).toEqual([]);
    const waiting = cards.filter((c) => AWAITING_SKILLS.has(c.id)).length;
    expect(Object.keys(AGTA_SCRIPTS).length + Object.keys(AGTA_SET_ONE_SCRIPTS).length + waiting).toBe(cards.length);
  });

  it('every Agta script id refers to a real card', () => {
    const index = indexForDeck('Agta');
    for (const id of Object.keys({...AGTA_SCRIPTS,...AGTA_SET_ONE_SCRIPTS})) {
      expect(index[id], `script ${id} has no matching card`).toBeDefined();
    }
  });


  it('every Maguindanao card has a script, or is knowingly waiting for one', () => {
    const cards = cardsForDeck('Maguindanao').filter((c) => !c.effectsPending);
    const missing = cards
      .filter((c) => !MAGUINDANAO_SCRIPTS[c.id] && !MAGUINDANAO_SET_ONE_SCRIPTS[c.id] && !AWAITING_SKILLS.has(c.id))
      .map((c) => c.name);
    expect(missing).toEqual([]);
    // The scripted cards and the waiting ones together are the whole library:
    // nothing counted twice, nothing unaccounted for. Counted per deck, not
    // from the set's size — the list spans every deck now.
    const waiting = cards.filter((c) => AWAITING_SKILLS.has(c.id)).length;
    expect(Object.keys(MAGUINDANAO_SCRIPTS).length + Object.keys(MAGUINDANAO_SET_ONE_SCRIPTS).length + waiting).toBe(cards.length);
  });

  it('nothing on the awaiting-skills list has quietly gained a script', () => {
    // The list is only honest while it shrinks. If an id here has a script,
    // the entry is stale and the guard above has stopped covering that card.
    const scripted = { ...AGTA_SCRIPTS, ...MAGUINDANAO_SCRIPTS };
    const stale = [...AWAITING_SKILLS].filter((id) => scripted[id]);
    expect(stale, 'these ids now have scripts and should leave the list')
      .toEqual([]);
  });

  it('every Maguindanao script id refers to a real card', () => {
    const index = indexForDeck('Maguindanao');
    for (const id of Object.keys(MAGUINDANAO_SCRIPTS)) {
      expect(index[id], `script ${id} has no matching card`).toBeDefined();
    }
  });




});
