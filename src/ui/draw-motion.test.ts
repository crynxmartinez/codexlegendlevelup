import { afterEach, expect, it, vi } from 'vitest';
const motion = vi.hoisted(() => ({ epoch: 0, reduced: false, glow: vi.fn(), flight: vi.fn() }));
vi.mock('./duel-motion.js', () => ({ motionEpoch: () => motion.epoch, motionReduced: () => motion.reduced,
  playMotion: motion.glow, flyCard: motion.flight }));
import { animateDeckDraw } from './draw-motion.js';

function node() {
  return { isConnected: true, style: { visibility: '' }, getBoundingClientRect: () => ({ width: 70, height: 98 }) } as unknown as HTMLElement;
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); motion.epoch = 0; motion.reduced = false; });
it('finishes the Deck glow before flight and keeps the hand card hidden until arrival', async () => {
  vi.stubGlobal('document', { hidden: false });
  const deck = node(), target = node(), order: string[] = [];
  motion.glow.mockImplementationOnce(async () => { order.push('glow'); expect(target.style.visibility).toBe('hidden'); });
  motion.flight.mockImplementationOnce(async () => { order.push('flight'); expect(target.style.visibility).toBe('hidden'); });
  await animateDeckDraw(deck, target, 'card-back');
  expect(order).toEqual(['glow', 'flight']);
  expect(motion.flight.mock.calls[0]![0].image).toBe('card-back');
  expect(target.style.visibility).toBe('');
});
it('skips flight and restores the hand when motion is cancelled during the glow', async () => {
  vi.stubGlobal('document', { hidden: false });
  const target = node();
  motion.glow.mockImplementationOnce(async () => { motion.epoch++; });
  await animateDeckDraw(node(), target, 'art');
  expect(motion.flight).not.toHaveBeenCalled();
  expect(target.style.visibility).toBe('');
});
it('uses a short steady outline for reduced motion', async () => {
  vi.stubGlobal('document', { hidden: false }); motion.reduced = true;
  motion.glow.mockResolvedValueOnce(undefined); motion.flight.mockResolvedValueOnce(undefined);
  await animateDeckDraw(node(), node(), 'art');
  expect(motion.glow.mock.calls[0]![2]).toBe(80);
  expect(motion.glow.mock.calls[0]![1][0]).toEqual(motion.glow.mock.calls[0]![1][1]);
});
