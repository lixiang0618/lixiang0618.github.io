// Run with an external playwright-core installation and a static server on 8091.
// NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/butter-curtain-browser.cjs
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8091';

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    for(const mobile of [false,true]) for(const language of ['', 'zh/']) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile,
        ...(mobile?{userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36'}:{})});
      // External social images must not make local navigation timing nondeterministic.
      await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
      // Mock external interactions; these checks never mutate the production API.
      await context.route('https://api.lxiang.cc/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,likes:0,liked:false,comments:[],count:0})}));
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{
        addEventListener('pagereveal',event=>{
          window.curtainProbe={transition:!!event.viewTransition,type:navigation.activation?.navigationType,from:navigation.activation?.from?.key,intent:sessionStorage.getItem('lx_editorial_navigation')};
          if(!event.viewTransition) return;
          event.viewTransition.ready.then(()=>{
            const animations=document.getAnimations().filter(a=>a.animationName?.startsWith('editorial'));
            if(!animations.length) return;
            for(const animation of animations) {animation.pause();animation.currentTime=525;}
            window.curtainReady=true;
          }).catch(error=>{window.curtainProbe.error=error.message;});
        });
      });
      const profile=mobile?'index-mobile.html':'index.html';
      await page.goto(`${base}/${language}${profile}`);
      assert.equal(await page.locator('.editorial-curtain').count(),0,'direct visit');
      await page.evaluate(()=>scrollTo({top:600,behavior:'instant'}));
      const saved=await page.evaluate(()=>scrollY);
      // Modified clicks and new-tab/download links retain their native defaults.
      assert.deepEqual(await page.evaluate(()=>{
        const link=document.querySelector('.site-nav a[href$="blog.html"]');
        const results=[];
        const inspect=event=>{results.push(event.defaultPrevented);event.preventDefault();};
        window.addEventListener('click',inspect);
        for(const modifier of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])
          link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,...modifier}));
        link.target='_blank';link.click();link.removeAttribute('target');
        link.download='blog.html';link.click();link.removeAttribute('download');
        window.removeEventListener('click',inspect);
        return results;
      }),Array(7).fill(false));
      assert.deepEqual(await page.evaluate(()=>{
        const results=[];
        const inspect=event=>{results.push(event.defaultPrevented);event.preventDefault();};
        window.addEventListener('click',inspect);
        document.querySelector('.site-nav a[href$="blog.html"]').click();
        document.querySelector('.site-nav a[href$="moments.html"]').click();
        window.removeEventListener('click',inspect);
        dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
        return results;
      }),[false,true],'duplicate navigation blocked');
      for(const target of ['blog.html','moments.html',profile,'moments.html','blog.html',profile]) {
        // Trigger the actual anchor without Playwright scrolling a nonsticky
        // mobile header to the top before the click changes saved scrollY.
        await page.locator('.site-nav a').filter({hasText:target.startsWith('index')?(language?'个人主页':'Profile'):target==='blog.html'?(language?'博客':'Blog'):(language?'朋友圈':'Moments')}).evaluate(link=>link.click());
        await page.waitForURL(`${base}/${language}${target}`);
        try {await page.waitForFunction(()=>window.curtainReady);} catch(error) {
          console.error(await page.evaluate(()=>({url:location.href,probe:window.curtainProbe,animations:document.getAnimations().map(a=>a.animationName)})));throw error;
        }
        const details=await page.evaluate(()=>{
          const curtain=document.querySelector('.editorial-curtain');
          const style=getComputedStyle(curtain);
          const animation=document.getAnimations().find(a=>a.animationName==='editorialCurtainSweep');
          return {text:curtain.textContent,bg:style.backgroundColor,color:style.color,accent:getComputedStyle(curtain,'::before').backgroundColor,
            duration:animation.effect.getTiming().duration,frames:animation.effect.getKeyframes().map(f=>({offset:f.offset,transform:f.transform,easing:f.easing})),scroll:scrollY};
        });
        assert.equal(details.text,target.startsWith('index')?'PROFILE.':target==='blog.html'?'BLOG.':'MOMENTS.');
        assert.equal(details.bg,'rgb(255, 240, 189)');assert.equal(details.color,'rgb(104, 80, 38)');assert.equal(details.accent,'rgb(230, 186, 91)');
        assert.equal(details.duration,1050);
        assert.deepEqual(details.frames.map(f=>f.offset),[0,.43,.57,1]);
        assert.deepEqual(details.frames.map(f=>f.transform),['translateY(105%)','translateY(0px)','translateY(0px)','translateY(-105%)']);
        assert(details.frames.every(f=>f.easing==='cubic-bezier(0.76, 0, 0.22, 1)'));
        if(process.env.CURTAIN_ARTIFACT_DIR && target==='moments.html')
          await page.screenshot({path:`${process.env.CURTAIN_ARTIFACT_DIR}/butter-${language?'zh':'en'}-${mobile?'mobile':'desktop'}.png`});
        if(target===profile) assert(Math.abs(details.scroll-saved)<2,`Profile scroll restored before reveal: ${details.scroll} vs ${saved}`);
        // Sample actual generated pseudo-element position through the full sweep.
        for(const [time,sign] of [[0,1],[451.5,0],[598.5,0],[1050,-1]]) {
          const y=await page.evaluate(time=>{
            const animation=document.getAnimations().find(a=>a.animationName==='editorialCurtainSweep');animation.currentTime=time;
            return new DOMMatrix(getComputedStyle(document.documentElement,'::view-transition-group(editorial-curtain)').transform).m42;
          },time);
          assert(sign===0?Math.abs(y)<1:Math.sign(y)===sign,`curtain position at ${time}ms: ${y}`);
        }
        // Let the browser complete the real timeline and release its cross-document
        // snapshot before starting another navigation (do not force .finish()).
        await page.evaluate(()=>{for(const a of document.getAnimations())if(a.animationName?.startsWith('editorial')){a.currentTime=0;a.play();}});
        await page.waitForFunction(()=>!document.querySelector('.editorial-curtain'));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        console.log('PASS',mobile?'mobile':'desktop',language||'en/',target,'colors, title, 1050ms sweep, cleanup');
      }
      await page.goBack();await page.waitForTimeout(100);
      assert.equal(await page.locator('.editorial-curtain').count(),0,'history cleanup');
      await page.goForward();await page.reload();
      assert.equal(await page.locator('.editorial-curtain').count(),0,'reload cleanup');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('.site-nav a').filter({hasText:language?'博客':'Blog'}).click();
      await page.waitForURL(`${base}/${language}blog.html`);
      assert.equal(await page.locator('.editorial-curtain').count(),0,'reduced motion');
      // This Profile error predates this change in script.js; do not hide new errors.
      assert.deepEqual(errors.filter(e=>e!=='resourceBase is not defined'),[]);
      await context.close();
    }
    // Slow responses keep the real old page until the destination can be captured.
    const context=await browser.newContext();
    const page=await context.newPage();
    await page.goto(`${base}/blog.html`);
    await page.route('**/moments.html',async route=>{
      await new Promise(resolve=>setTimeout(resolve,350));await route.continue();
    });
    const click=page.locator('.site-nav a[href="moments.html"]').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.editorial-curtain').count(),0,'no overlay while target is loading');
    await click;await page.waitForURL(`${base}/moments.html`);
    await page.waitForFunction(()=>!document.querySelector('.editorial-curtain'));
    // Explicitly emulate an older API implementation and check native fallback.
    await page.addInitScript(()=>{
      const supports=CSS.supports.bind(CSS);
      CSS.supports=(...args)=>args[0]==='selector(:active-view-transition-type(editorial))'?false:supports(...args);
    });
    await page.goto(`${base}/blog.html`);
    await page.locator('.site-nav a[href="moments.html"]').click();
    await page.waitForURL(`${base}/moments.html`);
    assert.equal(await page.locator('.editorial-curtain').count(),0,'unsupported API fallback');
    // A separate page retains real API support when testing a failed destination.
    const failedPage=await context.newPage();
    await failedPage.goto(`${base}/moments.html`);
    await failedPage.route('**/blog.html',route=>route.fulfill({status:503,contentType:'text/html',body:'<!doctype html><title>Unavailable</title><p>Unavailable</p>'}));
    await failedPage.locator('.site-nav a[href="blog.html"]').click();
    await failedPage.waitForURL(`${base}/blog.html`);
    assert.equal(await failedPage.locator('p').textContent(),'Unavailable','failed target uses normal navigation');
    assert.equal(await failedPage.locator('.editorial-curtain').count(),0);
    await context.close();
    console.log('PASS slow target, unsupported API, failed target; modified/new-tab links in all four contexts');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
