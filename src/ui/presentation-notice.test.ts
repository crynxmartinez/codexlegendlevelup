import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./settings.js', () => ({ settings: () => ({ duelPace: 'learning' }) }));
import { clearPresentationNotices, presentNotice, checkRevealPosition } from './presentation-notice.js';

class NoticeNode extends EventTarget {
  isConnected = false;
  offsetWidth = 300; offsetHeight = 100;
  style: Record<string, string> = {};
  children: NoticeNode[] = [];
  setAttribute() {}
  append(...nodes: NoticeNode[]) { for (const node of nodes) { node.isConnected = true; this.children.push(node); } }
  remove() { this.isConnected = false; }
}
let doc: EventTarget & { hidden: boolean; body: NoticeNode; createElement: () => NoticeNode };
beforeEach(() => {
  vi.useFakeTimers();
  doc = Object.assign(new EventTarget(), { hidden: false, body: new NoticeNode(), createElement: () => new NoticeNode() });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('innerWidth', 844); vi.stubGlobal('innerHeight', 390);
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { clearPresentationNotices(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('informational presentation lifecycle', () => {
  it('places your check lower-right and the opponent check upper-left beside their piles', () => {
    const viewport = { width:1920, height:1080 }, size = { width:250, height:420 };
    expect(checkRevealPosition(true, viewport, size, {left:1420,right:1560})).toEqual({left:1572,top:588});
    expect(checkRevealPosition(false, viewport, size, {left:280,right:420})).toEqual({left:18,top:72});
  });
  it('clamps both reveal sides inside a short landscape viewport', () => {
    for (const mine of [true,false]) {
      const position = checkRevealPosition(mine, {width:844,height:390}, {width:150,height:300}, {left:0,right:844});
      expect(position.left).toBeGreaterThanOrEqual(8);
      expect(position.left + 150).toBeLessThanOrEqual(836);
      expect(position.top).toBeGreaterThanOrEqual(8);
      expect(position.top + 300).toBeLessThanOrEqual(382);
    }
  });
  it('keeps the styled check informational and cleans it up at the existing deadline', async () => {
    const result = presentNotice({ title:'REVEALED',detail:'Public check',checkReveal:{mine:true,force:false},cards:[{name:'Card',image:'/card.webp'}] });
    expect((doc.body.children[0] as unknown as {className:string}).className).toContain('check-reveal-notice mine');
    await vi.advanceTimersByTimeAsync(1600); await result;
    expect(doc.body.children[0]!.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('finishes a result without a click even with saved Learning pace', async () => {
    const done = vi.fn(); const result = presentNotice({ title: 'Check', detail: 'No Force' }).then(done);
    await vi.advanceTimersByTimeAsync(1599); expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); await result;
    expect(done).toHaveBeenCalledOnce(); expect(doc.body.children[0]!.isConnected).toBe(false);
  });
  it('does not create a timer or surface when already hidden', async () => {
    doc.hidden = true; await presentNotice({ title: 'Check', detail: '' });
    expect(doc.body.children).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('releases the engine and cleans up when the tab is hidden', async () => {
    const result = presentNotice({ title: 'Check', detail: '' });
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); await result;
    expect(vi.getTimerCount()).toBe(0); expect(doc.body.children[0]!.isConnected).toBe(false);
  });
  it('settles once and removes all notices on teardown', async () => {
    const done = vi.fn(); const first = presentNotice({ title: 'Check', detail: '' }).then(done);
    const second = presentNotice({ title: 'Reveal', detail: '' }).then(done);
    clearPresentationNotices(); clearPresentationNotices(); await Promise.all([first, second]);
    await vi.runAllTimersAsync(); expect(done).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0); expect(doc.body.children.every(node => !node.isConnected)).toBe(true);
  });
});
