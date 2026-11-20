# Card frame standard v1

Status: user-approved visual direction, saved 2026-10-08 (Asia/Singapore).
Scope: future Codex Legends card artwork. This package does not replace live game assets.
Start with this document and the six files in masters/ before making any new card.

## Authority and saved files

User corrections take precedence over defects in a reference image. The master images define appearance; this document defines which elements are allowed and what must remain consistent. Original uploads are preserved byte-for-byte in originals/. manifest.json records source paths, image dimensions and SHA-256 hashes.

| Variant | Canonical reference | Important rule |
| --- | --- | --- |
| Persona | [Pah](masters/persona.png) | Blue Unit gem, crimson top-right Persona banner, sword power |
| Unit | [Salendagao](masters/unit-defense-master.png) | Blue gem; also the authoritative defense component reference |
| Force | [Tree Tunung](masters/force.png) | Amber/orange gem; use Salendagao's defense component |
| Sentry | [Panglima Sabir](masters/sentry.png) | Green gem, NO power or sword |
| Action | [A Vow Carried by the Wind](masters/action.png) | Purple gem, no combat statistics |
| Codex | [The Last Refuge](masters/codex.png) | Plain red gem, no book and no numeral |

These are flattened full-card reference PNGs, not editable frame layers or extracted transparent components. Do not mistake this package for a completed reusable rendering template.

## Corrections resolved while saving

- The attached Sentry image still had a sword and 0. Preserve it only in originals/sentry.png. masters/sentry.png is the already-generated corrected version with neither. Sentries have no displayed power, not even 0.
- The old blue Pah attachment was superseded by the user's subsequent red Pah file, ChatGPT Image Oct 8, 2026, 01_01_49 PM.png. Use that latest red Pah as the Persona master. Do not reintroduce blue regional cloth, scattered side script, decorative side diamonds or the large bottom-center ornament.
- Salendagao, not a later approximation of Tree Tunung, owns the defense design. Minor differences between the flattened Force and Unit examples do not authorize two components.
- Codex has a faceted red ruby without a book, notebook, numeral or overlaid type symbol.
- Older output/ concept folders are historical experiments, not the standard.

## Shared visual structure

- Portrait aspect ratio 5:7. All six masters are exactly 1060 x 1484 px. Preserve aspect ratio, corner shape and proportional layout when exporting other sizes.
- Full-art illustration dominates. No opaque rules-text box on the face. Game rules belong in the game's card inspection view.
- Narrow black/charcoal outer structure with beveled gold edging; regional cloth wraps around selected corners and edges. Keep the restrained frame thickness shown in the masters.
- A black title strip with thin layered gold trim runs near the top. It has an angular pointed right end, a small centered gold sun ornament and a round type gem overlapping its left end.
- Title: pale ivory, high-contrast serif/small-cap appearance. Level: large pale serif digit with dark relief shadow inside its gemstone. Preserve readability; do not arbitrarily condense long names.
- Exact font family and numeric color values have NOT been identified from these flattened images. Do not invent a claim that a particular font or hex value is approved. Use the masters as the visual source; lock real tokens when an editable template is built.
- One/two-line gold italic flavor quotation near the bottom, with a thin gold divider and small central flourish. Keep it clear of the subject and bottom frame.
- Bottom strip: small round region seal at left; compact type/subtype label above a gold region label; one continuous Baybayin inscription in the central available black band; power at right only for eligible types.
- Region seal, top type gem and Persona role banner carry different meanings. Do not substitute one for another.
- Keep red region seal artwork from the Mindanao references. Do not invent final Luzon/Visayas emblems from these Mindanao samples.
- No extra decorative gems, random runes, broad stone borders, central oversized star or huge sculpture covering the art.

## Archipelago color versus type color

| Layer | Luzon | Visayas | Mindanao |
| --- | --- | --- | --- |
| Regional cloth/frame accent | Yellow/gold | Blue | Red/crimson |
| Region text | Luzon | Visayas | Mindanao |

This color mapping was explicitly confirmed by the user. The six saved visual masters are Mindanao; Luzon and Visayas still need corresponding visual examples. Retain component geometry when adapting them.

Type-gem colors remain the SAME across all archipelagos:
- Unit and Persona Unit: sapphire blue.
- Force: amber/orange.
- Sentry: emerald green.
- Action: amethyst purple.
- Codex: ruby red, without a number or icon.

Example: a Mindanao Action uses red regional cloth with a purple gem; a Visayas Unit has blue regional accents AND a blue type gem. Defense remains green for both.

## Defense: one component for all Units and Forces with defense

The ONLY design master is masters/unit-defense-master.png (Salendagao).

- Narrow vertical angular tab attached flush to the left card edge.
- Dark emerald background with subtle cloudy/jewel-like shading.
- Same pointed top and bottom geometry, doubled beveled gold rim and thin light highlights as Salendagao.
- Small split/two-tone gold shield near the top, with its central vertical division. Do not replace it with a plain outline shield.
- Pale ivory serif defense number underneath, turned 90 degrees clockwise as ONE line. Do not stack digits.
- Use thousands separators: 5,000; 10,000; 15,000.
- No DEF word, no blue diamond caps, no extra gemstones.
- Same width, height, position, icon, border and typography for every eligible Unit or Force across all regions. Only the numerical value changes.
- Preserve sufficient space for five digits; do not make Force tabs larger or change their shape.
- Examples: Salendagao = 5,000; Tree Tunung = 15,000. Never copy the source card's value while copying its frame.
- Do not add this tab to Sentry, Action or Codex. The approved Pah with zero defense omits the tab.
- Match the actual pixels of Salendagao when building the reusable component. A prompt saying "green shield tab" is insufficient.

## Power

- Unit/Persona Unit and Force: compact red inset plaque with gold angular edging at bottom-right in these Mindanao masters.
- Small gold sword before the value. No POWER word.
- Pale large serif number with comma grouping.
- Sentry, Action and Codex: no power plaque, no sword and no placeholder zero. Extend the black/gold bottom strip through the freed space.
- Read values from reviewed current game data, not from earlier generated pictures. These visual assets do not change game balance.
- Examples: Pah 11,000; Salendagao 9,000; Tree Tunung 3,000. Sabir level 1 with no power display.

## Persona role

- Use the latest red Pah reference.
- Top-right hanging crimson/black banner with narrow gold detail, winged gold emblem and PERSONA beneath it.
- It is a Unit role, so the level gem stays blue.
- Reserve title clearance under/alongside this banner. Never add it to every level-3 card automatically.
- Banner does not replace the region seal, subtype, gem or power.

## Baybayin and labels

Approved Mindanao inscription: ᜋᜒᜈ᜔ᜇᜈᜏ᜔
Code-point sequence: U+170B U+1712 U+1708 U+1714 U+1707 U+1708 U+170F U+1714.

- Five base glyphs: MI (dot above MA), N (cross below NA), DA, NA, W (cross below WA).
- Gold lettering engraved into ONE continuous bottom band. Never split the word with a central emblem.
- No scattered decorative imitation script on side rails.
- Keep the Latin region name as a separate small label.
- Use a font with real Baybayin support when building the final editable template; retain the approved marks precisely.
- Luzon and Visayas inscriptions are not specified by these Mindanao images. Verify their text before making those masters.
- Full current card name goes in the title. Subtype and role labels should use consistent spacing around slashes.
- Existing examples have minor spacing differences (e.g. Maguindanaon/Sentry versus Bird / Maguindanaon). Standardize new labels with spaces: Maguindanaon / Sentry; Bird / Maguindanaon; Divine / Maguindanaon; Divine / Force.
- Do not silently remove Maguindanaon from eligible tribal Unit labels. Confirm subtype content against runtime data when preparing cards.
- Keep Codex and Normal Action labels explicit as shown.

## Layout registration guide

These bounds are approximate observations, NOT measured component masks. The master image remains authoritative. Do not blindly redraw to these estimates.

| Element | Approximate bounds on 1060 x 1484 |
| --- | --- |
| Title bar | x 170–1010, y 50–145; shorten for Persona banner |
| Round gem including gold rays | x 25–220, y 5–225 |
| Salendagao defense tab | x 0–70, y 480–780 |
| Persona banner | x 870–1010, y 0–210 |
| Flavor text/divider | y 1180–1315, varies with line count |
| Bottom strip | y 1300–1435, slightly different in flattened examples |
| Bottom region seal | x 10–150, near bottom strip |
| Power plaque where applicable | x 755–1045, within bottom strip |

Before mass production, create one editable frame template with fixed shared anchors. Reuse the SAME defense, title, gem mount, seal mount and power components, rather than independently generating them on every card. The observed few-pixel differences in examples should not become a new standard per card.

## Production and review rules

1. Start from the correct canonical master and reviewed card metadata. Change artwork/name/value/subtype only as required.
2. Keep illustration and reusable frame/text components separate in future editable sources; generate artwork separately when possible.
3. Preserve these v1 masters. Any later approved design revision becomes v2 with explicit changes, not an overwrite.
4. Compare full-size and board/hand-size readability before accepting new artwork.
5. Check gem color and level; type; Persona eligibility; presence/absence of defense and power; exact stats and comma formatting.
6. Compare defense shape, icon, position, size and orientation to Salendagao; the number alone must vary.
7. Check actual Baybayin letters AND every dot/cross. Generated lettering needs inspection.
8. Check title/flavor spelling, region color, continuous bottom inscription, small seal and lack of unwanted ornaments.
9. A card failing these rules is a draft, even if attractive.
10. These are design source references. Runtime asset replacement, optimization, deployment and push are separate work and were not performed when saving this package.

## Visual references

The master and original PNGs are local-only design references, intentionally excluded from Git and production. The paths below work in the original design workspace; a fresh clone needs the approved reference package supplied separately before artwork work. `manifest.json` records their checksums and provenance. Only the framed card assets used by the game are published.

### Persona
![Persona master](masters/persona.png)

### Unit and defense master
![Unit and defense master](masters/unit-defense-master.png)

### Force
![Force reference; defense geometry inherits Salendagao](masters/force.png)

### Sentry
![Sentry without power](masters/sentry.png)

### Action
![Action master](masters/action.png)

### Codex
![Codex with plain ruby](masters/codex.png)
