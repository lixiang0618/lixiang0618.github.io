// Real browser checks. Test articles/API responses are in-memory; no content is edited.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8094';
const filler='Paragraph for reading position. '.repeat(150);
const fixture=`## Start\n\n${filler}\n\n### Parent\n\n${filler}\n\n#### 1.2.4 双塔模型 Dual Tower Model\n\n${filler}\n\n##### Deep five\n\n${filler}\n\n###### Deep six\n\n${filler}\n\n### Other branch\n\n#### Other child\n\n${filler}\n\n## Duplicate\n\n${filler}\n\n## Duplicate\n\n${filler}`;
const h4='section-1-2-4-双塔模型-dual-tower-model';
async function context(browser,options={}){
 const c=await browser.newContext(options);await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());return c;
}
async function articles(c,body=fixture){
 await c.route('**/data/blog.json',r=>r.fulfill({json:['fixture','second'].map(file=>({file,title:'Fixture',date:'2026-01-01',categories:['notes']}))}));
 await c.route('**/blogs/*.md',r=>r.fulfill({body}));
}
async function loaded(p,url){await p.goto(url);await p.locator('#post-content h6').waitFor();await p.waitForTimeout(2000);}
async function aligned(p,id,offset=0){
 const delta=await p.evaluate(({id,offset})=>{const h=document.getElementById(id),header=document.querySelector('.site-header').getBoundingClientRect().height;return h.getBoundingClientRect().top-header-8+offset;},{id,offset});assert(Math.abs(delta)<4,`aligned ${id}: ${delta}`);
}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const brandMetrics=[];
  if(!process.env.READING_ONLY)for(const width of [375,390,430,1600])for(const lang of ['', 'zh/']){
   const c=await context(b,{viewport:{width,height:960}}),p=await c.newPage();
   for(const file of ['index.html','index-mobile.html','about.html','blog.html','blog-post.html?p=Python','moments.html','404.html']){
    await p.goto(`${base}/${lang}${file}`);await p.locator('.site-brand-logo').waitFor();await p.locator('.site-brand-logo').evaluate(img=>img.decode());
    const m=await p.locator('.site-brand-logo').evaluate(img=>{const r=img.getBoundingClientRect(),h=img.closest('header').getBoundingClientRect(),nav=img.closest('header').querySelector('nav').getBoundingClientRect();return{width:r.width,height:r.height,src:img.getAttribute('src'),alt:img.alt,href:img.parentElement.getAttribute('href'),inside:r.left>=h.left&&r.right<=h.right&&r.top>=h.top&&r.bottom<=h.bottom,overlap:!(r.right<=nav.left||r.left>=nav.right||r.bottom<=nav.top||r.top>=nav.bottom)};});
    assert(m.inside&&!m.overlap,JSON.stringify({file,lang,width,m}));assert.equal(m.href,lang?'/zh/index.html':'/index.html');assert.equal(m.alt,'Xiangology');assert.equal(m.width,width<=700?140:168);
    if(file==='index.html'||file==='blog.html'){await p.screenshot({path:`/tmp/branding-${width}-${lang?'zh':'en'}-${file}.png`});brandMetrics.push({width,lang,file,...m});}
   }
   await c.close();console.log('PASS brand routes',width,lang||'en');
  }
  fs.writeFileSync('/tmp/branding-metrics.json',JSON.stringify(brandMetrics,null,2));
  for(const width of [390,1600])for(const lang of ['', 'zh/']){
   const c=await context(b,{viewport:{width,height:960}});await articles(c);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const url=`${base}/${lang}blog-post.html?p=fixture`,key='lx_blog_position:fixture';await loaded(p,url);
   assert.equal(await p.evaluate(()=>scrollY),0,'first visit starts at top');
   const links=p.locator('.reading-toc a');assert.equal(await links.count(),9);assert.equal(await p.locator('.reading-heading-copy').count(),9);
   assert(await p.locator('[id="toc-section-start"]').evaluate(n=>!n.hidden));assert(await p.locator('[id="toc-section-parent"]').evaluate(n=>n.hidden));
   assert.equal(await p.locator('[id="section-duplicate-2"]').count(),1);
   // Open unrelated branch manually; scrollspy must preserve it.
   await p.locator('.reading-toc').evaluate(n=>n.open=true);
   await p.locator('[aria-controls="toc-section-other-branch"]').click();
   await p.evaluate(id=>window.scrollTo({top:document.getElementById(id).getBoundingClientRect().top+scrollY-document.querySelector('header').offsetHeight-8+45,behavior:'instant'}),h4);
   await p.waitForFunction(id=>document.querySelector('.reading-toc [aria-current]')?.dataset.heading===id,h4);
   assert(await p.locator('[id="toc-section-parent"]').evaluate(n=>!n.hidden));assert(await p.locator('[id="toc-section-other-branch"]').evaluate(n=>!n.hidden));
   await p.waitForTimeout(1100);const record=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(record.headingId,h4);assert(Math.abs(record.offset-45)<4,JSON.stringify(record));
   await p.reload();await p.locator('#post-content h6').waitFor();await p.waitForTimeout(2100);await aligned(p,h4,45);
   // Hash wins over stored record, including direct H5/H6 links and history.
   await loaded(p,url+'#section-deep-five');await aligned(p,'section-deep-five');
   await p.locator('.reading-toc').evaluate(n=>n.open=true);
   await p.locator('[aria-controls="toc-section-deep-five"]').click();
   await p.locator('.reading-toc a[data-heading="section-deep-six"]').click();await aligned(p,'section-deep-six');
   await p.goBack();await p.waitForTimeout(100);await aligned(p,'section-deep-five');await p.goForward();await p.waitForTimeout(100);await aligned(p,'section-deep-six');
   await p.evaluate(()=>{window.copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});});
   await p.locator('[id="section-deep-six"] .reading-heading-copy').click();
   const copied=new URL(await p.evaluate(()=>window.copied));assert.equal(copied.searchParams.get('p'),'fixture');assert.equal(decodeURIComponent(copied.hash),'#section-deep-six');assert.equal(copied.pathname,'/'+lang+'blog-post.html');
   assert.equal(await p.locator('[id="section-deep-six"] .reading-heading-copy').getAttribute('data-feedback'),lang?'已复制':'Copied');
   await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});document.execCommand=()=>false;});
   await p.locator('[id="section-deep-six"] .reading-heading-copy').click();assert((await p.locator('.reading-share input').inputValue()).includes('p=fixture#section-deep-six'));await p.locator('.reading-share button').click();
   await loaded(p,url+'#'+encodeURIComponent(h4));await aligned(p,h4);await p.reload();await p.locator('#post-content h6').waitFor();await p.waitForTimeout(2100);await aligned(p,h4);
   // Another article has its own state; invalid hashes do not consult memory.
   await loaded(p,`${base}/${lang}blog-post.html?p=second`);assert.equal(await p.evaluate(()=>scrollY),0);
   await loaded(p,url+'#invalid-heading');assert.equal(await p.evaluate(()=>scrollY),0);
   await p.evaluate(k=>localStorage.setItem(k,JSON.stringify({headingId:'removed',offset:500})),key);await loaded(p,url);assert.equal(await p.evaluate(()=>scrollY),0);
   assert.deepEqual(errors,[]);console.log('PASS nested TOC/memory/hash/copy/history',width,lang||'en');await c.close();
  }
  // Real old shared link, without fixture metadata or content.
  const c=await context(b),p=await c.newPage();await p.goto(`${base}/blog-post.html?p=SAR_Note#${encodeURIComponent(h4)}`);await p.locator(`[id="${h4}"]`).waitFor();await p.waitForTimeout(2200);await aligned(p,h4);await c.close();
  console.log('PASS real SAR_Note legacy H4 link');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
