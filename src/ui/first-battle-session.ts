import { TutorialSession, type TutorialLesson, type TutorialStep, type TutorialEvent } from './tutorial-mode.js';
import { firstBattleMoves, type FirstBattleCards, type FirstBattleChapter } from './first-battle.js';
import type { PlayerAction } from '../core/game.js';
import type { TutorialRegion } from '../core/tutorial-decks.js';

const PROGRESS_KEY = 'codex-legends.first-battle.v1';
export function readFirstBattleProgress(region: TutorialRegion = 'luzon'): { chapter: FirstBattleChapter; completed: boolean } {
  try {
    const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
    if (data.version === 3) return {
      chapter: data.region === region && [0, 1, 2].includes(data.chapter) ? data.chapter : 0,
      completed: data.completed === true,
    };
    // Older checkpoints use different Personas and an Action absent from the
    // new presets. Preserve completion, but never resume their partial board.
    if (data.version === 1 || data.version === 2) return { chapter: 0, completed: data.completed === true };
  } catch { /* The lesson also works without storage. */ }
  return { chapter: 0, completed: false };
}
export function resetFirstBattleProgress(): void {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* optional persistence */ }
}

interface FirstStep extends TutorialStep {
  id: string;
  chapter: FirstBattleChapter;
  action?: PlayerAction;
  button?: string;
}
const own = '.mat:not(.foe)';
const foe = '.mat.foe';
const node = (uid: string) => `[data-uid="${uid}"]`;

function steps(c: FirstBattleCards): FirstStep[] {
  const m = firstBattleMoves(c);
  const num = (n: number) => n.toLocaleString('en-US');
  const attack = c.personaPower + 5000;
  const defense = c.personaPower + c.blockerDefense;
  const read = (id: string, chapter: FirstBattleChapter, title: string, body: string, anchor?: string, button = 'Continue'): FirstStep =>
    ({ id, chapter, title, body, anchor, button, expected: { kind: 'manual' } });
  const wait = (id: string, chapter: FirstBattleChapter, cue: string): FirstStep =>
    ({ id, chapter, title: 'Watch the battle', body: '', hidden: true, expected: { kind: 'cue', cue } });
  const act = (id: string, chapter: FirstBattleChapter, title: string, body: string, action: PlayerAction, anchor: string): FirstStep =>
    ({ id, chapter, title, body: body.split(/(?<=\.) /)[0]!, why: body.split(/(?<=\.) /).slice(1).join(' ') || undefined, action, anchor, expected: { kind: 'action', action: action.kind } });
  return [
    read('welcome', 0, 'Your first battle', 'No card-game experience needed. Your cards are below; your opponent’s are above. We will practise one move at a time, using simplified tutorial effects.', undefined, 'Let’s Play'),
    read('persona', 0, 'This is you', `Your Persona is your main fighter: ${c.personaName}, the center card on your field. Units placed beside it become Allies that can fight alongside it.`, `${own} .slot.persona`),
    read('goal', 0, 'Break their Barriers, then land a hit', 'The card backs between their hand and field are Barriers. A normal match starts with five; this practice starts with two each. Break theirs, then hit their Persona once more to win.', `${foe} .z-barrier`, 'Deal the Cards'),
    wait('deal', 0, 'dealt'),
    { id: 'inspect', chapter: 0, title: 'Read a card', body: 'Right-click the glowing card, or press and hold on a phone. Read it, then close its details. Reading never plays the card.', why: 'Gold ATK is its Power. Green DEF is what this card can add when you defend from your hand.', anchor: `.hand-card${node(c.ally)}`, expected: { kind: 'cue', cue: 'inspected' } },
    act('call', 0, 'Call your Ally', `Choose ${c.allyName} in your hand, then the glowing empty Ally Zone. Calling means placing a Unit on your field. A normal call uses one Play; the counter is beside your portrait.`, m.call, `.hand-card${node(c.ally)}`),
    read('codex', 0, 'One simple bonus', `A Codex is a rule card that helps your field. This tutorial’s active Codex gives your Persona +5,000 Power only while it attacks: ${num(c.personaPower)} becomes ${num(attack)} for that attack.`, `${own} .z-codex`),
    act('battle', 0, 'Enter battle', 'Choose Go to Battle at the lower right. The phase rail will highlight BATTLE. You’ll attack with your Persona first.', { kind: 'endPhase' }, '.side.mine .turn-btn'),
    { ...act('attack', 0, 'Choose your Persona', 'Choose your glowing Persona, then your opponent’s Persona as the target.', m.persona, `${own} .slot.persona`), allowedAction: 'attack', expected: { kind: 'cue', cue: 'blockers' } },
    read('their-defense', 0, 'Your opponent defended', `They spent a hand card with ${num(c.blockerDefense)} DEF. Their Persona’s ${num(c.personaPower)} + that card’s ${num(c.blockerDefense)} = ${num(defense)} defense. Your ${num(attack)} attack currently falls short.`, '.defense-zone'),
    read('before-check', 0, 'Reveal an attack check', 'A Persona attack reveals the top card of its Deck. A Force card can add Power and change the result. Watch the REVEALED card before the attack finishes.', `${own} .z-deck`, 'Check'),
    { ...wait('checking', 0, 'unused'), expected: { kind: 'checkResolved', owner: 0, isForce: false, checkKind: 'attack' } },
    read('checked', 0, 'The card goes to your hand', 'It was not a Force, so your Power did not change. You still gain the checked card in your hand.', '.hand-bar'),
    { ...wait('resolve', 0, 'unused'), expected: { kind: 'action', action: 'attack' } },
    act('ally-attack', 0, 'Attack with your Ally', 'Choose your glowing Ally, then their Persona. Their defense held against the previous attack. Allies do not normally make an attack check.', m.ally, `${own} .slot[data-slot="0"]`),
    act('end', 0, 'End your turn', `Choose End Turn at the lower right. Your ${num(c.allyPower)} attack matched their ${num(c.personaPower)} defense, so a Barrier broke: ties hit. Sideways Units are exhausted and cannot attack again until they charge.`, { kind: 'endTurn' }, '.side.mine .turn-btn'),
    read('opponent', 1, 'Now defend yourself', 'Your opponent will call an Ally and attack. First, we’ll stop a hit with a card from your hand.', `${foe} .slot.persona`, 'Watch Their Turn'),
    { ...wait('watch', 1, 'unused'), expected: { kind: 'attackDeclared', defender: 0 } },
    read('attacked', 1, 'Your opponent is attacking', 'Their Persona is attacking yours. The comparison on the right shows the totals. Choose hand cards to add their green DEF values; defense must be higher than the attack.', `${foe} .slot.persona`, 'Choose Defense'),
    wait('defend', 1, 'defended'),
    { ...wait('defending', 1, 'unused'), expected: { kind: 'attackResolved', defender: 0 } },
    { ...wait('watch-again', 1, 'unused'), expected: { kind: 'attackDeclared', defender: 0 } },
    read('take-hit', 1, 'Keep your cards this time', 'Their Ally is attacking next. You can keep cards for later and take a hit. For this lesson, choose Take the Hit.', `${foe} .slot[data-slot="0"]`, 'Show the Choice'),
    wait('taking-hit', 1, 'opponent-finished'),
    { ...wait('next-turn', 1, 'unused'), expected: { kind: 'phase', phase: 'main', player: 0 } },
    read('new-turn', 2, 'Your next turn', 'You drew a card into your hand. Your Units are upright and ready again, and your Plays refreshed beside your portrait. The first player skips only their first draw.', '.hand-bar'),
    act('last-battle', 2, 'Go to Battle', 'Choose Go to Battle at the lower right. Your Persona and Ally are ready. You can attack without calling another Unit or spending a Play.', { kind: 'endPhase' }, '.side.mine .turn-btn'),
    act('last-shield', 2, 'Break their last Barrier', 'Attack their Persona with your Persona. Your Ally will make the final attack.', m.persona, `${own} .slot.persona`),
    act('win', 2, 'Land the winning hit', 'Attack their Persona with your Ally to win. They have no Barriers left.', m.ally, `${own} .slot[data-slot="0"]`),
    read('victory', 2, 'You won your first battle', 'You called an Ally, attacked, defended, and took a hit. You broke the last Barrier, then landed one more hit to win. Next, learn when simple skills begin and end.', undefined, 'Finish First Battle'),
  ];
}

export const FIRST_BATTLE_LESSON: TutorialLesson = {
  id: 'first-battle', number: 0, title: 'First Battle', focus: 'orientation', minutes: 7,
  summary: 'Never played a card game? Follow a prepared match, one move at a time.',
  steps: [],
};

export type FirstBattleMode = 'tutorial' | 'lvl-up-3';

/** Short visitor guidance over the same prepared match and controller cues. */
function visitorSteps(cards: FirstBattleCards): FirstStep[] {
  const omitted = new Set(['persona', 'goal', 'inspect', 'codex', 'before-check', 'checked', 'new-turn']);
  const power = cards.personaPower.toLocaleString('en-US');
  const attacking = (cards.personaPower + 5000).toLocaleString('en-US');
  const defense = (cards.personaPower + cards.blockerDefense).toLocaleString('en-US');
  const copy: Record<string, Partial<Pick<FirstStep, 'title' | 'body' | 'why' | 'button'>>> = {
    welcome: {
      title: 'Lvl Up 3.0 · Your first battle',
      body: `Your center fighter is ${cards.personaName}, your Persona. This Luzon demo uses simplified effects and two Barriers each; a normal match starts with five. Break theirs, then hit their Persona again to win.`,
      why: 'Follow the glowing choices. No card-game experience needed.',
      button: 'Start Battle',
    },
    call: {
      body: `Choose ${cards.allyName} in your hand, then the glowing empty Ally Zone. Calling puts a fighter beside your Persona.`,
      why: 'A normal call costs 1 Play. Gold ATK is Power; green DEF adds defense from your hand. Right-click or press and hold a card to read it.',
    },
    battle: {
      body: 'Choose Go to Battle at the lower right. Your Persona will attack first.',
      why: `Your active Codex gives your Persona +5,000 Power while attacking: ${power} becomes ${attacking}.`,
    },
    'their-defense': {
      body: `Your opponent spent a hand card to reach ${defense} defense. Your ${attacking} attack falls short.`,
      why: 'Next, your Persona reveals the top card of your Deck. A Force could change the result; the revealed card then goes to your hand. Continue to watch the check.',
    },
    'ally-attack': {
      body: 'Their defense stopped that hit. Now choose your glowing Ally, then their Persona.',
      why: 'Allies do not normally reveal an attack check.',
    },
    end: {
      body: 'A Barrier broke! Your Ally’s Power matched their defense: ties hit. Choose End Turn.',
      why: 'Sideways fighters are exhausted; they become ready on your next turn.',
    },
    opponent: {
      body: 'The opponent will call an Ally and attack. First, stop a hit with a card from your hand.',
    },
    attacked: {
      body: 'Their Persona attacks yours. Select the glowing hand card, then Defend.',
      why: 'Its green DEF adds to your defense. Your total must be higher than the incoming attack; compare the numbers on the right.',
    },
    'take-hit': {
      body: 'Their Ally attacks next. Choose Take the Hit to keep your hand cards and lose a Barrier instead.',
    },
    'last-battle': {
      body: 'Your fighters are ready again, you drew a card, and your Plays refreshed. Choose Go to Battle.',
      why: 'One Barrier remains. Use your Persona to break it, then your Ally for the winning hit.',
    },
    victory: {
      title: 'Lvl Up 3.0 complete',
      body: 'You called an Ally, defended, chose to take a hit, and used two attacks to win.',
      why: 'This was a prepared training match with simplified effects. The full tutorial teaches more; normal matches start with five Barriers.',
      button: 'Finish Demo',
    },
  };
  return steps(cards).filter(step => !omitted.has(step.id)).map(step => ({ ...step, ...copy[step.id] }));
}

export class FirstBattleSession extends TutorialSession {
  private listeners = new Set<() => void>();
  readonly startChapter: FirstBattleChapter;
  readonly mode: FirstBattleMode;
  constructor(readonly cards: FirstBattleCards, startChapter: FirstBattleChapter = 0, readonly region: TutorialRegion = cards.region, options: { mode?: FirstBattleMode } = {}) {
    const demo = options.mode === 'lvl-up-3';
    if (demo && (region !== 'luzon' || cards.region !== 'luzon')) throw new Error('Lvl Up 3.0 uses the prepared Luzon deck.');
    super(demo ? {
      ...FIRST_BATTLE_LESSON, id: 'lvl-up-3', title: 'Lvl Up 3.0', minutes: undefined,
      summary: 'A short guided Luzon battle. No card-game experience needed.', steps: visitorSteps(cards),
    } : { ...FIRST_BATTLE_LESSON, steps: steps(cards) }, { persistProgress: !demo });
    this.mode = options.mode ?? 'tutorial';
    this.startChapter = demo ? 0 : startChapter;
    this.stepIndex = this.lesson.steps.findIndex(s => (s as FirstStep).chapter === this.startChapter);
  }
  get isLvlUpDemo(): boolean { return this.mode === 'lvl-up-3'; }
  override get step(): FirstStep { return super.step as FirstStep; }
  override allows(action: PlayerAction): boolean {
    if (this.completed || !this.step.action) return false;
    return sameAction(action, this.step.action);
  }
  override observe(event: TutorialEvent): void {
    if (event.kind === 'action' && this.step.action && !sameAction(event.action, this.step.action)) return;
    super.observe(event);
    this.changed();
  }
  override continue(): void { super.continue(); this.changed(); }
  private changed(): void {
    if (!this.isLvlUpDemo) {
      try {
        const earned = readFirstBattleProgress(this.region).completed;
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 3, region: this.region, chapter: this.step.chapter, completed: earned || this.completed }));
      } catch { /* optional persistence */ }
    }
    for (const fn of [...this.listeners]) fn();
  }
  waitFor(id: string): Promise<void> {
    return new Promise(resolve => {
      const check = () => { if (this.step.id === id || this.completed) { this.listeners.delete(check); resolve(); } };
      this.listeners.add(check); check();
    });
  }
}

export function sameAction(a: PlayerAction, b: PlayerAction): boolean {
  if (a.kind !== b.kind) return false;
  // Compare fields rather than property insertion order.
  return Object.entries(b).every(([key, value]) => JSON.stringify((a as unknown as Record<string, unknown>)[key]) === JSON.stringify(value));
}
