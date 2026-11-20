/** Run against Vite. PLAYWRIGHT_RUNTIME may point at a package.json with Playwright installed. */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_RUNTIME || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const url = process.argv[2] || 'http://127.0.0.1:5173';
let activePage;
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    if (process.env.FIRST_BATTLE_WIDTH && viewport.width !== Number(process.env.FIRST_BATTLE_WIDTH)) continue;
    const context = await browser.newContext({ viewport, reducedMotion: viewport.width === 844 ? 'reduce' : 'no-preference',
      ...(viewport.width === 390 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const step = async id => {
      await page.waitForSelector(`[data-step="${id}"]`);
      // Engine hooks may replace the coach between frames. Wait for the current
      // step's laid-out element instead of measuring a detached predecessor.
      await page.waitForFunction(id => {
        const node = document.querySelector(`.first-battle-coach[data-step="${id}"]`);
        if (!node) return false;
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.x >= 0 && box.y >= 0
          && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1;
      }, id);
    };
    const next = async () => page.locator('.first-battle-coach button.primary').click();
    const point = async (selector, button = 'left') => {
      const target = page.locator(selector);
      await target.waitFor({ state: 'visible' });
      const rect = await target.boundingBox();
      assert(rect, `Missing ${selector}`);
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const reachable = await target.evaluate((node, { x, y }) => node.contains(document.elementFromPoint(x, y)), { x, y });
      assert(reachable, `Covered target: ${selector} (${viewport.width}x${viewport.height})`);
      await page.mouse.click(x, y, { button });
    };
    const attack = async which => {
      await point(`.mat:not(.foe) .slot${which === 'persona' ? '.persona' : '[data-slot="0"]'} .card`);
      await point('.mat.foe .slot.persona .card');
    };
    const result = async () => page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.goto(`${url}/?tutorial=first-battle`);
    await step('welcome');
    assert.equal(await page.locator('.hand-card').first().isVisible(), false);
    assert.equal(await page.locator('.side.mine .turn-btn').isDisabled(), true);
    await next(); await step('persona'); await next(); await step('goal'); await next();
    await step('inspect');
    // The keyboard-accessible alternative opens the same card inspector.
    await page.getByRole('button', { name: 'Read Card', exact: true }).click();
    await page.locator('.inspect-bg').press('Escape');
    await step('call');
    // A wrong card does not play or spend resources.
    await point('.hand-card:nth-child(2)');
    await step('call');
    await point('.hand-card.tutorial-target');
    await point('.mat:not(.foe) .slot[data-slot="0"]');
    await step('called');
    await page.screenshot({ path: `.tmp/first-battle-${viewport.width}.png` });
    await next(); await step('battle');
    await page.locator('.side.mine .turn-btn').click();
    await step('attack'); await attack('persona');
    await step('their-defense'); await next(); await step('before-check'); await next();
    await result(); await step('checked'); await next(); await step('stopped'); await next();
    await step('ally-attack'); await attack('ally'); await result();
    await step('shield'); await next(); await step('end'); await page.locator('.side.mine .turn-btn').click();
    await step('opponent'); await page.reload(); await step('opponent'); await next();
    await step('attacked');
    // Minimize leaves a clear board and keeps the instruction waiting.
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    assert.equal(await page.locator('.first-battle-coach').count(), 0);
    await page.locator('.tutorial-coach-minimized').click();
    await step('attacked'); await next();
    await page.locator('.cc-pick').click(); await page.locator('.cc-actions button.primary').click();
    await result(); await result(); await step('held'); await next();
    await step('take-hit'); await next(); await page.getByRole('button', { name: 'Take the Hit', exact: true }).click();
    await result(); await result(); await step('lost-shield'); await next();
    await step('new-turn'); await page.reload(); await step('new-turn'); await next();
    await step('boost'); await point('.hand-card.tutorial-target');
    // Cancel never casts; reopening and confirming does.
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await step('boost'); await point('.hand-card.tutorial-target');
    await page.getByRole('button', { name: 'Cast · 2 Energy', exact: true }).click();
    await step('boosted'); await next(); await step('last-battle'); await page.locator('.side.mine .turn-btn').click();
    await step('last-shield'); await attack('persona'); await result(); await result();
    await step('no-shields'); await next(); await step('win'); await attack('ally');
    await step('victory'); await next(); await page.waitForSelector('.tutorial-complete');
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: complete victory, wrong click, inspection, minimize, cancel, two reload checkpoints; no page errors`);
    await page.getByRole('button', { name: 'Play Your Next Battle', exact: true }).click();
    await page.waitForURL('**/?practice=next-battle');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForSelector('.hand-card');
    assert.equal(await page.locator('.first-battle-coach').count(), 0);
    await context.close();
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator('body').innerText());
    await activePage.screenshot({ path: '.tmp/first-battle-failure.png' });
  }
  throw error;
} finally { await browser.close(); }
