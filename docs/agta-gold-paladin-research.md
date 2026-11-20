# Agta Set 1: Gold Paladin research and implementation

Reviewed 10 September 2026. These are gameplay references, not copied card effects or a claim that Vanguard formats share one ruleset.

## Research findings

- Original Ezel uses a top-card call and converts the called card's original Power into pressure. Alfred rewards a populated field. This supports Agta's existing Sipol and four-Ally Bayanihan identity. [Original Ezel](https://en.cf-vanguard.com/cardlist/?cardno=BT06%2F004EN), [Alfred](https://en.cf-vanguard.com/cardlist/?cardno=BT10%2F003EN&faq=).
- G-era Gurguit's Unite rewards calling multiple cards; it combines limited top-deck selection with field-based defense. Agta keeps its own formation condition instead of importing Unite or Vanguard's guard-circle rules. [Golden Holy Sword, Gurguit](https://en.cf-vanguard.com/cardlist/?cardno=G-BT10%2FS04EN).
- Battle calling extends attacks after existing Allies have already attacked. Gurguit Helios rewards this pattern with a finishing attack. Calls need actual space and correct timing; a main-phase call does not qualify for Annibo's battle-call repeat. [Official Revival Selection guide](https://en.cf-vanguard.com/information/v_special_series_09_revival_selection/).
- The official Glorious Reigning Dragon strategy returns spent rear-guards to the deck and calls replacements during battle; chained arrival effects can build another supported attack. This is the model for Taguwasi, Talimanog and Darawan. [Official Gold Paladin strategy](https://cf-vanguard.com/deckrecipe/detail/gbt_08_deckrecipe5).
- Standard Ezel searches top three to rebuild and top seven on attack to call into open circles. Agta uses smaller, bounded top-three/top-five searches and Energy costs rather than importing damage-dependent costs, rides or extra zones. [Standard Ezel](https://en.cf-vanguard.com/cardlist/?cardno=D-BT11%2F011EN&expansion=208&view=image).

## Agta resource cycle

Use Dalewasan or Salikan to scout before Sipol. Use Taguwasi, Sinag, The Three Brothers Ascend and Arawen to fill the four Ally Zones. Innawagan and Nagdan refund limited Energy; Alig and Nanolay recover resources. Nanolay, Amuray and Dalunan filter hand quality rather than granting unlimited extra cards.

Once all four Allies are Luzon Arch Units, Bayanihan remains released for the turn. Attack with an Ally first. Taguwasi's Persona attack can then bottom that exhausted Ally and call a fresh Unit from the top five. Annibo can attack, pay two Energy and Charge once, provided it arrived from the deck during that Battle Phase. Talimanog and Darawan can create further calls by returning themselves after an attack or supported battle. Each card's once-per-turn allowance survives leaving and returning.

Kalimangalnuk supplies a simpler full-field attack plan. Nanolay emphasizes rebuilding. Tamin and Kaliman defend by increasing the attacked Unit's Power; they do not invent a field-blocking mechanic. Banoy keeps the existing Sentry damage-negation, Sipol and exile sequence.

## Rules and limits

New top-three/top-five searches call only cards of type Unit; Force cards are not eligible for these searches. Existing Sipol retains the engine's existing rules. Searches call to open zones; Sipol retains its printed overwrite behavior. Unchosen search cards go to the deck bottom in a chosen order. Candidates are selected from one snapshot, and unused cards are bottomed before arrival triggers resolve, preventing nested searches from consuming the same candidates twice.

All new Unit effects and Codex rewards have explicit once-per-turn limits. Codex auto-switches occur at the printed event and retain the previous-turn and current-turn switch restrictions. These tests verify correctness and bounded behavior; they do not establish tournament balance.

The [card-by-card guide](agta-set-1-card-guide.md) lists all 42 new cards, their roles, and rules generated from the implemented scripts. `npx vite-node tools/export-agta-set-1.ts` refreshes the guide, JSON reference and legal starter deck, including two Banoy Sentries.
