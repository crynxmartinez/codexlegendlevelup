import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_RUNTIME || import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const url=process.argv[2]||'http://127.0.0.1:5174';
let page;
try {
  for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]) {
    if(process.env.NEXT_BATTLE_WIDTH && viewport.width!==Number(process.env.NEXT_BATTLE_WIDTH)) continue;
    const ctx=await browser.newContext({viewport,reducedMotion:'reduce'});
    await ctx.addInitScript(()=>localStorage.setItem('codex-legends.settings',JSON.stringify({duelPace:'fast',animationIntensity:'minimal',autoDesc:false,cutscenes:false,logOpen:false})));
    page=await ctx.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${url}/?practice=next-battle`);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    const ready=async()=>page.waitForFunction(()=>{
      const b=document.querySelector('.next-hint');return b && !b.disabled && !document.querySelector('.side.mine .turn-btn')?.disabled && !document.body.classList.contains('duel-pending') && !document.body.classList.contains('opening-deal');
    });
    const pump=async()=>{
      for(let i=0;i<180;i++) {
        if(await page.locator('.next-battle-result').count()) return;
        const panel=page.locator('.duel-panel:not(.duel-suspended)');
        if(await panel.count()) {
          const text=await panel.innerText();
          if(text.includes('Choose your defense')) {
            if(process.env.NEXT_BATTLE_LOSS) { await panel.getByRole('button',{name:'Do not block',exact:true}).click(); continue; }
            const help=panel.locator('.cc-help');
            if(await help.count()) {await help.click();await help.click();await help.click();assert.match(await panel.locator('.cc-help-text').innerText(),/check/i);}
            const card=panel.locator('.cc-card').filter({hasText:'Keeper At Sunrise'}).first();
            if(await card.count()) {await card.locator('.cc-pick').click();await panel.locator('.cc-actions button.primary').click();}
            else await panel.getByRole('button',{name:'Do not block',exact:true}).click();
          } else {
            const buttons=panel.getByRole('button');
            let clicked=false;
            for(const name of ['Skip','No','Not now','Continue','Keep attacking','Do not use','Cancel']) {
              const btn=buttons.filter({hasText:new RegExp(`^${name}$`,'i')});
              if(await btn.count() && await btn.first().isVisible()) {await btn.first().click();clicked=true;break;}
            }
            if(!clicked) throw new Error(`Unhandled panel: ${text}`);
          }
        } else if(await page.locator('.next-hint:not(:disabled)').count() && await page.locator('.side.mine .turn-btn:not(:disabled)').count()) return;
        await page.waitForTimeout(150);
      }
      throw new Error('Match did not return control');
    };
    await ready();
    if(process.env.NEXT_BATTLE_LOSS) {
      for(let turn=0;turn<5 && !(await page.locator('.next-battle-result').count());turn++) {
        await page.locator('.side.mine .turn-btn').click(); await pump(); await ready();
        await page.locator('.side.mine .turn-btn').click();
        await page.getByRole('button',{name:'End Anyway',exact:true}).click();
        await pump();
      }
      await page.waitForSelector('.next-battle-result');
      assert.match(await page.locator('.next-battle-result').innerText(),/another chance/i);
      await page.getByRole('button',{name:'Try Again',exact:true}).click();
      await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      console.log('PASS loss: End Anyway, keep all defense cards, real defeat, retry');
      await ctx.close();continue;
    }
    assert.equal(await page.locator('.practice-target').count(),0);
    await page.locator('.next-hint').click();assert.equal(await page.locator('.practice-target').count(),0);
    await page.locator('.next-hint').click();await page.locator('.next-hint').click();
    await page.waitForSelector('.practice-target');
    const box=await page.locator('.next-battle-coach').boundingBox();
    assert(box && box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+1 && box.y+box.height<=viewport.height+1);
    await page.screenshot({path:`.tmp/next-battle-${viewport.width}.png`});
    await page.getByRole('button',{name:'Minimize',exact:true}).click();
    await page.locator('.next-battle-restore').click();
    // Choose a different Ally first. Advice never restricts play.
    const call=async(name,slot)=>{
      const card=page.locator(`.hand-card[aria-label*="${name}"]`).first();
      await card.hover();await card.click();
      await page.locator(`.mat:not(.foe) .slot[data-slot="${slot}"]`).click();await pump();await ready();
    };
    await call('Ammani',3);await call('Nanolay',0);
    const action=page.locator('.hand-card[aria-label*="Wedding"]').first();
    await action.hover();await action.click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await action.hover();await action.click();
    await page.getByRole('button',{name:'Cast · 2 Energy',exact:true}).click();await pump();await ready();
    await page.locator('.side.mine .turn-btn').click();await pump();await ready();
    await page.locator('.side.mine .turn-btn').click();
    await page.getByRole('button',{name:'Keep Playing',exact:true}).click();await ready();
    const attack=async(slot)=>{
      await page.locator(`.mat:not(.foe) .slot${slot==='persona'?'.persona':`[data-slot="${slot}"]`} .card`).click();
      await page.locator('.mat.foe .slot.persona .card').click();await pump();
    };
    for(let turn=0;turn<6 && !(await page.locator('.next-battle-result').count());turn++) {
      for(const slot of ['0','3','persona']) {
        if(await page.locator('.next-battle-result').count()) break;
        await attack(slot);
      }
      if(await page.locator('.next-battle-result').count()) break;
      await ready();await page.locator('.side.mine .turn-btn').click();await pump();await ready();
      await page.locator('.side.mine .turn-btn').click();await pump();await ready();
    }
    await page.waitForSelector('.next-battle-result');
    assert.match(await page.locator('.next-battle-result').innerText(),/winning choices/i);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${viewport.width}x${viewport.height}: optional hints, alternate call, minimize, cancel, turn warning, defense and real win`);
    await ctx.close();
  }
}catch(error){if(page&&!page.isClosed()){console.error(await page.locator('body').innerText());await page.screenshot({path:'.tmp/next-battle-failure.png'});}throw error;}
finally{await browser.close();}
