import { expect, it } from 'vitest';
import { heartCardFaceUp, heartMoveLabel } from './heart-motion.js';
import type { HeartMoveFx } from '../core/types.js';
const fx: HeartMoveFx={kind:'heartMove',reason:'move',owner:1,before:3,after:2,cards:[{uid:'x',defId:'secret',from:'heart',to:'hand',fromSlot:null,toSlot:null,hidden:true}]};
it('does not reveal a hidden opponent movement',()=>{expect(heartCardFaceUp(fx.cards[0]!,1,0)).toBe(false);expect(heartCardFaceUp(fx.cards[0]!,1,1)).toBe(true);});
it('does not call every Heart exit Kalas',()=>{expect(heartMoveLabel(fx)).toContain('Return to hand');expect(heartMoveLabel({...fx,reason:'vent'})).toContain('Kalas 1');});
