/** Decision practice: advice reads public state, never plays on the user's behalf. */
import { GameController, type PlayerAction } from '../core/game.js';
import { autoChooser, type Chooser } from '../core/effects.js';
import { currentPower, def, moveCard, you, type CardIndex } from '../core/state.js';
import type { ActiveBattle, GameState } from '../core/types.js';
import { createFirstBattle } from './first-battle.js';
import { TutorialSession, type TutorialStep, type TutorialEvent } from './tutorial-mode.js';
import { TUTORIAL_LESSON_CARDS, type TutorialRegion } from '../core/tutorial-decks.js';

export interface SimpleSkillsCards { arrival: string; attacker: string; arrivalName: string; attackerName: string; arrivalPower: number; attackerPower: number }

/** A short legal sequence, using the same training profile as First Battle. */
export function createSimpleSkills(normalIndex: CardIndex, region: TutorialRegion = 'luzon') {
  const prepared = createFirstBattle(normalIndex, region);
  const { game, profile } = prepared;
  const roles = TUTORIAL_LESSON_CARDS[region];
  for (const player of game.players) for (const uid of [...player.hand]) moveCard(game, uid, 'deck');
  const takeRole = (cardId: string) => {
    const uid = you(game, 0).deck.find(uid => game.cards[uid]!.defId === cardId);
    if (!uid) throw new Error(`Simple Skills requires ${cardId}`);
    return uid;
  };
  const arrival = takeRole(roles.l1Arrival), attacker = takeRole(roles.l2Attack);
  moveCard(game, arrival, 'hand'); moveCard(game, attacker, 'ally', { slot: 0 });
  for (const player of game.players) {
    const draw = player.deck.find(uid => def(profile.index, game, uid).type === 'Unit' && def(profile.index, game, uid).level === 1)!;
    player.deck.splice(player.deck.indexOf(draw), 1); player.deck.unshift(draw);
  }
  game.pendingFx.length = 0;
  const arrivalDef = def(profile.index, game, arrival), attackerDef = def(profile.index, game, attacker);
  const cards: SimpleSkillsCards = { arrival, attacker,
    arrivalName: arrivalDef.name.split(', ').at(-1)!, attackerName: attackerDef.name.split(', ').at(-1)!,
    arrivalPower: arrivalDef.power, attackerPower: attackerDef.power };
  return { game, profile, cards };
}

export class SimpleSkillsSession extends TutorialSession {
  constructor(readonly cards: SimpleSkillsCards) {
    const num = (n: number) => n.toLocaleString('en-US');
    const read = (title: string, body: string, anchor?: string): TutorialStep => ({ title, body, anchor, expected: {kind:'manual'} });
    const act = (title: string, body: string, action: PlayerAction['kind'], anchor: string): TutorialStep => ({title,body,anchor,expected:{kind:'action',action}});
    super({ id:'simple-skills', number:2, title:'Simple Skills', summary:'See a bonus begin and end.', focus:'main', steps:[
      read('A skill adds a simple bonus', 'Some cards get stronger when you use them. You will try two skills. They happen automatically, so you do not need to activate them.'),
      act('Call your arrival Unit', `Choose ${cards.arrivalName} in your hand, then an empty Ally Zone. Its skill gives it +3,000 Power when it enters the field.`, 'call', `.hand-card[data-uid="${cards.arrival}"]`),
      read('This bonus lasts for the turn', `${num(cards.arrivalPower)} + 3,000 = ${num(cards.arrivalPower+3000)} Power. It keeps this bonus through your attacks, then loses it when this turn ends.`, `.mat:not(.foe) .card[data-uid="${cards.arrival}"]`),
      act('Go to Battle', 'Now try the other Unit. Choose Go to Battle at the lower right.', 'endPhase', '.side.mine .turn-btn'),
      act('Try the attack bonus', `Choose ${cards.attackerName} on your field, then their Persona. Its +5,000 makes ${num(cards.attackerPower+5000)} Power for this attack only. Do not add support yet.`, 'attack', `.mat:not(.foe) .card[data-uid="${cards.attacker}"]`),
      read('The attack bonus has ended', `Your attacker is back to ${num(cards.attackerPower)} Power. The arrival Unit still has its +3,000 because your turn has not ended. Sideways means the attacker is exhausted.`, `.mat:not(.foe) .card[data-uid="${cards.attacker}"]`),
      act('End the turn', 'Choose End Turn. Watch the arrival bonus disappear. Your opponent will pass so you can see both Units on your next turn.', 'endTurn', '.side.mine .turn-btn'),
      {title:'Watch the turn change',body:'The opponent is passing. Your next turn will begin.',hidden:true,expected:{kind:'phase',phase:'main',player:0}},
      read('Both bonuses are gone', `The arrival Unit is back to ${num(cards.arrivalPower)} Power, and your attacker is charged again. Remember: “this attack” ends after one attack; “this turn” lasts until the turn ends.`, `.mat:not(.foe) .card[data-uid="${cards.arrival}"]`),
    ]});
  }
  override allows(action: PlayerAction): boolean {
    if (this.completed || !super.allows(action)) return false;
    if (action.kind === 'call') return action.uid === this.cards.arrival && action.slot !== 0;
    if (action.kind === 'attack') return action.attacker === this.cards.attacker && action.target === null && !action.supporters.length;
    return true;
  }
  override observe(event: TutorialEvent): void {
    if (event.kind === 'action' && !this.allows(event.action)) return;
    super.observe(event);
  }
}

export async function playSimpleSkillsOpponent(ctrl: GameController): Promise<void> {
  const p = ctrl.game.turnPlayer;
  if (ctrl.game.phase === 'main') await ctrl.perform({kind:'endPhase'},p);
  if (ctrl.game.phase === 'battle') await ctrl.perform({kind:'endTurn'},p);
}

export interface PracticeHint {
  key: string; objective: string; levels: [string, string, string]; action?: PlayerAction;
}
const number = (value: number) => value.toLocaleString('en-US');
export function nextBattleHint(ctrl: GameController): PracticeHint {
  const g = ctrl.game, mine = you(g,0), foe = you(g,1);
  const legal = ctrl.legalActions(0);
  const key = JSON.stringify([g.turnNumber,g.phase,g.turnPlayer,legal]);
  if (g.turnPlayer !== 0 || g.activeBattle) return {key,objective:g.activeBattle?.defender===1 ? 'Watch your attack resolve.' : 'Watch their move, then choose your response.',levels:[
    'Keep an eye on the attacking Unit.', 'You can keep cards for later, or spend cards to defend. Ties hit.',
    'When defense opens, use Need a Hint? there to compare your available cards.']};
  if (g.phase !== 'main' && g.phase !== 'battle') return {key,objective:'Your next turn is starting.',levels:[
    'Watch your cards and resources refresh.', 'Any start-of-turn choices come before your Main Phase.', 'Make the current choice, then plan your next move.']};
  if (g.phase === 'main') {
    const call = legal.find(a=>a.kind==='call');
    if (!mine.allies.some(Boolean) && call?.kind==='call') return {key,objective:'Build your field for this turn.',action:call,levels:[
      'An Ally gives you another attacker.', 'Choose a Unit from your bottom hand, then an empty Ally Zone. A normal call uses one Play; the counter is beside your portrait.',
      `One option is ${def(ctrl.index,g,call.uid).name}. You can choose another legal Unit instead.`]};
    const cast = legal.find(a=>a.kind==='playAction');
    if (cast?.kind==='playAction') return {key,objective:'Prepare your attack. Save plays for your normal calls and Actions.',action:cast,levels:[
      'You can strengthen your field before entering battle.', 'Read the Action and its cost. You can cast it now or save it for later.',
      `Consider ${def(ctrl.index,g,cast.uid).name}. Its confirmation shows the cost before you commit.`]};
    return {key,objective:'Choose when your field is ready for battle.',action:legal.find(a=>a.kind==='endPhase'),levels:[
      'You do not have to use every play.', 'Keep some cards in hand for defense. Enter battle when you are ready.',
      'Choose Go to Battle at the lower right. BATTLE lights on the left phase rail. You can also make more legal plays first.']};
  }
  const attack = legal.find(a=>a.kind==='attack' && a.target===null) ?? legal.find(a=>a.kind==='attack');
  if (attack?.kind==='attack') {
    const target = attack.target ?? foe.persona!;
    return {key,objective:foe.barriers.length ? 'Try to break a Barrier this turn.' : 'Land a hit on their Persona to win.',action:attack,levels:[
      'You still have a Unit that can attack.',
      'Choose an attacker, then a target. Ties hit, but defense and checks can change the battle.',
      `One option: ${def(ctrl.index,g,attack.attacker).name} (${number(currentPower(ctrl.index,g,attack.attacker))}) into ${def(ctrl.index,g,target).name} (${number(currentPower(ctrl.index,g,target))}). This is before support, defense, and checks.`]};
  }
  return {key,objective:'Finish your turn when you are ready.',action:legal.find(a=>a.kind==='endTurn'),levels:[
    'There are no legal attacks available right now.', 'Your exhausted Units will normally charge at the start of your next turn.',
    'Choose End Turn at the lower right to let the opponent play.']};
}

export function defenseHelp(attack: number, base: number, cards: Array<{name:string;defense:number}>): [string,string,string] {
  const enough = [...cards].sort((a,b)=>a.defense-b.defense).find(c=>base+c.defense>attack);
  return ['Defense must be higher than the attack. Ties hit.',
    `Their attack is ${number(attack)}. Your current defense is ${number(base)}. Keep cards if you can afford a hit, or add defense.`,
    base>attack ? 'Your current defense is already higher. An attack check can still change the result.' : enough
      ? `${enough.name} would bring defense to ${number(base+enough.defense)}. An attack check can still change the result.`
      : 'One available card cannot exceed the attack. Compare a combination, or take the hit. An attack check can still change the result.'];
}

export const NEXT_BATTLE_PROGRESS = 'codex-legends.next-battle.v1';
export class NextBattleSession {
  level = 0;
  private hintKey = '';
  private finished = false;
  minimized = false;
  feedback = '';
  calls = 0; attacks = 0; actions = 0; defenseChoices = 0; hints = 0;
  sync(key:string): void { if (key !== this.hintKey) { this.hintKey = key; this.level=0; } }
  request(key:string): void { this.sync(key); this.level=Math.min(3,this.level+1); this.hints++; }
  action(a:PlayerAction): void {
    this.level=0;
    if (a.kind==='call') { this.calls++; this.feedback='Your Ally is on the field. You can keep playing or enter battle.'; }
    if (a.kind==='playAction') { this.actions++; this.feedback='Your Action resolved. Check the field before choosing your next move.'; }
    if (a.kind==='attack') this.attacks++;
    if (a.kind==='endPhase') this.feedback='Your Units can attack now. Choose their order.';
    if (a.kind==='endTurn') this.feedback='You kept your remaining cards for later. Now watch the opponent’s turn.';
  }
  defended(count:number): void {
    this.defenseChoices++; this.level=0;
    this.feedback=count ? `You committed ${count} card${count===1?'':'s'} to defense. The check comes next.` : 'You kept your cards. Watch whether the attack connects.';
  }
  resolved(b:ActiveBattle): void {
    this.level=0;
    this.feedback=b.sentryUsed ? 'The Sentry stopped the damage.' : b.hit
      ? `The attack connected: ${number(b.attackPower)} met or exceeded ${number(b.defensePower)} defense.`
      : `The attack stopped: ${number(b.defensePower)} defense exceeded ${number(b.attackPower)} attack.`;
  }
  finish(won:boolean): void {
    if(this.finished) return;
    this.finished=true;
    try {
      let old: {version?:number;attempts?:number;completed?:boolean} = {};
      try { old=JSON.parse(localStorage.getItem(NEXT_BATTLE_PROGRESS)??'{}') ?? {}; } catch { /* replace corrupt progress */ }
      const attempts=old?.version===1 && Number.isSafeInteger(old.attempts) && old.attempts!>=0 ? old.attempts! : 0;
      localStorage.setItem(NEXT_BATTLE_PROGRESS,JSON.stringify({version:1,attempts:attempts+1,completed:won||old?.completed===true,
        last:{won,calls:this.calls,attacks:this.attacks,actions:this.actions,defenseChoices:this.defenseChoices,hints:this.hints}}));
    } catch { /* Practice does not require persistent storage. */ }
  }
}

/** Predictable, legal sparring choices. Uses only its own hand and visible Power. */
export function nextBattleOpponent(index:CardIndex, game:GameState): Chooser {
  let defendedTurn=-1;
  return {...autoChooser, chooseAbility:async()=>null, chooseTarget:async()=>null,
    personifyPrompt:async()=>null, battleCards:async()=>[],
    blockPrompt:async(p,info,candidates)=> {
      if (defendedTurn===game.turnNumber || you(game,p).barriers.length>1 || info.defensePower>info.attackPower) return [];
      const enough=[...candidates].sort((a,b)=>def(index,game,a).defense-def(index,game,b).defense)
        .find(uid=>info.defensePower+def(index,game,uid).defense>info.attackPower);
      if(enough) defendedTurn=game.turnNumber;
      return enough?[enough]:[];
    }};
}

export async function playNextBattleTurn(ctrl:GameController):Promise<void> {
  const p=ctrl.game.turnPlayer;
  const perform=async(a:PlayerAction)=>{ await ctrl.perform(a,p); await ctrl.hooks.onAiAction?.(a); };
  // One new Ally per turn, up to two; no optional combo or repeated restand loop.
  if (you(ctrl.game,p).allies.filter(Boolean).length<2) {
    const call=ctrl.legalActions(p).find(a=>a.kind==='call');
    if(call) await perform(call);
  }
  const battle=ctrl.legalActions(p).find(a=>a.kind==='endPhase');
  if(battle) await perform(battle);
  const used=new Set<string>();
  for(let i=0;i<3 && ctrl.game.winner===null;i++) {
    const attacks=ctrl.legalActions(p).filter((a):a is Extract<PlayerAction,{kind:'attack'}>=>a.kind==='attack'&&!used.has(a.attacker));
    const attack=attacks.find(a=>a.target===null)??attacks[0];
    if(!attack) break;
    used.add(attack.attacker); await perform(attack);
  }
  if(ctrl.game.winner===null) await perform({kind:'endTurn'});
}
