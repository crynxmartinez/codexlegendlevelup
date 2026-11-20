import { describe, expect, it } from 'vitest';
import { approvedRailBox } from './approved-choice-layout.js';
import { intersects } from './overlay-placement.js';

describe('approved decision rail preserves the native battlefield', () => {
  it.each([[1440,900,1195],[844,390,717]])('uses only the empty edge at %s by %s', (width,height,fieldRight) => {
    const view = {left:0,top:0,width,height};
    const field = {left:width*.2,top:height*.25,width:fieldRight-width*.2,height:height*.5};
    const hand = {left:width*.25,top:height*.82,width:width*.55,height:height*.18};
    const barriers = {left:width*.35,top:height*.74,width:width*.3,height:height*.08};
    const fit = approvedRailBox(view,[field,hand,barriers],height<600?72:110);
    expect(fit).toBeDefined();
    for(const obstacle of [field,hand,barriers]) expect(intersects(fit!,obstacle)).toBe(false);
    expect(fit!.left+fit!.width).toBeLessThan(width);
  });
  it('declines the edge layout when a crowded hand or Barrier reaches it', () => {
    const view={left:0,top:0,width:844,height:390};
    const crowded={left:210,top:280,width:634,height:110};
    expect(approvedRailBox(view,[crowded],72)).toBeUndefined();
    expect(approvedRailBox(view,[{left:715,top:200,width:125,height:75}],72)).toBeUndefined();
  });
  it('keeps visual viewport offsets and falls back for unusably short screens', () => {
    const fit=approvedRailBox({left:25,top:20,width:1440,height:900},[],130)!;
    expect(fit.left).toBeGreaterThan(1200);expect(fit.top).toBeGreaterThan(200);
    expect(approvedRailBox({left:0,top:0,width:844,height:260},[],72)).toBeUndefined();
  });
});
