/**
 * The game's terms of art, in one place.
 *
 * Card text already highlighted these words — Offer in orange-red, Sipol in
 * yellow-green — but a highlight only says "this word is load-bearing", never
 * what it bears. What existed instead was a reminder paragraph appended to the
 * bottom of a card's text for three of the mechanics, which meant the
 * explanation was somewhere else on the card from the word, took space on
 * every card that used it, and did not exist at all for the other nine.
 *
 * Definitions are checked against the engine, not against the rules PDF:
 * `docs/game-rules.md` still carries a glossary listing Knight, Concert, Oni
 * and the other archetypes that were deleted, so it is a historical document
 * on this subject and not a source.
 */

export interface Keyword {
  /** What the tooltip is headed with — the canonical spelling. */
  term: string;
  /** Every form that appears in card text or the log, including the term. */
  forms: string[];
  /** The colour class card text already uses for this word, if any. */
  cls?: string;
  text: string;
}

/**
 * Longest forms are matched first (see `keywordPattern`), so "Last Oath" wins
 * over "Oath".
 */
export const KEYWORDS: Keyword[] = [
  {"term":"Persona","forms":["Personas","Persona"],"text":"Your central Unit and the character you fight as. Allies support it. Attacks against your Persona threaten your Barriers; a hit with no Barriers remaining loses the duel."},
  {"term":"Ally","forms":["Allies","Ally"],"text":"A Unit in one of the four Ally Zones beside your Persona. It can attack, support or use its skills when the rules allow."},
  {"term":"Heart","forms":["Heart"],"text":"The zone holding your previous Personas and cards placed there by Sanib. Cards here can pay Kalas costs or meet State conditions."},
  {"term":"Plays","forms":["plays","play"],"text":"Your turn’s allowance for normal calls, Action cards and manual Codex switches. Each costs 1 Play. Special calls, skills and automatic Codex switches do not spend a Play. Other printed costs still apply."},
  {"term":"State","forms":["State"],"text":"A condition supplied by your active Codex, such as Garahana or Andukha. Released means its requirement is currently met; skills bearing that State may then become available."},
  {"term":"Normal call","forms":["Normal call","normal calling"],"text":"Place an eligible Unit from your hand in an Ally Zone during your Main Phase. This spends one play. The card must meet your current calling requirements."},
  {"term":"Codex","forms":["Codex"],"text":"A card in your Codex zone that provides skills and a State condition while active. Manually switching during your Main Phase costs 1 Play. Automatic switches at their printed triggers are free."},
  {"term":"Charge","forms":["Charged","Charge","Charges","Charging"],"text":"An upright Unit is charged and can attack if otherwise eligible. Charging turns an exhausted Unit upright again."},
  {"term":"Chain","forms":["Chain","Chains"],"text":"Effects waiting to resolve. After an activation, the opponent may respond. Declining closes the response window; the newest link resolves first. No new responses are inserted during resolution."},
  {"term":"Support","forms":["Support","Supporters"],"text":"An eligible adjacent Ally can add its Power to an attack. It exhausts as support and gives up its own attack while exhausted."},
  {
    term: 'Offer',
    forms: ['Offered', 'Offer', 'Offers', 'Offering'],
    cls: 'text-offer',
    text: 'Send one of your own Allies from the field to the Grave to pay for '
      + 'a skill. It is a cost, so the unit is gone whether or not the skill '
      + 'achieves anything.',
  },
  {
    term: 'Last Oath',
    forms: ['Last Oath'],
    cls: 'text-offer',
    text: 'A skill that fires when this unit is Offered — the unit pays for '
      + 'something else and does one last thing on its way out.',
  },
  {
    term: 'Sipol',
    forms: ['Sipol'],
    cls: 'text-sipol',
    text: 'Reveal the top card of your deck. If it is a Unit, special call it '
      + 'to an Ally Zone; anything else goes to the bottom of the deck.',
  },
  {
    term: 'Sumipat',
    forms: ['Sumipat'],
    cls: 'text-sipol',
    text: 'Look at cards from the top of your deck one at a time. For each, keep it on top or put it on the bottom. Sumipat 3 lets you inspect up to three different cards; a card you keep is not shown again. This does not call a Unit.',
  },
  {
    term: 'Special call',
    forms: ['special called', 'special call', 'special calls', 'specially called', 'special calling'],
    text: 'Place a Unit in an Ally Zone using an effect, from the zone that effect allows, including your hand. It does not spend a play. Follow the effect’s placement restrictions.',
  },
  {
    term: 'Personify',
    forms: ['Personify', 'Personifying', 'Personified', 'Personification'],
    text: "Replace your Persona with an eligible Unit when the Personify choice appears at the start of your turn. The old Persona normally goes to Heart. Effects may change where you can Personify from.",
  },
  {
    term: 'Sanib',
    forms: ['Sanib'],
    cls: 'text-andukha',
    text: 'Put a card into your Heart. What is in your Heart is what feeds '
      + 'Andukha and what Kalas spends.',
  },
  {
    term: 'Kalas',
    forms: ['Kalas'],
    cls: 'text-vent',
    text: 'Send cards out of your Heart to pay for a skill. Kaluluwa tokens '
      + 'cease to exist when used for Kalas; every other card goes to your Grave.',
  },
  {
    term: 'Kaluluwa',
    forms: ['Kaluluwa'],
    cls: 'text-andukha',
    text: "A Spirit token created by effects. In Heart it can help meet a State condition and pay a Kalas cost. Tokens disappear when they leave play rather than becoming ordinary cards in the Grave.",
  },
  {
    term: 'Andukha',
    forms: ['Andukha'],
    cls: 'text-andukha',
    text: "Babaylan’s State. With a matching active Codex, it is released while your Heart meets the required count of 6. It locks again if the condition is lost. Cards may require a higher count for a particular skill.",
  },
  {
    term: 'Garahana',
    forms: ['Garahana'],
    cls: 'text-garahana',
    text: "Maguindanao’s State. With a matching active Codex, it is released while your Grave counts as at least 5 Maguindanao Unit cards. Alad counts as two. It locks again if the condition is lost.",
  },
  {
    term: 'Bayanihan',
    forms: ['Bayanihan'],
    cls: 'text-sipol',
    text: "Agta’s State. With a matching active Codex, it is released while all four Ally Zones contain Luzon Arch Units. It locks again when this condition is lost.",
  },
  {
    term: 'Foresight',
    forms: ['Foresight'],
    text: 'Look at that many cards from the top of your deck, then put them '
      + 'back on the top or the bottom in any order you like.',
  },
  {
    term: 'Check',
    forms: ['Barrier check', 'Attack check', 'check'],
    text: "An attack check reveals the top card of your deck when your Persona attacks. A Barrier check reveals a broken Barrier. A revealed Force uses its check effect. The checked card normally goes to its owner’s hand.",
  },
  {
    term: 'Force',
    forms: ['Force'],
    text: "A level 0 card. You can normal call it as a Unit, or use its hand response when its stated condition happens, on either turn. Pay its listed cost. Revealing it on a check uses its check effect, not its hand response.",
  },
  {
    term: 'Sentry',
    forms: ['Sentry'],
    text: 'Nullifies an attack against your Persona. Exile the Sentry face down '
      + 'unless the card says otherwise. No Barrier breaks. Three per deck.',
  },
  {
    term: 'Rally',
    forms: ['Rally', 'Rallied', 'Rallying'],
    text: "Return the cards named by the effect to the bottom of their owner’s deck. Rallying from the field uses Allies, not Personas. The effect tells you which cards, how many and who chooses.",
  },
  {
    term: 'Barrier',
    forms: ['Barriers', 'Barrier', 'Shields', 'Shield'],
    text: "A shield protecting your Persona. A hit can break a Barrier and reveal its card for a check. Breaking the last Barrier does not win by itself: land another hit on the unprotected Persona to win.",
  },
  {
    term: 'Exhaust',
    forms: ['Exhausted', 'Exhaust', 'Exhausts', 'Exhausting'],
    text: 'Turned sideways — a unit that has acted. It charges back upright at '
      + "the start of its controller's next turn.",
  },
  { term: 'Unit', forms: ['Unit', 'Units'], text: 'A fighter card. Your Persona and Allies are Units on the field. An effect that says Ally excludes the Persona; an effect that says Unit may include it if its other conditions allow.' },
  { term: 'Action', forms: ['Action', 'Actions', 'Normal Action'], text: 'A card played from your hand during your Main Phase. It spends one play, applies its effect and normally goes to the Grave. Pay any other cost printed on it.' },
  { term: 'Hand', forms: ['Hand'], text: 'The cards you hold, normally hidden from your opponent. You can use a card from here only when its timing, costs and other requirements allow.' },
  { term: 'Deck', forms: ['Deck', 'Decks'], text: 'Your face-down draw pile. Draw from its top. Effects can inspect, reveal, search or move cards here; follow the order specified by the effect.' },
  { term: 'Grave', forms: ['Grave', 'Graveyard'], text: 'The face-up pile for discarded, Offered and destroyed cards. A card here can activate only an effect that permits activation from the Grave.' },
  { term: 'Exile', forms: ['Exile', 'Exiled'], text: 'A zone separate from the field, Heart and Grave. An effect determines whether an exiled card is face up or face down. It returns only if another rule or effect allows it.' },
  { term: 'Field', forms: ['Field'], text: 'Your Persona and four Ally Zones. A card in your Hand, Heart, Grave or Exile is not a Unit on the field.' },
  { term: 'Power', forms: ['Power', 'Current Power'], text: 'A Unit’s attack strength, including active increases and reductions. Attacks use the current value, plus eligible support. A temporary increase lasts only for its stated duration.' },
  { term: 'Defense', forms: ['Defense'], text: 'The amount a card contributes when used to defend from your hand. Attack Power must meet or exceed the target’s Power plus its defense to hit. Defense cards normally go to the Grave after battle.' },
  { term: 'Level', forms: ['Level', 'Levels'], text: 'The number used for calling, Personifying and effect restrictions. Follow the level limit shown by the game or printed in the effect; Level is separate from Power.' },
  { term: 'Discard', forms: ['Discard', 'Discarded', 'Discarding'], text: 'Send a card from your hand to the Grave. If discarding pays a cost, that card remains spent even if the activation is negated.' },
  { term: 'Cost', forms: ['Cost', 'Costs'], text: 'What you must pay to activate a card or skill. Pay before the response window opens. A paid cost is not refunded if that activation is negated or its effect cannot finish.' },
  { term: 'Draw', forms: ['Draw', 'Draws', 'Drawing'], text: 'Move the top card of your deck to your hand. Draw 2 means take two cards from the top, in order.' },
  { term: 'Reveal', forms: ['Reveal', 'Revealed', 'Reveals', 'Revealing'], text: 'Show the specified card as instructed by the effect. Revealing alone does not move it to a new zone; follow the rest of the effect to see where it goes.' },
  { term: 'Bottom', forms: ['Bottom', 'Bottomed'], text: 'Put the specified cards underneath the other cards in their owner’s deck. For a numbered bottom-deck choice, the last number goes at the very bottom.' },
  { term: 'Shuffle', forms: ['Shuffle', 'Shuffled'], text: 'Randomize the order of the indicated deck or group of cards. Do this only when the effect instructs it; returning cards in a chosen order does not shuffle them.' },
  { term: 'Destroy', forms: ['Destroy', 'Destroyed', 'Destroys'], text: 'Remove an affected Ally from the field and send it to the Grave, unless a rule changes its destination. Destruction by battle or effect is different from paying an Offer cost.' },
  { term: 'Negate', forms: ['Negate', 'Negated', 'Negates'], text: 'Stop the specified activation or effect. A negated chain link does not apply its effect when resolved. Costs already paid are not returned; negation alone does not destroy its source card.' },
  { term: 'Auto-switch', forms: ['Auto-switch'], text: 'An optional Codex switch offered when that Codex’s printed condition happens. Accepting it changes your active Codex for free; it does not spend a play.' },
  { term: '1/Turn', forms: ['1/Turn', 'Once per turn', 'Once-per-turn'], text: 'This skill can be used once during a turn. Paying for an activation uses the limit even if it is later negated. Other skills on the card keep their own stated limits.' },
  { term: 'Main Phase', forms: ['Main Phase', 'Main-phase'], text: 'The part of your turn for normal calls, Actions, manual Codex switches and skills that allow this timing. Other printed conditions and costs still apply.' },
  { term: 'Battle Phase', forms: ['Battle Phase'], text: 'The part of your turn when eligible charged Units can attack. Support, responses, defense and checks happen as each attack is handled.' },
  { term: 'End of turn', forms: ['End of turn', 'End of the turn'], text: 'The end of the current turn. An effect lasting until this point expires here; an effect scheduled for this point is handled during end-of-turn processing.' },
  { term: 'Released', forms: ['Released'], text: 'The active Codex’s State requirement is currently met. Skills requiring that State may be used if their other conditions are also met. The State locks again when its requirement is lost.' },
  { term: 'Triggered effect', forms: ['Triggered effect'], text: 'A skill that becomes eligible when its stated event happens. Check its zone, conditions and usage limit. If several effects are waiting, the game lets the controlling player choose the next one.' },
  { term: 'Continuous effect', forms: ['Continuous effect'], text: 'An effect that applies while its conditions remain true. It does not need a new activation each time the game updates its value.' },
  { term: 'Beast', forms: ['Beast', 'Beasts'], text: 'A card subtype used by effects that specifically name Beasts. A Beast may also have an archipelago or tribe affiliation, so check all of its listed types.' },
  { term: 'Bird', forms: ['Bird', 'Birds'], text: 'A card subtype used by effects that specifically name Birds. A Bird may also have an archipelago or tribe affiliation, so check all of its listed types.' },
  { term: 'Divine', forms: ['Divine'], text: 'A card subtype. Effects that ask for a Divine Unit require this type as well as their other conditions, such as Level or the zone the card is in.' },
  { term: 'Spirit', forms: ['Spirit', 'Spirits'], text: 'A card subtype. Kaluluwa are Spirit tokens, but the Spirit label alone does not mean every card with this type is a token.' },
  { term: 'Human', forms: ['Human', 'Humans'], text: 'A card subtype. This label matters when an effect asks for that type; it does not give the card an extra skill by itself.' },
  { term: 'Fish', forms: ['Fish'], text: 'A card subtype. This label matters when an effect asks for that type; it does not give the card an extra skill by itself.' },
  { term: 'Maguindanao', forms: ['Maguindanao', 'Maguindanaon'], text: 'A card affiliation used by Maguindanao effects and Garahana. Beast, Bird and other types can coexist with this affiliation; check the card’s listed types.' },
  { term: 'Agta', forms: ['Agta'], text: 'A card affiliation in the Luzon collection. Agta cards use deck-calling skills and Bayanihan. Follow the exact affiliation or subtype named by each effect.' },
  { term: 'Babaylan', forms: ['Babaylan'], text: 'A card affiliation in the Visayas collection. Babaylan cards use Heart, Sanib, Kalas and Andukha. Follow the exact affiliation or subtype named by each effect.' },
  ...['Luzon', 'Visayas', 'Mindanao'].map(region => ({ term: `${region} Arch`, forms: [`${region} Arch`],
    text: `A card affiliation for the ${region} archipelago. Effects requiring this affiliation check the card’s listed types; another creature type can appear alongside it.` })),
];

/** Keyed by canonical term, for the log and for prompts. */
export const KEYWORD_BY_TERM: Record<string, Keyword> = Object.fromEntries(
  KEYWORDS.map((k) => [k.term, k]),
);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Which keyword a matched form belongs to. Built once, matched lower-case. */
const BY_FORM = new Map<string, Keyword>();
for (const k of KEYWORDS) {
  for (const form of k.forms) BY_FORM.set(form.toLowerCase(), k);
}

export function keywordFor(form: string): Keyword | undefined {
  return BY_FORM.get(form.toLowerCase());
}

/**
 * One alternation of every form, longest first.
 *
 * Longest-first is what makes "Last Oath" beat "Oath" and "Barrier check"
 * beat both "Barrier" and "check": JavaScript's alternation is first-match,
 * not longest-match, so the order of this list is the disambiguation rule.
 */
export const KEYWORD_PATTERN: string = [...BY_FORM.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRe)
  .join('|');

// --------------------------------------------------------------- card text

export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

/** Colour map for ability-type markers in card text. */
const TEXT_BADGE_COLORS: Record<string, string> = {
  blue: '#3498db',
  green: '#27ae60',
  yellow: '#f1c40f',
  red: '#e74c3c',
  pink: '#e91e8c',
};

/**
 * A keyword, coloured as it always was and now able to say what it means.
 *
 * The word keeps whatever form the card printed; the tooltip is headed with
 * the canonical term, so "Offered" on a card is explained under "Offer".
 */
export function keywordSpan(word: string, roleSymbols = false, statSymbol?: string): string {
  const kw = keywordFor(word);
  if (!kw) return word;
  if (roleSymbols && (kw.term === 'Ally' || kw.term === 'Persona')) {
    // Keep authored wording in the DOM for copying, accessible names and the
    // inspector's scope-ribbon extraction. Never replace engine/card records.
    return `<span class="kw kw-role kw-role-${kw.term.toLowerCase()}" data-tip-place="block" role="button" tabindex="0"`
      + ` aria-label="${word}" data-tip-title="${kw.term}"`
      + ` data-tip="${kw.term === 'Ally' ? 'A = Ally (Allies). ' : 'P = Persona. '}${escapeHtml(kw.text).replace(/"/g, '&quot;')}">`
      + `<span class="role-symbol-name">${word}</span></span>`;
  }
  const cls = statSymbol ? `kw-stat kw-stat-${statSymbol}` : kw.cls ?? '';
  return `<span class="kw ${cls}" data-tip-place="block" role="button" tabindex="0"`
    + ` data-tip-title="${escapeHtml(kw.term)}"`
    + ` data-tip="${escapeHtml(kw.text).replace(/"/g, '&quot;')}">${word}</span>`;
}

/** Supplemental stat art never replaces the authored keyword or its help. */
function skillStatSymbol(word: string, escaped: string, offset: number): string | undefined {
  const term = keywordFor(word)?.term;
  if (term === 'Power' || term === 'Defense' || term === 'Barrier') return term.toLowerCase();
  if (term !== 'Plays') return undefined;

  // "Play" is also a verb and a location ("in play"). Only numeric allowance
  // wording opts in. A nearby number alone is insufficient: "Player 1 plays".
  const before = escaped.slice(0, offset);
  const after = escaped.slice(offset + word.length);
  const quantity = '[+-]?\\d+\\s+(?:(?:extra|additional)\\s+)?';
  if (!new RegExp(`(?:^|[^\\w])${quantity}$`, 'i').test(before)) return undefined;
  if (/^\s+(?:a|an|the|that|these|those|it|them|with|only)\b/i.test(after)
    || /^\s+this\b(?!\s+turn\b)/i.test(after)) return undefined;
  const allowance = new RegExp(
    `(?:\\b(?:costs?|spend|spends|spent|pay|pays|paid|use|uses|used|gain|gains|gained|get|gets|lose|loses|lost|have|has|grant|grants|granted|receive|receives|received)\\s+(?:(?:up to|at least|at most|exactly)\\s+)?|\\bcost:\\s*)${quantity}$`,
    'i',
  );
  const standalone = new RegExp(`(?:^|[\\[(])\\s*${quantity}$`, 'i').test(before)
    && /^(?:\s*$|[.,;:)\]]|\s+(?:(?:this|next)\s+turn|remaining|available|left)\b)/i.test(after);
  return allowance.test(before) || standalone || /^\s+(?:remaining|available|left)\b/i.test(after)
    ? 'plays' : undefined;
}

/**
 * Format card text for HTML display.
 *
 * One pass, not a chain of `.replace` calls. The old version ran a dozen of
 * them in sequence over a string that already held the HTML the earlier ones
 * had inserted, which works only for as long as no replacement emits a word a
 * later replacement looks for. Keyword definitions broke that immediately: the
 * tooltip for Kalas contains the word "Kaluluwa", and the Kaluluwa pass would
 * have found it inside the attribute and nested a span in it. Matching
 * everything in a single alternation means no output is ever re-scanned.
 */
export function formatCardText(s: string, { roleSymbols = false, statSymbols = false }: { roleSymbols?: boolean; statSymbols?: boolean } = {}): string {
  // State affiliation supplements the timing square; it never replaces it.
  // Derive this at display time so ability identity and per-turn usage stay stable.
  s = s.split('\n').map(line => line.split(/(?=\[(?:blue|green|yellow|pink)\])/i).map(skill => {
    if (!/\b(?:Andukha|Garahana|Bayanihan)\b/i.test(skill) || /\[red\]/i.test(skill)) return skill;
    return /^\[(?:blue|green|yellow|pink)\]/i.test(skill)
      ? skill.replace(/^(\[(?:blue|green|yellow|pink)\])/i, '$1[red]')
      : `[red]${skill}`;
  }).join('')).join('\n');
  // Every alternative contributes exactly one capture group, in this order.
  // A nested group silently shifts the replacer's arguments along by one and
  // hands the wrong branch the wrong string.
  const badge = /(\[(?:blue|green|yellow|red|pink)\])/.source;
  const closer = /(\[\/(?:blue|green|yellow|red|pink)\])/.source;
  const cost = /(\[Cost:[^\]]*\])/.source;
  const foresight = /(Foresight N - Look at the top N cards of your deck, then place them on the top or bottom of your deck in any order\.)/.source;
  const re = new RegExp(
    `${badge}|${closer}|${cost}|${foresight}|\\b(${KEYWORD_PATTERN})\\b`,
    'gi',
  );

  const escaped = escapeHtml(s);
  return escaped.replace(re, (_m, badgeTag, closerTag, costText, fore, keyword, offset: number) => {
    if (badgeTag !== undefined) {
      const hex = TEXT_BADGE_COLORS[badgeTag.slice(1, -1).toLowerCase()] ?? '#888';
      return `<span class="text-badge" style="background:${hex}"></span>`;
    }
    if (closerTag !== undefined) return '';
    // Costs get their own keyword pass. The bracket is matched whole, so
    // anything inside it is invisible to the outer alternation — and
    // "[Cost: Offer 1 of your units]" is the single most common place a
    // player meets the word Offer. Marking the inner text here is safe
    // because this output is returned, never re-scanned.
    if (costText !== undefined) {
      return `<span class="text-cost">${markEscaped(costText, roleSymbols, statSymbols)}</span>`;
    }
    if (fore !== undefined) return `<span class="text-reminder">${fore}</span>`;
    return keywordSpan(keyword, roleSymbols, statSymbols ? skillStatSymbol(keyword, escaped, offset) : undefined);
  }).replace(/\n/g, '<br>');
}

/** Opt in only for skill copy; lessons, logs and instructions keep full words. */
export function formatSkillText(text: string): string {
  return formatCardText(text, { roleSymbols: true, statSymbols: true });
}

/** Keyword marking over text that is already HTML-escaped. */
function markEscaped(escaped: string, roleSymbols = false, statSymbols = false): string {
  const re = new RegExp(`\\b(${KEYWORD_PATTERN})\\b`, 'gi');
  return escaped.replace(re, (m, _keyword, offset: number) =>
    keywordSpan(m, roleSymbols, statSymbols ? skillStatSymbol(m, escaped, offset) : undefined));
}

/** Plain-language key appears once per card reader, outside its skill text. */
export function roleSymbolKey(text: string): string {
  const roles = [
    { term: 'Ally', match: /\b(?:Ally|Allies)\b/i },
    { term: 'Persona', match: /\bPersonas?\b/i },
  ].filter(role => role.match.test(text));
  if (!roles.length) return '';
  return `<div class="role-symbol-key" aria-label="Skill symbols">${roles.map(({ term }) =>
    `<span><i class="role-key-icon kw-role-${term.toLowerCase()}" aria-hidden="true"></i>${term}</span>`
  ).join('')}</div>`;
}

/** The same keyword marking, for text that is not card text — log lines. */
export function markKeywords(plain: string): string {
  return markEscaped(escapeHtml(plain));
}
