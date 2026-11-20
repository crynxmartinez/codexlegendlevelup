const { chromium } = require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const dir='art-source/pvp-opening-audit';fs.mkdirSync(dir,{recursive:true});
 try {
  const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:812,height:375},isMobile:true,hasTouch:true})]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));const [a,b]=pages;const errors=[];
  pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
  await a.goto('http://127.0.0.1:5176/?pvp');
  await a.getByRole('button',{name:'Create room',exact:true}).click();
  await a.getByRole('textbox',{name:'Room invitation',exact:true}).waitFor();
  const invite=await a.getByRole('textbox',{name:'Room invitation',exact:true}).inputValue();
  await b.goto(invite);await b.getByRole('button',{name:'Join room',exact:true}).tap();
  await b.getByRole('button',{name:'Ready',exact:true}).waitFor();
  for(const p of pages)await p.getByRole('button',{name:'Ready',exact:true}).click();
  for(let tries=0;tries<20;tries++){
   for(const p of pages){const roll=p.getByRole('button',{name:/^Roll(?: again)?$/});if(await roll.isVisible())await roll.click();}
   await a.waitForTimeout(400);
   if(await a.getByRole('button',{name:'Continue',exact:true}).isVisible())break;
  }
  await a.screenshot({path:dir+'/desktop-dice.png'});
  for(const p of pages)await p.getByRole('button',{name:'Continue',exact:true}).click();
  await a.getByRole('heading',{name:'Choose your Persona',exact:true}).waitFor();
  for(const p of pages)await p.locator('.opening-pick img').evaluateAll(images=>Promise.all(images.map(i=>i.decode().catch(()=>{}))));
  await a.screenshot({path:dir+'/desktop-persona.png'});await b.screenshot({path:dir+'/mobile-persona.png'});
  for(const p of pages){await p.locator('.opening-pick').first().click();await p.getByRole('button',{name:'Confirm Persona',exact:true}).click();}
  await a.getByRole('heading',{name:'Choose your starting Codex',exact:true}).waitFor();
  await a.screenshot({path:dir+'/desktop-codex.png'});
  for(const p of pages){await p.locator('.opening-pick').first().click();await p.getByRole('button',{name:'Confirm Codex',exact:true}).click();}
  await a.getByRole('heading',{name:'The match is set',exact:true}).waitFor();await a.screenshot({path:dir+'/desktop-reveal.png'});
  for(const p of pages)await p.locator('.board-wrap').waitFor({timeout:60000});
  await a.waitForTimeout(6000);await a.screenshot({path:dir+'/desktop-battle.png'});await b.screenshot({path:dir+'/mobile-battle.png'});
  console.log('PASS browser lobby → dice → Persona → Codex → reveal → battle',JSON.stringify(errors));
 } finally {await browser.close();}
})();
