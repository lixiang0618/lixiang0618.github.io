// Requires normal local server :8091 and explicit dev/serve-glass-studio.py :8092.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');const M=require('../dev/glass-model');const confirmed=require('../dev/glass-review.json');
async function mock(context){await context.route('https://api.lxiang.cc/**',async route=>{const u=new URL(route.request().url());await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,content_type:'moment',content_id:u.searchParams.get('id'),likes:2,liked:false,count:1,comments:[{id:'s-'+u.searchParams.get('id'),nickname:'Reader',body:'Mock-only comment for sizing\nLine two.',created_at:'2026-10-30 12:00:00',edit_count:0}]})});});}
async function ready(page){await page.locator('.comment-item').first().waitFor();await page.waitForFunction(()=>window.MomentsGlass?.getState().processed>0);}
async function set(page,id,value){const input=page.locator('[data-number="'+id+'"]');await input.evaluate(n=>{n.closest('details').open=true;});await input.fill(String(value));const field=M.fields.find(f=>f.id===id),expected=Math.max(field.min,Math.min(field.max,value));await page.waitForFunction(([id,value])=>document.querySelector('[data-field="'+id+'"]').value===String(value),[id,expected]);}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const lang of ['en','zh']){
  const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});await mock(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const path=(lang==='zh'?'/zh/':'/')+'moments.html';
  await page.goto('http://127.0.0.1:8092'+path);await ready(page);assert.equal(await page.locator('.studio-field').count(),M.fields.length);
  // Ensure suggested CSS and the development schema have no drift in either scope.
  async function verifySuggested(scope){const actual=await page.evaluate(fields=>Object.fromEntries(fields.map(f=>[f.id,MomentsAppearance.read(f.css)])),M.fields);for(const f of M.fields)assert(Math.abs(actual[f.id]-M.preset('suggested')[scope][f.id])<.01,f.id+' CSS/model drift');}
  assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'17.5px');assert.equal(await page.locator('.moment-card').first().evaluate(n=>n.getBoundingClientRect().width),574);
  await page.getByRole('button',{name:'展开 Glass Studio 开发调参面板',exact:true}).click();const panel=page.locator('.glass-studio');await panel.waitFor();await panel.getByRole('button',{name:'建议版本',exact:true}).click();await verifySuggested('desktop');
  const sheets=await page.evaluate(()=>document.styleSheets.length),cards=await page.locator('.moment-card').count();
  // Test direct numeric controls and separate blur channels on real cards/layers.
  const slider=page.locator('[data-field="opacity"]');await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(40);assert.notEqual(await slider.inputValue(),'0.68');
  await set(page,'opacity',.42);await set(page,'glassBlur',27);await set(page,'ambientBlur',90);await set(page,'bodySize',20);await set(page,'feedMax',880);
  assert((await page.locator('.moment-card').first().evaluate(n=>getComputedStyle(n).backgroundColor)).includes('0.42'));
  assert((await page.locator('.moment-card').first().evaluate(n=>getComputedStyle(n).backdropFilter)).includes('27px'));
  assert((await page.locator('.moments-ambient-layer').first().evaluate(n=>getComputedStyle(n).filter)).includes('90px'));
  assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'20px');assert.equal(await page.locator('.moment-images img').first().evaluate(n=>getComputedStyle(n).filter),'none');
  assert.equal(await page.evaluate(()=>document.styleSheets.length),sheets);assert.equal(await page.locator('.moment-card').count(),cards);
  assert(await page.evaluate(()=>{const x=document.querySelector('.glass-studio').getBoundingClientRect().left;return Array.from(document.querySelectorAll('.moment-card')).every(n=>n.getBoundingClientRect().right<=x);}));
  await panel.getByRole('button',{name:'对比原始版本',exact:true}).click();assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'16px');
  await panel.getByRole('button',{name:'返回当前调整',exact:true}).click();assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'20px');assert.equal(await page.locator('[data-number="opacity"]').inputValue(),'0.42');
  await panel.getByRole('button',{name:'保存到本地',exact:true}).click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lx_glass_studio_v1')));assert.equal(saved.desktop.opacity,.42);assert.equal(saved.desktop.bodySize,20);
  await panel.getByRole('button',{name:'恢复原始版本',exact:true}).click();await panel.getByRole('button',{name:'收起面板',exact:true}).click();
  assert.equal(await page.locator('.moment-card').first().evaluate(n=>n.getBoundingClientRect().width),544);assert.equal(await page.locator('.moment-avatar').first().evaluate(n=>n.getBoundingClientRect().width),44);
  await page.getByRole('button',{name:'展开 Glass Studio 开发调参面板',exact:true}).click();await panel.getByRole('button',{name:'恢复上次保存',exact:true}).click();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));await panel.getByRole('button',{name:'复制完整配置',exact:true}).click();
  const output=panel.locator('.studio-export textarea');assert.equal(JSON.parse(await output.inputValue()).desktop.feedMax,880);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked');}}}));await panel.getByRole('button',{name:'复制完整配置',exact:true}).click();assert((await panel.locator('.studio-notice').textContent()).includes('手动复制'));
  for(const kind of ['JSON','CSS']){const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:'导出 '+kind,exact:true}).click();const download=await downloadPromise;const text=fs.readFileSync(await download.path(),'utf8');if(kind==='JSON')assert.equal(M.validate(JSON.parse(text)).desktop.opacity,.42);else assert(text.includes('--moments-glass-opacity: 0.42;'));}
  await page.reload();await ready(page);await page.getByRole('button',{name:'展开 Glass Studio 开发调参面板',exact:true}).click();await panel.getByRole('button',{name:'恢复上次保存',exact:true}).click();assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'20px');
  // Every advertised field updates the same real-page variable, not a demo card.
  const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('lx_glass_studio_v1')));
  for(const f of M.fields){const current=savedBefore.desktop[f.id],value=Number((Math.min(f.max,current+f.step)).toFixed(5));await set(page,f.id,value);assert(Math.abs(await page.evaluate(css=>MomentsAppearance.read(css),f.css)-value)<.01,f.id+' not applied');}
  await panel.getByRole('button',{name:'建议版本',exact:true}).click();await verifySuggested('desktop');
  await set(page,'cardPadding',999);await page.waitForTimeout(30);await panel.getByRole('button',{name:'复制完整配置',exact:true}).click();M.validate(JSON.parse(await output.inputValue()));
  await panel.getByRole('button',{name:'建议版本',exact:true}).click();
  await page.evaluate(()=>{const old=Storage.prototype.setItem;window.restoreStudioStorage=()=>{Storage.prototype.setItem=old;};Storage.prototype.setItem=function(k,v){if(k==='lx_glass_studio_v1')throw Error('blocked');old.call(this,k,v);};});await panel.getByRole('button',{name:'保存到本地',exact:true}).click();assert((await panel.locator('.studio-notice').textContent()).includes('保存失败'));await page.evaluate(()=>window.restoreStudioStorage());
  await set(page,'duration',50);await page.locator('[data-ambient-moment="moment-008"]').evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForFunction(()=>MomentsGlass.getState().active==='moment-008');await page.waitForFunction(()=>!MomentsGlass.getState().fading);
  assert.equal(await page.locator('.moments-ambient-layer').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0.05s');
  await page.setViewportSize({width:390,height:950});await page.waitForTimeout(100);await panel.getByRole('button',{name:'建议版本',exact:true}).click();await verifySuggested('mobile');
  assert.equal(await page.locator('.moment-content').first().evaluate(n=>getComputedStyle(n).fontSize),'17px');
  await set(page,'bodySize',19);await panel.getByRole('button',{name:'保存到本地',exact:true}).click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lx_glass_studio_v1')));assert.equal(saved.mobile.bodySize,19);assert.equal(saved.desktop.bodySize,18);
  await panel.getByRole('button',{name:'收起面板',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.moment-card').first().evaluate(n=>n.getBoundingClientRect().width),358);
  // Saved local settings do not leak into a normal server/page, even with a query.
  const normal=await context.newPage();await normal.addInitScript(value=>localStorage.setItem('lx_glass_studio_v1',JSON.stringify(value)),saved);await normal.goto('http://127.0.0.1:8091'+path+'?studio=1');await normal.locator('.moment-card').first().waitFor();assert.equal(await normal.locator('.glass-studio,.glass-studio-launch').count(),0);assert.equal(await normal.evaluate(()=>typeof window.GlassStudioModel),'undefined');for(const width of [1600,390]){await normal.setViewportSize({width,height:950});const scope=width===390?'mobile':'desktop';const values=await normal.evaluate(fields=>Object.fromEntries(fields.map(f=>[f.id,MomentsAppearance.read(f.css)])),M.fields);for(const f of M.fields)assert(Math.abs(values[f.id]-confirmed[scope][f.id])<.01,f.id+' production CSS/confirmed mismatch');}await normal.close();
  assert.deepEqual(errors,[]);console.log('PASS Studio',lang,'all fields / presets / comparison / storage / JSON-CSS exports / dynamic background / responsive / production hidden');await context.close();
 }
 // Closed Studio layout matrix: intermediate widths and mobile must not squeeze the feed.
 for(const width of [1440,1200,1024,960,820,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:950}});await mock(context);const page=await context.newPage();await page.goto('http://127.0.0.1:8092/moments.html');await ready(page);
  const info=await page.evaluate(()=>({mode:document.body.dataset.momentsLayout,card:document.querySelector('.moment-card').getBoundingClientRect().width,font:getComputedStyle(document.querySelector('.moment-content')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert(!info.overflow);assert.equal(info.card,({1440:574,1200:574,1024:574,960:574,820:574,768:568,390:358,320:288})[width]);assert.equal(info.font,width<=768?'17px':'17.5px');
  if(width===1440||width===390)await page.screenshot({path:'/workspace/glass-studio-baseline-'+width+'.png'});
  console.log('PASS baseline',width,info.mode,info.card,info.font);await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
