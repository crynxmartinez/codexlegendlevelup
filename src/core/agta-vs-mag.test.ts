/**
 * Agta vs Maguindanao — 100-game simulation with per-card analysis.
 *
 * Runs 50 games as Agta(p0) vs Maguindanao(p1) and 50 games as
 * Maguindanao(p0) vs Agta(p1), then collects:
 *   - Win rates
 *   - Per-card ability fire counts
 *   - Per-card presence in games (drawn / played)
 *   - Average turns
 */
import { it } from 'vitest';
import agtaDeck from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeck from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import { FULL_INDEX, indexForDecks } from '../data/loader.js';
import { createGame, type DeckList } from './setup.js';
import { GameController } from './game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { you } from './state.js';

const DECKS: Record<string, DeckList> = {
  Agta: agtaDeck as unknown as DeckList,
  Maguindanao: maguindanaoDeck as unknown as DeckList,
};

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
  // --- Agta Force (no specific log; check for "Play with" / mode use) ---
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
  // How many games this card appeared in (was in the deck and drawn/seen).
  gamesSeen: number;
  // How many games at least one ability fired.
  gamesFired: number;
  // Total fire count across all games.
  totalFires: number;
  // Whether this is a passive card (no log expected).
  passive: boolean;
}

interface GameResult {
  winner: 0 | 1 | null;
  turns: number;
  deckA: string;
  deckB: string;
  log: string;
  // Cards that appeared in each player's zones during the game.
  seenByPlayer: [Set<string>, Set<string>];
}

async function runGame(
  deckA: string,
  deckB: string,
  seed: number,
): Promise<GameResult> {
  const game = createGame(index, [DECKS[deckA]!, DECKS[deckB]!], { seed });
  const chooser = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, { choosers: [chooser, chooser] });
  let turns = 0;
  while (game.winner === null && turns < MAX_TURNS) {
    await ctrl.beginTurn();
    await playAiTurn(ctrl, game.turnPlayer);
    turns++;
  }

  // Track which cards each player saw (in any zone).
  const seenByPlayer: [Set<string>, Set<string>] = [new Set(), new Set()];
  for (const pid of [0, 1] as const) {
    const ps = you(game, pid);
    // Cards that were in hand, field, grave, deck, etc.
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

  return {
    winner: game.winner,
    turns,
    deckA,
    deckB,
    log: (game.log || []).join('\n'),
    seenByPlayer,
  };
}

it('Agta vs Maguindanao — 100-game simulation with per-card analysis', async () => {
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

  // --- Per-card stats ---
  // For each card, count how many games it was seen by the player playing its
  // deck, and how many games its ability fired.
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
      // Determine which player was playing this card's deck.
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
      cardId,
      cardName: defEntry.name,
      deck,
      type: defEntry.type,
      level: defEntry.level,
      power: defEntry.power,
      gamesSeen,
      gamesFired,
      totalFires,
      passive: isPassive,
    });
  }

  // Sort by deck then by level (persona first), then by name.
  cardStats.sort((a, b) => {
    if (a.deck !== b.deck) return a.deck.localeCompare(b.deck);
    if (a.level !== b.level) return a.level - b.level;
    return a.cardName.localeCompare(b.cardName);
  });

  // --- Print Agta card stats ---
  console.log('\n========================================');
  console.log('  AGTA — PER-CARD STATS (100 games)');
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
  console.log('  MAGUINDANAO — PER-CARD STATS (100 games)');
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

  // --- Low-fire cards (< 20% fire rate when seen) ---
  const lowFire = cardStats.filter((c) => !c.passive && c.gamesSeen > 5 && c.gamesFired / c.gamesSeen < 0.2);
  if (lowFire.length > 0) {
    console.log('\n=== LOW-FIRE CARDS (< 20% fire rate when seen) ===');
    for (const c of lowFire) {
      const rate = ((c.gamesFired / c.gamesSeen) * 100).toFixed(0);
      console.log(`  ${c.cardName} (${c.deck}) — ${c.gamesFired}/${c.gamesSeen} (${rate}%)`);
    }
  }

  // Sanity check: no crashes.
  const finishRate = ((results.length - draws) / results.length) * 100;
  if (finishRate < 80) {
    throw new Error(`Too many unfinished games: ${draws}/${results.length} (${finishRate.toFixed(1)}% finish rate)`);
  }
}, 600000);
