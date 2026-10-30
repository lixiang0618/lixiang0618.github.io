// Local static server :8091. All API writes are simulated; production is never mutated.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('data/moments.json'));
async function mock(context,options={}){
 const byMoment=new Map();let next=1;
 await context.addInitScript(()=>{if(window===window.top)localStorage.setItem('lx_visitor_id','12345678-1234-4234-8234-123456789abc');});
 await context.route('https://api.lxiang.cc/**',async route=>{
  const r=route.request(),u=new URL(r.url()),method=r.method(),payload=r.postData()?r.postDataJSON():null;let result;
  if(method==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PUT,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Visitor-ID'}});return;}
  if(u.pathname.includes('likes'))result={content_type:'moment',content_id:u.searchParams.get('id'),likes:method==='PUT'?3:2,liked:method==='PUT'};
  else if(method==='GET'){const id=u.searchParams.get('id');result={content_type:'moment',content_id:id,comments:byMoment.get(id)||[],count:(byMoment.get(id)||[]).length};}
  else if(method==='POST'){const c={id:'test-'+next++,nickname:payload.nickname,body:payload.body,created_at:'2026-10-30 10:00:00',edit_count:0,token:payload.deletion_token};const list=byMoment.get(payload.content_id)||[];list.push(c);byMoment.set(payload.content_id,list);result={comment:c};}
  else{let list,c;for(const v of byMoment.values()){const found=v.find(c=>c.id===u.pathname.split('/').pop());if(found){c=found;list=v;break;}}assert(c);assert.equal(c.token,payload.deletion_token);if(method==='PATCH'){c.body=payload.body;c.nickname=payload.nickname;c.edit_count++;}if(method==='DELETE')list.splice(list.indexOf(c),1);result={comment:c};}
  await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,...result})});
 });
 if(options.records)await context.route('**/data/moments.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(options.records)}));
}
async function settle(page){await page.waitForFunction(()=>window.MomentsGlass?.getState().active);await page.waitForTimeout(100);}
async function move(page,id){await page.locator('[data-ambient-moment="'+id+'"]').evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(120);}
async function checkDominant(page){assert(await page.evaluate(()=>{
 const header=document.querySelector('.site-header').getBoundingClientRect().bottom,w=document.documentElement.clientWidth,h=innerHeight;
 const areas=Array.from(document.querySelectorAll('.moment-card')).map(card=>{const r=card.getBoundingClientRect();return{id:card.dataset.ambientMoment,area:Math.max(0,Math.min(r.right,w)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,h)-Math.max(r.top,header))};});
 const current=areas.find(c=>c.id===MomentsGlass.getState().active);return current?.area>0 && current.area*1.15+1>=Math.max(...areas.map(c=>c.area));
}));}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const width of (process.env.GLASS_SCENARIO?[]:[1440,1024,768,390]))for(const lang of ['en','zh']){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});await mock(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const path=(lang==='zh'?'/zh/':'/')+'moments.html';await page.goto('http://127.0.0.1:8091'+path);await settle(page);
  await page.waitForFunction(()=>MomentsGlass.getState().processed>0 && !MomentsGlass.getState().fading);await checkDominant(page);
  assert.equal(await page.locator('.moment-card').first().evaluate(n=>n.getBoundingClientRect().width),({1440:544,1024:544,768:568,390:358})[width]);
  assert.equal(await page.locator('.moments-ambient').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
  assert.equal(await page.locator('.moment-images img').first().evaluate(n=>getComputedStyle(n).filter),'none');
  assert((await page.locator('.moments-ambient-layer').first().evaluate(n=>getComputedStyle(n).filter)).includes('blur('));
  assert.equal(await page.locator('.moments-ambient-layer').count(),2);
  // A second photograph crossfades; no DOM layer is recreated.
  await move(page,'moment-008');await page.waitForFunction(()=>MomentsGlass.getState().active==='moment-008' && MomentsGlass.getState().fading);
  await page.waitForTimeout(150);const opacities=await page.locator('.moments-ambient-layer').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).opacity)));assert(opacities.every(n=>n>0&&n<1));
  await page.waitForFunction(()=>!MomentsGlass.getState().fading);await checkDominant(page);
  // Large card/comments retain a single unified surface and interaction hierarchy.
  await move(page,'moment-009');await page.waitForFunction(()=>MomentsGlass.getState().active==='moment-009');
  const card=page.locator('[data-ambient-moment="moment-009"]');const like=card.locator('.moment-like:not(.comment-trigger)');await like.click();await page.waitForFunction(()=>document.querySelector('[data-ambient-moment="moment-009"] .moment-like').getAttribute('aria-pressed')==='true');await like.click();
  await card.locator('.comment-trigger').click();const dialog=page.locator('dialog');await dialog.locator('input').fill('Browser visitor');await dialog.locator('textarea').fill('Mock-only comment\n'.repeat(20));await dialog.getByRole('button',{name:lang==='zh'?'发送':'Send',exact:true}).click();await dialog.getByRole('button',{name:lang==='zh'?'完成':'Done',exact:true}).waitFor();await dialog.getByRole('button',{name:lang==='zh'?'完成':'Done',exact:true}).click();
  await card.locator('.comment-item').waitFor();assert.equal(await card.locator('.comments-section').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');await checkDominant(page);
  await card.locator('.comment-menu-button').click();await dialog.getByRole('button',{name:lang==='zh'?'编辑评论':'Edit comment',exact:true}).click();await dialog.locator('textarea').fill('Edited mock comment');await dialog.getByRole('button',{name:lang==='zh'?'保存修改':'Save changes',exact:true}).click();await card.getByText('Edited mock comment',{exact:true}).waitFor();
  await card.locator('.comment-menu-button').click();await dialog.getByRole('button',{name:lang==='zh'?'删除评论':'Delete comment',exact:true}).click();await dialog.getByRole('button',{name:lang==='zh'?'确认删除':'Confirm deletion',exact:true}).click();await card.locator('.comment-item').waitFor({state:'detached'});
  await card.locator('.moment-images img').first().click();await page.locator('.image-lightbox.active').waitFor();assert.equal(await page.locator('.image-lightbox img').evaluate(n=>getComputedStyle(n).filter),'none');await page.keyboard.press('Escape');
  await move(page,'moment-007');await page.waitForFunction(()=>MomentsGlass.getState().active==='moment-007' && MomentsGlass.getState().neutral && !MomentsGlass.getState().fading);
  // Rapid jumps, then return to a photographed post; the latest source wins.
  await page.evaluate(()=>{for(const id of ['moment-001','moment-006','moment-008','moment-009'])document.querySelector('[data-ambient-moment="'+id+'"]').scrollIntoView({block:'center',behavior:'instant'});});
  await page.waitForFunction(()=>MomentsGlass.getState().active==='moment-009' && !MomentsGlass.getState().neutral && !MomentsGlass.getState().fading);await checkDominant(page);
  const processed=await page.evaluate(()=>MomentsGlass.getState().processed);assert(processed<=8);assert.equal(await page.locator('.moments-ambient-layer').count(),2);
  await page.setViewportSize({width:Math.max(320,width-40),height:800});await page.waitForTimeout(120);await checkDominant(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(800);
  if(width===1440||width===390)await page.screenshot({path:'/workspace/glass-'+lang+'-'+width+'.png'});
  assert.deepEqual(errors,[]);console.log('PASS',lang,width,'area / fade / resize / rapid scroll / neutral / sharp media / likes / comment CRUD / Lightbox / no overflow');await context.close();
 }
 // Explicit no-photo, image failure, slow image, and accessibility preference paths.
 for(const scenario of ['text-only','failed-photo','slow-photo','reduced-motion','reduced-transparency','back-navigation']){
  if(process.env.GLASS_SCENARIO && process.env.GLASS_SCENARIO!==scenario)continue;
  const record={...data[0],id:'fixture',images:scenario==='text-only'?[]:[data[0].images[0]],content:'Mock visual fixture'};
  const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:scenario==='reduced-motion'?'reduce':'no-preference'});await mock(context,{records:[record]});
  let release;
  if(scenario==='failed-photo')await context.route('**/'+encodeURI(data[0].images[0]),r=>r.abort());
  if(scenario==='slow-photo'){const wait=new Promise(resolve=>{release=resolve;});await context.route('**/'+encodeURI(data[0].images[0]),async r=>{await wait;await r.continue();});}
  const page=await context.newPage();if(scenario==='reduced-transparency'){const session=await context.newCDPSession(page);await session.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});}
  await page.goto('http://127.0.0.1:8091/moments.html',{waitUntil:'domcontentloaded'});await settle(page);
  if(scenario==='text-only'||scenario==='failed-photo'){await page.waitForTimeout(850);assert(await page.evaluate(()=>MomentsGlass.getState().neutral));}
  if(scenario==='slow-photo'){assert(await page.evaluate(()=>MomentsGlass.getState().neutral));release();await page.waitForFunction(()=>MomentsGlass.getState().processed===1);}
  if(scenario==='reduced-motion'){await page.waitForFunction(()=>MomentsGlass.getState().processed===1);assert.equal(await page.locator('.moments-ambient-layer').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');}
  if(scenario==='reduced-transparency'){assert.equal(await page.locator('.moment-card').evaluate(n=>getComputedStyle(n).backdropFilter),'none');assert.equal(await page.locator('.moment-card').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(248, 250, 252)');}
  if(scenario==='back-navigation'){await page.waitForFunction(()=>MomentsGlass.getState().processed>0);await page.goto('about:blank');await page.goBack({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.MomentsGlass?.getState().active==='fixture' && MomentsGlass.getState().processed>0);assert.equal(await page.locator('.moments-ambient').count(),1);assert.equal(await page.locator('.moments-ambient-layer').count(),2);}
  console.log('PASS preference/fallback',scenario);await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
