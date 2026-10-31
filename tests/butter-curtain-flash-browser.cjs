// Actual compositor-frame regression: a paused midpoint alone cannot detect the
// pre-animation flash. Run against a static server, including a Vercel dist build.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8091';

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    for(const mobile of [false,true]) for(const language of ['', 'zh/']) for(const source of ['blog.html','moments.html']) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1000,height:800},isMobile:mobile,hasTouch:mobile,
        ...(mobile?{userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36'}:{})});
      await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
      const page=await context.newPage();
      const errors=[],missing=[],mediaRequests=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('response',response=>{if(response.status()===404 && response.url().startsWith(base+'/Resources/'))missing.push(response.url());});
      page.on('request',request=>{if(request.url().startsWith(base+'/Resources/'))mediaRequests.push(request.url());});
      await page.addInitScript(()=>addEventListener('pagereveal',event=>{
        event.viewTransition?.ready.then(()=>{window.curtainReadyAt=Date.now();}).catch(()=>{});
      }));
      await page.goto(`${base}/${language}${source}`);
      // Exercise the Profile-only restoration path with a real nonzero position.
      await page.evaluate(language=>sessionStorage.setItem('lx_profile_scroll:/'+language,'700'),language);
      const cdp=await context.newCDPSession(page),frames=[];
      cdp.on('Page.screencastFrame',frame=>{
        frames.push({time:frame.metadata.timestamp*1000,data:frame.data});
        cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});
      });
      await cdp.send('Page.startScreencast',{format:'png',everyNthFrame:1});
      await page.locator('.site-nav a').filter({hasText:language?'个人主页':'Profile'}).click();
      await page.waitForURL(`${base}/${language}${mobile?'index-mobile.html':'index.html'}`);
      await page.waitForFunction(()=>window.curtainReadyAt && !document.querySelector('.editorial-curtain'));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await cdp.send('Page.stopScreencast');
      const result=await page.evaluate(async frames=>{
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),coverage=[];
        for(const frame of frames) {
          const img=new Image();img.src='data:image/png;base64,'+frame.data;await img.decode();
          canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);
          const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let yellow=0,samples=0;
          for(let y=0;y<canvas.height;y+=4)for(let x=0;x<canvas.width;x+=4){const i=(y*canvas.width+x)*4;samples++;if(data[i]===255&&data[i+1]===240&&data[i+2]===189)yellow++;}
          coverage.push({time:frame.time,yellow:yellow/samples});
        }
        coverage.sort((a,b)=>a.time-b.time);
        return {coverage,readyAt:window.curtainReadyAt,scroll:scrollY};
      },frames);
      assert(result.coverage.length>=5,'capture meaningful compositor frames');
      assert(result.coverage.some(frame=>frame.yellow>.8),'curtain fully covers the screen');
      const before=result.coverage.filter(frame=>frame.time<result.readyAt);
      assert(before.length>0,'capture frames before animation readiness');
      assert(before.every(frame=>frame.yellow<.01),'no yellow flash before named snapshot animation');
      let sweeps=0,visible=false;
      for(const frame of result.coverage){if(frame.yellow>.05&&!visible){sweeps++;visible=true;}else if(frame.yellow<.01)visible=false;}
      assert.equal(sweeps,1,'only one continuous yellow sweep: '+JSON.stringify(result.coverage.map(frame=>({ms:Math.round(frame.time-result.readyAt),yellow:Number(frame.yellow.toFixed(3))}))));
      assert(result.coverage.at(-1).yellow<.01,'no residual yellow overlay');
      assert(Math.abs(result.scroll-700)<2,'Profile scroll restored');
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[],'no local image 404s');
      assert(!mediaRequests.some(url=>new URL(url).searchParams.has('v')),'no cache-busted extension probes');
      if(!mobile) {
        assert.deepEqual(await page.locator('[data-gallery] img').evaluateAll(images=>images.map(img=>new URL(img.src).pathname)),
          ['research-gnn-2.png','research-sna-2.png','research-asrs-1.png','internship-sinolight-1.png','project-igo-1.png'].map(file=>'/Resources/'+file));
        await page.waitForFunction(()=>[...document.querySelectorAll('[data-gallery] img')].every(img=>img.complete&&img.naturalWidth>0));
        for(const number of [2,3,1]) {
          await page.locator('#portrait-img').evaluate(img=>img.click());
          await page.waitForFunction(number=>document.getElementById('portrait-img').src.endsWith(`portrait-${number}.jpg`)&&document.getElementById('portrait-img').complete&&document.getElementById('portrait-img').naturalWidth>0,number);
        }
      }
      console.log('PASS',mobile?'mobile':'desktop',language||'en/',source,'→ Profile:',result.coverage.length,'frames, one sweep, no preflash/errors/image 404s');
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
