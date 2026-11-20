const fs = require('fs');
// Reuse the isolated AI journey; add audit-only observations, not game changes.
let script = fs.readFileSync('tools/mobile-audit.cjs', 'utf8');
script = script.replace("for(const name of [/^Skip the walkthrough$/i", "for(const name of [/^Keep current$/i,/^Skip the walkthrough$/i");
script = script.replace("console.log('ERRORS',JSON.stringify(errors));", `
 console.log('GUIDES', await page.locator('.tutorial-coach, .tutorial-tip').count());
 await page.goto('http://127.0.0.1:5175/?pvp');
 await page.waitForTimeout(2000);
 for (const [width,height] of [[812,375],[568,320]]) {
   await page.setViewportSize({width,height}); await snap('pvp-'+width);
   console.log('PVP GEOMETRY', await page.locator('input,select,button').evaluateAll(nodes => nodes.filter(n=>n.getBoundingClientRect().width).map(n=>({text:n.textContent?.slice(0,45)||n.getAttribute('aria-label'),height:n.getBoundingClientRect().height,top:n.getBoundingClientRect().top}))));
 }
 console.log('ERRORS',JSON.stringify(errors));
`);
eval(script);
