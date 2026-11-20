/** Explicit access to retired-printing effects for isolated regression fixtures.
 * Production GameController defaults to ACTIVE_SCRIPTS; never import this module
 * from the application. These fixtures do not represent current deck legality.
 */
import { GameController as CurrentController, ALL_SCRIPTS } from '../core/game.js';
export { ALL_SCRIPTS } from '../core/game.js';
export type { PlayerAction, BattleHooks } from '../core/game.js';
export class GameController extends CurrentController {
  constructor(...args: ConstructorParameters<typeof CurrentController>) {
    super(args[0], args[1], { ...args[2], scripts: args[2]?.scripts ?? ALL_SCRIPTS });
  }
}
