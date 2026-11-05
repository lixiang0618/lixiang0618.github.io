const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8096';
const stamp=new Date().toISOString(),location={country:'Singapore',region:'',city:'Singapore',district:'Jurong West',updated_at:stamp};
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const width of [375,1440])for(const file of ['index.html','index-mobile.html','zh/index.html','zh/index-mobile.html']){
  const c=await browser.newContext({viewport:{width,height:1000},timezoneId:'Asia/Singapore'});await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const status of ['active','paused','stale','unavailable','network']){
   await c.route('https://api.lxiang.cc/api/location',r=>status==='network'?r.abort():r.fulfill({json:{success:true,status,location}}));
   await p.goto(base+'/'+file,{waitUntil:'domcontentloaded'});const expected=['unavailable','network'].includes(status)?'hidden':status;
   await p.waitForFunction(s=>document.querySelector('[data-profile-location]')?.dataset.state===s,expected);
   const zh=file.startsWith('zh/'),root=p.locator('[data-profile-location]');
   assert.equal(await root.getAttribute('aria-busy'),'false');const text=await root.textContent();
   if(status==='active'){
    assert(text.includes('Singapore · Jurong West'));assert(!text.includes('Singapore · Singapore'));
    const actual=await root.locator('time').textContent(),expectedTime=await p.evaluate(({stamp,zh})=>zh?'刚刚':'Just now',{stamp,zh});assert.equal(actual,expectedTime);
    const metrics=await root.evaluate(n=>{const r=n.getBoundingClientRect(),icon=n.querySelector('svg').getBoundingClientRect(),email=n.closest('.hero-text').querySelector('.profile-email-icon').getBoundingClientRect(),e=n.closest('.hero-text').querySelector('.profile-contact').getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,icon:icon.left,email:email.left,gap:r.top-e.bottom};});
    assert(metrics.left>=0&&metrics.right<=metrics.width);if(width<980)assert(Math.abs((metrics.left+metrics.right)/2-width/2)<2,'card centered independently');assert(metrics.gap>=16,'independent email spacing');
    await root.screenshot({path:`/tmp/location-${width}-${file.replaceAll('/','-')}.png`});
   }else {assert(!text.includes('Singapore'));assert.equal(await root.locator('.profile-location-updated').isVisible(),false);}
   assert.equal(await p.locator('a[href="mailto:leisoeng618@gmail.com"]').count(),1);assert.deepEqual(errors,[]);
   await c.unroute('https://api.lxiang.cc/api/location');
  }
  console.log('PASS five states, email alignment, localized time',width,file);await c.close();
 }
 // Hold the response to compare reserved loading geometry with the final state.
 const c=await browser.newContext({viewport:{width:390,height:900},timezoneId:'America/New_York'});await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());let complete;const held=new Promise(resolve=>complete=resolve);
 await c.route('https://api.lxiang.cc/api/location',async r=>{await held;await r.fulfill({json:{success:true,status:'active',location}});});const p=await c.newPage();await p.goto(base+'/index-mobile.html',{waitUntil:'domcontentloaded'});
 const root=p.locator('[data-profile-location]'),before=await root.evaluate(n=>({height:n.getBoundingClientRect().height}));assert.equal(await root.getAttribute('aria-busy'),'true');complete();await p.waitForFunction(()=>document.querySelector('[data-profile-location]').dataset.state==='active');const after=await root.evaluate(n=>({height:n.getBoundingClientRect().height}));assert.equal(before.height,after.height,'loading slot does not resize');
 const expected=await p.evaluate(stamp=>new Intl.DateTimeFormat('en',{dateStyle:'full',timeStyle:'long'}).format(new Date(stamp)),stamp);assert.equal(await root.locator('time').getAttribute('title'),expected);await c.close();
 const timed=await browser.newContext();await timed.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await timed.route('https://api.lxiang.cc/api/location',()=>new Promise(()=>{}));const page=await timed.newPage();await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-profile-location]').dataset.state==='hidden',null,{timeout:8000});assert(await page.locator('.hero-text h1').isVisible());await timed.close();
 console.log('PASS loading reservation, second timezone, six-second browser timeout');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
