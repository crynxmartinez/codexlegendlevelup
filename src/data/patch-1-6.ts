import type {Patch} from './patches.js';
export const FRIENDS_AND_LEARNING_PATCH:Patch={
  id:'1.6',title:'Learn your deck, then invite a friend',date:'September 2026',
  regions:['luzon','visayas','mindanao'],
  summary:'A clearer path from your first guided battle to a private match with a friend.',
  nerfs:[],buffs:[],adjusted:[],newCards:[],systems:[
    {title:'Play with a friend',note:'Create an unranked private room, share its invitation, choose your deck and get ready together. Both players can request a rematch. A brief disconnect holds your seat for up to 60 seconds.'},
    {title:'First Battle and Your Next Battle',note:'Start with a guided battle, then try your own moves against a practice opponent with optional hints. Short lessons remain available when you want to focus on one mechanic.'},
    {title:'Learn each deck',note:'Deck guides explain the game plan, show Level and Energy distributions, suggest key cards and let you try sample opening hands. Mechanic filters help you find cards in the builder.'},
    {title:'Archipelago Challenge',note:'Complete three AI battles focused on building a field, managing resources and connecting effects. Completed stages are saved on this device; retries start a fresh duel.'},
    {title:'Clearer decisions and results',note:'Support selection previews your attack and explains what checks can still change. Results link to the last action, practice, changing decks and another match. Longer effect sequences show the preceding sources.'},
    {title:'Consistent card viewers',note:'Heart, Deck, Grave, Exile, Codex and Extra use the same compact horizontal card viewer. Right-click or long-press a card to read it.'},
    {title:'Local playtest feedback',note:'Five short questions save answers in this browser. Export them as CSV after playtesting; answers are not uploaded.'},
  ],
};
