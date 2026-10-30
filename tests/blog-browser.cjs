// Optional real Chromium smoke test. Start a local server on port 8091 first.
// NODE_PATH=<external playwright-core>/node_modules node tests/blog-browser.cjs
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const width of [1440,390])for(const language of ['en','zh']){
  const context=await browser.newContext({viewport:{width,height:960},isMobile:width<500,hasTouch:width<500});
  await context.addInitScript(()=>{if(window===window.top)localStorage.setItem('lx_comments_token:blog:r',JSON.stringify({token:'a'.repeat(64)}));});
  const comments=[{id:'r',parent_id:null,nickname:'Reader',body:'Root discussion',created_at:'2026-10-30 09:00:00',edit_count:0,token:'a'.repeat(64)},...Array.from({length:4},(_,i)=>({id:'reply'+i,parent_id:'r',reply_to_id:'r',nickname:'Visitor '+i,body:'Reply '+i,created_at:'2026-10-30 10:00:00',edit_count:0}))];
  let liked=false;const pending=new Map();
  await context.route('https://api.lxiang.cc/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();let result;
   if(method==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Visitor-ID'}});return;}
   if(url.pathname.includes('likes')){if(method==='PUT')liked=true;if(method==='DELETE')liked=false;result={content_type:'blog',content_id:url.searchParams.get('id'),likes:liked?5:4,liked};}
   else if(method==='GET')result={content_type:'blog',content_id:url.searchParams.get('id'),count:comments.filter(c=>c.status!=='deleted').length,comments:comments.map(({token,...c})=>c)};
   else if(method==='POST'){
    const p=req.postDataJSON();let c=pending.get(p.request_id);if(!c){const target=comments.find(c=>c.id===p.reply_to_id);c={id:'new'+comments.length,parent_id:target?(target.parent_id||target.id):null,reply_to_id:p.reply_to_id,nickname:p.nickname,body:p.body,created_at:'2026-10-30 12:00:00',edit_count:0,token:p.deletion_token};comments.push(c);pending.set(p.request_id,c);}result={comment:c};
   }else{const p=req.postDataJSON(),c=comments.find(c=>c.id===url.pathname.split('/').pop());assert.equal(p.deletion_token,c.token);if(method==='PATCH'){c.body=p.body;c.nickname=p.nickname;c.edit_count++;}if(method==='DELETE')c.status='deleted';result={comment:c};}
   await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,...result})});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const prefix=language==='zh'?'/zh/':'/';
  await page.goto('http://127.0.0.1:8091'+prefix+'blog.html');await page.locator('.blog-post').first().waitFor();
  await page.locator('[data-filter="notes"]').click();assert.equal(await page.locator('.blog-post').count(),4);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto('http://127.0.0.1:8091'+prefix+'blog-post.html?p=Python');await page.locator('.blog-thread').waitFor();
  const like=page.locator('.blog-heart button');await like.click();await page.waitForFunction(()=>document.querySelector('.blog-heart button').getAttribute('aria-pressed')==='true');await like.click();
  const expand=language==='zh'?'查看全部 4 条回复':'View all 4 replies';await page.getByRole('button',{name:expand,exact:true}).click();assert.equal(await page.locator('.blog-reply').count(),4);
  await page.getByRole('button',{name:language==='zh'?'回复':'Reply',exact:true}).first().click();
  const form=page.locator('.blog-comment-form');await form.locator('input').first().fill('Browser test');await form.locator('textarea').fill('Mock-only reply');await form.getByRole('button',{name:language==='zh'?'发送':'Send',exact:true}).click();
  await page.locator('.blog-token-backup:not([hidden])').waitFor();assert.match(await page.locator('.blog-token-backup input').inputValue(),/^[a-f0-9]{64}$/);
  await form.getByRole('button',{name:language==='zh'?'完成':'Done',exact:true}).click();await page.getByText('Mock-only reply',{exact:true}).waitFor();
  const summary=page.locator('.blog-comment-menu summary').first();await summary.click();await page.getByRole('button',{name:language==='zh'?'编辑评论':'Edit comment',exact:true}).first().click();await page.locator('dialog textarea').fill('Edited root');await page.locator('dialog').getByRole('button',{name:language==='zh'?'保存修改':'Save changes',exact:true}).click();await page.getByText('Edited root',{exact:true}).waitFor();
  await page.locator('.blog-comment-menu summary').first().click();await page.getByRole('button',{name:language==='zh'?'删除评论':'Delete comment',exact:true}).first().click();await page.locator('dialog').getByRole('button',{name:language==='zh'?'确认删除':'Confirm deletion',exact:true}).click();await page.locator('.blog-deleted').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.screenshot({path:'/workspace/blog-'+language+'-'+width+'.png',fullPage:true});
  console.log('PASS',language,width,'listing/filter, article/PDF, likes, reply, edit, delete, no overflow or JS errors (mock API)');await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
