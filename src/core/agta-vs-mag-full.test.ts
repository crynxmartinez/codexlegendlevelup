/**
 * Agta vs Maguindanao — Comprehensive 100-game analysis.
 *
 * Runs 50 games as Agta(p0) vs Maguindanao(p1) and 50 games as
 * Maguindanao(p0) vs Agta(p1), then collects:
 *   - Win rates
 *   - Most used Codex (which codex is active at end of game)
 *   - Most used Persona (which persona is active at end of game = finisher)
 *   - Persona personification counts (which personas get personified into)
 *   - Card play/call counts (most played cards)
 *   - Per-card ability fire counts
 *   - Average turns
 *   - Garahana release rate
 *   - Offer counts
 *   - Barrier break counts
 */
import { it } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { FULL_INDEX, indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { AI_HARD, AI_NORMAL } from '../ai/evaluate.js';
import { you } from './state.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
};

// Which bot the report describes. `AIPROFILE=hard` re-runs the same hundred
// games with the play lines on, which is how a line is checked against the
// card it was written for rather than only against a win rate.
declare const process: { env: Record<string, string | undefined> };
const PROFILE = process.env.AIPROFILE === 'hard' ? AI_HARD : AI_NORMAL;

const index = indexForDecks(['Agta', 'Maguindanao']);

const MAX_TURNS = 80;
const GAMES_EACH = 50;

// Keyword snippets that indicate a card's ability fired.
const SKILL_CHECKS: Record<string, string[]> = {
  // --- Agta Personas ---
  'agta/arrow-of-the-sierra-amihan': ['Amihan:'],
  'agta/the-boar-spear-makisig': ['Makisig:'],
  'agta/voice-beneath-the-rain-laya': ['Laya:'],
  // --- Agta L2 ---
  'agta/honey-keep-cliffer-kislap': ['Kislap:'],
  'agta/deerstep-runner-kidlat': ['Kidlat:'], // banks a whiffed Sipol
  'agta/moon-net-fisher-mayumi': ['Sipol:'],
  'agta/ember-resin-grandmother-sinta': ['Sipol:'],
  'agta/storm-bark-elder-ulan': ['Ulan:'],
  // --- Agta L1 ---
  'agta/firefly-pathkeeper-aya': ['Aya:'],
  'agta/mudcrab-catcher-pilo': ['Pilo:'],
  'agta/ember-pot-bearer-berto': ['Berto:'],
  'agta/leaf-whistle-scout-sari': ['Sari:'],
  'agta/rattan-bridge-weaver-nena': ['Nena:'],
  // --- Agta Sentry ---
  'agta/sierra-watchkeeper-banoy': ['Banoy:'],
  // --- Agta Codex ---
  'agta/hidden-path': ['Hidden Path:'],
  'agta/listening-canopy': ['Listening Canopy:'],
  'agta/returning-river': ['Returning River:'],
  'agta/shared-ember': ['Shared Ember:'],
  'agta/thousand-knots': ['Thousand Knots:'],
  // --- Agta Actions ---
  'agta/rattan-snarefall': ['Sipol:'],
  'agta/sierras-vanishing-trail': ['Sipol:'],
  // --- Agta Force ---
  'agta/mangrove-maw-lunod': ['+5000', 'Drew 1'],
  'agta/golden-hiveheart-pulot': ['+5000', 'All units +2000'],
  'agta/root-tusk-boar-dagsa': ['+5000', 'Exhaust'],
  'agta/storm-talon-eagle-salimbay': ['+5000', 'Damage an exhausted'],

  // --- Maguindanao Personas ---
  'maguindanao/veiled-eclipse-maharaja': ['Maharaja:'],
  'maguindanao/blood-moon-bai-a-labi': ['Blood Moon:', 'Bai A-labi:'],
  'maguindanao/kuta-wato-warcaller-datu-salik': ['Salik:'],
  // --- Maguindanao L2 ---
  'maguindanao/buluan-inaul-wardkeeper-dayang-nuraya': ['Nuraya:'],
  'maguindanao/illana-lantaka-warder-panglima-jamal': ['Jamal:'],
  'maguindanao/kuta-wato-gate-bulwark-bai-samira': [],
  'maguindanao/liguasan-reed-eye-harun': ['Harun:'],
  'maguindanao/pulangi-wake-cleaver-panglima-farid': ['Farid:'],
  // --- Maguindanao L1 ---
  'maguindanao/buluan-shell-caller-mayla': ['Mayla:'],
  'maguindanao/illana-tide-harpooner-hakim': ['Hakim:'],
  'maguindanao/kuta-wato-banner-keeper-sitti-rahma': ['Sitti Rahma:'],
  'maguindanao/liguasan-mudblade-nasser': ['Nasser:'],
  'maguindanao/pulangi-ember-spear-kamil': [],
  // --- Maguindanao Force ---
  'maguindanao/buluan-mirror-seer-dayang-amira': ['Amira:'],
  'maguindanao/illana-stormwing-ramitan': ['Ramitan:'],
  'maguindanao/liguasan-mire-bender-duma': ['Duma:'],
  'maguindanao/pulangi-bloodcurrent-sangkad': ['Sangkad:'],
  // --- Maguindanao Actions ---
  'maguindanao/crimson-agung-resonance': ['Crimson Agung'],
  'maguindanao/pulangi-river-unbound': ['Pulangi River Unbound:'],
  // --- Maguindanao Sentry ---
  'maguindanao/kuta-wato-oath-shield-panglima-sabir': ['Sabir:'],
  // --- Maguindanao Codex ---
  'maguindanao/illana-bay': ['Illana Bay:'],
  'maguindanao/kuta-wato': ['Kuta Wato'],
  'maguindanao/lake-buluan': ['Lake Buluan:'],
  'maguindanao/liguasan-marsh': ['Liguasan Marsh:'],
  'maguindanao/pulangi-river': ['Pulangi River:'],
};

interface CardStats {
  cardId: string;
  cardName: string;
  deck: string;
  type: string;
  level: number;
  power: number;
  gamesSeen: number;
  gamesFired: number;
  totalFires: number;
  passive: boolean;
}

interface GameResult {
  winner: 0 | 1 | null;
  turns: number;
  deckA: string;
  deckB: string;
  log: string;
  seenByPlayer: [Set<string>, Set<string>];
  // Final active codex for each player.
  finalCodex: [string | null, string | null];
  // Final active persona for each player.
  finalPersona: [string | null, string | null];
  // Starting persona for each player.
  startingPersona: [string | null, string | null];
  // All codex cards that were ever active during the game (per player).
  codexUsed: [Set<string>, Set<string>];
  // All personas that were ever active (per player).
  personasUsed: [Set<string>, Set<string>];
  // Count of "called X to slot" per card (per player).
  callsByPlayer: [Map<string, number>, Map<string, number>];
  // Count of "special called X" per card (per player).
  specialCallsByPlayer: [Map<string, number>, Map<string, number>];
  // Count of "played X" per card (per player).
  playsByPlayer: [Map<string, number>, Map<string, number>];
  // Count of "switched Codex to X" per card (per player).
  codexSwitchesByPlayer: [Map<string, number>, Map<string, number>];
  // Count of "personified into X" per card (per player).
  personifiesByPlayer: [Map<string, number>, Map<string, number>];
  // Count of offers per player.
  offersByPlayer: [number, number];
  // Count of barrier breaks per player.
  barrierBreaksByPlayer: [number, number];
  // Whether Garahana was released (per player).
  garahanaReleased: [boolean, boolean];
}

async function runGame(
  deckA: string,
  deckB: string,
  seed: number,
): Promise<GameResult> {
  const game = createGame(index, [DECKS[deckA]!, DECKS[deckB]!], { seed });
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });

  // Track starting personas.
  const startingPersona: [string | null, string | null] = [
    you(game, 0).persona ? game.cards[you(game, 0).persona!]?.defId ?? null : null,
    you(game, 1).persona ? game.cards[you(game, 1).persona!]?.defId ?? null : null,
  ];

  // Track all codex/personas ever active.
  const codexUsed: [Set<string>, Set<string>] = [new Set(), new Set()];
  const personasUsed: [Set<string>, Set<string>] = [new Set(), new Set()];
  for (const pid of [0, 1] as const) {
    const ps = you(game, pid);
    if (ps.activeCodex) codexUsed[pid].add(game.cards[ps.activeCodex]?.defId ?? '');
    if (ps.persona) personasUsed[pid].add(game.cards[ps.persona]?.defId ?? '');
  }

  let turns = 0;
  while (game.winner === null && turns < MAX_TURNS) {
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer, PROFILE);
    turns++;

    // Track codex/persona changes.
    for (const pid of [0, 1] as const) {
      const ps = you(game, pid);
      if (ps.activeCodex) codexUsed[pid].add(game.cards[ps.activeCodex]?.defId ?? '');
      if (ps.persona) personasUsed[pid].add(game.cards[ps.persona]?.defId ?? '');
    }
  }

  // Track which cards each player saw.
  const seenByPlayer: [Set<string>, Set<string>] = [new Set(), new Set()];
  for (const pid of [0, 1] as const) {
    const ps = you(game, pid);
    const allZones = [
      ...ps.hand,
      ...ps.allies.filter((x): x is string => !!x),
      ...ps.grave,
      ...ps.deck,
      ...ps.heart,
      ...ps.exile,
      ...(ps.persona ? [ps.persona] : []),
      ...(ps.activeCodex ? [ps.activeCodex] : []),
      ...ps.codex,
    ];
    for (const uid of allZones) {
      const card = game.cards[uid];
      if (card) seenByPlayer[pid].add(card.defId);
    }
  }

  // Parse the log for per-card action counts.
  const log = (game.log || []).join('\n');
  const callsByPlayer: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const specialCallsByPlayer: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const playsByPlayer: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const codexSwitchesByPlayer: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const personifiesByPlayer: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const offersByPlayer: [number, number] = [0, 0];
  const barrierBreaksByPlayer: [number, number] = [0, 0];

  // Helper to get card name -> defId mapping.
  const nameToDefId = new Map<string, string>();
  for (const [defId, d] of Object.entries(FULL_INDEX)) {
    const dd = d as unknown as { name: string };
    nameToDefId.set(dd.name, defId);
  }

  for (const line of log.split('\n')) {
    // "Player X called NAME to slot Y"
    let m = line.match(/Player (\d) called (.+) to slot \d/);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = callsByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // "Player X special called NAME."
    m = line.match(/Player (\d) special called (.+)\./);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = specialCallsByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // "Player X played NAME."
    m = line.match(/Player (\d) played (.+)\./);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = playsByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // "Player X switched Codex to NAME."
    m = line.match(/Player (\d) switched Codex to (.+)\./);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = codexSwitchesByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // "Player X personified into NAME"
    m = line.match(/Player (\d) personified into (.+) \(from/);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = personifiesByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // "Player X personified into NAME." (normal, no parens)
    m = line.match(/Player (\d) personified into (.+)\.$/);
    if (m) {
      const pid = Number(m[1]) as 0 | 1;
      const name = m[2]!;
      const defId = nameToDefId.get(name);
      if (defId) {
        const map = personifiesByPlayer[pid];
        map.set(defId, (map.get(defId) ?? 0) + 1);
      }
      continue;
    }
    // Offer count: "offered NAME" or "Offered NAME"
    if (/offered .+\(Kuta Wato\)|Offered .+ from deck instead|was Offered \(first call/.test(line)) {
      const pm = line.match(/Player (\d)/);
      if (pm) {
        const pid = Number(pm[1]) as 0 | 1;
        offersByPlayer[pid]++;
      }
      continue;
    }
    if (/offered .+\(|Offered .+ from deck|was Offered/.test(line)) {
      const pm = line.match(/Player (\d)/);
      if (pm) {
        const pid = Number(pm[1]) as 0 | 1;
        offersByPlayer[pid]++;
      }
      continue;
    }
    // Barrier break: "barrier" or "Barrier" in check resolution
    if (/barrier.*broken|Barrier.*broken|broke.*barrier|check.*revealed/.test(line)) {
      const pm = line.match(/Player (\d)/);
      if (pm) {
        const pid = Number(pm[1]) as 0 | 1;
        barrierBreaksByPlayer[pid]++;
      }
    }
  }

  // Final state.
  const finalCodex: [string | null, string | null] = [null, null];
  const finalPersona: [string | null, string | null] = [null, null];
  const garahanaReleased: [boolean, boolean] = [false, false];
  for (const pid of [0, 1] as const) {
    const ps = you(game, pid);
    if (ps.activeCodex) finalCodex[pid] = game.cards[ps.activeCodex]?.defId ?? null;
    if (ps.persona) finalPersona[pid] = game.cards[ps.persona]?.defId ?? null;
    // Check if Garahana state is released.
    garahanaReleased[pid] = ps.releasedState === 'Garahana';
  }

  return {
    winner: game.winner,
    turns,
    deckA,
    deckB,
    log,
    seenByPlayer,
    finalCodex,
    finalPersona,
    startingPersona,
    codexUsed,
    personasUsed,
    callsByPlayer,
    specialCallsByPlayer,
    playsByPlayer,
    codexSwitchesByPlayer,
    personifiesByPlayer,
    offersByPlayer,
    barrierBreaksByPlayer,
    garahanaReleased,
  };
}

function getCardName(defId: string): string {
  const d = FULL_INDEX[defId] as unknown as { name: string };
  return d?.name ?? defId;
}

function getCardDeck(defId: string): string {
  const d = FULL_INDEX[defId] as unknown as { deck?: string };
  return d?.deck ?? '?';
}

it('Agta vs Maguindanao — Comprehensive 100-game analysis', async () => {
  const results: GameResult[] = [];

  // 50 games Agta vs Maguindanao
  for (let seed = 1; seed <= GAMES_EACH; seed++) {
    results.push(await runGame('Agta', 'Maguindanao', seed));
  }
  // 50 games Maguindanao vs Agta
  for (let seed = 1; seed <= GAMES_EACH; seed++) {
    results.push(await runGame('Maguindanao', 'Agta', seed + 1000));
  }

  // --- Win rate summary ---
  let agtaWins = 0;
  let magWins = 0;
  let draws = 0;
  const turnCounts: number[] = [];

  for (const r of results) {
    if (r.winner === null) draws++;
    else if (r.deckA === 'Agta' && r.winner === 0) agtaWins++;
    else if (r.deckB === 'Agta' && r.winner === 1) agtaWins++;
    else if (r.deckA === 'Maguindanao' && r.winner === 0) magWins++;
    else if (r.deckB === 'Maguindanao' && r.winner === 1) magWins++;
    turnCounts.push(r.turns);
  }

  console.log('\n========================================');
  console.log('  AGTA vs MAGUINDANAO — 100 GAMES');
  console.log('========================================\n');
  console.log(`Agta wins:        ${agtaWins} (${((agtaWins / results.length) * 100).toFixed(1)}%)`);
  console.log(`Maguindanao wins: ${magWins} (${((magWins / results.length) * 100).toFixed(1)}%)`);
  console.log(`Draws:            ${draws}`);
  console.log(`Avg turns:        ${(turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length).toFixed(1)}`);

  // --- Most used Codex (active at end of game) ---
  console.log('\n========================================');
  console.log('  MOST USED CODEX (active at game end)');
  console.log('========================================\n');
  const codexFinalCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      const defId = r.finalCodex[pid];
      if (defId) {
        const deck = getCardDeck(defId);
        // Only count for the deck that owns the codex.
        const playerDeck = pid === 0 ? r.deckA : r.deckB;
        if (deck === playerDeck) {
          codexFinalCounts.set(defId, (codexFinalCounts.get(defId) ?? 0) + 1);
        }
      }
    }
  }
  const codexSorted = [...codexFinalCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Games  %');
  console.log('--------------------------------------  -----  ---');
  for (const [defId, count] of codexSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    const pct = ((count / GAMES_EACH) * 100).toFixed(0);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}  ${pct.padStart(3)}%`);
  }

  // --- Codex ever used (was active at any point during game) ---
  console.log('\n========================================');
  console.log('  CODEX EVER ACTIVE (was active at any point)');
  console.log('========================================\n');
  const codexEverCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      const playerDeck = pid === 0 ? r.deckA : r.deckB;
      for (const defId of r.codexUsed[pid]) {
        const deck = getCardDeck(defId);
        if (deck === playerDeck) {
          codexEverCounts.set(defId, (codexEverCounts.get(defId) ?? 0) + 1);
        }
      }
    }
  }
  const codexEverSorted = [...codexEverCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Games  %');
  console.log('--------------------------------------  -----  ---');
  for (const [defId, count] of codexEverSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    const pct = ((count / GAMES_EACH) * 100).toFixed(0);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}  ${pct.padStart(3)}%`);
  }

  // --- Codex switch counts ---
  console.log('\n========================================');
  console.log('  CODEX SWITCH COUNTS (manual + auto)');
  console.log('========================================\n');
  const codexSwitchCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      for (const [defId, count] of r.codexSwitchesByPlayer[pid]) {
        codexSwitchCounts.set(defId, (codexSwitchCounts.get(defId) ?? 0) + count);
      }
    }
  }
  const switchSorted = [...codexSwitchCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Switches');
  console.log('--------------------------------------  --------');
  for (const [defId, count] of switchSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(8)}`);
  }

  // --- Most used Persona (finisher = active at game end) ---
  console.log('\n========================================');
  console.log('  FINISHER PERSONAS (active at game end)');
  console.log('========================================\n');
  const finisherCounts = new Map<string, { total: number; wins: number }>();
  for (const r of results) {
    if (r.winner === null) continue;
    const winnerPid = r.winner as 0 | 1;
    // Winner's finisher.
    const winnerPersona = r.finalPersona[winnerPid];
    if (winnerPersona) {
      const e = finisherCounts.get(winnerPersona) ?? { total: 0, wins: 0 };
      e.total++;
      e.wins++;
      finisherCounts.set(winnerPersona, e);
    }
    // Loser's finisher.
    const loserPid = (1 - winnerPid) as 0 | 1;
    const loserPersona = r.finalPersona[loserPid];
    if (loserPersona) {
      const e = finisherCounts.get(loserPersona) ?? { total: 0, wins: 0 };
      e.total++;
      finisherCounts.set(loserPersona, e);
    }
  }
  const finisherSorted = [...finisherCounts.entries()].sort((a, b) => b[1].total - a[1].total);
  console.log('Persona                                 Games  Wins  Win%');
  console.log('--------------------------------------  -----  ----  ----');
  for (const [defId, { total, wins }] of finisherSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    const winPct = ((wins / total) * 100).toFixed(0);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(total).padStart(5)}  ${String(wins).padStart(4)}  ${winPct.padStart(4)}%`);
  }

  // --- Starting vs Final persona ---
  console.log('\n========================================');
  console.log('  STARTING PERSONAS');
  console.log('========================================\n');
  const startingCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      const defId = r.startingPersona[pid];
      if (defId) {
        const deck = getCardDeck(defId);
        const playerDeck = pid === 0 ? r.deckA : r.deckB;
        if (deck === playerDeck) {
          startingCounts.set(defId, (startingCounts.get(defId) ?? 0) + 1);
        }
      }
    }
  }
  const startingSorted = [...startingCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Persona                                 Games  %');
  console.log('--------------------------------------  -----  ---');
  for (const [defId, count] of startingSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    const pct = ((count / GAMES_EACH) * 100).toFixed(0);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}  ${pct.padStart(3)}%`);
  }

  // --- Personification counts (which personas get personified into) ---
  console.log('\n========================================');
  console.log('  PERSONIFICATION TARGETS (personified into)');
  console.log('========================================\n');
  const personifyCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      for (const [defId, count] of r.personifiesByPlayer[pid]) {
        personifyCounts.set(defId, (personifyCounts.get(defId) ?? 0) + count);
      }
    }
  }
  const personifySorted = [...personifyCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Persona                                 Count');
  console.log('--------------------------------------  -----');
  for (const [defId, count] of personifySorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}`);
  }

  // --- Most played/called cards ---
  console.log('\n========================================');
  console.log('  MOST CALLED CARDS (normal calls)');
  console.log('========================================\n');
  const callCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      for (const [defId, count] of r.callsByPlayer[pid]) {
        callCounts.set(defId, (callCounts.get(defId) ?? 0) + count);
      }
    }
  }
  const callSorted = [...callCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Calls');
  console.log('--------------------------------------  -----');
  for (const [defId, count] of callSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}`);
  }

  // --- Most special called cards ---
  console.log('\n========================================');
  console.log('  MOST SPECIAL CALLED CARDS');
  console.log('========================================\n');
  const specialCallCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      for (const [defId, count] of r.specialCallsByPlayer[pid]) {
        specialCallCounts.set(defId, (specialCallCounts.get(defId) ?? 0) + count);
      }
    }
  }
  const specialCallSorted = [...specialCallCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Special Calls');
  console.log('--------------------------------------  -------------');
  for (const [defId, count] of specialCallSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(13)}`);
  }

  // --- Most played action/force cards ---
  console.log('\n========================================');
  console.log('  MOST PLAYED CARDS (actions + forces)');
  console.log('========================================\n');
  const playCounts = new Map<string, number>();
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      for (const [defId, count] of r.playsByPlayer[pid]) {
        playCounts.set(defId, (playCounts.get(defId) ?? 0) + count);
      }
    }
  }
  const playSorted = [...playCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Card                                    Plays');
  console.log('--------------------------------------  -----');
  for (const [defId, count] of playSorted) {
    const name = getCardName(defId);
    const deck = getCardDeck(defId);
    console.log(`${(name + ' (' + deck + ')').padEnd(38)}  ${String(count).padStart(5)}`);
  }

  // --- Offer counts ---
  console.log('\n========================================');
  console.log('  OFFER COUNTS (Maguindanao mechanic)');
  console.log('========================================\n');
  let agtaOffers = 0;
  let magOffers = 0;
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      const deck = pid === 0 ? r.deckA : r.deckB;
      if (deck === 'Agta') agtaOffers += r.offersByPlayer[pid];
      else magOffers += r.offersByPlayer[pid];
    }
  }
  console.log(`Agta offers (total):        ${agtaOffers}  (avg ${(agtaOffers / GAMES_EACH).toFixed(1)}/game)`);
  console.log(`Maguindanao offers (total): ${magOffers}  (avg ${(magOffers / GAMES_EACH).toFixed(1)}/game)`);

  // --- Garahana release rate ---
  console.log('\n========================================');
  console.log('  GARAHANA RELEASE RATE (Maguindanao)');
  console.log('========================================\n');
  let garahanaCount = 0;
  for (const r of results) {
    for (const pid of [0, 1] as const) {
      const deck = pid === 0 ? r.deckA : r.deckB;
      if (deck === 'Maguindanao' && r.garahanaReleased[pid]) garahanaCount++;
    }
  }
  console.log(`Garahana released: ${garahanaCount}/${GAMES_EACH} games (${((garahanaCount / GAMES_EACH) * 100).toFixed(0)}%)`);

  // --- Per-card ability fire stats ---
  const cardStats: CardStats[] = [];
  for (const [cardId, keywords] of Object.entries(SKILL_CHECKS)) {
    const defEntry = FULL_INDEX[cardId] as unknown as { deck?: string; name: string; type: string; level: number; power: number };
    if (!defEntry) continue;
    const deck = defEntry.deck ?? '?';
    const isPassive = keywords.length === 0;
    let gamesSeen = 0;
    let gamesFired = 0;
    let totalFires = 0;
    for (const r of results) {
      let player: 0 | 1;
      if (r.deckA === deck) player = 0;
      else if (r.deckB === deck) player = 1;
      else continue;
      const seen = r.seenByPlayer[player].has(cardId);
      if (seen) gamesSeen++;
      if (!isPassive) {
        let fires = 0;
        for (const kw of keywords) {
          fires += r.log.split(kw).length - 1;
        }
        if (fires > 0) gamesFired++;
        totalFires += fires;
      }
    }
    cardStats.push({
      cardId, cardName: defEntry.name, deck,
      type: defEntry.type, level: defEntry.level, power: defEntry.power,
      gamesSeen, gamesFired, totalFires, passive: isPassive,
    });
  }
  cardStats.sort((a, b) => {
    if (a.deck !== b.deck) return a.deck.localeCompare(b.deck);
    if (a.level !== b.level) return a.level - b.level;
    return a.cardName.localeCompare(b.cardName);
  });

  // --- Print Agta card stats ---
  console.log('\n========================================');
  console.log('  AGTA — PER-CARD ABILITY STATS (100 games)');
  console.log('========================================\n');
  console.log('Card                                    Seen  Fired  Fires  Fire%');
  console.log('--------------------------------------  ----  -----  -----  -----');
  for (const c of cardStats.filter((c) => c.deck === 'Agta')) {
    const fireRate = c.gamesSeen > 0 && !c.passive
      ? ((c.gamesFired / c.gamesSeen) * 100).toFixed(0) + '%'
      : c.passive ? 'PASS' : '-';
    const seen = String(c.gamesSeen).padStart(4);
    const fired = c.passive ? '  --' : String(c.gamesFired).padStart(5);
    const fires = c.passive ? '  --' : String(c.totalFires).padStart(5);
    console.log(`${c.cardName.padEnd(38)}  ${seen}  ${fired}  ${fires}  ${fireRate.padStart(5)}`);
  }

  // --- Print Maguindanao card stats ---
  console.log('\n========================================');
  console.log('  MAGUINDANAO — PER-CARD ABILITY STATS (100 games)');
  console.log('========================================\n');
  console.log('Card                                    Seen  Fired  Fires  Fire%');
  console.log('--------------------------------------  ----  -----  -----  -----');
  for (const c of cardStats.filter((c) => c.deck === 'Maguindanao')) {
    const fireRate = c.gamesSeen > 0 && !c.passive
      ? ((c.gamesFired / c.gamesSeen) * 100).toFixed(0) + '%'
      : c.passive ? 'PASS' : '-';
    const seen = String(c.gamesSeen).padStart(4);
    const fired = c.passive ? '  --' : String(c.gamesFired).padStart(5);
    const fires = c.passive ? '  --' : String(c.totalFires).padStart(5);
    console.log(`${c.cardName.padEnd(38)}  ${seen}  ${fired}  ${fires}  ${fireRate.padStart(5)}`);
  }

  // --- Cards that never fired ---
  const neverFired = cardStats.filter((c) => !c.passive && c.gamesFired === 0 && c.gamesSeen > 0);
  if (neverFired.length > 0) {
    console.log('\n=== CARDS THAT NEVER FIRED (seen but ability never triggered) ===');
    for (const c of neverFired) {
      console.log(`  ${c.cardName} (${c.deck}) — seen in ${c.gamesSeen} games`);
    }
  }

  // --- Low-fire cards ---
  const lowFire = cardStats.filter((c) => !c.passive && c.gamesSeen > 5 && c.gamesFired / c.gamesSeen < 0.2);
  if (lowFire.length > 0) {
    console.log('\n=== LOW-FIRE CARDS (< 20% fire rate when seen) ===');
    for (const c of lowFire) {
      const rate = ((c.gamesFired / c.gamesSeen) * 100).toFixed(0);
      console.log(`  ${c.cardName} (${c.deck}) — ${c.gamesFired}/${c.gamesSeen} (${rate}%)`);
    }
  }

  // Sanity check.
  const finishRate = ((results.length - draws) / results.length) * 100;
  if (finishRate < 80) {
    throw new Error(`Too many unfinished games: ${draws}/${results.length} (${finishRate.toFixed(1)}% finish rate)`);
  }
}, 600000);
