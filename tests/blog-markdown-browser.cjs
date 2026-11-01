// Tests the real fetch -> front matter -> GFM -> sanitizer -> TOC pipeline.
// Fixture metadata/content are routed in memory, never written under blogs/.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8091';
const posts=JSON.parse(fs.readFileSync('data/blog.json'));
const fixture=fs.readFileSync('tests/fixtures/markdown-gfm.md','utf8');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    for(const width of [1600,1024,390,320]) for(const language of ['', 'zh/']) {
      const context=await browser.newContext({viewport:{width,height:960},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
      await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
      await context.route('https://api.lxiang.cc/**',route=>{
        const url=new URL(route.request().url());
        return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,content_type:'blog',content_id:url.searchParams.get('id'),likes:0,liked:false,comments:[],count:0})});
      });
      await context.route('**/data/blog.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([...posts,
        {file:'markdown-fixture',title:'Markdown regression fixture',date:'2000-01-01',categories:['notes'],tags:['tests']}])}));
      await context.route('**/blogs/markdown-fixture.md',route=>route.fulfill({contentType:'text/markdown; charset=utf-8',body:fixture}));
      const page=await context.newPage(),errors=[],missing=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)missing.push(response.url());});
      await page.goto(`${base}/${language}blog-post.html?p=markdown-fixture`);
      await page.locator('.reading-toc a').first().waitFor({state:'attached'});
      const article=page.locator('#post-content');
      assert.equal(await article.locator('table').count(),1);
      assert.equal(await article.locator('thead th').count(),6);
      assert.equal(await article.locator('tbody td').count(),6);
      assert.equal(await article.locator('table').getAttribute('style'),null);
      assert.equal(await article.locator('th').nth(1).evaluate(el=>getComputedStyle(el).textAlign),'right');
      assert.equal(await article.locator('th').nth(2).evaluate(el=>getComputedStyle(el).textAlign),'center');
      assert.deepEqual(await article.locator('input[type="checkbox"]').evaluateAll(inputs=>inputs.map(input=>({checked:input.checked,disabled:input.disabled}))),
        [{checked:true,disabled:true},{checked:false,disabled:true},{checked:true,disabled:true}]);
      assert.equal(await article.locator('hr').count(),1);
      assert.equal(await article.locator('blockquote').count(),1);
      assert.equal(await article.locator('ol[start="3"] > li').count(),2);
      assert.equal(await article.locator('pre code').count(),2);
      assert.equal(await article.locator('code.language-c\\+\\+').count(),1);
      assert.equal(await article.locator('a').first().getAttribute('href'),base+'/blogs/Python.pdf');
      assert.equal(await article.locator('img').getAttribute('src'),base+'/blogs/Hot100_files/image_1.png');
      await page.waitForFunction(()=>document.querySelector('#post-content img').naturalWidth>0);
      assert.equal(await page.locator('.reading-toc a').count(),9);
      assert.deepEqual(await page.locator('.reading-toc li').evaluateAll(items=>items.map(item=>item.dataset.level)),['0','0','0','1','2','3','4','0','0']);
      assert.equal(await page.locator('.blog-heart button').count(),1);
      assert.equal(await page.locator('.blog-comment-form textarea').count(),1);
      const overflow=await article.locator('.markdown-table-scroll').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));
      if(width<500)assert(overflow.scroll>overflow.width,'wide table overflows its own scroll container');
      const table=article.locator('.markdown-table-scroll');
      await table.evaluate(el=>el.scrollLeft=100);
      if(overflow.scroll>overflow.width)assert(await table.evaluate(el=>el.scrollLeft>0));
      if(width<500) {
        const code=article.locator('pre').nth(1);
        assert(await code.evaluate(el=>el.scrollWidth>el.clientWidth),'long code scrolls inside pre');
        await code.evaluate(el=>el.scrollLeft=100);assert(await code.evaluate(el=>el.scrollLeft>0));
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must not overflow');
      if(width<1440)await page.locator('.reading-toc > summary').click();
      const deepest=page.locator('.reading-toc li[data-level="4"] a');
      await deepest.click();
      await page.waitForFunction(()=>document.querySelector('.reading-toc li[data-level="4"] a').getAttribute('aria-current')==='location');
      const target=decodeURIComponent((await deepest.getAttribute('href')).slice(1));
      assert.equal(new URL(page.url()).hash,'#'+encodeURIComponent(target));
      assert(await page.locator('[id="'+target+'"]').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom-2));
      // Direct scrolling also updates the existing active-heading calculation.
      await article.locator('h2').first().evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('.reading-toc a').getAttribute('aria-current')==='location');
      if(width<1440)await page.locator('.reading-tools > summary').click();
      const increase=page.getByRole('button',{name:language?'放大正文字号':'Increase article font size',exact:true});
      while(await increase.isEnabled())await increase.click();
      assert.equal(await article.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),22);
      await page.getByRole('button',{name:language?'深色模式':'Dark mode',exact:true}).click();
      assert.equal(await page.locator('html').getAttribute('data-blog-theme'),'dark');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at max font size/dark mode');
      if(process.env.MARKDOWN_ARTIFACT_DIR) {
        await table.evaluate(el=>el.scrollLeft=0);
        await article.locator('h2').first().evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
        await page.screenshot({path:path.join(process.env.MARKDOWN_ARTIFACT_DIR,`markdown-${language?'zh':'en'}-${width}.png`)});
      }
      // Real repository articles, not fixtures: title, PDF, media, code and TOC.
      if(width===1600||width===390)for(const post of posts) {
        await page.goto(`${base}/${language}blog-post.html?p=${encodeURIComponent(post.file)}`);
        await page.locator('.blog-heart button').waitFor();
        assert.equal(await page.locator('#post-title-text').textContent(),post.title);
        assert((await article.textContent()).trim().length>0);
        assert(!(await article.textContent()).includes('Error loading post'));
        if(post.file==='Hot100') {
          assert.equal(await article.locator('img').count(),17);
          assert.equal(await article.locator('pre code').count(),21);
          assert((await page.locator('.reading-toc a').count())>10);
        }
        if(post.file==='Python')assert.equal(await page.locator('#post-pdf iframe').getAttribute('src'),(language?'../':'./')+'blogs/Python.pdf');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),post.file+' no overflow');
      }
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
      console.log('PASS',language||'en/',width,'GFM / tables and code scroll / tasks / H1–H6 TOC and scroll highlight / max font / dark / real articles');
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
