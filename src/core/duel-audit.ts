import type { Chooser } from './effects.js';
import type { GameController, PlayerAction, PromptPolicy } from './game.js';
import type { GameState, PlayerId } from './types.js';
import { RecordingChooser, assertNotLive, stateHash, REPLAY_FORMAT_VERSION, type ReplayStep } from './replay.js';
import { playerView } from '../pvp/view.js';

/** Opt-in, local-only evidence. Never export hidden information during a duel. */
export class DuelAudit {
  readonly initialState: GameState;
  readonly choosers: [Chooser, Chooser];
  private recorder: RecordingChooser;
  private steps: ReplayStep[] = [];
  private hashes: string[] = [];
  private decisions: Array<{ kind: string; player: PlayerId; visible: GameState; options: unknown; elapsedMs?: number }> = [];
  private failure: string | null = null;

  constructor(private game: GameState, originals: [Chooser, Chooser], private promptPolicy: PromptPolicy) {
    this.initialState = structuredClone(game);
    const routed = new Proxy(originals[0], {
      get: (_target, property) => {
        const key = property as keyof Chooser;
        if (typeof originals[0][key] !== 'function') return undefined;
        return async (...args: unknown[]) => {
          const p = args[0] as PlayerId;
          const decision = { kind: String(property), player: p,
            visible: playerView(game, p, null, []), options: structuredClone(args.slice(1)), elapsedMs: 0 };
          this.decisions.push(decision);
          const started = performance.now();
          const answer = await Reflect.apply(originals[p][key] as Function, originals[p], args);
          decision.elapsedMs = Math.round(performance.now() - started);
          return answer;
        };
      },
    });
    this.recorder = new RecordingChooser(routed);
    this.choosers = [this.recorder, this.recorder];
  }

  attach(ctrl: GameController): void {
    const begin = ctrl.beginTurn.bind(ctrl), perform = ctrl.perform.bind(ctrl);
    const record = async (step: ReplayStep, run: () => Promise<void>) => {
      this.steps.push(structuredClone(step));
      try { await run(); this.hashes.push(stateHash(this.game)); }
      catch (error) { this.failure = String(error); throw error; }
    };
    ctrl.beginTurn = () => record({ t: 'turn' }, begin);
    ctrl.perform = (action: PlayerAction, p: PlayerId) => {
      this.decisions.push({ kind: 'action', player: p, visible: playerView(this.game, p, null, []),
        options: structuredClone(ctrl.legalActions(p)) });
      return record({ t: 'act', action, p }, () => perform(action, p));
    };
  }

  exportCompleted() {
    assertNotLive(this.game);
    if (this.failure) throw new Error(`Audit contains a failed boundary: ${this.failure}`);
    return structuredClone({ format: 'codex-depth-audit-v1', replayVersion: REPLAY_FORMAT_VERSION,
      rulesRevision: this.game.rulesRevision, informationModel: 'AI uses full-state heuristic trials',
      promptPolicy: this.promptPolicy, initialState: this.initialState,
      steps: this.steps, choices: this.recorder.choices, hashes: this.hashes, decisions: this.decisions,
      // Surrender is a UI transition, not a controller action. Replay all
      // boundaries first, then apply this explicit terminal-only transition.
      terminalOverride: this.game.winReason === 'surrender'
        ? { winner: this.game.winner, reason: 'surrender', beforeHash: this.hashes.at(-1) ?? stateHash(this.initialState) }
        : null,
      result: { winner: this.game.winner, reason: this.game.winReason, finalHash: stateHash(this.game) } });
  }
}
