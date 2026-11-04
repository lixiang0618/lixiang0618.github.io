// Exercises actual browser-profile persistence and delayed image layout changes.
const {chromium}=require('playwright-core'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:8094';
const text='Reading paragraph. '.repeat(600);
const body=`## Start\n\n${text}\n\n### Parent\n\n#### Target\n\n${text}\n\n## End`;
const options={executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,viewport:{width:390,height:900},args:['--no-sandbox','--disable-dev-shm-usage']};
async function routes(c,markdown=body){await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await c.route('**/data/blog.json',r=>r.fulfill({json:[{file:'persist',title:'Persistence',date:'2026-01-01',categories:['notes']}]}));await c.route('**/blogs/persist.md',r=>r.fulfill({body:markdown}));}
async function check(p,offset){const difference=await p.evaluate(offset=>document.getElementById('section-target').getBoundingClientRect().top-document.querySelector('header').offsetHeight-8+offset,offset);assert(Math.abs(difference)<4,'Restored offset: '+difference);}
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xiangology-reading-'));let c;
 try{
  c=await chromium.launchPersistentContext(profile,options);await routes(c);let p=await c.newPage();await p.goto(base+'/blog-post.html?p=persist');await p.locator('#section-target').waitFor();await p.waitForTimeout(2100);
  await p.evaluate(()=>scrollTo({top:document.getElementById('section-target').getBoundingClientRect().top+scrollY-document.querySelector('header').offsetHeight-8+63,behavior:'instant'}));await p.waitForTimeout(1100);
  const record=await p.evaluate(()=>JSON.parse(localStorage.getItem('lx_blog_position:persist')));assert.equal(record.headingId,'section-target');assert(Math.abs(record.offset-63)<4);await c.close();
  c=await chromium.launchPersistentContext(profile,options);await routes(c);p=await c.newPage();await p.goto(base+'/blog-post.html?p=persist');await p.locator('#section-target').waitFor();await p.waitForTimeout(2100);await check(p,63);await c.close();
  console.log('PASS close and reopen browser preserves article heading + relative offset');
  c=await chromium.launchPersistentContext(profile,options);await routes(c,'![Delayed image](/delayed-reading.svg)\n\n'+body);
  await c.route('**/delayed-reading.svg',async r=>{await new Promise(resolve=>setTimeout(resolve,3000));await r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#eee"/></svg>'});});
  p=await c.newPage();await p.goto(base+'/blog-post.html?p=persist',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1300);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('lx_blog_position:persist')).offset),record.offset,'initial load does not overwrite saved state');await p.waitForTimeout(2200);await check(p,63);
  await c.close();c=null;console.log('PASS delayed image above target corrects layout without overwriting initial record');
 }finally{if(c)await c.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
