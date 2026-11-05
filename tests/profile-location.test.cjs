const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync('js/profile-location.js','utf8');
const fresh=()=>({country:'Singapore',region:'',city:'Singapore',district:'Jurong West',updated_at:new Date().toISOString()});
async function page(data,{lang='en',fail=false,http=200,timeout=false}={}){
 const dom=new JSDOM(`<html lang="${lang}"><body><div data-profile-location aria-busy="true" aria-hidden="true"><p class="profile-location-label"></p><p class="profile-location-updated"><span></span><time></time></p></div></body></html>`,{url:'https://lxiang.cc/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.document,'hidden',{configurable:true,value:false});
 let request,timer,timeoutMs,aborted=false,tick;
 w.setInterval=fn=>{tick=fn;return 1;};
 const original=w.setTimeout.bind(w);w.setTimeout=(fn,ms)=>{timeoutMs=ms;if(timeout)timer=fn;else return original(fn,ms);};
 w.fetch=async(url,options)=>{request={url,options};if(timeout)return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));}));if(fail)throw Error('offline');return{ok:http<400,json:async()=>data};};
 w.eval(script);if(timeout)timer();await new Promise(resolve=>setTimeout(resolve,0));
 return{dom,w,root:w.document.querySelector('[data-profile-location]'),request,timeoutMs,aborted,tick};
}
test('active location and local-time timestamp render in both languages without storage or credentials',async()=>{
 for(const lang of ['en','zh-CN']){const p=await page({success:true,status:'active',location:fresh()},{lang});assert.equal(p.root.dataset.state,'active');assert.equal(p.root.querySelector('.profile-location-label').textContent,'Singapore · Jurong West');assert(p.root.querySelector('time').dateTime);assert(p.root.querySelector('time').textContent);assert.equal(p.w.localStorage.length,0);assert.equal(p.request.url,'https://api.lxiang.cc/api/location');assert.equal(p.request.options.credentials,'omit');assert.equal(p.request.options.cache,'no-store');assert.equal(p.root.getAttribute('aria-busy'),'false');p.w.close();}
});
test('region formatting deduplicates and falls back without leaking other fields',async()=>{
 for(const [fields,expected] of [[{city:'Singapore',district:' singapore '},'Singapore'],[{city:'Singapore',district:''},'Singapore'],[{city:'',region:'Central Region',district:''},'Central Region'],[{city:'',region:'',country:'Singapore',district:''},'Singapore'],[{city:'',region:'West',district:'Jurong'},'West · Jurong']]){const p=await page({success:true,status:'active',location:{...fresh(),...fields,latitude:1.12345,street:'Private road',token:'secret'}});assert.equal(p.root.querySelector('.profile-location-label').textContent,expected);assert(!p.root.textContent.includes('Private road'));assert(!p.root.textContent.includes('secret'));p.w.close();}
});
test('paused and stale discard a supplied location in both languages',async()=>{
 for(const lang of ['en','zh-CN'])for(const status of ['paused','stale']){const p=await page({success:true,status,location:fresh()},{lang});assert.equal(p.root.dataset.state,status);assert(!p.root.textContent.includes('Singapore'));assert(p.root.querySelector('.profile-location-updated').hidden);assert(!p.root.querySelector('time').getAttribute('datetime'));p.w.close();}
});
test('unavailable, unknown, unsuccessful, malformed and invalid active payloads stay hidden',async()=>{
 for(const data of [null,{success:false,status:'active',location:fresh()},{success:true,status:'unavailable',location:fresh()},{success:true,status:'unknown',location:fresh()},{success:true,status:'active',location:null},{success:true,status:'active',location:[]},{success:true,status:'active',location:{...fresh(),city:'',country:'',region:''}},{success:true,status:'active',location:{...fresh(),updated_at:'invalid'}}]){const p=await page(data);assert.equal(p.root.dataset.state,'hidden');assert.equal(p.root.getAttribute('aria-hidden'),'true');assert(!p.root.textContent.includes('Singapore'));p.w.close();}
});
test('an active but over-24-hour response cannot expose its old place',async()=>{const p=await page({success:true,status:'active',location:{...fresh(),updated_at:new Date(Date.now()-25*3600000).toISOString()}});assert.equal(p.root.dataset.state,'stale');assert(!p.root.textContent.includes('Singapore'));p.w.close();});
test('API text is escaped by DOM textContent, never interpreted as HTML',async()=>{const value='<img src=x onerror=alert(1)>';const p=await page({success:true,status:'active',location:{...fresh(),city:value,district:'<script>bad()</script>'}});assert(p.root.textContent.includes(value));assert.equal(p.root.querySelectorAll('img,script').length,0);p.w.close();});
test('network errors and HTTP errors are silent and hidden',async()=>{for(const options of [{fail:true},{http:503}]){const p=await page(null,options);assert.equal(p.root.dataset.state,'hidden');assert.equal(p.root.querySelector('.profile-location-label').textContent,'');p.w.close();}});
test('six-second timeout aborts and hides the request without an unhandled error',async()=>{const p=await page(null,{timeout:true});assert.equal(p.timeoutMs,6000);assert(p.aborted);assert.equal(p.root.dataset.state,'hidden');p.w.close();});
test('only the four homepage variants opt into the component',()=>{for(const file of ['index.html','index-mobile.html','zh/index.html','zh/index-mobile.html']){const dom=new JSDOM(fs.readFileSync(file,'utf8'));assert.equal(dom.window.document.querySelectorAll('[data-profile-location]').length,1);const box=dom.window.document.querySelector('[data-profile-location]');assert(box.closest('.hero-text .profile-location-wrap'));assert(!box.closest('.contact-row'));assert(box.parentElement.previousElementSibling.matches('.profile-contact'));assert(dom.window.document.querySelector('script[src$="js/profile-location.js"][defer]'));dom.window.close();}});

test('relative labels update from the original timestamp and expire without exposing stale location',async()=>{
 for(const lang of ['en','zh-CN']){
  const start=Date.now(),date=new Date(start-6*3600000).toISOString();const p=await page({success:true,status:'active',location:{...fresh(),updated_at:date}},{lang});
  assert.equal(p.root.querySelector('time').textContent,lang==='en'?'6 hours ago':'6小时前');assert(p.root.querySelector('time').title);p.w.Date.now=()=>start+3600000;p.tick();assert.equal(p.root.querySelector('time').textContent,lang==='en'?'7 hours ago':'7小时前');p.w.Date.now=()=>start+19*3600000;p.tick();assert.equal(p.root.dataset.state,'stale');assert(!p.root.textContent.includes('Singapore'));p.w.close();
 }
});
test('invalid and significantly future timestamps cannot enable the active indicator',async()=>{const p=await page({success:true,status:'active',location:{...fresh(),updated_at:new Date(Date.now()+3600000).toISOString()}});assert.equal(p.root.dataset.state,'hidden');p.w.close();});
