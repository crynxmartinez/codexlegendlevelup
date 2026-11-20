import { describe, expect, it } from 'vitest';
import { powerDetailsModel, powerDetailsSafeBox } from './power-details.js';
import { intersects } from './overlay-placement.js';
import { groupModifiers } from './effect-provenance.js';
const context = { name:'Nanolay', printed:11000, current:17000, stack:1 };
describe('Power explanation of engine-supplied values', () => {
  it('explains stacked sources and their shared turn boundary without changing current Power', () => {
    const result = powerDetailsModel(context, groupModifiers([
      {amount:3000,source:'Dugong Panata',duration:'endOfTurn'},
      {amount:3000,source:'Nanolay',duration:'endOfTurn'},
    ]));
    expect(result).toMatchObject({ current:17000, unexplained:0, afterTurn:11000 });
    expect(result.entries.map(e=>e.amount)).toEqual([3000,3000]);
  });
  it('does not invent missing server provenance or an end-of-turn value', () => {
    const result = powerDetailsModel({...context,current:16000}, []);
    expect(result).toMatchObject({current:16000,unexplained:5000});
    expect(result.afterTurn).toBeUndefined();
  });
  it('separates stacked printed Power from temporary effects', () => {
    expect(powerDetailsModel({...context,current:25000,stack:2},groupModifiers([
      {amount:3000,source:'Known effect',duration:'endOfTurn'},
    ]))).toMatchObject({stackBonus:11000,unexplained:0,afterTurn:22000});
  });
  it('does not predict condition-dependent or mixed-boundary bonuses', () => {
    const [passive] = groupModifiers([{amount:3000,source:'Continuous condition',duration:'permanent'}]);
    expect(powerDetailsModel(context,[{...passive!,passive:true},...groupModifiers([{amount:3000,source:'Attack',duration:'endOfAttack'}])]).afterTurn).toBeUndefined();
  });
  it('keeps zero and negative values exact instead of clamping to a fabricated minimum', () => {
    const groups = groupModifiers([{amount:-12000,source:'Reduction',duration:'endOfTurn'}]);
    const result = powerDetailsModel({...context,current:-1000},groups);
    expect(result).toMatchObject({current:-1000,unexplained:0,afterTurn:11000});
    expect(result.entries[0]?.amount).toBe(-12000);
  });
});

describe('Power details preserve readable space above centered utilities', () => {
  it('keeps the desktop explanation full size while allowing foreground overlap of utilities', () => {
    const view={left:0,top:0,width:1440,height:900};
    const panel={left:1207,top:198,width:216,height:540};
    const utility={left:1368,top:320,width:58,height:260};
    const identity=[{left:1095,top:2,width:330,height:123},{left:1285,top:130,width:140,height:24}];
    const fitted=powerDetailsSafeBox(view,panel,identity);
    expect(fitted).toEqual(panel);
    expect(intersects(fitted,utility)).toBe(true);
    expect(identity.some(area=>intersects(fitted,area))).toBe(false);
  });
  it('keeps the mobile portrait and Plays visible without squeezing the explanation around More', () => {
    const view={left:0,top:0,width:844,height:390};
    const panel={left:720,top:91,width:119,height:290};
    const identity=[{left:629,top:1,width:206,height:86},{left:747,top:92,width:88,height:22}];
    const fitted=powerDetailsSafeBox(view,panel,identity);
    expect(fitted).toEqual({left:720,top:122,width:119,height:260});
    expect(identity.some(area=>intersects(fitted,area))).toBe(false);
    expect(intersects(fitted,{left:791,top:173,width:44,height:44})).toBe(true);
  });
  it('clamps the explanation to a shifted visual viewport and ignores unrelated horizontal areas', () => {
    const view={left:0,top:20,width:844,height:300};
    const panel={left:720,top:91,width:119,height:290};
    const fitted=powerDetailsSafeBox(view,panel,[{left:8,top:200,width:200,height:100}]);
    expect(fitted).toEqual({left:720,top:91,width:119,height:221});
  });
});
