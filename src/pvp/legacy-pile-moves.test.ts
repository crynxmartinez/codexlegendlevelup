import { describe, expect, it } from 'vitest';
import deck from '../../decks/maguindanao-set-1.json';
import { FULL_INDEX } from '../data/loader.js';
import { createGame } from '../core/setup.js';
import { moveCard } from '../core/state.js';
import { eventLogOf, emit } from '../core/events.js';
import { playerView } from './view.js';
import { LegacyPileMoves } from './legacy-pile-moves.js';

describe('public legacy pile movement', () => {
  it('animates a normal call from hand for both seats without inventing a deck origin', () => {
    const game = createGame(FULL_INDEX, [deck, deck], { seed: 5 });
    const view = (seat:0|1) => playerView(game, seat, null, eventLogOf(game).events);
    const readers = [new LegacyPileMoves(view(0)), new LegacyPileMoves(view(1))];
    const uid = game.players[0].hand[0]!;
    moveCard(game, uid, 'ally', {slot:0,handMotion:false});
    emit(game,{actor:0,type:'cardCalled',sourceUids:[uid],targetUids:[],visibility:'public',message:'Called'});
    for (const seat of [0,1] as const) {
      expect(readers[seat]!.take(view(seat))).toEqual([{kind:'emit',uid,owner:seat,from:'hand',to:'field',faceUp:true}]);
      expect(readers[seat]!.take(view(seat))).toEqual([]);
    }
  });
  it('replays a mill once for each seat with the correct owner and public art', () => {
    const game = createGame(FULL_INDEX, [deck, deck], { seed: 5 });
    const view = (seat: 0 | 1) => playerView(game, seat, null, eventLogOf(game).events);
    const readers = [new LegacyPileMoves(view(0)), new LegacyPileMoves(view(1))];
    const uid = game.players[0].deck[0]!; moveCard(game, uid, 'grave');
    for (const seat of [0, 1] as const) {
      expect(readers[seat]!.take(view(seat))).toEqual([{kind:'emit',uid,owner:seat,from:'deck',to:'grave',faceUp:true}]);
      expect(readers[seat]!.take(view(seat))).toEqual([]);
      expect(new LegacyPileMoves(view(seat)).take(view(seat))).toEqual([]);
    }
  });
  it('never replays private draws or invents a Deck origin for discards', () => {
    const game = createGame(FULL_INDEX, [deck, deck], { seed: 5 });
    const reader = new LegacyPileMoves(game);
    moveCard(game, game.players[0].deck[0]!, 'hand');
    moveCard(game, game.players[0].hand[0]!, 'grave');
    expect(reader.take(game)).toEqual([]);
  });
  it('shows special calls from each public pile once, for both viewers', () => {
    for (const from of ['deck', 'grave', 'heart', 'exile', 'extra'] as const) {
      const game = createGame(FULL_INDEX, [deck, deck], { seed: 5 });
      const uid = game.players[0].deck[0]!;
      if (from !== 'deck') moveCard(game, uid, from);
      const view = (seat: 0 | 1) => playerView(game, seat, null, eventLogOf(game).events);
      const readers = [new LegacyPileMoves(view(0)), new LegacyPileMoves(view(1))];
      moveCard(game, uid, 'ally', { slot: 0 });
      for (const seat of [0, 1] as const) {
        expect(readers[seat]!.take(view(seat))).toEqual([{kind:'emit',uid,owner:seat,from,to:'field',faceUp:true}]);
        expect(readers[seat]!.take(view(seat))).toEqual([]);
      }
    }
  });
});
