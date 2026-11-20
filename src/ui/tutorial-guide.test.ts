import { describe, it, expect } from 'vitest';
import { tutorialGuidePlacement } from './tutorial-guide.js';
import { intersects, type Box } from './overlay-placement.js';

describe('tutorial guide placement', () => {
  it.each([
    { width:1440, height:900, card:{left:640,top:500,width:112,height:157} },
    { width:844, height:390, card:{left:390,top:215,width:52,height:73} },
  ])('keeps the target and hand clear at $width × $height', ({width,height,card}) => {
    const view={left:8,top:8,width:width-16,height:height-16};
    const hand={left:width*.25,top:height*.84,width:width*.5,height:height*.16};
    const phase={left:0,top:height*.3,width:width*.14,height:height*.3};
    const box=tutorialGuidePlacement(view,{width:width>900?380:300,height:230},[card,hand,phase],card);
    expect(box).toBeDefined();
    for(const block of [card,hand,phase]) expect(intersects(box!,block)).toBe(false);
    expect(box!.left).toBeGreaterThanOrEqual(view.left);
    expect(box!.top+box!.height).toBeLessThanOrEqual(height-8);
  });
  it('protects every legal Ally destination, not only the highlighted one', () => {
    const destinations:Box[]=Array.from({length:4},(_,i)=>({left:220+i*130,top:280,width:80,height:110}));
    const box=tutorialGuidePlacement({left:8,top:8,width:900,height:500},{width:300,height:200},destinations,destinations[0]!);
    expect(box).toBeDefined();
    expect(destinations.some(b=>intersects(box!,b))).toBe(false);
  });
  it('uses restore instead of an unreadable slit when space is exhausted', () => {
    expect(tutorialGuidePlacement({left:0,top:0,width:844,height:390},{width:300,height:240},
      [{left:0,top:80,width:844,height:310}],{left:350,top:220,width:60,height:90})).toBeUndefined();
  });
  it('recomputes after resize without carrying placement state', () => {
    const target={left:320,top:200,width:60,height:90};
    const place=(width:number)=>tutorialGuidePlacement({left:8,top:8,width,height:374},{width:300,height:230},[target],target);
    const wide=place(828)!, narrow=place(650)!;
    expect(wide).toBeDefined(); expect(narrow).toBeDefined();
    expect(narrow.left+narrow.width).toBeLessThanOrEqual(658);
    expect(intersects(narrow,target)).toBe(false);
    expect(narrow.width).toBeGreaterThanOrEqual(260);
  });
});
