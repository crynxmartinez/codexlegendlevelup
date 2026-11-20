import { publicEffectTargets } from '../core/effect-presentation.js';
import type { CardInstance, GameState, PlayerId, PlayerState } from '../core/types.js';
import { newEventLog, canSee, type DuelEvent } from '../core/events.js';
import { decisionCards, type PendingDecision } from './decisions.js';
import { currentPower } from '../core/state.js';
import { MATCH_INDEX } from './catalog.js';

const zones = ['deck', 'hand', 'barriers', 'codex', 'heart', 'grave', 'exile', 'extra', 'allies'] as const;
const numbers = ['normalPlaysUsed','unitsDamagedByAbilityThisTurn','skillUsedThisTurn','extraAttackChecks','moltenSpikesTributeCount','lakeBuluanTributeCount','unitsOfferedThisTurn','firstOfferTurn','illanaBayActivatedTurn','illanaBayArmedTurn','trialDebtTurn','sipolThisTurn','sipolLastTurn','skyChurchRalliedThisTurn','spiritTokens'] as const;
const flags = ['codexSwitchedThisTurn','autoSwitchedThisTurn','switchedCodexLastTurn','barrierBrokenThisTurn','moltenSpikesUsed','lakeBuluanDefenseBonus','lakeBuluanCheckSwap','liguasanMarshUsedThisTurn','pursuitArmed','pulangiRiverFirstCallPending','personaChargedThisBattle','pendingPersonaCharge','personifiedThisTurn','andukha12Granted','amayaExtraSpiritUsed','spiritsGeneratedThisTurn'] as const;

/** Allowlisted read model, already oriented with the viewer at seat zero. */
export function playerView(game: GameState, viewer: PlayerId, decision: PendingDecision | null, events: DuelEvent[]): GameState {
  const seat = (p: PlayerId): PlayerId => p === viewer ? 0 : 1;
  // Commitment makes these hand cards public until battle cleanup. Every later
  // check/sync snapshot must retain them, not only onBlockersDeclared's frame.
  const publicDefenders = new Set(game.activeBattle?.blockers ?? []);
  const cards: Record<string, CardInstance> = {};
  const add = (uid: string): string => {
    const c = game.cards[uid]; if (!c) return uid;
    cards[uid] = { uid, defId: c.defId, owner: seat(c.owner), zone: c.zone, slot: c.slot,
      exhausted: c.exhausted, faceDown: c.faceDown, modifiers: c.modifiers.map(m => ({ amount:m.amount, duration:m.duration, source:m.source, sourceId:m.sourceId, origin:m.origin ? {...m.origin, owner:seat(m.origin.owner)} : undefined, cause:m.cause ? {...m.cause, owner:seat(m.cause.owner)} : undefined })),
      stack:c.stack, screen:c.screen, usesThisTurn:{...c.usesThisTurn}, relocatedThisTurn:c.relocatedThisTurn,
      screenWhileCharged:c.screenWhileCharged, breaking:c.breaking, wasOffered:c.wasOffered,
      zoneEntry:c.zoneEntry, fieldEntry:c.fieldEntry, grantedRepeat:c.grantedRepeat ? {...c.grantedRepeat} : undefined,
      sevenHeadsTurn:c.sevenHeadsTurn, sulaymanHitDrawTurn:c.sulaymanHitDrawTurn,
      firstAttackExtraCheckTurn:c.firstAttackExtraCheckTurn, firstAttackTakenTurn:c.firstAttackTakenTurn,
      skipCheckTurn:c.skipCheckTurn };
    return uid;
  };
  const visible = (uid: string, zone: string) => {
    const c = game.cards[uid]; if (!c || zone === 'deck' || zone === 'barriers') return false;
    if (zone === 'hand') return c.owner === viewer ||
      (c.owner === game.activeBattle?.defender && publicDefenders.has(uid));
    if (zone === 'codex') return c.owner === viewer || game.players[c.owner].activeCodex === uid || !c.faceDown;
    return !c.faceDown;
  };
  const players = [viewer, (1-viewer) as PlayerId].map(owner => {
    const p = game.players[owner];
    const out = { id:seat(owner), persona:p.persona ? add(p.persona) : null, activeCodex:p.activeCodex ? add(p.activeCodex) : null,
      releasedState:p.releasedState, autoSwitchTriggersUsed:[...p.autoSwitchTriggersUsed], forceCheckBias:0 } as PlayerState;
    for (const key of numbers) (out as unknown as Record<string, unknown>)[key] = p[key] ?? 0;
    for (const key of flags) (out as unknown as Record<string, unknown>)[key] = p[key] ?? false;
    for (const zone of zones) {
      const ids = p[zone].map((uid, i) => {
        if (!uid) return null;
        if (visible(uid, zone)) return add(uid);
        const hidden = `hidden-${seat(owner)}-${zone}-${i}`;
        cards[hidden] = { uid:hidden, defId:'__hidden__', owner:seat(owner), zone:game.cards[uid]!.zone, slot:null,
          exhausted:false, faceDown:true, modifiers:[], stack:1, screen:false, usesThisTurn:{}, relocatedThisTurn:false, screenWhileCharged:false };
        return hidden;
      });
      (out as unknown as Record<string, unknown>)[zone] = ids;
    }
    return out;
  }) as [PlayerState, PlayerState];
  if (decision?.owner === viewer) for (const uid of decisionCards(decision)) add(uid);
  for (const c of Object.values(game.cards)) if (c.zone === 'check' && !c.faceDown) add(c.uid);
  const chain = game.responseChain;
  if (chain) for (const link of chain.links) {
    add(link.source);
    for (const uid of link.targets ?? []) if (game.cards[uid] && visible(uid, game.cards[uid]!.zone)) add(uid);
  }
  const log = newEventLog();
  log.events = events.filter(e => canSee(e, viewer)).map(e => {
    const concealed=new Map((e.movements??[]).filter(m=>m.hidden&&m.owner!==viewer).map((m,i)=>[m.uid,`hidden-event-${e.id}-${i}`]));
    return { ...structuredClone(e), actor:e.actor === null ? null : seat(e.actor),
    sourceUids:e.sourceUids.filter(uid=>!concealed.has(uid)),targetUids:e.targetUids.filter(uid=>!concealed.has(uid)),
    message:e.message.replace(/Player ([01])/gi,(_match,id:string)=>`Player ${seat(Number(id) as PlayerId)}`),
    movements:e.movements?.map(m => ({...m, uid:concealed.get(m.uid)??m.uid, owner:seat(m.owner)})),
    changes:e.changes?.map(c => ({...c, owner:c.owner === undefined ? undefined : seat(c.owner)})),
  };});
  return { cards, players, rulesRevision: game.rulesRevision,
    responseChain: chain ? { id: chain.id, revision: chain.revision, phase: chain.phase, cursor: chain.cursor,
      responseOwner: chain.responseOwner === null ? null : seat(chain.responseOwner),
      links: chain.links.map(link => ({ id: link.id, owner: seat(link.owner), source: link.source, skillId: link.skillId,
        label: link.label, ordinal: link.ordinal, status: link.status, sourceZone: link.sourceZone,
        targets: publicEffectTargets(game, link),
        declared: (link.declared ?? []).map(choice => ({ prompt: '', many: choice.many, targets: choice.targets.filter(t => publicEffectTargets(game, link).includes(t.uid)) })) })) } : null,
    viewPowers:Object.fromEntries(Object.keys(cards).filter(uid=>!!game.cards[uid]).map(uid=>[uid,currentPower(MATCH_INDEX,game,uid)])), turnPlayer:seat(game.turnPlayer), phase:game.phase, turnNumber:game.turnNumber,
    winner:game.winner === null ? null : seat(game.winner), winReason:game.winReason,
    rngSeed:0, checkCount:0, log:log.events.map(e => e.message), logCards:log.events.map(e => e.sourceUids.filter(uid=>!!cards[uid])), duel:log,
    activeBattle:game.activeBattle ? {...structuredClone(game.activeBattle), defender:seat(game.activeBattle.defender)} : null,
    pendingTokenCreated:[], pendingDamageByAbility:[], pendingSpiritGeneration:[], pendingSpecialCalls:[], pendingOfferRecall:[], pendingFx:[],
    activeRules:game.activeRules.map(r=>({label:r.label,owner:seat(r.owner),expires:r.expires,ownerForExpiry:seat(r.ownerForExpiry)})),
  };
}
