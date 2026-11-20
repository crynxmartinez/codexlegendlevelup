import cards from '../data/set-1.json' with { type: 'json' };
import type { ScriptRegistry } from './types.js';

// Actions can be played and go to the grave, but have no card effect yet.
// Units/Forces use their printed stats; Codex cards have no State or skill.
export const SET_ONE_SCRIPTS: ScriptRegistry = Object.fromEntries(
  cards.filter((c) => c.type === 'Action').map((c) => [c.id, {
    id: c.id,
    action: { run: async () => {} },
  }]),
);
