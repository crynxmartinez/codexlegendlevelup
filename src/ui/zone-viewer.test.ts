import { expect, it } from 'vitest';
import { concealedCard, zoneCardVisible, codexSwitchInstruction } from './zone-viewer.js';

it('explains the manual Play cost and preserves Main-phase and decision restrictions', () => {
  const options = { own: true, yourTurn: true, main: true, pending: false, available: true, remainingPlays: 1 };
  expect(codexSwitchInstruction(options)).toContain('Manual switch costs 1 Play');
  expect(codexSwitchInstruction(options)).toContain('No once-per-turn limit');
  expect(codexSwitchInstruction({ ...options, available: false })).toContain('unavailable for this step');
  expect(codexSwitchInstruction({ ...options, main: false })).toContain('Main Phase');
  expect(codexSwitchInstruction({ ...options, pending: true })).toContain('Finish the current decision');
  expect(codexSwitchInstruction({ ...options, own: false })).toContain("Opponent's Codex");
});

it('explains zero Plays without suggesting that automatic switches are blocked', () => {
  const options = { own: true, yourTurn: true, main: true, pending: false, available: false, remainingPlays: 0 };
  expect(codexSwitchInstruction(options)).toContain('No Plays left');
  expect(codexSwitchInstruction(options)).toContain('costs 1 Play');
  expect(codexSwitchInstruction(options)).toContain('Automatic switches are still free');
  expect(codexSwitchInstruction({ ...options, pending: true })).toContain('Finish the current decision');
  expect(codexSwitchInstruction({ ...options, own: false })).not.toContain('No Plays left');
});

it('never exposes deck identities through browsing', () => {
  for (const owner of [0, 1]) expect(zoneCardVisible('deck', owner, 0, false)).toBe(false);
});
it('hand browsing reveals only the viewers own hand', () => {
  expect(zoneCardVisible('hand', 0, 0, false)).toBe(true);
  expect(zoneCardVisible('hand', 1, 0, false)).toBe(false);
});
it('allows own reserve Codex but conceals face-down opposing Codex', () => {
  expect(zoneCardVisible('codex', 0, 0, true)).toBe(true);
  expect(zoneCardVisible('codex', 1, 0, true)).toBe(false);
  expect(zoneCardVisible('codex', 1, 0, true, true)).toBe(true);
});
it('keeps face-down cards concealed in other zones', () => {
  for (const zone of ['heart', 'grave', 'exile', 'extra']) {
    expect(zoneCardVisible(zone, 0, 0, true)).toBe(false);
    expect(zoneCardVisible(zone, 1, 0, false)).toBe(true);
  }
});
it('hidden tiles contain no card name, rules, level or defense', () => {
  const card = concealedCard('opaque', 'deck', '/back.webp');
  expect(card).toMatchObject({ name: 'Face-down card', detail: '', hidden: true });
  expect(card.level).toBeUndefined(); expect(card.defense).toBeUndefined();
});
