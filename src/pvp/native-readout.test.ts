import { expect, it } from 'vitest';
import { nativeFrame } from './native-readout';
import { MatchSession, parseSetup } from './session';
import { STARTERS } from './catalog';

it('keeps existing frames intact and orients native HUD to either viewer', () => {
  const s=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Visayas})],12,()=>{});
  for(const seat of [0,1] as const){
    const original=s.frame(seat),next=nativeFrame(s,seat);
    expect(next.state).toEqual(original.state);expect(next.legal).toEqual(original.legal);
    expect(next.hud).toHaveLength(2);expect(next.hud[0]!.level).toBe(3);
    expect(next.state.players[1].hand.every(uid=>next.state.cards[uid]!.defId==='__hidden__')).toBe(true);
    for(const uid of s.game.players[1-seat]!.deck)expect(JSON.stringify(next)).not.toContain(uid);
  }
});
it('does not offer native supporters after a match closes',()=>{
  const s=new MatchSession([parseSetup({deck:STARTERS.Luzon}),parseSetup({deck:STARTERS.Mindanao})],12,()=>{});
  s.ctrl.concede(0);s.close();
  expect(nativeFrame(s,0).supporters).toEqual({});expect(nativeFrame(s,1).state.winner).toBe(0);
});
