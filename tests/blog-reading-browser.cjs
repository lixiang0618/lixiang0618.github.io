// Run against the local static server on :8091. Every production API request is mocked.
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const width of [1600,1440,1366,1200,1024,820,768,390,320])for(const lang of ['en','zh']){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
  await context.route('https://api.lxiang.cc/**',async route=>{const u=new URL(route.request().url());await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,content_type:'blog',content_id:u.searchParams.get('id'),likes:2,liked:false,count:2,comments:[{id:'root',parent_id:null,nickname:'Reader',body:'Mock reading discussion',created_at:'2026-10-30 12:00:00',edit_count:0},{id:'reply',parent_id:'root',reply_to_id:'root',nickname:'Visitor',body:'Mock reply',created_at:'2026-10-30 12:01:00',edit_count:0},{id:'deleted',parent_id:'root',status:'deleted',nickname:'REDACTED',body:'REDACTED'}]})});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const prefix=lang==='zh'?'/zh/':'/';
  await page.goto('http://127.0.0.1:8091'+prefix+'blog-post.html?p=Hot100');await page.locator('.reading-toc a').first().waitFor({state:'attached'});
  const metrics=await page.evaluate(()=>{const content=document.querySelector('#post-content'),s=getComputedStyle(content);return{width:content.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight)/parseFloat(s.fontSize),columns:getComputedStyle(document.querySelector('.reading-layout')).gridTemplateColumns,navFont:getComputedStyle(document.querySelector('.site-nav')).fontSize,fieldFont:getComputedStyle(document.querySelector('.blog-comment-form textarea')).fontSize,header:document.querySelector('.site-header').getBoundingClientRect().height};});
  assert.equal(metrics.font,16);assert(Math.abs(metrics.line-1.8)<.01);if(width>=900)assert.equal(metrics.width,662);assert.equal(metrics.columns==='none',width<1440);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width<1440){assert(!(await page.locator('.reading-toc').evaluate(n=>n.open)));await page.locator('.reading-tools > summary').click();}
  // Proportional bounds and spacing affect article prose only.
  const up=page.getByRole('button',{name:lang==='zh'?'放大正文字号':'Increase article font size',exact:true});
  while(await up.isEnabled())await up.click();
  assert.equal(await page.locator('#post-content').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),22);
  await page.locator('.reading-tools select').selectOption('relaxed');
  assert(Math.abs(await page.locator('#post-content').evaluate(n=>parseFloat(getComputedStyle(n).lineHeight)/parseFloat(getComputedStyle(n).fontSize))-2.1)<.01);
  assert.equal(await page.locator('.site-nav').evaluate(n=>getComputedStyle(n).fontSize),metrics.navFont);
  assert.equal(await page.locator('.blog-comment-form textarea').evaluate(n=>getComputedStyle(n).fontSize),metrics.fieldFont);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:lang==='zh'?'深色模式':'Dark mode',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-blog-theme'),'dark');
  assert.equal(await page.locator('#post-content').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(48, 45, 41)');
  assert.equal(await page.locator('.blog-deleted').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(56, 52, 46)');assert(!(await page.locator('.blog-discussion').textContent()).includes('REDACTED'));
  const share=page.getByRole('button',{name:lang==='zh'?'分享文章':'Share article',exact:true});await share.click();
  const dialog=page.locator('.reading-share'),url=dialog.locator('input');assert.equal(await url.inputValue(),'https://lxiang.cc'+prefix+'blog-post.html?p=Hot100');
  await dialog.getByRole('button',{name:lang==='zh'?'微信':'WeChat',exact:true}).click();assert((await dialog.locator('.reading-qr path').getAttribute('d')).length>100);
  const x=new URL(await dialog.locator('a').getAttribute('href'));assert.equal(x.searchParams.get('url'),await url.inputValue());
  await dialog.getByRole('button',{name:lang==='zh'?'小红书':'Xiaohongshu',exact:true}).click();assert((await dialog.locator('textarea').inputValue()).includes('https://lxiang.cc'));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
  await dialog.getByRole('button',{name:lang==='zh'?'复制链接':'Copy link',exact:true}).click();assert((await dialog.locator('.reading-status').textContent()).includes(lang==='zh'?'已复制':'Copied'));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
  await dialog.getByRole('button',{name:lang==='zh'?'复制链接':'Copy link',exact:true}).click();assert((await dialog.locator('.reading-status').textContent()).includes(lang==='zh'?'手动':'Select and copy'));
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await share.evaluate(n=>n===document.activeElement));
  if(width===1600&&lang==='en'){const down=page.getByRole('button',{name:'Decrease article font size',exact:true});while(await down.isEnabled())await down.click();assert.equal(await page.locator('#post-content').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),14);while(await up.isEnabled())await up.click();}
  // Persist settings across a full reload; the theme is restored before styles paint.
  await page.reload();await page.locator('.reading-toc a').first().waitFor({state:'attached'});assert.equal(await page.locator('html').getAttribute('data-blog-theme'),'dark');
  assert.equal(await page.locator('#post-content').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),22);
  if(width<1440)await page.locator('.reading-toc > summary').click();
  const last=page.locator('.reading-toc a').last();await last.click();await page.waitForTimeout(120);
  assert.equal(await last.getAttribute('aria-current'),'location');
  const lastId=decodeURIComponent((await last.getAttribute('href')).slice(1));
  const top=await page.locator('[id="'+lastId+'"]').evaluate(n=>n.getBoundingClientRect().top);assert(top>=metrics.header-2);
  await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await page.waitForTimeout(80);
  assert.equal(await page.locator('.reading-progress-desktop').getAttribute('aria-valuenow'),'100');
  if(width<1440)assert.equal(await page.locator('.reading-progress-mobile').evaluate(n=>Math.round(n.getBoundingClientRect().top)),Math.round(metrics.header));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  if([1600,1024,390].includes(width)) {await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'/workspace/paper-'+lang+'-'+width+'.png'});}
  await page.goto('http://127.0.0.1:8091'+prefix+'blog.html');await page.locator('.blog-post').first().waitFor();assert.equal(await page.locator('.post-tag,.post-tags').count(),0);assert.equal(await page.locator('.blog-header p').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===1600)await page.screenshot({path:'/workspace/paper-list-'+lang+'.png'});
  console.log('PASS',lang,width,'layout / max font / dark / persistence / TOC / progress / sharing / no tags / no overflow');await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
