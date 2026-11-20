import { FORCE_RESPONSE_PATCH } from './patch-1-15.js';
import { SUBMISSION_READABILITY_PATCH } from './patch-1-16.js';
import { EFFECT_CLARITY_PATCH } from './patch-1-17.js';
import { QUALITY_AUDIT_PATCH } from './patch-1-18.js';
import { ANIME_ART_PATCH } from './patch-1-19.js';
import { MANUAL_CODEX_PLAY_PATCH } from './patch-1-20.js';
/**
 * The Dev Log's data, and the only place the game's version is written down.
 *
 * A version is a SET, not a release: Version 1 is Set 1, the three
 * archipelagos. Patches are the work done inside a set — 1.1, 1.2 — and a new
 * set starts Version 2. That binding is the point. It means the changelog
 * cannot describe a shape the game does not have, and it is checked by
 * patches.test.ts rather than trusted.
 *
 * Nothing here is generated. Card changes could be derived by diffing
 * cards.json between two git refs, and probably should be one day so a
 * balance change can never go unrecorded — but the reason for a change is not
 * in the diff, and a patch note without the reason is just a list of numbers.
 *
 * Only patches from 1.1 onward are recorded. The set's first 48 commits were
 * made before there was anywhere to write them down, and reconstructing them
 * into player-facing prose after the fact would produce something honest-
 * looking and unreliable. 1.0 says what the set IS instead, which is the part
 * of that history a player actually needs.
 */

import { SKILL_UPDATE_PATCH } from './patch-1-4.js';
import { DUEL_FLOW_PATCH } from './patch-1-5.js';
import { FRIENDS_AND_LEARNING_PATCH } from './patch-1-6.js';
import { ENERGY_FREE_CHAINS_PATCH } from './patch-1-7.js';
import { WHOLE_GAME_POLISH_PATCH } from './patch-1-8.js';
import { TUTORIAL_JOURNEY_PATCH } from './patch-1-9.js';
import { MOTION_POLISH_PATCH } from './patch-1-10.js';
import { ILLANA_OFFER_PATCH } from './patch-1-12.js';
import { DUEL_CLARITY_PATCH } from './patch-1-13.js';
import { CODEX_PLAY_PATCH } from './patch-1-14.js';
import { CONTEST_POLISH_PATCH } from './patch-1-11.js';

/** A card that changed, named by id so the page can draw its art. */
export interface CardChange {
  /** Card id as it appears in cards.json, e.g. 'maguindanao/…'. */
  id: string;
  /** What changed, in the player's terms. */
  note: string;
  /**
   * The same thing as several bullets, when one sentence will not do it.
   *
   * Optional and additive rather than replacing `note`: a card that changed
   * in three ways reads as three lines, and one that changed in one way
   * should not have to be written as a list of one. When both are present
   * this wins; `note` stays the single-line form and the title attribute.
   */
  notes?: string[];
  /** Short badge: '-2000', '+2000', 'Skill'. */
  delta?: string;
}

/** A rules, engine or interface change — anything that is not a card. */
export interface SystemChange {
  title: string;
  note: string;
  /** As `CardChange.notes`: the long form, when one paragraph is not enough. */
  notes?: string[];
}

/** The three archipelagos, as the map art in assets/ui/ names them. */
export type Region = 'luzon' | 'visayas' | 'mindanao';

export interface Patch {
  /** '1.1'. Must start with its set's version number. */
  id: string;
  title: string;
  /** Month and year. Null for a set's launch entry, which has no one date. */
  date: string | null;
  /**
   * Which archipelagos this patch touched.
   *
   * Drawn as silhouettes behind the poster. Each map already carries its own
   * colour — Luzon gold, the Visayas green, Mindanao red — so the background
   * says who the patch was about rather than just filling space, and a player
   * can tell at a glance whether it concerns the deck they play.
   */
  regions?: Region[];
  /** Shown above the sections. The launch entry is mostly this. */
  summary?: string;
  nerfs: CardChange[];
  buffs: CardChange[];
  adjusted: CardChange[];
  systems: SystemChange[];
  /** Card ids introduced by this patch, drawn as art. */
  newCards: string[];
}

export interface SetVersion {
  /** 1, 2, … — the set number. */
  version: number;
  /** What the set is called, so the header says more than a digit. */
  name: string;
  /** Newest first; the launch entry is last. */
  patches: Patch[];
}

export const VERSIONS: SetVersion[] = [
  {
    version: 1,
    name: 'Three Archipelagos',
    patches: [
      MANUAL_CODEX_PLAY_PATCH,
      ANIME_ART_PATCH,
      QUALITY_AUDIT_PATCH,
      EFFECT_CLARITY_PATCH,
      SUBMISSION_READABILITY_PATCH,
      FORCE_RESPONSE_PATCH,
      CODEX_PLAY_PATCH,
      DUEL_CLARITY_PATCH,
      ILLANA_OFFER_PATCH,
      CONTEST_POLISH_PATCH,
      MOTION_POLISH_PATCH,
      TUTORIAL_JOURNEY_PATCH,
      WHOLE_GAME_POLISH_PATCH,
      ENERGY_FREE_CHAINS_PATCH,
      FRIENDS_AND_LEARNING_PATCH,
      DUEL_FLOW_PATCH,
      SKILL_UPDATE_PATCH,
      {
        id: '1.3',
        title: 'The board stops talking over itself',
        date: 'September 2026',
        summary:
          'No card changed. The duel used to describe itself in four places at '
          + 'once — a banner, a status line, a running combat sum, and the '
          + 'match log — and three of them said what the board was already '
          + 'showing. They are gone. What replaces them is the part none of '
          + 'them did: you can set how fast the game moves, and you can go '
          + 'back and read what happened.',
        nerfs: [],
        buffs: [],
        adjusted: [],
        systems: [
          {
            title: 'Four narrators became one',
            note: 'The action banner, the Now / Next line and the combat '
              + 'calculator have been removed. The match log stays.',
            notes: [
              'The banner narrated every event. It also fell behind: over six '
              + 'turns the game produced 283 events, 111 of them routine card '
              + 'movements, which came to roughly 24 seconds of narration '
              + 'against a turn that resolves in under one. It ended up '
              + 'describing your Main Phase while you were already in Battle.',
              'Routine movements are now recorded but never performed. A '
              + 'Barrier break, a Force, a Personification, a Codex switch, a '
              + 'released State and the end of the duel still get their moment.',
              'The Now / Next line said whose move it was. The turn button '
              + 'already reads GO TO BATTLE or WAITING, the tab names the '
              + 'phase, and the light says who has priority.',
              'The combat calculator added the attack up. Both stat panels '
              + 'carry every number in that sum, and the defense prompt — '
              + 'where you actually make the decision — still shows the '
              + 'running total, in red until the attack is stopped.',
            ],
          },
          {
            title: 'Duel pace is a setting now',
            note: 'Learning, Standard or Fast, in Duel Settings. It applies '
              + 'immediately and is remembered.',
            notes: [
              'Learning holds important moments until you dismiss them. '
              + 'Standard lets results sit for a beat. Fast shortens the '
              + 'animations without skipping anything — every decision and '
              + 'every result still appears.',
              'Click an empty part of the board to finish the animation on '
              + 'screen. It never answers a decision for you, and never drops '
              + 'a moment Learning pace asked you to acknowledge.',
              'A system-wide reduced-motion setting is honoured on its own, so '
              + 'you can have short animations at Learning pace.',
            ],
          },
          {
            title: 'Go back and read what happened',
            note: 'Two buttons on the rail: Last reopens the most recent '
              + 'action, History opens the whole duel.',
            notes: [
              'Last shows one action broken into its parts — what paid for it, '
              + 'what it targeted, what it did — with the cards drawn beside '
              + 'each line.',
              'History lists every turn of the duel, most recent first, '
              + 'grouped by turn and phase.',
              'Both show only what you are entitled to see. A card that moved '
              + 'face down is a card that moved face down, never its name.',
            ],
          },
          {
            title: 'The tutorial is twenty-three lessons',
            note: 'Eleven on the rules, then four for each of the three decks.',
            notes: [
              'Basics runs from the field and the phases through '
              + 'Personification, Codex and States, skills and costs, and '
              + 'where cards go, ending on a full guided duel and one you play '
              + 'to objectives with no instructions.',
              'Each deck then gets its own track: Bayanihan for the Agta, the '
              + 'Heart and Kalas for the Babaylan, Offer and Last Oath for the '
              + 'Maguindanao. Each ends in a challenge — an incomplete board '
              + 'and a list of objectives.',
              'Every lesson loads the same prepared board every time, so a '
              + 'position a lesson describes is the position you get.',
              'A lesson that builds on another says so and lets you start it '
              + 'anyway.',
            ],
          },
          {
            title: 'The board holds still',
            note: 'The board no longer jumps when the opponent draws.',
            notes: [
              'The row of face-down cards on the far side took its height from '
              + 'the cards in it, so an empty hand was zero pixels tall and '
              + 'the first draw pushed both mats down. It now keeps its '
              + 'height at every screen size.',
              'The rail of duel buttons no longer runs into the MAIN PHASE tab '
              + 'on a short window.',
            ],
          },
          {
            title: 'The Dev Log is a document',
            note: 'Patches read top to bottom instead of one poster at a time, '
              + 'and the cards in them can be read.',
            notes: [
              'A patch opens as a page you read top to bottom, systems '
              + 'first, then the cards. The picker in the corner moves '
              + 'between patches without going back to the list.',
              'Right-click any card in a patch note to read it full size, the '
              + 'same as anywhere else in the game.',
            ],
          },
        ],
        newCards: [],
      },
      {
        id: '1.2',
        title: 'Set 1 arrives, and the first printings retire',
        date: 'September 2026',
        regions: ['luzon', 'visayas', 'mindanao'],
        summary:
          'The three archipelagos were built from a starting pool while the '
          + 'set was being written. That set is finished, so the pool it stood '
          + 'in for is gone: 142 cards now carry the Set 1 tag, and the 117 '
          + 'earlier printings have left deck building. Nothing you have saved '
          + 'is lost — every retired card still loads, so an old duel still '
          + 'opens and still plays.',
        nerfs: [],
        buffs: [],
        adjusted: [
          {
            id: 'agta/sierra-watchkeeper-banoy',
            note: 'Kept as printed, and now carries the Set 1 tag.',
            delta: 'Kept',
          },
          {
            id: 'babaylan/warden-of-the-twelfth-tide-bituon',
            note: 'Kept as printed, and now carries the Set 1 tag.',
            delta: 'Kept',
          },
          {
            id: 'maguindanao/kuta-wato-oath-shield-panglima-sabir',
            note: 'Kept as printed, and now carries the Set 1 tag.',
            delta: 'Kept',
          },
        ],
        systems: [
          {
            title: 'Every deck is a Set 1 deck',
            note: 'Deck building now offers only cards with the Set 1 tag.',
            notes: [
              'Luzon has 43, the Visayas 47 and Mindanao 52 — 142 in all.',
              'The three built-in decks were rebuilt from the new pool.',
              'The 117 earlier printings are no longer selectable. They are '
              + 'still loaded, so a saved duel that uses them opens and plays '
              + 'exactly as it did.',
              'Library tiles, deck tiles and the card viewer all show the tag, '
              + 'so which set a card belongs to is never a guess.',
            ],
          },
          {
            title: 'Three Sentries carried over',
            note: 'Banoy, Bituon and Panglima Sabir keep their printed effects '
              + 'and join Set 1 rather than being replaced.',
          },
          {
            title: 'An Offer is paid before a Last Oath pays out',
            note: 'The order was the other way round, which let a unit fund its '
              + 'own Offer with the reward for being Offered.',
          },
          {
            title: 'A per-turn limit follows the card, not the field',
            note: 'Leaving the field and coming back used to hand a card its '
              + 'once-per-turn ability again.',
            notes: [
              'Leaving the field and coming back used to hand a card its '
              + 'once-per-turn ability again.',
              'A temporary call now tracks each separate arrival, so an earlier '
              + 'expiry cannot remove a later one.',
              'Seven Heads grants at most one removal after battle per turn.',
            ],
          },
          {
            title: 'A special call needs somewhere to land',
            note: 'Calling a unit with every Ally Zone full no longer quietly '
              + 'does nothing after paying for it.',
          },
          {
            title: 'Kalas pays for the whole batch first',
            note: 'Every card in a Kalas payment leaves before any reward '
              + 'resolves, so a card cannot be spent and counted twice.',
            notes: [
              'Every card in a Kalas payment leaves before any reward resolves, '
              + 'so a card cannot be spent and counted twice.',
              'Tokens count as one payment each.',
              'Andukha recalculates after the Heart changes, and covers the new '
              + 'Babaylan subtypes.',
              'Returning a card from the Grave re-evaluates Garahana.',
            ],
          },
        ],
        newCards: [
          'agta/set-1/fifth-sky-tyrant-kalimangalnuk',

          'agta/set-1/kalimangalnuk-s-final-defeat',

          'agta/set-1/life-breath-mother-nanolay',

          'agta/set-1/taguwasi-tears-open-heaven',

          'agta/set-1/talimanog-falls-as-the-gate-breaks',

          'agta/set-1/the-wedding-becomes-a-battlefield',

          'agta/set-1/wind-heart-rescuer-taguwasi',

          'agta/set-1/alig-restores-her-brothers',

          'agta/set-1/fallen-sky-challenger-talimanog',

          'agta/set-1/golden-threshold-warden-nagdombilan',

          'agta/set-1/innawagan-s-abduction',

          'agta/set-1/maiden-taking-raptor-ammalabukkaw',

          'agta/set-1/months-of-battle-warrior-ammani',

          'agta/set-1/relentless-third-brother-annibo',

          'agta/set-1/river-calling-sister-alig',

          'agta/set-1/taguwasi-answers-the-plea',

          'agta/set-1/the-three-brothers-ascend',

          'agta/set-1/wedding-war-chief-namandiyanin',

          'agta/set-1/barbed-sky-messenger-dalewasan',

          'agta/set-1/dalewasan-crosses-the-barbed-sky',

          'agta/set-1/fifth-sky-sentinel-ulagan',

          'agta/set-1/keeper-at-sunrise-sinag',

          'agta/set-1/moon-bright-captive-innawagan',

          'agta/set-1/night-feast-defender-tamin',

          'agta/set-1/nightfall-raider-kallan',

          'agta/set-1/returning-sky-captain-darawan',

          'agta/set-1/sinag-reveals-the-rescuer',

          'agta/set-1/wedding-pact-elder-amuray',

          'agta/set-1/barbed-sky-passage-salikan',

          'agta/set-1/beast-spirit-healer-subkal',

          'agta/set-1/brothers-refuge-taliman',

          'agta/set-1/dawnward-country-arawen',

          'agta/set-1/fifth-heaven-ularan',

          'agta/set-1/golden-threshold-nagdan',

          'agta/set-1/healer-s-spirit-friend-bunog',

          'agta/set-1/healing-house-aligan',

          'agta/set-1/heaven-s-rift-siwangan',

          'agta/set-1/mystic-sky-river-dalunan',

          'agta/set-1/path-turning-warden-tumatanan',

          'agta/set-1/restless-wandering-dead-belet',

          'agta/set-1/storm-court-kaliman',

          'agta/set-1/wedding-clearing-amuran',

          'babaylan/set-1/abyssal-revolt-sinogo',

          'babaylan/set-1/harvest-warden-mangaw',

          'babaylan/set-1/last-moon-devourer-bakunawa',

          'babaylan/set-1/mountain-sovereign-maria-cacao',

          'babaylan/set-1/ocean-sovereign-maguayan',

          'babaylan/set-1/return-our-moon',

          'babaylan/set-1/six-moons-lost',

          'babaylan/set-1/the-covenant-renewed',

          'babaylan/set-1/thunder-beneath-the-waves',

          'babaylan/set-1/thunder-sovereign-kaptan',

          'babaylan/set-1/unbroken-invocation-amara',

          'babaylan/set-1/flight-of-the-faithless',

          'babaylan/set-1/heaven-s-pursuit-dalagan',

          'babaylan/set-1/leafborne-champion-kapitan-dyano',

          'babaylan/set-1/nightfall-hunter-wakira',

          'babaylan/set-1/reef-enchanter-lawira',

          'babaylan/set-1/shadow-prowler-sagwil',

          'babaylan/set-1/spring-sentinel-ulango',

          'babaylan/set-1/the-mountain-withdraws',

          'babaylan/set-1/the-river-rises',

          'babaylan/set-1/unseen-defender-tata-cero',

          'babaylan/set-1/unyielding-pursuer-guidala',

          'babaylan/set-1/when-lantoy-wept',

          'babaylan/set-1/a-promise-broken',

          'babaylan/set-1/answering-voice-aday',

          'babaylan/set-1/first-invocation-luning',

          'babaylan/set-1/floodwatch-runner-sali',

          'babaylan/set-1/hidden-affliction-doro',

          'babaylan/set-1/promise-bearer-nardo',

          'babaylan/set-1/small-deliverer-silak',

          'babaylan/set-1/spirit-mediator-iday',

          'babaylan/set-1/the-elders-answer',

          'babaylan/set-1/champion-s-trial-danao-highlands',

          'babaylan/set-1/faithless-prison-tanon-strait',

          'babaylan/set-1/field-blessing-banira',

          'babaylan/set-1/fields-under-watch-tabayag',

          'babaylan/set-1/great-calling-moonwake-shore',

          'babaylan/set-1/hidden-court-dingayop-cavern',

          'babaylan/set-1/hidden-passage-kawili',

          'babaylan/set-1/kindly-neighbor-silaya',

          'babaylan/set-1/living-sanctuary-dingayop-spring',

          'babaylan/set-1/quiet-crossing-salumi',

          'babaylan/set-1/silent-threshold-kabulaw',

          'babaylan/set-1/sovereign-heights-mount-lantoy',

          'babaylan/set-1/turning-pursuit-bantayan-waters',

          'babaylan/set-1/unseen-passage-argao-river',

          'maguindanao/set-1/beneath-water-ancestress-potri-rainalaut',

          'maguindanao/set-1/boat-watching-tonong-tomitay',

          'maguindanao/set-1/gurayen-wrath-mate-maka-ogis',

          'maguindanao/set-1/land-restoring-raja-indarapatra',

          'maguindanao/set-1/matutun-branch-devourer-tarabusaw',

          'maguindanao/set-1/nonok-veiled-guardian-apo-a-bekong',

          'maguindanao/set-1/rattan-haunt-scourge-kurita',

          'maguindanao/set-1/ridge-bed-multiplier-omaka-an',

          'maguindanao/set-1/seven-sight-final-scourge-gurayn',

          'maguindanao/set-1/sun-darkening-scourge-pah',

          'maguindanao/set-1/three-scourge-champion-sulayman',

          'maguindanao/set-1/balete-laughing-spirit-ba-i-a-salendagao',

          'maguindanao/set-1/current-borne-ancestor-crocodile-form-apu',

          'maguindanao/set-1/day-became-night',

          'maguindanao/set-1/dread-night-caller-balbal',

          'maguindanao/set-1/heaven-sheltered-survivor-lanao-sprite',

          'maguindanao/set-1/house-shell-shadow-pahira',

          'maguindanao/set-1/kabalalan-shook-from-below',

          'maguindanao/set-1/matutun-branch-hurler-tarabuk',

          'maguindanao/set-1/rattan-marsh-stalker-kuritan',

          'maguindanao/set-1/seven-heads-before-one-king',

          'maguindanao/set-1/smoke-split-hunter-salimbadut',

          'maguindanao/set-1/the-brother-awakened',

          'maguindanao/set-1/the-four-scourges-came',

          'maguindanao/set-1/the-price-of-the-third-victory',

          'maguindanao/set-1/until-tarabusaw-tired',

          'maguindanao/set-1/a-vow-carried-by-the-wind',

          'maguindanao/set-1/elder-of-the-old-telling-maharaja-layla',

          'maguindanao/set-1/first-daughter-of-the-returned-land-rinayung',

          'maguindanao/set-1/first-son-of-the-returned-land-rinamuntaw',

          'maguindanao/set-1/hollow-tree-guide-the-old-woman',

          'maguindanao/set-1/keeper-of-the-account-datu-kali-adam',

          'maguindanao/set-1/keeper-of-the-last-refuge-datu-karim',

          'maguindanao/set-1/last-witness-of-the-old-words-alad',

          'maguindanao/set-1/spring-veiled-heiress-dayang-amina',

          'maguindanao/set-1/the-lowlands-rose-again',

          'maguindanao/set-1/when-the-life-sign-withered',

          'maguindanao/set-1/cave-beneath-the-earth-the-last-refuge',

          'maguindanao/set-1/city-beyond-the-sunset-mantapuli',

          'maguindanao/set-1/forest-of-broken-branches-mount-matutun',

          'maguindanao/set-1/listener-among-the-roots-tree-tunung',

          'maguindanao/set-1/mirror-of-the-giant-war-lake-lanao',

          'maguindanao/set-1/peak-of-seven-sights-mount-gurayn',

          'maguindanao/set-1/prayer-above-the-storm-sky-tunung',

          'maguindanao/set-1/reach-of-the-ridge-giants-illana-bay',

          'maguindanao/set-1/shore-of-the-broken-hills-cape-timbalangan',

          'maguindanao/set-1/the-rattan-haunt-mount-kabalalan',

          'maguindanao/set-1/the-sea-withdrawn-lowlands-restored-magindanao',

          'maguindanao/set-1/throne-of-the-sun-shadow-mount-bita',

          'maguindanao/set-1/voice-beneath-the-current-water-tunung',

          'maguindanao/set-1/warden-within-the-ridge-mountain-tunung',
        ],
      },
      {
        id: '1.1',
        title: 'Codex switching, and the defense maths',
        date: 'September 2026',
        // The two Codex this patch made reachable belong to Agta and to
        // Maguindanao. The Visayas was not involved, and the poster says so.
        regions: ['luzon', 'mindanao'],
        summary:
          'No card numbers changed. Three things that were quietly wrong about '
          + 'how the game played are not wrong any more.',
        nerfs: [],
        buffs: [],
        adjusted: [],
        systems: [
          {
            title: 'Codex switching asks once a turn',
            note:
              'Every Codex tied to a moment in your own turn is now offered '
              + 'together, at the start of it. It used to ask at four separate '
              + 'moments while allowing one switch — so the first moment took '
              + 'it and the rest were never reached. Two Codex could not be '
              + 'chosen at all: Thousand Knots and Liguasan Marsh. They can now.',
          },
          {
            title: 'Declining no longer lasts all game',
            note:
              'Turning down a Codex switch used to stop the game offering you '
              + 'another one for the rest of the duel. It now only holds for '
              + 'the turn you declined it on.',
          },
          {
            title: 'The defense prompt does the arithmetic',
            note:
              'Blocking shows a running total as you pick cards, red while the '
              + 'attack still gets through and green once it does not, with how '
              + 'much is still missing. A tie breaks the defense, so the number '
              + 'you need is one more than the difference — the prompt now says '
              + 'so instead of leaving you to remember it.',
          },
          {
            title: 'Animations fire from the right card',
            note:
              'Holding two copies of a card meant Offering or revealing the '
              + 'second one animated the first. Every animation now finds the '
              + 'exact card it is about.',
          },
        ],
        newCards: [],
      },
      {
        id: '1.0',
        title: 'Set 1 — Three Archipelagos',
        date: null,
        regions: ['luzon', 'visayas', 'mindanao'],
        summary:
          'Seventy-five cards across Luzon, the Visayas and Mindanao. Each '
          + 'archipelago plays around a State it has to earn: Bayanihan fills '
          + 'every Ally Zone, Andukha reads your Heart, Garahana counts your '
          + 'Grave.',
        nerfs: [],
        buffs: [],
        adjusted: [],
        systems: [
          {
            title: 'Agta — Bayanihan',
            note:
              'Luzon. Releases while all four Ally Zones hold Luzon Arch units. '
              + 'Sipol special calls off the top of your deck to fill them.',
          },
          {
            title: 'Babaylan — Andukha',
            note:
              'The Visayas. Reads the Heart, and searches it rather than the '
              + 'deck.',
          },
          {
            title: 'Maguindanao — Garahana',
            note:
              'Mindanao. Releases at five Maguindanaon units in your Grave, '
              + 'which is a cost you pay on purpose: Offer your own units to '
              + 'get there.',
          },
        ],
        newCards: [],
      },
    ],
  },
];

/** The set the game is currently on. */
export const CURRENT_VERSION: SetVersion = VERSIONS[0]!;

/** The newest patch — what the version tag on the title screen shows. */
export const LATEST_PATCH: Patch = CURRENT_VERSION.patches[0]!;

/** How many things a patch changed, for the one-line summary in the list. */
export function patchCounts(p: Patch): { label: string; kind: string }[] {
  const out: { label: string; kind: string }[] = [];
  if (p.nerfs.length) out.push({ label: `${p.nerfs.length} nerfed`, kind: 'nerf' });
  if (p.buffs.length) out.push({ label: `${p.buffs.length} buffed`, kind: 'buff' });
  if (p.adjusted.length) out.push({ label: `${p.adjusted.length} adjusted`, kind: 'adj' });
  if (p.systems.length) out.push({ label: `${p.systems.length} systems`, kind: 'sys' });
  if (p.newCards.length) out.push({ label: `${p.newCards.length} new`, kind: 'new' });
  return out;
}
