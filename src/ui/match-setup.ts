import { menuElement as e } from './menu-destination.js';
import { menuProfile, type MenuFighter } from './menu-profile.js';
import { setupPortrait } from './setup-portraits.js';
import './match-setup.css';
export { setupPortrait };

/** Presentation only. Callers own the roll, legal choices and confirmation. */
export function setupShell(page: HTMLElement, step: number, title: string, subtitle: string) {
  page.classList.add('match-setup');
  const header=e('header','setup-header');
  const logo=e('div','setup-logo'); logo.setAttribute('role','img');logo.setAttribute('aria-label','Codex Legend TCG');
  logo.append(e('span','destination-emblem'),e('span','destination-wordmark'));
  const progress=e('ol','setup-progress'); progress.setAttribute('aria-label','Match setup');
  ['Roll','Persona','Codex'].forEach((name,i)=>{
    const item=e('li',i===step?'current':i<step?'complete':'',`${i<step?'✓ ':''}0${i+1} ${name}`);
    if(i===step)item.setAttribute('aria-current','step'); progress.append(item);
  });
  header.append(logo,progress);
  const heading=e('div','setup-heading');
  const h=e('h1','',title);h.tabIndex=-1;
  heading.append(h,e('p','',subtitle));
  const content=e('div','setup-content'); const footer=e('footer','setup-footer');
  page.replaceChildren(header,heading,content,footer);
  h.focus({preventScroll:true});
  return {content,footer};
}

export function dicePresentation(page: HTMLElement, opponentFighter: MenuFighter) {
  const {content,footer}=setupShell(page,0,'Roll for first turn','Each player rolls a die. The higher roll goes first.');
  page.classList.add('setup-roll');
  const versus=e('div','setup-versus');
  const profile=menuProfile();
  const player=e('div','setup-fighter');const portrait=e('img');
  portrait.src=`/ui/menu-v1/characters/${profile.fighter}.webp`;portrait.alt='Your selected character';
  player.dataset.person=profile.fighter;
  player.append(portrait,e('strong','',profile.nickname));
  const rival=e('div','setup-fighter setup-rival');
  const rivalPortrait=e('img');
  rivalPortrait.src=`/ui/menu-v1/characters/${opponentFighter}.webp`;
  rivalPortrait.alt='AI opponent character';
  rival.dataset.person=opponentFighter;
  rival.append(rivalPortrait,e('strong','','AI opponent'));
  const dice=[e('div','setup-die','?'),e('div','setup-die opponent','?')] as const;
  dice[0].setAttribute('aria-label','Your roll: not rolled');dice[1].setAttribute('aria-label','Opponent roll: not rolled');
  versus.append(player,dice[0],e('b','setup-vs','VS'),dice[1],rival);
  const result=e('div','setup-result','Ready to roll');result.setAttribute('role','status');
  content.append(versus,result);
  footer.append(e('span','setup-selection','First, decide who starts.'));
  return {dice,result,footer};
}

export function showDie(die: HTMLElement, value: number) {
  die.replaceChildren(); die.dataset.value=String(value);
  const positions: Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  for(let i=0;i<9;i++)die.append(e('i',positions[value]?.includes(i)?'pip':'pip blank'));
  die.setAttribute('aria-label',`${die.classList.contains('opponent')?'Opponent':'Your'} roll: ${value}`);
}
