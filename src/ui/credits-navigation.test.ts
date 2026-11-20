import { describe, expect, it } from 'vitest';
import title from './title-screen.ts?raw';
import main from './main.ts?raw';
import credits from './credits.ts?raw';

describe('about and credits', () => {
  it('belongs in Settings rather than the title More menu', () => {
    expect(title).not.toContain('About & credits');
    expect(main).toContain("const aboutCredits = el('button', undefined, 'About & credits')");
    expect(main).toContain('aboutCredits.onclick = openCredits');
  });
  it('describes history as the foundation with mythology as a splash', () => {
    expect(credits).toContain('inspired by Philippine history, with a splash of mythology');
    expect(credits).not.toContain('inspired by Philippine folklore');
    expect(title).not.toContain('inspired by Philippine folklore');
  });
});
