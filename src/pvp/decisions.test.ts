import { describe, expect, it } from 'vitest';
import { DecisionGate } from './decisions.js';
import { CANCEL_DRAFT } from '../core/effects.js';
describe('remote choices', () => {
  it.each(['chooseTarget','chooseCards'] as const)('accepts cancellation only for a draft %s', async kind => {
    const gate=new DecisionGate(()=>{}), many=kind==='chooseCards';
    for(const draft of [false,true]) {
      const pending=gate.ask(0,kind,many?[0,'Pick',['a'],1,{draft}]:[0,'Pick',['a'],{draft}]);
      expect(gate.answer(0,gate.pending!.id,many?[CANCEL_DRAFT]:CANCEL_DRAFT)).toBe(draft);
      if(!draft)gate.answer(0,gate.pending!.id,many?['a']:'a');
      expect(await pending).toEqual(draft?(many?[CANCEL_DRAFT]:CANCEL_DRAFT):(many?['a']:'a'));
    }
  });
  it('counts the first Illana Bay Unit once and accepts indivisible excess Offer value', async () => {
    const gate = new DecisionGate(() => {});
    for (const required of [1, 2, 3]) {
      const wait = gate.ask(0, 'chooseCards', [0, 'Offer', ['a', 'b'], required,
        { weights: { a: 1, b: 1 }, firstSelectedMinimum: 2, atLeast: true, decline: 'Cancel' }]);
      if (required === 3) expect(gate.answer(0, gate.pending!.id, ['a'])).toBe(false);
      const answer = required === 3 ? ['a', 'b'] : ['a'];
      expect(gate.answer(0, gate.pending!.id, answer)).toBe(true);
      expect(await wait).toEqual(answer);
    }
    const wait = gate.ask(0, 'chooseCards', [0, 'Offer', ['a', 'b'], 4,
      { firstSelectedMinimum: 2, atLeast: true, decline: 'Cancel' }]);
    expect(gate.answer(0, gate.pending!.id, ['a', 'b'])).toBe(false);
    expect(gate.answer(0, gate.pending!.id, [])).toBe(true); await wait;
  });
  it('allows one response index or decline, but cannot decline mandatory pending triggers', async () => {
    const gate = new DecisionGate(() => {});
    const wait = gate.ask(1, 'chooseAbility', [1, 'Respond', [{ uid: 'a' }, { uid: 'b' }], { kind: 'response', allowDecline: true, chainId: 'chain-1' }]);
    const id = gate.pending!.id;
    expect(gate.answer(0, id, 0)).toBe(false);
    expect(gate.answer(1, id, [0, 1])).toBe(false);
    expect(gate.answer(1, id, null)).toBe(true);
    expect(await wait).toBeNull();
    const pending = gate.ask(1, 'chooseAbility', [1, 'Required effects', [{ uid: 'a' }], { kind: 'pending', allowDecline: false }]);
    expect(gate.answer(1, id, 0)).toBe(false);
    expect(gate.answer(1, gate.pending!.id, null)).toBe(false);
    expect(gate.answer(1, gate.pending!.id, 0)).toBe(true);
    expect(await pending).toBe(0);
  });
  it('accepts ordered unique picks only from the owning seat and live decision', async () => {
    const gate = new DecisionGate(() => {});
    const wait = gate.ask(1, 'chooseCards', [1, 'Kalas 2', ['a', 'b', 'c'], 2, { ordered: true }]);
    const id = gate.pending!.id;
    expect(gate.answer(0, id, ['a', 'b'])).toBe(false);
    expect(gate.answer(1, id, ['a', 'a'])).toBe(false);
    expect(gate.answer(1, id, ['a', 'evil'])).toBe(false);
    expect(gate.answer(1, id, ['c', 'a'])).toBe(true);
    expect(await wait).toEqual(['c', 'a']);
    expect(gate.answer(1, id, ['b', 'a'])).toBe(false);
  });
  it('enforces weighted exact costs, supports decline and up-to', async () => {
    const gate = new DecisionGate(() => {});
    const wait = gate.ask(0, 'chooseCards', [0, 'Offer', ['a', 'b'], 2, { weights: { a: 2 }, decline: 'Cancel' }]);
    expect(gate.answer(0, gate.pending!.id, ['b'])).toBe(false);
    expect(gate.answer(0, gate.pending!.id, ['a'])).toBe(true);
    expect(await wait).toEqual(['a']);
    const next = gate.ask(0, 'chooseCards', [0, 'Choose up to 2', ['a', 'b'], 2, { upTo: true }]);
    expect(gate.answer(0, gate.pending!.id, [])).toBe(true); await next;
  });
  it('validates confirmations and indexes, and cancels unresolved work', async () => {
    const gate = new DecisionGate(() => {});
    const choice = gate.ask(0, 'chooseMode', [0, 'Mode', ['A', 'B']]);
    expect(gate.answer(0, gate.pending!.id, 2)).toBe(false);
    expect(gate.answer(0, gate.pending!.id, 1)).toBe(true); expect(await choice).toBe(1);
    const pending = gate.ask(1, 'confirm', [1, 'Pay?']);
    expect(gate.answer(1, gate.pending!.id, 'true')).toBe(false);
    const rejected = expect(pending).rejects.toThrow('Match closed'); gate.cancel(); await rejected;
  });
});
