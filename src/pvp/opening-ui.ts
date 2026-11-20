import type { DeckList } from '../core/setup.js';
import { personaChoices } from '../core/setup.js';
import { MATCH_INDEX } from './catalog.js';
import type { OpeningView } from './opening.js';
import { boardUrl, CARD_BACK } from '../ui/assets.js';
import { warmCardArt } from '../ui/card-art-cache.js';
import { cardDisplayName } from '../ui/card-name.js';
import { showDie } from '../ui/match-setup.js';
import { OpeningFeedback } from './opening-feedback.js';
import { profileFighter, type OpeningIdentity } from './profile.js';
import './opening-ui.css';

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => {
  const n = document.createElement(tag); n.textContent = text; n.className = cls; return n;
};

export function preloadOpening(deck: DeckList, progress: (text: string, state: 'loading' | 'ready' | 'partial') => void): void {
  // Only the local deck. Never ask for an opponent-specific hidden asset list.
  const ids = [...personaChoices(MATCH_INDEX, deck), ...deck.codex, ...deck.main.map(c => c.id)];
  const urls = [...new Set([CARD_BACK, '/ui/game-mat-fractured-v1.webp', ...ids.map(id => MATCH_INDEX[id]?.art).filter((s): s is string => !!s).map(boardUrl)])];
  progress('Preparing battle assets…', 'loading');
  void warmCardArt(urls, report => progress(`Battle art ${report.ready}/${urls.length}${report.failed.length ? ' · some art unavailable' : ''}`, 'loading'))
    .then(report => progress(report.failed.length ? 'Some artwork will retry at battle start.' : 'Battle art ready', report.failed.length ? 'partial' : 'ready'))
    .catch(() => progress('Artwork unavailable · retrying at battle start.', 'partial'));
}

export class OpeningPanel {
  readonly element = node('section', '', 'pvp-opening');
  private selected: Partial<Record<'persona' | 'codex', string>> = {};
  private revealTimer?: ReturnType<typeof setTimeout>;
  private feedback = new OpeningFeedback();
  private current?: { view: OpeningView; seat: 0 | 1; deck: DeckList; identities: OpeningIdentity[] };
  private diceUI?: { players: { panel: HTMLElement; portrait: HTMLElement; name: HTMLElement; die: HTMLElement }[]; message: HTMLElement; action: HTMLButtonElement };
  constructor(private send: (message: unknown) => void, private inspect: (id: string) => void) {}
  dispose(): void { clearTimeout(this.revealTimer); this.revealTimer = undefined; this.current = undefined; this.element.getAnimations({subtree:true}).forEach(a=>a.cancel()); this.element.remove(); }
  setConnected(connected: boolean): void {
    this.feedback.connection(connected);
    if (!connected) { clearTimeout(this.revealTimer); this.revealTimer = undefined; }
    if (!connected) this.refresh(); // Resume only after the authoritative sync arrives.
  }
  rejectSubmission(): void { this.feedback.release(); this.refresh(); }
  private refresh(): void { if (this.current) { const {view,seat,deck,identities}=this.current; this.render(view,seat,deck,identities); } }
  private submit(message: { kind: 'roll' | 'confirm'; stage?: string; round?: number; value?: string }): void {
    const c=this.current;
    if (!c || !this.feedback.submit(message.kind,c.view,c.seat)) return;
    this.refresh();
    try { this.send(message); } catch { this.feedback.release(); this.setConnected(false); }
  }

  render(view: OpeningView, seat: 0 | 1, deck: DeckList, identities: OpeningIdentity[]): void {
    const animate=this.feedback.receive(view,seat);
    this.current={view,seat,deck,identities};
    const root = this.element;
    if (view.stage === 'dice' && this.diceUI) { this.updateDice(animate); return; }
    root.replaceChildren(); this.diceUI=undefined;
    root.dataset.stage = view.stage;
    const steps = node('ol', '', 'opening-steps'); steps.setAttribute('aria-label', 'Match setup');
    for (const [i, step] of ['dice', 'persona', 'codex', 'reveal'].entries()) {
      const item = node('li', `0${i + 1} ${step === 'dice' ? 'Roll' : step === 'reveal' ? 'Battle' : step}`);
      if (step === view.stage) item.setAttribute('aria-current', 'step'); steps.append(item);
    }
    root.append(steps);
    if (view.first !== null && view.stage !== 'dice') root.append(node('p', view.first === seat ? 'You go first' : 'You go second', 'opening-order'));
    const waiting = view.confirmed[seat];
    if (view.stage === 'dice') {
      const heading=node('h2','Roll for first turn','opening-roll-title');
      const message=node('p','','opening-roll-message');message.setAttribute('role','status');
      const arena=node('div','','opening-arena');
      const players=[0,1].map(i=>{
        const panel=node('section','',`opening-contestant ${i===0?'local':'rival'}`);
        const portrait=node('div','','opening-portrait');
        const die=node('div','?',`opening-die${i===1?' opponent':''}`);die.setAttribute('role','img');
        const name=node('strong','','opening-nameplate');
        panel.append(portrait,die,name);arena.append(panel);return {panel,portrait,name,die};
      });
      const vs=node('b','VS','opening-versus');vs.setAttribute('aria-hidden','true');arena.append(vs);
      const action=node('button','Roll','primary opening-roll-action');
      action.onclick=()=>{const v=this.current!.view;this.submit(v.first===null?{kind:'roll',round:v.round}:{kind:'confirm',stage:'dice'});};
      root.append(heading,message,arena,action);
      this.diceUI={players,message,action};this.updateDice(animate);
      return;
    }
    if (view.stage === 'reveal') {
      root.append(node('h2', 'The match is set'));
      const row = node('div', '', 'opening-reveal');
      view.choices?.forEach((choice, i) => {
        const player = node('div', '', 'opening-player'); player.append(node('strong', identities[i]?.name ?? 'Player'));
        for (const id of [choice.persona, choice.codex]) player.append(this.card(id));
        row.append(player);
      });
      root.append(row, node('p', 'Entering battle…'));
      if (!waiting && this.feedback.connected && !this.feedback.pending && !this.revealTimer) this.revealTimer = setTimeout(() => {
        this.submit({ kind: 'confirm', stage: 'reveal' });
      }, 2400);
      return;
    }
    const stage = view.stage;
    root.append(node('h2', stage === 'persona' ? 'Choose your Persona' : 'Choose your starting Codex'));
    if (waiting) { root.append(node('p', 'Locked in · waiting for your opponent')); return; }
    root.append(node('p', view.confirmed[1 - seat] ? 'Opponent locked in' : 'Opponent is choosing', 'opening-opponent'));
    const ids = stage === 'persona' ? personaChoices(MATCH_INDEX, deck) : deck.codex;
    const row = node('div', '', 'opening-cards');
    const confirm = node('button', `Confirm ${stage === 'persona' ? 'Persona' : 'Codex'}`, 'primary');
    confirm.disabled = !this.selected[stage] || !!this.feedback.pending || !this.feedback.connected;
    for (const id of ids) {
      const tile = node('div', '', 'opening-card');
      const pick = node('button', '', 'opening-pick');
      pick.setAttribute('aria-label', `Select ${cardDisplayName(MATCH_INDEX[id]!.name)}`);
      pick.setAttribute('aria-pressed', String(this.selected[stage] === id));
      pick.append(this.card(id));
      pick.disabled = !!this.feedback.pending || !this.feedback.connected;
      pick.onclick = () => { this.selected[stage] = id; this.render(view, seat, deck, identities); };
      const read = node('button', 'Inspect'); read.onclick = () => this.inspect(id);
      tile.append(pick, read); row.append(tile);
    }
    confirm.onclick = () => this.submit({ kind: 'confirm', stage, value: this.selected[stage] });
    root.append(row, confirm);
  }
  private updateDice(animate: boolean[]): void {
    const {view,seat,identities}=this.current!;const ui=this.diceUI!;
    [seat,1-seat].forEach((serverSeat,displaySeat)=>{
      const identity=identities[serverSeat];const p=ui.players[displaySeat]!;
      p.panel.dataset.seat=String(serverSeat);
      p.name.textContent=`${identity?.name || 'Player'}${displaySeat===0?' (you)':''}`;
      p.name.dataset.long=String(p.name.textContent.length>20);
      p.name.title=p.name.textContent;
      const fighter=profileFighter(identity?.fighter);
      const key=fighter??'unknown';
      if(p.portrait.dataset.fighter!==key){
        p.portrait.dataset.fighter=key;p.portrait.replaceChildren();
        const fallback=node('div','Character unavailable','opening-portrait-fallback');
        if(fighter){const img=node('img');img.src=`/ui/menu-v1/characters/${fighter}.webp`;img.alt=`${identity?.name || 'Player'} — selected character`;
          img.onerror=()=>p.portrait.replaceChildren(fallback);p.portrait.append(img);
        }else p.portrait.append(fallback);
      }
      const roll=view.rolls[serverSeat];
      const value=roll===null?'':String(roll);
      if(p.die.dataset.value!==value){
        if(roll===null){p.die.textContent='?';p.die.dataset.value='';p.die.setAttribute('aria-label',`${displaySeat===0?'Your':'Opponent'} roll: not rolled`);}
        else showDie(p.die,roll!);
      }
      p.die.classList.toggle('is-rolling',displaySeat===0 && this.feedback.pending==='roll');
      p.die.classList.toggle('winner',view.first===serverSeat);
      if(animate[serverSeat] && !matchMedia('(prefers-reduced-motion: reduce)').matches){
        p.die.getAnimations().forEach(a=>a.cancel());
        p.die.animate([{transform:'skewX(12deg) rotate(-10deg) scale(.92)'},{transform:'skewX(12deg) rotate(5deg) scale(1.04)',offset:.6},{transform:'skewX(12deg)'}],{duration:460,easing:'ease-out'});
      }
    });
    const tied=view.rolls[0]!==null&&view.rolls[0]===view.rolls[1];
    const away=identities[1-seat]?.connected===false;
    ui.message.textContent=!this.feedback.connected?'Connection interrupted · restoring the current roll…':away?'Opponent disconnected · waiting for reconnection.':view.first!==null?(view.first===seat?'You go first.':'Your opponent goes first.'):this.feedback.pending==='roll'?'Rolling · awaiting the server result…':tied?'Tie — roll again to decide who goes first.':view.rolls[seat]!==null?'Your roll is in. Waiting for your opponent.':'Each player rolls a die. The higher roll goes first.';
    ui.action.textContent=!this.feedback.connected?'Reconnecting…':this.feedback.pending?(this.feedback.pending==='roll'?'Rolling…':'Confirming…'):view.confirmed[seat]?'Waiting for opponent…':view.first!==null?'Continue':tied?'Roll again':view.rolls[seat]!==null?'Waiting for opponent…':'Roll';
    ui.action.disabled=!this.feedback.connected || !!this.feedback.pending || view.confirmed[seat] || (view.first===null&&!tied&&view.rolls[seat]!==null);
  }
  private card(id: string): HTMLElement {
    const card = MATCH_INDEX[id]!;
    const figure = node('figure'); const image = node('img');
    image.src = boardUrl(card.art); image.alt = cardDisplayName(card.name);
    figure.append(image, node('figcaption', cardDisplayName(card.name))); return figure;
  }
}
