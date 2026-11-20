import {describe,it,expect} from 'vitest';
import css from './refinement.css?raw';
import main from './main.ts?raw';
import html from '../../index.html?raw';

describe('shared UI refinement contract',()=>{
  it('loads after legacy base styles',()=>{
    expect(html.indexOf('/src/ui/refinement.css')).toBeGreaterThan(html.indexOf('/src/ui/style.css'));
  });
  it('shares shell tokens without styling the printed card artwork',()=>{
    expect(css).toContain('--ui-radius-dialog: 16px');
    expect(css).toContain('.duel-panel .duel-dialog');
    expect(css).not.toContain('.inspect .art');
    expect(css).not.toContain('.pvp');
  });
  it('keeps readable Settings descriptions and accessible toggle names',()=>{
    expect(css).toContain('text-transform: none; letter-spacing: 0');
    expect(main).toContain("sw.setAttribute('aria-label', t.name)");
    expect(main).toContain("sw.setAttribute('aria-pressed', String(next))");
  });
  it('provides reduced-motion entry, focus and invalid states',()=>{
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('ui-panel-fade 120ms');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('[aria-invalid=true]');
  });
});
