/** Bounded decorative spring. It has no access to the game, choices or game RNG. */
export interface Spring { offset: number; velocity: number }
export function stepSpring(body: Spring, elapsedMs: number): void {
  const dt = Math.max(0, Math.min(elapsedMs, 33)) / 1000;
  body.velocity += (-34 * body.offset - 9 * body.velocity) * dt;
  body.offset = Math.max(-.3, Math.min(.3, body.offset + body.velocity * dt));
}
export function impulseSpring(body: Spring): void { body.velocity = Math.min(2.5, body.velocity + 1.2); }
