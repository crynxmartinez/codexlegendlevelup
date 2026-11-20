import { createGame, type DeckList } from '../core/setup.js';
import { GameController, type PlayerAction } from '../core/game.js';
import { autoChooser, type Chooser } from '../core/effects.js';
import { currentPower, def, inst, moveCard, you, type CardIndex } from '../core/state.js';
import { createTutorialProfile, tutorialDeck, type TutorialProfile } from '../core/tutorial-rules.js';
import { TUTORIAL_DECKS, TUTORIAL_LESSON_CARDS } from '../core/tutorial-decks.js';
import type { DuelEvent } from '../core/events.js';
import type { GameState, PlayerId, Zone } from '../core/types.js';
import { TutorialSession, type TutorialEvent, type TutorialStep } from './tutorial-mode.js';
import { finishEncounter, JOURNEY_ENCOUNTER_COUNTS, type JourneyRegion } from './journey-progress.js';

/** Dedicated tutorial presets; tutorialDeck creates a fresh per-lesson copy. */
export const JOURNEY_DECKS: Record<JourneyRegion, DeckList> = TUTORIAL_DECKS;
interface Goal {
  title: string; body: string; hint: string;
  actions: PlayerAction['kind'][];
  test: (s: JourneySession) => boolean;
  accepts?: (action: PlayerAction) => boolean;
  anchor?: string;
}
export interface JourneyFixture {
  game: GameState;
  profile: TutorialProfile;
  chapter: 3 | 4;
  encounter: number;
  region: JourneyRegion;
  refs: Record<string, string>;
  goals: Goal[];
  opponent: 'pass' | 'attack';
  eventStart: number;
  /** Only named ordinary Persona skills are offered in a prepared encounter. */
  allowedAbilities: string[];
}
const persona = '.mat:not(.foe) .slot.persona', turn = '.side.mine .turn-btn';
const codexAnchor = '.mat:not(.foe) .z-codex';
const has = (s: JourneySession, type: DuelEvent['type'], uid?: string) => s.events.some(e => e.actor === 0 && e.type === type && (!uid || e.sourceUids.includes(uid)));
const resolved = (s: JourneySession, uid: string) => has(s, 'abilityResolved', uid);
const goal = (title: string, body: string, hint: string, actions: Goal['actions'], test: Goal['test'], anchor?: string, accepts?: Goal['accepts']): Goal => ({ title, body, hint, actions, test, anchor, accepts });

/** Prepared positions use real cards and controllers. Nothing forces an outcome during play. */
export function createJourneyFixture(normalIndex: CardIndex, chapter: 3 | 4, encounter: number, region: JourneyRegion): JourneyFixture {
  if (!Number.isInteger(encounter) || encounter < 0 || encounter >= JOURNEY_ENCOUNTER_COUNTS[chapter]) throw new Error('Unknown journey encounter');
  const profile = createTutorialProfile(normalIndex), index = profile.index;
  const deck = tutorialDeck(JOURNEY_DECKS[region], profile), cards = TUTORIAL_LESSON_CARDS[region];
  const enemyDeck = tutorialDeck(JOURNEY_DECKS.mindanao, profile);
  const game = createGame(index, [deck, enemyDeck], { seed: 260002 + chapter * 10 + encounter,
    rulesProfile: 'tutorial-v1', firstPlayer: 0,
    choices: [{ persona: deck.persona, codex: deck.codex[0] }, { persona: enemyDeck.persona, codex: enemyDeck.codex[0] }] });
  game.phase = 'main';
  const me = you(game, 0), foe = you(game, 1), refs: Record<string, string> = {}, allowedAbilities: string[] = [];
  for (const ps of [me, foe]) {
    for (const uid of [...ps.hand]) moveCard(game, uid, 'deck');
    ps.switchedCodexLastTurn = true;
    // These examples introduce only the named check. Other reveals are Units.
    for (const uid of [...ps.barriers].filter(u => def(index, game, u).type !== 'Unit')) {
      moveCard(game, uid, 'deck');
      const replacement = ps.deck.find(u => def(index, game, u).type === 'Unit')!;
      moveCard(game, replacement, 'barrier', { faceDown: true });
    }
    ps.deck.sort((a, b) => Number(def(index, game, a).type !== 'Unit') - Number(def(index, game, b).type !== 'Unit')
      || def(index, game, a).level - def(index, game, b).level);
  }
  const take = (cardId: string, zone: Zone, p: PlayerId = 0, slot?: number): string => {
    const ps = you(game, p);
    const uid = Object.values(game.cards).find(c => c.owner === p && (c.defId === cardId || c.defId.endsWith('/' + cardId))
      && (c.zone === 'deck' || c.zone === 'barrier'))?.uid;
    if (!uid) throw new Error(`Journey fixture needs ${cardId} in deck`);
    if (zone === 'persona') moveCard(game, ps.persona!, 'deck');
    const wasBarrier = inst(game, uid).zone === 'barrier';
    moveCard(game, uid, zone, zone === 'ally' ? { slot: slot ?? ps.allies.indexOf(null) } : undefined);
    if (wasBarrier) {
      const replacement = ps.deck.find(u => def(index, game, u).type === 'Unit')!;
      moveCard(game, replacement, 'barrier', { faceDown: true });
    }
    return uid;
  };
  const shortName = (uid: string) => def(index, game, uid).name.split(', ').at(-1)!;
  const personaAttack = (a: PlayerAction) => a.kind !== 'attack' || (a.attacker === me.persona && a.target === null);
  const goals: Goal[] = [];
  let opponent: JourneyFixture['opponent'] = 'pass';
  refs.persona = me.persona!;

  if (chapter === 3 && encounter === 0) {
    game.phase = 'battle';
    refs.supporter = take(cards.l1Support, 'ally', 0, 1);
    const name = shortName(refs.supporter), base = def(index, game, refs.supporter).power;
    goals.push(goal('Help your Persona attack', `Attack their Persona and choose ${name} as support. Supporting means adding an Ally’s Power to your attacker.`,
      `Choose your Persona, then their Persona. Select ${name}, then confirm the attack. Its ${base.toLocaleString()} Power gains +3,000 for this attack.`, ['attack'], s =>
        s.events.some(e => e.type === 'attackDeclared' && e.actor === 0 && e.sourceUids.includes(refs.supporter!))
          && has(s, 'attackResolved', refs.persona!) && inst(game, refs.supporter!).exhausted,
      persona, a => personaAttack(a) && (a.kind !== 'attack' || a.supporters.includes(refs.supporter!))));
    goals.push(goal('Read the used supporter', `Inspect ${name} on your field, then close the details to continue. It is sideways: it has been used and cannot attack again this turn. Its +3,000 support bonus has ended.`,
      `Inspect ${name}. Its Power is back to ${base.toLocaleString()}. This is the tradeoff: support now, or keep that Ally for its own attack.`, [],
      s => s.readCards.has(inst(game, refs.supporter!).defId) && currentPower(index, game, refs.supporter!) === base, '.mat:not(.foe) .z-units'));
  } else if (chapter === 3 && encounter === 1) {
    game.phase = 'battle';
    refs.force = take(cards.forceResponse, 'hand');
    refs.check = take(cards.forceCheck, 'deck');
    // moveCard puts the chosen card at the top; this is the one taught Force check.
    goals.push(goal('Reveal a Force on a check', 'Attack their Persona with yours. The check reveals a Force from the top of your deck. When it asks for a target, choose your Persona to receive +5,000 Power.',
      'Choose your Persona, then their Persona. When the Force appears, give its +5,000 Power to your Persona. A check uses the Force’s check effect for free.', ['attack'],
      s => has(s, 'forceResolved', refs.check!) && has(s, 'attackResolved', refs.persona!), persona, personaAttack));
    goals.push(goal('Use a Force from your hand', `End Turn. When the opponent attacks, use ${shortName(refs.force)} from your hand. Reveal and discard it as the cost, choose your Persona for +5,000 Power for this attack, then draw one card.`,
      `Choose ${shortName(refs.force)} in the response window. Reveal and discard it as its cost, choose your Persona, then draw 1. This hand effect lasts for this attack only.`, ['endTurn', 'endPhase'],
      s => resolved(s, refs.force!) && inst(game, refs.force!).zone === 'grave', turn));
    opponent = 'attack';
  } else if (chapter === 3 && encounter === 2) {
    game.phase = 'battle';
    refs.sentry = take(cards.sentry, 'hand');
    if (region === 'luzon') refs.incoming = take(cards.l1Support, 'deck');
    const explanation = region === 'luzon'
      ? 'Sipol 1 looks at the top card and calls it if it is a Unit. Put the incoming card in an empty highlighted Ally Zone.'
      : region === 'visayas'
        ? 'Bituon then creates one Kaluluwa token in Heart, the pile beneath your Persona. A token is a resource, not a card in your hand. The State bonus is off in training.'
        : 'Sabir prevents the damage to your Persona. It does not add a Defense number or call another Unit.';
    goals.push(goal('Read your Sentry before using it', `Inspect ${shortName(refs.sentry)} in your hand, then close the details to continue. It can prevent a hit on your Persona. Once spent, it goes face down to Exile and cannot be read there.`,
      explanation, [],
      s => s.readCards.has(inst(game, refs.sentry!).defId), '.hand-bar'));
    goals.push(goal('Use a Sentry to stop a hit', `End Turn. When your Persona is attacked, choose ${shortName(refs.sentry)} to stop the hit. ${explanation}`,
      `${explanation} The Sentry is then spent face down in Exile.`, ['endTurn', 'endPhase'],
      s => inst(game, refs.sentry!).zone === 'exile' && s.events.some(e => e.type === 'attackResolved' && e.actor === 1 && e.result?.outcome === 'stopped'), turn));
    goals.push(goal('Read what the Sentry changed',
      region === 'luzon' ? 'If Sipol called a Unit, inspect that new Ally; otherwise inspect your Persona. Close the details to continue. No Barrier broke from the stopped hit; the Sentry is face down in Exile.'
        : region === 'visayas' ? 'Notice the one resource in Heart below your Persona. Inspect your Persona, then close the details to continue. Bituon created that token and no Barrier broke from the stopped hit.'
          : 'Inspect your Persona, then close the details to continue. No Barrier broke from the stopped hit. Sabir is now face down in Exile.',
      explanation, [], s =>
        s.readCards.has(inst(game, region === 'luzon' ? me.allies.find((uid): uid is string => !!uid) ?? refs.persona! : refs.persona!).defId)
        && (region !== 'visayas' || me.heart.length === 1), persona));
    opponent = 'attack';
  } else if (chapter === 3) {
    refs.action = take(cards.action, 'hand');
    if (region === 'visayas') {
      refs.incoming = take(cards.l1Support, 'deck');
      goals.push(goal('Put a card into Heart with Sanib', 'Play the Action in your hand. Look at the top three cards, choose one Unit to Sanib, then put the other cards on the bottom in the order you choose.',
        'Sanib means moving that card into Heart, the pile under your Persona. It does not call the card onto an Ally Zone. This Action uses one of your plays.', ['playAction'],
        s => has(s, 'cardPlayed', refs.action!) && inst(game, refs.action!).zone === 'grave', '.hand-bar',
        a => a.kind !== 'playAction' || a.uid === refs.action));
      goals.push(goal('See where the cards went', 'Open Heart beneath your Persona and inspect the Unit you chose. If you chose none, open Grave and inspect the spent Action instead. Close the details to continue. Unchosen cards went to the bottom of your deck.',
        'Sanib put the selected Unit into Heart; it did not call that Unit or add it to your hand. The Action itself is spent in Grave.', [],
        s => me.heart.some(uid => s.readCards.has(inst(game, uid).defId))
          || (me.heart.length === 0 && s.readCards.has(inst(game, refs.action!).defId)), persona));
    } else {
      refs.recover = take(cards.l1Support, 'grave');
      if (region === 'mindanao') refs.bottom = take(cards.l1Attack, 'grave');
      const text = region === 'luzon'
        ? 'Play the Action in your hand. Choose the Level 1 Unit in your Grave to put it into your hand.'
        : 'Play the Action in your hand. Choose one or two Level 1 Units in your Grave. Put one into your hand; if you chose two, the other goes to the bottom of your deck.';
      goals.push(goal('Recover a Unit from Grave', text,
        'Grave is where spent or destroyed cards go. This Action uses one play and returns a card to your hand; it does not call that Unit to the battlefield.', ['playAction'],
        s => has(s, 'cardPlayed', refs.action!) && inst(game, refs.action!).zone === 'grave', '.hand-bar',
        a => a.kind !== 'playAction' || a.uid === refs.action));
      goals.push(goal('Read the recovery result', 'Inspect the recovered Unit in your hand. If you chose none, open Grave and inspect the spent Action instead. Close the details to continue. Recovery returns a card to hand; choosing none recovers nothing.',
        'You can call a recovered Unit with another play later, or keep it for defense. Recovery moves a card; it does not create an extra copy.', [],
        s => [refs.recover, refs.bottom].some(uid => !!uid && inst(game, uid).zone === 'hand' && s.readCards.has(inst(game, uid).defId))
          || (![refs.recover, refs.bottom].some(uid => !!uid && inst(game, uid).zone === 'hand') && s.readCards.has(inst(game, refs.action!).defId)), '.hand-bar'));
    }
  } else if (encounter === 0) {
    refs.original = me.persona!;
    refs.nextPersona = take(cards.alternatePersona, 'hand');
    goals.push(goal('Meet your Persona', 'Inspect your Persona, the lead Unit in the middle of your field, to read its name, Power and tutorial skills. Close the details to continue.',
      'Right-click your Persona, or press and hold it on touch. Close the details to continue.', [],
      s => s.readCards.has(inst(game, refs.original!).defId), persona));
    goals.push(goal('Change your Persona next turn', `Go to Battle, then End Turn. At the start of your next turn, choose ${shortName(refs.nextPersona)} to Personify.`,
      'Personify means replacing your lead Unit with a Level 3 Unit from your hand. Your practice opponent passes. The old Persona goes to Heart, the small pile beneath your Persona.', ['endPhase', 'endTurn'],
      s => me.persona === refs.nextPersona && inst(game, refs.original!).zone === 'heart' && has(s, 'personaChanged'), turn));
    goals.push(goal('Read your new lead Unit', `Inspect ${shortName(refs.nextPersona)}, your new Persona in the center, then close the details to continue. Your old Persona remains in Heart.`,
      'Open the new Persona’s details. Changing Persona changes the card, not whose turn it is or how many Barriers you have.', [],
      s => s.readCards.has(inst(game, refs.nextPersona!).defId), persona));
  } else if (encounter === 1) {
    refs.codex = me.codex[1]!;
    goals.push(goal('Choose the Barrier Codex', 'Open your Codex pile on the left. Spend 1 Play to switch to the Codex that gives +1,000 for each of your broken Barriers. A Codex changes how your Persona fights; only the active one applies.',
      'Open your Codex pile on the left. There are two tutorial choices. Read them and switch to the Barrier bonus. This manual switch costs 1 Play; only the active Codex applies.', ['switchCodex'],
      () => me.codexSwitchedThisTurn && me.activeCodex === refs.codex && me.barriers.length === 5
        && currentPower(index, game, me.persona!) === def(index, game, me.persona!).power, codexAnchor));
    goals.push(goal('Watch one Barrier break', 'You have all five Barriers, so this Codex starts at +0. Go to Battle, then End Turn. Choose Do not block when asked, so the opponent’s attack breaks one Barrier.',
      'A Barrier is one of your face-down shields. If a defense choice appears, choose Do not block. The first break will give exactly +1,000 Power.', ['endPhase', 'endTurn'],
      s => me.barriers.length === 4 && s.events.some(e => e.type === 'barrierBroken' && e.actor === 1)
        && currentPower(index, game, me.persona!) === def(index, game, me.persona!).power + 1000, turn));
    goals.push(goal('Read the new Power', 'Inspect your Persona, then close the details to continue. One Barrier is broken, so it now has +1,000 Power. This bonus also helps while you defend, as long as this Codex stays active.',
      'The bonus comes from the active Codex; switching away removes it.', [],
      s => s.readCards.has(inst(game, me.persona!).defId), persona));
    opponent = 'attack';
  } else if (encounter === 2) {
    me.activeCodex = me.codex[1]!;
    for (const uid of me.codex) inst(game, uid).faceDown = uid !== me.activeCodex;
    refs.codex = me.codex[0]!;
    goals.push(goal('Choose the attacking bonus', 'Open your Codex pile on the left and spend 1 Play to switch to the other tutorial Codex: your Persona gains +5,000 Power only while it attacks.',
      'Open your Codex pile and select the attack bonus. This manual switch costs 1 Play. It does not add Power while your Persona waits or defends.', ['switchCodex'],
      () => me.codexSwitchedThisTurn && me.activeCodex === refs.codex, codexAnchor));
    goals.push(goal('Use the attack bonus', 'Go to Battle, then attack their Persona with yours. Watch the attack gain +5,000 Power.',
      'Select your Persona, then their Persona. This bonus needs no separate skill button and lasts for this attack only.', ['endPhase', 'attack'],
      s => has(s, 'attackResolved', refs.persona!) && currentPower(index, game, me.persona!) === def(index, game, me.persona!).power, persona, personaAttack));
    goals.push(goal('See when the bonus ends', 'Inspect your Persona, then close the details to continue. The attack is over, so the +5,000 is gone and its usual Power is back.',
      'The Barrier Codex helps on both turns; the attack Codex gives a larger bonus only while your Persona attacks. Both remain tutorial versions.', [],
      s => s.readCards.has(inst(game, me.persona!).defId), persona));
  } else if (encounter === 3) {
    allowedAbilities.push(refs.persona!);
    if (region === 'mindanao') {
      goals.push(goal('Read a search-and-call skill', 'Inspect Indarapatra, your Persona, then close the details to continue. It can search your deck for a Level 2 or lower Unit and special call it. There is no Offer cost.',
        'Special call means the skill puts a Unit onto the field without using a normal play. You still choose an Ally Zone.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('Try a special call, or keep your board', 'Use Indarapatra’s skill, choose a Level 2 or lower Unit and place it in an empty highlighted Ally Zone. It enters charged, ready to act. You may instead go to Battle to skip this optional skill.',
        'Open your Persona’s skill, choose a Unit from the deck, then choose its destination. The card being placed is the incoming Unit, not Indarapatra.', ['ability', 'endPhase'],
        s => (resolved(s, refs.persona!) && me.allies.some(uid => !!uid && !inst(game, uid).exhausted)) || game.phase === 'battle', persona,
        a => a.kind !== 'ability' || (a.uid === refs.persona && a.abilityIndex === 0)));
      goals.push(goal('Optional skills are choices', 'Inspect Indarapatra again, then close the details to continue. This search skill is available once per turn. You do not have to use it or need it to win the Practice Duel.',
        'Only the State-gated skill was removed for training; this ordinary search-and-call skill is unchanged.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
    } else {
      if (region === 'visayas') refs.sanib = take(cards.l1Support, 'hand');
      const name = shortName(refs.persona!);
      const cost = region === 'visayas'
        ? 'Kaptan asks you to Sanib one card from your hand into Heart as a cost. If you accept, draw one card and gain +3,000 Power until this turn ends.'
        : 'Nanolay can draw one card and gain +3,000 Power until this turn ends when she attacks. There is no card cost.';
      goals.push(goal('Read your Persona’s ordinary skill', `Inspect ${name}, your Persona, then close the details to continue. ${cost}`,
        'The State-gated skill was removed for training; this ordinary skill remains. You can decline it.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('Choose whether to use the attack skill', `Go to Battle, then attack their Persona. ${cost} Choose Use effect to try it, or decline to keep the simple attack.`,
        'The attack Codex also gives +5,000 during the attack. A Persona skill is a separate choice: if you use it, its +3,000 remains after the attack until End Turn.', ['endPhase', 'attack'],
        s => has(s, 'attackResolved', refs.persona!), persona, personaAttack));
      goals.push(goal('Read your choice’s result', `Inspect ${name}, then close the details to continue. If you used the ordinary skill, its +3,000 remains until End Turn. The Codex’s attack-only +5,000 has ended.`,
        region === 'visayas' ? 'If you paid, the chosen hand card is now in Heart and a replacement card was drawn. Declining paid no cost.'
          : 'If you accepted, one card was drawn. Declining kept the attack simple and is also valid.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('See the turn bonus end', 'End Turn. The +3,000 ordinary-skill bonus, if used, now ends. Your practice opponent will pass.',
        'You do not need to use an optional boss skill to win the Practice Duel. Read its cost and decide whether it helps.', ['endTurn'],
        s => has(s, 'turnStarted') && currentPower(index, game, refs.persona!) === def(index, game, refs.persona!).power, turn));
    }
  } else {
    refs.persona = take(cards.alternatePersona, 'persona');
    allowedAbilities.push(refs.persona);
    if (region === 'luzon') {
      refs.incoming = take(cards.l1Support, 'deck');
      goals.push(goal('Read Kalimangalnuk’s Sipol skill', 'Inspect Kalimangalnuk, your Persona, then close the details to continue. Sipol 1 looks at the top card and calls it if it is a Unit. Kalimangalnuk gains that called Unit’s current Power until End Turn.',
        'The incoming card goes to an Ally Zone; Kalimangalnuk stays your Persona. No State unlock is needed for this ordinary skill.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('Call with Sipol, or skip it', 'Use the Persona skill to try Sipol. Place the revealed Unit in a highlighted empty Ally Zone. You may instead go to Battle to skip this optional skill.',
        'The prepared top card is a Unit. In normal play, Sipol can reveal a non-Unit and fail to call; the bonus requires a Unit that actually entered a Zone.', ['ability', 'endPhase'],
        s => (resolved(s, refs.persona!) && me.allies.includes(refs.incoming!)) || game.phase === 'battle', persona,
        a => a.kind !== 'ability' || (a.uid === refs.persona && a.abilityIndex === 0)));
      goals.push(goal('Read the result before moving on', 'Inspect Kalimangalnuk, then close the details to continue. If Sipol called a Unit, that Ally’s Power was added for this turn. If no Unit was called, there is no extra Power.',
        'You may skip the skill or decline a revealed Unit. This optional ordinary skill is never required to win the Practice Duel.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
    } else if (region === 'visayas') {
      refs.original = refs.persona;
      refs.nextPersona = take(cards.persona, 'hand');
      goals.push(goal('Read Amara’s specific condition', 'Inspect Amara, your Persona, then close the details to continue. Her skill needs Sanib from the Persona Zone to special call a Unit from Heart. Ordinary Personify is not Sanib.',
        'Personify puts your previous Persona in Heart. This simplified deck has no skill that Sanibs the Persona, so Amara’s ordinary skill will not trigger here.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('See Personify and Heart without an extra skill', 'Go to Battle, then End Turn. At your next Personify step choose Kaptan. Amara goes to Heart as your previous Persona.',
        'The opponent passes. Amara does not automatically call an Ally: Personify is not the Sanib-from-Persona condition written on her skill.', ['endPhase', 'endTurn'],
        s => me.persona === refs.nextPersona && inst(game, refs.original!).zone === 'heart' && has(s, 'personaChanged'), turn));
      goals.push(goal('Inspect your previous Persona in Heart', 'Open Heart beneath your Persona and inspect Amara, then close the details to continue. Personify moved her there without Sanib, so her skill did not trigger.',
        'Her original skill remains printed, but this deck cannot Sanib a Persona. That skill is not required for the Practice Duel.', [],
        s => s.readCards.has(inst(game, refs.original!).defId), persona));
    } else {
      refs.offer1 = take(cards.l1Support, 'ally', 0, 0);
      refs.offer2 = take(cards.l1Attack, 'ally', 0, 3);
      goals.push(goal('Read Pah’s optional cost', 'Inspect Pah, your Persona, then close the details to continue. Offer two Allies means moving them to Grave as a cost for +5,000 Power until End Turn, or +10,000 at two or fewer Barriers.',
        'You have five Barriers here, so the bonus is +5,000. Offering two Allies means losing their attacks and support; this is optional.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
      goals.push(goal('Pay the Offer cost, or keep both Allies', 'Use Pah’s skill and select both Allies to try the +5,000 bonus. To keep them, cancel the cost and go to Battle instead.',
        'Only a confirmed Offer moves the two Allies to Grave. Going to Battle skips the skill and pays nothing. You do not need this skill to win the Practice Duel.', ['ability', 'endPhase'],
        s => (resolved(s, refs.persona!) && inst(game, refs.offer1!).zone === 'grave' && inst(game, refs.offer2!).zone === 'grave') || game.phase === 'battle', persona,
        a => a.kind !== 'ability' || (a.uid === refs.persona && a.abilityIndex === 0)));
      goals.push(goal('Check the cost and reward', 'Inspect Pah, then close the details to continue. If you used the skill, two Allies went to Grave for +5,000 until End Turn. If you skipped, both remain and Pah gained no bonus.',
        'The stronger +10,000 version checks whether you have two or fewer Barriers when the skill resolves. It is the same ordinary skill, not a State unlock.', [],
        s => s.readCards.has(inst(game, refs.persona!).defId), persona));
    }
  }
  game.pendingFx.length = 0;
  return { game, profile, chapter, encounter, region, refs, goals, opponent, allowedAbilities, eventStart: game.duel?.events.length ?? 0 };
}

export class JourneySession extends TutorialSession {
  readonly readCards = new Set<string>();
  hintVisible = false;
  private persisted = false;
  constructor(readonly fixture: JourneyFixture) {
    super({ id: `journey-${fixture.chapter}`, number: fixture.chapter, title: fixture.chapter === 3 ? 'Support and Defense' : 'Persona and Codex', summary: '', focus: 'orientation',
      // The required action and its plain-language explanation must both be
      // visible. Hiding everything after the first sentence reduced some
      // instructions to only "End Turn" for a first-time player.
      steps: fixture.goals.map(g => ({ title: g.title, body: g.body, anchor: g.anchor, expected: { kind: 'cue', cue: 'objective' } })) });
  }
  get events(): DuelEvent[] { return this.fixture.game.duel?.events.slice(this.fixture.eventStart) ?? []; }
  get goal(): Goal { return this.fixture.goals[this.stepIndex]!; }
  override get step(): TutorialStep { return super.step; }
  override continue(): void { /* Actual outcomes, not acknowledgement clicks, complete lessons. */ }
  override observe(_event: TutorialEvent): void { /* Wait for controller and presentation to settle. */ }
  override allows(action: PlayerAction): boolean {
    if (action.kind === 'switchCodex' && this.fixture.refs.codex && action.uid !== this.fixture.refs.codex) return false;
    return !this.completed && this.goal.actions.includes(action.kind) && (this.goal.accepts?.(action) ?? true);
  }
  inspect(cardId: string): void { this.readCards.add(cardId); this.settle(); }
  settle(): void {
    const game = this.fixture.game;
    if (game.responseChain || game.activeBattle || game.pendingTriggers?.length || this.completed) return;
    let changed = false;
    while (this.goal.test(this)) {
      changed = true; this.hintVisible = false;
      if (this.stepIndex === this.fixture.goals.length - 1) { this.completed = true; break; }
      this.stepIndex++;
      // Reading a card before the demonstrated result is not the requested
      // post-action inspection. Each reading objective needs a fresh visit.
      this.readCards.clear();
    }
    if (changed) this.onChange?.();
  }
  saveCompletion(): void {
    if (!this.completed || this.persisted) return;
    this.persisted = true;
    finishEncounter(this.fixture.chapter, this.fixture.encounter, this.fixture.region);
  }
}

/** The prepared opponent makes one attack or passes; it never chooses for the learner. */
export function journeyOpponent(fixture: JourneyFixture): Chooser {
  return { ...autoChooser, chooseAbility: async () => null, personifyPrompt: async () => null, blockPrompt: async () => [], battleCards: async () => [],
    // Prepared scenes teach the named action; an automatic optional Codex
    // switch would add an unexplained bonus change while the learner reads.
    chooseTarget: async (...args) => args[2].length && args[2].every(uid => fixture.game.cards[uid]?.zone === 'codex')
      ? null : autoChooser.chooseTarget(...args),
  };
}

/** Keep unrelated optional Persona combos out of prepared lessons, but preserve
 * Force/Sentry windows and the card's retained rules for normal tutorial practice. */
export function journeyHuman(chooser: Chooser, game: GameState, index: CardIndex, personifyTarget?: string, allowedAbilities: readonly string[] = []): Chooser {
  return new Proxy(chooser, { get(target, key) {
    if (key === 'personifyPrompt') return (player: PlayerId, pool: string[]) => {
      const choices = personifyTarget ? pool.filter(uid => uid === personifyTarget) : [];
      return choices.length ? target.personifyPrompt(player, choices) : Promise.resolve(null);
    };
    if (key === 'chooseTarget') return (...args: Parameters<Chooser['chooseTarget']>) =>
      args[2].length && args[2].every(uid => game.cards[uid]?.zone === 'codex') ? Promise.resolve(null) : target.chooseTarget(...args);
    if (key === 'chooseAbility') return (...args: Parameters<Chooser['chooseAbility']>) => {
      const options = args[2];
      // Retained Level 3 skills are still available in the free Practice Duel.
      // Only these unrelated optional skills are declined in prepared scenes.
      const visible = options.filter(option => {
        const card = game.cards[option.uid];
        const definition = card && index[card.defId];
        return definition?.type !== 'Unit' || definition.level !== 3 || allowedAbilities.includes(option.uid);
      });
      if (!visible.length) return Promise.resolve(null);
      return target.chooseAbility(args[0], args[1], visible, args[3]).then(pick => pick === null ? null : options.indexOf(visible[pick]!));
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}
export async function playJourneyOpponent(ctrl: GameController, fixture: JourneyFixture): Promise<void> {
  if (fixture.opponent === 'attack') {
    await ctrl.perform({ kind: 'endPhase' }, 1);
    await ctrl.perform({ kind: 'attack', attacker: you(ctrl.game, 1).persona!, target: null, supporters: [] }, 1);
  }
  await ctrl.perform({ kind: 'endTurn' }, 1);
}
