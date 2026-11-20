export const KEY='codex-legends.menu-profile.v1';
export const defaults={fighter:'nico',nickname:'Player',playmat:'current',sleeve:'original',motion:true,language:'English',sound:false};
export const menus={
 main:[['story','Story','story','Stories from the Fractured Philippines.',true],['fight','Fight','fight','Choose how you want to play.'],['deck','Edit Deck','deck','Create and refine your deck.'],['shop','Shop','shop','Cosmetics and new possibilities. Coming later.',true],['note','Player Note','player','Make this journey your own.'],['collection','Collection','collection','Explore your collection. Coming later.',true],['option','Option','option','Adjust your experience.'],['tutorial','Tutorial','tutorial','Learn to play Codex Legend TCG.']],
 fight:[['ai','VS AI','fight','Practice your deck against an AI opponent.'],['friends','Play with Friends','friends','Challenge a friend to a private match.'],['rank','Rank','rank','Ranked play is not available yet.',true],['log','Fighter Log','log','Review match history and game updates.']],
 note:[['fighter','Fighter','player','Choose the character shown on your player portrait.'],['nickname','Nickname','nickname','Choose the name other players will see.'],['cosmetics','Playmat & Sleeves','playmat','Preview your field and card back.'],['achievement','Achievement','achievement','Your milestones will appear here. Coming later.',true]]
};
export function cleanProfile(raw={}){
 return {fighter:['nico','lira','amir','celina','dario','raina'].includes(raw.fighter)?raw.fighter:'nico',
 nickname:typeof raw.nickname==='string'&&raw.nickname.trim()?Array.from(raw.nickname.trim()).slice(0,24).join(''):'Player',
 playmat:'current',sleeve:'original',
 motion:raw.motion!==false,language:raw.language==='Tagalog'?'Tagalog':'English',sound:raw.sound===true};
}
export class Navigation {
 constructor(){this.route='main';this.states={};this.stack=[];this.busy=false;this.ensure();}
 ensure(){if(menus[this.route]&&!this.states[this.route])this.states[this.route]={selected:this.route==='main'?'fight':menus[this.route][0][0],armed:false};}
 get selection(){return this.states[this.route];}
 activate(id){if(this.busy)return 'busy';const item=menus[this.route]?.find(x=>x[0]===id);if(!item)return 'invalid';
 const s=this.selection;if(s.selected!==id||!s.armed){s.selected=id;s.armed=true;return item[4]?'locked-preview':'selected';}
 return item[4]?'locked':'enter';}
 enter(id){if(!menus[this.route]?.some(x=>x[0]===id&&!x[4]))return false;this.stack.push(this.route);this.route=id;this.ensure();return true;}
 back(){if(!this.stack.length)return false;this.route=this.stack.pop();this.ensure();return true;}
}
