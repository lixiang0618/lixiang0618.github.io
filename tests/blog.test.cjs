const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');const {JSDOM}=require('jsdom');
const tick=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setTimeout(r,0));};
const posts=JSON.parse(fs.readFileSync('data/blog.json'));
const response=(data,status=200)=>({ok:status<400,status,json:async()=>({success:status<400,...data})});
function api(seed=[]){
 const comments=seed.map(c=>({...c})),calls=[],posts=new Map();let next=100;
 return {comments,calls,fetch:async(url,o={})=>{
  const u=new URL(url,'https://lxiang.cc');if(!u.hostname.startsWith('api.'))throw Error('route');
  const payload=o.body?JSON.parse(o.body):null;calls.push({url,method:o.method||'GET',payload,headers:o.headers});
  if(u.pathname.includes('/likes'))return response({content_type:'blog',content_id:u.searchParams.get('id'),likes:o.method==='PUT'?5:4,liked:o.method==='PUT'});
  if(!o.method||o.method==='GET')return response({content_type:'blog',content_id:u.searchParams.get('id'),count:comments.filter(c=>c.status!=='deleted').length,comments:comments.map(({token,...c})=>c)});
  if(o.method==='POST'){
   const known=posts.get(payload.request_id);if(known)return response({comment:known});
   const target=comments.find(c=>c.id===payload.reply_to_id);const c={id:String(next++),parent_id:target?(target.parent_id||target.id):null,reply_to_id:target?.id||null,nickname:payload.nickname,body:payload.body,created_at:'2026-10-30 10:00:00',edit_count:0,token:payload.deletion_token};
   comments.push(c);posts.set(payload.request_id,c);return response({comment:c});
  }
  const c=comments.find(c=>c.id===u.pathname.split('/').pop());if(!c||c.status==='deleted')return response({code:'COMMENT_NOT_FOUND'},404);
  if(c.token!==payload.deletion_token)return response({code:'INVALID_TOKEN'},403);
  if(o.method==='PATCH'){if(c.edit_count!==payload.expected_edit_count)return response({code:'EDIT_CONFLICT'},409);Object.assign(c,{nickname:payload.nickname,body:payload.body,edit_count:c.edit_count+1,updated_at:'2026-10-30 12:00:00'});}
  if(o.method==='DELETE')c.status='deleted';return response({comment:c});
 }};
}
async function page(name,backend,options={}){
 const dom=new JSDOM(fs.readFileSync(name,'utf8'),{url:'https://lxiang.cc/'+name+(options.query||''),runScripts:'outside-only'});const w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.console.error=()=>{};w.localStorage.setItem('lx_visitor_id','12345678-1234-4234-8234-123456789abc');
 if(options.storage)for(const [k,v]of Object.entries(options.storage))w.localStorage.setItem(k,v);
 w.fetch=async(url,o={})=>{
  if(String(url).startsWith('https://api.'))return backend.fetch(url,o);
  const u=new URL(url,w.location.href);const file=decodeURIComponent(u.pathname.slice(1));
  if(file==='data/blog.json')return {ok:true,json:async()=>options.posts||posts};
  if(file.startsWith('blogs/'))return {ok:true,text:async()=>fs.readFileSync(file,'utf8')};
  throw Error('Unknown '+file);
 };
 for(const script of w.document.querySelectorAll('script')){
  if(script.src)w.eval(fs.readFileSync(new URL(script.src).pathname.slice(1),'utf8'));else w.eval(script.textContent);
 }
 await tick();return {dom,w,doc:w.document};
}
function click(root,text){const b=Array.from(root.querySelectorAll('button')).find(b=>b.textContent===text);assert(b,'Button '+text);b.click();}
const root=(id,body=id)=>({id,parent_id:null,reply_to_id:null,nickname:'Alex',body,created_at:'2026-10-30 10:00:00',updated_at:null,edit_count:0});
const reply=(id,parent,to=parent)=>({...root(id),parent_id:parent,reply_to_id:to});
test('bilingual listing uses category IDs, pinned ordering, encoded IDs and noninteractive statistics',async()=>{
 for(const name of ['blog.html','zh/blog.html']){
  const backend=api();const p=await page(name,backend);const doc=p.doc;
  assert.equal(doc.querySelector('.blog-header p'),null);assert.equal(doc.querySelectorAll('.filter-btn').length,5);
  assert.equal(doc.querySelector('.filter-btn').textContent,name.startsWith('zh')?'全部':'All');
  assert.equal(doc.querySelector('.blog-post').dataset.post,'Hot100');assert.equal(doc.querySelectorAll('.blog-post').length,6);
  assert.equal(doc.querySelectorAll('.blog-post button').length,0);assert.equal(doc.querySelectorAll('.blog-stats span:not([hidden])').length,12);
  doc.querySelector('[data-filter="notes"]').click();assert.equal(doc.querySelectorAll('.blog-post').length,4);
  doc.querySelector('[data-filter="life"]').click();assert.equal(doc.querySelectorAll('.blog-post').length,2);
  doc.querySelector('[data-filter="research"]').click();assert.equal(doc.querySelectorAll('.blog-post').length,0);
  doc.querySelector('[data-filter="all"]').click();assert.equal(doc.querySelectorAll('.blog-post').length,6);assert.equal(backend.calls.length,12);
  assert(backend.calls.some(c=>c.url.includes(encodeURIComponent('C语言习题集'))));p.w.close();
 }
});
test('listing statistics cap concurrency at four and failures never masquerade as zero',async()=>{
 let active=0,max=0;const backend={fetch:async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;throw Error('offline');}};
 const p=await page('blog.html',backend);await tick();assert(max<=4);assert.equal(p.doc.querySelectorAll('.blog-post').length,6);assert.equal(p.doc.querySelectorAll('.blog-stats span:not([hidden])').length,0);p.w.close();
});
test('article Markdown/media/PDF same across languages; heart uses existing visitor UUID',async()=>{
 const bodies=[];
 for(const name of ['blog-post.html','zh/blog-post.html']){
  const backend=api();const p=await page(name,backend,{query:'?p=Python'});
  assert(p.doc.querySelector('#post-content').textContent.includes('Python'));bodies.push(p.doc.querySelector('#post-content').textContent);
  assert.equal(new URL(p.doc.querySelector('#post-pdf iframe').src).pathname,'/blogs/Python.pdf');
  assert.equal(p.doc.querySelector('.blog-heart').previousElementSibling.id,'post-tags');assert.equal(p.doc.querySelector('.blog-heart').nextElementSibling.className,'blog-discussion');
  const heart=p.doc.querySelector('.blog-heart button');heart.click();await tick();assert.equal(heart.getAttribute('aria-pressed'),'true');heart.click();await tick();assert.equal(heart.getAttribute('aria-pressed'),'false');
  assert(backend.calls.filter(c=>c.url.includes('/likes')).every(c=>c.headers['X-Visitor-ID']==='12345678-1234-4234-8234-123456789abc'));
  assert(p.doc.querySelector('.blog-comment-form textarea'));p.w.close();
 }
 assert.equal(bodies[0],bodies[1]);
});
test('thread roots keep server order; three initial replies, collapse, safe reply labels and deleted placeholders',async()=>{
 const backend=api([root('discussed'),reply('a','discussed'),reply('b','discussed','a'),{...reply('gone','discussed'),status:'deleted',nickname:'PRIVATE NAME',body:'PRIVATE BODY'},reply('d','discussed'),root('newer'),{...root('deletedroot'),status:'deleted',nickname:'SECRET NAME',body:'SECRET BODY'},reply('live','deletedroot')]);
 const p=await page('blog-post.html',backend,{query:'?p=Python'});let threads=p.doc.querySelectorAll('.blog-thread');assert.equal(threads.length,3);
 assert.equal(threads[0].querySelector('.comment-body').textContent,'discussed');assert.equal(threads[0].querySelectorAll('.blog-reply').length,3);
 click(threads[0],'View all 3 replies');threads=p.doc.querySelectorAll('.blog-thread');assert.equal(threads[0].querySelectorAll('.blog-reply').length,4);click(threads[0],'Collapse replies');threads=p.doc.querySelectorAll('.blog-thread');assert.equal(threads[0].querySelectorAll('.blog-reply').length,3);
 assert(!p.doc.querySelector('.blog-discussion').textContent.includes('PRIVATE'));assert(!p.doc.querySelector('.blog-discussion').textContent.includes('SECRET'));
 assert.equal(threads[2].querySelectorAll('.blog-comment-controls').length,1);assert.equal(threads[2].querySelector('.blog-deleted').querySelectorAll('button').length,0);
 assert.equal(threads[0].querySelectorAll('.blog-replies .blog-replies').length,0);assert.match(threads[0].textContent,/Reply to @Alex/);p.w.close();
});
test('root and reply POSTs persist independent credentials, no parent_id, reveal new replies and preserve token backups',async()=>{
 const backend=api([root('r'),reply('a','r'),reply('b','r'),reply('c','r'),reply('d','r')]);const p=await page('blog-post.html',backend,{query:'?p=Python'});
 const f=p.doc.querySelector('.blog-comment-form'),name=f.querySelector('input'),body=f.querySelector('textarea');
 click(p.doc.querySelector('.blog-reply'),'Reply');name.value='Visitor';body.value='<img src=x onerror=alert(1)>';
 f.dispatchEvent(new p.w.Event('submit',{cancelable:true}));f.dispatchEvent(new p.w.Event('submit',{cancelable:true}));await tick();
 let call=backend.calls.find(c=>c.method==='POST');assert.equal(call.payload.reply_to_id,'a');assert(!('parent_id'in call.payload));assert(/^[a-f0-9]{64}$/.test(call.payload.deletion_token));
 const saved=JSON.parse(p.w.localStorage.getItem('lx_comments_POST:blog:Python'));assert(saved.completed);assert.equal(saved.payload.request_id,call.payload.request_id);
 assert.equal(p.doc.querySelectorAll('.blog-reply').length,5);assert(!p.doc.querySelector('.blog-discussion img'));assert(p.doc.querySelector('.blog-comment-menu'));
 click(f,'Done');name.value='Other';body.value='Root';f.dispatchEvent(new p.w.Event('submit',{cancelable:true}));await tick();
 const calls=backend.calls.filter(c=>c.method==='POST');assert.equal(calls.length,2);assert.notEqual(calls[0].payload.deletion_token,calls[1].payload.deletion_token);assert(!calls[1].payload.reply_to_id);
 p.w.close();
});
test('guidelines have identical bilingual structure and own token controls never use nickname',async()=>{
 let skeleton;
 for(const name of ['blog-post.html','zh/blog-post.html']){
  const backend=api([root('own'),root('other')]);const storage={'lx_comments_token:blog:own':JSON.stringify({token:'a'.repeat(64)})};const p=await page(name,backend,{query:'?p=Python',storage});
  assert.equal(p.doc.querySelectorAll('.blog-comment-menu').length,1);assert.equal(p.doc.querySelectorAll('.blog-guidelines li').length,4);
  const shape=Array.from(p.doc.querySelector('.blog-guidelines').querySelectorAll('*')).map(n=>n.tagName).join(',');if(skeleton)assert.equal(shape,skeleton);skeleton=shape;
  p.w.close();
 }
});
test('safe metadata and Markdown sanitizer reject active HTML while retaining code, images and links',async()=>{
 const metadata=[{file:'unsafe',title:'<img src=x onerror=alert(1)>',categories:['notes'],tags:['<script>alert(1)</script>'],date:'2026-10-30',excerpt:'<svg onload=alert(1)>'}];
 const p=await page('blog.html',api(),{posts:metadata});assert.equal(p.doc.querySelectorAll('.blog-post img,.blog-post script,.blog-post svg').length,0);
 const safe=p.w.BlogUI.sanitizeMarkdown('<img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><script>alert(1)</script><pre><code class="language-js">safe</code></pre>');
 const div=p.doc.createElement('div');div.innerHTML=safe;assert(!div.querySelector('script'));assert(!div.querySelector('[onerror]'));assert(!div.querySelector('a').hasAttribute('href'));assert(div.querySelector('pre code'));p.w.close();
});
test('taxonomy regeneration is repeatable and Markdown bodies are byte-identical',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-taxonomy-'));
 try{
  fs.cpSync('blogs',path.join(tmp,'blogs'),{recursive:true});fs.mkdirSync(path.join(tmp,'data'));fs.copyFileSync('sync-blog.js',path.join(tmp,'sync-blog.js'));
  execFileSync(process.execPath,['sync-blog.js'],{cwd:tmp});const first=fs.readFileSync(path.join(tmp,'data/blog.json'),'utf8');execFileSync(process.execPath,['sync-blog.js'],{cwd:tmp});assert.equal(fs.readFileSync(path.join(tmp,'data/blog.json'),'utf8'),first);assert.deepEqual(JSON.parse(first),posts);
  for(const file of fs.readdirSync('blogs').filter(f=>f.endsWith('.md'))){
   const name='blogs/'+file;const before=execFileSync('git',['show','origin/main:'+name]);const after=fs.readFileSync(name);
   const body=b=>{const m=b.toString('binary').match(/^---\r?\n[\s\S]*?\r?\n---/);return b.subarray(m[0].length);};assert.deepEqual(body(after),body(before));
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('Blog own edit/delete reuse version and token checks, preserve deleted roots with replies',async()=>{
 const token='a'.repeat(64);const backend=api([{...root('own'),token},reply('child','own')]);
 const p=await page('blog-post.html',backend,{query:'?p=Python',storage:{'lx_comments_token:blog:own':JSON.stringify({token})}});
 click(p.doc.querySelector('.blog-comment-menu'),'Edit comment');let fields=p.doc.querySelectorAll('dialog input,dialog textarea');fields[1].value='Revised';click(p.doc.querySelector('dialog'),'Save changes');await tick();assert.equal(backend.comments[0].body,'Revised');assert.equal(backend.calls.find(c=>c.method==='PATCH').payload.expected_edit_count,0);
 p.w.localStorage.setItem('lx_comments_token:blog:own',JSON.stringify({token:'b'.repeat(64)}));
 click(p.doc.querySelector('.blog-comment-menu'),'Edit comment');fields=p.doc.querySelectorAll('dialog input,dialog textarea');fields[1].value='Unauthorized';click(p.doc.querySelector('dialog'),'Save changes');await tick();assert.equal(backend.comments[0].body,'Revised');click(p.doc.querySelector('dialog'),'Cancel');
 p.w.localStorage.setItem('lx_comments_token:blog:own',JSON.stringify({token}));click(p.doc.querySelector('.blog-comment-menu'),'Delete comment');click(p.doc.querySelector('dialog'),'Confirm deletion');await tick();
 assert(p.doc.querySelector('.blog-deleted'));assert(!p.doc.querySelector('.blog-threads').textContent.includes('Revised'));assert(p.doc.querySelector('.blog-threads').textContent.includes('child'));p.w.close();
});
test('uncertain Blog POST restores original request and token across language reloads',async()=>{
 const backend=api();const original=backend.fetch;let fail=true;
 backend.fetch=async(url,o)=>{const r=await original(url,o);if(o.method==='POST'&&fail)throw Error('lost');return r;};
 const p=await page('blog-post.html',backend,{query:'?p=Python'});const f=p.doc.querySelector('form');f.querySelector('input').value='Visitor';f.querySelector('textarea').value='Pending';f.dispatchEvent(new p.w.Event('submit',{cancelable:true}));await tick();
 const storage={};for(let i=0;i<p.w.localStorage.length;i++){const k=p.w.localStorage.key(i);storage[k]=p.w.localStorage.getItem(k);}const first=backend.calls.find(c=>c.method==='POST').payload;p.w.close();fail=false;
 const q=await page('zh/blog-post.html',backend,{query:'?p=Python',storage});const restored=q.doc.querySelector('form');assert(restored.querySelector('textarea').readOnly);restored.dispatchEvent(new q.w.Event('submit',{cancelable:true}));await tick();
 const writes=backend.calls.filter(c=>c.method==='POST');assert.deepEqual(writes[1].payload,first);assert.equal(backend.comments.length,1);assert(q.doc.querySelector('.blog-token-backup').textContent.includes('评论发表成功'));q.w.close();
});
