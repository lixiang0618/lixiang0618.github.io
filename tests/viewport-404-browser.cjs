// Run with an external playwright-core and a static source/dist server.
// Unknown route responses below are hosting fixtures, NOT proof of deployed routing.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8093';
const fixture=fs.readFileSync('tests/fixtures/markdown-math.md','utf8')+'\n\n'+fs.readFileSync('tests/fixtures/markdown-gfm.md','utf8')+'\n\nLong inline $\\underbrace{'+Array(80).fill('a').join('+')+'}_{long}$ end.\n\n'+'```\n'+ 'very_long_code_'.repeat(80)+'\n```';
async function context(browser,options={}){
  const c=await browser.newContext(options);
  await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());return c;
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const width of [375,390,430,1600])for(const lang of ['', 'zh/'])for(const theme of ['light','dark']){
   const c=await context(browser,{viewport:{width,height:900},isMobile:width<500});
   await c.addInitScript(t=>localStorage.setItem('lx_blog_theme',t),theme);
   await c.route('**/data/blog.json',r=>r.fulfill({json:[{file:'fixture',title:'Layout fixture',categories:['notes'],date:'2026-01-01'}]}));
   await c.route('**/blogs/fixture.md',r=>r.fulfill({body:fixture}));
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(`${base}/${lang}blog-post.html?p=fixture`);await p.locator('.blog-math-inline.is-scrollable').waitFor();await p.evaluate(()=>document.fonts.ready);
   const metrics=await p.evaluate(()=>{
    const scrollable=[...document.querySelectorAll('.markdown-table-scroll,pre,.blog-math-display,.blog-math-inline.is-scrollable')].filter(e=>e.scrollWidth>e.clientWidth+2);
    return{width:innerWidth,scroll:document.documentElement.scrollWidth,bg:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,scrollers:scrollable.map(e=>{e.scrollLeft=50;return{class:e.className,scrolled:e.scrollLeft>0}}),short:document.querySelector('.blog-math-inline').className,viewport:document.querySelector('meta[name="viewport"]').content};
   });
   assert.equal(metrics.scroll,metrics.width);if(width<500)assert.equal(metrics.width,width);
   assert.equal(metrics.bg,metrics.body);assert(!metrics.short.includes('is-scrollable'),'short math keeps inline baseline');
   for(const cls of ['markdown-table-scroll','blog-math-display','blog-math-inline is-scrollable',''])assert(metrics.scrollers.some(s=>s.class===cls&&s.scrolled),`scrolls: ${cls}`);
   assert(!/user-scalable|maximum-scale|minimum-scale/.test(metrics.viewport));assert.deepEqual(errors,[]);
   await p.evaluate(()=>document.querySelector('#post-content').style.fontSize='22px');
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log('PASS overflow/table/code/math/themes',width,lang||'en',theme);await c.close();
  }
  for(const width of [375,390,430,1600])for(const lang of ['', 'zh/']){
   const c=await context(browser,{viewport:{width,height:900}}),p=await c.newPage();
   await p.goto(`${base}/${lang}404.html`);await p.locator('.nf-main').waitFor();
   assert(await p.locator('.nf-digit').evaluateAll(nodes=>nodes.every(n=>n.getAnimations()[0].playState==='running')),'automatic playback');
   assert.equal(await p.locator('.nf-digit').count(),3);assert.equal(await p.locator('.nf-links a').count(),2);
   assert.equal(await p.locator('html').getAttribute('lang'),lang?'zh-CN':'en');
   for(const a of await p.locator('.nf-links a').all())assert.equal((await c.request.get(new URL(await a.getAttribute('href'),base).href)).status(),200);
   const stages=[];
   for(const time of [0,2400,6000,8400,10800,13920,18000,21120,23500]){
    const sample=await p.evaluate(ms=>{for(const a of document.querySelector('.nf-main').getAnimations({subtree:true})){a.pause();a.currentTime=ms;}return{actors:[...document.querySelectorAll('.nf-digit')].map(n=>({transform:getComputedStyle(n).transform,opacity:getComputedStyle(n).opacity})),ghost:getComputedStyle(document.querySelector('.nf-ghost')).opacity,bubbles:[...document.querySelectorAll('.nf-bubble')].filter(n=>Number(getComputedStyle(n).opacity)>.5).map(n=>n.textContent),width:innerWidth,scroll:document.documentElement.scrollWidth};},time);
    assert.equal(sample.width,sample.scroll);stages.push(sample);
   }
   assert.equal(stages[6].actors[1].opacity,'0');assert(Number(stages[6].ghost)>.5);assert(stages[6].bubbles.some(s=>s.includes('0')));
   for(let i=0;i<3;i++)assert(new Set(stages.map(s=>s.actors[i].transform)).size>3,'each actor participates');
   assert(stages[7].bubbles.length);assert.equal(stages[8].actors[1].opacity,'1');
   await p.screenshot({path:`/tmp/lx-404-${lang?'zh':'en'}-${width}.png`,fullPage:true});
   await p.locator('.nf-pause').click();assert.equal(await p.locator('.nf-pause').getAttribute('aria-pressed'),'true');
   await p.locator('.nf-pause').click();
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert(await p.locator('.nf-main').evaluate(n=>n.classList.contains('is-paused')));
   console.log('PASS 404 six acts, links, pause, bounds',width,lang||'en');await c.close();
  }
  const reduced=await context(browser,{viewport:{width:375,height:812},reducedMotion:'reduce'}),r=await reduced.newPage();await r.goto(base+'/404.html');
  assert.equal(await r.locator('.nf-main').evaluate(n=>n.getAnimations({subtree:true}).length),0);assert(await r.locator('.nf-zero').isVisible());assert.equal(await r.locator('.nf-pause').isVisible(),false);await reduced.close();
  const noJS=await context(browser,{javaScriptEnabled:false,viewport:{width:375,height:812}}),fallback=await noJS.newPage();await fallback.goto(base+'/zh/404.html');assert(await fallback.locator('h1').isVisible());assert.equal(await fallback.locator('.nf-links a').count(),2);await noJS.close();
  const dark=await context(browser,{viewport:{width:390,height:844}});await dark.addInitScript(()=>localStorage.setItem('lx_blog_theme','dark'));const night=await dark.newPage();await night.goto(base+'/404.html');assert.equal(await night.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(37, 35, 32)');await dark.close();
  // Serve the same root file at deep unknown URLs, as Pages/Vercel fallbacks do.
  const c=await context(browser);for(const path of ['/abc','/random-page','/zh/not-exist','/blog/something-not-found']){
   await c.route(base+path,route=>route.fulfill({status:404,contentType:'text/html',body:fs.readFileSync('404.html','utf8')}));const p=await c.newPage();assert.equal((await p.goto(base+path)).status(),404);await p.locator('.nf-main').waitFor();assert.equal(p.url(),base+path);assert.equal(await p.locator('html').getAttribute('lang'),path.startsWith('/zh/')?'zh-CN':'en');await p.close();
  }await c.close();
  // Missing metadata entry / missing file differ from transient failures.
  for(const lang of ['', 'zh/'])for(const kind of ['missing-id','missing-file','file-500','network','metadata-404','no-query']){
   const c=await context(browser),p=await c.newPage();
   await c.route('**/data/blog.json',r=>kind==='metadata-404'?r.fulfill({status:404}):r.fulfill({json:kind==='missing-id'?[]:[{file:'fixture',title:'Fixture',categories:[]}]}));
   await c.route('**/blogs/fixture.md',r=>kind==='network'?r.abort():r.fulfill({status:kind==='missing-file'?404:500}));
   await p.goto(`${base}/${lang}blog-post.html`+(kind==='no-query'?'':'?p=fixture'));
   if(kind.startsWith('missing')||kind==='no-query'){await p.locator('.nf-main').waitFor();if(kind!=='no-query')assert(p.url().includes('?p=fixture'));}
   else {await p.waitForFunction(()=>/Error loading post|加载文章出错/.test(document.querySelector('#post-content').textContent));assert.equal(await p.locator('.nf-main').count(),0);}
   console.log('PASS article error classification',lang||'en',kind);await c.close();
  }
  console.log('PASS reduced motion and deep fallback fixtures');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
