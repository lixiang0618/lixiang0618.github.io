const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8098';
const location={country:'Singapore',city:'Singapore',region:'',district:'Jurong West',updated_at:new Date(Date.now()-6*3600000).toISOString()};
async function context(b,options={}){const c=await b.newContext(options);await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await c.route('https://api.lxiang.cc/api/location',r=>r.fulfill({json:{success:true,status:'active',location}}));return c;}
function equal(a,b,label,tolerance=1){assert(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const homeMeasurements=[];
 for(const width of [375,430,768,1440]){
  for(const mobile of [false,true]){
   const pair=[];
   for(const lang of ['', 'zh/']){
    const c=await context(b,{viewport:{width,height:1000}}),p=await c.newPage();const file=lang+(mobile?'index-mobile.html':'index.html');
    await p.goto(base+'/'+file,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('[data-profile-location]')?.dataset.state==='active');await p.evaluate(()=>document.fonts.ready);
    const metrics=await p.evaluate(()=>{
     const hero=document.querySelector('.hero'),hr=hero.getBoundingClientRect(),rect=s=>{const r=hero.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y-hr.y,w:r.width,h:r.height}};
     const boxes=s=>[...hero.querySelectorAll(s)].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});
     return{portrait:rect('.hero-img'),text:rect('.hero-text'),chips:rect('.chips'),social:rect('.social-links'),contact:rect('.profile-contact'),card:rect('.profile-location'),keywords:boxes('.chip'),links:boxes('.social-link'),hero:hr.width,inner:innerWidth,scroll:document.documentElement.scrollWidth,logo:document.querySelector('.site-brand-logo').getBoundingClientRect().width};
    });
    assert.equal(metrics.scroll,metrics.inner,'homepage document width');
    assert.equal(metrics.keywords.length,4);assert.equal(metrics.links.length,4);
    equal(metrics.portrait.w,metrics.portrait.h,'round portrait');
    if(metrics.text.w<=460){equal(metrics.links[0].y,metrics.links[1].y,'social row 1');equal(metrics.links[2].y,metrics.links[3].y,'social row 2');assert(metrics.links[2].y>metrics.links[0].y);}else for(const link of metrics.links)equal(link.y,metrics.links[0].y,'desktop social row');
    equal(metrics.logo,width<=700?140:168,'logo width');assert(metrics.card.x>=15);assert(metrics.card.x+metrics.card.w<=width-15);
    if(width<=980)equal(metrics.card.x+metrics.card.w/2,width/2,'centered card');
    const currentLinks=await p.locator('.hero-text .social-link').evaluateAll(nodes=>nodes.map(n=>n.href));
    const {JSDOM}=require('jsdom'),before=new JSDOM(execFileSync('git',['show','origin/main:'+file],{encoding:'utf8'}),{url:base+'/'+file});assert.deepEqual(currentLinks,[...before.window.document.querySelectorAll('.hero-text .social-link')].map(n=>n.href));
    assert.deepEqual(await p.locator('.chip-label').allTextContents(),[...before.window.document.querySelectorAll('.chip-label')].map(n=>n.textContent));before.window.close();
    assert((await p.locator('.profile-location time').textContent()).includes(lang?'6小时':'6 hours'));
    assert.equal(await p.locator('.profile-location-dot').evaluate(n=>getComputedStyle(n).animationDuration),'4s');
    await p.locator('.hero').screenshot({path:`/tmp/ui-home-${width}-${lang?'zh':'en'}-${mobile?'mobile':'desktop'}.png`});pair.push(metrics);homeMeasurements.push({width,lang,mobile,...metrics});await c.close();
   }
   for(const m of pair)for(const key of ['chips','social','contact','card'])equal(m[key].x+m[key].w/2,m.text.x+m.text.w/2,`homepage center ${width} ${key}`,2);
   equal(pair[0].portrait.w,pair[1].portrait.w,'bilingual avatar width');equal(pair[0].portrait.h,pair[1].portrait.h,'bilingual avatar height');
  }
  const c=await context(b,{viewport:{width,height:1000}}),p=await c.newPage();
  for(const lang of ['', 'zh/'])for(const name of ['index.html','index-mobile.html','about.html','blog.html','blog-post.html?p=Python','moments.html','404.html','lab.html']){
   await p.goto(base+'/'+lang+name,{waitUntil:'domcontentloaded'});await p.locator('.site-brand-logo').evaluate(n=>n.decode());
   const nav=p.locator('.site-header .site-nav');const urls=await nav.locator('a').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));assert.deepEqual(urls.slice(0,4),['index','lab','blog','moments'].map(file=>'/'+lang+file+'.html'));
   assert.equal(await nav.locator('.nav-beta').count(),1);assert.equal(await p.locator('.site-brand-logo').getAttribute('src'),'/assets/branding/xiangology.svg');
   assert(await nav.locator('a').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})),'nav bounds');
   const rectangles=await nav.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){const a=rectangles[i],d=rectangles[j];assert(a.right<=d.left+.5||d.right<=a.left+.5||a.bottom<=d.top+.5||d.bottom<=a.top+.5,'nav overlap');}
   if(name==='lab.html'){
    assert.equal((await p.locator('main h1').textContent()).trim(),lang?'探索的游乐场.':'The Playground.');assert.equal(await p.locator('.project-card').count(),5);assert.equal(await p.locator('.concept-card').count(),3);assert.equal(await p.locator('.experiment-lock').count(),0);assert.equal(await p.locator('main input').count(),0);
    assert.equal(await p.locator('link[rel="canonical"]').getAttribute('href'),'https://lxiang.cc/'+lang+'lab.html');assert.equal(await p.locator('link[hreflang]').count(),3);
    assert.equal(await p.locator('.lab-sketch').count(),5);await p.locator('[data-lab-theme]').click();assert.equal(await p.locator('html').getAttribute('data-blog-theme'),'dark');assert.equal(await p.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(37, 35, 32)');await p.screenshot({path:`/tmp/ui-lab-${width}-${lang?'zh':'en'}-dark.png`});
    const switchLink=p.locator('.lab-options a');assert.equal(await switchLink.getAttribute('href'),lang?'/lab.html':'/zh/lab.html');await p.locator('[data-lab-theme]').click();assert.equal(await p.locator('html').getAttribute('data-blog-theme'),'light');
   }
  }
  await c.close();console.log('PASS homepage parity, grids, navigation, Lab',width);
 }
 fs.writeFileSync('/tmp/ui-home-measurements.json',JSON.stringify(homeMeasurements,null,2));
 // Sibling headings with/without children occupy the exact same text column.
 const markdown='## Top\n\n### Leaf A\n\ntext\n\n### Parent\n\n#### Child\n\n'+'Text '.repeat(500)+'\n\n### Leaf B\n\nend';
 for(const width of [375,430,768,1440])for(const lang of ['', 'zh/']){
  const c=await context(b,{viewport:{width,height:1000}});await c.route('**/data/blog.json',r=>r.fulfill({json:[{file:'align',title:'Alignment',date:'2026-01-01',categories:['notes']}]}));await c.route('**/blogs/align.md',r=>r.fulfill({body:markdown}));const p=await c.newPage();await p.goto(base+'/'+lang+'blog-post.html?p=align');await p.locator('.reading-toc a').first().waitFor({state:'attached'});await p.locator('.reading-toc').evaluate(n=>n.open=true);
  const x=async id=>p.locator(`.reading-toc a[data-heading="section-${id}"]`).evaluate(n=>n.getBoundingClientRect().left);
  const start=await x('leaf-a');equal(start,await x('parent'),'leaf/parent');equal(start,await x('leaf-b'),'leaf/leaf');await p.locator('[aria-controls="toc-section-parent"]').click();equal(start,await x('parent'),'expanded');await p.locator('.reading-toc a[data-heading="section-child"]').click();await p.waitForTimeout(80);assert.equal(decodeURIComponent(new URL(p.url()).hash),'#section-child');const bounds=await p.locator('#section-child').boundingBox();assert(bounds.y>=await p.locator('.site-header').evaluate(n=>n.getBoundingClientRect().height));
  await c.close();console.log('PASS TOC alignment and jump',width,lang||'en');
 }
 const reduced=await context(b,{reducedMotion:'reduce'}),p=await reduced.newPage();await p.goto(base+'/lab.html');assert.equal(await p.locator('main').evaluate(n=>n.getAnimations({subtree:true}).length),0);await p.goto(base+'/index.html');await p.waitForFunction(()=>document.querySelector('[data-profile-location]').dataset.state==='active');assert.equal(await p.locator('.profile-location-dot').evaluate(n=>n.getAnimations().length),0);await p.evaluate(()=>document.documentElement.dataset.blogTheme='dark');assert.equal(await p.locator('.profile-location').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');await reduced.close();console.log('PASS reduced motion and Quiet Card dark theme');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
