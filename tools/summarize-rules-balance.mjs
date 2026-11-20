/** Merge the three completed shards for each version. Never publish a partial run. */
import { readFile, writeFile } from 'node:fs/promises';

const regions = ['Luzon', 'Visayas', 'Mindanao'];
const versions = {};
const average = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
const percent = (wins, total) => `${(100 * wins / total).toFixed(1)}%`;
const mean = (rows, key) => average(rows, key).toFixed(1);
for (const version of ['before', 'current']) {
  const shards = await Promise.all(regions.map(region => readFile(`.tmp/balance-${version}-${region}.json`, 'utf8').then(JSON.parse)));
  const results = shards.flatMap(shard => shard.results);
  const keys = new Set(results.map(row => `${row.first}/${row.second}/${row.seed}`));
  if (results.length !== 900 || keys.size !== 900) throw new Error(`${version}: expected 900 unique completed records, got ${results.length}/${keys.size}`);
  for (const first of regions) for (const second of regions) for (let seed = 1; seed <= 100; seed++) {
    if (!keys.has(`${first}/${second}/${seed}`)) throw new Error(`Missing ${version} ${first}/${second}/${seed}`);
  }
  versions[version] = results;
  await writeFile(`docs/generated/balance-${version === 'current' ? 'after' : 'before'}.json`, JSON.stringify({
    label: version, seeds: 100, baseline: '0047874b1a8de9e34a44b314a25805639314eac5',
    implementation: '12cca3b',
    measurementNotes: [
      'draws and charges count events that are not comprehensively emitted; these values are NOT total draws or restands.',
      'peakHeart and peakChain are sampled at decisions/action boundaries; they are observed peaks.',
      'specialCalls uses existing special-called log entries; offers counts costPaid offer events.',
      'stagnantActions counts consecutive unchanged action snapshots; it is not a proof that every possible loop is impossible.',
    ], results,
  }, null, 2) + '\n');
}
const rows = ['# Paired rules comparison', '', '2 October 2026. **900 games per version, 1,800 total.**', '',
  'Baseline: `0047874b1a8de9e34a44b314a25805639314eac5`. Integrated implementation: `12cca3b`.', '',
  'Identical Set 1 starter decks, seeds 1–100, and all nine ordered regional pairings. Seat 0 starts. The normal bot profile uses each version’s own legal rules and choices; this compares the whole release, not Energy removal in isolation. An 80-turn ceiling marks unfinished matches as failures.', '',
  '## Completion and pacing', '', '| Measure | Before | After |', '|---|---:|---:|'];
for (const [label, summarize] of [
  ['Finished without error', rs => `${rs.filter(r => r.winner !== null && !r.error).length}/900`],
  ['Errors', rs => String(rs.filter(r => r.error).length)],
  ['Unfinished', rs => String(rs.filter(r => r.winner === null).length)],
  ['First-player wins', rs => percent(rs.filter(r => r.winner === 0).length, rs.length)],
  ['First-turn wins', rs => String(rs.filter(r => r.firstTurnWin).length)],
  ['Mean turns', rs => mean(rs, 'turns')],
  ['Longest match (turns)', rs => String(Math.max(...rs.map(r => r.turns)))],
  ['Mean decisions per match', rs => mean(rs, 'decisions')],
  ['Mean AI actions per match', rs => mean(rs, 'actions')],
  ['Unchanged consecutive action snapshots', rs => String(rs.reduce((sum, r) => sum + r.stagnantActions, 0))],
  ['Mean logged special calls', rs => mean(rs, 'specialCalls')],
  ['Mean Offer events', rs => mean(rs, 'offers')],
  ['Largest observed Heart', rs => String(Math.max(...rs.map(r => r.peakHeart)))],
  ['Largest observed chain', rs => String(Math.max(...rs.map(r => r.peakChain)))],
]) rows.push(`| ${label} | ${summarize(versions.before)} | ${summarize(versions.current)} |`);
rows.push('', '## Ordered matchups', '', 'Wins are for the first-listed (starting) deck. Each cell covers 100 games.', '',
  '| Starting deck | Second deck | Before wins | After wins | Before mean turns | After mean turns |', '|---|---|---:|---:|---:|---:|');
for (const first of regions) for (const second of regions) {
  const b = versions.before.filter(r => r.first === first && r.second === second);
  const a = versions.current.filter(r => r.first === first && r.second === second);
  rows.push(`| ${first} | ${second} | ${percent(b.filter(r => r.winner === 0).length, 100)} | ${percent(a.filter(r => r.winner === 0).length, 100)} | ${mean(b, 'turns')} | ${mean(a, 'turns')} |`);
}
rows.push('', '## Regional wins excluding mirrors', '', '| Region | Before (400 games) | After (400 games) | Change |', '|---|---:|---:|---:|');
for (const region of regions) {
  const rate = rs => {
    const eligible = rs.filter(r => r.first !== r.second && (r.first === region || r.second === region));
    return eligible.filter(r => r.winner !== null && (r.winner === 0 ? r.first : r.second) === region).length / eligible.length * 100;
  };
  const b = rate(versions.before), a = rate(versions.current);
  rows.push(`| ${region} | ${b.toFixed(1)}% | ${a.toFixed(1)}% | ${(a - b).toFixed(1)} percentage points |`);
}
rows.push('', '## Limits and reproduction', '',
  '- Review flag: first-player advantage rose from 55.1% to 63.0%. Visayas lost 15.3 percentage points across non-mirror matchups, while Mindanao gained 12.5. Human tests should cover both seats, especially Luzon versus Visayas. No speculative card nerf/buff was added solely to equalize bot results.',
  '- These are exploratory bot matches, not evidence of human competitive balance or tutorial comprehension.',
  '- The draw/restand event counters in this runner are incomplete because those operations do not consistently emit the named event types. Their raw zeroes must not be read as zero gameplay activity. Complete draw, attack and restand totals remain an instrumentation gap.',
  '- Heart/chain peaks are sampled at choices/actions. Offer events and logged special calls are useful comparisons, not a replacement for a full event audit.',
  '- No-progress snapshots and the 80-turn ceiling detect observed stalls; they do not prove that every legal player-created combo is finite.',
  '- Keep large regional shifts visible for human playtesting. Do not change card power merely to make this bot’s win rates equal.', '',
  'Run `tools/rules-balance.ts` with vite-node (or bundle it with esbuild), passing version label, output path, 100, and optional first region. Copy the identical runner into a source archive of the baseline. Run each region shard for both versions, then `node tools/summarize-rules-balance.mjs`. The summarizer rejects incomplete or duplicate seed sets.', '');
await writeFile('docs/generated/rules-balance-comparison.md', rows.join('\n'));
console.log(rows.join('\n'));
