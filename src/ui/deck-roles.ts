/** Authored guidance supplements the catalogue rules; it never affects play. */
export interface CardRole { label: string; description: string; planStep: string; caution: string }
const roles: Record<string, CardRole> = {
  'agta/set-1/wind-heart-rescuer-taguwasi': {
    label: 'Arrange the next call',
    description: 'As your Persona, Taguwasi orders the top three cards at the start of Main. With Bayanihan released, its attack can Sipol 1.',
    planStep: 'Prepare the top of the deck before an extra call.',
    caution: 'Sipol still follows the existing reveal and call rules; it does not guarantee a successful call.',
  },
  'agta/set-1/dawnward-country-arawen': {
    label: 'Trade the draw for a planned call',
    description: 'When Arawen replaces your draw, arrange the top three cards, then Sipol 1.',
    planStep: 'Develop your Ally field through a prepared Sipol.',
    caution: 'This replaces the normal draw. It does not grant both a draw and Sipol.',
  },
  'agta/set-1/moon-bright-captive-innawagan': {
    label: 'Return to the top, or boost',
    description: 'Before Bayanihan, its hand-placement skill puts Innawagan on top of your deck. With Bayanihan released, the skill becomes Power +3000 to one of your Units for the turn.',
    planStep: 'Prepare a future top-deck call, or strengthen a Unit after the formation is active.',
    caution: 'The released skill replaces the original skill. Do not resolve both versions together.',
  },
  'agta/set-1/barbed-sky-messenger-dalewasan': {
    label: 'Spread an arrival boost',
    description: 'Its normal placement skill gives two of your Units Power +2000 for the turn. With Bayanihan released, the skill becomes Power +3000 to one of your Units.',
    planStep: 'Build your field while strengthening the Units that will attack.',
    caution: 'The released skill replaces the normal skill; the boosts do not combine into one arrival effect.',
  },
};
export function cardRole(id: string): CardRole | null { return roles[id] ?? null; }
