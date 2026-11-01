// In-memory fixtures only: never edit notes or call production APIs.
const {chromium}=require('playwright-core');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8091';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [1600,390,320])for(const lang of ['', 'zh/']){
   const context=await browser.newContext({viewport:{width,height:900}});
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   await context.route('**/data/blog.json',r=>r.fulfill({json:[{file:'math-fixture',title:'Math',date:'2000-01-01',categories:['notes']}]}));
   await context.route('**/blogs/math-fixture.md',r=>r.fulfill({body:fs.readFileSync('tests/fixtures/markdown-math.md','utf8')}));
   const page=await context.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
   await page.goto(`${base}/${lang}blog-post.html?p=math-fixture`);
   await page.locator('#post-content .katex').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.katex').count(),10);assert.equal(await page.locator('.katex-error').count(),0);
   assert.equal(await page.locator('.reading-toc a').count(),2);
   const blocks=page.locator('.blog-math-display');
   assert.equal(await blocks.count(),4);
   const centered=await blocks.first().evaluate(el=>{const outer=el.getBoundingClientRect(),inner=el.querySelector('.katex-html').getBoundingClientRect();return Math.abs((inner.left+inner.right)-(outer.left+outer.right))<4;});assert(centered,'short display math is centered');
   if(width<500){const long=blocks.last();assert(await long.evaluate(el=>el.scrollWidth>el.clientWidth));await long.evaluate(el=>el.scrollLeft=100);assert(await long.evaluate(el=>el.scrollLeft>0));}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'article stays within viewport');
   await page.evaluate(()=>{document.documentElement.dataset.blogTheme='dark';document.querySelector('#post-content').style.fontSize='22px';});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'max font and dark mode stay within viewport');
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   console.log(`PASS math ${lang||'en/'} ${width}px`);await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
