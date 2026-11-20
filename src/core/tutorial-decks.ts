/** Dedicated training presets. Production starters and saved decks never use these lists. */
import luzon from '../data/tutorial-decks/luzon.json' with { type: 'json' };
import visayas from '../data/tutorial-decks/visayas.json' with { type: 'json' };
import mindanao from '../data/tutorial-decks/mindanao.json' with { type: 'json' };
import type { DeckList } from './setup.js';

export type TutorialRegion = 'luzon' | 'visayas' | 'mindanao';
export const TUTORIAL_DECKS: Record<TutorialRegion, DeckList> = { luzon, visayas, mindanao };

export interface TutorialLessonCards {
  persona: string;
  alternatePersona: string;
  l1Support: string;
  l1Arrival: string;
  l1Attack: string;
  l2Support: string;
  l2Arrival: string;
  l2Attack: string;
  forceResponse: string;
  forceCheck: string;
  sentry: string;
  action: string;
}

/** Lesson references are explicit identities, never array positions or catalogue searches. */
export const TUTORIAL_LESSON_CARDS: Record<TutorialRegion, TutorialLessonCards> = {
  luzon: {
    persona: 'agta/set-1/life-breath-mother-nanolay',
    alternatePersona: 'agta/set-1/fifth-sky-tyrant-kalimangalnuk',
    l1Support: 'agta/set-1/moon-bright-captive-innawagan',
    l1Arrival: 'agta/set-1/barbed-sky-messenger-dalewasan',
    l1Attack: 'agta/set-1/keeper-at-sunrise-sinag',
    l2Support: 'agta/set-1/fallen-sky-challenger-talimanog',
    l2Arrival: 'agta/set-1/months-of-battle-warrior-ammani',
    l2Attack: 'agta/set-1/relentless-third-brother-annibo',
    forceResponse: 'agta/set-1/restless-wandering-dead-belet',
    forceCheck: 'agta/set-1/healer-s-spirit-friend-bunog',
    sentry: 'agta/sierra-watchkeeper-banoy',
    action: 'agta/set-1/alig-restores-her-brothers',
  },
  visayas: {
    persona: 'babaylan/set-1/thunder-sovereign-kaptan',
    alternatePersona: 'babaylan/set-1/unbroken-invocation-amara',
    l1Support: 'babaylan/set-1/answering-voice-aday',
    l1Arrival: 'babaylan/set-1/first-invocation-luning',
    l1Attack: 'babaylan/set-1/spirit-mediator-iday',
    l2Support: 'babaylan/set-1/heaven-s-pursuit-dalagan',
    l2Arrival: 'babaylan/set-1/unyielding-pursuer-guidala',
    l2Attack: 'babaylan/set-1/unseen-defender-tata-cero',
    forceResponse: 'babaylan/set-1/hidden-passage-kawili',
    forceCheck: 'babaylan/set-1/kindly-neighbor-silaya',
    sentry: 'babaylan/warden-of-the-twelfth-tide-bituon',
    action: 'babaylan/set-1/the-elders-answer',
  },
  mindanao: {
    persona: 'maguindanao/set-1/land-restoring-raja-indarapatra',
    alternatePersona: 'maguindanao/set-1/sun-darkening-scourge-pah',
    l1Support: 'maguindanao/set-1/first-son-of-the-returned-land-rinamuntaw',
    l1Arrival: 'maguindanao/set-1/first-daughter-of-the-returned-land-rinayung',
    l1Attack: 'maguindanao/set-1/hollow-tree-guide-the-old-woman',
    l2Support: 'maguindanao/set-1/house-shell-shadow-pahira',
    l2Arrival: 'maguindanao/set-1/rattan-marsh-stalker-kuritan',
    l2Attack: 'maguindanao/set-1/matutun-branch-hurler-tarabuk',
    forceResponse: 'maguindanao/set-1/listener-among-the-roots-tree-tunung',
    forceCheck: 'maguindanao/set-1/warden-within-the-ridge-mountain-tunung',
    sentry: 'maguindanao/kuta-wato-oath-shield-panglima-sabir',
    action: 'maguindanao/set-1/the-lowlands-rose-again',
  },
};
