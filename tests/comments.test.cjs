const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('js/comments.js','utf8');
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};
function backend() {
 const comments=[], calls=[],posts=new Map(); let next=1;
 return {comments,calls,fetch:async(url,o)=>{
  const payload=o.body?JSON.parse(o.body):null; calls.push({url,method:o.method,payload});
  if(o.method==='GET')return response({comments:comments.filter(c=>c.status!=='deleted').map(({token,...c})=>c),content_type:'moment',content_id:'moment-001'});
  if(o.method==='POST'){
   assert(/^[a-f0-9]{64}$/.test(payload.deletion_token)); assert(payload.request_id);
   assert(!url.includes(payload.deletion_token));
   if(posts.has(payload.request_id))return response({comment:posts.get(payload.request_id)});
   const c={id:String(next++),nickname:payload.nickname,body:payload.body,edit_count:0,created_at:'2026-10-30T08:00:00Z',token:payload.deletion_token};
   comments.push(c);posts.set(payload.request_id,c);return response({comment:c});
  }
  const c=comments.find(c=>c.id===decodeURIComponent(url.split('/').pop()));
  if(!c || c.status==='deleted')return response({code:'COMMENT_NOT_FOUND'},404);
  if(c.token!==payload.deletion_token)return response({code:'INVALID_TOKEN'},403);
  if(o.method==='PATCH'){
   if(payload.expected_edit_count!==c.edit_count)return response({code:'EDIT_CONFLICT'},409);
   Object.assign(c,{nickname:payload.nickname,body:payload.body,edit_count:c.edit_count+1,updated_at:'2026-10-30T09:00:00Z'});return response({comment:c});
  }
  c.status='deleted';c.body='';return response({});
 }};
}
function response(data,status=200){return {ok:status<400,status,json:async()=>({success:status<400,...data})};}
async function setup(api,lang='en',stored={}){
 const dom=new JSDOM('<!doctype html><html lang="'+lang+'"><body><div id="card"><div class="moment-actions"><button class="moment-like">♡ 7</button></div></div><div id="card2"></div></body></html>',{url:'https://lxiang.cc/'+(lang==='zh'?'zh/':'')+'moments.html',runScripts:'outside-only'});
 const w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const [k,v]of Object.entries(stored))w.localStorage.setItem(k,v);
 w.fetch=api.fetch;w.eval(code);
 const card=w.document.getElementById('card');const s=w.SiteComments.mount(card,{type:'moment',id:'moment-001',actions:card.querySelector('.moment-actions')});await tick();
 return {dom,w,card,s,click:text=>{const b=Array.from(w.document.querySelectorAll('dialog button')).find(b=>b.textContent===text);assert(b,'Button '+text);b.click();},fields:()=>Array.from(w.document.querySelectorAll('dialog input,dialog textarea'))};
}
function snapshot(w){const values={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);values[k]=w.localStorage.getItem(k);}return values;}
async function post(p,name='Visitor',body='Hello'){
 p.card.querySelector('.comment-trigger').click();const f=p.fields();f[0].value=name;f[1].value=body;p.click('Send');await tick();
}
test('POST persists before fetch, shows backup, renders safe text; PATCH uses saved token/count; DELETE updates list',async()=>{
 const api=backend();const p=await setup(api);
 const fetch=p.w.fetch;p.w.fetch=(url,o)=>{
  if(o.method==='POST'){
   const saved=JSON.parse(p.w.localStorage.getItem('lx_comments_POST:moment:moment-001'));
   assert.deepEqual(saved.payload,JSON.parse(o.body));
  }return fetch(url,o);
 };
 await post(p,'<img src=x onerror=alert(1)>','<script>alert(1)</script>');
 assert.match(p.w.document.querySelector('dialog h2').textContent,/Comment posted/);
 assert.match(p.fields()[0].value,/^[a-f0-9]{64}$/);
 p.click('Done');await tick();
 assert.equal(p.card.querySelector('.comment-body').textContent,'<script>alert(1)</script>');assert.equal(p.card.querySelectorAll('.comment-item script,.comment-item img').length,0);
 assert.equal(p.card.querySelector('.moment-like').textContent,'♡ 7');
 p.card.querySelector('.comment-menu-button').click();p.click('Edit comment');
 const f=p.fields();assert(f[2].value);f[1].value='Updated';p.click('Save changes');await tick();
 assert.equal(p.card.querySelector('.comment-body').textContent,'Updated');assert.match(p.card.querySelector('.comment-meta').textContent,/Edited/);
 assert.equal(api.calls.find(c=>c.method==='PATCH').payload.expected_edit_count,0);
 p.card.querySelector('.comment-menu-button').click();p.click('Delete comment');p.click('Confirm deletion');await tick();
 assert.equal(p.card.querySelectorAll('.comment-item').length,0);assert.equal(p.card.querySelector('.comment-trigger span').textContent,'0');
 p.dom.window.close();
});
test('uncertain POST survives reload and language switch, reuses payload and creates only one comment',async()=>{
 const api=backend();const p=await setup(api);const fetch=p.w.fetch;
 p.w.fetch=async(url,o)=>{const r=await fetch(url,o);if(o.method==='POST')throw Error('lost');return r;};
 await post(p);const payload=api.calls.find(c=>c.method==='POST').payload;
 const saved=snapshot(p.w);p.dom.window.close();
 const q=await setup(api,'zh',saved);q.card.querySelector('.comment-trigger').click();
 assert(q.fields()[0].readOnly);q.click('发送');q.click('发送');await tick();
 const posts=api.calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);assert.deepEqual(posts[1].payload,payload);assert.equal(api.comments.length,1);
 assert.match(q.w.document.querySelector('dialog h2').textContent,/评论发表成功/);
 q.click('完成');await tick();assert.equal(q.card.querySelectorAll('.comment-item').length,1);q.dom.window.close();
});
test('DELETE response loss or COMMENT_NOT_FOUND refreshes and reports no longer visible, not authenticated success',async()=>{
 for(const kind of ['network','not-found']){
  const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
  const fetch=p.w.fetch;p.w.fetch=async(url,o)=>{
   const r=await fetch(url,o);if(o.method==='DELETE'){if(kind==='network')throw Error('lost');return response({code:'COMMENT_NOT_FOUND'},404);}return r;
  };
  p.card.querySelector('.comment-menu-button').click();p.click('Delete comment');p.click('Confirm deletion');await tick();
  assert.match(p.w.document.querySelector('dialog').textContent,/no longer visible/);
  assert.equal(p.card.querySelectorAll('.comment-item').length,0);assert.equal(api.calls.filter(c=>c.method==='DELETE').length,1);
  p.dom.window.close();
 }
});
test('DELETE uncertain but still present retains operation ID on retry; bad token is recoverable',async()=>{
 const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
 const fetch=p.w.fetch;let first=true;
 p.w.fetch=(url,o)=>{if(o.method==='DELETE'&&first){first=false;api.calls.push({method:o.method,payload:JSON.parse(o.body)});throw Error('timeout');}return fetch(url,o);};
 p.card.querySelector('.comment-menu-button').click();p.click('Delete comment');p.click('Confirm deletion');await tick();
 assert.match(p.w.document.querySelector('dialog').textContent,/still visible/);
 p.click('Confirm deletion');await tick();const writes=api.calls.filter(c=>c.method==='DELETE');assert.equal(writes[0].payload.operation_id,writes[1].payload.operation_id);
 assert.equal(p.card.querySelectorAll('.comment-item').length,0);p.dom.window.close();
});
test('edit conflict refreshes without overwriting and forces reopening; wrong credential retains content',async()=>{
 const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
 p.card.querySelector('.comment-menu-button').click();p.click('Edit comment');api.comments[0].edit_count=1;api.comments[0].body='Other edit';p.fields()[1].value='Mine';p.click('Save changes');await tick();
 assert.match(p.w.document.querySelector('dialog').textContent,/may have changed/);assert.equal(p.card.querySelector('.comment-body').textContent,'Other edit');
 p.click('Cancel');p.card.querySelector('.comment-menu-button').click();p.click('Delete comment');p.fields()[0].value='a'.repeat(64);p.click('Confirm deletion');await tick();
 assert.equal(p.card.querySelectorAll('.comment-item').length,1);assert(!p.fields()[0].readOnly);p.dom.window.close();
});
test('blocked storage prevents POST; invalid input prevents POST; list failures support retry; duplicate mount harmless',async()=>{
 const api=backend();const p=await setup(api);
 let section;p.w.SiteComments.mount(p.card,{type:'moment',id:'moment-001'});assert.equal(p.card.querySelectorAll('.comments-section').length,0);assert.equal(p.card.querySelectorAll('.comment-trigger').length,1);
 p.card.querySelector('.comment-trigger').click();p.click('Send');await tick();assert(!api.calls.some(c=>c.method==='POST'));
 p.fields()[0].value='Visitor';p.fields()[1].value='hello';Object.defineProperty(p.w,'localStorage',{get(){throw Error('blocked');}});
 p.click('Send');await tick();assert(!api.calls.some(c=>c.method==='POST'));assert.match(p.w.document.querySelector('dialog').textContent,/local storage/);
 p.click('Cancel');p.w.fetch=async()=>{throw Error('offline');};await p.s.load();section=p.card.querySelector('.comments-section');assert.match(section.textContent,/Retry/);p.w.fetch=api.fetch;section.querySelector('button').click();await tick();assert(!p.card.querySelector('.comments-section'));assert(!section.textContent.includes('No comments'));p.dom.window.close();
});
test('AbortController timeout preserves POST identity and retry restores completion',async()=>{
 const api=backend();const p=await setup(api);const fetch=p.w.fetch;
 const set=p.w.setTimeout.bind(p.w);p.w.setTimeout=(fn,ms)=>set(fn,ms===12000?0:ms);
 p.w.fetch=(url,o)=>o.method==='POST'?new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('AbortError')))):fetch(url,o);
 await post(p);const stored=JSON.parse(p.w.localStorage.getItem('lx_comments_POST:moment:moment-001'));
 assert(stored.payload.request_id);assert.equal(p.w.document.querySelector('dialog').getAttribute('aria-busy'),'false');
 p.w.fetch=fetch;p.click('Send');await tick();assert.deepEqual(api.calls.find(c=>c.method==='POST').payload,stored.payload);
 p.dom.window.close();
});
test('not-found while comment remains visible is not delete success; actions, Escape and generic Blog mount',async()=>{
 const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
 const fetch=p.w.fetch;p.w.fetch=(url,o)=>o.method==='DELETE'?Promise.resolve(response({error:{code:'COMMENT_NOT_FOUND'}},404)):fetch(url,o);
 p.card.querySelector('.comment-item').dispatchEvent(new p.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
 p.click('Delete comment');p.click('Confirm deletion');await tick();
 assert.match(p.w.document.querySelector('dialog').textContent,/still visible/);assert.equal(p.card.querySelectorAll('.comment-item').length,1);assert(!p.fields()[0].readOnly);
 p.w.document.querySelector('dialog').dispatchEvent(new p.w.Event('cancel',{cancelable:true}));assert(!p.w.document.querySelector('dialog').open);
 p.w.SiteComments.mount(p.w.document.getElementById('card2'),{type:'blog',id:'post-001'});await tick();
 assert(api.calls.some(c=>c.url.includes('type=blog&id=post-001')));p.dom.window.close();
});
test('full bilingual Moments pages integrate both modules without duplicate buttons or broken media',async()=>{
 for(const name of ['moments.html','zh/moments.html']) {
  const html=fs.readFileSync(name,'utf8');const moments=JSON.parse(fs.readFileSync('data/moments.json'));
  const dom=new JSDOM(html,{url:'https://lxiang.cc/'+name,runScripts:'outside-only'});const w=dom.window;
  w.console.log=()=>{};
  w.XMLHttpRequest=class {
   open(method,url){this.url=url;}
   send(){this.status=200;this.readyState=4;this.responseText=JSON.stringify(this.url.includes('moments.json')?moments:[]);this.onreadystatechange?.();this.onload?.();}
  };
  const calls=[];w.fetch=async(url,o)=>{calls.push({url,o});const id=new URL(url).searchParams.get('id');return response(url.includes('/likes')?{content_type:'moment',content_id:id,likes:3,liked:false}:{content_type:'moment',content_id:id,count:1,comments:[{id:'comment-'+id,nickname:'Reader',body:'Hello',created_at:'2026-10-29 16:25:49',updated_at:null,edit_count:0}]});};
  for(const script of w.document.querySelectorAll('script')) {
   if(script.src){const file=new URL(script.src).pathname.replace(/^\//,'');const filePath=file.startsWith('zh/')?file.slice(3):file;w.eval(fs.readFileSync(filePath,'utf8'));}
   else w.eval(script.textContent);
  }
  await tick();
  assert.equal(w.document.querySelectorAll('.comment-trigger').length,moments.length);
  assert.equal(w.document.querySelectorAll('.moment-like:not(.comment-trigger)').length,moments.length);
  assert.equal(w.document.querySelectorAll('.comment-item').length,moments.length);
  assert(w.document.querySelector('.comment-time').textContent.length>0);
  const like=w.document.querySelector('.moment-like:not(.comment-trigger)');like.click();await tick();assert(calls.some(c=>c.o.method==='PUT'));
  const image=w.document.querySelector('.moment-images img');image.click();assert(w.document.querySelector('.image-lightbox').classList.contains('active'));
  assert(w.document.querySelector('.moment-images video'));dom.window.close();
 }
});
test('DELETE reconciliation GET failure keeps the comment and operation record for later retry',async()=>{
 const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
 const fetch=p.w.fetch;p.w.fetch=async(url,o)=>{if(o.method==='DELETE'||o.method==='GET')throw Error('offline');return fetch(url,o);};
 p.card.querySelector('.comment-menu-button').click();p.click('Delete comment');p.click('Confirm deletion');await tick();
 assert.equal(p.card.querySelectorAll('.comment-item').length,1);
 assert.match(p.w.document.querySelector('dialog').textContent,/uncertain/);
 const key='lx_comments_DELETE:moment:1',stored=p.w.localStorage.getItem(key);assert(stored);
 p.w.fetch=fetch;p.click('Confirm deletion');await tick();assert.equal(api.calls.find(c=>c.method==='DELETE').payload.operation_id,JSON.parse(stored).payload.operation_id);
 p.dom.window.close();
});
test('PATCH response loss retains operation payload and does not overwrite a committed edit on retry',async()=>{
 const api=backend();const p=await setup(api);await post(p);p.click('Done');await tick();
 const fetch=p.w.fetch;p.w.fetch=async(url,o)=>{const r=await fetch(url,o);if(o.method==='PATCH')throw Error('lost');return r;};
 p.card.querySelector('.comment-menu-button').click();p.click('Edit comment');p.fields()[1].value='Saved on server';p.click('Save changes');await tick();
 const saved=JSON.parse(p.w.localStorage.getItem('lx_comments_PATCH:moment:1'));assert(saved);assert(p.fields()[1].readOnly);
 p.w.fetch=fetch;p.click('Save changes');await tick();
 const writes=api.calls.filter(c=>c.method==='PATCH');assert.deepEqual(writes[0].payload,writes[1].payload);
 assert.equal(p.card.querySelector('.comment-body').textContent,'Saved on server');assert.equal(api.comments[0].edit_count,1);p.dom.window.close();
});
test('relative times use UTC correctly in both languages and keep full timestamps accessible',async()=>{
 const now=Date.parse('2026-10-30T12:00:00Z');
 for(const lang of ['en','zh']) {
  const api=backend();api.comments.push({id:'time',nickname:'Reader',body:'Text',created_at:'2026-10-30 11:57:00',updated_at:'2026-10-30 11:58:00',edit_count:1});
  const p=await setup(api,lang);p.w.Date.now=()=>now;
  const cases=[[30,lang==='en'?'now':'刚刚'],[180,lang==='en'?'3m':'3分钟前'],[7200,lang==='en'?'2h':'2小时前'],[86400,lang==='en'?'1d':'1天前'],[6*86400,lang==='en'?'6d':'6天前']];
  for(const [seconds,expected]of cases){
   api.comments[0].created_at=new Date(now-seconds*1000).toISOString().slice(0,19).replace('T',' ');await p.s.load();
   const time=p.card.querySelector('.comment-time');assert.equal(time.textContent,expected);assert(time.title);assert(time.getAttribute('aria-label'));assert.equal(time.dateTime,new Date(now-seconds*1000).toISOString());
  }
  api.comments[0].created_at='2026-10-20 12:00:00';await p.s.load();assert(!p.card.querySelector('.comment-time').textContent.includes('2026'));
  api.comments[0].created_at='2025-12-20 12:00:00';await p.s.load();assert(p.card.querySelector('.comment-time').textContent.includes('2025'));
  const meta=p.card.querySelector('.comment-meta');assert.equal(meta.querySelectorAll('.comment-edited').length,1);assert(meta.querySelector('.comment-edited').title);assert(!meta.textContent.includes('11:58'));
  api.comments[0].created_at='invalid';await p.s.load();assert.equal(p.card.querySelector('.comment-time').textContent,'');p.dom.window.close();
 }
});
test('avatars are local, deterministic, Unicode-aware and safe; empty lists leave no container or message',async()=>{
 const api=backend();const p=await setup(api);
 assert(!p.card.querySelector('.comments-section'));assert(!p.card.textContent.includes('No comments'));assert.equal(p.card.querySelector('.comment-trigger span').textContent,'0');
 api.comments.push(...['张三','张三','👩🏽‍💻','<img src=x>'].map((nickname,i)=>({id:String(i),nickname,body:'hello',created_at:'2026-10-30 10:00:00',edit_count:0})));
 await p.s.load();const avatars=p.card.querySelectorAll('.comment-avatar');assert.equal(avatars.length,4);assert.equal(avatars[0].textContent,'张');assert.equal(avatars[0].style.backgroundColor,avatars[1].style.backgroundColor);assert.equal(avatars[2].textContent,'👩🏽‍💻');assert.equal(avatars[3].textContent,'<');assert.equal(p.card.querySelectorAll('img').length,0);
 const color=avatars[0].style.backgroundColor;await p.s.load();assert.equal(p.card.querySelector('.comment-avatar').style.backgroundColor,color);
 api.comments.splice(0);await p.s.load();assert(!p.card.querySelector('.comments-section'));assert.equal(p.card.querySelector('.comment-trigger span').textContent,'0');p.dom.window.close();
});
test('both pages remove subtitles and retain shared compact spacing plus responsive columns',()=>{
 const css=fs.readFileSync('styles.css','utf8');const {window}=new JSDOM('<style>'+css+'</style>');
 assert(window.document.styleSheets[0].cssRules.length>0);window.close();
 for(const name of ['moments.html','zh/moments.html']) {
  const dom=new JSDOM(fs.readFileSync(name,'utf8'));const doc=dom.window.document;
  assert.equal(doc.querySelector('.moments-header h1').textContent,name.startsWith('zh/')?'朋友圈':'Moments');assert.equal(doc.querySelector('.moments-header p'),null);
  assert(doc.querySelector('.moments-timeline'));assert(doc.querySelector('.moments-diary'));dom.window.close();
 }
 assert.match(css,/grid-template-columns: 220px minmax\(0, 1fr\) 240px/);
 assert.match(css,/@media \(max-width: 1199px\)/);assert.match(css,/@media \(max-width: 768px\)/);
 assert.match(css,/\.moments-container \{ padding: 18px 16px 24px; \}/);
});
