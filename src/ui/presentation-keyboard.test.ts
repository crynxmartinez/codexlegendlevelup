import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./duel-motion.js', () => ({ revealPanel: vi.fn() }));
vi.mock('./panel-icons.js', () => ({ panelIcon: vi.fn() }));
class Node extends EventTarget {
  isConnected = true; parentElement: Node | null = null; style = { setProperty: vi.fn() }; classList = { add: vi.fn(), toggle: vi.fn() };
  setAttribute = vi.fn(); focus = vi.fn(); closest = vi.fn(() => null); onclick?: () => void;
  append(...nodes: Node[]) { nodes.forEach(node => { node.parentElement = this; }); }
  remove() { this.isConnected = false; }
}
let handlers: Record<string, (event: unknown) => void>;
beforeEach(() => {
  vi.resetModules(); handlers = {};
  vi.stubGlobal('Element', Node); vi.stubGlobal('HTMLElement', Node);
  vi.stubGlobal('document', { body: new Node(), activeElement: new Node(), querySelector: () => null, createElement: () => new Node(), addEventListener: (type: string, fn: (event: unknown) => void) => { handlers[type] = fn; } });
  vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('innerHeight', 900); vi.stubGlobal('innerWidth', 1440);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());
it('keeps native select/range and typeahead keys available while a duel decision is pending', async () => {
  const { mountDuelPanel, registerPresentationControl } = await import('./duel-panel.js');
  const mount = mountDuelPanel(new Node() as unknown as HTMLElement, new Node() as unknown as HTMLElement, new Node() as unknown as HTMLElement, 'Choose defense');
  const overlay = new Node(), input = new Node(); input.parentElement = overlay; registerPresentationControl(overlay as unknown as HTMLElement);
  for (const key of ['ArrowDown', 'ArrowLeft', 'Home', 'End', 'PageDown', 'f', 'Enter', ' ', 'Escape']) {
    const event = { key, target: input, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
    handlers.keydown!(event); expect(event.preventDefault).not.toHaveBeenCalled(); expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
  }
  const outside = { key: 'ArrowDown', target: new Node(), preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
  handlers.keydown!(outside); expect(outside.preventDefault).toHaveBeenCalledOnce(); mount.remove();
});
