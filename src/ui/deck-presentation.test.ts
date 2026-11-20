import { describe, it, expect } from 'vitest';
import { checkDeck } from '../core/deckcheck.js';
import { ALL_CARDS } from '../data/loader.js';
import { deckReadiness } from './deck-presentation.js';
import deck from '../../decks/agta-set-1.json';

describe('deck presentation keeps validator authority',()=>{
  it('calls an empty draft incomplete without making it saveable',()=>{
    const draft={...deck,main:[],codex:[]};const errors=checkDeck(ALL_CARDS,draft);
    expect(errors.length).toBeGreaterThan(0);
    expect(deckReadiness(errors,0,0,0)).toBe('incomplete');
  });
  it('distinguishes missing Codex from duplicate Codex even below five',()=>{
    const draft={...deck,codex:[deck.codex[0]!,deck.codex[0]!]};
    expect(deckReadiness(checkDeck(ALL_CARDS,draft),50,12,2)).toBe('invalid');
  });
  it('does not disguise an unknown card as a missing-count problem',()=>{
    const draft={...deck,main:[{id:'missing-card',copies:1}],codex:[]};
    expect(deckReadiness(checkDeck(ALL_CARDS,draft),1,0,0)).toBe('invalid');
  });
  it('marks overages invalid and zero validator errors ready',()=>{
    expect(deckReadiness([{where:'size',message:'51 cards — 1 too many.'}],51,12,5)).toBe('invalid');
    expect(deckReadiness([],50,12,5)).toBe('ready');
  });
});
