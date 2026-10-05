import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:3000';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const newRoom=async()=> (await (await fetch(base+'/api/rooms',{method:'POST'})).json());
try {
  const room=await newRoom();
  for(const [name,path] of [['home','/'],['lobby',room.lobby]]) {
    for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['phone',390,844],['small',320,568],['landscape',844,390]]) {
      const page=await browser.newPage({viewport:{width,height}});
      const errors=[];page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base+path);await page.evaluate(()=>document.fonts.ready);
      if(name==='lobby')await page.getByRole('button',{name:'Join Player 1 · Coral'}).waitFor();
      await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} ${label} overflow`);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`test-results/cleanup-${name}-${label}.png`,fullPage:true});
      if(name==='home') {
        const image=await page.locator('.hero img').evaluate(el=>({src:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight}));
        assert.match(image.src,/banner-\d+\.webp$/);assert.ok(image.width>0);
        assert.equal(await page.locator('.steps').innerText().then(s=>/grab|fling|gentle shove/i.test(s)),false);
      }
      await page.close();
    }
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base);
  for(const invalid of ['', 'XYZ123', '🔥🔥', '你好', 'مرحبا']) {
    await page.locator('#code').fill(invalid);await page.locator('#watch').click();
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(await page.locator('#code').getAttribute('aria-invalid'),'true');
    assert.match(await page.locator('#joinstatus').innerText(),/six-character/);
  }
  await page.locator('#code').fill('abcdef');
  await page.route('**/api/rooms/ABCDEF',route=>route.fulfill({status:404,body:'Room expired'}));
  await page.locator('#code').press('Enter');await page.waitForFunction(()=>document.querySelector('#joinstatus').textContent.includes('closed'));
  assert.equal(await page.locator('#code').inputValue(),'ABCDEF');
  await page.unroute('**/api/rooms/ABCDEF');
  for(const [status,match] of [[429,/Too many/],[503,/No space/],[500,/Could not create/]]) {
    await page.route('**/api/rooms',route=>route.fulfill({status,body:'Unavailable'}));
    await page.locator('#create').click();await page.waitForFunction(()=>!document.querySelector('#create').disabled);
    assert.match(await page.locator('#createstatus').innerText(),match);await page.unroute('**/api/rooms');
  }
  await page.route('**/api/rooms',route=>route.abort('internetdisconnected'));
  await page.locator('#create').click();await page.waitForFunction(()=>!document.querySelector('#create').disabled);
  assert.match(await page.locator('#createstatus').innerText(),/Check your connection/);await page.unroute('**/api/rooms');
  let submissions=0,complete;
  await page.route('**/api/rooms',async route=>{submissions++;await new Promise(resolve=>complete=resolve);await route.fulfill({status:503,body:'Unavailable'});});
  await page.locator('#create').click();await page.waitForFunction(()=>document.querySelector('#create').disabled);
  await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector('#create').click();});
  assert.equal(submissions,1);complete();await page.waitForFunction(()=>!document.querySelector('#create').disabled);await page.unroute('**/api/rooms');
  await page.locator('#code').fill(room.id.toLowerCase());await page.locator('#code').press('Enter');await page.waitForURL('**/room/'+room.id);
  await page.getByRole('button',{name:'Join Player 1 · Coral'}).waitFor();
  assert.equal(await page.locator('#roomstatus').getAttribute('role'),'status');
  await page.route('**/claim?slot=0',route=>route.fulfill({status:409,body:'Claimed'}));
  await page.locator('#p0').click();await page.waitForFunction(()=>document.querySelector('#roomstatus').textContent.includes('just claimed'));
  assert.equal(new URL(page.url()).pathname,room.lobby);await page.unroute('**/claim?slot=0');
  await page.route('**/claim?slot=0',route=>route.abort('internetdisconnected'));
  await page.locator('#p0').click();await page.waitForFunction(()=>document.querySelector('#roomstatus').textContent.includes('confirm'));
  await page.unroute('**/claim?slot=0');
  await page.route('**/api/rooms/'+room.id,route=>route.abort('internetdisconnected'));
  await page.reload();await page.locator('#retry').waitFor({state:'visible'});
  assert.equal(await page.locator('#p0').isDisabled(),true);await page.unroute('**/api/rooms/'+room.id);
  await page.locator('#retry').click();await page.waitForFunction(()=>!document.querySelector('#p0').disabled);
  const storagePage=await browser.newPage();await storagePage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked');}}));
  await storagePage.goto(base+room.lobby);await storagePage.waitForFunction(()=>!document.querySelector('#p0').disabled);
  await storagePage.locator('#p0').click();assert.match(await storagePage.locator('#roomstatus').innerText(),/Allow site storage/);
  assert.equal((await (await fetch(base+'/api/rooms/'+room.id)).json()).claimed[0],false);await storagePage.close();
  const expired=await browser.newPage();const response=await expired.goto(base+'/room/000000');assert.equal(response.status(),404);
  assert.equal(await expired.getByRole('link',{name:'Back to home / new rink'}).count(),1);
  await expired.getByRole('link',{name:'Back to home / new rink'}).click();assert.equal(new URL(expired.url()).pathname,'/');await expired.close();
  await page.goto(base);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% home reflow');
  await page.screenshot({path:'test-results/cleanup-home-text200.png',fullPage:true});
  await page.goto(base+room.lobby);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% lobby reflow');
  await page.screenshot({path:'test-results/cleanup-lobby-text200.png',fullPage:true});
  await page.close();
  const asset=await fetch(base+'/banner-400.webp');assert.equal(asset.headers.get('content-type'),'image/webp');
  assert.equal((await fetch(base+'/banner-400.webp',{headers:{'If-None-Match':asset.headers.get('etag')}})).status,304);
  console.log('PASS: homepage/lobby five viewport sizes; image loading; no JS errors/overflow; 200% text reflow; invalid/Unicode codes; lowercase Enter join; missing rooms; 429/503/500/offline recovery; duplicate-create guard; claim conflict/network failure; polling retry; blocked storage; styled expired-room recovery; WebP/cache revalidation.');
} finally {await browser.close();}
