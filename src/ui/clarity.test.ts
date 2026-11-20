import { describe, it, expect } from 'vitest';
import { helpPlacement, intersects } from './overlay-placement.js';
import { inputCopy } from './input-copy.js';
import { readableRules } from './card-info.js';
import { KEYWORD_BY_TERM, formatCardText } from './glossary.js';

describe('readable help without blocked actions', () => {
  it('anchors a card keyword beside the word instead of the screen corner', () => {
    const anchor={left:1100,top:570,width:42,height:20};
    const protectedWord={left:1094,top:564,width:54,height:32};
    const box=helpPlacement({left:8,top:8,width:1854,height:907},{width:320,height:120},[protectedWord],anchor)!;
    expect(box.left).toBeGreaterThan(800);
    expect(Math.min(Math.abs(box.top+box.height-anchor.top),Math.abs(box.top-anchor.top-anchor.height))).toBeLessThanOrEqual(8);
    expect(intersects(box,protectedWord)).toBe(false);
  });
  for (const [width,height] of [[844,390],[568,320]] as const) it(`keeps an edge keyword hint readable at ${width}x${height}`,()=>{
    const anchor={left:width-75,top:height-100,width:60,height:20};
    const footer={left:0,top:height-64,width,height:64};
    const box=helpPlacement({left:8,top:8,width:width-16,height:height-16},{width:320,height:200},[anchor,footer],anchor)!;
    expect(box.width).toBe(320);
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.top).toBeGreaterThanOrEqual(8);
    expect(box.left+box.width).toBeLessThanOrEqual(width-8);
    expect(intersects(box,anchor)).toBe(false);
    expect(intersects(box,footer)).toBe(false);
  });
  for (const [width,height] of [[1280,720],[844,390],[568,320]] as const) it(`keeps the target and actions free at ${width}x${height}`,()=>{
    const target={left:width/2-45,top:60,width:90,height:150};
    const footer={left:0,top:height-60,width,height:60};
    const box=helpPlacement({left:8,top:8,width:width-16,height:height-16},{width:320,height:240},[target,footer]);
    expect(box).toBeDefined();
    expect(intersects(box!,target)).toBe(false);expect(intersects(box!,footer)).toBe(false);
    expect(box!.left+box!.width).toBeLessThanOrEqual(width-8);
    expect(box!.top+box!.height).toBeLessThanOrEqual(height-8);
  });
  it('returns no floating position instead of covering a full-screen protected choice',()=>{
    const view={left:0,top:0,width:568,height:320};
    expect(helpPlacement(view,{width:300,height:160},[view])).toBeUndefined();
  });
  it('uses deliberate input wording',()=>{
    const text='Right-click the glowing card, or press and hold on a phone. Click a target.';
    expect(inputCopy(text,'touch')).toBe('Press and hold the glowing card. Tap a target.');
    expect(inputCopy(text,'mouse')).toBe('Right-click the glowing card. Click a target.');
    expect(inputCopy(text,'keyboard')).toContain('Shift+F10');
    expect(inputCopy(text,'keyboard')).not.toMatch(/click|tap/i);
  });
  it('keeps full authored costs and exceptions in readable rules',()=>{
    const html=readableRules('Action — [Cost: Offer 1] Draw 2, unless your deck is empty.\n1/Turn: Use during your Main Phase.');
    expect(html.replace(/<[^>]*>/g, '')).toContain('unless your deck is empty.');expect(html).toContain('1/Turn');
    expect(html).not.toContain('rule-label');
    expect(html).toContain('data-tip-title="Offer"');expect(html).toContain('text-cost');
    expect(readableRules('<script>bad()</script>')).not.toContain('<script>');
  });
  it('explains current victory, Force and State rules',()=>{
    expect(KEYWORD_BY_TERM.Barrier!.text).toContain('does not win');
    expect(KEYWORD_BY_TERM.Force!.text).toContain('not its hand response');
    expect(KEYWORD_BY_TERM.Garahana!.text).toContain('Alad');
    for(const term of ['Andukha','Garahana','Bayanihan'])expect(KEYWORD_BY_TERM[term]!.text).not.toContain('at the start');
    for(const term of ['Persona','Ally','Heart','plays','State','Codex'])expect(formatCardText(term)).toContain('data-tip=');
  });
});
