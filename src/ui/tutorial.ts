import { formatCardText } from './glossary.js';
import { inputCopy } from './input-copy.js';
import { placeHelp } from './overlay-placement.js';
/**
 * In-game coaching.
 *
 * Two kinds of tip, because they answer different questions.
 *
 * **Phase tips** walk the first turn. The phases are the spine of a turn, and
 * "what is happening right now?" is a new player's first question, so each
 * phase pauses once and says what it is for. `onPhaseChange` is awaited by the
 * engine, so this is a real pause rather than a race.
 *
 * **State tips** fire whenever their condition becomes true, on any turn —
 * for the things people forget rather than the things they have not met yet.
 *
 * Four rules keep it from becoming a wall of modals:
 *
 *  1. **Pausing is for the first turn only.** After that every tip is
 *     ambient: it appears beside the thing and the game carries on.
 *  2. **Never teach what the player cannot do.** The Personify tip is skipped
 *     entirely when there is nothing to personify into; a tip about an
 *     unavailable action is noise.
 *  3. **A pause can never stall.** Every blocking tip auto-advances after a
 *     few seconds, so a missed button does not strand anybody.
 *  4. **Doing the thing dismisses the tip.** A `satisfied` condition retires
 *     it without a click — the best acknowledgement is the player proving
 *     they got it.
 *
 * Seen-state is per tip, in localStorage, since there are no accounts. Adding
 * a tip later shows only the new one.
 */
import type { GameState, Phase, PlayerId } from '../core/types.js';
import { you } from '../core/state.js';
import { settings, setSetting } from './settings.js';

const HUMAN: PlayerId = 0;
const KEY = 'codex-legends.tips';

/** How long a blocking tip waits before letting the turn continue. */
const AUTO_ADVANCE_MS = 9000;

/** Ambient tips stop after this turn; by then they are nagging. */
const LAST_AMBIENT_TURN = 10;

interface Tip {
  id: string;
  title: string;
  body: string;
  /** CSS selector for the thing being explained. */
  anchor?: string;
  /** Retires the tip without a click, when the player does the thing. */
  satisfied?: (g: GameState) => boolean;
}

/** Facts the tutorial cannot work out from `GameState` alone. */
export interface TipFacts {
  canPersonify: boolean;
}

// --------------------------------------------------------------- phase tips

/**
 * One per phase, shown on the human's first turn. `personify` is conditional:
 * see rule 2 above.
 */
const PHASE_TIPS: Partial<Record<Phase, Tip>> = {
  start: {
    id: 'phase-draw',
    title: 'Draw phase',
    body: 'Draw at the start of your turn. The first player skips their first draw. You can read any card in the game at '
      + 'full size: right-click it with a mouse, or press and hold on a touch '
      + 'screen — your hand, the board, even your opponent’s.',
    anchor: '.hand',
  },
  personify: {
    id: 'phase-personify',
    title: 'Personify',
    body: 'Your Persona is you on the battlefield. A Level 3 unit in your hand can become your new Persona, changing how you fight while you stay in the battle.',
    anchor: '.mat:not(.foe) .slot.persona',
  },
  main: {
    id: 'phase-main',
    title: 'Main phase',
    body: 'Play units into your Ally Zones, use skills, and switch your Codex. This is where a turn is built — attacking comes after.',
    anchor: '.hand',
  },
  battle: {
    id: 'phase-battle',
    title: 'Battle phase',
    body: 'Click a unit to attack with it, then click its target. An attack connects when its Power is equal to or greater than the defence — a tie is enough.',
    anchor: '.mat:not(.foe) .z-units',
  },
};

// --------------------------------------------------------------- state tips

/**
 * Fire whenever their condition becomes true, on any turn. These are for what
 * people forget, not for what they have not met.
 */
const STATE_TIPS: (Tip & { when: (g: GameState) => boolean })[] = [
  {
    id: 'end-turn',
    title: 'Nothing left to attack with',
    body: 'Every unit you control has attacked and is exhausted. They stand back up at the start of your next turn — end this one when you are ready.',
    anchor: '.side.mine .actions',
    when: (g) => {
      if (g.turnPlayer !== HUMAN || g.phase !== 'battle') return false;
      const ps = you(g, HUMAN);
      const units = [...ps.allies.filter((a): a is string => !!a), ps.persona]
        .filter((u): u is string => !!u);
      return units.length > 0 && units.every((u) => g.cards[u]?.exhausted);
    },
    satisfied: (g) => g.turnPlayer !== HUMAN,
  },
  {
    id: 'codex-switch',
    title: 'You can change your Codex',
    body: 'Your Codex changes how your deck fights. Manually switching during Main costs 1 Play. An automatic switch at its printed trigger is free, even with no Plays left.',
    anchor: '.mat:not(.foe) .pilebox.z-codex',
    when: (g) => g.turnPlayer === HUMAN && g.phase === 'main',
    satisfied: (g) => you(g, HUMAN).codexSwitchedThisTurn,
  },
  {
    id: 'persona-level',
    title: 'Losing a Barrier makes you stronger',
    body: 'Each Barrier you lose raises your Persona level, and that means more plays every turn. Falling behind is not the end of it.',
    anchor: '.side.mine',
    when: (g) => you(g, HUMAN).barriers.length < 5,
  },
];

// ---------------------------------------------------------------------------

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(s: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // Not persisting is survivable; the session still behaves.
  }
}

let seen = loadSeen();
let active: { tip: Tip; node: HTMLElement; close: (remember?: boolean) => void } | null = null;
/** One ambient tip per turn, so a busy board cannot bury the player. */
let lastAmbientTurn = -1;

export function resetTips(): void {
  seen = new Set();
  saveSeen(seen);
  lastAmbientTurn = -1;
}

export function tipsSeenCount(): number {
  return seen.size;
}

export function totalTips(): number {
  return Object.keys(PHASE_TIPS).length + STATE_TIPS.length;
}

/** Is a prompt on screen? Tips never sit on top of a decision. */
function promptOpen(): boolean {
  return !!document.querySelector('.modal-bg') || !!document.querySelector('.restore-pill');
}

function place(node: HTMLElement, anchor: string | undefined): boolean {
  const target = (anchor ? document.querySelector<HTMLElement>(anchor) : null)
    ?? document.querySelector<HTMLElement>('.turn-btn');
  if (!target) {
    node.classList.add('centred');
    return true;
  }
  return placeHelp(node, target);
}

/**
 * Render a tip. Resolves when it goes away — by button, by the player doing
 * the thing, or by the timeout. A caller that awaits it gets a real pause; a
 * caller that ignores it gets an ambient note.
 */
function show(tip: Tip, blocking: boolean): Promise<void> {
  return new Promise((resolve) => {
    const node = document.createElement('aside');
    node.className = `tip${blocking ? ' blocking' : ''}`;
    node.setAttribute('role', 'note');

    const h = document.createElement('h3');
    h.textContent = tip.title;
    const p = document.createElement('p');
    p.innerHTML = formatCardText(inputCopy(tip.body));

    const row = document.createElement('div');
    row.className = 'tip-row';

    const ok = document.createElement('button');
    ok.className = 'tip-ok';
    ok.textContent = blocking ? 'Continue' : 'Got it';

    const skip = document.createElement('button');
    skip.className = 'tip-never';
    // On the walkthrough this is an escape hatch for people who already know
    // TCGs; later it is simply "stop".
    skip.textContent = blocking ? 'Skip the walkthrough' : 'Stop showing tips';

    row.append(ok, skip);
    node.append(h, p, row);
    document.body.appendChild(node);
    if (!place(node, tip.anchor)) { node.remove(); resolve(); return; }
    void node.offsetWidth;
    node.classList.add('show');

    let done = false;
    const close = (remember: boolean): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (remember) {
        seen.add(tip.id);
        saveSeen(seen);
      }
      node.classList.remove('show');
      setTimeout(() => node.remove(), 220);
      active = null;
      resolve();
    };

    ok.onclick = () => close(true);
    skip.onclick = () => {
      setSetting('tips', false);
      close(true);
    };

    // A pause must never become a stall.
    const timer = setTimeout(() => close(true), blocking ? AUTO_ADVANCE_MS : 14000);

    active = { tip, node, close: (remember = false) => close(remember) };
  });
}

/**
 * Show the tip for a phase, and wait for it. Called from `onPhaseChange`,
 * which the engine awaits — so the turn genuinely pauses.
 *
 * Only the human's own first turn is walked through. After that the phases
 * are familiar and pausing on each one would be an imposition.
 */
export async function phaseTip(
  phase: Phase,
  player: PlayerId,
  g: GameState,
  facts: TipFacts,
): Promise<void> {
  if (!settings().tips) return;
  if (player !== HUMAN) return;
  if (g.turnNumber > 2) return;
  if (phase === 'start' && g.turnNumber === 1) return;
  if (promptOpen()) return;

  const tip = PHASE_TIPS[phase];
  if (!tip || seen.has(tip.id)) return;

  // Never teach an action that is not available.
  if (phase === 'personify' && !facts.canPersonify) return;

  // A phase tip still on screen when the next phase arrives has been read
  // past, so remember it — otherwise it comes back next turn as if unseen.
  if (active) active.close(true);
  await show(tip, true);
}

/**
 * Ambient check, run after every render. Cheap: a few predicates over state.
 */
export function checkTips(g: GameState): void {
  if (!settings().tips || g.winner !== null) {
    active?.close();
    return;
  }

  // Never over a prompt: the player is being asked to decide something, and a
  // tip on top of the question is the exact interruption to avoid. Stand aside
  // without marking it seen, so it returns once the board is free.
  if (promptOpen()) {
    if (active && !active.node.classList.contains('blocking')) {
      active.close();
      lastAmbientTurn = -1;
    }
    return;
  }

  if (active) {
    if (active.tip.satisfied?.(g)) {
      seen.add(active.tip.id);
      saveSeen(seen);
      active.close();
    }
    return;
  }

  if (g.turnNumber > LAST_AMBIENT_TURN || g.turnNumber === lastAmbientTurn) return;

  const next = STATE_TIPS.find((t) => !seen.has(t.id) && t.when(g));
  if (!next) return;
  lastAmbientTurn = g.turnNumber;
  void show(next, false);
}

/** Drop whatever is on screen — a duel ended, or the board was torn down. */
export function clearTips(): void {
  active?.close();
}
