# Duel clarity — patch 1.13

Implemented October 3, 2026 in the playable game repository.

## Delivered

1. **Skill explanations:** inspection describes zones, timing, once-per-turn use, state locks, Andukha thresholds, missing payment cards and empty declared target pools. Passive effects are identified. Engine legality remains authoritative; unsupported card-specific conditions fall back to the current rules text rather than inventing a reason. Hidden multiplayer deck contents are not inspected to infer target availability.
2. **Cost and effect previews:** payment preparers carry read-only descriptions used by local and private-room decisions. Offer uses weighted value and Illana Bay eligibility; Vent uses actual discounts. Hand Essence, self-payment and discard costs have labels. Pah, Tarabusaw and Sulayman have concise contextual previews. Other skills show their current rules. Action confirmations show the play plus any additional cost before commitment.
3. **Chain results:** charging, Power changes, partial resolution and negation use compact board feedback. Local source lighting clears after resolution. Private rooms publish corresponding public cues. Temporary result captions clear on resize, page hiding and replacement.
4. **Responsive choices:** action buttons reserve consistent space; effect descriptions reserve height. Desktop cards grow, landscape headers compress, and card rows remain horizontal. Visible viewport width and offset account for browser resizing. Minimizing, resizing and filtering preserve selection.
5. **Loading and motion:** Dev Log, credits and effect previews are separate optional loads. Replay-player import is deferred at source level. A bounded 64-image preparation cache warms visible cards; travel waits at most 80 ms for art and observes cancellation. Sustained slow FX frames reduce particles and waves without omitting card travel or decisions.
6. **Solo opponent:** new Hard matches use zero Force-check bias. Hard compares weighted Offer payments, accounts for Last Oaths and charged attackers, saves ineffective pure Power responses, and directs battle buffs to the actual participant. Attack evaluation considers legal targets and remaining charged attackers. Browser simulations yield between groups of candidate actions. Historical replays preserve their recorded handicap.

## Focused verification

- 75 regressions passed across cost descriptions, Illana Bay, skill status, AI tactics, movement, FX budget, private-room decisions/session, replay playback and version metadata.
- Client TypeScript/production build and match-server bundle passed.
- Real Chromium chooser checks at 1920×1080, 1366×768, 1024×768, 844×390, 667×375 and 568×320. Both response and multi-card panels fit the viewport, had no vertical card-rail overflow, kept action buttons at least 44 pixels tall, and had no action-row shift after selection. Minimize/restore preserved the selection.
- Additional browser checks confirmed selection survives resizing and filter controls remain usable at 667×375. No page errors occurred in these checks. Dev Log loaded only after opening and displayed patch 1.13.
- Main production JavaScript is 963.01 kB raw / 269.80 kB gzip. Dev Log is a separate 96.41 kB raw / 22.82 kB gzip chunk. Vite still warns about the main chunk exceeding 500 kB; this is a reduction, not a complete loading overhaul.
- Repeatable development fixture: `tools/clarity-smoke.html`. Local captures and automation outputs are under ignored `.tmp/clarity/`.

This update is local. No production deployment, broad balance benchmark or physical-phone verification was performed. Hard's new heuristics have focused behavior coverage; no stronger win rate is claimed. Full gameplay playtesting remains deferred to the user.
