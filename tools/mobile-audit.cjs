const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const out=path.resolve('art-source/mobile-audit');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Only this disposable browser context: seed 1 keeps the human opening reproducible.
 await page.addInitScript(() => { Math.random = () => 0.000000001; });
 const home=async()=>{await page.goto('http://127.0.0.1:5175/');await page.waitForTimeout(1700);};
 const snap=async(name)=>{await page.waitForTimeout(500);await page.screenshot({path:path.join(out,name+'.png')});console.log(name,(await page.locator('body').innerText()).slice(0,5000));console.log('LAYOUT',await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,smallButtons:[...document.querySelectorAll('button')].filter(e=>{const r=e.getBoundingClientRect();return !e.closest('[inert]')&&r.width>0&&r.height>0&&(r.width<32||r.height<32)}).map(e=>({text:e.textContent?.slice(0,50),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)})).slice(0,20)})));};
 await home();await snap('portrait-home');await page.getByRole('button',{name:'Deck',exact:true}).tap();await page.waitForTimeout(6500);await snap('portrait-deck');
 await page.setViewportSize({width:812,height:375});await snap('landscape-deck');
 await home();await page.getByRole('button',{name:'Settings',exact:true}).tap();await page.waitForTimeout(3500);await snap('landscape-settings');
 await home();await page.getByRole('button',{name:/Play vs AI/}).tap();await page.waitForTimeout(1500);await snap('landscape-play');
 await page.setViewportSize({width:812,height:375});await snap('landscape-play');
 const close=page.getByRole('button',{name:'×',exact:true});if(await close.count())await close.first().click();
 await page.getByRole('button',{name:/^roll$/i}).tap();await page.waitForTimeout(1000);await snap('landscape-after-roll');
 await page.getByRole('button',{name:/^continue$/i}).tap();await page.waitForTimeout(800);await snap('landscape-persona');
 for(let i=0;i<2;i++){if(await page.locator('.pick').count()){await page.locator('.pick').first().tap();await page.getByRole('button',{name:/^confirm$/i}).tap();await page.waitForTimeout(800);}}
 for(let i=0;i<25;i++){
   const decline=page.getByRole('button',{name:/^(Keep current|Skip|Choose none|No|No response)$/i});
   if(await decline.count())await decline.first().tap();
   if(await page.locator('.mobile-phase').filter({hasText:/Your Turn.*Main/i}).count() && !(await page.locator('.modal-bg').count()))break;
   await page.waitForTimeout(700);
 }
 await snap('landscape-duel');
 await page.locator('.hand-card').first().tap();await snap('landscape-inspect');
 await page.getByRole('button',{name:'Back to hand',exact:true}).tap();
 if(await page.locator('.hand-card:not(.dim)').count()){
   const count=await page.locator('.hand-card').count();
   await page.locator('.hand-card:not(.dim)').first().tap();
   if(await page.locator('.hand-card').count()!==count)throw Error('Inspection played a card');
   await page.getByRole('button',{name:'Play card',exact:true}).tap();
   await snap('landscape-play-action');
 }
 for(const name of [/^Skip the walkthrough$/i,/^Stop showing tips$/i,/^Got it$/i]){
   const dismiss=page.getByRole('button',{name});if(await dismiss.count())await dismiss.first().tap();
 }
 await page.waitForTimeout(2500);
 await snap('landscape-clean');
 await page.setViewportSize({width:667,height:375});await snap('small-landscape-duel');
 await page.setViewportSize({width:896,height:414});await snap('large-landscape-duel');
 await page.setViewportSize({width:568,height:320});await snap('short-landscape-duel');
 await page.setViewportSize({width:1440,height:900});await snap('desktop-regression');
 console.log('ERRORS',JSON.stringify(errors));}finally{await browser.close();}})();
