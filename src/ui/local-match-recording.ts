import type { Chooser } from '../core/effects.js';
import { GameController, type PromptPolicy, type BattleHooks } from '../core/game.js';
import type { DeckList } from '../core/setup.js';
import type { GameState, PlayerId } from '../core/types.js';
import { canSee } from '../core/events.js';
import { RecordingChooser, ReplayChooser, REPLAY_FORMAT_VERSION, assertNotLive, assertReplayCheckpoint, stateHash, type ReplayStep } from '../core/replay.js';
import { RULES_REVISION } from '../core/rules-version.js';
import type { CardIndex } from '../core/state.js';
import { toCode } from './decklib.js';
import { newReplayId, saveReplay, type ReplaySummary, type StoredReplay, type RecordedExchange } from './replay-store.js';

export interface LocalMatchOptions {
  decks: [DeckList, DeckList];
  names: [string, string];
  viewer: PlayerId;
  promptPolicy: PromptPolicy;
  players: NonNullable<ReplaySummary['players']>;
}

/** Records only the actual local controller, never AI lookahead or remote filtered state. */
export class LocalMatchRecording {
  readonly choosers: [Chooser, Chooser];
  private readonly recorder: RecordingChooser;
  private readonly initial: GameState;
  private readonly options: LocalMatchOptions;
  private readonly id = newReplayId();
  private readonly started = Date.now();
  private readonly steps: ReplayStep[] = [];
  private readonly hashes: string[] = [];
  private readonly exchanges = new Map<number, RecordedExchange>();
  private failure: string | null = null;
  private attached = false;
  private pending = false;
  private result: StoredReplay | null = null;
  private saving: Promise<{ entry: StoredReplay; saved: boolean }> | null = null;

  constructor(private readonly game: GameState, originals: [Chooser, Chooser], options: LocalMatchOptions) {
    this.initial = structuredClone(game);
    this.options = structuredClone(options);
    const routed = new Proxy(originals[0], { get: (_target, property) => {
      const method = property as keyof Chooser;
      if (typeof originals[0][method] !== 'function') return undefined;
      return (...args: unknown[]) => Reflect.apply(originals[args[0] as PlayerId][method] as Function, originals[args[0] as PlayerId], args);
    } });
    this.recorder = new RecordingChooser(routed);
    this.choosers = [this.recorder, this.recorder];
  }

  attach(ctrl: GameController): void {
    if (this.attached) throw new Error('Match recording is already attached.');
    if (ctrl.game !== this.game) throw new Error('Recording belongs to a different match.');
    this.attached = true;
    const begin = ctrl.beginTurn.bind(ctrl), perform = ctrl.perform.bind(ctrl), concede = ctrl.concede.bind(ctrl);
    ctrl.concede = p => {
      const accepted = concede(p);
      // Conceding part-way through a response/action is not a settled replay
      // boundary. Refuse that recording rather than present a different duel.
      if (accepted && this.pending) this.failure = 'This duel was conceded during an unresolved action. Its exact recording is unavailable.';
      return accepted;
    };
    const record = async (step: ReplayStep, run: () => Promise<void>) => {
      if (this.pending) { this.failure = 'Overlapping controller boundaries'; return run(); }
      this.pending = true;
      const start = this.steps.length;
      const lastId = this.game.duel?.events.at(-1)?.id ?? 0;
      this.steps.push(structuredClone(step));
      try {
        await run();
        this.hashes.push(stateHash(this.game));
        for (const event of this.game.duel?.events ?? []) {
          if (event.id <= lastId || !canSee(event, this.options.viewer)) continue;
          const range = this.exchanges.get(event.group) ?? { group: event.group, start, end: start + 1, eventIds: [] };
          range.end = start + 1; range.eventIds.push(event.id); this.exchanges.set(event.group, range);
        }
      } catch (error) { this.failure = String(error); throw error; }
      finally { this.pending = false; }
    };
    ctrl.beginTurn = () => record({ t: 'turn' }, begin);
    ctrl.perform = (action, p) => record({ t: 'act', action, p }, () => perform(action, p));
  }

  get isPending(): boolean { return this.pending; }
  get unavailableReason(): string | null { return this.failure; }

  /** No live/private recording leaves this object before the controller is settled and the duel is complete. */
  completed(): StoredReplay {
    assertNotLive(this.game);
    if (!this.attached || this.pending || this.failure) throw new Error(this.failure ?? 'Match recording is not settled.');
    if (this.result) return structuredClone(this.result);
    const options = this.options;
    const persona = (p: PlayerId) => this.initial.cards[this.initial.players[p].persona!]?.defId ?? options.decks[p].persona;
    const codex = (p: PlayerId) => this.initial.cards[this.initial.players[p].activeCodex!]?.defId;
    this.result = {
      summary: { id: this.id, decks: options.names, personas: [persona(0), persona(1)], winner: this.game.winner,
        reason: this.game.winReason, turns: this.game.turnNumber, recordedAt: new Date(this.started).toISOString(),
        seconds: Math.round((Date.now() - this.started) / 1000), mode: 'ai', viewer: options.viewer, players: options.players },
      replay: { header: { formatVersion: REPLAY_FORMAT_VERSION, engineVersion: RULES_REVISION,
        seed: this.initial.rngSeed, decks: options.decks.map(toCode) as [string, string], deckNames: options.names,
        setup: [{ persona: persona(0), codex: codex(0) }, { persona: persona(1), codex: codex(1) }], firstPlayer: this.initial.turnPlayer,
        forceCheckBias: [this.initial.players[0].forceCheckBias ?? 0, this.initial.players[1].forceCheckBias ?? 0],
        promptPolicy: options.promptPolicy, visibility: 'private', recordedAt: new Date(this.started).toISOString() },
        steps: structuredClone(this.steps), choices: structuredClone(this.recorder.choices), hashes: [...this.hashes],
        result: { winner: this.game.winner, reason: this.game.winReason, finalHash: stateHash(this.game) } },
      localCapture: { version: 1, initialState: structuredClone(this.initial), initialHash: stateHash(this.initial),
        exchanges: structuredClone([...this.exchanges.values()]),
        ...(this.game.winReason === 'surrender' ? { terminal: { winner: this.game.winner!, reason: 'surrender' as const } } : {}) },
    };
    return structuredClone(this.result);
  }

  saveCompleted(): Promise<{ entry: StoredReplay; saved: boolean }> {
    if (this.saving) return this.saving;
    const entry = this.completed();
    this.saving = saveReplay(entry).then(saved => { if (!saved) this.saving = null; return { entry, saved }; });
    return this.saving;
  }
}

export function recordingUnavailable(entry: StoredReplay, group?: number): string | null {
  if (entry.summary.mode === 'pvp') return 'PvP playback is unavailable: no privacy-safe recording is attached.';
  if (entry.summary.mode !== 'ai' || entry.summary.viewer === undefined) return 'This legacy record has no verified local playback context.';
  if (!entry.replay.result || entry.replay.result.winner === null) return 'Only completed matches can be reviewed.';
  if (entry.replay.header.formatVersion !== REPLAY_FORMAT_VERSION || entry.replay.header.engineVersion !== RULES_REVISION) return 'This recording uses a different rules version.';
  const capture = entry.localCapture;
  if (!capture || capture.version !== 1 || !capture.initialState || !Array.isArray(capture.exchanges)) return 'This record has no compatible starting position.';
  if (capture.initialState.rulesRevision !== RULES_REVISION || stateHash(capture.initialState) !== capture.initialHash) return 'The saved starting position is incompatible or damaged.';
  if (!entry.replay.hashes || entry.replay.hashes.length !== entry.replay.steps.length) return 'The recording is missing verification checkpoints.';
  if (group !== undefined) {
    const range = capture.exchanges.find(e => e.group === group);
    if (!range || !Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end <= range.start || range.end > entry.replay.steps.length || !range.eventIds.length) return 'The exact position of this exchange was not recorded.';
  }
  return null;
}

/** Pure reconstruction host: no AI, live game, shared UID reset or DOM mutation. */
export class LocalReplaySession {
  game!: GameState;
  private ctrl!: GameController;
  private chooser!: ReplayChooser;
  private completedSteps = 0;
  constructor(readonly entry: StoredReplay, private readonly index: CardIndex) {
    const reason = recordingUnavailable(entry); if (reason) throw new Error(reason);
    this.reset();
  }
  reset(): void {
    this.game = structuredClone(this.entry.localCapture!.initialState);
    this.chooser = new ReplayChooser(this.entry.replay.choices);
    this.ctrl = new GameController(this.game, this.index, { choosers: [this.chooser, this.chooser], promptPolicy: () => this.entry.replay.header.promptPolicy ?? 'all' });
    this.completedSteps = 0;
    if (!this.entry.replay.steps.length) this.finish();
  }
  async apply(step: ReplayStep): Promise<void> {
    if (step.t === 'turn') await this.ctrl.beginTurn(); else await this.ctrl.perform(step.action, step.p);
    this.completedSteps++;
    assertReplayCheckpoint(this.entry.replay, this.completedSteps, this.game);
    const observed = new Set((this.game.duel?.events ?? []).filter(e => canSee(e, this.entry.summary.viewer!)).map(e => `${e.group}:${e.id}`));
    for (const range of this.entry.localCapture!.exchanges.filter(e => e.end === this.completedSteps)) {
      if (range.eventIds.some(id => !observed.has(`${range.group}:${id}`))) throw new Error('The recorded exchange no longer matches its event position.');
    }
    if (this.completedSteps === this.entry.replay.steps.length) this.finish();
  }
  setHooks(hooks: BattleHooks): void {
    for (const key of Object.keys(this.ctrl.hooks) as Array<keyof BattleHooks>) delete this.ctrl.hooks[key];
    Object.assign(this.ctrl.hooks, hooks);
  }
  private finish(): void {
    const terminal = this.entry.localCapture!.terminal;
    if (terminal) { this.game.winner = terminal.winner; this.game.winReason = terminal.reason; }
    if (this.chooser.remaining || stateHash(this.game) !== this.entry.replay.result!.finalHash) throw new Error('The reconstructed match differs from its recorded outcome.');
  }
}
