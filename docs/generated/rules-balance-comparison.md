# Paired rules comparison

2 October 2026. **900 games per version, 1,800 total.**

Baseline: `0047874b1a8de9e34a44b314a25805639314eac5`. Integrated implementation: `12cca3b`.

Identical Set 1 starter decks, seeds 1–100, and all nine ordered regional pairings. Seat 0 starts. The normal bot profile uses each version’s own legal rules and choices; this compares the whole release, not Energy removal in isolation. An 80-turn ceiling marks unfinished matches as failures.

## Completion and pacing

| Measure | Before | After |
|---|---:|---:|
| Finished without error | 900/900 | 900/900 |
| Errors | 0 | 0 |
| Unfinished | 0 | 0 |
| First-player wins | 55.1% | 63.0% |
| First-turn wins | 0 | 0 |
| Mean turns | 11.0 | 8.5 |
| Longest match (turns) | 26 | 19 |
| Mean decisions per match | 87.4 | 88.3 |
| Mean AI actions per match | 97.4 | 77.5 |
| Unchanged consecutive action snapshots | 0 | 0 |
| Mean logged special calls | 16.2 | 14.4 |
| Mean Offer events | 6.8 | 5.6 |
| Largest observed Heart | 37 | 36 |
| Largest observed chain | 0 | 4 |

## Ordered matchups

Wins are for the first-listed (starting) deck. Each cell covers 100 games.

| Starting deck | Second deck | Before wins | After wins | Before mean turns | After mean turns |
|---|---|---:|---:|---:|---:|
| Luzon | Luzon | 52.0% | 55.0% | 10.3 | 8.4 |
| Luzon | Visayas | 59.0% | 79.0% | 12.1 | 8.2 |
| Luzon | Mindanao | 84.0% | 81.0% | 10.2 | 8.7 |
| Visayas | Luzon | 41.0% | 38.0% | 11.6 | 8.1 |
| Visayas | Visayas | 47.0% | 73.0% | 12.7 | 8.4 |
| Visayas | Mindanao | 73.0% | 65.0% | 10.5 | 8.9 |
| Mindanao | Luzon | 33.0% | 42.0% | 10.4 | 8.6 |
| Mindanao | Visayas | 36.0% | 66.0% | 11.3 | 8.8 |
| Mindanao | Mindanao | 71.0% | 68.0% | 9.8 | 8.4 |

## Regional wins excluding mirrors

| Region | Before (400 games) | After (400 games) | Change |
|---|---:|---:|---:|
| Luzon | 67.3% | 70.0% | 2.8 percentage points |
| Visayas | 54.8% | 39.5% | -15.3 percentage points |
| Mindanao | 28.0% | 40.5% | 12.5 percentage points |

## Limits and reproduction

- Review flag: first-player advantage rose from 55.1% to 63.0%. Visayas lost 15.3 percentage points across non-mirror matchups, while Mindanao gained 12.5. Human tests should cover both seats, especially Luzon versus Visayas. No speculative card nerf/buff was added solely to equalize bot results.
- These are exploratory bot matches, not evidence of human competitive balance or tutorial comprehension.
- The draw/restand event counters in this runner are incomplete because those operations do not consistently emit the named event types. Their raw zeroes must not be read as zero gameplay activity. Complete draw, attack and restand totals remain an instrumentation gap.
- Heart/chain peaks are sampled at choices/actions. Offer events and logged special calls are useful comparisons, not a replacement for a full event audit.
- No-progress snapshots and the 80-turn ceiling detect observed stalls; they do not prove that every legal player-created combo is finite.
- Keep large regional shifts visible for human playtesting. Do not change card power merely to make this bot’s win rates equal.

Run `tools/rules-balance.ts` with vite-node (or bundle it with esbuild), passing version label, output path, 100, and optional first region. Copy the identical runner into a source archive of the baseline. Run each region shard for both versions, then `node tools/summarize-rules-balance.mjs`. The summarizer rejects incomplete or duplicate seed sets.
