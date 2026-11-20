import { setupShell, dicePresentation, showDie, setupPortrait } from './match-setup.js';
import { presentSetupInspection } from './setup-inspection.js';
import { presentMenuDialog } from './utility-presentation.js';
import { ClarityTracker, destinationLabel } from './clarity-cues.js';
import { DEFAULT_BATTLEFIELD, applyBattlefieldPresentation, requestedPresentation, animePortrait, createAnimeChrome, phaseDisplayName, type BattlefieldPresentation } from './battlefield-presentation.js';
import './anime-battlefield.css';
import './player-identity.css';
import './desktop-dialogs.css';
import './decision-layout.css';
import './modal-system.css';
import { presentModalSections } from './modal-sections.js';
import { animateDeckDraw } from './draw-motion.js';
import { animateSupportLink, clearCombatGuide, combatResultLabel, updateCombatGuide } from './combat-clarity.js';
import { inputCopy, inputMode } from './input-copy.js';
import { readableRules } from './card-info.js';
import { createStatSymbol, statSymbolMarkup, type StatSymbol } from './stat-symbols.js';
import { placeTutorialGuide, visibleTutorialAnchor } from './tutorial-guide.js';
import './tutorial-guide.css';
import { mountKeywordHelp } from './keyword-help.js';
import { LegacyPileMoves } from '../pvp/legacy-pile-moves.js';
import { animateEffectSource, animatePileJourney } from './source-motion.js';
import { playSpecialCallRing } from './special-call-ring.js';
import { LegacyAttack } from '../pvp/legacy-attack.js';
import { triggerReason, markAvailableEffects, canEndWithNoActions } from './available-effects.js';
import { groupModifiers, originLabel, modifierSource, signedPower, type ModGroup } from './effect-provenance.js';
import { createPowerDetails, fitPowerDetails, powerDetailsModel, type PowerDetailsContext } from './power-details.js';
import './power-details.css';
import { offerPreview } from './offer-preview.js';
import { mountTitle, type MenuAction, type ActiveDeckContext } from './title-screen.js';
import { resolveActiveSelection, activeDeckContext } from './active-deck-context.js';
import { LocalMatchRecording, recordingUnavailable } from './local-match-recording.js';
import type { StoredReplay } from './replay-store.js';
import './match-review-polish.css';
import { presentMatchResult } from './match-result-presentation.js';
import { presentDeckShelf, presentOptions, type ShelfPresentationState } from './menu-destination.js';
import { deckViewModel } from './deck-view-model.js';
import { presentDeckViewer } from './deck-view.js';
import { presentRefinedBuilder, presentArchipelago, deckReadiness } from './deck-presentation.js';
import { destinationReady, menuNavigate } from './menu-transition.js';
import { menuProfile, randomAiFighter, type MenuFighter } from './menu-profile.js';
import { cardLore } from './card-lore.js';
import { prepareDuelArt, duelAssetUrls } from './duel-loading.js';
import { weightedSelectionTotal } from '../core/selection-weight.js';
import { syncChildren } from './stable-dom.js';
import { syncCardHud } from './card-hud.js';
import './card-hud.css';
import { cardStatBadges, createCardStatBadge, createCardStatBadges, compactCardStat } from './card-stats.js';
import './card-stats.css';
import './card-stat-surfaces.css';
import { mountJourney } from './journey-menu.js';
import { readJourney, startJourney, completeJourney, journeyUrl, legacyJourneyChapter, validRegion, JOURNEY_ENCOUNTER_COUNTS, journeyEncounterKey, type JourneyChapter } from './journey-progress.js';
import { createJourneyFixture, JourneySession, journeyOpponent, journeyHuman, playJourneyOpponent } from './journey-battle.js';
import { TUTORIAL_DECKS, type TutorialRegion } from '../core/tutorial-decks.js';
import { skillStatus } from './skill-status.js';
import { matchHighlights, finalExchange } from './match-review.js';
import { ActionRecapTracker, showActionRecap, clearActionRecap, duelActivity, readyAttackHint, mountDuelActivity } from './duel-clarity.js';
import { localDecisionPending, trackDecisionActivity } from './decision-activity.js';
import { measureGameplay, performanceReport } from './performance-check.js';
import { chainSummary, chainProgress } from './chain-status.js';
import { GrantedSkillTracker, EffectExpiryTracker, fadeEndedEffect } from './effect-feedback.js';
import { PowerCueTracker, PhaseCueTracker, phaseCueKey, presentPowerCue, presentPhaseCue } from './combat-emphasis-cues.js';
import './combat-emphasis-cues.css';
import { shatterBarrier, shatterUnit, captureUnitGlass } from './barrier-shatter.js';
import { barrierSlots } from './barrier-layout.js';
import { publicEffectTargets, effectOutcomeLabel } from '../core/effect-presentation.js';
import { abilityChoices } from './ability-choices.js';
import { presentChainCue, clearChainCues } from './chain-cue.js';
import { cardDisplayName } from './card-name.js';
import { animateHeartMove } from './heart-motion.js';
import { animateHandMove, handMoveDestination } from './hand-motion.js';
import { playCodexSwap } from './codex-swap.js';
import { RemoteController, openPrivateRoom } from '../pvp/client.js';
import { openDeckLearning, MECHANICS } from './deck-learning.js';
import { prepareFirstBattle, firstBattleChooser, firstBattleMoves } from './first-battle.js';
import { FirstBattleSession, readFirstBattleProgress, resetFirstBattleProgress } from './first-battle-session.js';
import { NextBattleSession, nextBattleHint, nextBattleOpponent, playNextBattleTurn, defenseHelp } from './next-battle.js';
import { createSimpleSkills, SimpleSkillsSession, playSimpleSkillsOpponent } from './next-battle.js';
import { createTutorialProfile, tutorialDeck, tutorialAttackPreview } from '../core/tutorial-rules.js';
import { zoneCardVisible, concealedCard, codexSwitchInstruction } from './zone-viewer.js';
import { fieldPosition, grantedSkills, grantedSkillText } from './field-card-info.js';
import { animateOpeningHands } from './opening-deal.js';
import { CardTransit, attackWindup, attackMotion, waitForAttackRotation, batchDelay, captureHand, settleHand, flyCard, playMotion, finishDuelMotion, holdDuelMotion, motionDuration, motionReduced, motionEpoch } from './duel-motion.js';
import { getPersonaAttackProfile } from './boss-attack-profiles.js';
import { playBossAttack, preloadBossAttack } from './boss-attack-motion.js';
import { playPersonaImpact } from './persona-impact.js';
import './boss-attack-assets.js';
import { mountDuelPanel, duelDecisionPending, registerPanelInspection, registerPresentationControl } from './duel-panel.js';
import { upgradeCardArt, warmCardArt } from './card-art-cache.js';
import { skillConfirmation } from './skill-confirmation.js';
import { confirmActionCast } from './action-cast.js';
import { openCardChoice, closeCardBrowsers, ventSelectionSummary, type ChoiceCard } from './card-choice.js';
import { previewDefense, type DefensePreviewInput } from './defense-comparison.js';
import { stateReadout } from './state-readout.js';
const showEffectsPreview = async (art: string, onClose?: () => void) => (await import('./effects-preview.js')).showEffectsPreview(art, onClose);
import { presentNotice, clearPresentationNotices } from './presentation-notice.js';
import { tracePresentation, traceExposure, traceContext, traceDecisionAvailability } from './presentation-diagnostics.js';
/**
 * Codex Legends - MVP client.
 *
 * Flow: dice roll -> pick Persona -> pick Codex -> play vs AI.
 * Right-clicking any card opens a full-size inspect panel showing the card data.
 */
import agtaDeckJson from '../../decks/agta-set-1.json' with { type: 'json' };
import maguindanaoDeckJson from '../../decks/maguindanao-set-1.json' with { type: 'json' };
import babaylanDeckJson from '../../decks/babaylan-set-1.json' with { type: 'json' };
import { indexForDecks, isSelectableCard, type CardRecord } from '../data/loader.js';
import { DISPLAY_CARDS as ALL_CARDS, displayRuleText, cardSearchText } from '../localization/display.js';
import {
  createGame,
  validatePlayableDeck,
  personaChoices,
  rollForFirst,
  type DeckList,
} from '../core/setup.js';
import { makeRng } from '../core/rng.js';
import { DuelAudit } from '../core/duel-audit.js';
import {
  GameController,
  ALL_SCRIPTS,
  type BattleHooks,
  type PlayerAction,
} from '../core/game.js';
import { AiChooser, playAiTurn } from '../ai/bot.js';
import { AI_HARD, AI_NORMAL, type AiProfile } from '../ai/evaluate.js';
import { availableSupporters } from '../core/battle.js';
import {
  currentPower, def, inst, maxPlays, personaLevel, you,
  passiveBonuses,
} from '../core/state.js';
import { handCount } from '../core/handcount.js';
import { SLOT_LABELS, CANCEL_DRAFT, type ChooseTargetOptions } from '../core/effects.js';
import type {
  AbilityOption, BattleWindowInfo, BlockWindowInfo, Chooser, ChooseCardsOptions,
} from '../core/effects.js';
import { BARRIER_COUNT } from '../core/types.js';
import type { PassiveBonus } from '../core/state.js';
import type { FxEvent, FxZone, GameState, ModifierDuration, Phase, PlayerId, PowerModifier } from '../core/types.js';
import { artUrl, boardUrl, CARD_BACK } from './assets.js';
import { escapeHtml, formatCardText, formatSkillText, markKeywords } from './glossary.js';
import { LegacyRemotePresentation } from './legacy-remote-presentation.js';
import {
  activeDeckId, deleteDeck, fromCode, loadDecks, readDeckCollection,
  MAX_DECK_NAME_LENGTH, newDeckId, saveDeck, setActiveDeck, toCode, type StoredDeck,
} from './decklib.js';
import {
  checkDeck, deckSize, copyLimit,
  DECK_SIZE, CODEX_COUNT, FORCE_COUNT, MAX_SENTRY, PERSONA_LEVEL,
} from '../core/deckcheck.js';
import { aimFrom, mountTargetArrow, refreshAim } from './arrow.js';
import {
  applySettingsToDocument, loadSettings, setSetting, settings,
  SETTING_LABELS, type PromptFrequency, type AiDifficulty,
} from './settings.js';
import { initAudio, playCue, setSoundscape, duckMusic, preloadAudio, auditionCombatSounds } from './sfx.js';
const openCredits = async () => (await import('./credits.js')).openCredits();
import { deckTheme, feedbackAt, selectionLabel, spectacleDuration, highlightEffectTarget } from './battle-feedback.js';
import {
  initGlFx, glStrike, glDestroy, glArrive, glWard, glRestore,
  glImpact, glStateRelease, glResource,
} from './fx-gl.js';
import { playCutscene, resetCutscenes, preloadCutscenes } from './cutscene.js';
import {
  clearTips,
} from './tutorial.js';
import { TutorialSession } from './tutorial-mode.js';
import { mountFeedback, openFeedback, setFeedbackVisible } from './feedback.js';
import type { DevLogDeps } from './devlog.js';
const openDevLog = async (deps: DevLogDeps) => (await import('./devlog.js')).openDevLog(deps);
import { DuelHud } from './duel-hud.js';
import { PresentationQueue, needsResultPresentation, announceNativeResults, aiThinkTime } from './presentation.js';
import { canSee, eventLogOf, lastVisibleGroup } from '../core/events.js';
import { entryForGroup, buildTimeline } from './timeline.js';
import { explainCard } from '../core/availability.js';
import { PACE_DESCRIPTIONS, waitFor, type DuelPace } from './pace.js';
// Approved compact modal presentation; the existing controllers own every choice.
import './compact-modal.css';
import './compact-modal-utilities.css';
import './compact-modal-board.css';

/** All available decks, keyed by name. */
const DECKS: Record<string, DeckList> = {
  Agta: agtaDeckJson as unknown as DeckList,
  Maguindanao: maguindanaoDeckJson as unknown as DeckList,
  Babaylan: babaylanDeckJson as unknown as DeckList,
};

/** Combined card index covering every available deck. */
const normalIndex = Object.fromEntries(Object.entries(indexForDecks(Object.keys(DECKS))).filter(([id]) => isSelectableCard(ALL_CARDS[id]!) || ALL_CARDS[id]!.type === 'Token'));
// Only the current board's presentation uses its cloned training definitions.
// The catalogue, saved decks and normal controllers always use normalIndex.
let index = normalIndex;
let presentationScripts = ALL_SCRIPTS;
const TRAINING_NOTICE = 'These cards use simplified tutorial effects. Normal matches use their regular abilities. This training deck has two Codex; normal decks use five.';
const app = document.getElementById('app')!;

const HUMAN: PlayerId = 0;
const AI: PlayerId = 1;

// ---------------------------------------------------------------- utilities

/**
 * A board lookup that found nothing, said once.
 *
 * Every one of these animations falls back to a plausible-looking rect when
 * its element is missing, which is the right call in play — a card flying
 * from slightly the wrong place beats a card that teleports. It is the wrong
 * call in development, because a selector that has stopped matching then
 * looks exactly like one that works. Deduplicated by key so a lookup inside a
 * per-frame path cannot flood the console.
 */
/**
 * Keep a flight's endpoint on screen.
 *
 * A zone can be real, correctly found, and still outside the viewport: the
 * board column is taller than a short window, so `.mats` clips and the
 * opponent's hand is pushed above the top edge — measured at y = -72 in an
 * 800px-tall window. Flying a card to its true rect then means flying it off
 * the screen, which reads as the card evaporating. Clamping the centre to the
 * visible area sends it to the edge it left through instead, which is both
 * honest about the direction and visible.
 */
function clampRect(r: DOMRect, margin = 8): DOMRect {
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const nx = Math.min(Math.max(cx, margin + r.width / 2), window.innerWidth - margin - r.width / 2);
  const ny = Math.min(Math.max(cy, margin + r.height / 2), window.innerHeight - margin - r.height / 2);
  if (nx === cx && ny === cy) return r;
  return new DOMRect(nx - r.width / 2, ny - r.height / 2, r.width, r.height);
}

const warnedMissing = new Set<string>();
function warnMissing(what: string): void {
  if (!import.meta.env?.DEV) return;
  if (warnedMissing.has(what)) return;
  warnedMissing.add(what);
  console.warn(`[fx] no element for ${what} — falling back to an approximate position`);
}

/**
 * The player's own hand card for a uid.
 *
 * Four animations used to find this by comparing background-image URLs, which
 * identifies the card's *art*, not the card. Holding two copies of anything
 * meant all of them fired from the leftmost copy, so Offering or revealing the
 * second copy lifted the wrong card off the bar. The uid is stamped on the
 * node now, so the lookup asks for the card it actually means.
 */
function handCardNode(uid: string): HTMLElement | null {
  const n = document.querySelector(`.hand-card[data-uid="${uid}"]`);
  if (!n) warnMissing(`hand card ${uid}`);
  return n as HTMLElement | null;
}

const el = (tag: string, cls?: string, html?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

function recordOf(game: GameState, uid: string): CardRecord {
  const record = ALL_CARDS[game.cards[uid]!.defId] ?? hiddenCard;
  return game.rulesProfile === 'tutorial-v1' ? trainingRecord(record) : record;
}

function trainingRecord(record: CardRecord): CardRecord {
  const definition = index[record.id];
  // Preserve the chosen language for names and all existing art metadata.
  return definition?.tutorial ? { ...record, ...definition, name: record.name,
    text: definition.abilities.map(ability => ability.text).join('\n') } : record;
}

const hiddenCard: CardRecord = { id:'__hidden__', name:'Hidden card', text:'', flavor:'', type:'Unit', guild:'Ala Rasi', deck:'', guildPrinted:'', artist:null, level:0, power:0, defense:0, subtypes:[], abilities:[], art:'', thumb:'' };
index.__hidden__ = hiddenCard;

/**
 * Left flank, then the units, then the right flank. See renderMat.
 *
 * The Barriers are not in either list, and that is the point: they stay a
 * direct child of the mat so the stylesheet can give them a column of their
 * own at the outer edge. Inside the right flank they were one more chip in a
 * stack of chips - the life total reading as another reference pile.
 */
const MAT_LEFT = ['z-extra', 'z-codex', 'z-exile'];
const MAT_RIGHT = ['z-check', 'z-deck', 'z-grave'];

/**
 * Move a mat's flanking zones into two stacks, so the grid can be one row.
 *
 * Called after the mat is built rather than while building it, so the desktop
 * path is untouched and there is exactly one description of what the mat
 * contains.
 */
function gatherSides(mat: HTMLElement): void {
  const left = el('div', 'mat-side left');
  const right = el('div', 'mat-side right');
  for (const [names, into] of [[MAT_LEFT, left], [MAT_RIGHT, right]] as const) {
    for (const cls of names) {
      const node = mat.querySelector(`:scope > .${cls}`);
      if (node) into.appendChild(node);
    }
  }
  mat.insertBefore(left, mat.firstChild);
  mat.appendChild(right);
}

/** Move the real shield nodes, so shattering and Check flights share the HUD. */
function placeBarrierIndicators(): void {
  for (const foe of [false, true]) {
    const mat = document.querySelector(foe ? '.mat.foe' : '.mat:not(.foe)');
    const side = document.querySelector(foe ? '.side.foe' : '.side.mine');
    const bar = mat?.querySelector('.z-barrier') ?? side?.querySelector('.z-barrier');
    const holder = compactLayout() && !document.body.classList.contains('anime-battlefield')
      ? side?.querySelector('header') : mat;
    if (bar && holder && bar.parentElement !== holder) holder.appendChild(bar);
  }
}

// ------------------------------------------------------- card inspect panel

/**
 * Right-click any card to inspect it. The panel shows the card data.
 *
 * Dismiss with a click anywhere, Escape, or another right-click.
 */
let inspectEl: HTMLElement | null = null;
let inspectedRecord: string | null = null;
let inspectCleanup: (() => void) | null = null;

function hideInfo() {
  const read = inspectedRecord;
  inspectedRecord = null;
  inspectEl?.remove();
  inspectEl = null;
  inspectCleanup?.();
  inspectCleanup = null;
  if (read) activeBoard?.onTutorialCardRead(read);
}

interface CardInspectionContext {
  cards: CardRecord[];
  quantity?: (id: string) => number;
  limit?: (id: string) => number;
  label?: string;
  /** Retain the originating control across Previous / Next navigation. */
  returnFocus?: HTMLElement | null;
}
function showInfo(rec: CardRecord, mods?: PowerModifier[], uid?: string, play?: { enabled: boolean; run: () => void }, onClose?: () => void, context?: CardInspectionContext) {
  hideInfo();
  hideModPopover();
  rec = trainingRecord(rec);

  const typeLine = cardTypeLine(rec);
  const stats: string[] = [];
  const inspectedGame = activeBoard?.game;
  const instance = uid ? inspectedGame?.cards[uid] : undefined;
  const onField = instance && (instance.zone === 'ally' || instance.zone === 'persona');
  const power = onField && inspectedGame && uid ? currentPower(index, inspectedGame, uid) : rec.power;
  const isUnit = rec.id !== '__hidden__' && (rec.type === 'Unit' || rec.type === 'Force');
  if (isUnit) {
    stats.push(statChip('Level', String(rec.level)));
    stats.push(statChip(onField ? 'Current Power' : 'Power', power.toLocaleString(), 'power'));
    stats.push(statChip('Defense contribution', rec.defense.toLocaleString(), 'defense'));
  }

  // Play style blurb for Persona (lvl 3 Unit) cards.
  // The deck name is the prefix of the card id (e.g. "agta/..." → "Agta").
  const deckName = rec.id.split('/')[0] ?? '';
  const deckKey = deckName.charAt(0).toUpperCase() + deckName.slice(1);
  const playStyle = !rec.tutorial && !rec.effectsPending && rec.type === 'Unit' && rec.level === 3
    ? DECK_PLAY_STYLES[deckKey] ?? ''
    : '';

  // Build modifier chips HTML for the inspect panel.
  let modChipsHtml = '';
  if (mods && mods.length > 0) {
    const groups = groupModifiers(mods);
    modChipsHtml = '<div class="inspect-mods">';
    for (const g of groups) {
      const isBuff = g.amount >= 0;
      const sign = isBuff ? '+' : '';
      const arrow = isBuff ? '▲' : '▼';
      const cls = isBuff ? 'buff' : 'debuff';
      const count = g.count > 1 ? ` ×${g.count}` : '';
      modChipsHtml += `<div class="inspect-mod-chip ${cls}" data-amount="${g.amount}" data-source="${escapeHtml(g.source)}" data-duration="${escapeHtml(DURATION_LABELS[g.duration])}" data-count="${g.count}">${arrow} ${sign}${g.amount / 1000}k${count}</div>`;
    }
    modChipsHtml += '</div>';
  }

  const overlay = el('div', 'inspect-bg');
  const live = uid ? activeBoard?.inspectionDetails(uid) : '';
  overlay.innerHTML = `
    <div class="inspect">
      <img class="art" src="${boardUrl(rec.art)}" alt="${escapeHtml(rec.name)}">
      <div class="body">
        <div class="hd">
          <div class="nm">${escapeHtml(rec.name)}</div>
          ${rec.tutorial ? '<span class="tutorial-version-label">Tutorial version</span>' : ''}
          ${rec.set === 'set-1' ? '<span class="card-set-tag">Set 1</span>' : ''}
          ${rec.archipelago ? `<div class="ty">${escapeHtml(rec.archipelago)} · ${markKeywords(rec.deck)}</div>` : ''}
          <div class="ty">${markKeywords(typeLine)}</div>
        </div>
        ${stats.length ? `<div class="stats">${stats.join('')}</div>` : ''}
        ${modChipsHtml}
        ${live ?? ''}
        ${rec.effectsPending ? '<p class="builder-note">No effects yet.</p>' : ''}
        ${rec.text ? `<div class="text">${readableRules(rec.text)}</div>` : ''}
        ${rec.tutorial ? `<p class="tutorial-rules-note">${TRAINING_NOTICE}</p>` : ''}
        ${playStyle ? `<details class="inspect-extra"><summary>Deck guide</summary><div class="play-style">${playStyle}</div></details>` : ''}
        <details class="inspect-extra"><summary>Card details</summary>
          <p class="subtle">Use the rules above when printed artwork has older wording.</p>
          ${rec.guild ? `<p>${escapeHtml(rec.guild)} Guild</p>` : ''}
          ${power !== rec.power ? `<p>Printed Power: ${rec.power.toLocaleString()}</p>` : ''}
          ${rec.flavor ? `<div class="flavor">“${escapeHtml(rec.flavor)}”</div>` : ''}
          ${rec.artist ? `<div class="artist">Illustration: ${escapeHtml(rec.artist)}</div>` : ''}
        </details>
        <div class="dismiss">${inputCopy('Click outside the information panel to close')}</div>
      </div>
    </div>
  `;
  upgradeCardArt(overlay.querySelector<HTMLImageElement>('.art')!, artUrl(rec.art));
  // Wire right-click on inspect modifier chips to show source popover.
  if (mods && mods.length > 0) {
    const chipEls = overlay.querySelectorAll('.inspect-mod-chip');
    const groups = groupModifiers(mods);
    chipEls.forEach((chipEl, i) => {
      chipEl.addEventListener('contextmenu', e => showModPopover(e as MouseEvent, groups[i]!));
    });
  }

  const priorFocus = context?.returnFocus ?? document.activeElement as HTMLElement | null;
  let changingCard = false;
  const lore = cardLore(rec.id);
  if (lore) overlay.querySelector('.dismiss')!.before(lore);
  const close = el('button', 'inspect-close', 'Close');
  close.setAttribute('aria-label', 'Close card information');
  close.onclick = e => { e.stopPropagation(); hideInfo(); priorFocus?.focus({ preventScroll: true }); };
  overlay.querySelector('.body')!.prepend(close);
  const setup = document.querySelector<HTMLElement>('.match-setup.pick-screen');
  const board = document.querySelector<HTMLElement>('.board-wrap');
  if (setup && !play) {
    inspectCleanup = presentSetupInspection(overlay, setup, close as HTMLButtonElement);
  } else if (board) {
    inspectCleanup = presentSetupInspection(overlay, document.getElementById('app') ?? board, close as HTMLButtonElement, {
      context: 'During battle', back: play ? 'Back to hand' : 'Back to battle',
      note: duelDecisionPending() ? 'Returns to your pending choice.' : 'Read the card, then return to battle.',
      duel: true,
      location: instance ? {
        label: instance.zone === 'persona' ? (instance.owner === HUMAN ? 'Your Persona' : "Opponent's Persona")
          : fieldPosition(instance, HUMAN) ?? `${instance.owner === HUMAN ? 'Your' : "Opponent's"} ${instance.zone}`,
        state: onField ? (instance.exhausted ? 'Exhausted' : 'Charged') : undefined,
      } : undefined,
    });
  } else if (!play) {
    const parent = document.querySelector<HTMLElement>('.devlog-bg, .deck-refined, .shelf-screen, .pvp-lobby, .deck-catalogue');
    if (parent) inspectCleanup = presentSetupInspection(overlay, parent, close as HTMLButtonElement, {
      context: context?.label ?? (parent.matches('.devlog-bg') ? 'Patch notes' : parent.matches('.pvp-lobby') ? 'Match setup' : 'Deck library'),
      back: context?.label === 'Decklist' ? 'Back to Decklist' : 'Back', note: 'Returns to your selected card.',
    });
  }
  if (overlay.classList.contains('setup-inspection')) {
    for (const chip of Array.from(overlay.querySelectorAll<HTMLElement>('.chipstat'))) {
      const label = chip.querySelector('span')!;
      if (label.textContent === 'Level') { chip.remove(); continue; }
      const defense = label.textContent === 'Defense contribution';
      chip.classList.add(defense ? 'inspect-defense' : 'inspect-power');
      label.textContent = defense ? 'DEF' : 'ATK';
      label.prepend(createStatSymbol(defense ? 'defense' : 'power'));
    }
    const type = overlay.querySelector('.ty');
    if (type && isUnit) type.prepend(document.createTextNode(`Level ${rec.level} · `));
    // The region/deck already appears in the first metadata line. In the
    // compact duel reader, avoid repeating that subtype beside it.
    if (overlay.classList.contains('duel-inspection')) {
      const typeLines = overlay.querySelectorAll('.ty');
      if (typeLines.length > 1) {
        const repeated = new Set([rec.deck, rec.archipelago, `${rec.archipelago} Arch`]);
        typeLines[typeLines.length - 1]!.innerHTML = markKeywords(typeLine.split(' / ').filter(tag => !repeated.has(tag)).join(' / '));
      }
    }
    const statsRow = overlay.querySelector('.stats');
    const powerNote = onField
      ? `Current Power${power !== rec.power ? ` · Printed ATK ${rec.power.toLocaleString()}` : ''}`
      : 'Printed values';
    if (statsRow) statsRow.after(el('p','inspect-stat-note',`${powerNote} · DEF is defense contribution`));
    if (context?.quantity) {
      const quantity = el('div','setup-inspect-quantity',`In this deck ×${context.quantity(rec.id)}${context.limit ? ` / Limit ${context.limit(rec.id)}` : ''}`);
      overlay.querySelector('.setup-inspect-art')!.append(quantity);
    }
    if (context && context.cards.length > 1) {
      const navigation = el('nav','setup-inspect-navigation');navigation.setAttribute('aria-label','Cards in this list');
      const at = context.cards.findIndex(card => card.id === rec.id);
      const move = (direction: number) => {
        const next = context.cards[at + direction];if(!next)return;
        changingCard = true;
        showInfo(next, undefined, undefined, undefined, onClose, {...context, returnFocus: priorFocus});
        const target = inspectEl?.querySelector<HTMLButtonElement>(direction<0?'.inspect-previous':'.inspect-next');
        (target&&!target.disabled?target:inspectEl)?.focus({preventScroll:true});
      };
      const previous = el('button','inspect-previous','‹ Previous') as HTMLButtonElement;
      const next = el('button','inspect-next','Next ›') as HTMLButtonElement;
      previous.disabled = at <= 0;next.disabled = at < 0 || at >= context.cards.length - 1;
      previous.onclick = () => move(-1);next.onclick = () => move(1);
      navigation.append(previous,el('span','',`${at+1} / ${context.cards.length}`),next);
      overlay.querySelector('.setup-inspect-footer')!.prepend(navigation);
      overlay.addEventListener('keydown',event=>{
        if(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)return;
        if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowLeft'?-1:1);}
      });
    }
  }
  if (onClose) {
    const cleanup = inspectCleanup;
    inspectCleanup = () => { cleanup?.(); if(!changingCard)onClose(); };
  }
  if (play) {
    const button = el('button', 'primary', play.enabled ? 'Play card' : 'Not playable now') as HTMLButtonElement;
    button.disabled = !play.enabled;
    button.onclick = e => { e.stopPropagation(); hideInfo(); play.run(); };
    const footer = overlay.querySelector('.setup-inspect-footer');
    if (footer) {
      footer.classList.add('inspect-play-footer');
      footer.append(button);
    } else {
      const actions = el('div', 'inspect-play-actions');
      const back = el('button', undefined, 'Back to hand');
      back.onclick = e => { e.stopPropagation(); hideInfo(); priorFocus?.focus({ preventScroll: true }); };
      actions.append(back, button);
      overlay.querySelector('.body')!.append(actions);
    }
  }
  overlay.tabIndex = -1;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', rec.name);
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('.stat-tip.show')) { e.preventDefault(); e.stopPropagation(); hideInfo(); priorFocus?.focus(); }
    if (e.key === 'Tab') {
      const controls = Array.from(overlay.querySelectorAll<HTMLElement>('button, summary, [tabindex="0"], details[open] a')).filter(node => node.getClientRects().length > 0 && !node.matches(':disabled,[aria-disabled="true"],[hidden]'));
      const at = controls.indexOf(document.activeElement as HTMLElement);
      e.preventDefault(); controls[(at + (e.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    }
  });
  overlay.addEventListener('click', e => { if(e.target instanceof Element && e.target.closest(overlay.classList.contains('setup-inspection') ? '.inspect' : '.body'))return; hideInfo(); hideModPopover(); priorFocus?.focus(); });
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); hideInfo(); hideModPopover(); priorFocus?.focus({ preventScroll: true }); });
  document.body.appendChild(overlay);
  inspectEl = overlay;
  inspectedRecord = rec.id;
  overlay.focus();
}

function statChip(label: string, value: string, symbol?: StatSymbol): string {
  return `<div class="chipstat"><span${symbol ? ' class="stat-symbol-label"' : ''}>${symbol ? statSymbolMarkup(symbol) : ''}${markKeywords(label)}</span><b>${value}</b></div>`;
}


function cardTypeLine(rec: CardRecord): string {
  const tags = rec.deck === 'Maguindanao'
    ? rec.subtypes.filter(s => s !== rec.guild).map(s => s === 'Maguindanaon' ? 'Maguindanao' : s)
    : [rec.subtypes[0]];
  return [...new Set(tags), prettyType(rec.type)].filter(Boolean).join(' / ');
}

function prettyType(t: string): string {
  return ({ Unit: 'Unit', Sentry: 'Sentry Action',
            Action: 'Normal Action' } as Record<string, string>)[t] ?? t;
}

/**
 * What the Dev Log needs from here.
 *
 * Handed over rather than imported: main.ts imports devlog.ts to open the log,
 * so devlog.ts importing back would be a cycle. `attachInspect` already binds
 * both gestures — right-click on a mouse, long-press on a touch screen — so a
 * card in a patch note is read exactly the way a card on the board is.
 */
function devLogDeps(): DevLogDeps {
  return { makeReadable: attachInspect, readVerb };
}

/** How the player is told to read a card, in the terms their device offers. */
const readVerb = (): string => inputCopy('Right-click');

/**
 * Long-press: long enough not to fire on a tap, short enough not to feel
 * broken. Movement past the tolerance is a scroll or a drag, not a press.
 */
const LONG_PRESS_MS = 450;
const PRESS_SLOP_PX = 10;

/**
 * What each inspectable node shows, kept beside the node rather than captured
 * in its listeners — so re-attaching on a re-render updates the data without
 * adding a second set of listeners to a node that outlives the render.
 */
const inspectData = new WeakMap<HTMLElement, { rec: CardRecord; mods?: PowerModifier[] }>();
const inspectWired = new WeakSet<HTMLElement>();

/**
 * A long-press has to eat the click that follows it.
 *
 * Lifting a finger after a press still produces a click, and on a hand card
 * that click plays the card — so reading a card before playing it would play
 * it. One capture-phase listener, installed once, swallows exactly that click.
 */
let swallowNextClick = false;
let swallowTimer: number | null = null;
function armClickSwallow(): void {
  swallowNextClick = true;
  if (swallowTimer !== null) clearTimeout(swallowTimer);
  // If no click arrives — the finger went up somewhere else — the arm must not
  // survive to eat an unrelated click later.
  swallowTimer = window.setTimeout(() => { swallowNextClick = false; }, 700);
}
document.addEventListener('click', (e) => {
  if (!swallowNextClick) return;
  swallowNextClick = false;
  e.preventDefault();
  e.stopPropagation();
}, true);

/**
 * Read a card: right-click with a mouse, long-press with a finger.
 *
 * Applied to every card element on screen. This was `oncontextmenu` alone,
 * which is a mouse-only event — there is no right-click on a phone, and iOS
 * answers a long press with its own selection callout rather than a
 * `contextmenu` event. So on touch there was no way at all to read a card's
 * rules text, while 22 places in the interface told the player to right-click.
 *
 * Long-press is documented as a gesture users do not discover on their own.
 * That objection is about gestures nothing tells you about; here the prompts
 * that used to say "right-click" say "long-press" on a coarse pointer, so the
 * instruction is already on screen wherever it matters.
 */
function attachInspect(node: HTMLElement, rec: CardRecord, mods?: PowerModifier[]) {
  registerPanelInspection(node, () => showInfo(rec, mods, node.dataset.uid));
  inspectData.set(node, { rec, mods });
  node.setAttribute('aria-label', rec.name);
  node.title = `${rec.name} · ${readVerb()} to see info`;
  if (!(node instanceof HTMLButtonElement)) {
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
  }

  // Assignment, not addEventListener: board cards are reused across renders,
  // so a listener added each time would stack up.
  node.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showInfo(rec, mods, node.dataset.uid);
  };

  // The pointer listeners cannot be assigned — `onpointerdown` is already
  // spoken for on hand cards — so they are added once per node and read the
  // card out of the map above, which the line at the top keeps current.
  if (inspectWired.has(node)) return;
  inspectWired.add(node);
  node.addEventListener('keydown', (e) => {
    if (e.target !== node) return;
    if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
      e.preventDefault();e.stopPropagation();
      const info=inspectData.get(node);if(info)showInfo(info.rec,info.mods,node.dataset.uid);
    } else if (!(node instanceof HTMLButtonElement) && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();e.stopPropagation();node.click();
    }
  });

  let timer: number | null = null;
  let sx = 0;
  let sy = 0;
  let touchMoved = false;
  const cancel = (): void => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  };

  node.addEventListener('pointerdown', (e) => {
    touchMoved = false;
    // A mouse has right-click and does not want a press delay.
    if (e.pointerType === 'mouse') return;
    sx = e.clientX;
    sy = e.clientY;
    cancel();
    timer = window.setTimeout(() => {
      timer = null;
      const info = inspectData.get(node);
      if (!info) return;
      armClickSwallow();
      showInfo(info.rec, info.mods, node.dataset.uid);
    }, LONG_PRESS_MS);
  });
  node.addEventListener('pointermove', (e) => {
    if (timer === null) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > PRESS_SLOP_PX) {
      touchMoved = true;
      cancel();
    }
  });
  node.addEventListener('click', (e) => {
    if (!touchMoved) return;
    touchMoved = false;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);
}

// ------------------------------------------------------- modifier chip helpers

const DURATION_LABELS: Record<ModifierDuration, string> = {
  endOfTurn: 'Until end of turn',
  endOfAttack: 'This attack — ends when the attack finishes',
  endOfBattlePhase: 'Until end of the Battle Phase',
  endOfOpponentTurn: "Until end of opponent's turn",
  permanent: 'Permanent',
};

let modPopoverEl: HTMLElement | null = null;
let modPopoverDismiss: (() => void) | null = null;
let modPopoverFocus: HTMLElement | null = null;

function hideModPopover(restoreFocus = false) {
  if (modPopoverDismiss) document.removeEventListener('click', modPopoverDismiss);
  modPopoverDismiss = null;
  modPopoverEl?.remove();
  modPopoverEl = null;
  if (restoreFocus && modPopoverFocus?.isConnected) modPopoverFocus.focus({ preventScroll: true });
  modPopoverFocus = null;
}

/** Show a popover with the modifier's source and duration. */
function showModPopover(e: MouseEvent, value: ModGroup | ModGroup[], context?: PowerDetailsContext): void {
  const groups = Array.isArray(value) ? value : [value];
  const m = groups[0]!;
  const total = groups.reduce((sum, g) => sum + g.amount * g.count, 0);
  e.preventDefault();
  e.stopPropagation();
  hideModPopover();
  modPopoverFocus = e.currentTarget instanceof HTMLElement ? e.currentTarget : document.activeElement as HTMLElement | null;

  if (context) {
    const pop = createPowerDetails(powerDetailsModel(context, groups), () => hideModPopover(true));
    pop.addEventListener('click', event => event.stopPropagation());
    registerPresentationControl(pop);
    document.body.append(pop); modPopoverEl = pop;
    fitPowerDetails(pop);
    pop.querySelector<HTMLButtonElement>('.power-details-close')?.focus({ preventScroll: true });
    setTimeout(() => {
      if (modPopoverEl !== pop) return;
      modPopoverDismiss = () => hideModPopover();
      document.addEventListener('click', modPopoverDismiss);
    }, 0);
    return;
  }

  const amountLabel = `${signedPower(total)} total`;

  // Show the source card itself, not just its name.
  let art = '';
  if (groups.length === 1 && m.count === 1 && m.sourceId) {
    try {
      const rec = ALL_CARDS[m.sourceId];
      if (rec) art = `<img class="mod-pop-art" src="${escapeHtml(boardUrl(rec.art))}" alt="${escapeHtml(rec.name)}">`;
    } catch {
      art = '';
    }
  }

  const pop = el('div', 'mod-popover');
  pop.innerHTML = `<div class="mod-pop-amount ${total >= 0 ? 'buff' : 'debuff'}">${amountLabel}</div>${art}`
    + groups.map(g => `<section class="mod-pop-entry"><b>${escapeHtml(modifierSource(g))}</b>
      <div>${signedPower(g.amount * g.count)}${g.count > 1 ? ` · ${g.count} × ${signedPower(g.amount)}` : ''}</div>
      ${g.causes.length ? `<div class="mod-pop-cause">Offered: ${g.causes.map(c => escapeHtml(originLabel(c))).join('; ')}</div>` : ''}
      <div class="mod-pop-duration">${g.passive ? 'Continuous — while its condition applies' : escapeHtml(DURATION_LABELS[g.duration])}</div></section>`).join('');
  pop.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(pop);

  // Position near the click, clamped to viewport.
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
  const box = pop.getBoundingClientRect();
  const x = Math.max(left + 8, Math.min(e.clientX + 8, left + (viewport?.width ?? innerWidth) - box.width - 8));
  const y = Math.max(top + 8, Math.min(e.clientY + 8, top + (viewport?.height ?? innerHeight) - box.height - 8));
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;

  modPopoverEl = pop;

  // Dismiss on any click or Escape.
  setTimeout(() => {
    if (modPopoverEl !== pop) return;
    modPopoverDismiss = () => hideModPopover();
    document.addEventListener('click', modPopoverDismiss);
  }, 0);
}

/** Compact, readable effect labels. Green/red indicate Power changes; violet
 *  identifies continuous effects. Click to read the source and duration. */
function buildModChips(
  mods: PowerModifier[],
  passives: PassiveBonus[] = [],
  inspectAll?: () => void,
  context?: PowerDetailsContext,
): HTMLElement | null {
  if (mods.length === 0 && passives.length === 0
    && (!context || context.current === context.printed * Math.max(1, context.stack))) return null;
  const groups: ModGroup[] = [
    ...groupModifiers(mods),
    // Continuous bonuses have no stored modifier, so without this the power
    // badge shows a number with nothing on the card to explain it.
    ...passives.map((b) => ({
      amount: b.amount,
      source: b.source,
      sourceId: b.sourceId || undefined,
      duration: 'permanent' as ModifierDuration,
      count: 1,
      passive: true, causes: [],
    })),
  ];
  const container = el('div', 'mod-chips');
  if (groups.length !== 1 || groups.some(g => g.count > 1) || (context && powerDetailsModel(context, groups).unexplained !== 0)) {
    const total = context ? context.current - context.printed * Math.max(1, context.stack)
      : groups.reduce((sum, group) => sum + group.amount * group.count, 0);
    const chip = el('button', `mod-chip ${total >= 0 ? 'buff' : 'debuff'}`, `${total >= 0 ? '+' : ''}${total / 1000}k`);
    chip.setAttribute('type', 'button');
    chip.setAttribute('aria-label', `${signedPower(total)} total Power. Show all effect details`);
    chip.title = 'Read every Power effect and its duration';
    chip.onclick = e => showModPopover(e, groups, context);
    chip.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); inspectAll?.(); };
    container.append(chip);
    return container;
  }
  for (const g of groups) {
    const isBuff = g.amount >= 0;
    const sign = isBuff ? '+' : '';
    const count = g.count > 1 ? ` ×${g.count}` : '';
    const label = `${sign}${g.amount / 1000}k${count}`;
    const chip = el('button',
      `mod-chip ${isBuff ? 'buff' : 'debuff'}${g.passive ? ' passive' : ''}`, label);
    chip.setAttribute('type', 'button');
    chip.setAttribute('aria-label', `${signedPower(g.amount)} Power, from ${g.source}. Show effect details`);
    chip.title = g.passive
      ? `Continuous — from: ${g.source}`
      : `From: ${g.source} — click to see the source card`;
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', (e) => showModPopover(e, g, context));
    chip.addEventListener('contextmenu', (e) => showModPopover(e, g, context));
    container.appendChild(chip);
  }
  return container;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (modPopoverEl) hideModPopover(true); else hideInfo(); }
});
window.addEventListener('resize', () => hideModPopover());
window.visualViewport?.addEventListener('resize', () => hideModPopover());
window.addEventListener('pagehide', () => hideModPopover());
document.addEventListener('visibilitychange', () => { if (document.hidden) hideModPopover(); });

// ------------------------------------------------------------------- modals

/**
 * A blocking prompt. Every modal can be MINIMISED: it collapses to a pill in
 * the corner and releases the backdrop, so the board can be studied (and cards
 * right-clicked) before committing to a choice. Nothing is resolved until the
 * player answers, so minimising is always safe.
 */
/** A row of face-up card images, each right-clickable to inspect. */
function revealRow(game: GameState, uids: string[]): HTMLElement {
  const row = el('div', 'check-reveal');
  for (const uid of uids) {
    const rec = recordOf(game, uid);
    const img = el('img') as HTMLImageElement;
    img.src = boardUrl(rec.art);
    img.alt = rec.name;
    img.title = rec.name;
    img.style.cursor = 'zoom-in';
    attachInspect(img, rec);
    row.appendChild(img);
  }
  return row;
}

/**
 * Barrier sockets. `left` of BARRIER_COUNT are still standing; the rest are
 * drawn empty rather than omitted, so how far through the win condition a
 * player is reads without counting.
 */
function barrierGems(left: number, mine: boolean): string {
  let out = `<span class="gems ${mine ? 'mine' : 'foe'}">`;
  for (let i = 0; i < BARRIER_COUNT; i++) {
    out += `<i class="gem${i < left ? '' : ' spent'}"></i>`;
  }
  return `${out}</span><b class="gem-count">${left}</b>`;
}


/**
 * The running defense sum, shown while the defender is picking blockers.
 *
 * Both defense prompts used to state the numbers once, before a single card
 * was chosen, and never move again — so the player added Defense values in
 * their head and re-did the sum on every click. This owns the arithmetic and
 * the verdict instead.
 *
 * A tie breaks the defense (`attackPower >= defensePower` connects, see
 * battle.ts), so holding requires strictly more, and the boundary case — the
 * exact tie — has to read as broken. That is the one number a player is most
 * likely to stop on, so getting it wrong here would be worse than showing
 * nothing.
 *
 * `firstBonus` is Lake Buluan: +5000 to the FIRST blocker only, applied to
 * the selection rather than per card. It is read from a flag here, never by
 * calling `blockValue()`, which would spend the bonus on a preview.
 */
function defenseSummary(game: GameState, cfg: { attack: number; base: number; targetName: string; firstBonus?: number }, ids: string[]): string {
  const preview = defenseComparisonFor(game, cfg, ids);
  const total = preview.defense;
  if (total === null) return preview.outcome;
  const added = total - cfg.base;
  return `⚔ Attack ${cfg.attack.toLocaleString()} · 🛡 Defense ${total.toLocaleString()} (${cfg.base.toLocaleString()} + ${added.toLocaleString()}). `
    + (total > cfg.attack ? 'Holds before check.' : 'Hits before check; ties hit.');
}

function defenseComparisonFor(game: GameState, cfg: DefensePreviewInput, ids: string[]) {
  const attacker = game.activeBattle?.attacker;
  const source = attacker && game.cards[attacker] ? recordOf(game, attacker) : undefined;
  const supported = !!game.activeBattle?.supporters.length;
  return previewDefense({ ...cfg, attackerName: source && source.id !== '__hidden__'
    ? `${cardDisplayName(source.name)}${supported ? ' + support' : ''}` : undefined }, ids.map(uid => {
    const card = game.cards[uid] ? recordOf(game, uid) : undefined;
    return !card || card.id === '__hidden__' ? undefined : card.defense ?? 0;
  }));
}


function modal(title: string, sub: string, body: HTMLElement, buttons: HTMLElement[]) {
  // Every prompt in the client comes through here, so this is the one place
  // that needs to say "the game is waiting on you".
  playCue('prompt');
  if (document.querySelector('.board-wrap')) {
    const bg = el('div', 'modal-bg');
    const dialog = el('div', 'modal');
    const head = el('div', 'modal-head'); head.append(el('h3', undefined, title));
    dialog.append(head);
    if (sub) dialog.append(el('div', 'sub', sub));
    body.classList.add('duel-body'); dialog.append(body);
    const row = el('div', 'row'); row.append(...buttons); dialog.append(row); bg.append(dialog);
    bg.classList.add('duel-utility');
    const safe = buttons.some(button => button.classList.contains('danger'))
      ? buttons.find(button => /^(Keep|Cancel)/i.test(button.textContent ?? '')) : undefined;
    const shell = mountDuelPanel(bg, dialog, head, title, {
      expand: !safe && !body.classList.contains('skill-confirmation'),
      dismiss: safe ? () => safe.click() : undefined,
    });
    if (safe) {
      bg.classList.add('duel-confirmation');
      dialog.setAttribute('aria-modal', 'true');
      bg.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = buttons.filter(button => !button.hasAttribute('disabled'));
        const index = controls.indexOf(document.activeElement as HTMLElement);
        if (index < 0 || (event.shiftKey ? index === 0 : index === controls.length - 1)) {
          event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      });
    }
    (safe ?? shell.min).focus();
    return bg;
  }
  const bg = el('div', 'modal-bg');
  const m = el('div', 'modal');

  const head = el('div', 'modal-head');
  head.appendChild(el('h3', undefined, title));
  m.appendChild(head);

  if (sub) m.appendChild(el('div', 'sub', sub));
  m.appendChild(body);

  const row = el('div', 'row');
  buttons.forEach((b) => row.appendChild(b));
  m.appendChild(row);
  bg.appendChild(m);

  const dismiss = buttons.find(button => /^(Cancel|Close|Keep|OK)/i.test(button.textContent ?? ''));
  presentMenuDialog(bg, m, head, dismiss);
  document.body.appendChild(bg);

  return bg;
}

function choiceCards(game: GameState, uids: string[]): ChoiceCard[] {
  return uids.map(uid => {
    const c = recordOf(game, uid);
    const field = ['ally', 'persona'].includes(inst(game, uid).zone);
    const power = field ? currentPower(index, game, uid) : c.power;
    const position = fieldPosition(inst(game, uid), HUMAN);
    const hidden = c.id === '__hidden__';
    const statText = cardStatBadges(c, field ? { context: 'field', currentPower: power, hidden } : { context: 'printed', hidden }).map(s => s.description).join(' · ');
    return { uid, name: c.name, image: artUrl(c.thumb), type: c.type, cardType: c.type, zone: inst(game, uid).zone, hidden,
      position, condition: field ? `${power / 1000}k · ${inst(game, uid).exhausted ? 'Exhausted' : 'Charged'}` : undefined,
      detail: c.text.replace(/\[\/?(?:green|red|blue|yellow|purple|gold)\]/gi, ''), level: c.level, power: hidden ? undefined : power, defense: hidden ? undefined : c.defense, stats: hidden ? '' : `${position ?? inst(game, uid).zone} · ${c.type} · Level ${c.level}${statText ? ' · ' + statText : ''}` };
  });
}
function chooseFrom(game: GameState, options: Parameters<typeof openCardChoice>[0]) {
  playCue('prompt');
  const chain = game.responseChain;
  const link = chain?.phase === 'resolving' ? chain.links[chain.cursor] : undefined;
  const record = link && game.cards[link.source] ? recordOf(game, link.source) : undefined;
  return openCardChoice({ ...options, responseContext: options.responseContext ?? (link && record ? {
    name: record.name, owner: link.owner === HUMAN ? 'Your effect' : 'Opponent effect', image: artUrl(record.thumb),
    effect: displayRuleText(link.label), targets: [], targetLabel: '', inspect: () => showInfo(record),
  } : undefined), inspect: options.inspect ?? (uid => showInfo(recordOf(game, uid), undefined, uid)) });
}

export class HumanChooser implements Chooser {
  constructor(private gameRef: () => GameState, private firstBattle?: FirstBattleSession, private nextBattle?: NextBattleSession) { trackDecisionActivity(this,gameRef); }

  private addResolvingContext(body: HTMLElement): void {
    const game = this.gameRef(), chain = game.responseChain;
    const link = chain?.phase === 'resolving' ? chain.links[chain.cursor] : undefined;
    if (!link || !game.cards[link.source]) return;
    const rec = recordOf(game, link.source);
    const context = el('section', 'cc-response-context');
    const read = el('button', 'cc-response-source');
    read.setAttribute('aria-label', `Read ${cardDisplayName(rec.name)}`);
    const image = document.createElement('img'); image.src = artUrl(rec.thumb); image.alt = cardDisplayName(rec.name);
    read.append(image); read.onclick = () => showInfo(rec, undefined, link.source);
    const text = el('div', 'cc-response-text');
    text.append(el('strong', '', `${link.owner === HUMAN ? 'Your' : 'Opponent'} effect · ${cardDisplayName(rec.name)}`));
    const effect = el('p'); effect.innerHTML = formatSkillText(displayRuleText(link.label)); text.append(effect);
    context.append(read, text); body.prepend(context);
  }


  /**
   * Offer pending abilities as CARDS, so the player can actually read what they
   * are agreeing to. Every option shows the card art beside its rules text, and
   * right-click still opens the full inspect panel.
   */
  async chooseAbility(
    _p: PlayerId, prompt: string, options: AbilityOption[],
    context?: Parameters<Chooser['chooseAbility']>[3],
  ): Promise<number | null> {
    if (!options.length) return null;
    if (this.firstBattle) return context?.allowDecline === false ? 0 : null;
    const game = this.gameRef();
    const choices = abilityChoices(options, context?.kind === 'pending');
    const cards = choices.map(({ option, index: i }) => {
      const base = choiceCards(game, [option.uid])[0]!;
      return { ...base, uid: option.id ?? `option-${i}`, zone: undefined,
        type: /last oath/i.test(option.text) ? 'Last Oath' : /sentry/i.test(option.text) ? 'Sentry'
          : base.type === 'Force' ? 'Force skill' : 'Card skill', detail: displayRuleText(option.text),
        condition: option.cause ? `Offered: ${originLabel(option.cause)}` : option.trigger ? triggerReason(option.trigger) : base.condition };
    });
    const choiceOf = (id: string) => choices[cards.findIndex(c => c.uid === id)]!;
    const response = context?.kind === 'response';
    const publicChain = chainSummary(game, index);
    markAvailableEffects(game, [], options.map(o => o.uid));
    const selected = await openCardChoice({ title: response ? (publicChain ? `Respond to ${cardDisplayName(publicChain.name)}?` : 'Your response') : context?.kind === 'pending' ? `${options.length} waiting effects · ${new Set(options.map(o => o.uid)).size} cards` : prompt,
      instruction: response ? `${chainProgress(game) ?? 'Your response'} · Newest resolves first` : context?.kind === 'cost' ? 'Activate before paying the Offer cost.'
        : 'Choose one effect, then confirm. Other waiting effects remain available after this chain.',
      cards, max: 1, exact: true, confirm: response ? 'Activate' : 'Activate effect',
      decline: context?.allowDecline === false ? undefined : response ? 'No response' : context?.kind === 'battle' ? 'Continue attack' : context?.kind === 'cost' ? 'Continue without bonus' : 'Skip optional effects',
      effectDetails: true,
      responseContext: response && publicChain ? { ...publicChain, image: artUrl(recordOf(game, publicChain.source).thumb), inspect: () => showInfo(recordOf(game, publicChain.source)) } : undefined,
      confirmLabel: ids => {
        if (!ids.length) return 'Activate';
        const cost = choiceOf(ids[0]!).option.costLabel ?? /\[Cost:\s*([^\]]+)\]/i.exec(choiceOf(ids[0]!).option.text)?.[1]?.trim();
        if (cost && /reveal and discard this card/i.test(cost)) return 'Reveal & discard';
        // The complete text stays in the selected-effect summary. Long costs
        // should not turn a landscape phone's primary button into a paragraph.
        return cost ? (/\bVent\b/i.test(cost) ? 'Choose Kalas cost' : cost.length <= 26 ? `Activate · ${cost}` : 'Choose cost & activate') : 'Activate';
      },
      summary: ids => {
        if (!ids.length) return '';
        const choice = choiceOf(ids[0]!);
        const text = displayRuleText(choice.option.text).replace(/\[\/?[a-z]+\]/gi, '');
        const cost = choice.option.costLabel;
        const effect = displayRuleText(choice.option.text) !== choice.option.text ? text : choice.option.effectSummary ?? (cost ? text.replace(/\[Cost:[^\]]+\]\s*/gi, '').trim() : text);
        return `${choice.option.cause ? `Triggered by offering ${originLabel(choice.option.cause)}. ` : choice.option.trigger ? `${triggerReason(choice.option.trigger)}. ` : ''}${cost ? `Pay: ${cost} · ` : ''}${effect}${choice.occurrences > 1 ? ` (${choice.occurrences} waiting triggers; activate one.)` : ''}`;
      },
      inspect: id => showInfo(recordOf(game, choiceOf(id).option.uid), undefined, choiceOf(id).option.uid),
    });
    markAvailableEffects(game, []);
    return selected.length ? choiceOf(selected[0]!).index : null;
  }

  async chooseCards(
    _p: PlayerId,
    prompt: string,
    candidates: string[],
    count: number,
    opts: ChooseCardsOptions = {},
  ): Promise<string[]> {
    const game = this.gameRef();
    if (candidates.length === 0) return Promise.resolve([]);
    let cancelled = false;
    const chosen = await chooseFrom(game, {
      title: prompt, instruction: opts.detail ?? `Choose ${opts.upTo ? 'up to' : 'exactly'} ${count}. Select cards, then confirm.`,
      cards: choiceCards(game, candidates).map(c => ({ ...c, weight: opts.weights?.[c.uid] ?? 1 })),
      boardTargets: candidates.every(uid => ['ally', 'persona'].includes(inst(game, uid).zone)) && !opts.defenseMeter,
      max: count, exact: !opts.upTo, ordered: opts.ordered, firstSelectedMinimum: opts.firstSelectedMinimum, atLeast: opts.atLeast,
      confirm: opts.confirm ?? (opts.decline === 'Cancel' && /^(Offer|Kalas)\s+\d|\bcost\b/i.test(prompt) ? 'Pay cost' : undefined),
      decline: opts.decline ?? (opts.upTo ? 'Choose none' : undefined),
      cancel: opts.draft ? { label: 'Cancel activation', run: () => { cancelled = true; } } : undefined,
      selectionDetails: opts.paymentKind === 'offer' ? ids => offerPreview(index, game, presentationScripts, ids, _p) : undefined,
      summary: opts.atLeast ? ids => `${weightedSelectionTotal(ids, opts.weights, opts.firstSelectedMinimum)} / ${count} Offers · ${ids.length} Unit${ids.length === 1 ? "" : "s"}${opts.paymentKind === 'offer' ? ' → Grave' : ''}`
        : opts.defenseMeter ? ids => defenseSummary(game, opts.defenseMeter!, ids)
        : opts.ventDrawPer ? ids => ventSelectionSummary(ids, opts.ventDrawPer!)
        : undefined,
      showDefense: !!opts.defenseMeter,
      choicePresentation: opts.defenseMeter ? 'defense' : undefined,
      defenseComparison: opts.defenseMeter ? ids => defenseComparisonFor(game, opts.defenseMeter!, ids) : undefined,
    });
    return cancelled ? [CANCEL_DRAFT] : chosen;
  }

  async chooseTarget(_p: PlayerId, prompt: string, candidates: string[], opts: ChooseTargetOptions = {}): Promise<string | null> {
    if (this.firstBattle) return null;
    if (!candidates.length) return null;
    const game = this.gameRef();
    let cancelled = false;
    const result = await chooseFrom(game, { title: prompt,
      instruction: opts.draft ? 'Choose a target before paying. You can still cancel this activation.' : 'Choose a card, then confirm.',
      boardTargets: candidates.every(uid => ['ally', 'persona'].includes(inst(game, uid).zone)),
      cards: choiceCards(game, candidates), max: 1, exact: true,
      decline: opts.draft ? opts.optional ? 'Choose none' : undefined : 'Skip',
      cancel: opts.draft ? { label: 'Cancel activation', run: () => { cancelled = true; } } : undefined });
    return cancelled ? CANCEL_DRAFT : result[0] ?? null;
  }

  chooseMode(
    _p: PlayerId,
    prompt: string,
    modes: string[],
    cardUids?: string[],
  ): Promise<number> {
    const game = this.gameRef();
    return new Promise((resolve) => {
      const body = el('div');
      if (cardUids?.length) body.appendChild(revealRow(game, cardUids));
      const box = el('div', 'opts');
      modes.forEach((label, i) => {
        const b = el('button', 'opt', label);
        b.onclick = () => { hideInfo(); bg.remove(); resolve(i); };
        box.appendChild(b);
      });
      body.appendChild(box);
      const bg = modal(prompt, '', body, []);
    });
  }

  /**
   * Which Ally Zone — asked on a picture of the zones.
   *
   * This used to be `chooseMode` with "Leftmost / Rightmost" in a list, which
   * asked the player to hold the board in their head and translate. Worse when
   * the zones are full: the question is then which of your own units to
   * destroy, and a list of names is the least useful way to be shown four
   * cards you are already looking at.
   *
   * The row reads left to right as the board does. Zones you cannot choose
   * stay visible but inert, because the shape of the board is part of the
   * decision even where it is not an option.
   */
  chooseSlot(_p: PlayerId, prompt: string, candidates: number[], placement?: { incomingUid: string }): Promise<number> {
    const game = this.gameRef();
    const incoming = placement && game.cards[placement.incomingUid] ? recordOf(game, placement.incomingUid) : undefined;
    const ps = you(game, HUMAN);
    const boardElements = new Map<string, HTMLElement>();
    for (const slot of candidates) {
      const node = document.querySelector<HTMLElement>(`.mat:not(.foe) .slot[data-slot="${slot}"]`);
      if (node) boardElements.set(`slot-${slot}`, node);
    }
    if (candidates.length && (incoming || boardElements.size === candidates.length)) {
      return chooseFrom(game, {
        title: prompt, instruction: 'Choose a highlighted Ally Zone.', max: 1, exact: true,
        confirm: incoming ? `Call ${cardDisplayName(incoming.name)} here` : 'Place here',
        boardElements: boardElements.size === candidates.length ? boardElements : undefined,
        choicePresentation: incoming ? 'placement' : undefined,
        placement: incoming ? { name: incoming.name, image: artUrl(incoming.art),
          cardType: incoming.type, power: incoming.power, defense: incoming.defense,
          inspect: () => showInfo(incoming, undefined, placement!.incomingUid) } : undefined,
        cards: candidates.map(slot => {
          const uid = ps.allies[slot];
          const rec = uid ? recordOf(game, uid) : undefined;
          return { uid: `slot-${slot}`, name: SLOT_LABELS[slot] ?? `Ally ${slot + 1}`,
            image: rec ? boardUrl(rec.art) : CARD_BACK, type: 'Ally Zone',
            detail: rec ? `Replaces ${cardDisplayName(rec.name)}` : 'Empty zone',
            stats: '', position: rec ? `Replaces ${cardDisplayName(rec.name)}` : 'Empty' };
        }),
        inspect: id => { const uid = ps.allies[Number(id.slice(5))]; if (uid) showInfo(recordOf(game, uid), undefined, uid); },
      }).then(ids => Number(ids[0]!.slice(5)));
    }
    return new Promise((resolve) => {
      const ps = you(game, HUMAN);
      const row = el('div', 'slot-pick');

      // The same order the mat uses, persona included, so the picture in the
      // modal is the picture on the board.
      const order: Array<number | 'persona'> = [0, 1, 'persona', 2, 3];
      for (const which of order) {
        const isPersona = which === 'persona';
        const uid = isPersona ? ps.persona : ps.allies[which as number];
        const pickable = !isPersona && candidates.includes(which as number);
        const cell = el('div', `sp-slot${isPersona ? ' persona' : ''}${pickable ? ' open' : ''}`);

        if (uid) {
          const rec = recordOf(game, uid);
          const art = el('div', 'sp-art');
          art.style.backgroundImage = `url("${boardUrl(rec.art)}")`;
          cell.appendChild(art);
          cell.appendChild(el('div', 'sp-name', cardDisplayName(rec.name)));
          cell.appendChild(el('div', 'sp-power', currentPower(index, game, uid).toLocaleString()));
          if (pickable) cell.appendChild(el('div', 'sp-fate', 'Replaces'));
        } else {
          cell.appendChild(el('div', 'sp-empty', isPersona ? '—' : 'Empty'));
        }

        cell.appendChild(el(
          'div', 'sp-label',
          isPersona ? 'Persona' : (SLOT_LABELS[which as number] ?? `Slot ${which}`),
        ));

        if (pickable) {
          cell.onclick = () => { hideInfo(); bg.remove(); resolve(which as number); };
        }
        row.appendChild(cell);
      }

      const body = el('div');
      body.appendChild(row);
      this.addResolvingContext(body);
      const bg = modal(prompt, '', body, []);
    });
  }

  /** Show revealed cards with no decision attached. */
  revealCards(
    _p: PlayerId,
    uids: string[],
    title: string,
    subtitle?: string,
  ): Promise<void> {
    const game = this.gameRef();
    if (!uids.length) return Promise.resolve();
    const detail = /sipol|reroll/i.test(title) ? `${subtitle ?? ''} · Revealed: ${uids.map(uid => recordOf(game, uid).type).join(', ')}` : subtitle ?? '';
    return presentNotice({ title, detail, cards: uids.map(uid => {
      const rec = recordOf(game, uid);
      return { name: rec.name, image: boardUrl(rec.art), inspect: (node: HTMLElement) => attachInspect(node, rec) };
    }) });
  }

  confirm(_p: PlayerId, prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
      const content = skillConfirmation(prompt);
      this.addResolvingContext(content.body);
      const yes = el('button', 'primary', content.accept);
      if (content.unavailable) yes.setAttribute('disabled', '');
      const no = el('button', undefined, content.decline);
      const bg = modal(content.title, '', content.body, [no, yes]);
      yes.onclick = () => { bg.remove(); resolve(true); };
      no.onclick = () => { bg.remove(); resolve(false); };
    });
  }

  revealConfirm(
    _p: PlayerId,
    uid: string,
    prompt: string,
    labels?: { yes: string; no: string },
  ): Promise<boolean> {
    const game = this.gameRef();
    return new Promise((resolve) => {
      const body = revealRow(game, [uid]);

      const yes = el('button', 'primary', labels?.yes ?? 'Send to bottom');
      const no = el('button', undefined, labels?.no ?? 'Keep on top');
      const bg = modal(prompt, 'Top card of your deck', body, [no, yes]);
      yes.onclick = () => { hideInfo(); bg.remove(); resolve(true); };
      no.onclick = () => { hideInfo(); bg.remove(); resolve(false); };
    });
  }

  async personifyPrompt(_p: PlayerId, candidates: string[]): Promise<string | null> {
    if (this.firstBattle) return null;
    const game = this.gameRef();
    const chosen = await chooseFrom(game, {
      title: 'Choose your Persona', instruction: 'Choose a Level 3+ Unit, or keep your current Persona.',
      cards: choiceCards(game, candidates), max: 1, exact: true,
      confirm: 'Personify', decline: 'Keep current',
    });
    return chosen[0] ?? null;
  }

  summonTokenPrompt(
    _p: PlayerId,
    tokenName: string,
    freeSlots: number[],
    stackTargets: { uid: string; slot: number; stack: number }[],
  ): Promise<{ action: 'skip' } | { action: 'place'; slot: number } | { action: 'stack'; targetUid: string }> {
    return new Promise((resolve) => {
      let bg: HTMLElement;

      // Build the token card image.
      const body = el('div', 'check-reveal');
      const img = el('img') as HTMLImageElement;
      img.src = `art/token.jpg`;
      img.alt = tokenName;
      img.style.maxWidth = '200px';
      body.appendChild(img);

      const info = el('div', '', `${tokenName} is ready to summon. Choose where to place it, or Skip.`);
      body.appendChild(info);

      // Build placement options.
      const options = el('div', 'ability-list');

      // Free slot buttons.
      for (const slot of freeSlots) {
        const btn = el('button', undefined, `Summon to slot ${slot} (empty)`);
        btn.onclick = () => { hideInfo(); bg.remove(); resolve({ action: 'place', slot }); };
        options.appendChild(btn);
      }

      // Stack onto wisp buttons.
      for (const target of stackTargets) {
        const btn = el('button', undefined, `Stack onto wisp in slot ${target.slot} (stack: ${target.stack})`);
        btn.onclick = () => { hideInfo(); bg.remove(); resolve({ action: 'stack', targetUid: target.uid }); };
        options.appendChild(btn);
      }

      body.appendChild(options);

      const skip = el('button', undefined, 'Skip') as HTMLButtonElement;
      skip.onclick = () => { hideInfo(); bg.remove(); resolve({ action: 'skip' }); };

      bg = modal(
        'Token Summon',
        `${tokenName} is being created. Summon it to the field or Skip.`,
        body,
        [skip],
      );
    });
  }

  /**
   * The battle-card window.
   *
   * Selection order IS resolution order — clicking a second card puts it
   * behind the first, and each pick wears its number. That answers "which
   * goes first" inside the one choice instead of asking again afterwards,
   * and it is the only place the ordering could be expressed without a
   * second modal over a list of two cards.
   */
  battleCards(
    _p: PlayerId,
    info: BattleWindowInfo,
    forceCandidates: string[],
    sentryCandidates: string[],
  ): Promise<string[]> {
    if (this.firstBattle) return Promise.resolve([]);
    const game = this.gameRef();
    const cards = choiceCards(game, [...forceCandidates, ...sentryCandidates]).map(c => ({
      ...c, sentry: sentryCandidates.includes(c.uid),
      type: sentryCandidates.includes(c.uid) ? 'Sentry' : 'Force',
    }));
    return chooseFrom(game, {
      title: info.role === 'attacker' ? 'Before your attack: play Forces?' : 'Use a Force or Sentry?',
      instruction: 'Choose one card to activate. Your opponent can respond before it resolves.',
      cards, max: 1,
      summary: ids => `Attack ${info.attackPower.toLocaleString()} · ${info.targetName}: ${info.defensePower.toLocaleString()} Power · `
        + `${ids.length} selected · `
        + `${ids.reduce((n, id) => n + (cards.find(c => c.uid === id)?.cost ?? 0), 0)} total cost before skill gains.`,
      confirm: 'Resolve in this order',
      decline: info.role === 'attacker' ? 'Continue attack' : 'Continue to defense',
    });
  }

  async blockPrompt(_p: PlayerId, info: BlockWindowInfo, candidates: string[]): Promise<string[]> {
    const game = this.gameRef();
    if (this.firstBattle) {
      const session = this.firstBattle;
      if (session.step.id === 'taking-hit') {
        await new Promise<void>(resolve => {
          const take = el('button', 'primary', 'Take the Hit');
          const bg = modal('Keep your cards this time', 'The attack will hit and break one Barrier.',
            el('p', 'defense-rule', `Attack ${info.attackPower.toLocaleString()} · Your defense ${info.defensePower.toLocaleString()}. Ties hit.`), [take]);
          take.onclick = () => { bg.remove(); resolve(); };
        });
        return [];
      }
      if (session.step.id !== 'defend' || !candidates.includes(session.cards.blocker)) throw new Error('First Battle defense is out of sequence. Restart this section.');
      const picked = await chooseFrom(game, {
        title: 'Stop this attack',
        instruction: 'Select the highlighted defense card, then Defend. Use Card list if you prefer a separate card view. Defense must be higher than the attack; ties hit.',
        cards: choiceCards(game, [session.cards.blocker]), max: 1, exact: true, confirm: 'Defend', showDefense: true,
        choicePresentation: 'defense',
        defenseComparison: ids => defenseComparisonFor(game, { attack: info.attackPower, base: info.defensePower, targetName: info.targetName }, ids),
        summary: ids => defenseSummary(game, { attack: info.attackPower, base: info.defensePower, targetName: info.targetName }, ids),
      });
      session.observe({ kind: 'cue', cue: 'defended' });
      return picked;
    }
    const selected = await chooseFrom(game, {
      title: 'Choose your defense',
      instruction: 'Defense must exceed their Power. Ties hit; the attack check can change the result.',
      cards: choiceCards(game, candidates), confirm: 'Block', decline: 'Do not block',
      showDefense: true,
      choicePresentation: 'defense',
      defenseComparison: ids => defenseComparisonFor(game, { attack: info.attackPower, base: info.defensePower,
        targetName: info.targetName, firstBonus: info.firstBonus }, ids),
      help: this.nextBattle ? { levels: defenseHelp(info.attackPower, info.defensePower,
        candidates.map(uid => ({name: def(index,game,uid).name, defense: (def(index,game,uid).defense || 0) + (info.firstBonus ?? 0)}))),
        onRequest: () => { this.nextBattle!.hints++; } } : undefined,
      summary: ids => defenseSummary(game, { attack: info.attackPower, base: info.defensePower,
        targetName: info.targetName, firstBonus: info.firstBonus }, ids),
    });
    this.nextBattle?.defended(selected.length);
    return selected;
  }

}

// ------------------------------------------------------------- setup screens

function screen(): HTMLElement {
  app.innerHTML = '';
  const s = el('div', 'screen');
  app.appendChild(s);
  destinationReady(s);
  return s;
}

/**
 * The cast, as laid out on the key art: a back row that reads as depth and a
 * front row that frames the logo. `depth` drives scale, blur and brightness
 * together, so the group reads as one group photo rather than five cutouts
 * pasted at the same distance.
 */

/**
 * The game's front door on the web. Shown on the title screen so a player who
 * arrived at the game directly can find everything around it.
 *
 * Demo mode never reaches the title screen, so this link cannot appear inside
 * the match embedded on that very site.
 *
 * `www` rather than the apex: the apex answers with a 308 to this address, so
 * naming it directly saves the player a redirect.
 */


function titleScreen(overlay?: MenuAction): Promise<'tutorial' | 'start' | 'decks'> {
  applyBattlefieldPresentation('classic');
  setSoundscape('title'); clearChainCues(); clearPresentationNotices();
  document.querySelectorAll('.battle-feedback').forEach(n => n.remove());
  return new Promise(resolve => {
    const active = activeSelection();
    const choose = async (action: MenuAction) => {
      if (action === 'start') { await enterDuelFullscreen(); resolve(action); }
      else if (action === 'decks' || action === 'tutorial') resolve(action);
      else if (action === 'pvp') location.search = '?pvp';
      else if (action === 'settings') openSettingsPanel(true);
      else if (action === 'fighterlog') {
        const frame = document.querySelector<HTMLIFrameElement>('.game-main-menu');
        if(frame)frame.inert=true;
        const { openFighterLog } = await import('./fighter-log.js');
        openFighterLog({
          onBack: () => { if(frame?.isConnected){frame.inert=false;frame.contentWindow?.postMessage({type:'codex-menu-resume'},location.origin);frame.focus();} destinationReady(); },
          onPatchNotes: () => openDevLog(devLogDeps()), onFeedback: () => { openFeedback(); },
        });
      }
      else if (action === 'devlog') await openDevLog(devLogDeps());
      else if (action === 'credits') await openCredits();
      else openFeedback();
    };
    mountTitle(app, { activeDeck: activeDeckContext(active), choose });
    if (overlay) void choose(overlay);
  });
}

function tutorialScreen(): Promise<string | null> {
  setSoundscape('tutorial');
  return new Promise(resolve => {
    screen();
    mountJourney(app, () => resolve(null), chapter => {
      // Bind the menu choice to this session, including when storage is blocked.
      // A stale region on the incoming menu URL must not override a new choice.
      const url = new URL(location.href); url.searchParams.set('region', readJourney().region);
      history.replaceState(null, '', url);
      resolve(`journey-${chapter}`);
    });
  });
}

/**
 * Play-style descriptions for each deck, shown during deck selection and
 * in the card inspect panel for Persona cards.
 */
const DECK_PLAY_STYLES: Record<string, string> = {
  Agta:
    '<b>' + markKeywords('Agta — Bayanihan') + '</b><br>' + formatCardText(
    'Sipol reveals the top card of your deck and special ' +
    'calls it if it\'s a Unit. Bayanihan releases when all 4 Ally Zones are filled ' +
    'with Luzon Arch units. Wins by flooding the board through Sipol and ' +
    'Bayanihan bonuses that buff the whole team.'),
  Maguindanao:
    '<b>' + markKeywords('Maguindanao — Garahana') + '</b><br>' + formatCardText(
    'An Offer engine: tribute your own units as skill costs to power up effects. ' +
    'Garahana releases when 5+ Maguindanaon units are in your Grave. Last Oath ' +
    'abilities trigger when units are Offered. Wins by sacrificing board presence ' +
    'for explosive power and card advantage.'),
  Babaylan:
    '<b>' + markKeywords('Babaylan — Andukha') + '</b><br>' + formatCardText(
    'A Heart engine: Sanib cards into your Heart zone and create Kaluluwa tokens ' +
    'to build Andukha (6+ cards in Heart). Kalas cards from Heart to pay skill ' +
    'costs — you choose which cards to remove. Andukha 9/12 unlock powerful ' +
    'persona abilities and team-wide power bonuses. Some cards activate from the ' +
    'Heart zone itself. Wins by managing Heart size — using Sanib to build resources, ' +
    'Kalas to pay costs, and Andukha thresholds to overwhelm the opponent.'),
};

/**
 * The opponent's deck, one after another rather than at random.
 *
 * Random matchmaking against three decks hands out repeats: roughly one duel
 * in three is the same archetype twice running, and a new player can meet
 * Agta four times before ever seeing Babaylan. Rotating guarantees they see
 * all three, which is the whole reason there are three. Kept in storage so
 * the rotation survives a reload rather than restarting at Agta every visit.
 *
 * Placeholder, deliberately: the opponent should eventually field decks worth
 * playing against rather than the three starter lists.
 */
const AI_ROTATION_KEY = 'codex-legends.aiDeck';
function nextTutorialOpponent(): string {
  const names = ['Agta', 'Babaylan', 'Maguindanao'];
  const key = 'codex-legends.tutorial-opponent.v1';
  let i = 0;
  try { const stored = Number(localStorage.getItem(key)); if (Number.isInteger(stored) && stored >= 0) i = stored % names.length; } catch { /* Storage is optional. */ }
  try { localStorage.setItem(key, String((i + 1) % names.length)); } catch { /* Continue with a valid preset. */ }
  return names[i]!;
}

function nextAiDeck(avoid?: string): string {
  const names = Object.keys(DECKS);
  let i = 0;
  try {
    i = Number(localStorage.getItem(AI_ROTATION_KEY) ?? '0') || 0;
  } catch {
    // Storage refused; the rotation restarts, which is no worse than random.
  }
  // Step past the player's own archetype where there is somewhere to step to.
  // A mirror match is a legitimate matchup, but it is a poor advertisement for
  // having three decks — and the player's own is the one they have already
  // seen every card of.
  for (let n = 0; n < names.length && names[i % names.length] === avoid; n++) {
    i++;
  }
  const name = names[i % names.length]!;
  try {
    localStorage.setItem(AI_ROTATION_KEY, String((i + 1) % names.length));
  } catch { /* not fatal */ }
  return name;
}

/**
 * Asking, in the game's own voice.
 *
 * `window.confirm` puts a Chrome-grey box titled "localhost:5173 says" over a
 * dark fantasy board, freezes the page while it is up, cannot be styled, and
 * looks like the browser warning you about the site rather than the game
 * asking you a question. Every other prompt in this client goes through
 * `modal()`; these are the two that did not.
 *
 * Escape and the backdrop both cancel, because the safe answer should be the
 * easy one — and `danger` is for a question whose Yes cannot be undone.
 */
function askModal(
  title: string,
  message: string,
  opts: { confirm?: string; cancel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    const opener = document.activeElement as HTMLElement | null;
    const deckMenu = !!document.querySelector('.deck-refined, .shelf-screen.menu-destination');
    const yes = el('button', opts.danger ? 'primary danger' : 'primary',
      opts.confirm ?? 'OK');
    const no = el('button', 'secondary', opts.cancel ?? 'Cancel');

    const body = el('div');
    if (message) body.appendChild(el('p', 'ask-text', escapeHtml(message)));
    const bg = modal(title, '', body, [no, yes]);
    if(deckMenu){bg.classList.add('deck-confirmation');bg.querySelector('.modal-head .iconbtn')?.remove();
      const dialog=bg.querySelector('.modal')!;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',title);}

    let settled=false;
    const done = (answer: boolean): void => {
      if(settled)return;settled=true;
      window.removeEventListener('keydown', onKey);
      bg.remove();
      if(opener?.isConnected)opener.focus({preventScroll:true});
      resolve(answer);
    };
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      if(deckMenu && e.key==='Tab'){e.preventDefault();(document.activeElement===no?yes:no).focus();}
    }
    window.addEventListener('keydown', onKey);
    // A click on the backdrop, not on the card sitting in it.
    bg.addEventListener('click', (e) => { if (e.target === bg) done(false); });

    yes.onclick = () => done(true);
    no.onclick = () => done(false);
    setTimeout(() => no.focus(), 30);
  });
}

/** Telling, in the same voice. One button, nothing to decide. */
function tellModal(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    const ok = el('button', 'primary', 'OK');
    const body = el('div');
    body.appendChild(el('p', 'ask-text', escapeHtml(message)));
    const bg = modal(title, '', body, [ok]);
    const done = (): void => {
      window.removeEventListener('keydown', onKey);
      bg.remove();
      resolve();
    };
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); done(); }
    }
    window.addEventListener('keydown', onKey);
    bg.addEventListener('click', (e) => { if (e.target === bg) done(); });
    ok.onclick = done;
    setTimeout(() => ok.focus(), 30);
  });
}

// --------------------------------------------------------------- deck library


/** A working copy of a deck, in the shape the builder mutates. */
type Draft = StoredDeck;

/**
 * The deck a duel will use — saved, or one of the three shipped.
 *
 * Which deck you play is settled on the Deck screen, so the duel never asks.
 * A built-in is stored as "builtin:Agta" rather than copied, so choosing one
 * costs nothing and it stays the reference list it is.
 */
const BUILTIN = 'builtin:';

function activeSelection(): { name: string; deck: DeckList } | null {
  return resolveActiveSelection(index, DECKS);
}

/**
 * The place a deck is from, which is what a player is shown.
 *
 * `archetype` is the key that selects a card pool — 'Agta', 'Maguindanao',
 * 'Babaylan' — and it stays internal. A deck built from the northern islands
 * is a Luzon deck; tying that name to a people or to a mechanic claims
 * something the game has no business claiming.
 */
function regionOf(archetype: string): string {
  return ARCHIPELAGOS.find((a) => a.deck === archetype)?.region ?? archetype;
}

/** Every card an archetype can put in a main deck, in a sensible reading order. */
function poolFor(archetype: string): CardRecord[] {
  const order: Record<string, number> = { Unit: 0, Action: 1, Sentry: 2, Force: 3 };
  return Object.values(ALL_CARDS)
    .filter((c) => isSelectableCard(c) && c.deck === archetype && c.type !== 'Codex' && c.type !== 'Token')
    .sort((a, b) =>
      (order[a.type] ?? 9) - (order[b.type] ?? 9)
      || (b.level ?? 0) - (a.level ?? 0)
      || a.name.localeCompare(b.name));
}

function codexPoolFor(archetype: string): CardRecord[] {
  return Object.values(ALL_CARDS)
    .filter((c) => isSelectableCard(c) && c.deck === archetype && c.type === 'Codex')
    .sort((a, b) => a.name.localeCompare(b.name));
}

function copiesOf(draft: Draft, cardId: string): number {
  return draft.main.find((e) => e.id === cardId)?.copies ?? 0;
}

function setCopies(draft: Draft, cardId: string, n: number): void {
  const entry = draft.main.find((e) => e.id === cardId);
  if (n <= 0) draft.main = draft.main.filter((e) => e.id !== cardId);
  else if (entry) entry.copies = n;
  else draft.main.push({ id: cardId, copies: n });
}

/**
 * A new deck starts empty.
 *
 * An earlier version filled in the twelve Force and the five Codex, because
 * the pool leaves exactly one legal answer for each. That was true and it was
 * still not the builder's decision. The rules are checked, never performed.
 */
function draftFrom(archetype: string, name: string): Draft {
  return {
    id: newDeckId(), archetype, name,
    main: [], codex: [], persona: '', updated: Date.now(),
  };
}

async function editActiveDeck(): Promise<void> {
  const selected = activeDeckId();
  const saved = loadDecks(index).find(deck => deck.id === selected);
  const archetype = saved?.archetype ?? (selected?.startsWith(BUILTIN) ? selected.slice(BUILTIN.length) : 'Agta');
  const base = saved ?? DECKS[archetype];
  if (!base) return;
  const draft = structuredClone(base) as Draft;
  if (!saved) { draft.id = newDeckId(); draft.archetype = archetype; draft.name = regionOf(archetype).slice(0, 9); draft.updated = Date.now(); }
  await deckBuilderScreen(archetype, draft);
}

/**
 * The deck shelf.
 *
 * The three shipped decks sit alongside the player's own and cannot be edited —
 * they are the reference, and someone who breaks one has no way back. What they
 * can do is duplicate one, which is deliberately the most prominent action
 * here: Master Duel's most-cited new-player failure is spending everything on a
 * deck that cannot win, and starting from one known to work is how you avoid
 * the equivalent.
 */
function decksScreen(): Promise<void> {
  return new Promise((resolve) => {
    const presentation: ShelfPresentationState = {tab:'starter',selected:''};
    const render = (): void => {
      const s = screen();
      // Same treatment as pickScreen: on a short screen the shelf is taller
      // than the window, and it was the Back button at the foot that scrolled
      // out of reach along with it.
      s.classList.add('shelf-screen');
      s.appendChild(el('h2', undefined, 'Decks'));
      s.appendChild(el('p', 'subtle',
        'The three built-in decks, and any you build. '
        + `${readVerb()} a card anywhere to read it full size.`));

      const collection = readDeckCollection(index);
      const mine = collection.decks;
      const active = activeDeckId();
      const grid = el('div', 'deck-shelf');

      for (const name of Object.keys(DECKS)) {
        const dl = DECKS[name]!;
        const rec = ALL_CARDS[dl.persona || personaChoices(index, dl)[0]!]!;
        const card = el('div', 'shelf-card built-in');
        card.dataset.deckId = `${BUILTIN}${name}`;
        card.dataset.region = regionOf(name);
        card.dataset.previewArt = boardUrl(rec.art);
        card.dataset.bannerArt = setupPortrait(rec.id, boardUrl(rec.art));
        card.dataset.fighterArt = `/ui/menu-v1/characters/${menuProfile().fighter}.webp`;
        const summary = deckViewModel(dl, ALL_CARDS);
        card.dataset.counts = JSON.stringify(summary.counts);

        const art = el('div', 'shelf-art');
        art.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
        card.appendChild(art);

        const body = el('div', 'shelf-body');
        body.appendChild(el('div', 'shelf-name', escapeHtml(regionOf(name))));
        body.appendChild(el('div', 'shelf-sub',
          `${summary.mainCount} MAIN / ${summary.codexCount} CODEX`));
        card.appendChild(body);

        if (active === `${BUILTIN}${name}`) {
          body.appendChild(el('div', 'shelf-flag', 'Playing this'));
          card.classList.add('active');
        }

        const row = el('div', 'shelf-actions');
        const play = el('button', 'small primary', 'Use Deck');
        play.onclick = () => { const result=setActiveDeck(`${BUILTIN}${name}`); if (!result.ok) { void tellModal('Selection not saved',result.message); return; } render(); };
        row.appendChild(play);
        const view = el('button', 'small', 'View Deck'); view.dataset.shelfAction='view';
        view.onclick = async () => { presentation.restoreFocus=true; await menuNavigate(() => deckDetailScreen(name)); render(); };
        const dup = el('button', 'small', 'Duplicate & edit');
        dup.onclick = async () => {
          presentation.restoreFocus=true;
          const copy = structuredClone(dl) as unknown as Draft;
          copy.id = newDeckId();
          copy.archetype = name;
          copy.name = regionOf(name).slice(0,9);
          copy.updated = Date.now();
          await menuNavigate(() => deckBuilderScreen(name, copy));
          render();
        };
        row.appendChild(view);
        const learn = el('button','small','Learn deck');
        learn.dataset.shelfAction='learn';
        learn.onclick=()=>openDeckLearning(dl,name,(id, back)=>showInfo(ALL_CARDS[id]!, undefined, undefined, undefined, back));
        row.append(learn);
        row.appendChild(dup);
        card.appendChild(row);
        grid.appendChild(card);
      }

      for (const deck of mine) {
        const personaRec = ALL_CARDS[deck.persona] ?? deck.main.map(entry=>ALL_CARDS[entry.id]).find(card=>card?.type==='Unit'&&card.level===3);
        const card = el('div', `shelf-card${deck.id === active ? ' active' : ''}`);
        card.dataset.deckId = deck.id;
        card.dataset.region = regionOf(deck.archetype);
        if (personaRec) { card.dataset.previewArt = boardUrl(personaRec.art); card.dataset.bannerArt=setupPortrait(personaRec.id,boardUrl(personaRec.art)); }
        card.dataset.fighterArt = `/ui/menu-v1/characters/${menuProfile().fighter}.webp`;
        const summary = deckViewModel(deck, ALL_CARDS); card.dataset.counts=JSON.stringify(summary.counts);

        const art = el('div', 'shelf-art');
        if (personaRec) art.style.backgroundImage = `url("${artUrl(personaRec.thumb)}")`;
        card.appendChild(art);

        const problems = checkDeck(index, deck);
        const body = el('div', 'shelf-body');
        body.appendChild(el('div', 'shelf-name', escapeHtml(deck.name)));
        body.appendChild(el('div', `shelf-sub${problems.length ? ' bad' : ''}`,
          problems.length
            ? `${summary.mainCount} MAIN / ${summary.codexCount} CODEX · ${problems.length} to fix`
            : `${summary.mainCount} MAIN / ${summary.codexCount} CODEX`));
        if (deck.id === active) body.appendChild(el('div', 'shelf-flag', 'Playing this'));
        card.appendChild(body);

        const row = el('div', 'shelf-actions');
        const play = el('button', 'small primary', 'Use Deck') as HTMLButtonElement;
        play.disabled = problems.length > 0;
        play.onclick = () => { const result=setActiveDeck(deck.id); if (!result.ok) { void tellModal('Selection not saved',result.message); return; } render(); };
        const edit = el('button', 'small', 'Edit');
        edit.onclick = async () => {
          presentation.restoreFocus=true;
          await menuNavigate(() => deckBuilderScreen(deck.archetype, structuredClone(deck)));
          render();
        };
        const more = el('button', 'small', '···');
        more.dataset.shelfAction='more'; more.setAttribute('aria-label','More deck actions');
        more.title = 'Deck code, or delete';
        more.onclick = () => deckMoreMenu(deck, render);
        row.appendChild(play);
        const view=el('button','small','View Deck'); view.dataset.shelfAction='view';
        view.onclick=async()=>{presentation.restoreFocus=true;await menuNavigate(()=>deckDetailScreen(deck));render();};
        row.appendChild(view);
        row.appendChild(edit);
        const learn = el('button','small','Learn deck');
        learn.dataset.shelfAction='learn';
        learn.onclick=()=>openDeckLearning(deck,deck.archetype,(id, back)=>showInfo(ALL_CARDS[id]!, undefined, undefined, undefined, back));
        row.append(learn);
        row.appendChild(more);
        card.appendChild(row);
        grid.appendChild(card);
      }

      const add = el('div', 'shelf-card shelf-add');
      add.appendChild(el('div', 'shelf-plus', '+'));
      add.appendChild(el('div', 'shelf-name', 'New deck'));
      add.appendChild(el('div', 'shelf-sub', 'Choose an archipelago, then build'));
      add.onclick = async () => {
        const archetype = await menuNavigate(() => archetypeScreen());
        if (archetype) {
          await menuNavigate(() => deckBuilderScreen(
            archetype, draftFrom(archetype, regionOf(archetype)),
          ));
        }
        render();
      };
      grid.appendChild(add);
      s.appendChild(grid);

      const row = el('div', 'row');
      const imp = el('button', 'secondary', 'Import a deck code');
      imp.onclick = () => importCodeDialog(render);
      const back = el('button', 'secondary', 'Back');
      back.onclick = () => { void menuNavigate(() => resolve()); };
      row.appendChild(imp);
      row.appendChild(back);
      s.appendChild(row);
      presentDeckShelf(s, presentation);
      const storageMessage = collection.ok ? collection.warning : collection.message;
      if (storageMessage) { const warning=el('p','deck-storage-warning'); warning.textContent=storageMessage; warning.setAttribute('role','alert'); s.querySelector('.shelf-choice-pane')?.prepend(warning); }
    };
    render();
  });
}

/** The deck code, and deleting — the two things that do not deserve a button each. */
function deckMoreMenu(deck: StoredDeck, done: () => void): void {
  const body = el('div');
  const code = toCode(deck);

  body.appendChild(el('p', 'subtle',
    'A deck code is the one copy of this deck your browser cannot lose. Keep it '
    + 'somewhere, or send it to someone so they can play the same deck.'));

  const box = el('textarea', 'deck-code') as HTMLTextAreaElement;
  box.value = code;
  box.readOnly = true;
  box.rows = 3;
  box.onclick = () => box.select();
  body.appendChild(box);

  const copy = el('button', 'primary', 'Copy code');
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      copy.textContent = 'Copied';
    } catch {
      // Clipboard access can be refused outright. The textarea is already on
      // screen, so select it and say what to press rather than failing quietly.
      box.select();
      copy.textContent = 'Press Ctrl+C';
    }
  };
  const del = el('button', 'secondary danger', 'Delete deck');
  del.onclick = async () => {
    const sure = await askModal(
      'Delete this deck?',
      `"${deck.name}" goes for good. There is no undo, and unless you have `
      + 'its code somewhere, no way back.',
      { confirm: 'Delete', cancel: 'Keep it', danger: true },
    );
    if (!sure) return;
    const result=deleteDeck(index, deck.id);
    if (!result.ok) { const error=el('p','deck-code-error'); error.textContent=result.message; error.setAttribute('role','alert'); body.append(error); return; }
    bg.remove();
    done();
  };
  const close = el('button', 'secondary', 'Close');
  close.onclick = () => bg.remove();

  const bg = modal(deck.name, '', body, [copy, del, close]);
}

function importCodeDialog(done: () => void): void {
  const body = el('div');
  body.appendChild(el('p', 'subtle', 'Paste a deck code beginning with CL1-.'));
  const box = el('textarea', 'deck-code') as HTMLTextAreaElement;
  box.rows = 3;
  box.placeholder = 'CL1-…';
  body.appendChild(box);
  const err = el('p', 'deck-code-error');
  body.appendChild(err);

  let imported: ReturnType<typeof fromCode> | undefined;
  box.oninput=()=>{imported=undefined;};
  const go = el('button', 'primary', 'Import');
  go.onclick = () => {
    const result = imported ??= fromCode(index, box.value);
    if (typeof result === 'string') { err.textContent = result; return; }
    const saved=saveDeck(index, result.deck);
    if (!saved.ok) { err.textContent=saved.message; err.setAttribute('role','alert'); return; }
    bg.remove();
    if (result.dropped.length) {
      const n = result.dropped.length;
      void tellModal(
        'Imported, with gaps',
        `"${result.deck.name}" is in, but ${n} card${n === 1 ? '' : 's'} the code `
        + `name${n === 1 ? 's' : ''} ${n === 1 ? 'is' : 'are'} not in this version `
        + 'of the game, so they were left out. Open the deck in the builder to '
        + 'fill the gaps.',
      ).then(done);
      return;
    }
    done();
  };
  const cancel = el('button', 'secondary', 'Cancel');
  cancel.onclick = () => bg.remove();
  const bg = modal('Import a deck', '', body, [go, cancel]);
  setTimeout(() => box.focus(), 30);
}

/**
 * The three archipelagos, as they are drawn on the site.
 *
 * Same three images, same placement percentages, same tones — a deck is a
 * place before it is a card pool, and the map says that in a way a row of
 * Persona portraits never did. The numbers are the site's, so the country
 * holds its shape here too.
 */
const ARCHIPELAGOS = [
  { id: 'luzon', region: 'Luzon', deck: 'Agta',
    tone: '#e6b93a', map: { left: 20, top: 0, width: 46 } },
  { id: 'visayas', region: 'Visayas', deck: 'Babaylan',
    tone: '#1383f0', map: { left: 38, top: 42, width: 33 } },
  { id: 'mindanao', region: 'Mindanao', deck: 'Maguindanao',
    tone: '#cf4040', map: { left: 25, top: 54, width: 54 } },
] as const;

/** Which archipelago the deck is drawn from. */
function archetypeScreen(): Promise<string | null> {
  return new Promise(resolve => {
    const page=screen();
    const catalogue=Object.fromEntries(Object.entries(ALL_CARDS).filter(([,c])=>isSelectableCard(c)));
    // The shelf controller owns the transition into the builder. Do not nest
    // a second navigation cover here or its busy guard would skip the builder.
    presentArchipelago(page,ARCHIPELAGOS,catalogue,artUrl,value=>{
      if(value)resolve(value);else void menuNavigate(()=>resolve(null));
    });
  });
}

// -------------------------------------------------------------- deck builder

/**
 * Build or edit a deck.
 *
 * The deck panel is the reference view: every physical card as a picture,
 * duplicates and all, so three copies of Kislap are three cards. Main deck,
 * then the Codex below it, which is the arrangement Yu-Gi-Oh has used for
 * twenty years and the reason you can read a decklist at a glance. Fifty
 * cards fit without scrolling at 820px and comfortably above that; the tiles
 * are small because right-click already enlarges any of them.
 *
 * Nothing is added for you. An earlier version filled in the twelve Force and
 * the five Codex, on the grounds that the pool leaves only one legal answer
 * for each — which was true, and still not the builder's decision to make.
 * They are ordinary cards in the library now. The rules are checks, never
 * actions: a deck that breaks one cannot be saved, and that is all.
 */
function deckBuilderScreen(archetype: string, draft: Draft): Promise<Draft | null> {
  return new Promise((resolve) => {
    const region = regionOf(archetype);
    const pool = poolFor(archetype);
    const codexPool = codexPoolFor(archetype);
    const library = [...pool, ...codexPool];

    type Filter = 'All' | 'Unit' | 'Action' | 'Sentry' | 'Force' | 'Codex';
    let query = '';
    let mechanic = '';
    let typeFilter: Filter = 'All';
    let setOneOnly = false;
    let phonePanel: 'deck' | 'library' = 'library';
    let deckScroll = 0;
    let libScroll = 0;
    let selectedCard = "";
    const openGroups = new Set(['Units · Level 3']);
    /** The deck as it was opened, so leaving without touching it asks nothing. */
    const opened = JSON.stringify(draft);
    const protectDraft = (event: BeforeUnloadEvent): void => {
      if (JSON.stringify(draft) === opened) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    const finish = (value: Draft | null): void => {
      window.removeEventListener('beforeunload', protectDraft);
      resolve(value);
    };

    /** Codex are held five distinct, so one copy each is the real limit. */
    const limitFor = (card: CardRecord): number =>
      card.type === 'Codex' ? 1 : copyLimit(card.id);

    const heldOf = (card: CardRecord): number =>
      card.type === 'Codex'
        ? (draft.codex.includes(card.id) ? 1 : 0)
        : copiesOf(draft, card.id);

    const setHeld = (card: CardRecord, n: number): void => {
      if (card.type === 'Codex') {
        draft.codex = n > 0
          ? (draft.codex.includes(card.id) ? draft.codex : [...draft.codex, card.id])
          : draft.codex.filter((id) => id !== card.id);
        return;
      }
      setCopies(draft, card.id, n);
    };

    const render = (): void => {
      const focused = (document.activeElement as HTMLElement | null)?.dataset.deckFocus;
      const s = screen();
      s.classList.add('builder-screen');
      s.dataset.dirty = String(JSON.stringify(draft) !== opened);

      // --- one line, top left ------------------------------------------
      const bar = el('div', 'builder-bar');
      const nameBox = el('input', 'builder-name') as HTMLInputElement;
      nameBox.value = draft.name;
      nameBox.maxLength = MAX_DECK_NAME_LENGTH;
      nameBox.setAttribute('aria-label', 'Deck name');
      nameBox.title = `Up to ${MAX_DECK_NAME_LENGTH} characters`;
      nameBox.oninput = () => {
        draft.name = nameBox.value;
        const dirty = JSON.stringify(draft) !== opened;
        s.dataset.dirty = String(dirty);
        const note = s.querySelector('.builder-save-note');
        if (note) note.textContent = dirty ? 'Changes not saved' : 'No unsaved changes';
      };
      bar.appendChild(nameBox);

      const problems = checkDeck(index, draft);
      const save = el('button', 'primary', 'Save deck') as HTMLButtonElement;
      save.disabled = problems.length > 0;
      save.title = problems.length ? problems[0]!.message : '';
      save.onclick = () => {
        // The decklist still carries a Persona so the engine's own validation
        // has a default to check, but it is never asked for here — whoever
        // leads is chosen at the top of a duel. First Level 3 Unit in the
        // deck, and the pick screen overrides it every game.
        const lead = draft.main
          .map((e) => ALL_CARDS[e.id])
          .find((c) => c?.type === 'Unit' && c.level === PERSONA_LEVEL);
        if (lead) draft.persona = lead.id;
        const result=saveDeck(index,draft);
        if (!result.ok) { void tellModal(result.saved ? 'Deck saved; selection not saved' : 'Deck not saved',result.message); return; }
        save.disabled=true;
        void menuNavigate(() => finish(draft));
      };
      const cancel = el('button', 'secondary', 'Cancel');
      cancel.onclick = async () => {
        // Nothing has changed yet on a deck opened and not touched, so there
        // is nothing to warn about.
        const untouched = JSON.stringify(draft) === opened;
        if (untouched || await askModal(
          'Leave without saving?',
          'Every change you have made to this deck since opening it will be lost.',
          { confirm: 'Discard changes', cancel: 'Keep building', danger: true },
        )) void menuNavigate(() => finish(null));
      };
      bar.appendChild(save);
      bar.appendChild(cancel);
      const learn=el('button',undefined,'Learn deck');
      learn.onclick=()=>openDeckLearning(draft,archetype,(id, back)=>showInfo(ALL_CARDS[id]!, undefined, undefined, undefined, back));
      bar.append(learn);

      const tabs = el('div', 'panel-tabs');
      for (const which of ['deck', 'library'] as const) {
        const t = el('button', `ptab${phonePanel === which ? ' on' : ''}`,
          which === 'deck' ? 'Deck' : 'Library');
        t.onclick = () => { phonePanel = which; render(); };
        tabs.appendChild(t);
      }
      bar.appendChild(tabs);
      s.appendChild(bar);

      const forceTotal=draft.main.reduce((n,e)=>n+(ALL_CARDS[e.id]?.type==='Force'?e.copies:0),0);
      const readiness=deckReadiness(problems,deckSize(draft),forceTotal,draft.codex.length);
      const strip=el('div', 'builder-problems readiness '+readiness);
      strip.setAttribute('role','status');
      strip.append(el('strong',undefined,readiness==='ready'?'✓ Ready to save':readiness==='incomplete'?'● Deck in progress':'! Deck needs correction'));
      strip.title = problems.map(p=>p.message).join(' · ') || 'All deck requirements met.';
      const explain = el('details', 'builder-validation-details');
      explain.append(el('summary', '', problems.length ? `${problems.length} requirement${problems.length===1?'':'s'}` : 'Requirements'));
      const messages = el('ul');
      for (const problem of problems) messages.append(el('li', '', escapeHtml(problem.message)));
      if (!problems.length) messages.append(el('li', '', 'All deck requirements met.'));
      explain.append(messages); strip.append(explain);
      s.append(strip);

      const cols = el('div', `builder-cols showing-${phonePanel}`);

      // ================================================ left: your deck
      const left = el('div', 'bpanel panel-deck');
      const lhead = el('div', 'bpanel-head');
      lhead.appendChild(el('h3', 'bpanel-h', 'Your deck'));

      const counters = el('div', 'builder-counters');
      const count = (label: string, now: string, want: string, ok: boolean): void => {
        const c = el('div', `bcount${ok ? ' okay' : Number(now)>Number.parseInt(want)?' over':' pending'}`);
        c.appendChild(el('span', 'bcount-n', now));
        c.appendChild(el('span', 'bcount-l', `${label} / ${want}`));
        counters.appendChild(c);
      };
      const size = deckSize(draft);
      const typeTotal = (t: string): number => draft.main.reduce(
        (n, e) => n + (ALL_CARDS[e.id]?.type === t ? e.copies : 0), 0);
      const forceNow = typeTotal('Force');
      const sentryNow = typeTotal('Sentry');
      count('cards', String(size), String(DECK_SIZE), size === DECK_SIZE);
      count('Force', String(forceNow), String(FORCE_COUNT), forceNow === FORCE_COUNT);
      count('Sentry', String(sentryNow), '3 max', sentryNow <= MAX_SENTRY);
      count('Codex', String(draft.codex.length), String(CODEX_COUNT),
        draft.codex.length === CODEX_COUNT);
      lhead.appendChild(counters);
      left.appendChild(lhead);

      const deckBody = el('div', 'bpanel-body');

      // One upright card per distinct entry; quantities remain the draft's
      // actual copies. Expanding a group is presentation state only.
      const distinct = [...new Set(draft.main.map(entry => entry.id))]
        .map(id => ALL_CARDS[id]).filter((card): card is CardRecord => !!card);
      const inspectContext: CardInspectionContext = {
        cards: [...distinct, ...draft.codex.map(id => ALL_CARDS[id]!).filter(Boolean)],
        quantity: id => heldOf(ALL_CARDS[id]!), limit: id => limitFor(ALL_CARDS[id]!), label: 'Deck Builder',
      };
      if (!distinct.length) {
        deckBody.appendChild(el('p', 'builder-note',
          'Empty. Add cards from the library on the right.'));
      } else {
        for (const [heading, cards] of groupLibrary(distinct)) {
          const group = el('details', 'deck-group') as HTMLDetailsElement;
          group.open = openGroups.has(heading);
          const total = cards.reduce((n, card) => n + heldOf(card), 0);
          group.append(el('summary', '', `${heading} (${total})`));
          group.ontoggle = () => { if(group.open)openGroups.add(heading);else openGroups.delete(heading); };
          const grid = el('div', 'deck-grid');
          for (const card of cards) grid.append(deckCard(card, {
            remove: () => { selectedCard=card.id;setHeld(card, heldOf(card) - 1); render(); },
            inspect: () => showInfo(card, undefined, undefined, undefined, undefined, inspectContext),
          },heldOf(card)));
          group.append(grid); deckBody.append(group);
        }
      }

      left.appendChild(deckBody);

      // The Codex sits below the scrolling deck rather than at the end of it.
      // As the last thing in a scrolling column it was the first thing to fall
      // off the bottom of a short window — and being exactly five cards that
      // every deck must have, it is the section you least want to have to go
      // looking for. Its own row in the panel grid means it is always whole.
      const codexFoot = el('div', 'bpanel-foot');
      codexFoot.appendChild(deckHeading('Codex',
        `${draft.codex.length} / ${CODEX_COUNT}`));
      if (!draft.codex.length) {
        codexFoot.appendChild(el('p', 'builder-note',
          `Pick ${CODEX_COUNT} from the library. They are held outside the deck.`));
      } else {
        const grid = el('div', 'deck-grid');
        for (const id of draft.codex) {
          const card = ALL_CARDS[id];
          if (!card) continue;
          grid.appendChild(deckCard(card, {
            remove: () => { setHeld(card, 0); render(); },
            inspect: () => showInfo(card, undefined, undefined, undefined, undefined, inspectContext),
          }));
        }
        codexFoot.appendChild(grid);
      }
      left.appendChild(codexFoot);
      cols.appendChild(left);

      // ============================================== right: the library
      const right = el('div', 'bpanel panel-library');
      const rhead = el('div', 'bpanel-head');
      rhead.appendChild(el('h3', 'bpanel-h', `${region} library`));

      const search = el('input', 'builder-search') as HTMLInputElement;
      search.type = 'search';
      search.placeholder = 'Search name or card text…';
      search.value = query;
      search.setAttribute('aria-label', 'Search cards');
      search.oninput = () => { query = search.value; redrawLibrary(); };
      rhead.appendChild(search);
      const mechanicFilter=el('select') as HTMLSelectElement;
      mechanicFilter.setAttribute('aria-label','Filter by mechanic');
      for(const value of ['',...MECHANICS])mechanicFilter.add(new Option(value||'All mechanics',value));
      mechanicFilter.value=mechanic;
      mechanicFilter.onchange=()=>{mechanic=mechanicFilter.value;redrawLibrary();};rhead.append(mechanicFilter);

      const chips = el('div', 'filter-chips');
      const filters: Filter[] = ['All', 'Unit', 'Action', 'Sentry', 'Force', 'Codex'];
      const chipLabel: Record<string, string> = { Unit: 'Units', Action: 'Actions' };
      for (const f of filters) {
        const chip = el('button', `fchip${typeFilter === f ? ' on' : ''}`,
          chipLabel[f] ?? f);
        chip.onclick = () => { typeFilter = f; render(); };
        chips.appendChild(chip);
      }
      rhead.appendChild(chips);
      const setChip = el('button', `fchip${setOneOnly ? ' on' : ''}`, 'Set 1');
      setChip.setAttribute('aria-pressed', String(setOneOnly));
      setChip.onclick = () => { setOneOnly = !setOneOnly; render(); };
      chips.appendChild(setChip);
      right.appendChild(rhead);

      const libBody = el('div', 'bpanel-body');
      right.appendChild(libBody);
      cols.appendChild(right);
      s.appendChild(cols);

      function redrawLibrary(): void {
        libBody.replaceChildren();
        const q = query.toLowerCase();
        const shown = library.filter((c) => {
          if(mechanic&&!c.text.toLowerCase().includes(mechanic.toLowerCase()))return false;
          if (setOneOnly && c.set !== 'set-1') return false;
          if (typeFilter !== 'All' && c.type !== typeFilter) return false;
          if (!q) return true;
          return cardSearchText(c.id).includes(q);
        });
        if (!shown.length) {
          libBody.appendChild(el('p', 'builder-note', `No ${region} card matches that.`));
          return;
        }
        for (const [heading, cards] of groupLibrary(shown)) {
          const sep = el('div', 'section-label');
          sep.appendChild(el('span', undefined, heading));
          libBody.appendChild(sep);
          const grid = el('div', 'library-grid');
          for (const card of cards) {
            grid.appendChild(libraryTile(card, heldOf(card), limitFor(card), {
              add: () => {
                const now = heldOf(card);
                if (now < limitFor(card)) { selectedCard=card.id;setHeld(card, now + 1); render(); }
              },
              fill: () => { selectedCard=card.id;setHeld(card, limitFor(card)); render(); },
              remove: () => { if(heldOf(card)>0){selectedCard=card.id;setHeld(card,heldOf(card)-1);render();} },
              inspect: () => showInfo(card, undefined, undefined, undefined, undefined, {
                cards: shown, quantity: id => heldOf(ALL_CARDS[id]!), limit: id => limitFor(ALL_CARDS[id]!), label: 'Card Library',
              }),
            },selectedCard===card.id));
          }
          libBody.appendChild(grid);
        }
        libBody.scrollTop = libScroll;
      }
      redrawLibrary();

      deckBody.scrollTop = deckScroll;
      deckBody.onscroll = () => { deckScroll = deckBody.scrollTop; };
      libBody.onscroll = () => { libScroll = libBody.scrollTop; };
      presentRefinedBuilder(s);
      // Reparenting into the approved shell changes scroll geometry; restore after layout.
      deckBody.scrollTop=deckScroll;libBody.scrollTop=libScroll;
      if (focused) {
        const targets = Array.from(s.querySelectorAll<HTMLElement>('[data-deck-focus]'));
        // Fill disappears, and Add becomes disabled, when the legal limit is reached.
        // Keep keyboard focus on that card instead of dropping it onto the page.
        const target = targets.find(n => n.dataset.deckFocus === focused && !n.hasAttribute('disabled'))
          ?? targets.find(n => n.dataset.deckFocus === 'library-' + selectedCard);
        target?.focus({ preventScroll: true });
      }

    };

    render();
  });
}

/** "Main deck   50 / 50" — the heading over a section of the decklist. */
function deckHeading(label: string, tally: string): HTMLElement {
  const h = el('div', 'section-label');
  h.appendChild(el('span', undefined, label));
  h.appendChild(el('i', undefined, tally));
  return h;
}

interface DeckCardActions { remove: () => void; inspect?: () => void }

/**
 * One physical card in the decklist.
 *
 * Big enough to recognise, small enough that fifty of them plus the Codex are
 * on screen at once — which is the whole point of the view. Right-click
 * enlarges any of them.
 */
function deckArtwork(card:CardRecord):HTMLElement {
  const wrap=el('div','art-wrap');const image=document.createElement('img');image.className='card-art';
  image.src=artUrl(card.art);image.alt=card.name;image.loading='lazy';wrap.append(image,...createCardStatBadges(card));return wrap;
}
function deckTool(label:string,name:string,action:()=>void,cls:string,key:string):HTMLButtonElement {
  const button=el('button',cls,label) as HTMLButtonElement;button.type='button';button.setAttribute('aria-label',name);button.title=name;button.dataset.deckFocus=key;
  button.onclick=e=>{e.stopPropagation();action();};button.onkeydown=e=>e.stopPropagation();return button;
}
function deckCard(card: CardRecord, act: DeckCardActions, copies=1): HTMLElement {
  const tile=el('article','card-item deck-copy');const artwork=deckArtwork(card);
  artwork.append(el('span','deck-copy-count','×'+copies));
  const caption=el('div','card-caption');caption.append(el('div','card-name',escapeHtml(card.name)));
  const inspect=act.inspect??(()=>showInfo(card));
  const tools=el('div','card-tools');tools.append(
    deckTool('Inspect','Inspect '+card.name,inspect,'inspect-card','inspect-deck-'+card.id),
    deckTool('−','Remove one '+card.name,act.remove,'remove','remove-'+card.id));
  caption.append(tools);tile.append(artwork,caption);attachInspect(tile,card);
  tile.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();inspect();};
  tile.dataset.deckFocus='deck-'+card.id;
  tile.setAttribute('aria-label',card.name+', '+copies+' copies. Remove one copy.');tile.onclick=act.remove;
  // attachInspect owns Enter/Space; handling them twice removes two copies.
  tile.onkeydown=e=>{if(e.target===tile&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();act.remove();}};
  return tile;
}
interface LibActions { add: () => void; fill: () => void; remove: () => void; inspect?: () => void }
function libraryTile(card: CardRecord, held: number, limit: number, act: LibActions, selected=false): HTMLElement {
  const full=held>=limit,tile=el('article','card-item library-card'+(selected?' selected':''));
  const artwork=deckArtwork(card);if(selected)artwork.append(el('span','selected-mark','✓ SELECTED'));
  const caption=el('div','card-caption');caption.append(el('div','card-name',escapeHtml(card.name)),
    el('div','card-meta',escapeHtml(card.type+(card.type==='Unit'?' · Lv '+card.level:''))+(card.set==='set-1'?' <span>Set 1</span>':'')));
  const tools=el('div','card-tools quantity-controls');
  const remove=deckTool('−','Remove one '+card.name,act.remove,'remove','remove-library-'+card.id);remove.disabled=held===0;
  const add=deckTool('+','Add one '+card.name,act.add,'add','add-'+card.id);add.disabled=full;
  tools.append(remove,el('span','quantity',held+'<em> / '+limit+'</em>'),add);
  const actions=el('div','card-tools secondary-controls'),inspect=act.inspect??(()=>showInfo(card));
  actions.append(deckTool('Inspect','Inspect '+card.name,inspect,'inspect-card','inspect-library-'+card.id));
  if(limit>1){const fill=deckTool('Fill','Fill to '+limit+' copies of '+card.name,act.fill,'fill','fill-'+card.id);fill.disabled=full;actions.append(fill);}
  caption.append(tools,actions);if(full)caption.append(el('span','copy-limit-label','✓ LIMIT REACHED'));
  tile.append(artwork,caption);attachInspect(tile,card);tile.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();inspect();};tile.dataset.deckFocus='library-'+card.id;
  tile.setAttribute('aria-label',card.name+', '+held+' of '+limit+(full?'. Copy limit reached.':'. Add a copy.'));
  tile.onclick=()=>{if(!full)act.add();};return tile;
}

/**
 * Library sections: Units by Level, then the rest by what they are.
 *
 * Force and Codex are ordinary entries here — they are cards a player adds,
 * not settings the builder fills in.
 */
function groupLibrary(cards: CardRecord[]): Array<[string, CardRecord[]]> {
  const units = cards.filter((c) => c.type === 'Unit');
  const levels = [...new Set(units.map((c) => c.level ?? 0))].sort((a, b) => b - a);
  const byName = (a: CardRecord, b: CardRecord): number => a.name.localeCompare(b.name);
  const groups: Array<[string, CardRecord[]]> = [];

  for (const lv of levels) {
    groups.push([`Units · Level ${lv}`, units.filter((c) => c.level === lv).sort(byName)]);
  }
  for (const type of ['Action', 'Sentry', 'Force', 'Codex'] as const) {
    groups.push([type === 'Action' ? 'Actions' : type,
      cards.filter((c) => c.type === type).sort(byName)]);
  }
  return groups.filter(([, cs]) => cs.length > 0);
}



// ----------------------------------------------------------- deck browser


/** Read-only decklist for both protected starters and saved lists. */
function deckDetailScreen(deckName: string | StoredDeck): Promise<void> {
  return new Promise((resolve) => {
    const starter = typeof deckName === 'string';
    const dl = starter ? DECKS[deckName]! : deckName;
    const archetype = starter ? deckName : deckName.archetype;
    const model = deckViewModel(dl, ALL_CARDS);
    const allEntries = [...model.main, ...model.codex];
    const rec = ALL_CARDS[dl.persona] ?? allEntries.find(entry => entry.card.type === 'Unit' && entry.card.level === 3)?.card ?? allEntries[0]?.card;
    const s = screen();
    s.classList.add('deck-catalogue');
    presentDeckViewer(s, {
      model, name: starter ? regionOf(archetype) : dl.name, region: regionOf(archetype), starter,
      coverUrl: rec ? setupPortrait(rec.id, boardUrl(rec.art)) : CARD_BACK,
      coverId: rec?.id,
      fighterUrl: '/ui/menu-v1/characters/' + menuProfile().fighter + '.webp',
      code: toCode({ ...dl, archetype }),
      inspect: (id, restoreFocus) => showInfo(ALL_CARDS[id]!, undefined, undefined, undefined, restoreFocus, {
        cards: allEntries.map(entry => entry.card),
        quantity: cardId => allEntries.find(entry => entry.id === cardId)?.copies ?? 0,
        limit: cardId => ALL_CARDS[cardId]?.type === 'Codex' ? 1 : copyLimit(cardId), label: 'Decklist',
      }),
      back: () => { void menuNavigate(() => resolve()); },
    });
  });
}


/**
 * Roll for first turn.
 *
 * The result and the Continue button are committed immediately; the tumbling
 * animation is decoration layered on top. A throttled or skipped timer can
 * therefore never leave the player stranded on this screen.
 */
function diceScreen(seed: number, opponentFighter: MenuFighter): Promise<PlayerId> {
  return new Promise((resolve) => {
    const s = screen();
    const {dice:[d0,d1],result:label,footer} = dicePresentation(s, opponentFighter);
    const btn = el('button', 'setup-primary', 'Roll');
    footer.appendChild(btn);

    btn.onclick = () => {
      btn.remove();
      const result = rollForFirst(makeRng(seed));

      // Commit the outcome up front.
      const settle = () => {
        showDie(d0, result.rolls[0]);
        showDie(d1, result.rolls[1]);
        (result.first === 0 ? d0 : d1).classList.add('win');
        label.innerHTML = result.first === HUMAN
          ? '<b>You go first.</b>'
          : '<b>Your opponent goes first.</b>';
      };
      settle();

      const go = el('button', 'setup-primary', 'Continue');
      go.onclick = () => { go.onclick=null; go.setAttribute('disabled',''); resolve(result.first); };
      footer.appendChild(go);
      go.focus();

      // Cosmetic motion never changes the displayed committed result.
      d0.classList.add('rolled'); d1.classList.add('rolled');
    };
  });
}

function pickScreen(
  title: string, sub: string, ids: string[], personaName?: string,
): Promise<string> {
  return new Promise((resolve) => {
    const s = screen();
    s.classList.add('pick-screen');
    const isCodex = personaName !== undefined;
    s.classList.add(isCodex ? 'setup-codex' : 'setup-persona');
    const {content,footer} = setupShell(s,isCodex?2:1,title,sub);
    const row = el('div', 'setup-card-rail');
    row.setAttribute('aria-label',isCodex?'Starting Codex choices':'Persona choices');
    const preview = el('aside','setup-card-preview');
    const previewArt = el('img') as HTMLImageElement;
    const previewName = el('h2');
    const previewCopy = el('p');
    const previewWords = el('div','setup-preview-words');
    previewWords.append(previewName,previewCopy); preview.append(previewArt,previewWords);
    preview.hidden=true;
    const summary = el('span','setup-selection',personaName ? 'Persona: '+personaName+' · Choose a Codex' : 'Choose your Persona');
    summary.setAttribute('aria-live','polite');
    let chosen: string | null = null;
    let committed = false;
    const go = el('button', 'setup-primary', isCodex?'Confirm Codex':'Confirm Persona') as HTMLButtonElement;
    go.disabled = true;
    for (const id of ids) {
      const rec = trainingRecord(ALL_CARDS[id]!);
      const tile = el('div','setup-card');
      const b = el('button', 'setup-card-choice') as HTMLButtonElement;
      b.type = 'button'; b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label', cardDisplayName(rec.name));
      const img = el('img') as HTMLImageElement;
      img.src = boardUrl(rec.art); img.alt = '';
      const marker=el('span','setup-card-selected','✓ Selected');
      b.append(img,marker);
      const name=el('div','setup-card-name',cardDisplayName(rec.name));
      const inspect=el('button','setup-inspect','⌕ Inspect');
      inspect.setAttribute('aria-label','Inspect '+cardDisplayName(rec.name));
      inspect.onclick=()=>showInfo(rec);
      b.onclick = () => {
        row.querySelectorAll('.setup-card-choice').forEach(n=>{n.classList.remove('sel');n.setAttribute('aria-pressed','false');});
        b.classList.add('sel');b.setAttribute('aria-pressed','true');
        chosen=id;go.disabled=false;preview.hidden=false;
        previewArt.src=setupPortrait(id,artUrl(rec.art));previewArt.alt=cardDisplayName(rec.name);
        previewArt.classList.toggle('framed-preview',previewArt.src.includes('/cards/'));
        previewName.textContent=cardDisplayName(rec.name);
        previewCopy.textContent=rec.tutorial?.role === 'codex-attack' ? 'Attack Codex · Your Persona gets +5,000 Power while attacking.'
          : rec.tutorial?.role === 'codex-barrier' ? 'Barrier Codex · Your Persona gets +1,000 Power per broken Barrier.'
          : isCodex?'This Codex begins face up.':'Level 3 · Persona';
        summary.textContent=personaName ? 'Persona: '+personaName+' · Codex: '+cardDisplayName(rec.name) : 'Selected: '+cardDisplayName(rec.name);
      };
      attachInspect(b,rec);
      tile.append(b,name,inspect);row.appendChild(tile);
    }
    content.append(row,preview);footer.append(summary,go);
    go.onclick = () => {
      if(!chosen || committed)return;
      committed=true;go.disabled=true;hideInfo();resolve(chosen);
    };
  });
}

// ------------------------------------------------------------------ the game

interface Sel {
  handUid?: string;
  attacker?: string;
  supporters: string[];
  /** UID of a field unit selected for relocation. */
  relocateUid?: string;
}

export class BoardUI {
  /** Resolves only after the final controller boundary and local write settle. */
  resultRecordingReady: Promise<{entry:StoredReplay;saved:boolean}|null> | null = null;
  /** Deck facts captured at setup, independent of later menu/profile changes. */
  resultDeckContext: ActiveDeckContext | null = null;
  /** Settle a completed local recording even if a response still awaits input. */
  onRecordingConceded?: () => void;
  /**
   * The banner / status / calculator layer, and the queue that drives it.
   *
   * Built on first use rather than in the constructor: a BoardUI is also made
   * for the title-screen demo and for tests, and neither should put a fixed
   * overlay on the document.
   */
  private hud: DuelHud | null = null;
  private presentation: PresentationQueue | null = null;
  /** Match/reconnect ownership, independent of ordinary visual fast-forward. */
  private attackPresentation = new AbortController();
  /** How many recorded events have already been handed to the queue. */
  private presentedUpTo = 0;

  private sel: Sel = { supporters: [] };
  private hint = '';
  private busy = false;
  private practiceDealt = false;
  private practiceSelection = '';
  private practiceAutoMinimized = false;
  private transit = new CardTransit();
  private tutorialCoachMinimized = false;
  private tutorialCoachSuppressed = false;
  private tutorialPauseResolve: (() => void) | null = null;

  constructor(
    private ctrl: GameController,
    /** How hard the opponent plays; see settings.aiDifficulty. */
    private aiProfile: AiProfile = AI_NORMAL,
    private tutorial: TutorialSession | null = null,
    private prepared = false,
    private nextBattle: NextBattleSession | null = null,
    private graduation = false,
    private battlefield: BattlefieldPresentation = DEFAULT_BATTLEFIELD,
    private opponentFighter: MenuFighter | null = null,
  ) { index = ctrl.index; presentationScripts = ctrl.scripts; void initGlFx(); }

  get game() { return this.ctrl.game; }
  get selectedAttacker() { return this.sel.attacker; }
  activity() { return duelActivity(this.game, !(this.ctrl instanceof RemoteController) || this.ctrl.connected, this.ctrl instanceof RemoteController ? this.ctrl.frame.busy : this.game.turnPlayer !== HUMAN, localDecisionPending(this.game) || (this.ctrl instanceof RemoteController && !!this.ctrl.displayDecision)); }
  private resetAttackPresentation(): void {
    this.attackPresentation.abort();
    this.attackPresentation = new AbortController();
  }
  /** A replaced board must not finish an old attack over the new screen. */
  disposePresentation(): void {
    hideModPopover();
    this.attackPresentation.abort();
    this.presentation?.reset();
    this.hud?.destroy();
    finishDuelMotion();
  }
  resumePresentation():void {
    if (this.ended) return;
    this.resetAttackPresentation();
    clearActionRecap(); this.recapTracker.reset(this.game); this.expiryTracker.reset();
    this.powerCueTracker.reset();
    this.phaseCueTracker.reset(phaseCueKey(this.game.turnNumber, this.game.phase, this.game.turnPlayer));
    clearChainCues();
    this.resolvingSource?.classList.remove('effect-source-active'); this.resolvingSource = null;
    this.presentation?.reset();finishDuelMotion();
    this.presentedUpTo=eventLogOf(this.game).events.length;
    if(!document.hidden){this.hint='Table updated. Use Last to review the latest action.';this.render();}
  }
  private remoteDecision = '';
  connectRemote(ctrl: RemoteController): void {
    ctrl.onFrameSettled = () => { if (!ctrl.frame.busy) this.render(); else this.refreshEffectAvailability(); };
    const chooser = new HumanChooser(() => this.game);
    const hooks = this.hooks();
    let legacyAttack = new LegacyAttack(ctrl.game.activeBattle);
    let legacyMoves = new LegacyPileMoves(ctrl.game);
    let legacy = ctrl.version.protocol === 2 ? new LegacyRemotePresentation(ctrl.frame.cues ?? [], id => showInfo(ALL_CARDS[id]!), (uid, owner) => this.effectSource(uid, owner)) : undefined;
    // Refresh restores the current table without replaying the whole match.
    this.presentedUpTo = eventLogOf(this.game).events.length;
    this.recapTracker.reset(this.game);
    let reconnecting = false;
    ctrl.onNotice = message => { if (!ctrl.connected) {
      this.resetAttackPresentation();
      reconnecting = true; legacy?.dispose(); clearActionRecap(); clearChainCues();
      this.presentation?.reset(); clearPresentationNotices(); finishDuelMotion();
      autoDescEl?.classList.remove('show');
    } this.hint = message; this.render(); };
    ctrl.onFrame = async () => {
      if (reconnecting && ctrl.connected) {
        this.recapTracker.reset(this.game); this.expiryTracker.reset(); reconnecting = false;
        this.powerCueTracker.reset();
        this.phaseCueTracker.reset(phaseCueKey(this.game.turnNumber, this.game.phase, this.game.turnPlayer));
        legacyAttack = new LegacyAttack(ctrl.game.activeBattle);
        legacyMoves = new LegacyPileMoves(ctrl.game);
        if (ctrl.version.protocol === 2) legacy = new LegacyRemotePresentation(ctrl.frame.cues ?? [], id => showInfo(ALL_CARDS[id]!), (uid, owner) => this.effectSource(uid, owner));
      }
      legacy?.captureField();
      const event = ctrl.frame.presentation;
      if (event && !document.hidden) {
        const captured=traceContext();
        const hook = hooks[event.hook] as ((...args: unknown[]) => Promise<void>) | undefined;
        tracePresentation(`native.${event.hook}.start`,captured);
        await hook?.(...event.args);
        tracePresentation(`native.${event.hook}.finish`,captured);
      } else if(event) tracePresentation(`native.${event.hook}.skipped-hidden`);
      if (!ctrl.connected) return;
      const pileMoves = legacy ? legacyMoves.take(this.game) : [];
      if (pileMoves.length && !document.hidden) {
        ctrl.presenting = true;
        await legacy?.enqueue(ctrl.frame.cues ?? []);
        for (const move of pileMoves) await this.playFx(move);
      }
      if (event?.hook !== 'onFx') this.render();
      if (legacy && legacyAttack.take(this.game.activeBattle) && !document.hidden) {
        ctrl.presenting = true;
        await hooks.onAttackDeclared?.(this.game.activeBattle!);
      }
      await legacy?.enqueue(ctrl.frame.cues ?? []);
      if (!ctrl.connected) return;
      if (this.game.winner !== null) {
        legacy?.dispose();
        document.querySelectorAll('.duel-panel').forEach(n => n.remove());
        this.showWinner(); return;
      }
      const decision = ctrl.displayDecision;
      if (decision && decision.id !== this.remoteDecision) {
        tracePresentation('decision.dispatch');
        this.remoteDecision = decision.id;
        traceDecisionAvailability(()=>ctrl.connected&&ctrl.frame.decision?.id===decision.id);
        const method = chooser[decision.kind] as (...args: unknown[]) => Promise<unknown>;
        void method.apply(chooser, decision.args).then(answer => {
          if (ctrl.frame.decision?.id === decision.id) ctrl.answer(decision.id, answer);
        }).catch(error => { this.hint = String(error); this.render(); });
      }
      void this.drainEvents();
    };
    ctrl.onFrame();
  }
  private get firstBattle(): FirstBattleSession | null {
    return this.tutorial instanceof FirstBattleSession ? this.tutorial : null;
  }

  private get journey(): JourneySession | null { return this.tutorial instanceof JourneySession ? this.tutorial : null; }

  onTutorialCardRead(cardId: string): void {
    this.journey?.inspect(cardId);
    const first = this.firstBattle;
    if (first?.step.id === 'inspect' && inst(this.game, first.cards.ally).defId === cardId) {
      first.observe({ kind: 'cue', cue: 'inspected' });
    }
  }

  private getHud(): DuelHud {
    if (!this.hud) {
      this.hud = new DuelHud({
        nodeFor: (uid) => this.cardNodes.get(uid) ?? handCardNode(uid),
        nameOf: (uid) =>
          this.game.cards[uid] ? recordOf(this.game, uid).name : uid,
        thumbOf: (uid) =>
          this.game.cards[uid] ? artUrl(recordOf(this.game, uid).thumb) : null,
        onLastAction: () => this.openLastAction(),
        inspect: uid => { if (this.game.cards[uid]) { highlightEffectTarget(this.findCardNode(uid, false)); showInfo(recordOf(this.game, uid), undefined, uid); } },
      });
    }
    return this.hud;
  }

  private getPresentation(): PresentationQueue {
    if (!this.presentation) {
      const hud = this.getHud();
      this.presentation = new PresentationQueue(hud, {
        // The unattended demo has no player to acknowledge Learning holds.
        pace: () => this.demo ? 'fast' : settings().duelPace,
        reducedMotion: motionReduced,
      });
    }
    return this.presentation;
  }

  /**
   * Hand the queue everything the rules have recorded since last time.
   *
   * Pull rather than push: the engine emits as it goes and never waits for the
   * interface, so the board catches up at the player's pace behind it. The
   * high-water mark is what stops an event being presented twice.
   */
  private async drainEvents(): Promise<void> {
    // The guided lesson explains these same moments at engine pause points.
    if (this.firstBattle) { this.presentedUpTo = eventLogOf(this.game).events.length; return; }
    if (this.game.winner !== null) return;
    const log = eventLogOf(this.game);
    if (log.events.length <= this.presentedUpTo) return;
    const fresh = log.events.slice(this.presentedUpTo);
    this.presentedUpTo = log.events.length;
    const q = this.getPresentation();
    // Filtered again here, not only in the model: a hot-seat build would
    // otherwise show both players' private events through the same banner.
    const nativeHooks = !(this.ctrl instanceof RemoteController) || this.ctrl.version.protocol >= 3;
    if (this.ctrl instanceof RemoteController && nativeHooks) {
      announceNativeResults(fresh, step => this.getHud().announce(step));
    }
    q.enqueue(fresh.filter(ev => canSee(ev, HUMAN) && needsResultPresentation(ev, nativeHooks)));
    await q.run();
  }

  /** Finish what is on screen. Never answers a decision. */
  finishAnimation(): void {
    this.presentation?.finishCurrent();
    finishDuelMotion();
  }

  inspectionDetails(uid: string): string {
    const c = this.game.cards[uid]; if (!c || c.defId === '__hidden__') return '';
    const field = c.zone === 'ally' || c.zone === 'persona';
    const lines: string[] = [`<p><b>${markKeywords((fieldPosition(c, HUMAN) ?? c.zone.toUpperCase()) + (field ? ` · ${c.exhausted ? 'Exhausted' : 'Charged'}` : ''))}</b></p>`];
    for (const skill of grantedSkills(c, this.game.turnNumber)) lines.push(`<p class="subtle"><b>Added skill</b> · ${formatSkillText(grantedSkillText(skill))}</p>`);
    const powerDetails: string[] = [];
    for (const m of groupModifiers(c.modifiers)) powerDetails.push(`<p class="subtle">${signedPower(m.amount * m.count)} · ${escapeHtml(modifierSource(m))}${m.count > 1 ? ` · ${m.count} boosts` : ''} · ${escapeHtml(DURATION_LABELS[m.duration])}${m.causes.length ? `<br>Offered: ${m.causes.map(c => escapeHtml(originLabel(c))).join('; ')}` : ''}</p>`);
    if (field) for (const m of passiveBonuses(index, this.game, uid)) powerDetails.push(`<p class="subtle">${m.amount >= 0 ? '+' : ''}${m.amount.toLocaleString()} · ${escapeHtml(m.source)} · while its condition applies</p>`);
    if (powerDetails.length) lines.push(`<details class="inspect-extra"><summary>Power sources</summary>${powerDetails.join('')}</details>`);
    const legal = c.owner === HUMAN && !duelDecisionPending() ? this.legalActions() : [];
    const availability: string[] = [];
    this.ctrl.scriptFor(uid)?.abilities?.forEach((ability, i) => {
      const available = legal.some(a => a.kind === 'ability' && a.uid === uid && a.abilityIndex === i);
      const ctx = c.owner === HUMAN ? { game: this.game, index, me: c.owner, source: uid, chooser: new HumanChooser(() => this.game) } : undefined;
      availability.push(`<p class="inspect-skill"><b>Skill ${i + 1}</b> · ${markKeywords(skillStatus(this.game, uid, ability, i, available, ctx))}</p>`);
    });
    if (availability.length) lines.push(`<details class="inspect-extra"><summary>Skill availability</summary>${availability.join('')}</details>`);
    return `<section class="inspect-live" aria-label="Current card information">${lines.join('')}</section>`;
  }

  /** Reopen the most recent thing that happened. */
  openLastAction(): void {
    const log = eventLogOf(this.game);
    const g = lastVisibleGroup(log, HUMAN);
    if (g === null) return;
    const entry = entryForGroup(log.events, g, HUMAN);
    if (entry) this.getHud().showEntry(entry);
  }

  /** Say why a card will not act, in the engine's own words. */
  explainRefusal(uid: string): void {
    const a = explainCard(index, this.game, uid, HUMAN, this.ctrl.legalActions(HUMAN));
    if (a.enabled) return;
    this.getHud().showRefusal(uid, a.reason ?? 'Not right now.', a.requirement);
  }

  /**
   * Presentation hooks. Each pause point redraws and waits, so an attack plays
   * out as: declared -> blockers land in the Defense zone -> result, rather
   * than the whole thing resolving in one frame.
   */
  hooks(): BattleHooks {
    const beat = async (ms: number) => { this.render(); await sleep(this.beat(ms)); };
    return {
      onAttackDeclared: async (b) => {
        const attackSignal = this.attackPresentation.signal;
        if (attackSignal.aborted) return;
        const boss = getPersonaAttackProfile(this.game, b.attacker);
        // Optional art warms while the defender decides; a download never delays a choice.
        if (boss) void preloadBossAttack(boss);
        this.combatVerdict = '';
        this.hint = '';
        this.tutorial?.observe({ kind: 'attackDeclared', defender: b.defender });
        this.finishingBlow = b.attacker;
        this.render();
        // Bosses remain on the table: announce the source now, travel only after checks.
        const target = b.target ?? you(this.game, b.defender).persona;
        if (target) {
          feedbackAt(this.findCardNode(b.attacker, false), 'Attacking');
          const node = this.cardNodes.get(b.attacker);
          const from = this.cardCentre(b.attacker), to = this.cardCentre(target);
          const direction = inst(this.game, b.attacker).owner === HUMAN ? 1 : -1;
          if (boss && node) await waitForAttackRotation(node);
          if (attackSignal.aborted) return;
          await Promise.all([
            node && boss ? playMotion(node, [
              { outline: `2px solid ${boss.palette.primary}`, outlineOffset: '3px' },
              { outline: '2px solid transparent', outlineOffset: '3px' },
            ], motionReduced() ? 100 : Math.min(280, motionDuration('routine')))
              : node && from && to ? attackWindup(node, (to.x - from.x) * direction, (to.y - from.y) * direction) : Promise.resolve(),
            ...b.supporters.map(async uid => {
              const supporter = this.findCardNode(uid, false);
              if (!supporter || !node) return;
              feedbackAt(supporter, `Support +${currentPower(index, this.game, uid).toLocaleString()}`);
              await animateSupportLink(supporter, node);
            }),
          ]);
          if (attackSignal.aborted) return;
          if (b.supporters.length) feedbackAt(node ?? null, `Supported attack · ${b.attackPower.toLocaleString()}`);
        }
        await beat(120);
        if (attackSignal.aborted) return;
        if (this.firstBattle && ['attacked', 'take-hit'].includes(this.firstBattle.step.id)) await this.waitForTutorialContinue();
        if (this.tutorial?.lesson.focus === 'defense' && this.tutorial.stepIndex === 1) {
          await this.waitForTutorialContinue();
        }
      },
      onBlockingStart: async () => {
        this.render();
        await this.hold(waitFor(settings().duelPace, 'targetHold')!);
        if (this.tutorial?.lesson.focus === 'defense' && this.tutorial.stepIndex === 2) {
          await this.waitForTutorialContinue();
        }
      },
      onBlockersDeclared: async () => {
        const b = this.game.activeBattle;
        const origins = new Map((b?.blockers ?? []).map(uid => [uid,
          (b?.defender === HUMAN ? handCardNode(uid) : document.querySelector('.foehand .fb:last-child'))?.getBoundingClientRect(),
        ]));
        this.render();
        if (b?.blockers.length) {
          const total = document.querySelector<HTMLElement>('.defense-zone .dfnside .n');
          if (total) total.textContent = 'Defending…';
          await Promise.all(b.blockers.map(async (uid, i) => {
            const target = Array.from(document.querySelectorAll<HTMLElement>('.dcard[data-uid]')).find(n => n.dataset.uid === uid);
            const from = origins.get(uid) ?? this.zoneNode('hand', b.defender)?.getBoundingClientRect();
            if (from && target) {
              await flyCard({ from, to: target.getBoundingClientRect(), target,
                image: `url("${artUrl(recordOf(this.game, uid).thumb)}")`, delay: batchDelay(i, b.blockers.length) });
              await playMotion(target, [{outline:'2px solid #8cebdc'},{outline:'2px solid transparent'}], this.beat(100));
            }
          }));
          if (total) total.textContent = b.defensePower.toLocaleString();
          playCue('block');
          feedbackAt(document.querySelector('.defense-zone'), `Defense declared · ${b.defensePower.toLocaleString()} Power`);
        }
        await this.hold(b?.blockers.length ? waitFor(settings().duelPace, 'abilityIntro')! : this.beat(60));
        if (this.firstBattle?.step.id === 'attack') {
          this.firstBattle.observe({ kind: 'cue', cue: 'blockers' });
          await this.waitForTutorialContinue();
        }
        if (this.tutorial?.lesson.focus === 'battle' && this.tutorial.stepIndex === 1) {
          await this.waitForTutorialContinue();
        }
      },
      onBeforeAttackCheck: async (owner) => {
        feedbackAt(this.zoneNode('deck', owner), 'Persona attack · check the top card');
        const deck = this.zoneNode('deck', owner);
        if (deck) {
          deck.classList.add('pile-landing');
          try { await this.hold(motionDuration('routine')); } finally { deck.classList.remove('pile-landing'); }
        }
        if (this.firstBattle?.step.id === 'before-check') await this.waitForTutorialContinue();
        if (owner === HUMAN && this.tutorial?.lesson.focus === 'battle' && this.tutorial.stepIndex === 2) {
          await this.waitForTutorialContinue();
        }
      },
      onAttackResolved: async (b, result) => {
        const attackSignal = this.attackPresentation.signal;
        if (attackSignal.aborted) return;
        const impactEpoch = motionEpoch();
        let personaReaction: Promise<void> | undefined;
        const boss = getPersonaAttackProfile(this.game, b.attacker);
        this.nextBattle?.resolved(b);
        clearCombatGuide();
        const outcomeTarget = b.target ?? you(this.game, b.defender).persona;
        const winningHit = result.hit && this.game.winner !== null && this.game.winner !== b.defender;
        const destroyed = !!b.target && this.game.cards[b.target]?.zone === 'grave';
        const verdict = combatResultLabel(result, winningHit, destroyed);
        this.combatVerdict = verdict;
        // The battle panels already show both totals. A duplicate center toast hides
        // the boss's contact frames, especially on a short landscape battlefield.
        if (!boss || result.cancelReason) feedbackAt(document.querySelector('.defense-zone'), result.cancelReason ? verdict : `${result.attackPower.toLocaleString()} attack · ${result.defensePower.toLocaleString()} defense`);
        const impact = () => {
          if (attackSignal.aborted || result.cancelReason || !outcomeTarget) return;
          feedbackAt(this.findCardNode(outcomeTarget, false), verdict);
          if (!result.hit || result.sentryUsed) playCue('block');
          if (result.hit && !result.sentryUsed) {
            const force = .35 + Math.min(.65, Math.max(0, result.attackPower - result.defensePower) / 20000);
            if (result.personaHit) {
              personaReaction = playPersonaImpact(this.findCardNode(outcomeTarget, false),
                this.findCardNode(b.attacker, false)?.getBoundingClientRect(), result,
                { signal: attackSignal, epoch: impactEpoch, shake: settings().screenShake });
            } else this.shakeScreen(winningHit ? 1 : Math.min(.18, force));
            playCue('impact', { intensity: force });
            if (!boss) this.atCard(outcomeTarget, (x, y) => glImpact(x, y, force), false);
          } else if (!boss) {
            this.atCard(outcomeTarget, (x, y) => glWard(x, y), false);
            const protectedCard = this.findCardNode(outcomeTarget, false);
            if (protectedCard) void playMotion(protectedCard, [{outline:'3px solid #8cebdc',outlineOffset:'3px'},{outline:'3px solid transparent',outlineOffset:'3px'}], this.beat(200));
          }
        };
        if (result.cancelReason) {
          // A cancelled declaration is neither a strike nor a successful block.
        } else if (boss && outcomeTarget) {
          const from = this.findCardNode(b.attacker, false)?.getBoundingClientRect();
          const to = this.findCardNode(outcomeTarget, false)?.getBoundingClientRect();
          if (!result.sentryUsed) playCue('attack');
          if (from && to) await playBossAttack({ profile: boss, from, to,
            outcome: result.sentryUsed ? 'sentry' : result.hit ? 'hit' : 'blocked',
            impact, signal: attackSignal });
          else impact();
        } else if (outcomeTarget && !result.sentryUsed) {
          playCue('attack');
          await this.lungeAt(b.attacker, outcomeTarget, impact);
        } else impact();
        await personaReaction;
        if (attackSignal.aborted) return;
        if (!result.cancelReason && result.hit && !result.sentryUsed && b.target && this.game.cards[b.target]?.zone === 'grave') {
          const node = this.findCardNode(b.target, false);
          if (node) {
            const glass = captureUnitGlass(node), visibility = node.style.visibility;
            // This exact queued destruction is shown now, before render removes the Unit.
            for (const fx of this.game.pendingFx) if (fx.kind === 'destroy' && fx.uid === b.target) this.shatteredBattleFx.add(fx);
            node.style.visibility = 'hidden';
            playCue('destroy');
            const from = node.getBoundingClientRect(), grave = this.zoneNode('grave', b.defender);
            const epoch = motionEpoch();
            try {
              await shatterUnit(glass);
              if (grave && epoch === motionEpoch()) await flyCard({ from, to: grave.getBoundingClientRect(),
                image: `url("${artUrl(recordOf(this.game, b.target).thumb)}")`, duration: this.beat(280), target: grave });
            } finally { node.style.visibility = visibility; }
          }
        }
        if (attackSignal.aborted) return;
        this.render();
        if (winningHit) await this.animateFinishingBlow(b.defender);
        // Results are already shown on the field; only tutorial teaching pauses.
        await this.hold(waitFor(settings().duelPace, 'resultHold')!);
        if (attackSignal.aborted) return;
        // Rules have settled these cards; animate the still-visible defense row.
        const spent = b.blockers.filter(uid => this.game.cards[uid]?.zone === 'grave');
        const grave = this.zoneNode('grave', b.defender);
        await Promise.all(spent.map(async (uid, i) => {
          const card = Array.from(document.querySelectorAll<HTMLElement>('.dcard[data-uid]')).find(n => n.dataset.uid === uid);
          if (!card || !grave) return;
          for (const fx of this.game.pendingFx) if (fx.kind === 'destroy' && fx.uid === uid) this.shatteredBattleFx.add(fx);
          const from = card.getBoundingClientRect();
          card.style.visibility = 'hidden';
          await flyCard({ from, to: grave.getBoundingClientRect(),
            image: `url("${artUrl(recordOf(this.game, uid).thumb)}")`,
            duration: this.beat(320), delay: batchDelay(i, spent.length) });
        }));
        if (attackSignal.aborted) return;
        if (spent.length) feedbackAt(grave, 'Defense → Grave');
        this.tutorial?.observe({ kind: 'attackResolved', defender: b.defender });
        if (this.firstBattle?.step.id === 'held') await this.waitForTutorialContinue();
      },
      onCheckRevealed: async (uid, isForce, kind) => {
        this.render();
        playCue(isForce ? 'force' : 'flip');
        await this.showCheckModal(uid, isForce, kind);
      },
      onCheckCardPlaced: async (uid, kind, owner) => {
        if (kind === 'attack') {
          await this.animateCheckFromDeck(uid, owner);
        } else {
          // Losing a Barrier is the game's win condition ticking down — make
          // it the loudest moment, not the quietest.
          this.shakeScreen(0.15);
          feedbackAt(this.zoneNode('barrier', owner), 'Barrier broken');
          const zone = this.zoneNode('barrier', owner);
          if (zone) {
            zone.classList.remove('barrier-lost');
            void (zone as HTMLElement).offsetWidth;
            zone.classList.add('barrier-lost');
            setTimeout(() => zone.classList.remove('barrier-lost'), 900);
          }
          playCue('barrierBreak');
          this.pulseStat(owner, 'Barriers', 'stat-drop');
          await this.animateBarrierFlip(uid, owner);
          if (you(this.game, owner).barriers.length === 0) feedbackAt(this.zoneNode('barrier', owner), 'No Barriers remaining');
        }
      },
      onCheckCardToHand: async (uid, owner) => {
        await this.animateCheckToHand(uid, owner);
      },
      onCheckResolved: async (_uid, isForce, kind, owner) => {
        this.tutorial?.observe({ kind: 'checkResolved', owner, isForce, checkKind: kind });
        if (this.firstBattle?.step.id === 'checked') await this.waitForTutorialContinue();
        if (owner === HUMAN && kind === 'attack' && !isForce
          && this.tutorial?.lesson.focus === 'battle' && this.tutorial.stepIndex === 4) {
          await this.waitForTutorialContinue();
        }
      },
      onTokenCreated: async (_uid, owner) => {
        this.render();
        // The summon modal is now shown in summonTokenPrompt before placement.
        // For opponent tokens, just a brief pause so the board updates.
        if (owner !== HUMAN) {
          await this.hold(waitFor(settings().duelPace, 'routine')!);
        }
      },
      onAiAction: async () => {
        this.render();
        // Present what the opponent just did, one event at a time, so a
        // combination is followed rather than watched.
        await this.drainEvents();
        // Then the floor: a bot that answers instantly reads as a bug rather
        // than as an opponent. This was a flat 2000ms; it comes off the pace
        // table now, so Fast is actually fast and Learning has room to read.
        await sleep(aiThinkTime(settings().duelPace));
      },
      onPhaseChange: async (phase, player) => {
        this.tutorial?.observe({ kind: 'phase', phase, player });
        if (phase === 'start') playCue('turn');
        this.render();
        await this.showPhaseBanner(phase, player);
      },
      onCardCalled: async (uid, slot, player) => {
        playCue('cardPlay');
        if (player !== HUMAN && !this.firstBattle) showAutoDesc(this.game, uid, 'Opponent called');
        await this.animateCallToField(uid, slot, player);
      },
      onCardDrawn: async (uid, player) => {
        playCue('cardDraw');
        await this.animateDraw(uid, player);
      },
      onPersonify: async (uid, player) => {
        // Cutscenes are reserved for Personifying into a Level 3 — the game's
        // one genuinely ceremonial moment. Anything more frequent stops being
        // ceremony and starts being an interruption.
        const rec = recordOf(this.game, uid);
        if (rec && def(index, this.game, uid).level >= 3) {
          await playCutscene(rec.id, rec.name);
        }
        await this.animatePersonify(uid, player);
      },
      onSentryRevealed: async (uid, player) => {
        if (player !== HUMAN) showAutoDesc(this.game, uid, 'Opponent revealed a Sentry');
        await this.animateSentryReveal(uid, player);
      },
      onRally: async (uids, player) => {
        await this.animateRally(uids, player);
      },
      onEffectDraw: async (uid, player) => {
        await this.animateDraw(uid, player);
      },
      onAbilityResolved: async (uid, player, outcome, summary) => {
        const result = summary ?? effectOutcomeLabel(outcome);
        if (result) feedbackAt(
          this.findCardNode(uid, false) ?? this.zoneNode(inst(this.game, uid).zone as FxZone, player),
          result);
        this.resolvingSource?.classList.remove('effect-source-active'); this.resolvingSource = null;
      },
      onAbilityActivated: async (uid, label, player, kind, chainIndex) => {
        duckMusic();
        this.resolvingSource?.classList.remove('effect-source-active');
        this.resolvingSource = null;
        // The source-linked explanation already shows the skill. A second
        // fixed description would repeat it and obscure another field zone.
        const chain = this.game.responseChain;
        if (this.battlefield === 'anime') {
          const link = chain?.links.find(entry => entry.ordinal === chainIndex && entry.source === uid);
          const script = this.ctrl.scriptFor(uid);
          const cardId = inst(this.game, uid).defId;
          const ability = script?.abilities?.find((entry, i) => (entry.id ?? `${cardId}:ability:${i}`) === link?.skillId);
          const used = ability?.text ?? (kind === 'codex' ? script?.codex?.skill?.text : undefined) ?? label;
          showAutoDesc(this.game, uid, player === HUMAN ? 'Your effect' : 'Opponent effect', displayRuleText(used));
        }
        if (chain?.phase === 'resolving') {
          const rec = recordOf(this.game, uid);
          this.render();
          await presentChainCue({ name: rec.name, image: boardUrl(rec.art), ordinal: chainIndex,
            inspect: () => showInfo(rec),
            total: chain.links.length, stage: 'resolving', opponent: player !== HUMAN,
            negated: chain.links.find(link => link.ordinal === chainIndex)?.status === 'negated',
            links: chain.links.filter(link => link.status === 'committed' || link.status === 'negated').map(link => {
              const card = recordOf(this.game, link.source);
              return { name: card.name, image: boardUrl(card.art), ordinal: link.ordinal, opponent: link.owner !== HUMAN, inspect: () => showInfo(card) };
            }),
            ...this.effectSource(uid, player) });
          // The source stays marked through targets, movement and result,
          // until the engine advances to the next link or closes this chain.
          this.resolvingSource = this.effectSource(uid, player).source;
          if (chain.links.find(link => link.ordinal === chainIndex)?.status !== 'negated') this.resolvingSource?.classList.add('effect-source-active');
          for (const target of publicEffectTargets(this.game, chain.links.find(link => link.ordinal === chainIndex))) highlightEffectTarget(this.findCardNode(target, false));
        } else await this.animateAbilityActivation(uid, player);
      },
      onChainUpdated: async () => {
        this.resolvingSource?.classList.remove('effect-source-active');
        this.resolvingSource = null;
        this.sel = { supporters: [] }; this.render();
        const chain = this.game.responseChain, link = chain?.links.at(-1);
        if (chain?.phase !== 'building' || !link) return;
        const rec = recordOf(this.game, link.source);
        await presentChainCue({ name: rec.name, image: boardUrl(rec.art), ordinal: link.ordinal,
          inspect: () => showInfo(rec),
          stage: 'activated', opponent: link.owner !== HUMAN,
          links: chain.links.map(entry => {
            const card = recordOf(this.game, entry.source);
            return { name: card.name, image: boardUrl(card.art), ordinal: entry.ordinal, opponent: entry.owner !== HUMAN, inspect: () => showInfo(card) };
          }),
          ...this.effectSource(link.source, link.owner) });
      },
      onFx: async (fx) => {
        await this.playFx(fx);
      },
    };
  }

  /**
   * Find a card's node. Effects resolve before the board is redrawn, so a
   * freshly called unit may not be in the DOM yet — redraw once and retry.
   *
   * `allowRender` must be false for destruction, where the point is to animate
   * the card as it was *before* it left the field.
   */
  private findCardNode(uid: string, allowRender = true): HTMLElement | null {
    let node = document.querySelector(`.card[data-uid="${uid}"]`) as HTMLElement | null;
    if (!node && allowRender) {
      this.render();
      node = document.querySelector(`.card[data-uid="${uid}"]`) as HTMLElement | null;
    }
    return node;
  }

  /**
   * Shake the whole board. `power` 0..1 scales it, so a narrow win barely
   * registers and an overkill hit really lands.
   */
  private shakeScreen(power = 0.5): void {
    if (reducedMotion() || settings().screenShake === 'off') return;
    if (settings().screenShake === 'low') power *= .3;
    const stage = document.querySelector('.board-wrap') as HTMLElement | null;
    if (!stage) return;
    const amp = 1 + Math.round(Math.min(1, Math.max(0, power)) * 7);
    stage.style.setProperty('--shake-amp', `${amp}px`);
    stage.classList.remove('shaking');
    void stage.offsetWidth;
    stage.classList.add('shaking');
    setTimeout(() => stage.classList.remove('shaking'), 420);
  }

  /** Flash a stat row in the side panel when Persona level changes. */
  private pulseStat(player: PlayerId, label: string, cls: string, delta?: number): void {
    const side = document.querySelector(player === HUMAN ? '.side.mine' : '.side.foe');
    const rows = Array.from(side?.querySelectorAll('.stat') ?? []);
    for (const row of rows) {
      if (row.querySelector('span')?.textContent === label) {
        if (delta !== undefined) feedbackAt(row, `${delta > 0 ? '+' : ''}${delta} ${label}`);
        row.classList.remove(cls);
        void (row as HTMLElement).offsetWidth;
        row.classList.add(cls);
        setTimeout(() => row.classList.remove(cls), 900);
        return;
      }
    }
  }

  /** The attacker lunges at what it is hitting, then settles back. */
  private async lungeAt(attacker: string, target: string, impact: () => void): Promise<void> {
    const node = this.cardNodes.get(attacker);
    const a = this.cardCentre(attacker), b = this.cardCentre(target);
    if (!node || !a || !b) { impact(); return; }
    const direction = inst(this.game, attacker).owner === HUMAN ? 1 : -1;
    await attackMotion(node, (b.x - a.x) * direction, (b.y - a.y) * direction, impact);
  }


  /**
   * Run `fn` at a card's centre, if it is on screen. Keeps the WebGL calls in
   * `playFx` to one line each and makes "the card is not rendered" a no-op
   * rather than a special case at every site.
   */
  private atCard(uid: string, fn: (x: number, y: number) => void, allowRender = true): void {
    const node = this.findCardNode(uid, allowRender);
    if (!node) return;
    const r = node.getBoundingClientRect();
    if (r.width === 0) return;
    fn(r.left + r.width / 2, r.top + r.height / 2);
  }

  /** Centre point of a card on the board, or null if it is not rendered. */
  private cardCentre(uid: string): { x: number; y: number } | null {
    const node = this.findCardNode(uid);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (r.width === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /**
   * Presentation events drained from the rules engine: a targeting arc, a
   * power tick, a unit shattering, or a State coming online.
   */
  private async playFx(fx: FxEvent): Promise<void> {
    switch (fx.kind) {
      case 'sipolResult':
        feedbackAt(this.zoneNode(fx.result === 'hand' ? 'hand' : 'deck', fx.player),
          fx.result === 'hand' ? 'Sipol → hand' : fx.result === 'bottom' ? 'Sipol · Not a Unit → bottom of Deck' : 'Sipol · Deck empty');
        break;
      case 'handMove':
        try {
          await animateHandMove(fx, {
            source: (uid, owner, position) => owner === HUMAN ? handCardNode(uid) : document.querySelectorAll<HTMLElement>('.foehand .fb')[position] ?? null,
            origin: (uid, owner) => (owner === HUMAN ? this.handOrigins.get(uid) : this.foeHandOrigin) ?? this.zoneRect('hand', owner),
            destination: handMoveDestination,
            art: id => ALL_CARDS[id] ? artUrl(ALL_CARDS[id]!.thumb) : CARD_BACK,
            back: CARD_BACK, viewer: HUMAN,
          });
        } finally { this.render(); }
        break;
      case 'heartMove':
        await animateHeartMove(fx, {
          card: uid => handCardNode(uid) ?? this.findCardNode(uid, false),
          zone: (zone, owner, slot) => {
            if (zone === 'created' || zone === 'vanished' || zone === 'heart') {
              const mat = owner === HUMAN ? '.mat:not(.foe)' : '.mat.foe';
              return document.querySelector(`${mat} .heart-btn`) ?? this.zoneNode('heart', owner);
            }
            if (zone === 'ally' && slot != null) return this.allySlotNode(slot, owner);
            if (zone === 'persona') return this.zoneNode('heart', owner);
            return this.zoneNode(zone === 'ally' ? 'field' : zone, owner);
          },
          art: id => ALL_CARDS[id] ? artUrl(ALL_CARDS[id]!.thumb) : CARD_BACK,
          back: CARD_BACK, viewer: HUMAN, duration: ms => this.beat(ms),
          reduced: reducedMotion() || settings().animationIntensity === 'minimal',
          anime: this.battlefield === 'anime',
        });
        // Heart movement has already committed. Remove the old field/hand
        // representation before presenting another effect in this sequence.
        this.render();
        break;
      case 'target':
        await this.animateTargetLine(fx.source, fx.target);
        break;
      case 'power':
        await this.animatePowerTick(fx.target);
        break;
      case 'powerExpire':
        await this.animatePowerExpire(fx.target);
        break;
      case 'destroy':
        if (this.shatteredBattleFx.has(fx)) break;
        playCue(this.game.cards[fx.uid]?.wasOffered ? 'offer' : 'destroy');
        if (this.game.cards[fx.uid]?.wasOffered) {
          feedbackAt(this.findCardNode(fx.uid, false), 'Ally Offered', 'maguindanao');
          this.atCard(fx.uid, (x, y) => glResource(x, y, 'maguindanao'), false);
          const offered = this.findCardNode(fx.uid, false);
          offered?.classList.add('effect-source-active');
          try { await this.hold(waitFor(settings().duelPace, 'abilityIntro')!); }
          finally { offered?.classList.remove('effect-source-active'); }
          const grave = this.zoneNode('grave', this.game.cards[fx.uid]!.owner);
          if (offered && grave) {
            const from = offered.getBoundingClientRect();
            offered.style.visibility = 'hidden';
            try { await flyCard({ from, to: grave.getBoundingClientRect(), image: `url("${artUrl(recordOf(this.game, fx.uid).thumb)}")` }); }
            finally { offered.remove(); }
            feedbackAt(grave, 'Offered → Grave');
            break;
          }
          feedbackAt(grave, 'Offered → Grave');
          break;
        }
        // Located before the DOM animation hides the card.
        this.atCard(fx.uid, (x, y) => glDestroy(x, y), false);
        feedbackAt(this.findCardNode(fx.uid, false), 'Destroyed');
        await this.animateDestroy(fx.uid);
        feedbackAt(this.zoneNode('grave', fx.owner), 'Destroyed → Grave');
        if (this.game.cards[fx.uid]?.zone === 'grave') this.findCardNode(fx.uid, false)?.remove();
        break;
      case 'stateReleased':
        playCue('stateRelease', { detune: fx.state === 'Andukha' ? 3 : fx.state === 'Garahana' ? -5 : 0 });
        glStateRelease(fx.player !== HUMAN, fx.state);
        feedbackAt(this.zoneNode('codex', fx.player), `${fx.state} released`,
          fx.state === 'Bayanihan' ? 'agta' : fx.state === 'Andukha' ? 'babaylan' : 'maguindanao');
        await this.animateStateRelease(fx.state, fx.player);
        break;
      case 'strike': {
        playCue('attack', { intensity: 0.3 });
        const a = this.cardCentre(fx.source);
        const b = this.cardCentre(fx.target);
        if (a && b) glStrike(a.x, a.y, b.x, b.y);
        await this.animateStrike(fx.source, fx.target);
        break;
      }
      case 'search':
        playCue('search');
        { const hero = you(this.game, fx.player).persona;
          const theme = deckTheme(hero ? this.game.cards[hero]?.defId ?? '' : '');
          const r = this.zoneNode(fx.pile, fx.player)?.getBoundingClientRect();
          if (r) glResource(r.x + r.width / 2, r.y + r.height / 2, theme);
        }
        await this.animateSearch(fx.player, fx.pile);
        break;
      case 'emit':
        playCue('search', { intensity: 0.4 });
        await this.animatePileEmit(fx.uid, fx.from, fx.to, fx.owner, fx.faceUp);
        break;
      case 'codexFlip':
        await this.animateCodexFlip(fx);
        break;
      case 'arrive':
        // Level scales the cue the same way it scales the flourish.
        playCue('arrive', { intensity: Math.min(1, (fx.level - 1) / 2) });
        this.atCard(fx.uid, (x, y) => glArrive(x, y, fx.level, fx.from));
        await this.animateArrive(fx.uid, fx.from, fx.level);
        break;
      case 'ward':
        playCue('ward');
        this.atCard(fx.target, (x, y) => glWard(x, y));
        await this.animateWard(fx.target, fx.mode);
        break;
      case 'restore':
        feedbackAt(this.findCardNode(fx.target), 'Charged · ready');
        playCue('restore');
        this.atCard(fx.target, (x, y) => glRestore(x, y));
        await this.animateRestore(fx.target);
        break;
    }
  }

  /**
   * A hostile effect landing. Unlike the neutral target line this travels as a
   * bolt and ends in a hit on the target, so "you are being killed" reads
   * differently from "you are being pointed at".
   */
  private async animateStrike(source: string, target: string): Promise<void> {
    const a = this.cardCentre(source);
    const b = this.cardCentre(target);
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;

    const bolt = el('div', 'fx-strike');
    bolt.style.left = `${a.x}px`;
    bolt.style.top = `${a.y}px`;
    bolt.style.width = `${len}px`;
    bolt.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    document.body.appendChild(bolt);

    await sleep(160);

    const node = this.findCardNode(target, false);
    if (node) {
      node.classList.add('struck');
      setTimeout(() => node.classList.remove('struck'), 400);
    }
    const burst = el('div', 'fx-strike-hit');
    burst.style.left = `${b.x}px`;
    burst.style.top = `${b.y}px`;
    document.body.appendChild(burst);

    await sleep(220);
    bolt.remove();
    burst.remove();
  }

  /** A pile being looked through lifts and fans, so searching is visible. */
  /**
   * How long a beat of ceremony should actually last here.
   *
   * Ceremony is spent seconds, and the same flourish is worth very different
   * amounts depending on who is watching and why. Watching your own Sipol
   * resolve is the point; watching the opponent's, or a demo reel playing to
   * someone who has not chosen to be here, is a toll.
   */
  /**
   * Wait out a beat of ceremony, unless the player would rather not.
   *
   * Only Finish Animation shortens this hold. Clicking a card to inspect or
   * select it must not silently skip the explanation being shown.
   */
  private hold(ms: number): Promise<void> {
    return holdDuelMotion(ms);
  }

  private beat(ms: number): number {
    if (reducedMotion()) return Math.min(80, ms);
    let factor = 1;
    // The website's demo reel is watched, not played: a turn that grows by two
    // seconds grows the whole reel by half a minute.
    if (this.demo) factor *= 0.65;
    // Both players' effects get the same readable timing.
    if (!settings().scaleSpectacle) factor *= 0.6;
    return spectacleDuration(ms * factor, settings().duelPace, settings().animationIntensity === 'minimal');
  }

  private async animateSearch(player: PlayerId, pile: FxZone): Promise<void> {
    const box = this.zoneNode(pile, player);
    if (!box) return;
    box.classList.remove('searching');
    void box.offsetWidth;
    // Drive the keyframes from the same clock as the wait, or the pile
    // finishes its lift early and sits still for the remainder.
    const ms = this.beat(600);
    box.style.animationDuration = `${ms}ms`;
    box.classList.add('searching');
    await this.hold(ms);
    box.classList.remove('searching');
    box.style.animationDuration = '';
  }

  /** One awaited reveal for a committed switch, shared by local and PvP hooks. */
  private async animateCodexFlip(fx: Extract<FxEvent, { kind: 'codexFlip' }>): Promise<void> {
    this.render();
    const box = this.zoneNode('codex', fx.player);
    if (!box) return;
    const incoming = recordOf(this.game, fx.uid);
    const previous = fx.previousDefId ? ALL_CARDS[fx.previousDefId] : undefined;
    await playCodexSwap({ zone: box, newImage: boardUrl(incoming.art),
      previousImage: previous ? boardUrl(previous.art) : undefined,
      backImage: CARD_BACK, name: incoming.name, signal: this.attackPresentation.signal,
      onReveal: () => playCue('codex') });
  }

  // --- movement ceremony ----------------------------------------------------

  /**
   * The element standing for a zone on a given player's side.
   *
   * Most zones are a box on the mat and follow one naming rule. The two that
   * do not are the Heart, which lives in the side panel rather than the mat,
   * and the hand, which only exists on screen for the player holding it.
   */
  private zoneNode(zone: FxZone, owner: PlayerId): HTMLElement | null {
    const mine = owner === HUMAN;
    const matSel = mine ? '.mat:not(.foe)' : '.mat.foe';
    let sel: string;
    switch (zone) {
      // The Heart has no box of its own — it is the spirit badge worn by the
      // Persona, which is also where a retrieved card should appear to leave.
      case 'heart': sel = `${matSel} .slot.persona`; break;
      // Both hands have a position even though only one has faces.
      case 'hand': sel = mine ? '.hand-bar' : '.foehand'; break;
      case 'field': sel = `${matSel} .z-units`; break;
      // The Barrier row is a zbox, not a pilebox.
      case 'barrier': sel = `${mine ? '.side.mine' : '.side.foe'} .z-barrier, ${matSel} .z-barrier`; break;
      default: sel = `${matSel} .pilebox.z-${zone}`;
    }
    const node = document.querySelector(sel) as HTMLElement | null;
    // A selector that has quietly stopped matching is how the opponent's
    // Sentry came to fly out of the player's own hand: `.mat.foe .foehand`
    // went on parsing fine long after the foe hand moved out of the mat, and
    // the fallback rect it fell through to happened to sit on the human hand
    // bar. Silence is what let that live for months, so it is no longer
    // silent.
    if (!node) warnMissing(`zoneNode(${zone}, ${owner}) -> ${sel}`);
    return node;
  }

  /**
   * The Ally Zone a unit is standing in, or is about to stand in.
   *
   * The row is laid out `[0, 1, persona, 2, 3]` (see the unit row in
   * `render`), so ally slot 2 and 3 are DOM children 3 and 4. Getting this
   * wrong is not subtle and not visible: the row's own centre is the Persona
   * slot, to the pixel, so anything that aims at the row lands on the face of
   * whoever is leading.
   */
  private allySlotNode(slot: number, owner: PlayerId): HTMLElement | null {
    const mat = document.querySelector(owner === HUMAN ? '.mat:not(.foe)' : '.mat.foe');
    const row = mat?.querySelector('.z-units');
    if (!row) return null;
    const domIndex = slot < 2 ? slot : slot + 1;
    const node = row.querySelectorAll('.slot')[domIndex] as HTMLElement | undefined;
    return node ?? null;
  }

  /**
   * Where a zone is on screen.
   *
   * Falls back to the middle of the board rather than giving up, because a
   * card that flies from nowhere still reads better than one that teleports —
   * and the opponent's hand genuinely has no position.
   *
   * `field` is the trap here: it answers with the centre of the unit row,
   * which is the Persona slot. Anything that knows which ally slot it means
   * must ask `allySlotNode` instead.
   */
  private zoneRect(zone: FxZone, owner: PlayerId): DOMRect {
    const node = this.zoneNode(zone, owner);
    if (node) {
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        // The Ally Zone and the hand are rows as wide as the board, not places
        // a single card sits. Landing on one means landing card-sized at its
        // centre — taking the row's own width made a card flying out of the
        // deck scale by the ratio between a pile and a whole row, which is
        // roughly tenfold, and it filled the screen.
        if (zone === 'field' || zone === 'hand') {
          const child = node.querySelector('.slot, .hand-card') as HTMLElement | null;
          const cr = child?.getBoundingClientRect();
          const w = cr && cr.width > 4 ? cr.width : Math.min(r.width, 88);
          const h = cr && cr.height > 4 ? cr.height : w * 1.4;
          return clampRect(new DOMRect(
            r.left + r.width / 2 - w / 2,
            r.top + r.height / 2 - h / 2,
            w, h,
          ));
        }
        return clampRect(r);
      }
    }
    return new DOMRect(window.innerWidth / 2 - 45, window.innerHeight / 2 - 63, 90, 126);
  }

  /**
   * Where a card in flight should land, when it has not been drawn yet.
   *
   * Only `field` can do better than the zone rect, and only when the card has
   * actually settled into an Ally Zone. It may not have: Pulangi River Offers
   * the first unit called each turn the instant it lands, so by the time this
   * runs the card can already be in the Grave with no slot. Aiming at a stale
   * slot would be worse than the general fallback, so the zone check is not
   * paranoia.
   */
  private emitDestRect(uid: string, to: FxZone, owner: PlayerId): DOMRect {
    if (to === 'field') {
      const c = this.game.cards[uid];
      if (c && c.zone === 'ally' && c.slot != null) {
        const node = this.allySlotNode(c.slot, owner);
        const r = node ? this.cardSlotRect(node) : undefined;
        if (r && r.width > 0) return clampRect(r);
      }
    }
    return this.zoneRect(to, owner);
  }

  /** A wide holder remains a large touch target; its arriving card stays 5:7. */
  private cardSlotRect(node: HTMLElement): DOMRect {
    const bounds = node.getBoundingClientRect();
    // Mobile landscape cards use 64cqh width, hence 89.6% of the row height.
    const scale = compactLayout() && matchMedia('(orientation: landscape)').matches ? .896 : 1;
    const height = Math.min(bounds.height * scale, bounds.width * 7 / 5);
    const width = height * 5 / 7;
    return new DOMRect(bounds.x + (bounds.width - width) / 2, bounds.y + (bounds.height - height) / 2, width, height);
  }

  /**
   * A card leaving one place for another.
   *
   * Three beats, in this order, because each one answers a question the next
   * one assumes: the source lights ("it came from here"), a card rises out of
   * it ("this card"), and it travels ("to there"). Skipping the first is what
   * makes a card seem to appear from nowhere.
   */
  private async animatePileEmit(
    uid: string, from: FxZone, to: FxZone, owner: PlayerId, faceUp: boolean,
  ): Promise<void> {
    const sourceCard = from === 'field' ? this.findCardNode(uid, false)
      : from === 'hand' ? (owner === HUMAN ? handCardNode(uid)
        : document.querySelector<HTMLElement>('.foehand .fb:last-child')) : null;
    const source = sourceCard ?? this.zoneNode(from, owner);
    const src = source?.getBoundingClientRect() ?? (from === 'hand'
      ? (owner === HUMAN ? this.handOrigins.get(uid) : this.foeHandOrigin) : undefined) ?? this.zoneRect(from, owner);

    // Read the destination zone, not the old DOM copy of the same UID.
    const dst = this.emitDestRect(uid, to, owner);
    const arrive = this.transit.begin(uid);
    const destinationCard = this.findCardNode(uid, false);
    if (sourceCard) sourceCard.style.visibility = 'hidden';
    if (destinationCard) destinationCard.style.visibility = 'hidden';
    try {
      await animatePileJourney({ source, from: src, to: dst,
        image: `url("${faceUp ? artUrl(recordOf(this.game, uid).thumb) : CARD_BACK}")` });
    } finally {
      arrive();
      // Effect movement is already committed by the engine. Draw its actual
      // destination and discard the stale source, even if travel was skipped.
      this.render();
      const label = destinationLabel(to);
      if (label) feedbackAt(this.zoneNode(to, owner), label);
    }
  }

  /**
   * A unit arriving. The route it took is a rules difference, so it gets a
   * different read; the Level scales how much room the arrival is given.
   */
  private async animateArrive(
    uid: string,
    from: 'hand' | 'deck' | 'grave' | 'heart' | 'replace',
    level: number,
  ): Promise<void> {
    const node = this.findCardNode(uid);
    if (!node) return;

    node.classList.remove('arrive-hand', 'arrive-deck', 'arrive-grave', 'arrive-heart', 'arrive-replace');
    void node.offsetWidth;
    node.classList.add(`arrive-${from}`);
    // A Level 3 landing should occupy more of the player's attention than a
    // Level 1 — same animation, more weight. Off when the player has asked
    // for a flatter, faster board.
    const weight = settings().scaleSpectacle ? Math.min(2, Math.max(0, level - 1)) : 0;
    node.style.setProperty('--arrive-scale', String(1 + weight * 0.35));

    // Replacement destroyed the unit that was standing here; that deserves
    // its own shock rather than being folded into a generic call.
    if (from === 'replace') this.shakeScreen(0.45);

    const hold = from === 'hand' ? 260 : 380 + weight * 90;
    await Promise.all([this.hold(this.beat(hold)), playSpecialCallRing(node, this.beat(650))]);
    node.classList.remove(`arrive-${from}`);
  }

  /** Protection arriving, or an effect stopped short. */
  private async animateWard(target: string, mode: 'gain' | 'block'): Promise<void> {
    const c = this.cardCentre(target);
    if (!c) return;
    const ring = el('div', `fx-ward ${mode === 'block' ? 'block' : ''}`);
    ring.style.left = `${c.x}px`;
    ring.style.top = `${c.y}px`;
    document.body.appendChild(ring);
    try {
      await playMotion(ring, [{ opacity: 1 }, { opacity: 0 }], motionDuration());
    } finally { ring.remove(); }
  }

  /** Something given back — the inverse gesture of a strike. */
  private async animateRestore(target: string): Promise<void> {
    this.render();
    feedbackAt(this.findCardNode(target, false), 'Ready to attack');
    const c = this.cardCentre(target);
    if (!c) return;
    const glow = el('div', 'fx-restore');
    glow.style.left = `${c.x}px`;
    glow.style.top = `${c.y}px`;
    document.body.appendChild(glow);
    try {
      await playMotion(glow, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }], motionDuration());
    } finally { glow.remove(); }
  }

  /**
   * A line from a source card to whatever it is pointing at.
   * `attack` is the red, heavier variant with an arrowhead; the default gold
   * one marks an effect touching a target.
   */
  private async animateTargetLine(
    source: string,
    target: string,
    variant: 'effect' | 'attack' = 'effect',
  ): Promise<void> {
    const sourceCard = this.game.cards[source];
    const fallback = sourceCard ? this.effectSource(source, sourceCard.owner).source?.getBoundingClientRect() : undefined;
    const a = this.cardCentre(source) ?? (fallback ? { x: fallback.x + fallback.width / 2, y: fallback.y + fallback.height / 2 } : null);
    const b = this.cardCentre(target);
    if (!a || !b) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;

    const line = el('div', `fx-target-line ${variant === 'attack' ? 'attack' : ''}`);
    line.style.left = `${a.x}px`;
    line.style.top = `${a.y}px`;
    line.style.width = `${len}px`;
    line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    document.body.appendChild(line);

    const dot = el('div', `fx-target-dot ${variant === 'attack' ? 'attack' : ''}`);
    dot.style.left = `${b.x}px`;
    dot.style.top = `${b.y}px`;
    document.body.appendChild(dot);
    const targetNode = this.findCardNode(target, false);
    if (variant === 'effect') targetNode?.classList.add('effect-target-active');

    // An arrowhead sits at the target end, rotated along the line.
    let head: HTMLElement | null = null;
    if (variant === 'attack') {
      head = el('div', 'fx-target-head');
      head.style.left = `${b.x}px`;
      head.style.top = `${b.y}px`;
      head.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(dy, dx)}rad)`;
      document.body.appendChild(head);
    }

    try {
      const duration = motionDuration();
      await Promise.all([
        playMotion(line, motionReduced() ? [{ opacity: 1 }, { opacity: 0 }] : [
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: .65 },
          { clipPath: 'inset(0 0 0 0)', opacity: 0 },
        ], duration),
        playMotion(dot, [{ opacity: 0, scale: '.6' }, { opacity: 1, scale: '1.4', offset: .6 }, { opacity: 0, scale: '1.7' }], duration),
        ...(head ? [playMotion(head, [{ opacity: 0 }, { opacity: 1, offset: .55 }, { opacity: 0 }], duration)] : []),
      ]);
      if (variant === 'effect') await this.hold(waitFor(settings().duelPace, 'targetHold')!);
    } finally { targetNode?.classList.remove('effect-target-active'); line.remove(); dot.remove(); head?.remove(); }
  }

  /** Native local/PvP FX await the same actual-value cue that rendering owns.
   * Several queued modifiers already in one snapshot never replay that result. */
  private async animatePowerTick(uid: string): Promise<void> {
    this.render();
    await this.powerCues.get(uid)?.promise;
  }

  private async animatePowerExpire(uid: string): Promise<void> {
    await this.animatePowerTick(uid);
  }

  private refreshPowerCues(): void {
    const changes = this.powerCueTracker.update(this.game, this.ctrl.index);
    for (const [uid, cue] of this.powerCues) {
      const card = this.game.cards[uid];
      if (!card || card.faceDown || !['ally', 'persona'].includes(card.zone)) cue.controller.abort();
    }
    if (this.demo || this.replay || this.game.winner !== null || document.hidden || this.attackPresentation.signal.aborted) return;
    for (const change of changes) {
      const node = this.findCardNode(change.uid, false);
      if (!node) continue;
      this.powerCues.get(change.uid)?.controller.abort();
      const controller = new AbortController(), parentSignal = this.attackPresentation.signal;
      const abort = () => controller.abort(); parentSignal.addEventListener('abort', abort, { once: true });
      playCue(change.delta > 0 ? 'powerUp' : 'powerDown');
      const promise = presentPowerCue(node, change, settings().duelPace, controller.signal).finally(() => {
        parentSignal.removeEventListener('abort', abort);
        if (this.powerCues.get(change.uid)?.controller === controller) this.powerCues.delete(change.uid);
      });
      this.powerCues.set(change.uid, { controller, promise });
    }
  }

  private shatteredBattleFx = new WeakSet<FxEvent>();
  /** Destruction greys out before the card travels to its actual Grave. */
  private async animateDestroy(uid: string): Promise<void> {
    // Deliberately no redraw: we want the board as it was, with the card still
    // on it, so it can be seen leaving.
    const node = this.findCardNode(uid, false);
    if (!node) return;
    const r = node.getBoundingClientRect();
    if (r.width === 0) return;

    const ghost = el('div', 'fx-destroy');
    ghost.style.backgroundImage = node.style.backgroundImage;
    ghost.style.left = `${r.left}px`;
    ghost.style.top = `${r.top}px`;
    ghost.style.width = `${r.width}px`;
    ghost.style.height = `${r.height}px`;
    document.body.appendChild(ghost);
    const visibility = node.style.visibility;
    node.style.visibility = 'hidden';
    const epoch = motionEpoch();

    try {
      await playMotion(ghost, motionReduced() ? [{ opacity: 1 }, { opacity: 0 }] : [
        { opacity: 1, translate: '0 0', filter: 'grayscale(0)' },
        { opacity: .8, translate: '0 5px', filter: 'grayscale(1)', offset: .35 },
        { opacity: 0, translate: '0 24px', filter: 'grayscale(1)' },
      ], motionDuration() * .6);
      ghost.remove();
      const card = this.game.cards[uid];
      const grave = card && card.zone === 'grave' ? this.zoneNode('grave', card.owner) : null;
      if (grave && epoch === motionEpoch()) await flyCard({
        from: r, to: grave.getBoundingClientRect(), image: node.style.backgroundImage,
        duration: this.beat(320), target: grave,
      });
    } finally { ghost.remove(); node.style.visibility = visibility; }
    // Put the node back the way we found it. Board cards persist across
    // renders, so a unit that returns to the field (an Offer recalled by
    // Liguasan Marsh, anything called back from the Grave) would otherwise
    // come back still hidden.
  }

  /**
   * The blow that ends the duel. Every other Barrier break is a step toward
   * losing; this one IS losing, so it gets a full stop of its own rather than
   * being folded into the same animation as the four before it.
   */
  private async animateFinishingBlow(loser: PlayerId): Promise<void> {
    const won = loser !== HUMAN;
    this.shakeScreen(1);
    playCue(won ? 'win' : 'lose');

    const wash = el('div', `fx-finish ${won ? 'win' : 'lose'}`);
    const ring = el('div', 'fin-ring');
    const word = el('div', 'fin-word', 'FINAL HIT');
    wash.appendChild(ring);
    wash.appendChild(word);
    document.body.appendChild(wash);

    await this.hold(motionDuration('routine'));
    this.shakeScreen(0.7);
    await this.hold(waitFor(settings().duelPace, 'importantResult')!);

    wash.classList.add('out');
    await this.hold(motionDuration());
    wash.remove();
  }

  /** A State coming online is the biggest moment in a deck's turn. */
  private async animateStateRelease(state: string, player: PlayerId): Promise<void> {
    const isOpponent = player !== HUMAN;
    const wash = el('div', `fx-state-wash ${isOpponent ? 'foe' : ''}`);
    const name = el('div', 'fx-state-name', state);
    const sub = el('div', 'fx-state-sub', isOpponent ? 'Opponent State released' : 'State released');
    const box = el('div', 'fx-state-box');
    box.appendChild(name);
    box.appendChild(sub);
    wash.appendChild(box);
    document.body.appendChild(wash);

    void wash.offsetWidth;
    wash.classList.add('in');
    await this.hold(waitFor(settings().duelPace, 'importantResult')!);
    wash.classList.remove('in');
    wash.classList.add('out');
    await this.hold(motionDuration());
    wash.remove();
  }

  /**
   * Activation flourish, in the Master Duel idiom: the card rims with light,
   * floats up out of the board, names itself, then settles back.
   *
   * The board card is left in place and a clone is animated above everything,
   * so nothing in the layout shifts while the effect resolves.
   */
  private effectSource(uid: string, owner: PlayerId): {source: HTMLElement | null; liftAnchor?: HTMLElement | null; sourceZone: string} {
    const chain = this.game.responseChain;
    const link = chain?.phase === 'resolving' ? chain.links[chain.cursor] : chain?.links.at(-1);
    const zone = (link?.source === uid ? link.sourceZone : undefined) ?? this.game.cards[uid]?.zone;
    const field = zone === 'ally' || zone === 'persona';
    if (zone === 'heart') {
      const persona = this.zoneNode('heart', owner);
      return { source: persona?.querySelector<HTMLElement>('.heart-btn') ?? persona, liftAnchor: persona, sourceZone: 'Heart' };
    }
    return {
      source: field ? this.findCardNode(uid, false) ?? this.zoneNode('field', owner) : zone ? this.zoneNode(zone as FxZone, owner) : null,
      sourceZone: field ? 'Field' : zone ? zone[0]!.toUpperCase() + zone.slice(1) : '',
    };
  }

  private async animateAbilityActivation(uid: string, player: PlayerId): Promise<void> {
    this.render();
    const rec = recordOf(this.game, uid);
    const origin = this.effectSource(uid, player);
    await animateEffectSource({ source: origin.source, liftAnchor: origin.liftAnchor, zone: origin.sourceZone, image: boardUrl(rec.art), name: rec.name });
  }

  /**
   * Draw animation: a card flies from the deck pile to the hand area.
   * For the human player, the card is face-up; for the opponent, face-down.
   */
  private async animateDraw(uid: string, player: PlayerId): Promise<void> {
    this.render();
    const deck = this.zoneNode('deck', player);
    const target = player === HUMAN ? handCardNode(uid)
      : document.querySelector<HTMLElement>('.foehand .fb:last-child');
    if (!deck || !target) return;
    await animateDeckDraw(deck, target,
      player === HUMAN ? `url("${artUrl(recordOf(this.game, uid).thumb)}")` : `url("${CARD_BACK}")`, this.beat(180));
  }

  /**
   * Personify animation: the chosen card flies from the hand to the persona
   * slot with a dramatic slam, like Master Duel's monster summon.
   */
  private async animatePersonify(uid: string, player: PlayerId): Promise<void> {
    await this.animateHandArrival(uid, player, () => document.querySelector<HTMLElement>(
      `${player === HUMAN ? '.mat:not(.foe)' : '.mat.foe'} .slot.persona`));
  }

  /** One lifecycle for normal calls and Personification; engine ownership stays unchanged. */
  private async animateHandArrival(uid: string, player: PlayerId, destination: () => HTMLElement | null): Promise<void> {
    const source = player === HUMAN ? handCardNode(uid) : document.querySelector<HTMLElement>('.foehand .fb:last-child');
    const from = source?.getBoundingClientRect() ?? (player === HUMAN ? this.handOrigins.get(uid) : this.foeHandOrigin) ?? this.zoneRect('hand', player);
    const arrive = this.transit.begin(uid);
    let target: HTMLElement | null = null;
    try {
      this.render(); target = destination();
      if (!target) return;
      target.classList.add('arrival-landed');
      // Calls commit after this hook. Keep the arriving copy visible through
      // the landing, and never redraw the still-authoritative hand mid-flight.
      await flyCard({ from, to: this.cardSlotRect(target), image: `url("${artUrl(recordOf(this.game, uid).thumb)}")`, duration: motionDuration() * 2, landing: motionDuration('routine') });
    } finally { target?.classList.remove('arrival-landed'); arrive(); }
  }

  /**
   * Sentry reveal animation: the card flies from hand to the Defense zone
   * with a golden flash, showing that the Sentry is being used. The card
   * then fades as it's exiled face down.
   */
  private async animateSentryReveal(uid: string, player: PlayerId): Promise<void> {
    const source = player === HUMAN ? handCardNode(uid) : document.querySelector<HTMLElement>('.foehand .fb:last-child');
    const from = source?.getBoundingClientRect() ?? this.zoneRect('hand', player);
    const arrive = this.transit.begin(uid);
    let reveal: HTMLElement | null = null;
    try {
      this.render();
      const defense = document.querySelector<HTMLElement>('.defense-zone');
      if (!defense) return;
      const r = defense.getBoundingClientRect();
      const height = Math.min(110, innerHeight * .22), width = height / 1.4;
      const to = new DOMRect(r.left + (r.width - width) / 2, r.top + (r.height - height) / 2, width, height);
      const image = `url("${artUrl(recordOf(this.game, uid).thumb)}")`;
      await flyCard({ from, to, image });
      reveal = el('div', 'sentry-reveal-card');
      reveal.style.cssText = `left:${to.left}px;top:${to.top}px;width:${width}px;height:${height}px;background-image:${image}`;
      document.body.append(reveal);
      feedbackAt(defense, 'Sentry revealed');
      await this.hold(waitFor(settings().duelPace, 'resultHold')!);
      const exile = this.zoneNode('exile', player);
      reveal.remove();
      if (exile) await flyCard({ from: to, to: exile.getBoundingClientRect(), image: `url("${CARD_BACK}")` });
    } finally { reveal?.remove(); arrive(); }
  }

  /**
   * Rally animation: cards fly from hand (or field) to the deck pile,
   * showing they're being sent to the bottom of the deck.
   */
  private async animateRally(uids: string[], player: PlayerId): Promise<void> {
    const isOpponent = player !== HUMAN;
    const matSelector = isOpponent ? '.mat.foe' : '.mat:not(.foe)';
    const deckPile = document.querySelector(`${matSelector} .pilebox.z-deck`);
    let dstRect: DOMRect;
    if (deckPile) {
      dstRect = (deckPile as HTMLElement).getBoundingClientRect();
    } else {
      dstRect = new DOMRect(window.innerWidth / 2 - 45, 20, 90, 126);
    }

    const flights = uids.map(uid => {
      const source = player === HUMAN ? handCardNode(uid) ?? this.findCardNode(uid, false)
        : document.querySelector<HTMLElement>('.foehand .fb:last-child') ?? this.findCardNode(uid, false);
      return { uid, from: source?.getBoundingClientRect() ?? this.zoneRect('hand', player) };
    });
    const arrivals = uids.map(uid => this.transit.begin(uid));
    try {
      this.render();
      await Promise.all(flights.map(({ uid, from }, i) => flyCard({ from, to: dstRect,
        delay: batchDelay(i, flights.length),
        image: isOpponent ? `url("${CARD_BACK}")` : `url("${artUrl(recordOf(this.game, uid).thumb)}")` })));
    } finally { arrivals.forEach(arrive => arrive()); }

  }

  /**
   * Attack check animation: the top card of the deck flies to the check zone.
   * Called AFTER the card is in the check zone, so we render first to show the
   * deck minus one, then animate from the deck pile position to the check box.
   */
  /**
   * A check card coming off the top of the deck.
   *
   * The one route that already travelled properly, now expressed as what it
   * always was: a card leaving a pile for another zone. If this reads wrong
   * after a change to the shared ceremony, the ceremony is wrong.
   *
   * The opponent's check flies face down. The reveal is a separate, deliberate
   * moment with its own modal, and the flight must not pre-empt it.
   */
  private async animateCheckFromDeck(_uid: string, player: PlayerId): Promise<void> {
    const from = this.zoneNode('deck', player)?.getBoundingClientRect();
    const target = this.zoneNode('check', player);
    if (from && target) await flyCard({ from, to: target.getBoundingClientRect(), image: `url("${CARD_BACK}")` });
    this.render();
  }

  /**
   * Barrier flip animation: the leftmost barrier card flips open (rotateY),
   * revealing the card face. Then the card appears in the check zone.
   */
  private async animateBarrierFlip(_uid: string, player: PlayerId): Promise<void> {
    const zone = this.zoneNode('barrier', player);
    const barrier = zone?.querySelector<HTMLElement>('.barrier.breaking')
      ?? zone?.querySelector<HTMLElement>('.barrier:not(.broken)')
      ?? zone?.querySelector<HTMLElement>('.barrier:last-child');
    const check = this.zoneNode('check', player);
    if (!barrier || !check) { this.render(); return; }
    const from = barrier.getBoundingClientRect();
    const visibility = barrier.style.visibility;
    barrier.style.visibility = 'hidden';
    try {
      const epoch = motionEpoch();
      await shatterBarrier(from);
      if (motionEpoch() !== epoch || document.hidden) return;
      await flyCard({ from, to: check.getBoundingClientRect(), image: `url("${CARD_BACK}")` });
    } finally { barrier.style.visibility = visibility; this.render(); }
  }

  /**
   * Check-to-hand animation: the card flies from the check zone to the hand
   * area, then fades as it joins the hand.
   */
  private async animateCheckToHand(uid: string, player: PlayerId): Promise<void> {
    const from = this.zoneNode('check', player)?.getBoundingClientRect();
    const arrive = this.transit.begin(uid);
    const sourceArt = this.zoneNode('check', player)?.querySelector<HTMLElement>('.mini');
    if (sourceArt) sourceArt.style.visibility = 'hidden';
    try {
      if (from && you(this.game, player).lakeBuluanCheckSwap) {
        const grave = this.zoneNode('grave', player);
        if (grave) await flyCard({ from, to: grave.getBoundingClientRect(),
          image: `url("${artUrl(recordOf(this.game, uid).thumb)}")` });
        return;
      }
      const hand = this.zoneNode('hand', player);
      if (!from || !hand) return;
      // This hook runs BEFORE the engine moves the card. Reserve its final slot
      // without changing the hand or exposing an opponent's hidden cards.
      const before = captureHand();
      const slot = el('div', player === HUMAN ? 'hand-card' : 'fb');
      slot.style.visibility = 'hidden'; slot.style.pointerEvents = 'none';
      hand.append(slot);
      settleHand(before, true);
      try {
        await flyCard({ from, to: slot.getBoundingClientRect(),
          image: player === HUMAN ? `url("${artUrl(recordOf(this.game, uid).thumb)}")` : `url("${CARD_BACK}")` });
      } finally { slot.remove(); }
    } finally { arrive(); }
  }

  /**
   * Master Duel-style "call to field" animation.
   *
   * The card lifts out of the hand (or from the opponent's hidden position),
   * flies in an arc to the target ally slot, then slams down with a flash
   * and shockwave ripple.
   */
  private async animateCallToField(uid: string, slot: number, player: PlayerId): Promise<void> {
    await this.animateHandArrival(uid, player, () => this.allySlotNode(slot, player));
  }

  /** Show a brief auto-dismissing banner announcing a phase change. */
  private async showPhaseBanner(phase: Phase, player: PlayerId): Promise<void> {
    if (!this.phaseCueTracker.take(phaseCueKey(this.game.turnNumber, phase, player))) return;
    const epoch = motionEpoch();
    // Expiring Power may settle at the same state boundary. Let that readable
    // result finish before the phase word takes the centre of the screen.
    await Promise.all(Array.from(this.powerCues.values(), cue => cue.promise));
    if (epoch !== motionEpoch() || this.attackPresentation.signal.aborted) return;
    const isOpponent = player !== HUMAN;
    const labels: Record<string, string> = {
      start: this.game.turnNumber === 1 ? 'DRAW — FIRST DRAW SKIPPED' : 'DRAW PHASE',
      personify: 'PERSONIFY',
      main: 'MAIN PHASE',
      battle: 'BATTLE PHASE',
      end: 'END PHASE',
    };
    const text = labels[phase] ?? phase.toUpperCase();
    const prefix = isOpponent ? "OPPONENT'S " : 'YOUR ';
    const banner = el('div', `phase-banner${isOpponent ? ' foe' : ''}`);
    banner.innerHTML = `<span class="phase-prefix">${escapeHtml(prefix)}</span><span class="phase-text">${escapeHtml(text)}</span>`;
    await presentPhaseCue(banner, settings().duelPace, this.attackPresentation.signal);
  }

  /** Show a "GAME START" banner before the first turn begins. */
  private assetsPrepared = false;
  async prepareAssets(): Promise<void> {
    if (this.assetsPrepared) return;
    this.assetsPrepared = true;
    for (const player of this.game.players) {
      const boss = player.persona ? getPersonaAttackProfile(this.game, player.persona) : undefined;
      if (boss) void preloadBossAttack(boss);
    }
    this.render();
    // Optional graphics and audio can fail without blocking the playable board.
    await prepareDuelArt(duelAssetUrls(this.game, this.ctrl instanceof RemoteController), [
      { label: 'animations', load: initGlFx },
      { label: 'effect sounds', load: preloadAudio },
      { label: 'signature animation', load: preloadCutscenes },
      { label: 'fonts', load: () => document.fonts.ready },
    ]);
    // Detailed portraits follow the battle-sized art without holding the opening.
    void warmCardArt(duelAssetUrls(this.game, this.ctrl instanceof RemoteController, true), undefined, undefined, 2);
  }

  async showGameStartBanner(): Promise<void> {
    await this.prepareAssets();
    this.busy = true;
    document.body.classList.add('opening-deal');
    this.render();
    try {
      const banner = el('div', 'phase-banner game-start');
      banner.innerHTML = `<span class="phase-text">GAME START</span>`;
      document.body.appendChild(banner);
      void banner.offsetWidth;
      banner.classList.add('show');
      await sleep(1600);
      banner.classList.remove('show');
      await sleep(300);
      banner.remove();
      await animateOpeningHands(() => playCue('cardDraw'));
    } finally {
      document.body.classList.remove('opening-deal');
      this.practiceDealt = true;
      this.busy = false;
      this.render();
    }
  }

  /**
   * Demo mode: the AI takes both seats.
   *
   * This is not a copy of the game or a recording of one — it is the same
   * engine, the same cards and the same board, with `playAiTurn` in the seat
   * that normally waits for clicks. One branch differs.
   */
  demo = false;

  /**
   * Watching a recording rather than playing.
   *
   * Separate from `demo`, which is the title-screen reel. Both refuse
   * clicks and neither shows tips, but a replay is driven one step at a
   * time from outside — `run()` is never called — so nothing here ever
   * reaches the result screen or the presentation queue.
   */
  replay = false;

  /**
   * Show what was hidden at the time.
   *
   * The one thing a replay can do that watching the duel could not.
   * Only ever set while replaying: setting it live would hand a player
   * their opponent's hand.
   */
  revealAll = false;

  async run(): Promise<void> {
    await this.prepareAssets();
    if (this.tutorial) this.tutorial.onChange = () => {
      // A new instruction deserves to be seen even if the player minimised
      // the previous one to reach the board beneath it.
      this.tutorialCoachMinimized = false;
      if (this.firstBattle) this.tutorialCoachSuppressed = false;
      this.render();
      if (this.tutorial?.completed) this.endHumanTurn();
    };
    if (this.firstBattle) { await this.runFirstBattle(this.firstBattle); return; }
    let firstLoop = true;
    while (this.game.winner === null && !this.tutorial?.completed) {
      const p = this.game.turnPlayer;
      if (!(firstLoop && this.prepared)) await this.ctrl.beginTurn();
      firstLoop = false;
      this.journey?.settle();
      if (this.tutorial?.completed) break;
      this.render();

      // A deck-out is decided inside the draw step, so the turn that has just
      // begun is already lost. Without this the human sits waiting to play a
      // game that is over, and the AI takes a full turn after losing it.
      if (this.game.winner !== null) break;

      if (p === HUMAN && !this.demo) {
        await this.humanTurn();
      } else {
        await sleep(this.demo ? 600 : 1000);
        if (this.journey) await playJourneyOpponent(this.ctrl, this.journey.fixture);
        else if (this.tutorial instanceof SimpleSkillsSession) await playSimpleSkillsOpponent(this.ctrl);
        else if (this.nextBattle && !this.graduation) await playNextBattleTurn(this.ctrl);
        else await playAiTurn(this.ctrl, p, this.aiProfile);
        this.journey?.settle();
        this.render();
      }
    }
    if (this.tutorial?.completed) this.showTutorialComplete();
    else this.showWinner();
  }

  private humanTurnResolve: (() => void) | null = null;

  /** Three bounded sections. Opponent moves use the same controller as player clicks. */
  private async runFirstBattle(session: FirstBattleSession): Promise<void> {
    const m = firstBattleMoves(session.cards);
    try {
      if (session.startChapter === 0) {
        this.render();
        await session.waitFor('deal');
        await this.showGameStartBanner();
        session.observe({ kind: 'cue', cue: 'dealt' });
        await this.humanTurn();
      }
      if (session.startChapter < 2) {
        await session.waitFor('watch');
        this.busy = true;
        await this.ctrl.beginTurn();
        await this.ctrl.perform(m.foeCall, AI);
        await this.ctrl.perform({ kind: 'endPhase' }, AI);
        await this.ctrl.perform(m.foePersona, AI);
        await this.ctrl.perform(m.foeAlly, AI);
        session.observe({ kind: 'cue', cue: 'opponent-finished' });
        await session.waitFor('next-turn');
        await this.ctrl.perform({ kind: 'endTurn' }, AI);
        await this.ctrl.beginTurn();
        this.busy = false;
        this.render();
      }
      await this.humanTurn();
      if (this.game.winner !== HUMAN) throw new Error('The prepared battle did not reach its expected result.');
      await session.waitFor('completed');
      this.showTutorialComplete();
    } catch (error) {
      this.recoverFirstBattle(error);
    }
  }

  private recoverFirstBattle(error: unknown): void {
    this.busy = true;
    this.tutorialCoachSuppressed = true;
    this.render();
    console.error('First Battle:', error);
    const isDemo = this.firstBattle?.isLvlUpDemo;
    const restart = el('button', 'primary', isDemo ? 'Restart demo' : 'Restart Section');
    const leave = el('button', undefined, 'Back to Tutorials');
    modal('Let’s restart this part', isDemo ? 'The prepared demo got out of step. Restart to begin a fresh visitor battle.' : 'The prepared battle got out of step. Your last section is saved.', el('div'), [restart, leave]);
    restart.onclick = () => { location.search = isDemo ? '?tutorial=lvl-up-3' : journeyUrl(1, sessionRegion()); };
    leave.onclick = () => { location.search = '?tutorial'; };
  }

  private humanTurn(): Promise<void> {
    return new Promise((resolve) => { this.humanTurnResolve = resolve; });
  }

  /** Hold an engine presentation hook until the tutorial's Continue is used. */
  private waitForTutorialContinue(): Promise<void> {
    if (!this.tutorial || this.tutorial.completed) return Promise.resolve();
    this.tutorialCoachSuppressed = false;
    return new Promise((resolve) => {
      this.tutorialPauseResolve = resolve;
      this.render();
    });
  }

  /**
   * Concede, after asking.
   *
   * Irreversible and one click from the board, so it confirms first. The
   * engine refuses if the duel is already decided; releasing the turn promise
   * afterwards is what lets `run()` notice and show the result, exactly as a
   * win during your own turn does.
   */
  surrender(): void {
    if (this.demo || this.replay || this.game.winner !== null) return;

    const body = el('div', 'sub',
      'The duel ends now and your opponent wins. This cannot be undone.');
    const yes = el('button', 'danger', 'Surrender');
    const no = el('button', 'primary', 'Keep playing');
    const bg = modal('Surrender the duel?', '', body, [no, yes]);

    no.onclick = () => bg.remove();
    yes.onclick = () => {
      bg.remove();
      if (!this.ctrl.concede(HUMAN)) return;
      this.onRecordingConceded?.();
      this.render();
      // Releasing the turn promise is not enough on its own. Conceding during
      // the opponent's turn leaves `run()` awaiting their move, and the loop
      // only re-checks the winner between turns — so the result would wait for
      // an opponent to finish a turn in a game that is already over. Show it
      // now; the loop's own call is idempotent.
      this.endHumanTurn();
      this.showWinner();
    };
  }

  goHome(): void {
    const remote = this.ctrl instanceof RemoteController ? this.ctrl : undefined;
    const exit = () => { this.disposePresentation(); clearChainCues(); clearActionRecap(); location.assign(location.pathname); };
    if (this.game.winner !== null || this.demo || this.replay) {
      if(remote) void remote.leaveToHome().then(exit).catch(()=>exit());
      else void Promise.resolve(this.resultRecordingReady).then(exit);
      return;
    }
    const body=el('div','sub',remote
      ? 'Leaving surrenders this duel to your opponent.'
      : this.tutorial || this.nextBattle ? 'Completed tutorial progress is kept. This unfinished battle will restart when you return.' : 'This battle will end. The unfinished match will not be saved.');
    const cancel=el('button',undefined,'Keep playing') as HTMLButtonElement,leave=el('button','danger',remote?'Surrender & go Home':'Go Home') as HTMLButtonElement;
    const panel=modal('Return Home?', '', body, [cancel,leave]);
    cancel.onclick=()=>panel.remove();
    leave.onclick=async()=>{
      leave.disabled=true; cancel.disabled=true;
      try { if(remote) await remote.leaveToHome(); exit(); }
      catch { body.textContent='Could not leave the online room. Wait for the connection, then try again.'; leave.disabled=false;cancel.disabled=false; }
    };
  }

  private endHumanTurn() {
    const r = this.humanTurnResolve;
    this.humanTurnResolve = null;
    r?.();
  }

  private async act(action: PlayerAction) {
    if (this.busy || duelDecisionPending()) return;
    if (this.tutorial && !this.tutorial.allows(action)) {
      this.hint = `Follow the tutorial step: ${this.tutorial.step.title}.`;
      this.render();
      return;
    }
    this.busy = true;
    try {
      await this.ctrl.perform(action, HUMAN);
      this.tutorial?.observe({ kind: 'action', action });
      this.nextBattle?.action(action);
    } catch (err) {
      if (this.firstBattle) { this.recoverFirstBattle(err); return; }
      this.hint = String((err as Error).message);
    }
    this.busy = false;
    this.sel = { supporters: [] };
    this.render();
    // Present what that click caused, at whatever pace is set. Awaited so a
    // second click cannot start a new action over the top of the first one's
    // explanation; `busy` is already false, so the board stays responsive.
    await this.drainEvents();
    this.journey?.settle();
    // A win during your own turn must release the turn promise too, otherwise
    // run() waits forever and the game silently stops with no announcement.
    if (action.kind === 'endTurn' || this.game.winner !== null) this.endHumanTurn();
  }

  // -- rendering ------------------------------------------------------------

  /** Side-panel figures worth reacting to when they change. */
  private lastVitals: Record<string, number | string> = {};

  /** Compare this render's key figures with the last and flag what moved. */
  private markVitalChanges(): void {
    const g = this.game;
    for (const p of [HUMAN, AI] as PlayerId[]) {
      const tag = p === HUMAN ? 'me' : 'foe';

      const lvl = personaLevel(index, g, p);
      if (this.lastVitals[`${tag}.lvl`] !== undefined && this.lastVitals[`${tag}.lvl`] !== lvl) {
        // Levelling up increases the Play allowance.
        setTimeout(() => {
          this.pulseStat(p, 'Persona level', 'stat-up');
          if (p === HUMAN) this.shakeScreen(0.3);
        }, 0);
      }
      this.lastVitals[`${tag}.lvl`] = lvl;



    }
  }

  private handOrigins = new Map<string, DOMRect>();
  private foeHandOrigin?: DOMRect;
  render() {
    hideModPopover();
    for (const node of Array.from(document.querySelectorAll<HTMLElement>('.hand-card[data-uid]'))) {
      const rect = node.getBoundingClientRect(); if (rect.width) this.handOrigins.set(node.dataset.uid!, rect);
    }
    const foeHand = document.querySelector<HTMLElement>('.foehand .fb');
    if (foeHand) this.foeHandOrigin = foeHand.getBoundingClientRect();
    const effectRects = new Map<string, DOMRect>();
    for (const [uid, node] of this.cardNodes) {
      const badge = node.querySelector('.mod-chips');
      if (badge?.isConnected) effectRects.set(uid, badge.getBoundingClientRect());
    }
    if (this.game.responseChain?.phase !== 'resolving') {
      this.resolvingSource?.classList.remove('effect-source-active');
      this.resolvingSource = null;
    }
    const previousHand = captureHand();
    const g = this.game;
    const persona = you(g, HUMAN).persona;
    applyBattlefieldPresentation(this.battlefield);
    setSoundscape(g.winner !== null ? (g.winner === HUMAN ? 'victory' : 'defeat') : this.tutorial || this.nextBattle ? 'tutorial' : deckTheme(persona ? g.cards[persona]?.defId ?? '' : ''), you(g, HUMAN).barriers.length <= 1);
    const children: HTMLElement[] = [];
    app.classList.toggle('tutorial-active', !!this.tutorial && !this.tutorial.completed);
    app.classList.toggle('first-battle-active', !!this.firstBattle);
    app.classList.toggle('next-battle-active', !!this.nextBattle);
    app.classList.toggle('next-battle-before-deal', !!this.nextBattle && !this.practiceDealt);
    app.classList.toggle('first-battle-before-deal', !!this.firstBattle && ['welcome', 'persona', 'goal', 'deal'].includes(this.firstBattle.step.id));
    const wrap = this.keep('board', 'board-wrap', false);
    const mats = this.keep('mats', 'mats', false);
    const matChildren: HTMLElement[] = [];
    matChildren.push(this.renderFoeHand());
    matChildren.push(this.renderMat(AI, true));
    // No wordmark between the mats. The two Defense strips meet here — the
    // opponent's mat is rotated, so its Defense edge faces the middle — and a
    // label sitting in that seam was in the way of the one place where both
    // players' cards need to be read together.
    matChildren.push(this.renderDefenseZone());
    matChildren.push(this.renderMat(HUMAN, false));
    syncChildren(mats, matChildren);
    syncChildren(wrap, [mats]);
    if (this.demo || this.replay) wrap.classList.add('demo-mode');
    // A click on bare board finishes the current animation. It is bound to the
    // wrap rather than the document so clicking a card, the hand or any HUD
    // control does not trigger it — and it only ever shortens a hold, so it
    // cannot answer a prompt or select anything.
    wrap.onclick = (ev) => {
      if (ev.target === wrap || ev.target === mats) this.finishAnimation();
    };
    children.push(wrap);
    void initGlFx();

    // The HUD overlays are siblings of the board, not children of it.
    // `perspective` makes an element the containing block for its fixed-
    // position descendants, so leaving them inside would have anchored them to
    // the tilted board instead of the viewport the moment the camera went on.
    const foeSide = this.renderSide(AI);
    children.push(foeSide);
    children.push(this.renderSide(HUMAN));

    // On a phone the opponent's card backs move out of the board and into the
    // strip that already describes them, next to the count they illustrate.
    // Inside `.mats` they are a row, and a row of the board's height is the
    // one thing a 400px-tall screen cannot spare — moving them gives it back
    // to the mats, which is where the cards are.
    if (compactLayout() && this.battlefield !== 'anime') {
      const backs = wrap.querySelector('.foehand');
      if (backs) foeSide.appendChild(backs);
    }
    // Build the HUD on the first real frame rather than on the first action,
    // so the live region exists before there is anything to speak into it.
    if (!this.demo && !this.replay) this.getHud();

    children.push(this.renderLogOverlay());
    if ((this.firstBattle || this.tutorial instanceof SimpleSkillsSession) && !this.tutorial?.completed) {
      const controls = el('nav', 'first-battle-controls');
      controls.setAttribute('aria-label', 'Tutorial controls');
      const isDemo = this.firstBattle?.isLvlUpDemo;
      const restart = el('button', undefined, isDemo ? 'Restart demo' : this.firstBattle ? 'Restart Section' : 'Restart Lesson');
      restart.onclick = () => { location.search = isDemo ? '?tutorial=lvl-up-3' : this.firstBattle ? journeyUrl(1, sessionRegion()) : `?practice=next-battle&region=${sessionRegion()}`; };
      const leave = el('button', undefined, isDemo ? 'Back to Tutorial' : 'Leave Lesson');
      leave.onclick = () => { location.search = '?tutorial'; };
      controls.append(restart, leave); children.push(controls);
    }
    children.push(this.renderHand());
    if (this.battlefield === 'anime') children.push(createAnimeChrome({
      turn: g.turnNumber, localTurn: g.turnPlayer === HUMAN, phase: g.phase,
    }));
    children.push(el('p', 'mobile-orientation-tip', 'Turn sideways for a wider battlefield.'));

    if (this.journey && !this.journey.completed) {
      const controls = el('nav', 'journey-controls');
      const retry = el('button', undefined, 'Retry'), leave = el('button', undefined, 'Journey');
      retry.onclick = () => { location.search = `${journeyUrl(this.journey!.fixture.chapter, this.journey!.fixture.region)}&encounter=${this.journey!.fixture.encounter}`; };
      leave.onclick = () => { location.search = journeyUrl(); };
      controls.append(retry, leave); children.push(controls);
    }
    if (this.tutorial && !this.tutorial.completed
      && !this.tutorialCoachSuppressed && !this.tutorial.step.hidden) {
      children.push(
        this.tutorialCoachMinimized
          ? this.renderMinimizedTutorialCoach()
          : this.renderTutorialCoach(),
      );
    }
    // A HUD refresh must not discard an in-flight Barrier shell. Its own
    // animation/abort cleanup removes it; scene navigation still clears it.
    children.push(...Array.from(app.querySelectorAll<HTMLElement>(':scope > .barrier-shatter-behind-hand')));
    syncChildren(app, children);
    placeBarrierIndicators();
    const combat = g.activeBattle;
    if (combat && combat.stage !== 'resolved') {
      const target = combat.target ?? you(g, combat.defender).persona;
      updateCombatGuide(this.findCardNode(combat.attacker, false), target ? this.findCardNode(target, false) : null);
    } else clearCombatGuide();
    for (const change of this.clarityTracker.update(g)) {
      if (change.kind === 'exhaust') feedbackAt(this.findCardNode(change.uid, false), 'Exhausted');
      else feedbackAt(this.zoneNode('codex', change.player), `${change.state} inactive`);
    }
    this.refreshEffectAvailability();
    const endedEffects = this.expiryTracker.update(g);
    if (!this.demo && !this.replay && g.winner === null) for (const effect of endedEffects) {
      // Power removal is represented once by its actual signed value change.
      if (effect.kind === 'power') continue;
      const rect = effectRects.get(effect.uid);
      if (rect) fadeEndedEffect(rect, effect.kind);
    }
    this.refreshPowerCues();
    const recap = this.ctrl instanceof RemoteController && this.ctrl.frame.busy ? undefined : this.recapTracker.update(g, index);
    if (recap && !this.demo && !this.replay && !this.tutorial && !this.nextBattle) showActionRecap(recap, () => {
      const entry = entryForGroup(eventLogOf(this.game).events, recap.group, HUMAN);
      if (entry) this.getHud().showEntry(entry);
    });
    const addedSkills = this.grantedSkillTracker.update(g);
    if (!document.hidden) for (const uid of addedSkills) {
      const node = this.findCardNode(uid, false);
      highlightEffectTarget(node); feedbackAt(node, 'Skill added');
    }
    // Forget cards that are no longer rendered, so the map cannot grow without
    // bound over a long game.
    for (const [uid, node] of this.cardNodes) {
      if (!node.isConnected) {
        this.cardNodes.delete(uid);
        this.lastPower.delete(uid);
      }
    }
    this.markVitalChanges();
    // Dedicated tutorial sessions own coaching; regular matches never show legacy tips.
    clearTips();
    if (!document.body.classList.contains('opening-deal')) settleHand(previousHand);
    if (this.nextBattle && g.winner === null && !document.body.classList.contains('opening-deal')) this.renderNextBattleCoach();
    // Re-point after reconciliation: a relocated or removed card can change
    // the anchor even though unrelated field cards retain their DOM identity.
    this.syncAim();
    void g;
  }

  private refreshEffectAvailability(): void {
    const decision = this.ctrl instanceof RemoteController ? this.ctrl.frame.decision : null;
    const candidates = decision?.kind === 'chooseAbility' ? (decision.args[2] as AbilityOption[]).map(o => o.uid) : [];
    markAvailableEffects(this.game, this.legalActions(), candidates);
  }

  private legalActions(): PlayerAction[] {
    const legal = this.ctrl.legalActions(HUMAN);
    return this.tutorial ? legal.filter((action) => this.tutorial!.allows(action)) : legal;
  }

  private nextBattleTarget(): HTMLElement | null {
    const action=this.nextBattle!.level===3 ? nextBattleHint(this.ctrl).action : undefined;
    let selector='.side.foe .z-barrier, .mat.foe .z-barrier';
    if (action?.kind==='call') selector=this.sel.handUid===action.uid
      ? `.mat:not(.foe) .slot[data-slot="${action.slot}"]` : `.hand-card[data-uid="${action.uid}"]`;
    if (action?.kind==='playAction') selector=`.hand-card[data-uid="${action.uid}"]`;
    if (action?.kind==='attack') selector=this.sel.attacker===action.attacker
      ? action.target ? `.card[data-uid="${action.target}"]` : '.mat.foe .slot.persona'
      : `.card[data-uid="${action.attacker}"]`;
    if (action?.kind==='endPhase' || action?.kind==='endTurn') selector='.side.mine .turn-btn';
    return app.querySelector<HTMLElement>(selector);
  }

  private renderNextBattleCoach(): void {
    const session=this.nextBattle!, hint=nextBattleHint(this.ctrl); session.sync(hint.key);
    const selection=this.sel.handUid ?? this.sel.attacker ?? '';
    if(selection!==this.practiceSelection) { this.practiceSelection=selection; this.practiceAutoMinimized=!!selection; }
    document.querySelectorAll('.practice-target').forEach(n=>n.classList.remove('practice-target'));
    const controls=el('nav','first-battle-controls next-battle-controls');
    const restart=el('button',undefined,'Restart Battle'),leave=el('button',undefined,'Leave Practice');
    restart.onclick=()=>{location.search=this.graduation?`?graduation&region=${sessionRegion()}`:`?practice=next-battle&region=${sessionRegion()}`;}; leave.onclick=()=>{location.search=`?tutorial&region=${sessionRegion()}`;};
    controls.append(restart,leave); app.append(controls);
    if(session.minimized || this.practiceAutoMinimized) {
      const restore=el('button','tutorial-coach-minimized next-battle-restore','Show practice goal');
      restore.onclick=()=>{session.minimized=false;this.practiceAutoMinimized=false;this.render();}; app.append(restore);
      requestAnimationFrame(()=>{if(restore.isConnected && session.level===3) this.nextBattleTarget()?.classList.add('practice-target');});
      return;
    }
    const coach=el('aside','tutorial-coach next-battle-coach');
    coach.setAttribute('aria-label','Practice help');
    coach.append(el('div','tutorial-kicker','Tutorial version · Practice Duel · Optional help'),el('h2',undefined,hint.objective));
    if (session.level === 3) coach.append(el('div','tutorial-location'));
    if(session.feedback) coach.append(el('p','next-battle-feedback',session.feedback));
    if(session.level) { const text=el('p','next-battle-advice'); text.innerHTML=formatCardText(inputCopy(hint.levels[session.level-1] ?? '')); text.setAttribute('aria-live','polite'); coach.append(text); }
    const buttons=el('div','tutorial-coach-actions');
    const help=el('button','next-hint',session.level===3?'Hide Hint':session.level?'More Help':'Need a Hint?') as HTMLButtonElement;
    help.disabled=this.busy || this.game.turnPlayer!==HUMAN || !['main','battle'].includes(this.game.phase);
    help.onclick=()=>{ if(session.level===3) session.level=0; else session.request(hint.key); this.render(); app.querySelector<HTMLButtonElement>('.next-hint')?.focus(); };
    const min=el('button',undefined,'Minimize'); min.onclick=()=>{session.minimized=true;this.render();};
    buttons.append(help,min);coach.append(buttons);app.append(coach);
    requestAnimationFrame(()=>{
      if(!coach.isConnected) return;
      const target=this.nextBattleTarget();
      if(target) { if(session.level===3) target.classList.add('practice-target'); this.positionTutorialCoach(coach,target); }
      if(session.level<3) document.querySelector('.tutorial-connector')?.remove();
    });
  }

  private async requestEndTurn(): Promise<void> {
    if (this.busy || duelDecisionPending()) return;
    const available = this.nextBattle ? this.legalActions().filter(a=>a.kind==='attack') : [];
    if (available.length) {
      const proceed=el('button',undefined,'End Anyway'),keep=el('button','primary','Keep Playing');
      const approved=await new Promise<boolean>(resolve=>{
        const bg=modal('You can still attack','A charged Unit still has a legal attack. You can use it, or keep your current position.',el('div'),[keep,proceed]);
        proceed.onclick=()=>{bg.remove();resolve(true);}; keep.onclick=()=>{bg.remove();resolve(false);};
      });
      if(!approved) return;
    }
    await this.act({kind:'endTurn'});
  }

  private renderTutorialCoach(): HTMLElement {
    const session = this.tutorial!;
    const step = session.step;
    const coach = el('aside', 'tutorial-coach');
    if (step.expected.kind === 'action') coach.dataset.awaitingAction = 'true';
    if (this.journey) coach.classList.add('journey-coach');
    if (this.firstBattle) { coach.classList.add('first-battle-coach'); coach.dataset.step = this.firstBattle.step.id; }
    coach.setAttribute('aria-live', 'polite');
    coach.innerHTML = `<div class="tutorial-kicker">${this.firstBattle?.isLvlUpDemo ? 'Lvl Up 3.0 · Guided demo' : 'Tutorial version'} · ${this.firstBattle ? `${this.firstBattle.isLvlUpDemo ? 'Luzon' : 'First Battle'} · Part ${this.firstBattle.step.chapter + 1} of 3` : this.journey ? `Chapter ${session.lesson.number} · Encounter ${this.journey.fixture.encounter + 1} / ${JOURNEY_ENCOUNTER_COUNTS[this.journey.fixture.chapter]}` : `Lesson ${session.lesson.number} · Step ${session.stepIndex + 1} of ${session.lesson.steps.length}`}</div>`
      + `<h2>${escapeHtml(step.title)}</h2><div class="tutorial-location"></div><p>${formatCardText(inputCopy(step.body))}</p>`;
    const guidedAction = this.firstBattle?.step.action ?? (session instanceof SimpleSkillsSession
      ? this.legalActions().find(action => action.kind === 'attack' || action.kind === 'call') : undefined);
    if (guidedAction?.kind === 'attack' && this.sel.attacker) {
      coach.querySelector('h2')!.textContent = 'Choose their Persona';
      coach.querySelector('p')!.innerHTML = formatCardText('Choose the glowing Persona on your opponent’s side.');
    } else if (guidedAction?.kind === 'call' && this.sel.handUid) {
      coach.querySelector('h2')!.textContent = 'Choose the glowing Ally Zone';
      coach.querySelector('p')!.innerHTML = formatCardText('Place your card in the glowing empty Ally Zone.');
    }
    if (step.why) {
      const why = el('details', 'tutorial-why');
      why.innerHTML = `<summary>Why?</summary><p>${formatCardText(inputCopy(step.why))}</p>`;
      coach.appendChild(why);
    }
    const row = el('div', 'tutorial-coach-actions');
    if (this.journey) {
      const help = el('button', undefined, this.journey.hintVisible ? 'Hide hint' : 'Need a hint?');
      help.onclick = () => { this.journey!.hintVisible = !this.journey!.hintVisible; this.render(); };
      row.append(help);
      if (this.journey.hintVisible) { const hint=el('p','next-battle-advice'); hint.innerHTML=formatCardText(inputCopy(this.journey.goal.hint)); coach.append(hint); }
    }
    if (this.firstBattle?.step.id === 'inspect') {
      const inspect = el('button', undefined, 'Read Card');
      inspect.onclick = () => showInfo(recordOf(this.game, this.firstBattle!.cards.ally));
      row.append(inspect);
    }
    if (step.expected.kind === 'manual') {
      const next = el('button', 'primary', this.firstBattle?.step.button ?? (session.stepIndex === session.lesson.steps.length - 1 ? 'Finish lesson' : 'Continue'));
      if (step.highlightContinue) next.classList.add('tutorial-continue-target');
      next.onclick = () => {
        if (session.step !== step || session.completed) return;
        const release = this.tutorialPauseResolve;
        if (release) this.tutorialCoachSuppressed = true;
        session.continue();
        if (release) {
          this.tutorialPauseResolve = null;
          release();
        }
      };
      row.appendChild(next);
    } else {
      row.appendChild(el('span', 'tutorial-wait', 'Complete the highlighted action to continue.'));
    }
    const minimize = el('button', undefined, 'Minimize');
    minimize.title = 'Hide this message while keeping the lesson active';
    minimize.onclick = () => {
      this.tutorialCoachMinimized = true;
      this.render();
    };
    row.appendChild(minimize);
    coach.appendChild(row);
    coach.addEventListener('toggle', () => this.refreshTutorialLayout(), true);
    setTimeout(() => {
      if (!coach.isConnected || session.step !== step) return;
      document.querySelectorAll('.tutorial-target').forEach((n) => n.classList.remove('tutorial-target'));
      document.querySelector('.tutorial-connector')?.remove();
      const target = step.highlightContinue
        ? coach.querySelector<HTMLElement>('.tutorial-continue-target')
        : visibleTutorialAnchor(app, this.tutorialAnchor());
      if (target) {
        target.classList.add('tutorial-target');
        if (!step.highlightContinue) this.positionTutorialCoach(coach, target);
      } else {
        coach.classList.add('tutorial-coach-centred');
      }
    }, 0);
    return coach;
  }

  private renderMinimizedTutorialCoach(): HTMLElement {
    const session = this.tutorial!;
    const pill = el('button', 'tutorial-coach-minimized');
    pill.innerHTML = `<span>${this.firstBattle?.isLvlUpDemo ? 'Lvl Up 3.0' : this.firstBattle ? 'First Battle' : `Lesson ${session.lesson.number}`}</span>`
      + `<b>${escapeHtml(session.step.title)}</b>`
      + '<em>Show instruction</em>';
    pill.onclick = () => {
      this.tutorialCoachMinimized = false;
      this.render();
    };
    setTimeout(() => {
      document.querySelectorAll('.tutorial-target').forEach((node) => node.classList.remove('tutorial-target'));
      document.querySelector('.tutorial-connector')?.remove();
      const target = visibleTutorialAnchor(app, this.tutorialAnchor());
      target?.classList.add('tutorial-target');
    }, 0);
    return pill;
  }

  /** Re-anchor without rebuilding the board or discarding a pending choice. */
  refreshTutorialLayout(): void {
    if (this.nextBattle) {
      const coach=app.querySelector<HTMLElement>('.next-battle-coach'),target=this.nextBattleTarget();
      if(coach && target) {
        document.querySelector('.tutorial-connector')?.remove(); this.positionTutorialCoach(coach,target);
        if(this.nextBattle.level<3) document.querySelector('.tutorial-connector')?.remove();
      }
      return;
    }
    const coach = app.querySelector<HTMLElement>('.tutorial-coach');
    const step = this.tutorial?.step;
    if (!coach || !step || step.highlightContinue) return;
    const target = visibleTutorialAnchor(app, this.tutorialAnchor());
    if (!target) return;
    document.querySelector('.tutorial-connector')?.remove();
    this.positionTutorialCoach(coach, target);
  }

  private tutorialAnchor(): string | undefined {
    if (this.tutorial instanceof SimpleSkillsSession) {
      const legal = this.legalActions();
      if (this.sel.attacker && legal.some(action => action.kind === 'attack' && action.attacker === this.sel.attacker)) return '.mat.foe .slot.persona';
      const call = legal.find(action => action.kind === 'call' && action.uid === this.sel.handUid);
      if (call?.kind === 'call') return `.mat:not(.foe) .slot[data-slot="${call.slot}"]`;
    }
    if (this.journey && this.sel.attacker) return '.mat.foe .slot.persona';
    if (this.journey && this.sel.handUid && this.journey.goal.actions.includes('call')) {
      const empty = you(this.game, HUMAN).allies.indexOf(null);
      if (empty >= 0) return `.mat:not(.foe) .slot[data-slot="${empty}"]`;
    }
    const first = this.firstBattle;
    if (first?.step.action?.kind === 'call' && this.sel.handUid === first.step.action.uid) return `.mat:not(.foe) .slot[data-slot="${first.step.action.slot}"]`;
    if (first?.step.action?.kind === 'attack' && this.sel.attacker === first.step.action.attacker) return '.mat.foe .slot.persona';
    return this.tutorial?.step.anchor;
  }

  /** Measure the current board, preserving the target, hand and legal destinations. */
  private positionTutorialCoach(coach: HTMLElement, target: HTMLElement): void {
    coach.classList.remove('tutorial-coach-centred');
    app.querySelector('.tutorial-space-restore')?.remove();
    if (!placeTutorialGuide(coach, target)) {
      // Retain the actual lesson controls (including Continue) on small screens.
      coach.hidden = true;
      const restore = el('button', 'tutorial-coach-minimized tutorial-space-restore', 'Show instruction');
      restore.onclick = () => {
        coach.hidden = false;
        coach.style.left = ''; coach.style.top = ''; coach.style.width = ''; coach.style.maxHeight = '';
        coach.classList.add('tutorial-coach-centred');
        restore.remove();
        coach.querySelector<HTMLButtonElement>('.tutorial-coach-actions button')?.focus();
      };
      app.append(restore);
    }
  }

  private showTutorialComplete(): void {
    if (this.tutorial instanceof SimpleSkillsSession) {
      completeJourney(2);
      const result = el('div', 'banner tutorial-complete');
      result.append(el('h1', undefined, 'Simple Skills complete'), el('p', 'result-line', 'You saw a call bonus last for a turn and an attack bonus end after one attack. Next, learn to support and defend.'));
      const next = el('button', 'primary', 'Support and Defense'); next.onclick = () => { location.search = journeyUrl(3, sessionRegion()); };
      const home = el('button', undefined, 'Return to journey'); home.onclick = () => { location.search = journeyUrl(); };
      result.append(next, home); document.body.append(result); return;
    }
    if (this.journey) {
      const { chapter, encounter, region } = this.journey.fixture;
      // A final reading step may finish inside Heart/Grave inspection. Release
      // the read-only pile panel before the chapter result takes over input.
      closeCardBrowsers();
      this.journey.saveCompletion();
      if (encounter + 1 < JOURNEY_ENCOUNTER_COUNTS[chapter]) { location.search = `${journeyUrl(chapter, region)}&encounter=${encounter + 1}`; return; }
      const result = el('div', 'banner tutorial-complete');
      result.append(el('h1', undefined, 'Chapter complete'), el('p', 'result-line', chapter === 3 ? 'You added support, used a Force, stopped an attack with a Sentry and tried your region’s Action.' : 'You changed your Persona, compared two training Codex and learned when your Personas’ ordinary skills work. Now try a practice duel.'));
      const next = el('button', 'primary', chapter === 3 ? 'Persona and Codex' : 'Practice Duel');
      next.onclick = () => { location.search = journeyUrl((chapter + 1) as JourneyChapter, region); };
      const home = el('button', undefined, 'Return to journey'); home.onclick = () => { location.search = journeyUrl(); };
      result.append(next, home); document.body.append(result); next.focus({ preventScroll: true }); return;
    }

    if (this.firstBattle) {
      if (this.firstBattle.isLvlUpDemo) {
        const b = el('div', 'banner tutorial-complete lvl-up-complete');
        b.append(el('div', 'tutorial-kicker', 'Lvl Up 3.0 complete'), el('h1', undefined, 'You made the winning attack'),
          el('p', 'result-line', 'You called Kalimangalnuk, defended Nanolay and finished the battle with your Ally.'),
          el('p', 'sub', 'This demo used simplified Luzon cards and 2 Barriers. Continue Tutorial to learn more; normal matches use regular card abilities and 5 Barriers.'));
        const row = el('div', 'banner-buttons');
        const again = el('button', 'primary', 'Next visitor');
        again.onclick = () => { location.search = '?tutorial=lvl-up-3'; };
        const back = el('button', undefined, 'Explore Tutorial');
        back.onclick = () => { location.search = '?tutorial'; };
        row.append(again, back); b.append(row); document.body.append(b); again.focus(); return;
      }
      if (this.game.winner === HUMAN) completeJourney(1);
      const b = el('div', 'banner tutorial-complete');
      b.append(el('div', 'tutorial-kicker', 'First Battle complete'), el('h1', undefined, 'You’re ready to try your own moves'),
        el('p', 'result-line', 'You called an Ally, attacked and defended. Next, see how simple Power bonuses work.'));
      const row = el('div', 'banner-buttons');
      const practice = el('button', 'primary', 'Learn Simple Skills');
      practice.onclick = () => { location.search = `?practice=next-battle&region=${sessionRegion()}`; };
      const again = el('button', undefined, 'Play First Battle Again');
      again.onclick = () => { resetFirstBattleProgress(); location.search = journeyUrl(1, sessionRegion()); };
      const back = el('button', undefined, 'Back to Tutorials');
      back.onclick = () => { location.search = '?tutorial'; };
      row.append(practice, again, back); b.append(row); document.body.append(b); return;
    }
  }

  /** Aim from the chosen attacker, or stop aiming when there is none. */
  private syncAim(): void {
    const uid = this.sel.attacker;
    if (!uid || this.game.turnPlayer !== HUMAN || this.game.phase !== 'battle') {
      aimFrom(null);
      return;
    }
    const node = document.querySelector<HTMLElement>(
      `.mat:not(.foe) .card[data-uid="${uid}"]`,
    );
    if (node) aimFrom(node); else aimFrom(null);
    refreshAim();
  }

  /**
   * The mat is drawn entirely in CSS, so every zone is a real layout box and
   * the cards land exactly inside it. Field order matches the printed mat:
   *
   *            DEFENSE
   *   [Extra]  Ally Ally PERSONA Ally Ally  [Check]
   *   [Codex]                               [Deck]
   *   [Exile]  ------ BARRIERS x5 ------   [Grave]
   */
  /**
   * Collapse the mat's eight children into three: a left stack, the units, a
   * right stack.
   *
   * The desktop mat is a 3x3 grid — counters down both flanks and a Barrier
   * row along the bottom — and on a landscape phone that grid leaves the units
   * row 71px of a 117px mat, which is a 40x57px playing card. Gathering the
   * flanks into two containers lets the units row be the mat's whole height
   * instead of what three rows leave over.
   *
   * The zone elements are MOVED, not rebuilt. Every one of them is a `keep()`
   * element that the animations hold by identity — a card flying to the Grave
   * measures the Grave's rectangle — so re-parenting is safe and replacing
   * would not be. That also means a gathered zone must stay visible: a
   * `display: none` zone measures 0x0, and cards would fly to the top-left
   * corner of the screen.
   *
   * Barrier goes right. `.mat.foe` is rotated 180deg, so the same side lands
   * lower-right for the player and top-left for the opponent, which is where
   * they belong without a second rule.
   */
  private renderMat(p: PlayerId, foe: boolean): HTMLElement {
    const g = this.game;
    const ps = you(g, p);
    const mat = this.keep(`${p}:mat`, `mat${foe ? ' foe' : ''}${g.turnPlayer === p ? ' active' : ''}`, false);
    const children: HTMLElement[] = [];

    // --- Left column: Extra Zone + Codex (each in its own grid row) --------
    children.push(this.pileBox(
      `${p}:extra`, 'Extra', ps.extra.length, ps.extra.length > 0, 'z-extra', ps.extra,
    ));
    const switchable = p === HUMAN &&
      g.phase === 'main' &&
      g.turnPlayer === HUMAN &&
      this.legalActions().some((a) => a.kind === 'switchCodex');
    const codexBox = this.keep(`${p}:codex`, `pilebox z-codex${switchable ? ' switchable' : ''}`);
    if (switchable) {
      codexBox.appendChild(el('div', 'hintdot'));
    }
    this.bindPileViewer(codexBox, 'Codex', ps.codex);
    codexBox.appendChild(el('div', 'zlabel flip', 'Codex'));
    const codexMini = el('div', 'mini' + (ps.activeCodex ? '' : ' empty'));
    if (ps.activeCodex) {
      const rec = recordOf(g, ps.activeCodex);
      codexMini.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
      codexMini.style.cursor = 'pointer';
      attachInspect(codexMini, rec);
    }
    codexBox.appendChild(codexMini);
    codexBox.appendChild(el('div', 'n flip', String(ps.codex.length)));

    // Your own reserve Codex, ghosted. You chose these three yourself, so this
    // reveals nothing you do not already know — it just saves opening a menu
    // to remember what you can switch to. Never shown for the opponent.
    if (p === HUMAN && settings().seeSetCards) {
      const reserve = ps.codex.filter((uid) => uid !== ps.activeCodex);
      if (reserve.length > 0) {
        const strip = el('div', 'codex-reserve');
        for (const uid of reserve) {
          const rec = recordOf(g, uid);
          const ghost = el('div', 'cr-mini');
          ghost.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
          ghost.title = rec.name;
          attachInspect(ghost, rec);
          strip.appendChild(ghost);
        }
        codexBox.appendChild(strip);
      }
    }
    children.push(codexBox);

    // --- Unit row: Ally Ally PERSONA Ally Ally ------------------------------
    const units = this.keep(`${p}:units`, 'z-units', false);
    const slots: HTMLElement[] = [];
    const order: Array<number | 'persona'> = [0, 1, 'persona', 2, 3];
    for (const which of order) {
      const isPersona = which === 'persona';
      const slot = this.keep(`${p}:slot:${String(which)}`, `slot${isPersona ? ' persona' : ''}`, false);
      const contents: HTMLElement[] = [];
      if (this.battlefield === 'anime') contents.push(el('span', 'anime-slot-label', isPersona ? 'Persona' : 'Ally'));
      slot.dataset.slot = String(which);
      const uid = isPersona ? ps.persona : ps.allies[which];

      if (uid) {
        contents.push(this.renderCard(uid, p, foe));
        // Drop target for calling a unit from hand onto an occupied slot (overwrite).
        if (p === HUMAN && this.sel.handUid && g.phase === 'main' && !foe) {
          const legal = this.legalActions().some(
            (a) => a.kind === 'call' && a.uid === this.sel.handUid && a.slot === which,
          );
          if (legal) {
            slot.classList.add('drop', 'overwrite');
            slot.onclick = () =>
              this.act({ kind: 'call', uid: this.sel.handUid!, slot: which as number });
          }
        }
        // Allow clicking your own units during Main to offer relocate.
        if (p === HUMAN && !foe && g.phase === 'main' && g.turnPlayer === HUMAN && !this.sel.handUid) {
          const canRelocate = this.legalActions().some(
            (a) => a.kind === 'relocate' && a.uid === uid,
          );
          if (canRelocate) {
            slot.classList.add('selectable');
            slot.onclick = () => {
              this.sel = { ...this.sel, relocateUid: uid };
              this.hint = 'Choose an empty slot to move to.';
              this.render();
            };
          }
        }
        // Highlight the unit being relocated.
        if (this.sel.relocateUid === uid) slot.classList.add('sel');
      } else if (!isPersona) {
        const tag = el('div', 'stag flip', 'Ally');
        contents.push(tag);
        // Drop target for calling a unit from hand to an empty slot.
        if (p === HUMAN && this.sel.handUid && g.phase === 'main') {
          const legal = this.legalActions().some(
            (a) => a.kind === 'call' && a.uid === this.sel.handUid && a.slot === which,
          );
          if (legal) {
            slot.classList.add('drop');
            tag.textContent = 'Play';
            slot.onclick = () =>
              this.act({ kind: 'call', uid: this.sel.handUid!, slot: which as number });
          }
        }
        // Drop target for relocating a unit.
        if (p === HUMAN && this.sel.relocateUid && g.phase === 'main') {
          const legal = this.legalActions().some(
            (a) => a.kind === 'relocate' && a.uid === this.sel.relocateUid && a.toSlot === which,
          );
          if (legal) {
            const occupied = !!uid; // slot is occupied
            slot.classList.add('drop');
            if (occupied) {
              slot.classList.add('stack');
              tag.textContent = 'Stack';
            } else {
              tag.textContent = 'Move here';
            }
            slot.onclick = () => {
              this.act({ kind: 'relocate', uid: this.sel.relocateUid!, toSlot: which as number });
              this.sel = { supporters: [] };
            };
          }
        }
      } else {
        contents.push(el('div', 'stag flip', 'Persona'));
      }
      // Heart button: shows below the persona slot for any player with
      // cards in Heart (Spirit Tokens for Babaylan, old personas, essenced cards).
      if (isPersona) {
        const rawCount = ps.heart.length;
        if (rawCount >= 0) {
          // Effective count (Baya counts as 2).
          let effCount = 0;
          for (const uid of ps.heart) {
            const r = recordOf(g, uid);
            effCount += r.id === 'babaylan/drummer-of-the-first-calling-baya' ? 2 : 1;
          }
          const heartBtn = this.keep(`${p}:heart`, 'heart-btn', false);
          heartBtn.dataset.panelBrowse = 'true'; heartBtn.tabIndex = 0; heartBtn.setAttribute('role', 'button');
          heartBtn.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); heartBtn.click(); } };
          const label = effCount !== rawCount
            ? `${effCount} in Heart (${rawCount} cards)`
            : `${rawCount} in Heart`;
          let count = heartBtn.querySelector<HTMLElement>('.spirit-count');
          if (!count) { count = el('span', 'spirit-count'); heartBtn.append(count); }
          count.textContent = this.battlefield === 'anime' ? `♥ ${effCount}` : label;
          heartBtn.setAttribute('aria-label', label);
          heartBtn.onclick = (e) => {
            e.stopPropagation();
            this.showHeartViewer(ps.heart, rawCount, p);
          };
          contents.push(heartBtn);
        }
      }
      if (this.tutorial && slot.onclick) {
        slot.tabIndex = 0;
        slot.setAttribute('role', 'button');
        slot.setAttribute('aria-label', 'Call your Ally here');
        slot.onkeydown = event => {
          if (event.target === slot && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); slot.click(); }
        };
      } else if (this.tutorial) {
        slot.removeAttribute('tabindex'); slot.removeAttribute('role'); slot.removeAttribute('aria-label'); slot.onkeydown = null;
      }
      syncChildren(slot, contents);
      slots.push(slot);
    }
    syncChildren(units, slots);
    children.push(units);

    // --- Right column: Check + Deck (each in its own grid row) -------------
    // A card revealed on a check sits in the Check zone briefly while the
    // modal is shown. Find any check-zone card owned by this player.
    const checkUid = Object.values(g.cards).find(
      (c) => c!.zone === 'check' && c!.owner === p,
    )?.uid;
    if (checkUid) {
      const rec = recordOf(g, checkUid);
      const checkBox = this.keep(`${p}:check`, 'pilebox check-live z-check');
      checkBox.appendChild(el('div', 'zlabel flip', 'Check'));
      const mini = el('div', 'mini');
      mini.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
      if (this.transit.has(checkUid)) mini.style.visibility = 'hidden';
      checkBox.appendChild(mini);
      checkBox.appendChild(el('div', 'n flip', '1'));
      attachInspect(checkBox, rec);
      children.push(checkBox);
    } else {
      children.push(this.pileBox(`${p}:check`, 'Check', 0, false, 'z-check'));
    }
    children.push(this.pileBox(`${p}:deck`, 'Deck', ps.deck.length, true, 'z-deck', ps.deck));

    // --- Bottom row: Exile | Barriers | Grave ------------------------------
    // Exile: face-down, not inspectable.
    const exileBox = this.pileBox(
      `${p}:exile`, 'Exile', ps.exile.length, false, 'z-exile', ps.exile,
    );
    if (ps.exile.length > 0) {
      const exileMini = el('div', 'mini');
      exileMini.style.backgroundImage = `url("${CARD_BACK}")`;
      exileBox.appendChild(exileMini);
    }
    children.push(exileBox);

    const bar = this.keep(`${p}:barriers`, 'zbox z-barrier', false);
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `${foe ? 'Opponent' : 'Your'} Barriers: ${ps.barriers.length} of 5`);
    const row = this.keep(`${p}:barrier-row`, 'barrier-row', false);
    const barriers: HTMLElement[] = [];
    const barrierPositions = barrierSlots(ps.barriers);
    for (let i = 0; i < barrierPositions.length; i++) {
      const b = this.keep(`${p}:barrier:${i}`, 'barrier', false);
      const buid = barrierPositions[i];
      if (buid !== undefined) {
        b.style.backgroundImage = `url("${CARD_BACK}")`;
        if (this.game.cards[buid]?.breaking) {
          b.classList.add('breaking');
        }
      } else {
        b.classList.add('broken'); b.style.backgroundImage = '';
      }
      barriers.push(b);
    }
    syncChildren(row, barriers);
    syncChildren(bar, [row]);

    // The opponent's hand sits BEHIND their Barriers - the far edge of their
    // half of the table, exactly where a player would hold their cards.
    children.push(bar);

    // Grave: face-up, click or right-click to view the list. Most recent on top.
    const graveBox = this.pileBox(
      `${p}:grave`, 'Grave', ps.grave.length, false, 'z-grave', ps.grave,
    );
    if (ps.grave.length > 0) {
      const graveMini = el('div', 'mini');
      const topRec = recordOf(g, ps.grave[ps.grave.length - 1]!);
      graveMini.style.backgroundImage = `url("${artUrl(topRec.thumb)}")`;
      graveBox.appendChild(graveMini);
      graveBox.style.cursor = 'pointer';
      graveBox.dataset.panelBrowse = 'true';
      graveBox.onclick = () => this.showZoneViewer(ps.grave, 'Grave');
      graveBox.oncontextmenu = (e) => { e.preventDefault(); this.showZoneViewer(ps.grave, 'Grave'); };
    }
    children.push(graveBox);

    if (compactLayout() && this.battlefield !== 'anime') {
      const left = this.keep(`${p}:left`, 'mat-side left', false);
      const right = this.keep(`${p}:right`, 'mat-side right', false);
      const belongs = (node: HTMLElement, names: readonly string[]) => names.some(cls => node.classList.contains(cls));
      syncChildren(left, children.filter(node => belongs(node, MAT_LEFT)));
      syncChildren(right, children.filter(node => belongs(node, MAT_RIGHT)));
      syncChildren(mat, [left, ...children.filter(node => !belongs(node, MAT_LEFT) && !belongs(node, MAT_RIGHT)), right]);
    } else syncChildren(mat, children);
    return mat;
  }


  private async confirmCodexSwitch(uid: string): Promise<void> {
    if (!this.legalActions().some(a => a.kind === 'switchCodex' && a.uid === uid)) return;
    const chooser = new HumanChooser(() => this.game);
    const approved = await chooser.confirm(HUMAN, `Switch to ${cardDisplayName(recordOf(this.game, uid).name)}? Manual switching costs 1 Play.`);
    if (approved && this.legalActions().some(a => a.kind === 'switchCodex' && a.uid === uid)) await this.act({ kind: 'switchCodex', uid });
  }

  /** Blue abilities this card can use right now. */
  private activatableOn(uid: string): Extract<PlayerAction, { kind: 'ability' }>[] {
    return this.legalActions()
      .filter((a): a is Extract<PlayerAction, { kind: 'ability' }> =>
        a.kind === 'ability' && a.uid === uid);
  }

  /**
   * Offer a card's Activated (blue) abilities. Blue abilities are used on
   * demand during Main, so clicking one of your units is how you reach them.
   */
  private async openAbilities(uid: string): Promise<void> {
    const options = this.activatableOn(uid);
    const script = this.ctrl.scriptFor(uid);
    const rec = recordOf(this.game, uid);
    const ctx = { game: this.game, index, me: HUMAN, source: uid, chooser: new HumanChooser(() => this.game) };
    const skills = (script?.abilities ?? []).map((ability, i) => ({ ability, i }))
      .filter(({ ability }) => !ability.trigger && !ability.passive);
    if (!skills.length) return;
    const base = choiceCards(this.game, [uid])[0]!;
    const selected = await openCardChoice({ title: `${cardDisplayName(rec.name)} · Skills`,
      instruction: 'Choose a skill. Use ⓘ to read the card.', max: 1, exact: true,
      confirm: 'Activate', decline: 'Cancel', effectDetails: true,
      cards: skills.map(({ ability, i }) => ({ ...base, uid: String(i), zone: undefined,
        type: `Skill ${i + 1}`, condition: `Skill ${i + 1}`, detail: displayRuleText(ability.text),
        disabledReason: options.some(a => a.abilityIndex === i) ? undefined : skillStatus(this.game, uid, ability, i, false, ctx) })),
      summary: ids => {
        const ability = skills.find(s => String(s.i) === ids[0])?.ability;
        if (!ability) return '';
        const translated = displayRuleText(ability.text);
        if (translated !== ability.text) return translated.replace(/\[\/?(?:green|red|blue|yellow|purple|gold)\]/gi, '');
        const cost = ability.prepare?.describe?.(ctx);
        return `${cost?.label ? `Pay: ${cost.label} · ` : ''}${cost?.effect ?? ability.text}`.replace(/\[\/?(?:green|red|blue|yellow|purple|gold)\]/gi, '');
      },
      confirmLabel: ids => {
        const ability = skills.find(s => String(s.i) === ids[0])?.ability;
        const cost = ability?.prepare?.describe?.(ctx).label;
        return cost ? cost.length <= 26 ? `Activate · ${cost}` : 'Choose cost & activate' : 'Activate';
      },
      inspect: () => showInfo(rec, undefined, uid),
    });
    const action = selected.length ? options.find(a => a.abilityIndex === Number(selected[0])) : undefined;
    if (action) await this.act(action);
  }


  /** Show a check reveal modal for a card in the Check zone. */
  private async showCheckModal(
    uid: string,
    isForce: boolean,
    kind: 'attack' | 'barrier',
  ): Promise<void> {
    const rec = recordOf(this.game, uid);
    const isMine = inst(this.game, uid).owner === HUMAN;

    // A Force is the one check that changes the outcome, and it used to arrive
    // in the same modal, at the same pace, as a check that changes nothing.
    // Hold the board for a beat first so the reveal lands as an interruption
    // rather than as more of the same.
    if (isForce) {
      const owner = inst(this.game, uid).owner;
      const box = this.zoneNode('check', owner);
      if (box) {
        box.classList.remove('force-hit');
        void box.offsetWidth;
        box.classList.add('force-hit');
      }
      this.shakeScreen(0.5);
      await this.hold(this.beat(340));
      box?.classList.remove('force-hit');
    }

    await showCheckCard(rec, isForce, kind, isMine,
      you(this.game, inst(this.game, uid).owner).lakeBuluanCheckSwap ? 'Grave' : 'hand',
      this.zoneNode('check', inst(this.game, uid).owner), this.battlefield === 'anime');
  }

  /** Show a scrollable list of cards in a zone (Grave, etc). Most recent first. */
  private showZoneViewer(uids: string[], title: string): void {
    this.openPile(title, uids);
  }

  /** Heart uses the same horizontal browser as the other public piles. */
  private showHeartViewer(heartUids: string[], _heartCount: number, _p: PlayerId): void {
    this.openPile('Heart', heartUids);
  }


  /** A labelled pile with an optional face-down top card. */
  private pileBox(
    key: string,
    label: string,
    n: number,
    showBack: boolean,
    extra = '',
    /**
     * The cards in this pile, when it is one anybody is allowed to read.
     * Grave, Exile and Extra are open information; the Deck is not, and is
     * the reason this is opt-in rather than automatic.
     */
    viewable?: string[],
  ): HTMLElement {
    const box = this.keep(key, `pilebox ${extra}`.trim());
    box.appendChild(el('div', 'zlabel flip', label));
    if (showBack) {
      const mini = el('div', 'mini');
      mini.style.backgroundImage = `url("${CARD_BACK}")`;
      box.appendChild(mini);
    }
    box.appendChild(el('div', 'n flip', String(n)));

    // On a phone these are chips a few pixels tall, so the count is all there
    // is room to show — the cards themselves have to be a tap away. Assignment
    // rather than addEventListener: `keep()` hands back the same element every
    // render, and a listener added each time would stack up.
    if (viewable) this.bindPileViewer(box, label, viewable);
    else { delete box.dataset.panelBrowse; box.classList.remove('openable'); box.onclick = null; }

    return box;
  }

  /**
   * Show a pile's contents.
   *
   * Face-down cards are drawn as backs rather than omitted: an exiled Sentry
   * is still a card in the Exile, and a count that does not match what you can
   * see reads as a bug.
   */
  private bindPileViewer(box: HTMLElement, label: string, uids: string[]): void {
    box.dataset.panelBrowse = 'true'; box.classList.add('openable');
    box.tabIndex = 0; box.setAttribute('role', 'button'); box.setAttribute('aria-label', `View ${label}`);
    box.onclick = () => this.openPile(label, uids);
    box.oncontextmenu = e => { e.preventDefault(); this.openPile(label, uids); };
    box.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); box.click(); } };
  }

  openZoneBrowser(owner: PlayerId = HUMAN, zone = 'heart'): void {
    const allowed = ['heart', 'deck', 'grave', 'exile', 'codex', 'extra', ...(owner === HUMAN ? ['hand'] : [])];
    if (!allowed.includes(zone)) zone = 'heart';
    const ps = you(this.game, owner);
    const uids = ps[zone as 'heart' | 'deck' | 'grave' | 'exile' | 'codex' | 'extra' | 'hand'];
    this.openPile(zone[0]!.toUpperCase() + zone.slice(1), uids, owner);
  }

  private openPile(label: string, uids: string[], browserOwner?: PlayerId): void {
    closeCardBrowsers();
    const zone = label.toLowerCase();
    const visible = new Set(uids.filter(uid => {
      const card = inst(this.game, uid);
      return zoneCardVisible(zone, card.owner, HUMAN, !!card.faceDown, you(this.game, card.owner).activeCodex === uid);
    }));
    const ordered = zone === 'deck' || zone === 'codex' ? [...uids] : [...uids].reverse();
    const cards = ordered.map(uid => visible.has(uid) ? choiceCards(this.game, [uid])[0]!
      : concealedCard(uid, zone, CARD_BACK));
    const readOnly = this.busy || duelDecisionPending();
    const canSwitchCodex = zone === 'codex' && !readOnly && this.legalActions().some(a => a.kind === 'switchCodex' && uids.includes(a.uid));
    const ownCodex = zone === 'codex' && (browserOwner ?? (uids[0] ? inst(this.game, uids[0]).owner : undefined)) === HUMAN;
    playCue('prompt');
    void openCardChoice({
      title: browserOwner === undefined ? label : `${browserOwner === HUMAN ? 'Your' : "Opponent’s"} ${label}`, cards, browse: true,
      navigation: browserOwner === undefined ? undefined : [
        { label: 'Player', value: String(browserOwner), options: [{ value: '0', label: 'You' }, { value: '1', label: 'Opponent' }],
          change: value => this.openZoneBrowser(Number(value) as PlayerId, zone) },
        { label: 'Zone', value: zone, options: ['heart', 'deck', 'grave', 'exile', 'codex', 'extra', ...(browserOwner === HUMAN ? ['hand'] : [])]
          .map(value => ({ value, label: `${value[0]!.toUpperCase()}${value.slice(1)} (${you(this.game, browserOwner)[value as 'heart'].length})` })),
          change: value => this.openZoneBrowser(browserOwner, value) },
      ],
      instruction: zone === 'deck' ? 'Deck cards stay face down. A search skill reveals only the cards it allows.'
        : zone === 'codex' ? codexSwitchInstruction({ own: ownCodex, pending: readOnly,
          yourTurn: this.game.turnPlayer === HUMAN, main: this.game.phase === 'main', available: canSwitchCodex,
          remainingPlays: Math.max(0, maxPlays(index, this.game, HUMAN) - you(this.game, HUMAN).normalPlaysUsed) })
        : 'Select a face-up card to read its skills.',
      inspect: uid => { if (visible.has(uid)) showInfo(recordOf(this.game, uid), undefined, uid); },
      browseAction: readOnly ? undefined : zone === 'codex' ? {
        label: 'Switch Codex · 1 Play', onCardClick: true,
        available: uid => visible.has(uid) && this.legalActions().some(a => a.kind === 'switchCodex' && a.uid === uid),
        run: uid => { void this.confirmCodexSwitch(uid); },
      } : {
        label: 'View skills',
        available: uid => visible.has(uid) && this.activatableOn(uid).length > 0,
        run: uid => { void this.openAbilities(uid); },
      },
    });
  }

  /**
   * Board cards live across renders, keyed by uid.
   *
   * render() rebuilds the tree, and a brand-new element has no previous state
   * to animate from — so every CSS transition on .card was dead. Reusing the
   * same element means a change of transform (exhausting, turning to attack,
   * swapping slots) actually animates.
   */
  private cardNodes = new Map<string, HTMLElement>();
  private handNodes = new Map<string, HTMLElement>();
  private resolvingSource: HTMLElement | null = null;
  private clarityTracker = new ClarityTracker();
  private combatVerdict = '';

  /**
   * Board containers that outlive a render, keyed by player and zone.
   *
   * Stable parents keep cards connected across routine renders. Lightweight
   * pile contents may be refreshed, while their animation anchors survive.
   */
  private zoneNodes = new Map<string, HTMLElement>();

  /**
   * Classes an animation owns rather than the render.
   *
   * A redraw mid-flourish must not sweep these away — the animation put them
   * there and will take them off again when it finishes.
   */
  private static readonly TRANSIENT = [
    'emitting', 'searching', 'codex-flip', 'force-hit', 'pile-landing',
    'effect-source-active', 'effect-target-active', 'effect-recipient', 'heart-motion-pulse', 'arrival-landed', 'barrier-lost',
    'struck', 'persona-impact', 'arrive-hand', 'arrive-deck', 'arrive-grave', 'arrive-heart', 'arrive-replace',
    'decision-target', 'decision-selected', 'response-threat',
  ];

  /**
   * Get the persistent element for a zone, reset for this render.
   *
   * The render owns the element's structure and its state classes; an
   * in-flight animation owns its own, and those are carried across.
   */
  private keep(key: string, cls: string, clear = true): HTMLElement {
    const existing = this.zoneNodes.get(key);
    if (!existing) {
      const made = el('div', cls);
      this.zoneNodes.set(key, made);
      return made;
    }
    const held = BoardUI.TRANSIENT.filter((c) => existing.classList.contains(c));
    existing.className = cls;
    for (const c of held) existing.classList.add(c);
    if (clear) {
      existing.replaceChildren();
      inspectData.delete(existing);
      existing.oncontextmenu = null;
      existing.removeAttribute('title'); existing.removeAttribute('aria-label');
      existing.removeAttribute('role'); existing.removeAttribute('tabindex');
      registerPanelInspection(existing, () => {});
    }
    existing.onclick = null;
    return existing;
  }
  /** The last attacker to declare, so the end screen can name the killer. */
  private finishingBlow: string | null = null;
  /** Last rendered Power per card, so a change can be counted through. */
  private lastPower = new Map<string, number>();
  private powerCueTracker = new PowerCueTracker();
  private phaseCueTracker = new PhaseCueTracker();
  private powerCues = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  private grantedSkillTracker = new GrantedSkillTracker();
  private expiryTracker = new EffectExpiryTracker();
  private recapTracker = new ActionRecapTracker();

  private renderCard(uid: string, owner: PlayerId, foe: boolean, kind = 'unit'): HTMLElement {
    const g = this.game;
    const c = inst(g, uid);
    const rec = recordOf(g, uid);

    let node = this.cardNodes.get(uid);
    if (node) {
      // Refresh game-state classes and handlers; running effects own their
      // temporary classes and remove them when their presentation completes.
      const held = BoardUI.TRANSIENT.filter(cls => node!.classList.contains(cls));
      node.className = ['card', ...held].join(' ');
      node.onclick = null;
      node.onpointerdown = null;
      node.style.visibility = '';
      // Re-assert the art: a card can change what it shows (a token gaining a
      // stack, a unit returning from the Grave) while keeping its uid.
      const url = `url("${artUrl(rec.thumb)}"), url("${CARD_BACK}")`;
      if (node.style.backgroundImage !== url) node.style.backgroundImage = url;
    } else {
      node = el('div', 'card');
      node.dataset.uid = uid;
      node.style.backgroundImage = `url("${artUrl(rec.thumb)}"), url("${CARD_BACK}")`;
      this.cardNodes.set(uid, node);
    }

    if (node.dataset.fieldEntry !== String(c.fieldEntry ?? 0) || !['ally', 'persona'].includes(c.zone)) node.classList.remove('effect-recipient');
    node.dataset.zone = c.zone;
    node.dataset.fieldEntry = String(c.fieldEntry ?? 0);

    const children: HTMLElement[] = [];

    // Battle presentation: the swinging unit turns sideways so it is obvious
    // who is attacking, even before it exhausts.
    // Posture is built as numbers rather than concatenated transform
    // functions, so every card emits the same shape — `rotate() scale()`.
    // A short posture transition preserves the card's position. The attack
    // lunge awaits that turn, then uses independent translate to move forward.
    const b = g.activeBattle;
    let rot = 0;
    let scale = 1;
    const chargedInBattle = b?.chargedParticipants?.includes(uid) && !c.exhausted;
    if (b && b.attacker === uid) { node.classList.add('attacking'); rot = chargedInBattle ? 0 : 90; scale = chargedInBattle ? 1 : 0.86; }
    else if (b && b.supporters.includes(uid)) { node.classList.add('supporting'); rot = chargedInBattle ? 0 : 90; scale = chargedInBattle ? 1 : 0.86; }
    else {
      // Being attacked is a highlight, not a posture — an exhausted unit must
      // stay lying down while it is targeted, so these two compose rather than
      // one replacing the other.
      if (b && (b.target === uid ||
          (b.target === null && you(g, b.defender).persona === uid))) {
        node.classList.add('defending');
      }
      if (c.exhausted) { node.classList.add('exhausted'); rot = 90; scale = 0.84; }
    }

    // The foe mat is rotated 180° as a whole, so its cards need a compensating
    // half turn. Folded into the same number rather than a second rotate().
    if (foe && this.battlefield !== 'anime') rot += 180;

    const transform = `rotate(${rot}deg) scale(${scale})`;
    if (node.style.transform !== transform) node.style.transform = transform;

    const battle = g.activeBattle;
    if (battle && battle.stage !== 'resolved') {
      if (battle.attacker === uid) node.classList.add('battle-source');
      if ((battle.target ?? you(g, battle.defender).persona) === uid) node.classList.add('battle-target');
    }

    if (kind === 'unit') {
      const pw = currentPower(index, g, uid);
      const base = def(index, g, uid).power;
      const badge = cardStatBadges(rec, { context: 'field', currentPower: pw })[0];
      const tag = node.querySelector<HTMLElement>('.pw') ?? (badge ? createCardStatBadge(badge) : el('span', 'pw'));
      tag.classList.add('pw');
      tag.classList.toggle('buffed', pw > base);
      const value = tag.querySelector<HTMLElement>('.card-stat-value') ?? tag;
      if (badge) { tag.setAttribute('aria-label', badge.description); tag.title = badge.description; }
      if (this.lastPower.get(uid) !== pw) value.textContent = compactCardStat(pw);
      children.push(tag);

      // Count through the intermediate values rather than snapping. The node
      // survives re-renders, so the previous figure is still on it.
      const prev = this.lastPower.get(uid);
      this.lastPower.set(uid, pw);
      if (prev !== undefined && prev !== pw) countTo(value, prev, pw);

      // Modifier chips: show each buff/debuff on the card.
      const added = grantedSkills(c, g.turnNumber);
      const chips = buildModChips(c.modifiers, passiveBonuses(index, g, uid), () => showInfo(rec, c.modifiers, uid),
        { name: cardDisplayName(rec.name), printed: base, current: pw, stack: c.stack }) ?? (added.length ? el('div', 'mod-chips') : null);
      if (added.length && chips) {
        const description = added.map(grantedSkillText).join('\n\n');
        const chip = el('button', 'mod-chip granted-skill', `✦${added.length}`);
        chip.setAttribute('type', 'button');
        chip.title = description;
        chip.setAttribute('aria-label', `${fieldPosition(c, HUMAN)}: ${description}`);
        chip.onclick = e => { e.stopPropagation(); showInfo(rec, undefined, uid); };
        chips.append(chip);
      }
      if (chips) children.push(chips);
    }

    attachInspect(node, rec, c.modifiers.length > 0 ? c.modifiers : undefined);
    if (kind === 'unit') node.setAttribute('aria-label', `${cardDisplayName(rec.name)} — ${cardStatBadges(rec, { context: 'field', currentPower: currentPower(index, g, uid) }).map(s => s.description).join('; ')}`);

    // Main phase: your own units offer their blue (Activated) abilities.
    if (g.phase === 'main' && g.turnPlayer === HUMAN && owner === HUMAN) {
      const ready = this.activatableOn(uid);
      if (ready.length) {
        node.classList.add('has-ability');
        children.push(el('div', 'abdot', String(ready.length)));
        node.onclick = () => void this.openAbilities(uid);
      } else if (this.ctrl.scriptFor(uid)?.abilities?.some(a => !a.trigger && !a.passive)) {
        node.onclick = () => void this.openAbilities(uid);
      }
    }

    if (g.phase === 'battle' && this.game.turnPlayer === HUMAN) {
      const mine = owner === HUMAN && !c.exhausted &&
        (c.zone === 'ally' || c.zone === 'persona');

      if (mine && (!this.tutorial || this.legalActions().some(a => a.kind === 'attack' && a.attacker === uid))) {
        // Clicking one of your own charged units picks it as the attacker.
        // Support is asked for later, once a target is chosen.
        if (this.sel.attacker === uid) { node.classList.add('attacker'); children.push(selectionLabel(node, 'Attacker')); }
        node.onclick = () => {
          this.sel.attacker = this.sel.attacker === uid ? undefined : uid;
          playCue(this.sel.attacker ? 'select' : 'cancel');
          this.sel.supporters = [];
          this.hint = this.sel.attacker
            ? "Now pick a target on the opponent's side."
            : '';
          if (this.sel.attacker && this.tutorial?.lesson.focus === 'battle'
            && this.tutorial.stepIndex === 0) {
            this.tutorialCoachMinimized = true;
          }
          this.render();
        };
        // Pressing on a unit starts aiming immediately, so a drag draws the
        // arrow without waiting for the click to land. The click handler
        // above still does the selecting; this only points.
        node.onpointerdown = () => {
          if (this.sel.attacker !== uid) aimFrom(node);
        };
      }

      if (owner === AI && this.sel.attacker && (!this.tutorial || this.legalActions().some(a => a.kind === 'attack'
        && a.attacker === this.sel.attacker && a.target === (c.zone === 'persona' ? null : uid)))) {
        node.classList.add('targetable');
        children.push(selectionLabel(node, 'Target'));
        // The engine encodes "attack the Persona" as a null target, so the
        // Persona card must map to null rather than to its own uid.
        const asTarget = c.zone === 'persona' ? null : uid;
        node.onclick = () => { playCue('confirm'); void this.attackWith(asTarget); };
      }
    }

    node.style.visibility = this.transit.has(uid) ? 'hidden' : '';
    syncCardHud(node, children, rot);
    return node;
  }

  /**
   * Declare an attack. Adjacent charged Allies are offered as supporters
   * *after* the target is chosen - the Persona is never among them, since only
   * units in an Ally slot can support.
   */
  private async attackWith(target: string | null) {
    const attacker = this.sel.attacker;
    if (!attacker) return;

    const guidedAttacks = this.tutorial ? this.legalActions().filter((action): action is Extract<PlayerAction, {kind:'attack'}> =>
      action.kind === 'attack' && action.attacker === attacker && action.target === target) : undefined;
    if (guidedAttacks && !guidedAttacks.length) return;
    // Chapter 2 teaches timing before support. Its exact legal attack commits
    // from the target click, without offering a choice the lesson forbids.
    if (this.tutorial instanceof SimpleSkillsSession) {
      await this.act({kind:'attack',attacker,target,supporters:[]});
      return;
    }
    const options = availableSupporters(this.game, attacker)
      .filter(uid => !guidedAttacks || guidedAttacks.some(action => action.supporters.includes(uid)));
    const allowNoSupport = !guidedAttacks || guidedAttacks.some(action => !action.supporters.length);
    let supporters: string[] = [];
    let cancelled = false;

    if (options.length && !this.firstBattle) {
      const g = this.game;
      const attackerName = cardDisplayName(recordOf(g, attacker).name);
      const base = currentPower(index, g, attacker);
      supporters = await chooseFrom(g, {
        title: `Support ${attackerName}?`,
        instruction: 'Supporters exhaust.',
        summaryLayout: 'combat',
        cards: choiceCards(g, options).map(card => ({ ...card,
          type: `+${(tutorialAttackPreview(index, g, attacker, [card.uid])?.supportPower ?? currentPower(index, g, card.uid)).toLocaleString()} Power` })),
        max: options.length, exact: !allowNoSupport && !!guidedAttacks?.every(action => action.supporters.length === options.length),
        decline: allowNoSupport ? 'Attack without support' : undefined, confirm: 'Attack',
        cancel: { label: 'Cancel attack', run: () => { cancelled = true; } },
        onSelection: ids => options.forEach(uid => this.findCardNode(uid, false)?.classList.toggle('decision-selected', ids.includes(uid))),
        summary: ids => {
          const projected = tutorialAttackPreview(index, g, attacker, ids);
          const bonus = projected?.supportPower ?? ids.reduce((total, uid) => total + currentPower(index, g, uid), 0);
          const attack = projected?.attackPower ?? base + bonus;
          const defender = target ?? you(g, AI).persona;
          const defense = defender ? currentPower(index, g, defender) : 0;
          return `Attack ${attack.toLocaleString()} → Defense ${defense.toLocaleString()} · Support +${bonus.toLocaleString()}\n${attack >= defense ? 'Currently hits' : 'Currently defended'} · ${projected ? 'Includes tutorial attack and support bonuses. ' : ''}Checks and responses may change this.`;
        },
      });
    } else if (!this.firstBattle) {
      const defender = target ?? you(this.game, AI).persona;
      const projected = tutorialAttackPreview(index, this.game, attacker, []);
      const attack = projected?.attackPower ?? currentPower(index, this.game, attacker);
      const defense = defender ? currentPower(index, this.game, defender) : 0;
      cancelled = !await askModal(`Attack with ${cardDisplayName(recordOf(this.game, attacker).name)}?`,
        `Attack ${attack.toLocaleString()} → Defense ${defense.toLocaleString()}. No supporters available. ${projected ? 'Includes tutorial attack bonuses. ' : ''}Checks and responses may change this.`,
        { confirm: 'Attack', cancel: 'Cancel attack' });
    }

    options.forEach(uid => this.findCardNode(uid, false)?.classList.remove('decision-selected'));
    if (cancelled) {
      this.sel = { supporters: [] };
      this.render();
      return;
    }
    await this.act({ kind: 'attack', attacker, target, supporters });
  }

  private renderHand(): HTMLElement {
    const g = this.game;
    const bar = this.keep('hand', 'hand-bar stat-hand', false);
    const cards: HTMLElement[] = [];
    const ps = you(g, HUMAN);
    const legal = this.legalActions();

    for (const uid of this.transit.visible(ps.hand).filter(uid => !g.activeBattle?.blockers.includes(uid))) {
      const rec = recordOf(g, uid);
      const node = this.handNodes.get(uid) ?? el('div', 'hand-card');
      this.handNodes.set(uid, node);
      const held = BoardUI.TRANSIENT.filter(cls => node.classList.contains(cls));
      node.className = ['hand-card', ...held].join(' ');
      const badges: HTMLElement[] = [];
      node.dataset.uid = uid;
      node.style.backgroundImage = `url("${artUrl(rec.thumb)}"), url("${CARD_BACK}")`;
      const playable = legal.some(
        (a) => (a.kind === 'call' || a.kind === 'playAction' || a.kind === 'playForce') &&
               a.uid === uid,
      );
      if (!playable) node.classList.add('dim');
      if (this.sel.handUid === uid) node.classList.add('sel');

      // Preserve the Unit level; known Units and Forces share the approved
      // DEF-left / ATK-right corners. Other card types have no combat badges.
      const d = def(index, this.game, uid);
      if (d.type === 'Unit') {
        if (typeof d.level === 'number') {
          badges.push(el('span', 'hc-level', String(d.level)));
        }
      }
      badges.push(...createCardStatBadges(d, { context: 'printed', hidden: rec.id === '__hidden__' }));

      attachInspect(node, rec);
      const statLabel = cardStatBadges(d, { context: 'printed', hidden: rec.id === '__hidden__' }).map(s => s.description).join('; ');
      node.setAttribute('aria-label', `${cardDisplayName(rec.name)}${statLabel ? ' — ' + statLabel : ''} — ${inputMode() === 'touch' ? 'tap to inspect and play' : 'select card'}`);
      node.onclick = () => {
        if (inputMode() !== 'touch') { void this.onHandClick(uid, this.legalActions()); return; }
        showInfo(rec, undefined, uid, {
          enabled: playable && !this.busy && !duelDecisionPending(),
          run: () => { void this.onHandClick(uid, this.legalActions()); },
        });
      };
      syncChildren(node, badges);
      cards.push(node);
    }
    if (!ps.hand.length) cards.push(el('div', 'subtle', 'Hand empty'));
    syncChildren(bar, cards);
    for (const uid of this.handNodes.keys()) if (!ps.hand.includes(uid)) this.handNodes.delete(uid);
    return bar;
  }

  private async onHandClick(uid: string, legal: PlayerAction[]) {
    if (this.busy || duelDecisionPending()) return;
    const rec = recordOf(this.game, uid);
    if (rec.type === 'Action') {
      const action = legal.find(a => a.kind === 'playAction' && a.uid === uid);
      if (!action) { this.explainRefusal(uid); showInfo(rec, undefined, uid); return; }
      playCue('prompt');
      const approved = await confirmActionCast({ name:rec.name, text:rec.text, image:boardUrl(rec.art),
        costLabel: this.ctrl.scriptFor(uid)?.action?.prepare?.describe?.({ game: this.game, index, me: HUMAN, source: uid, chooser: new HumanChooser(() => this.game) }).label,
        remainingPlays: Math.max(0, maxPlays(index, this.game, HUMAN) - you(this.game, HUMAN).normalPlaysUsed),
        inspect:art => attachInspect(art, rec) });
      if (approved && this.legalActions().some(a => a.kind === 'playAction' && a.uid === uid)) await this.act(action);
      return;
    }
    // Battle as well as Main: a Force can be spent between swings, and the
    // legal-action list is what decides — in battle it holds nothing else.
    if (this.game.turnPlayer !== HUMAN) return;
    if (this.game.phase !== 'main' && this.game.phase !== 'battle') return;
    const mine = legal.filter(
      (a) => (a.kind === 'call' || a.kind === 'playAction' || a.kind === 'playForce') &&
             a.uid === uid,
    );
    if (!mine.length) { this.explainRefusal(uid); return; }

    const actions = mine.filter((a) => a.kind !== 'call');
    if (actions.length) {
      // Offer play modes alongside "call as unit".
      const script = this.ctrl.scriptFor(uid);
      const labels: string[] = [];
      const list: PlayerAction[] = [];
      for (const a of actions) {
        if (a.kind === 'playForce') {
          labels.push(`Activate Force — ${script?.forceModes?.[a.mode]?.label ?? 'its skill'}`);
        } else {
          labels.push('Play this Action');
        }
        list.push(a);
      }
      if (mine.some((a) => a.kind === 'call')) labels.push('Call as a unit to an Ally slot');
      // Actions already passed through the explicit cast confirmation above.
      // Keep the existing single-mode Force behavior here.
      if (labels.length === 1 && list.length === 1) { await this.act(list[0]!); return; }
      const pick = await new HumanChooser(() => this.game).chooseMode(
        HUMAN, recordOf(this.game, uid).name, labels,
      );
      if (pick < list.length) { await this.act(list[pick]!); return; }
    }
    this.sel = { handUid: this.sel.handUid === uid ? undefined : uid, supporters: [] };
    this.hint = this.sel.handUid ? 'Choose an Ally slot on your mat.' : '';
    this.render();
  }

  /**
   * Which player a log line belongs to, so each side sees its own history.
   * Falls back to the cards the line references; null means it belongs to
   * neither in particular (turn headers, phase banners) and is shown on both.
   */
  private logOwnerOf(line: string, cards: string[]): PlayerId | null {
    // Case-insensitive: turn summaries write "player 0" in lower case.
    const m = line.match(/player (\d)/i);
    if (m) return Number(m[1]) as PlayerId;
    for (const uid of cards) {
      const c = this.game.cards[uid];
      if (c) return c.owner;
    }
    return null;
  }

  /** One player's stat block. */
  /**
   * Defense — one zone, shared.
   *
   * It used to be a strip inside each mat, which meant two boxes, two labels
   * and two frames for a thing only one player can ever be using: blockers
   * belong to whoever is defending, and only one player defends at a time.
   *
   * Sitting between the mats it joins them, and a blocker is no longer cut off
   * by the edge of whichever mat happened to own it.
   */
  private renderDefenseZone(): HTMLElement {
    const g = this.game;
    const battle = g.activeBattle;
    const live = !!battle && battle.blockers.length > 0;

    // The band's height never depends on what is in it. It used to grow from
    // 26px to 96px to hold blockers, and .mats is a fixed-height flex column
    // where this band is flex:none — so the two mats, which are flex:1, paid
    // for every one of those 70 pixels. Measured: both mats 284px -> 249px,
    // every card shrinking with them (.mat is container-type: size), and the
    // mat's bottom grid row — exile / barrier / grave — pushed clean outside
    // its own border, because that row is `auto` and cannot shrink. The cards
    // float in the dead space at the seam instead; see `.dz-row`.
    const zone = el('div', `defense-zone${live ? ' live' : ''}`);
    zone.appendChild(el('div', 'dz-label', 'Defense'));

    if (battle) {
      // Read from the defender's side so the cards face the player who played
      // them, the way they did when each mat owned its own strip.
      const foeDefends = battle.defender !== HUMAN;
      // One row, out of flow, so however many blockers arrive the band itself
      // is the same height it was before they did.
      const row = el('div', 'dz-row');
      for (const uid of battle.blockers) {
        const rec = recordOf(g, uid);
        const wrap = el('div', `dz-card${foeDefends ? ' foe' : ''}`);
        const dc = el('div', 'dcard');
        dc.dataset.uid = uid;
        dc.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
        attachInspect(dc, rec);
        dc.append(...createCardStatBadges(rec, { context: 'defense' }));
        dc.setAttribute('aria-label', `${cardDisplayName(rec.name)} — ${cardStatBadges(rec, { context: 'defense' }).map(s => s.description).join('; ')}`);
        wrap.appendChild(dc);
        row.appendChild(wrap);
      }
      if (row.childElementCount) zone.appendChild(row);
    }

    // The running totals live on this band, at its two ends: the attack on the
    // left, what it is being measured against on the right. They used to be
    // one box pinned to the centre of the board, which is the seam between the
    // two Ally rows — so the readout sat on top of the opponent's cards,
    // covering the very units whose numbers it was reporting.
    if (battle) {
      zone.classList.add('scored');
      const defenderUid = battle.target ?? you(g, battle.defender).persona;
      const side = (
        cls: string, who: string, n: number,
      ): HTMLElement => {
        const box = el('div', `bb-side ${cls}`);
        if (this.battlefield === 'anime') box.appendChild(el('div', 'bb-role', cls === 'atkside' ? 'ATTACK' : 'DEFENSE'));
        box.appendChild(el('div', 'who', who));
        box.appendChild(el('div', 'n', n.toLocaleString()));
        return box;
      };
      zone.appendChild(side(
        'atkside',
        recordOf(g, battle.attacker).name
          + (battle.supporters.length ? ` +${battle.supporters.length} support` : ''),
        battle.attackPower,
      ));
      zone.appendChild(side(
        'dfnside',
        defenderUid ? recordOf(g, defenderUid).name : 'Persona',
        battle.defensePower,
      ));
      if (battle.stage === 'resolved') {
        zone.appendChild(el(
          'div', `bb-verdict ${battle.hit ? 'broke' : 'held'}`,
          this.combatVerdict || (battle.sentryUsed ? 'Sentry · damage prevented' : battle.hit ? 'Hit' : 'Blocked'),
        ));
      }
    }
    return zone;
  }

  /**
   * The opponent's hand.
   *
   * Held cards, not a zone. It used to be built inside the Barrier zbox, which
   * drew its frame around the hand and made it read as a second, smaller row
   * of Barriers — no amount of spacing fixes a box you are sitting inside.
   *
   * It belongs to the table rather than to either mat, so it lives in the
   * board container: above the opponent's edge, fanned about its centre, and
   * outside the rotation the foe mat applies to everything within it.
   */
  private renderFoeHand(): HTMLElement {
    const hand = this.transit.visible(you(this.game, AI).hand)
      .filter(uid => !this.game.activeBattle?.blockers.includes(uid));
    const held = hand.length;
    const fh = el('div', 'foehand');
    // Face up, in a replay, when the viewer has asked. This is the
    // question every post-mortem starts with — what did they have? —
    // and the recording is the only place it can honestly be answered.
    if (this.replay && this.revealAll) {
      fh.classList.add('revealed');
      const centre0 = (Math.min(held, 10) - 1) / 2;
      hand.slice(0, 10).forEach((uid, i) => {
        const c = el('div', 'fb up');
        const art = this.game.cards[uid] ? artUrl(recordOf(this.game, uid).thumb) : null;
        if (art) c.style.backgroundImage = `url("${art}")`;
        c.title = this.game.cards[uid] ? recordOf(this.game, uid).name : '';
        const off = i - centre0;
        c.style.setProperty('--fan', `${(off * 3.6).toFixed(2)}deg`);
        c.style.setProperty('--arc', `${(Math.abs(off) * Math.abs(off) * 1.1).toFixed(1)}px`);
        c.style.zIndex = String(i);
        fh.appendChild(c);
      });
      return fh;
    }
    const shown = Math.min(held, 10);
    const centre = (shown - 1) / 2;
    for (let i = 0; i < shown; i++) {
      const fb = el('div', 'fb');
      fb.style.backgroundImage = `url("${CARD_BACK}")`;
      const off = i - centre;
      fb.style.setProperty('--fan', `${(off * 3.6).toFixed(2)}deg`);
      fb.style.setProperty('--arc', `${(Math.abs(off) * Math.abs(off) * 1.1).toFixed(1)}px`);
      fb.style.zIndex = String(i);
      fh.appendChild(fb);
    }
    return fh;
  }

  /**
   * Barriers, as sockets rather than a number.
   *
   * All five are drawn and the broken ones are left empty, which the mockup
   * does not do — but in this game a lost Barrier is not only damage, it
   * raises your Persona level. Showing the empty sockets makes "three of five"
   * readable at a glance, and keeps the trade visible rather than implied.
   */
  private renderStats(p: PlayerId): HTMLElement {
    const g = this.game;
    const ps = you(g, p);
    const h = el('header');
    const isMe = p === HUMAN;
    const active = g.turnPlayer === p;
    // "you" / "they" — the same numbers mean the same things on both panels,
    // but a tooltip that says "your Grave" on the opponent's box is a lie.
    const sub = isMe ? 'your' : "their";

    const stateNames = new Set<string>();
    for (const cid of ps.codex) {
      const d = def(index, g, cid);
      if (d.state) stateNames.add(d.state);
    }
    let stateRows = '';
    for (const st of stateNames) {
      const released = ps.releasedState === st;
      const progress = stateReadout(index, g, p, st);
      const count = `${progress.hidden ? '?' : progress.count}/${progress.threshold}`;
      const counted = progress.entries.map(entry => `${cardDisplayName(recordOf(g, entry.uid).name)} (${entry.value})`);
      const explanation = [`${progress.rule} ${progress.reminder}`,
        released ? 'Released · condition met.' : 'Locked · meet the condition with this State’s Codex active.',
        progress.hidden ? 'Hidden card contributions are not shown.' : '',
        counted.length ? `Counted cards: ${counted.join('; ')}.` : '',
      ].filter(Boolean).join('\n\n');
      stateRows += `<button type="button" class="stat state-progress" data-state="${escapeHtml(st)}"`
        + ` data-tip-title="${escapeHtml(`${isMe ? 'Your' : 'Opponent’s'} ${st} · ${count}`)}" data-tip="${escapeHtml(explanation)}" aria-label="${escapeHtml(st)} progress and counted cards">`
        + `<span>${escapeHtml(st)} <b>${progress.hidden ? '?' : progress.count}/${progress.threshold}</b></span><span class="chip ${released ? 'on' : 'off'}">`
        + `${released ? 'Released' : 'Locked'}</span></button>`;
    }
    if (stateNames.size === 0) {
      stateRows = g.rulesProfile === 'tutorial-v1'
        ? `<div class="stat state-progress tutorial-state-label" data-tip-title="Tutorial version" data-tip="${escapeHtml(TRAINING_NOTICE)}"><span>Tutorial version</span><span>Simple effects</span></div>`
        : '<div class="stat" data-tip="This Codex has no State to release."'
        + ' data-tip-title="State"><span>State</span><b>—</b></div>';
    }

    const level = personaLevel(index, g, p);
    const persona = ps.persona ? recordOf(g, ps.persona) : undefined;
    const tip = (title: string, text: string) =>
      `data-tip-title="${escapeHtml(title)}" data-tip="${escapeHtml(text)}"`;

    h.innerHTML = `
      ${persona ? `<img class="mobile-avatar" src="${boardUrl(persona.art)}" alt="" aria-hidden="true">` : ''}
      <h3>${isMe ? escapeHtml(menuProfile().nickname) : 'Opponent'}<span class="hud-turn">${active ? ' — turn ' + g.turnNumber : ''}</span></h3>
      ${active ? `<div class="stat s-phase" ${tip(
        'Phase',
        'Draw, then Personify, Main, Battle, End. Units are called during '
        + 'Main; attacks happen in Battle, and once you leave Main you cannot '
        + 'go back to it this turn.',
      )}><span>Phase</span><b>${phaseDisplayName(g.phase)}</b></div>` : ''}
      <div class="stat s-persona" ${tip(
        'Persona level',
        'The printed level of the Persona plus one for every broken Barrier. '
        + 'It caps the level of unit that can be called normally, and sets '
        + 'your Play allowance for normal calls, Action cards and manual Codex switches.',
      )}><span>Persona level</span><b>${level}</b></div>
      <div class="stat s-plays" ${tip(
        'Plays left',
        'Normal calls, Actions and manual Codex switches cost 1 Play. Automatic Codex switches are free. '
        + 'Special calls and skills cost no Plays. Refreshes at the start of the owner’s next turn.',
      )}><span class="stat-symbol-label">${statSymbolMarkup('plays')}Plays left</span><b>${Math.max(0, maxPlays(index, g, p) - ps.normalPlaysUsed)}</b></div>
      ${isMe ? `<div class="plays-refresh">${ps.normalPlaysUsed >= maxPlays(index, g, p) ? 'No Plays left. ' : ''}Refreshes on your next turn.</div>` : ''}
      <div class="stat s-hand" ${tip(
        'Hand',
        `Cards ${sub === 'your' ? 'you are' : 'they are'} holding. `
        + 'Running the deck out is a loss, so cards spent are not free.',
      )}><span>Hand</span><b>${handCount(index, g, p)}</b></div>
      <div class="stat barriers s-barriers" ${tip(
        'Barriers',
        'You begin with five Barriers. A hit on your Persona breaks one. '
        + 'After all five are broken, another hit on your Persona wins the duel. Every break also raises the '
        + 'Persona level, so the side that is losing gets stronger as it falls.',
      )}><span class="stat-symbol-label">${statSymbolMarkup('barrier')}Barriers</span>${barrierGems(ps.barriers.length, isMe)}</div>
      ${stateRows}
    `;
    // The shared help surface handles hover, keyboard focus and tap-to-pin.
    // Reading State progress must not open a card picker or interrupt a decision.
    return h;
  }

  /** One player's log, newest first. */
  /**
   * The match log as a corner overlay.
   *
   * It used to be a column inside each side panel, filtered to that player —
   * which meant two half-logs of one match and 524px of screen given to
   * chrome. One log, both sides, out of the way, and collapsible for anyone
   * who would rather have the board.
   */
  private renderLogOverlay(): HTMLElement {
    // On a phone the log starts closed and stays a session-scoped choice.
    // Open by default it covered the player's own mat and hand — on a screen
    // this size the board is the one thing that cannot be given away, and the
    // log is worth reading far less often than the board is worth seeing.
    const narrow = compactLayout();
    const open = narrow ? logOpenOnPhone : settings().logOpen;
    const wrap = el('div', `log-overlay${open ? '' : ' closed'}`);

    const toggle = el('button', 'log-toggle');
    toggle.innerHTML = `<span>Log</span><span class="chev">${open ? '▾' : '▴'}</span>`;
    toggle.onclick = () => {
      if (narrow) logOpenOnPhone = !logOpenOnPhone;
      else setSetting('logOpen', !settings().logOpen);
      this.render();
    };

    if (open) wrap.appendChild(this.fullLog());
    wrap.appendChild(toggle);
    return wrap;
  }

  /**
   * The whole log, unfiltered.
   *
   * The side panels each show only the lines belonging to that player, which
   * is right beside the board and wrong in a history view — reviewing a duel
   * means seeing both sides of it.
   */
  fullLog(): HTMLElement {
    return this.renderLog(HUMAN, true);
  }

  historyChoices(close: () => void): HTMLElement {
    const list = el('div', 'history-choices');
    const entries = buildTimeline(eventLogOf(this.game).events, { viewer: HUMAN, order: 'latest' }).blocks.flatMap(b => b.entries).slice(0, 40);
    for (const entry of entries) {
      const button = el('button', 'history-choice', `Turn ${entry.head.turn} · ${entry.head.message}`);
      button.onclick = () => { close(); this.getHud().showEntry(entry, 'Action details'); };
      list.append(button);
    }
    if (!entries.length) list.append(el('p', '', 'Your actions will appear here.'));
    return list;
  }

  private renderLog(p: PlayerId, all = false): HTMLElement {
    const g = this.game;
    const logEl = el('div', 'log');
    const recent = g.log.slice(-120).reverse();
    const recentCards = g.logCards.slice(-120).reverse();
    let shown = 0;
    for (let i = 0; i < recent.length && shown < 70; i++) {
      const line = recent[i]!;
      const cards = recentCards[i] ?? [];
      const owner = this.logOwnerOf(line, cards);
      if (!all && owner !== null && owner !== p) continue;
      shown++;

      const isHi = /check|released|wins|Barrier|Turn|Sentry|destroyed/i.test(line);
      const entry = el('div', isHi ? 'hi' : undefined);
      // The log names mechanics constantly — "special called", "Offered",
      // "Barrier check" — and was the one surface showing them as flat text.
      const said = el('span', 'log-text');
      said.innerHTML = markKeywords(line);
      entry.appendChild(said);

      for (const uid of cards) {
        if (uid === '__back__') {
          const thumb = el('img') as HTMLImageElement;
          thumb.src = CARD_BACK;
          thumb.alt = 'Hidden card';
          thumb.className = 'log-card-thumb log-card-back';
          thumb.title = 'Hidden card';
          entry.appendChild(thumb);
          continue;
        }
        if (!g.cards[uid]) continue;
        const cardInst = inst(g, uid);
        const isPrivate = /drew|Sanib|Retrieved|Sent.*bottom|Kept.*top|moved to bottom/i.test(line);
        if (isPrivate && cardInst.owner !== HUMAN) {
          const thumb = el('img') as HTMLImageElement;
          thumb.src = CARD_BACK;
          thumb.alt = 'Hidden card';
          thumb.className = 'log-card-thumb log-card-back';
          thumb.title = 'Hidden card';
          entry.appendChild(thumb);
          continue;
        }
        const rec = recordOf(g, uid);
        const thumb = el('img') as HTMLImageElement;
        thumb.src = artUrl(rec.thumb);
        thumb.alt = rec.name;
        thumb.className = 'log-card-thumb';
        thumb.title = rec.name;
        attachInspect(thumb, rec);
        entry.appendChild(thumb);
      }
      logEl.appendChild(entry);
    }
    return logEl;
  }

  /**
   * One player's rail: their stats above their own log. The opponent's sits on
   * the left of the board, yours on the right, so neither side has to read
   * past the other's history to find its own.
   */
  private renderSide(p: PlayerId): HTMLElement {
    const g = this.game;
    const isMe = p === HUMAN;
    const side = el('div', `side ${isMe ? 'mine' : 'foe'}${g.turnPlayer === p ? ' active' : ''}`);

    const stats = this.renderStats(p);
    side.appendChild(stats);
    if (this.battlefield === 'anime' && you(g, p).persona) {
      const rec = recordOf(g, you(g, p).persona!);
      const portrait = el('img', 'anime-portrait') as HTMLImageElement;
      const fighter = isMe ? menuProfile().fighter : this.opponentFighter;
      portrait.src = fighter ? `/ui/menu-v1/characters/${fighter}.webp` : animePortrait(rec.id, boardUrl(rec.art));
      portrait.alt = isMe ? menuProfile().nickname : fighter ? 'AI opponent character' : cardDisplayName(rec.name);
      stats.classList.add('identity-panel');
      const info = el('div', 'identity-info');
      const progress = el('div', 'identity-progress');
      for (const child of Array.from(stats.children)) {
        (child.matches('.state-progress') ? progress : info).append(child);
      }
      // Keep live stat nodes (and their help attributes) while giving each
      // information row its own inset along the portrait's diagonal edge.
      const details = el('div', 'identity-details');
      const levelStat = info.querySelector('.s-persona');
      const handStat = info.querySelector('.s-hand');
      if (levelStat && handStat) {
        levelStat.before(details);
        details.append(levelStat, handStat);
      }
      const picture = el('div', 'identity-picture');
      picture.classList.toggle('duelist-picture', Boolean(fighter));
      if (fighter) picture.dataset.person = fighter;
      picture.append(portrait);
      stats.append(picture, info, progress);
      const title = info.querySelector('h3');
      if (title) title.title = isMe ? menuProfile().nickname : 'Opponent';
      const count = info.querySelector('.gem-count');
      if (count) count.textContent = `${you(g, p).barriers.length}/${BARRIER_COUNT}`;
    }

    if (this.battlefield === 'anime') {
      // Anchor the existing live Plays value to its player's HUD. Exile and
      // portrait geometry scale independently and cannot safely share a badge.
      const plays = stats.querySelector<HTMLElement>('.s-plays');
      if (plays) { plays.classList.add('anime-zone-plays'); side.append(plays); }
    }

    // Turn controls belong to the player who can actually act.
    if (isMe) {
      const actions = el('div', 'actions');
      const phase = el('div', 'mobile-phase', `${g.turnPlayer === HUMAN ? 'Your turn' : 'Opponent turn'} · ${phaseDisplayName(g.phase)}`);
      actions.appendChild(phase);
      actions.appendChild(el('div', 'hint', this.nextBattle ? 'Choose any legal move. Help is available when you ask.' : this.firstBattle ? 'Follow the highlighted instruction. You can inspect cards at any time.' : this.hint || defaultHint(g)));
      if (this.hint && !this.tutorial && !this.nextBattle) {
        const status = el('div', 'mobile-match-status');
        status.textContent = this.hint;
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        actions.appendChild(status);
      }

      // One button, always present, saying what the game is doing.
      //
      // Previously nothing rendered at all while the opponent acted, so a
      // player had no acknowledgement that the game was busy rather than
      // stuck — the commonest way a turn-based game feels broken when it is
      // merely thinking.
      const turnBtn = el('button', 'turn-btn') as HTMLButtonElement;
      const mine = g.turnPlayer === HUMAN && g.winner === null && !this.demo && !this.replay;
      if (!mine) {
        turnBtn.classList.add('waiting');
        turnBtn.disabled = true;
        turnBtn.innerHTML = '<span class="tb-icon">&#8987;</span><span class="tb-label">Waiting</span>';
      } else if (g.phase === 'battle') {
        turnBtn.classList.add('primary');
        turnBtn.innerHTML = '<span class="tb-label">End Turn</span>';
        turnBtn.onclick = () => this.requestEndTurn();
      } else {
        turnBtn.classList.add('primary');
        turnBtn.innerHTML = '<span class="tb-label">Go to Battle</span>';
        turnBtn.onclick = () => this.act({ kind: 'endPhase' });
        turnBtn.disabled = g.phase !== 'main';
      }
      if (mine && !this.busy && !duelDecisionPending() && canEndWithNoActions(g, this.legalActions())) {
        turnBtn.classList.add('turn-ready'); turnBtn.title = 'No attacks or activatable skills remaining';
      }
      if (this.ctrl instanceof RemoteController && (this.ctrl.presenting || this.ctrl.frame.busy)) turnBtn.disabled = true;
      actions.appendChild(turnBtn);
      if (mine && g.phase === 'battle' && !this.firstBattle && !this.busy && !duelDecisionPending()) {
        const hint = readyAttackHint(this.legalActions());
        if (hint) { const note = el('span', 'end-turn-hint', hint); note.id = 'end-turn-hint'; actions.append(note); turnBtn.setAttribute('aria-describedby', note.id); }
      }
      if (this.tutorial && !this.tutorial.allows(g.phase === 'battle' ? { kind: 'endTurn' } : { kind: 'endPhase' })) turnBtn.disabled = true;
      side.appendChild(actions);
    }
    return side;
  }

  /**
   * End of a demo match. The point of the whole mode is this moment: someone
   * has just watched a full game without clicking anything, and the page they
   * are already on can be played.
   */
  private showDemoEnd(): void {
    const g = this.game;
    const b = el('div', 'banner demo-end');
    b.appendChild(el('h1', undefined, 'Codex Legends'));
    b.appendChild(el('p', 'result-line',
      `${DEMO_MATCHUP[0]} vs ${DEMO_MATCHUP[1]} — decided on turn ${g.turnNumber}.`));

    const row = el('div', 'banner-buttons');
    const play = el('button', 'primary', 'Play it yourself');
    play.onclick = () => { location.search = ''; };
    const again = el('button', undefined, 'Watch again');
    again.onclick = () => location.reload();
    row.appendChild(play);
    row.appendChild(again);
    b.appendChild(row);
    document.body.appendChild(b);

    // Loop, so an unattended screen keeps showing the game rather than a
    // dead end screen.
    setTimeout(() => { if (document.body.contains(b)) location.reload(); }, 12000);
  }

  /** Guarded, because the duel loop and a concede can both reach this. */
  private ended = false;

  private showWinner() {
    clearCombatGuide();
    if (this.ended) return;
    this.ended = true;
    this.attackPresentation.abort();
    clearActionRecap();
    this.presentation?.reset();
    finishDuelMotion();
    this.hud?.destroy();
    clearChainCues();
    clearPresentationNotices();
    autoDescEl?.remove(); autoDescEl = null;
    if (autoDescTimer !== null) { clearTimeout(autoDescTimer); autoDescTimer = null; }
    if (this.demo) return this.showDemoEnd();
    const g = this.game;
    const won = g.winner === HUMAN;
    setSoundscape(won ? 'victory' : 'defeat');
    const me = you(g, HUMAN);
    const foe = you(g, AI);

    if (this.journey) {
      const result = el('div', 'banner'); result.append(el('h1', undefined, 'Try this encounter again'), el('p', undefined, 'The objective is still unfinished. Restart from its prepared position.'));
      const retry = el('button', 'primary', 'Retry encounter'); retry.onclick = () => { location.reload(); };
      const home = el('button', undefined, 'Journey'); home.onclick = () => { location.search = journeyUrl(); };
      result.append(retry, home); document.body.append(result); return;
    }
    if (new URLSearchParams(location.search).has('graduation')) {
      if (won) completeJourney(5);
      const result = el('div', 'banner');
      result.append(el('h1', undefined, won ? 'Practice Duel complete' : 'A new chance to learn'), el('p', undefined, won ? 'You won using the simplified tutorial cards. Normal matches use their regular abilities and five Codex.' : 'Try another attack order, or revisit Support and Defense. This duel uses the simplified tutorial cards.'));
      const again = el('button', 'primary', won ? 'Play normally' : 'Retry duel'); again.onclick = () => { location.search = won ? '?start' : `?graduation&region=${sessionRegion()}`; };
      const home = el('button', undefined, 'Journey'); home.onclick = () => { location.search = journeyUrl(); };
      const friend = el('button', undefined, 'Play with a friend'); friend.onclick = () => { location.search = '?pvp'; }; if (location.protocol === 'codex:') { friend.setAttribute('disabled', ''); friend.textContent = 'Friends (online only)'; }
      result.append(again, home, friend); document.body.append(result); return;
    }
    if (this.nextBattle) {
      const session=this.nextBattle; session.finish(won);
      if (won) completeJourney(2);
      const result=el('div','banner next-battle-result');
      result.append(el('div','tutorial-kicker','Your Next Battle'),el('h1',undefined,won?'You made the winning choices':'Another chance to try'),
        el('p','result-line',won?'You can play a match now. Continue the journey to learn support and responses.':'Losing is part of learning. Try a different attack order, or keep more cards for defense.'),
        el('p','sub',`${session.calls} Allies called · ${session.attacks} attacks · ${session.actions} Actions · ${session.defenseChoices} defense decisions`));
      const row=el('div','banner-buttons');
      const retry=el('button','primary','Try Again');retry.onclick=()=>{location.search='?practice=next-battle';};
      const lessons=el('button',undefined,won?'Turn the Battle':'Return to journey');lessons.onclick=()=>{location.search=won?journeyUrl(3):journeyUrl();};
      const home=el('button',undefined,'Title Screen');home.onclick=()=>{location.search='';};
      row.append(retry,lessons,home);result.append(row);document.body.append(result);return;
    }

    const b = el('div', `banner match-end ${won ? 'win' : 'lose'}`);
    // The result word is layered: a solid base, plus a refracting sheen that
    // sweeps across it like light through a gemstone.
    const word = won ? 'VICTORY' : 'DEFEAT';
    playCue(won ? 'win' : 'lose');
    const resultWord = el('h1', 'result-word');
    resultWord.dataset.word = word;
    resultWord.appendChild(el('span', 'rw-base', word));
    const resultSheen=el('span', 'rw-sheen', word); resultSheen.setAttribute('aria-hidden','true');
    resultWord.appendChild(resultSheen);
    b.appendChild(resultWord);
    const by = this.finishingBlow ? recordOf(g, this.finishingBlow)?.name : null;
    // Say what actually happened. There are two ways to lose, and telling
    // someone their last Barrier fell when they in fact ran out of cards
    // leaves them looking for a board mistake that was never made.
    b.appendChild(el('p', 'result-line',
      g.winReason === 'surrender'
        ? won
          ? 'Your opponent surrendered.'
          : 'You surrendered.'
      : g.winReason === 'deckout'
        ? won
          ? 'Your opponent had no cards left to draw.'
          : 'You had no cards left to draw.'
        : won
          ? by
            ? `${cardDisplayName(by)} landed the final hit on your opponent.`
            : "You landed the final hit on your opponent."
          : by
            ? `${cardDisplayName(by)} landed the final hit on you.`
            : 'Your Persona took the final hit.'));
    b.appendChild(el('p', 'subtle',
      g.winReason === 'deckout'
        ? `Turn ${g.turnNumber} · Deck ${me.deck.length} – ${foe.deck.length}`
        : `Turn ${g.turnNumber}`));
    const finalAttack = finalExchange(g, index);
    if (finalAttack) b.append(el('p', 'final-exchange', finalAttack));
    const shields = el('div', 'match-shields');
    shields.append(el('span', '', `Your Barriers: ${me.barriers.length}`), el('span', '', `Opponent’s Barriers: ${foe.barriers.length}`));
    b.append(shields);

    const highlights = matchHighlights(eventLogOf(g).events, HUMAN);
    if (highlights.length) {
      const recap = el('section', 'match-recap polished-key-moments'); recap.append(el('h2', '', 'Key moments'));
      for (const event of highlights) {
        const item = el('article', 'key-moment-row');
        item.append(el('span','key-moment-turn',`TURN ${event.turn}`),el('p','key-moment-description',event.message));
        const actions=el('div','key-moment-actions');
        const detail=el('button','','View details');
        detail.onclick = () => { const entry = entryForGroup(eventLogOf(g).events, event.group, HUMAN); if (entry) this.getHud().showEntry(entry); };
        const watch=el('button','primary','▶ Watch this exchange');watch.setAttribute('disabled','');
        const reason=el('small','key-moment-reason',this.resultRecordingReady?'Finishing local recording…':this.ctrl instanceof RemoteController?'PvP playback unavailable. Text details remain available.':'No compatible recording is attached.');
        actions.append(detail,watch,reason);item.append(actions);recap.append(item);
        void this.resultRecordingReady?.then(result=>{
          if(!watch.isConnected)return;
          const unavailable=result?recordingUnavailable(result.entry,event.group):'This match could not be recorded. Text details remain available.';
          reason.textContent=unavailable??(result!.saved?'Saved locally · exact exchange':'Session recording · not saved on this device');
          if(!unavailable&&result){watch.removeAttribute('disabled');watch.onclick=()=>{void import('./fighter-log.js').then(({openRecordedMatch})=>openRecordedMatch(result.entry,{group:event.group,onClose:()=>watch.focus()}));};}
        });
      }
      b.append(recap);
    }
    const row = el('div', 'banner-buttons');
    const again = el('button', 'primary', 'Rematch');
    const leaveResult = async (button: HTMLElement, destination: string) => {
      button.setAttribute('disabled','');
      await this.resultRecordingReady;
      if(this.ctrl instanceof RemoteController)void this.ctrl.room.leave();
      location.search=destination;
    };
    again.onclick = () => { const opponent = foe.persona ? recordOf(g, foe.persona).deck : ''; void leaveResult(again,`?start&rematch=${encodeURIComponent(opponent)}`); };
    const title = el('button', undefined, 'Title screen');
    title.onclick = () => { void leaveResult(title,''); };
    const history=el('button',undefined,'Match history');history.onclick=()=>openHistoryPanel();
    const change=el('button',undefined,'Edit deck');change.onclick=()=>{void leaveResult(change,this.ctrl instanceof RemoteController?'?decks':'?decks&editActive');};
    if(this.ctrl instanceof RemoteController){
      const remote=this.ctrl;
      again.textContent='Request rematch';again.onclick=()=>{remote.room.send('rematch');again.textContent='Rematch requested';again.setAttribute('disabled','');rematchStatus.textContent='Waiting for your friend. When both accept, you can choose decks in the lobby.';};
      const rematchStatus=el('p','subtle','Both players must request a rematch. You can choose decks again in the lobby.');rematchStatus.setAttribute('role','status');b.append(rematchStatus);
    }
    row.appendChild(again);
    row.append(change,history,title);
    b.appendChild(row);
    const resultPersona = me.persona ? recordOf(g, me.persona) : null;
    presentMatchResult(b, {
      deckName: this.resultDeckContext?.name ?? null,
      region: this.resultDeckContext?.region ?? (resultPersona ? regionOf(resultPersona.deck) : null),
      persona: resultPersona ? { name: cardDisplayName(resultPersona.name), art: resultPersona.art ? artUrl(resultPersona.art) : null } : null,
      turns: g.turnNumber, mode: this.ctrl instanceof RemoteController ? 'pvp' : 'vs-ai',
      actions: { rematch: again, history, editDeck: change, title },
    });
    document.body.appendChild(b);
    again.focus();
  }
}

function defaultHint(g: GameState): string {
  if (g.turnPlayer !== HUMAN) return 'Opponent is thinking…';
  if (g.phase === 'main') return 'Normal calls and Actions use plays. Skills and special calls do not. Inspect a card to read it.';
  if (g.phase === 'battle') return inputCopy('Click one of your charged units, then a target.');
  return '';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The movement ceremony, in milliseconds at full weight.
 *
 * The source lights before anything leaves it, the card travels, and the
 * arrival flourish already in place takes over. Read live rather than latched:
 * a window that gains a motion preference mid-session should be obeyed.
 */

const reducedMotion = (): boolean =>
  settings().animationIntensity === 'minimal' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/** Tick a power badge from one value to another instead of snapping. */
const powerFrames = new WeakMap<HTMLElement, number>();
function countTo(el: HTMLElement, from: number, to: number): void {
  const previous = powerFrames.get(el);
  if (previous !== undefined) cancelAnimationFrame(previous);
  if (motionReduced() || document.hidden) { el.textContent = compactCardStat(to); powerFrames.delete(el); return; }
  const started = performance.now();
  const dur = Math.min(260, motionDuration());
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round((from + (to - from) * eased) / 100) * 100;
    el.textContent = compactCardStat(v);
    if (t < 1 && el.isConnected) powerFrames.set(el, requestAnimationFrame(step));
    else { el.textContent = compactCardStat(to); powerFrames.delete(el); }
  };
  powerFrames.set(el, requestAnimationFrame(step));
}

/**
 * Explain a check with a timed card notice. Any actual Force target choice
 * follows separately and still requires the player's confirmation.
 */
function showCheckCard(
  rec: CardRecord, isForce: boolean, kind: 'attack' | 'barrier', isMine: boolean,
  destination = 'hand', anchor?: HTMLElement | null, animeReveal = false,
): Promise<void> {
  return presentNotice({
    title: animeReveal ? 'REVEALED' : `${isMine ? 'Your' : "Opponent’s"} ${kind === 'attack' ? 'attack' : 'Barrier'} check`,
    detail: isForce ? `${cardDisplayName(rec.name)} · Force revealed. Choose a Unit for +5000 Power.`
      : `${cardDisplayName(rec.name)} · No Force. Goes to ${isMine ? 'your' : "their"} ${destination}.`,
    cards: [{ name: rec.name, image: boardUrl(rec.art), inspect: node => attachInspect(node, rec) }], anchor,
    checkReveal: animeReveal ? { mine: isMine, force: isForce } : undefined,
  });
}


// --------------------------------------------------------------------- boot

// ------------------------------------------------------- priority indicator

/**
 * A permanent answer to "is the game waiting on me right now?".
 *
 * Master Duel keeps a light at the top of the screen — red while the opponent
 * holds priority, blue when the decision is yours. Without one, our animation
 * pacing leaves the player genuinely unsure whether to click.
 *
 * It reads the DOM rather than being pushed to, because every prompt in the
 * client funnels through `modal()` and a live read cannot fall out of sync
 * with whatever opened it.
 */
/**
 * Whose turn it is, and which phase — as tabs against the board edges.
 *
 * The turn tab is the priority light rather than a new thing beside it. It
 * already answered exactly this question, including the state the mockup has
 * no room for: that the game is stopped waiting on a decision from you, which
 * is neither player's "turn" in the useful sense.
 *
 * Adding a second badge saying the same thing would have been the third
 * element on screen competing to tell you whose move it is.
 */
function mountPriorityLight(): void {
  const updateActivity = mountDuelActivity();
  const light = el('div', 'priority-light');
  const dot = el('span', 'p-dot');
  const text = el('span', 'p-text', 'Waiting');
  light.appendChild(dot);
  light.appendChild(text);
  document.body.appendChild(light);

  // The phase belongs on the other edge: it is information, not a claim on
  // your attention, so a spectator watching the demo sees it too.
  const phaseTab = el('div', 'phase-tab off');
  document.body.appendChild(phaseTab);

  let lastPhase = '';
  let lastState = '';
  const tick = () => {
    // A visible prompt outranks everything: the game is stopped on you.
    const prompt = document.querySelector('.modal-bg') as HTMLElement | null;
    const promptOpen = !!prompt && prompt.style.display !== 'none';
    const minimised = !!document.querySelector('.restore-pill');
    const g = currentGame?.();

    // Only a duel in progress earns this. On the title screen, the deck
    // browser, or the setup screens the answer is already obvious from what
    // is on screen, and a badge saying so is noise.
    //
    // Demo mode is the same argument: the light answers "is the game waiting
    // on me?", and while the AI plays both seats the answer is always no —
    // so "YOUR TURN" over a spectator reel is simply wrong.
    const spectating = !!document.querySelector('.board-wrap.demo-mode');
    const onBoard = !!document.querySelector('.board-wrap') && !!g && g.winner === null;

    const phaseLabel = onBoard ? `${phaseDisplayName(g.phase)} phase` : '';
    if (phaseLabel !== lastPhase) {
      lastPhase = phaseLabel;
      phaseTab.textContent = phaseLabel;
      phaseTab.className = `phase-tab${onBoard ? '' : ' off'}`;
    }

    const inDuel = !spectating && onBoard;
    const currentActivity = inDuel && !document.hidden ? activeBoard?.activity() : null;
    updateActivity(currentActivity ?? null);
    light.hidden = !!currentActivity;
    if (!inDuel) {
      if (lastState !== 'off') {
        light.className = 'priority-light off';
        lastState = 'off';
      }
      return;
    }

    let state: string;
    let label: string;
    const progress = chainProgress(g);
    if (progress && !promptOpen && !minimised) {
      state = g.responseChain?.responseOwner === 1 ? 'foe' : 'you'; label = progress;
    } else if (promptOpen || minimised) {
      state = 'you';
      label = minimised ? 'Prompt minimised' : 'Your decision';
    } else if (g.turnPlayer === HUMAN) {
      state = 'turn';
      label = 'Your turn';
    } else {
      state = 'foe';
      label = "Opponent's turn";
    }

    // The decision panel already communicates this; keep chain/turn notices intact.
    if (label === 'Your decision') light.hidden = true;
    if (state !== lastState) {
      light.className = `priority-light ${state}`;
      lastState = state;
    }
    if (text.textContent !== label) text.textContent = label;
  };

  tick();
  setInterval(tick, 160);
}

/** Set once the game exists, so the priority light can read live state. */
let currentGame: (() => GameState) | null = null;


// ------------------------------------------------- automatic card description

let autoDescEl: HTMLElement | null = null;
let autoDescTimer: number | null = null;

/**
 * Show a card's rules text without the player having to right-click.
 *
 * During the opponent's turn things happen and vanish faster than anyone can
 * inspect them; Master Duel solves this by surfacing the card text of whatever
 * is currently acting. Non-blocking, and it fades on its own.
 */
function showAutoDesc(game: GameState, uid: string, why: string, used?: string): void {
  if (!settings().autoDesc || game.winner !== null) return;
  const rec = recordOf(game, uid);
  if (!rec) return;

  if (!autoDescEl) {
    autoDescEl = el('div', 'auto-desc');
    document.body.appendChild(autoDescEl);
  }
  const panel = autoDescEl;
  traceExposure(panel,'ability');
  panel.replaceChildren();

  const why_ = el('div', 'ad-why', why);
  const head = el('div', 'ad-head');
  const art = el('div', 'ad-art');
  art.style.backgroundImage = `url("${artUrl(rec.thumb)}")`;
  const meta = el('div', 'ad-meta');
  meta.appendChild(el('div', 'ad-name', rec.name));
  const bits = [prettyType(rec.type)];
  if (rec.level) bits.push(`Level ${rec.level}`);
  if (rec.power) bits.push(`${rec.power / 1000}k`);
  meta.appendChild(el('div', 'ad-sub', bits.join(' · ')));
  head.appendChild(art);
  head.appendChild(meta);

  // When we know which line of the card is being read out, show that line.
  // A card that has just done one thing was printing all of its text at
  // once — three abilities, one of which was the answer — and the player had
  // to work out which sentence had just happened. Naming the card and
  // quoting the ability says it outright.
  const body = el('div', 'ad-text');
  if (used) {
    // The name is already the heading two lines above, so the sentence
    // continues from it rather than repeating it.
    body.classList.add('quoted');
    body.innerHTML =
      '<span class="ad-actor">used</span> '
      + `<span class="ad-quote">&ldquo;${formatSkillText(used)}&rdquo;</span>`;
  } else if (!document.body.classList.contains('anime-battlefield')) {
    body.innerHTML = formatSkillText(rec.text ?? '');
  }

  panel.appendChild(why_);
  panel.appendChild(head);
  panel.appendChild(body);

  panel.classList.remove('show');
  void panel.offsetWidth;
  panel.classList.add('show');

  if (autoDescTimer !== null) clearTimeout(autoDescTimer);
  autoDescTimer = window.setTimeout(() => {
    panel.classList.remove('show');
  }, 4200);
}

// ------------------------------------------------------------ settings panel

/** A touch device small enough that orientation matters. */
const isHandheld = (): boolean =>
  window.matchMedia('(pointer: coarse)').matches
  && Math.min(window.screen.width, window.screen.height) <= 820;

/** Fullscreen is optional; both portrait and landscape remain playable. */
async function enterDuelFullscreen(): Promise<void> {
  if (!isHandheld()) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch { /* Keep playing in the browser when fullscreen is unavailable. */ }
}
/**
 * A screen too small to give anything away — either a phone held upright or
 * one held on its side. Matches the two breakpoints the stylesheet uses.
 *
 * Width alone was not enough: a landscape handset is around 812 wide, so it
 * missed the phone test entirely and got the desktop treatment in a 375px-tall
 * window.
 */
const compactLayout = (): boolean =>
  window.matchMedia(
    '(max-width: 1000px), (max-height: 600px)',
  ).matches;

/** Whether the log is open on a small screen. Deliberately not persisted: a
 *  drawer over the board should not still be over it tomorrow. */
let logOpenOnPhone = false;

/** The board UI currently in play, so the rail can reach it. */
let activeUi: BoardUI | null = null;

/**
 * Show the rail, or take it away entirely.
 *
 * Every control on it belongs to a duel in progress — Settings included. On
 * the title screen and the setup screens there is nothing to review, concede
 * or configure, and a floating gear over the key art was simply furniture
 * from a game that had not started.
 *
 * Demo mode counts as no duel: a spectator watching the reel has none of
 * those decisions either.
 */
function setDuelControls(on: boolean): void {
  const rail = document.querySelector('.rail') as HTMLElement | null;
  if (rail) rail.style.display = on ? '' : 'none';
}

/** One rail button: an icon over a small caption, as on a console HUD. */
function railButton(icon: string, label: string, onClick: () => void, duelOnly = false): HTMLElement {
  const b = el('button', `rail-btn${duelOnly ? ' duel-only' : ''}`);
  b.setAttribute('aria-label', label);
  b.innerHTML = `<span class="rail-icon">${icon}</span><span class="rail-label">${label}</span>`;
  b.onclick = onClick;
  return b;
}

/** The whole match log, rather than the side panel's filtered slice. */
function openHistoryPanel(): void {
  const ui = activeUi;
  if (!ui) return;
  const body = el('div', 'history-body');
  const close = el('button', 'primary', 'Close');
  const bg = modal('Match history', 'Select an action to see its cards, costs, targets and result.', body, [close]);
  body.appendChild(ui.historyChoices(() => bg.remove()));
  close.onclick = () => bg.remove();
}

/**
 * Cycle how eagerly the game interrupts you.
 *
 * Master Duel calls its equivalent AUTO, but theirs is a panel of
 * auto-response rules and ours is a single dial. Labelled for what it does
 * rather than borrowing a name that implies parity we do not have.
 */
function cyclePromptFrequency(): void {
  const order: PromptFrequency[] = ['all', 'auto', 'minimal'];
  const next = order[(order.indexOf(settings().promptFrequency) + 1) % order.length]!;
  setSetting('promptFrequency', next);
  refreshRailLabels();
}

/** Rail captions have 58px to work in; the settings panel explains properly. */
const PROMPT_SHORT: Record<PromptFrequency, string> = {
  all: 'Ask all',
  auto: 'Auto',
  minimal: 'Minimal',
};

function refreshRailLabels(): void {
  const label = document.querySelector('.rail-btn.auto .rail-label');
  if (label) label.textContent = PROMPT_SHORT[settings().promptFrequency];
  const btn = document.querySelector('.rail-btn.auto');
  if (btn) btn.setAttribute('title', SETTING_LABELS[settings().promptFrequency].hint);
}

/**
 * Hover explanations for anything carrying `data-tip`.
 *
 * One floating element rather than a `::after` on each row: the side panels
 * clip their own overflow (they have to, for the rounded corners), so a
 * tooltip drawn inside one would be cut off by the panel it belongs to. This
 * sits on the body and picks the side with room, which also means the same
 * markup works for the opponent's box in the top-left and the player's own in
 * the bottom-right without either knowing where it is.
 */
function mountTips(): void { mountKeywordHelp(); }

/**
 * The board currently on screen, if any.
 *
 * The action rail is mounted once for the whole app and outlives any single
 * duel, so its buttons need a way to reach the live board. Null between duels,
 * and every use is optional-chained rather than asserted.
 */
let activeBoard: BoardUI | null = null;
function activateBoard(ui: BoardUI): void {
  activeBoard?.disposePresentation();
  activeBoard = ui;
  activeUi = ui;
}

export function mountActionRail(): void {
  const rail = el('div', 'rail');
  rail.appendChild(railButton('&#9881;', 'Settings', () => openSettingsPanel(), true));
  // One press to see the last thing that happened. The single most useful
  // control after a long trigger chain, an opponent combination, or any moment
  // the board changed faster than it could be read.
  rail.appendChild(railButton('&#8634;', 'Last', () => activeBoard?.openLastAction()));

  const history = railButton('&#9202;', 'History', () => openHistoryPanel(), true);
  rail.appendChild(history);

  const auto = railButton('&#8646;', PROMPT_SHORT[settings().promptFrequency],
    () => cyclePromptFrequency(), true);
  auto.classList.add('auto');
  auto.title = SETTING_LABELS[settings().promptFrequency].hint;
  rail.appendChild(auto);

  rail.appendChild(railButton('&#9873;', 'Surrender', () => activeUi?.surrender(), true));
  const mobileHome = railButton('&#8962;', 'Home', () => activeBoard?.goHome(), true);
  mobileHome.classList.add('mobile-utility'); rail.append(mobileHome);
  const mobileLog = railButton('&#9776;', 'Log', () => document.querySelector<HTMLButtonElement>('.log-toggle')?.click(), true);
  mobileLog.classList.add('mobile-utility'); rail.append(mobileLog);

  // On a phone the rail collapses to one button, the way Master Duel keeps
  // settings, log, field info and surrender behind a single menu. Four buttons
  // along the top strip is four buttons' worth of a screen that has none to
  // spare, for controls used about once a duel.
  //
  // The toggle is always in the DOM and hidden by the stylesheet on a wide
  // screen, so there is one rail rather than two and nothing has to be rebuilt
  // when the window changes shape.
  const more = el('button', 'rail-more') as HTMLButtonElement;
  more.type = 'button';
  more.title = 'Menu';
  more.setAttribute('aria-expanded', 'false');
  more.innerHTML = '<span class="rail-icon">&#9776;</span>';
  more.onclick = () => {
    const open = rail.classList.toggle('open');
    more.setAttribute('aria-expanded', String(open));
  };
  rail.insertBefore(more, rail.firstChild);

  const access = el('div', 'duel-access');
  const home=el('button','duel-home','Home'); home.setAttribute('aria-label','Return Home'); home.onclick=()=>activeBoard?.goHome(); access.append(home);
  access.dataset.panelBrowse = 'true';
  document.body.append(access);
  more.setAttribute('aria-label', 'More game controls');
  more.innerHTML += '<span class="rail-label">More</span>';
  more.dataset.panelBrowse = 'true';
  document.body.appendChild(rail);
  setDuelControls(false);
}

function openSettingsPanel(fromMenu = false): void {
  const s = settings();
  let cancelAudition = () => {};
  // Preview shares the existing settings store. Refresh views in place so its
  // return preserves the selected Option group, scroll and focused button.
  const previewSettingViews: Array<() => void> = [];
  const body = el('div', 'settings-body');
  const languageSection = el('div', 'set-section');
  languageSection.appendChild(el('div', 'set-title', 'Language / Wika'));
  languageSection.appendChild(el('div', 'set-hint', 'Card names and skills / Mga pangalan at skill ng baraha. English rules and gameplay stay unchanged. Reopen a card panel to see the selected language.'));
  const languageRow = el('div', 'set-choices');
  for (const [value, label] of [['tl', 'Tagalog'], ['en', 'English']] as const) {
    const option = el('button', `set-choice${s.language === value ? ' on' : ''}`, label);
    option.setAttribute('aria-pressed', String(s.language === value));
    option.onclick = () => {
      setSetting('language', value);
      for (const child of Array.from(languageRow.children)) {
        child.classList.remove('on'); child.setAttribute('aria-pressed', 'false');
      }
      option.classList.add('on'); option.setAttribute('aria-pressed', 'true');
    };
    languageRow.appendChild(option);
  }
  languageSection.appendChild(languageRow);
  body.appendChild(languageSection);
  // Pace first. It is the setting that changes the most about how the game
  // feels, and the one a struggling player is looking for.
  const paceSec = el('div', 'set-section');
  paceSec.appendChild(el('div', 'set-title', 'Duel pace'));
  paceSec.appendChild(el('div', 'set-hint',
    'How long the game holds still so you can read it.'));
  const paceRow = el('div', 'set-choices');
  (['learning', 'standard', 'fast'] as DuelPace[]).forEach((k) => {
    const opt = el('button', `set-choice${s.duelPace === k ? ' on' : ''}`);
    opt.appendChild(el('div', 'sc-name', PACE_DESCRIPTIONS[k].label));
    opt.appendChild(el('div', 'sc-hint', PACE_DESCRIPTIONS[k].detail));
    opt.onclick = () => {
      setSetting('duelPace', k);
      Array.from(paceRow.children).forEach((c) => c.classList.remove('on'));
      opt.classList.add('on');
    };
    paceRow.appendChild(opt);
    previewSettingViews.push(() => { const chosen = settings().duelPace === k; opt.classList.toggle('on', chosen); opt.setAttribute('aria-pressed', String(chosen)); });
  });
  paceSec.appendChild(paceRow);
  body.appendChild(paceSec);

  // Prompt frequency — the dial that decides how often play is interrupted.
  const freqSec = el('div', 'set-section');
  freqSec.appendChild(el('div', 'set-title', 'Effect prompts'));
  freqSec.appendChild(el('div', 'set-hint',
    'How often optional effects stop play to ask you. Takes effect on the next duel.'));
  const freqRow = el('div', 'set-choices');
  (['all', 'auto', 'minimal'] as PromptFrequency[]).forEach((f) => {
    const opt = el('button', `set-choice${s.promptFrequency === f ? ' on' : ''}`);
    opt.appendChild(el('div', 'sc-name', SETTING_LABELS[f].name));
    opt.appendChild(el('div', 'sc-hint', SETTING_LABELS[f].hint));
    opt.onclick = () => {
      setSetting('promptFrequency', f);
      Array.from(freqRow.children).forEach((c) => c.classList.remove('on'));
      opt.classList.add('on');
    };
    freqRow.appendChild(opt);
  });
  freqSec.appendChild(freqRow);
  body.appendChild(freqSec);

  // Both opponents use the same deck odds.
  const diffSec = el('div', 'set-section');
  diffSec.appendChild(el('div', 'set-title', 'Opponent'));
  diffSec.appendChild(el('div', 'set-hint',
    'Takes effect on the next duel.'));
  const diffRow = el('div', 'set-choices');
  const DIFFS: { key: AiDifficulty; name: string; hint: string }[] = [
    {
      key: 'normal',
      name: 'Normal',
      hint: 'Plays the same cards you do, off the same deck, with no help.',
    },
    {
      key: 'hard',
      name: 'Hard',
      hint: 'Considers more plays, saves responses, and weighs Offer costs and remaining attacks. Same deck odds as you.',
    },
  ];
  DIFFS.forEach((d) => {
    const opt = el('button', `set-choice${s.aiDifficulty === d.key ? ' on' : ''}`);
    opt.appendChild(el('div', 'sc-name', d.name));
    opt.appendChild(el('div', 'sc-hint', d.hint));
    opt.onclick = () => {
      setSetting('aiDifficulty', d.key);
      Array.from(diffRow.children).forEach((c) => c.classList.remove('on'));
      opt.classList.add('on');
    };
    diffRow.appendChild(opt);
  });
  diffSec.appendChild(diffRow);
  body.appendChild(diffSec);

  const toggles: {
    key: 'autoDesc' | 'seeSetCards' | 'priorityLight' | 'scaleSpectacle' | 'glFx' | 'cutscenes' | 'tips';
    name: string;
    hint: string;
  }[] = [
    {
      key: 'autoDesc',
      name: 'Show card text automatically',
      hint: "Surfaces the rules text of whatever is acting, so you can read the opponent's cards without opening each one.",
    },
    {
      key: 'seeSetCards',
      name: 'Show your reserve Codex',
      hint: 'Your reserve Codex cards show as ghosted thumbnails. You chose them, so this reveals nothing — it just saves opening a menu. Barriers stay hidden: they are face down to you too.',
    },
    {
      key: 'priorityLight',
      name: 'Show whose decision it is',
      hint: 'A permanent indicator of whether the game is waiting on you.',
    },
    {
      key: 'scaleSpectacle',
      name: 'Scale flourishes with Level',
      hint: 'A Level 3 arrival gets more room than a Level 1. Turn off for a flatter, faster board.',
    },
    {
      key: 'glFx',
      name: 'Particle effects',
      hint: 'Adds a hardware-accelerated light layer over the board — sparks, embers and shockwaves. Turn off on older machines.',
    },
    {
      key: 'cutscenes',
      name: 'Personify cutscenes',
      hint: 'Plays a full-screen sequence when you Personify into a Level 3, for cards that have one.',
    },
  ];

  const togSec = el('div', 'set-section');
  togSec.appendChild(el('div', 'set-title', 'Board'));
  for (const t of toggles) {
    const row = el('div', 'set-toggle');
    const txt = el('div', 'st-txt');
    txt.appendChild(el('div', 'st-name', t.name));
    txt.appendChild(el('div', 'st-hint', t.hint));
    const sw = el('button', `st-switch${settings()[t.key] ? ' on' : ''}`);
    sw.setAttribute('aria-label', t.name);
    sw.setAttribute('aria-pressed', String(settings()[t.key]));
    sw.onclick = () => {
      const next = !settings()[t.key];
      setSetting(t.key, next);
      sw.classList.toggle('on', next);
      sw.setAttribute('aria-pressed', String(next));
    };
    row.appendChild(txt);
    row.appendChild(sw);
    togSec.appendChild(row);
  }
  body.appendChild(togSec);

  // Sound.
  const sndSec = el('div', 'set-section');
  sndSec.appendChild(el('div', 'set-title', 'Sound'));
  const sndRow = el('div', 'set-toggle');
  const sndTxt = el('div', 'st-txt');
  sndTxt.appendChild(el('div', 'st-name', 'Playback sound'));
  sndTxt.appendChild(el('div', 'st-hint',
    'Turn game sound on or off. Adjust each part of the mix below.'));
  const sndSw = el('button', `st-switch${settings().sfx ? ' on' : ''}`);
  sndSw.setAttribute('aria-label', 'Playback sound');
  sndSw.setAttribute('aria-pressed', String(settings().sfx));
  previewSettingViews.push(() => { sndSw.classList.toggle('on', settings().sfx); sndSw.setAttribute('aria-pressed', String(settings().sfx)); });
  sndSw.onclick = () => {
    const next = !settings().sfx;
    setSetting('sfx', next);
    sndSw.classList.toggle('on', next);
    sndSw.setAttribute('aria-pressed', String(next));
    if (next) playCue('prompt');
  };
  sndRow.appendChild(sndTxt);
  sndRow.appendChild(sndSw);
  sndSec.appendChild(sndRow);

  const volRow = el('div', 'set-toggle');
  const volTxt = el('div', 'st-txt');
  volTxt.appendChild(el('div', 'st-name', 'Sound effects volume'));
  const volOut = el('div', 'st-hint', `${Math.round(settings().sfxVolume * 100)}%`);
  volTxt.appendChild(volOut);
  const slider = el('input', 'st-range') as HTMLInputElement;
  slider.type = 'range';
  slider.setAttribute('aria-label', 'Sound effects volume');
  slider.min = '0';
  slider.max = '100';
  slider.value = String(Math.round(settings().sfxVolume * 100));
  previewSettingViews.push(() => { slider.value = String(Math.round(settings().sfxVolume * 100)); volOut.textContent = `${slider.value}%`; });
  slider.oninput = () => {
    const v = Number(slider.value) / 100;
    setSetting('sfxVolume', v);
    volOut.textContent = `${slider.value}%`;
  };
  // Audition on release, so dragging does not machine-gun the cue.
  slider.onchange = () => playCue('impact', { intensity: 0.5 });
  volRow.appendChild(volTxt);
  volRow.appendChild(slider);
  sndSec.appendChild(volRow);
  for (const [key, label] of [['musicVolume', 'Music volume'], ['ambienceVolume', 'Ambience volume']] as const) {
    const row = el('div', 'set-toggle');
    const txt = el('div', 'st-txt'); txt.appendChild(el('div', 'st-name', label));
    const output = el('div', 'st-hint', `${Math.round(settings()[key] * 100)}%`); txt.append(output);
    const range = el('input', 'st-range') as HTMLInputElement;
    range.type = 'range'; range.min = '0'; range.max = '100'; range.value = String(Math.round(settings()[key] * 100));
    range.setAttribute('aria-label', label);
    previewSettingViews.push(() => { range.value = String(Math.round(settings()[key] * 100)); output.textContent = `${range.value}%`; });
    range.oninput = () => { initAudio(); setSetting(key, Number(range.value) / 100); output.textContent = `${range.value}%`; };
    row.append(txt, range); sndSec.append(row);
  }
  const audition = el('button', undefined, 'Test combat sounds');
  audition.onclick = () => { cancelAudition(); cancelAudition=auditionCombatSounds(); };
  sndSec.append(audition);
  const preview = el('button', undefined, 'Preview effects');
  preview.onclick = () => { cancelAudition(); void showEffectsPreview(boardUrl(Object.values(ALL_CARDS).find(c => c.type === 'Unit' && c.set === 'set-1')!.art), () => { if (preview.isConnected) previewSettingViews.forEach(refresh => refresh()); }); };
  sndSec.append(preview);
  sndSec.append(el('p', 'st-hint', 'Set a slider to 0 to mute that part of the mix.'));
  body.appendChild(sndSec);

  const motionSec = el('div', 'set-section');
  motionSec.append(el('div', 'set-title', 'Animation and comfort'));
  function choices(label: string, values: readonly string[], selected: () => string, change: (v: string) => void) {
    motionSec.append(el('div', 'st-name', label));
    const row = el('div', 'set-choices');
    for (const value of values) {
      const button = el('button', `set-choice${value === selected() ? ' on' : ''}`, value === 'first' ? 'First per match' : value[0]!.toUpperCase() + value.slice(1));
      button.setAttribute('aria-pressed', String(value === selected()));
      previewSettingViews.push(() => { const chosen = value === selected(); button.classList.toggle('on', chosen); button.setAttribute('aria-pressed', String(chosen)); });
      button.onclick = () => { change(value); for (const child of Array.from(row.children)) { child.classList.toggle('on', child === button); child.setAttribute('aria-pressed', String(child === button)); } };
      row.append(button);
    }
    motionSec.append(row);
  }
  choices('Animation intensity', ['minimal', 'standard', 'full'], () => settings().animationIntensity, v => setSetting('animationIntensity', v as 'minimal' | 'standard' | 'full'));
  choices('Screen shake', ['off', 'low', 'full'], () => settings().screenShake, v => setSetting('screenShake', v as 'off' | 'low' | 'full'));
  choices('Cutscene frequency', ['first', 'always'], () => settings().cutsceneFrequency, v => setSetting('cutsceneFrequency', v as 'first' | 'always'));
  motionSec.append(el('p', 'st-hint', 'Minimal keeps the highlights and results while reducing movement. Disable cutscenes with the cutscene toggle above. Reading speed stays independent.'));
  body.append(motionSec);

  const aboutSec = el('section', 'set-section');
  aboutSec.append(el('div', 'set-title', 'About'));
  const aboutCredits = el('button', undefined, 'About & credits');
  aboutCredits.onclick = openCredits;
  aboutSec.append(aboutCredits);
  body.append(aboutSec);

  const close = el('button', 'primary', 'Done');
  const performance = el('section', 'set-section');
  performance.append(el('div', 'set-title', 'Performance check'), el('p', 'st-hint', performanceReport()));
  const measure = el('button', '', 'Check while I play') as HTMLButtonElement;
  measure.disabled = !document.querySelector('.board-wrap');
  if (measure.disabled) performance.append(el('p', 'st-hint', 'Start a match to check gameplay performance.'));
  measure.onclick = () => { bg.remove(); measureGameplay(settings().graphicsQuality); };
  performance.append(measure); body.append(performance);
  if (!fromMenu) presentModalSections(body);
  const bg = fromMenu
    ? presentOptions(body, close as HTMLButtonElement)
    : modal('Duel settings', 'Applies immediately, and is remembered.', body, [close]);
  if (!fromMenu) close.onclick = () => bg.remove();
  const previewOwner=new MutationObserver(()=>{if(!bg.isConnected){cancelAudition();previewOwner.disconnect();}});
  previewOwner.observe(document.body,{childList:true});
}

/**
 * Demo mode: `?demo=<seed>` plays a fixed AI-vs-AI match with no setup.
 *
 * Seeds are deterministic (the deck shuffle uses the game's own RNG), so a
 * given seed is the same match for every visitor, every time — which is what
 * makes it usable as a demo reel rather than a lottery.
 *
 * Luzon vs Mindanao scored highest for watchability across 360 scored games:
 * both Codex States come online and the finish stays contested.
 */
const DEMO_MATCHUP: [string, string] = ['Agta', 'Maguindanao'];

/** The seed from `?demo=`, or null when not in demo mode. */
function demoSeed(): number | null {
  const raw = new URLSearchParams(location.search).get('demo');
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}


/**
 * Play a fixed AI-vs-AI match with no setup screens.
 *
 * Deliberately reuses the same GameController, choosers and BoardUI the real
 * game uses — the only difference is that `ui.demo` puts the AI in the human's
 * seat. Nothing here is a copy of the game.
 */
async function runDemo(seed: number): Promise<void> {
  const [aName, bName] = DEMO_MATCHUP;
  const deckA = DECKS[aName]!;
  const deckB = DECKS[bName]!;

  const pick = <T,>(xs: T[], n: number) => xs[n % xs.length]!;
  const game = createGame(index, [deckA, deckB], {
    seed,
    firstPlayer: 0,
    choices: [
      { persona: pick(personaChoices(index, deckA), seed), codex: pick(deckA.codex, seed) },
      { persona: pick(personaChoices(index, deckB), seed + 1), codex: pick(deckB.codex, seed + 1) },
    ],
  });

  const ai = new AiChooser(index, () => game);
  const ctrl = new GameController(game, index, {
    choosers: [ai, ai],
    promptPolicy: () => settings().promptFrequency,
  });

  currentGame = () => ctrl.game;
  resetCutscenes();

  const ui = new BoardUI(ctrl, AI_NORMAL, null, false, null, false,
    requestedPresentation(undefined, new URLSearchParams(location.search)));
  ui.demo = true;
  activeUi = ui;
  // A spectator has nothing to configure, review or concede.
  setDuelControls(false);
  Object.assign(ctrl.hooks, ui.hooks());
  ui.render();
  await ui.run();
}

/**
 * Build the board a lesson describes.
 *
 * Every lesson that names a specific position — "three zones are filled", "you
 * already have cards in your Heart" — gets one of these. Without it the coach
 * describes a board that is not there, which teaches the player to distrust
 * the coach.
 *
 * The pieces are pulled out of the player's own shuffled deck rather than
 * conjured, so every card on a prepared board is one the deck really contains
 * and every position reachable in a real game.
 */

/** Explicit tutorial links win; otherwise every chapter uses the menu's saved region. */
function sessionRegion(): TutorialRegion {
  const requested = new URLSearchParams(location.search).get('region');
  return validRegion(requested) ? requested : readJourney().region;
}

async function runTutorialLesson(lessonId: string): Promise<void> {
  if (lessonId === 'first-battle' || lessonId === 'lvl-up-3') {
    const isDemo = lessonId === 'lvl-up-3';
    const region = isDemo ? 'luzon' : sessionRegion();
    if (!isDemo) startJourney(1, region);
    const progress = isDemo ? null : readFirstBattleProgress(region);
    const chapter = !progress || progress.completed ? 0 : progress.chapter;
    const { game, cards, profile } = await prepareFirstBattle(normalIndex, chapter, region);
    const session = new FirstBattleSession(cards, chapter, region, { mode: isDemo ? 'lvl-up-3' : 'tutorial' });
    const ctrl = new GameController(game, profile.index, {
      choosers: [new HumanChooser(() => game, session), firstBattleChooser(game, cards, AI)],
      scripts: profile.scripts,
    });
    currentGame = () => game;
    resetCutscenes();
    const ui = new BoardUI(ctrl, AI_NORMAL, session, true);
    activateBoard(ui); setDuelControls(false);
    Object.assign(ctrl.hooks, ui.hooks());
    await ui.prepareAssets(); ui.render(); destinationReady(app); await ui.run(); return;
  }
  const chapter = legacyJourneyChapter(lessonId);
  if (!chapter) { location.search = journeyUrl(); return; }
  const oldRegion = lessonId.startsWith('bab-') ? 'visayas' : lessonId.startsWith('mag-') ? 'mindanao' : lessonId.startsWith('agta-') ? 'luzon' : null;
  const region = oldRegion ?? sessionRegion();
  startJourney(chapter, region);
  if (chapter === 1) { await runTutorialLesson('first-battle'); return; }
  if (chapter === 2) { location.search = `?practice=next-battle&region=${region}`; return; }
  if (chapter === 5) { location.search = `?graduation&region=${region}`; return; }
  const params = new URLSearchParams(location.search);
  const progress = readJourney();
  const saved = progress.encounters[journeyEncounterKey(chapter, region)] ?? 0;
  const count = JOURNEY_ENCOUNTER_COUNTS[chapter];
  const requested = Number(params.get('encounter'));
  const encounter = params.has('encounter') && Number.isInteger(requested) && requested >= 0 && requested <= saved && requested < count
    ? requested : saved === count ? 0 : saved;
  const fixture = createJourneyFixture(normalIndex, chapter, encounter, region);
  const session = new JourneySession(fixture);
  const ctrl = new GameController(fixture.game, fixture.profile.index, {
    choosers: [journeyHuman(new HumanChooser(() => fixture.game), fixture.game, fixture.profile.index, fixture.refs.nextPersona, fixture.allowedAbilities), journeyOpponent(fixture)],
    scripts: fixture.profile.scripts,
    promptPolicy: () => 'all',
  });
  currentGame = () => fixture.game; resetCutscenes();
  const ui = new BoardUI(ctrl, AI_NORMAL, session, true);
  activateBoard(ui); setDuelControls(false);
  Object.assign(ctrl.hooks, ui.hooks()); await ui.prepareAssets(); ui.render(); destinationReady(app); await ui.run();
}


async function main(entry?: MenuAction) {
  index = normalIndex;
  presentationScripts = ALL_SCRIPTS;
  loadSettings();

  // Audio is the part browsers genuinely gate: no sound until the player has
  // interacted. Listening on all three because not every input path produces a
  // pointerdown — a keyboard user, or a click synthesised by an automation
  // harness, would otherwise never arm the mixer.
  const arm = () => {
    initAudio();
    for (const ev of ['pointerdown', 'click', 'keydown']) {
      window.removeEventListener(ev, arm);
    }
  };
  for (const ev of ['pointerdown', 'click', 'keydown']) {
    window.addEventListener(ev, arm);
  }
  applySettingsToDocument();
  let layoutFrame = 0;
  const refreshLayout = () => {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      // Move existing nodes instead of re-rendering a board with a pending
      // choice: field targets, focus, and animation anchors keep their identity.
      const compact = compactLayout() && !document.body.classList.contains('anime-battlefield');
      for (const mat of Array.from(document.querySelectorAll<HTMLElement>('.mat'))) {
        const sides = mat.querySelectorAll<HTMLElement>(':scope > .mat-side');
        if (compact && !sides.length) gatherSides(mat);
        if (!compact) for (const side of Array.from(sides)) { mat.append(...Array.from(side.children)); side.remove(); }
      }
      const foehand = document.querySelector('.foehand');
      const holder = document.querySelector(compact ? '.side.foe' : '.mats');
      if (foehand && holder && foehand.parentElement !== holder) holder.prepend(foehand);
      placeBarrierIndicators();
      activeBoard?.refreshTutorialLayout();
    });
  };
  window.addEventListener('resize', refreshLayout);
  // The page or a containing panel can scroll when focus moves to a card.
  // Fixed coaching must follow the new viewport position of its target.
  document.addEventListener('scroll', refreshLayout, { capture: true, passive: true });
  document.addEventListener('visibilitychange',()=>activeBoard?.resumePresentation());
  window.addEventListener('pagehide',()=>activeBoard?.disposePresentation());
  window.addEventListener('duel-panel-layout', refreshLayout);
  document.addEventListener('toggle', refreshLayout, true);
  mountPriorityLight();
  mountActionRail();
  mountTips();
  mountTargetArrow();

  const demo = demoSeed();
  // On the title and setup screens, where there is room for it. Not in demo
  // mode: a spectator has nothing to report yet.
  if (demo === null) mountFeedback();
  if (demo !== null) {
    await runDemo(demo);
    return;
  }

  const tutorialParam = new URLSearchParams(location.search).get('tutorial');
  const route = new URLSearchParams(location.search);
  if(route.has('decks')){if(route.has('editActive'))await editActiveDeck();await decksScreen();location.search='';return;}
  if (route.has('challenge')) { location.search = journeyUrl(5); return; }
  if (route.has('pvp') || route.has('room') || route.has('roomLobby')) {
    if (location.protocol === 'codex:') { location.search = ''; return; }
    await openPrivateRoom({root:app, inspect:id=>showInfo(ALL_CARDS[id]!), start:async(ctrl,opening)=>{
      currentGame=()=>ctrl.game;
      const ui=new BoardUI(ctrl); activateBoard(ui);
      const resume = ctrl.pausePresentation();
      try {
        setDuelControls(true); setFeedbackVisible(false); ui.connectRemote(ctrl);
        await ui.prepareAssets();
        if(opening)await ui.showGameStartBanner();
      } finally { resume(); }
    }});
    return;
  }
  if (['first-battle','next-battle'].includes(new URLSearchParams(location.search).get('practice') ?? '')) {
    const region = sessionRegion(); startJourney(2, region);
    const { game, cards, profile } = createSimpleSkills(normalIndex, region);
    const session = new SimpleSkillsSession(cards);
    const ctrl = new GameController(game, profile.index, { scripts: profile.scripts,
      choosers: [journeyHuman(new HumanChooser(() => game), game, profile.index), nextBattleOpponent(profile.index,game)] });
    currentGame = () => game;
    resetCutscenes();
    const ui = new BoardUI(ctrl, AI_NORMAL, session, true);
    activateBoard(ui); setDuelControls(false);
    Object.assign(ctrl.hooks, ui.hooks());
    ui.render();
    await ui.showGameStartBanner(); await ui.run(); return;
  }
  if (new URLSearchParams(location.search).has('tutorial')) {
    const picked = tutorialParam === 'lvl-up-3' || legacyJourneyChapter(tutorialParam) ? tutorialParam : await tutorialScreen();
    if (picked) await runTutorialLesson(picked);
    else location.search = '';
    return;
  }

  // Dashboard loop: Start, or Deck (which returns here when done).
  let battlefield = requestedPresentation(entry, route);
  while (!route.has('start') && !route.has('anime') && !route.has('graduation')) {
    const choice = entry === 'start' || entry === 'decks' || entry === 'tutorial' ? entry : await titleScreen(entry);
    entry = undefined;
    if (choice === 'start') { battlefield = requestedPresentation(choice, route); break; }
    if (choice === 'tutorial') {
      const lesson = await tutorialScreen();
      if (lesson) {
        await runTutorialLesson(lesson);
        return;
      }
      continue;
    }
    await decksScreen();
  }

  applyBattlefieldPresentation(battlefield);
  const seed = Math.floor(Math.random() * 1e9);
  const opponentFighter = randomAiFighter();
  const first = await diceScreen(seed, opponentFighter);

  // Which deck you play is settled on the Deck screen, so the duel does not
  // ask again — Start goes straight to the dice. A first-time visitor who has
  // never opened Deck gets the first built-in rather than a dead end.
  const graduation = route.has('graduation');
  const trainingRegion = sessionRegion();
  if (graduation) startJourney(5, trainingRegion);
  const training = graduation ? createTutorialProfile(normalIndex) : undefined;
  if (training) { index = training.index; presentationScripts = training.scripts; }
  const chosen = graduation ? {name: ({luzon:'Agta',visayas:'Babaylan',mindanao:'Maguindanao'} as const)[trainingRegion], deck: TUTORIAL_DECKS[trainingRegion]} : activeSelection();
  const humanDeckName = chosen?.name ?? Object.keys(DECKS)[0]!;
  const chosenDeck = chosen?.deck ?? DECKS[humanDeckName]!;
  const humanDeck = training ? tutorialDeck(chosenDeck, training) : chosenDeck;

  // Both of these are decisions about this duel, not about the deck, so they
  // are asked here whether the deck was built or picked off the shelf. The
  // same fifty cards can open with a different Persona and a different face-up
  // Codex every game, and choosing one for the player — which is what a saved
  // deck used to do — takes that away.
  const persona = await pickScreen(
    'Choose your Persona',
    graduation ? `Tutorial version · Choose the main Unit you will protect. ${readVerb()} to read its training skills.` : `Any level 3 Unit in your deck. ${readVerb()} a card to read it full size.`,
    personaChoices(index, humanDeck),
  );
  const codex = await pickScreen(
    'Choose your starting Codex',
    graduation ? TRAINING_NOTICE : 'Choose one to start face up. Inspect a card to read its skills.',
    humanDeck.codex, cardDisplayName(ALL_CARDS[persona]!.name),
  );

  // The opponent works through the three built-in decks in turn rather than
  // rolling one at random, so a player meets all three rather than the same
  // one four times running. Stored, so the rotation survives a reload.
  const humanArchetype = (chosen?.deck as StoredDeck | undefined)?.archetype
    ?? humanDeckName;
  const rematchDeck = route.get('rematch');
  // Practice rotates the same three regional tutorial presets, including mirrors.
  // Ordinary AI keeps its existing deck selection and saved rotation.
  const aiDeckName = graduation ? nextTutorialOpponent() : rematchDeck && Object.hasOwn(DECKS, rematchDeck) ? rematchDeck : nextAiDeck(humanArchetype);
  const practiceRegion = ({ Agta:'luzon', Babaylan:'visayas', Maguindanao:'mindanao' } as const)[aiDeckName as 'Agta' | 'Babaylan' | 'Maguindanao'];
  const aiDeck = training ? tutorialDeck(TUTORIAL_DECKS[practiceRegion], training) : DECKS[aiDeckName]!;

  const aiPersona = personaChoices(index, aiDeck)[
    Math.floor(Math.random() * personaChoices(index, aiDeck).length)
  ]!;
  const aiCodex = aiDeck.codex[Math.floor(Math.random() * aiDeck.codex.length)]!;

  if (!training) {
    validatePlayableDeck(index, { ...humanDeck, persona });
    validatePlayableDeck(index, { ...aiDeck, persona: aiPersona });
  }
  const game = createGame(index, [humanDeck, aiDeck], {
    seed,
    firstPlayer: first,
    choices: [{ persona, codex }, { persona: aiPersona, codex: aiCodex }],
    ...(training ? { rulesProfile: 'tutorial-v1' as const } : {}),
  });

  // Difficulty changes decisions, never the order or odds of attack checks.
  const hard = !graduation && settings().aiDifficulty === 'hard';
  const aiProfile = hard ? AI_HARD : AI_NORMAL;
  game.players[AI].forceCheckBias = 0;

  const human = new HumanChooser(() => game);
  const ai = new AiChooser(index, () => game, aiProfile);

  let ctrl!: GameController;

  const aiBlocking: Chooser = {
    chooseAbility: (p, prompt, options, context) => ai.chooseAbility(p, prompt, options, context),
    chooseCards: async (p, prompt, candidates, count, opts) => {
      return ai.chooseCards(p, prompt, candidates, count, opts);
    },
    chooseTarget: (p, prompt, candidates) => ai.chooseTarget(p, prompt, candidates),
    chooseMode: (p, prompt, modes) => ai.chooseMode(p, prompt, modes),
    chooseSlot: (p, prompt, candidates) => ai.chooseSlot(p, prompt, candidates),
    confirm: (p, prompt) => ai.confirm(p, prompt),
    personifyPrompt: (p, candidates) => ai.personifyPrompt(p, candidates),
    battleCards: (p, info, forces, sentries) => ai.battleCards(p, info, forces, sentries),
    blockPrompt: (p, info, candidates) => ai.blockPrompt(p, info, candidates),
    revealConfirm: (p, uid, prompt) => ai.revealConfirm(p, uid, prompt),
    revealCards: async () => {},
  };

  // Keep prompt preferences stable for the duration of this duel.
  const duelPromptPolicy = training ? 'all' : settings().promptFrequency;

  const audit = route.has('audit') && !graduation
    ? new DuelAudit(game, [human, aiBlocking], duelPromptPolicy) : null;
  const recording = !graduation ? new LocalMatchRecording(game, audit?.choosers ?? [human,aiBlocking], {
    decks:[humanDeck,aiDeck], names:[humanDeck.name,aiDeck.name], viewer:HUMAN, promptPolicy:duelPromptPolicy,
    players:[{...menuProfile(),region:regionOf(ALL_CARDS[persona]!.deck)}, {nickname:'AI opponent',fighter:opponentFighter,region:regionOf(aiDeckName)}],
  }) : null;
  ctrl = new GameController(game, index, {
    choosers: recording?.choosers ?? audit?.choosers ?? [human, aiBlocking],
    promptPolicy: () => duelPromptPolicy,
    ...(training ? { scripts: training.scripts } : {}),
  });
  audit?.attach(ctrl);
  recording?.attach(ctrl);

  currentGame = () => ctrl.game;
  resetCutscenes();
  const ui = new BoardUI(ctrl, aiProfile, null, false, graduation ? new NextBattleSession() : null, graduation, battlefield, opponentFighter);
  ui.resultDeckContext=activeDeckContext({name:humanDeck.name,deck:humanDeck});
  let finishRecording: ((result:{entry:StoredReplay;saved:boolean}|null)=>void) | undefined;
  if(recording)ui.resultRecordingReady=new Promise(resolve=>{finishRecording=resolve;});
  let recordingFinished=false;
  const settleRecording=async()=>{
    if(recordingFinished)return;
    recordingFinished=true;
    if(recording&&game.winner!==null){
      try { finishRecording?.(await recording.saveCompleted()); }
      catch(error){console.warn('Local match recording unavailable',error);finishRecording?.(null);}
    } else finishRecording?.(null);
  };
  ui.onRecordingConceded=()=>{void settleRecording();};
  activateBoard(ui);
  setDuelControls(true);
  Object.assign(ctrl.hooks, ui.hooks());
  // Out of the way for the duel itself: the board is dense, and a glowing tab
  // over it competes for attention exactly when the player needs it on the
  // game.
  setFeedbackVisible(false);
  await ui.showGameStartBanner();
  await ui.run();
  await settleRecording();
  if (audit && game.winner !== null) {
    const download = el('button', undefined, 'Download private match audit');
    download.onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(audit.exportCompleted(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `codex-match-${game.rngSeed}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    (document.querySelector('.match-end') ?? app).append(download);
  }
}

export function startClient(entry?: MenuAction): Promise<void> { return main(entry).catch((e) => {
  console.error(e);
  app.innerHTML = `<div class="screen fatal-screen"><h2>Something broke</h2><p class="subtle">${escapeHtml(String(e))}</p></div>`;
}); }
