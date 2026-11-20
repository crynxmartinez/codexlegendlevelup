import type { GameState, PlayerId, FxEvent } from '../core/types.js';
import { MATCH_INDEX } from './catalog.js';

export const PRESENTATION_HOOKS = ['onAbilityResolved', 'onAttackDeclared', 'onBlockingStart', 'onBlockersDeclared',
  'onBeforeAttackCheck', 'onAttackResolved', 'onCheckRevealed', 'onCheckCardPlaced', 'onCheckCardToHand',
  'onCheckResolved', 'onTokenCreated', 'onPhaseChange', 'onCardCalled', 'onCardDrawn', 'onPersonify',
  'onSentryRevealed', 'onRally', 'onEffectDraw', 'onAbilityActivated', 'onChainUpdated', 'onFx'] as const;
export type PresentationHook = typeof PRESENTATION_HOOKS[number];
export interface MatchPresentation { id: number; hook: PresentationHook; args: unknown[] }

/** A presentation frame has exactly the state at that engine hook, never the final action state.
 * Private movements carry anonymous identities and backs. Explicit public reveals alone add art. */
export function presentationForViewer(event: MatchPresentation, game: GameState, view: GameState, viewer: PlayerId): MatchPresentation {
  const out = structuredClone(event), a = out.args;
  const seat = (owner: PlayerId): PlayerId => owner === viewer ? 0 : 1;
  const card = (uid: string, reveal = false): string => {
    const source = game.cards[uid];
    if (!source) return '';
    if (reveal && source.zone === 'hand') {
      const position = game.players[source.owner].hand.indexOf(uid);
      if (position >= 0) view.players[seat(source.owner)].hand[position] = uid;
    }
    if (view.cards[uid]) return uid;
    if (reveal || source.owner === viewer) {
      // Do not serialize instance internals or activation receipts to explain a public card.
      view.cards[uid] = { uid, defId: source.defId, owner: seat(source.owner), zone: source.zone, slot: source.slot,
        exhausted: source.exhausted, faceDown: false, modifiers: [], stack: source.stack, screen: false,
        usesThisTurn: {}, relocatedThisTurn: false, screenWhileCharged: false, fieldEntry: source.fieldEntry };
      return uid;
    }
    const zoneKey = source.zone === 'barrier' ? 'barriers' : source.zone === 'ally' ? 'allies' : source.zone;
    const pile = game.players[source.owner][zoneKey as keyof typeof game.players[0]];
    const position = Array.isArray(pile) ? (pile as unknown[]).indexOf(uid) : -1;
    const alias = `hidden-${seat(source.owner)}-${zoneKey}-${position}`;
    if (view.cards[alias]) return alias;
    return Object.values(view.cards).find(c => c.owner === seat(source.owner) && c.zone === source.zone && c.defId === '__hidden__')?.uid ?? `concealed-${event.id}`;
  };
  switch (out.hook) {
    case 'onAttackDeclared': case 'onBlockingStart': case 'onBlockersDeclared': case 'onAttackResolved': {
      const b = a[0] as import('../core/types.js').ActiveBattle;
      b.defender = seat(b.defender);
      b.blockers = b.blockers.map(uid => card(uid, true));
      break;
    }
    case 'onBeforeAttackCheck': a[0] = seat(a[0] as PlayerId); break;
    case 'onPhaseChange': a[1] = seat(a[1] as PlayerId); break;
    case 'onAbilityActivated': a[0] = card(a[0] as string, true); a[2] = seat(a[2] as PlayerId); break;
    case 'onAbilityResolved': a[0] = card(a[0] as string, true); a[1] = seat(a[1] as PlayerId); break;
    case 'onCardCalled': a[0] = card(a[0] as string, true); a[2] = seat(a[2] as PlayerId); break;
    case 'onCheckRevealed': a[0] = card(a[0] as string, true); break;
    case 'onCheckCardPlaced': a[0] = card(a[0] as string, true); a[2] = seat(a[2] as PlayerId); break;
    case 'onCheckResolved': a[0] = card(a[0] as string, true); a[3] = seat(a[3] as PlayerId); break;
    case 'onRally': a[0] = (a[0] as string[]).map(uid => card(uid)); a[1] = seat(a[1] as PlayerId); break;
    case 'onCardDrawn': case 'onEffectDraw': a[0] = card(a[0] as string); a[1] = seat(a[1] as PlayerId); break;
    case 'onPersonify': case 'onSentryRevealed': case 'onTokenCreated': case 'onCheckCardToHand':
      a[0] = card(a[0] as string, true); a[1] = seat(a[1] as PlayerId); break;
    case 'onFx': {
      const fx = a[0] as FxEvent;
      if (fx.kind === 'codexFlip') {
        // The authoritative switch captures this while the old Codex is public.
        // Keep only its known definition, never reveal/reinsert its now-hidden
        // instance or infer an identity from the player's remaining reserves.
        const previousDefId = typeof fx.previousDefId === 'string'
          && MATCH_INDEX[fx.previousDefId]?.type === 'Codex' ? fx.previousDefId : undefined;
        a[0] = { kind: 'codexFlip', uid: card(fx.uid, true), player: seat(fx.player),
          ...(previousDefId ? { previousDefId } : {}) } satisfies FxEvent;
        break;
      }
      if (fx.kind === 'heartMove' || fx.kind === 'handMove') {
        fx.cards = fx.cards.map((c, i) => c.hidden && fx.owner !== viewer
          ? { ...c, uid: `concealed-${event.id}-${i}`, defId: '' } : { ...c, uid: card(c.uid, !c.hidden) }) as typeof fx.cards;
      } else if ('uid' in fx) fx.uid = card(fx.uid, fx.kind !== 'emit' || fx.faceUp);
      if ('owner' in fx) fx.owner = seat(fx.owner);
      if ('player' in fx) fx.player = seat(fx.player);
      break;
    }
  }
  return out;
}

/** Ordered client playback. Later packets cannot mutate the board during an earlier animation. */
export class FramePlayback<T> {
  private queue: T[] = [];
  private running = false;
  private generation = 0;
  constructor(private play: (frame: T) => Promise<void>, private failed: (error: unknown) => void,
    private observe?: (kind:'entry'|'start'|'finish'|'cancel'|'failed'|'drained',depth:number,frame?:T)=>void) {}
  push(frame: T): void { this.queue.push(frame);this.observe?.('entry',this.queue.length,frame);void this.drain(); }
  clear(): void { this.observe?.('cancel',this.queue.length);this.queue = []; this.generation++; }
  get pending(): boolean { return this.running || this.queue.length > 0; }
  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const generation = this.generation;
    try {
      while (this.queue.length && generation === this.generation) {
        const frame=this.queue.shift()!;this.observe?.('start',this.queue.length,frame);
        await this.play(frame);this.observe?.(generation===this.generation?'finish':'cancel',this.queue.length,frame);
      }
    } catch (error) { this.queue = [];this.observe?.('failed',0); this.failed(error); }
    finally { this.running = false; if (this.queue.length) void this.drain();else this.observe?.('drained',0); }
  }
}
