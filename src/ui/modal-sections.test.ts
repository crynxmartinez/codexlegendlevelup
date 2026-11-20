import { afterEach, expect, it, vi } from 'vitest';
import { presentReadingSections } from './modal-sections.js';

class Node {
  children: Node[] = []; parent?: Node; hidden = false; scrollTop = 12;
  className = ''; textContent = ''; type = ''; attrs: Record<string,string> = {};
  onclick?: () => void;
  append(...nodes: Node[]) { for (const node of nodes) {
    if(node.parent) node.parent.children = node.parent.children.filter(child => child !== node);
    node.parent = this; this.children.push(node);
  } }
  setAttribute(key:string,value:string) { this.attrs[key]=value; }
}
afterEach(()=>vi.unstubAllGlobals());
it('keeps original controls, handlers and values when changing reading sections',()=>{
  vi.stubGlobal('document',{createElement:()=>new Node()});
  const body=new Node(), first=new Node(), second=new Node(), control=new Node();
  control.textContent='Saved value'; control.onclick=vi.fn(); second.append(control); body.append(first,second);
  presentReadingSections(body as unknown as HTMLElement,[
    {label:'Overview',element:first as unknown as HTMLElement},
    {label:'Options',element:second as unknown as HTMLElement},
  ],'Test sections');
  const layout=body.children[0]!,nav=layout.children[0]!,pages=layout.children[1]!;
  expect(body.children).toHaveLength(1);
  expect(nav.attrs['aria-label']).toBe('Test sections');
  expect(first.hidden).toBe(false); expect(second.hidden).toBe(true);
  nav.children[1]!.onclick!();
  expect(first.hidden).toBe(true); expect(second.hidden).toBe(false);
  expect(nav.children.map(n=>n.attrs['aria-current'])).toEqual(['false','true']);
  expect(pages.scrollTop).toBe(0);
  expect(second.children[0]).toBe(control);
  expect(control.textContent).toBe('Saved value'); expect(control.onclick).not.toHaveBeenCalled();
  nav.children[0]!.onclick!(); nav.children[1]!.onclick!();
  expect(second.children).toHaveLength(1); expect(control.onclick).not.toHaveBeenCalled();
});
