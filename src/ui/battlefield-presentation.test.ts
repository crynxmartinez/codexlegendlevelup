import { describe, expect, it, vi, afterEach } from 'vitest';
import source from './main.ts?raw';
import theme from './battlefield-presentation.ts?raw';
import ts from 'typescript';
import { DEFAULT_BATTLEFIELD, requestedPresentation, animePortrait, createAnimeChrome, applyBattlefieldPresentation } from './battlefield-presentation.js';

afterEach(() => vi.unstubAllGlobals());
describe('default battlefield presentation', () => {
  it('uses anime for normal starts, legacy links, tutorials and remote matches', () => {
    expect(DEFAULT_BATTLEFIELD).toBe('anime');
    expect(requestedPresentation(undefined, new URLSearchParams())).toBe('anime');
    expect(requestedPresentation('start', new URLSearchParams())).toBe('anime');
    expect(requestedPresentation('anime', new URLSearchParams())).toBe('anime');
    expect(requestedPresentation(undefined, new URLSearchParams('anime'))).toBe('anime');
    for (const route of ['start','pvp','room','roomLobby','tutorial','practice','graduation','challenge','demo','start&rematch=Agta']) {
      expect(requestedPresentation(undefined, new URLSearchParams(route))).toBe('anime');
      expect(requestedPresentation('anime', new URLSearchParams(`anime&${route}`))).toBe('anime');
    }
  });
  it('uses a matching portrait or the actual current card, never a different character', () => {
    expect(animePortrait('agta/set-1/wind-heart-rescuer-taguwasi','fallback')).toContain('portrait-taguwasi');
    expect(animePortrait('another-persona','/cards/actual.webp')).toBe('/cards/actual.webp');
  });
  it('adds and removes only its opt-in class', () => {
    const toggle = vi.fn(); vi.stubGlobal('document', {body:{classList:{toggle}}});
    applyBattlefieldPresentation('anime'); applyBattlefieldPresentation('classic');
    expect(toggle.mock.calls).toEqual([['anime-battlefield',true],['anime-battlefield',false]]);
  });
  it('renders public phase without mutating its input or making phases clickable', () => {
    class Node { className=''; textContent=''; attrs:Record<string,string>={}; children:Node[]=[]; setAttribute(k:string,v:string){this.attrs[k]=v} append(...nodes:Node[]){this.children.push(...nodes)} }
    vi.stubGlobal('document',{createElement:()=>new Node()});
    const state=Object.freeze({turn:4,localTurn:false,phase:'battle',plays:2});
    const root=createAnimeChrome(state) as unknown as Node;
    expect(root.children[0]!.children[1]!.textContent).toBe('TURN 4');
    expect(root.children[1]!.children.map(n=>n.textContent)).toEqual(['draw','personify','main','battle','end']);
    expect(root.children[1]!.children.filter(n=>n.attrs['aria-current']==='step').map(n=>n.textContent)).toEqual(['battle']);
    expect(root.children).toHaveLength(2); // Plays are anchored to each live player HUD.
  });
  it('keeps theme integration in the existing BoardUI/controller flow', () => {
    expect(source).toContain("if (choice === 'start')");
    expect(source).toContain('private battlefield: BattlefieldPresentation = DEFAULT_BATTLEFIELD');
    const parsed = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
    const boardCalls: ts.NewExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node) && node.expression.getText(parsed) === 'BoardUI') boardCalls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(parsed);
    const local = boardCalls.find(node => node.arguments?.[5]?.getText(parsed) === 'graduation');
    expect(local, 'the AI match still uses the existing BoardUI').toBeDefined();
    expect(local!.arguments![0]!.getText(parsed)).toBe('ctrl');
    expect(local!.arguments![6]!.getText(parsed)).toBe('battlefield');
    expect(theme).not.toMatch(/GameController|createGame\(|Math\.random|\.perform\(|\.hand\b|\.deck\b/);
  });
});
